"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddAppMenuLocations1820000000000 = void 0;
class AddAppMenuLocations1820000000000 {
    constructor() {
        this.name = 'AddAppMenuLocations1820000000000';
    }
    async up(queryRunner) {
        // Add new menu locations for app-specific headers
        await queryRunner.query(`
      INSERT INTO "menu_locations" ("key", "name", "description", "order_num") VALUES
      ('shop-categories', 'Shop Categories', 'Shopping mall category menu', 5),
      ('forum-menu', 'Forum Menu', 'Forum navigation menu', 6),
      ('funding-categories', 'Funding Categories', 'Crowdfunding category menu', 7),
      ('business-menu', 'Business Menu', 'Business dashboard menu', 8)
    `);
    }
    async down(queryRunner) {
        // Remove the added menu locations
        await queryRunner.query(`
      DELETE FROM "menu_locations"
      WHERE "key" IN ('shop-categories', 'forum-menu', 'funding-categories', 'business-menu')
    `);
    }
}
exports.AddAppMenuLocations1820000000000 = AddAppMenuLocations1820000000000;
//# sourceMappingURL=1820000000000-AddAppMenuLocations.js.map