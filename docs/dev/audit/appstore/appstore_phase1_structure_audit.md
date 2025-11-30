# O4O Platform App Store - Phase 1 구조 감사 보고서

**작성일**: 2025-11-30
**감사 범위**: App Store 전체 구조 (엔진, 메타데이터, 앱 목록, 의존성, UX)
**목적**: App Store 시스템의 현재 상태 파악 및 지부/분회 서비스 적합성 평가

---

## Executive Summary

O4O Platform의 App Store는 **Feature-level 앱 관리 시스템**으로, Core/Extension 패턴을 지원하는 모듈형 아키텍처를 채택하고 있습니다. 현재 4개의 Core 앱과 3개의 Extension 앱이 Catalog에 등록되어 있으며, 실제 설치는 `forum-core`와 `digitalsignage` 2개만 활성화되어 있습니다.

### 주요 발견사항

**강점:**
- Core/Extension 패턴을 통한 수직 특화 기능 확장 가능
- 의존성 해결 및 순환 참조 감지 기능 완비
- 데이터 소유권 검증 및 Purge/Keep-Data 정책 지원
- Admin Dashboard에서 직관적인 설치/삭제 UI 제공

**한계:**
- Catalog에 등록된 앱과 실제 설치된 앱 간 불일치 (migration에서 2개만 설치)
- Dropshipping Core/Extension은 Catalog에 있으나 manifest registry에 미등록
- digitalsignage manifest가 소스 코드에 없음 (dist에만 존재)
- Extension 앱의 ACF/CPT 확장 기능이 선언적이나 실제 동작 검증 필요
- Main Site에서의 App Store 기능 부재 (Admin 전용)

**지부/분회 서비스 적합성:**
- 지부별 독립 Forum 운영 가능 (forum-core + 지부 extension)
- 조직 계층별 앱 활성화 관리 미흡 (현재는 전역 설치만 지원)
- Multi-tenancy 고려 부족 (businessId 기반 앱 인스턴스 분리 필요)

---

## A. App Store 엔진 구조 상세 분석

### A.1. 디렉토리 구조

```
apps/api-server/src/
├── app-manifests/               # Manifest 중앙 레지스트리
│   ├── index.ts                 # Manifest 로더 (4개 앱 등록)
│   ├── appsCatalog.ts           # 설치 가능한 앱 카탈로그 (4개 앱)
│   ├── forum.manifest.ts        # forum-core manifest 재export
│   └── (digitalsignage.manifest 소스 없음, dist에만 존재)
│
├── services/
│   ├── AppManager.ts            # 핵심 앱 관리 서비스
│   ├── AppDependencyResolver.ts # 의존성 그래프 & 토폴로지 정렬
│   ├── AppTableOwnershipResolver.ts # 데이터 소유권 검증
│   └── AppDataCleaner.ts        # 언인스톨 시 데이터 삭제
│
├── entities/
│   ├── AppRegistry.ts           # app_registry 테이블 엔티티
│   └── App.ts                   # apps 테이블 (구 시스템, integration/block 용도)
│
├── controllers/
│   └── apps.controller.ts       # AI 앱 실행용 (App Market V0)
│
├── routes/admin/
│   └── apps.routes.ts           # App Store API (V1 - Feature-level apps)
│
├── database/migrations/
│   ├── 8000000000000-CreateAppRegistryTable.ts  # app_registry 생성
│   ├── 8000000000001-SeedInitialApps.ts         # forum, digitalsignage 설치
│   └── 8000000000002-AddTypeAndDependenciesToAppRegistry.ts
│
└── constants/
    └── coreTables.ts            # Core 앱 테이블/CPT/ACF 레지스트리

packages/
├── forum-app/src/manifest.ts    # forum-core manifest 정의
├── forum-neture/src/manifest.ts # forum-neture extension manifest
├── forum-yaksa/src/manifest.ts  # forum-yaksa extension manifest
├── dropshipping-core/src/manifest.ts
└── dropshipping-cosmetics/src/manifest.ts

apps/admin-dashboard/src/
├── pages/apps/AppStorePage.tsx  # App Store UI
├── api/admin-apps.ts            # App Store API 클라이언트
└── hooks/useAppStatus.ts        # 앱 상태 조회 훅
```

### A.2. 설치/삭제/활성화/비활성화 처리 흐름

#### 설치 플로우 (Install)

```
1. Admin UI → POST /api/admin/apps/install {appId}
2. AppManager.install(appId)
3. AppDependencyResolver.resolveInstallOrder(appId)
   - collectDependencies() 재귀적 의존성 수집
   - buildDependencyGraph() 의존성 그래프 구축
   - detectCycle() 순환 참조 감지
   - topologicalSort() 설치 순서 결정
4. For each app in installOrder:
   - loadLocalManifest(appId)
   - AppTableOwnershipResolver.validateOwnership(manifest)
     → Extension이 Core 테이블 소유 시도 시 에러
     → 선언된 테이블이 DB에 없으면 에러
   - Create/Update app_registry entry
   - PermissionService.registerPermissions(manifest.permissions)
   - CPTRegistry.register(manifest.cpt)
   - ACFRegistry.register(manifest.acf)
   - Run lifecycle.install hook (if exists)
5. Auto-activate (default: true)
```

#### 활성화 플로우 (Activate)

```
1. AppManager.activate(appId)
2. Check app_registry: status must be 'installed' or 'inactive'
3. Run lifecycle.activate hook (if exists)
4. Update status = 'active'
```

#### 비활성화 플로우 (Deactivate)

```
1. AppManager.deactivate(appId)
2. Run lifecycle.deactivate hook (if exists)
3. Update status = 'inactive'
```

#### 언인스톨 플로우 (Uninstall)

```
1. AppManager.uninstall(appId, {force, purgeData})
2. AppDependencyResolver.findDependents(appId)
   → 의존 앱 존재 시 force=false면 에러
3. If force=true: Cascade uninstall dependents first
4. Deactivate app (if active)
5. If purgeData=true:
   - AppTableOwnershipResolver.getVerifiedOwnedResources(manifest)
   - AppDataCleaner.purge({ownsTables, ownsCPT, ownsACF})
     → DROP TABLE CASCADE
     → Delete CPT registrations (TODO)
     → Delete ACF groups (TODO)
6. Run lifecycle.uninstall hook (if exists)
7. PermissionService.deletePermissionsByApp(appId)
8. ACFRegistry.unregisterByApp(appId)
9. Remove from app_registry
```

