#!/bin/bash

# API 서버 진단 스크립트
# 이 스크립트를 서버에서 실행하여 현재 상태를 파악합니다

echo "🔍 O4O API Server Diagnosis Report"
echo "=================================="
echo "Generated at: $(date)"
echo ""

# 1. API 서버 프로세스 상태 확인
echo "📊 1. API 서버 프로세스 상태 확인"
echo "---------------------------------"
echo "PM2 프로세스 목록:"
pm2 list

echo -e "\nPM2 API 서버 상세 정보:"
pm2 describe o4o-api-server || echo "❌ PM2에서 o4o-api-server를 찾을 수 없음"

echo -e "\n최근 PM2 로그 (20줄):"
pm2 logs o4o-api-server --lines 20 --nostream || echo "❌ 로그를 가져올 수 없음"

echo -e "\n포트 4000 리스닝 상태:"
sudo netstat -tlnp | grep :4000 || echo "❌ 포트 4000이 리스닝되지 않음"

echo -e "\n프로세스 확인:"
ps aux | grep -E "node.*main.js|node.*api-server" | grep -v grep || echo "❌ Node.js 프로세스를 찾을 수 없음"

# 2. 로컬 API 응답 테스트
echo -e "\n\n🌐 2. 로컬 API 응답 테스트"
echo "-------------------------"
echo "Health 엔드포인트 테스트:"
curl -v http://localhost:4000/api/health 2>&1 || echo "❌ 로컬 health 엔드포인트 접근 실패"

echo -e "\n\n기본 엔드포인트 테스트:"
curl -v http://localhost:4000/ 2>&1 || echo "❌ 로컬 기본 엔드포인트 접근 실패"

echo -e "\n\nAuth health 테스트:"
curl -v http://localhost:4000/api/auth/health 2>&1 || echo "❌ Auth health 엔드포인트 접근 실패"

# 3. SSL 및 Nginx 설정 진단
echo -e "\n\n🔐 3. SSL 및 Nginx 설정 진단"
echo "----------------------------"
echo "SSL 인증서 확인:"
echo | openssl s_client -connect api.neture.co.kr:443 -servername api.neture.co.kr 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|Issuer:|Not Before:|Not After:" || echo "❌ SSL 인증서 확인 실패"

echo -e "\nNginx 설정 문법 검사:"
sudo nginx -t

echo -e "\nNginx 서비스 상태:"
sudo systemctl status nginx | head -10

echo -e "\nNginx api.neture.co.kr 설정 파일:"
if [ -f /etc/nginx/sites-available/api.neture.co.kr ]; then
    echo "📄 /etc/nginx/sites-available/api.neture.co.kr 내용:"
    sudo cat /etc/nginx/sites-available/api.neture.co.kr
else
    echo "❌ /etc/nginx/sites-available/api.neture.co.kr 파일이 없음"
fi

echo -e "\nNginx 활성화된 사이트:"
ls -la /etc/nginx/sites-enabled/

# 4. 데이터베이스 연결 진단
echo -e "\n\n💾 4. 데이터베이스 연결 진단"
echo "---------------------------"
echo "PostgreSQL 서비스 상태:"
sudo systemctl status postgresql | head -10

echo -e "\nPostgreSQL 버전:"
psql --version

echo -e "\n환경변수 확인 (민감정보 마스킹):"
if [ -f /home/ubuntu/o4o-platform/apps/api-server/.env.production ]; then
    echo "📄 .env.production 파일 존재함"
    grep -E "^DB_" /home/ubuntu/o4o-platform/apps/api-server/.env.production | sed 's/=.*/=***/'
else
    echo "❌ .env.production 파일이 없음"
fi

echo -e "\nPostgreSQL 연결 테스트:"
if [ -f /home/ubuntu/o4o-platform/apps/api-server/.env.production ]; then
    source /home/ubuntu/o4o-platform/apps/api-server/.env.production
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -c "SELECT version();" 2>&1 || echo "❌ PostgreSQL 연결 실패"
fi

echo -e "\nPostgreSQL 사용자 목록:"
sudo -u postgres psql -c "\du" 2>/dev/null || echo "❌ PostgreSQL 사용자 목록 조회 실패"

echo -e "\nPostgreSQL 데이터베이스 목록:"
sudo -u postgres psql -c "\l" 2>/dev/null || echo "❌ PostgreSQL 데이터베이스 목록 조회 실패"

# 추가 진단 정보
echo -e "\n\n🔧 추가 진단 정보"
echo "----------------"
echo "시스템 메모리 상태:"
free -h

echo -e "\n디스크 사용량:"
df -h | grep -E "^/dev|Filesystem"

echo -e "\n최근 시스템 로그 (에러만):"
sudo journalctl -p err -n 20 --no-pager

echo -e "\n\n✅ 진단 완료!"
echo "이 결과를 Claude Code에게 전달해주세요."