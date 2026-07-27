# IR-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-ROLE-AUDIT-V1

> WO: `IR-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-ROLE-AUDIT-V1`
> 근거 IR: `docs/investigations/IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1.md` (G1 잔여 항목)
> 성격: **READ-ONLY 조사** — 코드 변경 0 / DB write 0 / migration 0 / route·메뉴 변경 0 / 배포 0
> 일자: 2026-07-27

---

## 1. 한 줄 판정

`StoreProductInfoCreatorPage`(`/store/execution/product-info`)는 **UNREACHABLE 하면서, 저작 기능이 canonical 제작 자료 흐름(`ProductionMaterialEditorPage` + `store_execution_assets`)의 열등한 부분집합인 중복 화면**이다.
저장 결과 자체는 통합 콘텐츠 피드를 통해 **실제로 소비되고 있으므로 폐기(E)가 아니라**, 화면을 canonical 제작 자료 흐름으로 **흡수(C)** 하는 것이 정답이다.
**독립 진입점을 부여하지 않는다.**

---

## 2. 현재 화면 계약 (코드로 확정)

`services/web-kpa-society/src/pages/pharmacy/StoreProductInfoCreatorPage.tsx`

| 항목 | 값 |
|------|-----|
| 입력 방식 | 모달: 제목(text) + 내용(plain textarea) 2필드만 |
| **상품 선택** | **없음** — productId/master/listing 바인딩 0. 상품과 무관한 free-form 노트 |
| 생성 | `createStoreExecutionAsset({ assetType:'content', category:'product-info', sourceType:'manual', htmlContent })` (63-69행) |
| 목록 | `getStoreExecutionAssets({ category:'product-info' })` (142행) — **본 화면만이 category='product-info'로 조회** |
| **편집(update)** | **없음** — update API 미호출. create + soft-delete만 |
| 저장 후 이동 | 없음(목록에 prepend) |
| 진입점(inbound) | **0** — 사이드바/버튼/모달 어디서도 이 route를 가리키지 않음(App.tsx 라우트 정의 외 참조 없음). 감사 IR의 UNREACHABLE 판정 재확인 |
| Guard | `PharmacyGuard` + (products 계열과 동일 라인의) OwnerOnly 계열 하위 |

App.tsx:1006 주석 `상품 정보 제작 (placeholder)` 는 **stale** — 실제로 완전한 CRUD(생성/목록/삭제) 화면이다(감사 IR와 동일 확인).

---

## 3. 데이터 흐름 (코드로 확정)

```
상품 선택 없음
 → 제목+내용 입력(모달)
 → createStoreExecutionAsset (POST /api/v1/kpa/store/assets)
 → store_execution_assets (category='product-info', assetType='content', sourceType='manual', usageType=null)
 → 조회: 본 화면 = category='product-info' 필터 / 그 외 소비처 = category 무관 필터
 → 편집: 본 화면 불가 (단, ProductionMaterialEditorPage /edit 로는 편집 가능 — §4)
```

**중요 구조 사실**: `store_execution_assets` 는 매장 자료함/제작자료 backing 테이블이다
(migration `20260421010000-RenameStoreLibraryToExecutionAssets`, `store_library_items → store_execution_assets`).
즉 product-info 는 **별도 테이블이 아니라 자료함의 한 category 태그**일 뿐이다.

---

## 4. 실제 소비처 (핵심 판단 기준)

> 사용자 지시: "생성 결과가 실제로 어디에서 사용되는지"를 최우선 기준으로.

### 4.1 소비됨 (CONFIRMED — 코드)

