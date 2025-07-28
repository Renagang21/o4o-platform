module.exports = {
  apps: [
    // API Server
    {
      name: 'api-server',
      script: 'dist/main.js',
      cwd: '/home/ubuntu/o4o-platform/apps/api-server',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/home/ubuntu/logs/api-error.log',
      out_file: '/home/ubuntu/logs/api-out.log',
      merge_logs: true,
      time: true
    },
    
    // Main Site (www.neture.co.kr)
    {
      name: 'o4o-main-site',
      script: 'npx',
      args: 'serve -s dist -l 3000 --cors',
      cwd: '/var/www/neture.co.kr',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/ubuntu/logs/main-site-error.log',
      out_file: '/home/ubuntu/logs/main-site-out.log',
      time: true
    },
    
    // Admin Dashboard (admin.neture.co.kr)
    {
      name: 'o4o-admin-dashboard',
      script: 'npx',
      args: 'serve -s dist -l 3001 --cors --single',
      cwd: '/var/www/admin.neture.co.kr',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/ubuntu/logs/admin-error.log',
      out_file: '/home/ubuntu/logs/admin-out.log',
      time: true
    },
    
    // E-commerce (shop.neture.co.kr)
    {
      name: 'o4o-ecommerce',
      script: 'npx',
      args: 'serve -s dist -l 3002 --cors --single',
      cwd: '/var/www/shop.neture.co.kr',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/ubuntu/logs/shop-error.log',
      out_file: '/home/ubuntu/logs/shop-out.log',
      time: true
    },
    
    // Forum (forum.neture.co.kr)
    {
      name: 'o4o-forum',
      script: 'npx',
      args: 'serve -s dist -l 3003 --cors --single',
      cwd: '/var/www/forum.neture.co.kr',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/ubuntu/logs/forum-error.log',
      out_file: '/home/ubuntu/logs/forum-out.log',
      time: true
    },
    
    // Digital Signage (signage.neture.co.kr)
    {
      name: 'o4o-signage',
      script: 'npx',
      args: 'serve -s dist -l 3004 --cors --single',
      cwd: '/var/www/signage.neture.co.kr',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/ubuntu/logs/signage-error.log',
      out_file: '/home/ubuntu/logs/signage-out.log',
      time: true
    },
    
    // Crowdfunding (funding.neture.co.kr)
    {
      name: 'o4o-funding',
      script: 'npx',
      args: 'serve -s dist -l 3005 --cors --single',
      cwd: '/var/www/funding.neture.co.kr',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/ubuntu/logs/funding-error.log',
      out_file: '/home/ubuntu/logs/funding-out.log',
      time: true
    }
  ]
};