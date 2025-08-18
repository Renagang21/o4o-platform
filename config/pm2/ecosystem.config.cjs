module.exports = {
  apps: [{
    name: 'o4o-api-server',
    script: './dist/main.js',
    cwd: '/home/ubuntu/o4o-platform/apps/api-server',
    instances: 'max',
    exec_mode: 'cluster',
    env_file: '.env.production',
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512',
    error_file: '/home/ubuntu/o4o-platform/logs/api-server-error.log',
    out_file: '/home/ubuntu/o4o-platform/logs/api-server-out.log',
    log_file: '/home/ubuntu/o4o-platform/logs/api-server-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 5,
    min_uptime: 10000,
    kill_timeout: 30000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};