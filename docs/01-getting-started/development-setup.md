# 🔧 개발환경 상세 설정 가이드

> **완벽한 개발환경 구축** - 프로덕션 수준의 로컬 개발환경
> 
> **PostgreSQL 연동** | **TypeScript 최적화** | **IDE 설정** | **디버깅 도구**

5분 퀵스타트 이후 완벽한 개발환경을 구축하기 위한 상세 가이드입니다.

---

## 📋 **전체 설정 체크리스트**

### **✅ 필수 요구사항**
- [ ] **Node.js 20.18.0** 설치 및 확인
- [ ] **PostgreSQL 15+** 설치 및 실행
- [ ] **Git** 설정 완료
- [ ] **IDE** (VS Code/Cursor) 확장 프로그램 설치

### **✅ 개발 도구**
- [ ] **TypeScript 5.8+** 글로벌 설치
- [ ] **pnpm** 또는 **npm** 최신 버전
- [ ] **Docker** (선택사항 - 현재 미사용)
- [ ] **PostgreSQL GUI** (pgAdmin, DBeaver 등)

---

## 🗄️ **PostgreSQL 완전 설정**

### **1. PostgreSQL 설치**

#### **Windows (WSL 권장)**
```bash
# WSL Ubuntu에서 설치
sudo apt update
sudo apt install postgresql postgresql-contrib

# 서비스 시작
sudo service postgresql start

# 자동 시작 설정
sudo systemctl enable postgresql
```

#### **macOS**
```bash
# Homebrew 사용
brew install postgresql@15
brew services start postgresql@15

# 또는 Postgres.app 다운로드
# https://postgresapp.com/
```

#### **Ubuntu/Debian**
```bash
# 공식 PostgreSQL APT 저장소 추가
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

sudo apt update
sudo apt install postgresql-15 postgresql-client-15
```

### **2. 데이터베이스 설정**

#### **사용자 및 데이터베이스 생성**
```bash
# PostgreSQL 접속
sudo -u postgres psql

# 또는 (Windows WSL)
psql -U postgres
```

```sql
-- 개발용 사용자 생성
CREATE USER o4o_dev WITH PASSWORD 'o4o_dev_password';

-- 데이터베이스 생성
CREATE DATABASE o4o_platform OWNER o4o_dev;
CREATE DATABASE o4o_platform_test OWNER o4o_dev;

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_dev;
GRANT ALL PRIVILEGES ON DATABASE o4o_platform_test TO o4o_dev;

-- 확인
\\l
\\q
```

#### **연결 테스트**
```bash
# 개발 DB 연결 테스트
psql -h localhost -U o4o_dev -d o4o_platform

# 성공시 다음과 같이 표시됨
# o4o_platform=> 
```

### **3. 환경 변수 상세 설정**

#### **API 서버 환경 설정**
```bash
cd services/api-server
cp .env.example .env
```

**.env 파일 완전 설정:**
```env
# === 데이터베이스 설정 ===
DATABASE_URL=postgresql://o4o_dev:o4o_dev_password@localhost:5432/o4o_platform
DATABASE_TEST_URL=postgresql://o4o_dev:o4o_dev_password@localhost:5432/o4o_platform_test

# 연결 풀 설정
DB_POOL_SIZE=10
DB_TIMEOUT=30000

# === JWT 보안 ===
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# === 서버 설정 ===
PORT=4000
NODE_ENV=development
LOG_LEVEL=debug

# === CORS 설정 ===
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# === 파일 업로드 ===
UPLOAD_MAX_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads

# === 이메일 설정 (선택사항) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# === Redis 설정 (향후 사용) ===
REDIS_URL=redis://localhost:6379

# === 외부 API 키 (향후 사용) ===
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### **React 앱 환경 설정**
```bash
cd services/main-site
cp .env.example .env
```

**.env 파일:**
```env
# === API 연결 ===
VITE_API_BASE_URL=http://localhost:4000
VITE_API_PREFIX=/api

# === 개발 설정 ===
VITE_PORT=3000
VITE_OPEN_BROWSER=true
VITE_HOST=localhost

# === 기능 플래그 ===
VITE_ENABLE_ECOMMERCE=true
VITE_ENABLE_AUTH=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PWA=false

# === 디버깅 ===
VITE_DEBUG=true
VITE_LOG_LEVEL=debug

# === 외부 서비스 ===
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 🛠️ **IDE 최적화 설정**

### **VS Code 확장 프로그램**

#### **필수 확장 프로그램**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

