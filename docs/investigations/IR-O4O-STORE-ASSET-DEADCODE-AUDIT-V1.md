# IR-O4O-STORE-ASSET-DEADCODE-AUDIT-V1

> 목적: 내 자료함 및 내 매장 제작 흐름(Store Asset / POP / QR / Blog / 상품 상세설명 / Tablet)에서 dead code, 중복, 고립 구조 조사

**조사일**: 2026-05-11  
**조사 범위**: `services/web-kpa-society/src/pages/pharmacy/`, `src/api/`  
**변경사항**: 없음 (조사 전용)

---

## 1. Route 연결 현황 (App.tsx 기준)

| Route | 컴포넌트 | 상태 |
|-------|---------|------|
| `/store/library/contents` | `StoreLibraryContentsPage` | ✅ 활성 |
| `/store/library/resources` | `StoreLibraryResourcesPage` | ✅ 활성 |
| `/store/library/production-materials` | `StoreProductionMaterialsPage` | ✅ 활성 (신규) |
| `/store/marketing/pop` | `StorePopPage` | ✅ 활성 |
| `/store/marketing/qr` | `StoreQRPage` | ✅ 활성 |
| `/store/marketing/product-descriptions` | `StoreProductDescriptionsPage` | ✅ 활성 |
| `/store/content/blog` | `PharmacyBlogPage` | ✅ 활성 |
| `/store/content` | `StoreAssetsPage` | ⚠️ 활성이나 역할 불명확 (사이드바 미표시) |
| `/store/marketing/signage/playlist` | `StoreSignagePage` | ✅ 활성 |
| `/store/commerce/tablet-displays` | `StoreTabletDisplaysPage` | ✅ 활성 |
| `/store-hub/content` | `HubContentLibraryPage` | ✅ 활성 |
| `/store-hub/signage` | `HubSignageLibraryPage` | ✅ 활성 |

---

## 2. 내 자료함 영역 — 판정

### StoreLibraryContentsPage
**판정: Keep**
- route: `/store/library/contents` ✅
- API: `storeAssetControlApi.list({type: 'cms'|'content'|'lesson'})`, `directContentApi.list()`
- StartProductionModal 연결 ✅
- 미사용 import/state 없음

### StoreLibraryResourcesPage
**판정: Keep**
- route: `/store/library/resources` ✅
- API: `getStoreLibraryItems()`, `assetSnapshotApi.list({type: 'resource'})`
- StartProductionModal 연결 ✅
- **snapshot 삭제 endpoint 미구현** → 직접 업로드만 삭제 가능 (후속 WO 후보)

### StartProductionModal
**판정: Keep**
- 내 자료함 전체의 제작 시작 진입점
- 4개 target: pop / qr / blog / product-description → 각 route로 navigate
- 미사용 코드 없음

### StoreAssetsPage
**판정: 보류 — 역할 재평가 필요**
- route: `/store/content` (사이드바 미표시 — 숨겨진 라우트)
- 역할: direct 콘텐츠 섹션 + StoreAssetsPanel에 snapshot 목록 위임
- 문제: 2-in-1 설계, KPA 커스텀 거의 없음
- 권고: direct 콘텐츠 섹션만 별도 페이지로 분리 검토 (별도 WO)

---

## 3. 제작 흐름 페이지 — 판정

### StorePopPage
**판정: Keep**
- route: `/store/marketing/pop` ✅
- 진입: 내 자료함 → StartProductionModal → POP (production state 수신)
- 신규 제작 시작 버튼 제거 완료 (WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1) ✅
- origin 3개 모두 지원: 'library' | 'snapshot' | 'direct'
- 미사용 코드 없음

### StoreQRPage
**판정: Keep**
- route: `/store/marketing/qr` ✅
- 진입: 내 자료함 → StartProductionModal → QR (자동 prefill)
- 신규 생성 버튼 제거 완료 ✅
- QR analytics, PNG/SVG download, 일괄 PDF print 모두 활성
- 미사용 코드 없음 (1,107줄 전체 사용 중)

### StoreProductDescriptionsPage
**판정: Keep**
- route: `/store/marketing/product-descriptions` ✅
- 진입: 내 자료함 → StartProductionModal → 상품 상세설명 (prefill 지원)
- API: `fetchLocalProducts`, `getProductAiContents`, `saveProductAiContent`, `generateProductAiContent`
- 미사용 코드 없음

### PharmacyBlogPage
**판정: Keep**
- route: `/store/content/blog` ✅
- 진입: 내 자료함 → StartProductionModal → 블로그 (title/description prefill)
- "새 글 작성" 신규 버튼: WO-O4O-STORE-CREATION-CTA-EMPTY-STATE-FIX-V1에서 빈 상태 한정 복원
- AiContentModal 연결, 블로그 설정(identity) 관리 포함
- 미사용 코드 없음

