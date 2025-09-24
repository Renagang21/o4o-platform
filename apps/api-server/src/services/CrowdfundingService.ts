/**
 * 크라우드펀딩 서비스
 * 제품 개발 중심의 간단한 펀딩 시스템
 * 펀딩 성공 시 일반 상품으로 자동 전환
 */

import { AppDataSource } from '../database/connection';
import { FundingProject } from '../entities/crowdfunding/FundingProject';
import { FundingBacking } from '../entities/crowdfunding/FundingBacking';
import { FundingReward } from '../entities/crowdfunding/FundingReward';
import { FundingUpdate } from '../entities/crowdfunding/FundingUpdate';
import { BackerReward } from '../entities/crowdfunding/BackerReward';
import { Product, ProductStatus } from '../entities/Product';
import { User } from '../entities/User';
import { tossPaymentsService } from './TossPaymentsService';
import logger from '../utils/simpleLogger';
import { EventEmitter } from 'events';
import type { 
  FundingStatus, 
  FundingCategory, 
  PaymentMethod,
  PaymentStatus,
  BackingStatus 
} from '../types/crowdfunding-types';

interface CreateProjectData {
  title: string;
  description: string;
  shortDescription: string;
  category: FundingCategory;
  tags?: string[];
  targetAmount: number;
  startDate: Date;
  endDate: Date;
  estimatedDeliveryDate?: Date;
  story: string;
  risks?: string;
  mainImage?: string;
  images?: string[];
  videoUrl?: string;
  creatorDescription?: string;
}

interface CreateRewardData {
  title: string;
  description: string;
  price: number;
  earlyBirdPrice?: number;
  earlyBirdLimit?: number;
  totalQuantity?: number;
  estimatedDeliveryDate: Date;
  shippingRequired?: boolean;
  images?: string[];
  includesItems?: any[];
  maxPerBacker?: number;
  sortOrder?: number;
}

interface BackingData {
  projectId: string;
  backerId: string;
  amount: number;
  rewardIds?: string[];
  paymentMethod: PaymentMethod;
  isAnonymous?: boolean;
  displayName?: string;
  backerMessage?: string;
  isMessagePublic?: boolean;
}

interface ProjectUpdateData {
  title: string;
  content: string;
  stage?: 'idea' | 'prototype' | 'production' | 'shipping';
  progressPercentage?: number;
  images?: string[];
  isPublic?: boolean;
}

export class CrowdfundingService extends EventEmitter {
  private projectRepository = AppDataSource.getRepository(FundingProject);
  private backingRepository = AppDataSource.getRepository(FundingBacking);
  private rewardRepository = AppDataSource.getRepository(FundingReward);
  private updateRepository = AppDataSource.getRepository(FundingUpdate);
  private backerRewardRepository = AppDataSource.getRepository(BackerReward);
  private productRepository = AppDataSource.getRepository(Product);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * 프로젝트 생성
   */
  async createProject(creatorId: string, data: CreateProjectData): Promise<FundingProject> {
    const creator = await this.userRepository.findOne({ where: { id: creatorId } });
    if (!creator) {
      throw new Error('Creator not found');
    }

    // 슬러그 생성
    const slug = this.generateSlug(data.title);

    const project = this.projectRepository.create({
      ...data,
      slug,
      creatorId,
      creatorName: creator.name || creator.email,
      status: 'draft' as FundingStatus,
      currentAmount: 0,
      backerCount: 0,
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      updateCount: 0,
      allowComments: true,
      allowAnonymousBacking: false,
      showBackerList: true,
      isVisible: false, // 승인 전까지 비공개
      isFeatured: false,
      isStaffPick: false
    });

    await this.projectRepository.save(project);

    logger.info(`Crowdfunding project created: ${project.id}`);
    
    // 관리자 알림
    this.emit('projectCreated', {
      projectId: project.id,
      creatorId,
      title: data.title
    });

    return project;
  }

