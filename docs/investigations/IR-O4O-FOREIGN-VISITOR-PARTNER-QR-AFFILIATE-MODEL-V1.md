# IR-O4O-FOREIGN-VISITOR-PARTNER-QR-AFFILIATE-MODEL-V1

> **작업명:** IR-O4O-FOREIGN-VISITOR-PARTNER-QR-AFFILIATE-MODEL-V1
> **유형:** 기획 IR (문서 전용). 코드/DB/API/UI/migration **변경 0**.
> **목적:** `FOREIGN_VISITOR_SALES_SUPPORT` 위에 얹을 **파트너/가이드/캠페인 식별 QR 제휴 모델**(유입·식별·성과 추적)을 정의한다. **결제 모델 아님.**
> **작성일:** 2026-06-23
> **선행/전제:** STORE_SERVICE_SUBSCRIPTION 구독 결제 축 완료 · 소비자→매장 결제 제거(STORE_SALE_PAYMENT=410) · 외국인 고객 다국어 안내(QR/public landing/태블릿) 기존 구현 존재(아래 §11).

---

## 0. 핵심 한 줄

> 외국인 관광객 판매 지원에서 QR-code 는 단순 안내 링크가 아니라 **파트너/가이드/캠페인을 식별하는 제휴마케팅 단위**가 되어야 한다. 단, **O4O 는 결제를 처리하지 않으며**, 수수료는 POS/매장/수기 기준으로 별도 산정한다.

---

## 1. 배경

`FOREIGN_VISITOR_SALES_SUPPORT` 는 매장 경영자가 구독하는 O4O 부가서비스로 고정되었다. 이미 완료/존재하는 축:

- **구독 결제(STORE_SERVICE_SUBSCRIPTION):** prepare/confirm + plan catalog + 운영 smoke(11/12) — 소비자 결제 아님.
- **소비자→매장 결제 제거:** KPA storefront checkout→POS 안내, 소비자 payment prepare/confirm→410. **STORE_SALE_PAYMENT 은 O4O 결제 대상 아님.**
- **외국인 고객 다국어 안내(기존 구현):** 매장별 다국어 상품 안내 콘텐츠 + 고객용 public landing + **backend SVG QR** + 태블릿 보기 (`WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1` / `...-TABLET-CONTENT-V1`).

이번 IR 은 그 위에 **관광객을 매장으로 유입시키는 파트너/가이드/제휴 QR 구조**를 정의한다.

## 2. 정책 전제 (고정)

1. 소비자 결제는 O4O 에서 처리하지 않는다.
2. 관광객의 실제 구매 결제는 **매장 POS/현장 결제**로 처리한다.
3. O4O 는 **방문 유입·안내·QR 식별·파트너 성과 기록**을 담당한다.
4. 가이드/제휴 수수료는 O4O 결제금액이 아니라 **매장 또는 POS/정산 기준**과 연결해 별도 산정한다.
5. QR-code 자체가 **파트너/캠페인 식별 단위**가 될 수 있다.

→ 이 IR 은 **결제 모델이 아니라 유입·식별·성과 추적 모델**이다.

## 3. 용어 정의

| 용어 | 정의 |
|------|------|
| **매장** | 외국인 관광객을 맞이하고 상품을 판매하는 약국/매장 (organizationId 단위) |
| **파트너** | 관광객을 매장으로 유입시키는 주체 (여행사/가이드/호텔/관광버스 인솔자/의료관광 코디네이터) |
| **제휴 QR-code** | 단순 안내 링크가 아니라 **유입 출처(파트너/캠페인)를 식별**하는 QR |
| **캠페인** | 기간·파트너·매장·언어·상품군·관광객 그룹을 묶은 운영 단위 (V1 은 optional name 수준) |

## 4. 파트너 유형 모델

