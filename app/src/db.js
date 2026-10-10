// Kết nối MySQL bằng connection pool (mysql2/promise)
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
});

// Chờ MySQL sẵn sàng khi container khởi động (tối đa ~60 giây)
async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('[db] Ket noi MySQL thanh cong');
      return;
    } catch (err) {
      console.log(`[db] Chua ket noi duoc MySQL (lan ${i}/${retries}): ${err.code || err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Khong the ket noi MySQL');
}

module.exports = { pool, waitForDb };
