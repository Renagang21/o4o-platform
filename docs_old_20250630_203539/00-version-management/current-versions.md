# 🔢 버전 관리 가이드

> **⚠️ 중요**: AI 코딩 시 반드시 이 문서의 버전을 참조하세요!  
> **최종 업데이트**: 2025-06-25  
> **목적**: 인공지능이 정확한 최신 버전으로 코딩하도록 지원

---

## 🚨 **중요한 버전 불일치 발견!**

### **Node.js 버전 불일치**
```bash
현재 시스템 설치: Node.js 22.16.0 ❌
프로젝트 요구사항: Node.js 20.18.0 ✅

# 즉시 수정 필요
nvm use 20.18.0
# 또는
nvm install 20.18.0 && nvm use 20.18.0
```

---

## 📊 **현재 프로젝트 버전 현황**

### **🌐 런타임 환경**
| 도구 | 요구 버전 | 현재 설치 | 상태 | 설정 파일 |
|------|-----------|-----------|------|-----------|
| **Node.js** | `20.18.0` | `22.16.0` | ⚠️ 불일치 | `.nvmrc`, `package.json` |
| **npm** | `>=9.0.0` | `10.9.2` | ✅ 일치 | `package.json` |
| **PostgreSQL** | `15+` | 미설정 | 🔄 설정 필요 | `docs/` |

### **🔧 개발 도구**
| 도구 | 버전 | 설정 파일 | 상태 |
|------|------|-----------|------|
| **TypeScript** | `5.8.3` | `tsconfig.json` | ✅ |
| **ESLint** | `9.29.0` | `eslint.config.js` | ✅ |
| **Prettier** | `3.0.0` | `prettier.config.js` | ✅ |
| **Jest** | `29.6.0` | `jest.config.js` | ✅ |
| **Vite** | `6.3.5` | `vite.config.ts` | ✅ |

---

## 🎯 **프레임워크 및 라이브러리 버전**

### **📱 프론트엔드 (main-site)**
```json
{
  "react": "19.1.0",                    // 최신 React 19
  "react-dom": "19.1.0",
  "react-router-dom": "7.6.0",          // 최신 React Router
  "vite": "6.3.5",                      // 최신 Vite
  "tailwindcss": "4.1.7",               // Tailwind CSS v4
  "framer-motion": "12.15.0",           // 애니메이션
  "zustand": "5.0.5",                   // 상태 관리
  "axios": "1.6.7",                     // HTTP 클라이언트
  "@tanstack/react-query": "5.0.0",     // 서버 상태 관리
  "lucide-react": "0.511.0",            // 아이콘
  "react-hook-form": "7.49.3",          // 폼 관리
  
  // TipTap 에디터 (⚠️ 버전 불일치 발견!)
  "@tiptap/core": "2.14.1",             // 핵심 라이브러리
  "@tiptap/react": "2.14.1",            
  "@tiptap/starter-kit": "2.14.1",
  "@tiptap/extension-*": "2.22.0~2.22.3" // Extensions (불일치!)
}
```

### **🔗 백엔드 (api-server)**
```json
{
  "express": "4.18.2",                  // Express.js
  "typeorm": "0.3.20",                  // ORM
  "pg": "8.11.3",                       // PostgreSQL 드라이버
  "bcryptjs": "2.4.3",                  // 비밀번호 해싱
  "jsonwebtoken": "9.0.0",              // JWT
  "winston": "3.8.2",                   // 로깅
  "cors": "2.8.5",                      // CORS
  "helmet": "6.0.1",                    // 보안 헤더
  "express-rate-limit": "6.7.0",        // 레이트 리미팅
  "socket.io": "4.6.1",                 // 실시간 통신
  "dotenv": "16.0.3"                    // 환경 변수
}
```

### **🧪 테스트 도구**
```json
{
  "jest": "29.6.0",                     // 테스트 프레임워크
  "ts-jest": "29.1.0",                  // TypeScript Jest
  "supertest": "6.3.0",                 // API 테스트
  "vitest": "2.1.8",                    // Vite 테스트 (main-site)
  "@playwright/test": "1.40.0"          // E2E 테스트
}
```

### **🔧 개발 도구 상세**
```json
{
  "typescript": "5.8.3",                // TypeScript
  "eslint": "9.29.0",                   // ESLint
  "prettier": "3.0.0",                  // Prettier
  "nodemon": "3.1.7",                   // 개발 서버
  "ts-node": "10.9.1",                  // TypeScript 실행
  "concurrently": "7.6.0"               // 병렬 스크립트 실행
}
```

---

## ⚙️ **설정 파일별 버전 정보**

### **package.json (Root)**
```json
{
  "engines": {
    "node": ">=20.0.0 <21.0.0",
    "npm": ">=9.0.0"
  },
  "volta": {
    "node": "20.18.0",
    "npm": "10.9.2"
  }
}
```

