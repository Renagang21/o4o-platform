/**
 * RoleController — Operator Role 카탈로그 API
 * WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1
 *
 * roles 테이블 조회/관리 엔드포인트.
 * 목록/조회: operator 이상, 생성/수정/삭제: admin only.
 */
import { Request, Response } from 'express';
import { roleService } from '../../modules/auth/services/role.service.js';
import type { ServiceScope } from '../../utils/serviceScope.js';
import logger from '../../utils/logger.js';

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
        // 특정 서비스 필터
        if (!scope.isPlatformAdmin && !scope.serviceKeys.includes(service)) {
          res.status(403).json({ success: false, error: 'Cannot access roles outside your service scope' });
          return;
        }
        roles = await roleService.getRolesByService(service);
      } else if (scope.isPlatformAdmin) {
        roles = await roleService.getAllRoles();
      } else {
        // scope 내 서비스들의 role만 반환
        const allRoles = [];
        for (const key of scope.serviceKeys) {
          const serviceRoles = await roleService.getRolesByService(key);
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
        serviceKey,
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
