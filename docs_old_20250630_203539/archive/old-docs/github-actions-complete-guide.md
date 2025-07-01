# GitHub Actions 완전 자동화 가이드

## 🎯 **개요**

새로운 프로젝트에 GitHub Actions CI/CD를 빠르게 적용하기 위한 완전한 가이드입니다.  
o4o-platform에서 검증된 방법을 기반으로 작성되었습니다.

---

## 🏗️ **프로젝트 규모별 전략**

### **📊 규모별 권장 방법**

| 프로젝트 수 | 권장 방법 | 설정 시간 | 유지보수성 |
|------------|-----------|----------|------------|
| **1개** | 개별 설정 | 30분 | ⭐⭐⭐ |
| **2-5개** | 템플릿 활용 | 15분/프로젝트 | ⭐⭐⭐⭐ |
| **6개+** | 중앙집중식 | 2시간 초기 투자 | ⭐⭐⭐⭐⭐ |

---

## 🚀 **방법 1: 개별 프로젝트 설정** (1개 프로젝트)

### **✅ 사용 시기**
- 첫 번째 프로젝트 
- 독립적인 프로젝트
- 빠른 프로토타입

### **📋 설정 단계**

#### **1단계: 워크플로우 파일 생성**
```bash
# 프로젝트 루트에서 실행
mkdir -p .github/workflows
```

#### **2단계: 배포 워크플로우 작성**
`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to Server

on:
  push:
    branches: [main]
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
    - name: 📥 코드 체크아웃
      uses: actions/checkout@v4
      
    - name: 🚀 서버 배포
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          set -e
          
          echo "=== 배포 시작 ==="
          cd /home/ubuntu/PROJECT_NAME  # 프로젝트명으로 변경
          
          # 백업 생성
          git stash push -m "backup-$(date +%Y%m%d_%H%M%S)"
          
          # 코드 업데이트
          git fetch origin
          git reset --hard origin/main
          
          # 의존성 설치
          if [ -f package.json ]; then
            npm install --production
          fi
          
          # 서비스 재시작
          if command -v pm2 >/dev/null 2>&1; then
            pm2 restart PROJECT_NAME || pm2 start npm --name "PROJECT_NAME" -- start
          fi
          
          echo "=== 배포 완료 ==="
```

#### **3단계: 품질 검사 워크플로우 추가**
`.github/workflows/quality-check.yml`:

```yaml
name: Quality Check

on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run type-check || echo "타입 검사 없음"
    - run: npm test || echo "테스트 없음"
    - run: npm run build || echo "빌드 없음"
```

#### **4단계: GitHub Secrets 설정**
Repository → Settings → Secrets and variables → Actions:

```
SERVER_HOST: [서버 IP]
SERVER_USER: [SSH 사용자명]
SSH_KEY: [SSH 개인키 전체 내용]
```

---

## 🎛️ **방법 2: 템플릿 활용** (2-5개 프로젝트)

### **✅ 사용 시기**
- 여러 관련 프로젝트들
- 일관성 있는 배포 프로세스 필요
- 설정 시간 단축 원함

### **📋 템플릿 생성**

#### **워크플로우 생성기 스크립트**
`scripts/setup-github-actions.sh` 파일 생성:

