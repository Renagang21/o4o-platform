# IR-O4O-NETURE-SUPPLIER-PUBLIC-PROFILE-STORE-VISIBILITY-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0. 정적 분석만(운영 데이터 미조회).
> **대상:** Neture 공급자 **공개 프로필** 존재 여부 + **매장(store) 측 공급자 노출 경로/필드/민감도**.
> **핵심 결론: 공개(비로그인) 공급자 "프로필 페이지"는 없음. 공급자 디렉터리/상세 API는 `requireAuth` + contact visibility(PUBLIC/PARTNERS/PRIVATE) 필터로 보호됨. 매장 노출은 ① store 상품 상세(무인증)=공급자 org명만 ② seller(매장) API=supplierName/Id(인증) ③ 주문 상세 enrichment=supplier_phone/website. 민감필드(사업자번호/세금계산서/정산계좌/대표자명/담당자폰)는 어디에도 비노출. 단 발견 1건 = 주문 enrichment 가 contact visibility(기본 phone=PRIVATE)를 우회.**
> 작성일: 2026-06-18

---

## 0. 결론 요약 (TL;DR)

| 질문 | 답 |
|------|------|
| 비로그인 공개 공급자 프로필 페이지? | **없음**. `/supplier/profile` → `/mypage/business-profile` redirect = 소유자 본인 편집용. `/suppliers/:slug` 프론트 소비 페이지 없음(백엔드 디렉터리 API 만 존재, 인증 필요) |
| 공급자 디렉터리/상세 API 보호? | ✅ `/neture/suppliers`·`/neture/suppliers/:slug` **`requireAuth`** + 상세는 viewerId 로 contact 필터 |
| 매장이 공급자를 보는 곳? | store 상품 상세(무인증)=공급자 **org명만** / seller(매장) API=supplierName·Id(인증) / 주문 상세=supplier name·phone·website |
| 민감필드 노출? | **없음** — businessNumber/businessAddress(→organizations 이관)/taxInvoiceEmail/정산계좌/대표자명/managerPhone 전부 비노출 |
| 발견 | **주문 enrichment 가 ContactVisibility 우회**(기본 PRIVATE phone 노출). 의도(거래관계)일 수 있으나 모델 불일치 |

---

## 1. 공급자 프로필 surface (본인 vs 공개)

- **본인 편집 프로필**: `SupplierProfilePage` / `MyBusinessProfilePage`. route `/supplier/profile` → **`/mypage/business-profile` redirect**(App.tsx:791). 인증·소유자 한정. 사업자등록증/품목군/정산 등 자기 정보 편집.
- **공개(타인 열람) 프로필 페이지**: **프론트에 없음**. `/suppliers/:slug` 같은 공개 라우트/카드/디렉터리 UI 미발견.
- **백엔드 공급자 디렉터리/상세 API**(B2B 파트너 맥락):
  - `GET /neture/suppliers`(neture.routes.ts:222, **requireAuth**) → ACTIVE 공급자 목록: id/slug/name/logo/category/shortDescription/productCount/trustSignals.
  - `GET /neture/suppliers/:slug`(neture.routes.ts:257, **requireAuth**, viewerId 전달) → 상세 + products + pricing/MOQ/shipping/orderCondition + **contact(visibility 필터)** + contactHints.
  - `GET /neture/suppliers/:id/order-condition`(240, requireAuth) → B2B 주문 조건.

## 2. 매장(store) 측 공급자 노출 경로

| # | 경로 | 인증 | 노출 공급자 정보 | 위치 |
|---|------|:--:|------|------|
| 1 | `GET /neture/store/product/:offerId` | **없음(public)** | **supplier_name(org명)**, supplier_id, manufacturer_name, brand_name | neture.routes.ts:399–446 |
| 2 | `GET /neture/store/:storeSlug/product/:productSlug` | **없음(public)** | 동일(o.name supplier_name, ns.id supplier_id) | neture.routes.ts:452–500 |
| 3 | `GET /seller/available-supply-products` | 인증(매장) | supplier_id, supplier_name(org) + 상품 | seller.service.ts:52–131 |
| 4 | `GET /seller/my-products` | 인증 | supplierId, supplierName | seller.service.ts:21–41 |
| 5 | `GET /seller/service-applications` | 인증 | supplierName, supplierId | seller.service.ts:153–176 |
| 6 | 주문 상세 `enrichOrderItems` | 인증(매장) | supplier_name, **supplier_phone, supplier_website** | seller.service.ts:186–206 |

- 프론트: `StoreProductPage.tsx:253` 가 `product.supplier_name` 을 모든 방문자에게 표시(공개 상품 상세).

## 3. contact visibility 모델 (supplier.service.filterContactInfo:953)

