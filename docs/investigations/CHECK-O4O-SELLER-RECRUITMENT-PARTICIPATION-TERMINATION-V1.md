# CHECK-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1
> **유형:** 운영 액션 (backend POST + UX) — 승인 판매자의 **모집 참여 해지**(신규 조달 노출 중단). "계약 해지 전체" 아님. DB/migration **무변경**.
> **결과: PASS — `POST /partner/applications/:id/terminate`(소유권 + contract TERMINATED + allowed_seller_ids array_remove + seller_recruitment OPL is_active=false). application=approved 유지(rejected 미변경), RBAC 회수·주문 취소·정산 제외. 신청자 상세에 "참여 해지" 버튼 + "참여 해지됨" 파생 상태(contract 기반). api-server typecheck 0 · web-neture build ✓.**
> 선행: `IR-...-APPROVAL-CANCEL-CONTRACT-TERMINATION-AUDIT-V1`(948b265ae) · `WO-...-C-BRIDGE-BACKEND-V1`(8e5402e81) — 2026-06-16

---

## 1. 확정 정책 (IR 결정 반영)

1. application 은 approved **유지**(rejected 로 되돌리지 않음).
2. contract → **TERMINATED**(terminatedBy=SELLER, endedAt).
3. `SupplierProductOffer.allowed_seller_ids` 에서 partner userId **제거**(array_remove).
4. `source_type='seller_recruitment'` OPL **is_active=false**(삭제 아님).
5. **RBAC 회수 제외**(글로벌 'partner' role — 타 계약 파손 위험).
6. 기존 주문 이력 **유지**.
7. **신규 조달 노출만 차단**(allowedSellerIds 제거 → discovery + 주문 재검증 자동 차단).

## 2. 변경 내용

**Backend (3)**
| 파일 | 변경 |
|------|------|
| `.../neture/services/partner-contract.service.ts` | `terminateParticipation(applicationId, sellerUserId)` — 소유권(recruitment.sellerId, application=approved) + contract TERMINATED + offer 해소(master+공급자 user_id) + allowed_seller_ids array_remove + partner org OPL is_active=false(seller_recruitment). + `getRecruitmentApplications` 에 contract_status 서브쿼리 → `participationTerminated` 파생 |
| `.../neture/neture.service.ts` | `terminateRecruitmentParticipation` 파사드 |
| `.../neture/controllers/partner-recruitment.controller.ts` | `POST /partner/applications/:id/terminate`(requireActiveSupplier, reason 매핑) |

**Frontend (2)**
| 파일 | 변경 |
|------|------|
| `web-neture/src/lib/api/supplier.ts` | `RecruitmentApplication.participationTerminated` + `supplierRecruitmentApi.terminateApplication` |
| `web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx` | approved & !terminated 행에 "참여 해지" 버튼(confirm) + "참여 해지됨" 뱃지 |

## 3. 동작 / 안전성

- **조달 차단 핵심 = allowed_seller_ids 제거.** `getAvailableSupplyProducts`(discovery) + `neture-b2b-cart-checkout.service.ts:216`(주문 재검증) 모두 차단 → 신규 주문 불가. 완료 주문/이력은 offer/product 참조라 **무손상**.
- OPL **is_active=false**(매장 store listing 노출 차단, row 보존 → 재승인 시 재활성 idempotent). 삭제 안 함.
- contract TERMINATED(ACTIVE 일 때만; idempotent). 계약 미존재(브리지 실패 등)면 allowed_seller_ids/OPL 만 정리.
- 소유권: `recruitment.sellerId === req.user.id`(타 공급자 403). 비-approved → 400.
- application enum/migration 무변경 — 참여 해지 상태는 contract.contractStatus 로 파생 표시.

## 4. C bridge / RBAC / 가격

- C bridge 로직 **무변경**(본 WO 는 cleanup 별도). RBAC 회수 **안 함**(글로벌 role 위험). 가격 구조·OPL 정책·계약 entity **무변경**. migration 0.

## 5. 제외 범위 (WO 준수)

RBAC 회수 / 기존 주문 취소 / 정산·환불 / OPL 삭제 / application rejected 변경 / 가격 / migration / 진행중 주문 hard-block. **모두 미수행.**

## 6. 검증

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~12s)` ✅
- **정적:** terminate 는 신규 POST. C bridge·계약 entity·승인/반려 무변경. allowed_seller_ids array_remove idempotent. OPL is_active=false(삭제 X). 참여 상태 contract 파생.
- **browser/DB smoke:** 미수행 — dev·인증 guard + 승인 데이터 의존. **배포 후 권장:** 승인 판매자 행 "참여 해지" → (read-only) offer.allowed_seller_ids 에서 partner 제거·seller_recruitment OPL is_active=false·contract TERMINATED 확인 → 판매자 `/available-supply-products` 에서 해당 제품 사라짐 → 신규 주문 차단(checkout DISTRIBUTION_DENIED) → 완료 주문 이력 유지 → 재해지 idempotent → 타 공급자 403.

## 7. 완료 판정 / 후속

**PASS.** 승인 판매자 참여 해지(contract TERMINATED + allowedSellerIds 제거 + OPL 비활성화). 신규 조달 차단, 기존 주문/이력 유지, RBAC/가격/migration 무변경, 소유권 격리.

**커밋:** path-specific 6파일 · `<commit>`.
**후속(선택):** RBAC 회수(글로벌 role 가드 설계 시) / 판매자 통보·알림 / 정산 연계 / 참여 재개(re-grant) / 모집 entity 확장.

판매자 모집 = 생성 → 현황 → 신청자 심사(승인/반려) → C bridge → 마감↔재개 → **참여 해지**까지 공급자 화면에서 운영 가능.

---

*Date: 2026-06-16 · 운영 액션 PASS · 승인 판매자 참여 해지(POST terminate: contract TERMINATED + allowedSellerIds array_remove + OPL is_active=false). application approved 유지, RBAC/주문/정산/가격/migration 무변경. 신규 조달만 차단, 이력 유지. typecheck 0 · build ✓.*
