import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1 (A/B축)
 *
 * `users.permissions` 컬럼 제거.
 *
 * ## 왜 제거하는가
 *
 * 권한 SSOT 는 `role_assignments` 다 (CLAUDE.md F9 · RBAC-FREEZE-DECLARATION-V1).
 * `users.permissions` 는 그 이전 세대의 **직접 권한 스냅샷**이었고,
 * 선행 WO 들에서 read/write 경로가 모두 제거됐다.
 *
 *   - JWT `permissions` claim 발급 제거
 *     (WO-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1)
 *   - `User.getAllPermissions()` 의 스냅샷 read 제거 (동 WO)
 *   - account-linking 병합 시 `mergeFields.permissions` 제거 (동 WO)
 *   - `requirePermission` / `requireAnyPermission` 미들웨어 제거
 *     (WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1)
 *   - `signage-role.middleware` 의 permission 스냅샷 grant 분기 제거 (동 WO)
 *   - `@o4o/organization-core` `PermissionGuard` 제거
 *     (WO-O4O-FROZEN-AUTH-PERMISSIONS-DB-AND-KPA-SUPPLIER-ENDPOINT-FINAL-CLOSURE-V1)
 *
 * ## 프로덕션 census (본 WO §4, read-only 재확인)
 *
 * ```text
 * users 총 행         : 57
 * permissions IS NULL : 0
 * permissions = '[]'  : 57
 * non-empty           : 0
 * index / constraint  : 0
 * view / matview      : 0
 * trigger / function  : 0
 * generated column    : NEVER
 * pg_depend           : 컬럼 자신의 DEFAULT 1건뿐
 * ```
 *
 * 의미 있는 운영 데이터 0 이므로 row export 는 불필요하다.
 *
 * ## 배포 순서 안전성
 *
 * `deploy-api.yml` 은 **Cloud Run 배포 → migration job** 순서다. 즉 컬럼을
 * 참조하지 않는 신규 리비전이 먼저 서빙된 뒤에 이 migration 이 실행된다.
 * (엔티티에서 `permissions` 컬럼 정의를 같은 커밋에서 제거했다.)
 *
 * ## rollback
 *
 * `down()` 이 원래 정의(`json NOT NULL DEFAULT '[]'`)를 복원한다. 값은 전부
 * 비어 있었으므로 복원 후 상태는 DROP 직전과 동등하다.
 */
export class DropUsersPermissionsColumn20270320000000 implements MigrationInterface {
  name = 'DropUsersPermissionsColumn20270320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "permissions"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" json NOT NULL DEFAULT '[]'`,
    );
  }
}
