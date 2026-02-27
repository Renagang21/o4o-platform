/**
 * NO-OP migration — superseded by DropLegacyRbacColumns20260228000002
 *
 * This migration class is retained for TypeORM tracking compatibility only.
 * All actual drops are handled by 20260228000002-DropLegacyRbacColumns.ts
 * which uses comprehensive IF EXISTS safety guards.
 *
 * History:
 *   Originally from local feature branch. Merged alongside
 *   CleanupLegacyRoles20260228000001 (same timestamp → ordering ambiguity)
 *   and DropLegacyRbacColumns20260228000002 (same drops → conflict risk).
 *   Converted to no-op to prevent duplicate timestamp issues.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyRbacColumns20260228000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // No-op: all legacy RBAC column drops are handled by
    // DropLegacyRbacColumns20260228000002 with full IF EXISTS safety guards.
    console.log('[Migration] DropLegacyRbacColumns20260228000001: no-op (superseded by 20260228000002)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: down is handled by DropLegacyRbacColumns20260228000002
    console.log('[Migration] DropLegacyRbacColumns20260228000001 down: no-op');
  }
}
