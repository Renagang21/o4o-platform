# IR-O4O-SELLER-RECRUITMENT-C-BRIDGE-IMPLEMENTATION-AUDIT-V1

> **유형**: Investigation (read-only) — 판매자 모집 C 브리지(모집 승인 시 계약 유지 + allowedSellerIds 갱신 + 판매자 org OPL 생성) 구현 전 사전 조사. 코드/DB/route/UI **무변경**.
> **결론(요약): C 브리지는 기술적으로 가능하나, 구현 전 4개 결정·2개 위험 해소 필요.** 승인 흐름은 **이미 트랜잭션**(`partner-contract.service.ts:188-233`, `AppDataSource.transaction`)이라 삽입 지점 명확(dashboard item 생성 직후, line ~232). 그러나 ① **의약품 gate GAP** — 모집은 `createSupplierOffer` 를 거치지 않아 의약품→약국 서비스 gate 미적용(승인 시 재확인 필요). ② **recruitment 생성 경로가 surfaced 코드에 없음**(외부 seed/CSV/admin) — 공급자 모집 생성 UI 부재. ③ **offer 해소**: `recruitment.productId = ProductMaster.id`(offer id 아님) → offer 는 `master_id+sellerId` 로 역추적(다중 offer 모호성). ④ **OPL 필요**: 체크아웃 PRIVATE gate 는 `allowedSellerIds`(USER id) 만 검사하나, 제품이 판매자 store 에 **노출/장바구니 진입**하려면 OPL 필요. 가격은 OPL.price=NULL(옵션 A 정합) — 가격 구조 변경 불요.
> **선행**: `IR-O4O-SELLER-RECRUITMENT-MODEL-RECONCILIATION-V1`(권고 C) · `IR-O4O-SUPPLIER-PRODUCT-SERVICE-REGISTRATION-TYPE-AUDIT-V1`(cab35f345) · 2026-06-15

---

## 1. 기존 판매자 모집 구조 (실제 코드)

**엔티티:**
- `NeturePartnerRecruitment`: `productId`(=**ProductMaster.id**, FK 없음) · `sellerId`(**USER id**=공급자) · `consumerPrice`/`commissionRate`/`serviceId`/`status`(RECRUITING|CLOSED). **offerId 없음.**
- `NeturePartnerApplication`: `recruitmentId` · `partnerId`(**USER id**=신청 판매자) · `status`(PENDING|APPROVED|REJECTED) · `decidedBy`. **organizationId 없음.**
- `NetureSellerPartnerContract`: sellerId/partnerId/recruitmentId/applicationId/commissionRate/contractStatus(ACTIVE|TERMINATED|EXPIRED).

**승인 흐름** (`partner-contract.service.ts approvePartnerApplication:168-233`):
1. (txn 밖 170-185) application/recruitment 로드 + status=PENDING + sellerId 검증.
2. **(txn 188-233 `AppDataSource.transaction`)** 중복 ACTIVE 계약 가드 → application APPROVED → `NetureSellerPartnerContract` 생성 → `NeturePartnerDashboardItem` 생성.
3. (txn 밖 235-254) ServiceMembership active + RBAC 'partner' role 부여.
- **현재 OPL/offer 연결 없음.** allowedSellerIds 갱신 없음.

**모집 생성 경로**: surfaced 서비스 코드에 **NeturePartnerRecruitment INSERT 없음** — 외부(CSV/admin/batch)로 seed 추정. 공급자용 "모집 생성" 화면 부재(파트너용 `RecruitingProductsPage` 만).

## 2. C 브리지 구현 가능성

| 단계 | 가능? | 근거 |
|------|:----:|------|
| 승인 시 계약 처리 유지 | ✅ | 기존 txn 그대로 |
| allowedSellerIds 갱신 | ✅ (조건부) | offer 를 `master_id+sellerId` 로 해소 후 partnerId(USER id) 추가. **offer 다중/distributionType 결정 필요** |
| seller org 확보 | ✅ (조건부) | application.partnerId(USER) → `organization_members WHERE user_id=$1 AND left_at IS NULL`. **org 없을 때 정책 필요** |
| OPL 생성 | ✅ | raw INSERT(autoExpand 패턴), `ON CONFLICT (org,service_key,offer_id) DO NOTHING` |

