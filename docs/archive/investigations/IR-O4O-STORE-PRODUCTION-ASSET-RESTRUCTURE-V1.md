# IR-O4O-STORE-PRODUCTION-ASSET-RESTRUCTURE-V1

> 내 매장의 매장 이용 자료 제작 흐름을 **매장 제작 자료 중심 구조**로 전환하기 위한
> 현 상태 조사 및 개편 설계 보고서 (코드 변경 없음, 조사만 수행)

| 항목 | 값 |
|------|------|
| 작성일 | 2026-05-11 |
| 대상 서비스 | KPA-Society (`services/web-kpa-society`) — `kpa-society` serviceKey |
| 메뉴 정의 위치 | `packages/store-ui-core/src/config/storeMenuConfig.ts:203-264` |
| 백엔드 엔티티 | `apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts` |
| 백엔드 컨트롤러 | `apps/api-server/src/routes/o4o-store/controllers/store-execution-assets.controller.ts` |
| 영향 범위 | KPA-Society 내 매장 좌측 메뉴 + 제작 4종(POP, QR, 블로그, 상품 상세설명) |
| 디지털사이니지 | **변경 범위 외 (독립 유지)** |
| 사전 동기화 | `git pull origin main` 완료, working tree clean |

---

## 1. 현재 구조 요약

### 1-1. 좌측 메뉴 (KPA_SOCIETY_STORE_CONFIG)

`packages/store-ui-core/src/config/storeMenuConfig.ts:203-264` 의 `KPA_SOCIETY_STORE_CONFIG` 가 단일 출처(SSOT). 현재 메뉴 그룹은 다음과 같다.

| 그룹 | 항목 (key / label / subPath) |
|------|-------------------------------|
| (무라벨) | `home` / 홈 / `''` |
| 상품 관리 | `products` 공급자 상품, `my-products` 내 매장 상품, `orders` 주문 내역 |
| **내 자료함** | `library-contents` 콘텐츠, `library-resources` 자료, `library-production-materials` **매장 제작 자료** |
| 디지털 사이니지 | `signage-playlist` 플레이리스트, `signage-videos` 동영상, `signage-schedules` 스케줄, `signage-player` TV 재생 |
| **매장 실행** | `channels` 채널 관리, `product-info-creator` 상품 정보 제작, `tablet-displays` 태블릿, `pop` POP, `qr` QR 코드, `blog` 블로그, `product-descriptions` 상품 상세설명, `requests` 상담 요청 |
| 분석 | `analytics-marketing` 마케팅 분석 |
| 설정 | `pharmacy-info` 약국 정보, `store-settings` 매장 설정 |

> 코드 주석 (storeMenuConfig.ts:226-227, 241-242) 에 이미 다음 의도가 명시되어 있음:
> *"제작 시작(POP/QR/블로그/상품 상세설명)은 본 그룹(=내 자료함)에서만 진입"*,
> *"매장 실행 — 결과물 관리(POP/QR/블로그/상품 상세설명) + 운영 기능. 신규 제작 진입은 본 그룹이 아닌 '내 자료함'에서 시작"*.
>
> 즉 **진입은 자료함에서, 결과물 관리는 매장 실행에서** 라는 듀얼 구조가 현재 의도다. 본 WO는 이 듀얼 구조를 **자료함 단일 진입 + 결과물도 자료함에서 관리**로 단순화하는 것이다.

### 1-2. 백엔드 데이터 모델 (이미 부분 통합 완료)

`store_execution_assets` 테이블이 **이미 통합형**으로 존재한다 (WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1 결과).

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `id` | uuid | PK |
| `organization_id` | uuid | 멀티테넌트 격리 (Domain Boundary) |
| `title` | varchar(300) | 제목 |
| `description` | text | 설명 |
| `asset_type` | varchar(50) | `file` / `content` / `external-link` |
| `category` | varchar(100) | free-form (예: `product-info`, `product-desc`) |
| `usage_type` | varchar(20) | `pop` / `qr` / `signage` / `banner` / `notice` |
| `source_type` | varchar(50) | `manual` / `uploaded` |
| `html_content` | text | content 타입의 본문 |
| `file_url`, `file_name`, `file_size`, `mime_type` | — | file 타입 메타 |
| `url` | varchar(1000) | external-link 타입 |
| `is_active` | bool | 활성 여부 |

