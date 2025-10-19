"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundingProjectController = void 0;
const FundingProjectService_1 = require("../../services/crowdfunding/FundingProjectService");
class FundingProjectController {
    constructor() {
        this.projectService = new FundingProjectService_1.FundingProjectService();
    }
    // Get all projects
    async getProjects(req, res) {
        try {
            const filters = {
                search: req.query.search,
                category: req.query.category,
                status: req.query.status,
                minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
                maxAmount: req.query.maxAmount ? Number(req.query.maxAmount) : undefined,
                creatorId: req.query.creatorId,
                tags: req.query.tags ? req.query.tags.split(',') : undefined,
                sortBy: req.query.sortBy || 'latest',
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 12,
            };
            // Special filter for staff picks
            if (req.query.isStaffPick === 'true') {
                filters.isStaffPick = true;
            }
            const result = await this.projectService.getProjects(filters);
            res.json(result);
        }
        catch (error) {
            // Error log removed
            res.status(500).json({ error: 'Failed to fetch projects' });
        }
    }
    // Get single project
    async getProject(req, res) {
        try {
            const project = await this.projectService.getProject(req.params.id);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            res.json(project);
        }
        catch (error) {
            // Error log removed
            res.status(500).json({ error: 'Failed to fetch project' });
        }
    }
    // Create project
    async createProject(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const project = await this.projectService.createProject(req.body, userId);
            res.status(201).json(project);
        }
        catch (error) {
            // Error log removed
            res.status(500).json({ error: 'Failed to create project' });
        }
    }
    // Update project
    async updateProject(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const project = await this.projectService.updateProject(req.params.id, req.body, userId);
            res.json(project);
        }
        catch (error) {
            // Error log removed
            res.status(500).json({ error: 'Failed to update project' });
        }
    }
    // Get user's projects
    async getMyProjects(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const filters = {
                creatorId: userId,
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 12,
            };
            const result = await this.projectService.getProjects(filters);
            res.json(result);
        }
        catch (error) {
            // Error log removed
            res.status(500).json({ error: 'Failed to fetch user projects' });
        }
    }
    // Get project stats
    async getProjectStats(req, res) {
        try {
            const project = await this.projectService.getProject(req.params.id);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            // Calculate additional stats
            const daysLeft = Math.max(0, Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
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
        }
        catch (error) {
            // Error log removed
            res.status(500).json({ error: 'Failed to fetch project stats' });
        }
    }
}
exports.FundingProjectController = FundingProjectController;
//# sourceMappingURL=FundingProjectController.js.map