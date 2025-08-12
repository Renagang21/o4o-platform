"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// In-memory storage for app states (replace with database in production)
const appStates = new Map([
    ['ecommerce', true],
    ['affiliate', false],
    ['crowdfunding', true],
    ['forum', true],
    ['signage', false],
    ['cpt-acf', true],
    ['vendor', false],
    ['security', true]
]);
// Get all app states
router.get('/states', auth_1.authenticateToken, auth_1.requireAdmin, (req, res) => {
    try {
        const states = Object.fromEntries(appStates);
        res.json({
            success: true,
            data: states
        });
    }
    catch (error) {
        console.error('Error fetching app states:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch app states'
        });
    }
});
// Get single app state
router.get('/states/:appId', auth_1.authenticateToken, auth_1.requireAdmin, (req, res) => {
    try {
        const { appId } = req.params;
        const isActive = appStates.get(appId);
        if (isActive === undefined) {
            return res.status(404).json({
                success: false,
                message: 'App not found'
            });
        }
        res.json({
            success: true,
            data: {
                appId,
                isActive
            }
        });
    }
    catch (error) {
        console.error('Error fetching app state:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch app state'
        });
    }
});
// Update app state
router.put('/states/:appId', auth_1.authenticateToken, auth_1.requireAdmin, (req, res) => {
    try {
        const { appId } = req.params;
        const { isActive } = req.body;
        if (!appStates.has(appId)) {
            return res.status(404).json({
                success: false,
                message: 'App not found'
            });
        }
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Invalid isActive value'
            });
        }
        // Check dependencies
        const dependencies = {
            'crowdfunding': ['ecommerce'],
            'vendor': ['ecommerce']
        };
        // When activating, check if dependencies are active
        if (isActive && dependencies[appId]) {
            const inactiveDeps = dependencies[appId].filter(dep => !appStates.get(dep));
            if (inactiveDeps.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot activate. Required apps are inactive: ${inactiveDeps.join(', ')}`
                });
            }
        }
        // When deactivating, check if other apps depend on this
        if (!isActive) {
            const dependentApps = Object.entries(dependencies)
                .filter(([app, deps]) => deps.includes(appId) && appStates.get(app))
                .map(([app]) => app);
            if (dependentApps.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot deactivate. Other apps depend on this: ${dependentApps.join(', ')}`
                });
            }
        }
        // Update state
        appStates.set(appId, isActive);
        res.json({
            success: true,
            data: {
                appId,
                isActive
            }
        });
    }
    catch (error) {
        console.error('Error updating app state:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update app state'
        });
    }
});
// Batch update app states
router.post('/states/batch', auth_1.authenticateToken, auth_1.requireAdmin, (req, res) => {
    try {
        const { updates } = req.body;
        if (!Array.isArray(updates)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid updates format'
            });
        }
        const results = [];
        for (const update of updates) {
            const { appId, isActive } = update;
            if (appStates.has(appId) && typeof isActive === 'boolean') {
                appStates.set(appId, isActive);
                results.push({ appId, isActive, success: true });
            }
            else {
                results.push({ appId, success: false, reason: 'Invalid app or state' });
            }
        }
        res.json({
            success: true,
            data: results
        });
    }
    catch (error) {
        console.error('Error batch updating app states:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to batch update app states'
        });
    }
});
exports.default = router;
//# sourceMappingURL=apps.routes.js.map