### A.3. Manifest 메타데이터 구조

**AppManifest 타입 정의** (`packages/types/src/app-manifest.ts`):

```typescript
interface AppManifest {
  appId: string;                    // 고유 식별자
  name: string;                     // 표시명
  version: string;                  // Semver 버전
  type?: 'core' | 'extension' | 'standalone';
  description?: string;

  // Uninstall 정책
  uninstallPolicy?: {
    defaultMode?: 'keep-data' | 'purge-data';
    allowPurge?: boolean;
    autoBackup?: boolean;
  };

  // 데이터 소유권 선언
  ownsTables?: string[];            // 소유한 DB 테이블
  ownsCPT?: string[];               // 소유한 CPT 타입
  ownsACF?: string[];               // 소유한 ACF 그룹

  // 기능 정의
  routes?: string[];                // 앱이 처리하는 라우트
  permissions?: string[];           // 필요한 권한
  cpt?: ManifestCPTDefinition[];    // CPT 정의
  acf?: ACFGroupDefinition[];       // ACF 필드 그룹

  // 라이프사이클 훅
  lifecycle?: {
    install?: string;               // './lifecycle/install.js'
    activate?: string;
    deactivate?: string;
    uninstall?: string;
  };

  // 의존성 (2가지 형식 지원)
  dependencies?: {
    apps?: string[];                // Legacy 형식
    minVersions?: Record<string, string>;
  } | Record<string, string>;       // Core/Extension 형식 {"forum-core": ">=1.0.0"}

  // Extension 전용
  extendsApp?: string;              // 확장 대상 Core 앱
  extendsCPT?: string[];            // 확장할 CPT 목록

  // 메뉴 정의
  menu?: {
    id: string;
    label: string;
    icon: string;
    path: string;
    position: number;
    children?: MenuItem[];
  };
}
```

### A.4. 앱 간 의존성 정의 규칙

**의존성 선언 형식**:
```typescript
// Core/Extension 패턴 (권장)
dependencies: {
  "forum-core": ">=1.0.0",
  "commerce-core": "^2.0.0"
}

// Legacy 형식 (구 시스템)
dependencies: {
  apps: ["forum", "ecommerce"],
  minVersions: {
    "forum": "1.0.0",
    "ecommerce": "2.0.0"
  }
}
```

**의존성 해결 알고리즘**:
1. **재귀적 수집**: DFS로 의존성 트리 탐색
2. **버전 검증**: semver.satisfies()로 설치된 버전 확인
3. **순환 감지**: DFS + recursion stack으로 cycle 탐지
4. **토폴로지 정렬**: Kahn's Algorithm으로 설치 순서 결정
5. **언인스톨 순서**: 설치 순서의 역순 (의존 앱 먼저 삭제)

### A.5. App Registry vs App (구 시스템) 차이

| 항목 | `app_registry` (신규) | `apps` (구 시스템) |
|------|----------------------|-------------------|
| **용도** | Feature-level 앱 (forum, dropshipping) | Integration/Block/Shortcode 앱 (Google AI, OpenAI) |
| **관리 대상** | 앱 설치/활성화 상태 | 앱 정의 및 실행 설정 |
| **타입** | core, extension, standalone | integration, block, shortcode, widget |
| **라이프사이클** | install → activate → deactivate → uninstall | 상시 활성 (실행 시 API 키 필요) |
| **의존성** | 지원 (dependencies 필드) | 미지원 |
| **데이터 소유** | ownsTables, ownsCPT, ownsACF | 없음 |

**결론**: 두 시스템은 독립적으로 운영되며, 혼동 가능성 존재. 향후 통합 필요.

### A.6. App Store 동작 위치

| 컴포넌트 | 위치 | 역할 |
|---------|------|------|
| **App Store Engine** | API Server | 앱 설치/삭제/활성화 로직 |
| **App Registry DB** | PostgreSQL | 설치된 앱 상태 저장 |
| **Manifest Registry** | API Server (in-memory) | 앱 정의 로드 |
| **Admin UI** | Admin Dashboard | 설치/관리 인터페이스 |
| **Main Site** | ❌ 미지원 | 사용자 대상 앱 사용만 (설치 불가) |

### A.7. 확장성 및 제약사항

**확장성**:
- ✅ 새 앱 추가: manifest 작성 → packages에 배포 → appsCatalog에 등록
- ✅ Extension 패턴: Core 앱 유지하며 vertical 기능 추가
- ✅ 의존성 자동 해결: 설치 시 필요 앱 자동 설치
- ✅ Lifecycle hook: 설치/활성화 시 커스텀 로직 실행

**제약사항**:
- ❌ Remote 앱 설치 미지원 (현재 local manifest만)
- ❌ Multi-tenancy 부족 (app_registry가 전역 설치만 지원)
- ❌ 버전 업그레이드 시 migration 자동 실행 불가
- ❌ ACF/CPT 삭제 기능 미구현 (TODO 상태)
- ❌ 앱별 설정(config) 저장소 없음 (AppInstance와 분리)

---

## B. 등록된 앱 목록 및 분류표

### B.1. App Catalog (설치 가능 앱 목록)

**위치**: `apps/api-server/src/app-manifests/appsCatalog.ts`

| 앱 이름 | Slug | 버전 | 타입 | 카테고리 | 설명 | 비고 |
|--------|------|------|------|---------|------|------|
| Forum Core | `forum` | 1.0.0 | core | community | 커뮤니티 게시판 기능 (게시글/댓글/카테고리/태그) | Catalog에서 appId='forum'이나 실제 manifest는 'forum-core' |
| Digital Signage | `digitalsignage` | 1.1.0 | standalone | display | 매장용 디지털 사이니지 콘텐츠 관리 및 스케줄링 | Manifest 소스 파일 없음 |
| Forum Extension – Neture | `forum-neture` | 1.0.0 | extension | community | 화장품 매장 특화 포럼 (피부타입/루틴/제품 연동) | Manifest 존재, Catalog 등록 |
| Forum Extension – Yaksa | `forum-yaksa` | 1.0.0 | extension | community | 약사 조직 특화 포럼 (복약지도/케이스 스터디) | Manifest 존재, Catalog 등록 |

