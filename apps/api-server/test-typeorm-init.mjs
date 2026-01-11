import 'dotenv/config';

console.log('Loading TypeORM connection...');
const { AppDataSource } = await import('./dist/database/connection.js');

console.log('Initializing AppDataSource...');
try {
  await AppDataSource.initialize();
  console.log('✅ AppDataSource initialized successfully');

  console.log('Testing query...');
  const result = await AppDataSource.query('SELECT NOW()');
  console.log('✅ Query result:', result);

  await AppDataSource.destroy();
  console.log('✅ Connection closed');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
