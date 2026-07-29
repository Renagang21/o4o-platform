# CHECK — O4O Neture 공급자 Guard·IA·알림·잔여결함 통합 마감 V1

**WO:** WO-O4O-NETURE-SUPPLIER-GUARD-IA-NOTIFICATION-AND-RESIDUAL-DEFECT-CLOSEOUT-V1
**작성일:** 2026-07-29
**판정:** **SUPPLIER_WORKFLOW_CLOSED_WITH_BACKEND_LEGACY**
— 확정 결함 전량 수정 · 실체 없는 잔여(feature-add/공유 shell/seller scope)는 근거와 함께 문서화 · backend endpoint/table 미변경.

> 조사(3축 병렬 read-only) → 결함 확정 → 최소 수정 → 검증 → 마감. 단일 WO 내 조사+구현 수행.

---

## 1. 조사 범위·방식 (§3~§4 · PART A~F)

Neture 공급자 영역(`services/web-neture/*`, `apps/api-server/src/modules/neture/*`)에 한정. read-only 병렬 인벤토리 3축:
- **A축 route·guard·IA**: `/supplier/*`, `/account/supplier/*`, `/workspace/supplier/*`, `/operator/supplier*`, `/admin/supplier*` 전수 + guard/menu.
- **B축 product action·bulkDelete**: 공급자 상품 액션 endpoint 정합 + 의심 malformed bulkDelete.
- **C축 notification·deep-link**: 공급자 상태전이 이벤트별 알림 유무·수신자 scope·deep link 유효성.

> 동시 세션이 KPA(`web-kpa-society`, `routes/kpa`) 파일을 수정 중 — 본 WO 범위와 disjoint. 해당 파일 미접촉(CONCURRENT_SESSION_HOLD), commit 은 Neture pathspec 로 제한.

---

## 2. 확정 결함 및 수정 (implemented)

| # | 결함 | 위치 | 수정 |
|:-:|------|------|------|
| D1 | **dangling redirect** — `/workspace/supplier/requests` → `/supplier/requests` (route 부재·404 fallback 없음 → blank page) | `App.tsx:1200` | 중복·깨진 redirect 라인 제거. 하위 catch-all `/workspace/supplier/*` → `/supplier` (App.tsx:1203) 가 안전 흡수 |
| D2 | **notification serviceKey=NULL** — 공급자 상품 승인/반려 알림이 raw INSERT 로 `serviceKey` 누락 저장 → serviceKey 필터 소비처에서 미노출 위험 | `offer-service-approval.service.ts:630` | INSERT 에 `"serviceKey"` 컬럼 + `'neture'` 값 명시(route/스키마 무변경, 값 보정) |
| D3 | **누락 알림** — 공급자 계정 **승인/반려** 시 신청자 본인에게 알림 없음(워크플로 loop 미완결) | `supplier.service.ts` approveSupplier/rejectSupplier | canonical `notificationService.createNotification` 재사용, 상태전이 성공 후 fire-and-forget, 단일 수신자(supplier.userId) scope, serviceKey='neture' |
| D4 | **stale redirect hop link** — admin 대시보드 카드가 `/admin/admin-suppliers`(redirect) 참조 | `admin-dashboard.controller.ts:129,166` | canonical `/admin/supplier-governance` 로 de-reference(도착 페이지 동일, hop 제거) |

### D3 deep-link guard 정합
- **승인**: supplier 역할 부여 직후 → targetUrl `/supplier/dashboard` (guard 통과).
- **반려**: supplier 역할 제거됨 → `/supplier/*` deep link 는 guard 차단되므로 guard-safe 한 `/mypage/business-profile` 로 지정.
- 두 알림 모두 알림 실패가 승인/반려 상태전이 결과에 영향 주지 않도록 try/catch(fire-and-forget). `userId` 없으면 no-op.

---

## 3. 검증했으나 결함 아님 (no change)

| 항목 | 조사 결과 |
|------|----------|
| **공급자 상품 bulkDelete** | frontend `DELETE '/neture/supplier/products/bulk'` body `{ offerIds }` = backend `DELETE /api/v1/neture/supplier/products/bulk`(`supplier-product.controller.ts:190`, `requireAuth`+`requireActiveSupplier`) 와 **정확히 일치**. malformed path(backslash/`\n`/`//`/template 오류) **없음**. WO 의 의심 결함은 source 레벨에 존재하지 않음 |
| **공급자 상품 액션 전수** | 등록/수정/상세/이미지/상태변경/배치수정/승인요청/오퍼연결/대량등록 endpoint 전부 canonical `/neture/supplier/*` 매칭. self-reference·legacy·double-slash 0 |
| **notification targetUrl 전수** | 실 알림 deep link(`/supplier/products`, `/partner/recruitment-applications`, `/store/commerce/recruitment-applications`, `/operator/contact-messages`, `/admin/o4o-product-db/store-requests`, `/store/handled-products`) 전부 유효 route. dead/legacy 0 |
| **redirect chain** | `/account/supplier/*`·`/workspace/supplier/*`·`/admin/admin-suppliers`·`/admin/supplier-quality`·`/operator/supplier-quality` 모두 **single hop**(A→B→C 없음). 각 target 실재 페이지 |
| **canonical 공급자 menu** | `SupplierSpaceLayout` SIDEBAR_GROUPS 19항목 전부 실 route. dead link·redirect target·중복·self-ref 0 |
| **guard 정합** | `SupplierRoute`(SUPPLIER_ROLES) + `SupplierSpaceLayout`(SUPPLIER_ACCESS_ROLES 2차 재검) 이중. wrong-guard·권한확대 0. `/workspace/supplier/*` redirect 는 unguarded 이나 guarded target 으로만 forward → 허용 |

