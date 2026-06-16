# CHECK-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1
> **유형:** end-to-end (backend POST + UX modal) — 공급자가 제품 목록에서 판매자 모집 생성. DB/migration **무변경**.
> **결과: PASS — `POST /partner/recruitments`(공급자 모집 생성) + 제품목록 recruit action `ready:true` + 생성 modal. PRIVATE offer 만 허용(차단 가드), 의약품→약국 서비스 gate 재사용, sellerId=공급자 user id(C bridge 전제) 보장, productId=master_id. 가격 구조 변경 0(commissionRate/consumerPrice=모집 commission/참조). UNIQUE(productId,sellerId) 충돌 409. api-server typecheck 0 · web-neture build ✓.**
> 선행: `IR-O4O-SELLER-RECRUITMENT-CREATION-FLOW-AUDIT-V1`(5a0a2e488) · `WO-...-C-BRIDGE-BACKEND-V1`(8e5402e81) — 2026-06-15

---

## 1. 3개 결정 (확정 반영)

| 결정 | 확정값 | 구현 |
|------|--------|------|
| ① distributionType | **PRIVATE 기준** | offer 가 PRIVATE 일 때만 생성(아니면 `OFFER_NOT_PRIVATE` 차단) |
| ② offer 부재 시 | **차단**(PRIVATE offer 필요, 자동생성 후속) | offer 미해소 `OFFER_NOT_FOUND` / 비-PRIVATE `OFFER_NOT_PRIVATE` |
| ③ serviceId/gate | **공급자 선택 + 의약품 gate** | modal serviceKey 필수, 규제 상품 → `isPharmacyAudienceService` 재사용 |

## 2. 변경 내용

**Backend (3)**
| 파일 | 변경 |
|------|------|
| `.../neture/services/partner-contract.service.ts` | `createRecruitment(sellerUserId, input)` — offer 해소(master_id+공급자 user_id, PRIVATE·APPROVED 우선) · PRIVATE 검증 · 의약품 gate · UNIQUE 충돌 · sellerId=user id/productId=master_id/serviceId=serviceKey 채움 |
| `.../neture/neture.service.ts` | `createPartnerRecruitment` 파사드 |
| `.../neture/controllers/partner-recruitment.controller.ts` | `POST /partner/recruitments`(requireAuth + requireActiveSupplier), reason→status/message 매핑 |

**Frontend (4)**
| 파일 | 변경 |
|------|------|
| `web-neture/src/lib/api/supplier.ts` | `supplierRecruitmentApi.create` (`POST /neture/partner/recruitments`) |
| `web-neture/src/lib/supplierProductTypes.ts` | recruit `ready:false→true`, 라벨 "판매자 모집 연결"(준비중 제거) |
| `web-neture/src/components/supplier/RecruitmentCreateModal.tsx` | **신규** 생성 modal(serviceKey 선택 + 수수료율 + 소비자가 참조 + PRIVATE 안내) |
| `web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 후속 작업 드롭다운 recruit → modal open(navigate 대신), modal 렌더, 생성 후 toast |

## 3. C bridge 호환성 (핵심)

- 생성 시 **sellerId = req.user.id**(공급자 user id) — bridge offer 해소(`ns.user_id = sellerId`) 전제 충족.
- **productId = master_id**, **serviceId = 선택 serviceKey** — bridge 가 읽는 3필드 정확히 채움.
- 모집 대상 offer 가 PRIVATE 이므로 승인 시 bridge 의 allowedSellerIds gate(PRIVATE 한정) 유효.
- → 생성→신청→승인→bridge end-to-end 정합.

## 4. 권한 / gate

- `requireActiveSupplier`(approve/reject 동형) + offer 소유권(`ns.user_id=sellerUserId` JOIN). 타 공급자 제품 모집 불가.
- 의약품/규제 상품: 생성 시 `ServiceAudienceService.getPharmacyAudienceResolver()` 로 serviceKey 약국 대상 검증(신규 gate/reason 없음). + 프론트: DRUG 제품은 `getAllowedOfferActions` restricted 로 드롭다운 미노출(이중 방어).

## 5. 가격 정책 영향

- `commissionRate`(0~100 clamp) / `consumerPrice`(≥0) 는 **모집 commission/참조값** — offer.priceGeneral·OPL 가격과 별개. NeturePriceArchitectureFreeze 무관, **가격 구조/테이블 변경 0**.

## 6. 입력값

- 공급자 입력: serviceKey(필수) · commissionRate(선택, default 0) · consumerPrice(선택, default 0).
- 자동: productId(masterId) · productName · sellerId(user id) · sellerName(org name fallback '공급자') · manufacturer.
- entity thin(제목/기간/모집수 컬럼 없음) → 1차 최소 생성. 후속 entity 확장은 별도 WO.

## 7. 제외 범위 (WO 준수)

가격 구조·모집별 가격 필드 / OPL·allowedSellerIds bridge 변경 / 계약·RBAC 승인 로직 / 이벤트·펀딩 / 대규모 UI 재설계 / migration / PRIVATE offer 자동생성. **모두 미수행.**

## 8. 검증

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~30s)` ✅
- **정적:** 생성은 신규 POST, 기존 browse/apply/approve/reject·bridge·계약 무변경. DRUG 제품 드롭다운 미노출(restricted) 유지. UNIQUE 충돌 409, reason→메시지 매핑.
- **browser/DB smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** ① PRIVATE 비의약품 제품 행 "판매자 모집 연결" → modal → 서비스 선택 → 생성(201) ② 비-PRIVATE 제품 시 OFFER_NOT_PRIVATE 안내 ③ 중복 생성 409 ④ (read-only) `neture_partner_recruitments` row(sellerId=공급자 user id, productId=master_id) 확인 ⑤ 생성→신청→승인 시 C bridge(allowedSellerIds/OPL) 동작.

## 9. 완료 판정 / 후속

**PASS.** 공급자 제품→판매자 모집 생성 end-to-end(backend POST + modal). PRIVATE 전제·의약품 gate·C bridge 호환 필드 보장, 가격/계약/RBAC/DB 무변경.

**커밋:** path-specific 8파일 · `<commit>`.
**후속(선택):** PRIVATE offer 자동생성(결정 2 후속) · 모집 entity 확장(제목/기간/모집수) · 공급자 모집 현황 화면 · DRUG 제품 모집 UI 경로(현재 restricted).

---

*Date: 2026-06-15 · end-to-end PASS · 공급자 판매자 모집 생성(POST /partner/recruitments + 제품목록 modal). PRIVATE 전제·의약품 gate·sellerId=user id(C bridge 전제). 가격/계약/DB 무변경. typecheck 0 · build ✓. 배포 후 smoke 권장.*
