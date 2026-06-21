# CHECK — SERVICE_ACCESS 용어 정렬 및 STORE_SERVICE_SUBSCRIPTION 의미 고정 V1

**WO:** `WO-O4O-SERVICE-ACCESS-TERMINOLOGY-ALIGN-V1`
**일자:** 2026-06-21
**성격:** 문서/용어 정렬 — **코드/DB/migration/entity/route/API/UI 무변경.** 문서 3건 배너 정정 + 본 CHECK.
**상위:** `IR-O4O-TOSS-PAYMENT-SCOPE-REVISION-STORE-SUBSCRIPTION-AND-B2B-V1` · `IR-O4O-PAYMENT-SCOPE-STORE-SALE-VS-SERVICE-SUBSCRIPTION-AUDIT-V1`

---

## 1. git 상태 / 다른 세션 WIP

- `git status --short`: untracked `apps/api-server/src/routes/platform/entities/operator-multilingual-product-content-*.entity.ts`(다른 세션 WIP — multilingual 후속, 결제/용어 무관)만 존재. **미접촉.**
- 본 WO 변경 = 문서 4건뿐(3 배너 + 본 CHECK). 코드 0.

## 2. SERVICE_ACCESS 코드 사용처 재확인 (중단 기준 #1 점검)

| 경로 | 결과 |
|---|---|
| `apps/**` (backend) | **0건** — 결제 `SERVICE_ACCESS` 미존재 |
| `packages/**` | **0건** |
| `services/**` (frontend) | 2건 — **`SERVICE_ACCESS_TOKEN_KEY`** (`web-glycopharm`/`web-kpa-society` AuthContext) |

- 프론트 2건은 `glycopharm_service_access_token` / `kpa_pharmacy_service_access_token` **localStorage 키**(service-user **인증 토큰**, `WO-AUTH-SERVICE-IDENTITY-PHASE2`). **결제 타입 `SERVICE_ACCESS` 와 완전 무관**한 substring 오탐.
- → **결제 의미의 `SERVICE_ACCESS` 는 코드 0건** 재확인. 중단 기준 #1(코드 enum/route/API 발견) **미해당**. 순수 문서 정렬로 진행.

> 주의: `SERVICE_ACCESS_TOKEN_KEY`(auth)는 본 WO 와 무관 — **건드리지 않는다.**

## 3. SERVICE_ACCESS 문서 사용처 (5건)

| 문서 | 처리 |
|---|---|
| `IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1.md` | **배너 정정** ✅ |
| `IR-O4O-PAYMENTCORE-PAYMENT-TYPE-AXIS-DECISION-V1.md` | **배너 정정** ✅ (paymentType 값 + `o4o_sa_`→`o4o_sub_`) |
| `CHECK-O4O-TOSS-PAYMENT-CORE-V1.md` | **배너 정정** ✅ |
| `IR-O4O-TOSS-PAYMENT-SCOPE-REVISION-STORE-SUBSCRIPTION-AND-B2B-V1.md` | 정정 주체 — 불요 |
| `CHECK-O4O-PAYMENT-SCOPE-STORE-SALE-VS-SERVICE-SUBSCRIPTION-AUDIT-V1.md` | audit(원인 보고) — 불요 |

- `o4o_sa_` prefix 문서: revision IR(정정 주체) + AXIS-DECISION(배너로 `o4o_sub_` 정정 명시). 둘 다 처리됨.
- **과거 문서 본문은 rewrite 하지 않고**(§8.2 권장) 상단 정정 배너만 추가했다.

## 4. 정렬 기준 (고정)

### 4.1 결제 타입
```ts
paymentType = 'STORE_SERVICE_SUBSCRIPTION' | 'B2B_ORDER'
```
- `SERVICE_ACCESS` = 구 문서 전용 용어 → `STORE_SERVICE_SUBSCRIPTION` 으로 정렬. **새 문서/후속 WO 에서 `SERVICE_ACCESS` 를 결제 타입으로 쓰지 않는다.**

### 4.2 STORE_SERVICE_SUBSCRIPTION 의미
- **매장 경영자가 O4O 부가 서비스를 사용하기 위해 구독하는 결제.** 결제 주체 = 매장 경영자/매장 조직(organizationId).
- V1 대상 = `FOREIGN_VISITOR_SALES_SUPPORT`.

