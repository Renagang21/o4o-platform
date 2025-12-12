import { Request, Response } from 'express';
import { StatsService } from '../services/StatsService.js';

/**
 * StatsController
 *
 * 통계 API 컨트롤러
 *
 * Phase 2: 확장 대시보드 통계 API 추가
 */
export class StatsController {
  constructor(private statsService: StatsService) {}

  /**
   * GET /stats
   *
   * Query Parameters:
   * - organizationId: 조직 ID (선택적)
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const stats = await this.statsService.getDashboardStats(organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /stats/extended
   *
   * Phase 2: 확장 대시보드 통계
   *
   * Query Parameters:
   * - organizationId: 조직 ID (선택적)
   */
  async getExtendedDashboardStats(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const stats = await this.statsService.getExtendedDashboardStats(organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /stats/pharmacist-types
   *
   * 약사 유형별 통계
   */
  async getPharmacistTypeBreakdown(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const breakdown = await this.statsService.getPharmacistTypeBreakdown(organizationId);

      res.json({
        success: true,
        data: breakdown,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /stats/official-roles
   *
   * 직책별 통계
   */
  async getOfficialRoleBreakdown(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const breakdown = await this.statsService.getOfficialRoleBreakdown(organizationId);

      res.json({
        success: true,
        data: breakdown,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /stats/gender
   *
   * 성별 분포 통계
   */
  async getGenderBreakdown(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const breakdown = await this.statsService.getGenderBreakdown(organizationId);

      res.json({
        success: true,
        data: breakdown,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /stats/executives
   *
   * 임원 통계
   */
  async getExecutiveStats(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const stats = await this.statsService.getExecutiveStats(organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /stats/fees
   *
   * 연회비 통계
   */
  async getFeeStats(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const stats = await this.statsService.getFeeStats(organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /stats/recent-activity
   *
   * 최근 활동 통계
   */
  async getRecentActivityStats(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const stats = await this.statsService.getRecentActivityStats(organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /stats/organization/:organizationId
   *
   * 조직별 회원 요약 통계
   */
  async getOrganizationSummary(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;

      const summary = await this.statsService.getOrganizationSummary(organizationId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