| 유형 | partnerType | QR 단위 | 수수료 기준 후보 |
|------|------|------|------|
| 여행사 | TRAVEL_AGENCY | 여행사별/캠페인별 | 방문·구매·매출 |
| 개별 가이드 | GUIDE | 가이드별 | 구매·매출 |
| 호텔/숙박 | HOTEL | 호텔별/지점별 | 방문·쿠폰·구매 |
| 관광버스/인솔자 | BUS_OPERATOR | 차량/인솔자별 | 방문 |
| 의료관광 코디네이터 | MEDICAL_TOUR_COORDINATOR | 코디네이터별 | 구매·계약 |
| 기타 | OTHER | — | — |

**V1 우선 범위:** ① 여행사/가이드형 파트너, ② 매장 직접 발행형 QR. (호텔/버스/코디네이터는 데이터 모델로 수용하되 화면은 후속.)

## 5. QR-code 생성 단위 비교

| 후보 | 단위 | 장점 | 단점 |
|------|------|------|------|
| A 매장 단위 | 매장 1 QR | 단순·운영 쉬움·안내용 적합 | 파트너별 수수료/성과 구분 불가 |
| B **파트너 단위** | 매장+파트너 | **성과 추적/수수료 근거 용이** | QR 개수↑·파트너 관리 화면 필요 |
| C 캠페인 단위 | 매장+파트너+기간/언어/상품군 | 마케팅 분석 정밀 | V1 복잡·지속 관리 부담 |

### V1 권장 = **B(파트너 단위) + optional campaignName**
데이터 구조는 캠페인(C) 확장을 고려하되 화면은 단순하게 시작.

```
필수: storeId(organizationId), partnerId, qrCodeId, landingUrl, status
선택: campaignName, language, validFrom, validTo
```

## 6. QR 템플릿 유형

| 템플릿 (qrTemplateType) | 목적 | 사용 위치 |
|------|------|------|
| STORE_GUIDE | 매장 안내/다국어 진입 | POP·카운터 |
| **AFFILIATE_MARKETING** | **파트너/가이드 유입 식별 (본 IR 핵심)** | 가이드 안내문·관광버스·호텔 |
| GROUP_TOUR | 단체 짧은 체류 대응 | DSL/POS 가격표 주변 |
| PRODUCT_CATEGORY | 특정 카테고리 안내 | 구강관리·건강식품 등 |
| EVENT_COUPON | 방문 유도 (후속 V2) | — |

본 IR 의 핵심 템플릿 = **AFFILIATE_MARKETING**.

## 7. QR 스캔 후 흐름

```
1. 관광객이 QR 스캔
2. O4O 랜딩 URL 진입 (기존 다국어 public landing 재사용 — §11)
3. QR 식별: storeId, partnerId, qrCodeId, (campaignId optional)
4. 언어 선택/자동 감지
5. 다국어 매장/상품 안내 표시
6. 구매는 매장 현장 POS 에서 진행
7. O4O 는 스캔/조회 이벤트만 기록
```

**금지:** 랜딩 페이지에 결제 버튼/소비자 checkout/Toss 결제를 만들지 않는다. 구매는 현장 결제 안내.

## 8. 수수료 산정 모델 후보 (자동 정산 아님 — 산정 근거만)

| 후보 | 기준 | 장점 | 단점 |
|------|------|------|------|
| A 스캔 | QR 스캔 1건 | O4O 단독 기록·구현 쉬움 | 실구매 무관·부정 스캔 |
| B 방문 확인 | 스캔 후 매장 확인(버튼/방문코드/수기) | 스캔보다 신뢰 | 매장 업무↑ |
| C POS 매출 | POS/DSL/매장 입력 매출 | 실매출 연결·가이드 수수료 적합 | POS 연동·업체 협의 필요 |

**V1 권장 = A(스캔) + B(매장 확인/수기 매출 입력 가능성 검토). V2 = C(POS/DSL 매출 기준).**

## 9. DSL/POS 업체 문의 항목 (V1 = 질문지 고정, 직접 연동 안 함)

