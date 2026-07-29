# CHECK — WO-O4O-OTC-EASY-DRUG-REMAINING-POPULATION-RECONCILIATION-20-V1

| 항목 | 값 |
|---|---|
| 에이전트 | 라 (agent-la) |
| 모드 | **READ-ONLY 모집단 정합** |
| **LIVE DB write** | **0** (설명서 생성 0 · 번역 0 · dry-run 0 · LIVE apply 0) |
| DB 접근 | cloud-sql-proxy 전용 포트 5491 · user `o4o_api` · `REPEATABLE READ READ ONLY` |
| snapshot (최종) | `2026-07-29 07:09:13.220991+00` / xmin `4106893` |
| 게이트 | **12 / 12 PASS** (`gatePass = true`) |
| 판정 | **확정 SSOT = 3,809 · pilot 100 무변경 · agent-ga 즉시 착수 가능** |

---

## 1. 두 census 산식과 갈린 지점

### [A] 공식 생산 모집단 census — `otc-easy-drug-remaining-3809-master-by-master-census.la.ts` (baseline verbatim)

OTC master(`product_drug_extensions.drug_category='otc' AND deleted_at IS NULL`) 전수 → pop 분류 →
`productionTargets = EASY_DRUG_REGISTERED_INCOMPLETE ∪ NON_EASY_WITH_O4O_EVIDENCE` → `hold != READY` = **remaining**.
필터: OTC 조인 필수 / 완료(authored KO+EN canonical & needs_review 0) 제외 / 수출·군납·비매품·비소매 대용량·전건취소 제외 / easy 미등록은 O4O 시장성 근거가 있을 때만 편입.
**실측 3,809**

### [B] 보조 census — `otc-v3-ready-1134-completion-basis-census.na.ts:27`

```sql
SELECT count(DISTINCT master_id) FROM shared_product_descriptions
WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko'
  AND source_type='mfds_easy_drug' AND deleted_at IS NULL
```
필터: **OTC 조인 없음 · 완료 여부 무관 · 제외 필터 없음 · 시장성 근거 무관**.
**실측 3,829**

### 갈린 지점 5가지

1. B 는 OTC 조인이 없어 **비-OTC(전문의약품 등) master 를 포함**한다 ← **이번 20건의 실제 원인**
2. B 는 authored 로 교체 완료된 master 도 easy 행이 canonical 로 남아있으면 계속 센다 (이번엔 해당 0건)
3. B 는 수출/군납/비매품/비소매 대용량/전건취소 제외 필터를 적용하지 않는다 (해당 0건)
4. A 는 easy 원문이 없어도 O4O 시장성 근거가 있으면 편입한다 (`NON_EASY_WITH_O4O_EVIDENCE` — 실측 0건)
5. A 는 easy 행이 canonical/ko/live 가 아니어도 easy 등록으로 간주한다 (해당 0건)

---

## 2. Set difference 실측

| 축 | 값 |
|---|---:|
| A 크기 | 3,809 |
| B 크기 | 3,829 |
| countDelta (B − A) | **20** |
| 교집합 | 3,809 |
| **A_ONLY** | **0** |
| **B_ONLY** | **20** |
| 대칭차 | **20** |

**A ⊂ B 가 엄밀히 성립**한다. 즉 "20건 차이"는 집합 크기 차이일 뿐 아니라 **실제로 갈린 master 도 정확히 20건**이며, 공식 잔여 3,809 전건은 B 에도 포함되어 있다. 잔여 모집단에서 누락된 master 는 **0건**이다.

---

## 3. 20건 master 별 판정

**판정 분포: `EXCLUDE_OUT_OF_OFFICIAL_DENOMINATOR` 20 / 20 · 미분류 0**

20건 전부 `product_drug_extensions.drug_category` 가 **`rx`(전문의약품) 16건 · `drug_unspecified` 4건** 이며 OTC 확장 행이 0 이다. 공식 모집단은 OTC 한정이므로 분모 밖이고, 보조 census 는 OTC 조인이 없어 포함되었다. 전건 `authored KO canonical = 0` · `READY 1,134 교집합 = 0` 이다.

품목 4종 · master 20행(**동일 품목기준코드에 복수 master = 중복 연결**):

| 품목기준코드 | 제품명 | drug_category | master 수 |
|---|---|---|---:|
| `200307641` | 알파간피점안액0.15% (브리모니딘) | rx | 10 |
| `199907094` | 코솝점안액 | rx | 4 |
| `202502076` | 메코마그민500정 | drug_unspecified | 4 |
| `200109567` | 크라비트점안액 (레보플록사신) | rx | 2 |

**판정 근거(전건 공통)**: 보조 census 는 OTC 조인이 없어 포함되나, 공식 모집단은 `drug_category='otc'` 인 master 만 세므로 제외.
**조치**: 제외 원장 기록 — **생산 대상 아님**. 나 에이전트 예외 원장 이동 대상 아님(원인이 명확하므로).

전건 masterId 는 `otc-easy-drug-remaining-population-reconciliation-v1.json` 의 `verdicts[]` 및 `setDifference.bOnly` 에 있다.

### 부수 발견 (본 WO 범위 밖 · DB write 금지)

전문의약품/미분류 master 에 **e약은요 STORE canonical 원문이 부착**되어 있다. 매장용 OTC 설명서 생산 대상은 아니지만, 원문 부착 자체와 동일 품목기준코드의 중복 master 는 별도 위생·정책 검토 대상이다. 본 WO 에서는 기록만 하고 변경하지 않았다.

---

## 4. 확정 생산 모집단 SSOT

> **SSOT = census A = 3,809 master**

### 왜 이것이 SSOT 인가

