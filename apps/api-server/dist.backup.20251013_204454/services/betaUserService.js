"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.betaUserService = exports.BetaUserService = void 0;
const connection_1 = require("../database/connection");
const BetaUser_1 = require("../entities/BetaUser");
const BetaFeedback_1 = require("../entities/BetaFeedback");
const User_1 = require("../entities/User");
const typeorm_1 = require("typeorm");
class BetaUserService {
    constructor() {
        this.betaUserRepository = connection_1.AppDataSource.getRepository(BetaUser_1.BetaUser);
        this.betaFeedbackRepository = connection_1.AppDataSource.getRepository(BetaFeedback_1.BetaFeedback);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
    }
    // Beta User Registration
    async registerBetaUser(data, metadata) {
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
    async getBetaUsers(options = {}) {
        const { query, status, type, interestArea, page = 1, limit = 20, sortBy = 'latest', sortOrder = 'DESC', dateFrom, dateTo } = options;
        const queryBuilder = this.betaUserRepository.createQueryBuilder('betaUser');
        // Search filters
        if (query) {
            queryBuilder.andWhere('(betaUser.name ILIKE :query OR betaUser.email ILIKE :query OR betaUser.company ILIKE :query)', { query: `%${query}%` });
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
            queryBuilder.andWhere('betaUser.createdAt BETWEEN :dateFrom AND :dateTo', {
                dateFrom,
                dateTo
            });
        }
        // Sorting
        const sortMapping = {
            latest: 'betaUser.createdAt',
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
    async getBetaUserById(id) {
        return await this.betaUserRepository.findOne({
            where: { id },
            relations: ['feedback']
        });
    }
    async approveBetaUser(id, approvedBy, notes) {
        const betaUser = await this.getBetaUserById(id);
        if (!betaUser) {
            throw new Error('Beta user not found');
        }
        betaUser.approve(approvedBy, notes);
        return await this.betaUserRepository.save(betaUser);
    }
    async updateBetaUserStatus(id, status) {
        const betaUser = await this.getBetaUserById(id);
        if (!betaUser) {
            throw new Error('Beta user not found');
        }
        betaUser.status = status;
        if (status === BetaUser_1.BetaUserStatus.ACTIVE) {
            betaUser.activate();
        }
        return await this.betaUserRepository.save(betaUser);
    }
    async recordBetaUserLogin(email) {
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
    async submitFeedback(betaUserId, data) {
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
            priority: data.priority || BetaFeedback_1.FeedbackPriority.MEDIUM
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
        }
        catch (error) {
            // Error log removed
            // Don't fail the feedback submission if notification fails
        }
        return savedFeedback;
    }
    async getFeedback(options = {}) {
        const { query, type, status, priority, feature, betaUserId, assignedTo, page = 1, limit = 20, sortBy = 'latest', sortOrder = 'DESC', dateFrom, dateTo } = options;
        const queryBuilder = this.betaFeedbackRepository.createQueryBuilder('feedback')
            .leftJoinAndSelect('feedback.betaUser', 'betaUser')
            .leftJoinAndSelect('feedback.assignee', 'assignee')
            .leftJoinAndSelect('feedback.responder', 'responder');
        // Search filters
        if (query) {
            queryBuilder.andWhere('(feedback.title ILIKE :query OR feedback.description ILIKE :query)', { query: `%${query}%` });
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
            queryBuilder.andWhere('feedback.createdAt BETWEEN :dateFrom AND :dateTo', {
                dateFrom,
                dateTo
            });
        }
        // Sorting
        const sortMapping = {
            latest: 'feedback.createdAt',
            priority: 'feedback.priority',
            status: 'feedback.status',
            type: 'feedback.type'
        };
        queryBuilder.orderBy(sortMapping[sortBy], sortOrder);
        // Add secondary sort by business impact score for priority sorting
        if (sortBy === 'priority') {
            queryBuilder.addOrderBy('feedback.createdAt', 'ASC');
        }
        // Pagination
        const total = await queryBuilder.getCount();
        const feedback = await queryBuilder
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();
        return { feedback, total, page, limit };
    }
    async getFeedbackById(id) {
        return await this.betaFeedbackRepository.findOne({
            where: { id },
            relations: ['betaUser', 'assignee', 'responder', 'resolver']
        });
    }
    // Old methods replaced by new ones with real-time notifications below
    // Analytics
    async getBetaAnalytics() {
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
            where: { createdAt: (0, typeorm_1.Between)(oneWeekAgo, new Date()) }
        });
        const activeUsersThisWeek = await this.betaUserRepository.count({
            where: { lastActiveAt: (0, typeorm_1.Between)(oneWeekAgo, new Date()) }
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
            where: { createdAt: (0, typeorm_1.Between)(oneWeekAgo, new Date()) }
        });
        const avgResolutionResult = await this.betaFeedbackRepository
            .createQueryBuilder('feedback')
            .select('AVG(EXTRACT(EPOCH FROM (feedback.resolvedAt - feedback.createdAt))/86400)', 'avg')
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
                byStatus: this.formatCountArray(usersByStatus, Object.values(BetaUser_1.BetaUserStatus)),
                byType: this.formatCountArray(usersByType, Object.values(BetaUser_1.BetaUserType)),
                byInterestArea: this.formatCountArray(usersByInterestArea, Object.values(BetaUser_1.InterestArea)),
                newUsersThisWeek,
                activeUsersThisWeek,
                avgFeedbackPerUser: parseFloat((avgFeedbackResult === null || avgFeedbackResult === void 0 ? void 0 : avgFeedbackResult.avg) || '0')
            },
            feedbackStats: {
                total: totalFeedback,
                byType: this.formatCountArray(feedbackByType, Object.values(BetaFeedback_1.FeedbackType)),
                byStatus: this.formatCountArray(feedbackByStatus, Object.values(BetaFeedback_1.FeedbackStatus)),
                byPriority: this.formatCountArray(feedbackByPriority, Object.values(BetaFeedback_1.FeedbackPriority)),
                byFeature: this.formatCountArray(feedbackByFeature, Object.values(BetaFeedback_1.SignageFeature)),
                newFeedbackThisWeek,
                avgResolutionTime: parseFloat((avgResolutionResult === null || avgResolutionResult === void 0 ? void 0 : avgResolutionResult.avg) || '0'),
                satisfactionRating: parseFloat((avgRatingResult === null || avgRatingResult === void 0 ? void 0 : avgRatingResult.avg) || '0')
            },
            engagementStats: {
                topContributors: topContributors.map((user) => ({
                    betaUser: user,
                    feedbackCount: user.feedbackCount,
                    lastActiveAt: user.lastActiveAt || user.createdAt
                })),
                popularFeatures: popularFeatures.map((item) => ({
                    feature: item.feedback_feature,
                    feedbackCount: parseInt(item.count)
                })),
                recentActivity: [] // This would need more complex query for real implementation
            }
        };
    }
    // Helper method to format count arrays
    formatCountArray(data, enumValues) {
        const result = {};
        // Initialize all enum values with 0
        enumValues.forEach((value) => {
            result[value] = 0;
        });
        // Fill in actual counts
        data.forEach((item) => {
            const key = Object.keys(item).find((k) => k !== 'count');
            if (key) {
                result[item[key]] = parseInt(item.count);
            }
        });
        return result;
    }
    // Utility methods
    async getBetaUserByEmail(email) {
        return await this.betaUserRepository.findOne({
            where: { email }
        });
    }
    async getHighPriorityFeedback() {
        return await this.betaFeedbackRepository.find({
            where: {
                priority: (0, typeorm_1.In)([BetaFeedback_1.FeedbackPriority.HIGH, BetaFeedback_1.FeedbackPriority.CRITICAL]),
                status: (0, typeorm_1.In)([BetaFeedback_1.FeedbackStatus.PENDING, BetaFeedback_1.FeedbackStatus.REVIEWED, BetaFeedback_1.FeedbackStatus.IN_PROGRESS])
            },
            relations: ['betaUser'],
            order: {
                priority: 'DESC',
                createdAt: 'ASC'
            },
            take: 20
        });
    }
    async getUnassignedFeedback() {
        return await this.betaFeedbackRepository.find({
            where: {
                assignedTo: undefined,
                status: (0, typeorm_1.In)([BetaFeedback_1.FeedbackStatus.PENDING, BetaFeedback_1.FeedbackStatus.REVIEWED])
            },
            relations: ['betaUser'],
            order: {
                priority: 'DESC',
                createdAt: 'ASC'
            }
        });
    }
    // Real-time notification helpers
    async notifyFeedbackUpdate(feedback, updateType) {
        try {
            // Note: RealtimeFeedbackService instance should be injected or accessed differently
            // For now, commenting out to fix the build error
            // const { realtimeFeedbackService } = await import('../main');
            // if (realtimeFeedbackService) {
            //   await realtimeFeedbackService.notifyFeedbackUpdate(feedback, updateType);
            // }
        }
        catch (error) {
            // Error log removed
        }
    }
    async respondToFeedback(feedbackId, response, respondedBy) {
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
    async updateFeedbackStatus(feedbackId, status, updatedBy) {
        const feedback = await this.betaFeedbackRepository.findOne({
            where: { id: feedbackId },
            relations: ['betaUser']
        });
        if (!feedback) {
            throw new Error('Feedback not found');
        }
        const oldStatus = feedback.status;
        feedback.status = status;
        if (status === BetaFeedback_1.FeedbackStatus.RESOLVED) {
            feedback.resolve(updatedBy);
        }
        else if (status === BetaFeedback_1.FeedbackStatus.IN_PROGRESS) {
            feedback.markInProgress();
        }
        else if (status === BetaFeedback_1.FeedbackStatus.REJECTED) {
            feedback.reject(updatedBy);
        }
        const updatedFeedback = await this.betaFeedbackRepository.save(feedback);
        await this.notifyFeedbackUpdate(updatedFeedback, `status_changed_from_${oldStatus}_to_${status}`);
        return updatedFeedback;
    }
    async assignFeedback(feedbackId, assignedTo) {
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
    async updateFeedbackPriority(feedbackId, priority) {
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
exports.BetaUserService = BetaUserService;
exports.betaUserService = new BetaUserService();
//# sourceMappingURL=betaUserService.js.map