**Catalog 미등록 앱** (manifest는 존재):
- `dropshipping-core` (packages/dropshipping-core/src/manifest.ts)
- `dropshipping-cosmetics` (packages/dropshipping-cosmetics/src/manifest.ts)

### B.2. Manifest Registry (코드에 등록된 앱)

**위치**: `apps/api-server/src/app-manifests/index.ts`

```typescript
const manifestRegistry: Record<string, AppManifest> = {
  forum: forumManifest,                  // @o4o-apps/forum
  digitalsignage: digitalsignageManifest, // 로컬 (소스 없음)
  'forum-neture': forumNetureManifest,   // @o4o-apps/forum-neture
  'forum-yaksa': forumYaksaManifest,     // @o4o-apps/forum-yaksa
};
```

**누락된 앱**:
- `dropshipping-core`, `dropshipping-cosmetics`: manifest 파일은 존재하나 registry에 미등록

### B.3. 실제 설치된 앱 (Migration 기준)

**위치**: `apps/api-server/src/database/migrations/8000000000001-SeedInitialApps.ts`

| appId | name | version | status | 비고 |
|-------|------|---------|--------|------|
| forum | Forum | 1.0.0 | active | Seed migration에서 설치 |
| digitalsignage | Digital Signage | 1.0.0 | active | Seed migration에서 설치 |

**불일치 사항**:
- Catalog에는 `forum-neture`, `forum-yaksa`도 있으나 기본 설치되지 않음
- `dropshipping` 관련 앱은 manifest는 있으나 catalog/migration에 누락

### B.4. 각 앱의 역할, 기능, 의존성

#### Forum Core (`forum-core`)

**역할**: 커뮤니티 포럼의 핵심 엔진

**주요 기능**:
- 게시글(Post) 작성/수정/삭제
- 댓글(Comment) 시스템
- 카테고리(Category) 계층 구조
- 태그(Tag) 시스템
- 좋아요(Like), 북마크(Bookmark)

**데이터 소유권**:
```typescript
ownsTables: [
  'forum_post', 'forum_category', 'forum_comment',
  'forum_tag', 'forum_like', 'forum_bookmark'
]
ownsCPT: ['forum_post', 'forum_category', 'forum_comment', 'forum_tag']
ownsACF: []
```

**권한**:
```typescript
permissions: [
  'forum.read', 'forum.write', 'forum.comment',
  'forum.moderate', 'forum.admin'
]
```

**Lifecycle Hooks**:
- `install`: ./lifecycle/install.js
- `activate`: ./lifecycle/activate.js
- `deactivate`: ./lifecycle/deactivate.js
- `uninstall`: ./lifecycle/uninstall.js

**Uninstall 정책**:
- defaultMode: `keep-data`
- allowPurge: `true`
- autoBackup: `true`

**의존성**: 없음 (Core 앱)

---

#### Forum Extension – Neture (`forum-neture`)

**역할**: Forum Core를 화장품 매장 특화 기능으로 확장

**확장 기능**:
- 피부 타입 필터링 (건성/지성/복합성/민감성)
- 루틴 빌더
- 제품(Product) 연동
- 화장품 특화 카테고리

**데이터 소유권**:
```typescript
ownsTables: []  // Extension은 Core 테이블 소유 불가
extendsCPT: [
  {
    name: 'forum_post',
    acfGroup: 'cosmetic_meta'  // forum_post에 ACF 추가
  }
]
```

**ACF 정의**:
```typescript
acf: [
  {
    groupId: 'cosmetic_meta',
    label: '화장품 메타데이터',
    fields: [
      { key: 'skinType', type: 'select', options: ['건성', '지성', '복합성', '민감성'] },
      { key: 'concerns', type: 'multiselect', options: ['여드름', '주름', '미백', '모공', '탄력'] },
      { key: 'routine', type: 'array', label: '루틴 단계' },
      { key: 'productIds', type: 'array', label: '관련 제품 ID' }
    ]
  }
]
```

**의존성**:
```typescript
dependencies: {
  'forum-core': '>=1.0.0'  // forum-core 필수
}
```

**Uninstall 정책**:
- defaultMode: `keep-data`
- allowPurge: `true`
- autoBackup: `false` (Extension 데이터는 덜 중요)

---

#### Forum Extension – Yaksa (`forum-yaksa`)

**역할**: Forum Core를 약사 조직 특화 기능으로 확장

**확장 기능**:
- 복약지도 케이스 공유
- 약물 정보 DB 연동
- 약사 인증 필터
- 전문 지식 Q&A

**데이터 소유권**:
```typescript
ownsTables: []
extendsCPT: [
  {
    name: 'forum_post',
    acfGroup: 'yaksa_meta'
  }
]
```

**의존성**:
```typescript
dependencies: {
  'forum-core': '>=1.0.0'
}
```

---

#### Digital Signage (`digitalsignage`)

**역할**: 매장용 디지털 사이니지 콘텐츠 관리

**주요 기능**:
- 콘텐츠 관리 (이미지/비디오/슬라이드)
- 재생 스케줄링
- 디스플레이 기기 관리
- 재생목록(Playlist) 관리

**권한**:
```typescript
permissions: [
  'signage.read', 'signage.write',
  'signage.schedule', 'signage.admin'
]
```

**문제점**:
- ❌ manifest 소스 파일이 `apps/api-server/src/app-manifests/`에 없음
- ❌ dist 폴더에만 컴파일된 코드 존재
- ❌ CPT/ACF 정의 없음 (구현 미완성)

**의존성**: 없음

---

#### Dropshipping Core (`dropshipping-core`)

**역할**: 멀티벤더 드랍쉬핑 마켓플레이스 엔진

**주요 기능**:
- 상품(Product) 관리
- 공급업체(Supplier) 관리
- 판매자(Seller) 관리
- 파트너(Partner) 수수료 관리
- 정산(Settlement) 시스템

