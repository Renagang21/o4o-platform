# Antigravity 조사 요청: CosmeticsPartnerRoutines 페이지 렌더링 문제

## 문제 요약

**페이지**: `https://admin.neture.co.kr/cosmetics-partner/routines`
**증상**: 페이지 로딩 시 화면에 아무것도 표시되지 않음 (콘솔 에러 없음)
**발생일**: 2025-12-14
**심각도**: High - 사용자 기능 완전 차단

---

## 문제 설명

CosmeticsPartnerRoutines 페이지가 AG Design System 컴포넌트(AGPageHeader, AGSection, AGKPIGrid, AGKPIBlock 등)를 사용하도록 Phase 7-H에서 리디자인되었습니다. 그러나 배포 후 페이지에 아무 내용도 렌더링되지 않습니다.

### 현상
- URL 접근 시 빈 화면만 표시
- 브라우저 콘솔에 JavaScript 에러 없음
- 네트워크 탭에서 JS 번들 정상 로딩
- React DevTools에서 컴포넌트 트리 확인 필요

---

## 영향받는 파일

### 주요 컴포넌트
```
apps/admin-dashboard/src/pages/cosmetics-partner/CosmeticsPartnerRoutines.tsx
```

### 라우터
```
apps/admin-dashboard/src/pages/cosmetics-partner/CosmeticsPartnerRouter.tsx
```

### 사용되는 AG 컴포넌트
- `AGPageHeader` (from `@o4o/ui` → `packages/ui/src/layout/AGPageHeader.tsx`)
- `AGSection` (from `@o4o/ui` → `packages/ui/src/layout/AGSection.tsx`)
- `AGKPIGrid` (from `@o4o/ui` → `packages/ui/src/ag-components/AGKPIBlock.tsx`)
- `AGKPIBlock` (from `@o4o/ui` → `packages/ui/src/ag-components/AGKPIBlock.tsx`)
- `AGCard` (from `@o4o/ui` → `packages/ui/src/ag-components/AGCard.tsx`)
- `AGButton` (from `@o4o/ui` → `packages/ui/src/ag-components/AGButton.tsx`)
- `AGInput` (from `@o4o/ui` → `packages/ui/src/ag-components/AGInput.tsx`)
- `AGTag` (from `@o4o/ui` → `packages/ui/src/ag-components/AGTag.tsx`)
- `AGModal` (from `@o4o/ui` → `packages/ui/src/ag-components/AGModal.tsx`)
- `AGConfirmModal` (from `@o4o/ui` → `packages/ui/src/ag-components/AGModal.tsx`)

---

## 이미 시도한 조사 및 수정

### 1. Props 불일치 수정
AGKPIBlock 컴포넌트의 props 불일치 발견 및 수정:
```tsx
// Before (잘못된 props)
<AGKPIBlock label="전체 루틴" value={stats.total} color="blue" />

// After (수정됨)
<AGKPIBlock title="전체 루틴" value={stats.total} colorMode="info" />
```
**결과**: 문제 해결 안됨

### 2. 라우터 구조 확인
- `App.tsx`에서 `/cosmetics-partner/*` 라우트 정상 등록됨
- `CosmeticsPartnerRouter.tsx`에서 `routines` 경로 정상 매핑됨
- `AppRouteGuard`로 `cosmetics-partner-extension` 앱 보호 중

### 3. AppStore 등록 확인
- `cosmetics-partner-extension` 앱이 `appsCatalog.ts`에 등록됨
- 사용자가 AppStore에서 앱 활성화 완료

### 4. AdminLayout 충돌 검토
- 페이지가 `AdminLayout` 내부에서 렌더링됨
- 다른 cosmetics 페이지들(cosmetics/routines, cosmetics-sample 등)은 동일 구조에서 정상 작동

---

## 의심되는 원인

### 1. AG 컴포넌트 Export 문제
`@o4o/ui` 패키지에서 AG 컴포넌트가 제대로 export되지 않을 수 있음:
```typescript
// packages/ui/src/index.tsx
export * from './ag-components';  // line 592
export * from './layout';         // line 595
```

### 2. 빌드 시 Tree-shaking 문제
Vite 빌드 과정에서 AG 컴포넌트가 tree-shaking으로 제거되었을 가능성

### 3. CSS/Tailwind 클래스 누락
AG 컴포넌트에서 사용하는 Tailwind 클래스가 purge되었을 가능성

### 4. React Suspense/Lazy Loading 문제
CosmeticsPartnerRouter에서 lazy loading 시 에러가 조용히 실패할 수 있음:
```tsx
const CosmeticsPartnerRoutines = lazy(() => import('./CosmeticsPartnerRoutines'));
```

### 5. 런타임 에러 (Catch되지 않음)
ErrorBoundary가 없어서 에러가 조용히 실패하고 빈 화면 표시

---

## 조사 요청 사항

### 우선순위 1: 로컬 환경에서 디버깅
1. `pnpm dev` 로 로컬 개발 서버 실행
2. `http://localhost:5173/cosmetics-partner/routines` 접근
3. 브라우저 DevTools에서:
   - Console 탭: 에러/경고 확인
   - React DevTools: 컴포넌트 트리 확인
   - Network 탭: 청크 파일 로딩 확인
   - Source 탭: 브레이크포인트로 렌더링 과정 추적

### 우선순위 2: AG 컴포넌트 검증
1. 간단한 테스트 페이지 생성:
```tsx
// Test page with minimal AG components
import { AGPageHeader, AGSection, AGCard } from '@o4o/ui';

export default function TestPage() {
  console.log('TestPage rendering');
  console.log('AGPageHeader:', AGPageHeader);
  console.log('AGSection:', AGSection);

  return (
    <div>
      <AGPageHeader title="Test" description="Test page" />
      <AGSection>
        <AGCard>Test content</AGCard>
      </AGSection>
    </div>
  );
}
```

2. 각 AG 컴포넌트가 undefined인지 확인

### 우선순위 3: 비교 분석
정상 작동하는 페이지와 비교:
- `apps/admin-dashboard/src/pages/cosmetics/routines/index.tsx` (정상 작동)
- `apps/admin-dashboard/src/pages/cosmetics-partner/CosmeticsPartnerRoutines.tsx` (문제)

차이점:
1. cosmetics/routines는 AGTable, AGTablePagination 사용
2. CosmeticsPartnerRoutines는 AGKPIGrid, AGKPIBlock, 커스텀 카드 리스트 사용

---

## 참고: 정상 작동 확인된 페이지들

다음 페이지들은 AG Design System을 사용하면서 정상 작동:
- `/cosmetics/routines` - 루틴 템플릿 관리
- `/cosmetics/products` - 상품 관리
- `/cosmetics/brands` - 브랜드 관리
- `/cosmetics-sample/tracking` - 샘플 추적

---

## 연락처

문제 해결 후 결과를 공유해 주세요.

**관련 브랜치**: `develop`
**최근 커밋**: Phase 7-H cosmetics UI redesign

---

*작성일: 2025-12-14*
