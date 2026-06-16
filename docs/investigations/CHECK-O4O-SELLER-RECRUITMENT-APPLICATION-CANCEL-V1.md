# CHECK-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1
> **유형:** 판매자/매장 신청자 본인 pending 신청 철회 (backend cancel API + enum migration + 공통/4서비스 화면 취소 버튼).
> **결과: PASS — `cancelled` enum 값 추가(사용자 migration 승인) + `POST /partner/applications/:id/cancel`(requireAuth, 소유권+pending 검증, idempotent) + 판매자/매장 신청·승인 현황 4서비스에 취소 버튼 + 공급자 상세는 취소 상태만 표시(승인/반려 숨김). api-server type-check PASS, 4앱 build PASS.**
> 선행: 13302ac5f · df093f902/25fbbae17 · 8ebd85853/e935e529e — 2026-06-16

---

## 1. ApplicationStatus 구조 조사 (조사 1차)

- 위치: [NeturePartnerApplication.entity.ts](../../apps/api-server/src/modules/neture/entities/NeturePartnerApplication.entity.ts) `enum ApplicationStatus`.
- 현재 값: `pending` / `approved` / `rejected`.
- **DB enum 여부: 네이티브 Postgres enum** (`type:'enum'`, 타입명 `neture_partner_application_status_enum` — 생성 migration `2026020100001` 기준 단수). varchar union 아님.
- `cancelled`/`canceled` 미존재.
- **migration 필요: YES** → 사용자에게 보고·승인 받음(WO §2.3/§4/§16). `ALTER TYPE ... ADD VALUE`.
- 구현 판단: 가능(승인 후).

## 2. 취소 상태 표현

- `rejected` 재사용 금지(주체·의미 상이) → 신규 값 `CANCELLED='cancelled'`.
- migration: [20260616000000-AddCancelledApplicationStatus.ts](../../apps/api-server/src/database/migrations/20260616000000-AddCancelledApplicationStatus.ts) — `ALTER TYPE "neture_partner_application_status_enum" ADD VALUE IF NOT EXISTS 'cancelled'`(idempotent, 같은 txn 미참조 → PG12+ 안전). down: cancelled→rejected 환원(기존 `AddRevokedApprovalStatus` 패턴 동일).

## 3. 중복/재신청 정책 (조사 2차)

- `@Unique(['recruitmentId','partnerId'])` + `createPartnerApplication`의 중복 체크는 **status 무관** `findOne({recruitmentId,partnerId})` → 존재 시 `DUPLICATE_APPLICATION`.
- ∴ 취소(row 유지=cancelled) 후 **재신청은 기존 정책상 불가**. 이번 WO는 재신청 정책 **무변경**(WO §7.2 준수) → 화면 문구에서 "다시 신청 가능" 미사용.

## 4. Backend cancel API 구현

- `partner-contract.service.ts` `cancelApplication(applicationId, partnerUserId)`: 소유권(`partnerId===user`) → 이미 cancelled면 idempotent 성공 → pending 아니면 `NOT_PENDING` → `status=CANCELLED, decidedAt=now, decidedBy=본인` 저장. **C bridge/contract/allowedSellerIds/OPL/RBAC/알림 무관**.
- facade `neture.service.ts` `cancelPartnerApplication`.
- route [partner-recruitment.controller.ts](../../apps/api-server/src/modules/neture/controllers/partner-recruitment.controller.ts) `POST /partner/applications/:id/cancel` — **`requireAuth`만**(공급자 guard 미적용, 취소 주체=신청자). 에러: NOT_FOUND 404 / NOT_OWNER 403 / NOT_PENDING 400.

## 5. 판매자/매장 신청·승인 현황 화면 반영 (조사 3차)

- backend mine API: `getApplicationsForPartner` — status 원문 통과(cancelled 자동 흐름), participationTerminated 파생 유지.
- 공통 `StoreRecruitmentApplicationsView`(store-ui-core): `onCancelApplication?`+`cancellingId?` props 추가, `status==='pending' && onCancelApplication` 시 "신청 취소" 버튼, resolveState 에 `cancelled`→'신청 취소' 추가.
- 3 store thin page(KPA coreApiClient / GP·KCos authClient.api): `load()` 추출 + confirm→`POST .../cancel`→reload, `onCancelApplication`/`cancellingId` 주입.
- Neture `PartnerRecruitmentApplicationsPage`(자체 JSX): `partnerRecruitmentApi.cancelMine` 추가, cancelled 상태 + pending 취소 버튼.