## 3. 적용 지점

- **backend**: `partner-contract.service.ts` 승인 txn 내부, **dashboard item 생성 직후(line ~232, `});` 전)**. 모든 데이터(recruitment.productId/sellerId, application.partnerId) 가용. txn 원자성 확보(실패 시 전체 rollback).
- **controller/route**: `partner-recruitment.controller.ts POST /partner/applications/:id/approve`(무변경, service 만 확장).
- **frontend**: 제품목록 `recruit` action `ready:false→true`(별도 UX WO), 승인 후 "주문 가능" 안내(선택).

## 4. OPL 생성 전략

- **재사용 helper 없음** — PRIVATE 용 autoExpand 부재. raw INSERT(autoExpand.utils 템플릿).
- **필수 컬럼**: `organization_id`(파생) / `service_key`(recruitment.serviceId ?? 'neture') / `master_id`(=recruitment.productId) / `offer_id`(해소) / `is_active` / `price` / timestamps.
- **price**: **NULL**(옵션 A 정합 — 매장/운영자가 추후 설정). offer.priceGeneral 강제 주입 불요.
- **is_active**: **결정 필요** — autoExpand canonical=`false`(매장 활성화 round-trip) vs 모집 승인=즉시 주문가능 의도면 `true`. (권고: `false` 일관 — 매장 활성화 단계 유지, 단 "모집 승인=즉시 거래" 기대와 충돌 가능 → 결정 사항.)
- **unique**: `(organization_id, service_key, offer_id)` ON CONFLICT DO NOTHING → idempotent.

## 5. 트랜잭션 / idempotency

- 승인은 **이미 txn**(188-233). C 브리지를 txn 내부에 두면 원자적. RBAC(235-254)는 txn 밖(기존) — C 브리지는 txn 안 권장(계약+OPL 원자성).
- idempotency: 재승인은 status≠PENDING 으로 차단. OPL ON CONFLICT DO NOTHING. allowedSellerIds 는 `includes` 체크 후 push → 중복 안전.
- **rollback 위험**: org 미존재/offer 미해소 시 — skip+log vs 승인 실패 결정 필요(아래 §10).

## 6. 의약품 service audience gate 영향 ⚠️ (핵심 GAP)

- 모집은 `createSupplierOffer` 를 **거치지 않음**(외부 생성) → 의약품→약국 서비스 gate(offer.service.ts) **미적용**.
- 승인/OPL 생성 경로에도 gate 재확인 **없음** → **의약품이 비약국 org/서비스로 모집 연결될 위험**.
- **권고**: C 브리지 backend WO 에 gate 재확인 포함 — offer 의 `isRegulated` + 대상 service_key 가 `isPharmacyAudienceService` 인지 확인, 위반 시 OPL 생성 차단(기존 `ServiceAudienceService.getPharmacyAudienceResolver` 재사용, reason `DRUG_SERVICE_NOT_PHARMACY_AUDIENCE`).

## 7. 가격 정책 영향

- OPL.price = **NULL 기본** → 옵션 A(freeze) 정합. 모집별 가격 필드 없음/불요. **가격 구조 변경 0.** C 브리지에서 가격 제외 가능 ✅.

## 8. UI 영향

- 운영자/공급자 모집 승인 화면: 승인 API 존재(`POST /partner/applications/:id/approve`), 공급자 모집 생성 UI **부재**. 파트너 신청 화면(`RecruitingProductsPage`) 존재.
- C 브리지 backend 자체는 **UI 변경 불요**(승인 API 내부 확장). 후속 UX WO: 제품목록 recruit `ready:true` + 모집 생성 화면 + 승인 후 안내.

## 9. 권장 구현 WO

