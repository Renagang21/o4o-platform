  module.exports = {
    apps: [{
      name: 'api-server',
      script: './dist/main.js',
      cwd: '/home/user/o4o-platform/apps/api-server',
      instances: 'max',
      exec_mode: 'cluster',
      env_file: '.env.production',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      error_file: '/home/user/o4o-platform/logs/api-server-error.log',
      out_file: '/home/user/o4o-platform/logs/api-server-out.log',
      log_file: '/home/user/o4o-platform/logs/api-server-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 30000,
      wait_ready: true,
      listen_timeout: 10000,
      health_check_grace_period: 30000
    }]
  };
