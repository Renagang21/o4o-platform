import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'apps/api-server/.env.production') });

const { Client } = pg;

const files = [
  { filename: 'general_1761485472872_e6e715a1b9a8e1d3.md', originalName: 'seller-manual.md' },
  { filename: 'general_1761485473440_3e553e6e2bff53bf.md', originalName: 'supplier-manual.md' },
  { filename: 'general_1761485473995_bdd31027f334306e.md', originalName: 'platform-features.md' },
  { filename: 'general_1761485474554_c60c69246d6e8500.md', originalName: 'appearance-template-parts.md' },
  { filename: 'general_1761485475105_0d03a126536dad3d.md', originalName: 'appearance-menus.md' },
  { filename: 'general_1761485475652_82d3b57feb02caf1.md', originalName: 'appearance-customize.md' }
];

async function insertMediaRecords() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get admin user ID
    const adminResult = await client.query(`SELECT id FROM users WHERE email = 'admin@neture.co.kr' LIMIT 1`);
    const uploadedBy = adminResult.rows[0]?.id;
    console.log('Admin user ID:', uploadedBy, '\n');

    for (const file of files) {
      const filePath = path.join('/home/ubuntu/o4o-platform/public/uploads/general', file.filename);
      const stats = fs.statSync(filePath);
      const url = `/uploads/general/${file.filename}`;

      const result = await client.query(`
        INSERT INTO media_files (
          filename, "originalName", url, path, "mimeType", size,
          "uploadedBy", "uploadedAt", "updatedAt", created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
        RETURNING id
      `, [file.filename, file.originalName, url, filePath, 'text/markdown', stats.size, uploadedBy]);

      console.log(`✅ ${file.originalName} -> ID: ${result.rows[0].id}`);
    }

    console.log('\n=== Final count ===');
    const count = await client.query('SELECT COUNT(*) FROM media_files');
    console.log('Total files in DB:', count.rows[0].count);

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

insertMediaRecords();