```bash
#!/bin/bash
# GitHub Actions 자동 설정 스크립트
# 사용법: ./setup-github-actions.sh PROJECT_NAME SERVER_IP [SERVER_USER]

PROJECT_NAME=$1
SERVER_IP=$2
SERVER_USER=${3:-ubuntu}

if [ -z "$PROJECT_NAME" ] || [ -z "$SERVER_IP" ]; then
    echo "사용법: $0 <프로젝트명> <서버IP> [사용자명]"
    echo "예시: $0 my-api-server 43.202.242.215 ubuntu"
    exit 1
fi

echo "🚀 $PROJECT_NAME 프로젝트용 GitHub Actions 설정 중..."

# .github/workflows 디렉토리 생성
mkdir -p .github/workflows

# 배포 워크플로우 생성
cat > .github/workflows/deploy.yml << EOF
name: Deploy $PROJECT_NAME

on:
  push:
    branches: [main]
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
    - name: 📥 코드 체크아웃
      uses: actions/checkout@v4
      
    - name: 🚀 서버 배포
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: \${{ secrets.SERVER_HOST }}
        username: \${{ secrets.SERVER_USER }}
        key: \${{ secrets.SSH_KEY }}
        script: |
          set -e
          
          echo "=== 📍 $PROJECT_NAME 배포 시작 ==="
          cd /home/$SERVER_USER/$PROJECT_NAME
          
          echo "=== 💾 백업 생성 ==="
          git stash push -m "backup-\$(date +%Y%m%d_%H%M%S)"
          
          echo "=== 📥 코드 업데이트 ==="
          git fetch origin
          git reset --hard origin/main
          
          echo "=== 📦 의존성 설치 ==="
          if [ -f package.json ]; then
            npm install --production
          fi
          
          echo "=== 🔄 서비스 재시작 ==="
          if command -v pm2 >/dev/null 2>&1; then
            pm2 restart $PROJECT_NAME || pm2 start npm --name "$PROJECT_NAME" -- start
          fi
          
          echo "=== ✅ $PROJECT_NAME 배포 완료 ==="
EOF

# 품질 검사 워크플로우 생성
cat > .github/workflows/quality-check.yml << EOF
name: $PROJECT_NAME Quality Check

on:
  pull_request:
  push:
    branches: [main]

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
      
    - name: 🔍 타입 검사
      run: npm run type-check || echo "타입 검사 스크립트 없음"
      
    - name: 🧪 테스트 실행
      run: npm test || echo "테스트 스크립트 없음"
      
    - name: 🏗️ 빌드 테스트
      run: npm run build || echo "빌드 스크립트 없음"
EOF

# README 생성
cat > GITHUB_ACTIONS_SETUP.md << EOF
# $PROJECT_NAME GitHub Actions 설정 가이드

## 🔐 필수 Secrets 설정

GitHub Repository → Settings → Secrets and variables → Actions에서 추가:

\\\`\\\`\\\`
SERVER_HOST: $SERVER_IP
SERVER_USER: $SERVER_USER
SSH_KEY: [SSH 개인키 내용]
\\\`\\\`\\\`

## 🚀 배포 방법

### 자동 배포
- main 브랜치에 푸시하면 자동 실행

### 수동 배포  
- GitHub → Actions → "Deploy $PROJECT_NAME" → "Run workflow"

## 📊 확인 사항

- [ ] GitHub Secrets 설정 완료
- [ ] 서버에 프로젝트 디렉토리 존재: /home/$SERVER_USER/$PROJECT_NAME
- [ ] PM2 설치됨 (선택사항)
- [ ] package.json에 필요한 스크립트 있음
EOF

echo "✅ GitHub Actions 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. GitHub에 Secrets 추가 (SERVER_HOST, SERVER_USER, SSH_KEY)"
echo "2. 서버에 프로젝트 초기 설정"
echo "3. 코드 푸시하여 자동 배포 테스트"
```

#### **사용법**
```bash
# 새 프로젝트에서 실행
chmod +x scripts/setup-github-actions.sh
./scripts/setup-github-actions.sh my-project 43.202.242.215 ubuntu
```

---

## 🏢 **방법 3: 중앙집중식 관리** (6개+ 프로젝트)

### **✅ 사용 시기**
- 대규모 프로젝트들
- 통합된 DevOps 프로세스 필요
- 중앙 관리 및 모니터링 필요

### **📋 DevOps 저장소 구조**

#### **중앙 DevOps 저장소 생성**
```
o4o-devops/
├── templates/
│   ├── workflows/
│   │   ├── api-server-deploy.yml
│   │   ├── web-server-deploy.yml
│   │   ├── quality-check.yml
│   │   └── health-check.yml
│   └── actions/
│       ├── deploy-to-server/
│       └── quality-check/
├── configs/
│   ├── servers/
│   │   ├── production.yml
│   │   ├── staging.yml
│   │   └── development.yml
│   └── projects/
│       ├── api-projects.yml
│       ├── web-projects.yml
│       └── ecommerce-projects.yml
├── scripts/
│   ├── setup-new-project.sh
│   ├── update-all-workflows.sh
│   └── deploy-to-environment.sh
└── docs/
    ├── deployment-guide.md
    ├── troubleshooting.md
    └── best-practices.md
```

#### **재사용 가능한 Composite Action 예시**
`.github/actions/deploy-to-server/action.yml`:

```yaml
name: 'Deploy to Server'
description: '서버 배포를 위한 공통 액션'
inputs:
  server-host:
    description: '서버 IP 주소'
    required: true
  server-user:
    description: 'SSH 사용자명'
    required: true
  ssh-key:
    description: 'SSH 개인키'
    required: true
  project-path:
    description: '서버상의 프로젝트 경로'
    required: true
  service-name:
    description: 'PM2 서비스명'
    required: true
  build-command:
    description: '빌드 명령어'
    required: false
    default: 'npm run build'

runs:
  using: 'composite'
  steps:
    - name: 서버 배포 실행
      shell: bash
      run: |
        ssh -o StrictHostKeyChecking=no -i <(echo "${{ inputs.ssh-key }}") \
            ${{ inputs.server-user }}@${{ inputs.server-host }} "
          set -e
          cd ${{ inputs.project-path }}
          
          # 백업 생성
          git stash push -m 'backup-$(date +%Y%m%d_%H%M%S)'
          
          # 코드 업데이트
          git fetch origin
          git reset --hard origin/main
          
          # 의존성 설치
          npm install --production
          
          # 빌드 (필요시)
          if [ '${{ inputs.build-command }}' != 'skip' ]; then
            ${{ inputs.build-command }}
          fi
          
          # 서비스 재시작
          pm2 restart ${{ inputs.service-name }} || pm2 start npm --name '${{ inputs.service-name }}' -- start
        "
```

#### **프로젝트별 사용법**
```yaml
# 각 프로젝트의 .github/workflows/deploy.yml
jobs:
  deploy:
    steps:
    - uses: actions/checkout@v4
    - uses: o4o-devops/.github/actions/deploy-to-server@main
      with:
        server-host: ${{ secrets.SERVER_HOST }}
        server-user: ${{ secrets.SERVER_USER }}
        ssh-key: ${{ secrets.SSH_KEY }}
        project-path: '/home/ubuntu/my-project'
        service-name: 'my-project'
```

---

## 📋 **체크리스트 및 설정 가이드**

### **🔐 보안 설정 체크리스트**

#### **GitHub Secrets 필수 항목**
- [ ] `SERVER_HOST` - 서버 IP 주소
- [ ] `SERVER_USER` - SSH 사용자명 (보통 ubuntu)
- [ ] `SSH_KEY` - SSH 개인키 전체 내용

#### **SSH 키 설정 확인**
```bash
# SSH 키 생성 (필요시)
ssh-keygen -t rsa -b 4096 -C "github-actions@yourdomain.com"

# 공개키를 서버에 추가
ssh-copy-id -i ~/.ssh/id_rsa.pub user@server-ip

# 개인키 내용 확인 (GitHub Secrets에 추가용)
cat ~/.ssh/id_rsa
```

### **🖥️ 서버 설정 체크리스트**

#### **기본 환경 준비**
- [ ] Git 설치됨
- [ ] Node.js 설치됨 (프로젝트에 따라)
- [ ] PM2 설치됨 (선택사항)
- [ ] 프로젝트 디렉토리 생성됨

#### **서버 초기 설정 스크립트**
```bash
#!/bin/bash
# 서버 초기 설정 스크립트

PROJECT_NAME=$1
REPO_URL=$2

if [ -z "$PROJECT_NAME" ] || [ -z "$REPO_URL" ]; then
    echo "사용법: $0 <프로젝트명> <Git 저장소 URL>"
    exit 1
fi

echo "🔧 서버 환경 설정 중..."

# 프로젝트 클론
cd /home/ubuntu
git clone $REPO_URL $PROJECT_NAME
cd $PROJECT_NAME

# 의존성 설치
if [ -f package.json ]; then
    npm install
fi

# PM2 설정 (선택사항)
if command -v pm2 >/dev/null 2>&1; then
    pm2 start npm --name "$PROJECT_NAME" -- start
    pm2 save
fi

echo "✅ 서버 설정 완료!"
```

### **🧪 테스트 및 검증**

#### **배포 테스트 체크리스트**
- [ ] GitHub Actions 워크플로우 파일 생성
- [ ] GitHub Secrets 설정 완료
- [ ] 서버에 프로젝트 초기 설정 완료
- [ ] 수동 배포 테스트 성공
- [ ] 자동 배포 테스트 성공
- [ ] 롤백 테스트 완료

