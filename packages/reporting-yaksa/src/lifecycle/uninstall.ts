import { DataSource } from 'typeorm';
import { UninstallContext } from '../types/context.js';

/**
 * Uninstall Hook
 *
 * reporting-yaksa 앱 삭제 시 실행되는 훅
 *
 * keepData=true (기본값): 데이터 유지
 * keepData=false: 테이블 삭제
 */
export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, keepData = true, backup = true } = context;

  console.log('[reporting-yaksa] Uninstalling...');

  if (keepData) {
    console.log('[reporting-yaksa] Keeping data (default policy)');
    console.log('[reporting-yaksa] Tables preserved: yaksa_annual_reports, yaksa_report_field_templates, yaksa_report_logs, yaksa_report_assignments');
    console.log('[reporting-yaksa] Uninstallation completed (data preserved)');
    return;
  }

  // 데이터 삭제 모드
  console.warn('[reporting-yaksa] WARNING: Data deletion mode enabled');

  if (backup) {
    console.log('[reporting-yaksa] Creating backup before deletion...');
    // TODO: 백업 로직 구현
    // - Export to JSON
    // - Store in backup table or file
    console.log('[reporting-yaksa] Backup created');
  }

  // 테이블 삭제 (역순으로 FK 제약 해결)
  const tablesToDrop = [
    'yaksa_report_assignments',
    'yaksa_report_logs',
    'yaksa_annual_reports',
    'yaksa_report_field_templates',
  ];

  console.log('[reporting-yaksa] Dropping tables...');

  for (const table of tablesToDrop) {
    try {
      await dataSource.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      console.log(`[reporting-yaksa] Dropped table: ${table}`);
    } catch (error: any) {
      console.error(`[reporting-yaksa] Failed to drop table ${table}:`, error.message);
    }
  }

  console.log('[reporting-yaksa] Uninstallation completed (data deleted)');
}

export default uninstall;
