# IR-O4O-KPA-RESOURCES-MANUAL-CURRENT-STATE-AUDIT-V1

> **목적:** KPA-Society 자료실(Resources) 기능 매뉴얼 (`/guide/features/resources`) 재작성 전,
> 현재 구현 상태를 종합 조사한다. 본 문서는 조사 결과만 정리하며 코드/UI 수정은 포함하지 않는다.
>
> **선행 작업:**
> - `IR-O4O-KPA-CONTENT-MANUAL-CURRENT-STATE-AUDIT-V1` (콘텐츠 IR)
> - `WO-O4O-KPA-GUIDE-CONTENT-MANUAL-REFRESH-V1` (콘텐츠 가이드 정비 완료)
>
> **후속 작업:** `WO-O4O-KPA-GUIDE-RESOURCES-MANUAL-REFRESH-V1` (예정)

---

## 0. 결론 요약

자료실은 **콘텐츠 하위 설명으로 처리할 수 없다 — 독립 매뉴얼 유지가 맞다.**

### 핵심 발견 (Critical)

KPA-Society에는 **자료실 진입점이 2개** 존재하며 백엔드 테이블은 같지만 프론트 API·페이지·"내 자료함" 도착지가 다르다.

| 진입점 | 페이지 | API | 가져가기 destination |
|--------|--------|-----|---------------------|
| **`/resources`** | `ResourcesHubPage` (자료실 메인) | `resourcesApi` (별도) | `/store/library/resources` (`assetType: 'resource'`) |
| **`/content/resources`** | `ContentDocumentsPage` (subType='resource') | `contentApi` | `/store/library/contents` (`assetType: 'content'`) |

두 경로 모두 백엔드는 같은 `kpa_contents` 테이블 (`sub_type='resource'` 필터) 사용 — 데이터는 동일하지만 **사용자 흐름·도착지·API 표면이 다름**.

### Guide 매뉴얼 정합성 영향

- **현재 `kpaGuideFeatureResourcesProps`** ([kpa.ts:761-826](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L761-L826)) — `/resources` 가리킴. 그러나 내용은 추상적("카테고리·태그·검색 탐색", "PDF/이미지/파일 확인", "AI 활용 기준") — **실제 구현과 큰 불일치**.
- **현재 콘텐츠 가이드 §05 자료실** — `/content/resources` 가리킴 (필자가 직전 WO에서 작성). `/resources` 메인 자료실과 다른 경로 — **두 매뉴얼이 다른 곳을 가리키는 모순** 발생.

### 권장

1. **자료실 매뉴얼은 `/resources` 기준으로 단독 정비** (메인 진입점이며 운영자 등록 흐름·일반 회원 모달 등록·매장 가져가기·좋아요 등 완비)
2. **콘텐츠 가이드 §05의 `/content/resources` 설명은 축소 또는 제거** — Content 측 부가 진입점 정도로만 남기거나 자료실 가이드로 위임
3. 두 진입점이 도착지 다른 점은 **실제 구현 이슈일 가능성** — IR §10에 후속 조사 필요로 기록 (Guide 정비 범위 외)

---

## 1. 라우트 구조

### 1-1. `/resources` 계열 (자료실 메인)

