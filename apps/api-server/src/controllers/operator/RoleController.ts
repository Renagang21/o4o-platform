/**
 * RoleController — Operator Role 카탈로그 API
 * WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1
 *
 * roles 테이블 조회/관리 엔드포인트.
 * 목록/조회: operator 이상, 생성/수정/삭제: admin only.
 */
import { Request, Response } from 'express';
import { roleService } from '../../modules/auth/services/role.service.js';
import {
  resolveCanonicalServiceKey,
  resolveRolePrefixFromCanonicalServiceKey,
} from '@o4o/security-core';
import type { ServiceScope } from '../../utils/serviceScope.js';
import logger from '../../utils/logger.js';

/**
 * WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-LIFECYCLE-AND-ROLE-SERVICEKEY-CONTRACT-FIX-V1 (D4)
 *
 * 축이 두 개다.
 *   - ServiceScope.serviceKeys / service_memberships.service_key = **canonical** ('kpa-society', 'k-cosmetics')
 *   - roles.service_key                                          = **role prefix** ('kpa', 'cosmetics')
 *     (20260318100000-ExtendRolesTable seed 가 svc: 'kpa' / 'cosmetics' 로 적재)
 *
 * 종전 구현은 query.service 를 두 축에 그대로 흘려보내서
 *   - 필터 조회: canonical 'kpa-society' → scope 비교는 통과하나 카탈로그 0건
 *   - prefix 'kpa' 입력 → 카탈로그는 맞으나 scope 비교 403
 *   - 무필터 조회: scope 의 canonical 키로 카탈로그를 뒤져 서비스 운영자에게 **항상 0건**
 *     (역할 부여 모달의 "할당 가능한 역할이 없습니다" 원인)
 * 이었다.
 *
 * 계약: **UI/API 는 canonical service key 하나만 쓴다.** 이 함수가 유일한 변환 지점이며
 * roles 테이블 경계에서만 role prefix 로 접는다. 문자열 치환·역방향 하드코딩 금지.
 */
function toRoleCatalogKey(canonicalServiceKey: string): string {
  return resolveRolePrefixFromCanonicalServiceKey(canonicalServiceKey);
}

export class RoleController {

  /**
   * GET /api/v1/operator/roles
   * 서비스별 role 목록 (scope 기반 필터)
   */
  getRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      const { service } = req.query;

      let roles;
      if (service && typeof service === 'string') {
        // 특정 서비스 필터 — 요청 파라미터는 canonical service key 축으로 해석한다.
        // (레거시 role prefix 입력도 resolveCanonicalServiceKey 가 canonical 로 접는다.)
        const canonical = resolveCanonicalServiceKey(service);
        if (!scope.isPlatformAdmin && !scope.serviceKeys.includes(canonical)) {
          res.status(403).json({ success: false, error: 'Cannot access roles outside your service scope' });
          return;
        }
        roles = await roleService.getRolesByService(toRoleCatalogKey(canonical));
      } else if (scope.isPlatformAdmin) {
        roles = await roleService.getAllRoles();
      } else {
        // scope 내 서비스들의 role만 반환
        const allRoles = [];
        for (const key of scope.serviceKeys) {
          const serviceRoles = await roleService.getRolesByService(toRoleCatalogKey(key));
          allRoles.push(...serviceRoles);
        }
        roles = allRoles;
      }

      res.json({ success: true, data: roles.map(r => r.toJSON()) });
    } catch (error) {
      logger.error('[RoleController] getRoles error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: 'Failed to fetch roles' });
    }
  };

  /**
   * GET /api/v1/operator/roles/:name
   * 단일 role 조회
   */
  getRoleByName = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      const role = await roleService.getRoleByName(name);

      if (!role) {
        res.status(404).json({ success: false, error: 'Role not found' });
        return;
      }

      res.json({ success: true, data: role.toJSON() });
    } catch (error) {
      logger.error('[RoleController] getRoleByName error', {
        name: req.params.name,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: 'Failed to fetch role' });
    }
  };

  /**
   * POST /api/v1/operator/roles
   * role 생성 (platform admin only)
   */
  createRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      if (!scope.isPlatformAdmin) {
        res.status(403).json({ success: false, error: 'Only platform admins can create roles' });
        return;
      }

      const { name, displayName, description, serviceKey, roleKey, isAdminRole, isAssignable } = req.body;

      if (!name || !displayName || !serviceKey || !roleKey) {
        res.status(400).json({ success: false, error: 'name, displayName, serviceKey, roleKey are required' });
        return;
      }

      const role = await roleService.createRole({
        name,
        displayName,
        description,
        // 저장 축은 role prefix 다 — 입력이 canonical 이든 prefix 든 한 축으로 접는다.
        serviceKey: toRoleCatalogKey(resolveCanonicalServiceKey(serviceKey)),
        roleKey,
        isAdminRole,
        isAssignable,
      });

      res.status(201).json({ success: true, data: role.toJSON() });
    } catch (error) {
      logger.error('[RoleController] createRole error', {
        error: error instanceof Error ? error.message : String(error),
      });
      const message = error instanceof Error ? error.message : 'Failed to create role';
      res.status(400).json({ success: false, error: message });
    }
  };

  /**
   * PUT /api/v1/operator/roles/:id
   * role 수정 (platform admin only)
   */
  updateRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      if (!scope.isPlatformAdmin) {
        res.status(403).json({ success: false, error: 'Only platform admins can update roles' });
        return;
      }

      const { id } = req.params;
      const { displayName, description, isAdminRole, isAssignable, isActive } = req.body;

      const role = await roleService.updateRole(id, {
        displayName,
        description,
        isAdminRole,
        isAssignable,
        isActive,
      });

      res.json({ success: true, data: role.toJSON() });
    } catch (error) {
      logger.error('[RoleController] updateRole error', {
        id: req.params.id,
        error: error instanceof Error ? error.message : String(error),
      });
      const message = error instanceof Error ? error.message : 'Failed to update role';
      res.status(400).json({ success: false, error: message });
    }
  };

  /**
   * DELETE /api/v1/operator/roles/:id
   * role 삭제 (platform admin only, is_system 보호)
   */
  deleteRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope: ServiceScope = (req as any).serviceScope;
      if (!scope.isPlatformAdmin) {
        res.status(403).json({ success: false, error: 'Only platform admins can delete roles' });
        return;
      }

      const { id } = req.params;
      await roleService.deleteRole(id);

      res.json({ success: true, message: 'Role deactivated' });
    } catch (error) {
      logger.error('[RoleController] deleteRole error', {
        id: req.params.id,
        error: error instanceof Error ? error.message : String(error),
      });
      const message = error instanceof Error ? error.message : 'Failed to delete role';
      res.status(400).json({ success: false, error: message });
    }
  };
}
