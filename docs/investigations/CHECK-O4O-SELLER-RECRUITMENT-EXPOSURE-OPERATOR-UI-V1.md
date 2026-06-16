# CHECK-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1
> **유형:** 운영자 노출 승인 콘솔(준비중→실콘솔) + **per-service backend proxy**(사용자 승인 예외).
> **결과: PASS — KPA/GP/KCos 운영자가 자기 서비스 모집 노출을 승인/반려. neture:operator 큐를 직접 호출하는 대신 각 서비스 operator scope(`{service}:operator`)로 `/api/v1/{service}/operator/recruitment-exposure` proxy 호출. serviceKey 는 backend 에서 고정(권한 경계 보강). 공통 `RecruitmentExposureConsole`(operator-ux-core) + 3 thin wrapper. api-server type-check + 3앱 build PASS.**
> 선행: EXPOSURE-BACKEND(67001e6fb) · 메뉴 remodel(4d6e4571b) — 2026-06-16

---

## 0. backend 금지 예외 승인 사유

WO §3 backend 금지의 목적은 "모델/DB/정책 변경 금지". 본 WO 조사에서 **neture exposure API(neture:operator)가 KPA/GP/KCos operator(자기 서비스 멤버십)에서 403(MEMBERSHIP_NOT_FOUND)** 임을 확인 → 사용자 승인으로 **per-service proxy route 추가**를 예외 허용(서비스 운영자 권한 경계 구현). **DB/migration/entity/ExposureStatus 모델/neture API 로직은 불변**.

## 1. backend API shape (조사 2차)

- neture: `GET /api/v1/neture/operator/recruitment-exposure` + `PATCH :id/approve|reject`(neture:operator) — EXPOSURE-BACKEND 에서 추가. **유지(불변)**.
- 응답: `getRecruitmentsForExposureReview` → id/productName/supplierName/serviceId/status/exposureStatus/exposureReviewed*/consumerPrice/commissionRate/createdAt. approve/reject body `{ note? }`, idempotent.

## 2. 3서비스 apiClient wiring (조사 3차) — 핵심

- **블로커 확정**: `requireNetureScope('neture:operator')` = active `neture` membership + neture:operator role([membership-guard.middleware.ts](../../apps/api-server/src/common/middleware/membership-guard.middleware.ts), F1 Freeze, role 단독 bypass 제거). KPA/GP/KCos operator 는 자기 서비스 멤버십만 → neture API 403.
- **기존 패턴**: 각 서비스 operator 승인은 자기 backend 컨트롤러(`{service}:operator`) + 자기 service-locked client 호출. 예: cosmetics `createOperatorProductApplicationsController(... { scope:'cosmetics:operator', serviceKey:'k-cosmetics' })` — **공유 컨트롤러를 자기 serviceKey 로 고정 재사용**.
- **채택(per-service proxy)**: 동일 패턴. 공유 factory `createServiceRecruitmentExposureProxyController(authMiddleware, requireScope, serviceKey)` 를 3서비스 routes 에 자기 scope+serviceKey 로 마운트.

## 3. serviceKey scope 처리

- **클라이언트 입력 불신 — backend 고정**: KPA='kpa-society' / GP='glycopharm' / KCos='k-cosmetics'(cosmetics product-approval 선례와 동일 canonical key).
- 목록: `getRecruitmentsForExposureReview({ serviceKey 고정 })` → 자기 서비스 모집만.
- 승인/반려: `setRecruitmentExposure(..., serviceKey 고정)` 에 ownership guard 추가 — `recruitment.serviceId !== serviceKey` 면 `SERVICE_MISMATCH`(403). 서비스 운영자가 타 서비스 모집을 승인 불가.
- neture 큐는 serviceKey 미전달(플랫폼 운영자, 제한 없음) — 기존 동작 유지.

## 4. 변경 내용

**backend (6):**
| 파일 | 변경 |
|------|------|
| `services/partner-contract.service.ts` | `setRecruitmentExposure` 에 optional `serviceKey` ownership guard(SERVICE_MISMATCH) |
| `neture.service.ts` | facade serviceKey 전달 |
| `controllers/service-recruitment-exposure-proxy.controller.ts` | **신규** 공유 proxy factory(GET/approve/reject, authMiddleware+requireScope+serviceKey 고정) |
| `routes/kpa/kpa.routes.ts` | mount(requireKpaScope('kpa:operator'), 'kpa-society') |
| `routes/glycopharm/glycopharm.routes.ts` | mount(requireGlycopharmScope('glycopharm:operator'), 'glycopharm') |
| `routes/cosmetics/cosmetics.routes.ts` | mount(requireCosmeticsScope('cosmetics:operator'), 'k-cosmetics') |

