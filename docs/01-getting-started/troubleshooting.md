# 🆘 문제 해결 가이드

> **빠른 해결** - 자주 발생하는 문제들의 즉시 해결책
> 
> **개발 중 막힘 제거** | **에러 해결** | **성능 최적화** | **디버깅 팁**

O4O Platform 개발 중 발생할 수 있는 모든 문제의 해결책을 제공합니다.

---

## 🎯 **빠른 문제 진단**

### **🔍 증상별 빠른 찾기**

| 증상 | 원인 | 해결책 링크 |
|------|------|-------------|
| 🚫 서버가 시작되지 않음 | 포트 충돌 | [포트 문제](#-포트-관련-문제) |
| 🗄️ DB 연결 실패 | PostgreSQL 설정 | [DB 연결 문제](#️-데이터베이스-문제) |
| 🔴 TypeScript 에러 | 타입 설정 | [TypeScript 문제](#-typescript-문제) |
| 🐌 느린 컴파일 | 메모리/설정 | [성능 문제](#-성능-문제) |
| 🌐 API 호출 실패 | CORS/인증 | [API 문제](#-api-연동-문제) |
| 📦 패키지 설치 실패 | npm/node 버전 | [설치 문제](#-설치-문제) |

---

## 🚀 **설치 문제**

### **Node.js 버전 문제**

#### **문제**: "Node.js 버전이 맞지 않음"
```bash
# 에러 예시
Error: This project requires Node.js 20.x.x but you have 18.x.x
```

**해결책:**
```bash
# 1. nvm으로 올바른 버전 설치
nvm install 20.18.0
nvm use 20.18.0

# 2. 버전 확인
node --version  # v20.18.0이어야 함

# 3. 프로젝트에서 자동 버전 전환
echo "20.18.0" > .nvmrc
nvm use  # .nvmrc 파일 기반 자동 전환
```

### **npm 설치 실패**

#### **문제**: "npm install 중 에러 발생"
```bash
# 에러 예시
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**해결책:**
```bash
# 1. 캐시 정리
npm cache clean --force

# 2. node_modules 완전 제거
rm -rf node_modules package-lock.json

# 3. 재설치
npm install

# 4. 여전히 문제시 - legacy peer deps
npm install --legacy-peer-deps

# 5. 마지막 수단 - 강제 설치
npm install --force
```

### **권한 문제 (macOS/Linux)**

#### **문제**: "Permission denied" 에러
```bash
# 에러 예시
Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**해결책:**
```bash
# 1. npm 글로벌 디렉토리 변경 (권장)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# 2. .bashrc 또는 .zshrc에 추가
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# 3. 또는 nvm 사용 (가장 권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

---

## 🔌 **포트 관련 문제**

### **포트 충돌**

#### **문제**: "Port 3000/4000 is already in use"
```bash
# 에러 예시
Error: listen EADDRINUSE: address already in use :::3000
```

**해결책:**
```bash
# 1. 포트 사용 프로세스 확인
lsof -i :3000  # React 앱
lsof -i :4000  # API 서버

# 2. 프로세스 종료
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:4000)

# 3. 한번에 모든 Node.js 프로세스 종료
pkill -f node

# 4. 다른 포트 사용
PORT=3001 npm run dev:web
API_PORT=4001 npm run dev:api
```

### **방화벽 문제**

#### **문제**: 로컬 서버에 접속되지 않음
**해결책:**
```bash
# Windows 방화벽
# 제어판 > 시스템 및 보안 > Windows Defender 방화벽
# "앱 또는 기능을 Windows Defender 방화벽을 통해 허용"에서 Node.js 추가

# macOS 방화벽
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node
```

---

## 🗄️ **데이터베이스 문제**

### **PostgreSQL 연결 실패**

#### **문제**: "ECONNREFUSED 127.0.0.1:5432"
```bash
# 에러 예시
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**해결책:**
```bash
# 1. PostgreSQL 서비스 상태 확인
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# 2. 서비스 시작
sudo systemctl start postgresql  # Linux
brew services start postgresql@15  # macOS

# 3. 포트 확인
sudo netstat -tlnp | grep :5432

# 4. 수동 연결 테스트
psql -h localhost -U postgres -p 5432
```

### **인증 실패**

#### **문제**: "password authentication failed"
```bash
# 에러 예시
FATAL: password authentication failed for user "o4o_dev"
```

**해결책:**
```bash
# 1. PostgreSQL 관리자로 접속
sudo -u postgres psql

# 2. 사용자 비밀번호 재설정
ALTER USER o4o_dev WITH PASSWORD 'new_password';

# 3. .env 파일 업데이트
DATABASE_URL=postgresql://o4o_dev:new_password@localhost:5432/o4o_platform

# 4. pg_hba.conf 확인 (필요시)
sudo nano /etc/postgresql/15/main/pg_hba.conf
# local all all md5 (또는 trust)로 설정
```

### **데이터베이스 존재하지 않음**

#### **문제**: "database does not exist"
**해결책:**
```sql
-- PostgreSQL에 접속해서 생성
sudo -u postgres psql

-- 데이터베이스 생성
CREATE DATABASE o4o_platform;
CREATE DATABASE o4o_platform_test;

-- 사용자에게 권한 부여
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_dev;
```

---

## 🔴 **TypeScript 문제**

### **컴파일 에러**

#### **문제**: "Cannot find module" 에러
```typescript
// 에러 예시
error TS2307: Cannot find module '@/components/Layout' or its corresponding type declarations
```

**해결책:**
```json
// tsconfig.json에 baseUrl과 paths 설정 확인
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"]
    }
  }
}
```

### **타입 에러**

#### **문제**: "Type 'unknown' is not assignable"
```typescript
// 에러 예시
Type 'unknown' is not assignable to type 'Product'
```

**해결책:**
```typescript
// 1. 타입 가드 사용
function isProduct(obj: unknown): obj is Product {
  return obj !== null && typeof obj === 'object' && 'id' in obj;
}

// 2. 타입 단언 (조심스럽게)
const product = data as Product;

// 3. 타입 정의 개선
interface ApiResponse<T> {
  data: T;
  success: boolean;
}
```

### **Import 에러**

#### **문제**: ES6 Import 문제
```typescript
// 에러 예시
SyntaxError: Cannot use import statement outside a module
```

**해결책:**
```json
// package.json에 추가 (React 앱)
{
  "type": "module"
}

// 또는 tsconfig.json 수정 (API 서버)
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node"
  },
  "ts-node": {
    "esm": true
  }
}
```

---

## 🐌 **성능 문제**

### **느린 컴파일**

#### **문제**: TypeScript 컴파일이 너무 느림
**해결책:**
```bash
# 1. 메모리 할당 증가
export NODE_OPTIONS="--max-old-space-size=4096"

# 2. 증분 컴파일 활성화 (tsconfig.json)
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}

# 3. ts-node 최적화
{
  "ts-node": {
    "transpileOnly": true,
    "files": true
  }
}
```

### **느린 개발 서버**

#### **문제**: Hot Reload가 느림
**해결책:**
```javascript
// vite.config.ts (React 앱)
export default defineConfig({
  server: {
    hmr: {
      overlay: false  // 오버레이 비활성화로 성능 향상
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']  // 미리 번들링
  }
});

// nodemon.json (API 서버)
{
  "delay": 1000,  // 파일 변경 감지 지연
  "ignore": ["**/*.test.ts", "logs/**", "dist/**"]
}
```

---

## 🌐 **API 연동 문제**

### **CORS 에러**

#### **문제**: "Access-Control-Allow-Origin" 에러
```bash
# 에러 예시
Access to fetch at 'http://localhost:4000/api/products' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**해결책:**
```typescript
// API 서버 CORS 설정 (src/main.ts)
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL
  ],
  credentials: true
}));
```

### **인증 문제**

#### **문제**: JWT 토큰 인증 실패
**해결책:**
```typescript
// 1. 토큰 저장 확인
localStorage.getItem('token');

// 2. 헤더 설정 확인
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// 3. 토큰 만료 확인
const payload = JSON.parse(atob(token.split('.')[1]));
const isExpired = payload.exp * 1000 < Date.now();
```

### **API 응답 지연**

#### **문제**: API 호출이 너무 느림
**해결책:**
```typescript
// 1. 타임아웃 설정
const api = axios.create({
  timeout: 10000,  // 10초
  baseURL: process.env.VITE_API_BASE_URL
});

// 2. 요청 취소 기능
const controller = new AbortController();
const response = await fetch('/api/products', {
  signal: controller.signal
});

// 3. 캐싱 구현
const cache = new Map();
if (cache.has(url)) {
  return cache.get(url);
}
```

---

## 🛠️ **개발 도구 문제**

### **VS Code 문제**

#### **문제**: TypeScript IntelliSense 작동하지 않음
**해결책:**
```bash
# 1. TypeScript 서버 재시작
# Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"

# 2. 워크스페이스 TypeScript 버전 사용
# Cmd/Ctrl + Shift + P > "TypeScript: Select TypeScript Version" > "Use Workspace Version"

# 3. 설정 파일 확인
# .vscode/settings.json에 올바른 설정 있는지 확인
```

### **ESLint 문제**

#### **문제**: ESLint 규칙 에러
**해결책:**
```bash
# 1. 자동 수정
npm run lint:fix

# 2. 특정 규칙 비활성화
// eslint-disable-next-line @typescript-eslint/no-unused-vars

# 3. 설정 파일 업데이트
// eslint.config.js
export default [
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn'
    }
  }
];
```

---

## 🔧 **환경별 문제**

### **Windows WSL 문제**

#### **문제**: 파일 권한 문제
**해결책:**
```bash
# 1. WSL에서 Windows 파일 접근시
sudo chmod -R 755 /mnt/c/Users/username/project