| 소비처 | 근거 | product-info 노출 여부 |
|--------|------|:----:|
| 통합 콘텐츠 피드 | `store-library-feed.controller.ts:207-224` — `store_execution_assets` UNION 조건 = org + is_active + `asset_type='content'` **만**. category/sourceType 필터 없음 | ✅ 노출 |
| `/store/library/contents` (StoreContentsSelector) | 위 피드 소비, "제작 자료" 배지로 렌더 | ✅ |
| → QR 생성 | StoreContentsSelector qrEligible(execution-asset) → StoreQrCreateModal | ✅ 활용 가능 |
| → POP 생성 | popEligible → StorePopCreateModal(origin='execution-asset', libraryItemIds) | ✅ 활용 가능 |
| → 편집 | `/store/library/production-materials/:id/edit` (ProductionMaterialEditorPage, assetType='content'면 로드) | ✅ 편집 가능 |
| QR 빌더 자료 선택 | StoreAssetSelectorModal — category 미전달, usageType 미전달 | ✅ 목록에 나타남 |

**결론**: 모달 문구 "저장된 내용은 POP·QR 등 제작 자료로 활용할 수 있습니다" 는 **실제로 wiring 되어 있다.**
단, product-info **전용** 소비처는 없다 — 하위 소비처가 전부 `category` 가 아닌 `asset_type='content'`/`usageType` 기준이라, product-info 행이 **일반 콘텐츠 파이프라인에 섞여** 소비된다.

### 4.2 소비 안 됨 (CONFIRMED — sourceType/usageType 필터로 배제)

| 소비처 | 배제 사유 |
|--------|-----------|
| 제작 자료 목록(StoreProductionMaterialsPage) | `sourceType==='generated'` 필터 → `manual` 제외 (360-385행) |
| SelectContentsForProductionModal | `sourceType==='generated'` 필터 → 제외 |
| 사이니지 빌더 | `usageType='signage'` 필터 → null 제외 |
| POP 목록 페이지 | `usageType='pop'` 필터 → null 제외 |
| 태블릿 진열 | image/video mime만 → content 제외 |

> 아이러니: product-info 는 **"제작 자료" 목록에는 안 보이지만(sourceType 불일치)**, **"콘텐츠" 목록에는 보인다(category 무필터)**. 동일 테이블·동일 assetType 인데 태그(sourceType) 차이로 노출 경로가 갈린다 = 태그 불일치로 인한 IA 혼선.

### 4.3 프로덕션 확인 필요 (NEEDS-PROD-DB)

- 상품별 마케팅(`product_marketing_assets`) 링크 그래프가 product-info 행을 실제로 참조하는 row 가 프로덕션에 존재하는지(코드상 product-info 를 링크 생성하는 경로는 없음).
- StoreLibraryResourcesPage(`/store/library/resources`)의 unified 매핑이 content-type 행을 실제로 표시하는지.
- 위 둘은 **판정을 바꾸지 않는다**(데이터가 이미 §4.1 로 소비됨이 확정). 완결성 차원의 잔여 항목.

---

## 5. 기존 기능 비교표 (코드로 확정)

| 항목 | ProductInfoCreator | 상품 상세설명 | 제작 자료(Editor) | 상품별 마케팅 | 상품별 POP |
|------|-----|-----|-----|-----|-----|
| route | /store/execution/product-info | /store/marketing/product-descriptions | /store/library/production-materials/new·:id/edit | /store/commerce/products/:id/marketing | /store/commerce/products/:id/pop |
| 사용자 목적 | 상품 관련 free-form 콘텐츠 | 상품 상세설명 저작 | 매장 실행 콘텐츠 저작 | 상품↔자산 연결 | 상품 POP 생성 |
| 대상 단위 | **없음(상품 무관)** | 로컬 상품 | 콘텐츠(상품 무관) | 상품(:id) | 상품(:id) |
| 데이터 원천/저장 | store_execution_assets (manual, product-info) | product_ai_contents / SPD | store_execution_assets (generated) | product_marketing_assets(링크) | product_ai_contents(+PDF) |
| 편집 방식 | plain textarea, **편집 불가** | RichText, 편집 | **RichText, 편집 가능** | 링크 연결/해제 | AI prefill→편집 |
| 결과 유형 | content asset | 상품설명(SPD) | content asset | 링크 | POP PDF |
| 실제 소비처 | 통합 콘텐츠 피드(간접) | 태블릿/QR/SPD 소비 | 통합 콘텐츠 피드 + 제작자료 목록 | 상품 화면 | 상품 화면 |
| 독립 유지 필요성 | **없음(제작자료가 상위집합)** | 있음(상품 바인딩·SPD) | 있음(canonical) | 있음(상품 링크) | 있음(상품 POP) |
| canonical 제작흐름 편입 | **의도적 제외** (ProductionTypeSelectorModal:24) | 포함(4카드) | 포함(허브) | — | — |

