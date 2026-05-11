# IR-O4O-STORE-ASSETS-PAGE-ROLE-CLARIFICATION-V1

> 목적: `StoreAssetsPage` / `/store/content` 경로의 실제 역할을 조사하여 유지·통합·삭제 방향 결정

**조사일**: 2026-05-11  
**조사 범위**: `services/web-kpa-society/src/`, `packages/store-asset-policy-core/`  
**변경사항**: 없음 (조사 전용)

---

## 1. Route 등록 현황

**파일**: `services/web-kpa-society/src/App.tsx:891`

```typescript
{/* ── Hidden routes (사이드바 미표시, URL 직접 접근 유지) ── */}
<Route path="channels" element={<StoreChannelsPage />} />
<Route path="content" element={<StoreAssetsPage />} />           // ← 조사 대상
<Route path="content/blog" element={<PharmacyBlogPage />} />
<Route path="content/direct/:id" element={<StoreDirectContentPage />} />
<Route path="content/:snapshotId/edit" element={<StoreContentEditPage />} />
```

- **정식 경로**: `/store/content`
- **코드 주석**: "Hidden routes (사이드바 미표시, URL 직접 접근 유지)"
- **Lazy import**: `App.tsx:195` — `lazy(() => import('./pages/pharmacy/StoreAssetsPage'))`
- **Legacy redirect**: `/pharmacy/assets` → `/store/content` (App.tsx:540)

---

## 2. Sidebar / Menu 연결 여부

**storeMenuConfig.ts 확인 결과: 미등록**

```typescript
// packages/store-ui-core/src/config/storeMenuConfig.ts
// KPA_SOCIETY_STORE_CONFIG.menuSections 전체 검색 → '/content' 항목 없음
// '/store/content' 경로를 가진 menuItem 없음
```

| 섹션 | 항목 | `/store/content` 포함 여부 |
|------|------|--------------------------|
| 내 자료함 | 콘텐츠 / 자료 / 매장 제작 자료 | ❌ |
| 매장 실행 | 채널 관리 / 태블릿 / POP / QR / 블로그 / 상품 상세설명 | ❌ |
| 디지털 사이니지 | 플레이리스트 / 동영상 / 스케줄 | ❌ |

**결론**: 사이드바를 통한 진입 경로 없음. 의도적으로 숨겨진 라우트.

---

## 3. 실제 진입 가능 여부 — Active Callers 목록

`/store/content`는 **8개 이상의 위치에서 능동적으로 참조**된다.

| 파일 | 참조 형태 | 컨텍스트 |
|------|----------|---------|
| `StoreDirectContentPage.tsx:171,231` | `navigate('/store/content', replace)` · `<Link to="/store/content">` | direct 콘텐츠 편집 후 뒤로가기 |
| `StoreContentEditPage.tsx:295` | `<Link to="/store/content">` | snapshot 편집 후 뒤로가기 |
| `PlaylistDetailPage.tsx:79` | `navigate('/store/content?tab=signage')` | 사이니지 플레이리스트 저장 후 이동 |
| `MediaDetailPage.tsx:78` | `navigate('/store/content?tab=signage')` | 사이니지 미디어 편집 후 이동 |
| `StoreChannelsPage.tsx:1580` | `navigate('/store/content')` | 채널 관리 → "자산 관리" 버튼 |
| `StoreHomePage.tsx:171` | `<Link to="/store/content">` | 매장 홈 "콘텐츠 만들기" Step 2의 "자료실" 버튼 |
| `HubContentLibraryPage.tsx:152,155` | `href: '/store/content'` | 콘텐츠 허브 복사 후 "작업하러 가기" |
| `StoreOverviewSection.tsx:52,74` | `navigate('/store/content')` | 매장 홈 "매장 현황" 패널 클릭 |
| `ContentManagementPage.tsx:390` | `navigate('/store/content?tab=cms')` | CMS 콘텐츠 관리 push 후 이동 |

**결론**: 사이드바 미표시이나 여러 흐름에서 진입 가능한 살아있는 라우트.

---

## 4. 화면이 다루는 데이터

### 4.1 API 호출 구조

```typescript
// StoreAssetsPage.tsx
storeAssetControlApi.list({ limit: 200 })   // GET /store-assets
directContentApi.list()                      // GET /store-contents/direct
```

### 4.2 Section A — 내 매장 콘텐츠 (direct)

- **소스**: `directContentApi.list()` → `kpa_store_contents` WHERE `source_type='direct'`
- **렌더링**: 목록 카드 → `<Link to="/store/content/direct/:id">`
- **레이블**: "AI 생성 · 직접 작성"

### 4.3 Section B — StoreAssetsPanel (snapshot 채널 관리)

