# IR-O4O-KPA-STORE-PRODUCT-INFO-RETIREMENT-DATA-GATE-V1

> **성격:** baseline 정정 + 운영 데이터 read-only 게이트. 코드 변경 0 · DB write 0 · 배포 0.
> **작성일:** 2026-07-27
> **대상 WO:** WO-O4O-KPA-STORE-PRODUCT-INFO-CANONICAL-BASELINE-AND-RETIREMENT-GATE-V1
> **선행:** [`DESIGN-...-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-V1`](../design/DESIGN-O4O-KPA-STORE-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-V1.md) · [`IR-...-PRODUCT-INFO-CREATOR-ROLE-AND-REACHABILITY-AUDIT-V1`](IR-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-ROLE-AND-REACHABILITY-AUDIT-V1.md) (판정 D) · [`O4O-STORE-MENU-CANONICAL-TREE-V1`](../baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md)
> **최종 readiness:** **`READY_FOR_IMMEDIATE_RETIREMENT` (은퇴 방식 B)** — 프로덕션 `store_execution_assets(category='product-info')` **0 건**.

---

## 1. Baseline 정정 내용

`O4O-STORE-MENU-CANONICAL-TREE-V1` §2.1 #1 · §3 · 신규 §2.3 정정 노트 반영:

| 구분 | 정정 전 | 정정 후 |
|------|---------|---------|
| 매장 제작 화면 | StoreProductInfoCreatorPage | **StoreHandledProductsPage** (상품 선택 후 조회·활용) + 매장 보완 = StoreProductDescriptionsPage |
| 저장 대상 | `store_execution_assets` / `kpa_store_contents` | **읽기 = `shared_product_descriptions`(STORE)** / 매장 보완 = `product_ai_contents` |
| 내 매장 메뉴 (§3) | 내 상품 상세 | **매장 경영활용 제품 (handled-products)** |
| ProductInfoCreator | (canonical 구현) | **deprecated · 은퇴 대상** |

별도 "상품 상세정보" 사이드바 메뉴 신설 안 함. `store_execution_assets` 테이블은 다른 category 공용 → 삭제 대상 아님. Frozen/Baseline 규칙에 따라 변경 사유·선행 설계 문서를 §2.3 노트에 명시.

## 2. 상품 상세정보 정식 업무동선

```text
사이드바 "매장 경영활용 제품" (handled-products)
  → O4O 표준 상품 추가 / 목록에서 1건 선택
  → 매장용 STORE 상세설명서 보기   [shared_product_descriptions, 읽기 전용]
  → 다국어 콘텐츠                   [다국어 STORE 설명서 + multilingual]
  → 상품 QR 출력                    [master 기준 고정 QR]
  → (필요 시) 상품별 매장 자체 설명 작성  [StoreProductDescriptions, product_ai_contents]
```

## 3. 운영 데이터 집계 (프로덕션 read-only)

**채널:** cloud-sql-proxy `localhost:5470` → `netureyoutube:asia-northeast3:o4o-platform-db` · user `o4o_api` · db `o4o_platform`. SELECT only.

**`store_execution_assets WHERE category='product-info'`:**

| total | active | orgs | empty_body | first_created | last_updated |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **0** | 0 | 0 | 0 | null | null |

**Connection sanity (테이블 실데이터 확인 — 0건이 오접속 아님을 입증):** `store_execution_assets` 전체 25 rows / category 분포 = `pop` 13, `(null)` 9, `qr` 3. **`product-info` category 자체가 존재하지 않음.**

## 4. active·organization 분포

해당 category row 0 → active 0 · organization 0. 분포 없음.

## 5. 기존 자료 성격 (유효/초안/테스트)

row 0 → 유효 자료 / 빈 초안 / 테스트 데이터 **전부 해당 없음**. 프로덕션에서 이 화면으로 저장된 데이터가 애초에 존재하지 않음(UNREACHABLE + 진입점 0 정황과 일치).

## 6. 은퇴 방식 A/B

- **B — 즉시 은퇴.** 조건 `total_count = 0` 충족.
- A(자료 정리 후 은퇴) 불요 — 보존·재분류할 데이터 없음.
- migration 불요 (스키마 변경 0, 삭제할 row 0).

## 7. 코드 제거 영향 목록 (전수)

| 항목 | 위치 | 후속 조치 |
|------|------|----------|
| StoreProductInfoCreatorPage 컴포넌트 | `services/web-kpa-society/src/pages/pharmacy/StoreProductInfoCreatorPage.tsx` (전체) | **제거** |
| lazy import | `App.tsx:258` | **제거** |
| route | `App.tsx:1007` (`execution/product-info`) | **제거** |
| stale placeholder 주석 | `App.tsx:1006` (`...MENU-V1: 상품 정보 제작 (placeholder)`) | **제거** |
| `category='product-info'` 상수 | StoreProductInfoCreatorPage 내부 (line 66, 142) 유일 | 파일 제거로 자동 소멸 (다른 소비처 0 — grep 전수 확인) |
| 제외 서술 주석 | `ProductionTypeSelectorModal.tsx:24` | **정정** (은퇴 반영) — 선택적 |
| `getStoreExecutionAssets` API | `services/web-kpa-society/src/api/storeExecutionAssets.ts` | **유지** (pop/qr/null 공용) |
| `store_execution_assets` 테이블 | DB | **유지** (25 rows 공용) |
| 자료함 무필터 노출 | StoreLibraryResourcesPage | **변경 불요** — product-info row 0이라 잔존 노출 없음 |
| 홈 라이브러리 카운트 | StoreHomePage | **변경 불요** — product-info 특정 코드 없음 |

## 8. 데이터 재분류 필요 여부

**불요.** 대상 row 0. UPDATE/DELETE/export/archive 전부 불필요.

## 9. 최종 readiness

```text
READY_FOR_IMMEDIATE_RETIREMENT (B)
```

## 10. 후속 구현 범위 (별도 WO)

```text
[구현 WO] /store/execution/product-info 은퇴
  - App.tsx:258 lazy import 제거
  - App.tsx:1006 stale 주석 제거
  - App.tsx:1007 route 제거
  - StoreProductInfoCreatorPage.tsx 파일 제거
  - ProductionTypeSelectorModal.tsx:24 주석 정정
  - (선택) /store/execution/product-info → handled-products redirect 1홉 (외부 북마크 대비)
  - 회귀 smoke: handled-products 동선(STORE 설명서 보기/QR/콘텐츠 만들기) 정상
  - 데이터 migration 없음 · store_execution_assets 테이블/API 유지
  - App.tsx 동시세션 리스크 → path-specific stage
```

## 11. 변경 없음 선언

```
코드 변경 0 · DB write 0 · 배포 0
route/component/API/테이블 삭제 0 · migration 0 · 신규 메뉴/화면 0
baseline 문서 정정 + IR 게이트 문서만 path-specific stage → main push
```

프로덕션 조회는 SELECT 집계만(개인정보/본문 미출력). 다른 세션 파일(otc-*/pnpm-lock) 미변경. App.tsx 등 코드 파일은 조회만.

---

*판정: baseline 정정 완료 · product-info 운영 row 0 · 은퇴 방식 B · READY_FOR_IMMEDIATE_RETIREMENT · 코드/DB write/배포 0*