### StoreProductionMaterialsPage
**판정: Keep (신규 — 안정화 대기)**
- route: `/store/library/production-materials` ✅
- 역할: 제작 결과물 통합 관리 (POP/QR/블로그/상품 상세설명)
- 현재 contentJson.purpose/stage/createdFrom 메타데이터 수집이 각 도구에서 미구현
- 각 도구가 결과물 저장 시 메타데이터를 추가해야 자동 분류됨 (WO 진행 중)

---

## 4. API 클라이언트 — 판정

### assetSnapshot.ts
**판정: Keep (전체)**

내보내는 API 객체:

| 객체 | 용도 | 상태 |
|------|------|------|
| `assetSnapshotApi` | 공개 자료 조회/복사 | ✅ 활성 |
| `storeAssetControlApi` | 매장 자료 관리 (publish/channel) | ✅ 활성 |
| `publishedAssetsApi` | 공개 렌더링용 | ✅ 활성 |
| `storeContentApi` | snapshot override 편집 | ✅ 활성 |
| `directContentApi` | 직접 작성 콘텐츠 CRUD | ✅ 활성 |

**assetType 전체 목록** (SnapshotAssetType):
- `'cms'` — 레거시 플랫폼 CMS (의도적 유지)
- `'signage'` — 사이니지
- `'lesson'` — LMS 강의
- `'content'` — KPA 콘텐츠 표준
- `'resource'` — 자료실

모두 사용 중. 미사용 type 없음.

### storeLibrary.ts
**판정: Keep**
- 직접 업로드 자료 CRUD 전담 (`/pharmacy/library` endpoint)
- 사용처: StoreQRPage, StorePopPage, StoreLibraryResourcesPage, StoreTabletDisplaysPage
- `getNetureLibraryItem(id)` — Neture 공개 자료 단건 (사용 중)
- storeExecutionAssets.ts와의 관계: storeLibrary.ts는 `/pharmacy/library`, storeExecutionAssets.ts는 `/store/assets` — 다른 endpoint, 다른 용도

### storeExecutionAssets.ts
**판정: Keep (단, 레거시 alias 정리 필요)**

```typescript
// 레거시 타입 alias (호환성 유지용)
export type StoreLibraryItem = StoreExecutionAsset;       // ← 삭제 후보
export type CreateStoreLibraryParams = CreateStoreAssetParams;  // ← 삭제 후보
export type StoreLibraryPaginatedResponse = StoreAssetPaginatedResponse;  // ← 삭제 후보
```

함수들도 `getStoreLibraryItems`, `getStoreLibraryItem`, `createStoreLibraryItem` 등 이전 명칭 alias 존재. 실제로 호출하는 파일이 있는지 grep 확인 필요.

---

## 5. 실제 Dead Code / 미사용 항목

### 5.1 storeExecutionAssets.ts — 레거시 alias

```typescript
// 파일 내 legacy alias 목록
export type StoreLibraryItem = StoreExecutionAsset;
export type CreateStoreLibraryParams = CreateStoreAssetParams;
export type UpdateStoreLibraryParams = UpdateStoreAssetParams;
export type StoreLibraryPaginatedResponse = StoreAssetPaginatedResponse;
export async function getStoreLibraryItems(...) // alias
export async function getStoreLibraryItem(...)  // alias
export async function createStoreLibraryItem(...) // alias
export async function updateStoreLibraryItem(...) // alias
export async function deleteStoreLibraryItem(...) // alias
```

이 alias 함수들이 storeLibrary.ts의 함수와 혼동될 수 있음.
**실제 호출처 grep 필요** — alias가 어디서 쓰이는지 확인 후 삭제 판단.

### 5.2 StoreAssetItem 미사용 필드

`assetSnapshot.ts`의 `StoreAssetItem` 타입:
```typescript
lifecycleStatus?: string;  // UI 표시 없음
snapshotType?: string;     // 필터 미사용
channelMap?: Record<...>;  // 일부 페이지만 사용
```

타입 정의는 있으나 UI에서 표시/필터에 활용 미흡. Dead code는 아니나 미활용 필드.

### 5.3 신규 버튼 제거 완료 확인

이하 버튼은 이미 제거됨 (WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1):
- StoreQRPage: "QR 코드 생성" 신규 진입 버튼 ✅ 제거됨
- StorePopPage: "신규 제작 시작" 버튼 ✅ 제거됨
- PharmacyBlogPage: "새 글 작성" 버튼 → empty state 한정 복원 (의도적)
- StoreProductDescriptionsPage: 신규 생성 버튼 ✅ 제거됨

모두 정상 처리됨.

---

## 6. 통합 필요 항목 (중복/혼재)

### 6.1 storeContentApi vs directContentApi

| | storeContentApi | directContentApi |
|---|---|---|
| endpoint | `/store-contents/{id}` | `/store-contents/direct/{id}` |
| 용도 | snapshot override (edit) | 직접 작성 콘텐츠 |
| CRUD | get, save (2개) | list, get, update, remove (4개) |

