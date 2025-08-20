#!/bin/bash
# 블록 패키지 독립 설치 스크립트

echo "🧩 Setting up block packages independently..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. block-core 설치
echo -e "${YELLOW}Installing block-core...${NC}"
cd packages/block-core
npm install --legacy-peer-deps --no-audit --no-fund
npm run build

# 2. 블록 패키지들 설치
echo -e "${YELLOW}Installing block plugins...${NC}"

cd ../blocks/text-content
echo "  📦 text-content-blocks"
npm install --legacy-peer-deps --no-audit --no-fund
npm run build

cd ../layout-media
echo "  📦 layout-media-blocks"
npm install --legacy-peer-deps --no-audit --no-fund
npm run build

cd ../interactive
echo "  📦 interactive-blocks"
npm install --legacy-peer-deps --no-audit --no-fund
npm run build

cd ../dynamic
echo "  📦 dynamic-blocks"
npm install --legacy-peer-deps --no-audit --no-fund
npm run build

cd ../../..

echo -e "${GREEN}✅ Block packages setup completed!${NC}"