"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const env_validator_1 = require("../utils/env-validator");
// 마이그레이션 실행 전용 DataSource
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    host: env_validator_1.env.getString('DB_HOST'),
    port: env_validator_1.env.getNumber('DB_PORT'),
    username: env_validator_1.env.getString('DB_USERNAME'),
    password: env_validator_1.env.getString('DB_PASSWORD'),
    database: env_validator_1.env.getString('DB_NAME'),
    // 마이그레이션 설정
    migrations: [__dirname + '/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations',
    // SSL 설정 (프로덕션 환경)
    ssl: env_validator_1.env.getString('NODE_ENV', 'development') === 'production' ? {
        rejectUnauthorized: false
    } : false,
});
//# sourceMappingURL=migration-config.js.map