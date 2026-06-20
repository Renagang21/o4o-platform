# CHECK — 유통참여형 펀딩 content-only 전환 배포 후 검증 V1

> WO: `WO-O4O-MARKET-TRIAL-CONTENT-ONLY-POST-DEPLOY-VALIDATION-V1`
> 성격: **배포 후 검증 전용** — 코드/DB/데이터 변경 없음, 운영 DB는 SELECT-only.
> 결론: **전 항목 PASS**. P3-2b migration 운영 반영 확정, 보존 데이터 무손실, 전환 UI 부재, content-only 정합.

---

## 0. 검증 메타

| 항목 | 값 |
|------|-----|
| 검증 시각 | 2026-06-20 (KST, 약 10:00~10:30) |
| 검증자 | Claude Code (sohae2100 GCP auth) |
| GCP project | `netureyoutube` |
| API 서버 (Cloud Run) | `o4o-core-api` rev **`o4o-core-api-02256-k7x`** (Ready), `https://o4o-core-api-3e3aws7zqa-du.a.run.app` |
| 운영 DB | `o4o-platform-db` (34.64.96.252) / `o4o_platform` — PostgreSQL 15.17 |
| DB 접근 채널 | `gcloud sql connect` IP allowlist → public IP psql (user `o4o_api`), SELECT-only |

---

## 1. 사전 확인 (§5)

| 확인 | 결과 |
|------|------|
| P3-2b commit `7b7b0d1fa` origin/main 포함 | ✅ `refactor(neture): drop market trial conversion columns … P3-2b` |
| P3-3 commit `d2de9c89d` origin/main 포함 | ✅ `docs: document market trial offline settlement payment policy … P3-3` |
| origin/main tip이 P3-3 이후 포함 | ✅ HEAD = `23994f75b` (P3-3 이후 neture-supplier 작업 2건 추가) |
| 로컬 작업트리 | clean (다른 세션 untracked `apps/api-server/scripts/reset-product-test-data.sql` 1건 — **미접촉**) |

### 배포 run (SHA 기록)

| 워크플로우 | run id | 결과 | 비고 |
|-----------|--------|------|------|
| Deploy API Server (Cloud Run) — P3-2b | **27812234039** | ✅ success (12m9s) | migration 포함 배포 |
| Deploy Web Services (Cloud Run) — 최신 main | 27812935927 | ✅ success | web-neture 포함 |
| CI Pipeline — P3-2b | 27812234080 | ✅ success | |

> P3-3 push의 CI run(27812868198)은 직후 neture-supplier push에 의해 `cancelled` 되었으나, 이후 27812935926/927 run이 success 로 최신 상태를 배포함.

---

## 2. Migration 적용 확인 (§6.1 / §7)

마이그레이션은 `o4o-api-migrations` Cloud Run job 으로 실행됨 (CLAUDE.md 표준). job 로그:

```
execution o4o-api-migrations-7vtnd (완료 2026-06-19T07:47:07Z, SUCCEEDED=1)
  [X] 557 DropMarketTrialFulfillmentAndShipping20261115000000   ← P3-1
  [X] 559 DropMarketTrialConversionColumns20261116000000        ← P3-2b
  No migrations are pending
```

- `[X]` = applied, 직후 `No migrations are pending` → **P3-2b migration 운영 반영 확정**.
- migration 정의는 `ALTER TABLE … DROP COLUMN IF EXISTS` (idempotent) — job SUCCEEDED = ALTER 정상 실행.

---

## 3. DB 검증 (§6) — 운영 DB SELECT-only 실측

### 3.1 전환 7컬럼 DROP (§6.1) — 기대 0 rows

| 테이블 | 대상 컬럼 | 잔존 |
|--------|----------|:----:|
| `market_trials` | convertedProductId / convertedProductName / conversionNote | **0** ✅ |
| `market_trial_participants` | listingId / customerConversionStatus / customerConversionAt / customerConversionNote | **0** ✅ |

### 3.2 보존 데이터 (§6.2)

