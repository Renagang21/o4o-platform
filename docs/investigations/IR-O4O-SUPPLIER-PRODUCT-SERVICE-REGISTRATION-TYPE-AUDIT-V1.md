# IR-O4O-SUPPLIER-PRODUCT-SERVICE-REGISTRATION-TYPE-AUDIT-V1

> **유형**: Investigation (read-only) — 제품이 서비스에 연결되는 구조(운영자 승인 / B2B / 판매자 모집 / 가격 / OPL) 감사. 후속 구현 WO 분할 판단용. 코드/DB/route/UI **무변경**.
> **결론(요약): 3개 등록 유형은 이미 `distributionType`(PUBLIC/SERVICE/PRIVATE) + `OfferServiceApproval`(서비스별 승인) + `OrganizationProductListing`(승인 시 자동 생성, is_active=false) 파이프라인으로 대부분 모델링되어 있다.** 핵심 gap 3가지: ① **판매자 모집이 이중 구현**(offer `PRIVATE`+allowedSellerIds vs 별도 `NeturePartnerRecruitment` 서브시스템 — OPL/offer 미연결) → 정합 필요. ② **B2B 는 콘텐츠 전용**(businessShort/DetailDescription)이며 별도 listing/채널 없음 = 사실상 "기본 공급 오퍼(priceGeneral) + B2B 설명". ③ **채널별/서비스별 차등 가격은 의도적으로 동결**(NeturePriceArchitectureFreeze 에서 channel_price 제거) — 현재 가격은 offer 단일가 + OPL per-org override 뿐. → **신규 구조 추가 전에 ①②③ 정책 결정이 선행되어야 함.** 제품 목록 후속 action UI 는 이미 구현(supply/event/funding ready, recruit=stub).
> **선행/근거**: `WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1`(5332d745b) · `WO-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1`(15318e471).
> **작성일**: 2026-06-15

---

## 1. SupplierProductOffer 구조

`apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts`

- **distributionType** (`OfferDistributionType`, 23-27): `PUBLIC` / `SERVICE` / `PRIVATE`. 파생 규칙 `deriveDistributionType(isPublic, serviceKeys)`(offer.service.ts:30-34): isPublic→PUBLIC · serviceKeys≥1→SERVICE · 그 외→PRIVATE.
- **serviceKeys** (text[]): 대상 서비스. **PRIVATE** 은 `allowedSellerIds`(text[])로 특정 판매자 제한(`PRIVATE_REQUIRES_SELLER_IDS` 검증, offer.service.ts:1012).
- **가격**: `priceGeneral`(기본 공급가=B2B 공급가) · `priceGold`/`pricePlatinum`(참조용, **주문 미적용**) · `consumerReferencePrice`. **서비스별/채널별 가격 컬럼 없음.**
- **설명**: `consumerShort/DetailDescription`(B2C) · `businessShort/DetailDescription`(B2B).
- **상태**: `approvalStatus`(PENDING/APPROVED/REJECTED) · `isActive`(default false) · `isPublic`.
- 생성: `createSupplierOffer`(offer.service.ts:775~) — PENDING/isActive=false. 수정: `updateSupplierOffer`(serviceKeys 사실상 immutable).

## 2. ProductApproval / 승인 흐름

**두 엔티티 공존:**
- `OfferServiceApproval`(table `offer_service_approvals`, entity 21-54) — **offer × service_key 1행**. 승인 SSOT.
- `ProductApproval`(`apps/api-server/src/entities/ProductApproval.ts:33-88`, table `product_approvals`) — organization × service_key × approval_type(SERVICE/PRIVATE). KPA 2차 심사 브리지.

**흐름:** `submitForApproval`(offer.service.ts:411-510) → `filterApprovalEligibleServiceKeys`(glycopharm/kpa-society/k-cosmetics만) → `createPendingApprovals`(offer_service_approvals pending) → 운영자 승인(offer-service-approval.service.ts:438) → `syncOfferFromServiceApprovals`(324-432): **1개라도 approved → offer.approvalStatus=APPROVED + isActive=true**, PUBLIC→`autoExpandPublicProduct`, SERVICE→`autoExpandServiceProduct`, kpa-society→`product_approvals` 생성. REJECT 시 OPL/`product_approvals` 캐스케이드 해제.
- **서비스별 승인**(offer-wide 아님). registration-type 구분은 distributionType 으로 표현.

## 3. OrganizationProductListing(OPL) 연결

`apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts:24-147`

