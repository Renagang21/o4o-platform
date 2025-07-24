import { Request, Response } from 'express';
import { CrowdfundingRepository } from '../repositories/CrowdfundingRepository';
import AppDataSource from '../database/data-source';
import { CrowdfundingProject } from '../entities/CrowdfundingProject';

export class CrowdfundingController {
  private crowdfundingRepository: CrowdfundingRepository;

  constructor() {
    this.crowdfundingRepository = new CrowdfundingRepository(AppDataSource);
  }

  // 프로젝트 목록 조회
  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const { status, creatorId, search, page = 1, limit = 10 } = req.query;

      const { projects, total } = await this.crowdfundingRepository.getProjects({
        status: status as string,
        creatorId: creatorId as string,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: projects,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch projects'
      });
    }
  }

  // 프로젝트 상세 조회
  async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const project = await this.crowdfundingRepository.getProjectById(id, userId);

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project'
      });
    }
  }

  // 프로젝트 생성
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        targetParticipantCount,
        startDate,
        endDate,
        forumLink
      } = req.body;

      const creatorId = req.user!.id;

      // 입력값 검증
      if (!title || !description || !targetParticipantCount || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: '필수 정보를 모두 입력해주세요.'
        });
        return;
      }

      const projectData: Partial<CrowdfundingProject> = {
        title,
        description,
        targetParticipantCount: parseInt(targetParticipantCount),
        startDate,
        endDate,
        forumLink,
        creatorId,
        status: 'recruiting'
      };

      const project = await this.crowdfundingRepository.createProject(projectData);

      res.status(201).json({
        success: true,
        data: project,
        message: '프로젝트가 생성되었습니다.'
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create project'
      });
    }
  }

  // 프로젝트 수정
  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // 권한 확인 (생성자만 수정 가능)
      const existingProject = await this.crowdfundingRepository.getProjectById(id);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      if (existingProject.creatorId !== userId) {
        res.status(403).json({
          success: false,
          error: '권한이 없습니다.'
        });
        return;
      }

      const updatedProject = await this.crowdfundingRepository.updateProject(id, req.body);

      res.json({
        success: true,
        data: updatedProject,
        message: '프로젝트가 수정되었습니다.'
      });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update project'
      });
    }
  }

  // 프로젝트 삭제
  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // 권한 확인 (생성자만 삭제 가능)
      const existingProject = await this.crowdfundingRepository.getProjectById(id);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      if (existingProject.creatorId !== userId) {
        res.status(403).json({
          success: false,
          error: '권한이 없습니다.'
        });
        return;
      }

      const deleted = await this.crowdfundingRepository.deleteProject(id);

      if (deleted) {
        res.json({
          success: true,
          message: '프로젝트가 삭제되었습니다.'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete project'
        });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete project'
      });
    }
  }

  // 프로젝트 참여
  async joinProject(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const vendorId = req.user!.id;

      // 프로젝트 존재 확인
      const project = await this.crowdfundingRepository.getProjectById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      // 프로젝트 상태 확인
      if (!project.isActive) {
        res.status(400).json({
          success: false,
          error: '참여할 수 없는 프로젝트입니다.'
        });
        return;
      }

      const participation = await this.crowdfundingRepository.joinProject(projectId, vendorId);

      res.json({
        success: true,
        data: participation,
        message: '프로젝트에 참여했습니다.'
      });
    } catch (error) {
      console.error('Error joining project:', error);
      if (error instanceof Error && error.message.includes('이미 참여한')) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to join project'
        });
      }
    }
  }

  // 참여 취소
  async cancelParticipation(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const vendorId = req.user!.id;

      const participation = await this.crowdfundingRepository.cancelParticipation(projectId, vendorId);

      res.json({
        success: true,
        data: participation,
        message: '참여를 취소했습니다.'
      });
    } catch (error) {
      console.error('Error cancelling participation:', error);
      if (error instanceof Error && error.message.includes('참여 기록을')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to cancel participation'
        });
      }
    }
  }

  // 참여 상태 조회
  async getParticipationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const vendorId = req.user!.id;

      const participation = await this.crowdfundingRepository.getParticipationStatus(projectId, vendorId);

      res.json({
        success: true,
        data: participation
      });
    } catch (error) {
      console.error('Error fetching participation status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch participation status'
      });
    }
  }

  // 관리자용 프로젝트 상태 변경
  async updateProjectStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['recruiting', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
        return;
      }

      const updatedProject = await this.crowdfundingRepository.updateProject(id, { status });

      if (!updatedProject) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      res.json({
        success: true,
        data: updatedProject,
        message: '프로젝트 상태가 변경되었습니다.'
      });
    } catch (error) {
      console.error('Error updating project status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update project status'
      });
    }
  }

  // 대시보드 통계
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.crowdfundingRepository.getDashboardStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard stats'
      });
    }
  }
}