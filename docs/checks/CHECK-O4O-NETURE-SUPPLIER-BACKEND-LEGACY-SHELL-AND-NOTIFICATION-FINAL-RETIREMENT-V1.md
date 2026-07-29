# CHECK — O4O Neture 공급자 backend legacy·shell·알림 최종 정리 V1

**WO:** WO-O4O-NETURE-SUPPLIER-BACKEND-LEGACY-SHELL-AND-NOTIFICATION-FINAL-RETIREMENT-V1
**작성일:** 2026-07-29
**판정:** **CLOSED_WITH_DATA_TABLES_RETAINED**
— 소비처 0 endpoint·inert seller 링크·중요 상태 알림은 정리/추가 완료 · CSV import backend·2 테이블은 외부(admin-dashboard) 소비처 존재로 안전 보존 · SupplierOpsLayout 은 수렴 시 권한 변경이 발생하여 HOLD.

> 감사(4축 병렬 read-only) → 게이트 판정 → 최소 구현 → 검증 → 마감. 데이터·소비처가 불명확하거나 권한 변경을 유발하면 삭제/수렴하지 않고 안전 유지 판정.

---

## 1. Backend endpoint 인벤토리 (§4)

| Endpoint | Method | Consumer | 최근 호출 | DB 사용 | Job 의존 | 판정 |
|----------|--------|----------|:---------:|---------|:-------:|------|
| `/neture/supplier/csv-import/upload` | POST | **admin-dashboard `BulkImportPage.tsx:127`** (`/supplierops/products/bulk-import`, live·non-redirect) | 코드상 live | batches/rows write | 없음 | **HOLD_EXTERNAL_CONSUMER** |
| `/neture/supplier/csv-import/batches` (+ `/:id`, apply, retry, delete, delete-check, full-delete, rows PATCH) | GET/POST/PATCH/DELETE | frontend 소비처 0 (web-neture redirect-only) | 없음 | batches/rows R/W | 없음 | FRONTEND_DEAD (그러나 upload 와 controller/service 공유 → 분리 불가) |
| `/neture/operator/supplier-quality` | GET | **소비처 0** (web-neture redirect-only, API caller 0) | 없음 | batches/rows read-only 집계 | 없음 | **RETIRE_READY → 은퇴** |

컨트롤러/서비스: `csv-import.service.ts`(`CsvImportService`, 9 메서드), `supplier-product.controller.ts`(csv-import 라우트 9개 mount), `operator-supplier-quality.controller.ts`(단일 GET). 전용 DTO/테스트 없음.

---

## 2. 소비처 전수 조사 (§5)

검색어(`supplier_csv_import_batches/rows`, `csv-import`, `SupplierCsvImport`, `supplier-quality`, `uploadCsv/validateBatch/applyBatch/retryBatch/deleteBatch` 등) 전 범위(web-neture / admin-dashboard / api-server / worker·cron·queue / tests / scripts / docs / 외부 integration) 스윕 결과:

- **CSV import**: frontend consumer = admin-dashboard **1건 존재**(`BulkImportPage` upload). backend internal consumer = quality 컨트롤러(read). job/queue/scheduler/cron = **0**. 외부 API client = **0**. → upload 소비처 존재로 `RETIRE_READY` 조건(frontend consumer 0) 불충족 → **HOLD**.
- **supplier-quality**: 전 범위 consumer **0**(redirect-only). → `RETIRE_READY`.
- entity: `SupplierCsvImportBatch`(`@Entity('supplier_csv_import_batches')`, `@ManyToOne('NetureSupplier', onDelete:CASCADE)`), `SupplierCsvImportRow`(`@ManyToOne('SupplierCsvImportBatch', onDelete:CASCADE)`; `master_id`/`offer_id` 는 plain uuid, FK 아님). 두 엔티티에 **inbound FK 를 가진 다른 module/table 없음**(내부 rows→batches CASCADE 뿐).

---

## 3. Production data gate (§6, read-only)

cloud-sql-proxy(자기 포트 15432) + `o4o_api` read-only SELECT:

| 항목 | 값 |
|------|---:|
| `supplier_csv_import_batches` total | **0** |
| `supplier_csv_import_batches` 30d / 90d | 0 / 0 |
| `supplier_csv_import_rows` total | **0** |

FK 위상(information_schema): `rows.batch_id → batches`(inbound·내부), `batches.supplier_id → neture_suppliers`(outbound). **외부 table 의 inbound FK 없음.** 전용 enum 3종(`supplier_csv_import_batch_status_enum`, `supplier_csv_import_row_action_enum`, `supplier_csv_import_row_validation_enum`)은 **두 테이블에만 사용**(공유 0).

