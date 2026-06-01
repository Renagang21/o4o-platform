# IR-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-STRUCTURE-DECISION-V1

**유형:** 구조 결정 IR  
**작성일:** 2026-06-01  
**상태:** 완료  
**코드 변경:** 없음

---

## 핵심 결론

GlycoPharm `/store-hub/signage`가 `/store/marketing/signage/library` (ContentLibraryPage)로 redirect되는 구조는 **의도적 설계가 아닌 미완성 상태**다.

- GlycoPharm의 Blog · POP · QR hub 페이지는 모두 `hubContentApi` + 전용 library page 패턴으로 구현됨
- Signage만 `WO-O4O-GLYCOPHARM-HUB-POP-QR-LIBRARY-PAGES-V1` 시점에 업그레이드되지 않아 redirect 상태 방치
- 기능 기반으로는 `ContentLibraryPage`가 browsing + copy를 제공하지만, hub navigation 컨텍스트 이탈이 발생하고 API 패턴이 canonical을 벗어남

**권장 옵션: Option C (KPA HubSignageLibraryPage 패턴 이식)**  
단기 우선은 **Option B** (lightweight wrapper)로 hub 컨텍스트 이탈 문제만 먼저 해결 가능.

---

## 1. KPA-Society 사이니지 구조 (Canonical)

| 항목 | 내용 |
|------|------|
| route | `/store-hub/signage` |
| page file | `services/web-kpa-society/src/pages/pharmacy/HubSignageLibraryPage.tsx` (605 lines) |
| menu label | 사이니지 |
| DataTable | ✅ `@o4o/operator-ux-core` `DataTable` |
| checkbox | ✅ `useBatchAction` 멀티선택 |
| ActionBar | ✅ 일괄 추가 ActionBar |
| 가져가기 | ✅ `assetSnapshotApi.copy({ sourceService: 'kpa', assetType: 'signage' })` → `o4o_asset_snapshots` |
| 데이터 소스 | `hubContentApi.list({ sourceDomain: 'signage-media' / 'signage-playlist' })` |
| view tab | 미디어 / 플레이리스트 2탭 |
| producer filter | 전체 / 운영자 / 커뮤니티 |
| 내 매장 연결 | `/store/marketing/signage` (StoreSignagePage — 3탭 엔진) |

**특징:** `hubContentApi` + `assetSnapshotApi.copy()` 단일 경로. `WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1` 완전 준수.

---

## 2. GlycoPharm 사이니지 구조 (Drift 상태)

| 항목 | 내용 |
|------|------|
| route | `/store-hub/signage` |
| page file | **없음** — `<Navigate to="/store/marketing/signage/library" replace />` |
| redirect 대상 | `services/web-glycopharm/src/pages/store-management/signage/ContentLibraryPage.tsx` |
| DataTable | ❌ (SignageHubTemplate 사용) |
| checkbox | ❌ |
| ActionBar | ❌ |
| 가져가기 | ⚠️ `ContentLibraryPage.onCopy` → `/api/v1/glycopharm/signage/my-signage` (서비스 전용 API) |
| 데이터 소스 | `/api/v1/glycopharm/signage/contents` (서비스 전용 API, hubContentApi ❌) |
| hub 컨텍스트 | ❌ store-hub layout을 벗어나 store management area로 이탈 |

### GlycoPharm Hub 탭별 API 패턴

| 탭 | page | API 패턴 | 판정 |
|----|------|-----------|------|
| B2B | HubB2BCatalogPage | b2b catalog API | ✅ hub page 존재 |
| 콘텐츠 | HubContentListPage | hubContentApi | ✅ hub page 존재 |
| 블로그 | HubBlogLibraryPage | `hubContentApi.list({ sourceDomain='blog' })` | ✅ 정합 |
| POP | HubPopLibraryPage | `hubContentApi.list({ sourceDomain='pop' })` | ✅ 정합 |
| QR | HubQrLibraryPage | `hubContentApi.list({ sourceDomain='qr' })` | ✅ 정합 |
| **사이니지** | **없음 (redirect)** | **서비스 전용 API** | **❌ 미완성** |
| 이벤트 오퍼 | HubEventOffersPage | eventOffers API | ✅ hub page 존재 |

**결론:** 다른 탭은 모두 전용 hub library page + `hubContentApi` 패턴을 갖추고 있으나 **사이니지만 예외**.

---

## 3. K-Cosmetics 사이니지 구조 (Minimal Wrapper)