→ **백엔드는 이미 단일 테이블 + type/category 분기**로 통합되어 있다. 프론트엔드의 분리만 정리하면 됨.

> 단, 다음 두 엔티티는 별도 테이블로 분리되어 있음:
> - `ProductAiContent` (`contentType='product_description'`) — 상품 상세설명 본문/AI 결과
> - `StoreQrCode` — QR 코드 라우팅 메타 (FK `library_item_id` 로 store_execution_assets 참조)

---

## 2. 기존 제작 기능 4종 조사 결과

### 2-1. POP

| 항목 | 내용 |
|------|------|
| 메뉴 라벨 | POP (`/store/marketing/pop`) |
| 페이지 | `services/web-kpa-society/src/pages/store/StorePopPage.tsx` |
| 리스트 구조 | 카드형 (자료함 진입 후 자동 prefill) |
| 진입 흐름 | 내 자료함 → "제작 시작" → POP (router state `{ production: { source: { items } } }`) |
| 저장 모델 | `StoreExecutionAsset` (`assetType=content` or `file`, `usageType=pop`) |
| 결과물 생성 | `POST /pharmacy/pop/generate` (서버에서 PDF 생성) |
| 미리보기 | PDF 다운로드 (인-브라우저 미리보기는 제한적) |

### 2-2. QR 코드

| 항목 | 내용 |
|------|------|
| 메뉴 라벨 | QR 코드 (`/store/marketing/qr`) |
| 페이지 | `StoreQRPage.tsx` |
| 리스트 구조 | 카드형 + 분석 패널 (스캔/방문 통계) |
| 진입 흐름 | 내 자료함 → 제작 → QR (router state) **+ 페이지 내 Create 모달** |
| 저장 모델 | `StoreExecutionAsset` (`usageType=qr`) + `StoreQrCode` (FK `library_item_id`) |
| 결과물 생성 | `createStoreQrCode()` + `GET /pharmacy/qr/{id}/image?format=png\|svg` |
| 미리보기 | QR 이미지 (PNG/SVG) |

### 2-3. 블로그

| 항목 | 내용 |
|------|------|
| 메뉴 라벨 | 블로그 (`/store/content/blog`) |
| 페이지 | `PharmacyBlogPage.tsx` (또는 `StoreBlogPage.tsx`) |
| 리스트 구조 | 카드/리스트형 게시물 |
| 진입 흐름 | 내 자료함 → 제작 → 블로그 |
| 저장 모델 | 별도 blog 엔티티 (`storeBlog` API) — `StoreExecutionAsset` 미사용 |
| 결과물 생성 | 블로그 게시물 자체가 결과물 (퍼블릭 라우트로 노출) |
| 미리보기 | 본문 HTML 렌더링 |

> **블로그는 현재 `StoreExecutionAsset` 통합 모델에 포함되어 있지 않음** — 별도 도메인. 통합 시 추가 설계 필요.

### 2-4. 상품 상세설명

| 항목 | 내용 |
|------|------|
| 메뉴 라벨 | 상품 상세설명 (`/store/marketing/product-descriptions`) |
| 페이지 | `StoreProductDescriptionsPage.tsx` |
| 리스트 구조 | 좌측: 상품 목록 / 우측: 편집 textarea |
| 진입 흐름 | 내 자료함 → 제작 → 상품 상세설명 (router state) |
| 저장 모델 | `ProductAiContent` (`contentType='product_description'`, FK `productId`) |
| 결과물 생성 | `saveProductAiContent()` (AI 생성 + 수동 편집) |
| 미리보기 | HTML 렌더링 |
| 상품 연결 | **로컬 상품 / 마스터 상품 필수** (productId FK) |

### 2-5. 상품 정보 제작 (참고, 최근 추가)

