import { Router } from 'express';
import { smtpController } from '../../controllers/SmtpController';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All routes require authentication
router.use(authenticate);

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