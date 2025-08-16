# O4O 메인 사이트 번들 최적화 조사 결과

**조사일**: 2025년 8월 5일  
**대상**: apps/main-site  
**목표**: 2.5MB → 1MB 이하 달성

---

## 1. 현재 상태

### 번들 크기 측정 [측정 완료]
- **빌드 성공**: 직접 vite 명령 실행으로 빌드 성공
- **실제 번들 크기**:
  - 총 번들 크기: 약 1.2MB (gzip: 435KB)
  - 메인 번들 (index.js): 973KB (gzip: 216KB) - 최대 청크
  - vendor 번들들: 50-51KB 각각
  - 코드 스플리팅: 부분적으로 적용됨

### 빌드 에러 원인 분석 [해결됨]
- **문제**: Vite가 "2"를 경로로 인식하여 "2/index.html"을 찾으려 함
- **원인**: npm run 명령어 실행 시 알 수 없는 이유로 스크립트 끝에 "2"가 추가됨
- **해결 방법**: 
  1. `npx vite build --mode production` 직접 실행 (성공)
  2. `NODE_ENV=production npx vite build --mode production` 직접 실행 (성공)
- **index.html 위치**: `/home/user/o4o-platform/apps/main-site/index.html` (정상 존재)

### 주요 문제점 (우선순위별)
1. **Barrel Files 과다 사용** - 9개 barrel file 발견
2. **대용량 의존성** - UI 프레임워크 및 유틸리티 라이브러리
3. **코드 스플리팅 미흡** - manual chunking은 설정되어 있으나 효과 제한적
4. **중복 번들링 가능성** - 모노레포 패키지 별칭 설정으로 인한 중복

---

## 2. Barrel Files 현황

### 발견된 Barrel Files (9개)
| 경로 | Export 개수 | 사용 빈도 | 영향도 |
|------|------------|-----------|---------|
| `/components/beta/index.ts` | 3개 | 0회 (미사용) | 낮음 |
| `/features/test-dashboard/index.ts` | 5개 (와일드카드 포함) | 2회 | **높음** |
| `/features/test-dashboard/components/index.ts` | 4개 | 간접 사용 | 중간 |
| `/features/test-dashboard/types/index.ts` | 미확인 | 간접 사용 | 중간 |
| `/pages/dropshipping/index.ts` | 미확인 | 미확인 | 중간 |
| `/pages/healthcare/index.ts` | 미확인 | 미확인 | 낮음 |
| `/components/ErrorBoundary/index.tsx` | 1개 | 다수 | 중간 |
| `/components/LazyModules/index.tsx` | 미확인 | 미확인 | 중간 |
| `/components/TemplateRenderer/index.tsx` | 12개 이상 | 다수 | **높음** |

### 가장 문제가 되는 Barrel Files
1. **`/features/test-dashboard/index.ts`**
   ```typescript
   export * from './components';  // 와일드카드 export
   export * from './types';        // 와일드카드 export
   ```
   - 전체 컴포넌트와 타입을 무차별 export
   - tree-shaking 불가능

2. **`/components/TemplateRenderer/index.tsx`**
   - 12개 이상의 블록 컴포넌트 import
   - 사용하지 않는 블록도 번들에 포함될 가능성

---

## 3. 최적화 포인트 (영향도 순)

### 1. **Barrel Files 제거** (예상 절감: 20-30%)
- 와일드카드 export 제거
- 직접 import 경로 사용
- 특히 `test-dashboard` 모듈 개선 필수

### 2. **의존성 최적화** (예상 절감: 30-40%)
#### 주요 대용량 의존성
- `@radix-ui/*` - 별도 청크로 분리됨
- `react-icons` (5.5.0) - 전체 아이콘 번들링 위험
- `date-fns` - tree-shaking 가능하나 확인 필요
- `framer-motion` (13.1.0) - 대용량 애니메이션 라이브러리
- `@tanstack/react-query` - 이미 별도 청크

#### 권장 조치
- `react-icons` → 필요한 아이콘만 개별 import
- `date-fns` → 사용 함수만 import (현재 1개만 사용 중)
- `framer-motion` → 필요시 동적 import

### 3. **동적 Import 활용** (예상 절감: 15-20%)
- 페이지 컴포넌트 lazy loading
- 대형 기능 모듈 분리 (예: 관리자 기능, 차트 등)
- 조건부 렌더링 컴포넌트 동적 로드

