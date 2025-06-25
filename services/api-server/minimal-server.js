console.log('🔥 Starting minimal server...');

const express = require('express');
const app = express();
const port = 4000;

// Basic middleware
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'api-server-minimal'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'O4O Platform API Server (Minimal)', status: 'running' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Minimal API Server running on http://localhost:${port}`);
  console.log(`🩺 Health check: http://localhost:${port}/api/health`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Gracefully shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});