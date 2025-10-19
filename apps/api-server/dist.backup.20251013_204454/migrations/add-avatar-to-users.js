"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddAvatarToUsers1738005000000 = void 0;
class AddAvatarToUsers1738005000000 {
    constructor() {
        this.name = 'AddAvatarToUsers1738005000000';
    }
    async up(queryRunner) {
        // Add avatar column to users table
        await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "avatar" varchar(500)
    `);
    }
    async down(queryRunner) {
        // Remove avatar column
        await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "avatar"
    `);
    }
}
exports.AddAvatarToUsers1738005000000 = AddAvatarToUsers1738005000000;
//# sourceMappingURL=add-avatar-to-users.js.map