### **TypeScript 설정**
```json
// tsconfig.json (api-server)
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}

// tsconfig.app.json (main-site)
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "jsx": "react-jsx"
  }
}
```

### **Vite 설정**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    allowedHosts: ['neture.co.kr', 'www.neture.co.kr']
  }
})
```

---

## 🚨 **AI 코딩 시 필수 참조 사항**

### **❌ 절대 사용하지 말 것**
```bash
# 잘못된 버전들 (AI가 제안할 수 있는 오래된 버전들)
React 18.x                  # 현재는 React 19.1.0 사용
React Router 6.x            # 현재는 7.6.0 사용
Tailwind CSS 3.x           # 현재는 4.1.7 사용
Node.js 18.x               # 현재는 20.18.0 사용
TypeScript 4.x             # 현재는 5.8.3 사용
Vite 4.x 또는 5.x          # 현재는 6.3.5 사용

# TipTap 버전 혼용 주의!
@tiptap/core@2.14.1과 @tiptap/extension-*@2.22.x 혼용 금지
```

### **✅ 반드시 사용할 것**
```bash
# 정확한 현재 버전들
React 19.1.0               # 최신 React 19
React Router DOM 7.6.0     # 최신 React Router
Tailwind CSS 4.1.7         # Tailwind CSS v4
Node.js 20.18.0            # LTS 버전
TypeScript 5.8.3           # 최신 TypeScript
Vite 6.3.5                 # 최신 Vite

# TipTap 에디터 (버전 통일 필요)
@tiptap/core 2.22.3        # 모든 패키지 동일 버전으로!
```

### **📝 AI 프롬프트 예시**
```markdown
"React 19.1.0과 TypeScript 5.8.3을 사용하여 컴포넌트를 만들어주세요."
"Express 4.18.2와 TypeORM 0.3.20을 사용하여 API 엔드포인트를 작성해주세요."
"현재 프로젝트는 Tailwind CSS 4.1.7을 사용합니다."
```

---

## 🔧 **환경 설정 명령어**

### **Node.js 버전 맞추기**
```bash
# NVM으로 올바른 버전 설치 및 사용
nvm install 20.18.0
nvm use 20.18.0

# 확인
node --version  # v20.18.0이어야 함
npm --version   # 10.9.2여야 함
```

### **의존성 설치**
```bash
# 루트에서 전체 의존성 설치
npm run install:all

# 개별 서비스 의존성 설치
cd services/api-server && npm install
cd services/main-site && npm install
```

### **버전 확인 명령어**
```bash
# 런타임 버전 확인
node --version
npm --version

# TypeScript 버전 확인
npx tsc --version

# 프로젝트 의존성 확인
npm list --depth=0
```

---

## 📋 **호환성 매트릭스**

### **Node.js 20.18.0 호환성**
| 도구 | 호환 버전 | 상태 |
|------|-----------|------|
| npm | 9.0.0+ | ✅ 10.9.2 |
| TypeScript | 5.0+ | ✅ 5.8.3 |
| Jest | 29.0+ | ✅ 29.6.0 |
| ESLint | 8.0+ | ✅ 9.29.0 |

### **React 19.1.0 호환성**
| 라이브러리 | 요구 버전 | 현재 버전 | 상태 |
|------------|-----------|-----------|------|
| React DOM | 19.x | 19.1.0 | ✅ |
| React Router | 6.8+ | 7.6.0 | ✅ |
| React Hook Form | 7.0+ | 7.49.3 | ✅ |
| Framer Motion | 10.0+ | 12.15.0 | ✅ |

---

## 🎯 **버전 업데이트 정책**

### **Major 버전 업데이트**
- **사전 논의 필수**: 팀 승인 후 진행
- **테스트 필수**: 전체 기능 테스트 완료 후 적용
- **문서 업데이트**: 이 문서 즉시 업데이트

### **Minor/Patch 업데이트**
- **보안 패치**: 즉시 적용
- **버그 수정**: 테스트 후 적용
- **새 기능**: 필요시 적용

### **의존성 업데이트 주기**
- **매주**: 보안 패치 확인
- **매월**: Minor 버전 업데이트 검토
- **분기별**: Major 버전 업데이트 계획

---

## 🔗 **관련 문서**

- [개발 환경 설정](../01-getting-started/development-setup.md)
- [퀵스타트 가이드](../01-getting-started/quick-start.md)
- [알려진 이슈](../current-status/known-issues.md)

---

<div align="center">

**🔢 정확한 버전으로 일관된 개발 환경! 🔢**

**⚠️ AI 코딩 시 반드시 이 문서를 참조하여 올바른 버전 사용! ⚠️**

[🚀 퀵스타트](../01-getting-started/quick-start.md) • [🛠️ 개발 가이드](../04-development/) • [📊 프로젝트 현황](../current-status/project-status.md)

</div>