**데이터 소유권**:
```typescript
ownsTables: [
  'products', 'suppliers', 'sellers', 'seller_products',
  'seller_authorizations', 'partners', 'commissions',
  'commission_policies', 'partner_commissions', 'settlements',
  'settlement_items', 'partner_profiles', 'seller_profiles',
  'supplier_profiles', 'channel_product_links',
  'seller_channel_accounts', 'payment_settlements'
]
ownsCPT: ['ds_product', 'ds_supplier', 'ds_seller', 'ds_partner']
```

**권한**:
```typescript
permissions: [
  'dropshipping.read', 'dropshipping.write', 'dropshipping.admin',
  'seller.read', 'seller.write', 'seller.admin',
  'supplier.read', 'supplier.write', 'supplier.admin',
  'partner.read', 'partner.write', 'partner.admin',
  'commission.view', 'commission.calculate', 'commission.admin',
  'settlement.view', 'settlement.process', 'settlement.admin'
]
```

**문제점**:
- ❌ Manifest 존재하나 `appsCatalog.ts`에 미등록
- ❌ Manifest Registry (`index.ts`)에도 미등록
- ❌ 설치 불가 (AppManager가 manifest 로드 불가)

**의존성**: 없음 (Core 앱)

---

#### Dropshipping Cosmetics Extension (`dropshipping-cosmetics`)

**역할**: Dropshipping Core를 화장품 산업 특화 기능으로 확장

**확장 기능**:
- 피부 타입 매칭
- 성분(Ingredient) 정보
- 루틴 추천
- 제품 인증 정보

**데이터 소유권**:
```typescript
ownsTables: []
extendsCPT: ['ds_product']
cpt: ['cosmetics_influencer_routine']  // Extension 전용 CPT
```

**ACF 정의**:
```typescript
acf: [
  {
    groupId: 'cosmetics_metadata',
    label: 'Cosmetics Information',
    appliesTo: 'ds_product',
    fields: [
      { key: 'skinType', type: 'multiselect' },
      { key: 'concerns', type: 'multiselect' },
      { key: 'ingredients', type: 'array' },
      { key: 'certifications', type: 'multiselect' },
      { key: 'productCategory', type: 'select' },
      { key: 'routineInfo', type: 'object' }
    ]
  },
  {
    groupId: 'influencer_routine_metadata',
    appliesTo: 'cosmetics_influencer_routine',
    fields: [
      { key: 'partnerId', type: 'string', required: true },
      { key: 'skinType', type: 'multiselect', required: true },
      { key: 'routine', type: 'array', required: true }
    ]
  }
]
```

**의존성**:
```typescript
dependencies: {
  'dropshipping-core': '^1.0.0'
}
```

**문제점**:
- ❌ Catalog 미등록
- ❌ Manifest Registry 미등록
- ❌ dropshipping-core도 설치 불가하므로 사용 불가

---

### B.5. 앱 간 관계 다이어그램

```
Core Apps:
┌─────────────────┐       ┌─────────────────┐
│  forum-core     │       │ digitalsignage  │
│  (v1.0.0)       │       │  (v1.1.0)       │
└────────┬────────┘       └─────────────────┘
         │
         ├─────────────────────────┐
         │                         │
    ┌────▼────────┐      ┌────────▼────────┐
    │forum-neture │      │ forum-yaksa     │
    │(extension)  │      │  (extension)    │
    │ v1.0.0      │      │  v1.0.0         │
    └─────────────┘      └─────────────────┘

미등록 Core/Extension:
┌─────────────────────┐
│ dropshipping-core   │ (Catalog 미등록)
│     (v1.0.0)        │
└──────────┬──────────┘
           │
      ┌────▼──────────────────┐
      │dropshipping-cosmetics │ (Catalog 미등록)
      │    (extension)        │
      │      v1.0.0           │
      └───────────────────────┘
```

---

## C. 앱 간 연계 구조 조사

### C.1. User Profile 연계

| 앱 | User 연계 방식 | 설명 |
|---|---------------|------|
| **forum-core** | `forum_post.authorId`, `forum_comment.authorId` | User 테이블 외래키 참조 (author 정보) |
| **forum-neture** | ACF 메타데이터만 추가 | User 연계는 Core에 위임 |
| **forum-yaksa** | ACF 메타데이터만 추가 | User 연계는 Core에 위임 |
| **digitalsignage** | 미상 (manifest에 정보 없음) | CPT 정의 부재 |
| **dropshipping-core** | `sellers.userId`, `partners.userId` | User와 직접 연계 |

**결론**: 각 Core 앱이 독립적으로 User 연계. Extension은 User 연계 로직 재사용.

### C.2. Role 기반 접근

모든 앱이 `permissions` 필드를 통해 권한 기반 접근 제어 지원:

| 앱 | 정의된 권한 | 활용 방식 |
|---|-----------|---------|
| forum-core | `forum.read`, `forum.write`, `forum.comment`, `forum.moderate`, `forum.admin` | 게시글 작성/댓글/관리 분리 |
| digitalsignage | `signage.read`, `signage.write`, `signage.schedule`, `signage.admin` | 콘텐츠 관리/스케줄링 분리 |
| dropshipping-core | `seller.*`, `supplier.*`, `partner.*`, `commission.*`, `settlement.*` | 역할별 세분화된 권한 |

**권한 등록 시점**: `AppManager.install()` 시 `PermissionService.registerPermissions()` 호출

**권한 검증 위치**:
- API Routes: `requirePermission()` middleware
- Admin UI: Role 기반 메뉴 필터링

### C.3. 조직 구조 (지부/분회) 연동 가능성

**현재 상태**:
- ❌ `app_registry` 테이블에 조직/지부 컬럼 없음
- ❌ Multi-tenancy 미지원 (모든 앱이 전역 설치)
- ❌ 지부별 앱 활성화 제어 불가

**필요한 구조** (향후 개선):
```typescript
// app_registry 확장안
interface AppRegistry {
  id: string;
  appId: string;
  organizationId?: string;  // 지부/분회 ID (null = 전역)
  status: 'active' | 'inactive';
  config?: Record<string, any>; // 지부별 설정
}
```

**활용 시나리오**:
- 서울지부: `forum-neture` 활성화 (화장품 매장)
- 대전지부: `forum-yaksa` 활성화 (약사 조직)
- 부산지부: 기본 `forum-core`만 사용

### C.4. 데이터 공유

