# CHECK-O4O-MY-STORE-LOCAL-PRODUCTS-CROSSSERVICE-COMMONIZATION-V1

- **WO**: WO-O4O-MY-STORE-LOCAL-PRODUCTS-CROSSSERVICE-COMMONIZATION-V1 — 매장 자체 상품(StoreLocalProduct) 공통화
- **브랜치**: `work/commonization-my-store-shell-parts` (main 병합 없음)
- **작성일**: 2026-08-13
- **상태**: 구현 완료 · 4 서비스 typecheck/build PASS

---

## 1. 조사 — 기존 상태

| 서비스 | route / 화면 | API client | 공통 Manager |
|---|---|---|:---:|
| KPA | `/store/commerce/local-products` · `pages/pharmacy/StoreLocalProductsPage.tsx` (911L) | `src/api/localProducts.ts` (`/api/v1/store/local-products`) | ❌ 미사용 (자체 구현) |
| K-Cosmetics | `pages/store/StoreLocalProductsPage.tsx` (24L) | `services/localProductApi` | ✅ |
| PharmacyHub | `pages/store-owner/LocalProductsPage.tsx` (104L) | `lib/api/pharmacyHubLocalProducts.ts` | ✅ (연결 상태 게이트 후 위임) |
| GlycoPharm | `pages/store-management/StoreLocalProductsPage.tsx` (24L) | service api | ✅ (회귀 대상) |

권한·route·API 계약은 서비스마다 그대로 유지되며 이번 작업에서 건드리지 않았다.

### KPA 가 공통 Manager 를 쓰지 않은 이유 (§2 확인 결과)

Manager 헤더 주석에 `KPA 는 BaseTable 기반 구조라 본 manager 대상 아님` 으로 명시돼 있었다. 실제 차이는 3가지였고,
**업무 모델은 동일**했다(같은 테이블·같은 API 형태·같은 CRUD 의미: 등록/수정/비활성화, Display Domain, 주문 미연결).

1. **렌더 엔진** — KPA 는 `WO-O4O-STORE-HUB-LEGACY-LIST-CLEANUP-V1` 로 `@o4o/ui` `BaseTable` canonical 정렬 완료, 공통 Manager 는 raw `<table>`.
2. **컬럼 1개 추가** — 다국어 콘텐츠 연결 배지(`MultilingualContentBadge`).
3. **등록/수정 폼이 더 두꺼움** — 바코드, 공용 미디어 라이브러리 이미지 선택, `RichTextEditor`, 내 매장 콘텐츠 본문 가져오기(교체/추가 충돌 처리), 다국어 연결 패널 + QR/URL 액션.

목록 부분(헤더·검색·활성필터·loading/error/empty·pagination·toast·CRUD 상태머신)은 **문구를 제외하면 KPA 와 공통 Manager 가 사실상 동일**했다.
→ 중지 조건(다른 업무 모델 / API·업무 의미 변경 필요)에 해당하지 않아 수렴을 진행했다.

---

## 2. 공통 Core 로 수렴한 것

`packages/store-ui-core/src/components/local-products/StoreLocalProductsManager.tsx`

- 헤더(제목 + 총 건수 + 설명 + 태블릿 진열 버튼) · 검색(300ms 디바운스, 클라이언트 필터) · 활성 상품만 필터 ·
  상품 등록 버튼 · error/재시도 · loading · empty state · 목록 table · pagination · toast · CRUD 흐름(생성/수정/비활성화 confirm) — KPA 포함 4 서비스 공유.
- 기존 소비처가 prop 을 주지 않으면 **동작·마크업 불변**(class 문자열까지 종전 그대로 보존).

### 추가된 확장점 (전부 optional)

| prop | 용도 | 기본값 |
|---|---|---|
| 제네릭 `<T extends StoreLocalProduct, I>` | 서비스가 필드를 더 갖는 경우(KPA: `barcode`·`detail_html`) | `StoreLocalProduct` / `StoreLocalProductInput` |
| `extraColumns` | Badge 뒤·활성 앞에 서비스 고유 컬럼 삽입 (KPA 다국어) | 없음 |
| `tableVariant: 'plain' \| 'base'` | `'base'` 는 `@o4o/ui` `BaseTable` 렌더 (KPA canonical 유지) | `'plain'` |
| `renderFormModal` | 등록/수정 폼 교체 (저장 상태·에러·저장 호출은 Manager 소유) | 내장 `ProductFormModal` |
| `labels.emptyTitle` / `labels.emptyDescription` | empty state 문구 | 종전 문구 |
| `toastIcon` | toast 앞 ✅/❌ 표기 (KPA 기존 표기) | `false` |

