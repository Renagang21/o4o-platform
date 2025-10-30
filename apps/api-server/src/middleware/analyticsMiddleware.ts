import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/AnalyticsService.js';
import { ActionType, ActionCategory } from '../entities/UserAction.js';
import { MetricType, MetricCategory } from '../entities/SystemMetrics.js';
import { v4 as uuidv4 } from 'uuid';

export class AnalyticsMiddleware {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  // Initialize analytics tracking for each request
  initializeTracking() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const sessionId = req.headers['x-session-id'] as string || uuidv4();
      const betaUserId = req.headers['x-beta-user-id'] as string || (req as any).user?.betaUserId;
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || (req.socket?.remoteAddress) || 'Unknown';

      req.analytics = {
        sessionId,
        startTime,
        betaUserId,
        userAgent,
        ipAddress
      };

      // Track API call
      if (betaUserId) {
        try {
          await this.analyticsService.trackAction({
            betaUserId,
            sessionId,
            actionType: ActionType.API_CALL,
            actionName: `API: ${req.method} ${req.path}`,
            pageUrl: req.originalUrl,
            metadata: {
              method: req.method,
              path: req.path,
              query: req.query,
              userAgent,
              ipAddress
            }
          });
        } catch (error: any) {
          // Error log removed
        }
      }