### 4. **Vite 설정 개선** (예상 절감: 10-15%)
#### 현재 설정 분석
- **플러그인**: `@vitejs/plugin-react` 사용 (SWC 버전 고려)
- **타겟**: `esnext` (최신 브라우저만 지원)
- **Manual Chunks**: 이미 설정되어 있음

#### 개선 사항
```typescript
// 추가 최적화 옵션
build: {
  // CSS 코드 분할
  cssCodeSplit: true,
  // 더 공격적인 tree-shaking
  treeshake: {
    preset: 'recommended',
    manualPureFunctions: ['console.log']
  },
  // 압축 최적화
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true
    }
  }
}
```

---

## 4. Import 패턴 분석

### 문제 패턴 발견
1. **상대 경로 import 과다**: 351개 (144개 파일)
   - 모듈 경계가 불명확
   - 순환 의존성 위험

2. **Barrel import 사용**
   ```typescript
   import { TestDashboard } from './features/test-dashboard';  // barrel 사용
   ```

3. **사용하지 않는 컴포넌트**
   - `/components/beta/*` - import 횟수 0회

### 권장 패턴
```typescript
// ❌ 피해야 할 패턴
import { A, B, C } from '../../../components';
import { TestDashboard } from './features/test-dashboard';

// ✅ 권장 패턴
import A from '@/components/specific/A';
import B from '@/components/specific/B';
import { TestDashboard } from './features/test-dashboard/pages/TestDashboard';
```

---

## 5. 권장 조치사항

### 즉시 적용 가능 (1-2일)
1. **빌드 에러 임시 해결** ✅
   - npm run build 대신 직접 vite 실행으로 해결
   - 임시 해결 방법:
     ```bash
     # main-site 디렉토리에서 실행
     cd apps/main-site
     NODE_ENV=production npx vite build --mode production
     ```
   - 근본 원인은 추가 조사 필요 (npm 실행 환경 문제)

2. **미사용 코드 제거**
   - `/components/beta/*` 제거
   - 미사용 import 정리

3. **Barrel Files 제거**
   ```bash
   # 예시: test-dashboard 모듈 개선
   rm src/features/test-dashboard/index.ts
   rm src/features/test-dashboard/components/index.ts
   # 직접 import로 변경
   ```

### 단기 계획 (1주)
1. **의존성 최적화**
   - react-icons 개별 import 전환
   - date-fns 최적화
   - 불필요한 의존성 제거

2. **동적 Import 도입**
   ```typescript
   // 페이지 레벨 분할
   const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
   const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
   ```

3. **Vite 설정 최적화**
   - terser 압축 옵션 추가
   - CSS 코드 분할 활성화
   - 더 세밀한 manual chunks

### 중기 계획 (2-4주)
1. **모듈 경계 재설계**
   - feature 단위로 명확한 진입점
   - 공통 컴포넌트 최적화
   - 순환 의존성 제거

2. **번들 분석 도구 도입**
   ```bash
   npm install -D vite-bundle-visualizer
   npm install -D rollup-plugin-analyzer
   ```

3. **성능 모니터링**
   - Lighthouse CI 도입
   - 번들 크기 자동 체크
   - 성능 예산 설정

---

## 6. 예상 결과

현재 측정된 1.2MB에서 다음과 같은 개선 예상:

1. **1차 목표 (2주)**: 800KB (-33%)
   - Barrel files 제거
   - react-icons 최적화
   - 기본 코드 분할

2. **2차 목표 (4주)**: 600KB (-50%)
   - 동적 import 전면 도입
   - 미사용 코드 완전 제거
   - 압축 최적화

3. **최종 목표 (6주)**: 500KB (-58%)
   - 모듈 경계 재설계
   - 고급 최적화 기법
   - CDN 활용

---

## 결론

O4O 메인 사이트의 실제 번들 크기는 1.2MB로, 추정치(2.5MB)보다 양호한 상태입니다. 그러나 메인 번들(973KB)이 여전히 크고, **Barrel Files 남용**과 **대용량 의존성**이 주요 최적화 대상입니다.

빌드 에러는 임시 해결되었으며, Barrel Files 제거와 의존성 최적화를 통해 목표인 600KB 이하 달성이 가능할 것으로 예상됩니다.

**우선순위**: 
1. Barrel Files 제거 (특히 test-dashboard)
2. react-icons 개별 import 전환  
3. 동적 Import 적용
4. npm 실행 환경 문제 근본 해결