```text
WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-BACKEND-V1 (backend, 결정 확정 후)
- approvePartnerApplication txn 내부에 브리지:
  ① master_id+sellerId 로 offer 해소
  ② 의약품 gate 재확인(isRegulated + isPharmacyAudienceService)
  ③ application.partnerId → organization_members 로 org 해소
  ④ offer.allowedSellerIds 에 partnerId 추가(+distributionType 결정 반영)
  ⑤ 판매자 org OPL 생성(price=NULL, is_active=결정값, ON CONFLICT DO NOTHING)
- 가격 구조 변경 없음. RBAC/계약 기존 유지. idempotent.

WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-UX-V1 (frontend, 후속)
- 제품목록 recruit ready 전환 + 승인 후 주문 가능 안내
- (필요 시) 공급자 모집 생성 화면

제외: 가격 side table / freeze 개정 / 모집 외부 seed 경로 / B2B 채널
```

## 10. 위험 요소 / 결정 필요 (구현 전)

```text
[결정 1] offer distributionType 의미
 - 모집 승인이 offer 를 PRIVATE 로 만드는가, 아니면 distributionType 무관하게 partnerId+OPL 만 추가하는가?
 - allowedSellerIds 는 PRIVATE 에서만 체크아웃 gate 로 작동 → PUBLIC/SERVICE offer 면 allowedSellerIds 무의미.
 - (권고: 모집 대상 offer 는 PRIVATE 전제. 비-PRIVATE 면 정책 정의 필요.)

[결정 2] offer 해소 모호성
 - master_id+sellerId 로 offer 다중 가능 → 어느 offer? (APPROVED & PRIVATE 1건 전제 vs 명시 offerId 필요)
 - recruitment 에 offerId 컬럼이 없음 → 장기적으로 offerId 추가 검토(이번 범위 밖).

[결정 3] org 미존재 처리
 - 신청 판매자가 organization_members 없음 → 승인 실패 vs OPL skip+log vs org 생성.
 - (권고: skip+log + 승인은 성공 — 계약/RBAC 는 유지, OPL 은 org 확보 후. 단 "주문 가능" 기대와 충돌 안내 필요.)

[결정 4] OPL is_active 기본값
 - false(매장 활성화 round-trip, canonical) vs true(모집 승인=즉시 거래).

[위험 A] 의약품 gate GAP — 반드시 backend WO 에서 재확인(§6).
[위험 B] 모집 생성 경로 외부 seed — C 브리지는 "이미 존재하는 모집"에만 작동. 공급자 모집 생성 흐름 부재 → C 브리지 단독으로는 end-to-end 미완(별도 UX/생성 WO 필요).
```

## 11. 결론

- **C 브리지는 기술적으로 가능**: 승인 txn(188-233) 내부에 ①offer 해소 ②gate 재확인 ③org 해소 ④allowedSellerIds ⑤OPL 생성 삽입. 가격 변경 불요(OPL.price=NULL, 옵션 A).
- **단, 구현 전 4개 결정(distributionType/offer 해소/org 미존재/OPL is_active) + 2개 위험(의약품 gate GAP, 모집 생성 경로 부재) 해소 필요.**
- 특히 **모집 생성 경로가 surfaced 코드에 없어** C 브리지만으로는 end-to-end 가 완성되지 않음 — 공급자 모집 생성 흐름 유무를 먼저 확인/결정해야 실효성 있음.
- **권고**: ① 위 4개 결정 + 모집 생성 경로 확인 → ② `WO-...-C-BRIDGE-BACKEND-V1`(gate 재확인 포함) → ③ UX WO. 본 조사 범위는 확인까지 — 코드 무변경.

---

*Date: 2026-06-15 · read-only IR · 코드/DB 무변경 · C 브리지 가능(승인 txn 내부 삽입). 결정: distributionType/offer해소/org미존재/OPL active. 위험: 의약품 gate GAP(승인 시 재확인 필요) + 모집 생성 경로 부재(외부 seed). 가격 변경 불요(OPL.price=NULL, 옵션 A). offerId 부재로 master_id+sellerId 역추적.*