- **소스**: `storeAssetControlApi.list()` → `o4o_asset_snapshots` JOIN `kpa_store_asset_controls`
- **assetType 범위**: `cms` / `signage` / `lesson` / `content` / `resource` (전체)
- **주요 기능**:

| 기능 | 내용 |
|------|------|
| KPI 카드 4개 | 홈 게시 / 사이니지 게시 / 프로모션 게시 / 강제노출 카운트 |
| 탭 | 전체 / CMS 콘텐츠 / 사이니지 (3탭) |
| 필터바 | 상태(published/draft/hidden) / 정책(user_copy/hq_forced/campaign_push/expiring_soon/expired) / 채널(home/signage/promotion) / 정렬 |
| 강제노출 섹션 | `snapshotType='hq_forced'` 항목 상단 고정 표시 |
| 만료 임박 배너 | 강제노출 7일 이내 만료 건 경고 |
| 페이지네이션 | 일반 항목 20건씩 |

---

## 5. Canonical 구조와의 비교

| 화면 | Route | API | 주요 목적 |
|------|-------|-----|---------|
| **StoreAssetsPage** | `/store/content` | `storeAssetControlApi` (전체 type) + `directContentApi` | **채널 운영 관리** (KPI + 강제노출 + 게시 상태) |
| StoreLibraryContentsPage | `/store/library/contents` | `storeAssetControlApi` (cms/content/lesson) + `directContentApi` | **내 자료함** — 콘텐츠 선택 + 제작 시작 |
| StoreLibraryResourcesPage | `/store/library/resources` | `storeLibraryApi` + `assetSnapshotApi` (resource) | **자료 관리** — 자료 보유/삭제 |
| StoreProductionMaterialsPage | `/store/library/production-materials` | `directContentApi` | **제작 결과물** 통합 관리 |

### 중복 분석

| 항목 | StoreAssetsPage | StoreLibraryContentsPage | 중복 여부 |
|------|:---:|:---:|:---:|
| `storeAssetControlApi.list()` 호출 | ✅ | ✅ | ⚠️ 동일 API |
| direct 콘텐츠 목록 | ✅ | ✅ | ⚠️ 중복 |
| KPI 카드 (채널별 게시 카운트) | ✅ | ❌ | — |
| 강제노출(hq_forced) 별도 섹션 | ✅ | ❌ | — |
| 만료 임박 배너 | ✅ | ❌ | — |
| 정책 필터 (user_copy/hq_forced/etc) | ✅ | ❌ | — |
| 제작 시작 (StartProductionModal) | ❌ | ✅ | — |
| 사이니지 탭 | ✅ | ❌ | — |

**핵심 차이**: `StoreAssetsPage`의 고유 기능은 **강제노출(hq_forced) 관리 + 채널 KPI 대시보드**이다.  
`StoreLibraryContentsPage`는 이 기능을 갖지 않는다.

---

## 6. 판정

### 결론: **유지 — 단, 역할 명확화 및 라벨 오류 수정 필요**

`StoreAssetsPage`는 삭제 대상이 아니다. 이유:

1. **고유 기능 존재**: 강제노출(hq_forced) 관리, 만료 임박 배너, 채널별 KPI — 다른 canonical 화면 어디에도 없음
2. **능동적 참조 9개**: 편집 페이지 back link, 사이니지 저장 후 이동, 채널 관리에서의 CTA — 모두 의존 중
3. **`?tab=signage` / `?tab=cms`**: 특정 흐름(사이니지 편집, CMS push) 후 해당 탭으로 직행하는 경로가 이 페이지에서만 가능
4. **의도적 설계**: App.tsx 주석이 명시적으로 "Hidden routes (사이드바 미표시, URL 직접 접근 유지)"로 분류

---

## 7. 발견된 문제점 (수정 필요)

### 7.1 StoreHomePage 라벨 오류 — 즉시 수정 가능

```typescript
// StoreHomePage.tsx:171 (현재)
<Link to="/store/content">
  <BookOpen size={16} className="text-emerald-600" />
  <span>자료실</span>   // ← 오류: /store/content는 "자료실"이 아니라 "자산 관리"
</Link>
```

- **문제**: `/store/content`는 채널 운영 관리 뷰인데, 링크 레이블이 "자료실"로 표시됨
- "자료실"은 `/store/library/resources`가 canonical 위치
- **수정**: 레이블을 "자산 관리" 또는 링크 대상을 `/store/library/contents`로 변경

### 7.2 direct 콘텐츠 섹션 중복

```typescript
// StoreAssetsPage.tsx: directContentApi.list() → Section A 렌더링
// StoreLibraryContentsPage.tsx: directContentApi.list() → 동일 데이터 렌더링
```

- 두 페이지가 모두 direct 콘텐츠를 표시
- `StoreAssetsPage`의 Section A(내 매장 콘텐츠)는 `StoreLibraryContentsPage`와 완전 중복
- `/store/content`의 역할이 "채널 관리"라면 direct 콘텐츠 섹션은 불필요

