# IR-O4O-NETURE-SUPPLIER-PRODUCT-INFO-AND-DISTRIBUTION-UX-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** Neture 공급자 상품 등록/수정 UX의 "상품 정보" ↔ "공급 방식" 분리 가능성 + UX 정책.
> **핵심 결론: 백엔드는 이미 정보(ProductMaster) / 공급(SupplierProductOffer)을 DB 레벨로 분리한다. distributionType은 직접 선택값이 아니라 `is_public`(PUBLIC축)+`service_keys`(SERVICE축)에서 파생된다. 즉 분리는 frontend 표현·플로우 문제이며 구조 변경 불필요. "상품 정보만 저장→내부/미노출"은 이미 기본 동작(생성 시 isActive=false, approval=PENDING, distributionType=PRIVATE). 이벤트 오퍼는 distributionType이 아니라 별도 제안 flow(offerId 연결, sourceProductId 없음). 갭 1건 = updateProduct(PATCH)에 serviceKeys 미포함(drawer가 ProductForm+auto submitForApproval로 우회).**
> 선행: CHECK-O4O-SERVICE-OFFER-HUB-EXPOSURE-APPROVAL-GATE-FIX-V1 (노출 게이트 정책축) — 2026-06-18

---

## 1. 조사 범위

- FE 등록: `SupplierProductCreatePage.tsx`(3-step wizard) + `ProductForm`(공급 방식).
- FE 수정/상세: `ProductDetailDrawer.tsx`(dual edit b2c/b2b) + `SupplierProductsPage.tsx`(목록/bulk).
- FE API: `lib/api/supplier.ts`(createProduct/updateProduct/submitForApproval/event-offer proposal).
- BE: `ProductMaster.entity` / `SupplierProductOffer.entity` / `OfferServiceApproval.entity` / `offer.service.ts` / event-offer controller.

## 2. 현재 상품 등록 UX

`SupplierProductCreatePage` 3-step wizard:
- **Step1 상품 정보**: marketingName/barcode/categoryId/brand/manufacturer/규제(regulatoryType·Name·mfdsPermitNumber)/spec/origin.
- **Step2 공급(가격/방식)**: `ProductForm` — priceGeneral/consumerReferencePrice/distributionType(=isPublic)/serviceKeys/isPublic/isFeatured.
- **Step3 설명/이미지**: consumerShort/Detail, 이미지(비동기).
- **생성 기본값**: `isActive=false`, `approval_status=PENDING`, `distributionType=PRIVATE`(isPublic·serviceKeys 미지정 시). → **상품 정보만 넣으면 자연히 내부/미노출 상태**(이미 "정보-우선" 가능).

## 3. 현재 상품 수정/상세 UX

`ProductDetailDrawer`:
- 표시: 상품정보 + distributionType badge(PUBLIC/SERVICE/PRIVATE) + 가격 + isActive 토글 + isFeatured + serviceKeys/승인상태 + completeness.
- 편집(dual): **b2c** = price/공개/serviceKeys/distribution/상품명·카테고리·B2C설명, **b2b** = business 설명만.
- **serviceKeys 추가 시 drawer가 자동 `submitForApproval()` 호출**(별도 UI 없이 공급 변경) — 정보 수정과 공급 변경이 **한 저장 버튼에 혼재**(현 UX 핵심 문제).
- 목록 bulk: inline edit(price/stock/isActive), bulkDelete, batchUpdate(isActive/isPublic/distributionType/priceGeneral/consumerRef/stock). 이미지 업로드.
- **별도 "공급 방식 관리"/"이벤트 오퍼 만들기" 진입점 없음.**

## 4. 상품 정보 데이터 구조 (ProductMaster = 정보)

`ProductMaster`: barcode(unique·immutable) / name / regulatory_type·name·mfds_permit_number·mfds_product_id(immutable) / brand_id·category_id·specification·origin_country·tags·drug_category(mutable). 1:N → offers. → **순수 상품 정체성**(공급/가격/노출 컬럼 없음).

## 5. 공급 방식 데이터 구조 (SupplierProductOffer = 공급)

`SupplierProductOffer`(master_id immutable 1:1 supplier×master):
- **2축 모델**(WO-NETURE-DISTRIBUTION-MODEL-SPLIT): `is_public`(전체 공개, default false) + `service_keys`(text[], 서비스 공급).
- `distribution_type`(enum PUBLIC/SERVICE/PRIVATE) = **파생**(isPublic=true→PUBLIC, serviceKeys>0→SERVICE, else→PRIVATE). 하위호환용.
- `approval_status`(파생, SSOT=offer_service_approvals) / `is_active`(별도 플래그) / `allowed_seller_ids`(PRIVATE).
- 가격: `price_general`(B2B 공급가) / `price_gold`·`price_platinum`(**참고용, 주문 미반영**) / `consumer_reference_price`.
- 설명: consumer_*(B2C) / business_*(B2B) — **B2B/B2C는 설명 축**, 별도 distribution 아님.
- 재고: stock/reserved/threshold.

