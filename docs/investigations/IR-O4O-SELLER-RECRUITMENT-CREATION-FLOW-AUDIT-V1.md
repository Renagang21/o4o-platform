# IR-O4O-SELLER-RECRUITMENT-CREATION-FLOW-AUDIT-V1

> **유형**: Investigation (read-only) — 공급자 판매자 모집 **생성** 흐름 존재 여부·최소 구현 범위 조사. 코드/DB/route/UI **무변경**.
> **결론(요약): 모집 생성 경로 전무.** `NeturePartnerRecruitment` 생성 API/service/UI **0건**(컨트롤러는 browse/apply/approve/reject 5개뿐, `recruitmentRepo.create/save`·INSERT 없음, migration seed 없음). → apply→approve→**C bridge 체인이 생성 흐름 부재로 dormant**(현재 모집은 수동 DB insert 외 생성 불가). 생성은 **frontend only 로 막힘이 아니라 backend POST 부터 신설 필요**. entity 는 thin(productId=master_id / sellerId=공급자 **user_id** / sellerName / commissionRate / consumerPrice + nullable serviceId/shopUrl/imageUrl, **title/기간/모집수 필드 없음**). 생성 시 `sellerId=req.user.id`(공급자 user id) 보장이 **C bridge offer 해소(`ns.user_id=sellerId`)의 전제**. 가격: commissionRate/consumerPrice 는 모집 commission/참조값 — **freeze 무관**(가격 tier 아님).
> **선행**: `IR-O4O-SELLER-RECRUITMENT-C-BRIDGE-IMPLEMENTATION-AUDIT-V1`(7888cddc1) · `WO-...-C-BRIDGE-BACKEND-V1`(8e5402e81) · 2026-06-15

---

## 1. 현재 모집 생성 경로 존재 여부

- **backend**: `partner-recruitment.controller.ts` 5 엔드포인트 — GET `/partner/recruiting-products`(browse) · GET `/partner/recruitments` · POST `/partner/applications`(신청) · POST `/partner/applications/:id/approve|reject`. **생성(POST recruitment) 없음.** 전 repo `recruitmentRepo.create/save`·`INSERT INTO neture_partner_recruitments`·`new NeturePartnerRecruitment` **0건**.
- **migration**: `2026020100001-CreatePartnerRecruitmentTables` = CREATE TABLE 만, **seed INSERT 없음**.
- **frontend**: 공급자 모집 생성 화면 **없음**. `RecruitingProductsPage`(파트너 browse) · `GuideBusinessSellerRecruitmentPage`(가이드)만. 제품목록 recruit action `ready:false`(`supplierProductTypes.ts:115`).
- **end-to-end**: **불가.** 모집은 수동 DB insert 외 생성 불가 → 신청/승인/bridge 전체가 dormant.

## 2. NeturePartnerRecruitment 필수 구조

```text
@Entity('neture_partner_recruitments') @Unique(['productId','sellerId'])
필수(NOT NULL): productId(=master_id) · productName · sellerId(=공급자 USER id) · sellerName
default: consumerPrice=0 · commissionRate=0 · status='recruiting'
nullable: manufacturer · shopUrl · serviceName · serviceId · imageUrl
없음: 모집 제목/설명/기간(start/end)/모집 수·제한/신청 안내 문구
```
- **product/offer/service 연결**: `productId`=ProductMaster.id (offerId 없음). serviceId=serviceKey(nullable). offer 는 미참조(bridge 가 master_id+sellerId 로 역추적).
- **C bridge 가 읽는 필드**: `productId`(master) · `sellerId`(공급자 user id) · `serviceId`(serviceKey) → 생성 시 이 3개가 정확해야 bridge 정상.

## 3. 제품 목록에서 모집 생성 가능성

- **row 식별값**(`SupplierProduct`): `id`(offer id) · `masterId` · `regulatoryType`/`drugCategory` · `priceGeneral` · `name`/`brandName`. → productId(masterId)·productName 확보 가능.
- **sellerId**: 로그인 공급자 **user id**(req.user.id) — bridge `ns.user_id=sellerId` 전제와 일치(must).
- **serviceId**: row 에 단일 serviceKey 없음(offer.serviceKeys[] 다중) → **공급자가 모집 대상 service 선택 필요**.
- **PRIVATE offer 필요 여부**: bridge 는 master_id+sellerId 로 offer 해소(PRIVATE·APPROVED 우선). 모집이 offer 를 PRIVATE 로 강제하는지는 **결정 필요**(아래 §10). 현재 bridge 는 비-PRIVATE offer 에도 allowedSellerIds 추가(무해)+OPL 생성하나, PRIVATE 이 아니면 allowedSellerIds gate 무의미.

## 4. 권한 / 소유권

- **공급자 auth**: `requireAuth` + `requireActiveSupplier`(approve/reject 이미 사용, supplierId=neture_suppliers.id 주입) 재사용.
- **소유권**: 제품(master)이 이 공급자 offer 인지 확인 — `supplier_product_offers WHERE master_id=$1 AND supplier_id=<this supplier>`. (생성 가드 신규 필요.)
- **service audience gate**: 규제 상품이면 serviceId 가 약국 대상이어야 — `ServiceAudienceService.isPharmacyAudienceService` 재사용(bridge 와 동일, 생성 시점 조기 차단 권장).
- operator/admin 생성: 현재 경로 없음. 공급자 self-create 가 자연(모집 주체=공급자).

## 5. UI 후보

- 제품목록 `후속 작업` 드롭다운 recruit `ready:false`(`supplierProductTypes.ts:115`) → `ready:true`+path 또는 modal.
- **기존 재사용 화면 없음**(공급자 모집 생성/관리 페이지 부재). 신규 modal(제품 context 주입) 또는 page 필요.
- 모집 후 이동/현황: 공급자 모집 현황 화면도 부재 → 최소 "내 모집 목록"(GET `/partner/recruitments` 활용) 후속.

