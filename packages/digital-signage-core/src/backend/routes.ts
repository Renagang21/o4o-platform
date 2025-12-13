import { Router } from 'express';
import { DataSource } from 'typeorm';

// Media controllers
import { createMediaSourceController } from './controllers/media/MediaSourceController.js';
import { createMediaListController } from './controllers/media/MediaListController.js';
import { createMediaListItemController } from './controllers/media/MediaListItemController.js';

// Display controllers
import { createDisplayController } from './controllers/display/DisplayController.js';
import { createDisplaySlotController } from './controllers/display/DisplaySlotController.js';

// Schedule controllers
import { createScheduleController } from './controllers/schedule/ScheduleController.js';

// Action controllers
import { createActionExecutionController } from './controllers/action/ActionExecutionController.js';

/**
 * Create all Digital Signage routes
 *
 * All routes are prefixed with /api/signage
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Media routes
  router.use('/media-sources', createMediaSourceController(dataSource));
  router.use('/media-lists', createMediaListController(dataSource));
  router.use('/media-list-items', createMediaListItemController(dataSource));

  // Display routes
  router.use('/displays', createDisplayController(dataSource));
  router.use('/display-slots', createDisplaySlotController(dataSource));

  // Schedule routes
  router.use('/schedules', createScheduleController(dataSource));

  // Action routes (read-only)
  router.use('/action-executions', createActionExecutionController(dataSource));

  return router;
}

export default createRoutes;
