# CLAUDE.md Compliance Audit Report

> 작성일: 2025-12-10
> 대상: O4O Platform 전체 앱 패키지
> 기준 문서: CLAUDE.md, extension-app-guideline.md, manifest-specification.md

---

## Executive Summary

| 항목 | 결과 |
|------|------|
| 총 앱 수 | 18개 |
| TODO.md 존재 | 1개 (reporting-yaksa만) |
| Manifest 표준 준수 | 1개 (reporting-yaksa만) |
| Backend Export 표준 준수 | 2개 (reporting-yaksa, partnerops) |
| 불완전 패키지 | 2개 (lms-yaksa, cosmetics-store) |

**결론**: 대부분의 앱이 CLAUDE.md 가이드라인을 준수하지 않고 있으며, 체계적인 리팩토링이 필요합니다.

---

## 앱 분류

### Core Apps (5개)
| Package | 상태 |
|---------|------|
| organization-core | 리팩토링 필요 |
| cms-core | 리팩토링 필요 |
| forum-app | 리팩토링 필요 |
| dropshipping-core | 리팩토링 필요 |
| lms-core | 리팩토링 필요 |

### Extension Apps (11개)
| Package | 상태 |
|---------|------|
| membership-yaksa | 리팩토링 필요 |
| forum-yaksa | 리팩토링 필요 |
| forum-cosmetics | 리팩토링 필요 |
| dropshipping-cosmetics | 리팩토링 필요 |
| lms-yaksa | **불완전** (src/ 없음) |
| organization-forum | 리팩토링 필요 |
| organization-lms | 리팩토링 필요 |
| reporting-yaksa | **준수** |
| cosmetics-seller-extension | 리팩토링 필요 |
| sellerops | 리팩토링 필요 |
| supplierops | 리팩토링 필요 |
| partnerops | 부분 준수 |

### Service Apps (2개)
| Package | 상태 |
|---------|------|
| cosmetics-store | **불완전** (manifest 없음) |

---

## 상세 점검 결과

### 1. TODO.md 존재 여부

| Package | TODO.md |
|---------|---------|
| organization-core | ❌ |
| cms-core | ❌ |
| forum-app | ❌ |
| forum-yaksa | ❌ |
| forum-cosmetics | ❌ |
| membership-yaksa | ❌ |
| dropshipping-core | ❌ |
| dropshipping-cosmetics | ❌ |
| lms-core | ❌ |
| lms-yaksa | ❌ |
| organization-forum | ❌ |
| organization-lms | ❌ |
| **reporting-yaksa** | ✅ |
| cosmetics-store | ❌ |
| cosmetics-seller-extension | ❌ |
| sellerops | ❌ |
| supplierops | ❌ |
| partnerops | ❌ |

---

### 2. Manifest 필드 표준화 점검

#### 필수 필드 표준
```typescript
// 올바른 형식
{
  appId: 'app-name',           // NOT 'id'
  displayName: '앱 이름',      // NOT 'name'
  appType: 'extension',        // NOT 'type'
  dependencies: {
    core: ['dep1', 'dep2'],    // NOT object format
    optional: [],
  },
  ownsTables: ['table1'],
  backend: { ... },
  lifecycle: { ... },
  menus: { ... },              // NOT 'menu'
  exposes: { ... },
}
```

#### 필드별 준수 현황

