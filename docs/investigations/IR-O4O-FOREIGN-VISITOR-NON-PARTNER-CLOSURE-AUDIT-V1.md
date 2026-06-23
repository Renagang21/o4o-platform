# IR — 외국인 관광객 판매 지원 Non-Partner Closure Audit V1

> **유형:** read-only audit — 코드/DB/migration/API write **무변경**. 본 문서 1개만 산출.
> **작성일:** 2026-06-23
> **목적:** 파트너/제휴 기능을 제외한 `FOREIGN_VISITOR_SALES_SUPPORT` core 가 운영 기준선인지 확인 + 파트너를 확장 축으로 분리.
> **결론(요약): 조건부 PASS.** core(다국어 안내 / QR·public landing / 구독 결제 코드 / entitlement 상태 / 소비자→매장 결제 차단)는 **구현·문서화 완료, 파트너 기능과 독립**. **단 1개 라이브 회귀: Toss `TOSS_PAYMENTS_CLIENT_KEY` 가 deploy-api.yml 에 없어 매 배포마다 제거 → 현재 리비전 placeholder(`test_ck_test_key`) → 실 구독 결제창 불가(§11.4 라이브 미충족).** 파트너 기능은 확장 축으로 분리 가능.

---

## 1. 목적 / 범위

- 파트너 제외 core 6축(다국어 안내 · QR/public landing · 구독 결제 · entitlement 상태 · 소비자 결제 차단 · Toss env)이 운영 가능한지 read-only 점검.
- **비범위:** ForeignVisitorPartner / partner QR(AFFILIATE_MARKETING) / affiliate landing / scan event / POS·DSL / 수수료 / Neture partner / 코드·DB·UI 변경. (파트너 코드는 존재 확인만 — core 판정 미포함.)

## 2. git / 검증 방식

- read-only. `rg`/파일 read/CHECK 문서/git/운영 read-only GET(+ 구독 prepare 1회=CREATED 세션, confirm 미호출)만. 코드/DB/write 0.

## 3. 축별 판정 (실측)

### 3.1 다국어 안내 — **PASS**
- `routes/o4o-store/controllers/multilingual-product-content.controller.ts`(store-scoped, `/public/multilingual-product-contents/:publicKey` 비인증 resolve) · `MultilingualProductPublicLandingPage.tsx`(모바일+태블릿) · `MultilingualPublicActions.tsx` · `multilingualProductContentStore.ts`(publicKey 발급/resolve).
- **organizationId 기준 store-scoped — 파트너 비의존.** 매장 단위로 다국어 안내 생성→publicKey→QR/URL/태블릿 열람 가능.

### 3.2 QR / public landing 기반 — **PASS**
- `services/qr-print.service.ts` `generateQrSvg(url, size)` 공통 인프라. multilingual landing(`/multilingual-products/:publicKey`) + store-qr-landing 재사용. 신규 QR 엔진 개발 불요.

### 3.3 구독 결제 — **PASS (코드/문서)**, 단 §3.6 env 회귀로 라이브 결제창 차단
- `store-entitlement.routes.ts`: `POST /subscriptions/prepare`·`/confirm`(PaymentCore 재사용) + `GET /subscriptions/plans`. `store-service-subscription-plan-catalog.ts`(V1_FIXED_CATALOG SSOT). `activateOrExtend`(결제 성공 → entitlement ACTIVE 생성/연장).
- 라이브 prepare(인증): `orderId=o4o_sub_…` · `amount=99000` · `isTestMode=true` ✅ — 규약/금액/catalog 정상.
- 완료 WO: STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT / PLAN-CATALOG / ENDSAT-EXPOSURE / SMOKE(11/12).

### 3.4 소비자→매장 결제 차단 — **PASS**
- `kpa|glycopharm|cosmetics-payment.controller.ts` prepare/confirm → **410 `STORE_SALE_PAYMENT_DEPRECATED`**(PaymentCore 도달 전). KPA storefront checkout → POS 안내. 라이브 smoke PASS(`CHECK-O4O-STORE-SALE-PAYMENT-EXCLUSION-DEPLOY-SMOKE-V1`).

### 3.5 entitlement 상태 표시 — **PASS**
- 라이브 `GET /store-entitlements/me/check` keys = `active, status, featureCode, startsAt, endsAt, planCode, serviceKey` ✅. 프론트(Panel/Page)는 endsAt 표시 구현(`ENDSAT-EXPOSURE` 라이브 PASS). 매장 경영자가 활성/만료일 확인 가능.

### 3.6 Toss env — **회귀(FAIL, 라이브)**
- adapter: `process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key'`.
- **현재 api 리비전 env 에 TOSS_PAYMENTS_CLIENT_KEY 부재** → clientKey 가 placeholder `test_ck_test_key` 로 fallback(라이브 prepare 확인). isTestMode=true.
- **근본 원인:** `deploy-api.yml` 의 `--set-env-vars` 목록에 `TOSS_PAYMENTS_CLIENT_KEY` 미포함. `--set-env-vars` 는 **미등록 env 를 매 배포마다 제거**(메모리 LESSON: "deploy-api.yml --set-env-vars replaces ALL env vars"). `CHECK-O4O-TOSS-CLIENT-KEY-CONFIG-AND-WIDGET-SMOKE-V1` 가 out-of-band(gcloud update)로 설정했으나, 이후 api 배포(scan-event 등)가 덮어써 회귀.
- 영향: §11.4 라이브 미충족. 실 Toss 결제창은 placeholder 키로 열 수 없음(코드는 정상 — 설정 영속성 문제).

