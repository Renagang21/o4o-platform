import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KPA-a 감사 로그 전체 삭제.
 */
export class CleanupKpaAuditLogs1712196000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(`DELETE FROM kpa_operator_audit_logs`);
    console.log(`[CleanupKpaAuditLogs] Deleted: ${result?.[1] ?? 'all'}`);
  }

  public async down(): Promise<void> {
    console.log('[CleanupKpaAuditLogs] Rollback not supported');
  }
}
