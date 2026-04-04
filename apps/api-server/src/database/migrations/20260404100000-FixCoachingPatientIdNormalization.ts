import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-COACHING-PATIENT-ID-NORMALIZATION-FIX-V1
 *
 * care_coaching_sessions.patient_id에 glucoseview_customers.id가 저장된 행을
 * 올바른 users.id로 보정한다.
 *
 * 판별 기준:
 *   patient_id가 users 테이블에 없고,
 *   glucoseview_customers.id로 매핑되며 user_id가 NOT NULL인 경우 → 보정 대상
 *
 * care_coaching_drafts도 동일 패턴이므로 함께 보정한다.
 */
export class FixCoachingPatientIdNormalization1714780800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. care_coaching_sessions 보정
    const sessionResult = await queryRunner.query(`
      UPDATE care_coaching_sessions cs
      SET patient_id = gc.user_id
      FROM glucoseview_customers gc
      WHERE cs.patient_id = gc.id
        AND gc.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM users u WHERE u.id = cs.patient_id
        )
    `);
    const sessionsFixed = sessionResult?.[1] ?? 0;
    console.log(`[FixCoachingPatientId] care_coaching_sessions: ${sessionsFixed} rows corrected`);

    // 2. care_coaching_drafts 보정
    const draftResult = await queryRunner.query(`
      UPDATE care_coaching_drafts cd
      SET patient_id = gc.user_id
      FROM glucoseview_customers gc
      WHERE cd.patient_id = gc.id
        AND gc.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM users u WHERE u.id = cd.patient_id
        )
    `);
    const draftsFixed = draftResult?.[1] ?? 0;
    console.log(`[FixCoachingPatientId] care_coaching_drafts: ${draftsFixed} rows corrected`);

    // 3. care_messages 보정
    const msgResult = await queryRunner.query(`
      UPDATE care_messages cm
      SET patient_id = gc.user_id
      FROM glucoseview_customers gc
      WHERE cm.patient_id = gc.id
        AND gc.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM users u WHERE u.id = cm.patient_id
        )
    `);
    const msgsFixed = msgResult?.[1] ?? 0;
    console.log(`[FixCoachingPatientId] care_messages: ${msgsFixed} rows corrected`);

    // 4. 보정 불가 건수 보고 (gc.user_id IS NULL)
    const unresolvedSessions = await queryRunner.query(`
      SELECT COUNT(*)::int AS count
      FROM care_coaching_sessions cs
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cs.patient_id)
    `);
    const unresolvedCount = unresolvedSessions[0]?.count ?? 0;
    if (unresolvedCount > 0) {
      console.warn(`[FixCoachingPatientId] WARNING: ${unresolvedCount} coaching sessions still have unresolvable patient_id (gc.user_id IS NULL)`);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 역방향 보정은 위험하므로 수행하지 않음
    console.log('[FixCoachingPatientId] down: no-op (irreversible data correction)');
  }
}
