# 개발환경 설정 가이드

## 환경별 설정

### 집(sohae) 환경 - Windows
```bash
# PowerShell에서 프로젝트 이동
cd o4o-platform  # Cursor 열 때 기본 경로: C:\Users\sohae\OneDrive\Coding

# 환경변수 (PowerShell Profile에 추가)
$env:NODE_ENV = "development"
$env:O4O_ENV = "sohae"

# 프로젝트별 alias (PowerShell Profile)
function o4o-dev { cd o4o-platform; npm run dev:all }
function o4o-pull { cd o4o-platform; git fetch; git pull }
function o4o-deploy { cd o4o-platform; .\scripts\deploy.ps1 }

# Node.js 버전 확인
node --version  # v18.x.x 이상 필요
npm --version   # 9.x.x 이상 권장
```

### 직장(home) 환경 - Linux/Mac
```bash
# ~/.bashrc 또는 ~/.zshrc에 추가  
export NODE_ENV=development
export PATH="/usr/local/bin:$PATH"
export O4O_ENV=home

# 프로젝트별 alias
alias o4o-dev="cd /workspace/o4o-platform && npm run dev:all"
alias o4o-pull="cd /workspace/o4o-platform && git fetch && git pull"
alias o4o-deploy="cd /workspace/o4o-platform && ./scripts/deploy.sh"
```

## 라이브러리 버전 체크리스트

### 현재 사용 버전 (2024-06-18)
```json
{
  "node": ">=18.0.0",
  "npm": ">=9.0.0", 
  "react": "^18.2.0",
  "express": "^4.18.0",
  "typescript": "^5.0.0",
  "medusa-js": "^1.3.7",
  "tiptap": "^2.0.0"
}
```

### 버전 불일치 해결법
1. 현재 버전 확인: `npm list [package-name]`
2. 최신 문서 확인: 공식 GitHub README
3. 점진적 업그레이드: minor 버전부터 단계적 적용
4. 테스트: 업그레이드 후 `npm run dev:all`로 정상 작동 확인

## 필수 설치 프로그램

### Windows (집 환경)
```powershell
# Node.js 설치 (공식 사이트에서 LTS 버전)
# https://nodejs.org/

# 전역 패키지
npm install -g pm2@latest
npm install -g typescript@latest

# Git 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Linux/Mac (직장 환경)
```bash
# Node.js (NVM 사용 권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 전역 패키지
npm install -g pm2@latest
npm install -g typescript@latest
```

## 환경별 PATH 문제 해결

### Windows 환경
```powershell
# 현재 PATH 확인
$env:PATH -split ';'
Get-Command node
Get-Command npm

# 문제 발생 시 (PowerShell 재시작)
# 또는 환경변수에서 Node.js 경로 직접 추가
```

### Linux/Mac 환경
```bash
# 현재 PATH 확인
echo $PATH
which node
which npm

# 문제 발생 시
source ~/.bashrc    # 또는 source ~/.zshrc
export PATH="/usr/local/bin:$PATH"  # 임시 해결

# 영구 해결: ~/.bashrc 마지막에 추가
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
```

## 서버별 배포 설정

### API 서버 동기화 (Windows)
```powershell
# API 서버 전용 스크립트
cd o4o-platform
git pull origin main
npm install
npm run build:api
pm2 restart api-server
```

### 웹 서버 동기화 (Windows)
```powershell
# 웹 서버 전용 스크립트
cd o4o-platform
git pull origin main
npm install
npm run build:web
pm2 restart main-site
```

### Linux/Mac 환경 (직장)
```bash
# API 서버
cd /workspace/o4o-platform
git pull origin main
npm install
npm run build:api
pm2 restart api-server

# 웹 서버  
cd /workspace/o4o-platform
git pull origin main
npm install
npm run build:web
pm2 restart main-site
```

---

**마지막 업데이트**: 2024-06-18