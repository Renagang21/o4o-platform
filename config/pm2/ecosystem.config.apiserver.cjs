module.exports = {
  apps: [
    {
      name: 'o4o-api',
      script: './dist/main.js',
      cwd: './apps/api-server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 5000
    }
    // 프론트엔드 앱들은 의도적으로 제외 (별도 서버에서 실행)
  ]
};