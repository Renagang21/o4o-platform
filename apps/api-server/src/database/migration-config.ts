import { DataSource } from 'typeorm';
import { env } from '../utils/env-validator.js';

// 마이그레이션 실행 전용 DataSource
export default new DataSource({
  type: 'postgres',
  host: env.getString('DB_HOST'),
  port: env.getNumber('DB_PORT'),
  username: env.getString('DB_USERNAME'),
  password: env.getString('DB_PASSWORD'),
  database: env.getString('DB_NAME'),
  
  // 마이그레이션 설정
  migrations: [__dirname + '/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  
  // SSL 설정 (프로덕션 환경)
  ssl: env.getString('NODE_ENV', 'development') === 'production' ? {
    rejectUnauthorized: false
  } : false,
});