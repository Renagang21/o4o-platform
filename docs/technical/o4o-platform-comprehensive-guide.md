# O4O Platform 종합 가이드
*Claude Code 작업 시 필수 참조 문서*

## 🌐 GitHub 저장소 정보

### 주요 저장소
- **메인 플랫폼**: https://github.com/Renagang21/o4o-platform
- **문서**: https://github.com/Renagang21/o4o-platform/tree/main/docs
- **공통 코어**: https://github.com/Renagang21/common-core

## 📦 O4O Platform 패키지 버전 현황표

**프로젝트**: O4O Platform (React 19 + Vite 6 모노레포)  
**업데이트**: 2025-07-01  
**상태**: React 19 완전 호환 ✅

### 🚀 프로덕션 의존성 (34개)

#### 🎯 Tiptap Rich Text Editor (14개)
| 패키지명 | 버전 | 상태 |
|---------|------|------|
| @tiptap/core | ^2.22.0 | ✅ |
| @tiptap/react | ^2.22.0 | ✅ |
| @tiptap/starter-kit | ^2.22.0 | ✅ |
| @tiptap/extension-color | ^2.22.0 | ✅ |
| @tiptap/extension-highlight | ^2.22.0 | ✅ |
| @tiptap/extension-image | ^2.22.0 | ✅ |
| @tiptap/extension-link | ^2.22.0 | ✅ |
| @tiptap/extension-table | ^2.22.0 | ✅ |
| @tiptap/extension-table-cell | ^2.22.0 | ✅ |
| @tiptap/extension-table-header | ^2.22.0 | ✅ |
| @tiptap/extension-table-row | ^2.22.0 | ✅ |
| @tiptap/extension-text-align | ^2.22.0 | ✅ |
| @tiptap/extension-text-style | ^2.22.0 | ✅ |
| @tiptap/suggestion | ^2.22.3 | ✅ |

#### 🎨 UI & Animation (4개)
| 패키지명 | 버전 | 상태 |
|---------|------|------|
| motion | ^12.19.2 | ✅ |
| clsx | ^2.1.1 | ✅ |
| tailwind-merge | ^2.5.5 | ✅ |
| lucide-react | ^0.523.0 | ✅ |

#### ⚛️ React 생태계 (10개)
| 패키지명 | 버전 | 상태 |
|---------|------|------|
| react | ^19.1.0 | ✅ |
| react-dom | ^19.1.0 | ✅ |
| react-router-dom | ^7.6.0 | ✅ |
| react-hook-form | ^7.49.3 | ✅ |
| react-hot-toast | ^2.5.2 | ✅ |
| react-toastify | ^11.0.5 | ✅ |
| react-chartjs-2 | ^5.3.0 | ✅ |
| react-dropzone | ^14.3.8 | ✅ |
| react-icons | ^5.5.0 | ✅ |
| @tanstack/react-query | ^5.0.0 | ✅ |

#### 📊 Data & Utility (5개)
| 패키지명 | 버전 | 상태 |
|---------|------|------|
| axios | ^1.10.0 | ✅ |
| chart.js | ^4.4.9 | ✅ |
| date-fns | ^3.3.1 | ✅ |
| js-cookie | ^3.0.5 | ✅ |
| zustand | ^5.0.5 | ✅ |

#### 🌐 Communication (1개)
| 패키지명 | 버전 | 상태 |
|---------|------|------|
| socket.io-client | ^4.7.4 | ✅ |

### 🛠️ 개발 의존성 (21개)

#### 📝 TypeScript & Types (5개)
| 패키지명 | 버전 | 상태 |
|---------|------|------|
| typescript | ~5.8.3 | ✅ |
| typescript-eslint | ^8.30.1 | ✅ |
| @types/react | ^19.1.2 | ✅ |
| @types/react-dom | ^19.1.2 | ✅ |
| @types/js-cookie | ^3.0.6 | ✅ |

#### 🔧 Build Tools (4개)
| 패키지명 | 버전 | 상태 |
|---------|------|------|
| vite | ^6.3.5 | ✅ |
| @vitejs/plugin-react | ^4.4.1 | ✅ |
| postcss | ^8.5.3 | ✅ |
| autoprefixer | ^10.4.21 | ✅ |

