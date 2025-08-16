module.exports = {
  apps: [
    {
      // Admin Dashboard (Static Serving)
      name: 'o4o-admin-dashboard',
      script: 'serve',
      interpreter: 'none',
      args: '-s dist -l 3001',
      cwd: process.env.PM2_ADMIN_PATH || '/home/ubuntu/o4o-platform/apps/admin-dashboard',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/admin-dashboard-error.log',
      out_file: './logs/admin-dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: process.env.DEPLOY_USER || 'ubuntu',
      host: process.env.DEPLOY_HOST || 'admin.neture.co.kr',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/o4o-platform.git',
      path: process.env.DEPLOY_PATH || '/home/ubuntu/o4o-platform',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};