# DESIGN-O4O-KPA-STORE-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-V1

> **성격:** 설계·계약 확정. 코드/DB/배포 변경 0 (설계 문서만). 구현은 후속 WO.
> **작성일:** 2026-07-27
> **대상 WO:** WO-O4O-KPA-STORE-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-DESIGN-V1
> **선행:** IR-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-ROLE-AND-REACHABILITY-AUDIT-V1 (판정 D) · O4O-STORE-MENU-CANONICAL-TREE-V1 §2.1 #1 · IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1 (G1)
> **최종 판정:** canonical "상품 상세정보" = **handled-products 중심 통합**(WO §1 옵션 1) · StoreProductDescriptions = **매장 자체 상품 설명 콘텐츠 저작으로 역할 한정 유지** · StoreProductInfoCreator = **은퇴(WO §9 옵션 A/B)**. 신규 테이블 0 · migration 사실상 0.

---

## 1. canonical "상품 상세정보" 한 문장 정의

> **매장 경영자가 매장 경영활용 제품(O4O 취급상품)을 선택하여, O4O 표준 STORE 상세설명서·다국어 콘텐츠·상품 QR 을 조회·활용하고, 필요 시 매장 자체 보완 설명을 별도로 작성·관리하는 업무.**

핵심: **상품 결속 필수**(§6.1). "상품 상세정보"는 특정 상품(ProductMaster / OrganizationProductListing / 매장 경영활용 제품)에 결속된 정보의 조회·활용이며, 상품에 결속되지 않은 자유 HTML 노트는 canonical "상품 상세정보"로 인정하지 않는다.

canonical 슬롯에 다음을 **함께 넣지 않는다**: 자유 HTML 노트 작성 / 마케팅 콘텐츠 제작 / POP·태블릿 제작. 이들은 별도 슬롯(콘텐츠·자료 축).

---

## 2. 세 화면 실제 역할 비교 (코드 근거)

| 기준 | A. ProductInfoCreator | B. ProductDescriptions | C. HandledProducts |
|------|------|------|------|
| route | `/store/execution/product-info` **[UNREACHABLE]** | `/store/marketing/product-descriptions` **[REACHABLE·자료함 제작 플로우]** | `/store/handled-products` **[REACHABLE·사이드바 "매장 경영활용 제품"]** |
| 시작점 | 직접 URL (진입점 0) | 자료함 → 제작 시작 → 상품 상세설명 (`ProductionRouterState`) | 사이드바 → 제품 목록 → 1건 선택 |
| 상품 결속 | **없음** (자유 제목 텍스트) | LocalProduct(`fetchLocalProducts`)·productId | listing/local UNION(OPL+store_local_products)·sourceType/sourceId |
| 저장 대상 | `store_execution_assets`(category='product-info') | `product_ai_contents`(contentType='product_description') | **저장 안 함**(O4O 원본 읽기 전용 조회) |
| 편집 가능 정보 | 자유 제목+HTML | 상품별 설명 본문(RichTextEditor·template) | 없음(뷰)·단 제품 추가/제거·요청 |
| O4O 원본 관계 | 무관 | 무관(매장 자체 생성물) | **STORE 설명서=`shared_product_descriptions`(description_type='STORE') 원본 읽기 전용** |
| 다국어 | ❌ | ❌ | ✅ (다국어 STORE 설명서 조회 + `store_multilingual_product_content_*`) |
| QR 연결 | ❌ (안내문만) | ❌ | ✅ (`StoreProductQrModal`·master 기준 고정 QR·항상 사용 가능) |
| 자료함 노출 | ⚠️ 우연(무필터 자료함 목록) | 제작 결과물로 노출 | — |
| POP 연결 | ❌ | ✅ (`ProductPopBuilderPage` 가 `getProductAiContents` 소비) | 제품 선택→콘텐츠 만들기 진입 |
| 태블릿 연결 | ❌ | ✅ (`tabletDisplays.ts` 가 product_ai_contents 소비) | — |
| 실제 소비처 | **생산 소비 0** (자료함 우연 노출뿐) | POP·태블릿·제작자료 | 취급상품 화면 (조회·QR) |
| 사용자 업무 목적 | 없음(고립) | 상품별 매장 자체 설명 작성 | O4O 상품 조회·활용 허브 |