# 2. WSL 내부 파일 시스템 사용 권장
cp -r /mnt/c/Users/username/project ~/project
cd ~/project
```

### **macOS 문제**

#### **문제**: M1/M2 칩 호환성
**해결책:**
```bash
# 1. Rosetta로 Node.js 실행
arch -x86_64 npm install

# 2. ARM64 네이티브 Node.js 사용
# https://nodejs.org에서 ARM64 버전 다운로드

# 3. 패키지별 아키텍처 확인
npm config set target_arch arm64
```

---

## 🧪 **테스트 관련 문제**

### **Jest 설정 문제**

#### **문제**: "Cannot use import statement outside a module"
**해결책:**
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

---

## 🚨 **긴급 상황 대응**

### **전체 시스템 리셋**

#### **완전 초기화가 필요한 경우**
```bash
# 1. 모든 프로세스 종료
pkill -f node
pkill -f vite

# 2. 캐시 및 의존성 제거
rm -rf node_modules package-lock.json
rm -rf services/*/node_modules services/*/package-lock.json
rm -rf dist services/*/dist
npm cache clean --force

# 3. 재설치
npm run install:all

# 4. 환경 변수 재설정
cd services/api-server && cp .env.example .env
cd ../main-site && cp .env.example .env

# 5. 데이터베이스 재설정 (주의!)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS o4o_platform;"
sudo -u postgres psql -c "CREATE DATABASE o4o_platform;"
```

### **백업에서 복구**
```bash
# Git에서 최신 stable 버전으로 복구
git stash  # 현재 변경사항 임시 저장
git checkout main
git pull origin main
git stash pop  # 변경사항 복원 (필요시)
```

---

## 📞 **추가 도움 요청**

### **🔍 로그 확인 방법**
```bash
# API 서버 로그
tail -f services/api-server/logs/application.log

# PostgreSQL 로그
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# 시스템 로그
journalctl -f -u postgresql
```

### **🐛 버그 리포트 양식**
```markdown
**문제 설명**: [간단한 설명]

**재현 단계**:
1. [첫 번째 단계]
2. [두 번째 단계]
3. [문제 발생]

**기대 결과**: [예상되는 동작]
**실제 결과**: [실제 발생한 동작]

**환경 정보**:
- OS: [Windows/macOS/Linux]
- Node.js: [버전]
- npm: [버전]
- 브라우저: [Chrome/Firefox/Safari]

**에러 로그**:
```
[에러 메시지 첨부]
```

**스크린샷**: [가능하면 첨부]
```

### **💬 커뮤니티 지원**
- **GitHub Issues**: [레포지토리 이슈](https://github.com/Renagang21/o4o-platform/issues)
- **Discord**: 실시간 개발 지원 채널
- **Stack Overflow**: `o4o-platform` 태그

---

<div align="center">

**🆘 문제가 해결되지 않았나요? 🆘**

[📝 이슈 등록](https://github.com/Renagang21/o4o-platform/issues) • [💬 Discord 참여](#) • [📚 전체 문서](../README.md)

**99%의 문제는 위 가이드로 해결됩니다! 💪**

</div>
