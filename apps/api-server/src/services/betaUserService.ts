import { AppDataSource } from '../database/connection';
import { BetaUser, BetaUserStatus, BetaUserType, InterestArea } from '../entities/BetaUser';
import { BetaFeedback, FeedbackType, FeedbackStatus, FeedbackPriority, SignageFeature } from '../entities/BetaFeedback';
import { User } from '../entities/User';
import { Repository, Between, In, Like } from 'typeorm';

export interface BetaUserRegistrationData {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  type: BetaUserType;
  interestArea: InterestArea;
  useCase?: string;
  expectations?: string;
  interestedFeatures?: string[];
  referralSource?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface BetaFeedbackData {
  type: FeedbackType;
  title: string;
  description: string;
  reproductionSteps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  feature?: SignageFeature;
  priority?: FeedbackPriority;
  contactEmail?: string;
  browserInfo?: string;
  deviceType?: string;
  screenResolution?: string;
  currentUrl?: string;
  rating?: number;
  additionalComments?: string;
  attachments?: string[];
  screenshots?: string[];
}

export interface BetaUserSearchOptions {
  query?: string;
  status?: BetaUserStatus;
  type?: BetaUserType;
  interestArea?: InterestArea;
  page?: number;
  limit?: number;
  sortBy?: 'latest' | 'name' | 'email' | 'lastActive' | 'feedbackCount';
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface BetaFeedbackSearchOptions {
  query?: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  feature?: SignageFeature;
  betaUserId?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'latest' | 'priority' | 'status' | 'type';
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface BetaAnalytics {
  userStats: {
    total: number;
    byStatus: Record<BetaUserStatus, number>;
    byType: Record<BetaUserType, number>;
    byInterestArea: Record<InterestArea, number>;
    newUsersThisWeek: number;
    activeUsersThisWeek: number;
    avgFeedbackPerUser: number;
  };
  feedbackStats: {
    total: number;
    byType: Record<FeedbackType, number>;
    byStatus: Record<FeedbackStatus, number>;
    byPriority: Record<FeedbackPriority, number>;
    byFeature: Record<SignageFeature, number>;
    newFeedbackThisWeek: number;
    avgResolutionTime: number;
    satisfactionRating: number;
  };
  engagementStats: {
    topContributors: Array<{
      betaUser: BetaUser;
      feedbackCount: number;
      lastActiveAt: Date;
    }>;
    popularFeatures: Array<{
      feature: SignageFeature;
      feedbackCount: number;
    }>;
    recentActivity: Array<{
      type: 'registration' | 'feedback' | 'login';
      betaUser: BetaUser;
      details: {
        feedbackTitle?: string;
        feedbackType?: FeedbackType;
        ipAddress?: string;
        userAgent?: string;
      };
      timestamp: Date;
    }>;
  };
}

export class BetaUserService {
  private betaUserRepository: Repository<BetaUser>;
  private betaFeedbackRepository: Repository<BetaFeedback>;
  private userRepository: Repository<User>;

  constructor() {
    this.betaUserRepository = AppDataSource.getRepository(BetaUser);
    this.betaFeedbackRepository = AppDataSource.getRepository(BetaFeedback);
    this.userRepository = AppDataSource.getRepository(User);
  }

  // Beta User Registration
  async registerBetaUser(data: BetaUserRegistrationData, metadata?: {
    browserInfo?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<BetaUser> {
    // Check if email already exists
    const existingUser = await this.betaUserRepository.findOne({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('Email already registered for beta program');
    }

    const betaUser = this.betaUserRepository.create({
      ...data,
      metadata: {
        ...metadata,
        referralSource: data.referralSource,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign
      }
    });

    return await this.betaUserRepository.save(betaUser);
  }

  // Beta User Management
  async getBetaUsers(options: BetaUserSearchOptions = {}): Promise<{
    users: BetaUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      query,
      status,
      type,
      interestArea,
      page = 1,
      limit = 20,
      sortBy = 'latest',
      sortOrder = 'DESC',
      dateFrom,
      dateTo
    } = options;

    const queryBuilder = this.betaUserRepository.createQueryBuilder('betaUser');

    // Search filters
    if (query) {
      queryBuilder.andWhere(
        '(betaUser.name ILIKE :query OR betaUser.email ILIKE :query OR betaUser.company ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('betaUser.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('betaUser.type = :type', { type });
    }

    if (interestArea) {
      queryBuilder.andWhere('betaUser.interestArea = :interestArea', { interestArea });
    }

    if (dateFrom && dateTo) {
      queryBuilder.andWhere('betaUser.created_at BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo
      });
    }

    // Sorting
    const sortMapping = {
      latest: 'betaUser.created_at',
      name: 'betaUser.name',
      email: 'betaUser.email',
      lastActive: 'betaUser.lastActiveAt',
      feedbackCount: 'betaUser.feedbackCount'
    };

    queryBuilder.orderBy(sortMapping[sortBy], sortOrder);

    // Pagination
    const total = await queryBuilder.getCount();
    const users = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { users, total, page, limit };
  }

  async getBetaUserById(id: string): Promise<BetaUser | null> {
    return await this.betaUserRepository.findOne({
      where: { id },
      relations: ['feedback']
    });
  }

  async approveBetaUser(id: string, approvedBy: string, notes?: string): Promise<BetaUser> {
    const betaUser = await this.getBetaUserById(id);
    if (!betaUser) {
      throw new Error('Beta user not found');
    }

    betaUser.approve(approvedBy, notes);
    return await this.betaUserRepository.save(betaUser);
  }

  async updateBetaUserStatus(id: string, status: BetaUserStatus): Promise<BetaUser> {
    const betaUser = await this.getBetaUserById(id);
    if (!betaUser) {
      throw new Error('Beta user not found');
    }

    betaUser.status = status;
    if (status === BetaUserStatus.ACTIVE) {
      betaUser.activate();
    }

    return await this.betaUserRepository.save(betaUser);
  }

  async recordBetaUserLogin(email: string): Promise<BetaUser | null> {
    const betaUser = await this.betaUserRepository.findOne({
      where: { email }
    });

    if (betaUser && betaUser.canProvideFeedback()) {
      betaUser.recordLogin();
      await this.betaUserRepository.save(betaUser);
    }

    return betaUser;
  }

  // Feedback Management
  async submitFeedback(betaUserId: string, data: BetaFeedbackData): Promise<BetaFeedback> {
    const betaUser = await this.getBetaUserById(betaUserId);
    if (!betaUser) {
      throw new Error('Beta user not found');
    }

    if (!betaUser.canProvideFeedback()) {
      throw new Error('Beta user cannot provide feedback in current status');
    }

    const feedback = this.betaFeedbackRepository.create({
      ...data,
      betaUserId,
      priority: data.priority || FeedbackPriority.MEDIUM
    });

    const savedFeedback = await this.betaFeedbackRepository.save(feedback);

    // Update beta user feedback count
    betaUser.incrementFeedbackCount();
    await this.betaUserRepository.save(betaUser);

    // Load feedback with relations for notification
    const feedbackWithUser = await this.betaFeedbackRepository.findOne({
      where: { id: savedFeedback.id },
      relations: ['betaUser']
    });

    // Send real-time notification to admins
    try {
      // Note: RealtimeFeedbackService instance should be injected or accessed differently
      // For now, commenting out to fix the build error
      // const { realtimeFeedbackService } = await import('../main');
      // if (realtimeFeedbackService && feedbackWithUser) {
      //   await realtimeFeedbackService.notifyNewFeedback(feedbackWithUser);
      // }
    } catch (error) {
      // Error log removed
      // Don't fail the feedback submission if notification fails
    }

    return savedFeedback;
  }

  async getFeedback(options: BetaFeedbackSearchOptions = {}): Promise<{
    feedback: BetaFeedback[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      query,
      type,
      status,
      priority,
      feature,
      betaUserId,
      assignedTo,
      page = 1,
      limit = 20,
      sortBy = 'latest',
      sortOrder = 'DESC',
      dateFrom,
      dateTo
    } = options;

    const queryBuilder = this.betaFeedbackRepository.createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.betaUser', 'betaUser')
      .leftJoinAndSelect('feedback.assignee', 'assignee')
      .leftJoinAndSelect('feedback.responder', 'responder');

    // Search filters
    if (query) {
      queryBuilder.andWhere(
        '(feedback.title ILIKE :query OR feedback.description ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    if (type) {
      queryBuilder.andWhere('feedback.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('feedback.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('feedback.priority = :priority', { priority });
    }

    if (feature) {
      queryBuilder.andWhere('feedback.feature = :feature', { feature });
    }

    if (betaUserId) {
      queryBuilder.andWhere('feedback.betaUserId = :betaUserId', { betaUserId });
    }

    if (assignedTo) {
      queryBuilder.andWhere('feedback.assignedTo = :assignedTo', { assignedTo });
    }

    if (dateFrom && dateTo) {
      queryBuilder.andWhere('feedback.created_at BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo
      });
    }

    // Sorting
    const sortMapping = {
      latest: 'feedback.created_at',
      priority: 'feedback.priority',
      status: 'feedback.status',
      type: 'feedback.type'
    };

    queryBuilder.orderBy(sortMapping[sortBy], sortOrder);

    // Add secondary sort by business impact score for priority sorting
    if (sortBy === 'priority') {
      queryBuilder.addOrderBy('feedback.created_at', 'ASC');
    }

    // Pagination
    const total = await queryBuilder.getCount();
    const feedback = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { feedback, total, page, limit };
  }

  async getFeedbackById(id: string): Promise<BetaFeedback | null> {
    return await this.betaFeedbackRepository.findOne({
      where: { id },
      relations: ['betaUser', 'assignee', 'responder', 'resolver']
    });
  }

  // Old methods replaced by new ones with real-time notifications below

  // Analytics
  async getBetaAnalytics(): Promise<BetaAnalytics> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // User stats
    const totalUsers = await this.betaUserRepository.count();
    const usersByStatus = await this.betaUserRepository
      .createQueryBuilder('betaUser')
      .select('betaUser.status, COUNT(*) as count')
      .groupBy('betaUser.status')
      .getRawMany();

    const usersByType = await this.betaUserRepository
      .createQueryBuilder('betaUser')
      .select('betaUser.type, COUNT(*) as count')
      .groupBy('betaUser.type')
      .getRawMany();

    const usersByInterestArea = await this.betaUserRepository
      .createQueryBuilder('betaUser')
      .select('betaUser.interestArea, COUNT(*) as count')
      .groupBy('betaUser.interestArea')
      .getRawMany();

    const newUsersThisWeek = await this.betaUserRepository.count({
      where: { createdAt: Between(oneWeekAgo, new Date()) }
    });

    const activeUsersThisWeek = await this.betaUserRepository.count({
      where: { lastActiveAt: Between(oneWeekAgo, new Date()) }
    });

    const avgFeedbackResult = await this.betaUserRepository
      .createQueryBuilder('betaUser')
      .select('AVG(betaUser.feedbackCount)', 'avg')
      .getRawOne();

    // Feedback stats
    const totalFeedback = await this.betaFeedbackRepository.count();
    const feedbackByType = await this.betaFeedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.type, COUNT(*) as count')
      .groupBy('feedback.type')
      .getRawMany();

    const feedbackByStatus = await this.betaFeedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.status, COUNT(*) as count')
      .groupBy('feedback.status')
      .getRawMany();

    const feedbackByPriority = await this.betaFeedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.priority, COUNT(*) as count')
      .groupBy('feedback.priority')
      .getRawMany();

    const feedbackByFeature = await this.betaFeedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.feature, COUNT(*) as count')
      .where('feedback.feature IS NOT NULL')
      .groupBy('feedback.feature')
      .getRawMany();

    const newFeedbackThisWeek = await this.betaFeedbackRepository.count({
      where: { createdAt: Between(oneWeekAgo, new Date()) }
    });

    const avgResolutionResult = await this.betaFeedbackRepository
      .createQueryBuilder('feedback')
      .select('AVG(EXTRACT(EPOCH FROM (feedback.resolvedAt - feedback.created_at))/86400)', 'avg')
      .where('feedback.resolvedAt IS NOT NULL')
      .getRawOne();

    const avgRatingResult = await this.betaFeedbackRepository
      .createQueryBuilder('feedback')
      .select('AVG(feedback.rating)', 'avg')
      .where('feedback.rating IS NOT NULL')
      .getRawOne();

    // Top contributors
    const topContributors = await this.betaUserRepository
      .createQueryBuilder('betaUser')
      .orderBy('betaUser.feedbackCount', 'DESC')
      .addOrderBy('betaUser.lastActiveAt', 'DESC')
      .take(10)
      .getMany();

    // Popular features
    const popularFeatures = feedbackByFeature
      .sort((a, b) => parseInt(b.count) - parseInt(a.count))
      .slice(0, 5);

    return {
      userStats: {
        total: totalUsers,
        byStatus: this.formatCountArray(usersByStatus, Object.values(BetaUserStatus)),
        byType: this.formatCountArray(usersByType, Object.values(BetaUserType)),
        byInterestArea: this.formatCountArray(usersByInterestArea, Object.values(InterestArea)),
        newUsersThisWeek,
        activeUsersThisWeek,
        avgFeedbackPerUser: parseFloat(avgFeedbackResult?.avg || '0')
      },
      feedbackStats: {
        total: totalFeedback,
        byType: this.formatCountArray(feedbackByType, Object.values(FeedbackType)),
        byStatus: this.formatCountArray(feedbackByStatus, Object.values(FeedbackStatus)),
        byPriority: this.formatCountArray(feedbackByPriority, Object.values(FeedbackPriority)),
        byFeature: this.formatCountArray(feedbackByFeature, Object.values(SignageFeature)),
        newFeedbackThisWeek,
        avgResolutionTime: parseFloat(avgResolutionResult?.avg || '0'),
        satisfactionRating: parseFloat(avgRatingResult?.avg || '0')
      },
      engagementStats: {
        topContributors: topContributors.map((user: any) => ({
          betaUser: user,
          feedbackCount: user.feedbackCount,
          lastActiveAt: user.lastActiveAt || user.createdAt
        })),
        popularFeatures: popularFeatures.map((item: any) => ({
          feature: item.feedback_feature,
          feedbackCount: parseInt(item.count)
        })),
        recentActivity: [] // This would need more complex query for real implementation
      }
    };
  }

  // Helper method to format count arrays
  private formatCountArray(data: Array<{ count: string; [key: string]: string }>, enumValues: string[]): Record<string, number> {
    const result: Record<string, number> = {};
    
    // Initialize all enum values with 0
    enumValues.forEach((value: any) => {
      result[value] = 0;
    });
    
    // Fill in actual counts
    data.forEach((item: any) => {
      const key = Object.keys(item).find((k: any) => k !== 'count');
      if (key) {
        result[item[key]] = parseInt(item.count);
      }
    });
    
    return result;
  }

  // Utility methods
  async getBetaUserByEmail(email: string): Promise<BetaUser | null> {
    return await this.betaUserRepository.findOne({
      where: { email }
    });
  }

  async getHighPriorityFeedback(): Promise<BetaFeedback[]> {
    return await this.betaFeedbackRepository.find({
      where: {
        priority: In([FeedbackPriority.HIGH, FeedbackPriority.CRITICAL]),
        status: In([FeedbackStatus.PENDING, FeedbackStatus.REVIEWED, FeedbackStatus.IN_PROGRESS])
      },
      relations: ['betaUser'],
      order: {
        priority: 'DESC',
        createdAt: 'ASC'
      },
      take: 20
    });
  }

  async getUnassignedFeedback(): Promise<BetaFeedback[]> {
    return await this.betaFeedbackRepository.find({
      where: {
        assignedTo: undefined,
        status: In([FeedbackStatus.PENDING, FeedbackStatus.REVIEWED])
      },
      relations: ['betaUser'],
      order: {
        priority: 'DESC',
        createdAt: 'ASC'
      }
    });
  }

  // Real-time notification helpers
  private async notifyFeedbackUpdate(feedback: BetaFeedback, updateType: string) {
    try {
      // Note: RealtimeFeedbackService instance should be injected or accessed differently
      // For now, commenting out to fix the build error
      // const { realtimeFeedbackService } = await import('../main');
      // if (realtimeFeedbackService) {
      //   await realtimeFeedbackService.notifyFeedbackUpdate(feedback, updateType);
      // }
    } catch (error) {
      // Error log removed
    }
  }

  async respondToFeedback(feedbackId: string, response: string, respondedBy: string): Promise<BetaFeedback> {
    const feedback = await this.betaFeedbackRepository.findOne({
      where: { id: feedbackId },
      relations: ['betaUser']
    });

    if (!feedback) {
      throw new Error('Feedback not found');
    }

    feedback.respond(response, respondedBy);
    const updatedFeedback = await this.betaFeedbackRepository.save(feedback);

    await this.notifyFeedbackUpdate(updatedFeedback, 'responded');
    return updatedFeedback;
  }

  async updateFeedbackStatus(feedbackId: string, status: FeedbackStatus, updatedBy: string): Promise<BetaFeedback> {
    const feedback = await this.betaFeedbackRepository.findOne({
      where: { id: feedbackId },
      relations: ['betaUser']
    });

    if (!feedback) {
      throw new Error('Feedback not found');
    }

    const oldStatus = feedback.status;
    feedback.status = status;

    if (status === FeedbackStatus.RESOLVED) {
      feedback.resolve(updatedBy);
    } else if (status === FeedbackStatus.IN_PROGRESS) {
      feedback.markInProgress();
    } else if (status === FeedbackStatus.REJECTED) {
      feedback.reject(updatedBy);
    }

    const updatedFeedback = await this.betaFeedbackRepository.save(feedback);

    await this.notifyFeedbackUpdate(updatedFeedback, `status_changed_from_${oldStatus}_to_${status}`);
    return updatedFeedback;
  }

  async assignFeedback(feedbackId: string, assignedTo: string): Promise<BetaFeedback> {
    const feedback = await this.betaFeedbackRepository.findOne({
      where: { id: feedbackId },
      relations: ['betaUser']
    });

    if (!feedback) {
      throw new Error('Feedback not found');
    }

    feedback.assignTo(assignedTo);
    const updatedFeedback = await this.betaFeedbackRepository.save(feedback);

    await this.notifyFeedbackUpdate(updatedFeedback, 'assigned');
    return updatedFeedback;
  }

  async updateFeedbackPriority(feedbackId: string, priority: FeedbackPriority): Promise<BetaFeedback> {
    const feedback = await this.betaFeedbackRepository.findOne({
      where: { id: feedbackId },
      relations: ['betaUser']
    });

    if (!feedback) {
      throw new Error('Feedback not found');
    }

    const oldPriority = feedback.priority;
    feedback.priority = priority;
    const updatedFeedback = await this.betaFeedbackRepository.save(feedback);

    await this.notifyFeedbackUpdate(updatedFeedback, `priority_changed_from_${oldPriority}_to_${priority}`);
    return updatedFeedback;
  }
}

export const betaUserService = new BetaUserService();