/**
 * Migration: RemoveOldAdminVaultAccount
 *
 * 기존 Admin Vault 전용 계정(o4o-admin-id@admin.co.kr)을 삭제하고
 * Neture 운영자 계정(admin-neture@o4o.com)으로 권한을 이전
 *
 * 변경 사유:
 * - 테스트 계정 도메인 통일 (@o4o.com)
 * - 운영자 계정으로 Vault 접근 권한 통합
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

const OLD_ADMIN_EMAIL = 'o4o-admin-id@admin.co.kr';

export class RemoveOldAdminVaultAccount1737200100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 기존 Admin Vault 계정 삭제
    const result = await queryRunner.query(
      `DELETE FROM users WHERE email = $1`,
      [OLD_ADMIN_EMAIL]
    );

    if (result[1] > 0) {
      console.log(`✓ Deleted old Admin Vault account: ${OLD_ADMIN_EMAIL}`);
    } else {
      console.log(`- Account not found (already deleted): ${OLD_ADMIN_EMAIL}`);
    }

    console.log('');
    console.log('=== Admin Vault Access Updated ===');
    console.log('Old account removed: o4o-admin-id@admin.co.kr');
    console.log('New account with Vault access: admin-neture@o4o.com');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: 계정 복구는 별도 migration으로 처리
    // (비밀번호 해시가 필요하므로 여기서 직접 복구하지 않음)
    console.log('');
    console.log('=== Rollback Notice ===');
    console.log('To restore the old Admin Vault account, run:');
    console.log('npm run typeorm:migration:run -- -n CreateO4OAdminVaultAccount2026012100001');
  }
}