| 항목 | 내용 |
|------|------|
| 메뉴 라벨 | 상품 정보 제작 (`/store/execution/product-info`) |
| 페이지 | `StoreProductInfoCreatorPage.tsx` |
| 저장 모델 | `StoreExecutionAsset` (`category=product-info`) |
| 진입 흐름 | **자료함 미연동 — 페이지 내 "새로 만들기" 모달 직진** |
| 의미 | 본 WO의 "매장 제작 자료 만들기" UX 의 **선례** — 이미 동일한 모달 진입 패턴이 검증됨 |

---

## 3. 재사용 가능 영역

### 3-1. 100% 재사용

- **선택 모달**: `StoreAssetSelectorModal` (`src/components/store/StoreAssetSelectorModal.tsx`)
- **CRUD API**: `getStoreExecutionAssets`, `getStoreExecutionAsset`, `createStoreExecutionAsset`, `deleteStoreExecutionAsset`
- **백엔드 라우트**: `GET/POST/PUT/DELETE /api/v1/kpa/store/assets` — 이미 `category`/`usageType` 필터 지원
- **자료함 카드/리스트 UI**: `StoreLibraryContentsPage`, `StoreLibraryResourcesPage`, `StoreProductionMaterialsPage` 의 카드/필터/페이지네이션 패턴

### 3-2. 부분 재사용 (분기 필요)

- **PDF 생성**: `/pharmacy/pop/generate` — POP 전용 유지
- **QR 이미지 생성**: `/pharmacy/qr/{id}/image` — QR 전용 유지
- **본문 편집기**: 상품 상세설명/블로그/POP content 본문은 공통 RichText 에디터 추출 가능

### 3-3. 신규 추가 필요

- **유형 선택 모달** (`ProductionTypeSelectorModal`): POP / QR / 블로그 / 상품 상세설명 4개 카드. 디지털사이니지는 명시적으로 제외.
- **통합 라우터 디스패처**: 유형 선택 → 각 제작 화면으로 라우팅하되 진입점은 모달만

---

## 4. 삭제 후보

> **즉시 삭제 금지** — 기능 이관 검증 후 별도 WO에서 제거.

### 4-1. 메뉴 항목 (storeMenuConfig.ts:246-255)

| 항목 | 라인 | 대체 위치 |
|------|------|----------|
| `pop` POP | :250 | "매장 제작 자료" 내 유형 분류 |
| `qr` QR 코드 | :251 | "매장 제작 자료" 내 유형 분류 |
| `blog` 블로그 | :252 | "매장 제작 자료" 내 유형 분류 |
| `product-descriptions` 상품 상세설명 | :253 | "매장 제작 자료" 내 유형 분류 |

> **유지 후보**: `channels`, `product-info-creator`, `tablet-displays`, `requests` — 이들은 "제작 자료"가 아니라 운영/관리 기능. 단, 사용자 요구상위 메뉴 재정리(§5)에 따라 그룹 이동 필요.

### 4-2. 라우트

- `/store/marketing/pop`, `/store/marketing/qr`, `/store/content/blog`, `/store/marketing/product-descriptions` 의 **메뉴 진입은 제거**하되, 라우트 자체는 결과물 상세 보기/편집 진입점으로 **유지 권장** (deep-link 호환성).
- App.tsx 의 라우트 등록 위치는 별도 WO에서 정리.

### 4-3. 페이지 컴포넌트

- POP/QR/블로그/상품 상세설명 페이지는 **즉시 삭제 금지**. 매장 제작 자료 화면 내부에서 유형별 편집기로 호출되는 형태로 이관 후 검증된 다음 별도 WO에서 정리.

---

## 5. 새 메뉴 구조 제안

### 5-1. 사용자 요구 해석

사용자는 상위 메뉴를 **"내 자료함 / 디지털사이니지 / 채널"** 3축으로 재정리하길 원함. 현재 "매장 실행" 그룹의 운영 기능(상품 정보 제작, 태블릿, 상담 요청)은 새 구조 내 배치를 명시해야 함.

### 5-2. 신규 메뉴 구조 (제안)

