/**
 * PM2 Configuration for API Server Production Deployment
 * This configuration is specifically for the API server (api.neture.co.kr)
 */

module.exports = {
  apps: [
    {
      name: 'o4o-api-server',
      script: './apps/api-server/dist/main.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        SERVER_TYPE: 'apiserver',
        PORT: process.env.PORT || 3001,
        
        // Database configuration
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USERNAME: process.env.DB_USERNAME,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        
        // JWT configuration
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, // Fallback to JWT_SECRET if not set
        
        // Session configuration
        SESSION_SECRET: process.env.SESSION_SECRET || 'o4o-session-secret-prod',
        
        // Redis configuration (optional)
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        
        // CORS configuration
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://admin.neture.co.kr,https://neture.co.kr,https://www.neture.co.kr',
        
        // Cookie configuration
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || '.neture.co.kr',
        
        // Frontend URL
        FRONTEND_URL: process.env.FRONTEND_URL || 'https://neture.co.kr',
        
        // Email service configuration (optional)
        EMAIL_SERVICE_ENABLED: process.env.EMAIL_SERVICE_ENABLED || 'false',
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        
        // Upload directory
        UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
        
        // Debug flags
        DEBUG_CORS: process.env.DEBUG_CORS || 'false'
      },
      
      // PM2 configuration
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs', '.git'],
      max_memory_restart: '2G',
      
      // Logging
      log_file: '/var/log/pm2/o4o-api-server-combined.log',
      error_file: '/var/log/pm2/o4o-api-server-error.log',
      out_file: '/var/log/pm2/o4o-api-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Graceful restart
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Auto restart
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Node.js arguments
      node_args: '--max-old-space-size=2048',
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
      
      // Error handling
      error_file: '/var/log/pm2/o4o-api-server-error.log',
      combine_logs: true,
      
      // Post-deploy actions
      post_deploy: 'npm run migration:run',
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: process.env.SSH_USER || 'ubuntu',
      host: process.env.SSH_HOST || 'api.neture.co.kr',
      ref: 'origin/main',
      repo: 'git@github.com:Renagang21/o4o-platform.git',
      path: '/home/ubuntu/o4o-platform',
      'post-deploy': 'npm install && npm run build:packages && cd apps/api-server && npm run build && pm2 reload ecosystem.config.apiserver.cjs --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};