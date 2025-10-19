"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FundingProjectController_1 = require("../controllers/crowdfunding/FundingProjectController");
const BackingController_1 = require("../controllers/crowdfunding/BackingController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const router = (0, express_1.Router)();
const projectController = new FundingProjectController_1.FundingProjectController();
const backingController = new BackingController_1.BackingController();
// Public routes - Projects
router.get('/projects', (req, res) => projectController.getProjects(req, res));
router.get('/projects/:id', (req, res) => projectController.getProject(req, res));
router.get('/projects/:id/stats', (req, res) => projectController.getProjectStats(req, res));
router.get('/projects/:projectId/backers', (req, res) => backingController.getProjectBackers(req, res));
// Protected routes - Projects
router.post('/projects', auth_middleware_1.authenticate, (req, res) => projectController.createProject(req, res));
router.patch('/projects/:id', auth_middleware_1.authenticate, (req, res) => projectController.updateProject(req, res));
router.get('/my-projects', auth_middleware_1.authenticate, (req, res) => projectController.getMyProjects(req, res));
// Protected routes - Backings
router.post('/backings', auth_middleware_1.authenticate, (req, res) => backingController.createBacking(req, res));
router.post('/backings/:id/cancel', auth_middleware_1.authenticate, (req, res) => backingController.cancelBacking(req, res));
router.get('/my-backings', auth_middleware_1.authenticate, (req, res) => backingController.getUserBackings(req, res));
// Webhook route (should be protected with webhook signature verification in production)
router.post('/webhook/payment', (req, res) => backingController.updatePaymentStatus(req, res));
// Admin routes
router.patch('/admin/projects/:id/status', auth_middleware_1.authenticate, permission_middleware_1.requireAdmin, async (req, res) => {
    try {
        const projectService = new (await Promise.resolve().then(() => __importStar(require('../services/crowdfunding/FundingProjectService')))).FundingProjectService();
        await projectService.updateProjectStatus(req.params.id, req.body.status);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update project status' });
    }
});
exports.default = router;
//# sourceMappingURL=crowdfunding.js.map