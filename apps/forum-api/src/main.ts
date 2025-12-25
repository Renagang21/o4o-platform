/**
 * Forum API - Main Entry Point
 * =============================================================================
 * Domain API server for O4O Forum functionality.
 *
 * Key Principles (from app-api-architecture.md):
 * 1. Authentication is delegated to Core API
 * 2. No direct Core database access
 * 3. Health endpoints are mandatory
 * 4. Cloud Run compatible
 * =============================================================================
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { env, validateEnv } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import forumRoutes from './routes/forum.routes.js';

// Validate environment
validateEnv();

// Create Express app
const app: Application = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API-only server
}));

// Compression
app.use(compression());

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // In production, you should restrict this to specific origins
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (simple, Cloud Run has its own logging)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (env.isDevelopment) {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// =============================================================================
// ROUTES
// =============================================================================

// Health check routes (required for all App APIs)
app.use('/health', healthRoutes);

// Forum domain routes
app.use('/api/v1/forum', forumRoutes);

// Root redirect to health
app.get('/', (req: Request, res: Response) => {
  res.redirect('/health');
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: env.isProduction ? 'Internal Server Error' : err.message,
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const startServer = async () => {
  console.log('='.repeat(60));
  console.log('O4O Forum API Server');
  console.log('='.repeat(60));
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Cloud Run: ${env.isCloudRun ? 'Yes' : 'No'}`);
  console.log(`Core API: ${env.CORE_API_URL}`);
  console.log('='.repeat(60));

  app.listen(env.PORT, env.HOST, () => {
    console.log(`Server running on http://${env.HOST}:${env.PORT}`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  GET  /health                           - Liveness check`);
    console.log(`  GET  /health/ready                     - Readiness check`);
    console.log(`  GET  /api/v1/forum/threads             - List threads`);
    console.log(`  GET  /api/v1/forum/threads/:id         - Get thread`);
    console.log(`  POST /api/v1/forum/threads             - Create thread (auth)`);
    console.log(`  GET  /api/v1/forum/threads/:id/replies - Get replies`);
    console.log(`  POST /api/v1/forum/threads/:id/replies - Create reply (auth)`);
    console.log(`  GET  /api/v1/forum/categories          - List categories`);
    console.log('');
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});

// Start
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