| 검증 | 기대 | 실측 | 결과 |
|------|------|------|:----:|
| `total_trials` | 1 유지 | **1** | ✅ |
| `total_participants` | 1 유지 | **1** | ✅ |
| `market_trials.productId` 컬럼 | 존재(uuid) | **존재 (uuid)** | ✅ |
| productId 링크된 trial 수 | — | 0 (1건 trial의 productId = NULL) | ⚠️ 주석 |
| `settlementStatus` 분포 | choice_pending 1 | **choice_pending = 1** | ✅ |
| `paymentStatus` 분포 | paid 1 | **paid = 1** | ✅ |

> ⚠️ **productId 주석**: productId **컬럼은 보존**(uuid)되었고 migration 은 이 컬럼을 건드리지 않음. 단 현재 유일 trial 의 productId 값은 NULL 이다. 이는 손실이 아니라 **기존 상태 그대로**이며, P3-2c 에서 productId 를 "optional legacy reference" 로 명문화한 정책과 일치한다 (제품 참조는 reward/결과 약속 텍스트로 표시됨).

### 3.3 제거 테이블 (§6.3) — 기대 0 rows

| 테이블 | 잔존 |
|--------|:----:|
| `market_trial_fulfillments` | **0** ✅ |
| `market_trial_shipping_addresses` | **0** ✅ |

> SELECT-only 수행. `paymentReference`/`paidAmount` 등 입금 원문 값은 조회·기록하지 않음 (PII/입금 reference 보호).

---

## 4. API 서버 검증 (§7) — live

| 검증 | 결과 |
|------|------|
| `/health` | **200** ✅ |
| `/health/database` | `{"status":"healthy", version 15.17, pingMs 4, activeConnections 10, longRunningQueries 0}` ✅ |
| api-server crash loop / schema mismatch | 없음 (rev Ready, health healthy) ✅ |

### 제거 route 비-500 (§7.2)

| 경로 | 응답 | 판정 |
|------|:----:|------|
| `/api/trial-shipping` | **404** | ✅ (route 등록 자체 부재 — register-routes.ts L391-392 주석만) |
| `/api/trial-fulfillment` | **404** | ✅ |
| `/api/v1/neture/operator/market-trial` (auth-gated) | **401** | ✅ (인증 가드 정상, 500 아님) |
| `/api/market-trial` (public/supplier) | **200** | ✅ |

> 정적: 활성 route/controller 에서 `convertToProduct`/`createListingFromParticipant`/`customerConversion`/`listingId` 참조 **0건** (migration·무관 파일에만 존재).

---

## 5. 화면 검증 (§8) — Playwright live (neture.co.kr)

대상 trial: `cf6cdc98-69a1-49ef-9628-76a7f882c9b1` ([SMOKE] 유통참여형 펀딩 운영 루프 테스트, 종료).

### 5.1 Operator (`/operator/market-trial`, sohae2100) — ✅

- 목록: 메뉴명 "유통참여형 펀딩", KPI(전체 1 · 누적 참여자 1 · 입금 확인 완료 1 · 입금 확인 완료율 100% · 환불 0).
- 상세: 참여자 1명(서철환 / store_owner / 제품 보상 / 대기), KPI 입금 확인 완료율 100%(완료 1·환불 0), 이행 현황(대기 1).
- 참여자 테이블 컬럼: 이름 / 유형 / 보상 / 이행 / 참여일 / 이행 — **전환·매장진열·첫주문 컬럼 없음**.
- 금지 UI(상품 전환 / 매장 진열 / 활용 상품 연결 / 매장 랜딩 / 첫 주문 / 전환 퍼널 / 배송): **전무**.
- network: kpi / list / detail / detail-kpi / participants 전부 **200**. console error **0**.

### 5.2 Supplier (`/supplier/market-trial/:id`, renagang21 = 해당 trial 공급자) — ✅

