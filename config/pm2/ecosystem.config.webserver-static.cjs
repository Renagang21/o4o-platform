// 웹서버용 PM2 설정 - 정적 파일 서빙 전용
// 빌드는 GitHub Actions에서 처리, 웹서버는 서빙만 담당

module.exports = {
  apps: [
    {
      name: 'o4o-static-server',
      script: 'npx',
      args: 'serve -s /var/www/admin.neture.co.kr -l 5173',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M'
    }
  ]
};

// 주의사항:
// 1. 이 설정은 정적 파일 서빙만 담당합니다
// 2. 빌드는 GitHub Actions에서 처리됩니다
// 3. Nginx를 사용한다면 이 PM2 설정은 불필요합니다