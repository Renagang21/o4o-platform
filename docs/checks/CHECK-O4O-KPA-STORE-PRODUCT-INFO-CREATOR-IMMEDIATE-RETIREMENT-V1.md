# CHECK-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-IMMEDIATE-RETIREMENT-V1

> **성격:** 구형·고립 화면 은퇴 구현. 코드 제거 + 회귀. DB write 0 · migration 0.
> **작성일:** 2026-07-27
> **대상 WO:** WO-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-IMMEDIATE-RETIREMENT-V1
> **선행:** [`DESIGN-...-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-V1`](../design/DESIGN-O4O-KPA-STORE-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE-V1.md) · [`IR-...-PRODUCT-INFO-RETIREMENT-DATA-GATE-V1`](../investigations/IR-O4O-KPA-STORE-PRODUCT-INFO-RETIREMENT-DATA-GATE-V1.md) · [`O4O-STORE-MENU-CANONICAL-TREE-V1 §2.3`](../baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md)
> **결과:** **GREEN** — 컴포넌트/import 제거 + 구 URL redirect 유지. typecheck/build EXIT 0. canonical 동선·공용 자산 무영향.

---

## 1. 은퇴 근거

- 프로덕션 `store_execution_assets WHERE category='product-info'` = **0 건** (IR 게이트 확정).
- 화면은 UNREACHABLE(인바운드 0) + 상품 비결속 자유 HTML + 생산 소비처 0 → canonical 부적합.
- canonical "상품 상세정보" = handled-products 중심으로 baseline 정정 완료.
- 은퇴 방식 **B (즉시 은퇴)** · 데이터 재분류 0 · migration 0.

## 2. 제거 파일·import·route

| 항목 | 위치 | 조치 |
|------|------|------|
| 컴포넌트 파일 | `services/web-kpa-society/src/pages/pharmacy/StoreProductInfoCreatorPage.tsx` | `git rm` (전체 삭제) |
| lazy import | `App.tsx:258` | 삭제 |
| stale placeholder 주석 | `App.tsx` (구 1006) | 은퇴 주석으로 교체 |
| route element | `App.tsx` (구 1007) | `<StoreProductInfoCreatorPage />` → `<Navigate to="/store/handled-products" replace />` |
| `category='product-info'` 전용 상수·state·CRUD·스타일 | 삭제 파일 내부에만 존재 | 파일 제거로 자동 소멸 |

## 3. Retired URL 정책

- **선택: redirect 유지** (`execution/product-info` → `/store/handled-products`, `replace`).
- 사유: 신규 컴포넌트 0(App.tsx 1줄, `Navigate` 기존 import 재사용). 구 직접 URL/북마크에 대해 blank/not-found 대신 canonical 진입 화면으로 안전 이동. redirect loop 없음(대상은 별도 route).
- 완전 제거 대신 redirect 선택 — 비용 0에 가깝고 사용자 혼란 0.

## 4. 유지한 공용 API·테이블

- `store_execution_assets` 테이블 (프로덕션 25 rows: `pop` 13 / `null` 9 / `qr` 3) — **유지**.
- `getStoreExecutionAssets` API — **유지** (pop/qr/null 공용).
- StoreLibraryResourcesPage / StoreHomePage 카운트 — **변경 없음** (product-info row 0 → 잔존 노출 없음).
- StoreProductDescriptionsPage / `product_ai_contents` / `shared_product_descriptions` / 다국어 / QR / handled-products — **전부 유지**.

## 5. 전수 잔여 검색

`git grep` (코드) 결과:
- `StoreProductInfoCreatorPage` 참조 = **0**.
- `execution/product-info` = 1 (의도된 redirect route, App.tsx).
- `product-info` 코드 매치 = redirect + ProductionTypeSelectorModal 주석뿐.
- `apps/admin-dashboard/.../ContentTemplates.tsx` `type: 'product-info'` = **다른 도메인**(admin 에디터 블록 타입, `store_execution_assets category` 아님) → 대상 아님, 유지.
- 역사 IR/DESIGN/CHECK/baseline 문서의 `product-info` = 문서, 삭제 안 함.

→ **실행 코드의 구형 기능 전용 참조 = 0** (redirect·주석 제외).

## 6. ProductionTypeSelectorModal 주석 정정

`ProductionTypeSelectorModal.tsx:23-24` 주석을 "상품 상세정보 canonical = handled-products 중심 통합, 구형 ProductInfoCreator 은퇴 → 본 모달 범위 외"로 정정. selector 옵션·동작 무변경 (4종 화이트리스트 POP/QR/블로그/상품 상세설명 그대로).

## 7. 회귀 검증

| 검증 | 결과 |
|------|------|
| tsc --noEmit (@o4o/web-kpa-society) | ✅ EXIT 0 |
| build (@o4o/web-kpa-society) | ✅ EXIT 0 (20.81s) — StoreProductInfoCreatorPage chunk 소멸 |
| lazy import 오류 | ✅ 0 |
| route 참조 오류 | ✅ 0 (Navigate 기존 import) |
| StoreHandledProductsPage chunk 정상 빌드 | ✅ (62.30 kB) |
| 자료함/자산 관련 chunk 정상 | ✅ (StoreQRPage / StoreContentsSelector 등 정상) |

canonical 동선(handled-products → STORE 설명서 보기/다국어/QR/콘텐츠 만들기)은 코드·라우트 연결 무변경으로 회귀 없음. 프로덕션 데이터 write 0.

## 8. 배포·smoke

- 배포 revision: (아래 배포 로그)
- smoke: `/store/execution/product-info` → `/store/handled-products` redirect 확인 (게이팅/브라우저).

## 9. 변경 없음 선언

```
DB write 0 · migration 0 · 운영 데이터 DELETE/UPDATE 0
신규 화면/메뉴/API 0 · store_execution_assets 테이블·API 유지 · 공통 UI 변경 0 · dependency 0
```

## 10. staged 범위 검증

path-specific stage + `git commit -- <paths>` 로 커밋 범위 제한 (App.tsx / ProductionTypeSelectorModal.tsx / StoreProductInfoCreatorPage.tsx(삭제) / 본 CHECK). 다른 세션 staged 파일(otc-*/hff-*) 혼입 0 — `git diff --cached --name-only` 로 사전 확인.

---

*결과: GREEN · 구형 product-info 화면 은퇴 · redirect 유지 · typecheck/build EXIT 0 · 공용 자산·canonical 동선 무영향 · DB write/migration 0*
