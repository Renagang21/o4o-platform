import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1
 *
 * kpa_contents 에 reusable_policy 컬럼 추가.
 *   - 'restricted' : 가져가기 차단 (제작자가 명시적으로 막음)
 *   - 'platform'   : 모든 매장 가져갈 수 있음 (default)
 *
 * Canonical 정책 (자매 IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1 §4.3):
 *   "제작자가 복사 가능 여부를 지정 가능한 도메인은 LMS 강의 한 곳뿐" 이라는 GAP 을 닫기 위해
 *   콘텐츠 허브(kpa_contents) 에도 동일 정책 축을 도입. LMS 와 동일한 enum 값 체계를 따른다.
 *
 * 본 WO 에서는 'restricted' / 'platform' 2개 값만 사용 (단순화). LMS 의 'organization'
 * 값은 향후 정책 확장 시 enum 만 늘리면 된다 — varchar(20) 스키마는 그대로 호환.
 *
 * 기존 콘텐츠 백필:
 *   기존 운영 중인 콘텐츠가 자료함 가져가기에서 막히지 않도록 모두 'platform' 으로 백필.
 *   신규 콘텐츠는 default 'platform' 으로 생성된다 (제작자가 의도적으로 'restricted' 변경 가능).
 *   ※ LMS 와 default 가 다른 이유: LMS 강의는 학습/유료 자산이라 default restricted 가 맞고,
 *     일반 콘텐츠 허브는 default platform 이 매장에 더 자연스럽다.
 *
 * 컬럼명은 snake_case(reusable_policy) — LMS 와 동일 컨벤션.
 */
export class AddReusablePolicyToKpaContents20260510000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS kpa_contents
        ADD COLUMN IF NOT EXISTS reusable_policy VARCHAR(20) NOT NULL DEFAULT 'platform'
    `);

    // 기존 콘텐츠는 default 와 동일하게 platform 이므로 별도 backfill UPDATE 불필요.
    // (default 가 platform 이라 ADD COLUMN 시점에 자동으로 platform 으로 채워짐)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpa_contents_reusable_policy
        ON kpa_contents(reusable_policy)
    `);

    console.log('[Migration] kpa_contents: added reusable_policy (default platform) + idx_kpa_contents_reusable_policy');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kpa_contents_reusable_policy`);
    await queryRunner.query(`
      ALTER TABLE IF EXISTS kpa_contents
        DROP COLUMN IF EXISTS reusable_policy
    `);
  }
}
