#!/bin/bash

# O4O Platform 서버 진단 및 복구 스크립트
# 사용법: bash diagnose-and-fix.sh

echo "🔍 ===== O4O Platform 서버 진단 시작 ====="
echo "⏰ 진단 시간: $(date)"
echo "🖥️ 서버: $(hostname)"
echo ""

# 1. 기본 시스템 정보
echo "📊 === 시스템 리소스 ==="
echo "CPU 사용률:"
top -bn1 | grep "Cpu(s)" | head -1 || echo "CPU 정보 확인 불가"
echo ""
echo "메모리 사용률:"
free -h || echo "메모리 정보 확인 불가"
echo ""
echo "디스크 사용률:"
df -h / || echo "디스크 정보 확인 불가"
echo ""

# 2. Docker 상태 확인
echo "🐳 === Docker 상태 ==="
if command -v docker >/dev/null 2>&1; then
    echo "Docker 버전: $(docker --version)"
    echo ""
    echo "실행 중인 컨테이너:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "o4o-web-prod 컨테이너 상태:"
    docker ps -f name=o4o-web-prod --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
else
    echo "❌ Docker가 설치되지 않았거나 실행되지 않음"
fi

# 3. 네트워크 포트 확인
echo "🌐 === 포트 상태 ==="
echo "포트 80 (HTTP):"
netstat -tlnp | grep :80 || ss -tlnp | grep :80 || echo "포트 80 리스닝 없음"
echo ""
echo "포트 443 (HTTPS):"
netstat -tlnp | grep :443 || ss -tlnp | grep :443 || echo "포트 443 리스닝 없음"
echo ""

# 4. 웹 서비스 응답 확인
echo "🌍 === 웹 서비스 응답 테스트 ==="
echo "로컬 헬스체크:"
curl -s -o /dev/null -w "HTTP 상태: %{http_code}, 응답시간: %{time_total}s\n" http://localhost/health || echo "로컬 헬스체크 실패"
echo ""
echo "메인 페이지 응답:"
curl -s -o /dev/null -w "HTTP 상태: %{http_code}, 응답시간: %{time_total}s\n" http://localhost/ || echo "메인 페이지 응답 실패"
echo ""

# 5. Docker 컨테이너 상세 진단
echo "📋 === 컨테이너 상세 진단 ==="
if docker ps -q -f name=o4o-web-prod >/dev/null 2>&1; then
    echo "o4o-web-prod 컨테이너가 실행 중입니다."
    echo ""
    echo "컨테이너 로그 (최근 20줄):"
    docker logs --tail 20 o4o-web-prod
    echo ""
    echo "컨테이너 내부 프로세스:"
    docker exec o4o-web-prod ps aux || echo "컨테이너 내부 접근 실패"
    echo ""
else
    echo "❌ o4o-web-prod 컨테이너가 실행되지 않음"
    echo ""
    echo "최근 종료된 컨테이너 확인:"
    docker ps -a -f name=o4o-web-prod --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
    echo ""
fi

# 6. 자동 복구 시도
echo "🔧 === 자동 복구 시도 ==="
echo "1. Docker Compose 서비스 재시작 시도..."

if [ -f "docker-compose.production.yml" ]; then
    echo "docker-compose.production.yml 발견, 웹 서비스 재시작 중..."
    docker-compose -f docker-compose.production.yml restart web-app || echo "재시작 실패"
    echo ""
    
    echo "5초 대기 후 재검사..."
    sleep 5
    
    echo "재시작 후 상태:"
    docker ps -f name=o4o-web-prod --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo "재시작 후 헬스체크:"
    curl -s -o /dev/null -w "HTTP 상태: %{http_code}, 응답시간: %{time_total}s\n" http://localhost/health || echo "헬스체크 여전히 실패"
    echo ""
else
    echo "❌ docker-compose.production.yml 파일을 찾을 수 없음"
    echo "현재 위치: $(pwd)"
    echo "파일 목록:"
    ls -la *.yml 2>/dev/null || echo "yml 파일 없음"
fi

# 7. Git 상태 확인
echo "📂 === Git 저장소 상태 ==="
if [ -d ".git" ]; then
    echo "현재 브랜치: $(git branch --show-current)"
    echo "최신 커밋: $(git log -1 --oneline)"
    echo "작업 디렉토리 상태:"
    git status --porcelain || echo "Git 상태 확인 불가"
else
    echo "❌ Git 저장소가 아님"
fi
echo ""

# 8. 최종 진단 결과
echo "📊 === 최종 진단 결과 ==="
echo "진단 완료 시간: $(date)"

# 간단한 문제 해결 가이드
echo ""
echo "🚀 === 문제 해결 가이드 ==="
echo "1. 컨테이너가 실행되지 않는 경우:"
echo "   docker-compose -f docker-compose.production.yml up -d web-app"
echo ""
echo "2. 이미지를 다시 빌드해야 하는 경우:"
echo "   docker-compose -f docker-compose.production.yml build web-app"
echo "   docker-compose -f docker-compose.production.yml up -d web-app"
echo ""
echo "3. 강제 재배포가 필요한 경우:"
echo "   git pull origin main"
echo "   docker-compose -f docker-compose.production.yml down"
echo "   docker-compose -f docker-compose.production.yml up -d"
echo ""
echo "4. 로그 확인:"
echo "   docker logs -f o4o-web-prod"
echo ""

echo "✅ 진단 완료!"
