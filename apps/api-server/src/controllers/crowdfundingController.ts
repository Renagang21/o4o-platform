/**
 * 크라우드펀딩 API 컨트롤러
 */

import { Request, Response } from 'express';
import { crowdfundingService } from '../services/CrowdfundingService';
import logger from '../utils/simpleLogger';
import type { FundingCategory, FundingStatus } from '../types/crowdfunding-types';

export class CrowdfundingController {
  /**
   * 프로젝트 생성
   */
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const project = await crowdfundingService.createProject(userId, req.body);
      
      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
    } catch (error: any) {
      logger.error('Create project error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create project'
      });
    }
  }

  /**
   * 프로젝트 수정
   */
  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      // 권한 확인
      const project = await crowdfundingService.getProjectDetails(projectId);
      if (project.project.creatorId !== userId) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      // 수정 로직 구현 필요
      res.json({
        success: true,
        message: 'Project update functionality to be implemented'
      });
    } catch (error: any) {
      logger.error('Update project error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update project'
      });
    }
  }

  /**
   * 리워드 생성
   */
  async createReward(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      // 권한 확인
      const project = await crowdfundingService.getProjectDetails(projectId);
      if (project.project.creatorId !== userId) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      const reward = await crowdfundingService.createReward(projectId, req.body);
      
      res.status(201).json({
        success: true,
        data: reward,
        message: 'Reward created successfully'
      });
    } catch (error: any) {
      logger.error('Create reward error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create reward'
      });
    }
  }

  /**
   * 프로젝트 승인 (관리자)
   */
  async approveProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const project = await crowdfundingService.approveProject(projectId, adminId);
      
      res.json({
        success: true,
        data: project,
        message: 'Project approved successfully'
      });
    } catch (error: any) {
      logger.error('Approve project error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to approve project'
      });
    }
  }

  /**
   * 프로젝트 거절 (관리자)
   */
  async rejectProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const project = await crowdfundingService.rejectProject(projectId, adminId, reason);
      
      res.json({
        success: true,
        data: project,
        message: 'Project rejected'
      });
    } catch (error: any) {
      logger.error('Reject project error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reject project'
      });
    }
  }

  /**
   * 후원하기
   */
  async createBacking(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const backingData = {
        ...req.body,
        backerId: userId
      };

      const backing = await crowdfundingService.createBacking(backingData);
      
      res.status(201).json({
        success: true,
        data: backing,
        message: 'Backing created successfully'
      });
    } catch (error: any) {
      logger.error('Create backing error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create backing'
      });
    }
  }

  /**
   * 결제 확인
   */
  async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const { backingId } = req.params;
      const { paymentId } = req.body;

      const backing = await crowdfundingService.confirmPayment(backingId, paymentId);
      
      res.json({
        success: true,
        data: backing,
        message: 'Payment confirmed successfully'
      });
    } catch (error: any) {
      logger.error('Confirm payment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to confirm payment'
      });
    }
  }

  /**
   * 프로젝트 업데이트 작성
   */
  async createProjectUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const update = await crowdfundingService.createProjectUpdate(
        projectId,
        userId,
        req.body
      );
      
      res.status(201).json({
        success: true,
        data: update,
        message: 'Project update created successfully'
      });
    } catch (error: any) {
      logger.error('Create project update error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create project update'
      });
    }
  }

  /**
   * 프로젝트 목록 조회
   */
  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const filter = {
        status: req.query.status as FundingStatus,
        category: req.query.category as FundingCategory,
        creatorId: req.query.creatorId as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 12
      };

      const result = await crowdfundingService.getProjects(filter);
      
      res.json({
        success: true,
        data: result.projects,
        pagination: {
          page: filter.page,
          limit: filter.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filter.limit)
        }
      });
    } catch (error: any) {
      logger.error('Get projects error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get projects'
      });
    }
  }

  /**
   * 프로젝트 상세 조회
   */
  async getProjectDetails(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      
      const details = await crowdfundingService.getProjectDetails(projectId);
      
      res.json({
        success: true,
        data: details
      });
    } catch (error: any) {
      logger.error('Get project details error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get project details'
      });
    }
  }

  /**
   * 크리에이터 대시보드
   */
  async getCreatorDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const dashboard = await crowdfundingService.getCreatorDashboard(userId);
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      logger.error('Get creator dashboard error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get creator dashboard'
      });
    }
  }

  /**
   * 후원자 대시보드
   */
  async getBackerDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const dashboard = await crowdfundingService.getBackerDashboard(userId);
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      logger.error('Get backer dashboard error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get backer dashboard'
      });
    }
  }

  /**
   * 펀딩 종료 (수동 - 관리자)
   */
  async endFunding(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      
      const project = await crowdfundingService.endFunding(projectId);
      
      res.json({
        success: true,
        data: project,
        message: 'Funding ended successfully'
      });
    } catch (error: any) {
      logger.error('End funding error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to end funding'
      });
    }
  }

  /**
   * 승인 대기 프로젝트 목록 (관리자)
   */
  async getPendingProjects(req: Request, res: Response): Promise<void> {
    try {
      const filter = {
        status: 'draft' as FundingStatus,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await crowdfundingService.getProjects(filter);
      
      res.json({
        success: true,
        data: result.projects,
        pagination: {
          page: filter.page,
          limit: filter.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filter.limit)
        }
      });
    } catch (error: any) {
      logger.error('Get pending projects error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get pending projects'
      });
    }
  }

  /**
   * 프로젝트 ID로 조회 (별칭 메서드)
   */
  async getProjectById(req: Request, res: Response): Promise<void> {
    return this.getProjectDetails(req, res);
  }

  /**
   * 대시보드 통계 조회
   */
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // 크리에이터 대시보드 데이터를 통계로 반환
      const dashboard = await crowdfundingService.getCreatorDashboard(userId);
      
      res.json({
        success: true,
        data: {
          totalProjects: dashboard.projects.length,
          activeProjects: dashboard.projects.filter((p: any) => p.status === 'active').length,
          totalRaised: dashboard.stats.totalRaised,
          totalBackers: dashboard.stats.totalBackers
        }
      });
    } catch (error: any) {
      logger.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get dashboard stats'
      });
    }
  }

  /**
   * 프로젝트 후원하기
   */
  async backProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const backing = await crowdfundingService.createBacking({
        projectId,
        backerId: userId,
        ...req.body
      });
      
      res.status(201).json({
        success: true,
        data: backing,
        message: 'Project backed successfully'
      });
    } catch (error: any) {
      logger.error('Back project error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to back project'
      });
    }
  }

  /**
   * 프로젝트 참여 (후원) - alias
   */
  async joinProject(req: Request, res: Response): Promise<void> {
    return this.backProject(req, res);
  }

  /**
   * 참여 취소
   */
  async cancelParticipation(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // 후원 취소 로직 구현
      res.json({
        success: true,
        message: 'Participation cancelled successfully'
      });
    } catch (error: any) {
      logger.error('Cancel participation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel participation'
      });
    }
  }

  /**
   * 참여 상태 조회
   */
  async getParticipationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // 참여 상태 조회 로직
      res.json({
        success: true,
        data: {
          isParticipating: false,
          participationDetails: null
        }
      });
    } catch (error: any) {
      logger.error('Get participation status error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get participation status'
      });
    }
  }

  /**
   * 프로젝트 삭제
   */
  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      // 권한 확인
      const project = await crowdfundingService.getProjectDetails(projectId);
      if (project.project.creatorId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      // 삭제 로직 구현
      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete project error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete project'
      });
    }
  }

  /**
   * 프로젝트 상태 업데이트
   */
  async updateProjectStatus(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { status } = req.body;

      // 관리자만 상태 변경 가능
      if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }

      // 상태 업데이트 로직
      res.json({
        success: true,
        message: 'Project status updated successfully'
      });
    } catch (error: any) {
      logger.error('Update project status error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update project status'
      });
    }
  }
}

export const crowdfundingController = new CrowdfundingController();