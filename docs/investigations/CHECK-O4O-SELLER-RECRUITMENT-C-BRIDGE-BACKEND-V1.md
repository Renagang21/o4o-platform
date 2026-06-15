# CHECK-O4O-SELLER-RECRUITMENT-C-BRIDGE-BACKEND-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-BACKEND-V1
> **유형:** backend bridge — 모집 승인 시 계약/RBAC 유지 + `allowedSellerIds` 갱신 + 판매자 org OPL 생성으로 "주문 가능한 모집 제품" 완성. DB/migration/UI **무변경**.
> **결과: PASS — `approvePartnerApplication` 에 best-effort 브리지 추가(`bridgeRecruitmentToOrderable`). offer 해소(master_id+공급자 user_id) → 의약품 gate 재확인(GAP 보강) → allowedSellerIds(USER id) += 판매자(조달 주문 가능화) → 판매자 org OPL 생성(is_active=true, price=NULL, source_type='seller_recruitment'). 계약/RBAC 무변경, idempotent, 가격 구조 변경 0. api-server typecheck 0.**
> 선행: `IR-O4O-SELLER-RECRUITMENT-C-BRIDGE-IMPLEMENTATION-AUDIT-V1`(7888cddc1) — 2026-06-15

---

## 1. 4개 정책 결정 (확정 반영)

| 결정 | 확정값 | 근거 |
|------|--------|------|
| ① allowedSellerIds 기준 | **USER id** (= partnerId) | `seller.controller.ts:87` req.user.id, `getAvailableSupplyProducts` 가 `userId = ANY(allowed_seller_ids)` 로 조달 gate |
| ② OPL 생성 시점 | **모집 승인 시 자동** | 승인 핸들러 내 best-effort |
| ③ OPL is_active | **true** + source_type='seller_recruitment' | market-trial OPL 선례(`marketTrialOperatorController:1193` is_active=true+source) 동형. 모집 승인=주문/노출 의도 |
| ④ 가격 | **OPL.price=NULL** (옵션 A 유지) | freeze 정합, 모집별 가격 필드 미생성 |

## 2. 핵심 조사 발견 (구현 근거)

- **조달 주문 가능화 = allowedSellerIds 만으로 달성.** 판매자 조달 경로 `seller.service.ts getAvailableSupplyProducts` 는 `supplier_product_offers` 직접 조회(PRIVATE → `$1=ANY(allowed_seller_ids)`), **OPL 미참조**. 즉 OPL 없이도 allowedSellerIds 추가 시 판매자가 조달 주문 가능. OPL 은 판매자 **org 매장 listing**(별도 축).
- **offer 해소**: recruitment 에 offerId 없음 → `master_id(=recruitment.productId)` + 공급자 `user_id(=recruitment.sellerId)` 로 `neture_suppliers` JOIN 역추적, PRIVATE·APPROVED 우선 1건.
- **의약품 gate GAP**: 모집은 `createSupplierOffer` 미경유 → 의약품→약국 서비스 gate 미적용. 브리지에서 `ServiceAudienceService.getPharmacyAudienceResolver()` 로 재확인(보강).
- 승인 흐름: 계약/대시보드는 txn(188-233), RBAC 는 txn 밖 best-effort. **브리지도 txn 밖 best-effort** — 계약/RBAC 보존(브리지 실패해도 승인 유지).

## 3. 변경 내용 (1 파일, backend only)

`apps/api-server/src/modules/neture/services/partner-contract.service.ts`:
- import `ServiceAudienceService`.
- `approvePartnerApplication`: RBAC 블록 직후 `try { await this.bridgeRecruitmentToOrderable(recruitment, partnerId) } catch { log }` (승인은 유지).
- 신규 private `bridgeRecruitmentToOrderable(recruitment, partnerUserId)`:
  1. offer 해소(master_id + 공급자 user_id, PRIVATE·APPROVED 우선) — 없으면 skip+warn.
  2. 의약품 gate: `is_regulated` && !pharmacyAudience(serviceKey) → skip+warn.
  3. allowedSellerIds idempotent add(`includes` 체크 후 `array_append`).
  4. partner org 해소(`organization_members user_id … left_at IS NULL`) — 없으면 OPL skip+warn(allowedSellerIds 는 적용).
  5. OPL INSERT(is_active=true, price=NULL, source_type='seller_recruitment', source_id=recruitment.id) `ON CONFLICT (org,service_key,offer_id) DO NOTHING`.
