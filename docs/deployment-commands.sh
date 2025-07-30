#!/bin/bash

# O4O API Server 배포 명령어 모음
# 서버에서 실행할 명령어들을 정리했습니다

echo "🚀 O4O API Server 배포 스크립트"
echo "================================"

# 1. Nginx 설정
echo -e "\n📝 1. Nginx 설정 파일 생성"
echo "sudo nano /etc/nginx/sites-available/api.neture.co.kr"
echo "# nginx-config-template.conf 내용을 복사하여 붙여넣기"

echo -e "\n🔗 2. Nginx 사이트 활성화"
echo "sudo ln -s /etc/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-enabled/"
echo "sudo nginx -t"
echo "sudo systemctl reload nginx"

# 2. SSL 인증서 발급
echo -e "\n🔐 3. SSL 인증서 발급 (Let's Encrypt)"
echo "sudo apt update"
echo "sudo apt install certbot python3-certbot-nginx -y"
echo "sudo certbot --nginx -d api.neture.co.kr"

# 3. 환경변수 설정
echo -e "\n🔧 4. 프로덕션 환경변수 설정"
echo "cd /home/ubuntu/o4o-platform/apps/api-server"
echo "cp .env .env.production"
echo "nano .env.production"
echo "# 다음 값들을 실제 값으로 변경:"
echo "# NODE_ENV=production"
echo "# JWT_SECRET=[실제 시크릿 키 생성: openssl rand -hex 32]"
echo "# JWT_REFRESH_SECRET=[실제 리프레시 키 생성: openssl rand -hex 32]"
echo "# CORS_ORIGIN=https://admin.neture.co.kr,https://www.neture.co.kr"

# 4. 시스템 환경변수 설정 (PM2용)
echo -e "\n🌍 5. 시스템 환경변수 설정"
echo "sudo nano /etc/environment"
echo "# 다음 라인 추가:"
echo 'JWT_SECRET="your-generated-secret"'
echo 'JWT_REFRESH_SECRET="your-generated-refresh-secret"'
echo "# 저장 후:"
echo "source /etc/environment"

# 5. PM2 재시작
echo -e "\n♻️ 6. PM2 재시작"
echo "cd /home/ubuntu/o4o-platform"
echo "pm2 delete api-server"
echo "pm2 start deployment/pm2/ecosystem.config.js --only api-server"
echo "pm2 save"
echo "pm2 startup"

# 6. 방화벽 설정
echo -e "\n🔥 7. 방화벽 설정"
echo "sudo ufw allow 22/tcp    # SSH"
echo "sudo ufw allow 80/tcp    # HTTP"
echo "sudo ufw allow 443/tcp   # HTTPS"
echo "sudo ufw deny 4000/tcp   # API 포트 차단"
echo "sudo ufw --force enable"

# 7. 테스트
echo -e "\n✅ 8. 배포 확인"
echo "# 로컬 테스트"
echo "curl http://localhost:4000/api/health"
echo ""
echo "# 외부 테스트"
echo "curl https://api.neture.co.kr/api/health"
echo ""
echo "# PM2 로그 확인"
echo "pm2 logs api-server --lines 50"

echo -e "\n📌 추가 디버깅 명령어"
echo "# Nginx 에러 로그"
echo "sudo tail -f /var/log/nginx/error.log"
echo ""
echo "# API 서버 에러 로그"
echo "sudo tail -f /var/log/nginx/api.neture.co.kr.error.log"
echo ""
echo "# 포트 확인"
echo "sudo netstat -tlnp | grep -E ':80|:443|:4000'"
echo ""
echo "# DNS 확인"
echo "nslookup api.neture.co.kr"

echo -e "\n🎯 완료!"
echo "위 명령어들을 순서대로 실행하면 배포가 완료됩니다."