**frontend (5):**
| 파일 | 변경 |
|------|------|
| `packages/operator-ux-core/.../RecruitmentExposureConsole.tsx` | **신규** 공통 presentational(상태배지/액션, audienceLabel) |
| `packages/operator-ux-core/src/index.ts` | export(additive) |
| KPA/GP/KCos `pages/operator/RecruitmentExposureApprovalPage.tsx` | 준비중→실콘솔 thin wrapper(자기 apiClient fetch + approve/reject) |

- KPA=`apiClient`(base /api/v1/kpa, `/operator/recruitment-exposure`) / GP=`api`(`/glycopharm/operator/...`) / KCos=`api`(`/cosmetics/operator/...`).

## 5. 화면 / 승인·반려 동작

- 제목 "판매자 모집 노출 승인" + 설명("개별 판매자 승인/반려는 공급자가 모집 상세에서 처리"). audienceLabel: KPA·GP="매장/약국 사용자", KCos="매장 사용자".
- 목록: 제품명/공급자/서비스/생성일 + 운영 상태(모집중/마감) + 노출 상태(노출 대기/승인/반려) + 검토 메모.
- 액션: pending=승인/반려, approved=반려(노출 중단), rejected=승인(재노출). idempotent(backend). 반려 시 `window.prompt` reviewNote.

## 6. 노출 승인 의미 안내

- "운영자 승인 = 모집 제품의 서비스 노출 승인(개별 판매자 승인 아님)" 화면 문구 명시. 개별 판매자 승인/반려/참여해지/allowedSellerIds/OPL/C bridge 액션 본 화면에 **없음**.

## 7. 제외 범위 (WO 준수)

backend entity/migration/ExposureStatus/RecruitmentStatus/browse·apply gate/판매자 신청자 승인·반려/C bridge/OPL/계약/RBAC/가격/공급자 모집 현황/판매자 신청 현황/알림/package.json·lock 무변경. neture API 로직 재작성 없음(serviceKey guard만 추가, 후방호환). 다른 세션 WIP(GP/KCos App.tsx·operatorMenuGroups·tsconfig·tablet-kiosk) 미접촉(page 파일만).

## 8. 검증

- **api-server `type-check`: PASS (exit 0).**
- **builds: `@o4o/web-kpa-society` ✅ · `glycopharm-web` ✅ · `@o4o/web-k-cosmetics` ✅** (operator-ux-core 공통 변경 포함).
- **정적**: per-service proxy 가 자기 serviceKey 고정 → 목록 격리 + SERVICE_MISMATCH 승인 차단. scope guard = 각 서비스 operator. 공통 console export additive(기존 소비처 무영향).
- **배포 후 권장 smoke**(WO §15): KPA operator→kpa-society 모집만·승인→browse 노출 / GP→glycopharm·반려→browse 미노출 / KCos→k-cosmetics 승인·반려 / 공급자 신청자 심사 정상. cross-service 승인 시도 403.

## 9. 완료 판정 / 후속

**PASS.** 3서비스 운영자가 자기 서비스 모집 노출 승인/반려. per-service proxy(권한 경계 보강) + 공통 console. backend 모델/정책 불변.

**커밋:** path-specific 12파일(backend 6 + frontend 5 + CHECK) · `8996a97f2`. (※ pre-commit hook 이 다른 세션 tablet-kiosk-core WIP 기준으로 `pnpm-lock.yaml` 1줄 그룹 제거를 자동 staging — 본 WO 변경 아님, worktree package.json 과 일치.)
**후속:** ③ EXPOSURE-SUPPLIER-STATUS-V1(공급자 모집 현황에 노출 상태·반려 사유 표시). KCos cosmetics/k-cosmetics alias(현재 k-cosmetics 고정) 데이터 정합 모니터링.

---

*Date: 2026-06-16 · PASS · per-service proxy(/api/v1/{service}/operator/recruitment-exposure, {service}:operator, serviceKey backend 고정 + SERVICE_MISMATCH guard) + 공통 RecruitmentExposureConsole(operator-ux-core) + 3 thin wrapper. neture API/모델/migration 불변. type-check + 3 build PASS.*
