module.exports = {
  apps: [
    {
      name: 'o4o-admin',
      script: 'npm',
      args: 'run dev:admin',
      cwd: './apps/admin-dashboard',
      env: {
        NODE_ENV: 'production',
        PORT: 5173
      }
    },
    {
      name: 'o4o-storefront',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/storefront',
      env: {
        NODE_ENV: 'production',
        PORT: 5174
      }
    }
    // api-server는 의도적으로 제외 (별도 서버에서 실행)
  ]
};