#### 🎨 Styling Tools (2개)
| 패키지명 | 버전 | 상태 |
|---------|------|------|
| tailwindcss | ^4.1.11 | ✅ |
| @tailwindcss/postcss | ^4.1.11 | ✅ |

### ⚙️ 시스템 요구사항
| 도구 | 버전 | 상태 |
|------|------|------|
| Node.js | 20.18.0 | ✅ |
| npm | 10.9.2 | ✅ |
| TypeScript | 5.8.3 | ✅ |

## 🏗️ 현재 서비스 구조 및 미래 확장 고려사항

### 현재 서비스 아키텍처 (2025년 7월)
```
o4o-platform/           # 메인 플랫폼 (neture.co.kr) ✅ 개발 중
├── services/
│   ├── main-site/      # 메인 사이트 (헬스케어 플랫폼)
│   ├── admin-dashboard/# 관리자 대시보드
│   ├── api-server/     # API 서버
│   ├── ecommerce/      # 이커머스 모듈
│   ├── crowdfunding/   # 크라우드펀딩
│   ├── signage/        # 디지털 사이니지
│   └── forum/          # 포럼
├── shared/             # 공유 컴포넌트 및 유틸리티
│   ├── components/     # 공통 컴포넌트
│   ├── hooks/          # 공통 훅
│   ├── lib/            # 라이브러리
│   └── utils/          # 유틸리티
└── docs/               # 문서

common-core/           # 공통 코어 모듈 ✅ 개발 중 (별도 저장소)
├── auth/              # 인증 연동 모듈
├── claude/            # Claude 관련
├── tiptap/            # 에디터
└── utils/             # 유틸리티

auth-service/          # 별도 저장소 (공통 인증) ✅ 개발 중

미래 확장 예정:
ai-service/            # AI 서비스 (별도 도메인) 🔄 개발 예정
rpa-services/          # RPA 서비스 (별도 도메인) 🔄 개발 예정
```

### Shared 폴더 상세 구조
```
shared/
├── components/
│   ├── admin/         # 관리자 컴포넌트
│   ├── dropshipping/  # 드랍쉬핑 컴포넌트
│   ├── editor/        # 에디터 컴포넌트
│   ├── healthcare/    # 헬스케어 컴포넌트
│   ├── layouts/       # 레이아웃 컴포넌트
│   ├── patterns/      # 패턴 컴포넌트
│   ├── shortcodes/    # 숏코드 컴포넌트
│   ├── theme/         # 테마 관련
│   └── ui/            # UI 컴포넌트
├── hooks/             # 공통 훅
├── lib/               # 라이브러리
├── styles/            # 스타일
├── types/             # 타입 정의
└── utils/             # 유틸리티
```

## 🚨 반복되는 코딩 실수 패턴 및 해결방안

### 1. Import 경로 오류 (가장 빈번한 실수)
**문제 패턴:**
```typescript
// ❌ 잘못된 import - components 경로 누락
import { DropshippingRouter } from '@shared/dropshipping';
import { HealthcareMainPage } from '@shared/healthcare';

// ✅ 올바른 import
import { DropshippingRouter } from '@shared/components/dropshipping';
import { HealthcareMainPage } from '@shared/components/healthcare';

// ✅ 더 안전한 방법 - 직접 경로 사용
import { DropshippingRouter } from '../../shared/components/dropshipping';
```

**근본 원인:**
- shared 폴더 구조가 `shared/components/[module-name]`인데 계속 `components`를 빼먹음
- vite.config.ts의 alias 설정과 실제 사용이 불일치

### 2. 빌드 검증 없는 배포
**문제 패턴:**
- 로컬에서 `npm run build` 없이 바로 커밋&푸시
- 빌드 실패하는 코드가 프로덕션에 배포됨
- 연속적인 "fix" 커밋 발생

**필수 작업 절차:**
```bash
# 1. 수정 전 빌드 상태 확인
npm run build

# 2. 코드 수정

# 3. 수정 후 반드시 빌드 테스트
npm run build

# 4. 빌드 성공 시에만 커밋
git add .
git commit -m "fix: [구체적 수정 내용]"
```