- 키: (organization_id, service_key, offer_id). `master_id`/`offer_id`. **`price`/`event_price`**(org별 override). `is_active` **default false**, `status` default 'pending'.
- 생성: `auto-listing.utils.ts` — 승인 시 `autoExpandPublicProduct`(27-60, 전 활성 org) / `autoExpandServiceProduct`(72-108, 해당 service enrolled org). 신규 org 가입 시 `autoListPublic/ServiceProductsForOrg`(118-202).
- **승인 시 자동 생성되나 is_active=false → 매장/운영자가 가격 설정 후 활성화**(round-trip). **PRIVATE 은 autoExpand 대상 아님**(별도 처리 없음).

## 4. B2B 흐름

- 화면 `SupplierB2BContentPage.tsx` + `B2BContentDrawer.tsx` → `businessShort/DetailDescription` **편집만**. backend `PATCH /supplier/products/:id/business-content`(supplier-product.controller.ts:231) → `updateBusinessContent`.
- **채널/서비스/store 연결 없음 · OPL 생성 없음 · 구매자(약국/매장) B2B 목록 UI 없음.**
- **판정: STUB(콘텐츠 전용).** 실질 "B2B 공급"은 별도 유형이 아니라 **기본 공급 오퍼(priceGeneral) + B2B 설명**. → "B2B 등록"을 독립 등록 유형으로 만들지, 기본 오퍼의 콘텐츠 측면으로 둘지 **정책 결정 필요**.

## 5. 판매자 모집 흐름

**이중 구현(미연결):**
- (A) **offer 레벨**: `distributionType=PRIVATE` + `allowedSellerIds`. 단 PRIVATE 은 autoExpand 미적용 → OPL 자동연결 없음.
- (B) **별도 서브시스템**: `NeturePartnerRecruitment`/`NeturePartnerApplication`/`NetureSellerPartnerContract` + `partner-recruitment.controller.ts`(모집 게시→신청→승인→계약). 승인 시 **계약 생성 + RBAC 'partner' role + 대시보드 아이템**(partner-contract.service.ts:167-256). **OPL 생성·offer PRIVATE 연결 없음.**
- 프론트: 공급자 "모집 생성" 페이지 부재(운영자/DB), 파트너용 `RecruitingProductsPage`, 가이드 페이지만. 제품목록 `recruit` action = **ready:false(stub)**.
- **판정: PARTIAL + 이중화.** (A)offer PRIVATE 과 (B)recruitment 서브시스템이 **별개** → "판매자 모집 제품"을 어느 축으로 통일할지 **정책 결정 필요**(핵심 gap).

## 6. 가격 구조

- 저장: `SupplierProductOffer.priceGeneral`(공급 단일가, 주문 적용) + Gold/Platinum(참조) · `OrganizationProductListing.price`/`event_price`(org별 override). ProductMaster 가격 없음.
- 주문: `checkout.service.ts:32-44` `OrderItem.unitPrice` 를 **호출자(cart/checkout)가 결정**(OPL.price 또는 offer.priceGeneral). checkout 내부엔 서비스/채널 분기 없음.
- **서비스별/채널별 가격 = 부재(의도적).** `20260228200001-NeturePriceArchitectureFreeze` 에서 `channel_price` 제거. 현재 차등은 **org별 OPL.price** 뿐.
- → 요구된 "B2B/서비스별/판매자모집 가격" 차등제는 **현 구조와 충돌**(price freeze). 가격 WO 는 freeze 정책 재검토 선행 필요.

## 7. 제품 목록 후속 action 구조

- `SupplierProductsPage.tsx:856-912` 행 action(dropdown) — `SUPPLIER_OFFER_ACTION_META`(supplierProductTypes.ts:112-117) 기반. `buildOfferActionUrl`(257-268)로 product context(supplierProductId/masterId/...) query 전달. `getAllowedOfferActions`/`getDrugSupplyGate` 로 의약품 차단.
  - supply `/supplier/supply-offers` **ready** · event `/supplier/event-offers` **ready** · funding `/supplier/market-trial/new` **ready** · **recruit ready:false(path 없음)**.
- **판정: IMPLEMENTED.** UI 인프라 완비 — 후속은 action 메타/백엔드에 붙으며 목록 UI 재작업 불요. recruit 만 `ready:true`+path 추가하면 연결.

## 8. 의약품 service audience gate 영향

- 현 적용: `createSupplierOffer`(등록 차단) + `submitForApproval`(방어), `isRegulated` 트리거 + `getPharmacyAudienceResolver()`(DB).
- supply 오퍼는 createSupplierOffer 경유 → gate 적용. **event-offer / market-trial(funding) / recruitment 서브시스템은 별도 경로(SupplierProductOffer 미생성 가능) → gate 미적용 가능성**(의약품 이벤트/펀딩/모집 시 누락 위험). 후속 흐름에 `isPharmacyAudienceService` 재사용 가능(helper 존재).
- → 후속 WO 에서 event/funding/recruit 에 의약품 연결 시 gate 재적용 여부 점검 필요.

