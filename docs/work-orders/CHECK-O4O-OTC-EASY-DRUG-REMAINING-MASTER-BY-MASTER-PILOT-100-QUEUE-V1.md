# CHECK — WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-QUEUE-V1

| 항목 | 값 |
|---|---|
| 에이전트 | 라 (agent-la) |
| 모드 | **READ-ONLY 조사 · 1차 시험 대기열 확정** |
| **LIVE DB write** | **0** (설명서 생성 0 · 번역 0 · dry-run 0 · LIVE apply 0) |
| DB 접근 | cloud-sql-proxy 전용 포트 5491 · user `o4o_api` · `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY` |
| snapshot (최종 실행) | `2026-07-29 06:53:29.468518+00` / xmin `4103738` |
| 선행 트랙 | `WO-...-REMAINING-3809-MASTER-BY-MASTER-PRODUCTION-QUEUE-AND-EXCEPTION-HANDOFF-DESIGN-V1` (commit `8e97c92b4`) |
| 게이트 | **22 / 22 PASS** (`gatePass = true`) |

---

## 1. 잔여 모집단 재현 결과

baseline census 로직을 **verbatim 재현**(AUTHORED_SOURCES 4종 · EXCLUDE/BULK 필터 · classifyHold 우선순위 HOLD_SOURCE → HOLD_IDENTITY → HOLD_ROUTE → READY).

| 축 | 값 | 선행 트랙 대조 |
|---|---:|---|
| productionTargets | 3,809 | 선행 4,943 |
| READY | 0 | 선행 1,134 |
| **remaining (잔여 모집단)** | **3,809** | **일치** |
| HOLD_IDENTITY | 3,246 | 일치 |
| HOLD_ROUTE | 536 | 일치 |
| HOLD_SOURCE | 27 | 일치 |
| agent-ga / agent-na / exclude | 2,496 / 1,047 / 266 (합 3,809) | 일치 |

**`productionTargets 3809 · READY 0` 은 드리프트가 아니라 V3 LIVE 완료의 정상 귀결이다.** READY 1,134 master 가 KO·EN authored canonical 을 획득하여 `complete` 로 분류되고 productionTargets 에서 빠졌다. 잔여 3,809 와 HOLD 분해·가/나/제외 분해가 선행과 **완전 동일**하므로, 재현 성공 + 1,134 완료의 양성 확인이 동시에 성립한다. READY ∩ remaining = **0**.

---

## 2. Pilot 100 층화 결과

| 층 | 정의 | 목표 | 실제 |
|---|---|---:|---:|
| A_NORMAL | agent-ga READY_MASTER_PRODUCTION − 전문/수술 스크린 | 70 | **70** |
| B_BOUNDARY | agent-na EXCEPTION_ROUTE ∪ EXCEPTION_IDENTITY | 20 | **20** |
| C_SOURCE_COMPOSER | agent-na EXCEPTION_SOURCE ∪ EXCEPTION_COMPOSER | 10 | **10** |