| Package | appId | displayName | appType | dependencies | ownsTables | backend | lifecycle | menus | exposes |
|---------|-------|-------------|---------|--------------|------------|---------|-----------|-------|---------|
| organization-core | ❌ id | ❌ name | ❌ type | ❌ object | ✅ | ❌ | ✅ | ❌ routes | ❌ |
| cms-core | ❌ id | ❌ name | ❌ type | ❌ object | ✅ | ❌ | ✅ | ❌ menu | ❌ |
| forum-app | ❌ 없음 | ❌ name | ❌ 없음 | ❌ object | ✅ | ❌ | ❌ | ❌ | ❌ |
| forum-yaksa | ✅ | ❌ name | ❌ type | ❌ object | ✅ | ❌ | ❌ | ❌ | ❌ |
| forum-cosmetics | ❌ id | ❌ name | ❌ type | ❌ object | ✅ | ❌ | ❌ | ❌ | ❌ |
| membership-yaksa | ✅ | ❌ name | ❌ type | ❌ object | ✅ | ❌ | ❌ | ❌ menu | ❌ |
| dropshipping-core | ❌ id | ❌ name | ❌ type | ⚠️ mixed | ✅ | ❌ | ⚠️ onXxx | ❌ | ❌ |
| dropshipping-cosmetics | ❌ id | ❌ name | ❌ type | ❌ object | ✅ | ❌ | ❌ | ❌ | ❌ |
| lms-core | ❌ id | ❌ name | ❌ type | ⚠️ mixed | ✅ | ❌ | ⚠️ onXxx | ❌ | ❌ |
| lms-yaksa | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| organization-forum | ❌ id | ❌ name | ❌ type | ⚠️ mixed | ❌ | ❌ | ⚠️ onXxx | ❌ | ❌ |
| organization-lms | ❌ id | ❌ name | ❌ type | ❌ object | ❌ | ❌ | ❌ | ❌ | ❌ |
| **reporting-yaksa** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cosmetics-store | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| cosmetics-seller-extension | ❌ 없음 | ❌ name | ❌ type | ❌ object | ✅ | ❌ | ✅ | ❌ | ❌ |
| sellerops | ❌ id | ❌ name | ❌ type | ⚠️ dependsOn | ❌ | ❌ | ⚠️ onXxx | ❌ | ❌ |
| supplierops | ❌ id | ❌ name | ❌ type | ⚠️ dependsOn | ❌ | ❌ | ⚠️ onXxx | ❌ | ❌ |
| partnerops | ✅ | ❌ name | ❌ type | ⚠️ dependsOn | ❌ | ❌ | ✅ | ❌ | ❌ |

**범례**: ✅ 준수 / ❌ 미준수 / ⚠️ 부분 준수 / N/A 해당 없음

---

### 3. Backend Export 표준화 점검

#### 표준 형식
```typescript
// backend/index.ts 또는 src/index.ts
export * from './entities/index.js';
export * from './services/index.js';
export * from './controllers/index.js';

export function routes(dataSource: DataSource): Router { ... }
export const createRoutes = routes;

export const entities = [...];
export const services = { ... };
```

#### 점검 결과

| Package | entities export | services export | createRoutes | routes() |
|---------|-----------------|-----------------|--------------|----------|
| organization-core | ✅ | ✅ | ❌ | ❌ |
| cms-core | ✅ | ❌ | ❌ | ❌ |
| forum-app | ✅ | ❌ | ❌ | ❌ |
| forum-yaksa | ✅ | ✅ | ❌ | ❌ |
| forum-cosmetics | ❌ | ✅ | ❌ | ❌ |
| membership-yaksa | ✅ | ❌ | ❌ | ✅ |
| dropshipping-core | ✅ | ✅ | ❌ | ❌ |
| dropshipping-cosmetics | ❌ | ❌ | ❌ | ❌ |
| lms-core | ✅ | ❌ | ❌ | ❌ |
| lms-yaksa | N/A | N/A | N/A | N/A |
| organization-forum | ⚠️ | ⚠️ | ❌ | ❌ |
| organization-lms | ❌ | ❌ | ❌ | ❌ |
| **reporting-yaksa** | ✅ | ✅ | ✅ | ✅ |
| cosmetics-store | N/A | N/A | N/A | N/A |
| cosmetics-seller-extension | ❌ | ❌ | ❌ | ❌ |
| sellerops | ❌ | ✅ | ❌ | ❌ |
| supplierops | ❌ | ✅ | ❌ | ❌ |
| **partnerops** | ❌ | ✅ | ✅ | ❌ |

---

### 4. Lifecycle Hook 네이밍 점검

#### 표준 형식
```typescript
lifecycle: {
  install: './lifecycle/install.js',
  activate: './lifecycle/activate.js',
  deactivate: './lifecycle/deactivate.js',
  uninstall: './lifecycle/uninstall.js',
}
```

#### 비표준 형식 (수정 필요)
```typescript
// ❌ 잘못된 형식
lifecycle: {
  onInstall: '...',    // → install
  onActivate: '...',   // → activate
  onDeactivate: '...', // → deactivate
  onUninstall: '...',  // → uninstall
}
```

#### 점검 결과

| Package | 형식 | 상태 |
|---------|------|------|
| organization-core | install/activate/... | ✅ |
| cms-core | install/activate/... | ✅ |
| forum-app | 없음 | ❌ |
| forum-yaksa | 없음 | ❌ |
| forum-cosmetics | 없음 | ❌ |
| membership-yaksa | 없음 | ❌ |
| dropshipping-core | onInstall/onActivate/... | ⚠️ |
| dropshipping-cosmetics | 없음 | ❌ |
| lms-core | onInstall/onActivate/... | ⚠️ |
| organization-forum | onInstall/onActivate/... | ⚠️ |
| organization-lms | 없음 | ❌ |
| **reporting-yaksa** | install/activate/... | ✅ |
| cosmetics-seller-extension | install/activate/... | ✅ |
| sellerops | onInstall/onActivate/... | ⚠️ |
| supplierops | onInstall/onActivate/... | ⚠️ |
| partnerops | install/activate/... | ✅ |