### 3. Error Boundary 남용
**문제:** 근본 원인(import 에러) 해결 대신 Error Boundary로 감싸기만 함

**올바른 접근:**
1. 먼저 import 에러 해결
2. 빌드 성공 확인
3. 그 다음 Error Boundary는 예외 상황 대비용으로만 사용

### 4. 개발/운영 환경 혼동
**문제:** 운영 서버에서 개발 모드로 실행

**환경 설정 원칙:**
- 개발: NODE_ENV=development
- 운영: NODE_ENV=production
- 절대 운영에서 VITE_DEV_MODE=true 사용 금지

## 💡 프론트엔드 개발 필수 원칙

### 1. 기존 코드베이스 절대 보호
- 새로운 기능 추가 시 기존 기능을 절대 깨트리지 않음
- 모든 기존 import, 컴포넌트, 서비스는 그대로 유지
- 기존 라우팅 구조 변경 금지 (추가만 허용)

### 2. 점진적 개발 원칙
- 한 번에 모든 것을 바꾸지 않음
- 새로운 기능은 독립적인 모듈로 구현
- 기존 시스템과 분리된 상태로 먼저 구현 후 통합

### 3. 에러 전파 방지
```typescript
// 모든 페이지 컴포넌트에 기본 적용
const SafeComponent = lazy(() => 
  import('./Component').catch(() => 
    ({ default: () => <div>컴포넌트 로딩 실패</div> })
  )
);

// 라우팅에서 안전하게 사용
<Route 
  path="/feature" 
  element={
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <SafeComponent />
      </Suspense>
    </ErrorBoundary>
  } 
/>
```

## 📋 Claude Code 필수 체크리스트

### 작업 시작 전
- [ ] 현재 빌드 상태 확인: `npm run build`
- [ ] 프로젝트 구조 파악: `ls -la shared/components/`
- [ ] 최근 커밋 확인: `git log --oneline -5`
- [ ] 실제 파일 위치 확인: `find . -name "*.tsx" | grep [component-name]`

### 코드 수정 시
- [ ] Import 경로 정확성 확인 (특히 @shared 사용 시)
- [ ] 각 수정 후 빌드 테스트
- [ ] TypeScript 타입 에러 확인: `npx tsc --noEmit`
- [ ] 기존 기능 영향도 확인

### 커밋 전
- [ ] `npm run build` 성공 확인
- [ ] `npm run type-check` 성공 확인
- [ ] 브라우저에서 로컬 테스트
- [ ] 기존 기능 영향도 확인

### 자주 하는 실수 방지
- [ ] @shared/[module] → @shared/components/[module] 경로 확인
- [ ] 새 기능이 기존 기능을 깨트리지 않는지 확인
- [ ] Error Boundary는 마지막 수단으로만 사용
- [ ] 운영 환경에서 개발 모드 설정 금지

## 🛡️ 현재 구조 대응 지침

### Auth 연동 방식 명확화 (최우선)
```typescript
// 방안 1: Auth를 API 서비스로 사용 (권장)
// common-core/auth/AuthApiClient.ts
export class AuthApiClient {
  private baseUrl = process.env.AUTH_SERVICE_URL || 'https://auth.example.com';
  
  async login(credentials: LoginRequest): Promise<AuthResult> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  }
}
```

### 의존성 방향 정리
```
현재 복잡한 구조:
o4o-platform → common-core → auth-service (별도 저장소)

권장 단순 구조:
o4o-platform → common-core/auth (API 클라이언트)
                     ↓ (HTTP 요청)
auth-service (독립 서비스)
```

## 🚨 절대 금지사항

### 코드 수정 시
- ❌ 빌드 테스트 없이 커밋
- ❌ 에러 메시지만 보고 추측으로 수정
- ❌ 한 번에 여러 곳 동시 수정
- ❌ 기존 컴포넌트 파일 직접 수정
- ❌ 전역 App.tsx 대폭 수정

### Import 수정 시
- ❌ 증상 치료식 파일명 변경
- ❌ 임시방편 import 경로 수정
- ❌ 검증 없는 alias 의존

