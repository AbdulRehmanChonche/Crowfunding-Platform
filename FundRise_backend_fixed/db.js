// db.js – FundRise MySQL connection
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',        // your MySQL password
  database: 'testdb'   // your database name
});

connection.connect((err) => {
  if (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
    process.exit(1);
  }
  console.log('✅ MySQL Connected Successfully!');
});

module.exports = connection;
