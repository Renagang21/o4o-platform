# CHECK-O4O-OTC-EASY-DRUG-V4-ROUTE-CARRYOVER-112-BULK-FINAL-RESOLUTION-V1

> WO: `WO-O4O-OTC-EASY-DRUG-V4-ROUTE-CARRYOVER-112-BULK-FINAL-RESOLUTION-V1`
> 성격: **READ-ONLY 판정 WO** — LIVE 생산·DB write 0
> 판정: **PASS — 112 전량 최종 분류 완료 · 독립검증 15/15 PASS**

---

## 1. 결론

| 항목 | 값 |
|---|---:|
| 입력 master (route 이월) | 112 |
| 최종 분류 합계 | 112 (중복 0 · 미판정 0) |
| agent-ga 즉시 재투입 (RECOVERABLE 계열) | **72** (432T) |
| 신규 route profile 필요 (REQUIRES_NEW_ROUTE_PROFILE) | **0** |
| terminal (재투입 금지) | **40** |
| SKIP_COMPLETE (이미 GREEN/canonical) | 0 |
| DB write | **0** |

### 최종 분류 분포

| 최종 분류 | 수 |
|---|---:|
| RECOVERABLE_SINGLE_ROUTE | 16 |
| RECOVERABLE_MULTI_ROUTE_CONTENT | 30 |
| SOURCE_CONFLICT_RESOLVED | 26 |
| REQUIRES_NEW_ROUTE_PROFILE | 0 |
| TERMINAL_SOURCE_CONFLICT | 0 |
| TERMINAL_UNRESOLVED | 17 |
| EXCLUDE_NON_HUMAN_USE | 23 |

---

## 2. 기존 분류 → 최종 분류

| 기존 | 수 | 최종 |
|---|---:|---|
| TRUE_MULTI_ROUTE | 46 | RECOVERABLE_SINGLE_ROUTE 16 · RECOVERABLE_MULTI_ROUTE_CONTENT 30 |
| ROUTE_SOURCE_CONFLICT | 31 | SOURCE_CONFLICT_RESOLVED 26 · EXCLUDE_NON_HUMAN_USE 5 |
| HOLD_UNRESOLVED | 35 | EXCLUDE_NON_HUMAN_USE 18 · TERMINAL_UNRESOLVED 17 |

**TRUE_MULTI_ROUTE 46** — 기존 판정기는 "용법 어딘가에 부위어가 있으면 경로 1표"였다.
본 WO 는 **문장 단위로 부위어와 투여 동사가 짝을 이룰 때만** 경로로 인정하고 부정·금지는 하위 절 범위로만 적용했다.
그 결과 16 건은 실제 경로가 하나(부위어가 효능 문구·주의사항에서 유입된 오검출)로 확정되었고,
30 건(폴리크레줄렌 계열 등)은 **공식 용법에 구강·질 두 경로가 실제로 병기**되어 축소하지 않고 routeSet 을 유지했다.

**ROUTE_SOURCE_CONFLICT 31** — 26 건은 동일 master 의 공식 원문 복수 행이 **내용 이형(개정본/절단본)일 뿐 지시 경로가 동일**하여,
가장 긴 완본을 근거로 근거를 명시해 해소했다(임의 선택 아님). 나머지 5 건은 적격성 자체가 성립하지 않아 제외로 이동했다.

**HOLD_UNRESOLVED 35** — 18 건은 적격성 제외(시술용 관류·관주 희석액, 한방건강보험용 조제 전용),
17 건은 공식 용법이 지시문이 아니어서(예: "적당량을 사용합니다") 경로를 확정할 근거가 원문에 없어 terminal 유지.

---

## 3. 판정 규칙 (근거 우선순위)

1. **공식 용법·용량 최우선** — 문장 단위로 `투여 부위 + 투여 동사` 가 짝을 이루면 경로 1표.
   부정·금지는 해당 하위 절(쉼표/연결어미 범위)에만 적용한다.
