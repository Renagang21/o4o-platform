#!/bin/bash

# SSL 설정 문제 해결 가이드

echo "🔧 SSL 설정 문제 해결 가이드"
echo "=========================="

echo -e "\n### 일반적인 문제와 해결방법"

echo -e "\n1️⃣ Nginx 설정 오류"
echo "문제: nginx: [emerg] invalid parameter"
echo "해결:"
echo "sudo nginx -t  # 상세 오류 확인"
echo "sudo journalctl -u nginx -n 50  # 로그 확인"

echo -e "\n2️⃣ Let's Encrypt 인증 실패"
echo "문제: Challenge failed for domain"
echo "해결:"
echo "# DNS 확인"
echo "dig neture.co.kr"
echo "# 80번 포트 확인"
echo "sudo netstat -tlnp | grep :80"
echo "# 방화벽 확인"
echo "sudo ufw status"

echo -e "\n3️⃣ SSL 인증서 경로 문제"
echo "문제: cannot load certificate"
echo "해결:"
echo "sudo ls -la /etc/letsencrypt/live/"
echo "sudo certbot certificates"

echo -e "\n4️⃣ 포트 충돌 문제"
echo "문제: bind() to 0.0.0.0:80 failed"
echo "해결:"
echo "sudo lsof -i :80"
echo "sudo systemctl stop apache2  # Apache가 실행 중인 경우"

echo -e "\n5️⃣ 권한 문제"
echo "문제: Permission denied"
echo "해결:"
echo "sudo chown -R www-data:www-data /var/www/"
echo "sudo chmod -R 755 /var/www/"

echo -e "\n### 로그 파일 위치"
echo "Nginx 에러 로그: sudo tail -f /var/log/nginx/error.log"
echo "Nginx 액세스 로그: sudo tail -f /var/log/nginx/access.log"
echo "Let's Encrypt 로그: sudo tail -f /var/log/letsencrypt/letsencrypt.log"

echo -e "\n### 긴급 복구"
echo "# Nginx 설정 복구"
echo "sudo cp -r /etc/nginx.backup.* /etc/nginx"
echo "sudo systemctl restart nginx"
echo ""
echo "# SSL 인증서 제거 후 재발급"
echo "sudo certbot delete --cert-name neture.co.kr"
echo "sudo certbot --nginx -d neture.co.kr"