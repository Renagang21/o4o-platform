# GitHub Actions 빠른 설정 가이드

## 🚀 **5분 만에 새 프로젝트 자동 배포 설정**

### **📋 체크리스트**

#### **준비물**
- [ ] GitHub 저장소
- [ ] 배포할 서버 (IP 주소)
- [ ] SSH 키 (서버 접근용)

#### **설정 순서**
1. [워크플로우 파일 생성](#1단계-워크플로우-파일-생성)
2. [GitHub Secrets 설정](#2단계-github-secrets-설정)
3. [서버 초기 설정](#3단계-서버-초기-설정)
4. [테스트](#4단계-테스트)

---

## 📁 **1단계: 워크플로우 파일 생성**

### **디렉토리 생성**
```bash
mkdir -p .github/workflows
```

### **배포 워크플로우 파일**
`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Server

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: appleboy/ssh-action@v1.0.3
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /home/ubuntu/PROJECT_NAME  # 프로젝트명으로 변경
          git stash push -m "backup-$(date +%Y%m%d_%H%M%S)"
          git fetch origin && git reset --hard origin/main
          npm install --production
          pm2 restart PROJECT_NAME || pm2 start npm --name "PROJECT_NAME" -- start
```

---

## 🔐 **2단계: GitHub Secrets 설정**

### **GitHub에서 설정**
`Repository → Settings → Secrets and variables → Actions`

```
SERVER_HOST: [서버 IP 주소]
SERVER_USER: ubuntu
SSH_KEY: [SSH 개인키 전체 내용]
```

### **SSH 키 확인**
```bash
# 개인키 내용 출력 (복사해서 GitHub에 붙여넣기)
cat ~/.ssh/id_rsa
```

---

## 🖥️ **3단계: 서버 초기 설정**

### **서버에서 실행**
```bash
# 프로젝트 클론
cd /home/ubuntu
git clone https://github.com/USERNAME/PROJECT_NAME.git
cd PROJECT_NAME

# 의존성 설치
npm install

# PM2 설치 (없는 경우)
npm install -g pm2

# 서비스 시작
pm2 start npm --name "PROJECT_NAME" -- start
pm2 save
```

---

## 🧪 **4단계: 테스트**

### **수동 배포 테스트**
1. GitHub → Actions → "Deploy to Server" → "Run workflow"
2. 실행 로그 확인
3. 서버에서 확인: `pm2 status`

### **자동 배포 테스트**
1. 코드 수정 후 main 브랜치에 푸시
2. Actions 탭에서 자동 실행 확인

---

## 🔧 **자동화 스크립트 (고급)**

### **전체 설정 자동화**
`setup-deployment.sh`:

```bash
#!/bin/bash
PROJECT_NAME=$1
SERVER_IP=$2

# 워크플로우 파일 생성
mkdir -p .github/workflows
cat > .github/workflows/deploy.yml << EOF
name: Deploy $PROJECT_NAME
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: appleboy/ssh-action@v1.0.3
      with:
        host: \${{ secrets.SERVER_HOST }}
        username: \${{ secrets.SERVER_USER }}
        key: \${{ secrets.SSH_KEY }}
        script: |
          cd /home/ubuntu/$PROJECT_NAME
          git stash push -m "backup-\$(date +%Y%m%d_%H%M%S)"
          git fetch origin && git reset --hard origin/main
          npm install --production
          pm2 restart $PROJECT_NAME || pm2 start npm --name "$PROJECT_NAME" -- start
EOF

echo "✅ 워크플로우 생성 완료!"
echo "🔐 GitHub Secrets 설정 필요:"
echo "  SERVER_HOST: $SERVER_IP"
echo "  SERVER_USER: ubuntu"
echo "  SSH_KEY: [SSH 개인키]"
```

### **사용법**
```bash
chmod +x setup-deployment.sh
./setup-deployment.sh my-project 43.202.242.215
```

---

## ❓ **문제 해결**

### **자주 발생하는 에러**

#### **SSH 연결 실패**
```
Error: Permission denied (publickey)
```
→ SSH_KEY 설정 확인, 전체 내용 포함했는지 확인

#### **Git 업데이트 실패**
```
Error: Your local changes would be overwritten
```
→ 스크립트에 `git stash` 추가됨 (자동 해결)

#### **PM2 재시작 실패**
```
Error: Process not found
```
→ 서버에 PM2 설치: `npm install -g pm2`

### **디버깅 팁**
```bash
# GitHub Actions 로그 확인 → Actions 탭
# 서버 상태 확인
ssh user@server "pm2 status && git log -1"
```

---

## 📖 **참고 문서**

- **📚 완전한 가이드**: `docs/github-actions-complete-guide.md`
- **🔧 o4o-platform 사례**: `.github/workflows/` 폴더
- **⚙️ 설정 예시**: 이미 구축된 워크플로우 참조

---

**⏱️ 소요 시간**: 5-10분  
**✅ 결과**: 코드 푸시 → 자동 배포  
**🎯 목표**: GitHub 중심의 완전 자동화