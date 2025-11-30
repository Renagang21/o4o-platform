import { DataSource } from 'typeorm';
import { PermissionService, PermissionContext } from '../services/PermissionService';

/**
 * Permission Guard Configuration
 */
export interface PermissionGuardConfig {
  /**
   * 필수 권한
   */
  permission: string;

  /**
   * 조직 ID 추출 함수 (선택적)
   *
   * request에서 organizationId를 추출하는 방법을 정의합니다.
   *
   * @example
   * ```typescript
   * (req) => req.params.id
   * (req) => req.body.organizationId
   * (req) => req.query.organizationId
   * ```
   */
  extractOrganizationId?: (req: any) => string | undefined;

  /**
   * 계층적 권한 상속 사용 여부 (기본값: true)
   */
  useInheritance?: boolean;
}

/**
 * Permission Guard Result
 */
export interface PermissionGuardResult {
  /**
   * 권한 허용 여부
   */
  allowed: boolean;

  /**
   * 거부 사유 (allowed=false인 경우)
   */
  reason?: string;
}

/**
 * PermissionGuard
 *
 * 조직 기반 권한 검증 Guard
 *
 * @example
 * ```typescript
 * // NestJS Controller에서 사용
 * @UseGuards(PermissionGuard)
 * @RequirePermission('organization.manage')
 * async updateOrganization(@Param('id') id: string, @Body() dto: UpdateDto) {
 *   // ...
 * }
 *
 * // 또는 함수로 직접 사용
 * const result = await checkPermission(dataSource, userId, {
 *   permission: 'organization.manage',
 *   extractOrganizationId: (req) => req.params.id
 * }, request);
 * ```
 */
export class PermissionGuard {
  private permissionService: PermissionService;

  constructor(private dataSource: DataSource) {
    this.permissionService = new PermissionService(dataSource);
  }

  /**
   * 권한 검증
   *
   * @param userId 사용자 ID
   * @param config 권한 설정
   * @param request HTTP 요청 객체
   * @returns 권한 검증 결과
   */
  async checkPermission(
    userId: string,
    config: PermissionGuardConfig,
    request?: any
  ): Promise<PermissionGuardResult> {
    const { permission, extractOrganizationId, useInheritance = true } = config;

    // 1. 조직 ID 추출
    let organizationId: string | undefined;
    if (request && extractOrganizationId) {
      organizationId = extractOrganizationId(request);
    }

    // 2. 권한 검증
    let allowed: boolean;

    if (organizationId && useInheritance) {
      // 계층적 권한 상속 포함
      allowed = await this.permissionService.hasPermissionWithInheritance(
        userId,
        permission,
        organizationId
      );
    } else if (organizationId) {
      // 직접 권한만
      allowed = await this.permissionService.hasPermission(userId, permission, {
        organizationId,
      });
    } else {
      // 전역 권한만
      allowed = await this.permissionService.hasPermission(userId, permission);
    }

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Insufficient permission: ${permission}${organizationId ? ` for organization ${organizationId}` : ''}`,
    };
  }

  /**
   * 권한 검증 (예외 발생)
   *
   * 권한이 없으면 예외를 발생시킵니다.
   *
   * @throws Error if permission denied
   */
  async requirePermission(
    userId: string,
    config: PermissionGuardConfig,
    request?: any
  ): Promise<void> {
    const result = await this.checkPermission(userId, config, request);
    if (!result.allowed) {
      throw new Error(result.reason || 'Permission denied');
    }
  }
}

/**
 * Permission Guard 헬퍼 함수
 *
 * 단순 권한 검증용 (DataSource 전달 필요)
 */
export async function checkPermission(
  dataSource: DataSource,
  userId: string,
  config: PermissionGuardConfig,
  request?: any
): Promise<PermissionGuardResult> {
  const guard = new PermissionGuard(dataSource);
  return await guard.checkPermission(userId, config, request);
}

/**
 * Permission Guard 헬퍼 함수 (예외 발생)
 */
export async function requirePermission(
  dataSource: DataSource,
  userId: string,
  config: PermissionGuardConfig,
  request?: any
): Promise<void> {
  const guard = new PermissionGuard(dataSource);
  await guard.requirePermission(userId, config, request);
}