### 스타일링
- ❌ 전역 CSS 파일 수정
- ❌ 기존 클래스명과 충돌하는 스타일
- ❌ z-index 무분별한 사용
- ❌ 기존 컴포넌트 스타일 오버라이드

### 라우팅
- ❌ 기존 라우트 경로 변경
- ❌ 중복되는 경로 생성
- ❌ 전체 라우팅 구조 재설계
- ❌ 기존 네비게이션 메뉴 임의 수정

## ✅ 권장 개발 패턴

### 모듈 독립성 확보
```typescript
// ✅ 각 기능별 독립적인 라우터
// src/features/healthcare/HealthcareRouter.tsx
export const HealthcareRouter = () => (
  <Routes>
    <Route index element={<MainPage />} />
    <Route path="demo" element={<DemoPage />} />
    <Route path="admin" element={<AdminPage />} />
  </Routes>
);
```

### 점진적 통합
```typescript
// ✅ 기존 코드에 최소한의 변경으로 통합
// App.tsx
const App = () => (
  <Router>
    <Routes>
      {/* 기존 라우트들 */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      
      {/* 새로운 기능 라우트 */}
      <Route path="/healthcare/*" element={<HealthcareModule />} />
    </Routes>
  </Router>
);
```

## 🔧 즉시 적용 가능한 수정 패턴

### Import 에러 즉시 해결
```typescript
// 문제가 되는 import
import { HealthcareMainPage } from "@shared/healthcare";

// 즉시 해결 방법 1: 올바른 alias 경로
import { HealthcareMainPage } from "@shared/components/healthcare";

// 즉시 해결 방법 2: 직접 경로 (더 안전)
import { HealthcareMainPage } from "../../../shared/components/healthcare";

// 즉시 해결 방법 3: 조건부 import
const HealthcareMainPage = lazy(() => 
  import('../../../shared/components/healthcare/HealthcareMainPage')
    .catch(() => ({ default: () => <div>페이지 로딩 실패</div> }))
);
```

### 500 에러 즉시 해결
```typescript
// 모든 페이지 컴포넌트를 안전하게 감싸기
export const SafePage = ({ component: Component, ...props }) => (
  <ErrorBoundary fallback={<div>페이지를 불러올 수 없습니다</div>}>
    <Suspense fallback={<div>로딩 중...</div>}>
      <Component {...props} />
    </Suspense>
  </ErrorBoundary>
);

// 사용
<Route path="/healthcare" element={<SafePage component={HealthcarePage} />} />
```

## 📝 작업 요청 템플릿

```
🎯 [기능명] 개발/수정 요청

**현재 문제:**
[구체적인 에러 메시지 및 증상]

**체계적 진단 요청:**
1. 전체 빌드 에러 확인 (npm run build)
2. 실제 파일 구조 vs import 경로 매칭
3. vite.config.ts alias 설정 검증
4. TypeScript 타입 에러 확인

**수정 원칙:**
- 기존 코드베이스 보호
- Error Boundary로 에러 격리
- 각 수정 후 빌드 검증
- 직접 경로 사용 권장

**성공 기준:**
- npm run build 완전 성공
- 전체 사이트 정상 작동
- 타입 에러 0개

이 가이드를 참고하여 체계적으로 작업해주세요!
```

## 🎯 현재 우선순위 작업

1. **즉시 해결: 헬스케어 플랫폼 안정화**
   - Auth 에러와 무관하게 헬스케어 메인화면 정상 작동
   - 로그인 없이도 정보 열람 가능한 구조
   - Auth 연동은 추후 점진적 통합

2. **Import 경로 일관성 확보**
   - 모든 @shared import를 @shared/components로 수정
   - 또는 직접 경로 사용으로 전환

3. **빌드 프로세스 안정화**
   - pre-commit hook 설정
   - CI/CD에서 빌드 검증 강화

---

**이 문서는 O4O Platform 개발 시 Claude Code가 참조해야 할 핵심 정보를 담고 있습니다. 특히 반복되는 실수 패턴을 방지하고 안정적인 개발을 위해 반드시 준수해야 합니다.**