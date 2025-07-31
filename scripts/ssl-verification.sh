#!/bin/bash

# SSL 설정 검증 스크립트

echo "✅ SSL 설정 검증"
echo "==============="

echo -e "\n1. HTTP 접속 테스트"
echo "curl -I http://neture.co.kr"
echo "curl -I http://neture.co.kr:8080"

echo -e "\n2. HTTPS 리디렉션 테스트"
echo "curl -I -L http://neture.co.kr"

echo -e "\n3. HTTPS 직접 접속 테스트"
echo "curl -I https://neture.co.kr"
echo "curl -I https://neture.co.kr:8443"

echo -e "\n4. SSL 인증서 정보 확인"
echo "echo | openssl s_client -servername neture.co.kr -connect neture.co.kr:443 2>/dev/null | openssl x509 -noout -dates"

echo -e "\n5. 모든 서브도메인 테스트"
echo "for domain in neture.co.kr www.neture.co.kr admin.neture.co.kr api.neture.co.kr; do"
echo "  echo \"Testing \$domain...\""
echo "  curl -I https://\$domain"
echo "done"

echo -e "\n6. 대체 포트 테스트"
echo "curl -k -I https://neture.co.kr:8443"
echo "curl -k -I https://admin.neture.co.kr:8444"
echo "curl -k -I https://api.neture.co.kr:8445"