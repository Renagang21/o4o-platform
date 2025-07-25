import { Repository, FindManyOptions, Like, Between, In } from 'typeorm';
import { AppDataSource } from '../../database/connection';
import { FundingProject } from '../../entities/crowdfunding/FundingProject';
import { FundingReward } from '../../entities/crowdfunding/FundingReward';
import { User } from '../../entities/User';
import type { 
  FundingProjectFormData, 
  ProjectFilters,
  FundingStatus 
} from '../../types/crowdfunding-types';
import { generateSlug } from '../../utils/string';

export class FundingProjectService {
  private projectRepository: Repository<FundingProject>;
  private rewardRepository: Repository<FundingReward>;
  private userRepository: Repository<User>;

  constructor() {
    this.projectRepository = AppDataSource.getRepository(FundingProject);
    this.rewardRepository = AppDataSource.getRepository(FundingReward);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createProject(data: FundingProjectFormData, creatorId: string): Promise<FundingProject> {
    const creator = await this.userRepository.findOne({ where: { id: creatorId } });
    if (!creator) {
      throw new Error('Creator not found');
    }

    // Filter out file fields for entity creation
    const { mainImage, images, ...entityData } = data;
    
    // Create entity data without File types
    const projectData = {
      ...entityData,
      slug: generateSlug(data.title),
      creatorId,
      creatorName: creator.name || creator.email,
      status: 'draft' as FundingStatus,
      currentAmount: 0,
      backerCount: 0,
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      updateCount: 0,
      // Handle file fields as strings for database storage
      mainImage: typeof mainImage === 'string' ? mainImage : undefined,
      images: Array.isArray(images) ? images.filter(img => typeof img === 'string') : undefined,
    };

    const project = this.projectRepository.create(projectData as any);
    const savedProject = await this.projectRepository.save(project);
    return Array.isArray(savedProject) ? savedProject[0] : savedProject;
  }

  async updateProject(projectId: string, data: Partial<FundingProjectFormData>, userId: string): Promise<FundingProject> {
    const project = await this.projectRepository.findOne({ 
      where: { id: projectId, creatorId: userId } 
    });

    if (!project) {
      throw new Error('Project not found or unauthorized');
    }

    Object.assign(project, data);
    return await this.projectRepository.save(project);
  }

  async getProject(projectId: string): Promise<FundingProject | null> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['creator', 'rewards', 'updates'],
    });

    if (project) {
      // Increment view count
      await this.projectRepository.increment({ id: projectId }, 'viewCount', 1);
    }

    return project;
  }

  async getProjects(filters: ProjectFilters) {
    const {
      search,
      category,
      status,
      minAmount,
      maxAmount,
      creatorId,
      tags,
      sortBy = 'latest',
      page = 1,
      limit = 12,
    } = filters;

    const where: any = {};

    if (search) {
      where.title = Like(`%${search}%`);
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (minAmount || maxAmount) {
      where.targetAmount = Between(minAmount || 0, maxAmount || Number.MAX_SAFE_INTEGER);
    }

    // Sort options
    let order: any = {};
    switch (sortBy) {
      case 'popular':
        order = { backerCount: 'DESC' };
        break;
      case 'ending_soon':
        where.status = 'ongoing';
        order = { endDate: 'ASC' };
        break;
      case 'most_funded':
        order = { currentAmount: 'DESC' };
        break;
      default:
        order = { createdAt: 'DESC' };
    }

    const [projects, total] = await this.projectRepository.findAndCount({
      where,
      order,
      relations: ['creator'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateProjectStatus(projectId: string, status: FundingStatus): Promise<void> {
    await this.projectRepository.update(projectId, { status });
  }

  async updateProjectStats(projectId: string, stats: Partial<{
    currentAmount: number;
    backerCount: number;
  }>): Promise<void> {
    await this.projectRepository.update(projectId, stats);
  }

  async checkAndUpdateExpiredProjects(): Promise<void> {
    const now = new Date();
    
    // Find ongoing projects that have ended
    const expiredProjects = await this.projectRepository.find({
      where: {
        status: 'ongoing' as FundingStatus,
        endDate: Between(new Date(0), now),
      },
    });

    for (const project of expiredProjects) {
      const newStatus = project.currentAmount >= (project.minimumAmount || project.targetAmount)
        ? 'successful'
        : 'failed';
      
      await this.updateProjectStatus(project.id, newStatus as FundingStatus);
    }
  }
}