- `serviceKey = recruitment.serviceId || 'neture'`.

## 4. idempotency / 안전성

- 재승인: 기존 status≠PENDING 차단(불변).
- allowedSellerIds: `includes` 가드 → 중복 없음.
- OPL: `ON CONFLICT DO NOTHING` → 재실행 안전.
- 브리지 best-effort(try/catch) → 실패해도 계약/RBAC/승인 유지. 부분 적용(allowedSellerIds 만) 시에도 재실행으로 OPL 보완.
- **DB/migration 무변경** — 선행 테이블/컬럼(allowed_seller_ids, organization_product_listings.source_type varchar(50) 무제약) 재사용.

## 5. 의약품 service audience gate 영향

- 모집 경로 gate GAP 를 **본 WO 가 보강**: 규제 상품이 비약국 serviceKey 로 모집 연결 시 브리지 skip(주문 가능화 차단)+warn. 기존 `ServiceAudienceService` 재사용, 신규 gate/reason 없음.
- serviceId null → 'neture'(비약국) → 규제 상품이면 차단(보수적·안전).

## 6. 가격 정책 영향

- OPL.price = **NULL**(매장/운영자 추후 설정). offer.priceGeneral 강제 주입 없음. 모집별 가격 필드/테이블 없음. **freeze 미개정.**

## 7. 제외 범위 (WO 준수)

모집 생성 UI / 제품목록 recruit action ready 전환(→ UX WO) / 가격 구조·side table / 이벤트·펀딩 / Product·Offer·Approval 대규모 변경 / migration. **모두 미수행.**

## 8. 검증

- **api-server:** `pnpm --filter @o4o/api-server type-check` → `tsc --noEmit` **0 errors** ✅
- **frontend:** 변경 없음(backend bridge only) → web-neture 미실행(무관).
- **정적:** 승인 txn(계약/대시보드)·RBAC 불변. 브리지는 txn 밖 best-effort. raw SQL(offer 해소/allowedSellerIds/org/OPL) idempotent. source_type varchar(50) 무제약 확인.
- **browser/DB smoke:** 미수행 — dev·인증 guard + 모집 데이터 외부 seed(IR §위험 B). **배포 후 권장:** ① 모집 신청 승인 → (read-only) `supplier_product_offers.allowed_seller_ids` 에 partner user 추가·`organization_product_listings` 에 source_type='seller_recruitment' row 확인 ② 판매자 `/available-supply-products` 에 해당 제품 노출 ③ 의약품+비약국 모집 시 브리지 skip 로그 ④ 재승인/중복 idempotent.

## 9. 완료 판정 / 후속

**PASS.** 모집 승인 시 allowedSellerIds(조달 주문 가능화) + org OPL(매장 listing) 생성, 의약품 gate 보강, 계약/RBAC·가격 무변경, idempotent best-effort.

**커밋:** path-specific 2파일(코드 + CHECK) · `<commit>`.
**차기:** `WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-UX-V1`(제품목록 recruit ready 전환 + 승인 후 안내) · (별도) 모집 생성 경로 조사/구현(IR §위험 B — 현재 외부 seed).

---

*Date: 2026-06-15 · backend bridge PASS · 모집 승인 → allowedSellerIds(USER id)+판매자 org OPL(is_active=true, price=NULL) 생성, 의약품 gate 재확인 보강. 계약/RBAC·가격·DB 무변경, idempotent best-effort. api-server typecheck 0. 배포 후 DB smoke 권장.*