---

## 6. 중복·차이점

- **ProductInfoCreator ≈ ProductionMaterialEditor(from-scratch)의 열화판**:
  - 동일 테이블(store_execution_assets)·동일 assetType('content')·동일 htmlContent 저장.
  - 차이는 태그(sourceType `manual` vs `generated`, category `product-info` vs ProductionTarget)뿐.
  - ProductionMaterialEditor 는 **RichText + 편집 + canonical 제작흐름 편입 + 통합 목록 노출**을 모두 갖고, ProductInfoCreator 는 전부 결여(plain textarea + 편집 불가 + 흐름 제외 + 제작자료 목록 미노출).
- 상품 상세설명/상품별 마케팅/상품별 POP 는 전부 **상품 바인딩 기반의 구조적 별개 기능** — ProductInfoCreator(상품 무관)와 목적·저장·소비 모두 다르므로 이쪽으로의 흡수 대상 아님.
- **의도적 제외 신호**: `ProductionTypeSelectorModal.tsx:24` — canonical "매장 제작 자료 만들기" 4카드(POP/QR/블로그/상품 상세설명)에서 product-info-creator 를 명시 제외. 즉 플랫폼은 이미 product-info 를 canonical 흐름 밖 잔재로 취급 중.

---

## 7. 유지·통합·흡수·폐기 판정 → **C. 제작 자료에 흡수**

WO §8 기준 대입:

| 후보 | 성립 여부 | 근거 |
|------|:----:|------|
| A 독립 유지 | ✗ | "대체 불가" 불성립 — ProductionMaterialEditor from-scratch 가 동일 use case 상위집합 |
| B 상품 설명 통합 | ✗ | 상품 상세설명은 product_ai_contents/SPD·상품 바인딩. product-info(상품 무관)와 저장·목적 다름 |
| **C 제작 자료 통합/흡수** | **✓** | 설명서가 아닌 실행 콘텐츠 · ProductionMaterialEditor 가 동일 목적 지원 · product-info = 제작 자료의 한 형태(같은 테이블) |
| D 상품별 마케팅 흡수 | ✗ | 마케팅은 상품(:id) 링크 그래프. product-info 는 상품 미바인딩 |
| E 폐기 | ✗ | "소비처 0 / 저장결과 미사용" 불성립 — §4.1 로 실제 소비 확정. 데이터 폐기는 부적절 |

> **핵심**: 화면은 없애도 되지만(중복·UNREACHABLE·열화), **데이터는 살아 있다**. 따라서 "화면 폐기"가 아니라 "canonical 제작 자료 흐름으로 흡수(화면 은퇴 + 기존 행은 그대로 소비 유지)"가 정확한 조치다.

---

## 8. 권장 정리 방향 (진입점 부여 아님)

1. **독립 진입점 부여 금지** — product-info 에 사이드바/버튼을 달면 동일 테이블에 **두 번째 열등 저작 경로**가 생겨 canonical 제작 자료 흐름과 drift(이미 `WO-...-CANONICAL-ALIGN` 로 정렬된 축을 역행). 사용자 지시("곧바로 노출하지 않는다")와도 일치.
2. **canonical 흡수** — 저작이 필요하면 `제작 자료(새 제작 자료 만들기, from-scratch)`가 정본. 상품 관련이면 `상품 상세설명`/`상품별 마케팅`.
3. **화면 은퇴 + legacy redirect** — `/store/execution/product-info` → `/store/library/production-materials` 로 리다이렉트(북마크 보호). StoreProductInfoCreatorPage 컴포넌트 제거.
4. **데이터 무접촉** — 기존 `sourceType='manual'` product-info 행은 §4.1 통합 피드로 계속 소비되므로 **migration/데이터 이전 불필요**. (선택적 re-tag 는 별도 판단 대상, 본 흡수의 필수 아님.)
5. 잔여 NEEDS-PROD-DB(§4.3) 2건은 은퇴 조치와 독립 — 후속 WO 착수 전 read-only 카운트 확인만 하면 충분.