> 데이터 축은 `RETIRE_READY`(0건·FK 격리·enum 전용). 그러나 §1/§2 의 **admin-dashboard upload 소비처 + 살아있는 CsvImportService** 때문에 table drop 은 **HOLD**. 판정: `BACKEND_RETIRED_DATA_SURFACE_RETAINED` 가 아니라, **endpoint 도 대부분 보존**되므로 CSV import 축 전체 HOLD_EXTERNAL_CONSUMER.

---

## 4. Endpoint 은퇴 결과 (§7)

| 대상 | 처리 |
|------|------|
| `GET /operator/supplier-quality` mount | 제거 (`neture.routes.ts:178`) |
| `createOperatorSupplierQualityController` import | 제거 (`neture.routes.ts:49`) |
| `operator-supplier-quality.controller.ts` | **파일 삭제** (`git rm`) |
| CSV import route/controller/service (9 endpoints) | **보존** (upload 외부 소비처) |
| 공용 parser·ProductMaster·notification helper | 미접촉 |

---

## 5. Table·entity·migration 결과 (§8~§9)

- **미변경.** drop migration 미작성. entity/repository/enum/index 보존.
- 근거: admin-dashboard `BulkImportPage` 가 upload endpoint 를 live 소비 → 서비스·테이블 제거 시 회귀. `CsvImportService` 가 두 테이블에 R/W 유지. → §27 `HOLD_EXTERNAL_CONSUMER`.
- 데이터는 0건이나 "소비처·서비스 미제거" 상태에서 테이블만 drop 하는 것은 안전하지 않음(런타임 upload 시 테이블 부재 → 장애). 후속: admin-dashboard 소비처 은퇴 WO 선행 시 재평가.

---

## 6. SupplierOpsLayout 판정 (§10)

**판정: LEGACY_FORWARDER (unguarded) → HOLD (권한 변경 유발).**

- mount: `App.tsx:997` `<Route element={<SupplierOpsLayout />}>` — **guard wrapper 없음**. 컴포넌트 자체도 auth/role 체크 없음(무가드).
- sidebar 5항목 중 4항목(홈/상품/콘텐츠/정산)이 canonical `/supplier/*`·`/partner/*` 로 **redirect out**, 허브만 in-shell. 호스팅 실페이지(`/workspace/partners*`·`/workspace/my-content`·`/workspace/forum*`·`/workspace/hub`)는 별도 legacy top-level redirect 로 진입.
- SupplierSpaceLayout(canonical `/supplier/*`)은 `SupplierRoute`+2차 재검(`SUPPLIER_ACCESS_ROLES`)으로 **완전 가드**. SupplierOpsLayout 은 guard 가 **strictly weaker(무가드)**.

### HOLD 사유 (§11·§27)
어떤 수렴(shell 제거 후 canonical 편입 / `ProtectedRoute`·`AdminRoute` 래핑 / SupplierSpaceLayout 로 fold)도 **현재 없는 auth+role 게이트를 추가**하여 도달 가능 사용자 집합을 바꾼다(현재: 미인증 포함 전원 → 수렴 후: 특정 role). 이는 **권한 변경 = 명시적 WO 필요**(CLAUDE.md Shared Module Rule·"가드 변경 금지"). 따라서 본 WO 에서 silent 수렴하지 않고 미접촉·HOLD.

> 잔여 IA 정비(무가드 노출 자체가 정책 문제인지, 페이지 self-guard 유무 감사 포함)는 권한 델타를 다루는 별도 WO 로 분리 권고.

---

## 7. Shell 수렴 결과 (§11)

미수행(HOLD). SupplierOpsLayout.tsx·App.tsx mount 미변경.

---

## 8. Seller actionUrl 인벤토리 (§12)

Source: `neture-dashboard.service.ts` `getSellerDashboardInsight()` → `GET /neture/seller/dashboard/ai-insight` → `HubPage.tsx` `SellerInsightCards`.

| Card | 기존 URL | Frontend route | 소비 | 판정 | 정본 |
|------|----------|:--------------:|:----:|------|------|
| products | `/neture/seller/available-supply-products` | 없음(API 경로형) | **네비 미소비**(card.actionUrl 미참조) | NO_ROUTE(inert) | `/store/manage/products/library` |
| requests | `/neture/seller/supply-requests` | 없음 | inert | NO_ROUTE(inert) | `/store/manage/products`(전용 페이지 부재→최근접 목록) |
| exposure | `/neture/seller/my-products` | 없음 | inert | NO_ROUTE(inert) | `/store/my-products` |
| operations | `/neture/seller/orders` | 없음 | inert | NO_ROUTE(inert) | `/store/orders` |

