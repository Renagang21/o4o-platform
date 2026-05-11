# IR-O4O-STORE-PRODUCTION-MATERIALS-INTEGRATION-AUDIT-V1

**작성일:** 2026-05-11  
**조사 대상:** `/store/library/production-materials` (StoreProductionMaterialsPage) 및 연결된 제작 도구 (QR / POP / Blog / Tablet) 의 연결 상태 감사  
**목적:** 현재 구현 상태를 기준으로 각 도구의 wiring 완성도 검증, 빠진 wiring 확인, canonical 정비 포인트 도출  
**범위:** production-materials page, QR (store_qr_codes), POP (on-demand PDF), Blog (store_blog_posts), Tablet idle playlist. **제외:** signage 자체, AI content intermediates, 상품 상세설명 도구 (ProductDescriptionsPage — 별도 조사 필요)

---

## 1. 구성 요소 현황 (AS-IS)

### 1-A. StoreProductionMaterialsPage

| 항목 | 값 |
|------|------|
| 경로 | `/store/library/production-materials` |
| 컴포넌트 | `StoreProductionMaterialsPage.tsx` |
| 데이터 소스 | `directContentApi.list()` → `kpa_store_contents` where `source_type='direct'` |
| WO | WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-LIBRARY-TAB-V1 |

**기능:**
- `source_type='direct'` 항목 목록 표시
- 체크박스 선택 → "제작 시작" 버튼 → `StartProductionModal` 오픈
- 개별/일괄 삭제 (`directContentApi.remove`)
- 메타데이터 컬럼 표시: purpose / stage / createdFrom

**핵심 한계 (현재):**
```
directContentApi.list() 반환 필드:
  id, sourceType, snapshotId, title, updatedAt,
  shareStatus, sharedAt, sharedRequestId
  
contentJson 미포함 → purpose / stage / createdFrom 항상 undefined
```
→ `StoreProductionMaterialsPage:97-99`에서 `it.purpose ?? it.contentJson?.purpose` 로 추출을 시도하나,  
  list API 응답에 `contentJson` 필드가 없으므로 항상 `undefined` 반환.  
  **결과: 전체 항목이 "용도: 미지정 / 상태: 초안 / 생성 출처: 직접 작성" 으로 고정 표시됨.**

---

### 1-B. StartProductionModal

| 항목 | 값 |
|------|------|
| 컴포넌트 | `StartProductionModal.tsx` |
| 역할 | 제작 대상(POP/QR/Blog/상품 상세설명) 선택 → 편집기 route navigate |

**라우팅 매핑:**

| target | route |
|--------|-------|
| POP | `/store/marketing/pop` |
| QR 코드 | `/store/marketing/qr` |
| 블로그 | `/store/content/blog` |
| 상품 상세설명 | `/store/marketing/product-descriptions` |

**전달 state 구조:**
```typescript
navigate(route, {
  state: {
    production: {
      source: { fromLibrary: 'contents', items: [{ id, title, origin: 'direct' }] },
      target: selectedTarget,
    }
  }
});
```

> **주의:** `StoreProductionMaterialsPage`는 선택 항목을 `origin: 'direct'`로 설정함.  
> 각 편집기가 이 origin을 어떻게 처리하는지가 핵심 감사 포인트.

---

### 1-C. QR (StoreQRPage)

**수신 처리 코드 (`StoreQRPage.tsx:141-173`):**
```typescript
const incoming = state?.production?.source?.items?.find((it) => it.origin === 'library');
if (incoming) {
  // getStoreExecutionAsset() fetch 후 form 자동 채움
}
```

**판정: `origin === 'library'` 항목만 처리**

| 시나리오 | 결과 |
|----------|------|
| production-materials → QR (origin: 'direct') | **무시됨** — 아무 효과 없음 |
| 자료실 라이브러리 → QR (origin: 'library') | 정상 작동 |
| StoreAssetSelectorModal 직접 선택 | 정상 작동 |

