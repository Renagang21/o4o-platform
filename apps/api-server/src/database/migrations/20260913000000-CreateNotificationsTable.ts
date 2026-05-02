import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-NOTIFICATION-CORE-BASELINE-V1
 *
 * Common Notification table activation.
 *
 * Notification entity (apps/api-server/src/entities/Notification.ts) was defined
 * during Phase PD-7 but never had a CREATE TABLE migration, so the table is
 * absent in production. This migration creates `notifications` aligned with the
 * extended entity (serviceKey / organizationId / actorId / priority / updatedAt).
 *
 * Forum-specific notifications continue to live in `forum_notifications` and are
 * NOT touched by this migration.
 *
 * All DDL is IF NOT EXISTS — safe to re-run.
 */
export class CreateNotificationsTable20260913000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "serviceKey" varchar(100) NULL,
        "organizationId" uuid NULL,
        "actorId" uuid NULL,
        channel varchar(50) NOT NULL DEFAULT 'in_app',
        type varchar(50) NOT NULL,
        title varchar(255) NOT NULL,
        message text NULL,
        metadata jsonb NULL,
        priority varchar(20) NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "readAt" timestamp with time zone NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_isRead_createdAt"
        ON notifications ("userId", "isRead", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_serviceKey_user_createdAt"
        ON notifications ("serviceKey", "userId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_organizationId_createdAt"
        ON notifications ("organizationId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_type_createdAt"
        ON notifications (type, "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_type_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_organizationId_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_serviceKey_user_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_isRead_createdAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
  }
}
