module.exports = {
  apps: [
    {
      // API Server Configuration
      name: 'o4o-api-server',
      script: './apps/api-server/src/main.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register',
      cwd: '/home/sohae21/Coding/o4o-platform',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USERNAME: 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: 'o4o_platform',
        JWT_SECRET: process.env.JWT_SECRET,
        REFRESH_SECRET: process.env.REFRESH_SECRET,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: 'ap-northeast-2',
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        FRONTEND_URL: 'https://admin.neture.co.kr',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      },
      error_file: './logs/api-server-error.log',
      out_file: './logs/api-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true
    },
    {
      // Admin Dashboard (Static Serving)
      name: 'o4o-admin-dashboard',
      script: 'serve',
      interpreter: 'none',
      args: '-s dist -l 3001',
      cwd: '/home/sohae21/Coding/o4o-platform/apps/admin-dashboard',
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
      user: 'sohae21',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/o4o-platform.git',
      path: '/home/sohae21/Coding/o4o-platform',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};