| 앱 조합 | 데이터 공유 여부 | 공유 방식 |
|--------|----------------|---------|
| forum-core ↔ forum-neture | ✅ 공유 | Extension이 Core 테이블(`forum_post`) ACF로 확장 |
| forum-core ↔ forum-yaksa | ✅ 공유 | 동일 |
| forum-neture ↔ forum-yaksa | ❌ 충돌 가능 | 두 Extension이 동일 CPT 확장 시 ACF 충돌 우려 |
| dropshipping-core ↔ dropshipping-cosmetics | ✅ 공유 (예상) | Extension 패턴 동일 |

**Extension ACF 충돌 문제**:
- 현재 `forum_post`에 `cosmetic_meta`와 `yaksa_meta`를 동시 추가 가능
- 두 Extension을 동시 활성화 시 필드 중복/충돌 가능성
- ⚠️ 검증 로직 없음 (설치 시 ACF 충돌 체크 미구현)

### C.5. 공통 테이블 사용

| 테이블 | 소유 앱 | 접근 앱 | 목적 |
|-------|--------|--------|------|
| `users` | Platform Core | 모든 앱 | User 인증/프로필 |
| `roles` | Platform Core | 모든 앱 | 권한 관리 |
| `permissions` | Platform Core | 모든 앱 (via PermissionService) | 권한 등록/검증 |
| `forum_post` | forum-core | forum-neture, forum-yaksa | 게시글 저장 |
| `products` (가정) | dropshipping-core | dropshipping-cosmetics | 상품 정보 |

**Core 테이블 보호 메커니즘**:
```typescript
// Extension이 Core 테이블 소유 시도 시
OwnershipValidationError: Extension app cannot own core table 'forum_post' (owned by forum-core)
```

### C.6. 공통 API 사용

**API 구조**:
```
/api/v1/                     # Platform 공용 API
/api/v2/seller/              # Dropshipping Core API
/api/v2/supplier/
/admin/forum/                # Forum Core Admin API
/admin/signage/              # Signage Admin API
```

**앱별 API 등록 방식**:
- Manifest의 `routes` 필드에 선언
- AppManager가 설치 시 route registry에 등록 (구현 TODO)

**현재 한계**:
- ❌ 동적 route 등록 미구현 (manifest의 routes 사용 안 함)
- ❌ API versioning 불일치 (v1/v2/admin 혼재)

### C.7. Block Editor 연동

**현재 상태**:
- Block Editor는 별도 시스템 (`@o4o/block-core`, `@o4o/block-renderer`)
- App Store와 직접 연동 없음

**연동 가능성**:
```typescript
// Manifest에 Block 정의 추가 (미래)
interface AppManifest {
  blocks?: {
    name: string;
    component: string;
    category: string;
  }[];
}
```

**현재 Block 등록 방식**:
- 수동 등록 (blockRegistry.register)
- App Store 설치와 무관

### C.8. CPT/ACF 프레임워크 사용

**CPT Registry**:
```typescript
// packages/cpt-registry
import { registry } from '@o4o/cpt-registry';

// AppManager.install() 시
for (const cptDef of manifest.cpt) {
  registry.register({
    name: cptDef.name,
    storage: cptDef.storage,  // 'entity' | 'json-cpt'
    fields: [],
    metadata: { appId }
  });
}
```

**ACF System**:
```typescript
// apps/api-server/src/services/ACFRegistry.ts
acfRegistry.registerMultiple(appId, manifest.acf);
```

**Extension ACF 확장**:
```typescript
// forum-neture manifest
extendsCPT: [
  {
    name: 'forum_post',
    acfGroup: 'cosmetic_meta'  // ACF 그룹 추가
  }
]
```

**문제점**:
- ✅ 선언적 정의는 완비
- ❓ 실제 동작 검증 필요 (Extension ACF가 Core CPT에 올바르게 추가되는지)
- ❌ ACF 삭제 로직 미구현 (AppDataCleaner에서 TODO)

### C.9. 앱 간 결합도/독립성

| 앱 조합 | 결합도 | 독립성 평가 |
|--------|-------|-----------|
| forum-core ↔ forum-neture | **강한 결합** | Extension은 Core 없이 동작 불가. Core 테이블 직접 확장 |
| forum-neture ↔ forum-yaksa | **중간 결합** | 동일 Core 공유하나 독립 ACF 그룹 사용 |
| forum-core ↔ digitalsignage | **독립** | 데이터/API 공유 없음 |
| dropshipping-core ↔ dropshipping-cosmetics | **강한 결합** (예상) | Extension 패턴 동일 |

**Core/Extension 패턴의 장단점**:

**장점**:
- ✅ Core 기능 재사용으로 중복 코드 감소
- ✅ Vertical 특화 기능을 Extension으로 분리 가능
- ✅ 의존성 자동 해결로 설치 간편

**단점**:
- ❌ Core 변경 시 모든 Extension 영향
- ❌ Extension 간 ACF 충돌 가능성
- ❌ Core 앱 언인스톨 시 Extension 모두 삭제 필요

---

## D. App Store UX/View 구조 분석

### D.1. Admin Dashboard - 앱 목록 표시

**파일**: `apps/admin-dashboard/src/pages/apps/AppStorePage.tsx`

**화면 구성**:
```
┌─────────────────────────────────────────────────┐
│  앱 장터                                         │
│  플랫폼에 설치할 앱을 관리합니다.                  │
├─────────────────────────────────────────────────┤
│  [앱 마켓] [설치된 앱 (2)]                        │
├─────────────────────────────────────────────────┤
│  Tab: 앱 마켓                                    │
│  ┌───────┐  ┌───────┐  ┌───────┐                │
│  │ Forum │  │Signage│  │Neture │                │
│  │v1.0.0 │  │v1.1.0 │  │v1.0.0 │                │
│  │[설치됨]│  │[설치됨]│  │[설치] │                │
│  └───────┘  └───────┘  └───────┘                │
│                                                  │
│  Tab: 설치된 앱                                   │
│  ┌──────────────────────────────┐                │
│  │ Forum                        │                │
│  │ 버전: 1.0.0  상태: [활성]    │                │
│  │ 설치일: 2025-11-29           │                │
│  │                              │                │
│  │ 소유 데이터:                  │                │
│  │ • 테이블: forum_post,        │                │
│  │   forum_category, ...        │                │
│  │ • CPT: forum_post, ...       │                │
│  │                              │                │
│  │ [비활성화] [🗑️ ▼]            │                │
│  │            ├ 데이터 유지 삭제 │                │
│  │            └ 완전 삭제 (데이터 포함) │          │
│  └──────────────────────────────┘                │
└─────────────────────────────────────────────────┘
```

