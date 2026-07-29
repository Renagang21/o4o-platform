# CHECK — O4O Neture 공급자 CSV 품질 콘솔 은퇴 V1

**WO:** WO-O4O-NETURE-SUPPLIER-CSV-QUALITY-CONSOLE-RETIREMENT-V1
**작성일:** 2026-07-29
**판정:** RETIRE_READY — frontend 은퇴 완료 · backend/table/이력 API 유지

---

## 1. 데이터·사용 게이트 (§5 · production read-only 재확인)

cloud-sql-proxy(read-only, o4o_api) 로 `o4o_platform` 재확인. write 0.

| 지표 | 값 | 판정 |
|------|:---:|:----:|
| `supplier_csv_import_batches` 총량 | 0 | ✅ |
| `supplier_csv_import_rows` 총량 | 0 | ✅ |
| 최근 30일 batch | 0 | ✅ |
| 최근 90일 batch | 0 | ✅ |
| 진행 중 batch (UPLOADED/VALIDATING/READY) | 0 (총량 0) | ✅ |

- batch status enum = `UPLOADED, VALIDATING, READY, APPLIED, FAILED, PARTIAL` (진행형 UPLOADED/VALIDATING/READY 모두 0).
- CSV 신규 생산 frontend 은 선행 WO(`WO-O4O-NETURE-SUPPLIER-LEGACY-CSV-IMPORT-RETIREMENT-V1`)에서 이미 은퇴.
- **판정: RETIRE_READY** (HOLD_ACTIVE_DATA / HOLD_ACTIVE_USAGE 해당 없음).

---

## 2. 품질 콘솔 실제 책임

`SupplierQualityPage` = **CSV import batch 품질 리포트 전용** (KPI: totalBatches/totalRows/totalApplied/totalFailed/avgSuccessRate · 공급자별 성공률 등급 · 오류유형 TOP). 계정 승인·프로필·상품 품질과 무관. 데이터 0 → 상시 빈 화면.

---

## 3. Route 은퇴 (§6)

| 기존 route | 처리 | target |
|-----------|------|--------|
| `/operator/supplier-quality` | `<Navigate replace />` | `/operator/suppliers` (공급자 승인 canonical) |
| `/admin/supplier-quality` | `<Navigate replace />` (orphan dual-mount 제거) | `/admin/supplier-governance` (governance canonical) |

- 두 route 모두 기존 wrapper 하위에서 element 만 교체 → guard 불변. redirect target 모두 실재 route. blank/404/loop 없음. query 미보존(target 미소비).

## 4. 메뉴 제거 (§7)

- `UNIFIED_MENU.analytics` (활성) 에서 `{ '공급자 품질', '/operator/supplier-quality' }` 제거.
- active 공급자 품질 메뉴/CTA/Link/navigate = 0.

## 5. SupplierQualityPage 제거 (§8)

- `services/web-neture/src/pages/operator/SupplierQualityPage.tsx` 삭제 (`git rm`).
- 조건 충족: active route mount 0(redirect 전환) · importer 0 · 다른 화면 embed 0 · 공통 export 0.
- barrel `pages/operator/index.ts` 의 `export { SupplierQualityPage }` 제거. App.tsx lazy import 제거.

## 6. 전용 component·helper 제거 (§9)

- 페이지는 dedicated frontend API helper 없이 인라인 `api.get('/neture/operator/supplier-quality')` 직접 호출 → **삭제할 PAGE_EXCLUSIVE helper 없음**. GradeBadge/friendlyErrorType 등은 페이지 내부 로컬 함수(파일 삭제로 함께 제거).
- 공용 DataTable/chart/UI component 미삭제.

## 7. Deprecated menu 처리 (§11)

