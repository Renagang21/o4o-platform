/**
 * Membership-Yaksa Export Routes
 *
 * /api/membership/export
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { ExportController } from '../controllers/ExportController.js';
import { ExportService } from '../services/ExportService.js';

export function createExportRoutes(dataSource: DataSource): Router {
  const router = Router();
  const exportService = new ExportService(dataSource);
  const exportController = new ExportController(exportService);

  /**
   * GET /api/membership/export/members.xlsx
   */
  router.get('/members.xlsx', (req, res) => exportController.exportMembers(req, res));

  /**
   * GET /api/membership/export/verifications.xlsx
   */
  router.get('/verifications.xlsx', (req, res) =>
    exportController.exportVerifications(req, res)
  );

  /**
   * GET /api/membership/export/categories.xlsx
   */
  router.get('/categories.xlsx', (req, res) =>
    exportController.exportCategories(req, res)
  );

  return router;
}