## 6. 최소 입력값

```text
공급자 입력(필수): commissionRate(수수료율) · serviceId(대상 서비스)
공급자 입력(선택): consumerPrice(소비자가 참조) · shopUrl · imageUrl
제품/공급자에서 자동: productId(masterId) · productName · sellerId(user id) · sellerName · manufacturer
기본값: status='recruiting' · consumerPrice=0 · commissionRate=0
운영자 보완: (없음 — 모집은 공급자 주도)
```
- entity 가 thin 하므로 1차 최소 생성 = productId+productName+sellerId+sellerName+commissionRate+serviceId. 제목/기간/모집수는 entity 에 없음 → 후속 entity 확장 시 별도 WO(이번 범위 밖).

## 7. 가격 정책 영향

- `consumerPrice`(decimal) + `commissionRate`(decimal) 는 **모집 commission/참조값** — 공급/주문 가격(offer.priceGeneral) 과 **별개**. NeturePriceArchitectureFreeze 가 다루는 가격 tier 아님 → **freeze 무관, 가격 구조 변경 0**.
- 모집 생성에서 OPL/priceGeneral 변경 없음. 가격 없이도 생성 가능(commissionRate default 0).

## 8. C bridge 와의 호환성

- bridge `bridgeRecruitmentToOrderable` 가 요구: `recruitment.productId`(master) · `recruitment.sellerId`(공급자 **user id**) · `recruitment.serviceId`(serviceKey).
- 생성 시 채워야: 위 3개 + (offer 가 master_id+sellerId 로 해소 가능해야 — 즉 **공급자가 해당 master 의 offer 보유 전제**). 미보유 시 bridge offer skip+warn(현 동작).
- **누락 위험**: ① `sellerId` 를 supplier.id 로 잘못 넣으면 bridge 해소 실패(반드시 user id). ② serviceId null → bridge serviceKey='neture'(비약국) → 규제 상품 차단. ③ offer 부재 시 bridge no-op.

## 9. 권장 후속 WO

```text
WO-O4O-SELLER-RECRUITMENT-CREATION-BACKEND-V1
- POST /partner/recruitments (requireActiveSupplier)
- 입력: productId(masterId) + commissionRate + serviceId (+선택 consumerPrice/shopUrl/imageUrl)
- 소유권 확인: master 가 이 공급자 offer 인지
- sellerId = req.user.id (bridge 전제 보장), sellerName/productName 자동 채움
- service audience gate(규제 상품→약국 서비스) 생성 시 적용
- UNIQUE(productId, sellerId) 충돌 처리(upsert/409)
- (선택) PATCH close, GET 내 모집 목록
- 가격 구조 변경 없음

WO-O4O-SELLER-RECRUITMENT-CREATION-UX-V1
- 제품목록 recruit ready:true + 생성 modal(commissionRate/serviceId 입력)
- 생성 후 공급자 모집 현황 화면
```

## 10. 위험 요소 / 결정 필요

```text
[결정 1] 모집 ↔ offer distributionType
 - 모집 생성이 offer 를 PRIVATE 로 전환하는가, 무관하게 두는가? (PRIVATE 이라야 allowedSellerIds gate 유효)
 - (권고: 모집 대상 offer 는 PRIVATE 전제 또는 생성 시 PRIVATE 전환 옵션. 단 PUBLIC/SERVICE 와 충돌 주의.)
[결정 2] offer 부재 시
 - 공급자가 해당 master offer 미보유 시 모집 생성 차단 vs 허용(후속 offer 등록).
 - (권고: 등록된 제품(=offer)만 모집 생성 가능 → 제품목록 진입이므로 자연 충족.)
[결정 3] serviceId 단일/다중
 - offer.serviceKeys 다중일 때 모집 대상 service 1개 선택 강제.
[위험 A] sellerId=user id 보장 — supplier.id 혼동 시 bridge 전면 실패.
[위험 B] entity thin — 모집 제목/기간/모집수 부재. 운영 요구 시 entity 확장(별도 WO).
```

## 11. 결론

- **모집 생성 경로는 backend·frontend 모두 전무**(seed 도 없음) → 현재 모집 서브시스템은 생성 불가로 **dormant**. C bridge(8e5402e81)는 "모집이 존재할 때" 만 작동하므로, **생성 흐름 신설이 end-to-end 의 전제**.
- 생성은 **frontend only 가 아니라 backend POST 부터 신설** 필요(작지만 신규). entity thin → 최소 입력(productId+commissionRate+serviceId)로 가능. **가격 freeze 무관**(commission/참조값).
- **핵심 제약**: 생성 시 `sellerId=공급자 user id` + `productId=master_id` + serviceId 를 정확히 채워야 C bridge 가 정상. service audience gate 생성 시 적용 권장.
- **권고**: ① §10 결정 3건 확정 → ② `WO-...-CREATION-BACKEND-V1`(POST + 소유권 + gate + bridge 호환) → ③ `WO-...-CREATION-UX-V1`(recruit ready + modal + 현황). 본 조사 범위는 확인까지 — 코드 무변경.

---

*Date: 2026-06-15 · read-only IR · 코드/DB 무변경 · 모집 생성 경로 전무(API/UI/seed 0) → 서브시스템 dormant. entity thin(productId=master/sellerId=user id 필수, 제목·기간 없음). 생성 시 sellerId=user id 보장이 C bridge 전제. 가격 freeze 무관(commission). 후속: CREATION-BACKEND(POST+소유권+gate) → CREATION-UX.*
