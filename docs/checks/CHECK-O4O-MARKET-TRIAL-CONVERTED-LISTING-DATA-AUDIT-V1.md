# CHECK-O4O-MARKET-TRIAL-CONVERTED-LISTING-DATA-AUDIT-V1

> **선행**: `IR-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-USAGE-AUDIT-V1` · `WO-O4O-MARKET-TRIAL-CONVERSION-DISABLE-V1`
> **성격**: production DB **read-only 실측**(SELECT only). 코드/DB/migration **무변경**.
> **결과: 전환 데이터 사실상 없음 — 판정 A(기존 cleanup 불필요).**
> **작성일**: 2026-06-12

---

## 1. 목적
유통참여형 펀딩(Market Trial)의 과거 SPO→OPL 전환 데이터가 production DB 에 실제 존재하는지, 존재 시 KPA/GP/KCos 매장 org 에 연결되어 Store 노출 위험이 있는지 read-only 로 실측한다.

## 2. 선행 기준
`WO-...-CONVERSION-DISABLE-V1` 에서 신규 전환은 차단됨. 남은 문제는 **기존 데이터**. 본 CHECK 는 SELECT only — UPDATE/DELETE/INSERT/migration 금지, count/group 결과만 기록(PII 미기록).

## 3. 실행 환경
- 대상: production Cloud SQL `o4o-platform-db`(`netureyoutube:asia-northeast3:o4o-platform-db`), DB `o4o_platform`, user `o4o_api`.
- 접속: `gcloud sql connect`(public IP allowlist 방식)는 TCP 차단으로 실패(선행 IR §7). → **Cloud SQL Auth Proxy**(ADC, cert 기반 터널, authorized-networks 우회)로 `127.0.0.1` 로컬 포트 경유 접속 **성공**.
- 실행: psql `-f`(SELECT only). 실행 후 proxy 종료·임시 파일 정리.

## 4. 실행 SQL
IR §7 의 read-only SELECT 5종(market_trials / market_trial_participants / organization_product_listings(source_type='market_trial') / org+enrollment / first_order). 전량 SELECT, 데이터 변경 없음.

## 5. 결과 (count/group only)

| # | 쿼리 | 결과 |
|:-:|------|------|
| Q1 | market_trials total / convertedProductId 설정 | **total=1, with_converted=0** |
| Q1b | trial status 분포 | `closed=1` |
| Q2 | participant customerConversionStatus 분포 | `none=1` |
| Q2b | participant listingId 보유 수 | **with_listing=0** |
| Q3 | `source_type='market_trial'` OPL | **mt_listings=0, active=0** |
| Q4 | 전환 OPL 의 org type + service enrollment | **0 rows** |
| Q5 | first_order participant 수 | **first_order=0** |

> 요약: trial 1건(closed)·참여자 1명(상태 none)뿐이며, **상품 전환(convertedProductId)·매장 진열 OPL·listingId·first_order 가 전부 0**. 전환 퍼널은 production 에서 **실 데이터까지 진행된 적이 없다.**

## 6. 판정
**A — mt_listings = 0 → 기존 cleanup 불필요.**
- `source_type='market_trial'` OPL 0건 → Store org 에 주입된 전환 listing **없음**. (IR §7 판정기준 A)
- 따라서 Q4(org/service enrollment) 0 rows → KPA/GP/KCos 매장 노출 위험 **실데이터상 없음**.
- participant first_order 0 → checkout 역연결로 생성된 이력도 없음.
- 결론: `WO-...-CONVERTED-LISTING-DATA-CLEANUP-V1` **불필요**. 비활성화(WO-CONVERSION-DISABLE-V1)만으로 경계 정합 충족.

## 7. 후속 작업
1. **데이터 cleanup WO 불필요** (본 실측 결과).
2. `WO-O4O-MARKET-TRIAL-SUPERSEDE-IR-NOTE-V1` — 선행 `IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1` 에 Neture-only supersede note.
3. `WO-O4O-MARKET-TRIAL-NETURE-EXTERNAL-NAME-ALIGNMENT-V1` — Neture 내부 사용자-facing 외부명 정렬.

## 8. 완료 판정
**PASS** — production read-only 실측 완료(Cloud SQL Auth Proxy 경유, SELECT only). 전환 데이터 사실상 0(trial 1 closed / OPL·listingId·first_order 모두 0). 판정 A(cleanup 불필요). 코드/DB/migration 무변경. PII 미기록(count/group only). 다음: supersede note → 외부명 정렬.

---

*Date: 2026-06-12 · read-only DB audit (Cloud SQL Auth Proxy) · 전환 데이터 0 → cleanup 불필요. 다음: supersede note + Neture 외부명 정렬.*