1. DSL 화면에 외부 QR 이미지를 표시할 수 있는가?
2. QR 이미지를 상품/가격표 화면과 함께 교체할 수 있는가?
3. 매장/시간대별로 QR 이미지를 바꿀 수 있는가?
4. QR 이미지를 API 로 받아 표시할 수 있는가?
5. 수동 업로드 방식으로 교체해야 하는가?
6. POS 판매 데이터와 외부 campaignId/partnerCode 를 연결할 수 있는가?
7. 영수증/판매내역에 제휴코드 입력 필드가 있는가?
8. 수수료 산정용 CSV export 가 가능한가?
9. 상품별/시간대별/결제수단별 매출 export 가 가능한가?
10. 단체 관광객 방문 시간대별 판매 집계가 가능한가?
11. 외부 시스템 API 연동이 가능한가?
12. 연동 비용/개발 일정은?

## 10. 데이터 모델 초안 (개념 — migration 없음)

> ⚠️ 구현 시 Boundary Policy(§Store Ops = organizationId) + ESM Entity 규칙 + 개인정보 최소화 준수. 아래는 개념 스케치.

### Partner
```
id, serviceCode, organizationId(storeId),
partnerType(TRAVEL_AGENCY|GUIDE|HOTEL|BUS_OPERATOR|MEDICAL_TOUR_COORDINATOR|OTHER),
partnerName, contactName, contactPhone, contactEmail, status, memo, createdAt, updatedAt
```

### PartnerQrCode
```
id, organizationId(storeId), partnerId, campaignId?,
qrTemplateType(STORE_GUIDE|AFFILIATE_MARKETING|GROUP_TOUR|PRODUCT_CATEGORY|EVENT_COUPON),
qrCodeName, landingUrl, shortCode, language?, status, validFrom?, validTo?, createdAt, updatedAt
```

### PartnerQrScanEvent
```
id, qrCodeId, organizationId, partnerId, campaignId?, sessionId, language,
userAgent, ipHash, scannedAt, landingPath, referrer
```

### PartnerVisitOrConversion (후보)
```
id, qrCodeId, organizationId, partnerId,
eventType(SCAN|VISIT_CONFIRMED|PURCHASE_REPORTED|POS_MATCHED),
amount?, currency?, confirmedBy?, confirmedAt?, memo
```

## 11. 기존 인프라 재사용 (repo 조사 결과) — **핵심**

이미 외국인 고객 다국어 안내 + QR + public landing 이 **구현되어 있다**. 파트너 QR 은 이 위에 **식별 레이어**만 얹는다.

| 재사용 | 위치 | 비고 |
|------|------|------|
| **Backend SVG QR 생성** | `apps/api-server/src/services/qr-print.service.ts` → `generateQrSvg(url, size)` | 프론트 QR 의존성 없음. 파트너 QR 도 동일 사용 |
| **다국어 public landing** | `apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts` (`GET /public/multilingual-product-contents/:publicKey`, landing `/multilingual-products/:publicKey`) | publicKey idempotent 발급. 파트너 식별은 URL 파라미터/별도 QR 레코드로 확장 |
| **public_key 발급 + QR API** | 동 컨트롤러 `POST .../:groupId/public-key`, `GET .../:groupId/qr` | `store_multilingual_product_content_groups.public_key` |
| **고객용 액션 UI(QR/URL/태블릿)** | `services/web-kpa-society/src/components/MultilingualPublicActions.tsx` | "고객용 보기 / URL 복사 / QR 보기 / 태블릿 보기" 패턴 |
| **다국어 콘텐츠 모델** | `MultilingualProductContent` / `multilingual-product-content.controller` | 랜딩 콘텐츠 재사용 |
| **구독 게이트** | `store_paid_feature_entitlements` + `GET /store-entitlements/me/check` (serviceKey='kpa', planCode=FOREIGN_VISITOR_SALES_SUPPORT) | 파트너 메뉴도 동일 게이트 적용 |
| **진입 화면/라우트/사이드바** | `ForeignVisitorSalesSupportPage`(`/store/sales-channels/foreign-visitor`) · `ForeignVisitorSalesSupportPanel`(store-ui-core) · `StoreSidebar` 키 `foreign-visitor-sales-support`(Globe) | 하위 메뉴 `.../partners` 추가 지점 |
| **범용 매장 QR/라이브러리** | `StoreQrPage`(glyco/kcos) · `HubQrLibraryPage` · `store-library.controller` | QR 라이브러리 패턴 참고 |
| **Store production material 템플릿** | `kpa_store_contents`(legacy physical) · `usage_type`+`source_type` 2축 · `ProductionMaterialEditorShell`/`productionMaterials.ts` · POP/사이니지 | QR 템플릿을 production material 축으로 확장 가능 |

