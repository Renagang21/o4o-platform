# IR-O4O-MARKET-TRIAL-COMMERCE-DATA-PRESENCE-CHECK-V1

> **유형**: Investigation (read-only 실측) — 유통참여형 펀딩(Market Trial) 커머스 잔존 **운영 데이터** 존재 여부 실측.
> **성격**: production DB **SELECT 전용**. 코드/DB/migration/API/UI **무변경**. 데이터 변경(INSERT/UPDATE/DELETE/DDL) 0건.
> **기준 문서**: `docs/architecture/O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1.md` · `docs/investigations/IR-O4O-MARKET-TRIAL-COMMERCE-WIRING-RESIDUAL-AUDIT-V1.md`(§8 실측 SQL).
> **작성일**: 2026-06-19
> **판정**: **Case B — 일부 커머스 운영 데이터 존재**(정산·결제 각 1건). 전환·풀필먼트·배송지·OPL 은 0.

---

## 0. 핵심 결론 (요약)

- 유통참여형 펀딩(Market Trial) 운영 데이터는 **펀딩 1건 / 참여자 1명**뿐이다(둘 다 2026-06-07 생성, 펀딩 status=`closed`).
- **제품 전환 0 / 고객 전환 0(none) / 풀필먼트 0 / 배송지 0 / OPL market_trial source 0.**
- 단, 그 **1명의 참여자**가 `settlementStatus='choice_pending'` + `paymentStatus='paid'`(`manual_transfer`/`internal`, paidAmount·reference 존재) 상태다 → **정산·결제 ledger 가 실제로 1건 사용됨**.
- 정황상 **오프라인 결제/정산 ledger 의 단일 스모크/검증 레코드**(2026-06-07)로 보인다. 대량 운영 데이터는 없다.
- → **Case B**: 후속 P0 차단/제거 WO 는 **신규 생성 차단을 우선**하고, 이 **1건의 정산·결제 레코드 보존/아카이브/삭제 여부를 결정**해야 한다(삭제는 데이터 변경이므로 사용자 승인 + 별도 처리).
- 풀필먼트·배송지·OPL·전환 관련은 **0건이므로 해당 코드/테이블 제거는 저위험**.

---

## 1. 실행 환경 · 방식 (read-only 증빙)

| 항목 | 값 |
|------|----|
| 실행 일시 | 2026-06-19 (KST) |
| 대상 인스턴스 | `netureyoutube:asia-northeast3:o4o-platform-db` (o4o_platform) |
| 접속 경로 | **Cloud SQL Auth Proxy**(127.0.0.1:15432) → `psql` |
| 접속 계정 | `o4o_api` (Cloud Run 운영 계정, 자격증명은 본 문서에 **미기재/마스킹**) |
| 실행 SQL | **SELECT / COUNT / GROUP BY / MIN / MAX 전용** |
| 데이터 변경 | **없음** (INSERT/UPDATE/DELETE/TRUNCATE/DROP/ALTER 0건) |
| 개인정보 | **원문 미조회** — 참여자 이름·연락처·주소·상세주소·결제 메모 원문 SELECT 안 함. COUNT/상태/날짜(date)/존재여부(boolean)만 |
| 프록시 정리 | 실측 후 proxy 프로세스 종료 |

> CLAUDE.md §0 "Claude Code 직접 검증 허용 — read-only 검증(SELECT) 직접 수행 가능" 에 근거. 데이터 변경은 사용자 승인 필요.

---

## 2. 실측 결과 표 (§7 기본 SQL)

| 구분 | SQL 대상 | 결과 | 데이터 존재 | 위험도 | 후속 조치 |
|------|----------|------:|:---:|:---:|------|
| 제품 전환 | `market_trials.convertedProductId` | **0** / total 1 | 없음 | 낮음 | 제거 가능 |
| 참여자 전환 | `customerConversionStatus` | **none=1** | 없음 | 낮음 | 제거 가능 |
| 정산 상태 | `settlementStatus` | **choice_pending=1** | **있음** | **중** | 신규 차단 + 1건 보존/처리 결정 |
| 결제 상태 | `paymentStatus` | **paid=1** | **있음** | **중** | 신규 차단 + 1건 보존/처리 결정 |
| 풀필먼트 | `market_trial_fulfillments` | **0** | 없음 | 낮음 | 제거 가능(테이블 drop 안전) |
| 배송지 | `market_trial_shipping_addresses` | **0** | 없음 | 낮음 | 제거 가능(테이블 drop 안전) |
| OPL 전환 | `organization_product_listings WHERE source_type='market_trial'` | **0** | 없음 | 낮음 | 제거 가능 |
| 총량 | trials / participants | **1 / 1** | — | — | 단일 레코드 |

---

## 3. 보강 확인 (§8 선택 SQL — PII 미포함)

**펀딩(market_trials)**

| id | status | 전환여부 | created | updated |
|----|--------|:---:|---------|---------|
| `cf6cdc98…c9b1` | `closed` | 없음(false) | 2026-06-07 | 2026-06-07 |

**참여자(market_trial_participants) — 커머스 상태/시점**

