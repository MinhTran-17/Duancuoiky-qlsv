// Mô tả các bảng cần CRUD. Mỗi resource gồm: bảng, các trường trên form,
// câu truy vấn danh sách (có JOIN để hiển thị tên thay vì id) và các cột hiển thị.
// Mọi câu SQL đều dùng tham số "?" (parameterized query) để chống SQL Injection.

module.exports = {
  lop: {
    title: 'Lớp',
    table: 'lop',
    fields: [
      { name: 'ma_lop', label: 'Mã lớp', type: 'text', required: true, maxlength: 20 },
      { name: 'ten_lop', label: 'Tên lớp', type: 'text', required: true, maxlength: 100 },
      { name: 'khoa', label: 'Khoa', type: 'text', required: true, maxlength: 100 },
    ],
    listSql: `SELECT l.id, l.ma_lop, l.ten_lop, l.khoa,
                     (SELECT COUNT(*) FROM sinh_vien sv WHERE sv.lop_id = l.id) AS si_so
              FROM lop l`,
    searchCols: ['l.ma_lop', 'l.ten_lop', 'l.khoa'],
    orderBy: 'l.ma_lop',
    columns: [
      { key: 'ma_lop', label: 'Mã lớp' },
      { key: 'ten_lop', label: 'Tên lớp' },
      { key: 'khoa', label: 'Khoa' },
      { key: 'si_so', label: 'Sĩ số' },
    ],
  },

  'sinh-vien': {
    title: 'Sinh viên',
    table: 'sinh_vien',
    fields: [
      { name: 'mssv', label: 'MSSV', type: 'text', required: true, maxlength: 20 },
      { name: 'ho_ten', label: 'Họ tên', type: 'text', required: true, maxlength: 100 },
      { name: 'ngay_sinh', label: 'Ngày sinh', type: 'date' },
      { name: 'gioi_tinh', label: 'Giới tính', type: 'select', options: [
        { value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }, { value: 'Khác', label: 'Khác' } ] },
      { name: 'email', label: 'Email', type: 'email', maxlength: 100 },
      { name: 'lop_id', label: 'Lớp', type: 'select', required: true,
        optionsSql: 'SELECT id AS value, CONCAT(ma_lop, " - ", ten_lop) AS label FROM lop ORDER BY ma_lop' },
    ],
    listSql: `SELECT sv.id, sv.mssv, sv.ho_ten, sv.ngay_sinh, sv.gioi_tinh, sv.email, l.ma_lop
              FROM sinh_vien sv JOIN lop l ON l.id = sv.lop_id`,
    searchCols: ['sv.mssv', 'sv.ho_ten', 'sv.email', 'l.ma_lop'],
    orderBy: 'sv.mssv',
    columns: [
      { key: 'mssv', label: 'MSSV' },
      { key: 'ho_ten', label: 'Họ tên' },
      { key: 'ngay_sinh', label: 'Ngày sinh' },
      { key: 'gioi_tinh', label: 'Giới tính' },
      { key: 'email', label: 'Email' },
      { key: 'ma_lop', label: 'Lớp' },
    ],
  },

  'mon-hoc': {
    title: 'Môn học',
    table: 'mon_hoc',
    fields: [
      { name: 'ma_mon', label: 'Mã môn', type: 'text', required: true, maxlength: 20 },
      { name: 'ten_mon', label: 'Tên môn', type: 'text', required: true, maxlength: 150 },
      { name: 'so_tin_chi', label: 'Số tín chỉ', type: 'number', required: true, min: 1, max: 10, step: 1 },
    ],
    listSql: 'SELECT id, ma_mon, ten_mon, so_tin_chi FROM mon_hoc m',
    searchCols: ['m.ma_mon', 'm.ten_mon'],
    orderBy: 'm.ma_mon',
    columns: [
      { key: 'ma_mon', label: 'Mã môn' },
      { key: 'ten_mon', label: 'Tên môn' },
      { key: 'so_tin_chi', label: 'Số tín chỉ' },
    ],
  },

  diem: {
    title: 'Điểm',
    table: 'diem',
    fields: [
      { name: 'sinh_vien_id', label: 'Sinh viên', type: 'select', required: true,
        optionsSql: 'SELECT id AS value, CONCAT(mssv, " - ", ho_ten) AS label FROM sinh_vien ORDER BY mssv' },
      { name: 'mon_hoc_id', label: 'Môn học', type: 'select', required: true,
        optionsSql: 'SELECT id AS value, CONCAT(ma_mon, " - ", ten_mon) AS label FROM mon_hoc ORDER BY ma_mon' },
      { name: 'diem_qt', label: 'Điểm quá trình (30%)', type: 'number', required: true, min: 0, max: 10, step: 0.1 },
      { name: 'diem_thi', label: 'Điểm thi (70%)', type: 'number', required: true, min: 0, max: 10, step: 0.1 },
    ],
    listSql: `SELECT d.id, sv.mssv, sv.ho_ten, m.ten_mon, d.diem_qt, d.diem_thi,
                     ROUND(d.diem_qt * 0.3 + d.diem_thi * 0.7, 1) AS diem_tk
              FROM diem d
              JOIN sinh_vien sv ON sv.id = d.sinh_vien_id
              JOIN mon_hoc m ON m.id = d.mon_hoc_id`,
    searchCols: ['sv.mssv', 'sv.ho_ten', 'm.ten_mon'],
    orderBy: 'sv.mssv, m.ten_mon',
    columns: [
      { key: 'mssv', label: 'MSSV' },
      { key: 'ho_ten', label: 'Họ tên' },
      { key: 'ten_mon', label: 'Môn học' },
      { key: 'diem_qt', label: 'Điểm QT' },
      { key: 'diem_thi', label: 'Điểm thi' },
      { key: 'diem_tk', label: 'Điểm TK' },
    ],
  },
};
