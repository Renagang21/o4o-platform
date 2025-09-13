import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { CrowdfundingProject } from '../entities/CrowdfundingProject';
import { CrowdfundingParticipation } from '../entities/CrowdfundingParticipation';
import { User } from '../entities/User';

export class CrowdfundingRepository {
  private projectRepository: Repository<CrowdfundingProject>;
  private participationRepository: Repository<CrowdfundingParticipation>;
  private userRepository: Repository<User>;

  constructor(dataSource: DataSource) {
    this.projectRepository = dataSource.getRepository(CrowdfundingProject);
    this.participationRepository = dataSource.getRepository(CrowdfundingParticipation);
    this.userRepository = dataSource.getRepository(User);
  }

  // 프로젝트 CRUD
  async createProject(projectData: Partial<CrowdfundingProject>): Promise<CrowdfundingProject> {
    const project = this.projectRepository.create(projectData);
    return await this.projectRepository.save(project);
  }

  async getProjects(options: {
    status?: string;
    creatorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ projects: CrowdfundingProject[]; total: number }> {
    const { status, creatorId, search, page = 1, limit = 10 } = options;

    let query: SelectQueryBuilder<CrowdfundingProject> = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.creator', 'creator')
      .leftJoinAndSelect('project.participations', 'participations')
      .leftJoinAndSelect('participations.vendor', 'vendor');

    if (status) {
      query = query.andWhere('project.status = :status', { status });
    }

    if (creatorId) {
      query = query.andWhere('project.creatorId = :creatorId', { creatorId });
    }

    if (search) {
      query = query.andWhere(
        '(project.title ILIKE :search OR project.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    query = query
      .orderBy('project.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [projects, total] = await query.getManyAndCount();

    return { projects, total };
  }

  async getProjectById(id: string, userId?: string): Promise<CrowdfundingProject | null> {
    const query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.creator', 'creator')
      .leftJoinAndSelect('project.participations', 'participations', 'participations.status = :status', { status: 'joined' })
      .leftJoinAndSelect('participations.vendor', 'vendor')
      .where('project.id = :id', { id });

    const project = await query.getOne();

    if (!project) return null;

    // 사용자의 참여 상태 추가
    if (userId) {
      const userParticipation = await this.participationRepository.findOne({
        where: { projectId: id, vendorId: userId },
        order: { createdAt: 'DESC' }
      });

      if (userParticipation) {
        (project as any).participationStatus = userParticipation.status;
      }
    }

    return project;
  }

  async updateProject(id: string, updateData: Partial<CrowdfundingProject>): Promise<CrowdfundingProject | null> {
    await this.projectRepository.update(id, updateData);
    return await this.getProjectById(id);
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.projectRepository.delete(id);
    return result.affected! > 0;
  }

  // 참여 관련
  async joinProject(projectId: string, vendorId: string): Promise<CrowdfundingParticipation> {
    // 기존 참여 기록 확인
    const existingParticipation = await this.participationRepository.findOne({
      where: { projectId, vendorId }
    });

    if (existingParticipation) {
      if (existingParticipation.status === 'joined') {
        throw new Error('이미 참여한 프로젝트입니다.');
      }
      // 취소 상태였다면 다시 참여로 변경
      existingParticipation.status = 'joined';
      existingParticipation.joinedAt = new Date();
      existingParticipation.cancelledAt = undefined;
      const updated = await this.participationRepository.save(existingParticipation);
      
      // 프로젝트 참여 수 증가
      await this.updateParticipantCount(projectId);
      
      return updated;
    }

    // 새로운 참여 생성
    const participation = this.participationRepository.create({
      projectId,
      vendorId,
      status: 'joined',
      joinedAt: new Date()
    });

    const saved = await this.participationRepository.save(participation);
    
    // 프로젝트 참여 수 증가
    await this.updateParticipantCount(projectId);
    
    return saved;
  }

  async cancelParticipation(projectId: string, vendorId: string): Promise<CrowdfundingParticipation | null> {
    const participation = await this.participationRepository.findOne({
      where: { projectId, vendorId, status: 'joined' }
    });

    if (!participation) {
      throw new Error('참여 기록을 찾을 수 없습니다.');
    }

    participation.status = 'cancelled';
    participation.cancelledAt = new Date();
    
    const updated = await this.participationRepository.save(participation);
    
    // 프로젝트 참여 수 감소
    await this.updateParticipantCount(projectId);
    
    return updated;
  }

  async getParticipationStatus(projectId: string, vendorId: string): Promise<CrowdfundingParticipation | null> {
    return await this.participationRepository.findOne({
      where: { projectId, vendorId },
      order: { createdAt: 'DESC' }
    });
  }

  private async updateParticipantCount(projectId: string): Promise<void> {
    const count = await this.participationRepository.count({
      where: { projectId, status: 'joined' }
    });

    await this.projectRepository.update(projectId, {
      currentParticipantCount: count
    });
  }

  // 통계
  async getDashboardStats(): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalParticipants: number;
    successRate: number;
  }> {
    const totalProjects = await this.projectRepository.count();
    const activeProjects = await this.projectRepository.count({
      where: { status: 'recruiting' }
    });
    const completedProjects = await this.projectRepository.count({
      where: { status: 'completed' }
    });
    const totalParticipants = await this.participationRepository.count({
      where: { status: 'joined' }
    });

    // 성공률 계산 (목표 달성한 프로젝트 비율)
    const allProjects = await this.projectRepository.find();
    const successfulProjects = allProjects.filter((p: any) => p.isSuccessful).length;
    const successRate = totalProjects > 0 ? Math.round((successfulProjects / totalProjects) * 100) : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalParticipants,
      successRate
    };
  }
}