1. **공식 분모 항등식이 실측으로 성립한다.**
   `EASY_DRUG_REGISTERED_COMPLETED 15,576 + EASY_DRUG_REGISTERED_INCOMPLETE 3,809 = 19,385` = 공식 분모.
   즉 census A 의 완료·잔여 분해가 공식 분모 19,385 와 **정확히 같은 축**임이 숫자로 확인된다.
2. census B 는 완료 master 의 잔존 easy 행과 비-OTC master 를 포함하므로 **생산 대상 집합이 아니라 데이터 위생 지표**다.
3. B 전용 20건 중 잔여로 편입해야 할 master 는 **0건**(전부 분모 밖).
4. A_ONLY = 0 이므로 A 가 누락한 master 도 없다.

### 산술 정합

| 축 | 값 |
|---|---:|
| OTC master 전수 | 57,572 |
| ├ NON_EASY_NO_MARKET_EVIDENCE | 32,385 |
| ├ **EASY_DRUG_REGISTERED_COMPLETED (완료)** | **15,576** |
| ├ **EASY_DRUG_REGISTERED_INCOMPLETE (잔여)** | **3,809** |
| ├ NON_EASY_ALREADY_PRODUCED | 2,933 |
| └ EXCLUDE_CONFIRMED (제외) | 2,869 |
| productionTargets | 3,809 |
| ├ READY | 0 |
| └ **remaining = SSOT** | **3,809** |
| remaining HOLD 분해 | HOLD_IDENTITY 3,246 · HOLD_ROUTE 536 · HOLD_SOURCE 27 |

`productionTargets = READY + remaining` 성립. `NON_EASY_WITH_O4O_EVIDENCE = 0` 이므로 productionTargets 는 전부 easy 등록 미완료 master 다.

---

## 5. pilot 100 — **유지(무변경)**

확정 SSOT 가 기존 census A 와 **동일 집합**(크기 3,809, B 로부터 편입 0)이므로 pilot 100 을 재생성할 필요가 없다.

- pilot 100 전건이 확정 SSOT 에 포함(`allInSsot = true`, `outsideSsot = []`)
- READY 1,134 교집합 0
- **diff: 추가 0 / 제거 0**
- pilot 선정 스크립트 재실행 결과 4개 산출물 md5 **committed 판과 완전 동일**

| 산출물 | md5 (변동 없음) |
|---|---|
| `...-pilot-100-ledger-v1.json` | `ece39b2aeafa7b8b8f6c39497011b3a1` |
| `...-pilot-100-agent-ga-input-v1.json` | `c484682e9a8ad64f2b5aed1a8614de93` |
| `...-pilot-100-agent-na-handoff-schema-v1.json` | `43bf45d790706b031a7840bef8f6e444` |
| `...-pilot-100-check-v1.json` | `635eb12471df036726b27ed9a5af6428` |
| `...-population-reconciliation-v1.json` (신규) | `f46f316dea02daa0f828ef95bdf51aee` |

---

## 6. 가 에이전트 생산 대기열 (확정본)

`apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-100-agent-ga-input-v1.json`
(`batchId = otc-v4-pilot-100` · 100 master · masterId 오름차순 · 실행 계약·preflight·SYS-01~12 포함)
**모집단 확정 후 무변경 — 이 파일이 확정본이다.**

---

## 7. 검증 게이트 12 / 12

| # | 게이트 | 결과 |
|---:|---|:---:|
| 1 | 20건 전건 판정 완료 | PASS |
| 2 | 미분류 0 | PASS |
| 3 | 대칭차 = countDelta (20 = 20) | PASS |
| 4 | A ⊂ B (A_ONLY 0) | PASS |
| 5 | 분모 항등식 15,576 + 3,809 = 19,385 | PASS |
| 6 | productionTargets = READY + remaining | PASS |
| 7 | 확정 SSOT = census A (편입 0) | PASS |
| 8 | 편입 master 근거 보유 | PASS |
| 9 | 확정 모집단 ∩ READY 1,134 = 0 | PASS |
| 10 | B 전용 전건이 제외 또는 나 예외로 귀속 | PASS |
| 11 | 판정마다 근거·조치 기록 | PASS |
| 12 | **DB write 0** | PASS |

추가: pilot 100 ⊂ 확정 SSOT · pilot 독립검증(`*-verify.la.ts`) **ALL PASS** 재실행 확인 · 정합 스크립트 **2회 실행 byte-identical PASS**(pilot 산출물 4종 포함 전건 동일).

---

## 8. 발동된 시스템 수준 중지 조건

**없음.** 중간 승인 요청 없이 완료했다.

---

## 9. 산출물

| 경로 | 내용 |
|---|---|
| `apps/api-server/src/scripts/otc-easy-drug-remaining-population-reconciliation.la.ts` | 정합 스크립트(READ-ONLY) |
| `apps/api-server/src/scripts/data/otc-easy-drug-remaining-population-reconciliation-v1.json` | 두 산식 정의 · set difference 전건 · 20건 판정 원장 · 확정 SSOT · 게이트 |
| `docs/work-orders/CHECK-...-POPULATION-RECONCILIATION-20-V1.md` | 본 문서 |
| (무변경) `...-pilot-100-*.json` | pilot 100 원장·가 대기열·나 schema·CHECK |

## 10. 재현 커맨드

```bash
# cloud-sql-proxy.x64.exe --port=5491 netureyoutube:asia-northeast3:o4o-platform-db
cd apps/api-server
../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-population-reconciliation.la.ts --port 5491
../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-pilot-100-queue.la.ts --port 5491
../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-pilot-100-verify.la.ts --port 5491
```
