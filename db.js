import mysql from 'mysql2/promise';


const pool = mysql.createPool({
  host: "217.21.74.201",
  user: "u640188659_usmartcounting",
  password: "101512smRT",
  database: "u640188659_smartcounting",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// module.exports = pool;
export default pool;