## 9. 구현됨 / 부분 / 미구현

```text
구현됨:
- distributionType(PUBLIC/SERVICE/PRIVATE) 모델
- 서비스 운영자 승인(offer_service_approvals submit→approve→sync)
- 승인 시 OPL 자동 생성(PUBLIC/SERVICE, is_active=false) + 매장 활성화 round-trip
- org별 가격(OPL.price/event_price)
- 제품 목록 후속 action UI(supply/event/funding) + 의약품 gate(supply 경로)
- 이벤트 오퍼 / 유통참여형 펀딩 route(product context prefill)

부분 구현:
- 판매자 모집: recruitment 서브시스템(계약/RBAC) O, OPL/offer PRIVATE 연결 X (이중화)
- B2B: 설명 콘텐츠 O, 채널/listing/구매자 목록 X (STUB)
- PRIVATE offer: 모델 O, autoExpand/OPL 자동연결 X

미구현:
- 서비스별/채널별 차등 가격(의도적 freeze)
- B2B 독립 등록/노출/주문 채널
- 판매자 모집 ↔ offer/OPL 통합 파이프라인
- event/funding/recruit 경로의 의약품 gate 적용
- recruit 제품목록 action(ready:false)
```

## 10. 권장 후속 WO 순서

```text
1순위 (정책 결정 IR/합의 — 구현 전 필수):
  IR-O4O-SELLER-RECRUITMENT-MODEL-RECONCILIATION-V1
   - offer PRIVATE+allowedSellerIds vs NeturePartnerRecruitment 서브시스템 중 정본 결정
  IR-O4O-B2B-REGISTRATION-MODEL-DECISION-V1
   - B2B = 기본 오퍼 콘텐츠 측면 유지 vs 독립 채널/listing 신설 결정
  IR-O4O-CHANNEL-PRICING-POLICY-REVISIT-V1
   - price freeze 하에서 차등 가격 요구를 OPL.price 확장으로 수용할지 결정

2순위 (UI 저위험, 정책과 독립):
  WO-O4O-SUPPLIER-PRODUCT-SERVICE-REGISTRATION-ACTIONS-V1
   - 제품 목록 후속 action 정비(라벨/안내/의약품 gate 표기 일관). recruit 는 1순위 결정 후.

3순위 (정책 확정 후 구현):
  WO-O4O-SUPPLIER-SERVICE-OPERATOR-APPROVED-PRODUCT-FLOW-V1 (SERVICE 승인 UX 보강 — 기반 존재)
  WO-O4O-SUPPLIER-SELLER-RECRUITMENT-PRODUCT-FLOW-V1 (1순위 결정 반영)
  WO-O4O-SUPPLIER-PRODUCT-CHANNEL-PRICING-V1 (가격 정책 확정 후)
```

## 11. 구현 시 건드리면 안 되는 영역

```text
- OfferDistributionType enum 의미(PUBLIC/SERVICE/PRIVATE)
- offer_service_approvals 승인 SSOT + syncOfferFromServiceApprovals 파생 규칙
- auto-listing(OPL 자동 생성, is_active=false round-trip)
- NeturePriceArchitectureFreeze(채널 가격 제거) — 재검토는 별도 IR/합의 필요
- checkout.service OrderItem.unitPrice 계약
- 의약품 service audience gate(createSupplierOffer/submitForApproval)
- 기존 품목군 approved gate
```

## 12. 결론

- **운영자 승인 제품 흐름은 사실상 완성**(SERVICE distributionType + offer_service_approvals + auto-OPL + 매장 활성화). 추가 구현보다 **UX 보강** 영역.
- **B2B 와 판매자 모집은 "미구현"이 아니라 "부분/이중화"** — 신규 테이블을 성급히 만들기보다 **정본 모델 결정(IR)** 이 선행되어야 충돌을 피한다.
- **차등 가격은 정책 동결과 충돌** — 가격 WO 전에 freeze 재검토 합의 필요.
- 제품 목록 후속 action UI 는 이미 준비됨(supply/event/funding) → recruit 만 정책 확정 후 연결.
- **권고**: ① 3개 정책 IR(판매자모집 정본 / B2B 모델 / 가격 동결 재검토) → ② 저위험 action 정비 WO → ③ 정책 확정 후 흐름별 구현 WO. 본 조사는 충족도/구조 확인까지 — 코드 무변경.

---

*Date: 2026-06-15 · read-only IR · 코드/DB 무변경 · 등록 유형(운영자승인/B2B/판매자모집)은 distributionType+OfferServiceApproval+OPL 로 대부분 모델링됨. gap: 판매자모집 이중화 / B2B 콘텐츠전용 / 차등가격 freeze. 신규 구조 전 정책 IR 3건 선행 권장. 후속 구현 WO 분할 제안 포함.*
