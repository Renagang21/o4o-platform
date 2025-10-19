"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuAnalyticsController = void 0;
const connection_1 = require("../../database/connection");
const Menu_1 = require("../../entities/Menu");
const MenuItem_1 = require("../../entities/MenuItem");
const logger_1 = __importDefault(require("../../utils/logger"));
class MenuAnalyticsController {
    constructor() {
        // In production, store in analytics database
        this.clickEvents = [];
        this.performanceMetrics = new Map();
        this.menuRepository = connection_1.AppDataSource.getRepository(Menu_1.Menu);
        this.menuItemRepository = connection_1.AppDataSource.getRepository(MenuItem_1.MenuItem);
    }
    /**
     * GET /api/v1/menus/:id/analytics
     * Get menu click analytics
     */
    async getMenuAnalytics(req, res) {
        try {
            const { id } = req.params;
            const { startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            endDate = new Date(), groupBy = 'day' } = req.query;
            // Verify menu exists
            const menu = await this.menuRepository.findOne({
                where: { id },
                relations: ['items']
            });
            if (!menu) {
                res.status(404).json({
                    success: false,
                    error: 'Menu not found'
                });
                return;
            }
            // Filter events by date range
            const relevantEvents = this.clickEvents.filter(event => event.menuId === id &&
                event.timestamp >= new Date(startDate) &&
                event.timestamp <= new Date(endDate));
            // Calculate analytics
            const analytics = this.calculateAnalytics(menu, relevantEvents, {
                start: new Date(startDate),
                end: new Date(endDate)
            });
            res.json({
                success: true,
                data: analytics
            });
        }
        catch (error) {
            logger_1.default.error('Error getting menu analytics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get menu analytics'
            });
        }
    }
    /**
     * GET /api/v1/menus/:id/performance
     * Get menu performance metrics
     */
    async getMenuPerformance(req, res) {
        try {
            const { id } = req.params;
            // Verify menu exists
            const menu = await this.menuRepository.findOne({
                where: { id },
                relations: ['items']
            });
            if (!menu) {
                res.status(404).json({
                    success: false,
                    error: 'Menu not found'
                });
                return;
            }
            // Get performance metrics
            const metrics = this.performanceMetrics.get(id) || [];
            // Calculate performance data
            const performance = this.calculatePerformance(menu, metrics);
            res.json({
                success: true,
                data: performance
            });
        }
        catch (error) {
            logger_1.default.error('Error getting menu performance:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get menu performance'
            });
        }
    }
    /**
     * POST /api/v1/menus/:id/track-click
     * Track menu item click (internal use)
     */
    async trackMenuClick(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const { menuItemId, sessionId, pageUrl } = req.body;
            const clickEvent = {
                menuId: id,
                menuItemId,
                timestamp: new Date(),
                userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
                sessionId,
                userAgent: req.headers['user-agent'] || '',
                ip: req.ip || '',
                referrer: req.headers.referer,
                pageUrl
            };
            this.clickEvents.push(clickEvent);
            // In production, store in database
            // await this.analyticsRepository.save(clickEvent);
            res.json({
                success: true,
                message: 'Click tracked successfully'
            });
        }
        catch (error) {
            logger_1.default.error('Error tracking menu click:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to track click'
            });
        }
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    calculateAnalytics(menu, events, period) {
        var _a;
        const uniqueUsers = new Set(events.map(e => e.userId || e.sessionId));
        // Count clicks by item
        const clicksByItemMap = new Map();
        const itemTitles = new Map();
        (_a = menu.items) === null || _a === void 0 ? void 0 : _a.forEach(item => {
            itemTitles.set(item.id, item.title);
            clicksByItemMap.set(item.id, 0);
        });
        events.forEach(event => {
            const current = clicksByItemMap.get(event.menuItemId) || 0;
            clicksByItemMap.set(event.menuItemId, current + 1);
        });
        const totalClicks = events.length;
        const clicksByItem = Array.from(clicksByItemMap.entries()).map(([itemId, clicks]) => ({
            itemId,
            itemTitle: itemTitles.get(itemId) || 'Unknown',
            clicks,
            percentage: totalClicks > 0 ? (clicks / totalClicks) * 100 : 0
        })).sort((a, b) => b.clicks - a.clicks);
        // Clicks by hour
        const clicksByHourMap = new Map();
        for (let hour = 0; hour < 24; hour++) {
            clicksByHourMap.set(hour, 0);
        }
        events.forEach(event => {
            const hour = event.timestamp.getHours();
            clicksByHourMap.set(hour, (clicksByHourMap.get(hour) || 0) + 1);
        });
        const clicksByHour = Array.from(clicksByHourMap.entries()).map(([hour, clicks]) => ({
            hour,
            clicks
        }));
        // Clicks by day
        const clicksByDayMap = new Map();
        events.forEach(event => {
            const date = event.timestamp.toISOString().split('T')[0];
            clicksByDayMap.set(date, (clicksByDayMap.get(date) || 0) + 1);
        });
        const clicksByDay = Array.from(clicksByDayMap.entries()).map(([date, clicks]) => ({
            date,
            clicks
        })).sort((a, b) => a.date.localeCompare(b.date));
        // Top referrers
        const referrerMap = new Map();
        events.forEach(event => {
            if (event.referrer) {
                referrerMap.set(event.referrer, (referrerMap.get(event.referrer) || 0) + 1);
            }
        });
        const topReferrers = Array.from(referrerMap.entries())
            .map(([referrer, clicks]) => ({ referrer, clicks }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);
        // Device breakdown (simplified detection)
        const deviceBreakdown = {
            desktop: 0,
            mobile: 0,
            tablet: 0
        };
        events.forEach(event => {
            const ua = event.userAgent.toLowerCase();
            if (ua.includes('mobile')) {
                deviceBreakdown.mobile++;
            }
            else if (ua.includes('tablet') || ua.includes('ipad')) {
                deviceBreakdown.tablet++;
            }
            else {
                deviceBreakdown.desktop++;
            }
        });
        return {
            menuId: menu.id,
            period,
            totalClicks,
            uniqueUsers: uniqueUsers.size,
            clicksByItem,
            clicksByHour,
            clicksByDay,
            topReferrers,
            deviceBreakdown,
            averageTimeToClick: 0, // Would need page load time tracking
            bounceRate: 0 // Would need session tracking
        };
    }
    calculatePerformance(menu, metrics) {
        const renderTimes = metrics.length > 0 ? metrics : [0];
        renderTimes.sort((a, b) => a - b);
        const calculatePercentile = (arr, percentile) => {
            const index = Math.ceil((percentile / 100) * arr.length) - 1;
            return arr[index] || 0;
        };
        const calculateAverage = (arr) => {
            return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
        };
        // Calculate menu complexity
        let maxDepth = 0;
        let itemCount = 0;
        const calculateDepth = (items, depth = 0) => {
            if (depth > maxDepth)
                maxDepth = depth;
            items === null || items === void 0 ? void 0 : items.forEach(item => {
                itemCount++;
                if (item.children) {
                    calculateDepth(item.children, depth + 1);
                }
            });
        };
        calculateDepth(menu.items || []);
        // Generate recommendations
        const recommendations = [];
        if (itemCount > 50) {
            recommendations.push('Consider reducing menu items for better performance');
        }
        if (maxDepth > 3) {
            recommendations.push('Deep nesting detected. Consider flattening menu structure');
        }
        if (calculateAverage(renderTimes) > 100) {
            recommendations.push('High render times detected. Enable caching');
        }
        return {
            menuId: menu.id,
            renderTime: {
                average: calculateAverage(renderTimes),
                min: Math.min(...renderTimes),
                max: Math.max(...renderTimes),
                p50: calculatePercentile(renderTimes, 50),
                p95: calculatePercentile(renderTimes, 95),
                p99: calculatePercentile(renderTimes, 99)
            },
            loadTime: {
                average: calculateAverage(renderTimes) * 1.5, // Simulated
                min: Math.min(...renderTimes) * 1.5,
                max: Math.max(...renderTimes) * 1.5
            },
            cacheMetrics: {
                hitRate: 85, // Simulated
                missRate: 15,
                averageCacheTime: 50
            },
            errorRate: 0.01, // 1% error rate
            availability: 99.9, // 99.9% availability
            itemCount,
            maxDepth,
            totalSize: JSON.stringify(menu).length,
            recommendations
        };
    }
    /**
     * Record render time for performance tracking
     */
    recordRenderTime(menuId, time) {
        const metrics = this.performanceMetrics.get(menuId) || [];
        metrics.push(time);
        // Keep only last 1000 measurements
        if (metrics.length > 1000) {
            metrics.shift();
        }
        this.performanceMetrics.set(menuId, metrics);
    }
}
exports.MenuAnalyticsController = MenuAnalyticsController;
//# sourceMappingURL=MenuAnalyticsController.js.map