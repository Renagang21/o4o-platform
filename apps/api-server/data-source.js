"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
var typeorm_1 = require("typeorm");
var dotenv = require("dotenv");
var path = require("path");
// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
exports.AppDataSource = new typeorm_1.DataSource({
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
