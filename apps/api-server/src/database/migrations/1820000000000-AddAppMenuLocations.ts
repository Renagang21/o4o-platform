import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppMenuLocations1820000000000 implements MigrationInterface {
  name = 'AddAppMenuLocations1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new menu locations for app-specific headers
    await queryRunner.query(`
      INSERT INTO "menu_locations" ("key", "name", "description", "order_num") VALUES
      ('shop-categories', 'Shop Categories', 'Shopping mall category menu', 5),
      ('forum-menu', 'Forum Menu', 'Forum navigation menu', 6),
      ('funding-categories', 'Funding Categories', 'Crowdfunding category menu', 7),
      ('business-menu', 'Business Menu', 'Business dashboard menu', 8)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the added menu locations
    await queryRunner.query(`
      DELETE FROM "menu_locations"
      WHERE "key" IN ('shop-categories', 'forum-menu', 'funding-categories', 'business-menu')
    `);
  }
}