`OfferServiceApproval`(offer_service_approvals): `(offer_id, service_key)` unique, `approval_status`(pending/approved/rejected), decided_by/at, reason. **per-service 승인 SSOT** — offer.approval_status·service_keys는 이 row에서 파생/미러.

## 6. B2B/B2C/distributionType/serviceKeys 관계

| 개념 | 실체 |
|------|------|
| 상품 정보 vs 공급 | ProductMaster vs SupplierProductOffer (DB 분리) |
| B2C / B2B | **설명 축**(consumer_* / business_*) — distribution 아님 |
| distributionType | **파생**(is_public + service_keys) — 직접 선택값 아님 |
| serviceKeys | SERVICE 공급 대상(text[]) + offer_service_approvals row |
| is_active | 노출 활성 플래그(승인·distribution과 독립) |
| approval | per-service(offer_service_approvals) SSOT |

## 7. 공급 방식별 가격 정책

- **기능적 가격 = `price_general`(B2B 공급가) 단일.** price_gold/platinum은 **참고용(주문 미반영)**, consumer_reference_price는 표시용.
- **서비스별 공급가 = 미지원**(참고 필드만 존재). MOQ/공급단위/수량제한 = offer 레벨 일반 필드 없음(이벤트 오퍼에 per-order/per-store limit 존재).
- → V1은 **단일 B2B 공급가**로 시작, 서비스별/계약별/이벤트 가격은 단계적 분리가 안전.

## 8. 공급 방식별 정책 매트릭스

| 공급 방식 | 데이터 | 등록 시 입력 | 수정 | 가격 | 승인 | HUB 노출 | 정비 후보 |
|------|------|------|------|------|------|------|------|
| 내부 상품(미설정) | isPublic=false, serviceKeys=[] → PRIVATE 파생, isActive=false | 자동(기본) | updateProduct | price_general | 불필요 | 미노출 | 기본 상태 명시 표시 |
| B2B 전체/PUBLIC | isPublic=true | isPublic 토글 | updateProduct(isPublic) | price_general | **불필요** | 전체 HUB | 즉시 노출 경고 안내 |
| 서비스/SERVICE | service_keys + offer_service_approvals | serviceKeys 선택→submit | drawer(ProductForm)→auto submit | price_general | **필요**(per-service) | 승인 서비스만 | serviceKeys PATCH API 정식화 |
| 제한/PRIVATE | allowed_seller_ids | (catalog 미연동) | updateProduct(allowedSellerIds) | price_general | 필요 | 승인+허용 | listings/apply 경로 소관 |
| 이벤트 오퍼 | **별도 제안 flow**(offerId 연결) | proposeEventOffer | 별도 | eventPrice(별도) | 서비스별 별도 | 별도 영역 | 별도 진입 |

## 9. 공급 방식 변경 시 승인/노출 영향

- **PUBLIC 전환**: 서비스 승인 없이 HUB 노출(정책축, CHECK-...-EXPOSURE-GATE 참조). → "즉시 전체 공개" 경고 안내 필요.
- **SERVICE 전환/대상 추가**: serviceKeys에 추가 → submitForApproval이 `createPendingApprovals`로 (offer_id, service_key) **pending row 생성**, 승인 전 미노출, 승인 후 해당 서비스만 노출. 기존 승인 서비스는 유지(ON CONFLICT로 rejected만 재pending).
- **SERVICE 대상 제거**: ⚠️ **offer_service_approvals row가 자동 정리되지 않음**(잔존). 노출 중단은 serviceKeys/쿼리 필터 의존 — 제거 시 row 보존/비활성/삭제 정책 **미정의**(정비 후보).
- **PRIVATE**: catalog 경로엔 기존 private 조건 부재(allowed_seller_ids는 listings/apply 소관).

## 10. UX 선택지 비교

| 방식 | 현황 | 적합 | 위험 |
|------|------|------|------|
| **6.1 리스트 체크 bulk** | batchUpdate 존재(isActive/isPublic/distributionType/price) | 단순 대량(공개 토글/가격) | 가격·기간·서비스별 조건엔 위험(일괄 오설정) |
| **6.2 별도 관리 플로우/메뉴** | 없음(신규) | 복잡 정책 변경(SERVICE 대상·가격·승인) | 신규 route/화면 비용 |
| **6.3 상품 수정화면 내 직접** | 현재 drawer가 이것(정보+공급 혼재, auto-submit) | — | **정보 수정 중 의도치 않은 공급/승인 변경**(현 문제) |

→ **권장: 정보 수정(drawer 중심) ↔ 공급 방식 변경(별도 버튼/플로우) 분리.** bulk는 단순 토글만, 복잡 정책은 별도 플로우.

## 11. 권장 UX 정책 (확정안)