**재사용 결론:** 파트너 QR V1 은 **신규 QR 생성기를 만들지 않는다**. `generateQrSvg` + public landing 위에 `partnerId/campaignId` 식별과 scan event 기록만 추가한다.

## 12. 화면 흐름 초안

### 매장 경영자 (`/store/sales-channels/foreign-visitor/partners`)
파트너 목록·등록·상세 / QR 생성·다운로드·템플릿 선택 / 스캔 수 확인 / 방문·구매 메모. (구독 게이트 적용)

### 운영자 (`/operator/foreign-visitor/partners`) — 후순위, 조회 중심
서비스 전체 파트너 현황 / 매장별 QR 발급 현황 / 스캔·방문 통계 / 부정 사용 모니터링.

**V1 은 매장 화면 중심, 운영자 화면은 조회 중심 후순위.**

## 13. 랜딩 페이지 / 개인정보·보안

랜딩 필수 요소: 매장명·언어 선택·방문 안내·주요 상품/카테고리·**현장 결제 안내**·지도/주소·영업시간·주의사항. (기존 다국어 landing 재사용)
다국어 후보: 한/영/중간/중번/일/베트남/태국어.

**금지:** 온라인 상품 결제·소비자 checkout·Toss 결제.

**개인정보/보안 (V1 권장):**
- 관광객 개인정보 **미수집**(SCAN 이벤트는 익명).
- IP 는 원문 저장 금지 → **hash/익명화**(`ipHash`).
- QR 악용/재사용 방지: shortCode 난수성 + status/validFrom/validTo 게이트.
- 중복 귀속(파트너 여럿): V1 은 "마지막 스캔 QR 귀속" 또는 수기 확인 — 정책 쟁점(§16).

## 14. 경계 명시 — 기존 "판매자/공급자 모집 파트너"와 다름 (**필수**)

repo 의 기존 "partner" 는 전부 **Neture 판매자/공급자 B2B 제휴** 모델이며, 이번 외국인 관광객 **유입 파트너**와 **완전히 별개**다. 혼동 금지.

| 구분 | 기존 (재사용/혼동 금지) | 이번 IR |
|------|------|------|
| 본질 | B2B 공급/판매 제휴 + 커미션 정산 | 관광객 **유입** 식별 + 성과 기록 |
| 모델 | `NetureSellerPartnerContract`(`modules/neture/entities`), `partner-recruitment.controller`, `partner-contract.service`, `partner-commission.service`, `partner-commerce.controller`, `seller.controller`, migration `...CreateSellerPartnerContractTable` | 신규 `Partner`/`PartnerQrCode`/`PartnerQrScanEvent`(외국인 관광객 도메인) |
| 정산 | O4O B2B 주문 기반 commission | **O4O 결제 무관** — POS/매장/수기 기준 |
| 모집 | `StoreRecruitmentApplicationsPage`(cross-service 판매자 모집 신청) | 해당 없음 |

→ 신규 모델은 **`modules/neture` 의 seller partner 와 테이블/네임스페이스를 공유하지 않는다.** 외국인 관광객 판매지원 도메인(store/organizationId 경계)에 둔다.

## 15. V1 / V2 범위 분리

