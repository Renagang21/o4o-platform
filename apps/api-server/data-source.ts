import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'o4o_user',
  password: process.env.DB_PASSWORD || 'o4o_password123',
  database: process.env.DB_NAME || 'o4o_platform',
  synchronize: false,
  logging: true,
  entities: [path.join(__dirname, 'src/entities/**/*.{ts,js}')],
  migrations: [path.join(__dirname, 'src/database/migrations/**/*.{ts,js}')],
  subscribers: [],
});