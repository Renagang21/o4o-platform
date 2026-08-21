/**
 * DeactivatePharmacyHubSupplierRole
 * WO-O4O-PHARMACYHUB-RETIRED-SUPPLIER-ROLE-CATALOG-CLOSURE-V1
 *
 * `pharmacy-hub:supplier` 는 코드에서 완전히 제거됐다
 * (역할 union · ROLE_REGISTRY · PHARMACY_HUB_SCOPE_CONFIG · 가입 경로 모두 부재 —
 *  WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1).
 * 그러나 `roles` 카탈로그 row 는 seed migration 20270216000000 이 넣은 그대로
 * is_assignable = true · is_active = true 로 남아 있어, 운영자 역할 관리 화면
 * (`RoleController.getRoles` → `roleService.getRolesByService`)에 **선택지로 계속 노출**된다.
 * 권한 상승은 없으나(scope config 부재) 정본 모델과 UI 카탈로그가 불일치하는 drift 표면이다.
 *
 * 정본: docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md §4 · §7-1
 *
 * 조치: 카탈로그 row 를 **비활성**으로 닫는다.
 *   - `getRolesByService` / `getAssignableRoles` / `getAllRoles` 는 isActive: true 필터 →  목록에서 사라진다.
 *   - `getRoleByName` / `isValidRole` 도 isActive: true 필터 →  신규 배정 경로가 함께 닫힌다.
 *
 * 하지 않는 것:
 *   - seed migration(20270216000000) 편집 — 불변 이력이다.
 *   - role row hard delete — 이력·FK 안전을 위해 보존한다.
 *   - 다른 서비스의 supplier role(`neture:supplier` 등) 변경 — WHERE 는 정확히 한 이름만 본다.
 *
 * 실측(프로덕션, 2026-08-21 read-only): `role_assignments` · `service_memberships` 모두
 * `pharmacy-hub:supplier` 0건 → 이 migration 으로 잃는 실사용 배정이 없다.
 *
 * 멱등: 값 지정 UPDATE 이므로 재실행해도 결과가 같다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeactivatePharmacyHubSupplierRole20270314000000 implements MigrationInterface {
  name = 'DeactivatePharmacyHubSupplierRole20270314000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE roles
         SET is_assignable = false,
             is_active = false,
             updated_at = now()
       WHERE name = 'pharmacy-hub:supplier'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 되돌리면 seed 직후 상태(카탈로그 노출)로 복귀한다. 정본상 권장되지 않는다.
    await queryRunner.query(`
      UPDATE roles
         SET is_assignable = true,
             is_active = true,
             updated_at = now()
       WHERE name = 'pharmacy-hub:supplier'
    `);
  }
}