#### **워크스페이스 설정**
```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.tsx": "typescriptreact",
    "*.ts": "typescript"
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

#### **디버깅 설정**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/services/api-server/src/main.ts",
      "outFiles": ["${workspaceFolder}/services/api-server/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    },
    {
      "name": "Debug React App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/services/main-site/node_modules/.bin/vite",
      "args": ["dev"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### **Cursor 전용 설정**

#### **AI 어시스턴트 최적화**
```json
// .cursor/settings.json
{
  "cursor.ai.enableCodeCompletion": true,
  "cursor.ai.enableInlineChat": true,
  "cursor.ai.model": "gpt-4",
  "cursor.ai.codebaseIndexing": true,
  "cursor.ai.enableDocumentationGeneration": true
}
```

---

## 🔧 **TypeScript 최적화**

### **tsconfig.json 개선**

#### **API 서버용**
```json
// services/api-server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@controllers/*": ["controllers/*"],
      "@entities/*": ["entities/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

#### **React 앱용**
```json
// services/main-site/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"],
      "@pages/*": ["pages/*"],
      "@hooks/*": ["hooks/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"],
      "@types/*": ["types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 🧪 **테스트 환경 구축**

### **Jest 설정** (API 서버)
```bash
cd services/api-server
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts']
};
```

### **Vitest 설정** (React 앱)
```bash
cd services/main-site  
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// vite.config.ts 업데이트
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

---

## 📊 **모니터링 및 디버깅 도구**

### **로그 시스템 설정**
```bash
cd services/api-server
npm install winston winston-daily-rotate-file
```

```typescript
// src/utils/logger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

export default logger;
```

### **성능 모니터링**
```typescript
// API 응답 시간 측정 미들웨어
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
```

---

## 🔄 **Git 워크플로우 설정**

### **Git Hooks 설정**
```bash
# 프로젝트 루트에서
npm install --save-dev husky lint-staged

# Husky 설정
npx husky install
npx husky add .husky/pre-commit "lint-staged"
npx husky add .husky/pre-push "npm run type-check:all"
```

```json
// package.json에 추가
{
  "lint-staged": {
    "**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "**/*.{md,json}": [
      "prettier --write"
    ]
  }
}
```

### **커밋 메시지 규칙**
```bash
# commitizen 설치
npm install --save-dev commitizen cz-conventional-changelog

# .czrc 파일 생성
echo '{ "path": "cz-conventional-changelog" }' > .czrc
```

---

## 🚀 **성능 최적화**

### **개발 서버 최적화**
```json
// nodemon.json (API 서버)
{
  "watch": ["src"],
  "ext": "ts",
  "ignore": ["src/**/*.spec.ts", "src/**/*.test.ts"],
  "exec": "ts-node src/main.ts",
  "env": {
    "NODE_ENV": "development"
  },
  "delay": 1000
}
```

### **TypeScript 컴파일 최적화**
```json
// tsconfig.json에 추가
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "ts-node": {
    "transpileOnly": true,
    "files": true
  }
}
```

---

## 🆘 **고급 문제 해결**

### **PostgreSQL 연결 문제**
```bash
# 포트 확인
sudo netstat -tlnp | grep :5432

# 서비스 상태 확인
sudo systemctl status postgresql

# 로그 확인
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# 권한 문제 해결
sudo -u postgres psql -c "ALTER USER o4o_dev CREATEDB;"
```

### **TypeScript 메모리 오류**
```bash
# Node.js 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"

# 또는 package.json scripts에 추가
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=4096' nodemon"
  }
}
```

### **포트 충돌 해결**
```bash
# 포트 사용 프로세스 확인
lsof -i :3000 :4000

# 프로세스 종료
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:4000)

# 대안 포트 사용
PORT=3001 npm run dev:web
API_PORT=4001 npm run dev:api
```

---

## ✅ **설정 완료 검증**

### **전체 시스템 테스트**
```bash
# 1. 데이터베이스 연결 테스트
cd services/api-server
npm run typeorm:check

# 2. TypeScript 컴파일 테스트
npm run type-check:all

# 3. 린트 검사
npm run lint:all

# 4. 전체 서비스 시작
npm run dev:all

# 5. API 헬스체크
curl http://localhost:4000/api/health

# 6. React 앱 접속 확인
open http://localhost:3000
```

### **성공 지표**
- ✅ PostgreSQL 연결 성공
- ✅ TypeScript 컴파일 에러 0개
- ✅ ESLint 에러 0개
- ✅ API 서버 실행 (포트 4000)
- ✅ React 앱 실행 (포트 3000)
- ✅ Hot Reload 작동
- ✅ 디버깅 브레이크포인트 작동

---

<div align="center">

**🎉 완벽한 개발환경 구축 완료! 🎉**

[🚀 5분 퀵스타트](quick-start.md) • [🐛 문제 해결](troubleshooting.md) • [📚 전체 문서](../README.md)

**이제 프로덕션 수준의 개발환경에서 코딩하세요! 💻✨**

</div>
