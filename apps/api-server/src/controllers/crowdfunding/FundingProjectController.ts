import { Request, Response } from 'express';
import { FundingProjectService } from '../../services/crowdfunding/FundingProjectService';
import type { ProjectFilters } from '../../types/crowdfunding-types';

export class FundingProjectController {
  private projectService: FundingProjectService;

  constructor() {
    this.projectService = new FundingProjectService();
  }

  // Get all projects
  async getProjects(req: Request, res: Response) {
    try {
      const filters: ProjectFilters = {
        search: req.query.search as string,
        category: req.query.category as any,
        status: req.query.status as any,
        minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
        maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
        creatorId: req.query.creatorId as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        sortBy: req.query.sortBy as any || 'latest',
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 12,
      };

      // Special filter for staff picks
      if (req.query.isStaffPick === 'true') {
        (filters as any).isStaffPick = true;
      }

      const result = await this.projectService.getProjects(filters);
      res.json(result);
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  // Get single project
  async getProject(req: Request, res: Response) {
    try {
      const project = await this.projectService.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  // Create project
  async createProject(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const project = await this.projectService.createProject(req.body, userId);
      res.status(201).json(project);
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  // Update project
  async updateProject(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const project = await this.projectService.updateProject(
        req.params.id,
        req.body,
        userId
      );
      res.json(project);
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  // Get user's projects
  async getMyProjects(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const filters: ProjectFilters = {
        creatorId: userId,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 12,
      };

      const result = await this.projectService.getProjects(filters);
      res.json(result);
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to fetch user projects' });
    }
  }

  // Get project stats
  async getProjectStats(req: Request, res: Response) {
    try {
      const project = await this.projectService.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Calculate additional stats
      const daysLeft = Math.max(
        0,
        Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      );

      const stats = {
        projectId: project.id,
        totalBackers: project.backerCount,
        totalAmount: project.currentAmount,
        fundingProgress: (Number(project.currentAmount) / Number(project.targetAmount)) * 100,
        daysLeft,
        averageBackingAmount: project.backerCount > 0 
          ? Number(project.currentAmount) / project.backerCount 
          : 0,
      };

      res.json(stats);
    } catch (error) {
      // Error log removed
      res.status(500).json({ error: 'Failed to fetch project stats' });
    }
  }
}