2. 일반 도포 동사(바르다/붙이다)는 **문장 안에 다른 부위어가 없을 때만** topical 로 약하게 인정한다.
3. 용법 근거가 0 이면 보조축(제형구분 · ATC · 효능 내 투여 동사 · 적용 부위 특이 이상반응)으로 복구하되,
   **서로 다른 축 2개 이상이 같은 경로를 지시하고 최빈값이 유일할 때만** 인정한다.
4. 복수 경로가 실재하면 축소하지 않는다. 전부 비경구면 손실 없이 하나의 설명서로 저작 가능(RECOVERABLE_MULTI_ROUTE_CONTENT),
   경구+비경구 혼재 또는 profile 미보유 경로(otic·inhalation) 포함이면 REQUIRES_NEW_ROUTE_PROFILE (이번 대상에는 0).
5. 내용이 실제로 다른 공식 원문이 **서로 다른 경로**를 지시하면 TERMINAL_SOURCE_CONFLICT (임의 선택 금지) — 이번 대상 0.
6. **제품명은 어떤 단계에서도 판정 근거로 쓰지 않는다.** 원장 `evidence.nameOnlyDecision = false` 로 전 행 기록.
7. 다른 master 의 원문을 대표값으로 쓰지 않는다. 공식 원문에 없는 의료 사실은 생성하지 않는다.

---

## 4. 적격성 제외 23

| 코드 | 수 | 근거 |
|---|---:|---|
| `PROCEDURE_IRRIGATION_DILUENT` | 18 | 공식 용법이 시술 중 관류·관주·세척 또는 희석 용도이며 인체 투여 경로 지시가 없음 |
| `HERBAL_INSURANCE_DISPENSING_ONLY` | 5 | 한방건강보험용 조제 전용 — 매장 소비자 설명서 분모 밖 |

제품명 정규식 단독이 아니라 **공식 용법 텍스트 + 구조화 코드(제형구분·ATC·전문/일반 구분·취소일자)** 를 함께 확인해 판정했다.
전문의약품·취소품목·수출용/비매품 필터도 동일 단계에서 적용했다(해당 0 → 이미 상위 단계에서 걸러진 상태).

---

## 5. terminal 17

| 코드 | 수 | 내용 |
|---|---:|---|
| `USAGE_NON_INSTRUCTIONAL_MULTI_USE` | 17 | 대한염화나트륨액 계열 — 공식 용법이 "적당량을 사용합니다" 수준으로 경로 지시가 없고, 효능이 국소·구강·흡입에 걸쳐 있어 보조축도 단일 경로로 수렴하지 않음 |

재검토 가능 조건: 공식 용법 원문 보강 또는 제형구분·ATC 표준코드 적재. **재투입 금지 · DB write 0 · 창작 금지.**

---

## 6. route / routeSet 분포

| routeSet | 수 | composer profile | profile 상태 |
|---|---:|---|---|
| rectal | 26 | `rectal` | EXISTING |
| oromucosal | 16 | `oromucosal` | EXISTING |
| oromucosal + vaginal | 30 | `multi-nonoral` | **NEW_REQUIRED_CONFIG_ONLY** |
| (없음 · terminal/exclude) | 40 | — | — |

`multi-nonoral` 은 **설정 1건 추가**로 끝난다. 기존 비경구 profile(oromucosal/vaginal/rectal/nasal/topical/ophthalmic)과
규칙(`NONORAL_REWRITE` · `ORAL_VERB_RE` 금지 · `EN_ORAL_VERB_RE` 금지)이 동일하고, EN 사용 안내 라벨만 경로 중립
(`사용 안내` / `How to use it`)으로 둔다. 특정 경로 라벨을 쓰면 다른 경로 내용을 오도하기 때문이다.
route 게이트는 routeSet 전체에 대해 OR 로 자기 표현 보존을 검사하고, 역전 검사는 routeSet 밖 경로에만 적용한다.
주입은 기존 `composeKoV3(..., profiles)` / `renderEnV3(..., profiles)` **배치 로컬 seam** 으로 하며 공유 composer·V3/V4 정본은 수정하지 않는다.