---

## 4. 잔여(문서화 · 미구현 · 근거) — residuals

| 항목 | 위치 | 분류·근거 |
|------|------|----------|
| 공급자 **deactivate/reactivate** 알림 | `supplier.service.ts` | governance(민감) 메시징 — 사유/문안 설계 필요. feature-add(회귀 아님) → 후속 |
| 공급자 **주문 생성/상태** 알림 | `supplier-order.service.ts` 등 | 별도 서비스·고volume·기존 부재(회귀 아님). feature-add → 후속 |
| **정산 완료/보류** 알림 | `neture-settlement.service.ts` | 상동. feature-add → 후속 |
| `/neture/seller/*` actionUrl | `neture-dashboard.service.ts:529-544` | **seller** 대시보드 카드(공급자 scope 아님). frontend route 아닌 API-prefix 형태 의심 — 소비처·정본 route 확인 후 별도 처리. 본 WO scope 밖 |
| `SupplierOpsLayout` 레거시 sidebar(홈/상품/콘텐츠/정산) | `SupplierOpsLayout.tsx:36-57` | `/workspace/*` partner/workspace **공유 shell**(공급자 전용 아님). 링크는 redirect 경유이나 전부 **유효 페이지**로 forward(blank·dead 0). Shared Module 주의 → 미접촉, 후속 IA 정비 후보 |
| admin 대시보드 `manage-operators`/`manage-settlements` 등 | `admin-dashboard.controller.ts` | 공급자 외 admin 링크 — 본 WO scope 밖(검토만) |

> 잔여는 전부 **실체 없는 결함이 아닌 feature-add / 공유 shell / seller scope** 이며 회귀가 아니므로 마감 판정을 막지 않는다. backend endpoint·table·entity·migration 미변경(§ PART E: frontend dead surface 만 제거, backend 미드롭).

---

## 5. 변경 파일 (staged 범위 · pathspec)

```
M services/web-neture/src/App.tsx                                              (D1)
M apps/api-server/src/modules/neture/services/supplier.service.ts             (D3)
M apps/api-server/src/modules/neture/services/offer-service-approval.service.ts (D2)
M apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts (D4)
A docs/checks/CHECK-O4O-NETURE-SUPPLIER-GUARD-IA-NOTIFICATION-AND-RESIDUAL-DEFECT-CLOSEOUT-V1.md
```

동시 세션 KPA 파일 혼입 0. `git commit -- <paths>` pathspec 제한.

---

## 6. typecheck·build (§ 검증)

| 항목 | 결과 |
|------|:----:|
| `pnpm --filter @o4o/web-neture exec tsc --noEmit` | PASS (exit 0) |
| `pnpm --filter @o4o/web-neture build` | PASS (`✓ built`) |
| api-server `tsc --noEmit` — 편집 3파일(supplier.service/offer-service-approval.service/admin-dashboard.controller) | 오류 0 |
| api-server 기존 `src/scripts/*` 오류 | 선행 존재(본 WO 무관·미접촉) |

---

## 7. DB·운영 mutation

- read-only 조사만 수행. DB write 0 · migration 0 · 운영 supplier 상태 mutation 0.
- D2/D3 알림은 런타임 상태전이 시점에 생성되는 코드 경로 변경일 뿐, 본 WO 수행 중 프로덕션 데이터 변경 없음.

---

## 8. 브라우저 smoke (배포 후 기재)

_배포 후 실브라우저 관측으로 갱신._

| 관측 | 결과 |
|------|:----:|
| `/workspace/supplier/requests` → `/supplier` (blank/404/loop 0) | _대기_ |
| admin 대시보드 "공급사 승인" 카드 → `/admin/supplier-governance` | _대기_ |
| 공급자 canonical 공간(`/supplier/dashboard` 등) 정상 · console error 0 | _대기_ |
| 운영 mutation 0 | _대기_ |

---

## 9. 최종 판정

**SUPPLIER_WORKFLOW_CLOSED_WITH_BACKEND_LEGACY**

- P0/보안 blocker: **0** (권한 bypass·cross-tenant·wrong delete target·cross-tenant notification 없음).
- 확정 결함 D1~D4 수정 완료.
- 잔여는 feature-add/공유 shell/seller scope 로 회귀 아님 — 근거와 함께 문서화, backend legacy(endpoint/table) 의도적 보존.
