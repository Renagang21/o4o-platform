"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundingProjectService = void 0;
const typeorm_1 = require("typeorm");
const connection_1 = require("../../database/connection");
const FundingProject_1 = require("../../entities/crowdfunding/FundingProject");
const FundingReward_1 = require("../../entities/crowdfunding/FundingReward");
const User_1 = require("../../entities/User");
const string_1 = require("../../utils/string");
class FundingProjectService {
    constructor() {
        this.projectRepository = connection_1.AppDataSource.getRepository(FundingProject_1.FundingProject);
        this.rewardRepository = connection_1.AppDataSource.getRepository(FundingReward_1.FundingReward);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
    }
    async createProject(data, creatorId) {
        const creator = await this.userRepository.findOne({ where: { id: creatorId } });
        if (!creator) {
            throw new Error('Creator not found');
        }
        // Filter out file fields for entity creation
        const { mainImage, images, ...entityData } = data;
        // Create entity data without File types
        const projectData = {
            ...entityData,
            slug: (0, string_1.generateSlug)(data.title),
            creatorId,
            creatorName: creator.name || creator.email,
            status: 'draft',
            currentAmount: 0,
            backerCount: 0,
            viewCount: 0,
            likeCount: 0,
            shareCount: 0,
            updateCount: 0,
            // Handle file fields as strings for database storage
            mainImage: typeof mainImage === 'string' ? mainImage : undefined,
            images: Array.isArray(images) ? images.filter((img) => typeof img === 'string') : undefined,
        };
        const project = this.projectRepository.create(projectData);
        const savedProject = await this.projectRepository.save(project);
        return Array.isArray(savedProject) ? savedProject[0] : savedProject;
    }
    async updateProject(projectId, data, userId) {
        const project = await this.projectRepository.findOne({
            where: { id: projectId, creatorId: userId }
        });
        if (!project) {
            throw new Error('Project not found or unauthorized');
        }
        Object.assign(project, data);
        return await this.projectRepository.save(project);
    }
    async getProject(projectId) {
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
    async getProjects(filters) {
        const { search, category, status, minAmount, maxAmount, creatorId, tags, sortBy = 'latest', page = 1, limit = 12, } = filters;
        const where = {};
        if (search) {
            where.title = (0, typeorm_1.Like)(`%${search}%`);
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
            where.targetAmount = (0, typeorm_1.Between)(minAmount || 0, maxAmount || Number.MAX_SAFE_INTEGER);
        }
        // Sort options
        let order = {};
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
    async updateProjectStatus(projectId, status) {
        await this.projectRepository.update(projectId, { status });
    }
    async updateProjectStats(projectId, stats) {
        await this.projectRepository.update(projectId, stats);
    }
    async checkAndUpdateExpiredProjects() {
        const now = new Date();
        // Find ongoing projects that have ended
        const expiredProjects = await this.projectRepository.find({
            where: {
                status: 'ongoing',
                endDate: (0, typeorm_1.Between)(new Date(0), now),
            },
        });
        for (const project of expiredProjects) {
            const newStatus = project.currentAmount >= (project.minimumAmount || project.targetAmount)
                ? 'successful'
                : 'failed';
            await this.updateProjectStatus(project.id, newStatus);
        }
    }
}
exports.FundingProjectService = FundingProjectService;
//# sourceMappingURL=FundingProjectService.js.map