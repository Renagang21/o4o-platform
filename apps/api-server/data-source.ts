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

// DB 환경변수 필수 - 로컬 폴백 제거 (API 서버 통해 접속)
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_NAME) {
  console.error('[data-source.ts] 필수 DB 환경변수가 설정되지 않았습니다.');
  console.error('필요한 환경변수: DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME');
  process.exit(1);
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: parseInt(DB_PORT || '5432'),
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  synchronize: false,
  logging: true,
  entities: [path.join(__dirname, 'src/entities/**/*.{ts,js}')],
  migrations: [path.join(__dirname, 'src/database/migrations/**/*.{ts,js}')],
  subscribers: [],
});