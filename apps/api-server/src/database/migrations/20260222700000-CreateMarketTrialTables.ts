import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1
 *
 * Create 6 market trial tables:
 * - market_trials (core)
 * - market_trial_participants (core)
 * - market_trial_forums (core)
 * - market_trial_decisions (core)
 * - market_trial_shipping_addresses (extension)
 * - market_trial_fulfillments (extension)
 */
export class CreateMarketTrialTables1740222700000 implements MigrationInterface {
  name = 'CreateMarketTrialTables1740222700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. market_trials
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplierId" uuid NOT NULL,
        "productId" uuid,
        "outcomeSnapshot" jsonb,
        "title" varchar(255) NOT NULL,
        "description" text,
        "trialUnitPrice" decimal(12,2) NOT NULL,
        "targetAmount" decimal(12,2) NOT NULL,
        "currentAmount" decimal(12,2) NOT NULL DEFAULT 0,
        "fundingStartAt" timestamp NOT NULL,
        "fundingEndAt" timestamp NOT NULL,
        "trialPeriodDays" int NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'draft',
        "supplierName" varchar(255),
        "eligibleRoles" jsonb NOT NULL DEFAULT '["partner","seller"]',
        "rewardOptions" jsonb NOT NULL DEFAULT '["cash","product"]',
        "maxParticipants" int,
        "currentParticipants" int NOT NULL DEFAULT 0,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_trials" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_market_trials_supplierId" ON "market_trials" ("supplierId")`);
    await queryRunner.query(`CREATE INDEX "IDX_market_trials_productId" ON "market_trials" ("productId")`);
    await queryRunner.query(`CREATE INDEX "IDX_market_trials_status" ON "market_trials" ("status")`);

    // 2. market_trial_participants
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_participants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "marketTrialId" uuid NOT NULL,
        "participantId" uuid NOT NULL,
        "participantType" varchar(20) NOT NULL,
        "contributionAmount" decimal(12,2) NOT NULL,
        "rewardType" varchar(20),
        "rewardStatus" varchar(20) NOT NULL DEFAULT 'pending',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_trial_participants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_market_trial_participants_marketTrialId" ON "market_trial_participants" ("marketTrialId")`);
    await queryRunner.query(`CREATE INDEX "IDX_market_trial_participants_participantId" ON "market_trial_participants" ("participantId")`);

    // 3. market_trial_forums
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_forums" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "marketTrialId" uuid NOT NULL,
        "forumId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_trial_forums" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_market_trial_forums_marketTrialId" ON "market_trial_forums" ("marketTrialId")`);
    await queryRunner.query(`CREATE INDEX "IDX_market_trial_forums_forumId" ON "market_trial_forums" ("forumId")`);

    // 4. market_trial_decisions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_decisions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "marketTrialId" uuid NOT NULL,
        "participantId" uuid NOT NULL,
        "participantType" varchar(20) NOT NULL,
        "decision" varchar(20) NOT NULL,
        "selectedSellerIds" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_trial_decisions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_market_trial_decisions_trial_participant" UNIQUE ("marketTrialId", "participantId")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_market_trial_decisions_marketTrialId" ON "market_trial_decisions" ("marketTrialId")`);
    await queryRunner.query(`CREATE INDEX "IDX_market_trial_decisions_participantId" ON "market_trial_decisions" ("participantId")`);

    // 5. market_trial_shipping_addresses (extension)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_shipping_addresses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "participationId" uuid NOT NULL,
        "recipientName" varchar(100) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "postalCode" varchar(10) NOT NULL,
        "address" varchar(500) NOT NULL,
        "addressDetail" varchar(200),
        "deliveryNote" varchar(500),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_trial_shipping_addresses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_market_trial_shipping_addresses_participationId" ON "market_trial_shipping_addresses" ("participationId")`);

    // 6. market_trial_fulfillments (extension)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "market_trial_fulfillments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "participationId" uuid NOT NULL,
        "trialId" uuid NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'pending',
        "orderId" uuid,
        "orderNumber" varchar(50),
        "statusHistory" jsonb NOT NULL DEFAULT '[]',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_market_trial_fulfillments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_market_trial_fulfillments_participationId" ON "market_trial_fulfillments" ("participationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_market_trial_fulfillments_trialId" ON "market_trial_fulfillments" ("trialId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_fulfillments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_shipping_addresses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_decisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_forums"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trial_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "market_trials"`);
  }
}
