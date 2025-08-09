import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';

// Create a test app instance
export function createTestApp(): express.Application {
  const app = express();

  // Middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
  }));
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Mock routes for testing
  app.get('/api/v1/content/posts', (req, res) => {
    res.json({
      status: 'success',
      data: {
        posts: [],
        totalPages: 1,
        currentPage: 1,
        totalItems: 0
      }
    });
  });

  app.post('/api/v1/content/posts', (req, res) => {
    // Check for auth header
    if (!req.headers.authorization) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    res.status(201).json({
      status: 'success',
      data: {
        post: { id: '1', ...req.body }
      }
    });
  });

  app.get('/api/v1/content/posts/:id', (req, res) => {
    if (req.params.id === 'non-existent') {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }
    res.json({
      status: 'success',
      data: {
        post: { id: req.params.id, title: 'Test Post' }
      }
    });
  });

  app.put('/api/v1/content/posts/:id', (req, res) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    res.json({
      status: 'success',
      data: {
        post: { id: req.params.id, ...req.body }
      }
    });
  });

  app.delete('/api/v1/content/posts/:id', (req, res) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    res.json({
      status: 'success',
      message: 'Post deleted'
    });
  });

  app.get('/api/v1/content/categories', (req, res) => {
    res.json({
      status: 'success',
      data: {
        categories: []
      }
    });
  });

  app.get('/api/v1/content/media', (req, res) => {
    res.json({
      status: 'success',
      data: {
        media: []
      }
    });
  });

  app.post('/api/v1/content/media/upload', (req, res) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    res.status(201).json({
      status: 'success',
      data: {
        media: { id: '1', url: '/uploads/test.jpg' }
      }
    });
  });

  app.get('/api/v1/content/authors', (req, res) => {
    res.json({
      status: 'success',
      data: {
        authors: []
      }
    });
  });

  return app;
}