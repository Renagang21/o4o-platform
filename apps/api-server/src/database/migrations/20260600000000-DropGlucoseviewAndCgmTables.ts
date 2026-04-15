import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLUCOSEVIEW-GLUCOSEVIEW-CARE-REMOVAL-AUDIT-V1 — Phase 3
 *
 * GlucoseView 서비스 완전 삭제: DB 테이블 DROP
 *
 * 전제:
 *   Phase 1 (코드 참조 제거) + Phase 2 (파일 삭제) 완료 후 실행.
 *   GlucoseView 서비스는 prod에서 실 사용자가 없는 상태로 확인됨.
 *
 * DROP 순서 (FK 안전 순서 — 자식 테이블 먼저):
 *   glucoseview_connections  (FK → glucoseview_customers, glucoseview_pharmacies)
 *   glucoseview_view_profiles
 *   glucoseview_applications (FK → glucoseview_pharmacies)
 *   glucoseview_customers
 *   glucoseview_pharmacists
 *   glucoseview_pharmacies   (FK → glucoseview_vendors)
 *   glucoseview_chapters     (FK → glucoseview_branches)
 *   glucoseview_branches
 *   glucoseview_vendors
 *   cgm_glucose_insights     (care 모듈 CGM 관련)
 *   cgm_patient_summaries
 *   cgm_patients
 *
 * down(): 구조만 복구 (데이터 복구 불가)
 */
export class DropGlucoseviewAndCgmTables20260600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'glucoseview_connections',
      'glucoseview_view_profiles',
      'glucoseview_applications',
      'glucoseview_customers',
      'glucoseview_pharmacists',
      'glucoseview_pharmacies',
      'glucoseview_chapters',
      'glucoseview_branches',
      'glucoseview_vendors',
      'cgm_glucose_insights',
      'cgm_patient_summaries',
      'cgm_patients',
    ];

    for (const table of tables) {
      const exists = await queryRunner.hasTable(table);
      if (exists) {
        await queryRunner.query(`DROP TABLE "${table}" CASCADE`);
        console.log(`[DropGlucoseviewAndCgmTables] ${table} dropped`);
      } else {
        console.log(`[DropGlucoseviewAndCgmTables] ${table} — already absent, skipping`);
      }
    }

    console.log('[DropGlucoseviewAndCgmTables] All glucoseview/cgm tables dropped.');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 데이터 복구 불가 — 스키마만 표시 (운영 롤백 시 DBA 수동 복구 필요)
    console.warn('[DropGlucoseviewAndCgmTables] down() called — tables cannot be restored automatically. Manual DBA recovery required.');
  }
}
