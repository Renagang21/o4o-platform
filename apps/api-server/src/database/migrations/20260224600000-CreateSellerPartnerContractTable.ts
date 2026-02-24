import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

/**
 * WO-NETURE-SELLER-PARTNER-CONTRACT-V1
 *
 * Creates:
 * - neture_seller_partner_contracts (Seller ↔ Partner 독립 계약 테이블)
 *
 * ENUMs:
 * - neture_contract_status_enum (active, terminated, expired)
 * - neture_contract_terminated_by_enum (seller, partner)
 *
 * Data migration:
 * - approved 상태 Application → Contract 자동 생성
 */
export class CreateSellerPartnerContractTable20260224600000
  implements MigrationInterface
{
  name = 'CreateSellerPartnerContractTable20260224600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create ENUM types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_contract_status_enum"
          AS ENUM ('active', 'terminated', 'expired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "neture_contract_terminated_by_enum"
          AS ENUM ('seller', 'partner');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create table
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'neture_seller_partner_contracts'
      );
    `);

    if (!tableExists[0]?.exists) {
      await queryRunner.createTable(
        new Table({
          name: 'neture_seller_partner_contracts',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            { name: 'seller_id', type: 'varchar', isNullable: false },
            { name: 'partner_id', type: 'varchar', isNullable: false },
            { name: 'recruitment_id', type: 'uuid', isNullable: false },
            { name: 'application_id', type: 'uuid', isNullable: false },
            {
              name: 'commission_rate',
              type: 'decimal',
              precision: 5,
              scale: 2,
              default: 0,
            },
            {
              name: 'contract_status',
              type: 'enum',
              enum: ['active', 'terminated', 'expired'],
              enumName: 'neture_contract_status_enum',
              default: `'active'`,
            },
            {
              name: 'started_at',
              type: 'timestamp',
              default: 'NOW()',
            },
            {
              name: 'expires_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'ended_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'terminated_by',
              type: 'enum',
              enum: ['seller', 'partner'],
              enumName: 'neture_contract_terminated_by_enum',
              isNullable: true,
            },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' },
            { name: 'updated_at', type: 'timestamp', default: 'NOW()' },
          ],
        }),
        true,
      );

      // 3. Indexes
      // Partial unique: 동일 seller+partner에 active 계약 1개만
      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_neture_contracts_active_pair"
          ON "neture_seller_partner_contracts" ("seller_id", "partner_id")
          WHERE "contract_status" = 'active';
      `);

      await queryRunner.createIndex(
        'neture_seller_partner_contracts',
        new TableIndex({
          name: 'IDX_neture_contracts_seller',
          columnNames: ['seller_id'],
        }),
      );

      await queryRunner.createIndex(
        'neture_seller_partner_contracts',
        new TableIndex({
          name: 'IDX_neture_contracts_partner',
          columnNames: ['partner_id'],
        }),
      );

      await queryRunner.createIndex(
        'neture_seller_partner_contracts',
        new TableIndex({
          name: 'IDX_neture_contracts_status',
          columnNames: ['contract_status'],
        }),
      );
    }

    // 4. Data migration: approved Applications → Contracts
    await queryRunner.query(`
      INSERT INTO "neture_seller_partner_contracts"
        ("seller_id", "partner_id", "recruitment_id", "application_id",
         "commission_rate", "started_at")
      SELECT
        r."seller_id",
        a."partner_id",
        a."recruitment_id",
        a."id",
        r."commission_rate",
        COALESCE(a."decided_at", a."created_at")
      FROM "neture_partner_applications" a
      JOIN "neture_partner_recruitments" r ON a."recruitment_id" = r."id"
      WHERE a."status" = 'approved'
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('neture_seller_partner_contracts', true);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "neture_contract_terminated_by_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "neture_contract_status_enum"`,
    );
  }
}
