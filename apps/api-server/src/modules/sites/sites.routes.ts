import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Site, SiteStatus } from './site.entity.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import logger from '../../utils/logger.js';

const router: ExpressRouter = Router();

// Scaffolding function - TODO: Implement scaffolding service
// Currently disabled due to TypeScript rootDir limitations
// Will be implemented as a separate service or moved into api-server
async function getScaffoldingService() {
  // Scaffolding service not yet available
  logger.warn('Scaffolding service not yet implemented');
  return null;
}

// Middleware: Check if user has admin role
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;

  if (!user) {
    logger.warn('[Sites API] No user found in request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userRoles = user.roles || [];
  logger.info('[Sites API] User roles:', { userId: user.id, roles: userRoles });

  const hasAdminRole = userRoles.some((role: any) => {
    let roleName = typeof role === 'string' ? role : role.name;
    // Remove curly braces from PostgreSQL array format
    roleName = roleName?.replace(/[{}]/g, '');
    logger.info('[Sites API] Checking role:', { roleName, originalRole: role, type: typeof role });
    return ['admin', 'super_admin', 'manager'].includes(roleName);
  });

  if (!hasAdminRole) {
    logger.warn('[Sites API] Access denied - no admin role found', { userId: user.id, roles: userRoles });
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  logger.info('[Sites API] Access granted', { userId: user.id });
  next();
};

// GET /api/sites - List all sites
router.get('/', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const siteRepo = AppDataSource.getRepository(Site);

    const sites = await siteRepo.find({
      order: { createdAt: 'DESC' },
    });

    res.json({
      success: true,
      data: sites,
    });
  } catch (error) {
    logger.error('Error listing sites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list sites',
      details: (error as Error).message,
    });
  }
});

