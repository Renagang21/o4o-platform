# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-TO-EVENT-OFFER-ENTRY-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-PRODUCT-TO-EVENT-OFFER-ENTRY-V1 (후보 E)
> **유형:** frontend-only 진입 추가 — 상품 상세 drawer에 [이 상품으로 이벤트 오퍼 만들기]. 기존 event offer 생성 flow를 offerId 바인딩으로 재사용. **backend/API/DB/migration 0.**
> **결과: PASS(코드/타입) — drawer 공급 방식 섹션에 이벤트 오퍼 진입 + 안내(공급 방식 변경 아님). `/supplier/event-offers?supplierProductId=&masterId=&name=&priceGeneral=` 로 이동 → 기존 페이지가 제안 모달 자동 오픈+상품 자동 선택. 정상 공급 상품/가격/승인 불변. web-neture tsc 0. 라이브 smoke 배포 후.**
> 선행: WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1 외 분리 축 — 2026-06-19

---

## 0. 선행 조사 (§5) — 중단 기준(§10) 비해당

- `SupplierEventOfferPage`(route `/supplier/event-offers`)는 이미 **query 바인딩 지원**(WO-...-WORKSPACE-BINDING-V2): `?supplierProductId=&masterId=` 진입 시 **제안 모달 자동 오픈 + 매칭 SPO 자동 선택**(`o.id === supplierProductId || o.masterId === masterId`, line 308-330, 프론트 전용·backend 무변경).
- → 중단 기준(offerId 미지원 / 상품 사전선택 불가 / backend 변경 필요)은 **모두 비해당.** 진입 버튼만 추가하면 됨.
- 기존 목록 "후속 작업 연결… → 이벤트 오퍼 연결"(dropdown)도 동일 바인딩 사용 — 본 WO는 **drawer 진입**(§6.1)을 추가(상보적).

## 1. 변경 파일 (frontend 1 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` | `useNavigate` import + 공급 방식 섹션 하단 **이벤트 오퍼 진입 블록**(안내 + [이 상품으로 이벤트 오퍼 만들기] 버튼 → event-offers 바인딩 route) |

## 2. 진입 동작

- drawer 공급 방식 섹션 하단, "공급 방식 변경"·"공급 방식 관리·정책 안내" 다음에 **이벤트 오퍼** 블록:
  - 안내: "이벤트 오퍼는 상품의 공급 방식을 바꾸지 않습니다. 기존 상품을 기준으로 대상 서비스·이벤트 가격·기간·수량 조건을 별도로 설정합니다."
  - 버튼 → `navigate('/supplier/event-offers?supplierProductId=' + product.id + '&masterId=' + product.masterId + '&name=…&priceGeneral=…')`.
- 이동 후 기존 페이지가 **제안 모달 자동 오픈 + 해당 상품 자동 선택** → 공급자가 대상 서비스·이벤트가·기간·수량 입력.

## 3. 정책 (정상 공급 불변)

- 버튼은 **navigate만** 수행 — `SupplierProductOffer.is_public/service_keys/distribution_type/price_general`, `offer_service_approvals`, `organization_product_listings`, catalog gate **무변경**. 이벤트 오퍼는 distributionType 아님(별도 propose flow, offerId 연결).
- 대상 서비스 자격·이벤트 가격 검증은 **기존 event offer flow 정책 그대로**(§4.3) — 본 WO 신규 정책 없음.
- 유통참여형 펀딩과 미연결.

## 4. 검증

- **web-neture `tsc --noEmit`: EXIT 0.**
- 정적: 버튼 onClick=navigate(바인딩 query). product.id/masterId/name/priceGeneral(SupplierProduct 필드) 사용. drawer 다른 로직·operator 공유 뷰 무변경(순수 추가).

### 배포 후 실브라우저 smoke — 2026-06-19 **PASS** (renagang21 미네락 600, 미제출·비파괴)
1. drawer 공급 방식 섹션 하단 **이벤트 오퍼 안내 + [이 상품으로 이벤트 오퍼 만들기]** 표시. **PASS**
2. 클릭 → `/supplier/event-offers?supplierProductId=3adc23b1…&masterId=…&name=…&priceGeneral=22000` 이동 + **제안 모달 자동 오픈** + "선택한 공급자 상품: 미네락 600" 배너("원본 상품 정보와 기본 공급가는 변경되지 않습니다") + **상품 자동 선택**(radio 미네락 600 [checked], ₩22,000) + 대상 서비스(KPA ☑/K-Cos/Glyco)·이벤트 공급가·시작/종료·수량/제한 입력. **PASS**
3. **제안하기 미클릭**(event offer row·운영 데이터 미생성). 정상 공급 방식/serviceKeys/price_general/승인 불변. **PASS**
4. drawer/공급 방식 모달/상품 정보 편집 회귀 없음. **PASS**

## 5. 비범위 / 준수

- ✅ 이벤트 오퍼 가격적용/승인정책/schema/migration, SupplierProductOffer/serviceKeys/price_general, 공급 방식 모달, 서비스별/계약별 가격, 유통참여형 펀딩 **무변경**.
- ✅ path-specific(drawer 1 + CHECK). **다른 세션 WIP·검증 png 미staging.**

## 6. 후속
- `IR-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-V1`(서비스별 공급가) · `WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-GUIDE-COPY-ALIGN-V1`(등록 BlockGuide CMS 문구 정정).

---

*Date: 2026-06-19 · 후보 E frontend-only · drawer 이벤트 오퍼 진입(공급 방식 변경 아님) → 기존 event-offers 바인딩(자동 모달+상품 선택) 재사용 · 정상 공급/가격/승인 불변 · backend 0 · web-neture tsc 0 · 배포 후 미제출 smoke.*
