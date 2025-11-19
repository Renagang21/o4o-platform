import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { smtpController } from '../../controllers/SmtpController.js';
import { requireAuth, requireRole, requireAdmin } from '../../middleware/auth.middleware.js';

const router: RouterType = Router();

// All routes require authentication
router.use(requireAuth);

// Get SMTP settings
router.get('/settings',
  requireRole(['admin', 'staff']),
  smtpController.getSettings
);

// Update SMTP settings (admin only)
router.put('/settings',
  requireAdmin,
  smtpController.updateSettings
);

// Test SMTP connection
router.post('/test',
  requireAdmin,
  smtpController.testConnection
);

// Get email logs
router.get('/logs',
  requireRole(['admin', 'staff']),
  smtpController.getEmailLogs
);

// Get email statistics
router.get('/stats',
  requireRole(['admin', 'staff']),
  smtpController.getEmailStats
);

// Resend failed email
router.post('/logs/:id/resend',
  requireAdmin,
  smtpController.resendEmail
);

export default router;