**DB 저장:** `store_qr_codes` 테이블
- `library_item_id` (UUID, nullable): 논리적 참조만 저장 (FK 없음)
- 역방향 기록 없음: QR 생성 결과가 `kpa_store_contents` 에 기록되지 않음

---

### 1-D. POP (StorePopPage)

**수신 처리 코드 (`StorePopPage.tsx:88-164`):**
```typescript
// 3개 origin 모두 수용
for (const it of incoming) {
  if (origin === 'library') {
    // getStoreExecutionAsset() fetch → fileUrl/assetType 포함
  } else if (origin === 'snapshot' || origin === 'direct') {
    // title/description 그대로 사용, fileUrl=null
  }
}
```

**수신은 정상** — `direct` origin 포함하여 POP 항목 목록에 추가됨.

**PDF 생성 코드 (`StorePopPage.tsx:174-208`):**
```typescript
const libraryItems = popItems.filter((p) => p.origin === 'library');
if (libraryItems.length === 0) {
  toast.error('PDF 출력은 "내 자료함 → 자료" 항목만 지원합니다');
  return;
}
// libraryItemIds 만 백엔드로 전달
```

**판정:**

| 시나리오 | 결과 |
|----------|------|
| production-materials → POP (origin: 'direct') | **목록에 표시되나 PDF 생성 불가** |
| PDF 생성 | library origin 항목만 가능 — 백엔드 `POST /api/v1/kpa/pharmacy/pop/generate` 제약 |

**DB 저장:** 없음 — POP는 완전 on-demand PDF 생성. 결과물 artifact 없음.  
역방향 기록 없음.

---

### 1-E. Blog (PharmacyBlogPage)

**수신 처리 코드 (`PharmacyBlogPage.tsx:136-157`):**
```typescript
const items = state?.production?.source?.items;
if (items && items.length > 0) {
  const first = items[0];
  setEditorTitle(first.title || '');
  setEditorContent(first.description || '');
  setEditorExcerpt(first.description?.slice(0, 120) || '');
  setMode('editor');
}
```

**판정:** `direct` origin 포함 **정상 수신/처리**

| 시나리오 | 결과 |
|----------|------|
| production-materials → Blog (origin: 'direct') | **정상** — 첫 항목으로 에디터 자동 오픈, title+content 자동 채움 |

**DB 저장:** `store_blog_posts` 테이블 — `store_id + service_key + slug` 기준  
역방향 기록 없음: 블로그 게시글 저장 시 원본 `kpa_store_contents` 항목에 결과 반영 없음.

---

### 1-F. Tablet (StoreTabletDisplaysPage)

**데이터 구조:**
- 태블릿 진열 관리: `store_tablet_displays` (supplier/local product 구성)
- Idle 재생 목록: `store_tablets.idle_playlist_items` JSONB

**미디어 소스 (`StoreTabletDisplaysPage.tsx:254-305`):**
```typescript
// 두 소스 병합
(1) getStoreExecutionAssets() → store_execution_assets (직접 업로드 이미지/영상)
(2) assetSnapshotApi.list() → o4o_asset_snapshots → extractSnapshotMediaList()
```

**판정:**  
태블릿은 **production-materials와 무관한 별도 도메인**.
- Tablet idle: 이미지/영상 자산 소비 (store_execution_assets + snapshots)
- Tablet display: 상품 진열 구성 (product-oriented)
- `StartProductionModal`을 거치지 않음
- production-materials → Tablet 경로 없음

---

## 2. 연결 상태 매트릭스

