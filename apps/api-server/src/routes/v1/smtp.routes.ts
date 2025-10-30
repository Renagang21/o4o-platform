import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { smtpController } from '../../controllers/SmtpController.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);
// Note: authorize middleware temporarily disabled

// Get SMTP settings
router.get('/settings', 
  authorize(['admin', 'staff']),
  smtpController.getSettings
);

// Update SMTP settings (admin only)
router.put('/settings',
  authorize(['admin']),
  smtpController.updateSettings
);

// Test SMTP connection
router.post('/test',
  authorize(['admin']),
  smtpController.testConnection
);

// Get email logs
router.get('/logs',
  authorize(['admin', 'staff']),
  smtpController.getEmailLogs
);

// Get email statistics
router.get('/stats',
  authorize(['admin', 'staff']),
  smtpController.getEmailStats
);

// Resend failed email
router.post('/logs/:id/resend',
  authorize(['admin']),
  smtpController.resendEmail
);

export default router;