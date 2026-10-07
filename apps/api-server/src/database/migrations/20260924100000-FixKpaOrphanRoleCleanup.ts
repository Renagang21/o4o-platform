import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-ORPHAN-ROLE-CLEANUP-V1 긴급 수정
 *
 * 20260924000000-CleanupKpaOrphanRoles 마이그레이션이 너무 광범위하게 실행됨.
 * kpa_members 없음을 orphan 조건으로 정의했으나,
 * operator/admin 계정은 service_memberships에는 있지만 kpa_members에는 없는 정상 상태.
 *
 * 수정:
 *   1. kpa-a-operator, kpa-a-admin, admin-kpa-society 등 합법 계정 role 복원
 *   2. test-yaksa*, test-student* 등 테스트 계정 role 복원 (service_membership 있음)
 *   3. [REDACTED_EMAIL] role 복원 (활성 kpa membership 있음)
 *   4. sohae21@naver.com kpa:store_owner 은 유지 (진짜 orphan — pending membership + kpa_members 없음)
 *
 * 올바른 orphan 정의:
 *   kpa:* role을 가졌지만 active kpa/kpa-society service_membership이 없는 경우
 */
export class FixKpaOrphanRoleCleanup20260924100000 implements MigrationInterface {
  name = 'FixKpaOrphanRoleCleanup20260924100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 잘못 비활성화된 role_assignment ID 목록 (sohae21@naver.com의 kpa:store_owner 제외)
    const raIdsToRestore = [
      'bec6ed2c-ea3d-48a2-a270-2bf5d7cf5696', // kpa-a-operator@o4o.com: kpa:operator
      'd2e925b0-e19f-460d-8054-b59a4f1e623d', // kpa-a-admin@o4o.com: kpa:admin
      'f2fbad7a-e46b-49a0-9188-f4fcb5feef87', // admin-kpa-society@o4o.com: kpa:admin
      'e27e0ebc-b9dd-421b-9a46-7645b9a35b1d', // test-yaksa04@o4o.com: kpa:store_owner
      '49468448-82ca-4544-9300-27205392c6c3', // test-yaksa04@o4o.com: kpa:pharmacist
      'a88a9a59-4e13-4eaf-b7a5-09881dbd8968', // test-yaksa05@o4o.com: kpa:store_owner
      '9ee4b8ad-bb62-4039-a0ea-1c7c0dd599ce', // test-yaksa05@o4o.com: kpa:pharmacist
      'c8fd1dd7-6f1c-4f20-ad55-d96addd412a3', // test-student03@o4o.com: kpa:student
      '4b01be3f-4cbc-4148-a5ec-69774af53f1a', // test-yaksa07@o4o.com: kpa:pharmacist
      '21aa86f1-7ac2-4af3-97dd-194977870609', // test-yaksa09@o4o.com: kpa:store_owner
      '4c7caf36-359d-40ee-a301-83dc0440d127', // test-yaksa09@o4o.com: kpa:pharmacist
      'd9ca2173-4909-42f9-8603-d49a4c4e5c33', // test-yaksa10@o4o.com: kpa:store_owner
      'b69832a5-37bb-4f3f-a45a-b1862f6196db', // test-yaksa10@o4o.com: kpa:pharmacist
      'a27b6040-1a9d-4910-bcb0-28dcaa9924a3', // [REDACTED_EMAIL]: kpa:store_owner
    ];

    const placeholders = raIdsToRestore.map((_, i) => `$${i + 1}`).join(', ');

    const result = await queryRunner.query(
      `UPDATE role_assignments
       SET is_active = true, updated_at = NOW()
       WHERE id IN (${placeholders})`,
      raIdsToRestore,
    );

    console.log(`[FixKpaOrphanRoleCleanup] Restored ${raIdsToRestore.length} role(s).`);

    // 검증: kpa-a-operator@o4o.com 이 kpa:operator를 다시 갖는지 확인
    const check = await queryRunner.query(`
      SELECT ra.role FROM role_assignments ra
      JOIN users u ON u.id = ra.user_id
      WHERE u.email = 'kpa-a-operator@o4o.com'
        AND ra.role = 'kpa:operator'
        AND ra.is_active = true
    `);
    if (check.length === 0) {
      throw new Error('[FixKpaOrphanRoleCleanup] Validation failed: kpa-a-operator role not restored');
    }
    console.log('[FixKpaOrphanRoleCleanup] ✅ kpa-a-operator role restored and verified.');

    // sohae21@naver.com kpa:store_owner 는 여전히 비활성화 상태인지 확인
    const sohaeCheck = await queryRunner.query(`
      SELECT ra.id FROM role_assignments ra
      JOIN users u ON u.id = ra.user_id
      WHERE u.email = 'sohae21@naver.com'
        AND ra.role = 'kpa:store_owner'
        AND ra.is_active = true
    `);
    if (sohaeCheck.length > 0) {
      throw new Error('[FixKpaOrphanRoleCleanup] Validation failed: sohae21 kpa:store_owner should remain deactivated');
    }
    console.log('[FixKpaOrphanRoleCleanup] ✅ sohae21 kpa:store_owner remains deactivated (correct orphan).');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[FixKpaOrphanRoleCleanup] down: no-op');
  }
}
