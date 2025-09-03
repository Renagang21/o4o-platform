#!/bin/bash

# ============================================
# 웹서버 배포 문제 진단 스크립트
# 사용법: ./scripts/troubleshoot-webserver.sh
# ============================================

echo "🔍 웹서버 배포 문제 진단 시작..."
echo "============================================"

# 1. Git 상태 확인
echo ""
echo "📋 [1] Git 상태 확인"
echo "-------------------"
cd /home/ubuntu/o4o-platform
echo "현재 브랜치: $(git branch --show-current)"
echo "현재 커밋: $(git rev-parse HEAD)"
echo "최근 커밋 3개:"
git log --oneline -3
echo ""
echo "변경된 파일:"
git status --short

# 2. 소스 코드 확인
echo ""
echo "📝 [2] 소스 코드 변경사항 확인"
echo "-----------------------------"
echo "Appearance 메뉴 확인:"
grep -n "외모\|appearance" apps/admin-dashboard/src/config/wordpressMenuFinal.tsx 2>/dev/null | head -3 || echo "❌ 소스에서 찾을 수 없음"

echo ""
echo "Route 정의 확인:"
grep -n "/appearance\|/customize" apps/admin-dashboard/src/App.tsx 2>/dev/null | head -3 || echo "❌ Route를 찾을 수 없음"

# 3. 빌드 상태 확인
echo ""
echo "🔨 [3] 빌드 상태 확인"
echo "-------------------"
if [ -d "apps/admin-dashboard/dist" ]; then
    echo "✅ dist 폴더 존재"
    echo "빌드 시간: $(stat -c %y apps/admin-dashboard/dist/index.html 2>/dev/null | cut -d' ' -f1,2)"
    echo "빌드 파일 수: $(ls -1 apps/admin-dashboard/dist/assets/*.js 2>/dev/null | wc -l) JS files"
    
    echo ""
    echo "빌드된 파일에서 변경사항 확인:"
    grep -l "외모" apps/admin-dashboard/dist/assets/*.js 2>/dev/null | head -1 && echo "✅ '외모' 텍스트 발견" || echo "❌ '외모' 텍스트 없음"
else
    echo "❌ dist 폴더가 없습니다 - 빌드 필요"
fi

# 4. 배포된 파일 확인
echo ""
echo "🌐 [4] 배포된 파일 확인"
echo "----------------------"
if [ -d "/var/www/admin.neture.co.kr" ]; then
    echo "✅ 웹 디렉토리 존재"
    echo "배포 시간: $(stat -c %y /var/www/admin.neture.co.kr/index.html 2>/dev/null | cut -d' ' -f1,2)"
    echo "배포 파일 수: $(ls -1 /var/www/admin.neture.co.kr/assets/*.js 2>/dev/null | wc -l) JS files"
    
    echo ""
    echo "index.html 해시 확인:"
    DEPLOYED_HASH=$(grep -o 'index-[^.]*\.js' /var/www/admin.neture.co.kr/index.html 2>/dev/null | head -1)
    echo "배포된 버전: $DEPLOYED_HASH"
    
    if [ -f "apps/admin-dashboard/dist/index.html" ]; then
        BUILD_HASH=$(grep -o 'index-[^.]*\.js' apps/admin-dashboard/dist/index.html 2>/dev/null | head -1)
        echo "빌드된 버전: $BUILD_HASH"
        
        if [ "$DEPLOYED_HASH" = "$BUILD_HASH" ]; then
            echo "✅ 버전 일치 - 최신 빌드가 배포됨"
        else
            echo "❌ 버전 불일치 - 재배포 필요!"
        fi
    fi
else
    echo "❌ 웹 디렉토리가 없습니다"
fi

# 5. Nginx 상태 확인
echo ""
echo "🔧 [5] Nginx 상태 확인"
echo "--------------------"
sudo systemctl status nginx --no-pager | head -5

echo ""
echo "Nginx 캐시 설정:"
sudo nginx -T 2>/dev/null | grep -A2 "location.*assets\|cache" | head -10 || echo "캐시 설정 없음"

# 6. 서버 응답 확인
echo ""
echo "🌐 [6] 서버 응답 테스트"
echo "---------------------"
echo "HTTP 응답 헤더:"
curl -sI https://admin.neture.co.kr | head -10

echo ""
echo "JS 파일 응답:"
JS_FILE=$(curl -s https://admin.neture.co.kr | grep -o 'index-[^.]*\.js' | head -1)
if [ ! -z "$JS_FILE" ]; then
    echo "메인 JS 파일: $JS_FILE"
    curl -sI "https://admin.neture.co.kr/assets/$JS_FILE" | grep -E "HTTP|Cache|Last-Modified" || echo "JS 파일 접근 실패"
fi

# 7. 캐시 관련 확인
echo ""
echo "💾 [7] 캐시 상태"
echo "--------------"
echo "브라우저 캐시 해결 방법:"
echo "  • Ctrl+Shift+R (강제 새로고침)"
echo "  • 개발자도구 > Network > Disable cache"
echo "  • 시크릿/프라이빗 모드 사용"

# 8. 진단 결과 요약
echo ""
echo "============================================"
echo "📊 진단 결과 요약"
echo "============================================"

ISSUES=0

# Git 동기화 확인
REMOTE_HASH=$(git ls-remote origin main | cut -f1)
LOCAL_HASH=$(git rev-parse HEAD)
if [ "$REMOTE_HASH" != "$LOCAL_HASH" ]; then
    echo "⚠️ Git이 최신 상태가 아님 - git pull 필요"
    ISSUES=$((ISSUES + 1))
fi

# 빌드 필요 확인
if [ ! -d "apps/admin-dashboard/dist" ]; then
    echo "⚠️ 빌드가 필요함"
    ISSUES=$((ISSUES + 1))
elif [ "$DEPLOYED_HASH" != "$BUILD_HASH" ]; then
    echo "⚠️ 빌드는 되었으나 배포 필요"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✅ 모든 검사 통과 - 브라우저 캐시 문제일 가능성이 높음"
else
    echo ""
    echo "🔧 해결 방법:"
    echo "  1. ./scripts/manual-deploy-webserver.sh 실행"
    echo "  2. 브라우저 캐시 삭제"
fi

echo "============================================"