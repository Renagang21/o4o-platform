module.exports = {
  apps: [{
    name: 'o4o-api',
    script: './dist/main.js',
    cwd: '/home/ubuntu/o4o-platform/apps/api-server',
    env: {
      NODE_ENV: 'production',
      PORT: '4000',
      HOST: '0.0.0.0',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: '3lz15772779',
      DB_DATABASE: 'o4o_platform',
      JWT_SECRET: 'nowo4oplatformwithclaudeandclaudecode',
      JWT_REFRESH_SECRET: 'refreshsecretforo4oplatform2024',
      JWT_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'https://admin.neture.co.kr,https://neture.co.kr',
      LOG_LEVEL: 'info'
    },
    error_file: '/home/ubuntu/o4o-platform/logs/api-error.log',
    out_file: '/home/ubuntu/o4o-platform/logs/api-out.log',
    log_file: '/home/ubuntu/o4o-platform/logs/api-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};