---

## 7. 독립검증 15/15 PASS

검증기는 판정기를 **import 하지 않고** 경로 추출을 다른 기전(문장 분해가 아닌 **부위↔동사 근접 윈도우**)으로 재구현하고,
섹션 파서 · sourceRef 산식 · 검증 SQL 을 독자 재계산한다.

| ID | 게이트 | 실측 |
|---|---|---|
| V-01 | 입력 master | 112 |
| V-02 | 결과 합계 = 입력 | 112 (원장합 112) |
| V-03 | master 중복 · 입력 밖 | 0 / 0 |
| V-04 | 기존 유효 GREEN 혼입 | 기준집합 3,404 · 혼입 0 |
| V-05 | source terminal 혼입 | 기준집합 24 · 혼입 0 |
| V-06 | 기구 멸균제 혼입 | 기준집합 3 · 혼입 0 |
| V-07 | exclude 혼입 | 기준집합 266 · 혼입 0 |
| V-08 | 공식 원문 hash 재계산 · 근거 없는 route 확정 | 0 / 0 |
| V-09 | 제품명 단독 판정 | 0 / 0 |
| V-10 | 복수 경로 강제 단일화 | 0 |
| V-11 | source 충돌 임의 선택 | 0 / 0 |
| V-12 | sourceRef 재계산 불일치 · 중복 · LIVE 점유 | 0 / 0 / 0 |
| V-13 | DB write (authored 신규 · 원장 선언) | 0 · true (session read_only=on) |
| V-14 | 판정기 재실행 byte-identical | 동일 (`7ccb12f1…` / `62cc8985…` / `52a5c897…`) |
| V-15 | 분류 7종 폐쇄 · 창작 0 · terminal 재투입 0 | 0 / 0 / 0 |

byte-identical 은 산출물 삭제 후 클린 재생성 1회 + 검증기 내 재실행 1회, 총 2회 이상 동일 sha256 로 확인했다.

---

## 8. 산출물

| 파일 | 내용 |
|---|---|
| `src/scripts/otc-v4-carryover112-resolve.ga.ts` | 판정기 (read-only) |
| `src/scripts/otc-v4-carryover112-independent-verify.ga.ts` | 독립검증기 15 게이트 |
| `data/otc-v4-carryover112-resolution-ledger.ga.json` | 112 전량 판정 원장 (근거·evidence 포함) |
| `data/otc-v4-carryover112-agent-ga-reentry.ga.json` | agent-ga 재투입 원장 72 · `profileAddition` 포함 |
| `data/otc-v4-carryover112-terminal-ledger.ga.json` | terminal 원장 40 |
| `data/otc-v4-carryover112-independent-verification.ga.json` | 독립검증 결과 |

---

## 9. 후속 계약

1. **RECOVERABLE 계열 72 는 별도 Queue WO 없이 agent-ga 가 전량 최종 생산한다.** 즉시 착수 가능.
   - 선행 조건 1건: `multi-nonoral` profile **배치 로컬 주입**(설정 1건, 공유 composer 미변경) — 30 master 에만 적용.
   - 단위 분할 권고: `rectal 26` → `oromucosal 16` → `multi-nonoral 30`.
   - 기대 write = 72 × 6T = **432T**.
2. `REQUIRES_NEW_ROUTE_PROFILE` 0 — 신규 profile 개발 대기 없음.
3. TERMINAL 17 · EXCLUDE 23 = **40 은 재투입 금지**.
4. 생산 완료 시 누적 유효 GREEN = 3,404 + 72 = **3,476**, 잔여 route 이월 = **0**.

---

## 10. 상태 기록

- route 이월 **112 = 종결** (재투입 72 / terminal·exclude 40)
- 공식 미완료 잔여 = terminal 17 + exclude 23 + 기구 멸균제 3 + source terminal 24 + exclude 266 = **333**
  (기존 405 − 이번 재투입 확정 72)