// POST /api/sites - Create new site
router.post('/', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { domain, name, description, template, apps, variables, theme, deployNow } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'domain is required',
      });
    }

    const siteRepo = AppDataSource.getRepository(Site);

    // Check if domain already exists
    const existing = await siteRepo.findOne({ where: { domain } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Site with domain ${domain} already exists`,
      });
    }

    // Create new site
    const site = siteRepo.create({
      domain,
      name: name || domain,
      description,
      template: template || 'default',
      apps: apps || [],
      status: SiteStatus.PENDING,
      config: {
        variables: variables || {},
        theme: theme || null,
      },
      logs: `[${new Date().toISOString()}] Site creation requested\n`,
    });

    const saved = await siteRepo.save(site);

    // If deployNow is true, trigger scaffolding
    if (deployNow) {
      // Trigger scaffolding asynchronously
      triggerScaffolding(saved.id).catch(error => {
        logger.error(`Async scaffolding failed for ${saved.id}:`, error);
      });
    }

    res.json({
      success: true,
      data: saved,
    });
  } catch (error) {
    logger.error('Error creating site:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create site',
      details: (error as Error).message,
    });
  }
});

// GET /api/sites/:id - Get site details
router.get('/:id', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const siteRepo = AppDataSource.getRepository(Site);

    const site = await siteRepo.findOne({ where: { id } });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found',
      });
    }

    res.json({
      success: true,
      data: site,
    });
  } catch (error) {
    logger.error('Error getting site:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get site',
      details: (error as Error).message,
    });
  }
});

// POST /api/sites/:id/scaffold - Trigger scaffolding
router.post('/:id/scaffold', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { additionalApps, autoDeploy } = req.body;

    const siteRepo = AppDataSource.getRepository(Site);

    const site = await siteRepo.findOne({ where: { id } });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found',
      });
    }

    // Allow scaffolding for PENDING and FAILED statuses (for retry)
    const isRetry = site.status === SiteStatus.FAILED;
    if (site.status !== SiteStatus.PENDING && site.status !== SiteStatus.FAILED) {
      return res.status(400).json({
        success: false,
        error: `Site cannot be scaffolded in status: ${site.status}. Only PENDING and FAILED sites can be scaffolded.`,
      });
    }

    // Update status
    site.status = SiteStatus.SCAFFOLDING;
    const logMessage = isRetry
      ? `\n[${new Date().toISOString()}] Scaffolding retry initiated`
      : `\n[${new Date().toISOString()}] Scaffolding started`;
    site.logs += logMessage;

    if (additionalApps && Array.isArray(additionalApps)) {
      site.apps = [...new Set([...site.apps, ...additionalApps])];
    }

    await siteRepo.save(site);

    // Trigger scaffolding asynchronously
    triggerScaffolding(id, autoDeploy).catch(error => {
      logger.error(`Scaffolding failed for ${id}:`, error);
    });

    res.json({
      success: true,
      data: site,
      message: 'Scaffolding started',
    });
  } catch (error) {
    logger.error('Error triggering scaffolding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger scaffolding',
      details: (error as Error).message,
    });
  }
});

// POST /api/sites/:id/apps - Install additional apps
router.post('/:id/apps', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { apps } = req.body;

    if (!apps || !Array.isArray(apps)) {
      return res.status(400).json({
        success: false,
        error: 'apps array is required',
      });
    }

    const siteRepo = AppDataSource.getRepository(Site);

    const site = await siteRepo.findOne({ where: { id } });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found',
      });
    }

    // Add new apps (deduplicate)
    const updatedApps = [...new Set([...site.apps, ...apps])];
    site.apps = updatedApps;
    site.logs += `\n[${new Date().toISOString()}] Installing apps: ${apps.join(', ')}`;

    const updated = await siteRepo.save(site);

    // TODO: Phase D - Trigger actual app installation

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error installing apps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to install apps',
      details: (error as Error).message,
    });
  }
});

// DELETE /api/sites/:id - Delete site
router.delete('/:id', authenticateToken as any, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const siteRepo = AppDataSource.getRepository(Site);

    const site = await siteRepo.findOne({ where: { id } });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found',
      });
    }

    // TODO: Cleanup associated resources (deployment, CMS pages, etc.)
    await siteRepo.remove(site);

    res.json({
      success: true,
      message: 'Site deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting site:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete site',
      details: (error as Error).message,
    });
  }
});

// Helper function to trigger scaffolding asynchronously
async function triggerScaffolding(siteId: string, autoDeploy: boolean = false) {
  const siteRepo = AppDataSource.getRepository(Site);
  const site = await siteRepo.findOne({ where: { id: siteId } });

  if (!site) {
    return;
  }

  try {
    site.logs += `\n[${new Date().toISOString()}] Loading template: ${site.template}`;
    await siteRepo.save(site);

    // Get scaffolding service
    const scaffoldSite = await getScaffoldingService();

    if (!scaffoldSite) {
      throw new Error('Scaffolding service is not available');
    }

    // Execute scaffolding using the scaffoldSite function
    const result = await scaffoldSite({
      siteId: site.id,
      domain: site.domain,
      template: site.template,
      apps: site.apps,
      variables: site.config?.variables || {},
      theme: site.config?.theme || undefined,
    });

    // Update site with scaffolding results
    site.logs += `\n${result.logs.join('\n')}`;

    if (result.success) {
      site.status = SiteStatus.READY;
      site.config = {
        ...site.config,
        ...(result.pagesCreated && { pagesCreated: result.pagesCreated }),
        ...(result.appsInstalled && { appsInstalled: result.appsInstalled }),
      } as any;
      logger.info(`Scaffolding completed for site ${siteId}`);
    } else {
      site.status = SiteStatus.FAILED;
      logger.error(`Scaffolding failed for site ${siteId}:`, result.errors);
    }

    await siteRepo.save(site);

    // TODO: Phase H - Auto deploy if autoDeploy is true
    if (autoDeploy && result.success) {
      // Trigger deployment
      logger.info(`Auto-deployment triggered for site ${siteId}`);
    }

  } catch (error) {
    logger.error(`Scaffolding failed for site ${siteId}:`, error);

    site.status = SiteStatus.FAILED;
    site.logs += `\n[${new Date().toISOString()}] Scaffolding failed: ${(error as Error).message}`;
    await siteRepo.save(site);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default router;