| 그룹 | 항목 | 변경 사유 |
|------|------|-----------|
| (무라벨) | 홈 | 유지 |
| 상품 관리 | 공급자 상품, 내 매장 상품, 주문 내역 | 유지 |
| **내 자료함** | 콘텐츠, 자료, **매장 제작 자료** ★ | **매장 제작 자료가 통합 제작 진입점** |
| **디지털 사이니지** | 플레이리스트, 동영상, 스케줄, TV 재생 | **독립 유지 (변경 없음)** |
| **채널** | 채널 관리, 태블릿, 상담 요청 | 매장 실행 → "채널" 으로 축소·재명명. POP/QR/블로그/상품 상세설명은 이 그룹에서 제거 |
| 분석 | 마케팅 분석 | 유지 |
| 설정 | 약국 정보, 매장 설정 | 유지 |

> **`product-info-creator` (상품 정보 제작)** 의 위치 결정 필요:
> - 옵션 A: "매장 제작 자료" 내부 유형 중 하나로 흡수 (현재 `category=product-info` 로 이미 통합 모델 사용)
> - 옵션 B: 운영 도구 성격이 강하면 "채널" 또는 "상품 관리" 로 이동
> - **권장: 옵션 A** — 본 WO의 통합 UX와 정합. 단, 4종 유형 선택 모달에는 포함되지 않으므로 별도 검토.

### 5-3. 디지털사이니지 격리 보장

- 디지털사이니지 4개 항목(`signage-playlist`, `signage-videos`, `signage-schedules`, `signage-player`)은 **메뉴/라우트/엔티티 전부 변경 없음**.
- 유형 선택 모달의 카드 목록에 **signage 카드는 포함하지 않는다** — Phase 2 구현 시 명시적 카드 화이트리스트로 통제.

---

## 6. 새 제작 자료 중심 UX 제안

### 6-1. 진입 흐름

```
좌측 메뉴: 내 자료함 → 매장 제작 자료
  ├─ 좌측 상단 [매장 제작 자료 만들기] 버튼
  │     ↓ 클릭
  │  유형 선택 모달 (4 카드)
  │   ┌────────┬────────┬────────┬────────────┐
  │   │  POP   │  QR    │ 블로그 │ 상품 상세설명 │
  │   └────────┴────────┴────────┴────────────┘
  │     ↓ 카드 선택
  │  해당 유형 제작 화면으로 라우팅
  │   (기존 페이지를 inline 또는 modal panel 로 재사용)
  │
  └─ 본문: 매장 제작 자료 통합 리스트 (유형 필터 + 검색)
       각 row 클릭 → 해당 유형 편집 화면
```

### 6-2. 매장 제작 자료 리스트

- **컬럼**: 유형 (배지: POP/QR/블로그/상품상세설명), 제목, 원본 상품 연결, 상태, 생성일, 액션
- **필터**: 유형 (4종), 상태, 기간
- **정렬**: 최신순 기본
- **API**: `GET /api/v1/kpa/store/assets` (필터: `category`, `usageType` 조합)
- **블로그/상품상세설명 통합 우려**: §7 참조

### 6-3. 유형 선택 모달

- 카드 4개: POP, QR 코드, 블로그, 상품 상세설명
- 각 카드: 아이콘 + 이름 + 1줄 설명 (예: "QR 코드 — 매장 입구/제품 옆에 부착할 QR 생성")
- **사이니지는 표시하지 않음** (의도적 제외)
- 카드 선택 시 router state `{ production: { source: { type: 'pop' } } }` 로 기존 진입 패턴 재사용

---

## 7. 필요한 API/데이터 구조

### 7-1. 백엔드 변경 영향도

