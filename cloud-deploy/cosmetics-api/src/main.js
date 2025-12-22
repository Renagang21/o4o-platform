/**
 * Cosmetics API - Cloud Run Entry Point
 *
 * Environment Variables:
 * - PORT: Server port (default: 8080)
 * - DB_HOST: Database host (Cloud SQL Unix socket path for Cloud Run)
 * - DB_NAME: Database name
 * - DB_USER: Database user
 * - DB_PASSWORD: Database password
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || '/cloudsql/neture-services:asia-northeast3:neture-db',
  database: process.env.DB_NAME || 'neture',
  user: process.env.DB_USER || 'neture_admin',
  password: process.env.DB_PASSWORD,
  // Cloud SQL Unix socket configuration
  ...(process.env.DB_HOST?.startsWith('/cloudsql') && {
    host: process.env.DB_HOST,
  }),
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({
      status: 'healthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'cosmetics-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      products: '/api/products',
      categories: '/api/categories',
    }
  });
});

// API Routes
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products LIMIT 100');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Cosmetics API running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database host: ${process.env.DB_HOST || 'not configured'}`);
});
