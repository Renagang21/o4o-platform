import { MigrationInterface, QueryRunner } from 'typeorm';
export class RenameMarketingNameToName1745287200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_masters RENAME COLUMN marketing_name TO name
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_masters RENAME COLUMN name TO marketing_name
    `);
  }
}