| 영역 | 변경 필요성 | 비고 |
|------|------------|------|
| `store_execution_assets` 테이블 | **변경 불필요** | POP/QR/상품 상세설명/상품 정보는 이미 통합 모델 사용 가능 |
| `StoreQrCode` 보조 테이블 | 유지 | QR 라우팅 메타로 필요, FK 변경 없음 |
| `ProductAiContent` 테이블 | **흡수 여부 결정 필요** | Phase 3 시점에 `store_execution_assets`(`category='product_description'`)로 이관 가능. 단, AI 생성 이력/버전 관리가 분리 필요하면 유지 |
| `storeBlog` 도메인 | **별도 검토 필요** | 블로그는 별도 도메인(`/store/content/blog`). 통합 리스트에는 메타만 노출하고 본문은 기존 API 유지 |
| API 엔드포인트 | 변경 불필요 | `GET /api/v1/kpa/store/assets?category=...&usageType=...` 로 충분 |

### 7-2. 프론트엔드 추가 모델 (제안)

```ts
// 유형 선택 모달용 카탈로그 (코드 내 상수)
type ProductionAssetType = 'pop' | 'qr' | 'blog' | 'product_description';

interface ProductionTypeCard {
  type: ProductionAssetType;
  label: string;
  description: string;
  icon: ReactNode;
  routeOnSelect: string; // 또는 router state payload
}
```

### 7-3. 통합 리스트 쿼리 전략

- 옵션 1 (권장): 백엔드에 통합 리스트 엔드포인트 추가 — `GET /api/v1/kpa/store/production-materials` 가 `store_execution_assets` + `product_ai_contents` + `store_blogs` 의 메타를 정규화해 반환
- 옵션 2: 프론트에서 3개 API 병렬 호출 후 머지 — 페이지네이션/정렬 일관성 손상

> **Phase 2에서 결정**. 단기적으로는 옵션 2로 시작 가능, 트래픽 증가 시 옵션 1 도입.

---

## 8. 구현 단계 제안

> 본 WO는 **조사만 수행**. 아래는 후속 WO들의 권장 시퀀스.

### Phase 1 — 메뉴/라우트 정리

- `storeMenuConfig.ts` 의 "매장 실행" 그룹을 **"채널"** 으로 재명명
- POP / QR 코드 / 블로그 / 상품 상세설명 4개 메뉴 항목 **제거**
- 라우트는 유지 (deep-link 호환)
- 별도 WO: `WO-O4O-KPA-STORE-SIDEBAR-PRODUCTION-MENU-REMOVE-V1`

### Phase 2 — 매장 제작 자료 리스트 + 만들기 모달

- `StoreProductionMaterialsPage` 에 [매장 제작 자료 만들기] 버튼 + 유형 선택 모달 추가
- 통합 리스트 (유형 필터 포함)
- 별도 WO: `WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-CREATE-FLOW-V1`

### Phase 3 — 기존 제작 화면 이관

- POP/QR/블로그/상품상세설명 페이지가 router state 진입을 이미 지원하므로 (§2 참조) 큰 코드 변경 없음
- 유형 선택 모달 → 기존 페이지 이동 시 router state payload 표준화
- 별도 WO: `WO-O4O-KPA-STORE-PRODUCTION-ENTRY-UNIFY-V1`

### Phase 4 — 운영 검증 후 개별 페이지 정리

- 트래픽/링크 분석 후 라우트 deprecation 결정
- 별도 WO: `WO-O4O-KPA-STORE-PRODUCTION-LEGACY-ROUTE-CLEANUP-V1`

### Phase 5 — 브라우저 검증

- Playwright 자동화 또는 수동 smoke test
- 검증 계정: `docs/local/TEST-ACCOUNTS.local.md` SSOT 참조

---

## 9. 위험 요소

