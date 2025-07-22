import { Express, Router } from 'express';
import { RouteConfig, gatewayConfig } from '../config/gateway.config.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { RateLimitMiddleware } from '../middleware/rateLimit.middleware.js';
import { ProxyMiddleware } from '../middleware/proxy.middleware.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('RouteManager');

export class RouteManager {
  private app: Express;
  private authMiddleware: AuthMiddleware;
  private rateLimitMiddleware: RateLimitMiddleware;
  private proxyMiddleware: ProxyMiddleware;
  private routes: RouteConfig[] = [];

  constructor(
    app: Express,
    authMiddleware: AuthMiddleware,
    rateLimitMiddleware: RateLimitMiddleware,
    proxyMiddleware: ProxyMiddleware
  ) {
    this.app = app;
    this.authMiddleware = authMiddleware;
    this.rateLimitMiddleware = rateLimitMiddleware;
    this.proxyMiddleware = proxyMiddleware;
    
    // Load routes from config
    this.routes = gatewayConfig.routes;
  }

  /**
   * Initialize all routes
   */
  initializeRoutes(): void {
    logger.info('Initializing API routes', { count: this.routes.length });
    
    // Group routes by path for better organization
    const routeGroups = this.groupRoutesByPath(this.routes);
    
    // Register each route group
    routeGroups.forEach((routes, path) => {
      this.registerRouteGroup(path, routes);
    });
    
    // Register health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });
    
    // Register metrics endpoint if enabled
    if (gatewayConfig.metrics.enabled) {
      this.registerMetricsEndpoint();
    }
    
    logger.info('Routes initialized successfully');
  }

  /**
   * Group routes by path for efficient registration
   */
  private groupRoutesByPath(routes: RouteConfig[]): Map<string, RouteConfig[]> {
    const groups = new Map<string, RouteConfig[]>();
    
    routes.forEach(route => {
      const existing = groups.get(route.path) || [];
      existing.push(route);
      groups.set(route.path, existing);
    });
    
    return groups;
  }

  /**
   * Register a group of routes for the same path
   */
  private registerRouteGroup(path: string, routes: RouteConfig[]): void {
    const router = Router();
    
    // Apply middlewares and handlers for each method
    routes.forEach(route => {
      const methods = route.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      methods.forEach(method => {
        const methodLower = method.toLowerCase() as any;
        const middlewares: any[] = [];
        
        // 1. Rate limiting
        if (route.rateLimit) {
          middlewares.push(
            this.rateLimitMiddleware.dynamic(
              route.rateLimit.windowMs,
              route.rateLimit.max
            )
          );
        } else if (route.auth === false) {
          // Public endpoints get more lenient rate limiting
          middlewares.push(this.rateLimitMiddleware.public());
        } else {
          // API endpoints get standard rate limiting
          middlewares.push(this.rateLimitMiddleware.api());
        }
        
        // 2. Authentication
        if (route.auth === true) {
          middlewares.push(this.authMiddleware.authenticate);
        } else if (route.auth !== false) {
          // Optional auth for endpoints that don't explicitly disable it
          middlewares.push(this.authMiddleware.optionalAuth);
        }
        
        // 3. Auth forwarding (always)
        middlewares.push(this.authMiddleware.forwardAuth);
        
        // 4. Proxy to service
        middlewares.push(this.proxyMiddleware.routeToService(route));
        
        // Register route
        router[methodLower](path, ...middlewares);
        
        logger.debug('Route registered', {
          method,
          path,
          service: route.service,
          auth: route.auth,
          version: route.version
        });
      });
    });
    
    // Mount router
    this.app.use(router);
  }

  /**
   * Register metrics endpoint
   */
  private registerMetricsEndpoint(): void {
    this.app.get(gatewayConfig.metrics.path, (req, res) => {
      const metrics = {
        gateway: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        services: this.proxyMiddleware.getServiceRegistry().getMetrics(),
        routes: {
          total: this.routes.length,
          byService: this.getRoutesByService()
        }
      };
      
      res.json(metrics);
    });
    
    logger.info('Metrics endpoint registered', { path: gatewayConfig.metrics.path });
  }

  /**
   * Get route count by service
   */
  private getRoutesByService(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    this.routes.forEach(route => {
      counts[route.service] = (counts[route.service] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Add a new route dynamically
   */
  addRoute(route: RouteConfig): void {
    this.routes.push(route);
    this.registerRouteGroup(route.path, [route]);
    
    logger.info('Route added dynamically', {
      path: route.path,
      service: route.service
    });
  }

  /**
   * Remove a route dynamically
   */
  removeRoute(path: string, service: string): boolean {
    const index = this.routes.findIndex(r => 
      r.path === path && r.service === service
    );
    
    if (index !== -1) {
      this.routes.splice(index, 1);
      logger.info('Route removed', { path, service });
      return true;
    }
    
    return false;
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RouteConfig[] {
    return [...this.routes];
  }

  /**
   * Get routes for a specific service
   */
  getServiceRoutes(service: string): RouteConfig[] {
    return this.routes.filter(r => r.service === service);
  }
}