- `operatorMenuGroups.ts` 의 `OPERATOR_MENU_ITEMS` (`@deprecated`) — web-neture 내 runtime consumer **0** (활성 = `UNIFIED_MENU` via `OperatorLayoutWrapper`, admin = `getAdminMenu`).
- 판정 **DEAD** → 전체 제거 (내부 '공급자 품질' 잔존 포함). `OperatorGroupKey`/`OperatorMenuItem` 타입은 `UNIFIED_MENU`/`filterMenuByRole`/`getAdminMenu` 가 계속 사용 → 유지. 공용 메뉴 체계 리팩터링 없음.

## 8. 유지한 backend·DB (§10 · §18)

이번 WO 범위 밖 — 미변경:
- `supplier_csv_import_batches` / `supplier_csv_import_rows` 테이블
- `apps/api-server/src/modules/neture/controllers/operator-supplier-quality.controller.ts`
- `neture.routes.ts` 의 supplier-quality endpoint mount · batch history query · entity/migration

후속 후보(즉시 생성 안 함): `IR-O4O-NETURE-SUPPLIER-CSV-QUALITY-BACKEND-AND-DATA-RETIREMENT-GATE-V1` — 현재 데이터 0·외부 소비처 0이 명확하므로 필요성만 보고.

## 9. 권한·guard (§13)

- redirect source route wrapper 유지 → 비로그인/supplier/partner/seller/operator/admin 접근 동작 불변.
- 권한 확대 0. supplier 가 operator/admin canonical 로 진입하지 않음. operator → `/operator/suppliers`, admin → `/admin/supplier-governance` 안전 이동.

## 10. 전수 검색 (§14)

| 문자열 | 잔여 |
|--------|------|
| `SupplierQualityPage` | frontend active 0 (barrel/lazy/page 제거) |
| `/operator/supplier-quality` | redirect source route 1 (Navigate) |
| `/admin/supplier-quality` | redirect source route 1 (Navigate) |
| `공급자 품질` (active UI) | 0 |
| `OPERATOR_MENU_ITEMS` (web-neture) | 0 (제거) |
| `supplier_csv_import_batches/rows` | backend entity/controller/route 유지 (의도) |

## 11. typecheck·build·chunk (§15)

| 항목 | 결과 |
|------|:----:|
| `pnpm --filter @o4o/web-neture exec tsc --noEmit` | PASS (exit 0) |
| `pnpm --filter @o4o/web-neture build` | PASS (`✓ built`) |
| `SupplierQuality*` chunk in dist/assets | 0 |
| route/menu type error | 0 |
| backend 변경 | 없음 → API build 생략 |

## 12. 브라우저 smoke (§16) — 2026-07-29 배포 후 수행

배포: 커밋 `cbd6b6f82` → GitHub Actions "Deploy Web Services" success (neture-web). Neture admin 로그인 후 관측.

| 관측 | 결과 |
|------|:----:|
| 비로그인 `/operator/supplier-quality` → 로그인(`/`) (auth guard 유지, 권한 확대 0) | ✅ |
| 로그인 `/operator/supplier-quality` → `/operator/suppliers` replace (heading "공급자 승인", 404/blank/loop 0) | ✅ |
| 로그인 `/admin/supplier-quality` → `/admin/supplier-governance` replace (heading "공급자 상태 관리", 404/blank/loop 0) | ✅ |
| operator/admin 메뉴에 공급자 품질 0 · 공급자 승인/상태 관리 정상 | ✅ |
| console error 0 (redirect flow) · 운영 mutation 0 | ✅ |

## 13. DB·migration·운영 mutation

- DB write 0 · migration 0 · 운영 mutation 0 (read-only 게이트만 수행).

## 14. staged 범위 (§18 · §22)

```
D services/web-neture/src/pages/operator/SupplierQualityPage.tsx
M services/web-neture/src/App.tsx
M services/web-neture/src/config/operatorMenuGroups.ts
M services/web-neture/src/pages/operator/index.ts
A docs/checks/CHECK-O4O-NETURE-SUPPLIER-CSV-QUALITY-CONSOLE-RETIREMENT-V1.md
```

타 세션 파일 혼입 0. pathspec 제한 commit.