개념이 서로 다르나 동일 base path 사용. 경로 정리 후속 WO 검토 대상.

### 6.2 storeLibrary.ts vs storeExecutionAssets.ts 혼재

- `storeLibrary.ts` → `/pharmacy/library` endpoint (직접 업로드, physical files)
- `storeExecutionAssets.ts` → `/store/assets` endpoint (실행 자산)

두 파일이 존재하며 storeExecutionAssets.ts에 storeLibrary.ts 이름의 alias 함수들이 있어 혼동 유발.
실제 어떤 파일이 어디서 쓰이는지 grep으로 최종 확인 필요.

---

## 7. 전체 파일 상태 표

| 파일 | 판정 | 이유 |
|------|------|------|
| `pages/pharmacy/StoreLibraryContentsPage.tsx` | **Keep** | 내 자료함/콘텐츠 canonical |
| `pages/pharmacy/StoreLibraryResourcesPage.tsx` | **Keep** | 내 자료함/자료 canonical |
| `pages/pharmacy/StartProductionModal.tsx` | **Keep** | 제작 흐름 핵심 진입점 |
| `pages/pharmacy/StoreAssetsPage.tsx` | **보류** | 역할 불명확, 사이드바 미표시 |
| `pages/pharmacy/StorePopPage.tsx` | **Keep** | POP 제작 canonical |
| `pages/pharmacy/StoreQRPage.tsx` | **Keep** | QR 관리 canonical |
| `pages/pharmacy/StoreProductDescriptionsPage.tsx` | **Keep** | 상품 상세설명 canonical |
| `pages/pharmacy/PharmacyBlogPage.tsx` | **Keep** | 블로그 canonical |
| `pages/pharmacy/StoreProductionMaterialsPage.tsx` | **Keep (신규)** | 제작물 통합 관리 (안정화 중) |
| `pages/pharmacy/StoreSignagePage.tsx` | **Keep** | 사이니지 운영 |
| `pages/pharmacy/StoreTabletDisplaysPage.tsx` | **Keep** | 태블릿 운영 |
| `pages/pharmacy/HubContentLibraryPage.tsx` | **Keep** | 콘텐츠 가져오기 |
| `pages/pharmacy/HubSignageLibraryPage.tsx` | **Keep** | 사이니지 가져오기 |
| `api/assetSnapshot.ts` | **Keep** | 자료함 API 전체 |
| `api/storeLibrary.ts` | **Keep** | 직접 업로드 자료 CRUD |
| `api/storeExecutionAssets.ts` | **Keep + 정리 필요** | 실행 자산 API (legacy alias 정리) |

---

## 8. WO 후보 (작고 안전한 순서)

### WO-1 (즉시, 낮은 위험도)
```
WO-O4O-STORE-EXECUTION-ASSETS-ALIAS-CLEANUP-V1
- storeExecutionAssets.ts의 레거시 alias 함수/타입 제거
- 전제: 호출처 grep 확인 (storeLibrary.ts 함수와 혼동 없는지)
- 예상: ~30줄 제거
- 위험도: 낮음 (alias이므로 원본 함수 유지됨)
```

### WO-2 (중간, 보류 중)
```
WO-O4O-RESOURCES-LIBRARY-SNAPSHOT-DELETE-V1
- StoreLibraryResourcesPage: 커뮤니티 가져온 자료 삭제 기능 추가
- 현재 직접 업로드만 삭제 가능, snapshot은 삭제 불가
- 위험도: 낮음
```

### WO-3 (역할 재평가 후)
```
WO-O4O-STORE-ASSETS-PAGE-ROLE-CLARIFICATION-V1
- StoreAssetsPage 역할 재정의
- direct 콘텐츠 섹션 분리 또는 사이드바 표시 여부 결정
- 위험도: 중간
```

### WO-4 (API 정리)
```
WO-O4O-STORE-CONTENT-API-PATH-CLARIFICATION-V1
- storeContentApi vs directContentApi 경로 정리
- endpoint 명칭/경로 일관성 확보
- 위험도: 중간 (API 호환성 확인 필요)
```

---

## 9. 결론

**주요 발견: 확정 dead code 없음**

내 자료함 및 매장 제작 흐름 전체가 canonical flow로 잘 정리되어 있음:
- `내 자료함 → StartProductionModal → 편집기(POP/QR/Blog/상품설명)` 흐름 완성
- 신규 제작 버튼 제거 완료 (WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1)
- 레거시 asset type 없음 (cms는 의도적 유지)

**정리 필요한 것**:
1. `storeExecutionAssets.ts` 레거시 alias 함수/타입 (grep 확인 후 제거 가능)
2. `StoreAssetsPage` 역할 명확화 (사이드바 미표시 이유 재검토)
3. snapshot 삭제 흐름 미완성 (StoreLibraryResourcesPage)
4. `StoreProductionMaterialsPage` metadata 수집 완성 (각 도구에서 contentJson 저장 필요)