      next();
    };
  }

  // Track request performance and completion
  trackPerformance() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;
      
      const analyticsService = this.analyticsService;
      
      res.send = function(data: any) {
        res.send = originalSend;
        const responseTime = Date.now() - (req.analytics?.startTime || 0);
        
        // Track performance metric
        setImmediate(async () => {
          try {
            await analyticsService.recordPerformanceMetric(
              req.originalUrl,
              responseTime,
              'api-server'
            );

            // Track errors if response indicates failure
            if (res.statusCode >= 400 && req.analytics?.betaUserId) {
              await analyticsService.trackError(
                req.analytics.betaUserId,
                req.analytics.sessionId,
                {
                  message: `HTTP ${res.statusCode}: ${req.method} ${req.originalUrl}`,
                  code: res.statusCode.toString(),
                  pageUrl: req.originalUrl
                }
              );
            }
          } catch (error: any) {
            // Error log removed
          }
        });

        return originalSend.call(res, data);
      } as any;

      res.json = function(data: any) {
        res.json = originalJson;
        const responseTime = Date.now() - (req.analytics?.startTime || 0);
        
        // Track performance metric
        setImmediate(async () => {
          try {
            await analyticsService.recordPerformanceMetric(
              req.originalUrl,
              responseTime,
              'api-server'
            );

            // Track errors if response indicates failure
            if (res.statusCode >= 400 && req.analytics?.betaUserId) {
              await analyticsService.trackError(
                req.analytics.betaUserId,
                req.analytics.sessionId,
                {
                  message: `HTTP ${res.statusCode}: ${req.method} ${req.originalUrl}`,
                  code: res.statusCode.toString(),
                  pageUrl: req.originalUrl
                }
              );
            }
          } catch (error: any) {
            // Error log removed
          }
        });

        return originalJson.call(res, data);
      };

      next();
    };
  }

  // Track specific actions based on endpoint patterns
  trackActions() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.analytics?.betaUserId) {
        return next();
      }

      try {
        const actionType = this.getActionTypeFromRequest(req);
        const actionName = this.getActionNameFromRequest(req);
        
        if (actionType && actionName) {
          await this.analyticsService.trackAction({
            betaUserId: req.analytics.betaUserId,
            sessionId: req.analytics.sessionId,
            actionType,
            actionName,
            pageUrl: req.originalUrl,
            metadata: {
              method: req.method,
              body: req.body,
              params: req.params,
              query: req.query
            }
          });
        }
      } catch (error: any) {
        // Error log removed
      }

      next();
    };
  }

  // Track errors and exceptions
  trackErrors() {
    return async (err: Error, req: Request, res: Response, next: NextFunction) => {
      if (req.analytics?.betaUserId) {
        try {
          await this.analyticsService.trackError(
            req.analytics.betaUserId,
            req.analytics.sessionId,
            {
              message: err.message,
              pageUrl: req.originalUrl,
              stackTrace: err.stack
            }
          );

          // Record error metric
          await this.analyticsService.recordMetric({
            metricType: MetricType.ERROR,
            metricCategory: MetricCategory.ERROR_COUNT,
            metricName: 'API Error',
            value: 1,
            unit: 'count',
            source: 'api-server',
            endpoint: req.originalUrl,
            metadata: {
              errorMessage: err.message,
              errorType: err.constructor.name,
              stackTrace: err.stack
            }
          });
        } catch (trackingError) {
          // Error log removed
        }
      }

      next(err);
    };
  }

  // Session management middleware
  manageSession() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.analytics?.betaUserId) {
        return next();
      }

      try {
        const existingSession = await this.analyticsService.updateSession(
          req.analytics.sessionId,
          { lastActivityAt: new Date() }
        );

        if (!existingSession) {
          // Create new session
          await this.analyticsService.createSession({
            betaUserId: req.analytics.betaUserId,
            sessionId: req.analytics.sessionId,
            ipAddress: req.analytics.ipAddress,
            userAgent: req.analytics.userAgent,
            referrer: req.headers.referer,
            utmSource: req.query.utm_source as string,
            utmMedium: req.query.utm_medium as string,
            utmCampaign: req.query.utm_campaign as string
          });
        }
      } catch (error: any) {
        // Error log removed
      }

      next();
    };
  }

  // Custom tracking methods for specific use cases
  trackLogin() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;
      
      const trackLoginSuccess = async () => {
        if (res.statusCode === 200 && req.analytics?.betaUserId) {
          try {
            await this.analyticsService.trackAction({
              betaUserId: req.analytics.betaUserId,
              sessionId: req.analytics.sessionId,
              actionType: ActionType.LOGIN,
              actionName: 'User Login',
              pageUrl: req.originalUrl,
              metadata: {
                userAgent: req.analytics.userAgent,
                ipAddress: req.analytics.ipAddress
              }
            });
          } catch (error: any) {
            // Error log removed
          }
        }
      };

      res.send = function(data: any) {
        res.send = originalSend;
        setImmediate(trackLoginSuccess);
        return originalSend.call(res, data);
      };

      res.json = function(data: any) {
        res.json = originalJson;
        setImmediate(trackLoginSuccess);
        return originalJson.call(res, data);
      };

      next();
    };
  }

  trackFeedback() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;
      
      const trackFeedbackSuccess = async () => {
        if (res.statusCode === 201 && req.analytics?.betaUserId) {
          try {
            await this.analyticsService.trackAction({
              betaUserId: req.analytics.betaUserId,
              sessionId: req.analytics.sessionId,
              actionType: ActionType.FEEDBACK_SUBMIT,
              actionName: 'Feedback Submitted',
              pageUrl: req.originalUrl,
              metadata: {
                feedbackType: req.body.type,
                category: req.body.category,
                rating: req.body.rating
              }
            });

            // Update session feedback count
            await this.analyticsService.updateSession(req.analytics.sessionId, {
              feedbackSubmitted: 1
            });
          } catch (error: any) {
            // Error log removed
          }
        }
      };

      res.send = function(data: any) {
        res.send = originalSend;
        setImmediate(trackFeedbackSuccess);
        return originalSend.call(res, data);
      };

      res.json = function(data: any) {
        res.json = originalJson;
        setImmediate(trackFeedbackSuccess);
        return originalJson.call(res, data);
      };

      next();
    };
  }

  trackContentUsage() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;
      
      const trackContentSuccess = async () => {
        if (res.statusCode === 200 && req.analytics?.betaUserId) {
          try {
            const actionType = this.getContentActionType(req);
            if (actionType) {
              await this.analyticsService.trackAction({
                betaUserId: req.analytics.betaUserId,
                sessionId: req.analytics.sessionId,
                actionType,
                actionName: `Content ${actionType.replace('_', ' ')}`,
                pageUrl: req.originalUrl,
                metadata: {
                  contentId: req.params.id,
                  contentType: req.body.type,
                  action: req.method
                }
              });

              // Update session content viewed count
              await this.analyticsService.updateSession(req.analytics.sessionId, {
                contentViewed: 1
              });
            }
          } catch (error: any) {
            // Error log removed
          }
        }
      };

      res.send = function(data: any) {
        res.send = originalSend;
        setImmediate(trackContentSuccess);
        return originalSend.call(res, data);
      };

      res.json = function(data: any) {
        res.json = originalJson;
        setImmediate(trackContentSuccess);
        return originalJson.call(res, data);
      };

      next();
    };
  }

  // Helper methods
  private getActionTypeFromRequest(req: Request): ActionType | null {
    const path = req.path.toLowerCase();
    const method = req.method.toLowerCase();

    // Login/logout actions
    if (path.includes('/login')) return ActionType.LOGIN;
    if (path.includes('/logout')) return ActionType.LOGOUT;

    // Content actions
    if (path.includes('/content') || path.includes('/signage')) {
      if (method === 'get') return ActionType.CONTENT_VIEW;
      if (method === 'post') return ActionType.SIGNAGE_CREATE;
      if (method === 'put') return ActionType.SIGNAGE_EDIT;
      if (method === 'delete') return ActionType.SIGNAGE_DELETE;
    }

    // Playlist actions
    if (path.includes('/playlist')) {
      if (method === 'post') return ActionType.PLAYLIST_CREATE;
      if (method === 'put') return ActionType.PLAYLIST_EDIT;
    }

    // Feedback actions
    if (path.includes('/feedback')) {
      if (method === 'post') return ActionType.FEEDBACK_SUBMIT;
      if (method === 'put') return ActionType.FEEDBACK_RATE;
    }

    // Admin actions
    if (path.includes('/admin')) {
      if (path.includes('/approve')) return ActionType.USER_APPROVE;
      if (path.includes('/analytics')) return ActionType.ANALYTICS_VIEW;
      if (path.includes('/reports')) return ActionType.REPORT_GENERATE;
    }

    return null;
  }

  private getActionNameFromRequest(req: Request): string {
    const actionType = this.getActionTypeFromRequest(req);
    if (!actionType) return `${req.method} ${req.path}`;
    
    return actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getContentActionType(req: Request): ActionType | null {
    const path = req.path.toLowerCase();
    const method = req.method.toLowerCase();

    if (path.includes('/content') && method === 'get') return ActionType.CONTENT_VIEW;
    if (path.includes('/signage') && method === 'post') return ActionType.SIGNAGE_CREATE;
    if (path.includes('/signage') && method === 'put') return ActionType.SIGNAGE_EDIT;
    if (path.includes('/playlist') && method === 'post') return ActionType.PLAYLIST_CREATE;
    if (path.includes('/schedule') && method === 'post') return ActionType.SIGNAGE_SCHEDULE;
    if (path.includes('/template') && method === 'post') return ActionType.TEMPLATE_USE;

    return null;
  }
}

// Export singleton instance
export const analyticsMiddleware = new AnalyticsMiddleware();