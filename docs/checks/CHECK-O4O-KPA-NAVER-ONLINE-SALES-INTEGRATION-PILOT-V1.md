# CHECK-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1

> **WO**: [`WO-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1`](../work-orders/WO-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1.md)
> **선행**: [`CHECK-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1`](CHECK-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1.md) (`843dce7ad`)
> **상태**: **PARTIAL / 중지 보고** — 조사·매핑·가드·adapter 완료, **상품 1건 E2E 미수행**
> **중지 사유**: 네이버 커머스 API 자격정보(판매자 계정 + API센터 애플리케이션) 미발급 — WO §5 중지 조건 해당
> **작성일**: 2026-08-12

---

## 0. 요약

| 범위 | 상태 |
|---|---|
| 네이버 공식 API 재조사 | ✅ 완료 (§1) |
| O4O ↔ 네이버 필드 매핑 | ✅ 완료 (§2) — 코드로 고정 |
| `assertExternalSalesEligible` | ✅ 구현 + 단위 테스트 33건 (§3) |
| 네이버 adapter (인증·등록·수정·조회·삭제) | ✅ 구현 (§4) — 실호출 미수행 |
| 연동 상태 저장소 | ⏸ **설계만** (§5) — migration 은 승인 후 (WO §5) |
| 상품 1건 E2E | ❌ **미수행** (§6) — 자격정보 부재 |
| 의약품 차단 반대 검증 | ✅ 단위 테스트로 수행 / ❌ 실채널 검증 미수행 |

**핵심 결론 3가지**

1. **O4O 상품 구조로는 네이버 등록 필수 필드를 채울 수 없다.** 결손은 상품 데이터가 아니라
   **판매 조건**(카테고리·재고·배송비·반품비·주소록·A/S·상품정보제공고시)이다 → §2-3.
2. **Cloud Run 배포 형태가 네이버 IP 화이트리스트(최대 3개)와 충돌한다.** 자격정보를 받아도
   Cloud NAT 정적 egress IP 가 선행되지 않으면 호출 자체가 불가능하다 → §1-5.
3. eligibility 판정은 **기존 SSOT 재정의 없이** `isDrugRegulatoryType()` 을 재사용했다.
   저장소에 의약품 판정 기준이 두 개가 되지 않는다 → §3-2.

---

## 1. 네이버 커머스 API 조사 (공식 문서 기준)

