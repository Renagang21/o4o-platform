/**
 * O4O Platform 통합 PM2 설정
 * 모든 서비스를 위한 표준화된 설정
 */

const os = require('os');

// 환경별 설정
const environments = {
  development: {
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    log_level: 'debug'
  },
  production: {
    instances: 'max',
    exec_mode: 'cluster', 
    max_memory_restart: '2G',
    log_level: 'info'
  }
};

const currentEnv = process.env.NODE_ENV || 'development';
const envConfig = environments[currentEnv];

module.exports = {
  apps: [
    {
      name: 'o4o-api-server',
      script: './apps/api-server/dist/main.js',
      cwd: process.env.PWD || '/home/ubuntu/o4o-platform',
      
      // 환경별 동적 설정
      instances: envConfig.instances,
      exec_mode: envConfig.exec_mode,
      max_memory_restart: envConfig.max_memory_restart,
      
      // 환경 변수
      env: {
        NODE_ENV: 'development',
        SERVER_TYPE: 'apiserver',
        PORT: process.env.PORT || 3001,
        
        // 데이터베이스 설정
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USERNAME: process.env.DB_USERNAME,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        
        // 보안 설정
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET,
        
        // CORS 설정
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://admin.neture.co.kr,https://neture.co.kr',
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || '.neture.co.kr',
        
        // Redis 설정 (선택적)
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        
        // 업로드 설정
        UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
        
        // 디버그 플래그
        DEBUG_CORS: process.env.DEBUG_CORS || 'false'
      },
      
      env_production: {
        NODE_ENV: 'production',
        SERVER_TYPE: 'apiserver',
        PORT: process.env.PORT || 3001,
        
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT || 5432,
        DB_USERNAME: process.env.DB_USERNAME,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET,
        
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
        
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        
        UPLOAD_DIR: process.env.UPLOAD_DIR,
        DEBUG_CORS: 'false'
      },
      
      // PM2 설정
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs', '.git'],
      
      // 로깅 설정
      log_file: `/var/log/pm2/o4o-api-server-combined.log`,
      error_file: `/var/log/pm2/o4o-api-server-error.log`,
      out_file: `/var/log/pm2/o4o-api-server-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 재시작 설정
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Node.js 설정
      node_args: '--max-old-space-size=2048',
      
      // 헬스체크
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // 모니터링
      instance_var: 'INSTANCE_ID',
      pmx: true,
      
      // 배포 후 실행
      post_deploy: 'pnpm run migration:run'
    }
  ],
  
  // 배포 설정
  deploy: {
    production: {
      user: process.env.SSH_USER || 'ubuntu',
      host: process.env.SSH_HOST || 'api.neture.co.kr',
      ref: 'origin/main',
      repo: 'git@github.com:Renagang21/o4o-platform.git',
      path: '/home/ubuntu/o4o-platform',
      'pre-deploy-local': '',
      'post-deploy': [
        'pnpm install --frozen-lockfile',
        'pnpm run build:packages',
        'cd apps/api-server',
        'pnpm run build',
        'pnpm run migration:run',
        'pm2 reload ecosystem.config.unified.cjs --env production'
      ].join(' && '),
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    },
    
    development: {
      user: process.env.SSH_USER || 'ubuntu',
      host: process.env.SSH_HOST || 'localhost',
      ref: 'origin/develop',
      repo: 'git@github.com:Renagang21/o4o-platform.git',
      path: '/home/ubuntu/o4o-platform-dev',
      'post-deploy': [
        'pnpm install',
        'pnpm run build:packages',
        'cd apps/api-server',
        'pnpm run build',
        'pm2 reload ecosystem.config.unified.cjs --env development'
      ].join(' && '),
      env: {
        NODE_ENV: 'development'
      }
    }
  }
};