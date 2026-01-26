/**
 * Migration: UpdateTestAccountEmailsToO4O
 *
 * 모든 테스트 계정 이메일을 @o4o.com 도메인으로 통일
 *
 * 변경 내용:
 * - @test.test → @o4o.com
 * - @k-cosmetics.test → @o4o.com
 * - @kpa-test.kr → @o4o.com
 * - @glycopharm.kr → @o4o.com
 * - @neture.test → @o4o.com
 * - @neture.co.kr → @o4o.com
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// 이메일 변경 매핑 (old → new)
const EMAIL_CHANGES = [
  // GlucoseView
  { old: 'pharmacist@test.test', new: 'pharmacist@o4o.com' },
  { old: 'admin@test.test', new: 'admin@o4o.com' },

  // K-Cosmetics
  { old: 'consumer@k-cosmetics.test', new: 'consumer-k-cosmetics@o4o.com' },
  { old: 'seller@k-cosmetics.test', new: 'seller-k-cosmetics@o4o.com' },
  { old: 'supplier@k-cosmetics.test', new: 'supplier-k-cosmetics@o4o.com' },
  { old: 'admin@k-cosmetics.test', new: 'admin-k-cosmetics@o4o.com' },

  // GlycoPharm
  { old: 'pharmacy@glycopharm.kr', new: 'pharmacy-glycopharm@o4o.com' },
  { old: 'admin@neture.co.kr', new: 'admin-glycopharm@o4o.com' },

  // KPA Society
  { old: 'district-admin@kpa-test.kr', new: 'district-admin-kpa@o4o.com' },
  { old: 'branch-admin@kpa-test.kr', new: 'branch-admin-kpa@o4o.com' },
  { old: 'district-officer@kpa-test.kr', new: 'district-officer-kpa@o4o.com' },
  { old: 'branch-officer@kpa-test.kr', new: 'branch-officer-kpa@o4o.com' },
  { old: 'pharmacist@kpa-test.kr', new: 'pharmacist-kpa@o4o.com' },

  // Neture
  { old: 'supplier@neture.test', new: 'supplier-neture@o4o.com' },
  { old: 'partner@neture.test', new: 'partner-neture@o4o.com' },
  { old: 'admin@neture.test', new: 'admin-neture@o4o.com' },
];

export class UpdateTestAccountEmailsToO4O1737200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('');
    console.log('=== Updating Test Account Emails to @o4o.com ===');
    console.log('');

    for (const change of EMAIL_CHANGES) {
      const result = await queryRunner.query(
        `UPDATE users SET email = $1, "updatedAt" = NOW() WHERE email = $2`,
        [change.new, change.old]
      );

      if (result[1] > 0) {
        console.log(`✓ ${change.old} → ${change.new}`);
      } else {
        console.log(`- ${change.old} (not found, skipped)`);
      }
    }

    console.log('');
    console.log('=== Email Update Complete ===');
    console.log('All test accounts now use @o4o.com domain');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('');
    console.log('=== Reverting Test Account Emails ===');
    console.log('');

    for (const change of EMAIL_CHANGES) {
      const result = await queryRunner.query(
        `UPDATE users SET email = $1, "updatedAt" = NOW() WHERE email = $2`,
        [change.old, change.new]
      );

      if (result[1] > 0) {
        console.log(`✓ ${change.new} → ${change.old}`);
      } else {
        console.log(`- ${change.new} (not found, skipped)`);
      }
    }

    console.log('');
    console.log('=== Email Revert Complete ===');
  }
}