  /**
   * 리워드 생성
   */
  async createReward(
    projectId: string,
    data: CreateRewardData
  ): Promise<FundingReward> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new Error('Project not found');
    }

    const reward = this.rewardRepository.create({
      projectId,
      ...data,
      remainingQuantity: data.totalQuantity,
      isActive: true,
      isHidden: false,
      sortOrder: data.sortOrder || 0
    });

    await this.rewardRepository.save(reward);

    logger.info(`Reward created for project ${projectId}: ${reward.id}`);

    return reward;
  }

  /**
   * 프로젝트 승인
   */
  async approveProject(
    projectId: string,
    adminId: string
  ): Promise<FundingProject> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.status !== 'draft' && project.status !== 'pending') {
      throw new Error('Project cannot be approved in current status');
    }

    project.status = 'pending' as FundingStatus; // 시작일 대기
    project.isVisible = true;
    project.approvedAt = new Date();
    project.approvedBy = adminId;

    // 시작일이 현재보다 이전이면 즉시 시작
    if (new Date(project.startDate) <= new Date()) {
      project.status = 'ongoing' as FundingStatus;
    }

    await this.projectRepository.save(project);

    // 크리에이터 알림
    this.emit('projectApproved', {
      projectId,
      creatorId: project.creatorId,
      title: project.title
    });

    logger.info(`Project approved: ${projectId}`);

    return project;
  }

  /**
   * 프로젝트 거절
   */
  async rejectProject(
    projectId: string,
    adminId: string,
    reason: string
  ): Promise<FundingProject> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new Error('Project not found');
    }

    project.status = 'cancelled' as FundingStatus;
    project.rejectionReason = reason;
    project.approvedBy = adminId;
    project.approvedAt = new Date();

    await this.projectRepository.save(project);

    // 크리에이터 알림
    this.emit('projectRejected', {
      projectId,
      creatorId: project.creatorId,
      title: project.title,
      reason
    });

    return project;
  }

  /**
   * 후원하기
   */
  async createBacking(data: BackingData): Promise<FundingBacking> {
    const project = await this.projectRepository.findOne({ 
      where: { id: data.projectId },
      relations: ['rewards']
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.status !== 'ongoing') {
      throw new Error('Project is not accepting backings');
    }

    // 마감일 확인
    if (new Date(project.endDate) < new Date()) {
      throw new Error('Project funding period has ended');
    }

    // 후원 생성
    const backing = this.backingRepository.create({
      ...data,
      currency: 'KRW',
      paymentStatus: 'pending' as PaymentStatus,
      status: 'active' as BackingStatus
    });

    await this.backingRepository.save(backing);

    // 리워드 연결
    if (data.rewardIds && data.rewardIds.length > 0) {
      for (const rewardId of data.rewardIds) {
        const reward = project.rewards?.find(r => r.id === rewardId);
        if (reward) {
          const backerReward = this.backerRewardRepository.create({
            backingId: backing.id,
            rewardId,
            quantity: 1,
            status: 'pending'
          });
          await this.backerRewardRepository.save(backerReward);

          // 재고 감소
          if (reward.remainingQuantity !== null && reward.remainingQuantity > 0) {
            reward.remainingQuantity -= 1;
            await this.rewardRepository.save(reward);
          }
        }
      }
    }

    // 프로젝트 통계 업데이트
    project.currentAmount = Number(project.currentAmount) + data.amount;
    project.backerCount += 1;
    await this.projectRepository.save(project);

    logger.info(`Backing created: ${backing.id} for project ${data.projectId}`);

    // 목표 달성 확인
    if (project.currentAmount >= project.targetAmount) {
      this.emit('projectFunded', {
        projectId: project.id,
        creatorId: project.creatorId,
        title: project.title,
        currentAmount: project.currentAmount,
        targetAmount: project.targetAmount
      });
    }

    return backing;
  }

  /**
   * 결제 확인
   */
  async confirmPayment(
    backingId: string,
    paymentId: string
  ): Promise<FundingBacking> {
    const backing = await this.backingRepository.findOne({ 
      where: { id: backingId },
      relations: ['project']
    });

    if (!backing) {
      throw new Error('Backing not found');
    }

    backing.paymentStatus = 'completed' as PaymentStatus;
    backing.paymentId = paymentId;
    backing.paidAt = new Date();

    await this.backingRepository.save(backing);

    // 후원자 알림
    this.emit('backingConfirmed', {
      backingId,
      projectId: backing.projectId,
      backerId: backing.backerId,
      amount: backing.amount
    });

    logger.info(`Payment confirmed for backing: ${backingId}`);

    return backing;
  }

  /**
   * 프로젝트 업데이트 작성
   */
  async createProjectUpdate(
    projectId: string,
    creatorId: string,
    data: ProjectUpdateData
  ): Promise<FundingUpdate> {
    const project = await this.projectRepository.findOne({ 
      where: { id: projectId, creatorId }
    });

    if (!project) {
      throw new Error('Project not found or unauthorized');
    }

    const update = this.updateRepository.create({
      projectId,
      ...data,
      isPublic: data.isPublic !== false
    });

    await this.updateRepository.save(update);

    // 프로젝트 업데이트 카운트 증가
    project.updateCount += 1;
    await this.projectRepository.save(project);

    // 후원자들에게 알림
    if (update.isPublic) {
      this.emit('projectUpdated', {
        projectId,
        updateId: update.id,
        title: update.title,
        stage: data.stage
      });
    }

    logger.info(`Project update created: ${update.id} for project ${projectId}`);

    return update;
  }

  /**
   * 펀딩 종료 처리
   */
  async endFunding(projectId: string): Promise<FundingProject> {
    const project = await this.projectRepository.findOne({ 
      where: { id: projectId }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // 목표 달성 여부 확인
    const isSuccessful = project.currentAmount >= project.targetAmount;

    if (isSuccessful) {
      project.status = 'successful' as FundingStatus;
      
      // 일반 상품으로 전환
      await this.convertToProduct(project);
      
      // 성공 알림
      this.emit('projectSuccessful', {
        projectId,
        creatorId: project.creatorId,
        title: project.title,
        currentAmount: project.currentAmount,
        targetAmount: project.targetAmount
      });
    } else {
      project.status = 'failed' as FundingStatus;
      
      // 환불 처리 시작
      await this.processRefunds(projectId);
      
      // 실패 알림
      this.emit('projectFailed', {
        projectId,
        creatorId: project.creatorId,
        title: project.title,
        currentAmount: project.currentAmount,
        targetAmount: project.targetAmount
      });
    }

    await this.projectRepository.save(project);

    logger.info(`Funding ended for project ${projectId}: ${project.status}`);

    return project;
  }

  /**
   * 펀딩 성공 시 일반 상품으로 전환
   */
  private async convertToProduct(project: FundingProject): Promise<Product> {
    const rewards = await this.rewardRepository.find({ 
      where: { projectId: project.id },
      order: { sortOrder: 'ASC' }
    });

    // 가장 기본적인 리워드를 기준으로 상품 생성
    const baseReward = rewards[0];
    if (!baseReward) {
      throw new Error('No rewards found for project');
    }

    const product = this.productRepository.create({
      name: project.title,
      slug: project.slug + '-product',
      description: project.description,
      shortDescription: project.shortDescription,
      retailPrice: baseReward.price,
      compareAtPrice: baseReward.earlyBirdPrice,
      status: ProductStatus.ACTIVE,
      visibility: 'visible',
      stockQuantity: baseReward.totalQuantity || 1000,
      sku: `CF-${project.id.substring(0, 8).toUpperCase()}`,
      weight: 0,
      tags: project.tags,
      images: project.images || [],
      metadata: {
        crowdfundingProjectId: project.id,
        crowdfundingSuccess: true,
        originalBackerCount: project.backerCount,
        originalFundingAmount: project.currentAmount,
        convertedAt: new Date()
      },
      brand: project.creatorName,
      rating: 0,
      reviewCount: 0,
      salesCount: 0,
      createdBy: project.creatorId,
      manageStock: true,
      featured: false,
      requiresShipping: baseReward.shippingRequired || false
    });

    await this.productRepository.save(product);

    logger.info(`Project ${project.id} converted to product ${product.id}`);

    // 전환 알림
    this.emit('productConverted', {
      projectId: project.id,
      productId: product.id,
      title: project.title
    });

    return product;
  }

  /**
   * 환불 처리
   */
  private async processRefunds(projectId: string): Promise<void> {
    const backings = await this.backingRepository.find({
      where: { 
        projectId,
        paymentStatus: 'completed' as PaymentStatus,
        status: 'active' as BackingStatus
      }
    });

    for (const backing of backings) {
      try {
        // TossPayments 환불 처리
        if (backing.paymentId) {
          await tossPaymentsService.cancelPayment(
            backing.paymentId,
            '펀딩 실패로 인한 환불',
            backing.amount
          );

          backing.status = 'refunded' as BackingStatus;
          backing.refundedAt = new Date();
          backing.refundAmount = backing.amount;
          await this.backingRepository.save(backing);

          // 환불 알림
          this.emit('backingRefunded', {
            backingId: backing.id,
            backerId: backing.backerId,
            amount: backing.amount
          });
        }
      } catch (error) {
        logger.error(`Failed to refund backing ${backing.id}:`, error);
      }
    }
  }

  /**
   * 크리에이터 대시보드 데이터
   */
  async getCreatorDashboard(creatorId: string): Promise<any> {
    const projects = await this.projectRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' }
    });

    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'ongoing').length,
      successfulProjects: projects.filter(p => p.status === 'successful').length,
      totalRaised: projects.reduce((sum, p) => sum + Number(p.currentAmount), 0),
      totalBackers: projects.reduce((sum, p) => sum + p.backerCount, 0)
    };

    const recentBackings = await this.backingRepository
      .createQueryBuilder('backing')
      .innerJoin('backing.project', 'project')
      .where('project.creatorId = :creatorId', { creatorId })
      .orderBy('backing.createdAt', 'DESC')
      .limit(10)
      .getMany();

    return {
      projects,
      stats,
      recentBackings
    };
  }

  /**
   * 후원자 대시보드 데이터
   */
  async getBackerDashboard(backerId: string): Promise<any> {
    const backings = await this.backingRepository.find({
      where: { backerId },
      relations: ['project', 'rewards'],
      order: { createdAt: 'DESC' }
    });

    const stats = {
      totalBackings: backings.length,
      totalAmount: backings.reduce((sum, b) => sum + Number(b.amount), 0),
      activeBackings: backings.filter(b => b.status === 'active').length,
      successfulProjects: backings.filter(b => b.project?.status === 'successful').length
    };

    return {
      backings,
      stats
    };
  }

  /**
   * 프로젝트 목록 조회
   */
  async getProjects(filter: {
    status?: FundingStatus;
    category?: FundingCategory;
    creatorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ projects: FundingProject[]; total: number }> {
    const query = this.projectRepository.createQueryBuilder('project');

    // 필터 적용
    if (filter.status) {
      query.andWhere('project.status = :status', { status: filter.status });
    } else {
      // 기본적으로 공개된 프로젝트만
      query.andWhere('project.isVisible = :isVisible', { isVisible: true });
    }

    if (filter.category) {
      query.andWhere('project.category = :category', { category: filter.category });
    }

    if (filter.creatorId) {
      query.andWhere('project.creatorId = :creatorId', { creatorId: filter.creatorId });
    }

    if (filter.search) {
      query.andWhere(
        '(project.title LIKE :search OR project.description LIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // 정렬
    query.orderBy('project.createdAt', 'DESC');

    // 페이징
    const page = filter.page || 1;
    const limit = filter.limit || 12;
    query.skip((page - 1) * limit).take(limit);

    const [projects, total] = await query.getManyAndCount();

    return { projects, total };
  }

  /**
   * 프로젝트 상세 조회
   */
  async getProjectDetails(projectId: string): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['rewards', 'updates']
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // 조회수 증가
    project.viewCount += 1;
    await this.projectRepository.save(project);

    // 진행률 계산
    const fundingProgress = (Number(project.currentAmount) / Number(project.targetAmount)) * 100;
    
    // 남은 시간 계산
    const now = new Date();
    const endDate = new Date(project.endDate);
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      project,
      fundingProgress,
      daysLeft
    };
  }

  /**
   * 슬러그 생성
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now().toString(36);
  }

  /**
   * 크론 작업: 프로젝트 상태 업데이트
   */
  async updateProjectStatuses(): Promise<void> {
    const now = new Date();

    // 시작일이 된 프로젝트 활성화
    await this.projectRepository
      .createQueryBuilder()
      .update(FundingProject)
      .set({ status: 'ongoing' as FundingStatus })
      .where('"status" = :status', { status: 'pending' })
      .andWhere('"startDate" <= :now', { now })
      .andWhere('"endDate" > :now', { now })
      .execute();

    // 종료일이 지난 프로젝트 종료 처리
    const endedProjects = await this.projectRepository.find({
      where: { status: 'ongoing' as FundingStatus }
    });

    for (const project of endedProjects) {
      if (new Date(project.endDate) < now) {
        await this.endFunding(project.id);
      }
    }
  }
}

// 싱글톤 인스턴스
export const crowdfundingService = new CrowdfundingService();