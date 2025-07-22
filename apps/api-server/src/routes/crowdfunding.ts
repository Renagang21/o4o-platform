import { Router } from 'express';
import { FundingProjectController } from '../controllers/crowdfunding/FundingProjectController';
import { BackingController } from '../controllers/crowdfunding/BackingController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const projectController = new FundingProjectController();
const backingController = new BackingController();

// Public routes - Projects
router.get('/projects', (req, res) => projectController.getProjects(req, res));
router.get('/projects/:id', (req, res) => projectController.getProject(req, res));
router.get('/projects/:id/stats', (req, res) => projectController.getProjectStats(req, res));
router.get('/projects/:projectId/backers', (req, res) => backingController.getProjectBackers(req, res));

// Protected routes - Projects
router.post('/projects', authenticateToken, (req, res) => projectController.createProject(req, res));
router.patch('/projects/:id', authenticateToken, (req, res) => projectController.updateProject(req, res));
router.get('/my-projects', authenticateToken, (req, res) => projectController.getMyProjects(req, res));

// Protected routes - Backings
router.post('/backings', authenticateToken, (req, res) => backingController.createBacking(req, res));
router.post('/backings/:id/cancel', authenticateToken, (req, res) => backingController.cancelBacking(req, res));
router.get('/my-backings', authenticateToken, (req, res) => backingController.getUserBackings(req, res));

// Webhook route (should be protected with webhook signature verification in production)
router.post('/webhook/payment', (req, res) => backingController.updatePaymentStatus(req, res));

// Admin routes
router.patch(
  '/admin/projects/:id/status',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const projectService = new (await import('../services/crowdfunding/FundingProjectService')).FundingProjectService();
      await projectService.updateProjectStatus(req.params.id, req.body.status);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update project status' });
    }
  }
);

export default router;