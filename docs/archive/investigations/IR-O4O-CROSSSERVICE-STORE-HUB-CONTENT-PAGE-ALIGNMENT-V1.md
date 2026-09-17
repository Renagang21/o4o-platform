# IR-O4O-CROSSSERVICE-STORE-HUB-CONTENT-PAGE-ALIGNMENT-V1

**유형:** 구조 결정 IR  
**작성일:** 2026-06-01  
**상태:** 완료  
**코드 변경:** 없음  

---

## 핵심 결론

세 서비스의 Store HUB 콘텐츠 페이지는 **모두 `ContentHubTemplate`을 사용하나 데이터·복사 API·레이아웃·경로가 서로 다르다.** 이 차이 중 일부는 의미 있는 서비스 차이이고, 일부는 legacy drift다.

| 서비스 | 판정 | 핵심 drift |
|--------|------|-----------|
| **KPA** | ✅ Canonical 기준 | cmsApi 사용은 KPA 전용 구조이므로 예외 가능 |
| **K-Cosmetics** | ⚠️ C | `/store-hub/content`가 placeholder, 실구현은 `/library/content` |

**권장:**
1. K-Cosmetics: `HubContentPage`를 `ContentLibraryPage` 기반으로 교체 (route 정렬)
3. ContentHubTemplate의 **single-action 정책(bulk 없음)**은 의도된 설계 — 변경 불필요

---

## 1. Route / Page 구조 비교

| 항목 | KPA | K-Cosmetics |
| ------ | ----- | ------------- |
| route | `/store-hub/content` | `/store-hub/content` (placeholder) + `/library/content` (실구현) |
| page file | `HubContentLibraryPage.tsx` (172줄) | `HubContentPage.tsx` (33줄 placeholder) + `ContentLibraryPage.tsx` (별도) |
| layout | `ContentHubTemplate` ✅ | placeholder: 없음 / ContentLibraryPage: `ContentHubTemplate` ✅ |
| menu label | 콘텐츠/자료 | 콘텐츠/자료 |
| DataTable | ❌ (ContentHubTemplate 정책) | ❌ |
| renderItems | 기본 리스트 | 카드 그리드 (ContentLibraryPage) |

---

## 2. 기능 비교

| 기능 | KPA | K-Cosmetics | 정렬 필요 |
| ------ | ----- | ------------- | --------- |
| 데이터 소스 | `cmsApi` (kpa_contents 직접) | `hubContentApi` (ContentLibraryPage) | KPA 예외(§4 참조) |
| ContentHubTemplate | ✅ | ✅ (ContentLibraryPage) | 없음 |
| checkbox/ActionBar/bulk | ❌ (의도적 단일 정책) | ❌ | 없음 (정책) |
| 단건 copy | ✅ `assetSnapshotApi.copy({ assetType:'cms' })` | ⚠️ `dashboardCopyApi.copyAsset()` | **필요 (§5)** |
| loadCopiedIds | ✅ `assetSnapshotApi.list({ type:'cms' })` | ⚠️ `dashboardCopyApi.getCopiedSourceIds()` | **필요 (§5)** |
| 필터 탭 | 5개 (notice-news/guide/knowledge/promo-event) | (ContentLibraryPage 확인 필요) | B (레이블만) |
| 검색 | ✅ | ✅ | 없음 |
| empty/loading/error | ✅ (ContentHubTemplate) | ✅ | 없음 |
| 내 매장 연결 afterCopy | `/store/content` | 미확인 | — |
| navigate after copy | `/store/content` | — | — |
| hub 컨텍스트 유지 | ✅ | ❌ (placeholder가 이탈) | K-Cosmetics fix 필요 |

---

## 3. ContentHubTemplate 정책

`packages/shared-space-ui/src/ContentHubTemplate.tsx` L388:

```
// single-action 정책 유지 (selection/ActionBar/bulk 미도입).
```

ContentHubTemplate은 **의도적으로 DataTable/checkbox/ActionBar/bulk를 제외**한다. 이는 사이니지 Hub(bulk copy)와 콘텐츠 Hub(단건 copy)의 UX 차이를 반영한 의도된 설계다.

**결론:** 콘텐츠 Hub의 DataTable/ActionBar 부재는 drift가 아니다.

---

## 4. KPA canonical 적합성

**KPA는 canonical 기준으로 인정 가능하나, 데이터 소스에 KPA-전용 예외가 있다.**

| 항목 | 판정 |
|------|------|
| ContentHubTemplate 사용 | ✅ canonical 패턴 |
| cmsApi (kpa_contents 직접) | ⚠️ KPA-전용 — 다른 서비스는 `hubContentApi(sourceDomain='cms')` 사용 |
| assetSnapshotApi.copy({ assetType:'cms' }) | ✅ O4O Store Layer canonical 경로 |
| assetSnapshotApi.list({ type:'cms' }) → loadCopiedIds | ✅ |
| afterCopy → `/store/content` | ✅ |

**데이터 소스 차이:**
- KPA는 `kpa_contents` 테이블 직접 접근 (`cmsApi`) — KPA만의 CMS 구조
- K-Cosmetics는 `hubContentApi.list({ sourceDomain:'cms' })` 사용