| 기능 | 진입 경로 | origin | 수신 처리 | 결과 저장 | 역방향 기록 | 판정 |
|------|----------|--------|----------|----------|-----------|------|
| **production-materials 목록** | `/store/library/production-materials` | — | `directContentApi.list()` | — | — | 정상 (metadata만 미노출) |
| **production-materials → POP** | StartProductionModal | direct | ✅ 수신됨 (목록 표시) | 없음 (on-demand PDF) | ❌ 없음 | **wiring 부족** |
| **production-materials → QR** | StartProductionModal | direct | ❌ **무시됨** | store_qr_codes | ❌ 없음 | **wiring 부족** |
| **production-materials → Blog** | StartProductionModal | direct | ✅ 에디터 자동 채움 | store_blog_posts | ❌ 없음 | 정상 (역방향은 defer) |
| **production-materials → 상품설명** | StartProductionModal | direct | 미조사 | product_ai_contents? | ❌ 미조사 | **defer (별도 조사)** |
| **자료실 → QR** | StoreAssetSelectorModal | library | ✅ 정상 | store_qr_codes | ❌ 없음 | 정상 |
| **자료실 → POP** | StartProductionModal | library | ✅ PDF 생성 | 없음 (PDF) | ❌ 없음 | 정상 |
| **Tablet idle playlist** | 직접 (IdlePlaylistEditor) | — | store_execution_assets + snapshots | store_tablets JSONB | — | 정상 (별도 도메인) |
| **Tablet display** | 직접 (product pool) | — | supplier/local products | store_tablet_displays | — | 정상 (별도 도메인) |

---

## 3. 핵심 GAP 분석

### GAP-1: Production-materials → QR wiring 단절 (Critical)

**현상:**  
`StoreProductionMaterialsPage`는 항목을 `origin: 'direct'`로 전달.  
`StoreQRPage`는 `origin === 'library'`인 항목만 처리.  
→ production-materials에서 QR로 이동해도 아무 자동 채움 없음.

**근인:**  
QR은 원래 "자료실 라이브러리(store_execution_assets)" 항목을 연결 대상으로 설계됨.  
production-materials 항목(direct content)은 파일/URL이 없어 QR의 `landingType`이 결정되지 않음.

**해결 방향:**  
- 옵션 A: production-materials → QR 경로를 **비지원으로 명시** (StartProductionModal에서 QR 선택 시 안내 메시지)
- 옵션 B: `direct` origin 수신 시 slug 자동 생성 + landingType='page' (콘텐츠 랜딩) 로 form 채움
- 옵션 C: production-materials에서 QR 제작 시작 전 자료실 파일 연결 단계 추가

### GAP-2: Production-materials 항목의 POP PDF 출력 불가 (Medium)

**현상:**  
production-materials (direct origin) → POP 진입 시 항목이 목록에 표시되나 PDF 생성 불가.  
백엔드 `POST /api/v1/kpa/pharmacy/pop/generate`는 `libraryItemIds`만 처리.

**근인:**  
POP 백엔드가 `store_execution_assets`의 파일 URL을 사용해 PDF 구성.  
direct content는 파일 없이 text content만 있음.

**해결 방향:**  
- 옵션 A: text-based POP PDF 템플릿 추가 (백엔드 확장 필요)
- 옵션 B: production-materials → POP 경로를 **비지원으로 명시** (텍스트 콘텐츠는 POP 부적합 안내)
- 옵션 C: production-materials에서 POP 제작 시작 전 자료실 파일 연결 단계 추가

### GAP-3: Metadata (purpose/stage/createdFrom) 항상 미지정 (Low)

**현상:**  
`directContentApi.list()` 응답에 `contentJson` 없음 → 전체 항목이 "용도: 미지정 / 상태: 초안" 고정.

**근인:**  
list API 엔드포인트 (`GET /store-contents`) 반환 필드에 `contentJson` 미포함.  
개별 `get(id)` 호출 시 `contentJson` 포함되나, 목록 전체에 N+1 호출 불가.

**해결 방향:**  
- 옵션 A: list API에 `purpose, stage, createdFrom` 컬럼 추가 (DB 컬럼 또는 JSON 추출)
- 옵션 B: `kpa_store_contents` 테이블에 dedicated 컬럼 추가 (migration 필요)
- 옵션 C: 각 제작 도구가 저장 시 `purpose/stage/createdFrom`을 contentJson에 기록 (write 측 구현)

### GAP-4: 역방향 lifecycle 없음 (Defer)

**현상:**  
Blog/QR 생성 결과가 원본 production-materials 항목에 반영되지 않음.  
예: blog 발행 완료 → production-materials의 stage가 'finalized'로 업데이트되지 않음.