---

## 3. 상품 결속·저장·소비 계약

세 저장 구조가 명확히 분리되어 있으며 서로 다른 계약을 갖는다:

| 저장 구조 | 소유·성격 | 편집 | 소비처 | canonical 역할 |
|-----------|----------|------|--------|---------------|
| `shared_product_descriptions` (SPD) | **O4O 표준 원본** (공급자→운영자 canonical, per (master,type,language)) | 매장 **편집 금지**(읽기 전용 조회) | handled-products STORE 설명서 보기 + 다국어 + QR 랜딩 | "상품 상세정보"의 **조회 대상 SSOT** |
| `product_ai_contents` (contentType='product_description') | **매장 자체** per-product 보완 설명 | 매장 편집 O (RichTextEditor) | ProductPopBuilderPage·tabletDisplays·StoreProductionMaterialsPage | "매장 자체 보완 설명" (§6.2 매장 추가 콘텐츠) |
| `store_execution_assets` (category='product-info') | 매장 자유 노트 (**상품 비결속**) | 매장 편집 O | **생산 소비 0** (자료함 우연 노출뿐) | **canonical 부적합** (§6.1 위반) |

**§6.2 소유권 경계 이미 코드에 반영됨:** handled-products 는 O4O STORE 설명서를 "복사하지 않고 읽기 전용 조회"(`StoreHandledProductsPage.tsx:7`), product_ai_contents 는 매장 소유 별도 콘텐츠. 원본/매장보완이 테이블 수준에서 분리되어 있다.

---

## 4. 사용자 업무 목적 (정식 업무동선)

WO §7 권장안 = 코드 현실과 일치. canonical "상품 상세정보"의 정식 동선:

```text
사이드바 "매장 경영활용 제품" (handled-products)
  → O4O 표준 상품 추가 (AddO4oStandardProductModal) / 목록에서 1건 선택
  → 매장용(STORE) 상세설명서 보기   [shared_product_descriptions, 읽기 전용]
  → 다국어 콘텐츠                   [다국어 STORE 설명서 + multilingual content]
  → 상품 QR 출력                    [store_qr_codes, master 기준 고정 QR]
  → (필요 시) 상품별 매장 자체 설명 작성  [콘텐츠 만들기 → StoreProductDescriptions, product_ai_contents]
```

`StoreHandledProductsPage.tsx:261` 이 이미 이 동선을 명문화: *"실제 작업(매장용 상세설명 보기 / 콘텐츠 만들기 / 다국어 QR)은 제품을 선택한 뒤 수행합니다."*

---

## 5. 정식 진입 화면 / 상품 식별 기준

- **정식 시작 화면:** `StoreHandledProductsPage` (`/store/handled-products`, 사이드바 "매장 경영활용 제품").
- **상품 식별 기준:** `sourceType`(listing|local) + `sourceId` → O4O 취급상품(OPL) 또는 매장 자체 상품(store_local_products). ProductMaster 는 STORE 설명서·QR 조회의 근거 master.
- **조회 정보:** O4O STORE 상세설명서(SPD, 다국어), 상품 QR(master 기준).
- **편집 가능 정보:** O4O 원본은 **편집 불가**(읽기 전용). 매장 보완은 product_ai_contents 를 통해서만(콘텐츠 만들기 경유).

---

## 6. StoreProductDescriptionsPage 처리 → **역할 한정 유지**

- **유지.** 은퇴/통합 대상 아님. 이유: 상품 결속(product_ai_contents·productId)되고 **실제 소비처가 있다**(POP 빌더·태블릿·제작자료). §6.1·§6.3 충족.
- **역할 한정:** "상품별 **매장 자체** 설명 콘텐츠 작성·관리 전용" (O4O STORE 원본 조회와는 다른 축 — 매장 보완 콘텐츠). canonical "상품 상세정보" 슬롯 **자체는 아님**(그 슬롯은 handled-products 의 조회·활용). ProductDescriptions 는 그 동선의 "상품별 매장 자체 설명 작성" 하위 단계.
- 진입은 현행대로 자료함 제작 플로우(ProductionRouterState) 유지. 신규 독립 "상품 상세정보" 사이드바 메뉴로 승격하지 않는다.

