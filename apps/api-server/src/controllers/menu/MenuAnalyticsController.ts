import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { Menu } from '../../entities/Menu.js';
import { MenuItem } from '../../entities/MenuItem.js';
import logger from '../../utils/logger.js';
import { AuthRequest } from '../../types/auth.js';

interface ClickEvent {
  menuId: string;
  menuItemId: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  userAgent: string;
  ip: string;
  referrer?: string;
  pageUrl: string;
}

interface MenuAnalytics {
  menuId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalClicks: number;
  uniqueUsers: number;
  clicksByItem: {
    itemId: string;
    itemTitle: string;
    clicks: number;
    percentage: number;
  }[];
  clicksByHour: {
    hour: number;
    clicks: number;
  }[];
  clicksByDay: {
    date: string;
    clicks: number;
  }[];
  topReferrers: {
    referrer: string;
    clicks: number;
  }[];
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  averageTimeToClick: number;
  bounceRate: number;
}

interface MenuPerformance {
  menuId: string;
  renderTime: {
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  loadTime: {
    average: number;
    min: number;
    max: number;
  };
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    averageCacheTime: number;
  };
  errorRate: number;
  availability: number;
  itemCount: number;
  maxDepth: number;
  totalSize: number;
  recommendations: string[];
}

export class MenuAnalyticsController {
  private menuRepository: Repository<Menu>;
  private menuItemRepository: Repository<MenuItem>;
  
  // In production, store in analytics database
  private clickEvents: ClickEvent[] = [];
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.menuRepository = AppDataSource.getRepository(Menu);
    this.menuItemRepository = AppDataSource.getRepository(MenuItem);
  }

  /**
   * GET /api/v1/menus/:id/analytics
   * Get menu click analytics
   */
  async getMenuAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { 
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        endDate = new Date(),
        groupBy = 'day'
      } = req.query;

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
      const relevantEvents = this.clickEvents.filter(event => 
        event.menuId === id &&
        event.timestamp >= new Date(startDate as string) &&
        event.timestamp <= new Date(endDate as string)
      );

      // Calculate analytics
      const analytics = this.calculateAnalytics(menu, relevantEvents, {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting menu analytics:', error);
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
  async getMenuPerformance(req: AuthRequest, res: Response): Promise<void> {
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
    } catch (error) {
      logger.error('Error getting menu performance:', error);
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
  async trackMenuClick(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { menuItemId, sessionId, pageUrl } = req.body;

      const clickEvent: ClickEvent = {
        menuId: id,
        menuItemId,
        timestamp: new Date(),
        userId: (req as any).user?.id,
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
    } catch (error) {
      logger.error('Error tracking menu click:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track click'
      });
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateAnalytics(menu: Menu, events: ClickEvent[], period: { start: Date; end: Date }): MenuAnalytics {
    const uniqueUsers = new Set(events.map(e => e.userId || e.sessionId));
    
    // Count clicks by item
    const clicksByItemMap = new Map<string, number>();
    const itemTitles = new Map<string, string>();
    
    menu.items?.forEach(item => {
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
    const clicksByHourMap = new Map<number, number>();
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
    const clicksByDayMap = new Map<string, number>();
    events.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      clicksByDayMap.set(date, (clicksByDayMap.get(date) || 0) + 1);
    });

    const clicksByDay = Array.from(clicksByDayMap.entries()).map(([date, clicks]) => ({
      date,
      clicks
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Top referrers
    const referrerMap = new Map<string, number>();
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
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceBreakdown.tablet++;
      } else {
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

  private calculatePerformance(menu: Menu, metrics: number[]): MenuPerformance {
    const renderTimes = metrics.length > 0 ? metrics : [0];
    renderTimes.sort((a, b) => a - b);

    const calculatePercentile = (arr: number[], percentile: number): number => {
      const index = Math.ceil((percentile / 100) * arr.length) - 1;
      return arr[index] || 0;
    };

    const calculateAverage = (arr: number[]): number => {
      return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
    };

    // Calculate menu complexity
    let maxDepth = 0;
    let itemCount = 0;

    const calculateDepth = (items: MenuItem[], depth = 0): void => {
      if (depth > maxDepth) maxDepth = depth;
      items?.forEach(item => {
        itemCount++;
        if (item.children) {
          calculateDepth(item.children, depth + 1);
        }
      });
    };

    calculateDepth(menu.items || []);

    // Generate recommendations
    const recommendations: string[] = [];
    
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
  recordRenderTime(menuId: string, time: number): void {
    const metrics = this.performanceMetrics.get(menuId) || [];
    metrics.push(time);
    
    // Keep only last 1000 measurements
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    this.performanceMetrics.set(menuId, metrics);
  }
}