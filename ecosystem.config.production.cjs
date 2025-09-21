/**
 * PM2 Configuration for Production API Server (api.neture.co.kr)
 * Port 4000 - Used by Nginx reverse proxy
 */

module.exports = {
  apps: [
    {
      name: 'o4o-api-production',
      script: './apps/api-server/dist/main.js',
      instances: 2, // Use 2 instances for better stability
      exec_mode: 'cluster',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        SERVER_TYPE: 'apiserver',
        PORT: 4000, // Production port for Nginx proxy

        // Database configuration (use existing environment variables)
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USERNAME: process.env.DB_USERNAME || 'o4o_user',
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME || 'o4o_production',

        // JWT configuration
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,

        // Session configuration
        SESSION_SECRET: process.env.SESSION_SECRET || 'o4o-session-secret-prod',

        // Redis configuration (optional)
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,

        // CORS configuration - Include all neture.co.kr subdomains
        CORS_ORIGIN: 'https://admin.neture.co.kr,https://neture.co.kr,https://www.neture.co.kr,https://funding.neture.co.kr,https://auth.neture.co.kr',

        // Cookie configuration
        COOKIE_DOMAIN: '.neture.co.kr',

        // Frontend URLs
        FRONTEND_URL: 'https://neture.co.kr',
        ADMIN_URL: 'https://admin.neture.co.kr',

        // Email service configuration
        EMAIL_SERVICE_ENABLED: process.env.EMAIL_SERVICE_ENABLED || 'false',
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@neture.co.kr',

        // API configuration
        API_URL: 'https://api.neture.co.kr',

        // Security
        RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
        RATE_LIMIT_MAX: 100, // max requests per window

        // Monitoring
        NEW_RELIC_APP_NAME: process.env.NEW_RELIC_APP_NAME,
        NEW_RELIC_LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY,
      },

      // PM2 specific configurations
      max_memory_restart: '1G',
      error_file: './logs/api-production-error.log',
      out_file: './logs/api-production-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Auto restart configurations
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ]
};