---

## 7. StoreProductInfoCreatorPage 처리 → **은퇴 (A/B)**

WO §9 판정: **A(통합 후 은퇴) ~ B(즉시 은퇴) 사이. 실질 B 에 가까움.**

근거:
- 상품 비결속 자유 HTML → **§6.1(상품 결속 필수) 위반** → canonical "상품 상세정보" 로 인정 불가.
- 생산 소비처 0 (§2·§3) → **§6.3(실제 활용처 필수) 위반** → 독립 canonical 기능 불인정.
- 역할("매장 자체 보완 설명")은 이미 product_ai_contents(StoreProductDescriptions)가 **상품 결속 + 소비처 보유** 상태로 담당 → 대체 기능 존재.
- 유일 잔존 노출(자료함 우연 노출)은 부수 효과이지 설계된 역할이 아님.

→ **처리안:** route·기능 **은퇴**. 남길 "통합" 요소 없음(product_ai_contents 가 상위 호환). 단, **기존 저장 데이터 실사용 여부는 코드만으로 판단 불가(미확인)** → 은퇴 구현 WO 가 (a) 프로덕션 `store_execution_assets WHERE category='product-info' AND is_active` row 존재 여부 read-only 확인, (b) 존재 시 자료함 노출 처리(그대로 자료로 두거나 category 재분류) 결정 후 route 제거. **본 설계 WO 에서는 route 삭제·데이터 처리 금지**(WO §12).

---

## 8. 메뉴·route 후속안

### 8.1 메뉴 트리 (사용자 관점 재작성)

```text
상품·거래
├─ 매장 경영활용 제품 (handled-products)        ← canonical "상품 상세정보" = 이 화면의 조회·활용
│   ├─ [액션] 매장용 상세설명서 보기 (STORE·다국어)
│   ├─ [액션] 상품 QR 출력
│   └─ [액션] 콘텐츠 만들기 → 상품별 매장 자체 설명(ProductDescriptions)
│
콘텐츠·자료
├─ 상품별 콘텐츠 제작 (자료함 → 제작 시작 → 상품 상세설명 = ProductDescriptions)
├─ 자료함
├─ POP
└─ 태블릿
```

### 8.2 "상품 상세정보" 사이드바 노출 판단 → **handled-products 내부 액션**

WO §8 4택 중 **"handled-products 내부 액션"** 선택. 별도 독립 사이드바 메뉴 신설 안 함(제품 선택이 선행되어야 의미 있는 조회이므로 독립 메뉴는 부적합). 현행 handled-products 액션 구조가 이미 canonical 을 충족 → **메뉴 신규 추가 0**.

### 8.3 route 변경안 (후속 구현 WO 범위)

| route | 후속 조치 | 시점 |
|-------|----------|------|
| `/store/handled-products` | 변경 없음 (canonical 진입 화면) | — |
| `/store/marketing/product-descriptions` | 변경 없음 (역할 한정 유지) | — |
| `/store/execution/product-info` | **deprecated 표시 → (데이터 확인 후) route·컴포넌트 제거** | 후속 은퇴 WO |
| `App.tsx:1006` "placeholder" stale 주석 | 정정 또는 deprecated 주석으로 교체 | 후속 은퇴 WO (App.tsx 동시세션 리스크로 본 WO 에서 미실행) |

---

## 9. 데이터·migration 필요 여부 → **신규 테이블 0 · migration 사실상 0**

WO §10 우선순위 적용:
1. **기존 상품별 매장 콘텐츠 구조 재사용:** ✅ `product_ai_contents` 가 이미 상품 결속 + 소비처 보유. canonical 동선은 이를 그대로 사용.
2. 기존 다국어 구조 확장: 불필요(현행 다국어 조회로 충족).
3. 기존 자료함 콘텐츠와 상품 연결: 불필요.
4. **신규 테이블: 불필요.**

