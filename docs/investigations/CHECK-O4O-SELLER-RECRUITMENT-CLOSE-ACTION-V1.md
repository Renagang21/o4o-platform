# CHECK-O4O-SELLER-RECRUITMENT-CLOSE-ACTION-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-CLOSE-ACTION-V1
> **유형:** 운영 액션 (backend PATCH + UX 버튼) — 공급자가 본인 모집 마감(신규 신청 차단). DB/migration/bridge/계약·RBAC/OPL **무변경**.
> **결과: PASS — `PATCH /partner/recruitments/:id/close`(소유권 + status→CLOSED, idempotent) + 현황/상세 마감 버튼·상태 표시. 신규 신청 차단은 기존 `createPartnerApplication`(RECRUITMENT_CLOSED)으로 이미 동작 — 무변경. 승인/반려는 마감 후에도 가능(기존 구조 유지). 기존 승인 판매자 allowedSellerIds/OPL/계약 유지. migration 0. api-server typecheck 0 · web-neture build ✓.**
> 선행: `WO-...-SUPPLIER-APPLICATION-REVIEW-V1`(fd2a07b41) — 2026-06-16

---

## 1. 조사 (구현 전)

- **상태 구조**: `RecruitmentStatus`(`recruiting`/`closed`) enum **이미 존재** → CLOSED 재사용, **migration 불필요**.
- **신규 신청 차단**: `createPartnerApplication`(partner-contract.service.ts:315-317) 이 `recruitment.status !== RECRUITING` 이면 `RECRUITMENT_CLOSED` throw → **이미 차단됨**(무변경).
- **승인/반려 vs status**: `approvePartnerApplication`/`rejectPartnerApplication` 은 recruitment status 미확인(application.status===PENDING 만 확인) → **마감 후에도 pending 승인/반려 가능**(WO 권장 정책과 일치, 무변경).
- **C bridge**: 승인 시 동작, recruitment status 무관 → 마감이 bridge 에 영향 없음.
- → 필요한 것은 **status 전환(close) 액션 + 화면 표시**뿐.

## 2. 변경 내용

**Backend (3)**
| 파일 | 변경 |
|------|------|
| `.../neture/services/partner-contract.service.ts` | `closeRecruitment(recruitmentId, sellerUserId)` — 소유권 검증(미존재/타 공급자 → NOT_FOUND), status→CLOSED, 이미 closed 면 idempotent 성공 |
| `.../neture/neture.service.ts` | `closePartnerRecruitment` 파사드 |
| `.../neture/controllers/partner-recruitment.controller.ts` | `PATCH /partner/recruitments/:recruitmentId/close`(requireActiveSupplier, NOT_FOUND→404) |

**Frontend (3)**
| 파일 | 변경 |
|------|------|
| `web-neture/src/lib/api/supplier.ts` | `supplierRecruitmentApi.close(recruitmentId)` |
| `web-neture/src/pages/supplier/SupplierRecruitmentsPage.tsx` | recruiting 행에 "마감" 버튼(confirm + reload). load 함수 추출 |
| `web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx` | 요약에 "모집 마감" 버튼(recruiting) + closed 안내 문구 + refresh |

## 3. 정책 반영

- **마감 = 신규 신청 접수 종료** (≠ 삭제/승인취소/계약해지/allowedSellerIds 제거/OPL 비활성화).
- **기존 승인 판매자 유지**: 마감은 status 전환만 → allowedSellerIds/OPL/계약/RBAC 무변경.
- **pending 신청**: 마감 후에도 그대로 pending 유지, 공급자가 계속 승인/반려 가능(approve/reject 가 status 미확인). 자동 반려 없음.
- **신규 신청 차단**: 기존 `createPartnerApplication` RECRUITMENT_CLOSED 로 자동 차단(무변경).

## 4. 권한 / idempotency

- close: `requireActiveSupplier` + `recruitment.sellerId === req.user.id`. 타 공급자 → NOT_FOUND(404).
- idempotent: 이미 closed 면 save 없이 성공 반환. 재마감 안전.

## 5. C bridge / 가격 영향

- **무변경.** 마감은 status 전환만. C bridge·계약·RBAC·OPL·가격 구조 미수정. migration 0.

## 6. 제외 범위 (WO 준수)

모집 삭제 / 재개(reopen) / 기간(startAt/endAt) entity 확장 / 자동 마감 스케줄러 / PRIVATE offer 자동생성 / 가격 / allowedSellerIds·OPL·계약·RBAC 변경 / bridge 재설계 / migration. **모두 미수행.**

## 7. 검증

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~11s)` ✅
- **정적:** status→CLOSED 전환 1지점. 신규 신청 차단·승인/반려·bridge 무변경(기존 로직 재사용). 소유권 일관(sellerId===user id). 재마감 idempotent.
- **browser/DB smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** 공급자 → 모집 현황 "마감" → 상태 '마감' 표시 → 신규 신청 RECRUITMENT_CLOSED 차단 → 기존 pending 승인 가능(+C bridge) → 재마감 안전 → 타 공급자 모집 close 404.

## 8. 완료 판정 / 후속

**PASS.** 공급자 모집 마감(신규 신청 차단) + 상태 표시. 기존 신청/승인/계약/bridge/가격 유지, migration 0, 소유권 격리.

**커밋:** path-specific 7파일 · `<commit>`.
**후속(선택):** 모집 재개(reopen) / 승인 취소·계약 해지(별도 기능) / 모집 entity 확장(제목·기간) / 자동 마감.

---

*Date: 2026-06-16 · 운영 액션 PASS · 공급자 모집 마감(PATCH close + 현황/상세 버튼). 신규 신청 차단 기존 로직 재사용, 승인/반려·bridge·가격 무변경, migration 0. typecheck 0 · build ✓.*