---

## 리팩토링 우선순위

### P0 - Critical (즉시 수정)

#### 불완전 패키지 완성
1. **lms-yaksa**: src/ 디렉토리 및 기본 구조 생성
2. **cosmetics-store**: manifest.ts 및 기본 구조 생성

### P1 - High (Core Apps 우선)

#### Core Apps 표준화 (의존성 영향 큼)
1. **organization-core** - 가장 많은 앱이 의존
2. **cms-core** - CMS 기능 핵심
3. **forum-app** - 포럼 기능 핵심
4. **dropshipping-core** - 드롭쉬핑 기능 핵심
5. **lms-core** - LMS 기능 핵심

### P2 - Medium (Extension Apps)

#### Extension Apps 표준화
1. **membership-yaksa** - 회원 관리 핵심
2. **forum-yaksa** - 약사회 포럼
3. **dropshipping-cosmetics** - 화장품 드롭쉬핑
4. **sellerops** - 셀러 운영
5. **supplierops** - 공급자 운영
6. **partnerops** - 파트너 운영 (부분 준수)

### P3 - Low (신규/미완성)

1. **organization-forum** - 기본 구조만 존재
2. **organization-lms** - 기본 구조만 존재
3. **forum-cosmetics** - 기본 구조만 존재
4. **cosmetics-seller-extension** - 신규

---

## 리팩토링 작업 항목

### 모든 앱 공통

1. **TODO.md 생성**
   - `docs/templates/APP_TODO_TEMPLATE.md` 템플릿 사용
   - 현재 개발 상태 및 다음 작업 기록

2. **Manifest 필드명 표준화**
   ```typescript
   // Before
   id: 'app-name',
   name: 'App Name',
   type: 'extension',

   // After
   appId: 'app-name',
   displayName: 'App Name',
   appType: 'extension',
   ```

3. **Dependencies 형식 변경**
   ```typescript
   // Before
   dependencies: {
     'organization-core': '>=1.0.0',
   },

   // After
   dependencies: {
     core: ['organization-core'],
     optional: [],
   },
   ```

4. **Lifecycle 네이밍 통일**
   ```typescript
   // Before
   lifecycle: {
     onInstall: './lifecycle/onInstall.js',
   },

   // After
   lifecycle: {
     install: './lifecycle/install.js',
   },
   ```

5. **Menu → Menus 변경**
   ```typescript
   // Before
   menu: { admin: [...] },

   // After
   menus: { admin: [...], member: [...] },
   ```

6. **Backend 섹션 추가**
   ```typescript
   backend: {
     entities: ['Entity1', 'Entity2'],
     services: ['Service1', 'Service2'],
     controllers: ['Controller1'],
     routesExport: 'createRoutes',
   },
   ```

7. **Exposes 섹션 추가**
   ```typescript
   exposes: {
     services: ['ExposedService'],
     types: ['ExposedType'],
     events: ['app.event.type'],
   },
   ```

8. **Backend Export 표준화**
   - `createRoutes` 또는 `routes` 함수 export
   - `entities` 배열 export
   - `services` 객체 export

---

## 참조 구현

**reporting-yaksa**를 표준 참조 구현으로 사용할 것을 권장합니다.

- Manifest: `packages/reporting-yaksa/src/manifest.ts`
- Backend Export: `packages/reporting-yaksa/src/backend/index.ts`
- Routes: `packages/reporting-yaksa/src/backend/routes/index.ts`
- TODO: `packages/reporting-yaksa/TODO.md`

---

## 리팩토링 실행 순서

```
1. Core Apps (organization-core → cms-core → forum-app → ...)
   ↓
2. Extension Apps (membership-yaksa → forum-yaksa → ...)
   ↓
3. Service Apps (cosmetics-store → ...)
   ↓
4. 전체 빌드 및 테스트
```

**주의**: Core App 변경 시 의존하는 Extension/Service App에 영향을 미치므로 Core 변경 후 반드시 영향도 검증 필요

---

*이 보고서는 CLAUDE.md, extension-app-guideline.md, manifest-specification.md, refactoring-audit-guideline.md를 기준으로 작성되었습니다.*
