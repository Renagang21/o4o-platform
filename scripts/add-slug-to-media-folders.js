import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from production config
dotenv.config({ path: path.join(__dirname, '../apps/api-server/.env.production') });

const { Client } = pg;

async function addSlugColumn() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_db'
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Check and add all missing columns
    console.log('🔍 Checking media_folders columns...');

    const columnsToAdd = [
      { name: 'slug', type: 'VARCHAR(255) UNIQUE', description: 'URL-friendly folder identifier' },
      { name: 'parentId', type: 'UUID', description: 'Parent folder reference' },
      { name: 'fileCount', type: 'INTEGER DEFAULT 0', description: 'Number of files in folder' },
      { name: 'totalSize', type: 'BIGINT DEFAULT 0', description: 'Total size of files in bytes' }
    ];

    for (const column of columnsToAdd) {
      const checkResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'media_folders' AND column_name = $1
      `, [column.name]);

      if (checkResult.rows.length > 0) {
        console.log(`✅ ${column.name} column already exists`);
      } else {
        console.log(`❌ ${column.name} column does not exist`);
        console.log(`📝 Adding ${column.name} column (${column.description})...`);

        await client.query(`
          ALTER TABLE media_folders
          ADD COLUMN "${column.name}" ${column.type}
        `);

        console.log(`✅ ${column.name} column added successfully!`);
      }
    }

    await client.end();
    console.log('\n✅ Done');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (client) {
      await client.end();
    }
    process.exit(1);
  }
}

addSlugColumn();