**주요 기능**:
1. **앱 마켓 탭**:
   - Catalog의 모든 앱 표시 (4개)
   - 설치 여부 표시 (✅ 설치됨 / [설치] 버튼)
   - 업데이트 가능 여부 표시 (오렌지 배지)

2. **설치된 앱 탭**:
   - 설치된 앱만 표시
   - 상태 배지 (활성/비활성/설치됨)
   - 소유 데이터 정보 (ownsTables, ownsCPT, ownsACF)
   - 업데이트 버튼 (새 버전 있을 시)
   - 활성화/비활성화 토글
   - 삭제 옵션 (데이터 유지 / 완전 삭제)

### D.2. 활성화된 앱 표시 방식

**앱 상태 조회 Hook**: `apps/admin-dashboard/src/hooks/useAppStatus.ts`

```typescript
const { isActive, isInstalled, getStatus } = useAppStatus();

// 사용 예시
if (isActive('forum-core')) {
  // Forum 메뉴 표시
}
```

**메뉴 필터링** (가정):
```typescript
// wordpressMenuFinal.tsx (현재는 하드코딩)
const menuItems = [
  {
    label: '포럼',
    path: '/forum',
    visible: isActive('forum-core')  // 앱 활성화 시만 표시
  }
];
```

**문제점**:
- ❌ 메뉴가 앱 상태와 연동되지 않음 (하드코딩)
- ❌ 앱 비활성화해도 메뉴 남아있음

### D.3. 앱 상세 화면 구조

**현재 상태**:
- ❌ 앱 상세 페이지 없음
- ❌ 앱별 설정 화면 없음
- ❌ 앱별 대시보드 없음

**AppStorePage에서 제공하는 정보**:
- 앱 이름, 버전, 설명
- 카테고리, 개발자
- 소유 데이터 (테이블/CPT/ACF 목록)
- 설치일, 업데이트일
- 현재 상태

### D.4. 앱 설치/삭제 UI 흐름

#### 설치 흐름

```
1. 앱 마켓 탭에서 [설치] 버튼 클릭
2. API 호출: POST /api/admin/apps/install {appId}
3. 로딩 표시: "설치 중..."
4. 성공 시:
   - Alert: "{appId} 앱이 설치되었습니다."
   - 자동으로 앱 목록 갱신
   - 앱 상태가 "활성" 으로 표시
5. 실패 시:
   - 소유권 충돌:
     Alert: "소유권 충돌:\n • Extension app cannot own core table..."
   - 기타 오류:
     Alert: "앱 설치에 실패했습니다."
```

#### 삭제 흐름

```
1. 설치된 앱 탭에서 [🗑️] 버튼 클릭 → 드롭다운 표시
2. 옵션 선택:
   - "데이터 유지 삭제": purge=false
   - "완전 삭제 (데이터 포함)": purge=true

3. purge=true 선택 시 확인 대화상자:
   ┌─────────────────────────────────────────────┐
   │ forum 앱과 데이터를 완전히 삭제하시겠습니까?  │
   │                                             │
   │ ⚠️ 경고: 이 작업은 되돌릴 수 없습니다.      │
   │                                             │
   │ 삭제될 데이터:                               │
   │                                             │
   │ 테이블 (6개):                                │
   │   • forum_post                              │
   │   • forum_category                          │
   │   • forum_comment                           │
   │   • forum_tag                               │
   │   • forum_like                              │
   │   • forum_bookmark                          │
   │                                             │
   │ CPT (4개):                                   │
   │   • forum_post                              │
   │   • forum_category                          │
   │   • forum_comment                           │
   │   • forum_tag                               │
   │                                             │
   │        [취소]  [확인]                        │
   └─────────────────────────────────────────────┘

4. 확인 클릭 시:
   - API 호출: POST /api/admin/apps/uninstall {appId, purge: true}
   - 로딩 표시
   - 성공 시 Alert: "앱과 데이터가 완전히 삭제되었습니다."
   - 실패 시 (의존성 오류):
     Alert: "다음 앱들이 이 앱에 의존하고 있습니다:\n • forum-neture\n..."
```

### D.5. UX 한계 및 혼란 요소

**한계점**:

1. **앱 Catalog와 실제 설치 불일치**:
   - Catalog에 `forum-neture`가 있으나 설치 불가 (manifest registry 누락)
   - Catalog에 `dropshipping` 없음 (manifest는 존재)
   - 사용자가 설치 시도하면 "Manifest not found" 에러

2. **설치 실패 시 에러 메시지 부족**:
   - "앱 설치에 실패했습니다." (이유 불명)
   - Ownership violation은 상세 표시하나 일반 오류는 불친절

3. **의존성 정보 미표시**:
   - `forum-neture`가 `forum-core` 필요한지 UI에 표시 안 됨
   - 의존성 자동 설치는 되나 사전 안내 없음

4. **앱 상태 실시간 갱신 없음**:
   - 활성화/비활성화 후 페이지 새로고침 필요할 수 있음
   - (단, useQuery로 30초 staleTime 설정)

5. **앱별 설정 UI 없음**:
   - 앱 설치 후 설정 변경 불가
   - Manifest의 `defaultConfig` 사용 방법 불명

6. **메뉴 통합 미흡**:
   - 앱 설치해도 메뉴 자동 생성 안 됨
   - Manifest의 `menu` 필드 미사용

**혼란 요소**:

1. **두 개의 "App" 개념**:
   - App Store (Feature-level): forum, dropshipping
   - App System (Integration): Google AI, OpenAI
   - 같은 "앱"이라는 용어 사용하나 완전히 다른 시스템

2. **appId 불일치**:
   - Catalog: `forum` (appId)
   - Manifest: `forum-core` (실제 appId)
   - Migration: `forum` (seed 값)
   - Extension: `forum-neture`, `forum-yaksa`

