/**
 * Customizer Routes - WordPress-style theme customizer API routes
 */

import { Router } from 'express';
import { CustomizerController } from '../controllers/themes/customizerController';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, query } from 'express-validator';

const router: Router = Router();

// Validation rules
const settingsValidation = [
  body('settings.siteIdentity.siteTitle')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Site title must be between 1 and 100 characters'),
  
  body('settings.colors.backgroundColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Invalid color format'),
  
  body('settings.additionalCss')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('CSS must be less than 10000 characters')
];

// All routes require authentication
router.use(authenticate);

// Get current settings
router.get(
  '/settings',
  [
    query('themeId').optional().isString()
  ],
  validateRequest,
  CustomizerController.getSettings
);

// Save settings
router.post(
  '/settings',
  settingsValidation,
  validateRequest,
  CustomizerController.saveSettings
);

// Publish settings
router.post(
  '/publish',
  settingsValidation,
  validateRequest,
  CustomizerController.publishSettings
);

// Draft management
router.post(
  '/draft',
  settingsValidation,
  validateRequest,
  CustomizerController.saveDraft
);

router.get(
  '/draft',
  [
    query('themeId').optional().isString()
  ],
  validateRequest,
  CustomizerController.getDraft
);

// Reset to defaults
router.post(
  '/reset',
  [
    body('themeId').optional().isString()
  ],
  validateRequest,
  CustomizerController.resetSettings
);

// Import/Export
router.get(
  '/export',
  [
    query('themeId').optional().isString()
  ],
  validateRequest,
  CustomizerController.exportSettings
);

router.post(
  '/import',
  [
    body('themeId').optional().isString(),
    body('settings').isObject(),
    body('overwrite').optional().isBoolean()
  ],
  validateRequest,
  CustomizerController.importSettings
);

export default router;