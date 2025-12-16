# O4O 플랫폼 1차 구조 조사 보고서

**조사 일자**: 2025-12-16
**조사 목적**: 플랫폼 구조/상태 인식 및 문제 유형 분류
**조사 단계**: 1차 (코드 수정 없음, 현황 파악만)

---

## 1. 조사 범위 및 방법

### 조사 대상
1. 플랫폼 Core Apps (6개)
2. Extension/Service Apps (32개)
3. AppStore / App Lifecycle 시스템
4. CMS View System
5. API Server 구조

### 조사 방법
- 파일 구조 분석
- manifest.ts 정의 확인
- lifecycle 파일 존재 여부 확인
- 시스템 간 연결 상태 점검

---

## 2. 현재 플랫폼 구조 요약

### 2.1 Core Apps (6개) - 모두 존재, 구조 완비

| Core App | 상태 | 구조 완성도 | 비고 |
|----------|------|-------------|------|
| auth-core | FROZEN | 100% | entities 마이그레이션 대기 |
| platform-core | FROZEN | 100% | dependencies 미등록 |
| cms-core | FROZEN | 100% | Phase 18 진행 중 |
| organization-core | FROZEN | 100% | createRoutes 바인딩 필요 |
| ecommerce-core | Active | 100% | 완전 구현됨 |
| dropshipping-core | Active | 100% | createRoutes 바인딩 필요 |

**Core 의존성 그래프**:
```
auth-core (독립)
cms-core (독립)
organization-core (독립)
    │
    ├── ecommerce-core
    └── dropshipping-core

platform-core → auth-core
```

### 2.2 Extension/Service Apps (32개 manifest.ts 보유)

**앱 유형 분포**:
- Core: 10개
- Extension: 22개
- Utility (manifest 없음): 16개

**Lifecycle 상태**:
- 완전 구현: 26개 (81.3%)
- 불완전/미구현: 6개 (18.7%)
  - cosmetics-sample-display-extension (index only)
  - cosmetics-supplier-extension (index only)
  - partner-ai-builder (미구현)
  - pharmaceutical-core (미구현)
  - pharmacyops (미구현)
  - yaksa-scheduler (미구현)

### 2.3 AppStore 아키텍처

**세 가지 시스템 공존** (구조적 이슈):
```
1. 정적 카탈로그 (appsCatalog.ts)     → 검색/필터링용
2. 매니페스트 인덱스 (index.ts)        → Import/Require
3. Runtime Registry (moduleLoader)    → 실제 로드/활성화
```

**앱 상태 영속성**: 없음 (메모리 기반, 서버 재시작 시 초기화)

### 2.4 CMS View System

**Registry 완성도**:
- ViewRegistry: 100% 구현
- NavigationRegistry: 100% 구현
- DynamicRouter: 100% 구현

**Admin Dashboard 통합**: 마이그레이션 중 (Phase P0 Task B)
- 하드코딩된 Router.tsx 사용 중
- ViewComponentRegistry 정의만 있고 실제 사용 안 함

### 2.5 API Server 구조

**라우트 구성**:
- Admin: `/api/v1/admin/*`
- Public: `/api/v1/public/*`
- Core: `/api/v1/{service}` (auth, cms, users, forum 등)
- App: `/api/v1/{appId}` (동적 로드)

**인증/권한**:
- JWT 기반 인증 (authenticate)
- RoleAssignment 기반 권한 (requireAdmin, requireRole)
- Tenant Context 지원 (tenantContextEnhanced)

---

## 3. 문제 유형 분류

### 3.1 구조 불일치

| 문제 | 영향 | 심각도 |
|------|------|--------|
| AppStore 3가지 시스템 비동기화 | 앱 목록 불일치 | 중 |
| Admin/Public API prefix 혼재 | 호출 경로 혼란 | 중 |
| Core/App 라우트 중복 (auth vs auth-core) | 엔드포인트 혼란 | 중 |
| Package naming 불일치 (@o4o vs @o4o-apps) | 의존성 관리 혼란 | 낮 |

### 3.2 등록 누락

| 문제 | 영향 | 심각도 |
|------|------|--------|
| 6개 앱 lifecycle 미구현 | AppStore 설치 실패 가능 | 높 |
| digital-signage-core viewTemplates 빈 배열 | View 등록 안 됨 | 중 |
| platform-core, auth-core dependencies 미등록 | disabled-apps 상태 | 중 |

### 3.3 권한/메뉴/라우팅 문제

| 문제 | 영향 | 심각도 |
|------|------|--------|
| 동적 라우트 ServiceGroup 보호 미적용 | 앱 API 무방비 | 높 |
| 동적 라우트 Tenant 보호 미적용 | 테넌트 분리 실패 | 높 |
| Lifecycle Hook dataSource 미전달 | Install hook 실패 가능 | 높 |

### 3.4 환경 구분 문제

| 문제 | 영향 | 심각도 |
|------|------|--------|
| 앱 상태 영속성 없음 | 서버 재시작 시 상태 초기화 | 높 |
| Backend module 로드 실패 시 silent fail | 라우트 등록 안 됨 | 중 |

