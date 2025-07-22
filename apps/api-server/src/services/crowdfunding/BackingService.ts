import { Repository, DataSource } from 'typeorm';
import { AppDataSource } from '../../database/connection';
import { FundingBacking } from '../../entities/crowdfunding/FundingBacking';
import { FundingProject } from '../../entities/crowdfunding/FundingProject';
import { FundingReward } from '../../entities/crowdfunding/FundingReward';
import { BackerReward } from '../../entities/crowdfunding/BackerReward';
import { User } from '../../entities/User';
import { FundingProjectService } from './FundingProjectService';
import type { PaymentMethod, BackingStatus } from '@o4o/crowdfunding-types';

interface CreateBackingData {
  projectId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  rewards?: Array<{
    rewardId: string;
    quantity: number;
    selectedOptions?: any;
  }>;
  isAnonymous?: boolean;
  displayName?: string;
  backerMessage?: string;
  isMessagePublic?: boolean;
}

export class BackingService {
  private backingRepository: Repository<FundingBacking>;
  private projectRepository: Repository<FundingProject>;
  private rewardRepository: Repository<FundingReward>;
  private backerRewardRepository: Repository<BackerReward>;
  private userRepository: Repository<User>;
  private projectService: FundingProjectService;

  constructor() {
    this.backingRepository = AppDataSource.getRepository(FundingBacking);
    this.projectRepository = AppDataSource.getRepository(FundingProject);
    this.rewardRepository = AppDataSource.getRepository(FundingReward);
    this.backerRewardRepository = AppDataSource.getRepository(BackerReward);
    this.userRepository = AppDataSource.getRepository(User);
    this.projectService = new FundingProjectService();
  }

  async createBacking(data: CreateBackingData, backerId: string): Promise<FundingBacking> {
    // Start transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify project exists and is ongoing
      const project = await queryRunner.manager.findOne(FundingProject, {
        where: { id: data.projectId, status: 'ongoing' },
      });

      if (!project) {
        throw new Error('Project not found or not available for backing');
      }

      // Create backing
      const backing = queryRunner.manager.create(FundingBacking, {
        projectId: data.projectId,
        backerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        isAnonymous: data.isAnonymous || false,
        displayName: data.displayName,
        backerMessage: data.backerMessage,
        isMessagePublic: data.isMessagePublic || false,
        status: 'active' as BackingStatus,
        paymentStatus: 'pending',
      });

      const savedBacking = await queryRunner.manager.save(backing);

      // Process rewards if any
      if (data.rewards && data.rewards.length > 0) {
        for (const rewardData of data.rewards) {
          const reward = await queryRunner.manager.findOne(FundingReward, {
            where: { id: rewardData.rewardId, projectId: data.projectId },
          });

          if (!reward) {
            throw new Error(`Reward ${rewardData.rewardId} not found`);
          }

          // Check availability
          if (reward.remainingQuantity !== null && reward.remainingQuantity < rewardData.quantity) {
            throw new Error(`Insufficient quantity for reward ${reward.title}`);
          }

          // Create backer reward
          const backerReward = queryRunner.manager.create(BackerReward, {
            backingId: savedBacking.id,
            rewardId: reward.id,
            quantity: rewardData.quantity,
            selectedOptions: rewardData.selectedOptions,
            totalPrice: reward.price * rewardData.quantity,
            status: 'pending',
          });

          await queryRunner.manager.save(backerReward);

          // Update remaining quantity
          if (reward.remainingQuantity !== null) {
            reward.remainingQuantity -= rewardData.quantity;
            await queryRunner.manager.save(reward);
          }
        }
      }

      // Update project stats
      await queryRunner.manager.increment(
        FundingProject,
        { id: data.projectId },
        'currentAmount',
        data.amount
      );
      await queryRunner.manager.increment(
        FundingProject,
        { id: data.projectId },
        'backerCount',
        1
      );

      await queryRunner.commitTransaction();
      return savedBacking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updatePaymentStatus(
    backingId: string,
    paymentId: string,
    status: 'completed' | 'failed'
  ): Promise<void> {
    const backing = await this.backingRepository.findOne({
      where: { id: backingId },
    });

    if (!backing) {
      throw new Error('Backing not found');
    }

    backing.paymentId = paymentId;
    backing.paymentStatus = status;
    
    if (status === 'completed') {
      backing.paidAt = new Date();
    }

    await this.backingRepository.save(backing);
  }

  async cancelBacking(backingId: string, userId: string, reason?: string): Promise<void> {
    const backing = await this.backingRepository.findOne({
      where: { id: backingId, backerId: userId },
      relations: ['project', 'rewards'],
    });

    if (!backing) {
      throw new Error('Backing not found');
    }

    if (backing.status !== 'active') {
      throw new Error('Backing cannot be cancelled');
    }

    // Start transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update backing status
      backing.status = 'cancelled' as BackingStatus;
      backing.cancelledAt = new Date();
      backing.cancellationReason = reason;
      await queryRunner.manager.save(backing);

      // Restore reward quantities
      for (const backerReward of backing.rewards) {
        const reward = await queryRunner.manager.findOne(FundingReward, {
          where: { id: backerReward.rewardId },
        });

        if (reward && reward.remainingQuantity !== null) {
          reward.remainingQuantity += backerReward.quantity;
          await queryRunner.manager.save(reward);
        }
      }

      // Update project stats
      await queryRunner.manager.decrement(
        FundingProject,
        { id: backing.projectId },
        'currentAmount',
        backing.amount
      );
      await queryRunner.manager.decrement(
        FundingProject,
        { id: backing.projectId },
        'backerCount',
        1
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getUserBackings(userId: string, status?: BackingStatus) {
    const where: any = { backerId: userId };
    if (status) {
      where.status = status;
    }

    return await this.backingRepository.find({
      where,
      relations: ['project', 'rewards', 'rewards.reward'],
      order: { createdAt: 'DESC' },
    });
  }

  async getProjectBackings(projectId: string, options?: {
    showAnonymous?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { showAnonymous = false, page = 1, limit = 20 } = options || {};

    const where: any = { 
      projectId,
      status: 'active',
      paymentStatus: 'completed',
    };

    if (!showAnonymous) {
      where.isAnonymous = false;
    }

    const [backings, total] = await this.backingRepository.findAndCount({
      where,
      relations: ['backer'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      backings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}