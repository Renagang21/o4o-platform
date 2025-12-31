import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { AppDataSource } from '../database/connection.js';
import { DeploymentInstance, DeploymentStatus } from '../modules/deployment/deployment.entity.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import logger from '../utils/logger.js';

const router: ExpressRouter = Router();

// Middleware: Check if user has admin role
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userRoles = user.roles || [];
  const hasAdminRole = userRoles.some((role: any) =>
    ['admin', 'superadmin', 'manager'].includes(typeof role === 'string' ? role : role.name)
  );

  if (!hasAdminRole) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  next();
};

// Helper function to trigger deployment
async function triggerDeployment(instanceId: string) {
  const deploymentRepo = AppDataSource.getRepository(DeploymentInstance);
  const instance = await deploymentRepo.findOne({ where: { id: instanceId } });

  if (!instance) {
    return;
  }

  try {
    // Update status to provisioning
    instance.status = DeploymentStatus.PROVISIONING;
    instance.logs += `\n[${new Date().toISOString()}] Starting server provisioning...`;
    await deploymentRepo.save(instance);

    // Simulate provisioning
    await new Promise(resolve => setTimeout(resolve, 2000));

    instance.status = DeploymentStatus.INSTALLING;
    instance.logs += `\n[${new Date().toISOString()}] Server provisioned. Installing dependencies...`;
    await deploymentRepo.save(instance);

    await new Promise(resolve => setTimeout(resolve, 3000));

    instance.status = DeploymentStatus.BUILDING;
    instance.logs += `\n[${new Date().toISOString()}] Dependencies installed. Building applications...`;
    await deploymentRepo.save(instance);

    await new Promise(resolve => setTimeout(resolve, 3000));

    instance.status = DeploymentStatus.CONFIGURING;
    instance.logs += `\n[${new Date().toISOString()}] Build complete. Configuring services...`;
    await deploymentRepo.save(instance);

    await new Promise(resolve => setTimeout(resolve, 2000));

    instance.status = DeploymentStatus.READY;
    instance.logs += `\n[${new Date().toISOString()}] Deployment complete! Instance is ready.`;

    // Update instance with mock data
    instance.ipAddress = `13.125.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    instance.instanceId = `li-${Date.now()}`;
    await deploymentRepo.save(instance);

    logger.info(`Deployment completed for instance ${instanceId}`);
  } catch (error) {
    logger.error(`Deployment failed for instance ${instanceId}:`, error);

    instance.status = DeploymentStatus.FAILED;
    instance.logs += `\n[${new Date().toISOString()}] Deployment failed: ${(error as Error).message}`;
    await deploymentRepo.save(instance);
  }
}

// POST /api/deployment/create - Create new deployment instance
router.post('/create', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { domain, apps, region, instanceType, description } = req.body;

    if (!domain || !apps || !Array.isArray(apps)) {
      return res.status(400).json({
        success: false,
        error: 'domain and apps[] are required'
      });
    }

    const deploymentRepo = AppDataSource.getRepository(DeploymentInstance);

    // Check if domain already exists
    const existing = await deploymentRepo.findOne({ where: { domain } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Instance with domain ${domain} already exists`
      });
    }

    // Create new instance
    const instance = deploymentRepo.create({
      domain,
      apps,
      region: region || 'ap-northeast-2',
      instanceType: instanceType || 'nano_3_0',
      description,
      status: DeploymentStatus.PENDING,
      logs: `[${new Date().toISOString()}] Instance creation requested\n`,
    });

    const saved = await deploymentRepo.save(instance);

    // Trigger deployment asynchronously
    triggerDeployment(saved.id).catch(error => {
      logger.error(`Async deployment failed for ${saved.id}:`, error);
    });

    res.json({
      success: true,
      data: saved
    });
  } catch (error) {
    logger.error('Error creating deployment instance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create deployment instance',
      details: (error as Error).message
    });
  }
});

// GET /api/deployment/status/:id - Get deployment status
router.get('/status/:id', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deploymentRepo = AppDataSource.getRepository(DeploymentInstance);

    const instance = await deploymentRepo.findOne({ where: { id } });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }

    res.json({
      success: true,
      data: instance
    });
  } catch (error) {
    logger.error('Error getting deployment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deployment status',
      details: (error as Error).message
    });
  }
});

// GET /api/deployment/list - List all deployment instances
router.get('/list', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const deploymentRepo = AppDataSource.getRepository(DeploymentInstance);

    const instances = await deploymentRepo.find({
      order: { createdAt: 'DESC' }
    });

    res.json({
      success: true,
      data: instances
    });
  } catch (error) {
    logger.error('Error listing deployment instances:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list deployment instances',
      details: (error as Error).message
    });
  }
});

// POST /api/deployment/install-apps - Install apps on existing instance
router.post('/install-apps', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { instanceId, apps } = req.body;

    if (!instanceId || !apps || !Array.isArray(apps)) {
      return res.status(400).json({
        success: false,
        error: 'instanceId and apps[] are required'
      });
    }

    const deploymentRepo = AppDataSource.getRepository(DeploymentInstance);

    const instance = await deploymentRepo.findOne({ where: { id: instanceId } });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }

    // Add new apps to existing apps (deduplicate)
    const updatedApps = [...new Set([...instance.apps, ...apps])];

    instance.apps = updatedApps;
    instance.logs += `\n[${new Date().toISOString()}] Installing apps: ${apps.join(', ')}`;

    const updated = await deploymentRepo.save(instance);

    // TODO: Phase E - Trigger actual app installation
    // For now, just log it
    logger.info(`Apps installation requested for instance ${instanceId}: ${apps.join(', ')}`);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('Error installing apps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to install apps',
      details: (error as Error).message
    });
  }
});

// DELETE /api/deployment/:id - Delete deployment instance
router.delete('/:id', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deploymentRepo = AppDataSource.getRepository(DeploymentInstance);

    const instance = await deploymentRepo.findOne({ where: { id } });

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }

    // TODO: Implement actual instance deletion (Cloud Run, etc.)
    await deploymentRepo.remove(instance);

    res.json({
      success: true,
      message: 'Instance deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting deployment instance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete deployment instance',
      details: (error as Error).message
    });
  }
});

export default router;
