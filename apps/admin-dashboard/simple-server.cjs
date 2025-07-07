console.log('🎨 Starting admin dashboard server...');

const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

// Basic middleware
app.use(express.static('public'));
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'admin-dashboard-mock'
  });
});

// Mock login page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>O4O Admin Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; text-align: center; margin-bottom: 30px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; color: #555; }
            input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #005a87; }
            .status { text-align: center; margin-top: 20px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>O4O Admin Dashboard</h1>
            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">Login</button>
            </form>
            <div class="status">
                <p>Mock Admin Dashboard - E2E Testing Ready</p>
                <p>API Server: <span id="apiStatus">Checking...</span></p>
            </div>
        </div>

        <script>
            // Check API server status
            fetch('http://localhost:4000/api/health')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('apiStatus').textContent = 'Connected ✅';
                    document.getElementById('apiStatus').style.color = 'green';
                })
                .catch(error => {
                    document.getElementById('apiStatus').textContent = 'Disconnected ❌';
                    document.getElementById('apiStatus').style.color = 'red';
                });

            // Simple form handling for E2E tests
            document.getElementById('loginForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                if (email && password) {
                    alert('Login successful! (Mock response)');
                    window.location.href = '/dashboard';
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Mock dashboard page
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard - O4O Admin</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .header { background: #007cba; color: white; padding: 20px; margin: -20px -20px 20px -20px; }
            .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .metric { text-align: center; }
            .metric h3 { margin: 0 0 10px 0; color: #666; }
            .metric .value { font-size: 2em; font-weight: bold; color: #007cba; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>O4O Platform Dashboard</h1>
            <p>Admin Panel - Mock Version for E2E Testing</p>
        </div>
        
        <div class="dashboard-grid">
            <div class="card metric">
                <h3>Total Users</h3>
                <div class="value">1,234</div>
            </div>
            <div class="card metric">
                <h3>Active Orders</h3>
                <div class="value">56</div>
            </div>
            <div class="card metric">
                <h3>Revenue</h3>
                <div class="value">$12,345</div>
            </div>
            <div class="card">
                <h3>System Status</h3>
                <p>All systems operational ✅</p>
                <p>API Server: <span id="apiStatus">Checking...</span></p>
            </div>
        </div>

        <script>
            // Check API server status
            fetch('http://localhost:4000/api/health')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('apiStatus').textContent = 'Connected ✅';
                })
                .catch(error => {
                    document.getElementById('apiStatus').textContent = 'Disconnected ❌';
                });
        </script>
    </body>
    </html>
  `);
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Admin Dashboard Server running on http://localhost:${port}`);
  console.log(`🔐 Login page: http://localhost:${port}`);
  console.log(`📊 Dashboard: http://localhost:${port}/dashboard`);
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