---

## 4. 조치 분류

### 4.1 Critical (즉시 수정 필요)

1. **동적 라우트 보호 적용**
   - 위치: `apps/api-server/src/main.ts:446-449`
   - 문제: ServiceGroup/Tenant 보호 미적용
   - 권장: `getModuleRouter()` 옵션 활성화

2. **Lifecycle Hook Context 정정**
   - 위치: `apps/api-server/src/modules/module-loader.ts`
   - 문제: dataSource 미전달
   - 권장: Install context에 dataSource 포함

3. **앱 상태 영속성 추가**
   - 위치: 신규 테이블/서비스 필요
   - 문제: 설치된 앱 상태가 서버 재시작 시 초기화
   - 권장: `installed_apps` 테이블 생성

### 4.2 Work Order로 분리 (Fix Later)

1. **불완전한 Lifecycle 앱 정비** (6개)
   - cosmetics-sample-display-extension
   - cosmetics-supplier-extension
   - partner-ai-builder
   - pharmaceutical-core
   - pharmacyops
   - yaksa-scheduler

2. **AppStore 시스템 통합**
   - 정적 카탈로그 + 동적 로더 통합
   - AppRegistry와 AppStore 단일화

3. **Admin Dashboard 동적 라우팅 마이그레이션**
   - ViewComponentRegistry 활성화
   - DynamicRouteLoader 사용
   - 하드코딩된 Router.tsx 제거

4. **Package naming 통일**
   - @o4o vs @o4o-apps 정책 결정

5. **Core App 잔여 작업**
   - auth-core entities 마이그레이션
   - cms-core Phase 18 완료
   - dropshipping-core/organization-core createRoutes 바인딩

### 4.3 Acceptable (현 단계에서 무시 가능)

1. viewTemplates 빈 배열 (digital-signage-core)
   - 해당 앱이 별도 Router로 동작 중

2. 일부 앱의 실험적 상태
   - CLAUDE.md에 따른 experimental 분류

---

## 5. 핵심 발견 사항

### 5.1 구조적 강점

- 모든 Core 앱이 CLAUDE.md 기준 준수
- 의존성 순환 참조 없음 (DAG 구조)
- CMS View System Registry 완전 구현
- 인증/권한 미들웨어 체계적으로 구현

### 5.2 구조적 약점

- **3중 앱 관리 시스템**: 정적 카탈로그, 매니페스트 인덱스, 런타임 레지스트리가 분리
- **상태 영속성 부재**: 앱 설치 상태가 메모리에만 존재
- **보호 미적용**: 동적 라우트에 ServiceGroup/Tenant Guard 미적용
- **마이그레이션 미완료**: Admin Dashboard가 여전히 하드코딩된 라우트 사용

### 5.3 운영 안정성 판단

| 항목 | 상태 | 비고 |
|------|------|------|
| Core 기능 | 안정 | FROZEN 정책으로 보호 |
| 앱 설치/활성화 | 불안정 | 상태 영속성 없음 |
| API 접근 제어 | 부분 안정 | 동적 라우트 보호 필요 |
| View 시스템 | 구현 완료 | 프론트엔드 통합 필요 |

---

## 6. 다음 단계 권장

### 2차 조사: 문제 유형별 심층 조사

1. **Critical 이슈 상세 분석**
   - 동적 라우트 보호 영향 범위
   - Lifecycle Context 실패 케이스

2. **앱별 상태 점검**
   - 실제 빌드 가능 여부
   - Runtime 에러 케이스

### 3차 단계: 안정화 기준 확정 + Work Order 분리

1. 안정화 기준 정의
2. 개별 Work Order 생성
3. 우선순위 결정

---

## 7. 파일 경로 참조

### Core 구조
- `/packages/auth-core/src/manifest.ts`
- `/packages/platform-core/src/manifest.ts`
- `/packages/cms-core/src/manifest.ts`
- `/packages/organization-core/src/manifest.ts`
- `/packages/ecommerce-core/src/manifest.ts`
- `/packages/dropshipping-core/src/manifest.ts`

### AppStore 관련
- `/apps/api-server/src/services/AppStoreService.ts`
- `/apps/api-server/src/modules/module-loader.ts`
- `/apps/api-server/src/app-manifests/appsCatalog.ts`
- `/apps/api-server/src/app-manifests/disabled-apps.registry.ts`

### CMS View System
- `/packages/cms-core/src/view-system/view-registry.ts`
- `/packages/cms-core/src/view-system/navigation-registry.ts`
- `/packages/cms-core/src/view-system/dynamic-router.ts`

### API Server
- `/apps/api-server/src/main.ts`
- `/apps/api-server/src/middleware/auth.middleware.ts`
- `/apps/api-server/src/middleware/permission.middleware.ts`
- `/apps/api-server/src/middleware/tenant-context.middleware.ts`

---

*이 보고서는 코드 수정 없이 현황 파악만을 목적으로 작성되었습니다.*
*조치 항목의 실제 구현은 별도 Work Order를 통해 진행되어야 합니다.*