```
원칙: 상품 정보와 공급 정책을 분리한다.
- 상품 정보 수정: drawer/상세에서 정보 필드만(상품명/카테고리/브랜드/설명/규제/이미지).
- 공급 방식 변경: [공급 방식 관리] 별도 진입(현재 isPublic+serviceKeys+submitForApproval를 명시적 플로우로).
- 이벤트 오퍼: [이 상품으로 이벤트 오퍼 만들기] 별도 생성(distribution 변경 아님 — 이미 별도 flow).
- 상품 정보만 저장 = 내부/미노출(이미 기본). 목록에 "공급 방식 미설정/내부" 상태 명시.
- V1은 단순하게: 표시 분리 + 진입 분리부터. 서비스별 가격·bulk 공급변경은 후속.
```

## 12. V1 구현 후보 (우선순위)

| 후보 | WO | 범위 | 우선 |
|------|------|------|:--:|
| A | `...-PRODUCT-INFO-DISTRIBUTION-SUMMARY-V1` | drawer에서 정보/공급 **표시 분리** + 서비스별 승인 상태 요약 | **1(권장 선행, FE-only, 저위험)** |
| C | `...-DISTRIBUTION-MANAGEMENT-ENTRY-V1` | drawer/목록에 [공급 방식 관리] 진입 추가 | 2 |
| D | `...-DISTRIBUTION-MANAGEMENT-FLOW-V1` | PUBLIC/SERVICE 변경 플로우 + serviceKeys PATCH API 정식화(현 우회 제거) + SERVICE 대상 제거 시 approval row 정책 | 3(BE 포함, 중) |
| B | `...-PRODUCT-CREATE-INFO-FIRST-V1` | 등록을 정보→공급 단계 분리(정보만 저장=내부) | 4 |
| E | `...-PRODUCT-TO-EVENT-OFFER-ENTRY-V1` | 상품 상세에서 이벤트 오퍼 생성 진입(기존 proposeEventOffer flow 연결) | 5 |

## 13. 이벤트 오퍼와 일반 상품 관계

- **distributionType 아님 — 별도 제안 flow.** `SupplierEventOfferPage` → `proposeEventOfferToServices(offerId, ...)` → 서비스별 제안(eventPrice/start·end/totalQuantity/perOrder·perStoreLimit, status pending/approved/rejected/canceled). 엔티티는 KPA EventOfferService 재사용(serviceKey='event-offer-neture').
- **연결 키 = `offerId`**(SupplierProductOffer), `sourceProductId` **미존재**. 기존 offer 기반 생성 가능.
- catalog 일반 노출과 별도(event-offer 전용 경로/참여). → **"이벤트 오퍼 만들기"를 공급 방식 변경과 분리하는 가설 = 구조적으로 맞음.**

## 14. Current Structure vs O4O Philosophy Conflict Check

1. 등록이 너무 복잡? — 3-step에 정보+공급+설명 혼재. 정보-우선 분리 여지 있음(기본 내부 상태 이미 지원).
2. 정보/공급 혼재로 오해? — **예(drawer가 정보 수정+serviceKeys auto-submit 혼재)**. 분리 필요.
3. 정보만 먼저 등록 후 공급 나중? — **이미 가능**(생성 기본 isActive=false/PENDING/PRIVATE). UX가 이를 안내 안 함.
4. 공급 변경이 가격/서비스/승인/노출 충분히 안내? — 아니오(PUBLIC 즉시공개·SERVICE pending 생성 경고 부재).
5. 이벤트 오퍼를 일반 공급 변경처럼? — 위험(별도 flow인데 혼동 가능) → 분리가 맞음.
6. bulk/상세/별도 메뉴 중 V1? — **표시 분리(A)+진입 분리(C) 우선**, 복잡 변경은 별도 플로우(D).
7. 진입장벽↓ + 운영자 승인 유지? — 가능(정보-우선 + PUBLIC 무승인/SERVICE 승인 유지).

→ **결론: 상품 정보와 공급 정책 분리 = 구조적으로 이미 준비됨(ProductMaster/Offer). frontend 표현·진입 분리 + (D에서) serviceKeys PATCH 정식화·SERVICE 제거 시 approval row 정책 확정이 핵심. 이벤트 오퍼는 별도 유지. V1은 A(표시 분리)부터.**

## 15. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정적 분석만, 산출물 = 본 문서 1개(path-specific)
```

---

*read-only · 백엔드 이미 정보(ProductMaster)/공급(SupplierProductOffer) 분리 · distributionType=is_public+service_keys 파생 · 정보만 저장=내부/미노출 기본(isActive=false/PENDING/PRIVATE) · 가격=price_general 단일(gold/platinum 참고용) · 서비스별 가격 미지원 · 이벤트 오퍼=별도 제안 flow(offerId, sourceProductId 없음) · 갭=updateProduct serviceKeys 부재(drawer가 auto submitForApproval 우회) + SERVICE 제거 시 approval row 정책 미정의 · V1 후보 A(표시분리)→C(진입)→D(플로우+API 정식화)→B(등록분리)→E(이벤트).*
