"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackingService = void 0;
const connection_1 = require("../../database/connection");
const FundingBacking_1 = require("../../entities/crowdfunding/FundingBacking");
const FundingProject_1 = require("../../entities/crowdfunding/FundingProject");
const FundingReward_1 = require("../../entities/crowdfunding/FundingReward");
const BackerReward_1 = require("../../entities/crowdfunding/BackerReward");
const User_1 = require("../../entities/User");
const FundingProjectService_1 = require("./FundingProjectService");
class BackingService {
    constructor() {
        this.backingRepository = connection_1.AppDataSource.getRepository(FundingBacking_1.FundingBacking);
        this.projectRepository = connection_1.AppDataSource.getRepository(FundingProject_1.FundingProject);
        this.rewardRepository = connection_1.AppDataSource.getRepository(FundingReward_1.FundingReward);
        this.backerRewardRepository = connection_1.AppDataSource.getRepository(BackerReward_1.BackerReward);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        this.projectService = new FundingProjectService_1.FundingProjectService();
    }
    async createBacking(data, backerId) {
        // Start transaction
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Verify project exists and is ongoing
            const project = await queryRunner.manager.findOne(FundingProject_1.FundingProject, {
                where: { id: data.projectId, status: 'ongoing' },
            });
            if (!project) {
                throw new Error('Project not found or not available for backing');
            }
            // Create backing
            const backing = queryRunner.manager.create(FundingBacking_1.FundingBacking, {
                projectId: data.projectId,
                backerId,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                isAnonymous: data.isAnonymous || false,
                displayName: data.displayName,
                backerMessage: data.backerMessage,
                isMessagePublic: data.isMessagePublic || false,
                status: 'active',
                paymentStatus: 'pending',
            });
            const savedBacking = await queryRunner.manager.save(backing);
            // Process rewards if any
            if (data.rewards && data.rewards.length > 0) {
                for (const rewardData of data.rewards) {
                    const reward = await queryRunner.manager.findOne(FundingReward_1.FundingReward, {
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
                    const backerReward = queryRunner.manager.create(BackerReward_1.BackerReward, {
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
            await queryRunner.manager.increment(FundingProject_1.FundingProject, { id: data.projectId }, 'currentAmount', data.amount);
            await queryRunner.manager.increment(FundingProject_1.FundingProject, { id: data.projectId }, 'backerCount', 1);
            await queryRunner.commitTransaction();
            return savedBacking;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async updatePaymentStatus(backingId, paymentId, status) {
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
    async cancelBacking(backingId, userId, reason) {
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
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Update backing status
            backing.status = 'cancelled';
            backing.cancelledAt = new Date();
            backing.cancellationReason = reason;
            await queryRunner.manager.save(backing);
            // Restore reward quantities
            for (const backerReward of backing.rewards) {
                const reward = await queryRunner.manager.findOne(FundingReward_1.FundingReward, {
                    where: { id: backerReward.rewardId },
                });
                if (reward && reward.remainingQuantity !== null) {
                    reward.remainingQuantity += backerReward.quantity;
                    await queryRunner.manager.save(reward);
                }
            }
            // Update project stats
            await queryRunner.manager.decrement(FundingProject_1.FundingProject, { id: backing.projectId }, 'currentAmount', backing.amount);
            await queryRunner.manager.decrement(FundingProject_1.FundingProject, { id: backing.projectId }, 'backerCount', 1);
            await queryRunner.commitTransaction();
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async getUserBackings(userId, status) {
        const where = { backerId: userId };
        if (status) {
            where.status = status;
        }
        return await this.backingRepository.find({
            where,
            relations: ['project', 'rewards', 'rewards.reward'],
            order: { createdAt: 'DESC' },
        });
    }
    async getProjectBackings(projectId, options) {
        const { showAnonymous = false, page = 1, limit = 20 } = options || {};
        const where = {
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
exports.BackingService = BackingService;
//# sourceMappingURL=BackingService.js.map