#!/bin/bash

# SSL 설정 명령어 모음
# 복사해서 사용하세요

echo "📋 SSL 설정 명령어 가이드"
echo "======================="

echo -e "\n### 1. Nginx 설치"
echo "sudo apt update"
echo "sudo apt install nginx -y"
echo "sudo systemctl enable nginx"

echo -e "\n### 2. Certbot 설치"
echo "sudo apt install certbot python3-certbot-nginx -y"

echo -e "\n### 3. 방화벽 설정"
echo "sudo ufw allow 22/tcp"
echo "sudo ufw allow 80/tcp"
echo "sudo ufw allow 443/tcp"
echo "sudo ufw allow 8080/tcp"
echo "sudo ufw allow 8443/tcp"
echo "sudo ufw allow 8444/tcp"
echo "sudo ufw allow 8445/tcp"
echo "sudo ufw --force enable"

echo -e "\n### 4. Nginx 사이트 설정 생성"
echo "# 메인 사이트"
echo "sudo nano /etc/nginx/sites-available/neture"
echo ""
echo "# 관리자 사이트"
echo "sudo nano /etc/nginx/sites-available/admin-neture"
echo ""
echo "# API 서버"
echo "sudo nano /etc/nginx/sites-available/api-neture"

echo -e "\n### 5. 사이트 활성화"
echo "sudo ln -s /etc/nginx/sites-available/neture /etc/nginx/sites-enabled/"
echo "sudo ln -s /etc/nginx/sites-available/admin-neture /etc/nginx/sites-enabled/"
echo "sudo ln -s /etc/nginx/sites-available/api-neture /etc/nginx/sites-enabled/"
echo "sudo rm -f /etc/nginx/sites-enabled/default"

echo -e "\n### 6. Nginx 설정 테스트"
echo "sudo nginx -t"
echo "sudo systemctl restart nginx"

echo -e "\n### 7. SSL 인증서 발급"
echo "# 대화형 모드"
echo "sudo certbot --nginx -d neture.co.kr -d www.neture.co.kr -d admin.neture.co.kr -d api.neture.co.kr"
echo ""
echo "# 자동 모드 (이메일 변경 필요)"
echo "sudo certbot --nginx -d neture.co.kr -d www.neture.co.kr -d admin.neture.co.kr -d api.neture.co.kr --non-interactive --agree-tos -m admin@neture.co.kr"

echo -e "\n### 8. 자동 갱신 테스트"
echo "sudo certbot renew --dry-run"

echo -e "\n### 9. 서비스 재시작"
echo "pm2 restart all"
echo "pm2 save"