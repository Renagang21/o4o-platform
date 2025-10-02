#!/bin/bash

# GitHub Secrets 설정 가이드 스크립트
# GitHub Actions 자동 배포를 위한 SSH 키 설정 안내

set -e

echo "🔐 GitHub Actions 자동 배포 설정 가이드"
echo "======================================="
echo ""
echo "이 스크립트는 GitHub Secrets 설정 방법을 안내합니다."
echo ""

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 필요한 GitHub Secrets:${NC}"
echo "  1. API_SERVER_SSH_KEY - API 서버 접속용 SSH 키"
echo "  2. WEB_SERVER_SSH_KEY - 웹 서버 접속용 SSH 키"
echo ""

echo -e "${YELLOW}🔑 SSH 키 확인 및 생성:${NC}"
echo ""

# API 서버 SSH 키 확인
echo "1. API 서버 (ubuntu@43.202.242.215) SSH 키:"
if [ -f "$HOME/.ssh/id_rsa" ]; then
    echo -e "${GREEN}  ✓ 기본 SSH 키 발견: ~/.ssh/id_rsa${NC}"
    echo "  다음 명령으로 내용 복사:"
    echo "  cat ~/.ssh/id_rsa"
else
    echo -e "${RED}  ✗ 기본 SSH 키가 없습니다${NC}"
    echo "  새로운 키를 생성하려면:"
    echo "  ssh-keygen -t rsa -b 4096 -f ~/.ssh/o4o_api_key"
fi
echo ""

# 웹 서버 SSH 키 확인
echo "2. 웹 서버 (sohae21@13.125.144.8) SSH 키:"
if [ -f "$HOME/.ssh/id_rsa" ]; then
    echo -e "${GREEN}  ✓ 기본 SSH 키 발견: ~/.ssh/id_rsa${NC}"
    echo "  다음 명령으로 내용 복사:"
    echo "  cat ~/.ssh/id_rsa"
else
    echo -e "${RED}  ✗ 기본 SSH 키가 없습니다${NC}"
    echo "  새로운 키를 생성하려면:"
    echo "  ssh-keygen -t rsa -b 4096 -f ~/.ssh/o4o_web_key"
fi
echo ""

echo -e "${BLUE}🌐 GitHub에서 Secrets 설정하기:${NC}"
echo ""
echo "1. GitHub 리포지토리로 이동"
echo "   https://github.com/[your-username]/o4o-platform"
echo ""
echo "2. Settings → Secrets and variables → Actions 클릭"
echo ""
echo "3. 'New repository secret' 버튼 클릭"
echo ""
echo "4. 각 Secret 추가:"
echo "   ${YELLOW}API_SERVER_SSH_KEY:${NC}"
echo "   - Name: API_SERVER_SSH_KEY"
echo "   - Value: SSH 개인키 전체 내용 (-----BEGIN RSA PRIVATE KEY----- 포함)"
echo ""
echo "   ${YELLOW}WEB_SERVER_SSH_KEY:${NC}"
echo "   - Name: WEB_SERVER_SSH_KEY"
echo "   - Value: SSH 개인키 전체 내용 (-----BEGIN RSA PRIVATE KEY----- 포함)"
echo ""

echo -e "${GREEN}✅ 설정 완료 후:${NC}"
echo "1. main 브랜치에 push하면 자동 배포가 시작됩니다"
echo "2. GitHub Actions 탭에서 배포 상태를 확인할 수 있습니다"
echo "3. 수동 배포는 Actions 탭에서 'Run workflow' 버튼으로 가능합니다"
echo ""

echo -e "${YELLOW}⚠️  주의사항:${NC}"
echo "- SSH 키는 절대 코드에 직접 포함시키지 마세요"
echo "- GitHub Secrets는 한 번 설정하면 값을 볼 수 없습니다"
echo "- 키를 변경하려면 Secret을 삭제하고 다시 생성해야 합니다"
echo ""

echo "📝 현재 GitHub Actions 워크플로우 파일:"
echo "   .github/workflows/deploy.yml"
echo ""
echo "자세한 내용은 DEPLOYMENT_GUIDE.md를 참조하세요."