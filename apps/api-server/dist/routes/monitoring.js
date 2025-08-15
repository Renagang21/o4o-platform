"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monitoringController_1 = require("../controllers/monitoringController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All monitoring routes require authentication and admin role
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin);
// System metrics
router.get('/metrics', monitoringController_1.MonitoringController.getMetrics);
router.get('/metrics/history', monitoringController_1.MonitoringController.getMetricsHistory);
// Monitoring summary
router.get('/summary', monitoringController_1.MonitoringController.getSummary);
// Backup management
router.post('/backup/trigger', monitoringController_1.MonitoringController.triggerBackup);
router.get('/backup/history', monitoringController_1.MonitoringController.getBackupHistory);
// Error alerts
router.get('/errors', monitoringController_1.MonitoringController.getErrorAlerts);
// Security audit
router.get('/security/events', monitoringController_1.MonitoringController.getSecurityEvents);
router.get('/security/rules', monitoringController_1.MonitoringController.getSecurityRules);
router.put('/security/rules/:ruleId', monitoringController_1.MonitoringController.updateSecurityRule);
exports.default = router;
//# sourceMappingURL=monitoring.js.map