| # | 위험 | 영향 | 완화 |
|---|------|------|------|
| R1 | **블로그가 별도 도메인** — 통합 리스트에 자연스럽게 포함되지 않음 | 통합 UX 일관성 손상 | Phase 2에서 옵션 1(통합 엔드포인트) 채택, 또는 블로그를 4유형 중 link-only 카드로 처리하고 별도 페이지 이동 |
| R2 | **ProductAiContent 별도 테이블** | 데이터 이중 관리 | Phase 3까지는 분리 유지, 통합 흡수는 별도 WO |
| R3 | **사이니지 누설** — 유형 선택 모달이 시간이 지나며 사이니지 카드를 추가할 유혹 | CLAUDE.md §10 위반(시그니지 구조 변경 금지) | 카드 카탈로그를 명시적 화이트리스트 상수로 고정, lint 또는 코드 리뷰 체크리스트 추가 |
| R4 | **deep-link 호환** | 외부 북마크/공유 링크 파손 | Phase 1에서 라우트는 유지, 메뉴만 제거 |
| R5 | **상품 정보 제작(product-info)** 의 위치 미결정 | UX 비일관 | Phase 1 시작 전 옵션 A/B 확정 (§5-2) |
| R6 | **권한/Guard** — 매장 제작 자료가 4유형으로 확장되며 각 유형별 권한 매트릭스 차이 가능 | 권한 누락 | `docs/baseline/ROLE-POLICY-AND-GUARD-V1.md` 와 교차 검증 |
| R7 | **store_execution_assets organizationId Domain Boundary** — Phase 2 통합 쿼리 시 `organizationId` 필터 누락 위험 | CLAUDE.md §7 Guard Rules 위반 | 모든 쿼리에서 `organizationId` 필수, 코드 리뷰 시 검사 |

---

## 10. 다음 WO 추천

> 본 WO는 IR. 아래는 후속 작업.

1. **WO-O4O-KPA-STORE-PRODUCTION-ASSET-RESTRUCTURE-DECISION-V1** — Phase 1 시작 전 결정 사항 확정
   - `product-info-creator` 위치 (옵션 A/B)
   - 통합 리스트 쿼리 전략 (옵션 1/2)
   - 블로그 통합 방식 (4유형 카드 vs link-only)
   - "매장 실행" → "채널" 재명명 채택 여부
2. **WO-O4O-KPA-STORE-SIDEBAR-PRODUCTION-MENU-REMOVE-V1** — Phase 1: 메뉴/라우트 정리
3. **WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-CREATE-FLOW-V1** — Phase 2: 만들기 버튼 + 유형 선택 모달
4. **WO-O4O-KPA-STORE-PRODUCTION-ENTRY-UNIFY-V1** — Phase 3: 진입 경로 표준화
5. **WO-O4O-KPA-STORE-PRODUCTION-LEGACY-ROUTE-CLEANUP-V1** — Phase 4: 미사용 페이지/라우트 정리 (운영 검증 후)

---

## 11. 참조 문서

| 문서 | 관련성 |
|------|--------|
| `CLAUDE.md` §5 (O4O Store & Order) | 본 작업의 상위 규칙 |
| `CLAUDE.md` §7 (Boundary Policy) | organizationId 필수 |
| `docs/architecture/O4O-STORE-RULES.md` | 매장 일반 규칙 |
| `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md` | Production Material canonical 정의 |
| `docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md` | 상품 상세설명 ↔ 상품 연결 |
| `docs/baseline/KPA-SIGNAGE-STRUCTURE-V1.md` | 디지털사이니지 격리 보장 |
| `docs/work-orders/WO-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-MENU-V1.md` (있다면) | 유사 UX 선례 — 모달 기반 Create |

---

## 12. 결론

- 백엔드는 **이미 통합 모델 (`store_execution_assets` + `assetType/category/usageType`)** 을 보유하고 있어 큰 스키마 변경 없이 본 작업이 가능하다.
- 프론트엔드의 분리(개별 메뉴 4개 + 결과물 화면 4개)만 정리하면 사용자가 요구한 **"매장 제작 자료 중심 UX"** 가 성립한다.
- 가장 큰 외란은 **블로그가 별도 도메인** 이라는 점, 그리고 **상품 상세설명이 별도 테이블** 이라는 점 — Phase 2/3 에서 처리 전략을 명시적으로 결정해야 한다.
- 디지털사이니지는 **메뉴/라우트/엔티티 전부 변경 범위 외**로 유지하며, 유형 선택 모달의 화이트리스트로 누설을 차단한다.
- 본 IR 이후 결정 사항(§10 #1)을 확정한 다음 Phase 1 WO부터 순차 진행 권장.

---

*Status: Investigation Complete. No code changes performed. Awaiting decision WO.*
