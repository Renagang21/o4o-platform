import 'reflect-metadata';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Loading migration config...');

try {
  const { default: dataSource } = await import('./dist/database/migration-config.js');

  console.log('Initializing DataSource...');
  await dataSource.initialize();
  console.log('✅ DataSource initialized');

  console.log('\n📋 Showing migrations...');
  const migrations = await dataSource.showMigrations();

  console.log(`\n✅ Total migrations: ${migrations ? 'checked' : 'none'}`);

  await dataSource.destroy();
  console.log('✅ DataSource closed');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