이 차이는 서비스별 데이터 경로 차이로, 공통 canonical API(`hubContentApi`)를 사용하는 K-Cosmetics 방식이 플랫폼 표준에 더 가깝다.

**복사 API가 진정한 canonical 기준:**
- ✅ `assetSnapshotApi.copy({ assetType:'cms' })` → `o4o_asset_snapshots` (O4O Store Layer)
- ❌ `dashboardCopyApi.copyAsset()` → `/dashboard/assets/copy` (구 dashboard 시대 레거시)

---

## 5. 서비스별 drift 판정

### 5.2 K-Cosmetics — 판정: **C**

```
C: /store-hub/content가 placeholder (실구현은 /library/content)
```

**Drift 구조:**

```
App.tsx L370:  Route path="library/content"  → ContentLibraryPage (실구현, ContentHubTemplate+hubContentApi+dashboardCopyApi)
App.tsx L522:  Route path="signage"          → HubSignagePage (canonical, 이번 WO 완료)
                                               ── store-hub routes ──
App.tsx L522:  Route path="content"          → HubContentPage (placeholder → /library/content 링크)
```

**문제:** `HubContentPage`에서 `/library/content` 링크 클릭 시 store-hub layout을 이탈한다. 기능은 있으나 hub 컨텍스트가 손실된다.

**추가 drift:** `ContentLibraryPage`도 `dashboardCopyApi` 사용 — KPA canonical(assetSnapshotApi)과 불일치.

---

## 6. 콘텐츠/자료 경계

| 개념 | 위치 | 역할 |
|------|------|------|
| Store HUB 콘텐츠 | `/store-hub/content` | 플랫폼 제공 CMS 콘텐츠 탐색 + copy |
| 내 매장 콘텐츠 | `/store/content` (KPA) | copy된 콘텐츠 관리 |
| 내 자료함 | `/store/library/contents` 등 | 자료 관리 |

KPA는 이 경계를 명확히 유지한다.

---

## 7. 후속 WO 우선순위

### 우선순위 1: K-Cosmetics `/store-hub/content` 교체
```
WO-O4O-KCOS-STORE-HUB-CONTENT-PAGE-CANONICAL-ALIGNMENT-V1

변경:
- HubContentPage.tsx: placeholder → ContentHubTemplate 기반 실구현
- hubContentApi.list({ sourceDomain:'cms' }) 사용
- 복사 API: assetSnapshotApi.copy({ assetType:'cms' }) (canonical 전환)
- afterCopy: /store/content or /store/library/contents (확인 필요)
- App.tsx: /library/content route 정리 또는 유지 (중복 정리)

Backend: 변경 없음
```

### 우선순위 3 (선택): ContentHubTemplate 필터 레이블 정렬
```
WO-O4O-CROSSSERVICE-STORE-HUB-CONTENT-PAGE-LABEL-ALIGNMENT-V1

변경:
- K-Cosmetics: 구현 후 레이블 결정

우선순위: 낮음
```

---

## 8. Current Structure vs O4O Philosophy Conflict Check

### ① Store HUB 콘텐츠 페이지가 탐색·가져가기 공간으로 기능하는가?

- KPA: ✅ hub에서 단건 copy → 내 매장으로 연결
- K-Cosmetics: ⚠️ placeholder → 이탈 → 실구현은 `/library/content`(비hub 경로)

### ② 콘텐츠/자료/내 자료함 경계 충돌 여부

KPA는 경계가 명확하다.

### ③ 서비스별 분기가 의미 있는 차이인가, 단순 복제 분기인가?

- ContentHubTemplate + single-action 정책: **공통 의미 구조** — 의도적 차이
- 복사 API(`assetSnapshotApi` vs `dashboardCopyApi`): **legacy drift** — 의도적 차이 아님
- 카드 그리드 vs 리스트: **UX 선호 차이** — 허용 가능

### ④ KPA canonical로 다른 서비스 정렬 가능한가?

ContentHubTemplate 구조는 이식 가능하다. 단, 데이터 소스는:
- KPA의 `cmsApi`는 KPA-전용 → 다른 서비스에 직접 이식 불가
- `hubContentApi(sourceDomain='cms')`가 플랫폼 표준 → K-Cosmetics 이미 사용 중 ✅

복사 API 기준: `assetSnapshotApi.copy({ assetType:'cms' })` → canonical 경로.

### ⑤ Neture를 비교 대상으로 잘못 포함하는가?

포함하지 않았다. Neture는 Store HUB 구조가 다르므로 이번 IR의 비교 대상 제외.

---

## 읽은 파일 (코드 변경 없음)

- `services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx`
- `services/web-k-cosmetics/src/pages/hub/HubContentPage.tsx`
- `services/web-k-cosmetics/src/pages/library/ContentLibraryPage.tsx`
- `services/web-k-cosmetics/src/App.tsx` (route 구조)
- `services/web-kpa-society/src/App.tsx` (route 구조)
- `packages/shared-space-ui/src/ContentHubTemplate.tsx` (정책 확인)
- `services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx` (메뉴)