| settlementStatus | paymentStatus | paidAmount 존재 | paidAt | created | updated |
|------------------|---------------|:---:|--------|---------|---------|
| `choice_pending` | `paid` | true | 2026-06-07 | 2026-06-07 | 2026-06-07 |

**결제 메타(원문 아님)**

| paymentMethod | paymentProvider | reference 존재 |
|---------------|-----------------|:---:|
| `manual_transfer` | `internal` | true |

> 해석: 1명의 참여자에 대해 **오프라인 수동이체(`manual_transfer`)로 결제 완료(`paid`) 처리** + 정산은 선택 대기(`choice_pending`) 상태. 모든 타임스탬프가 2026-06-07 동일자 → **오프라인 결제/정산 ledger 의 단일 검증 레코드**로 판단. 펀딩은 이미 `closed`.

---

## 4. 위험도 판단

| 영역 | 데이터 | 위험 | 비고 |
|------|:---:|:---:|------|
| 제품 전환 / OPL / checkout 역연결 | 0 | 낮음 | 코드 제거 안전. (선행 코드는 이미 차단 상태) |
| 풀필먼트 / 배송지 | 0 | 낮음 | **테이블 drop 안전**(row 0). 개인정보(배송지) **실제 저장된 적 없음** |
| 정산 / 결제 | **각 1건** | 중 | 신규 생성 차단 우선. 1건 보존/아카이브/삭제는 **데이터 변경 → 사용자 승인** |
| 개인정보 | 배송지 0 / 결제 메모 미조회 | 낮음 | 배송지 테이블 비어 있음. 결제 reference 존재하나 원문 미확인 |

---

## 5. 최종 판단 (Case B)

```
유통참여형 펀딩의 일부 커머스성 운영 데이터가 확인되었다.
(펀딩 1건 closed + 참여자 1명의 정산 choice_pending / 결제 paid 1건.
 제품 전환·풀필먼트·배송지·OPL 전환은 0.)

따라서 후속 P0 작업은 신규 생성 차단을 우선하고,
정산·결제 1건에 대한 보존/아카이브/삭제 정책을 포함해야 한다.
풀필먼트·배송지·OPL·전환 관련 코드/테이블 제거는 데이터 0건으로 저위험이다.
```

---

## 6. 후속 WO 권고

- **채택 분기 = §12.2 (데이터 존재)**: `WO-O4O-MARKET-TRIAL-COMMERCE-WIRING-DISABLE-WITH-DATA-PRESERVATION-V1`
  - **신규 커머스 데이터 생성 차단**: convertToProduct / settlement / payment / (이미 차단된 createListingFromParticipant·tryConnectOrderToTrial 완전 제거) / trial-fulfillment / trial-shipping 엔드포인트.
  - **기존 1건 처리 결정**: (a) 조회 전용 보존(감사) / (b) 사용자 승인 후 단일 검증 레코드 삭제. 삭제는 데이터 변경이므로 본 IR 범위 외.
  - **저위험 일괄 제거**: `market_trial_fulfillments`·`market_trial_shipping_addresses`(row 0) 테이블·코드, OPL `source_type='market_trial'` writer, checkout 역연결, 전환 코드.
- **P3 schema cleanup**: `*_fulfillments`/`*_shipping_addresses` drop 은 row 0 으로 안전. participants 의 `settlementStatus`/`paymentStatus` 등 컬럼 정리는 **1건 보존 결정 이후** 진행.

---

## 7. 검증 기준 (WO §14 충족)

```
SELECT 전용 SQL만 실행 — 충족 (데이터 변경 0).
운영 데이터 변경 없음 — 충족.
제품 전환 데이터 존재 여부 — 확인(0).
참여자 전환 상태 데이터 — 확인(none=1).
정산 상태 데이터 — 확인(choice_pending=1, 존재).
결제 상태 데이터 — 확인(paid=1, 존재).
풀필먼트 데이터 — 확인(0).
배송지 데이터 — 확인(0).
OPL market_trial source — 확인(0).
개인정보 원문 미조회 — 충족(COUNT/상태/date/boolean만).
후속 WO 방향(데이터 있음 기준) — 제안(§6, Case B / data-preservation).
문서만 작성 — 충족.
```

---

## 8. 결론

- 실측 결과 **Case B**: 운영 데이터는 **펀딩 1건 + 참여자 1명**으로 극소, 그 중 **정산·결제만 1건씩** 존재(단일 검증성 레코드, 2026-06-07).
- 제품 전환·풀필먼트·배송지·OPL 은 **0건** → 해당 코드/테이블 제거 **저위험**.
- 후속 P0 는 **신규 생성 차단 + 정산/결제 1건 보존·처리 정책**을 포함한 `...-WITH-DATA-PRESERVATION-V1` 로 진행 권고. schema drop 은 1건 처리 결정 후 마지막 단계.

---

*Date: 2026-06-19 · read-only 실측 IR · production SELECT 전용, 데이터 무변경 · 판정: Case B(정산·결제 각 1건 존재, 그 외 0). 후속 P0 = 신규 차단 + 1건 보존/처리.*
