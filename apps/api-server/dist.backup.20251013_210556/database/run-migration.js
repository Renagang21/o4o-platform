"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const connection_1 = require("./connection");
async function runMigration() {
    try {
        await connection_1.AppDataSource.initialize();
        // Data source initialized successfully
        await connection_1.AppDataSource.runMigrations();
        // Migrations executed successfully
        await connection_1.AppDataSource.destroy();
        // Data source closed successfully
    }
    catch (error) {
        // Error log removed
        process.exit(1);
    }
}
runMigration();
//# sourceMappingURL=run-migration.js.map