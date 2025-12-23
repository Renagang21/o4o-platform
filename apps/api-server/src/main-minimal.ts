/**
 * Minimal API Server for Cloud Run Health Check
 * This is a stripped-down version that starts quickly without database/Redis dependencies.
 */

import express from 'express';

const app = express();
const port = process.env.PORT || 8080;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '0.5.0-minimal'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'O4O API Server (Minimal)',
    health: '/health'
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Minimal API Server running on port ${port}`);
});
