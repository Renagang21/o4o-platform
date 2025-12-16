const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// DB 환경변수 필수 - 로컬 폴백 제거 (API 서버 통해 접속)
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_NAME) {
  console.error('[ormconfig.js] 필수 DB 환경변수가 설정되지 않았습니다.');
  console.error('필요한 환경변수: DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME');
  process.exit(1);
}

module.exports = {
  type: 'postgres',
  host: DB_HOST,
  port: parseInt(DB_PORT || '5432'),
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  synchronize: false,
  logging: true,
  entities: ['dist/entities/**/*.js'],
  migrations: ['dist/database/migrations/**/*.js'],
  cli: {
    migrationsDir: 'src/database/migrations'
  }
};