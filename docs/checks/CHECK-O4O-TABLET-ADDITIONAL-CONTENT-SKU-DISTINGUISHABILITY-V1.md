# CHECK-O4O-TABLET-ADDITIONAL-CONTENT-SKU-DISTINGUISHABILITY-V1

> WO: 태블릿 `추가 정보 고르기 → 매장용 상세설명서` 검색 결과에도 SKU 구분정보 표시(선행 handled-products 로직 재사용).
> 성격: 최소 UX 개선. 프론트 + 백엔드 검색 SELECT 컬럼 1개 추가. **DB migration·병합·스캐너 없음.**

---

## 1. 조사

### 1.1 대상 컴포넌트
- 화면: `/store/commerce/tablet-displays` → `태블릿 콘텐츠/코너 수정 → 추가 정보 → 추가 정보 고르기` 모달.
- 모달: `ContentPickerModal` — spd 탭(`매장용 상세설명서`) 결과 카드 ([TabletScreenSetManager.tsx](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)).
- 검색: `searchTabletO4oDescriptions` → `GET /api/v1/store/tablet-content-sources/o4o-descriptions` ([store-tablet.routes.ts:1524](../../apps/api-server/src/routes/platform/store-tablet.routes.ts)).

### 1.2 데이터 구조 — 선행과 차이
- 이 검색은 **ProductMaster 단위** 반환(상관 서브쿼리, JOIN 증식 아님 — [KOPU VERIFY](CHECK-O4O-KPA-TABLET-KOPU-SAME-NAME-PRODUCTS-PROD-READONLY-VERIFY-V1.md) §2.1).
- 기존 응답 필드 = `masterId / name / barcode / summary / languages` → **`specification` 미포함**(handled-products `/store/products/search` 는 이미 포함했던 것과 차이).
- `pm.specification` 은 product_masters **직접 컬럼**(채워짐, 예 `20밀리리터 / 6 / 시럽 / 포`) → 검색 SELECT 에 컬럼만 추가하면 됨(§3.3 최소 API 추가, migration 무관).

### 1.3 함수 재사용
- 선행 `buildProductVariantLabel()`(WO-...-HANDLED-PRODUCTS-...-V1, commit 2e5357ff8) 는 `api/o4oStandardProducts.ts` 안에 있었음 → **공통 util 로 이동**([utils/productVariantLabel.ts](../../services/web-kpa-society/src/utils/productVariantLabel.ts)), 두 화면이 동일 함수 사용. 로직 복사 없음.

---

## 2. 구현

### 변경 파일
| 파일 | 변경 |
|------|------|
| [store-tablet.routes.ts](../../apps/api-server/src/routes/platform/store-tablet.routes.ts) | o4o-descriptions SELECT 에 `pm.specification` 추가(백엔드, 컬럼 1개) |
| [utils/productVariantLabel.ts](../../services/web-kpa-society/src/utils/productVariantLabel.ts) | **신설** — `buildProductVariantLabel()` 공통 util |
| [api/o4oStandardProducts.ts](../../services/web-kpa-society/src/api/o4oStandardProducts.ts) | 함수 정의 → util 재-export(기존 소비처 `AddO4oStandardProductModal` 무변경) |
| [api/tabletDisplays.ts](../../services/web-kpa-society/src/api/tabletDisplays.ts) | `O4oDescriptionSearchResult` 에 `specification: string \| null` 추가 |
| [TabletScreenSetManager.tsx](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx) | spd 결과 카드에 구분정보 서브라인 + util import |

### 표시
- spd 카드 구조: `상품명` / **`규격 · 수량 · 제형 · 포장`(있을 때만)** / `O4O 표준 설명서 · 바코드 · 요약`.
- specification 없으면 서브라인 생략(기존 2줄 유지, 깨진 값 없음).
- 시각 계층: 상품명 text-sm slate-800 / 구분정보 text-[11px] slate-600(break-keep, 줄바꿈) / 출처·바코드 text-[11px] slate-400(기존). §4.3 준수.
- 원문 임의 구조화·재라벨 없음(선행 규칙 동일).

### 무변경(§4.4/§4.5)
- 선택/복수선택/선택개수/`선택한 콘텐츠 추가`/탭전환/검색/모달/저장 계약 그대로. dedup·저장은 masterId 기준(구분정보 문자열은 표시 전용).
- O4O 제공/매장 제작 탭: store_content 결과에는 `specification`/`buildProductVariantLabel` 미적용(spd=O4oDescriptionSearchResult 에만) → 빈 줄·깨짐 없음.

---

## 3. 제외 (§6)
ProductMaster/설명서 병합 · 공유구조 변경 · 스캐너/카메라 · 검색 API 전면개편 · DB migration · specification 재생성 · 원천 정제 · 선택방식 변경 · 상품군 접기 — 안 함.

---

## 4. 검증
| 항목 | 결과 |
|------|------|
| web typecheck | ✅ `tsc --noEmit` EXIT 0 |
| web production build | ✅ EXIT 0 (15.12s) |
| api-server typecheck (내 파일) | ✅ `store-tablet.routes.ts` 에러 0 (SQL 문자열 컬럼 추가 — 타입 영향 없음). *참고: 전체 tsc 는 다른 세션 미커밋 스크립트(`drug-otc-*`, `hff-*-generate`)로 실패하나 내 변경 무관.* |
| 회귀: handled-products SKU 표시 | ✅ 공통화 후에도 `AddO4oStandardProductModal` 는 재-export 로 동일 함수 사용(import 경로 무변경) |
| 브라우저 스모크(영진) — 배포 후 라이브 | ✅ **PASS** (2026-07-19). api+web 배포 완료 후 `추가 정보 → 매장용 상세설명서 → '영진'`: 영진멘탁스크림(부테나핀염산염) 8806424007319 = **`10그램 · 1 · 개 · 튜브`** 서브라인 표시, 8806424007302(spec 없음) = 상품명+`O4O 표준 설명서·바코드`만, 영진덴티파워큐 = 상품명만. 구조=상품명/구분정보/출처·바코드 정상. |
| 회귀 스모크 — handled-products | ✅ **PASS** (2026-07-19). `유한메디카` 검색: 새솔크림·소론도정 SKU 서브라인(15그램·1·개·튜브 / 5밀리그램·30·정·병 / 5밀리그램·1000·정·병) 공통화 후에도 그대로. |

---

## 5. 산출물
- 변경 파일 5 + 본 CHECK. API: o4o-descriptions 응답에 specification 추가(최소). DB write/migration: 없음.
- commit: (아래 해시) / push 후 api+web 배포.
