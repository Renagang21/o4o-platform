module.exports = {
  apps: [{
    name: 'o4o-api-production',
    script: './apps/api-server/dist/main.js',
    cwd: '/home/sohae21/o4o-platform',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 4000,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_NAME: 'o4o_platform',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'localpassword',
      JWT_SECRET: 'dev-jwt-secret-change-in-production',
      JWT_REFRESH_SECRET: 'dev-refresh-secret-change-in-production',
      EMAIL_SERVICE_ENABLED: 'false',
      CORS_ORIGIN: 'https://neture.co.kr,https://admin.neture.co.kr,https://www.neture.co.kr,https://shop.neture.co.kr,https://forum.neture.co.kr',
      FRONTEND_URL: 'https://neture.co.kr',
      SESSION_SECRET: 'o4o-platform-session-secret-dev',
      REDIS_ENABLED: 'false',
      SESSION_SYNC_ENABLED: 'false'
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};