컬럼은 내부 단일 모델(`ManagerColumn`)로 정의하고 plain/BaseTable 두 렌더러가 공유한다 → 컬럼 정의 중복 없음.

**의존성 변경 없음** — `@o4o/ui` 는 이미 store-ui-core 의 dependency 였다. package.json / lockfile 미변경.

---

## 3. 서비스별로 유지한 것

| 서비스 | 유지 |
|---|---|
| **KPA** | BaseTable 렌더 · 다국어 컬럼 · 리치 등록/수정 폼 전체(바코드 · 미디어 라이브러리 · RichTextEditor · 콘텐츠 가져오기 충돌 처리 · 다국어 연결 패널 · `MultilingualPublicActions` QR/URL) · Store Hub 이동 · 화면 문구 · toast 아이콘 |
| **PharmacyHub** | 매장 연결 상태 게이트(`StoreConnectionNotice`) · 후속 화면 없는 액션 3종 `null` 처리(dead link 대신 숨김) · 문구 |
| **K-Cosmetics** | `categoryPlaceholder` 만 주입하는 종전 형태 그대로 (코드 변경 0) |
| **GlycoPharm** | 코드 변경 0 (회귀만 확인) |
| 공통 아님 | API client · endpoint · 권한 · route |

---

## 4. 변경 금지 준수

- `StoreLocalProduct` ↔ `OrganizationProductListing` / handled-products **통합 없음** (파일·타입·쿼리 접점 0).
- 주문·장바구니·공급상품 의미 추가 없음 (Display Domain 주석·경고 배너 유지).
- route · 권한 · API 계약 · DB schema 변경 없음. **migration 없음.**
- KPA 고유 기능 손실 없음 — 위 §3 항목 전부 슬롯으로 보존.

---

## 5. 검증

| 대상 | typecheck | vite build |
|---|:---:|:---:|
| `@o4o/store-ui-core` | PASS | — |
| web-kpa-society | PASS | PASS |
| web-pharmacy-hub | PASS | PASS |
| web-k-cosmetics (회귀) | PASS | PASS |
| web-glycopharm (회귀) | PASS | PASS |

기능 검증은 **코드 경로 등가성 확인**으로 수행했다(작업 브랜치가 배포되지 않아 브라우저 smoke 는 실행하지 않음).

| 항목 | 확인 |
|---|---|
| 등록 / 수정 | `handleSave` → `api.createLocalProduct` / `updateLocalProduct`, 성공 시 toast + `loadProducts()` 재조회. KPA 는 `renderFormModal` 로 동일 payload(`LocalProductInput`) 전달 — 필드 매핑 코드 무변경 |
| 비활성화 | confirm 문구·`api.deleteLocalProduct`·toast 종전 동일. `is_active` 상품에만 버튼 노출 |
| 검색 | 300ms 디바운스 후 `name`/`category` 클라이언트 필터, 검색 시 page=1 리셋 |
| 활성 필터 | `activeOnly` 파라미터 + page=1 리셋 |
| pagination | `PAGE_SIZE=20`, `총 N개 중 a-b` 표기, 1페이지면 미노출 |
| loading / error / empty | 로딩 스피너 · error 배너+재시도 · empty(검색/비검색 분기 + 첫 상품 등록 CTA) |
| 후속 액션 | KPA·GP·KCos = 기본 경로(`/store/commerce/tablet-displays`, `/store/commerce/products/:id/marketing`, canonical POP) · PH = 3종 숨김 |

---

## 6. 변경 파일

```
packages/store-ui-core/src/components/local-products/StoreLocalProductsManager.tsx  (제네릭 + 4 슬롯)
packages/store-ui-core/src/index.ts                                                 (신규 타입 2개 export)
services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx              (911L → 공통 Manager 위임, 폼 모달 유지)
docs/checks/CHECK-O4O-MY-STORE-LOCAL-PRODUCTS-CROSSSERVICE-COMMONIZATION-V1.md      (본 문서)
```

K-Cosmetics / PharmacyHub / GlycoPharm 소스 변경 0건.

## 7. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.

- 발견·인라인 처리: `StoreLocalProductsManager.tsx` 헤더 주석의 `KPA 는 ... 본 manager 대상 아님` 문구가
  이번 수렴으로 사실과 달라져 같은 파일 주석을 갱신했다(기준 문서 아님, 코드 내 주석).