## 6. 공통 view 반영

- `StoreRecruitmentApplicationsView` optional action 방식 — prop 미제공 시 조회 전용(회귀 0). 3 store 앱 공통 소비.

## 7. 공급자 신청자 상세 영향 (조사 4차)

- [SupplierRecruitmentDetailPage.tsx](../../services/web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx): `APP_STATUS` 에 `cancelled`→'신청 취소' badge 추가. 액션 컬럼은 `status==='pending'`에서만 승인/반려 → **cancelled 는 승인/반려 미표시**(WO #5 충족, 기존 분기 그대로). 공급자 화면에 취소 버튼 **미생성**.
- 카운트: 신청자 수는 `detail.applications.length`(전체) — canceled 포함, 별도 pending/approved 카운트 분리 없음 → 구조 변경 불요.

## 8. 알림 여부 (조사 5차)

- **이번 WO 알림 미추가**(권장 A). 공급자는 신청자 상세에서 '신청 취소' 상태로 확인. notifyApplicant/NotificationType 무변경. 후속 후보로 분리.

## 9. 공급자 화면에 취소 버튼을 만들지 않은 이유

- 취소 주체는 신청자(판매자/매장) 본인. 공급자 액션은 승인/반려/참여해지 축. 혼동 방지 위해 공급자 화면은 **상태 표시만**.

## 10. 제외 범위 (WO 준수)

approved/rejected/terminated 취소 불가 · 참여해지/계약/RBAC/allowedSellerIds/OPL/C bridge/가격/모집 생성·마감·재개/승인·반려 정책 · 이메일·SMS·새 알림 · 모집 entity 확장 · package.json/lock. **모두 미수행.** 다른 세션 WIP(web-glycopharm App.tsx·operator 파일) 미접촉(GP는 page 파일만 수정).

## 11. 검증

- **api-server `type-check`(tsc --noEmit): PASS (exit 0).**
- **builds: `@o4o/web-neture` ✅ · `@o4o/web-kpa-society` ✅ · `glycopharm-web` ✅ · `@o4o/web-k-cosmetics` ✅** (GP는 타 세션 WIP 포함 상태에서도 통과 — 본 변경 무영향).
- **정적**: cancel route requireAuth+소유권+pending 가드, idempotent. 공통 view prop 옵셔널(기존 소비처 회귀 0). 공급자 상세 cancelled badge + 승인/반려 자동 숨김.
- **migration**: CI/CD(main 배포) 자동 실행. ADD VALUE IF NOT EXISTS 멱등.
- **배포 후 권장 smoke**: pending 신청 생성 → 4서비스 현황에서 취소 버튼 → 취소 → '신청 취소' 표시 → 공급자 상세 '신청 취소' + 승인/반려 숨김 → approved/rejected/참여해지 신청엔 취소 버튼 없음 → 타 사용자 신청 취소 403.

## 12. 완료 판정 / 후속

**PASS.** 판매자/매장 본인 pending 신청 철회 end-to-end(enum+API+4서비스 화면). 공급자는 상태만 표시. 정책(C bridge/계약/RBAC/OPL/가격) 무변경, 알림 미추가.

**커밋:** path-specific 13파일(backend 5 + frontend 7 + CHECK) · `e15f66968`.
**후속(선택):** 공급자 취소 알림(in-app) / 취소 후 재신청 허용(중복 정책 개정) / pending/approved/cancelled 카운트 분리.

---

*Date: 2026-06-16 · PASS · ApplicationStatus DB enum → 'cancelled' migration(사용자 승인) + POST /partner/applications/:id/cancel(requireAuth, 소유권+pending, idempotent) + 공통 StoreRecruitmentApplicationsView onCancelApplication + Neture/KPA/GP/KCos 취소 버튼 + 공급자 상세 상태표시(승인·반려 숨김). 알림 미추가. type-check + 4 build PASS.*
