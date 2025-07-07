const http = require('http');
const url = require('url');

console.log('🎨 Starting admin dashboard HTTP server...');

const port = 3001;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'admin-dashboard-mock'
    }));
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
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
              #loginForm { display: block; }
              #dashboardView { display: none; }
              .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
              .card { background: #f9f9f9; padding: 20px; border-radius: 8px; }
              .metric { text-align: center; }
              .metric h3 { margin: 0 0 10px 0; color: #666; }
              .metric .value { font-size: 2em; font-weight: bold; color: #007cba; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>O4O Admin Dashboard</h1>
              
              <div id="loginForm">
                  <form>
                      <div class="form-group">
                          <label for="email">Email:</label>
                          <input type="email" id="email" name="email" value="admin@test.com" required>
                      </div>
                      <div class="form-group">
                          <label for="password">Password:</label>
                          <input type="password" id="password" name="password" value="password" required>
                      </div>
                      <button type="submit" data-testid="login-button">Login</button>
                  </form>
              </div>

              <div id="dashboardView">
                  <h2>Dashboard</h2>
                  <div class="dashboard-grid">
                      <div class="card metric">
                          <h3>Total Users</h3>
                          <div class="value" data-testid="user-count">1,234</div>
                      </div>
                      <div class="card metric">
                          <h3>Active Orders</h3>
                          <div class="value" data-testid="order-count">56</div>
                      </div>
                      <div class="card metric">
                          <h3>Revenue</h3>
                          <div class="value" data-testid="revenue">$12,345</div>
                      </div>
                  </div>
                  <button onclick="logout()" style="margin-top: 20px;" data-testid="logout-button">Logout</button>
              </div>

              <div class="status">
                  <p>Mock Admin Dashboard - E2E Testing Ready</p>
                  <p>API Server: <span id="apiStatus">Checking...</span></p>
              </div>
          </div>

          <script>
              // Check API server status
              function checkApiStatus() {
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
              }

              checkApiStatus();
              setInterval(checkApiStatus, 10000); // Check every 10 seconds

              // Simple form handling for E2E tests
              document.querySelector('#loginForm form').addEventListener('submit', function(e) {
                  e.preventDefault();
                  const email = document.getElementById('email').value;
                  const password = document.getElementById('password').value;
                  
                  if (email && password) {
                      // Simulate login success
                      document.getElementById('loginForm').style.display = 'none';
                      document.getElementById('dashboardView').style.display = 'block';
                  }
              });

              function logout() {
                  document.getElementById('loginForm').style.display = 'block';
                  document.getElementById('dashboardView').style.display = 'none';
                  document.getElementById('email').value = 'admin@test.com';
                  document.getElementById('password').value = 'password';
              }

              // Make functions available globally for testing
              window.login = function() {
                  document.getElementById('loginForm').style.display = 'none';
                  document.getElementById('dashboardView').style.display = 'block';
              };
              
              window.logout = logout;
          </script>
      </body>
      </html>
    `);
    return;
  }

  if (pathname === '/dashboard') {
    // Redirect to main page with dashboard view
    res.writeHead(302, { 'Location': '/' });
    res.end();
    return;
  }

  // 404 for other paths
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(port, '0.0.0.0', () => {
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