- **migration:** canonical 역할 확정만으로는 스키마 변경 없음. product-info 은퇴 시에도 `store_execution_assets` 는 다른 category 가 공용하므로 **테이블 삭제 금지**. 잔존 row 는 soft 처리(존재 시) — migration 이 아니라 데이터 정리 판단(후속 WO).
- **금지 항목 확인(WO §10):** O4O 표준 설명서 복사 안 함(읽기 전용 유지) · 동일 설명 다중 테이블 중복 저장 안 함 · 상품 비결속 콘텐츠를 상품 상세정보로 취급 안 함(product-info 은퇴로 해소) · QR/태블릿/POP 별 별도 원본 생성 안 함(product_ai_contents 단일 원본 재사용).

---

## 10. canonical baseline 정정 필요 (문서)

`O4O-STORE-MENU-CANONICAL-TREE-V1 §2.1 #1` 은 현재 "상품 상세정보 → 매장 제작 = StoreProductInfoCreatorPage / 저장 = store_execution_assets" 로 기재. 본 설계 결론과 불일치 → **baseline 정정 필요**:

- "상품 상세정보" 매장 측 구현 = **handled-products (STORE 설명서 조회·QR·다국어) + product_ai_contents(매장 보완)**.
- StoreProductInfoCreatorPage / `store_execution_assets(product-info)` 는 **은퇴 대상**으로 표기.

이 정정은 WO §12 허용 범위("canonical 문서 상태 정정")이나, baseline 변경은 별도 WO 필요(CLAUDE.md Frozen/Baseline 규칙)이므로 **본 WO 에서는 정정안만 제시**하고 실제 baseline 파일 수정은 후속 승인 WO 로 분리한다.

---

## 11. 권장 구현 순서 (후속 WO)

```text
[후속-1] canonical baseline 정정 (O4O-STORE-MENU-CANONICAL-TREE-V1 §2.1 #1) — 승인 필요
[후속-2] product-info 은퇴 준비: 프로덕션 store_execution_assets WHERE category='product-info'
         row 존재 여부 read-only 확인 (0건이면 즉시 은퇴 가능)
[후속-3] App.tsx:1006 stale "placeholder" 주석 정정 + route deprecated 표시
[후속-4] (데이터 확인 후) /store/execution/product-info route + StoreProductInfoCreatorPage 제거,
         자료함 우연 노출 정리
[후속-5] 회귀: handled-products 동선 smoke (STORE 설명서 보기/QR/콘텐츠 만들기)
```

핵심: **후속-2 의 데이터 확인 결과가 은퇴 방식(A vs B)을 최종 확정**한다. 0건 → B(즉시 은퇴). 실사용 row 존재 → A(자료함 자료로 category 재분류 후 route 은퇴).

---

## 12. 변경 없음 선언

```
코드 변경 0 · DB write/조회 0 · 배포 0
신규 화면/route/API/메뉴/버튼 0 · route·테이블 삭제 0 · migration 0
설계 문서만 path-specific stage → main push
```

다른 세션 변경 파일(otc-* / pnpm-lock 등)은 미변경. App.tsx 등 대상 코드 파일은 **조회만** 하고 미수정(동시세션 리스크 + WO §12 금지).

---

## 13. 중지 조건 점검 (WO §13)

| 중지 조건 | 해당? |
|-----------|:---:|
| canonical baseline vs 운영 정책 충돌 | △ baseline §2.1 #1 이 결론과 불일치 → **정정안 제시**로 처리(문서만) |
| 저장 데이터 실사용 여부 코드만으로 판단 불가 | ✅ product-info row 실존 미확인 → **은퇴 구현을 후속-2 데이터 확인에 게이팅** |
| 다른 세션이 대상 파일 수정 중 | otc-*/pnpm-lock 만 dirty(무관). App.tsx clean |
| 통합 시 backend·migration 필수 | ❌ (신규 테이블/migration 0) |
| 공통 패키지 변경 필요 | ❌ (storeMenuConfig 등 변경 없음 — 신규 메뉴 0) |

→ **설계 문서만 제출** (구현 0). 데이터 실사용 미확인 항목은 후속 WO 게이트로 명시.

---

*판정: canonical "상품 상세정보" = handled-products 중심 · ProductDescriptions 역할 한정 유지 · ProductInfoCreator 은퇴(A/B, 데이터 확인 게이팅) · 신규 테이블 0 · 구현 0*
