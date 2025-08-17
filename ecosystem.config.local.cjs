// ================================
// PM2 Configuration - Local Development
// ecosystem.config.local.cjs
// ================================
// 로컬 개발 환경용 PM2 설정
// 사용법: pm2 start ecosystem.config.local.cjs

require('dotenv').config({ path: '.env.local' });

module.exports = {
  apps: [
    // API Server
    {
      name: 'o4o-api-local',
      script: './dist/main.js',
      cwd: './apps/api-server',
      // 개발 모드에서는 watch 활성화
      watch: process.env.NODE_ENV === 'development' ? ['./dist'] : false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      // 로컬은 단일 인스턴스
      instances: 1,
      exec_mode: 'fork',
      // 환경변수 - .env.local에서 로드
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3001,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        JWT_SECRET: process.env.JWT_SECRET
      },
      // 메모리 설정 (개발용 - 낮게 설정)
      max_memory_restart: '300M',
      node_args: '--max-old-space-size=256',
      // 로그 설정 (로컬 디렉토리)
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      time: true,
      // 재시작 설정 (개발용)
      autorestart: true,
      max_restarts: 3,
      min_uptime: 5000,
      kill_timeout: 5000
    },
    
    // Admin Dashboard
    {
      name: 'o4o-admin-local',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/admin-dashboard',
      // Vite dev server는 watch 필요 없음
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5173,
        VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3001/api',
        VITE_USE_MOCK: process.env.VITE_USE_MOCK || 'false'
      },
      // Vite는 자체 메모리 관리
      max_memory_restart: '500M',
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      merge_logs: true
    },
    
    // Main Site (기존 storefront를 main-site로 수정)
    {
      name: 'o4o-main-local',
      script: 'npm',
      args: 'run dev',
      cwd: './apps/main-site',
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5174,
        VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3001/api'
      },
      max_memory_restart: '500M',
      error_file: './logs/main-error.log',
      out_file: './logs/main-out.log',
      merge_logs: true
    }
  ],

  // PM2 Deploy Configuration (로컬에서는 사용 안 함)
  deploy: {
    // 로컬 개발에서는 배포 설정 불필요
  }
};