module.exports = {
  apps: [
    {
      name: 'o4o-platform',
      script: './o4o-platform/dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        DATABASE_URL: 'postgresql://o4o_user:CHANGE_PASSWORD@localhost:5432/o4o_platform',
        JWT_SECRET: 'CHANGE_JWT_SECRET_IN_PRODUCTION',
        COOKIE_SECRET: 'CHANGE_COOKIE_SECRET_IN_PRODUCTION'
      },
      log_file: '/var/log/pm2/o4o-platform.log',
      error_file: '/var/log/pm2/o4o-platform-error.log',
      out_file: '/var/log/pm2/o4o-platform-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'rpa-services',
      script: './rpa-services/dist/main.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://o4o_user:CHANGE_PASSWORD@localhost:5432/rpa_services',
        LOG_LEVEL: 'info',
        O4O_PLATFORM_URL: 'http://localhost:3004',
        AI_SERVICES_URL: 'http://localhost:3000'
      },
      log_file: '/var/log/pm2/rpa-services.log',
      error_file: '/var/log/pm2/rpa-services-error.log',
      out_file: '/var/log/pm2/rpa-services-out.log'
    },
    {
      name: 'ai-services',
      script: 'python3.11',
      args: '-m uvicorn src.main:app --host 0.0.0.0 --port 3000 --workers 2',
      cwd: './ai-services',
      instances: 1,
      interpreter: 'none',
      env: {
        PYTHON_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://o4o_user:CHANGE_PASSWORD@localhost:5432/ai_services'
      },
      log_file: '/var/log/pm2/ai-services.log',
      error_file: '/var/log/pm2/ai-services-error.log',
      out_file: '/var/log/pm2/ai-services-out.log'
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['YOUR_APISERVER_IP'],
      ref: 'origin/master',
      repo: 'https://github.com/renagang21/renagang21.git',
      path: '/home/deploy/microservices',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get update && apt-get install -y nodejs npm python3.11'
    }
  }
};