| 항목 | 내용 |
|------|------|
| route | `/store-hub/signage` |
| page file | `services/web-k-cosmetics/src/pages/hub/HubSignagePage.tsx` (33 lines) |
| 구현 수준 | 정적 카드 + `/store/marketing/signage/playlist` 앵커 링크 |
| DataTable | ❌ |
| 가져가기 | ❌ (`assetSnapshotApi` 미사용) |
| 데이터 소스 | 없음 (정적 UI) |
| hub 컨텍스트 | ✅ hub layout 유지 (링크 클릭 전까지) |

**특징:** 최소 wrapper로 hub 컨텍스트를 보존하지만 실질적 hub 기능 없음.

---

## 4. 3-way 비교 요약

| 항목 | KPA | GlycoPharm | K-Cosmetics | 판정 |
|------|-----|-----------|-------------|------|
| hub library page 존재 | ✅ 605 lines | ❌ redirect | ✅ 33 lines | Glyco drift |
| hub 컨텍스트 유지 | ✅ | ❌ 이탈 | ✅ | Glyco 이탈 |
| DataTable + checkbox | ✅ | ❌ | ❌ | KPA만 완전 |
| 가져가기 API | `assetSnapshotApi.copy()` | 서비스 전용 | 없음 | KPA canonical |
| 데이터 소스 | `hubContentApi` | 서비스 전용 API | 없음 | KPA canonical |
| browsing + copy | ✅ | ⚠️ (컨텍스트 이탈) | ❌ | |
| 내 매장 연결 | `/store/marketing/signage` | `/store/marketing/signage` | `/store/marketing/signage/playlist` | 동일 목적지 |

---

## 5. GlycoPharm redirect 원인

**결론: 의도적 설계 아님 — 업그레이드 누락**

근거:

1. `App.tsx` line 620 코멘트 참조:
   ```
   WO-O4O-GLYCOPHARM-KPA-STYLE-UX-REFINE-P1-V1
   WO-O4O-HUB-TO-STORE-HUB-RENAMING-V1 (/hub → /store-hub)
   WO-O4O-STORE-HUB-CROSS-SERVICE-COMMONIZATION-PHASE1-V1
   ```
   이 WO들이 실행될 때 signage tab이 이미 redirect 상태였고, 정렬 대상으로 포함되지 않음.

2. `WO-O4O-GLYCOPHARM-HUB-POP-QR-LIBRARY-PAGES-V1`이 Blog/POP/QR에 hub library page를 추가했으나, 동시점에 Signage는 포함되지 않음.

3. `ContentLibraryPage`가 `SignageHubTemplate` 기반으로 구현되어 있어 "기능은 있다"는 착시 효과가 발생했을 것으로 추정.

4. 서비스 전용 API (`/api/v1/glycopharm/signage/contents`, `/api/v1/glycopharm/signage/my-signage`) 사용 → canonical `hubContentApi` + `assetSnapshotApi.copy()` 패턴 미적용 상태.

---

## 6. 기능 의미 비교

### KPA canonical Hub signage 의미

```
운영자/공급자가 HUB에 signage asset 게시
  → /store-hub/signage (HubSignageLibraryPage)에서 매장 경영자가 탐색
  → "내 매장에 추가" → assetSnapshotApi.copy() → o4o_asset_snapshots
  → /store/marketing/signage에서 playlist 편집 + 스케줄 관리
  → /public/signage?playlist=:id (공개 렌더링)
```

### GlycoPharm 현재 구조 의미

```
운영자가 /operator/signage/hq-media, /hq-playlists에서 콘텐츠 관리
  → /store-hub/signage → (redirect) → /store/marketing/signage/library (ContentLibraryPage)
  → 매장 경영자가 ContentLibraryPage에서 browsing + onCopy (서비스 전용 API)
  → /store/marketing/signage/playlist에서 playlist 관리
```

### 기능 충족 여부

| 기능 | KPA canonical 충족 | GlycoPharm 현재 충족 |
|------|-------------------|-------------------|
| 매장 경영자가 HUB에서 signage 탐색 | ✅ hub context | ⚠️ store area에서 |
| 가져가기(copy) 기능 | ✅ canonical path | ⚠️ 서비스 전용 API |
| hub layout 유지 | ✅ | ❌ 이탈 |
| 내 매장 연결 | ✅ | ✅ (playlist 관리 가능) |
| O4O Store Production Material 구조 준수 | ✅ | ⚠️ 부분 |

**판정: C** — 실제 HUB signage browsing + 가져가기 흐름이 hub context를 이탈하며 canonical API를 벗어나 있어 KPA 구조 이식 필요.

---

## 7. Current Structure vs O4O Philosophy Conflict Check

### ① Store HUB가 매장 실행 자산 탐색·가져가기 공간으로 유지되는가?