```
V1
- 파트너 단위 QR (+ optional campaignName)
- AFFILIATE_MARKETING QR 템플릿
- 다국어 랜딩(기존 재사용) + 파트너/QR 식별
- SCAN 이벤트 기록(익명) + 매장 확인/수기 매출 입력 가능성 검토
- 매장 경영자 화면 중심
- O4O 결제 없음 / 현장 결제 안내

V2
- POS/DSL 매출 연동 (§9 문의 결과 반영)
- 매출 기반 수수료 + 자동 정산
- 캠페인 단위 QR 정식화 / 운영자 통계 화면 / EVENT_COUPON
```

## 16. 정책 쟁점 (결론 또는 후속)

1. 파트너 수수료 지급 주체 — 매장 / 본사·운영사 / 별도 정산 주체? **(후속 결정 필요)**
2. 수수료 기준 — 스캔/방문/구매건수/매출액/수기 합의? **(V1=스캔+수기, V2=매출)**
3. POS 매출 ↔ QR 유입 연결 방식 — **§9 업체 문의 결과 의존.**
4. 파트너 다중 귀속 처리 — **V1 = 마지막 스캔 귀속 또는 수기.**
5. 관광객 개인정보 — **V1 = 미수집(고정).**
6. QR 악용/재사용 방지 — shortCode 난수 + status/유효기간.
7. QR 유효기간 — validFrom/validTo (optional, 캠페인 시 권장).
8. 파트너별 언어/상품군 차등 노출 — V2 후보.

## 17. 후속 WO 제안

```
WO-O4O-FOREIGN-VISITOR-PARTNER-MODEL-V1          파트너 등록/목록 backend model/API + 매장별 관리
WO-O4O-FOREIGN-VISITOR-AFFILIATE-QR-TEMPLATE-V1  제휴마케팅 QR 템플릿 + generateQrSvg 재사용 생성/다운로드
WO-O4O-FOREIGN-VISITOR-AFFILIATE-LANDING-V1      QR 스캔 랜딩(기존 다국어 landing 확장) + 파트너/QR 식별
WO-O4O-FOREIGN-VISITOR-QR-SCAN-EVENT-V1          SCAN 이벤트 기록(개인정보 최소화, ipHash)
IR-O4O-FOREIGN-VISITOR-POS-DSL-INTEGRATION-V1    DSL/POS 연동 가능성 조사 + §9 업체 문의 결과 반영
```

## 18. 검증 (IR 자체)

- ✅ 코드/DB/migration/결제 route 변경 **0** (문서 전용).
- ✅ STORE_SALE_PAYMENT 정책 유지(소비자 결제 없음) · Neture B2B 미접촉.
- ✅ 기존 판매자 모집/공급자 파트너 모델과 **경계 명시(§14)**.
- ✅ DSL/POS 업체 문의 항목 포함(§9) · V1/V2 분리(§15).

---

## 19. 결론

외국인 관광객 판매지원에서 QR 은 **파트너/가이드/캠페인 식별 제휴마케팅 단위**다. 단 V1 은 자동 수수료 정산·POS 매출 연동까지 가지 않는다:

```
V1: 파트너 단위 QR · 다국어 랜딩(기존 재사용) · SCAN 이벤트 · 수기/운영 확인
V2: POS/DSL 연동 · 매출 기반 수수료 · 자동 정산
```

핵심은 **신규 QR/landing 인프라를 만들지 않고**(§11 재사용), **결제를 도입하지 않으며**(§2), **기존 Neture seller partner 와 도메인을 분리**(§14)하는 것이다. 이렇게 하면 현재 `FOREIGN_VISITOR_SALES_SUPPORT` 구독 기능 위에 매장 운영용 제휴 유입 구조를 안전하게 얹을 수 있다.

---

*Date: 2026-06-23 · IR(문서 전용) · 파트너 단위 QR(+optional 캠페인) · AFFILIATE_MARKETING 템플릿 · 기존 generateQrSvg/다국어 public landing 재사용 · SCAN 이벤트 익명(ipHash) · O4O 결제 없음/현장 결제 안내 · Neture seller partner 도메인 분리 · POS/DSL=V2 · code/DB/migration 0.*