- A route 배분(D'Hondt · 최소 2 · 단일 route 상한 35=50%): oral 35 / topical 24 / ophthalmic 7 / oromucosal 2 / vaginal 2
- B 코드 배분(D'Hondt · 최소 2): IDENTITY_CONFLICT 12 / ROUTE_CONFLICT 4 / ROUTE_UNRESOLVED 4
- C 코드 배분: SOURCE_EFFICACY_MISSING 10
- 결손 재배분: 없음(`reallocation = []`)

| 분포 | 값 |
|---|---|
| bySourceHoldClass | HOLD_IDENTITY 77 · HOLD_ROUTE 13 · HOLD_SOURCE 10 |
| byCandidateRoute | oral 43 · topical 26 · ophthalmic 13 · UNRESOLVED 13 · oromucosal 3 · vaginal 2 |
| byExpectedStatus | PRODUCE_EXPECTED 70 · PRE_EXCEPTION_EXPECTED 30 |
| byComposerFeasibility | OK 80 · BLOCKED_SOURCE 10 · ROUTE_PENDING 10 |
| 공식 섹션 존재(100건 중) | 효능·효과 90 · 용법·용량 97 · 경고 20 · 사용상 주의사항 100 · 이상반응 96 · 상호작용 63 |

**배분 근거**: 실제 잔여 분포(ga byRoute oral 57.5% / topical 31.9% / ophthalmic 9.3% / vaginal 0.9% / oromucosal 0.4%)를 반영하되 단일 route 편중 방지를 위해 oral 을 50% 상한, 소수 route 는 최소 2건 보장(경로별 composer 회귀 관측 목적), 경계·예외 30건 의도적 포함(시험 목적은 성공률이 아니라 실패 격리 검증).

**전문/수술 스크린**: 표준코드 `전문일반구분` 에 '전문' 포함 또는 수술/시술/관류/마취 표지 → A 배제. gaReady 2,496 → screenedOut **0** → eligible 2,496 (모집단 전건 일반의약품). 제품명 정규식 단독이 아니라 **구조화된 전문일반구분**을 1순위로 사용했다.

---

## 3. 결정성 · byte-identity

- 랜덤 0 · 정렬 고정(route/code 키 오름차순 → masterId 오름차순) · D'Hondt 배분(동률은 키 오름차순)
- 데이터 파일에 wall-clock 미포함(snapshot 시각·xmin 은 본 CHECK 문서에만 기록)
- **3회 실행 byte-identical PASS** — 서로 다른 snapshot(xmin 4103320 / 4103738)에서도 동일

| 산출물 | md5 |
|---|---|
| `otc-easy-drug-remaining-pilot-100-ledger-v1.json` | `ece39b2aeafa7b8b8f6c39497011b3a1` |
| `otc-easy-drug-remaining-pilot-100-agent-ga-input-v1.json` | `c484682e9a8ad64f2b5aed1a8614de93` |
| `otc-easy-drug-remaining-pilot-100-agent-na-handoff-schema-v1.json` | `43bf45d790706b031a7840bef8f6e444` |
| `otc-easy-drug-remaining-pilot-100-check-v1.json` | `635eb12471df036726b27ed9a5af6428` |

---

## 4. 게이트 22 / 22

| # | 게이트 | 결과 |
|---:|---|:---:|
| 1 | 잔여 3,809 재현 | PASS |
| 2 | HOLD_IDENTITY 3,246 재현 | PASS |
| 3 | HOLD_ROUTE 536 재현 | PASS |
| 4 | HOLD_SOURCE 27 재현 | PASS |
| 5 | 가/나/제외 2,496 / 1,047 / 266 재현 | PASS |
| 6 | pilot 정확히 100 | PASS |
| 7 | master 중복 0 | PASS |
| 8 | 완료 master 미포함 | PASS |
| 9 | READY 1,134 교집합 0 | PASS |
| 10 | baseline 모집단 밖 0 | PASS |
| 11 | exclude 확정분 미포함 | PASS |
| 12 | 정상 vs 사전예외 분리 | PASS |
| 13 | 정상 대기열에 전문용 의심 0 | PASS |
| 14 | 공식 원문 상태 전건 기록 | PASS |
| 15 | route 후보 전건 기록 | PASS |
| 16 | 기존 canonical 상태 전건 기록 | PASS |
| 17 | sourceRef 사전충돌 검사 | PASS |
| 18 | 정상층 원문·route 확보 | PASS |
| 19 | 정상층 기존 canonical 점유 0 | PASS |
| 20 | 예외 schema 필수필드 완비 | PASS |
| 21 | **DB write 0** | PASS |
| 22 | 2회 실행 byte-identical | PASS |

---

## 5. 독립검증 (별개 코드경로)

`otc-easy-drug-remaining-pilot-100-verify.la.ts` — 선정 로직을 재사용하지 않고 산출 JSON 을 입력으로 받아 DB 실측과 직접 대조. **VERIFY: ALL PASS**

검증 항목: pilot=100 · masterId 유일 100 · master 실재 100 · OTC 100 · 제품명 원장=DB · READY 1,134 교집합 0 · officialSourceHash 원장=DB 재계산 · existingAuthoredKoCanonical/en 원장=DB · **A 정상층 기존 canonical 점유 0** · sourceRef 유일 100 · **sourceRef LIVE 점유 0** · sourceRef 산식(`md5('otc-v4-master-leaflet:'+masterId)`) 일치 · agent-ga 입력 = pilot 원장 · A 정상층 효능·효과/용법·용량 전건 존재 · A 정상층 전문의심 0 · 사전예외 전건 예외코드 보유.

---

## 6. sourceRef

- namespace: `otc-v4-master-leaflet:<masterId>` → `uuid(md5(...))` — V2(`otc-v2-leaflet:` gencode) · V3(`otc-v3-content-leaflet:` content fp) 와 **네임스페이스 분리 확인**
- pilot 100 내 중복 **0** · LIVE 점유 충돌 **0**

---

## 7. 제품별 사전 조사 축 커버리지 (WO §4)

| 축 | 100건 중 채움 | 출처 |
|---|---:|---|
| 품목기준코드 | 100 | 표준코드 |
| 성분 | **0** | `product_drug_extensions.ingredient_summary` — **본 모집단 전건 미채움(실측 데이터 갭)** |
| 함량 | 100 | 표준코드 `약품규격` 대체 (`strengthSource` 명시) |
| 제형 | 100 | 표준코드 `제형구분` 대체 (`dosageFormSource` 명시) |
| ATC | 100 | 대체 identity proxy |
| 일반명코드 | 21 | HOLD_IDENTITY 다수로 낮음(정상) |
| 공식 원문 hash | 100 | e약은요 STORE canonical |

**성분 0 의 처리**: probe 로 `product_drug_extensions` 의 `ingredient_summary / active_ingredients / strength / dosage_form / efficacy_text` 가 pilot 100 전건 NULL 임을 실측 확인. 축을 임의로 채우지 않고 `ingredientSource = "ABSENT_IN_DB"` 로 정직하게 기록하고, `ingredientProxies`(gencode / ATC / 제품명)와 표준코드 대체 축을 함께 남겼다. **생산 grounding 은 e약은요 공식 원문이므로 생산 차단 사유가 아니다.**

---

## 8. 시험 실행 계약 · 예외 · 중지 조건

- **예외 코드 15종** 정의 완료(카테고리 / 실패 단계 / 의미 / retryable / 비고). 미분류 건은 `OTHER_REVIEW_REQUIRED` 로 반드시 원장에 남긴다.
- **제품 단위 continue**: 실패 시 savepoint ROLLBACK → 해당 master `dbWriteActual = 0` → 예외 원장 1행 → 다음 master 계속. 개별 제품 문제(route 미확정 / identity 충돌 / 파싱 실패 / 원문 결손 / composer 미지원 / 전문용 의심 / 낮은 성공률)는 **전체 중지 조건이 아니다**.
- **시스템 수준 중지 조건 SYS-01 ~ SYS-12** 정의 완료(각 항목에 탐지 방법 부착).
- **가→나 예외 인계 schema**: 필수 17필드. 불변식 — 실패 master 의 `dbWriteActual` 은 반드시 0, agent-na 는 DB write 0, 재진입 후 write owner 는 항상 agent-ga.
- **나 일괄 마무리 축 8종** + 그룹별 보고 필드 6종 정의.
- **2차 500 확장 게이트 EXP-01 ~ EXP-11** + `EXP-NOT`(성공률은 절대 중지·확장 차단 기준이 아니다).

---

## 9. 발동된 전체 중지 조건

**없음.** SYS-01 ~ SYS-12 전건 미발동. 중간 승인 요청 없이 완료했다.

---

## 10. 산출물

| 경로 | 내용 |
|---|---|
| `apps/api-server/src/scripts/otc-easy-drug-remaining-pilot-100-queue.la.ts` | 결정적 층화 선정 스크립트(READ-ONLY) |
| `apps/api-server/src/scripts/otc-easy-drug-remaining-pilot-100-verify.la.ts` | 별개 코드경로 독립검증(READ-ONLY) |
| `apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-100-ledger-v1.json` | pilot 100 master 원장(§4 조사 축 전건) |
| `apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-100-agent-ga-input-v1.json` | 가 정상 생산 입력 + 실행 계약 |
| `apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-100-agent-na-handoff-schema-v1.json` | 나 예외 인계 schema · 예외코드 15 · SYS-01~12 · EXP 게이트 |
| `apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-100-check-v1.json` | 게이트 결과 CHECK JSON |
| `apps/api-server/src/scripts/data/otc-easy-drug-remaining-pilot-100-followup-agent-requests-v1.md` | 후속 가·나 작업 요청서 **초안** |
| `docs/work-orders/CHECK-...-PILOT-100-QUEUE-V1.md` | 본 문서 |

---

## 11. 재현 커맨드

```bash
# cloud-sql-proxy.x64.exe --port=5491 netureyoutube:asia-northeast3:o4o-platform-db
cd apps/api-server
../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-pilot-100-queue.la.ts --port 5491
../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-pilot-100-verify.la.ts --port 5491
```

---

## 12. 판정

**PASS — pilot 100 확정. agent-ga 즉시 착수 가능.**
후속 가·나 작업 요청서는 **초안 상태**이며, 별도 발주 전까지 실행하지 않는다.