### 7.3 사이드바 미표시 → 발견 불가 UX

- "강제노출 관리"라는 중요 기능이 사이드바에 없음
- Operator가 `/store/content`를 모르면 hq_forced 만료 임박 경고를 못 봄
- `StoreChannelsPage` 버튼 하나에만 의존 중

### 7.4 route 이름 불일치

- Route: `/store/content` → 이름이 "콘텐츠"이나 실제는 자산/채널 관리 뷰
- 페이지 h1: "매장 자산"
- 혼용으로 인해 호출처들의 의도가 불분명 (`StoreHomePage`의 오레이블이 이 혼용에서 기인)

---

## 8. 파일 상태 표

| 파일 | 상태 | 이유 |
|------|------|------|
| `pages/pharmacy/StoreAssetsPage.tsx` | **Keep + 역할 명확화** | 강제노출/채널 KPI 기능 고유, 9개 능동 참조 |
| `packages/store-asset-policy-core/src/components/StoreAssetsPanel.tsx` | **Keep** | 채널 운영 UI 핵심 |
| `pages/pharmacy/StoreContentEditPage.tsx` | **Keep** | snapshot 편집 (`/store/content/:id/edit`) |
| `pages/pharmacy/StoreDirectContentPage.tsx` | **Keep** | direct 콘텐츠 상세/편집 (`/store/content/direct/:id`) |
| `pages/pharmacy/StoreHomePage.tsx:171` | **Fix label** | "자료실" → 올바른 레이블 수정 필요 |
| `StoreAssetsPage.tsx Section A` (direct 목록) | **Remove** | `StoreLibraryContentsPage`와 중복 |

---

## 9. 삭제 위험도

**삭제 불가 (높음)**

- 9개 능동 참조가 모두 Back link / 저장 후 이동 destination으로 사용 중
- `/store/content?tab=signage` / `?tab=cms` 탭 URL은 해당 탭이 있는 페이지에만 유효
- 강제노출(hq_forced) 관리 기능 유일 존재
- 삭제 시: direct 편집 후 404, 사이니지 저장 후 404, CMS push 후 404 등 다수 흐름 파괴

---

## 10. 후속 WO 제안 (위험도 낮은 순)

### WO-1 (즉시, 1줄, 위험도 없음)
```
WO-O4O-KPA-STORE-HOME-CONTENT-LINK-LABEL-FIX-V1
- StoreHomePage.tsx:171 "자료실" 레이블 수정
- 대안 A: 레이블 → "자산 관리"
- 대안 B: 링크 대상 → /store/library/resources (실제 자료실)
- 위험도: 없음
```

### WO-2 (단기, 위험도 낮음)
```
WO-O4O-KPA-STORE-ASSETS-PAGE-DIRECT-SECTION-REMOVE-V1
- StoreAssetsPage의 Section A (direct 콘텐츠 목록) 제거
- StoreLibraryContentsPage와의 중복 해소
- /store/content 역할을 "채널 운영/강제노출 관리"로 명확화
- 위험도: 낮음 (같은 데이터가 /store/library/contents에도 있음)
```

### WO-3 (중기, 검토 필요)
```
WO-O4O-KPA-STORE-ASSETS-PAGE-SIDEBAR-ENTRY-V1
- storeMenuConfig.ts에 /store/content 또는 /store/asset-management 항목 추가
- "매장 실행" 섹션 또는 별도 "운영 관리" 섹션에 배치
- 강제노출/채널 KPI 기능 접근성 향상
- 위험도: 낮음 (기존 route 유지, UI 추가만)
```

### WO-4 (장기, 영향 큼)
```
WO-O4O-KPA-STORE-ASSETS-PAGE-ROUTE-RENAME-V1
- /store/content → /store/asset-management (또는 /store/channel-ops)
- 기존 /store/content는 Navigate redirect로 유지
- 9개 호출처 전체 업데이트
- 위험도: 중간 (redirect 처리 시 기술적 위험 낮으나 범위 큼)
```

---

## 11. 결론 요약

| 항목 | 판정 |
|------|------|
| 삭제 가능 여부 | ❌ 삭제 불가 |
| Dead code 여부 | ❌ Dead code 아님 — 9개 능동 참조 |
| Canonical 화면과 중복 | ⚠️ 부분 중복 (direct 섹션만) |
| 고유 기능 | ✅ 강제노출 관리 + 채널 KPI |
| 사이드바 미표시 | ✅ 의도적 (Hidden routes 주석) |
| 핵심 문제 | `StoreHomePage` 잘못된 "자료실" 레이블 + direct 섹션 중복 |
| 권장 방향 | **Keep + WO-1(레이블 수정) + WO-2(direct 섹션 제거) 순차 진행** |