- **런타임 데드링크 0**: `SellerInsightCards`(HubPage.tsx)는 `card.actionUrl` 을 어떤 Link/onClick/navigate 에도 사용하지 않음. → 현재 영향 nil, latent debt.
- **seller≠supplier**: seller=매장 경영자(`store_owner`, `/store/*`·`/seller/*` under MainLayout, backend-gated). supplier=`neture:supplier`(`/supplier/*` under `SupplierRoute`). `SUPPLIER_ROLES` 가 legacy seller/partner 를 guard 편의상 포함하나 canonical role·layout·route tree 는 별개. → `/supplier/*` 로 옮기지 않고 seller scope `/store/*` 로 정렬.

---

## 9. Deep-link 수정 (§13)

4개 actionUrl 을 canonical `/store/*` 로 교정(위 표 정본 열). 전용 상세 route 부재한 requests 는 최근접 canonical 목록으로 연결. 모두 guard-safe(MainLayout·backend-gated). inert 이므로 런타임 변화 0, latent 정합만 개선.

---

## 10. deactivate/reactivate 알림 (§15)

`supplier.service.ts` 기존 private `notifySupplierAccount`(canonical `notificationService`·단일수신자·serviceKey='neture'·fire-and-forget) 재사용. 커밋 성공 + role 처리 후 post-commit `.then()` 에서 발송.

| Event | 위치 | recipient | targetUrl | guard |
|-------|------|-----------|-----------|-------|
| 비활성화 | `deactivateSupplier` `.then()` | `result.data.userId`(`neture_suppliers.user_id`) | `/mypage/business-profile` | role 제거됨 → guard-safe 비-supplier route |
| 재활성화 | `reactivateSupplier` `.then()` | `result.data.userId` | `/supplier/dashboard` | role 복구됨 → guard 통과 |

사유 원문 미포함(§15). 알림 실패가 상태전이에 영향 없음(try/catch·no-op on missing userId).

---

## 11. 주문 알림 (§16) — HOLD

**HOLD_NOTIFICATION_SCOPE.** `createOrder`(`routes/neture/services/neture.service.ts:501`, tx)의 `order.userId` = **구매자(매장)**, 공급자 아님. 단일 주문이 **다수 공급자**에 걸침(mixed-supplier). 공급자별 fan-out(`items→offer.supplierId→neture_suppliers.user_id`) + `/supplier/orders/:id` 상세의 cross-tenant 노출 범위(타 공급자 품목 포함 여부) 확인이 선행되어야 함. 잘못하면 **cross-tenant notification**(§27 즉시중지 사유). `updateOrderStatus`(event 4)는 대부분 공급자 자기 트리거(preparing/shipped/delivered)라 무의미하고, 전용 반품·환불 개시 경로 부재. → 두 이벤트 모두 HOLD, 별도 결정 필요.

---

## 12. 정산 알림 (§17)

| Event | 처리 |
|-------|------|
| 정산 완료(approved→paid) | **추가**. `paySettlement` 성공 후 `notifySupplierSettlementPaid`(private): `supplier_id → neture_suppliers.user_id` 조회 → 단일수신자 알림. targetUrl `/supplier/settlements`(목록; 상세 route 부재). 금액·계좌 metadata 미포함(§17). |
| 정산 보류·실패 | **HOLD**. `VALID_STATUSES`=`pending/calculated/approved/paid/cancelled` — "held/failed" status **부재**. `cancelSettlement`(취소)에 매핑은 의미 불일치(취소≠보류/실패). 신규 status 또는 제품 결정 필요 → 범위 밖. |

---

## 13. Recipient·tenant scope (§18·§13 recipient)

추가된 3개 알림 모두 **단일 tenant scope**: 비활성화/재활성화 = 해당 supplier `user_id`, 정산완료 = 해당 settlement 의 supplier `user_id`. broadcast·cross-supplier·operator 무차별 발송 0. 상태 mutation 성공 후 생성, transaction rollback 미유발.

---

## 14. Notification 중복 방지 (§19)

기존 neture 모듈 `createNotification` 사이트 4곳(contact.controller / partner-contract.service / store-product-request-notify / supplier.service) 중 **본 6개 이벤트에 알림 생성하는 곳 0** → service+controller double-create 위험 없음. 신규 3개는 각 상태전이 지점 단일 생성. retry 경로 없음(비활성화/재활성화/지급은 status 가드 UPDATE 로 idempotent — 재실행 시 status 불일치로 no-row → 알림 미발송). 신규 idempotency framework 미도입.

---

## 15. typecheck·build (§20)

