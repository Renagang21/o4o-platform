// ================================
// PM2 Configuration Template
// ================================
// 사용법: 
// 1. 이 파일을 복사하여 환경에 맞게 수정
// 2. 환경변수는 .env 파일에서 로드
// 3. pm2 start ecosystem.config.[환경].cjs

module.exports = {
  apps: [
    {
      // === 기본 설정 ===
      name: 'app-name',
      script: './dist/main.js',  // 또는 serve 경로
      cwd: './apps/app-directory',
      
      // === 실행 모드 ===
      instances: 1,  // 프로덕션: 2-4, 로컬: 1
      exec_mode: 'fork',  // fork 또는 cluster
      
      // === 환경변수 ===
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      
      // === 메모리 관리 ===
      max_memory_restart: '500M',  // 프로덕션: 1G, 로컬: 300M
      node_args: '--max-old-space-size=512',
      
      // === 로그 설정 ===
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      
      // === 프로세스 관리 ===
      autorestart: true,
      watch: false,  // 개발 환경에서만 true
      max_restarts: 10,
      min_uptime: '10s',
      
      // === 시그널 처리 ===
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 5000,
      shutdown_with_message: true
    }
  ],
  
  // === 배포 설정 (선택적) ===
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:user/repo.git',
      path: '/home/ubuntu/o4o-platform',
      'post-deploy': 'pnpm install && pnpm run build && pm2 reload ecosystem.config.cjs'
    }
  }
};