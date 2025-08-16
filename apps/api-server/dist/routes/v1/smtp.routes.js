"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SmtpController_1 = require("../../controllers/SmtpController");
const auth_1 = require("../../middleware/auth");
const authorize_1 = require("../../middleware/authorize");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Get SMTP settings
router.get('/settings', (0, authorize_1.authorize)(['admin', 'staff']), SmtpController_1.smtpController.getSettings);
// Update SMTP settings (admin only)
router.put('/settings', (0, authorize_1.authorize)(['admin']), SmtpController_1.smtpController.updateSettings);
// Test SMTP connection
router.post('/test', (0, authorize_1.authorize)(['admin']), SmtpController_1.smtpController.testConnection);
// Get email logs
router.get('/logs', (0, authorize_1.authorize)(['admin', 'staff']), SmtpController_1.smtpController.getEmailLogs);
// Get email statistics
router.get('/stats', (0, authorize_1.authorize)(['admin', 'staff']), SmtpController_1.smtpController.getEmailStats);
// Resend failed email
router.post('/logs/:id/resend', (0, authorize_1.authorize)(['admin']), SmtpController_1.smtpController.resendEmail);
exports.default = router;
//# sourceMappingURL=smtp.routes.js.map