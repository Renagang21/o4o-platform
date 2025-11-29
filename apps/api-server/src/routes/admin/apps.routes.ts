import { Router, Request, Response, NextFunction } from 'express';
import { AppManager } from '../../services/AppManager.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import { APPS_CATALOG } from '../../app-manifests/appsCatalog.js';

const router: Router = Router();

// All admin app routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Create singleton instance
const appManager = new AppManager();

/**
 * GET /api/admin/apps/market
 * Get app catalog (available apps that can be installed)
 */
router.get('/market', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ apps: APPS_CATALOG });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/apps
 * List all installed apps
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apps = await appManager.listInstalled();
    res.json({ apps });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/apps/:appId
 * Get specific app status
 */
router.get('/:appId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.params;
    const app = await appManager.getAppStatus(appId);

    if (!app) {
      return res.status(404).json({ error: `App ${appId} not found` });
    }

    res.json({ app });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/apps/install
 * Install an app
 *
 * Body: { appId: string }
 */
router.post('/install', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    await appManager.install(appId);

    res.json({
      ok: true,
      message: `App ${appId} installed successfully`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/apps/activate
 * Activate an app
 *
 * Body: { appId: string }
 */
router.post('/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    await appManager.activate(appId);

    res.json({
      ok: true,
      message: `App ${appId} activated successfully`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/apps/deactivate
 * Deactivate an app
 *
 * Body: { appId: string }
 */
router.post('/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    await appManager.deactivate(appId);

    res.json({
      ok: true,
      message: `App ${appId} deactivated successfully`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/apps/uninstall
 * Uninstall an app
 *
 * Body: { appId: string }
 */
router.post('/uninstall', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appId } = req.body;

    if (!appId) {
      return res.status(400).json({ error: 'appId is required' });
    }

    await appManager.uninstall(appId);

    res.json({
      ok: true,
      message: `App ${appId} uninstalled successfully`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