**근인:**  
현재 설계는 production-materials를 **단순 발사대(launcher)**로 사용.  
lifecycle 관리 (stage transitions, result tracking)는 scope 밖으로 남겨진 상태.

**해결 방향:** 별도 WO에서 lifecycle 설계 필요. 즉각 수정 불필요.

---

## 4. 기능별 최종 판정

| 기능 | 판정 | 우선순위 |
|------|------|---------|
| production-materials 목록/삭제 | **정상** | — |
| production-materials → Blog | **정상** | — |
| production-materials → QR | **wiring 부족** — direct origin 무시 | Medium |
| production-materials → POP | **wiring 부족** — PDF 출력 불가 (수신만 됨) | Medium |
| production-materials → 상품설명 | **defer** — 별도 조사 필요 | Low |
| Metadata 표시 (purpose/stage) | **구조 수정 필요** — list API contentJson 미포함 | Low |
| 역방향 lifecycle (결과 반영) | **defer** — 설계 선행 필요 | Low |
| Tablet | **정상** (별도 도메인, 연결 없음이 정상) | — |

---

## 5. 도출된 WO 후보

### WO-1: Production-materials → QR / POP 비지원 경로 명시 (빠른 수정)

**범위:**
- `StartProductionModal`에서 QR / POP 선택 시 production-materials 진입인 경우 안내 문구 표시
- 또는 QR/POP 빈 화면의 empty state에 "production-materials 항목은 직접 자료실 파일을 연결해야 합니다" 안내 추가
- 코드 변경 최소 (UI 텍스트/가이드 수준)

**Priority:** Medium | **Risk:** Low

---

### WO-2: directContentApi.list() metadata 필드 노출 (백엔드 확장)

**범위:**
- `GET /store-contents` 응답에 `purpose, stage, createdFrom` 추가
- `kpa_store_contents` 테이블에 dedicated 컬럼 추가 또는 contentJson에서 추출
- migration 필요

**Priority:** Low | **Risk:** Medium (DB migration)

---

### WO-3: 상품 상세설명 도구 연결 감사 (별도 IR)

**범위:** `ProductDescriptionsPage` (`/store/marketing/product-descriptions`) 조사  
- production-materials 진입 처리 여부
- `product_ai_contents` 테이블 연결 구조
- organization_id 격리 여부 (이전 세션에서 GAP 식별됨)

**Priority:** Medium | **Risk:** 조사만

---

## 6. Canonical 역할 정의 (현재 구현 기준)

```
StoreProductionMaterialsPage 실제 역할:
  kpa_store_contents (source_type='direct') 의 뷰어 + 제작 시작 launcher

아직 구현되지 않은 역할:
  - 제작 결과물 lifecycle 관리 (stage 추적)
  - 역방향 결과 기록
  - 도구별 제작 이력 조회
```

**production-materials는 현재 "자료 창고 + 발사대" 수준이며, "결과물 관리 허브"는 아직 구현되지 않았다.**  
이 상태는 설계 의도(WO comment에 "결과 lifecycle은 후속 WO")와 일치하므로,  
현 시점 구조적 결함이 아닌 **미완성 단계**로 분류한다.

---

## 7. 결론

| 항목 | 결론 |
|------|------|
| production-materials page 자체 | 기본 기능 정상 작동. metadata 표시만 부재. |
| → Blog | ✅ 완전 작동 (title+content 자동 채움) |
| → QR | ⚠️ direct origin wiring 없음 — QR은 library 파일 필요 |
| → POP | ⚠️ 수신은 되나 PDF 출력 불가 — 백엔드 library 전용 제약 |
| → 상품설명 | 🔲 미조사 |
| Tablet | ✅ 별도 도메인, production-materials와 연결 없음이 정상 |
| 역방향 lifecycle | 🔲 설계 미완성 (의도된 defer) |
| **즉각 수정 필요 항목** | GAP-1 (QR wiring) — 사용자 혼란 방지 안내 텍스트 또는 flow 수정 |

---

*IR 종료: 2026-05-11*
