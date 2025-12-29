/**
 * MemberController
 *
 * yaksa-admin Phase 1: Member Read API
 *
 * === 엔드포인트 ===
 * GET /api/v1/yaksa-admin/members - 조직 멤버 목록
 * GET /api/v1/yaksa-admin/members/count - 조직 멤버 수
 * GET /api/v1/yaksa-admin/members/stats - 역할별 통계
 * GET /api/v1/yaksa-admin/users/:userId/memberships - 사용자의 조직 소속
 */

import type { Request, Response, NextFunction } from 'express';
import { memberReadService } from '../services/MemberReadService.js';

export class MemberController {
  /**
   * 조직 멤버 목록 조회
   * GET /api/v1/yaksa-admin/members
   */
  async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId, role, isPrimary, includeLeft, limit, offset } = req.query;

      const result = await memberReadService.listMembers({
        organizationId: organizationId as string | undefined,
        role: role as 'admin' | 'manager' | 'member' | 'moderator' | undefined,
        isPrimary: isPrimary === 'true' ? true : isPrimary === 'false' ? false : undefined,
        includeLeft: includeLeft === 'true',
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
   * 조직 멤버 수 조회
   * GET /api/v1/yaksa-admin/members/count
   */
  async getMemberCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.query;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'organizationId is required',
        });
        return;
      }

      const count = await memberReadService.getMemberCount(organizationId as string);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 조직별 역할별 멤버 통계
   * GET /api/v1/yaksa-admin/members/stats
   */
  async getMemberStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.query;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'organizationId is required',
        });
        return;
      }

      const stats = await memberReadService.getMemberStatsByRole(organizationId as string);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자의 조직 소속 조회
   * GET /api/v1/yaksa-admin/users/:userId/memberships
   */
  async getUserMemberships(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const memberships = await memberReadService.getUserMemberships(userId);

      res.json({
        success: true,
        data: memberships,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 조직 관리자 목록 조회
   * GET /api/v1/yaksa-admin/organizations/:organizationId/admins
   */
  async getOrganizationAdmins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { organizationId } = req.params;

      const admins = await memberReadService.getOrganizationAdmins(organizationId);

      res.json({
        success: true,
        data: admins,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const memberController = new MemberController();
