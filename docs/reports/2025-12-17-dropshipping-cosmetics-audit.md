# dropshipping-cosmetics 현황 보고서

**작성일**: 2025-12-17
**앱 ID**: `dropshipping-cosmetics`
**앱 타입**: Extension
**위치**: `packages/dropshipping-cosmetics/`
**상태**: ✅ Active (AppStore 등록 완료)

---

## 1. Executive Summary

`dropshipping-cosmetics`는 `dropshipping-core`를 확장하는 Extension 앱입니다.
**이미 `packages/` 폴더에 정식 버전으로 존재하며, AppStore에 등록되어 있습니다.**

### 조사 결과

처음 `legacy/packages/dropshipping-cosmetics/`를 감사했으나, 이는 **오래된 버전**이었습니다.
실제 활성 버전은 `packages/dropshipping-cosmetics/`에 존재하며 훨씬 완성도가 높습니다.

| 항목 | packages/ (활성) | legacy/ (제거됨) |
|------|------------------|------------------|
| 아키텍처 | Entity + Controller | ACF + Service |
| Entities | 8개 | 0개 |
| Controllers | 10개 | 0개 |
| Shortcodes | 3개 | 0개 |
| AppStore | ✅ 등록 | ❌ 미등록 |
| 상태 | Phase 7-Y | 초기 버전 |

**결론**: Legacy 이관 작업 불필요. legacy 폴더는 제거됨.

---

## 2. 현재 상태 (packages/ 버전)

### 2.1 기본 정보

```typescript
appId: 'dropshipping-cosmetics'
displayName: '화장품 Dropshipping'
version: '1.0.0'
type: 'extension'
dependencies: ['dropshipping-core']
serviceGroups: ['cosmetics']
```

### 2.2 소유 테이블 (ownsTables)

```
cosmetics_filters
cosmetics_brands
cosmetics_skin_types
cosmetics_concerns
cosmetics_ingredients
cosmetics_categories
cosmetics_signage_playlists
cosmetics_seller_workflow_sessions
cosmetics_campaigns
```

### 2.3 Backend Entities

| Entity | 설명 |
|--------|------|
| cosmetics-filter.entity | 필터 설정 |
| brand.entity | 브랜드 |
| skin-type.entity | 피부타입 |
| concern.entity | 피부고민 |
| ingredient.entity | 성분 |
| category.entity | 카테고리 |
| signage-playlist.entity | 사이니지 플레이리스트 |
| seller-workflow-session.entity | 판매원 워크플로우 |
| campaign.entity | 캠페인 |

### 2.4 Backend Controllers

```
brand.controller.ts
campaign.controller.ts
cosmetics-filter.controller.ts
cosmetics-product-list.controller.ts
cosmetics-product.controller.ts
dictionary.controller.ts
recommendation.controller.ts
seller-workflow.controller.ts
signage-playlist.controller.ts
signage.controller.ts
```

### 2.5 Shortcodes

| Shortcode | 설명 |
|-----------|------|
| `[cosmetics-product]` | 제품 상세 표시 |
| `[cosmetics-products-list]` | 필터링 가능한 제품 목록 |
| `[cosmetics-recommendations]` | 추천 제품 표시 |

### 2.6 ACF Fields

`cosmetics_metadata` (ds_product 확장):
- skinType, concerns, ingredients, certifications
- productCategory, routineInfo, contraindications
- texture, volume, expiryPeriod

### 2.7 Lifecycle Hooks

```
lifecycle/
├── install.ts     ✅
├── activate.ts    ✅
├── deactivate.ts  ✅
└── uninstall.ts   ✅
```

### 2.8 Admin Menus

```
화장품 (parent: dropshipping)
├── 필터 관리 (/admin/cosmetics/filters)
└── 루틴 템플릿 (/admin/cosmetics/routines)
```

---

## 3. AppStore 등록 현황

### 3.1 카탈로그 등록

**파일**: `apps/api-server/src/app-manifests/appsCatalog.ts:349`

```typescript
{
  appId: 'dropshipping-cosmetics',
  name: 'Dropshipping Cosmetics Extension',
  version: '1.0.0',
  description: '화장품 특화 드랍쉬핑 기능 - 피부타입, 성분, 루틴 추천',
  category: 'commerce',
  type: 'extension',
  dependencies: { 'dropshipping-core': '>=1.0.0' },
  serviceGroups: ['cosmetics'],
  incompatibleWith: ['dropshipping-yaksa'],
}
```

### 3.2 Manifest 연결

**파일**: `apps/api-server/src/app-manifests/index.ts`

```typescript
import { cosmeticsExtensionManifest } from '@o4o/dropshipping-cosmetics';

export const MANIFESTS = {
  'dropshipping-cosmetics': cosmeticsExtensionManifest,
  // ...
};
```

---

## 4. 연관 앱 (Cosmetics Service Group)

| 앱 | 타입 | 의존성 |
|---|------|--------|
| dropshipping-cosmetics | extension | dropshipping-core |
| cosmetics-partner-extension | extension | dropshipping-cosmetics |
| cosmetics-seller-extension | extension | dropshipping-cosmetics |
| cosmetics-supplier-extension | extension | dropshipping-cosmetics + partner |
| cosmetics-sample-display-extension | extension | seller + supplier |

---

## 5. 수행된 작업

### 5.1 Legacy 폴더 제거

```bash
git rm -rf legacy/packages/dropshipping-cosmetics
```

**사유**: `packages/` 버전이 최신이며 완전한 버전. Legacy는 오래되고 불완전한 초기 버전.

### 5.2 감사 보고서 업데이트

기존 감사가 legacy 버전 기준이었으므로, packages 버전 기준으로 보고서 갱신.

---

## 6. 결론

### STEP 1 결과

| 항목 | 결과 |
|------|------|
| 폴더 이관 | ❌ 불필요 (이미 packages에 존재) |
| Legacy 제거 | ✅ 완료 |
| AppStore 등록 | ✅ 이미 등록됨 |
| Lifecycle | ✅ 4개 모두 존재 |
| 빌드 | ✅ api-server에서 컴파일 |

### 다음 단계

STEP 1이 실질적으로 불필요했으므로, **STEP 2로 바로 진행 가능**합니다.
필요시 다음 작업을 진행할 수 있습니다:

1. 실제 런타임 테스트 (API 서버 기동)
2. Frontend UI 개발
3. 통합 테스트 작성

---

**작성자**: Claude Code
**문서 버전**: 2.0.0 (Updated)