---

## 9. 후속 WO 제안 (1개 우선)

```
WO-O4O-KPA-STORE-PRODUCT-INFO-INTO-PRODUCTION-MATERIALS-V1
```

**범위(제안)**: 독립 저작 화면(StoreProductInfoCreatorPage) 은퇴 + `/store/execution/product-info` → `/store/library/production-materials` legacy redirect. 기존 product-info 행 무접촉(통합 피드로 계속 소비). ProductionTypeSelectorModal:24 의 "범위 외" 주석 정리. 신규 테이블·migration·데이터 이전 0. KPA-only(공통 store-ui-core 무변경 — sidebar 미참조라 영향 없음).
**착수 전 확인(read-only)**: category='product-info' 행 수, 그중 product_marketing_assets 링크 참조 유무(§4.3) 카운트.

> 대안(추후): re-tag(manual→generated) 로 제작 자료 목록에도 노출시키는 흡수는 별도 소형 WO 로 분리 가능(본 WO 필수 아님).

---

## 10. 경계 준수 / 산출물

- 코드 0 / DB write 0 / migration 0 / route·메뉴 0 / 배포 0 — read-only 준수.
- 다른 세션 WIP(OTC, operator SupplierContentApprovalPage) 미접촉.
- 산출물: 본 문서. path-specific commit `docs(kpa): audit store product info creator role` + push.

---

## 11. 정정·재조정 (ADDENDUM, 2026-07-27) — §7 판정 C 보류

> 승인된 방향: **중단·판정 재조정**. 본 addendum 은 코드 변경 없이 판정만 재조정한다.

### 11.1 정정 사유 — canonical baseline 미참조

본 IR §7 은 **canonical 메뉴트리 SSOT 를 참조하지 않고** "ProductionMaterialEditor 상위집합" 이라는 코드 관찰만으로 흡수(C) 를 판정했다. 이는 거버넌스 계층 누락이다.

`docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md` §2.1 표준 6항목 표 **1행**:

| # | 항목명 | 매장 제작 | 저장 대상 후보 | 기존 구현 | 후속 구현 |
|---|--------|----------|----------------|----------|----------|
| 1 | **상품 상세정보** | **StoreProductInfoCreatorPage (KPA)** | `store_execution_assets` / `kpa_store_contents` | 부분(KPA 단독) | **필요** |

- 후속 WO §9.1 W4 = `WO-O4O-OPERATOR-PRODUCT-DETAIL-PUBLISHING-V1` — **상품 상세정보 매장 측 확장**.
- 즉 baseline 은 이 페이지를 표준항목 #1 의 **매장 제작 구현 슬롯으로 예약**하고, **은퇴가 아니라 확장 대상**으로 명시한다.
- CLAUDE.md 우선순위 체인 순위 5(Store Menu Canonical Tree)는 SSOT 로 영역 판정에 우선 → 코드상 중복이어도 **단독 은퇴는 baseline 위반**.

### 11.2 동시 세션 IR 과의 관계

동시 세션이 본 IR(commit 545158231) **이후** `IR-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-ROLE-AND-REACHABILITY-AUDIT-V1`(commit 88cf303df)을 커밋, 동일 근거(canonical 슬롯 예약)로 **판정 D(후속 설계)** — "read-only IR 로 단독 폐기(C) 확정 불가, baseline 갱신 동반 별도 설계 WO 필요."

### 11.3 재조정된 판정 — **보류 → D 우선**

