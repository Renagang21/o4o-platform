#!/usr/bin/env node
/**
 * Run migrations using built JavaScript files
 * This script is used during deployment to avoid TypeScript compilation issues
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function runMigrations() {
  try {
    console.log('🔄 Running migrations using built files...');

    const { stdout, stderr } = await execAsync(
      'node dist/database/run-migration.js',
      {
        cwd: projectRoot,
        env: { ...process.env, NODE_ENV: 'production' }
      }
    );

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

runMigrations();
