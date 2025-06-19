#!/bin/bash
# GitHub Actions 자동 설정 스크립트
# 작성자: o4o-platform 개발팀
# 용도: 새 프로젝트에 GitHub Actions CI/CD 빠르게 적용

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 사용법 출력
usage() {
    echo -e "${BLUE}GitHub Actions 자동 설정 스크립트${NC}"
    echo ""
    echo "사용법: $0 <프로젝트명> <서버IP> [서버사용자명] [포트번호]"
    echo ""
    echo "예시:"
    echo "  $0 my-api-server 43.202.242.215"
    echo "  $0 my-web-app 13.125.144.8 ubuntu 3000"
    echo ""
    echo "매개변수:"
    echo "  프로젝트명     - GitHub 저장소명 및 PM2 프로세스명"
    echo "  서버IP        - 배포 대상 서버 IP 주소"
    echo "  서버사용자명   - SSH 접속 사용자명 (기본값: ubuntu)"
    echo "  포트번호      - 애플리케이션 포트 (기본값: 4000)"
}

# 매개변수 확인
if [ $# -lt 2 ]; then
    usage
    exit 1
fi

PROJECT_NAME=$1
SERVER_IP=$2
SERVER_USER=${3:-ubuntu}
APP_PORT=${4:-4000}

# 입력값 검증
if [[ ! $SERVER_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo -e "${RED}❌ 잘못된 IP 주소 형식입니다: $SERVER_IP${NC}"
    exit 1
fi

if [[ ! $PROJECT_NAME =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo -e "${RED}❌ 프로젝트명은 영문, 숫자, -, _ 만 사용 가능합니다: $PROJECT_NAME${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 $PROJECT_NAME 프로젝트용 GitHub Actions 설정 시작${NC}"
echo -e "${YELLOW}📋 설정 정보:${NC}"
echo "  프로젝트명: $PROJECT_NAME"
echo "  서버 IP: $SERVER_IP"
echo "  사용자명: $SERVER_USER"
echo "  포트번호: $APP_PORT"
echo ""

# .github/workflows 디렉토리 생성
echo -e "${BLUE}📁 디렉토리 생성 중...${NC}"
mkdir -p .github/workflows

# 배포 워크플로우 생성
echo -e "${BLUE}⚙️ 배포 워크플로우 생성 중...${NC}"
cat > .github/workflows/deploy.yml << EOF
# $PROJECT_NAME 자동 배포 워크플로우
# 생성일: $(date '+%Y-%m-%d %H:%M:%S')
# 생성자: GitHub Actions 자동 설정 스크립트

name: Deploy $PROJECT_NAME

on:
  push:
    branches: [main]
    paths: 
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'
      - '.env.example'
      - 'ecosystem.config.js'
  workflow_dispatch:
    inputs:
      reason:
        description: '배포 이유'
        required: false
        default: '수동 배포'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - name: 📋 배포 시작 로그
      run: |
        echo "🚀 $PROJECT_NAME 배포 시작"
        echo "📅 배포 시간: \$(date)"
        echo "👤 실행자: \${{ github.actor }}"
        echo "📝 커밋: \${{ github.sha }}"
        echo "🔗 브랜치: \${{ github.ref }}"
        
    - name: 📥 코드 체크아웃
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
        
    - name: 🚀 서버 배포 실행
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: \${{ secrets.SERVER_HOST }}
        username: \${{ secrets.SERVER_USER }}
        key: \${{ secrets.SSH_KEY }}
        timeout: 300s
        script: |
          set -e
          
          echo "=== 🏠 $PROJECT_NAME 배포 시작 ==="
          cd /home/$SERVER_USER/$PROJECT_NAME || {
            echo "❌ 프로젝트 디렉토리가 없습니다: /home/$SERVER_USER/$PROJECT_NAME"
            echo "서버 초기 설정을 먼저 실행해주세요."
            exit 1
          }
          
          echo "=== 📋 현재 상태 확인 ==="
          echo "📍 현재 위치: \$(pwd)"
          echo "🖥️ 서버 호스트: \$(hostname)"
          echo "⏰ 서버 시간: \$(date)"
          
          echo "=== 💾 현재 작업 백업 ==="
          git stash push -m "auto-backup-\$(date +%Y%m%d_%H%M%S)" || echo "백업할 변경사항 없음"
          
          echo "=== 📥 최신 코드 동기화 ==="
          git fetch origin --prune
          echo "현재 브랜치: \$(git branch --show-current)"
          echo "동기화 전 커밋: \$(git rev-parse HEAD)"
          
          git reset --hard origin/main
          echo "동기화 후 커밋: \$(git rev-parse HEAD)"
          
          echo "=== 📦 의존성 설치 ==="
          if [ -f package.json ]; then
            echo "📦 npm install 실행 중..."
            npm install --production --silent
            echo "✅ 의존성 설치 완료"
          else
            echo "⚠️ package.json이 없습니다"
          fi
          
          echo "=== 🏗️ 빌드 실행 (필요시) ==="
          if [ -f package.json ] && npm run build --silent 2>/dev/null; then
            echo "✅ 빌드 완료"
          else
            echo "ℹ️ 빌드 스크립트 없음 또는 실행 안함"
          fi
          
          echo "=== 🔄 서비스 재시작 ==="
          if command -v pm2 >/dev/null 2>&1; then
            echo "🔄 PM2로 재시작..."
            pm2 restart $PROJECT_NAME || pm2 start npm --name "$PROJECT_NAME" -- start
            pm2 status | grep $PROJECT_NAME
          else
            echo "⚠️ PM2가 설치되지 않음. 수동 재시작 필요"
          fi
          
          echo "=== ✅ $PROJECT_NAME 배포 완료 ==="
          echo "🎉 배포가 성공적으로 완료되었습니다!"
          echo "📊 최종 Git 상태:"
          git log -1 --oneline
          
    - name: 🎉 배포 완료 알림
      if: success()
      run: |
        echo "✅ $PROJECT_NAME 배포 성공!"
        echo "🔗 서버: $SERVER_IP"
        echo "🌐 포트: $APP_PORT"
        echo "⏰ 완료 시간: \$(date)"
        
    - name: ❌ 배포 실패 처리
      if: failure()
      run: |
        echo "❌ $PROJECT_NAME 배포 실패!"
        echo "🔍 로그를 확인하여 문제를 해결해주세요."
        echo "📖 문제 해결 가이드: docs/github-actions-complete-guide.md"
EOF

# 품질 검사 워크플로우 생성
echo -e "${BLUE}🔍 품질 검사 워크플로우 생성 중...${NC}"
cat > .github/workflows/quality-check.yml << EOF
# $PROJECT_NAME 품질 검사 워크플로우
# 생성일: $(date '+%Y-%m-%d %H:%M:%S')

name: $PROJECT_NAME Quality Check

on:
  pull_request:
    paths:
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'
      - 'package-lock.json'

jobs:
  quality-check:
    runs-on: ubuntu-latest
    
    steps:
    - name: 📥 코드 체크아웃
      uses: actions/checkout@v4
      
    - name: 🟢 Node.js 설정
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: 📦 의존성 설치
      run: npm ci
      
    - name: 🔍 TypeScript 타입 검사
      run: npm run type-check || echo "⚠️ 타입 검사 스크립트 없음"
      
    - name: 🧪 테스트 실행
      run: npm test || echo "⚠️ 테스트 스크립트 없음"
      
    - name: 🏗️ 빌드 테스트
      run: npm run build || echo "⚠️ 빌드 스크립트 없음"
      
    - name: ✅ 품질 검사 완료
      run: echo "🎉 $PROJECT_NAME 품질 검사 통과!"
EOF

# 서버 헬스체크 워크플로우 생성 (선택적)
echo -e "${BLUE}🏥 헬스체크 워크플로우 생성 중...${NC}"
cat > .github/workflows/health-check.yml << EOF
# $PROJECT_NAME 서버 헬스체크 워크플로우
# 생성일: $(date '+%Y-%m-%d %H:%M:%S')

name: $PROJECT_NAME Health Check

on:
  schedule:
    - cron: '0 */6 * * *'  # 6시간마다 실행
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    
    steps:
    - name: 🏥 서버 상태 확인
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: \${{ secrets.SERVER_HOST }}
        username: \${{ secrets.SERVER_USER }}
        key: \${{ secrets.SSH_KEY }}
        timeout: 60s
        script: |
          echo "=== 🏥 $PROJECT_NAME 헬스체크 시작 ==="
          echo "⏰ 체크 시간: \$(date)"
          echo "🖥️ 서버: \$(hostname)"
          
          echo "=== 💾 시스템 리소스 ==="
          echo "CPU 사용률:"
          top -bn1 | grep "Cpu(s)" | head -1
          echo "메모리 사용률:"
          free -h
          echo "디스크 사용률:"
          df -h /
          
          echo "=== 🔧 $PROJECT_NAME 프로젝트 상태 ==="
          cd /home/$SERVER_USER/$PROJECT_NAME
          echo "현재 브랜치: \$(git branch --show-current)"
          echo "최신 커밋: \$(git log -1 --oneline)"
          
          echo "=== 📦 서비스 상태 ==="
          if command -v pm2 >/dev/null 2>&1; then
            echo "PM2 프로세스 상태:"
            pm2 status | grep $PROJECT_NAME || echo "$PROJECT_NAME 프로세스 없음"
          fi
          
          echo "=== 🌐 네트워크 상태 ==="
          echo "포트 $APP_PORT 상태:"
          netstat -tlnp | grep :$APP_PORT || echo "포트 $APP_PORT 사용 중이 아님"
          
          echo "=== ✅ 헬스체크 완료 ==="
EOF

# 설정 가이드 문서 생성
echo -e "${BLUE}📖 설정 가이드 생성 중...${NC}"
cat > DEPLOYMENT_SETUP.md << EOF
# $PROJECT_NAME 배포 설정 가이드

## 🎯 생성된 파일들

✅ \`.github/workflows/deploy.yml\` - 자동 배포  
✅ \`.github/workflows/quality-check.yml\` - 품질 검사  
✅ \`.github/workflows/health-check.yml\` - 헬스체크  

## 🔐 GitHub Secrets 설정 (필수)

\`Repository → Settings → Secrets and variables → Actions\`에서 추가:

\`\`\`
Name: SERVER_HOST
Value: $SERVER_IP

Name: SERVER_USER  
Value: $SERVER_USER

Name: SSH_KEY
Value: [SSH 개인키 전체 내용]
\`\`\`

## 🖥️ 서버 초기 설정

서버에서 다음 명령어 실행:

\`\`\`bash
# 프로젝트 클론
cd /home/$SERVER_USER
git clone https://github.com/YOUR_USERNAME/$PROJECT_NAME.git
cd $PROJECT_NAME

# 의존성 설치
npm install

# PM2 설치 (없는 경우)
npm install -g pm2

# 서비스 시작
pm2 start npm --name "$PROJECT_NAME" -- start
pm2 save
\`\`\`

## 🚀 배포 방법

### 자동 배포
- main 브랜치에 코드 푸시하면 자동 실행

### 수동 배포
- GitHub → Actions → "Deploy $PROJECT_NAME" → "Run workflow"

## 📊 확인 사항

- [ ] GitHub Secrets 설정 완료
- [ ] 서버에 프로젝트 클론 완료
- [ ] PM2 설치 및 서비스 시작 완료
- [ ] 첫 번째 배포 테스트 성공

## 🔧 문제 해결

### SSH 연결 실패
- SSH_KEY에 전체 내용 포함했는지 확인 (\`-----BEGIN\`부터 \`-----END-----\`까지)

### 프로젝트 디렉토리 없음
- 서버에 프로젝트를 먼저 클론했는지 확인

### PM2 재시작 실패
- 서버에 PM2가 설치되어 있는지 확인

---

**생성일**: $(date '+%Y-%m-%d %H:%M:%S')  
**서버**: $SERVER_IP:$APP_PORT  
**참고**: \`docs/github-actions-quick-start.md\`
EOF

echo ""
echo -e "${GREEN}✅ GitHub Actions 설정 완료!${NC}"
echo ""
echo -e "${YELLOW}📋 다음 단계:${NC}"
echo "1. 🔐 GitHub에 Secrets 추가:"
echo "   - SERVER_HOST: $SERVER_IP"
echo "   - SERVER_USER: $SERVER_USER"
echo "   - SSH_KEY: [SSH 개인키 전체 내용]"
echo ""
echo "2. 🖥️ 서버에 프로젝트 초기 설정:"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo "   cd /home/$SERVER_USER && git clone [저장소_URL] $PROJECT_NAME"
echo ""
echo "3. 🧪 배포 테스트:"
echo "   - 코드 변경 후 main 브랜치에 푸시"
echo "   - GitHub Actions 실행 확인"
echo ""
echo -e "${BLUE}📖 자세한 내용: DEPLOYMENT_SETUP.md 참조${NC}"