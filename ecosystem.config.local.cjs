module.exports = {
  apps: [
    {
      name: 'o4o-api-local',
      script: './apps/api-server/dist/main.js',
      cwd: '/home/user/o4o-platform',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USERNAME: 'postgres',
        DB_PASSWORD: 'localpassword',
        DB_NAME: 'o4o_dev'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'o4o-admin-local',
      script: 'npx',
      args: 'serve -s apps/admin-dashboard/dist -l 5173',
      cwd: '/home/user/o4o-platform',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};