#!/bin/bash

# O4O Platform 운영 환경 테스트 스크립트
# 429 에러 해결 및 성능 개선 검증

echo "🔍 O4O Platform 운영 환경 테스트 시작..."
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 운영 환경 URL
ADMIN_URL="https://admin.neture.co.kr"
API_URL="https://api.neture.co.kr"

# 테스트 결과 저장 디렉토리
RESULT_DIR="./test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p $RESULT_DIR

echo -e "${BLUE}📁 테스트 결과 저장 위치: $RESULT_DIR${NC}"
echo ""

# 1. API 서버 헬스체크
echo -e "${YELLOW}1. API 서버 헬스체크...${NC}"
curl -s -o "$RESULT_DIR/api-health.json" -w "HTTP Status: %{http_code}\n" "$API_URL/api/health" | tee "$RESULT_DIR/api-health-status.txt"
echo ""

# 2. Admin Dashboard 접근성 테스트 (인증 없이)
echo -e "${YELLOW}2. Admin Dashboard 접근성 테스트 (인증 없이)...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$ADMIN_URL")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${RED}❌ 경고: 인증 없이 대시보드 접근 가능 (HTTP $RESPONSE)${NC}"
else
    echo -e "${GREEN}✅ 인증 없이 접근 차단됨 (HTTP $RESPONSE)${NC}"
fi
echo ""

# 3. SSO 세션 체크 API Rate Limit 테스트
echo -e "${YELLOW}3. SSO 세션 체크 API Rate Limit 테스트...${NC}"
echo "5분간 30초마다 요청 (총 10회) - 429 에러 발생 여부 확인"

ERROR_COUNT=0
SUCCESS_COUNT=0

for i in {1..10}; do
    echo -n "요청 $i/10: "
    RESPONSE=$(curl -s -o "$RESULT_DIR/sso-check-$i.json" -w "%{http_code}" \
        -H "Cookie: o4o_auth_token=test-token" \
        "$API_URL/api/v1/auth/sso/check")
    
    if [ "$RESPONSE" = "429" ]; then
        echo -e "${RED}429 Error${NC}"
        ((ERROR_COUNT++))
    else
        echo -e "${GREEN}$RESPONSE OK${NC}"
        ((SUCCESS_COUNT++))
    fi
    
    if [ $i -lt 10 ]; then
        sleep 30
    fi
done

echo ""
echo -e "결과: 성공 ${GREEN}$SUCCESS_COUNT${NC}회, 429 에러 ${RED}$ERROR_COUNT${NC}회"
echo ""

# 4. API 응답 시간 측정
echo -e "${YELLOW}4. API 응답 시간 측정...${NC}"
echo "주요 엔드포인트 응답 시간:"

# 측정할 엔드포인트 목록
ENDPOINTS=(
    "/api/health"
    "/api/v1/dashboard/overview"
    "/api/v1/users"
    "/api/v1/products"
)

for endpoint in "${ENDPOINTS[@]}"; do
    TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL$endpoint")
    TIME_MS=$(echo "$TIME * 1000" | bc)
    
    printf "%-35s: " "$endpoint"
    if (( $(echo "$TIME_MS < 200" | bc -l) )); then
        echo -e "${GREEN}${TIME_MS}ms ✅${NC}"
    elif (( $(echo "$TIME_MS < 1000" | bc -l) )); then
        echo -e "${YELLOW}${TIME_MS}ms ⚠️${NC}"
    else
        echo -e "${RED}${TIME_MS}ms ❌${NC}"
    fi
done
echo ""

# 5. 브라우저 콘솔 에러 체크 가이드
echo -e "${YELLOW}5. 브라우저 테스트 가이드${NC}"
echo "다음 항목을 브라우저에서 직접 확인해주세요:"
echo ""
echo "1) Chrome 개발자 도구 열기 (F12)"
echo "2) $ADMIN_URL 접속"
echo "3) Console 탭 확인:"
echo "   - 429 에러 없음 ✓"
echo "   - Hydration 에러 없음 ✓"
echo "   - JavaScript 에러 없음 ✓"
echo "4) Network 탭 확인:"
echo "   - /v1/auth/sso/check 호출 간격: 5분 ✓"
echo "   - 중복 API 호출 없음 ✓"
echo ""

# 6. 테스트 요약
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}테스트 요약${NC}"
echo -e "${BLUE}================================================${NC}"

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 429 에러: 해결됨${NC}"
else
    echo -e "${RED}❌ 429 에러: $ERROR_COUNT 회 발생${NC}"
fi

echo ""
echo -e "${GREEN}테스트 완료! 결과는 $RESULT_DIR 에 저장되었습니다.${NC}"