- §7 의 **C(흡수·은퇴) 판정을 보류**한다. 코드 레벨 관찰(ProductInfoCreator ⊂ ProductionMaterialEditor, 데이터는 통합 피드로 소비)은 **사실로 유지**되나, 이는 **은퇴를 정당화하지 않는다.**
- 재조정 결론 = **D(후속 설계)**: StoreProductInfoCreatorPage 는 canonical 슬롯 #1 예약분이며 W4 확장 예정. **삭제·redirect 금지.**

### 11.4 재조정으로 드러난 핵심 미결 쟁점 (설계 WO 대상)

본 IR §4~§5 는 정규 "상품 상세설명" 담당을 **StoreProductDescriptionsPage(product_ai_contents)** 로 서술했으나, **canonical 트리 §2.1 #1 은 "상품 상세정보" 매장 제작 슬롯을 StoreProductInfoCreatorPage(store_execution_assets) 로 배정**한다. 두 페이지의 슬롯 소유권이 baseline 과 코드 관찰 사이에서 엇갈린다. → 이것이 설계 WO 가 먼저 해소할 쟁점이다:

```text
canonical 슬롯 #1 "상품 상세정보" 매장 제작을
(a) StoreProductInfoCreatorPage 로 유지·확장(W4) 할지
(b) StoreProductDescriptionsPage 로 재지정하고 product-info 를 은퇴(C 축소)할지
→ baseline 갱신을 동반해 확정.
```

### 11.5 redirect 단독도 지금은 보류

파일을 보존한 채 route 만 redirect 해도, `/store/execution/product-info` 가 담당하도록 **예약된 "상품 상세정보 매장 제작" 슬롯을 사실상 제작 자료 목록으로 전환**하는 것이다. 사용자 동선과 역할 계약이 바뀌므로 **baseline 충돌은 그대로 남는다.** → 삭제뿐 아니라 **redirect 단독도 보류**한다.

### 11.6 후속 설계 판정 — 이미 완료됨 (동시 세션)

권장했던 "canonical 슬롯 #1 역할 재판정 설계"는 동시 세션이 **이미 산출**했다:
`docs/design/DESIGN-O4O-KPA-STORE-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-V1.md` (commit 777263362, WO-O4O-KPA-STORE-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-DESIGN-V1).

설계 최종 판정:

- canonical **"상품 상세정보" = handled-products 중심 통합**(STORE 설명서 조회·다국어·QR). ProductInfoCreator 가 아니다.
- **StoreProductDescriptions(product_ai_contents) = 역할 한정 유지** — "상품별 매장 자체 보완 설명" (상품 결속 + 소비처 보유).
- **StoreProductInfoCreator = 은퇴(A/B)** — 상품 비결속(§6.1 위반) + 생산 소비처 0(§6.3 위반). 대체 기능(product_ai_contents)이 상위 호환.
- baseline `O4O-STORE-MENU-CANONICAL-TREE-V1 §2.1 #1` = **정정 필요**(handled-products + product_ai_contents 로, ProductInfoCreator 는 은퇴 표기) → 별도 승인 WO.

### 11.7 본 IR §7 판정 C 의 최종 위치

- 결과(ProductInfoCreator 은퇴)는 설계에서 **재확인**됐다 — 본 IR §7 의 관찰(열등 중복)은 유효했다.
- 다만 **경로가 달라졌다**: 원래 제안한 "삭제+redirect(→production-materials)" 가 아니라, 설계의 은퇴 시퀀스(후속-1 baseline 정정 → 후속-2 프로덕션 row read-only 확인 게이팅 → 후속-3/4 route 제거)를 따른다.
- 따라서 **`WO-O4O-KPA-STORE-PRODUCT-INFO-INTO-PRODUCTION-MATERIALS-V1` 는 폐기**(설계의 은퇴 시퀀스로 대체). redirect→production-materials 도 채택 안 됨(은퇴 대상은 handled-products 동선으로 흡수, 자유노트 역할은 product_ai_contents 가 담당).
- 코드·DB·route·메뉴 변경 0 유지 — 실제 은퇴 구현은 설계 §11 후속 WO 범위.
