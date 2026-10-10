const path = require('path');
const express = require('express');
const { pool, waitForDb } = require('./db');
const resources = require('./resources');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', true); // chạy sau Nginx reverse proxy
app.disable('x-powered-by'); // không để lộ "Express" trong header

app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Ghi log mỗi request ra stdout -> Promtail thu thập -> Loki
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    console.log(`level=${level} method=${req.method} path="${req.originalUrl}" status=${res.statusCode} duration_ms=${Date.now() - start} ip=${req.ip}`);
  });
  next();
});

app.locals.resources = resources;

// Health check cho Docker
app.get('/healthz', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'db_unavailable' });
  }
});

// Trang chủ: thống kê nhanh
app.get('/', async (req, res, next) => {
  try {
    const [[stats]] = await pool.query(`SELECT
      (SELECT COUNT(*) FROM lop) AS lop,
      (SELECT COUNT(*) FROM sinh_vien) AS sinh_vien,
      (SELECT COUNT(*) FROM mon_hoc) AS mon_hoc,
      (SELECT COUNT(*) FROM diem) AS diem`);
    res.render('index', { stats, active: '' });
  } catch (err) { next(err); }
});

// Middleware: tìm resource theo URL (/lop, /sinh-vien, /mon-hoc, /diem)
function loadResource(req, res, next) {
  const r = resources[req.params.resource];
  if (!r) return res.status(404).render('error', { message: 'Không tìm thấy trang', active: '' });
  req.r = r;
  req.key = req.params.resource;
  next();
}

async function loadOptions(r) {
  const fields = [];
  for (const f of r.fields) {
    if (f.optionsSql) {
      const [rows] = await pool.query(f.optionsSql);
      fields.push({ ...f, options: rows });
    } else fields.push(f);
  }
  return fields;
}

// Lấy dữ liệu form, chỉ nhận các trường đã khai báo (whitelist)
function readBody(r, body) {
  const data = {};
  for (const f of r.fields) {
    let v = body[f.name];
    v = typeof v === 'string' ? v.trim() : '';
    data[f.name] = v === '' ? null : v;
  }
  return data;
}

function validate(r, data) {
  for (const f of r.fields) {
    const v = data[f.name];
    if (f.required && v === null) return `Vui lòng nhập "${f.label}"`;
    if (v !== null && f.type === 'number') {
      const n = Number(v);
      if (Number.isNaN(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
        return `"${f.label}" phải nằm trong khoảng ${f.min} - ${f.max}`;
      }
    }
    if (v !== null && f.maxlength && v.length > f.maxlength) return `"${f.label}" tối đa ${f.maxlength} ký tự`;
  }
  return null;
}

function friendlyDbError(err) {
  switch (err.code) {
    case 'ER_DUP_ENTRY': return 'Dữ liệu bị trùng (mã đã tồn tại).';
    case 'ER_ROW_IS_REFERENCED_2': return 'Không thể xóa vì đang có dữ liệu khác tham chiếu tới bản ghi này.';
    case 'ER_NO_REFERENCED_ROW_2': return 'Giá trị tham chiếu không tồn tại.';
    case 'ER_CHECK_CONSTRAINT_VIOLATED': return 'Giá trị không hợp lệ.';
    default: return null;
  }
}

// Danh sách + tìm kiếm
app.get('/:resource', loadResource, async (req, res, next) => {
  try {
    const { r } = req;
    const q = (req.query.q || '').toString().trim().slice(0, 100);
    let sql = r.listSql;
    const params = [];
    if (q) {
      sql += ' WHERE ' + r.searchCols.map((c) => `${c} LIKE ?`).join(' OR ');
      r.searchCols.forEach(() => params.push(`%${q}%`));
    }
    sql += ` ORDER BY ${r.orderBy}`;
    const [rows] = await pool.query(sql, params);
    res.render('list', { r, key: req.key, rows, q, msg: req.query.msg, err: req.query.err, active: req.key });
  } catch (err) { next(err); }
});

// Form thêm mới
app.get('/:resource/new', loadResource, async (req, res, next) => {
  try {
    res.render('form', { r: req.r, key: req.key, fields: await loadOptions(req.r), item: {}, error: null, active: req.key });
  } catch (err) { next(err); }
});

// Form sửa
app.get('/:resource/:id/edit', loadResource, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM ${req.r.table} WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).render('error', { message: 'Không tìm thấy bản ghi', active: req.key });
    res.render('form', { r: req.r, key: req.key, fields: await loadOptions(req.r), item: rows[0], error: null, active: req.key });
  } catch (err) { next(err); }
});

// Lưu (thêm mới hoặc cập nhật)
async function save(req, res, next) {
  const { r, key } = req;
  const id = req.params.id;
  const data = readBody(r, req.body);
  const error = validate(r, data);
  const reRender = async (msg) => res.status(400).render('form', {
    r, key, fields: await loadOptions(r), item: { ...data, id }, error: msg, active: key });
  try {
    if (error) return reRender(error);
    const cols = Object.keys(data);
    if (id) {
      const [result] = await pool.query(
        `UPDATE ${r.table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...Object.values(data), id]);
      if (!result.affectedRows) return res.status(404).render('error', { message: 'Không tìm thấy bản ghi', active: key });
    } else {
      await pool.query(
        `INSERT INTO ${r.table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        Object.values(data));
    }
    console.log(`level=info action=${id ? 'update' : 'create'} table=${r.table}${id ? ` id=${id}` : ''}`);
    res.redirect(`/${key}?msg=${encodeURIComponent(id ? 'Đã cập nhật' : 'Đã thêm mới')}`);
  } catch (err) {
    const msg = friendlyDbError(err);
    if (msg) {
      console.log(`level=warn action=save table=${r.table} code=${err.code}`);
      return reRender(msg);
    }
    next(err);
  }
}
app.post('/:resource', loadResource, save);
app.post('/:resource/:id', loadResource, save);

// Xóa
app.post('/:resource/:id/delete', loadResource, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM ${req.r.table} WHERE id = ?`, [req.params.id]);
    console.log(`level=info action=delete table=${req.r.table} id=${req.params.id}`);
    res.redirect(`/${req.key}?msg=${encodeURIComponent('Đã xóa')}`);
  } catch (err) {
    const msg = friendlyDbError(err);
    if (msg) {
      console.log(`level=warn action=delete table=${req.r.table} id=${req.params.id} code=${err.code}`);
      return res.redirect(`/${req.key}?err=${encodeURIComponent(msg)}`);
    }
    next(err);
  }
});

// Xử lý lỗi chung: log chi tiết ra stdout, không trả stack trace cho người dùng
app.use((err, req, res, next) => {
  console.error(`level=error path="${req.originalUrl}" message="${err.message}" code=${err.code || ''}`);
  res.status(500).render('error', { message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.', active: '' });
});

waitForDb()
  .then(() => app.listen(PORT, () => console.log(`level=info msg="QLSV app dang chay tai cong ${PORT}"`)))
  .catch((err) => { console.error(`level=error msg="${err.message}"`); process.exit(1); });