```
canView(visibility):
  isOwner → true
  !viewerId → false            # 비로그인은 PUBLIC 도 안 보임
  PUBLIC → true (any authed)
  PARTNERS → isPartner only
  PRIVATE → false (owner only)
필드: email / phone / website / kakao
```
- 기본값(NetureSupplier entity): **email=PUBLIC, phone=PRIVATE, website=PUBLIC, kakao=PARTNERS**.
- 적용 위치: `/suppliers/:slug` 상세(디렉터리). **단 §2-6 주문 enrichment 에는 미적용**(아래 발견).

## 4. 민감필드 점검 (NetureSupplier entity)

| 필드 | 저장 | 공개/매장 노출 |
|------|------|:--:|
| businessNumber / businessAddress | (organizations 이관, entity deprecated 주석) | ❌ |
| representativeName | entity | ❌ |
| managerPhone | entity | ❌ |
| taxInvoiceEmail | entity | ❌ |
| settlementBankName/AccountNumber/AccountHolder | entity | ❌ |
| settlementContactEmail | entity | ❌ |
| mailOrderSalesRegistrationNumber | entity | ❌ |
| contactEmail/Phone/Website/Kakao | entity | △ visibility 필터(§3) |
| slug/logoUrl/category/shortDescription/description | entity | ✅ 디렉터리(인증) |

→ **사업자/세무/정산/개인 식별 민감필드는 공개·매장 응답 어디에도 포함되지 않음.**

## 5. 발견 / Gap

### F1 (중) 주문 enrichment 가 ContactVisibility 우회
`seller.service.enrichOrderItems`(186–206)는 `s.contact_phone AS supplier_phone`, `s.contact_website AS supplier_website` 를 **entity 에서 직접 SELECT** → `filterContactInfo`(기본 phone=PRIVATE) **미경유**. 즉 디렉터리에서 PRIVATE 로 가려지는 전화가 **주문 상세에서는 매장에 노출**.
- 해석: 주문이 성립한 거래관계이므로 공급자 연락처 제공이 **의도된 정책**일 수 있음(fulfillment 협의).
- 리스크: 모델 일관성 결여. 공급자가 phone 을 PRIVATE 로 두어도 주문 매장엔 노출됨(공급자 기대와 불일치 가능).
- 판단: **정책 확정 필요**(주문 맥락 노출 허용 = 명문화 / 불허 = visibility 필터 적용). 데이터 유출은 아님(주문 당사자 한정).

### F2 (저) store 상품 상세 무인증 + 공급자 org명 공개
`/neture/store/product/:offerId`(무인증)가 `supplier_name`(organizations.name) 공개. B2C 매장 프런트 특성상 "누가 공급하는가" 표시는 통상 의도. org `name` 이 **법인 정식상호**일 경우 노출 적정성만 확인하면 됨(브랜드/표시명이면 무이슈). 사업자번호 등은 미포함이라 저위험.

### F3 (정보) 공개 공급자 프로필 페이지 부재
공급자 공개 디렉터리는 **백엔드 API 만** 존재(인증). 프론트 공개 페이지 없음 → 현재 "공급자 공개 프로필"은 사실상 B2B 인증 사용자(파트너/매장)에게만 디렉터리 형태로 제공. 공개 프로필 페이지 신설은 별도 제품 결정 사항.

## 6. 권장 방향 / WO 후보

| 우선 | 후보 | 범위 |
|---|------|------|
| 1 (정책) | **F1 주문 맥락 공급자 연락처 노출 정책 확정** — 허용이면 CHECK 로 명문화(무코드), 불허/선택노출이면 `WO-...-ORDER-SUPPLIER-CONTACT-VISIBILITY-ALIGN-V1`(enrichOrderItems 에 visibility 필터 또는 "거래관계 예외" 주석). | backend 소규모 or 문서 |
| 2 (확인) | F2 — organizations.name 이 표시명인지 법인상호인지 확인. 표시명 분리 필요 시 별도 WO. | 조사 |
| 3 (제품) | F3 — 공개 공급자 프로필 페이지 도입 여부는 사업 결정. 도입 시 노출 필드 화이트리스트(이미 디렉터리 API 가 안전 필드만 반환) 재사용. | 제품/별도 |

## 7. 비범위

- RBAC/승인 상태/역할 변경, KYC·정산 정책 변경, 공급자 entity 스키마 변경, 신규 공개 페이지 구현 — 본 IR 미수행(조사만).

## 8. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 운영 데이터 미조회(정적 분석), 산출물 = 본 문서 1개(path-specific)
```

---

*read-only · 공개 공급자 프로필 페이지 없음 · 디렉터리/상세 API=requireAuth+contact visibility(PUBLIC/PARTNERS/PRIVATE, 기본 email=PUBLIC·phone=PRIVATE·website=PUBLIC·kakao=PARTNERS) · 매장 노출=store 상품상세(무인증, org명만)/seller API(인증, supplierName·Id)/주문 enrichment(name·phone·website) · 민감필드(사업자번호/세금계산서/정산/대표자명/담당자폰) 전부 비노출 · 발견 F1=주문 enrichment 가 visibility 우회(정책 확정 필요, 유출 아님).*
