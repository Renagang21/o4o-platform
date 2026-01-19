/**
 * SiteGuide Core API Service
 *
 * WO-SITEGUIDE-CLOUD-RUN-V1
 * Domain: siteguide.co.kr
 *
 * This is a dedicated Cloud Run service for SiteGuide.
 * It provides AI-powered site guidance execution.
 */

import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';

// ============================================================================
// EXPRESS APP INITIALIZATION
// ============================================================================

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
// TODO: Restrict to specific domains in production
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

/**
 * Root endpoint - Service identification
 */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'SiteGuide Core API',
    domain: config.SERVICE_DOMAIN,
    environment: config.NODE_ENV,
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Health check endpoint - For Cloud Run / Load Balancer
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'siteguide-core',
    domain: config.SERVICE_DOMAIN,
    environment: config.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * API health check endpoint - For application-level monitoring
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'siteguide-core-api',
    domain: config.SERVICE_DOMAIN,
    environment: config.NODE_ENV,
    aiExecutionEnabled: config.AI_EXECUTION_ENABLED,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API ROUTES (Placeholder)
// ============================================================================

/**
 * API version info
 */
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      query: '/api/v1/query (coming soon)',
      admin: '/api/v1/admin/* (coming soon)',
    },
  });
});

/**
 * Query endpoint placeholder
 * TODO: Connect to actual SiteGuide service
 */
app.post('/api/v1/query', (_req: Request, res: Response) => {
  res.status(503).json({
    error: 'Service not yet implemented',
    message: 'SiteGuide query endpoint is being prepared',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SiteGuide Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = config.PORT;

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  SiteGuide Core Service started');
  console.log('========================================');
  console.log(`  Domain:      ${config.SERVICE_DOMAIN}`);
  console.log(`  Environment: ${config.NODE_ENV}`);
  console.log(`  Port:        ${PORT}`);
  console.log(`  AI Enabled:  ${config.AI_EXECUTION_ENABLED}`);
  console.log('========================================');
  console.log('');
  console.log(`  Health:      http://localhost:${PORT}/health`);
  console.log(`  API Health:  http://localhost:${PORT}/api/health`);
  console.log('');
});
