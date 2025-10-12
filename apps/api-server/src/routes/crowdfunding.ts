import { Router } from 'express';
import { FundingProjectController } from '../controllers/crowdfunding/FundingProjectController';
import { BackingController } from '../controllers/crowdfunding/BackingController';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/permission.middleware';

const router: Router = Router();
const projectController = new FundingProjectController();
const backingController = new BackingController();

// Public routes - Projects
router.get('/projects', (req, res) => projectController.getProjects(req as any, res));
router.get('/projects/:id', (req, res) => projectController.getProject(req as any, res));
router.get('/projects/:id/stats', (req, res) => projectController.getProjectStats(req as any, res));
router.get('/projects/:projectId/backers', (req, res) => backingController.getProjectBackers(req as any, res));

// Protected routes - Projects
router.post('/projects', authenticate, (req, res) => projectController.createProject(req as any, res));
router.patch('/projects/:id', authenticate, (req, res) => projectController.updateProject(req as any, res));
router.get('/my-projects', authenticate, (req, res) => projectController.getMyProjects(req as any, res));

// Protected routes - Backings
router.post('/backings', authenticate, (req, res) => backingController.createBacking(req as any, res));
router.post('/backings/:id/cancel', authenticate, (req, res) => backingController.cancelBacking(req as any, res));
router.get('/my-backings', authenticate, (req, res) => backingController.getUserBackings(req as any, res));

// Webhook route (should be protected with webhook signature verification in production)
router.post('/webhook/payment', (req, res) => backingController.updatePaymentStatus(req as any, res));

// Admin routes
router.patch(
  '/admin/projects/:id/status',
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const projectService = new (await import('../services/crowdfunding/FundingProjectService')).FundingProjectService();
      await projectService.updateProjectStatus(req.params.id, req.body.status);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update project status' });
    }
  }
);

export default router;