3. **버전 표시 혼란**:
   - Catalog: `digitalsignage` v1.1.0
   - Migration: `digitalsignage` v1.0.0 설치
   - UI에서 "업데이트 가능" 표시될 것 (실제로는 동일 앱)

---

## E. 문제점 및 한계사항

### E.1. 구조적 한계

| 문제 | 설명 | 영향도 | 해결 난이도 |
|------|------|-------|-----------|
| **Catalog vs Manifest Registry 불일치** | Catalog에 있는 앱이 Manifest Registry에 없음 (dropshipping) | 🔴 High | Medium |
| **Multi-tenancy 미지원** | 지부별 앱 활성화 불가 (전역 설치만) | 🔴 High | High |
| **Remote App 설치 불가** | Local manifest만 지원 (원격 다운로드 X) | 🟡 Medium | High |
| **두 개의 App 시스템 공존** | `apps` vs `app_registry` 혼재 | 🟡 Medium | Medium |
| **API versioning 불일치** | v1/v2/admin 혼재 | 🟢 Low | Low |
| **ACF/CPT 삭제 미구현** | Uninstall 시 ACF 삭제 TODO | 🟡 Medium | Medium |

### E.2. Deprecated/재사용 불가 앱

| 앱 | 상태 | 이유 |
|---|------|------|
| **digitalsignage** | ⚠️ 주의 | Manifest 소스 없음, CPT 정의 없음 |
| **dropshipping-core** | ❌ 사용 불가 | Manifest Registry 미등록 |
| **dropshipping-cosmetics** | ❌ 사용 불가 | Manifest Registry 미등록 |

### E.3. 비일관적 Manifest 형식

**AppId 불일치**:
```typescript
// appsCatalog.ts
{ appId: 'forum', name: 'Forum', ... }

// manifestRegistry
{ forum: forumManifest }  // forumManifest.appId = 'forum-core'

// Migration seed
appId: 'forum'
```

**의존성 형식 혼재**:
```typescript
// Core/Extension 패턴 (신규)
dependencies: { "forum-core": ">=1.0.0" }

// Legacy 형식
dependencies: { apps: ["forum"], minVersions: {...} }
```

### E.4. 불필요/중복 앱

**현재 상태**:
- `forum` (Catalog) vs `forum-core` (Manifest): 이름 불일치
- `apps` 테이블 vs `app_registry` 테이블: 기능 중복

**제안**:
- Catalog의 `forum`을 `forum-core`로 통일
- `apps` 테이블은 Integration App 전용으로 명확히 분리
- 또는 두 시스템 통합

### E.5. 유지보수 위험 영역

| 영역 | 위험도 | 설명 |
|------|-------|------|
| **digitalsignage manifest 소스 분실** | 🔴 Critical | 재컴파일/수정 불가 |
| **dropshipping 앱 미등록** | 🔴 High | 코드 존재하나 사용 불가 |
| **Extension ACF 충돌 미검증** | 🟡 Medium | 두 Extension 동시 활성화 시 충돌 가능 |
| **Lifecycle hook 미검증** | 🟡 Medium | install/uninstall hook 실제 동작 확인 필요 |
| **의존성 순환 참조 테스트 부족** | 🟢 Low | 알고리즘은 있으나 실제 케이스 테스트 필요 |

### E.6. 개발 계획과 맞지 않는 구조

**지부/분회 서비스 요구사항과의 불일치**:

1. **조직별 앱 활성화 불가**:
   - 요구: 서울지부는 forum-neture, 대전지부는 forum-yaksa
   - 현실: 전역 설치만 가능

2. **비즈니스별 앱 인스턴스 분리 부족**:
   - `AppInstance` 엔티티는 있으나 App Store와 분리됨
   - App Store는 `app_registry` (전역), App System은 `AppInstance` (businessId 지원)

3. **앱 설정 저장소 부재**:
   - Manifest에 `defaultConfig`는 있으나 runtime 설정 변경 불가
   - 지부별 앱 설정 (예: 포럼 카테고리) 저장 불가

4. **메뉴 자동 생성 미지원**:
   - Manifest의 `menu` 필드 정의되어 있으나 미사용
   - 앱 설치해도 수동으로 메뉴 추가 필요

### E.7. 지부/분회 서비스 부적합 요소

| 요소 | 현재 상태 | 필요 구조 |
|------|---------|---------|
| **조직별 앱 관리** | ❌ 전역만 | organizationId 기반 app_registry |
| **지부별 설정** | ❌ 없음 | app_config 테이블 필요 |
| **지부별 데이터 격리** | ❌ 전역 테이블 | Tenant ID 기반 Row-level 분리 |
| **지부별 메뉴** | ❌ 하드코딩 | 동적 메뉴 생성 (app.menu 활용) |
| **권한 상속** | ❌ 없음 | 지부 관리자가 앱 설치 권한 |

---

## F. 지부/분회 서비스 적합성 평가

### F.1. 현재 구조의 적합성 점수

| 평가 항목 | 점수 | 설명 |
|---------|------|------|
| **앱 모듈화** | ⭐⭐⭐⭐☆ (4/5) | Core/Extension 패턴으로 vertical 특화 가능 |
| **의존성 관리** | ⭐⭐⭐⭐⭐ (5/5) | 자동 해결, 순환 감지 완비 |
| **데이터 격리** | ⭐☆☆☆☆ (1/5) | Multi-tenancy 미지원 |
| **조직별 활성화** | ☆☆☆☆☆ (0/5) | 전역 설치만 가능 |
| **설정 관리** | ⭐☆☆☆☆ (1/5) | Runtime 설정 변경 불가 |
| **UI/UX** | ⭐⭐⭐☆☆ (3/5) | Admin은 좋으나 조직별 UI 없음 |

**종합 점수**: ⭐⭐☆☆☆ (2.3/5)

### F.2. 지부별 앱 운영 시나리오 검증

#### 시나리오 1: 서울지부 - 화장품 매장 Forum

**요구사항**:
- `forum-core` + `forum-neture` 설치
- 피부타입 필터, 루틴 추천 기능 활성화
- 다른 지부에는 영향 없음

**현재 구조로 가능한가?**:
- ❌ 불가능
- `forum-neture` 설치하면 모든 지부에 적용됨
- 지부별 활성화 제어 없음

