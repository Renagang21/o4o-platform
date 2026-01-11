import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
});

console.log('Testing connection to:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
});

try {
  console.log('Connecting...');
  await client.connect();
  console.log('✅ Connected successfully!');

  const res = await client.query('SELECT NOW()');
  console.log('✅ Query executed:', res.rows[0]);

  await client.end();
  console.log('✅ Connection closed');
  process.exit(0);
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}