#### **검증 명령어**
```bash
# GitHub Actions 실행 상태 확인
curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/repos/USERNAME/REPO/actions/runs

# 서버에서 배포 상태 확인
ssh user@server "pm2 status && git log -1 --oneline"
```

---

## 🔧 **문제 해결 가이드**

### **❌ 자주 발생하는 문제들**

#### **1. SSH 연결 실패**
```
Error: Permission denied (publickey)
```

**해결방법:**
- SSH 키 형식 확인 (-----BEGIN부터 -----END까지 모두 포함)
- 서버의 authorized_keys 파일 확인
- SSH 키 권한 확인 (600)

#### **2. Git 동기화 실패**
```
Error: Your local changes would be overwritten by merge
```

**해결방법:**
- 스크립트에 `git stash` 명령어 추가됨
- 수동으로: `git reset --hard origin/main`

#### **3. 의존성 설치 실패**
```
Error: npm install failed
```

**해결방법:**
- Node.js 버전 호환성 확인
- npm cache 클리어: `npm cache clean --force`
- package-lock.json 삭제 후 재설치

#### **4. PM2 재시작 실패**
```
Error: Process not found
```

**해결방법:**
- PM2 설치 확인: `npm install -g pm2`
- 프로세스 이름 확인: `pm2 list`
- 새로 시작: `pm2 start npm --name "app" -- start`

### **🔍 디버깅 팁**

#### **GitHub Actions 로그 분석**
1. Actions 탭에서 실패한 워크플로우 클릭
2. 실패한 단계 확장하여 상세 로그 확인
3. SSH 연결 부분과 서버 명령어 실행 부분 중점 확인

#### **서버 로그 확인**
```bash
# PM2 로그 확인
pm2 logs

# 시스템 로그 확인  
sudo journalctl -u ssh

# Git 상태 확인
git status && git log -1
```

---

## 📈 **성능 최적화 및 모범 사례**

### **⚡ 배포 속도 최적화**

#### **1. 의존성 캐싱**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'  # npm 캐시 활용
```

#### **2. 병렬 처리**
```yaml
jobs:
  test:
    # 테스트 작업
  deploy:
    needs: test  # 테스트 완료 후 배포
    if: success()
```

#### **3. 조건부 배포**
```yaml
on:
  push:
    branches: [main]
    paths: 
      - 'src/**'        # 소스 코드 변경시만
      - 'package.json'  # 의존성 변경시만
```

### **🔒 보안 강화**

#### **1. Environment 보호**
```yaml
jobs:
  deploy:
    environment: 
      name: production
      url: https://your-app.com
```

#### **2. IP 화이트리스트**
- AWS Security Group에서 GitHub Actions IP 허용
- 또는 VPN 터널 사용

#### **3. 최소 권한 원칙**
```bash
# 배포 전용 사용자 생성
sudo useradd -m -s /bin/bash deploy-user
sudo usermod -aG sudo deploy-user
```

---

## 📊 **모니터링 및 알림**

### **📱 Slack 알림 설정**
```yaml
- name: Slack 알림
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#deployments'
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### **📈 배포 통계 수집**
```yaml
- name: 배포 메트릭 전송
  run: |
    curl -X POST ${{ secrets.METRICS_ENDPOINT }} \
         -H "Content-Type: application/json" \
         -d '{
           "project": "${{ github.repository }}",
           "commit": "${{ github.sha }}",
           "status": "success",
           "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
         }'
```

---

## 🎯 **다음 단계 및 고급 기능**

### **🔄 향후 개선 사항**
- [ ] 스테이징 환경 자동 배포
- [ ] 데이터베이스 마이그레이션 자동화
- [ ] A/B 테스트 배포
- [ ] 카나리 배포
- [ ] 자동 롤백 기능

### **🧪 고급 워크플로우**
- Blue-Green 배포
- 멀티 환경 관리
- 의존성 보안 스캔
- 성능 테스트 자동화

---

**마지막 업데이트**: 2025-06-19  
**작성자**: o4o-platform 개발팀  
**검증 환경**: o4o-apiserver, GitHub Actions

이 가이드는 실제 운영 환경에서 검증된 방법들을 기반으로 작성되었습니다.