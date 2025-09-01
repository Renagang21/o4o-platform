# O4O Platform 미사용 파일 분석 보고서
Generated on: Mon Sep  1 14:38:34 KST 2025

## admin-dashboard
**Total source files:** 597
**Entry points:**
- admin-dashboard/src/api/index.ts
- admin-dashboard/src/App.tsx
- admin-dashboard/src/main.tsx
- admin-dashboard/src/test-utils/mocks/server.ts
- admin-dashboard/src/pages/categories/index.ts
- admin-dashboard/src/types/index.ts
- admin-dashboard/src/components/editor/types/index.ts
- admin-dashboard/src/components/shortcodes/dropshipping/index.ts
- admin-dashboard/src/components/shortcodes/dropshipping/supplier/index.ts
- admin-dashboard/src/components/shortcodes/dropshipping/affiliate/index.ts
- admin-dashboard/src/components/common/index.ts
- admin-dashboard/src/blocks/media/index.ts
- admin-dashboard/src/blocks/layout/index.ts
- admin-dashboard/src/blocks/core/index.ts
- admin-dashboard/src/blocks/index.ts

**Unused files:** 136 files (1.69MB)
**Categories:**
- Test files: 3
- Legacy/unused features: 133
- Commented out imports: 6

## api-server
**Total source files:** 551
**Entry points:**
- api-server/src/routes/post-creation/index.ts
- api-server/src/routes/content/index.ts
- api-server/src/services/index.ts
- api-server/src/config/index.ts
- api-server/src/modules/affiliate/index.ts
- api-server/src/server.ts
- api-server/src/middleware/index.ts
- api-server/src/swagger/schemas/index.ts
- api-server/src/types/index.ts

**API structure:**
- Route files: 97
- Controller files: 70
- Entity files: 118
- Service files: 89
- Estimated unused: ~58 files

## main-site
**Total source files:** 362
**Entry points:**
- main-site/src/features/test-dashboard/index.ts
- main-site/src/features/test-dashboard/types/index.ts
- main-site/src/features/test-dashboard/components/index.ts
- main-site/src/test/mocks/server.ts
- main-site/src/App.tsx
- main-site/src/main.tsx
- main-site/src/pages/dropshipping/index.ts
- main-site/src/pages/healthcare/index.ts
- main-site/src/components/beta/index.ts

**Page analysis:**
- Total pages: 118
- Used in router: 22
- Potentially unused: 96
- Test files: 4

## crowdfunding
**Total source files:** 17
**Entry points:**
- crowdfunding/src/App.tsx
- crowdfunding/src/main.tsx

**Structure:**
- Components: 4
- Pages: 6
- Test files: 1
- Estimated unused: ~1 files

## digital-signage
**Total source files:** 33
**Entry points:**
- digital-signage/src/App.tsx
- digital-signage/src/main.tsx

**Structure:**
- Components: 3
- Pages: 20
- Test files: 141
- Estimated unused: ~141 files

## ecommerce
**Total source files:** 86
**Entry points:**
- ecommerce/src/config/index.ts
- ecommerce/src/stores/index.ts
- ecommerce/src/hooks/index.ts
- ecommerce/src/main.tsx
- ecommerce/src/lib/api/index.ts
- ecommerce/src/pages/products/index.ts
- ecommerce/src/components/review/index.ts
- ecommerce/src/components/shortcodes/index.ts
- ecommerce/src/components/product/index.ts
- ecommerce/src/components/order/index.ts
- ecommerce/src/components/cart/index.ts
- ecommerce/src/components/common/index.ts

**Structure:**
- Components: 27
- Pages: 19
- Test files: 1
- Estimated unused: ~1 files

## forum
**Total source files:** 25
**Entry points:**
- forum/src/App.tsx
- forum/src/main.tsx

**Structure:**
- Components: 4
- Pages: 12
- Test files: 1
- Estimated unused: ~1 files

## api-gateway
**Total source files:** 9
**Entry points:**
- api-gateway/src/server.ts

**Structure:**
- Components: 0
- Pages: 0
- Test files: 1
- Estimated unused: ~1 files


# 전체 요약
- **총 파일 수:** 1680
- **미사용 파일 추정:** 439
- **사용률:** 73%
- **추정 절약 공간:** 1.61MB

# 삭제 안전성 분석

## ✅ 안전하게 삭제 가능
1. **테스트 파일들**
   - `*.test.tsx`, `*.spec.ts` 파일들
   - `__tests__` 디렉토리 내 파일들
   - 예상 절약: ~300KB

2. **백업 파일들**
   - `users-backup` 디렉토리
   - `.backup`, `.old` 확장자 파일들
   - 예상 절약: ~500KB

3. **중복 기능 파일들**
   - admin-dashboard에서 주석 처리된 import들
   - 같은 기능의 여러 버전 (UserList.tsx vs UsersListBulk.tsx)
   - 예상 절약: ~800KB

## ⚠️ 검토 필요
1. **큰 기능 파일들**
   - `ThemeApprovals.tsx` (26KB) - 향후 사용 가능성
   - `AffiliatePerformanceDashboard.tsx` (14KB) - 제휴 기능
   - Policy 관련 파일들 - 정책 설정 기능

2. **동적 import 가능성**
   - 일부 컴포넌트는 조건부로 로드될 수 있음
   - 앱별 feature toggle에 따른 동적 로딩

## 🔄 아카이브 권장
1. **미완성 기능들**
   - Forum 관련 파일들 (향후 완성 예정)
   - Crowdfunding 세부 기능들
   - Template/Pattern builder 기능들

# 실행 계획

## Phase 1: 즉시 삭제 가능 (안전)
1. 모든 테스트 파일들
2. users-backup 디렉토리
3. 명시적으로 주석 처리된 파일들
**예상 절약:** ~1.2MB

## Phase 2: 검토 후 삭제
1. 중복 기능 파일들 비교 분석
2. 큰 파일들의 실제 사용 여부 확인
3. 동적 import 여부 확인
**예상 절약:** ~300KB

## Phase 3: 아카이브
1. 미완성 기능들을 별도 디렉토리로 이동
2. 향후 사용 가능성이 있는 대용량 파일들
3. 레거시 버전들 보관