### 4.3 FOREIGN_VISITOR_SALES_SUPPORT 의미 (고정)
- **매장 경영자 서비스 구독 플랜** (다국어/관광객 응대/QR·SNS 안내/직원용 판매 보조 등).
- **금지 해석:** 외국인 고객 상품 구매 결제 · 외국인 전용 결제 · 국적 결제 분기 · 매장 POS 대체.
- planCode 명칭은 V1 유지(기존 구현 충돌 최소화), 의미만 고정. 향후 명칭 후보(MULTILINGUAL/TRAVELER…)는 별도.

### 4.4 paid-feature entitlement 의미 (고정)
- `store_paid_feature_entitlements` = **매장 경영자 O4O 부가 서비스 구독 권한 관리 테이블.** 삭제 대상 아님.
- V1 판단 플랜 = `FOREIGN_VISITOR_SALES_SUPPORT`. **고객 결제/소비자→매장 결제와 연결하지 않는다.**

### 4.5 PaymentCore metadata / orderId 정정
| 항목 | 구(정정 전) | 신(정정 후) |
|---|---|---|
| `metadata.paymentType` | `SERVICE_ACCESS` | `STORE_SERVICE_SUBSCRIPTION` |
| orderId prefix | `o4o_sa_<...>` | `o4o_sub_<...>` |
| `targetRefType` | `paid_feature_entitlement` | `store_paid_feature_entitlement` |
- 옵션 A(metadata 기반, **o4o_payments/PlatformPayment 스키마 무변경**) 원칙 유지. paymentType 1급 컬럼 추가 없음.

## 5. 검증 (§10 대비)

| 항목 | 결과 |
|---|---|
| backend 결제 `SERVICE_ACCESS` 사용처 0 | ✅ (프론트 2건은 auth 토큰 키 — 무관) |
| 후속 문서에서 SERVICE_ACCESS 결제 타입 미사용 정렬 | ✅ (배너 3건) |
| STORE_SERVICE_SUBSCRIPTION = 매장 경영자 구독 축 고정 | ✅ |
| FOREIGN_VISITOR_SALES_SUPPORT = 구독 플랜(고객 결제 아님) 고정 | ✅ |
| paid-feature entitlement 삭제 없음 | ✅ |
| PaymentCore/o4o_payments 스키마 변경 없음 | ✅ |
| KPA/Glyco/KCos 고객 checkout cleanup 미수행(분리) | ✅ |
| 코드/DB/API/UI 변경 없음 | ✅ |

## 6. 중단 기준 점검 (§11)

- #1 (코드 enum/route/API 에 SERVICE_ACCESS): **미해당** — 결제 SERVICE_ACCESS 코드 0(프론트 2건은 auth 토큰 키).
- #3 (고객 checkout cleanup 필요 코드): 발견되나 **본 WO 미수행** → `WO-O4O-STORE-SALE-PAYMENT-EXCLUSION-CLEANUP-V1` 로 분리(상위 IR §8 결정 유지).
- #4 (다른 세션 WIP 충돌): multilingual entity untracked 파일 **미접촉**.
- #5 (PaymentCore 스키마 변경): **불요/미수행.**

## 7. 무변경 확인

- 코드/entity/migration/route/service/UI **무변경**. entity·route 삭제 0. entitlement 삭제 0. PaymentCore/o4o_payments 무변경.
- 변경 = 문서 3건 상단 정정 배너 + 본 CHECK 1건. 다른 세션 WIP 미접촉.

## 8. 후속 WO 연결

```text
1. WO-O4O-STORE-SALE-PAYMENT-EXCLUSION-CLEANUP-V1     ← KPA/Glyco/KCos 고객 checkout→O4O Toss 정리(선조사)
2. WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1  ← FOREIGN_VISITOR_SALES_SUPPORT 구독 결제 + entitlement ACTIVE
3. WO-O4O-B2B-ORDER-PURPOSE-V1                        ← STORE_STOCK / STORE_CUSTOMER_FULFILLMENT / MARKETPLACE_FULFILLMENT_RESERVED
```

---

*Date: 2026-06-21 · CHECK · 문서/용어 정렬 · 코드 무변경 · 결제 SERVICE_ACCESS 코드 0건 재확인(프론트 2건=auth 토큰 키, 무관) · 문서 3건 배너 정정(SERVICE_ACCESS→STORE_SERVICE_SUBSCRIPTION, o4o_sa_→o4o_sub_) · FOREIGN_VISITOR_SALES_SUPPORT=매장 경영자 구독 플랜 고정 · paid-feature entitlement 보존 · PaymentCore 스키마 무변경.*