## 4. 파트너 기능 분리 결론

```text
Non-partner core (운영 기준선): 매장 구독 → 다국어 안내 → QR/URL/태블릿 안내 → entitlement 상태 → 소비자 현장 결제(O4O 제외).
Partner extension (분리): 파트너 등록 → 파트너별 QR → affiliate landing → scan event → POS/DSL/수수료.
```
- core(구독 결제 entitlement gate · 다국어 store-scoped · QR landing)는 `ForeignVisitorPartner`/partner-QR/scan **미의존**. 파트너 모듈은 같은 entitlement gate 를 소비하는 별도 축 → **확장으로 안전히 분리 가능.**

## 5. 핵심 질문 답변 (§5)

| Q | 답 |
|---|---|
| 1. 파트너 없이 구독 서비스 설명 가능? | ✅ (core 6축 중 5 PASS, 파트너 비의존) |
| 2. 매장 경영자 구독 상태 확인? | ✅ (/me/check active+endsAt) |
| 3. 다국어/QR/public landing 존재? | ✅ |
| 4. 소비자→매장 온라인 결제 차단? | ✅ (410 + POS 안내) |
| 5. Toss 구독 결제 실결제 전까지 안전 구현? | ⚠️ 코드 PASS, **라이브 clientKey 회귀(placeholder)** → 결제창 불가 |
| 6. 남은 확인? | §6 |
| 7. 파트너 분리 가능? | ✅ |

## 6. 남은 운영 확인 항목 (잔여)

```text
[CRITICAL] TOSS_PAYMENTS_CLIENT_KEY(+ SECRET_KEY) 를 deploy-api.yml --set-env-vars 에 영속화
           — 안 하면 매 api 배포마다 placeholder 회귀, 실 구독 결제 영구 불가.
[ ] 실브라우저 Toss 결제창 시각 확인(실 clientKey 영속 후)
[ ] sandbox confirm 검증(실결제 전, 정책 판단)
[ ] 실 매장 다국어 안내 생성/보기 운영 smoke
```

## 7. 후속 권고

| 우선 | 후보 | 목적 |
|:--:|---|---|
| **1 (CRITICAL)** | `WO-O4O-TOSS-ENV-PERSIST-IN-DEPLOY-WORKFLOW-V1` | TOSS_PAYMENTS_CLIENT_KEY/SECRET_KEY 를 deploy-api.yml 에 추가(배포 영속) → §3.6 회귀 해소. 이후 위젯 실오픈 smoke |
| 2 (C안) | `WO-O4O-FOREIGN-VISITOR-CORE-OPERABILITY-SMOKE-V1` | store-owner 로그인 → 구독 상태 → 다국어 안내 생성/보기 → QR/URL/태블릿 → 소비자 결제 미노출 비파괴 smoke |
| 보류 (A안) | 파트너 작업 일시 정지 | core 운영 테스트 집중. 파트너는 확장 축으로 분리 유지 |
| 진행 (B안) | POS/DSL `IR-O4O-FOREIGN-VISITOR-POS-DSL-INTEGRATION-V1` | 파트너 확장 계속 시 |

> 권고: **1(Toss env 영속) 먼저** — 이게 없으면 구독 결제가 라이브에서 동작 불가. 그다음 2(core 운영 smoke). 파트너 확장은 분리.

## 8. 결론

```text
조건부 PASS.

파트너 기능을 제외한 FOREIGN_VISITOR_SALES_SUPPORT core 는 코드·문서 기준선에 도달했고
파트너와 독립적이다(확장 축 분리 가능). 5/6 축 PASS.

유일 차단: Toss TOSS_PAYMENTS_CLIENT_KEY 가 deploy-api.yml 에 영속되지 않아
매 배포마다 placeholder 로 회귀 → 라이브 구독 결제창 불가. 코드가 아닌 배포 설정 문제.
→ WO-O4O-TOSS-ENV-PERSIST-IN-DEPLOY-WORKFLOW-V1 으로 해소 후 core 운영 기준선 고정.
```

## 9. 무변경 확인

- 코드/DB/migration/API write/UI **무변경**. 구독 prepare 1회(CREATED 세션, confirm·실결제 0). 파트너 데이터/QR 생성 0. 본 IR 1개만 산출. 다른 세션 WIP 미접촉.

---

*Date: 2026-06-23 · read-only audit · 조건부 PASS · core 5/6 PASS(다국어/QR/구독코드/소비자차단/entitlement) · Toss clientKey 라이브 회귀(TOSS_PAYMENTS_CLIENT_KEY deploy-api.yml 미영속 → placeholder) · 파트너=확장 분리 · 후속 1=TOSS-ENV-PERSIST(CRITICAL) · 코드/DB 무변경.*
