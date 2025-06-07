#!/bin/bash

# 색상 설정
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# 헬스체크 함수
check_health() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "Checking health of $service..."
    
    while [ $attempt -le $max_attempts ]; do
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
        
        if [ "$response" = "200" ]; then
            echo -e "${GREEN}✓ $service is healthy${NC}"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts: $service not ready yet..."
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo -e "${RED}✗ $service health check failed${NC}"
    return 1
}

# 인프라 서비스 시작
echo "Starting infrastructure services..."
docker-compose up -d postgres redis
sleep 5

# 애플리케이션 서비스 시작
echo "Starting application services..."
docker-compose up -d common-core ai-services rpa-services o4o-platform

# 각 서비스 헬스체크
check_health "common-core" 3000
check_health "ai-services" 3001
check_health "rpa-services" 3002
check_health "o4o-platform" 3003

# 서비스 간 통신 테스트
echo "Testing inter-service communication..."

# AI 서비스 -> RPA 서비스 테스트
ai_to_rpa=$(curl -s -X POST http://localhost:3001/api/v1/ai/tasks \
  -H "Content-Type: application/json" \
  -d '{"type": "test", "target": "rpa"}')

if [[ $ai_to_rpa == *"success"* ]]; then
    echo -e "${GREEN}✓ AI -> RPA communication successful${NC}"
else
    echo -e "${RED}✗ AI -> RPA communication failed${NC}"
fi

# O4O 플랫폼 -> AI 서비스 테스트
o4o_to_ai=$(curl -s -X POST http://localhost:3003/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"items": ["test"], "customerId": "test"}')

if [[ $o4o_to_ai == *"created"* ]]; then
    echo -e "${GREEN}✓ O4O -> AI communication successful${NC}"
else
    echo -e "${RED}✗ O4O -> AI communication failed${NC}"
fi

echo "Local environment test completed!" 