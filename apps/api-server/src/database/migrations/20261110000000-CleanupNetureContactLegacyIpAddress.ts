/**
 * CleanupNetureContactLegacyIpAddress
 *
 * WO-O4O-CONTACT-NETURE-LEGACY-IP-CLEANUP-V1
 *
 * neture_contact_messages 의 legacy "ipAddress" 원문 데이터를 정리한다(개인정보 최소수집).
 * - "ipAddress" IS NOT NULL row:
 *     · pgcrypto digest 가용 시: "ipHash" 가 비어있으면 sha256("ipAddress") 백필(Option A).
 *       (app 의 Node createHash('sha256').update(ip).digest('hex') 와 동일 출력)
 *     · 그 후 "ipAddress" = NULL (원문 제거).
 *     · pgcrypto 불가 시: "ipAddress" = NULL 만(Option C — hash 백필 없음).
 * - row 삭제 없음. 운영 데이터(message/status/adminNotes/notificationStatus) 보존.
 * - "ipAddress" 컬럼은 drop 하지 않는다(후속 WO).
 *
 * 보안: 카운트만 로깅하며 원문 IP 값을 로그/출력에 남기지 않는다.
 *
 * down: 일방향 hash 이므로 원문 IP 복구 불가 → no-op.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupNetureContactLegacyIpAddress20261110000000 implements MigrationInterface {
  name = 'CleanupNetureContactLegacyIpAddress20261110000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('neture_contact_messages'))) {
      console.log('[IP-CLEANUP] neture_contact_messages not found — skip');
      return;
    }
    if (!(await queryRunner.hasColumn('neture_contact_messages', 'ipAddress'))) {
      console.log('[IP-CLEANUP] "ipAddress" column not found — nothing to clean');
      return;
    }
    const hasHashCol = await queryRunner.hasColumn('neture_contact_messages', 'ipHash');

    // 처리 대상 카운트 (원문 미출력)
    const [{ before }] = await queryRunner.query(
      `SELECT COUNT(*)::int AS before FROM neture_contact_messages WHERE "ipAddress" IS NOT NULL`,
    );
    console.log(`[IP-CLEANUP] rows with raw ipAddress before: ${before}`);

    if (before > 0) {
      // pgcrypto digest 가용성 probe (함수 직접 호출 없이 — 트랜잭션 poison 방지)
      const [{ has_digest }] = await queryRunner.query(
        `SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'digest') AS has_digest`,
      );

      if (hasHashCol && has_digest) {
        // Option A: ipHash 비어있는 row 에 sha256 백필
        await queryRunner.query(
          `UPDATE neture_contact_messages
              SET "ipHash" = encode(digest("ipAddress", 'sha256'), 'hex')
            WHERE "ipAddress" IS NOT NULL AND "ipHash" IS NULL`,
        );
        console.log('[IP-CLEANUP] backfilled ipHash from sha256(ipAddress) (Option A)');
      } else {
        console.log(`[IP-CLEANUP] hash backfill skipped (hasHashCol=${hasHashCol}, has_digest=${has_digest}) → Option C (null only)`);
      }

      // 원문 IP 제거
      await queryRunner.query(
        `UPDATE neture_contact_messages SET "ipAddress" = NULL WHERE "ipAddress" IS NOT NULL`,
      );
    }

    const [{ after }] = await queryRunner.query(
      `SELECT COUNT(*)::int AS after FROM neture_contact_messages WHERE "ipAddress" IS NOT NULL`,
    );
    const hashCount = hasHashCol
      ? (await queryRunner.query(`SELECT COUNT(*)::int AS c FROM neture_contact_messages WHERE "ipHash" IS NOT NULL`))[0].c
      : 'n/a';
    console.log(`[IP-CLEANUP] done. raw ipAddress after: ${after} (expect 0), ipHash count: ${hashCount}`);
  }

  async down(): Promise<void> {
    // 일방향 hash 로 원문 IP 를 복구할 수 없으므로 down 은 의도적으로 no-op.
    console.log('[IP-CLEANUP] down: no-op (raw IP는 일방향 hash 처리되어 복구 불가)');
  }
}
