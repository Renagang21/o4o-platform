# CHECK-O4O-SELLER-RECRUITMENT-REOPEN-ACTION-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-REOPEN-ACTION-V1
> **유형:** 운영 액션 (backend PATCH + UX 버튼) — 공급자가 본인 마감 모집 재개(다시 신규 신청 가능). close 미러. DB/migration/bridge/계약·RBAC/OPL **무변경**.
> **결과: PASS — `PATCH /partner/recruitments/:id/reopen`(소유권 + status→RECRUITING, idempotent) + 현황/상세 재개 버튼(상태별 마감↔재개 토글). 신규 신청 재허용은 기존 `createPartnerApplication`(RECRUITING 기준) 으로 자동 — 신청 로직 무변경. 기존 신청/승인/allowedSellerIds/OPL/계약 유지. migration 0. api-server typecheck 0 · web-neture build ✓.**
> 선행: `WO-...-CLOSE-ACTION-V1`(457476854) — 2026-06-16

---

## 1. 조사 (구현 전)

- close 구조(457476854): `closeRecruitment`(service) + `closePartnerRecruitment`(facade) + `PATCH /close`(controller) + `supplierRecruitmentApi.close` + 현황/상세 마감 버튼. → reopen 은 **정확한 미러**.
- `RecruitmentStatus`(recruiting/closed) enum 존재 → migration 0.
- **신규 신청 차단 = RECRUITING 기준**(`createPartnerApplication:315` `status !== RECRUITING → RECRUITMENT_CLOSED`) → reopen 으로 RECRUITING 전환 시 **자동 재허용**(신청 생성 로직 수정 불필요).
- 현황/상세 status badge·버튼 조건 존재 → 상태별 토글만 추가.

## 2. 변경 내용

**Backend (3)**
| 파일 | 변경 |
|------|------|
| `.../neture/services/partner-contract.service.ts` | `reopenRecruitment(recruitmentId, sellerUserId)` — 소유권 검증 + status→RECRUITING, 이미 recruiting 이면 idempotent |
| `.../neture/neture.service.ts` | `reopenPartnerRecruitment` 파사드 |
| `.../neture/controllers/partner-recruitment.controller.ts` | `PATCH /partner/recruitments/:recruitmentId/reopen`(requireActiveSupplier, NOT_FOUND→404) |

**Frontend (3)**
| 파일 | 변경 |
|------|------|
| `web-neture/src/lib/api/supplier.ts` | `supplierRecruitmentApi.reopen(recruitmentId)` |
| `web-neture/src/pages/supplier/SupplierRecruitmentsPage.tsx` | 행 상태별 토글: recruiting→"마감" / closed→"재개"(confirm + reload) |
| `web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx` | 요약 상태별 토글: "모집 마감" / "모집 재개"(confirm + refresh) |

## 3. 정책 반영

- **재개 = CLOSED → RECRUITING** (≠ 신규 생성/신청 이력 초기화/승인 취소/계약 재생성/C bridge 재실행).
- 기존 신청 이력·승인 판매자 allowedSellerIds/OPL/계약 **유지**(상태 전환만).
- 재개 후 신규 신청 가능(기존 RECRUITING 기준 차단 로직이 자동 허용).
- idempotent: 이미 recruiting 이면 save 없이 성공 → 중복 클릭/재시도 안전(close 와 대칭).

## 4. 권한 / C bridge

- `requireActiveSupplier` + `recruitment.sellerId === req.user.id`. 타 공급자 → NOT_FOUND(404).
- **C bridge·계약·RBAC·OPL·가격 무변경.** reopen 은 status 전환만.

## 5. 제외 범위 (WO 준수)

모집 삭제 / 기간 entity 확장 / 자동 마감·재개 스케줄러 / PRIVATE offer 자동생성 / 가격 / allowedSellerIds·OPL·계약 수정 / 승인 취소·계약 해지 / bridge 수정 / migration. **모두 미수행.**

## 6. 검증

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~13s)` ✅
- **정적:** status→RECRUITING 전환 1지점. 신청 차단/승인/bridge 무변경(기존 로직 재사용). 소유권 일관. 재재개 idempotent. 상태별 버튼 토글(마감↔재개).
- **browser/DB smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** 모집 마감 → '마감' → 재개 → '모집중' → 신규 신청 가능 → 기존 신청자/승인자 allowedSellerIds·OPL 유지 → 재재개 안전 → 타 공급자 404.

## 7. 완료 판정 / 후속

**PASS.** 공급자 모집 재개(CLOSED→RECRUITING) + 상태별 마감/재개 토글. 기존 신청/승인/계약/bridge/가격 유지, migration 0, 소유권 격리. **모집 상태 운영(모집중 ↔ 마감) 완결.**

**커밋:** path-specific 7파일 · `<commit>`.
**후속(선택):** 모집 entity 확장(제목·기간) / 승인 취소·계약 해지 IR / 자동 마감.

---

*Date: 2026-06-16 · 운영 액션 PASS · 공급자 모집 재개(PATCH reopen + 현황/상세 토글). close 미러, 신규 신청 재허용은 RECRUITING 기준 자동, bridge/가격 무변경, migration 0. typecheck 0 · build ✓.*