- 상세 정상 렌더: 왜 이걸 해야 하는가 / 결과 약속 / 운영 정보 / 펀딩 구조(목표 50,000원·단가 5,000원) / 참여 현황(전체 1·제품 1·현금 0·모집률 33%).
- content-only 모델 문구 명시: *"참여금(송금)은 Neture 운영자가 수령하고 송금 완료자 명단을 공유합니다(온라인 결제 미제공). … 제품 개발자가 포럼에서 운영합니다."*
- 금지 UI(상품 전환 / 매장 진열 / 거래선 전환): **전무**. results API **200**, console error **0**.

### 5.3 Participant / 공개 상세 (`/market-trial/:id`) — ✅

- content-only 문구 명시: *"O4O 화면에서는 결제·정산·배송을 진행하지 않습니다."*, *"유통참여형 펀딩은 금융투자 상품이 아닙니다 …"*.
- 참여 신청/내 참여 내역(`/market-trial/my`) 정상. **제품 주문/배송/결제처럼 보이는 UI 없음**. console error **0**.

---

## 6. CSV 검증 (§9) — live export + 정적

Operator 상세 "CSV 내보내기" 실행 → **HTTP 200**, 파일 다운로드 성공. (다운로드 파일은 PII 보호 위해 즉시 삭제, header 1줄만 확인.)

**실제 CSV 헤더 (14컬럼):**
```
참여자명, 참여자유형, 보상방식, 보상상태, 참여금, 입금상태, 입금확인금액, 입금확인일, 입금참조, 정산선택, 정산상태, 참여일, 유통참여형 펀딩 제목, 상태
```

| 없어야 할 컬럼 | 결과 |
|---------------|:----:|
| 활용상품연결 / 매장랜딩단계 / 매장 도입 / 첫 주문 / 전환 상태 / listingId / customerConversionStatus / customerConversionAt / customerConversionNote | **전부 없음** ✅ |

유지 컬럼은 전부 오프라인 입금·펀딩·정산 성격(입금상태/정산상태 등) — content-only 정책과 일치. 코드(`marketTrialOperatorController.ts:1159`) 정적 헤더와 live 헤더 **완전 일치**.

---

## 7. content-only 정책 회귀 검증 (§10)

| 없어야 할 것 | 확인 |
|-------------|:----:|
| ProductMaster 생성 흐름 / SupplierProductOffer 연결 / OPL 매장 진열 / O4O order 생성 / 배송지 / fulfillment / 전환 퍼널 / 첫 주문 추적 | ✅ 화면·API·코드에서 부재 |

| 유지되어야 할 것 | 확인 |
|----------------|:----:|
| 콘텐츠 조회 / 게시·상태 / 참여 신청 / 참여 현황·수량 / 오프라인 입금 상태 / 펀딩 처리(정산) 상태 / productId optional legacy / settlement·payment 운영 기록 | ✅ 정상 |

---

## 8. 완료 기준 대조 (§15)

| 완료 조건 | 결과 |
|----------|:----:|
| P3-2b migration 운영 DB 반영 | ✅ |
| 전환 7컬럼 운영 DB 제거 (0 rows) | ✅ |
| P3-1 fulfillment/shipping 테이블 제거 (0 rows) | ✅ |
| api-server 정상 기동 | ✅ |
| operator 상세 / 참여자 목록 / CSV 정상 | ✅ |
| supplier 상세 정상 | ✅ |
| 전환/매장 진열/첫 주문 UI 부재 | ✅ |
| productId 보존 | ✅ (컬럼 보존, 값 NULL = 기존 상태) |
| settlement/payment 보존 | ✅ (choice_pending 1 / paid 1) |
| 운영 데이터 수정·삭제 없음 | ✅ (SELECT-only) |
| CHECK 문서 작성·커밋 | ✅ (본 문서) |

**최종 판정: 전 항목 PASS — 장애 없음, FIX WO 불필요.**

---

## 9. 남은 후속 과제 (정보)

- 본 WO 범위 외. 다음 단계 후보: **오프라인 입금 확인 UI 정비**, **펀딩 참여 리포트 정리** (운영 개선 WO).
- productId 가 NULL 인 점은 정책상 정상(optional legacy)이나, content 소재 참조를 실제 활용하려면 별도 연결 UX 검토 가능 (별건).