- KPA: ✅ 유지
- GlycoPharm: ❌ `/store-hub/signage` → store management area로 redirect, hub의 역할이 약화됨
- K-Cosmetics: ⚠️ wrapper 존재하나 데이터 연결 없음

### ② GlycoPharm redirect 구조가 HUB 의미를 약화시키는가?

**예.** Store HUB는 "운영자가 준비한 실행 자산을 매장이 탐색·가져가는 공간"이다. 현재 redirect는 매장 경영자를 hub 컨텍스트 밖(store management area)으로 내보낸다. UX 상 혼란을 준다.

### ③ KPA canonical과 다를 합리적 이유가 있는가?

없음. ContentLibraryPage는 이미 `SignageHubTemplate`을 사용하고 copy 기능도 있어서 hub page로서의 기능을 갖추고 있다. 단지 위치(store area)와 API(서비스 전용)가 canonical을 벗어났을 뿐이다.

### ④ 동일 O4O 철학의 서비스인데 signage만 다르게 유지할 이유가 있는가?

없음. Blog/POP/QR이 모두 `hubContentApi` + hub library page 패턴으로 정렬된 이상, signage만 예외로 남길 근거가 없다.

### ⑤ 바로 구현할지, lightweight wrapper로 충분한지?

단기: Option B (lightweight wrapper)로 hub 컨텍스트 이탈 문제만 먼저 해결.  
중기: Option C (KPA 패턴 이식) — backend에서 `hubContentApi`가 glycopharm signage 데이터를 반환하는지 확인 후 진행.

---

## 8. 후속 WO 범위 제안

### Option A — 현 redirect 유지

- **조건**: redirect 구조가 의도적이고 기능적으로 충분한 경우
- **판정**: ❌ 채택 불가. 비의도적 누락이며 hub 컨텍스트 이탈 발생.

### Option B — Lightweight wrapper page 추가 (단기 권장)

```
- 구현: GlycoPharm 전용 HubSignagePage 추가 (K-Cosmetics 유사)
- 위치: services/web-glycopharm/src/pages/hub/HubSignagePage.tsx
- 내용: 안내 카드 + /store/marketing/signage/library 진입 링크
- 라우팅: App.tsx line 620의 Navigate → HubSignagePage로 교체
- 범위: frontend 1개 파일, 라우팅 1줄 변경
- 선결 조건: 없음
```

### Option C — KPA HubSignageLibraryPage 패턴 이식 (중기 권장)

```
- 구현: HubSignageLibraryPage 이식
  - hubContentApi.list({ serviceKey='glycopharm', sourceDomain='signage-media'/'signage-playlist' })
  - assetSnapshotApi.copy({ sourceService: 'glycopharm', assetType: 'signage' })
  - DataTable + checkbox + ActionBar
- 선결 조건:
  1. Backend: hubContentApi가 glycopharm signage 데이터 반환 여부 확인
  2. Backend: assetSnapshotApi.copy()가 glycopharm serviceKey 지원 여부 확인
  3. 기존 ContentLibraryPage의 서비스 전용 API와의 migration 계획 필요
- 범위: frontend 1개 파일 + backend 확인 + API 마이그레이션
```

### Option D — Cross-service signage commonization IR 확대

```
- 조건: KPA/Glyco/K-Cos의 signage 구조 자체가 달라 공통화 필요한 경우
- 판정: 현 단계에서 불필요. Option C 범위로 충분.
```

---

## 권장 순서

```
1단계 (즉시): Option B
   → GlycoPharm /store-hub/signage에 lightweight wrapper 추가
   → hub 컨텍스트 이탈 문제 해결
   → WO 이름: WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-WRAPPER-V1

2단계 (다음 WO): Backend 확인
   → hubContentApi가 glycopharm signage scope 반환 가능한지 확인
   → assetSnapshotApi.copy()의 glycopharm serviceKey 지원 여부

3단계 (2단계 완료 후): Option C
   → KPA HubSignageLibraryPage 패턴 이식
   → 서비스 전용 API → canonical API 전환
   → WO 이름: WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1
```

---

## 코드 변경 없음 확인

이 IR에서 수정한 코드 파일: **없음**  
조사를 위해 읽은 파일:

- `services/web-glycopharm/src/App.tsx` (line 620)
- `services/web-glycopharm/src/pages/store-management/signage/ContentLibraryPage.tsx`
- `services/web-glycopharm/src/pages/hub/HubBlogLibraryPage.tsx`
- `services/web-glycopharm/src/pages/hub/HubPopLibraryPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/HubSignageLibraryPage.tsx`
- `services/web-k-cosmetics/src/pages/hub/HubSignagePage.tsx`
- `services/web-kpa-society/src/App.tsx`
- `services/web-k-cosmetics/src/App.tsx`
