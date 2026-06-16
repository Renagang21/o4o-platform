# CHECK-O4O-SELLER-RECRUITMENT-SUPPLIER-STATUS-VIEW-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-SUPPLIER-STATUS-VIEW-V1
> **유형:** end-to-end (backend GET + UX page) — 공급자가 본인이 생성한 판매자 모집 현황(상태·신청 카운트·대상 서비스·제품) 확인. DB/migration **무변경**.
> **결과: PASS — `GET /partner/recruitments/mine`(공급자 본인 모집 + 신청 카운트 전체/대기/승인/반려) + `/supplier/recruitments` 페이지 + 사이드바 "판매자 모집 > 모집 현황". sellerId=공급자 user id 필터. api-server typecheck 0 · web-neture build ✓.**
> 선행: `WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1`(d1a7b44d3) · `IR-...-CREATION-FLOW-AUDIT`(5a0a2e488) — 2026-06-16

---

## 1. 조사 (구현 전)

- 기존 `getPartnerRecruitments(filters)` 는 **seller 필터 없음**(전체 목록, public) + 신청 카운트 없음 → 공급자 본인 현황 부적합.
- 신청 카운트 집계 엔드포인트 없음. `NeturePartnerApplication`(table `neture_partner_applications`) status enum = `'pending'|'approved'|'rejected'`(lowercase).
- 공급자 사이드바(`SupplierSpaceLayout.tsx`)에 모집 관련 항목 없음 → 신규 그룹 필요.
- → backend 신규 메서드/엔드포인트 + frontend 페이지/메뉴/route 필요(작은 read 기능).

## 2. 변경 내용

**Backend (3)**
| 파일 | 변경 |
|------|------|
| `.../neture/services/partner-contract.service.ts` | `getSellerRecruitments(sellerUserId)` — `sellerId` 필터 + `neture_partner_applications` GROUP BY status 카운트(total/pending/approved/rejected) |
| `.../neture/neture.service.ts` | `getSellerRecruitments` 파사드 |
| `.../neture/controllers/partner-recruitment.controller.ts` | `GET /partner/recruitments/mine`(requireAuth + requireActiveSupplier, userId=req.user.id) |

**Frontend (4)**
| 파일 | 변경 |
|------|------|
| `web-neture/src/lib/api/supplier.ts` | `SupplierRecruitment` 타입 + `supplierRecruitmentApi.listMine()` |
| `web-neture/src/pages/supplier/SupplierRecruitmentsPage.tsx` | **신규** 현황 테이블(제품/대상 서비스/수수료율/상태/신청·대기·승인 카운트/생성일, empty state) |
| `web-neture/src/App.tsx` | `/supplier/recruitments` route(lazy) |
| `web-neture/src/components/layouts/SupplierSpaceLayout.tsx` | 사이드바 "판매자 모집 > 모집 현황" 그룹 |

## 3. 데이터/API

- `GET /api/v1/neture/partner/recruitments/mine` → `[{ id, productId, productName, serviceId, serviceName, commissionRate, consumerPrice, status, createdAt, applications:{total,pending,approved,rejected} }]`.
- 필터: `recruitmentRepo.find({ where:{ sellerId: <공급자 user id> } })`. 카운트: 단일 GROUP BY 쿼리(전 모집 id 일괄).
- 라우트 순서: `/partner/recruitments/mine`(GET) 는 별도 경로 — 기존 `/partner/recruitments`(GET list)·`POST /partner/recruitments` 와 충돌 없음.

## 4. 권한

- `requireAuth + requireActiveSupplier`(생성/승인과 동형). userId=req.user.id 로 본인 모집만 조회 → 타 공급자 모집 노출 없음.

## 5. 제외 범위

PRIVATE offer 자동생성 / 모집 entity 확장(제목·기간) / 모집 수정·마감 액션 / 신청자 상세·승인 처리 화면 / 가격 구조 / migration. **모두 미수행**(읽기 현황까지).

## 6. 검증

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~11s)` ✅ (unused import 1건 수정 후)
- **정적:** 신규 GET/페이지/메뉴/route. 기존 생성/신청/승인/bridge 무변경. 카운트 enum(lowercase) 정합. 사이드바 그룹 additive(데드링크 0 — route 동시 마운트).
- **browser/DB smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** 공급자 로그인 → 사이드바 "판매자 모집 > 모집 현황" → 본인 모집 목록·신청 카운트 표시, 모집 없을 때 empty state, 제품 목록 이동.

## 7. 완료 판정 / 후속

**PASS.** 공급자 모집 현황(상태·신청 카운트) 조회 화면. 생성→신청→승인 흐름의 운영 가시성 확보. DB/가격/기존 흐름 무변경.

**커밋:** path-specific 8파일 · `<commit>`.
**후속(선택):** 모집 상세(신청자 목록·승인/반려 액션) 화면 / 모집 마감(close) 액션 / PRIVATE offer 자동생성 / 모집 entity 확장.

---

*Date: 2026-06-16 · end-to-end PASS · 공급자 모집 현황(GET /partner/recruitments/mine + /supplier/recruitments 페이지 + 사이드바). sellerId=user id 필터 + 신청 카운트. DB/가격 무변경. typecheck 0 · build ✓. 배포 후 smoke 권장.*
