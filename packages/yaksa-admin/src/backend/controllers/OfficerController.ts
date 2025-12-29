/**
 * OfficerController
 *
 * yaksa-admin Phase 1: Officer Read API
 *
 * === 엔드포인트 ===
 * GET /api/v1/yaksa-admin/officers - 임원 목록
 * GET /api/v1/yaksa-admin/officers/count - 임원 수
 * GET /api/v1/yaksa-admin/officers/stats - 역할별 통계
 * GET /api/v1/yaksa-admin/organizations/:organizationId/head - 조직장
 * GET /api/v1/yaksa-admin/users/:userId/officer-roles - 사용자 임원 역할
 */

import type { Request, Response, NextFunction } from 'express';
import { officerReadService, YAKSA_OFFICER_ROLES } from '../services/OfficerReadService.js';

export class OfficerController {
  /**
   * 임원 목록 조회
   * GET /api/v1/yaksa-admin/officers
   */
  async listOfficers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, role, isActive, limit, offset } = req.query;

      const result = await officerReadService.listOfficers({
        organizationId: organizationId as string | undefined,
        role: role as string | undefined,
        isActive: isActive === 'false' ? false : true,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 임원 수 조회
   * GET /api/v1/yaksa-admin/officers/count
   */
  async getOfficerCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.query;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'organizationId is required',
        });
        return;
      }

      const count = await officerReadService.getOfficerCount(organizationId as string);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 조직별 역할별 임원 통계
   * GET /api/v1/yaksa-admin/officers/stats
   */
  async getOfficerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.query;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'organizationId is required',
        });
        return;
      }

      const stats = await officerReadService.getOfficerStatsByRole(organizationId as string);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 조직장 조회
   * GET /api/v1/yaksa-admin/organizations/:organizationId/head
   */
  async getOrganizationHead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;

      const head = await officerReadService.getOrganizationHead(organizationId);

      res.json({
        success: true,
        data: head,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자 임원 역할 조회
   * GET /api/v1/yaksa-admin/users/:userId/officer-roles
   */
  async getUserOfficerRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const roles = await officerReadService.getUserOfficerRoles(userId);

      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 임원 역할 정의 조회
   * GET /api/v1/yaksa-admin/officers/roles
   */
  async getOfficerRoleDefinitions(req: Request, res: Response, _next: NextFunction): Promise<void> {
    res.json({
      success: true,
      data: YAKSA_OFFICER_ROLES,
    });
  }
}

export const officerController = new OfficerController();
