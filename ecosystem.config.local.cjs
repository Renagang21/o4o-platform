// 로컬 개발 환경용 - 모든 서비스 포함
module.exports = {
  apps: [
    {
      name: 'o4o-api-local',
      script: 'npm',
      args: 'run start:dev',
      cwd: './apps/api-server',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      }
    },
    {
      name: 'o4o-admin-local',
      script: 'npm',
      args: 'run dev:admin',
      cwd: './apps/admin-dashboard',
      env: {
        NODE_ENV: 'development',
        PORT: 5173
      }
    },
    {
      name: 'o4o-storefront-local',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/storefront',
      env: {
        NODE_ENV: 'development',
        PORT: 5174
      }
    }
  ]
};