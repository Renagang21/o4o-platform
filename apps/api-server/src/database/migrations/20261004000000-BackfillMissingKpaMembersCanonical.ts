import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-OPERATOR-MEMBER-CANONICAL-EDIT-COMPLETE-V1
 * (선행: WO-O4O-KPA-MEMBER-CANONICAL-PRESENCE-BACKFILL-V1 Step 1 — 진단 SQL 문서화)
 *
 * 목적:
 *   service_memberships(service_key IN ('kpa-society','kpa')) 가 존재하는 사용자에
 *   kpa_members row 가 없는 drift 정리 — SSOT 로 kpa_members 를 invariant 화.
 *
 * 근거:
 *   - docs/investigations/IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1.md
 *   - docs/baseline/operations/KPA-MEMBERS-PRESENCE-DRIFT-DIAGNOSTICS.md
 *
 * Backfill 정책 — skeleton row 생성:
 *   - membership_type derive:
 *       · kpa_pharmacist_profiles 존재 → 'pharmacist'
 *       · kpa_student_profiles 존재 → 'pharmacy_student_member'
 *       · 둘 다 없음 → 'pharmacist' (안전 default — KPA 가입자는 약사 가입이 일반적)
 *   - role: sm.role 이 'member'/'operator'/'admin' 중 하나면 그대로, 아니면 'member'
 *   - status:
 *       · sm.status='active' → 'active'
 *       · 그 외 → 'pending'
 *   - identity_status: 'active' (skeleton 기본값)
 *   - joined_at: sm.status='active' 인 경우만 sm.created_at, 아니면 NULL
 *   - 같은 user_id 의 sm 가 여러 row 인 경우 DISTINCT ON (user_id) 으로 가장 최근 sm 사용
 *
 * 무변경:
 *   - 기존 kpa_members row (LEFT JOIN km.id IS NULL 가드)
 *   - service_memberships / users / role_assignments / kpa_pharmacist_profiles / kpa_student_profiles
 *   - organizations / organization_members
 *
 * 멱등성: 재실행 안전 — 가드 (km.id IS NULL) 가 이미 채워진 row 를 자동 제외.
 * down(): no-op (canonical drift 재유발 방지).
 */
export class BackfillMissingKpaMembersCanonical20261004000000 implements MigrationInterface {
  name = 'BackfillMissingKpaMembersCanonical20261004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tag = '[Migration] BackfillMissingKpaMembersCanonical';

    // 1. 사전 진단 — 누락 카운트
    const beforeRows = await queryRunner.query(`
      SELECT COUNT(DISTINCT sm.user_id)::int AS drift_count
      FROM service_memberships sm
      LEFT JOIN kpa_members km ON km.user_id = sm.user_id
      WHERE sm.service_key IN ('kpa-society', 'kpa')
        AND km.id IS NULL
    `);
    const driftCount: number = beforeRows[0]?.drift_count ?? 0;
    console.log(`${tag}: missing kpa_members count = ${driftCount}`);

    if (driftCount === 0) {
      console.log(`${tag}: no-op (no drift detected)`);
      return;
    }

    // 2. 사전 샘플 로그 (최대 5건)
    const sampleRows = await queryRunner.query(`
      SELECT DISTINCT ON (sm.user_id)
        sm.user_id,
        u.email,
        sm.status AS sm_status,
        sm.role AS sm_role,
        pp.user_id IS NOT NULL AS has_pharmacist_profile,
        sp.user_id IS NOT NULL AS has_student_profile
      FROM service_memberships sm
      JOIN users u ON u.id = sm.user_id
      LEFT JOIN kpa_members km ON km.user_id = sm.user_id
      LEFT JOIN kpa_pharmacist_profiles pp ON pp.user_id = sm.user_id
      LEFT JOIN kpa_student_profiles sp ON sp.user_id = sm.user_id
      WHERE sm.service_key IN ('kpa-society', 'kpa')
        AND km.id IS NULL
      ORDER BY sm.user_id, sm.created_at DESC
      LIMIT 5
    `);
    console.log(`${tag}: sample drift rows (max 5):`);
    for (const row of sampleRows as Array<{
      user_id: string; email: string | null;
      sm_status: string; sm_role: string;
      has_pharmacist_profile: boolean; has_student_profile: boolean;
    }>) {
      console.log(
        `  - user_id=${row.user_id} email=${row.email ?? '-'} ` +
        `sm_status=${row.sm_status} sm_role=${row.sm_role} ` +
        `has_pharmacist=${row.has_pharmacist_profile} has_student=${row.has_student_profile}`
      );
    }

