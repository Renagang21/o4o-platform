/**
 * OrganizationController
 *
 * yaksa-admin Phase 1: Organization Read API
 *
 * === 엔드포인트 ===
 * GET /api/v1/yaksa-admin/organizations - 조직 목록
 * GET /api/v1/yaksa-admin/organizations/:id - 조직 상세
 * GET /api/v1/yaksa-admin/organizations/:id/children - 하위 조직
 * GET /api/v1/yaksa-admin/divisions - 지부 목록
 * GET /api/v1/yaksa-admin/branches - 분회 목록
 */

import type { Request, Response, NextFunction } from 'express';
import { organizationReadService } from '../services/OrganizationReadService.js';

export class OrganizationController {
  /**
   * 조직 목록 조회
   * GET /api/v1/yaksa-admin/organizations
   */
  async listOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, parentId, isActive, limit, offset } = req.query;

      const result = await organizationReadService.listOrganizations({
        type: type as 'national' | 'division' | 'branch' | undefined,
        parentId: parentId as string | undefined,
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
   * 조직 상세 조회
   * GET /api/v1/yaksa-admin/organizations/:id
   */
  async getOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const organization = await organizationReadService.getOrganization(id);

      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
        });
        return;
      }

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 하위 조직 목록 조회
   * GET /api/v1/yaksa-admin/organizations/:id/children
   */
  async getChildOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const children = await organizationReadService.getChildOrganizations(id);

      res.json({
        success: true,
        data: children,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 지부 목록 조회 (Yaksa 특화)
   * GET /api/v1/yaksa-admin/divisions
   */
  async listDivisions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const divisions = await organizationReadService.listDivisions();

      res.json({
        success: true,
        data: divisions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 분회 목록 조회 (Yaksa 특화)
   * GET /api/v1/yaksa-admin/branches
   */
  async listBranches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { divisionId } = req.query;

      const branches = await organizationReadService.listBranches(
        divisionId as string | undefined
      );

      res.json({
        success: true,
        data: branches,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();