| 항목 | 결과 |
|------|:----:|
| api-server `tsc --noEmit` — 편집 5파일 | **오류 0** |
| api-server `tsc --noEmit` 전체 | 10 오류 = 전부 `src/scripts/*`(drug-otc/hff/otc, 선행·무관·미접촉) |
| api-server `build`(`tsconfig.build.json`, scripts 제외) | **PASS**(`dist/main.js` 생성) |

web-neture: 변경 없음(PART B HOLD·PART C 는 backend dashboard service). typecheck/build 대상 아님.

---

## 16. Migration 검증 (§21)

drop migration 미작성(§5 HOLD) → migration 검증 N/A.

---

## 17. route·shell smoke (§22·§24)

(배포 후 기록 — §19 참조)

---

## 18. notification tests (§23)

프로덕션 supplier/정산 상태 mutation 금지 제약 → live 발송 smoke 미수행. 코드 경로 검증: 단일 recipient 도출·guard-safe targetUrl·fire-and-forget·status-guard idempotency 정적 확인.

---

## 19. 프로덕션 read-only smoke (§24)

(배포 후 아래 표 기록)

| 관측 | 결과 |
|------|:----:|
| `GET /neture/operator/supplier-quality` 404/미존재(은퇴 확인) | (배포 후) |
| seller Hub 카드 정상 렌더(정본 `/store/*` payload) | (배포 후) |
| `/supplier/settlements`·`/mypage/business-profile`·`/supplier/dashboard` 도착 route 렌더 | (배포 후) |
| console error 0 · HTTP 5xx 0 | (배포 후) |
| 운영 supplier/정산 상태 mutation 0 | ✅(read-only) |

---

## 20. DB write·migration·운영 mutation (§30)

DB write 0 · migration 0 · 운영 supplier/정산 상태 mutation 0. read-only SELECT(테이블 count·FK·enum·컬럼)만 수행.

---

## 21. 잔여 legacy (§25)

| 항목 | 분류 |
|------|------|
| CSV import backend(9 endpoints)·2 테이블·entity | LEGACY_RETAINED (admin-dashboard upload 소비처) |
| admin-dashboard `BulkImportPage` upload 소비처 | ACTIVE (별도 app·별도 WO 대상) |
| SupplierOpsLayout `/workspace/*` 무가드 shell | LEGACY_RETAINED (권한 델타 WO 필요) |
| 주문 알림(신규주문 fan-out·상태변경) | HOLD (recipient scope 결정 필요) |
| 정산 보류·실패 알림 | HOLD (status 부재) |

---

## 22. HOLD·BLOCKED (§27)

- `HOLD_EXTERNAL_CONSUMER`: CSV import backend·2 테이블 (admin-dashboard 소비처).
- `HOLD`(권한 변경): SupplierOpsLayout 수렴.
- `HOLD_NOTIFICATION_SCOPE`: 신규주문·주문상태·정산보류/실패 알림.
- `SECURITY_BLOCKER`: **없음** (cross-tenant·wrong delete·권한 우회 0).

---

## 23. staged 범위 (§30)

```
M apps/api-server/src/modules/neture/neture.routes.ts                              (supplier-quality mount 제거)
D apps/api-server/src/modules/neture/controllers/operator-supplier-quality.controller.ts (은퇴)
M apps/api-server/src/modules/neture/services/neture-dashboard.service.ts          (seller actionUrl 정본화)
M apps/api-server/src/modules/neture/services/supplier.service.ts                  (deactivate/reactivate 알림)
M apps/api-server/src/modules/neture/services/neture-settlement.service.ts         (정산완료 알림)
A docs/checks/CHECK-O4O-NETURE-SUPPLIER-BACKEND-LEGACY-SHELL-AND-NOTIFICATION-FINAL-RETIREMENT-V1.md
```

동시 세션 drug-otc/KPA 파일 혼입 0. `git commit -- <paths>` pathspec 제한.

---

## 24. 최종 판정 (§28)

**CLOSED_WITH_DATA_TABLES_RETAINED**

- 소비처 0 endpoint(supplier-quality) 은퇴 · inert seller 링크 정본화 · 중요 상태 알림 3건(비활성화·재활성화·정산완료) 추가 완료.
- CSV import backend·2 테이블 = admin-dashboard 외부 소비처 존재로 안전 보존(데이터 0이나 소비처·서비스 미제거).
- SupplierOpsLayout = 수렴 시 권한 강화(무가드→가드) 발생으로 HOLD(별도 WO).
- 주문 알림·정산 보류/실패 = recipient scope/status 부재로 HOLD.
- P0/보안 blocker 0.