    // 3. Backfill INSERT
    //   DISTINCT ON (sm.user_id) — 같은 user 의 sm 가 여러 row 인 경우 가장 최근 sm 기준.
    //   동일 user_id 에 중복 INSERT 방지 — kpa_members.user_id 의 UNIQUE 제약 부재 시 안전 가드.
    const insertResult = await queryRunner.query(`
      INSERT INTO kpa_members (
        user_id, role, status, identity_status, membership_type,
        joined_at, created_at, updated_at
      )
      SELECT DISTINCT ON (sm.user_id)
        sm.user_id,
        CASE
          WHEN sm.role IN ('member', 'operator', 'admin') THEN sm.role
          ELSE 'member'
        END AS role,
        CASE
          WHEN sm.status = 'active' THEN 'active'
          ELSE 'pending'
        END AS status,
        'active' AS identity_status,
        CASE
          WHEN pp.user_id IS NOT NULL THEN 'pharmacist'
          WHEN sp.user_id IS NOT NULL THEN 'pharmacy_student_member'
          ELSE 'pharmacist'
        END AS membership_type,
        CASE
          WHEN sm.status = 'active' THEN sm.created_at::date
          ELSE NULL
        END AS joined_at,
        NOW(),
        NOW()
      FROM service_memberships sm
      LEFT JOIN kpa_members km ON km.user_id = sm.user_id
      LEFT JOIN kpa_pharmacist_profiles pp ON pp.user_id = sm.user_id
      LEFT JOIN kpa_student_profiles sp ON sp.user_id = sm.user_id
      WHERE sm.service_key IN ('kpa-society', 'kpa')
        AND km.id IS NULL
      ORDER BY sm.user_id, sm.created_at DESC
      RETURNING id, user_id, membership_type, status
    `);
    const insertedCount = Array.isArray(insertResult) ? insertResult.length : 0;
    console.log(`${tag}: inserted ${insertedCount} skeleton kpa_members rows`);

    // 4. 분포 로그 (생성된 skeleton)
    if (insertedCount > 0) {
      const distRows = await queryRunner.query(`
        SELECT membership_type, status, COUNT(*)::int AS count
        FROM kpa_members
        WHERE created_at >= NOW() - INTERVAL '10 minutes'
        GROUP BY membership_type, status
        ORDER BY count DESC
      `);
      console.log(`${tag}: created skeleton distribution:`);
      for (const row of distRows as Array<{ membership_type: string; status: string; count: number }>) {
        console.log(`  - membership_type=${row.membership_type} status=${row.status} count=${row.count}`);
      }
    }

    // 5. 사후 검증 — drift 0
    const afterRows = await queryRunner.query(`
      SELECT COUNT(DISTINCT sm.user_id)::int AS remaining_drift
      FROM service_memberships sm
      LEFT JOIN kpa_members km ON km.user_id = sm.user_id
      WHERE sm.service_key IN ('kpa-society', 'kpa')
        AND km.id IS NULL
    `);
    const remainingDrift: number = afterRows[0]?.remaining_drift ?? 0;
    if (remainingDrift > 0) {
      throw new Error(
        `${tag}: post-check failed — ${remainingDrift} drift row(s) still exist. ` +
        `Concurrent writer or unexpected DB state.`
      );
    }
    console.log(`${tag}: ✅ remaining drift = 0 (DONE)`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // down() no-op — 생성된 skeleton 삭제 시 동일 drift 재유발 + 식별 어려움
    console.log('[Migration] BackfillMissingKpaMembersCanonical down: no-op (skeleton removal would reintroduce drift)');
  }
}
