# 설정 파일 템플릿 모음

## 🔧 기본 설정 파일들

### 1. package.json (프로젝트 루트)
```json
{
  "name": "o4o-platform",
  "version": "1.0.0",
  "scripts": {
    "dev:api": "cd services/api-server && npm run dev",
    "dev:web": "cd services/main-site && npm run dev",
    "dev:all": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    
    "build:api": "cd services/api-server && npm run build",
    "build:web": "cd services/main-site && npm run build", 
    "build:all": "npm run build:api && npm run build:web",
    
    "start:api": "cd services/api-server && npm start",
    "start:web": "cd services/main-site && npm start",
    
    "test": "jest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "concurrently": "^7.6.0"
  }
}
```

### 2. .env.example (환경변수 템플릿)
```env
# 데이터베이스
DATABASE_URL=postgresql://username:password@localhost:5432/o4o_db
REDIS_URL=redis://localhost:6379

# 인증
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# 서버 설정
API_PORT=4000
WEB_PORT=3000
NODE_ENV=development

# 외부 서비스
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 이메일
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. .gitignore (프로젝트 루트)
```gitignore
# 환경 파일
.env
.env.local
.env.*.local

# 의존성
node_modules/
.pnp/
.pnp.js

# 빌드 결과물
dist/
build/
.next/
.out/

# 캐시
.cache/
.parcel-cache/
.npm/
.yarn-cache/

# 로그
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pm2.log

# 운영체제
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/settings.json
.idea/
*.swp
*.swo

# 백업 파일
*.bak
*.backup
*.old
```

### 4. ecosystem.config.js (PM2 설정)
```javascript
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './services/api-server/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log'
    },
    {
      name: 'main-site',
      script: './services/main-site/dist/index.js', 
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log', 
      log_file: './logs/web-combined.log'
    }
  ]
}
```

### 5. tsconfig.json (TypeScript 설정)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts", 
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### 6. tailwind.config.js (Tailwind CSS 설정)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
}
```

## 📋 설정 파일 체크리스트

### 새 프로젝트 시작 시
- [ ] `.env.example` → `.env` 복사 후 실제 값 입력
- [ ] `package.json` scripts 섹션 확인
- [ ] `.gitignore` 적용 확인
- [ ] TypeScript 설정 확인
- [ ] PM2 설정 테스트

### 문제 발생 시 체크포인트
- [ ] `.env` 파일 누락/오타 확인
- [ ] `package.json` 의존성 버전 확인  
- [ ] `.gitignore` 누락 파일 확인
- [ ] PM2 프로세스 상태 확인

### 설정 파일 백업 규칙
```bash
# 수정 전 백업
cp .env .env.backup
cp package.json package.json.backup

# Git으로 변경사항 추적
git add . && git commit -m "Update config files"
```

## 🔄 버전별 설정 업데이트

### Node.js 업그레이드 시
1. `.nvmrc` 파일 업데이트
2. `package.json` engines 필드 수정
3. CI/CD 파이프라인 Node 버전 변경
4. `Dockerfile` Node 이미지 버전 업데이트

### 라이브러리 메이저 업그레이드 시
1. 공식 마이그레이션 가이드 확인
2. 설정 파일 템플릿 업데이트  
3. 이 문서에 변경사항 기록
4. 팀원들에게 공지

## 📍 README.md 파일 구조

### 프로젝트 루트 README.md
```markdown
# O4O Platform

## 빠른 시작
1. `git clone https://github.com/Renagang21/o4o-platform.git`
2. `cp .env.example .env` (값 입력 필요)
3. `npm install`
4. `npm run dev:all`

## 폴더 구조
- `/services/api-server` - Express API 서버
- `/services/main-site` - React 웹앱
- `/docs` - 프로젝트 문서

## 문서
- [환경 설정](docs/01-setup/environment-setup.md)
- [문제 해결](docs/02-operations/troubleshooting.md)
- [설정 파일](docs/01-setup/config-templates.md)
```

### 서비스별 README.md
- `services/api-server/README.md` - API 설치/실행 가이드
- `services/main-site/README.md` - 웹앱 빌드/배포 가이드

---

**마지막 업데이트**: 2024-06-18  
**담당자**: Development Team  
**다음 리뷰**: 설정 변경 시 또는 월 1회