조사 시점 2026-08-12. 정본은 [커머스 API센터](https://apicenter.commerce.naver.com/ko/basic/commerce-api)
및 [공식 GitHub](https://github.com/commerce-api-naver/commerce-api) 이다.

> 공식 문서 사이트는 자동 조회가 차단되어 있어(fetch 403), 공식 GitHub Discussions 의
> **네이버 운영자 답변**과 공개 가이드를 교차 확인해 정리했다. 아래 §1-6 에 미확정 항목을 분리했다.

### 1-1. Base URL · 버전

```text
https://api.commerce.naver.com/external
```

- 상품 API 는 **v2** 를 쓴다. v1 상품 API 는 2022-12-21 서비스 종료.
- 주문(pay-order) API 는 v1 경로를 유지한다.

### 1-2. 인증 — OAuth2 client_credentials + bcrypt 전자서명

`client_secret` 을 **직접 전송하지 않는다.** bcrypt salt 로만 쓴다.

```text
1) password  = "{client_id}_{timestamp}"        (timestamp = epoch milliseconds, 13자리)
2) hashed    = bcrypt(password, salt = client_secret)
3) signature = base64(hashed)
```

```http
POST /external/v1/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=...&timestamp=...&client_secret_sign={signature}
&grant_type=client_credentials&type=SELF
```

- 응답 `access_token` 을 이후 `Authorization: Bearer {token}` 으로 사용.
- 서명은 timestamp 마다 달라지므로 **토큰 만료 시 재생성**한다 (재사용 불가).

### 1-3. 상품 API

| 행위 | Method · Path |
|---|---|
| 등록 | `POST /external/v2/products` |
| 채널상품 조회 | `GET /external/v2/products/channel-products/{channelProductNo}` |
| 채널상품 수정 | `PUT /external/v2/products/channel-products/{channelProductNo}` |
| 채널상품 삭제 | `DELETE /external/v2/products/channel-products/{channelProductNo}` |
| 전체 카테고리 조회 | 카테고리 조회 API (leafCategoryId 확보용) |

**주의 — 번호가 2종이다.** `originProductNo`(원상품)와 `channelProductNo`(채널상품)는
같은 상품이라도 값이 다르다. 스마트스토어 URL 에 보이는 값은 **채널상품번호**이며,
조회·수정·삭제는 채널상품번호를 쓴다. → 저장소 설계에서 **둘 다 저장**한다 (§5).

**부분 수정이 없다.** 가격만 바꿔도 필수 필드를 포함한 전체 payload 를 다시 보내야 한다
(조회 → 병합 → 전체 전송).

#### 상품 등록 필수 필드

```text
originProduct.statusType
originProduct.leafCategoryId
originProduct.name
originProduct.images.representativeImage.url
originProduct.detailContent                        (HTML String — 따옴표 JSON escape 필요)
originProduct.salePrice
originProduct.deliveryInfo.deliveryType
originProduct.deliveryInfo.deliveryAttributeType
originProduct.deliveryInfo.deliveryFee.deliveryFeeType
originProduct.deliveryInfo.claimDeliveryInfo.returnDeliveryFee
originProduct.deliveryInfo.claimDeliveryInfo.exchangeDeliveryFee
originProduct.detailAttribute.afterServiceInfo.*   (A/S 전화·안내 — 법정)
originProduct.detailAttribute.productInfoProvidedNotice  (상품정보제공고시 — 법정, 카테고리별 상이)
```

- 카테고리가 KC 인증 등을 요구하면 카테고리 조회 API 의 `certificationInfos` 에 표시되며
  해당 인증 정보를 함께 보내야 한다. 어린이제품 인증 비대상이면
  `childCertifiedProductExclusionYn=true` 로 회피 가능.
- 출고지/반품지는 **주소록 ID**(`addressBookNo`)로 지정하며, 스마트스토어센터에 사전 등록되어 있어야 한다.

### 1-4. 주문 API (조사만 — 구현은 후속 WO)

| 행위 | Method · Path |
|---|---|
| 변경 상품주문 내역 조회 | `GET /external/v1/pay-order/seller/product-orders/last-changed-statuses` |
| 상품주문 상세 조회 | `POST /external/v1/pay-order/seller/product-orders/query` |
| 발주확인 · 발송처리 · 취소/반품/교환 | `pay-order/seller` 하위 claim API 군 |

- 표준 폴링 패턴: **변경 내역 조회(주기적)** → 변경된 주문번호로 **상세 조회**.
- `placeOrderStatus`(발주상태)는 스마트스토어센터에서 발주확인하거나 발주확인 API 가
  정상 응답했을 때 변경된다.
- **조회 기간 제약: 시작일로부터 180일 이내**.

### 1-5. 운영 제약 (연동 전 반드시 해소)

| 제약 | 내용 | O4O 영향 |
|---|---|---|
| **호출 IP 화이트리스트** | 애플리케이션별 **최대 3개** IP 사전 등록 필수 | **Cloud Run egress IP 는 고정되지 않는다.** Cloud NAT 정적 IP 선행 필요 — 인프라 변경(CLAUDE.md 중지 조건) |
| 애플리케이션 인증 갱신 | 주기적 재인증 필요, 만료 시 앱 **휴면 처리** | 운영 절차 필요 (만료 감시) |
| Rate limit | 토큰 버킷, API별 초당 한도 + 사용자별 시간당 상한. 상위 계층 초과 시 하위 여유와 무관하게 거부 | 배치 동기화 시 백오프 필요 |
| 샌드박스 | 공개 샌드박스 확인되지 않음 | 검증은 실계정에서 **판매중지 상태**로 수행 (adapter 기본값 `SUSPENSION`) |

### 1-6. 공식 문서 미확인 항목 (추정하지 않고 남긴다)

- API별 정확한 초당/시간당 호출 한도 수치
- 오류 코드 전체 체계
- 이미지 외부 URL 직접 참조 허용 범위 vs 이미지 업로드 API 선행 필요 여부
- 판매자 자격(사업자 유형·카테고리별 서류)에 따른 등록 제한 세부

→ 자격정보 확보 후 실호출로 확정한다.

---

## 2. O4O B2C 상품 ↔ 네이버 필드 매핑

매핑은 문서가 아니라 **코드로 고정**했다 —
[`naver-product.mapper.ts`](../../apps/api-server/src/modules/external-sales/channels/naver/naver-product.mapper.ts).
목록이 축소되면 계약 테스트가 깨진다.

### 2-1. O4O 기존 데이터로 채울 수 있는 필드 (`O4OProductSource`)

| 네이버 필드 | O4O 원천 |
|---|---|
| `originProduct.name` | `product_masters.name` |
| `originProduct.salePrice` | `organization_product_listings.price` |
| `originProduct.detailContent` | `shared_product_descriptions` STORE canonical (HTML) |
| `images.representativeImage.url` | `product_images` (`is_primary=true`) |
| `images.optionalImages[]` | `product_images` (`sort_order` 순) |
| `detailAttribute.brandName` | `product_masters.brand_name` |
| `detailAttribute.manufacturerName` | `product_masters.manufacturer_name` |
| `detailAttribute.originAreaInfo` | `product_masters.origin_country` |

→ **상품 정체성·표현 축은 O4O 가 이미 갖고 있다.** 별도 판매상품 원장이 필요 없음이 확인된다.

### 2-2. 추가 입력이 필요한 필드 (`NaverChannelInput`) — 후속 UI 범위

| 네이버 필드 | 결손 이유 |
|---|---|
| `leafCategoryId` | O4O 카테고리와 **체계가 다르다** — 매핑 테이블 필요 |
| `stockQuantity` | **O4O 에 매장 재고 개념이 없다** |
| `deliveryFee.deliveryFeeType` · `baseFee` | 배송 정책 원천 없음 |
| `claimDeliveryInfo.returnDeliveryFee` | 반품비 원천 없음 |
| `claimDeliveryInfo.exchangeDeliveryFee` | 교환비 원천 없음 |
| `claimDeliveryInfo.returnAddress` (출고지 주소록 ID) | 스마트스토어센터 사전 등록 값 |
| `claimDeliveryInfo.refundAddress` (반품지 주소록 ID) | 스마트스토어센터 사전 등록 값 |
| `afterServiceInfo.afterServiceTelephoneNumber` | **법정 필수**, 원천 없음 |
| `afterServiceInfo.afterServiceGuideContent` | **법정 필수**, 원천 없음 |
| `productInfoProvidedNotice` | **법정 필수**, 카테고리별 항목 상이 |

### 2-3. 판정 — 결손의 성격

결손 10건은 전부 **상품 데이터가 아니라 판매 조건**이다. 즉 O4O 상품 구조에 결함이 있는 것이
아니라, **매장이 외부 채널에서 팔기 위한 조건을 아직 입력받은 적이 없다**는 뜻이다.

→ WO §5 의 "필수 필드 대량 결손이면 파일럿 강행 금지" 는 **해당하지 않는다**(상품 축은 충족).
   다만 §2-2 를 입력받는 UI 없이는 등록이 불가능하므로 **후속 WO 의 1순위**다.

**임의 기본값을 코드에 박지 않았다.** 배송비·반품비를 추측해 넣으면 실제 정산에서 매장이
손해를 본다. 대신 `collectMissingRequired()` 가 등록 전에 결손을 실측해 보고한다.

---

## 3. `assertExternalSalesEligible`

### 3-1. 위치

```text
apps/api-server/src/modules/external-sales/
├── guards/external-sales-eligibility.guard.ts   ← 모든 외부 채널 adapter 앞단
└── channels/naver/                              ← 쿠팡은 channels/coupang/ 으로 붙는다
```

`modules/external-sales/` 를 신설했다. **신규 도메인·신규 상품 원장이 아니라 adapter 계층**이며,
기존 공용 모듈을 수정하지 않았다(cross-service 영향 0).

### 3-2. 판정 기준 — `product_masters.regulatory_type` 하나뿐

| 입력 | 판정 |
|---|---|
| `DRUG` · `의약품` (대소문자·공백 무관) | **차단** `EXTERNAL_SALES_DRUG_FORBIDDEN` |
| `QUASI_DRUG` · `HEALTH_FUNCTIONAL` · `MEDICAL_DEVICE` · `COSMETIC` · `GENERAL` | 통과 |
| `null` · `''` · 공백 / master 미존재 / UUID 오류 / 조회 실패 | **차단** `EXTERNAL_SALES_PRODUCT_UNRESOLVED` (fail-closed) |

- **serviceKey · organizationId · role 을 입력받지 않는다.** 서비스별로 분기할 표면도,
  우회할 표면도 만들지 않기 위해서다.
- 상품명 등 **텍스트 휴리스틱을 쓰지 않는다** (WO 금지 항목). 테스트로 고정했다 —
  이름이 의약품처럼 보여도 `regulatory_type` 이 비의약품이면 통과, 그 반대도 성립.
- 의약품 판정은 `drug-access.guard.isDrugRegulatoryType()` 을 **import 해서 쓴다.**
  여기서 재정의하지 않는다 → 저장소 전체에서 의약품 판정 SSOT 는 계속 1개.

### 3-3. 적용 지점 2곳

`ExternalSalesAction` 으로 구분하되 **판정 기준은 동일**하다 (행위별로 기준이 달라지면
그 자체가 우회 표면이 된다). `action` 은 감사 로그용이다.

| 지점 | action |
|---|---|
| 최초 등록 | `EXTERNAL_PRODUCT_REGISTER` |
| 이후 동기화 | `EXTERNAL_PRODUCT_SYNC` |

등록만 막으면 등록 후 상품 유형 변경·재동기화로 샌다 — 양쪽을 테스트로 고정했다.

### 3-4. 기존 의약품 가드 3축과의 관계

| 가드 | 축 | 약국 대상 서비스에서 |
|---|---|---|
| `drug-access.guard` | 유입(진열·offer·확산) | **허용** |
| `drug-commerce.guard` | O4O 내부 거래(장바구니·주문) | 예외 없이 거부 |
| **`external-sales-eligibility.guard`** | **외부 채널 반출** | **예외 없이 거부** |

---

## 4. 네이버 adapter

[`naver-commerce.client.ts`](../../apps/api-server/src/modules/external-sales/channels/naver/naver-commerce.client.ts)

| 구현 | 비고 |
|---|---|
| 전자서명 생성 (`createNaverSignature`) | bcrypt salt 규격 |
| 토큰 발급 + 메모리 캐시 | 만료 60초 전 재발급 |
| `createProduct` | `POST /v2/products` |
| `getChannelProduct` | 상태 조회 |
| `updateChannelProduct` | 전체 payload 전송 |
| `deleteChannelProduct` | 파일럿 되돌리기 |

- 자격정보는 **환경변수에서만** 읽는다 (`NAVER_COMMERCE_CLIENT_ID` · `NAVER_COMMERCE_CLIENT_SECRET`).
  미설정 시 `NaverCommerceConfigError` 로 즉시 실패한다 — 미구성 상태가 조용히 넘어가지 않는다.
- 코드·문서·커밋 어디에도 자격정보를 하드코딩하지 않았다.
- **dependency 추가 없음** — `bcrypt`·`axios` 는 api-server 기존 의존성.
- 파일럿 기본 상태는 `SUSPENSION`(판매중지). 실수로 고객에게 노출되지 않는다.

---

## 5. 연동 상태 저장소 — **설계만 (승인 대기)**

WO §5 에 따라 **migration 을 작성하지 않았다.** 아래는 승인 요청용 설계안이다.

```sql
CREATE TABLE external_channel_product_links (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL,           -- 매장
  master_id                 uuid NOT NULL,           -- product_masters (상품 복제 아님, 참조)
  listing_id                uuid NULL,               -- organization_product_listings
  channel_code              varchar(32) NOT NULL,    -- 'NAVER' | 'COUPANG'
  external_origin_product_id   varchar(64) NULL,     -- 네이버 originProductNo
  external_channel_product_id  varchar(64) NULL,     -- 네이버 channelProductNo (조회·수정 키)
  channel_input             jsonb NULL,              -- §2-2 추가 입력값 (카테고리·배송비·주소록 등)
  sync_status               varchar(24) NOT NULL DEFAULT 'NOT_LINKED',
                            -- NOT_LINKED | PENDING | LINKED | FAILED | UNLINKED
  last_synced_at            timestamptz NULL,
  last_error                text NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, master_id, channel_code)
);
```

**설계 원칙**

- 저장하는 것은 **연동 상태뿐**이다. 상품명·가격·이미지는 저장하지 않는다 —
  읽을 때 O4O 원장에서 가져온다. 별도 판매상품 원장 금지(WO §1).
- `channel_code` 로 쿠팡이 같은 테이블에 붙는다. 채널별 테이블을 만들지 않는다.
- `channel_input` 을 jsonb 로 둔 이유: §2-2 필수 입력이 **채널마다 다르다.**
  네이버 형태로 컬럼을 굳히면 쿠팡에서 다시 깨진다.
- 기존 `external_channels` 테이블(`ExternalChannel` 엔티티, PD-9)이 이미 있다.
  채널 마스터는 그것을 재사용할지 여부를 승인 시 함께 결정해야 한다.

**승인이 필요한 이유**: 신규 테이블 = migration = CLAUDE.md 중지 조건.

---

## 6. E2E — **미수행 (중지)**

| 항목 | 결과 |
|---|---|
| 네이버 판매자 계정 연결 | ❌ 미수행 |
| 상품 1건 등록 → `externalProductId` 저장 | ❌ 미수행 |
| 상태 조회 1회 | ❌ 미수행 |
| 수정 1회 | ❌ 미수행 |
| 등록 해제 / 판매중지 | ❌ 미수행 |
| 의약품 1건 실채널 차단 검증 | ❌ 미수행 (단위 테스트로는 검증됨) |

**중지 사유 (WO §5 해당)**

1. **자격정보 부재** — 네이버 스마트스토어 판매자 계정 및 커머스 API센터 애플리케이션이
   발급되지 않았다. `docs/local/TEST-ACCOUNTS.local.md` 에도 네이버 항목이 없다.
   (CLAUDE.md 중지 조건: "실제 계정 · 자격정보 · 외부 서비스 승인 필요")
2. **IP 화이트리스트 미해소** — 자격정보를 받아도 Cloud Run 정적 egress IP 없이는 호출 불가.
   Cloud NAT 구성은 인프라 변경이라 별도 승인 대상.
3. **저장소 migration 미승인** — `externalProductId` 를 저장할 곳이 아직 없다.

세 조건은 **순서가 있다**: 자격정보 → IP → migration 승인 → E2E.

---

## 7. 검증 결과

| 항목 | 결과 |
|---|---|
| `external-sales-eligibility.spec.ts` | ✅ **33 passed** |
| `naver-product-mapper.spec.ts` | ✅ **9 passed** |
| `tsc --noEmit` (api-server) | ⚠️ **오류 1건 — 본 WO 무관** (아래) |
| 기존 KPA 상품·QR·태블릿·블로그 영향 | ✅ 없음 — 신규 파일만 추가, 기존 파일 0건 수정 |
| DB write | ✅ 없음 (migration 미작성) |

### 7-1. 범위 외 기존 오류 (수정하지 않음)

```text
src/middleware/kpa-branch-scope.middleware.ts(44,3):
  error TS2322: Type '"kpa-branch"' is not assignable to type 'ServiceKey'.
```

- 해당 파일은 커밋 `958f84542`(kpa-branch 서비스 기반 구축)에서 온 **기존 오류**이며
  본 WO 는 이 파일을 건드리지 않았다.
- CLAUDE.md 중지 조건 "현재 변경과 무관한 build·test 실패" 에 해당 → **수정하지 않고 보고**한다.
- 별도 WO 제안: `ServiceKey` union 에 `'kpa-branch'` 반영.

---

## 8. 남은 필수 작업 (순서대로)

| # | 작업 | 성격 | 선행 |
|---|---|---|---|
| 1 | 네이버 스마트스토어 판매자 계정 + 커머스 API센터 애플리케이션 발급 | **사용자 조치** | — |
| 2 | Cloud Run 정적 egress IP(Cloud NAT) 구성 후 API센터에 IP 등록 | 인프라 (승인 필요) | 1 |
| 3 | `external_channel_product_links` migration 작성·적용 | DB (승인 필요) | — |
| 4 | §2-2 추가 입력 UI (`온라인 판매 > 판매 채널`) | 구현 | 3 |
| 5 | O4O 카테고리 → 네이버 leafCategoryId 매핑 | 구현 | 4 |
| 6 | 상품 1건 E2E + 의약품 실채널 차단 검증 | 검증 | 1·2·3 |
| 7 | 주문 동기화 구현 | 후속 WO | 6 |
| 8 | 쿠팡 연동 → 공통 Online Sales 모듈 추출 | 후속 WO | 6 |

---

## 9. 산출물

**신규 (기존 파일 수정 0건)**

```text
apps/api-server/src/modules/external-sales/guards/external-sales-eligibility.guard.ts
apps/api-server/src/modules/external-sales/channels/naver/naver-commerce.client.ts
apps/api-server/src/modules/external-sales/channels/naver/naver-product.mapper.ts
apps/api-server/src/__tests__/security/external-sales-eligibility.spec.ts
apps/api-server/src/__tests__/external-sales/naver-product-mapper.spec.ts
docs/checks/CHECK-O4O-KPA-NAVER-ONLINE-SALES-INTEGRATION-PILOT-V1.md
```

**미생성 (의도적)**

- migration — 승인 대기 (§5)
- route · controller · UI — 저장소 확정 후 (§8-4)
- 주문 API 구현 — WO §4 제외 범위

---

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (`ServiceKey` union `'kpa-branch'` 누락 — §7-1)
