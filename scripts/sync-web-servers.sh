#!/bin/bash

# 웹 서버 동기화 스크립트
REPO_URL="https://github.com/Renagang21/o4o-platform.git"
BASE_DIR="/opt/o4o-web-servers"
BRANCH="main"
WEB_ROOT="/var/www"

# 동기화할 웹 서비스 목록
SERVICES=("main-site" "ecommerce" "forum" "crowdfunding" "signage")

echo "🌐 웹 서버 코드 동기화 시작..."

for SERVICE in "${SERVICES[@]}"; do
    echo "🔄 $SERVICE 동기화 중..."
    
    TARGET_DIR="$BASE_DIR/$SERVICE"
    
    # 디렉토리가 없으면 생성
    if [ ! -d "$TARGET_DIR" ]; then
        echo "📁 새 디렉토리 생성: $TARGET_DIR"
        git clone $REPO_URL $TARGET_DIR
        cd $TARGET_DIR
    else
        echo "📂 기존 디렉토리 사용: $TARGET_DIR"
        cd $TARGET_DIR
        git fetch origin
    fi

    # Sparse checkout 설정
    git config core.sparseCheckout true

    # 해당 서비스 관련 파일만 체크아웃하도록 설정
    cat > .git/info/sparse-checkout << EOF
services/$SERVICE/
scripts/
package.json
.gitignore
EOF

    # 최신 변경사항 가져오기
    git checkout $BRANCH
    git pull origin $BRANCH

    # 변경사항이 있는지 확인
    if [ -d "services/$SERVICE" ]; then
        echo "📦 $SERVICE 의존성 설치 및 빌드 중..."
        cd services/$SERVICE
        
        npm install
        npm run build
        
        # 빌드된 파일을 웹 루트로 복사
        echo "📋 $SERVICE 배포 중..."
        sudo rsync -av --delete dist/ $WEB_ROOT/$SERVICE/
        
        echo "✅ $SERVICE 배포 완료!"
        cd ../..
    else
        echo "⚠️  $SERVICE 디렉토리를 찾을 수 없습니다."
    fi
done

echo "🎉 모든 웹 서버 동기화 완료!"