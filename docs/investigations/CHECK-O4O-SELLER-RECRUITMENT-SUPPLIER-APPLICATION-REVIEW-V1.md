# CHECK-O4O-SELLER-RECRUITMENT-SUPPLIER-APPLICATION-REVIEW-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-SUPPLIER-APPLICATION-REVIEW-V1
> **유형:** end-to-end (backend GET + UX 상세 페이지) — 공급자가 본인 모집 신청자 목록 확인 + 승인/반려. 승인/반려는 **기존 API 재사용**. DB/migration/bridge/계약·RBAC **무변경**.
> **결과: PASS — `GET /partner/recruitments/:id/applications`(소유권 필터 + 신청자 user/org join) + `/supplier/recruitments/:id` 상세 페이지(요약 + 신청자 승인/반려). 승인=기존 `POST /partner/applications/:id/approve`(ownership + C bridge) 재사용, 반려=`/reject` 재사용. api-server typecheck 0 · web-neture build ✓.**
> 선행: `WO-...-SUPPLIER-STATUS-VIEW-V1`(c920b77ff) · `WO-...-C-BRIDGE-BACKEND-V1`(8e5402e81) — 2026-06-16

---

## 1. 조사 (구현 전)

- **승인/반려 API 이미 존재**: `POST /partner/applications/:id/approve|reject`(requireActiveSupplier). `approvePartnerApplication` 이 **recruitment.sellerId === req.user.id 소유권 검증** + **C bridge 동작**. `rejectPartnerApplication` 도 동일 ownership. → **재사용**(신규 승인/반려 불필요).
- **신청자 목록 조회 없음**: 모집별 신청자 list 메서드/엔드포인트 부재(seller.controller `/service-applications` 는 별도 도메인) → 신규 GET 필요.
- 신청 entity `NeturePartnerApplication`: partnerId(user id) · partnerName(nullable) · status(pending/approved/rejected) · appliedAt · decidedAt · reason. 신청자 정보 = users(name/email) + organization_members→organizations(org명) join.
- 프론트 approve/reject api 없음 → 추가(기존 엔드포인트 호출).
- 권한: recruitment.sellerId === req.user.id (approve 와 동일 패턴).

## 2. 변경 내용

**Backend (3)**
| 파일 | 변경 |
|------|------|
| `.../neture/services/partner-contract.service.ts` | `getRecruitmentApplications(recruitmentId, sellerUserId)` — 소유권 검증(미존재/타 공급자 → null) + 신청자 join(users name/email, org subquery) + 모집 요약 |
| `.../neture/neture.service.ts` | `getRecruitmentApplications` 파사드 |
| `.../neture/controllers/partner-recruitment.controller.ts` | `GET /partner/recruitments/:recruitmentId/applications`(requireActiveSupplier, null→404) |

**Frontend (4)**
| 파일 | 변경 |
|------|------|
| `web-neture/src/lib/api/supplier.ts` | 타입(`RecruitmentApplication`/`RecruitmentDetail`) + `getApplications`/`approveApplication`/`rejectApplication`(기존 엔드포인트 재사용) |
| `web-neture/src/pages/supplier/SupplierRecruitmentDetailPage.tsx` | **신규** 상세(모집 요약 + 신청자 테이블 + pending 승인/반려 + refresh) |
| `web-neture/src/pages/supplier/SupplierRecruitmentsPage.tsx` | 행에 "신청자 보기" → 상세 이동 |
| `web-neture/src/App.tsx` | `/supplier/recruitments/:recruitmentId` route |

## 3. 데이터/API

- `GET /api/v1/neture/partner/recruitments/:recruitmentId/applications` → `{ recruitment:{id,productName,serviceId,serviceName,commissionRate,consumerPrice,status,createdAt}, applications:[{id,partnerId,partnerName,partnerEmail,organizationName,status,appliedAt,decidedAt,reason}] }`. 소유권 위반/미존재 → 404.
- 승인: `POST /neture/partner/applications/:id/approve`(재사용) → 계약/RBAC + **C bridge**(allowedSellerIds + OPL).
- 반려: `POST /neture/partner/applications/:id/reject`(재사용).
- 라우트: `/mine`(GET) · `/:recruitmentId/applications`(GET) · `/recruitments`(GET·POST) 세그먼트 수 상이 → 충돌 없음.

## 4. 권한/소유권

- 목록·승인·반려 모두 **recruitment.sellerId === req.user.id** 검증(목록=서비스, 승인/반려=기존 service). 타 공급자 모집/신청 접근 → 목록 404, 승인/반려 `NOT_RECRUITMENT_OWNER`(403, 기존).

## 5. C bridge 영향

- **무변경.** 승인 버튼은 기존 `approvePartnerApplication` 호출 → 기존 `bridgeRecruitmentToOrderable`(allowedSellerIds + OPL best-effort) 그대로 동작. 본 WO 는 bridge·계약·RBAC·OPL 정책 미수정.

## 6. 제외 범위 (WO 준수)

모집 마감(close) / entity 확장 / PRIVATE offer 자동생성 / 가격 구조 / bridge·계약·RBAC·OPL 재설계 / 이벤트·펀딩 / migration. **모두 미수행.**

## 7. 검증

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~11s)` ✅
- **정적:** 신규 GET/상세 페이지/route/링크. 승인·반려는 기존 엔드포인트 재사용(신규 0). bridge/계약/RBAC/가격 무변경. 소유권 일관(sellerId===user id).
- **browser/DB smoke:** 미수행 — dev·인증 guard + 모집/신청 데이터 의존. **배포 후 권장:** 공급자 → 모집 현황 → "신청자 보기" → 신청자 목록 → pending 승인(approved 전환 + C bridge: allowedSellerIds/OPL) → pending 반려(rejected) → 카운트 일관 → 타 공급자 모집 id 접근 404.

## 8. 완료 판정 / 후속

**PASS.** 공급자 모집 상세·신청자 심사(목록 + 승인/반려) 화면. 승인 시 기존 C bridge 흐름 사용. 소유권 격리, bridge/계약/가격 무변경.

**커밋:** path-specific 8파일 · `<commit>`.
**후속(선택):** 모집 마감(close) 액션 / 반려 사유 입력 UX 개선 / 신청자 organization 상세 / PRIVATE offer 자동생성.

판매자 모집 = **생성 → 현황 → 신청자 확인 → 승인/반려 → C bridge** 까지 공급자 화면에서 연결 완료.

---

*Date: 2026-06-16 · end-to-end PASS · 공급자 모집 신청자 심사(GET applications + 상세 페이지, 승인/반려 기존 API 재사용). 소유권 sellerId===user id, 승인 시 C bridge. DB/bridge/가격 무변경. typecheck 0 · build ✓.*
