#!/bin/bash

# SSH 키를 사용한 자동 배포 스크립트
set -e

echo "🚀 O4O Platform SSH 자동 배포"
echo "=============================="
echo ""

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# SSH 키 경로 설정
SSH_KEY_PATH=""
TARGET_SERVER=""
TARGET_USER=""

# 함수: 도움말 표시
show_help() {
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  -a, --api       API 서버에 배포 (ubuntu@43.202.242.215)"
    echo "  -w, --web       웹 서버에 배포 (sohae21@13.125.144.8)"
    echo "  -k, --key PATH  SSH 키 파일 경로 지정"
    echo "  -h, --help      이 도움말 표시"
    echo ""
    echo "예제:"
    echo "  $0 --api --key ~/.ssh/api_key"
    echo "  $0 --web --key ~/.ssh/web_key"
    exit 0
}

# 함수: API 서버 배포
deploy_api() {
    echo -e "${BLUE}🔧 API 서버 배포 시작...${NC}"
    echo "서버: ubuntu@43.202.242.215"
    
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ubuntu@43.202.242.215 << 'EOF'
        set -e
        echo "📥 최신 코드 가져오기..."
        cd /home/ubuntu/o4o-platform
        git pull origin main
        
        echo "📦 의존성 설치..."
        cd apps/api-server
        npm install
        
        echo "🔨 빌드 시작..."
        npm run build
        
        echo "♻️ PM2 재시작..."
        pm2 restart o4o-api || pm2 start dist/main.js --name o4o-api
        
        echo "✅ API 서버 배포 완료!"
        pm2 status o4o-api
EOF
    
    echo -e "${GREEN}✅ API 서버 배포 성공!${NC}"
    echo "테스트: curl https://api.neture.co.kr/api/v1/users/roles -H 'Authorization: Bearer TOKEN'"
}

# 함수: 웹 서버 배포
deploy_web() {
    echo -e "${BLUE}🌐 웹 서버 배포 시작...${NC}"
    echo "서버: ubuntu@13.125.144.8"
    
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no ubuntu@13.125.144.8 << 'EOF'
        set -e
        echo "📥 최신 코드 가져오기..."
        cd /home/ubuntu/o4o-platform
        git pull origin main
        
        echo "📦 의존성 설치..."
        npm install
        
        echo "🔨 Admin Dashboard 빌드..."
        npm run build:admin
        
        echo "✅ 웹 서버 배포 완료!"
EOF
    
    echo -e "${GREEN}✅ Admin Dashboard 배포 성공!${NC}"
    echo "URL: https://admin.neture.co.kr"
}

# 명령행 인자 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--api)
            TARGET_SERVER="api"
            shift
            ;;
        -w|--web)
            TARGET_SERVER="web"
            shift
            ;;
        -k|--key)
            SSH_KEY_PATH="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo -e "${RED}알 수 없는 옵션: $1${NC}"
            show_help
            ;;
    esac
done

# 입력 검증
if [ -z "$TARGET_SERVER" ]; then
    echo -e "${RED}❌ 에러: 대상 서버를 지정하세요 (--api 또는 --web)${NC}"
    show_help
fi

if [ -z "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ 에러: SSH 키 경로를 지정하세요 (--key PATH)${NC}"
    show_help
fi

if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ 에러: SSH 키 파일을 찾을 수 없습니다: $SSH_KEY_PATH${NC}"
    exit 1
fi

# SSH 키 권한 설정
chmod 600 "$SSH_KEY_PATH"

# 배포 실행
case $TARGET_SERVER in
    api)
        deploy_api
        ;;
    web)
        deploy_web
        ;;
esac

echo ""
echo -e "${GREEN}🎉 배포가 완료되었습니다!${NC}"