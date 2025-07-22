import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options, Filter, RequestHandler } from 'http-proxy-middleware';
import { ServiceRegistry } from '../services/ServiceRegistry.js';
import { AuthRequest } from './auth.middleware.js';
import { createLogger } from '../utils/logger.js';
import { RouteConfig } from '../config/gateway.config.js';

const logger = createLogger('ProxyMiddleware');

export class ProxyMiddleware {
  private serviceRegistry: ServiceRegistry;
  private proxies: Map<string, any> = new Map();

  constructor(serviceRegistry: ServiceRegistry) {
    this.serviceRegistry = serviceRegistry;
  }
  
  /**
   * Get service registry instance
   */
  getServiceRegistry(): ServiceRegistry {
    return this.serviceRegistry;
  }

  /**
   * Create proxy middleware for a service
   */
  createProxy(serviceKey: string): any {
    if (this.proxies.has(serviceKey)) {
      return this.proxies.get(serviceKey);
    }

    const service = this.serviceRegistry.getService(serviceKey);
    if (!service) {
      throw new Error(`Service ${serviceKey} not found in registry`);
    }

    const proxyOptions = {
      target: service.url,
      changeOrigin: true,
      timeout: service.timeout || 10000,
      proxyTimeout: service.timeout || 10000,
      
      // Path rewriting
      pathRewrite: (path: string, req: Request) => {
        // Remove /api/v1 prefix as backend services handle their own paths
        const newPath = path.replace(/^\/api\/v\d+/, '/api');
        logger.debug('Path rewrite', { original: path, rewritten: newPath });
        return newPath;
      },
      
      // Request interceptor
      on: {
        proxyReq: (proxyReq: any, req: any, res: any) => {
        const authReq = req as AuthRequest;
        
        // Forward auth headers
        if (authReq.user) {
          proxyReq.setHeader('X-User-Id', authReq.user.id);
          proxyReq.setHeader('X-User-Email', authReq.user.email);
          proxyReq.setHeader('X-User-Role', authReq.user.role);
          proxyReq.setHeader('X-User-Status', authReq.user.status);
        }
        
        // Forward session ID
        if (authReq.session) {
          proxyReq.setHeader('X-Session-Id', authReq.session.id);
        }
        
        // Forward original IP
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        proxyReq.setHeader('X-Forwarded-For', clientIp as string);
        proxyReq.setHeader('X-Real-IP', clientIp as string);
        
        // Forward cookies
        const cookies = req.headers.cookie;
        if (cookies) {
          proxyReq.setHeader('Cookie', cookies);
        }
        
        // Log proxy request
        logger.debug('Proxying request', {
          method: req.method,
          path: req.path,
          target: service.url,
          user: authReq.user?.id
        });
        },
        proxyRes: (proxyRes: any, req: any, res: any) => {
          // Log proxy response
          logger.debug('Proxy response', {
            status: proxyRes.statusCode,
            path: req.path,
            service: serviceKey
          });
          
          // Add service header
          proxyRes.headers['X-Served-By'] = service.name;
        },
        error: (err: any, req: any, res: any) => {
        logger.error('Proxy error', {
          error: err.message,
          service: serviceKey,
          path: req.path
        });
        
        // Check if service is healthy
        if (!this.serviceRegistry.isServiceHealthy(serviceKey)) {
          (res as Response).status(503).json({
            error: 'Service temporarily unavailable',
            code: 'SERVICE_UNAVAILABLE',
            service: service.name
          });
        } else {
          (res as Response).status(502).json({
            error: 'Bad gateway',
            code: 'BAD_GATEWAY',
            service: service.name
          });
        }
      }
      }
    } as Options;

    const proxy = createProxyMiddleware(proxyOptions);
    this.proxies.set(serviceKey, proxy);
    return proxy;
  }

  /**
   * Route to service based on configuration
   */
  routeToService(route: RouteConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if service is healthy (circuit breaker)
        if (!this.serviceRegistry.shouldRouteToService(route.service)) {
          logger.warn('Service unhealthy, circuit breaker open', {
            service: route.service,
            path: req.path
          });
          
          return res.status(503).json({
            error: 'Service temporarily unavailable',
            code: 'SERVICE_UNAVAILABLE',
            service: route.service
          });
        }
        
        // Create or get proxy
        const proxy = this.createProxy(route.service);
        
        // Execute proxy
        proxy(req, res, next);
      } catch (error: any) {
        logger.error('Failed to route request', {
          error: error.message,
          service: route.service,
          path: req.path
        });
        
        res.status(500).json({
          error: 'Internal gateway error',
          code: 'GATEWAY_ERROR'
        });
      }
    };
  }

  /**
   * Load balancing proxy (round-robin)
   */
  loadBalancedProxy(serviceKeys: string[]) {
    let currentIndex = 0;
    
    return async (req: Request, res: Response, next: NextFunction) => {
      // Get healthy services
      const healthyServices = serviceKeys.filter(key => 
        this.serviceRegistry.isServiceHealthy(key)
      );
      
      if (healthyServices.length === 0) {
        return res.status(503).json({
          error: 'No healthy services available',
          code: 'NO_HEALTHY_SERVICES'
        });
      }
      
      // Round-robin selection
      const selectedService = healthyServices[currentIndex % healthyServices.length];
      currentIndex++;
      
      // Route to selected service
      const route: RouteConfig = {
        path: req.path,
        service: selectedService
      };
      
      this.routeToService(route)(req, res, next);
    };
  }

  /**
   * Fallback proxy with retries
   */
  fallbackProxy(primaryService: string, fallbackService: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Try primary service first
      if (this.serviceRegistry.isServiceHealthy(primaryService)) {
        const primaryRoute: RouteConfig = {
          path: req.path,
          service: primaryService
        };
        
        return this.routeToService(primaryRoute)(req, res, next);
      }
      
      // Fallback to secondary service
      logger.info('Using fallback service', {
        primary: primaryService,
        fallback: fallbackService,
        path: req.path
      });
      
      const fallbackRoute: RouteConfig = {
        path: req.path,
        service: fallbackService
      };
      
      this.routeToService(fallbackRoute)(req, res, next);
    };
  }
}