**해결 방안**:
```typescript
// app_registry 확장
{
  appId: 'forum-neture',
  organizationId: 'seoul-branch',  // 서울지부만
  status: 'active'
}
```

#### 시나리오 2: 대전지부 - 약사 조직 Forum

**요구사항**:
- `forum-core` + `forum-yaksa` 설치
- 복약지도 케이스 공유 기능
- 서울지부 `forum-neture`와 공존

**현재 구조로 가능한가?**:
- ⚠️ 부분 가능
- `forum-neture`와 `forum-yaksa` 동시 설치 가능 (의존성 충돌 없음)
- 하지만 모든 지부에 두 Extension 모두 활성화됨
- 지부별 필터링 불가

**문제점**:
- `forum_post` CPT에 `cosmetic_meta`와 `yaksa_meta` ACF 동시 추가
- 게시글 작성 시 두 메타데이터 폼 모두 표시 (혼란)

#### 시나리오 3: 부산지부 - 기본 Forum만

**요구사항**:
- `forum-core`만 사용
- Extension 없음

**현재 구조로 가능한가?**:
- ✅ 가능
- 하지만 다른 지부에서 Extension 설치하면 부산지부도 영향받음

### F.3. Multi-tenancy 개선 방안

**필요한 테이블 구조**:

```sql
-- app_registry 확장
CREATE TABLE app_registry (
  id UUID PRIMARY KEY,
  appId VARCHAR(100),
  organizationId UUID,  -- 새 컬럼
  status VARCHAR(20),
  installedAt TIMESTAMP,
  UNIQUE(appId, organizationId)  -- 조직별 독립 설치
);

-- app_config 신규
CREATE TABLE app_config (
  id UUID PRIMARY KEY,
  appRegistryId UUID REFERENCES app_registry(id),
  configKey VARCHAR(100),
  configValue JSONB,
  UNIQUE(appRegistryId, configKey)
);
```

**API 변경**:
```typescript
// 지부별 앱 설치
POST /api/admin/apps/install
{
  appId: 'forum-neture',
  organizationId: 'seoul-branch'  // 새 파라미터
}

// 지부별 앱 조회
GET /api/admin/apps?organizationId=seoul-branch
```

**UI 변경**:
```
┌─────────────────────────────────────┐
│ 앱 장터 - 서울지부                   │
├─────────────────────────────────────┤
│ [전체 앱] [서울지부 앱] [다른 지부]  │
├─────────────────────────────────────┤
│ 서울지부 전용:                       │
│  ✅ Forum Neture (활성)             │
│                                     │
│ 전체 공통:                          │
│  ✅ Forum Core (활성)               │
│  ✅ Digital Signage (활성)          │
└─────────────────────────────────────┘
```

---

## G. 권장사항

### G.1. 긴급 조치 필요 (P0)

1. **digitalsignage manifest 소스 복구**:
   - dist에서 역컴파일 또는
   - 재작성 필요 (manifest 정의 필수)

2. **Catalog vs Manifest Registry 통일**:
   ```typescript
   // appsCatalog.ts 수정
   { appId: 'forum-core', ... }  // 'forum' → 'forum-core'

   // manifestRegistry에 dropshipping 추가
   import { dropshippingCoreManifest } from '@o4o-apps/dropshipping-core';
   manifestRegistry['dropshipping-core'] = dropshippingCoreManifest;
   ```

3. **Migration seed 수정**:
   ```typescript
   // 8000000000001-SeedInitialApps.ts
   ['forum-core', 'Forum Core', '1.0.0', ...]  // 'forum' → 'forum-core'
   ```

### G.2. 단기 개선 (P1)

1. **Multi-tenancy 지원**:
   - `app_registry`에 `organizationId` 추가
   - API에 조직별 필터링 추가
   - UI에 조직 선택 드롭다운 추가

2. **앱 설정 저장소 구축**:
   - `app_config` 테이블 생성
   - Manifest `defaultConfig` → DB 저장
   - Admin UI에서 설정 변경 가능하게

3. **ACF/CPT 삭제 기능 구현**:
   - `AppDataCleaner.deleteCPTs()` 구현
   - `AppDataCleaner.deleteACFs()` 구현

### G.3. 중기 개선 (P2)

1. **메뉴 자동 생성**:
   - Manifest의 `menu` 필드 활용
   - 앱 활성화 시 동적 메뉴 등록
   - 앱 비활성화 시 메뉴 숨김

2. **Extension ACF 충돌 방지**:
   - 설치 시 ACF 필드명 중복 검사
   - Extension 간 격리 (네임스페이스 prefix)

3. **Lifecycle hook 검증**:
   - 각 앱의 lifecycle hook 실제 동작 테스트
   - 에러 처리 강화

### G.4. 장기 개선 (P3)

1. **App 시스템 통합**:
   - `apps` (Integration) + `app_registry` (Feature) 통합
   - 단일 앱 관리 시스템으로 재설계

2. **Remote App 지원**:
   - 앱 마켓플레이스 구축
   - 원격 manifest 다운로드
   - 자동 업데이트

3. **앱 샌드박스**:
   - 앱별 권한 격리
   - 리소스 사용량 제한
   - 보안 정책 강화

---

## H. 결론

O4O Platform의 App Store는 **견고한 아키텍처와 우수한 의존성 관리 시스템**을 갖추고 있으나, **Multi-tenancy 부재**로 인해 지부/분회 서비스에는 **부적합한 상태**입니다.

**핵심 발견**:
- ✅ Core/Extension 패턴으로 vertical 특화 가능
- ✅ 의존성 자동 해결 및 데이터 소유권 검증 완비
- ❌ 조직별 앱 활성화 불가 (전역 설치만)
- ❌ Catalog/Manifest/Migration 간 불일치 다수
- ❌ digitalsignage manifest 소스 분실

**우선 조치**:
1. Catalog/Manifest 통일 (appId 일관성)
2. Multi-tenancy 구조 설계 및 구현
3. digitalsignage manifest 재작성

**장기 방향**:
- 지부별 독립 앱 생태계 구축
- Remote App Store 지원
- App 시스템 통합 및 단순화

---

**문서 버전**: 1.0
**다음 단계**: Phase 2 - Multi-tenancy 설계안 작성