[services/web-kpa-society/src/App.tsx:124-126, 664-667](../../services/web-kpa-society/src/App.tsx#L124-L667)

| Path | Component | 역할 |
|------|-----------|------|
| `/resources` | `ResourcesHubPage` | 공동자료실 메인 (커뮤니티 자료) |
| `/resources/new` | `ResourceWritePage` | 자료 등록 (소유자/일반 회원용) |
| `/resources/:id/edit` | `ResourceWritePage` | 본인 자료 수정 |
| `/operator/resources/*` | `OperatorRoutes` 하위 | 운영자 자료실 관리 (별도 라우트) |

### 1-2. `/content/resources` (콘텐츠 허브의 자료실 모드)

[App.tsx:735](../../services/web-kpa-society/src/App.tsx#L735) — `WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1`:

```tsx
<Route path="/content/resources" element={<ContentDocumentsPage subType="resource" />} />
```

- `ContentDocumentsPage`의 `subType='resource'` 분기 (콘텐츠 IR §3 참고)
- 등록 진입 라우트 없음 (백엔드/UX 흐름이 `/resources/new`로 일원화됨)

### 1-3. 자료실 가이드 라우트

[App.tsx:142, 591](../../services/web-kpa-society/src/App.tsx#L142-L591):

- `/guide/features/resources` → `GuideFeatureResourcesPage` (래퍼 + `kpaGuideFeatureResourcesProps`)

### 1-4. 매장 내 도착지

[App.tsx:895-897](../../services/web-kpa-society/src/App.tsx#L895-L897) — `WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS-CANONICAL-ALIGN-V1`:

- `/store/library/contents` → `StoreLibraryContentsPage` (콘텐츠+직접편집 통합 feed, `assetType='content'`)
- `/store/library/resources` → `StoreLibraryResourcesPage` (자료 가져옴 + 직접 업로드 통합)
- `/store/library/production-materials` → 매장 제작 자료 (별도)

---

## 2. `/resources` (메인 자료실) 실제 동작

[services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx)

### 2-1. 화면 구조

- `ResourcesHubTemplate` (`@o4o/shared-space-ui`) + KPA adapter (`useKpaResourcesConfig`)
- Hero: "자료실 — 회원들이 함께 이용하는 공동자료실입니다"
- 검색 placeholder: "자료를 검색하세요 (제목, 내용, 등록자)"
- 자료 카드/리스트 + 우측 Drawer 상세
- 페이지네이션

### 2-2. 데이터

[ResourcesHubPage.tsx:78-95](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L78-L95) + [resources.ts:60-61](../../services/web-kpa-society/src/api/resources.ts#L60-L61):

- API: `resourcesApi.list({ page, limit, search, sort: 'latest' })`
- 실제 호출: `GET /contents?sub_type=resource` (`kpa_contents` 테이블)
- 응답 필드:
  - `id`, `title`, `summary`, `body`, `blocks`, `tags`
  - `thumbnail_url`, `source_url`, `source_file_name`
  - `usage_type`: `READ` | `LINK` | `DOWNLOAD` | `COPY`
  - `reusable_policy`: `'platform'` | `'restricted'`
  - `like_count`, `view_count`, `author_name`, `isRecommendedByMe`

### 2-3. 자료별 액션 타입 (usage_type)

[ResourcesHubPage.tsx:81-89](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L81-L89):

| `usage_type` | UI actionType | 동작 |
|--------------|--------------|------|
| `READ` (또는 미설정) | `view` | Drawer로 읽기 |
| `LINK` | `external` | 외부 URL로 이동 |
| `DOWNLOAD` | `download` | 첨부 파일 다운로드 |
| `COPY` | `copy` | (?) — 사용처 확인 필요 |

### 2-4. 액션 (회원 권한별)

| 역할 | 노출 액션 |
|------|----------|
| 비로그인 | 열람만 |
| 일반 회원 | 등록 모달, 본인 자료 수정/삭제, 좋아요 |
| 매장 경영자 (`isStoreOwner`) | + **내 자료함 가져가기** |
| 운영자 (`PLATFORM_ROLES`) | + 행별 수정 (`/operator/resources/:id/edit`), 삭제, bulk 삭제 |

[ResourcesHubPage.tsx:115-132, 151-164](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L115-L164)

### 2-5. 등록 흐름

[ResourcesHubPage.tsx:34-60, 188-195](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L34-L195):

- **비로그인**: 로그인 페이지로 (state.from=`/resources/new`)
- **일반 회원**: `ResourceWriteModal` 즉시 열림 (모달 등록)
- **운영자**: `/operator/resources/new` 로 이동 (정규 등록 페이지)

[App.tsx:666-667](../../services/web-kpa-society/src/App.tsx#L666-L667) `/resources/new`, `/resources/:id/edit` 라우트는 별도로 존재 — 모달 외 정규 페이지로 등록도 가능.

### 2-6. 좋아요 / 조회수

- `resourcesApi.toggleRecommend(id)` — 좋아요 토글
- `resourcesApi.trackView(id)` — 진입 시 자동 호출
- 두 기능 모두 콘텐츠와 동일하게 `kpa_contents` 컬럼 공유

### 2-7. 가져가기

[ResourcesHubPage.tsx:151-164](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L151-L164):

```ts
await assetSnapshotApi.copy({
  sourceService: 'kpa',
  sourceAssetId: id,
  assetType: 'resource',   // ← /resources는 resource 타입
});
```

- 결과: `/store/library/resources` (StoreLibraryResourcesPage) 에 적재
- 제한 조건: `reusable_policy !== 'restricted'`
- `SOURCE_NOT_FOUND` / `POLICY_VIOLATION` 에러 분기 처리

---

## 3. `/content/resources` (콘텐츠 허브의 자료실 모드)

이미 콘텐츠 IR §3에서 상세 정리. 본 IR에서는 자료실 관점에서 본 차이만 요약.

### 3-1. 차이점

| 항목 | `/resources` (메인) | `/content/resources` (콘텐츠 모드) |
|------|---------------------|------------------------------------|
| 컴포넌트 | `ResourcesHubPage` | `ContentDocumentsPage` (subType prop) |
| API | `resourcesApi` (`/contents` + sub_type='resource') | `contentApi.list({ sub_type: 'resource' })` |
| usage_type | 표시·동작 분기 | **무시** (드로어/표 동일) |
| 좋아요 토글 | `resourcesApi.toggleRecommend` | 콘텐츠 상세에서만 (`contentApi.recommend`) |
| 자료별 액션(외부/다운로드) | `actionType` 기반 분기 | **없음** (상세 클릭만) |
| 가져가기 `assetType` | **`'resource'`** | **`'content'`** ⚠ |
| 도착지 | `/store/library/resources` | `/store/library/contents` |
| 등록 진입 | 모달 / `/resources/new` / `/operator/resources/new` | 라벨은 "자료 등록"이지만 hardcoded `/content/documents/new` → 실제로는 sub_type='content' 생성 |

### 3-2. 도착지 분기 이슈

같은 자료를 `/resources`에서 가져오면 `/store/library/resources` 에 적재, `/content/resources`에서 가져오면 `/store/library/contents` 에 적재됨. 동일 원본을 어디서 가져갔는지에 따라 매장 보관 위치가 갈림.

> **본 IR 범위 외**: Guide 정비와 별개의 구조 이슈 — 후속 조사 권장 (§10 참고).

### 3-3. 발견 위치 차이

- `ContentListPage` 우상단 "자료실 →" 링크 → **`/content/resources`** (콘텐츠 IR §2-2)
- `/guide/features/resources` 가이드 → **`/resources`** (메인)
- 사용자 동선상 충돌 가능성 있음 — Guide 정비 시 명확화 필요

---

## 4. 매장 도착지 `/store/library/resources`

[services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx:1-32](../../services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx#L1-L32)

### 4-1. 표시 내용

매장이 보유한 자료 **2개 소스** 통합 표시:

1. **직접 업로드**: `store_execution_assets` 테이블 (`GET /store/assets`)
2. **커뮤니티 가져옴**: `o4o_asset_snapshots` 테이블 (`GET /assets?type=resource`)

### 4-2. UnifiedResourceRow 구조

[StoreLibraryResourcesPage.tsx:45-62](../../services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx#L45-L62):

- `kind`: `'library'` (직접 업로드) | `'snapshot'` (가져옴)
- `assetType`: `'file'` | `'content'` | `'external-link'`
- `category`, `bodyText`, `description`, `thumbnailUrl`, `sourceFileName`, `fileSize`, `mimeType`, `href`

### 4-3. 정책

- 본문(`bodyText`)은 **가져가기 시점의 snapshot 값**이며 원본 자료와 독립적 — 커뮤니티 원본이 수정되어도 매장 자료함은 영향 없음
- 삭제: 직접 업로드 = `DELETE /store/assets/:id`, snapshot = `DELETE /assets/:id` (원본 영향 없음)

### 4-4. 매장 직접 등록

[StoreLibraryResourcesPage.tsx:4-6, RegisterStoreResourceModal](../../services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx#L4-L6):

- "자료 등록" 진입 → `RegisterStoreResourceModal`
- WO-O4O-STORE-LIBRARY-RESOURCE-SCREEN-CORRECTION-V1: 본 화면은 **원소스 자료 보관/관리 전용**. 콘텐츠 생성·AI·편집기·POP/QR/블로그/상품 상세설명 진입점 없음.

> 매장 자료함의 동작은 자료실 가이드 매뉴얼의 "가져간 다음 어떻게 활용?" 측면에서 한 줄 안내가 적절 — 상세는 매장 운영 가이드 소속.

---

## 5. 현재 `kpaGuideFeatureResourcesProps` 분석

[packages/shared-space-ui/src/guide/copy/kpa.ts:761-826](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L761-L826)

### 5-1. 현재 구조 (5-step)

| Step | 제목 | 핵심 내용 |
|------|------|----------|
| 01 | 자료실 이동 | `/resources` 진입, "카테고리별·최신순", "키워드 검색·태그 필터" |
| 02 | 자료 찾기 | 키워드·태그·상세 확인 |
| 03 | 자료 활용 | "PDF·이미지·파일", "고객 설명", "매장 운영 참고" |
| 04 | 자료 등록 | "파일 업로드", 제목/태그/등록 |
| 05 | AI 활용 기준 | "Raw 데이터→설명문 생성", "요약", "상담 문구 작성" |

### 5-2. 실제 구현과 불일치 (수정 대상)

| 항목 | 현재 Guide | 실제 |
|------|-----------|------|
| 카테고리 필터 | "카테고리별·최신순" | 카테고리 UI 없음. 정렬은 latest 고정 |
| 키워드 검색 | "키워드 검색" | **존재** (`ResourcesHubTemplate` 검색 input) ✓ |
| 태그 필터 | "태그 필터로 자료 찾기" | 태그 표시는 있으나 **필터 UI 없음** |
| 자료 활용 (PDF/이미지) | "본문 미리보기 또는 다운로드" | usage_type 분기로 외부 링크/다운로드 동작 — 현재 Guide의 설명은 부정확 |
| "고객 설명·매장 운영 참고" | 추상적 | 실제 가능은 "내 자료함 가져가기" → 매장 채널 활용 |
| 자료 등록 | "파일 업로드" 단일 흐름 | 모달 등록 (회원) + 운영자 등록 / source_type 4종 / usage_type 4종 |
| AI 활용 기준 (§05 전체) | "Raw 데이터→설명문 생성", "요약" 등 | **자료실에 AI 기능 없음** — 콘텐츠 작성 화면에서만 동작. **섹션 삭제 필요** |
| 매장 가져가기 | 언급 없음 | **핵심 기능 누락** — 매장 경영자 한정 |
| 좋아요 / 조회수 | 언급 없음 | 두 기능 모두 구현됨 |
| 운영자 자료실 관리 | 언급 없음 | 운영자 메뉴 (`/operator/resources/*`) 존재 |

### 5-3. Guide에서 제거해야 할 설명

- **AI 활용 기준 섹션 전체 (§05)** — 자료실에는 AI 모달 진입점 없음
- **카테고리 필터** 언급 — UI 없음
- **태그 필터** 언급 — UI 없음 (태그는 단순 표시)
- **"본문 미리보기 또는 다운로드"** 단일 흐름 설명 — usage_type 분기 미반영

### 5-4. Guide에 추가해야 할 설명

- 자료별 **usage_type 액션** (열람/외부 링크/다운로드)
- **좋아요 / 조회수**
- **모달 등록 흐름** (일반 회원)
- **내 자료함 가져가기** (매장 경영자) → `/store/library/resources` 도착
- 운영자 등록 흐름은 별도(`/operator/resources/new`) — 사용자 매뉴얼에서는 "운영자가 등록한 자료" 정도로 언급
- `reusable_policy='restricted'` 제한 안내

---

## 6. 콘텐츠 가이드 §05와의 관계

### 6-1. 현재 충돌

- **콘텐츠 가이드 §05** (직전 WO에서 작성) — `/content/resources` 가리킴
- **자료실 가이드 (kpaGuideFeatureResourcesProps)** — `/resources` 가리킴
- 두 매뉴얼이 **다른 페이지를 자료실로 안내** = 사용자 혼동

### 6-2. 권장 정리

후속 WO (`WO-O4O-KPA-GUIDE-RESOURCES-MANUAL-REFRESH-V1`)에서 함께 진행:

1. **자료실 가이드**: `/resources` 기준으로 전면 재작성 (본 IR §11 권장 목차)
2. **콘텐츠 가이드 §05 축소**: "자료실은 별도 가이드(`/guide/features/resources`) 참고" 한 줄 + `/content/resources`는 부가 진입점으로만 짧게 언급. 또는 콘텐츠 가이드에서 자료실 섹션 전체 제거하고 §06 "다른 콘텐츠 이동" 에 한 줄 추가.

콘텐츠 가이드 §05를 줄이는 작업은 본 자료실 WO 범위에 포함시키는 것이 자연스러움 (양쪽 일관성 유지).

---

## 7. 권한 구조 (정리)

[ResourcesHubPage.tsx:174-185](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx#L174-L185), [App.tsx:664-667](../../services/web-kpa-society/src/App.tsx#L664-L667), [resources.ts:101-116](../../services/web-kpa-society/src/api/resources.ts#L101-L116)

| 작업 | 권한 | 코드 |
|------|------|------|
| 자료실 열람 (목록/상세) | 비로그인 가능 | ResourcesHubTemplate (search·view·trackView 동작) |
| 좋아요 | 로그인 필수 | `resourcesApi.toggleRecommend` |
| 자료 등록 (일반 회원) | 로그인 | `ResourceWriteModal` (`/resources/new` 라우트도 존재) |
| 자료 등록 (운영자) | `PLATFORM_ROLES` 보유 | `/operator/resources/new` |
| 본인 자료 수정/삭제 | 작성자 본인 | `getOwnerEditHref(id) → '/resources/:id/edit'`, `onOwnerDelete` |
| 운영자 수정/삭제 | `isOperator` | `/operator/resources/:id/edit`, `resourcesApi.delete`, bulk delete |
| 매장 자료함 가져가기 | 매장 경영자 (`isStoreOwner && organizationId`) | `assetSnapshotApi.copy({ assetType: 'resource' })` |

---

## 8. 미구현 / 매뉴얼 제외 권장 기능

| 기능 | 상태 | 매뉴얼 포함 여부 |
|------|------|------------------|
| 카테고리 필터 | **미구현** | 제외 |
| 태그 필터 (클릭→필터링) | **미구현** | 제외 (태그 표시만 안내) |
| AI 활용 기능 | **미구현** | **제외** (현재 Guide의 §05 통째로 제거) |
| 댓글 | **미구현** | 제외 |
| 자료 파일 첨부의 직접 inline 편집 | **미구현** | 제외 (등록 모달의 입력 흐름만 안내) |
| 자료 가져간 후 매장 상세 활용 흐름 | 별도 가이드 소속 | "도착지 안내" 한 줄만 |

---

## 9. 권장 매뉴얼 목차 (제안)

> 최종 WO에서 확정. 기본 골격은 콘텐츠 가이드(6-step)와 동일 패턴 유지.

```text
/guide/features/resources

01 자료실 진입
   - /resources — 공동자료실
   - 자료 목록 + 검색
   - Drawer로 자료 상세 보기

02 자료 종류와 액션
   - usage_type 기반 행동 분기:
     · 열람(READ) — Drawer에서 본문/요약 읽기
     · 다운로드(DOWNLOAD) — 첨부 파일 내려받기
     · 외부 링크(LINK) — 외부 URL로 이동
   - 좋아요, 조회수

03 자료 등록
   - 일반 회원: /resources 우상단 "+ 자료 등록" → 모달 등록
     · 제목, 요약, 본문 또는 파일/링크, 태그, usage_type
   - 작성자 본인: /resources/:id/edit 에서 수정·삭제

04 내 자료함 가져가기 (매장 경영자)
   - "내 자료함 가져가기" 버튼 — 매장 경영자에게만 노출
   - 가져간 자료는 /store/library/resources 에서 확인
   - reusable_policy='restricted' 자료는 가져갈 수 없음

05 운영자가 관리하는 자료실
   - 운영자가 직접 등록·승인·삭제한 자료가 함께 표시됨
   - 운영자는 별도 메뉴(/operator/resources)에서 관리

06 콘텐츠 vs 자료실 — 차이 한 줄
   - 콘텐츠는 회원이 작성하는 글, 자료실은 공동 보관 자료
   - 콘텐츠 가이드(/guide/features/content) 참조
```

---

## 10. 후속 조사 권장 — Guide 범위 외 구조 이슈

본 매뉴얼 정비 WO 외에 **별도 IR** 또는 코드 정합성 WO로 다룰 가치가 있는 구조 이슈:

### 10-1. `/content/resources` vs `/resources` 도착지 분기 모순

- 같은 원본 자료 (`sub_type='resource'`)인데 가져가기 경로가 다름
  - `/resources` → `assetType='resource'` → `/store/library/resources`
  - `/content/resources` → `assetType='content'` → `/store/library/contents` (StoreLibraryContentsPage)
- 의도된 설계인지 잔존 코드 이슈인지 확인 필요

### 10-2. ContentListPage 우상단 "자료실 →" 링크

- 현재 `/content/resources`를 가리킴 ([ContentListPage.tsx:925](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L925))
- 메인 자료실(`/resources`)과 다른 페이지 — 사용자 동선상 혼동 가능
- 메인 자료실로 통합할지 결정 필요

### 10-3. `/content/resources`의 존재 의의

- 콘텐츠 허브에서 자료실 미리보기 용도라면 메인 `/resources` 링크로 충분
- 같은 데이터를 두 다른 컴포넌트로 표시하는 중복

> 본 IR 범위 외 — 후속 IR `IR-O4O-KPA-RESOURCES-DUAL-ENTRY-AUDIT-V1` 등으로 분리 권장.

---

## 11. 후속 WO 정의 (예고)

### WO-O4O-KPA-GUIDE-RESOURCES-MANUAL-REFRESH-V1

**목적:** 본 IR §9 권장 목차(6-step)로 `kpaGuideFeatureResourcesProps`를 전면 재작성하고, 콘텐츠 가이드 §05의 자료실 설명을 정리한다.

**범위:**
- [`packages/shared-space-ui/src/guide/copy/kpa.ts`](../../packages/shared-space-ui/src/guide/copy/kpa.ts) 단일 파일 수정
  - `kpaGuideFeatureResourcesProps` 전면 재작성 (5-step → 6-step)
  - `kpaGuideFeatureContentProps`의 §05 자료실 섹션 축소 또는 제거
- flowLabels, hero, sections 모두 실구현 기준으로 갱신
- AI 활용 기준 섹션(§05) 제거
- usage_type 액션, 매장 가져가기, 운영자 관리 흐름 추가

**범위 외:**
- 자료실 코드 수정 (`/resources`, `/content/resources` 통합 여부 등 §10 이슈)
- 매장 자료함 사용 흐름 상세 (매장 가이드 소속)
- 운영자 자료실 관리 매뉴얼 (운영자 가이드 소속)

**검증:**
- `tsc --noEmit` (shared-space-ui, web-kpa-society)
- 배포 후 브라우저 검증 (`/guide/features/resources` 및 `/guide/features/content`)
- 모바일 레이아웃 확인

---

## 12. 참고 파일

| 위치 | 역할 |
|------|------|
| [App.tsx:124-126, 664-667](../../services/web-kpa-society/src/App.tsx#L124-L667) | `/resources` 라우트 정의 |
| [App.tsx:142, 591](../../services/web-kpa-society/src/App.tsx#L142-L591) | `/guide/features/resources` 라우트 |
| [App.tsx:735](../../services/web-kpa-society/src/App.tsx#L735) | `/content/resources` (subType='resource') 라우트 |
| [App.tsx:895-897](../../services/web-kpa-society/src/App.tsx#L895-L897) | `/store/library/contents` · `/store/library/resources` 도착지 |
| [ResourcesHubPage.tsx](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx) | 자료실 메인 (ResourcesHubTemplate adapter) |
| [api/resources.ts](../../services/web-kpa-society/src/api/resources.ts) | `resourcesApi` (sub_type='resource' 하드코딩) |
| [api/assetSnapshot.ts:58-90](../../services/web-kpa-society/src/api/assetSnapshot.ts#L58-L90) | `assetSnapshotApi.copy/list/patch/remove` |
| [StoreLibraryResourcesPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx) | 매장 자료함 도착지 (자료) |
| [StoreLibraryContentsPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx) | 매장 자료함 도착지 (콘텐츠+직접) |
| [ContentDocumentsPage.tsx:133-147](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx#L133-L147) | `/content/resources`의 copyToStore (assetType='content') |
| [kpa.ts:761-826](../../packages/shared-space-ui/src/guide/copy/kpa.ts#L761-L826) | 현재 `kpaGuideFeatureResourcesProps` |
| [GuideFeatureResourcesPage.tsx](../../services/web-kpa-society/src/pages/guide/GuideFeatureResourcesPage.tsx) | 자료실 가이드 페이지 wrapper |

---

*작성일: 2026-05-23*
*Status: Investigation Complete — 후속 WO 대기*
