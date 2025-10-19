"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTypeFieldToPosts1736500000000 = void 0;
const typeorm_1 = require("typeorm");
class AddTypeFieldToPosts1736500000000 {
    constructor() {
        this.name = 'AddTypeFieldToPosts1736500000000';
    }
    async up(queryRunner) {
        // Check if the column already exists
        const table = await queryRunner.getTable('posts');
        const typeColumn = table === null || table === void 0 ? void 0 : table.findColumnByName('type');
        if (!typeColumn) {
            // Add type column to posts table
            await queryRunner.addColumn('posts', new typeorm_1.TableColumn({
                name: 'type',
                type: 'varchar',
                length: '50',
                isNullable: false,
                default: "'post'"
            }));
        }
    }
    async down(queryRunner) {
        // Remove type column from posts table
        const table = await queryRunner.getTable('posts');
        const typeColumn = table === null || table === void 0 ? void 0 : table.findColumnByName('type');
        if (typeColumn) {
            await queryRunner.dropColumn('posts', 'type');
        }
    }
}
exports.AddTypeFieldToPosts1736500000000 = AddTypeFieldToPosts1736500000000;
//# sourceMappingURL=AddTypeFieldToPosts.js.map