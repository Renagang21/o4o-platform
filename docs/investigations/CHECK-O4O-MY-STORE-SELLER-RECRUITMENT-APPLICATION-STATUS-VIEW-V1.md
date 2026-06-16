# CHECK-O4O-MY-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1

> **작업명:** WO-O4O-MY-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
> **유형:** end-to-end (backend GET + 파트너(내 매장) 화면) — 판매자 본인 모집 신청 현황 + 알림 targetUrl 연결. DB/migration **무변경**.
> **결과: PASS — `GET /partner/applications/mine`(partnerId=req.user.id, recruitment join + contract 파생 참여 해지) + `/partner/recruitment-applications` 화면(PartnerSpaceLayout "신청·승인 현황") + 승인/반려/참여해지 알림 metadata.targetUrl 연결. My Page 아닌 파트너(내 매장) 영역. api-server typecheck 0 · web-neture build ✓.**
> 선행: `WO-...-SELLER-NOTIFICATION-V1`(e953e96c7) · `WO-...-PARTICIPATION-TERMINATION-V1`(65549bbfa) — 2026-06-16

---

## 1. 조사 결과

- **판매자 본인 신청 목록 API 없음** → 신규 `GET /partner/applications/mine` 필요.
- **파트너(내 매장) 영역 = `PartnerSpaceLayout`(`/partner/*`)** — 신청 판매자의 홈(Overview/Products/Marketing/Finance). `/partner/dashboard`·`/partner/products` 등. My Page 아님 → 여기에 "신청·승인 현황" 추가.
- `partnerRecruitmentApi`(partner.ts) 존재 → `listMine` 확장.
- **알림 센터가 `metadata.targetUrl` 로 이동**(`NetureGlobalHeader.tsx:62`) → 화면 생성으로 **알림 targetUrl 안전 연결 가능**(직전 WO 에서 dead link 회피로 생략했던 것).
- 참여 해지 파생: 공급자 측(`getRecruitmentApplications`)과 동일하게 `neture_seller_partner_contracts.contract_status` 서브쿼리.

## 2. 변경 내용

**Backend (3)**
| 파일 | 변경 |
|------|------|
| `.../neture/services/partner-contract.service.ts` | `getApplicationsForPartner(partnerUserId)` — application+recruitment join, contract_status 파생(`participationTerminated`). + `notifyApplicant` metadata 에 `targetUrl='/partner/recruitment-applications'` 추가 |
| `.../neture/neture.service.ts` | `getPartnerApplications` 파사드 |
| `.../neture/controllers/partner-recruitment.controller.ts` | `GET /partner/applications/mine`(requireAuth, userId=req.user.id) |

**Frontend (4)**
| 파일 | 변경 |
|------|------|
| `web-neture/src/lib/api/partner.ts` | `partnerRecruitmentApi.listMine` + `PartnerApplication` 타입 |
| `web-neture/src/pages/partner/PartnerRecruitmentApplicationsPage.tsx` | **신규** 신청·승인 현황(상태 파생 + 안내 문구, 조회 전용) |
| `web-neture/src/App.tsx` | `/partner/recruitment-applications` route(PartnerSpaceLayout 하위) |
| `web-neture/src/components/layouts/PartnerSpaceLayout.tsx` | 사이드바 "신청·승인 > 신청·승인 현황" |

## 3. 데이터/API

- `GET /api/v1/neture/partner/applications/mine` → `[{ applicationId, recruitmentId, productId, productName, supplierName, serviceId, status(pending|approved|rejected), participationTerminated, appliedAt, decidedAt, reason }]`. 필터: `partner_id = req.user.id`(본인만). 라우트: `/mine`(GET) — POST `/partner/applications`·`/partner/applications/:id/*` 와 충돌 없음.
- 알림 targetUrl: 승인/반려/참여해지 알림 metadata 에 `/partner/recruitment-applications` → 클릭 시 현황 화면 이동.

## 4. 상태 표시 정책

| 조건 | 표시 | 안내 |
|------|------|------|
| pending | 심사 대기 | 공급자가 신청 내용을 검토 중 |
| approved + contract != terminated | 승인됨 | 조달 가능한 상품에서 확인 |
| approved + contract = terminated | 참여 해지됨 | 조달 가능 상태 종료, 기존 주문 이력 유지 |
| rejected | 반려됨 | 반려 사유 표시 |

- 금지 표현("즉시 판매"/"계약 해지") 미사용.

## 5. My Page 가 아닌 내 매장(파트너)에 둔 이유

- 판매자 모집 신청 = 개인 프로필 이력이 아니라 **매장/판매자 조직의 조달 참여 신청 상태** → 업무 화면. PartnerSpaceLayout(/partner/*)이 정본. My Page 는 알림/계정 역할만(본 WO 미변경).

## 6. 제외 범위 (WO 준수)

My Page 정본 화면 / 새 알림 시스템·이메일·SMS / 신청 취소·참여 재개 / 공급자 승인·반려 화면 변경 / bridge·allowedSellerIds·OPL·계약·RBAC·가격 / 모집 entity 확장 / migration. **모두 미수행.** (다른 세션 WIP `connection.ts`/`entities/index.ts` 미접촉.)

## 7. 검증

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~11s)` ✅
- **정적:** 신규 GET/화면/route/메뉴. 본인(partner_id=req.user.id) 필터 → 타 판매자 미노출. 참여 해지 contract 파생(공급자 측과 동일). 알림 targetUrl=신규 route(존재 확인). 기존 승인/반려/해지/bridge 무변경.
- **browser/DB smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** 판매자 로그인 → 파트너 "신청·승인 현황" → 본인 신청 목록(pending/approved/rejected/참여해지) + 안내 문구 → 타 판매자 미노출 → 알림 클릭 시 현황 화면 이동.

## 8. 완료 판정 / 후속

**PASS.** 판매자 본인 모집 신청 현황(내 매장/파트너 영역) + 알림 targetUrl 연결. 조회 전용, My Page 미변경, 정책 무변경, migration 0.

**커밋:** path-specific 8파일 · `<commit>`.
**후속(선택):** 이메일 알림 / 신청 취소(판매자) / KPA·GP·KCos 매장 측에도 동일 현황 노출(서비스별 매장 앱) / 모집 entity 확장.

판매자 모집 = 생성 → 현황 → 신청자 심사 → C bridge → 마감↔재개 → 참여 해지 → 판매자 알림 → **판매자 신청 현황 화면**까지 양측 가시성 확보.

---

*Date: 2026-06-16 · end-to-end PASS · 판매자 본인 신청 현황(GET /partner/applications/mine + /partner/recruitment-applications 파트너 화면 + 알림 targetUrl). My Page 아닌 내 매장(파트너) 영역. 조회 전용, 정책/migration 무변경. typecheck 0 · build ✓.*
