# CHECK-O4O-HFF-NO-FUNCTIONAL-KEY-BULK-PRODUCTION-C-V1

> WO: **WO-O4O-HFF-NO-FUNCTIONAL-KEY-BULK-PRODUCTION-C-V1** (에이전트 다 / Agent C)
> 대상: `NO_FUNCTIONAL_KEY` × shard `stableHash(STTEMNT_NO) % 3 = 2` × STORE canonical 미생산
> 상태: **CLOSED — 안전 후보 소진** · 신규 LIVE **156** · 독립검증 PASS

---

## 1. 문제 — `NO_FUNCTIONAL_KEY` 가 발생하는 구조적 이유

선행 WO(`NOBRACKET-BULK-PRODUCTION-C-V1`)에서 shard 2 의 **1,113 제품**이 `NO_FUNCTIONAL_KEY` 로 HOLD 되었다.
원인은 제품에 기능성 원료가 없어서가 아니라, **공용 파서의 규격 표기 계약이 해당 표기 체계를 표현하지 못하기 때문**이다.

- 공용 `SPEC_RE` 는 `라벨 : 값단위 / 기준량(mg|g) … 의 X~Y%` 형태만 인식하고,
  안전망 `LOOSE_SPEC_RE` 도 `mg|g` 기준량을 요구한다.
- **프로바이오틱스**는 균수를 **CFU** 로 선언하고, **홍삼·인삼**은 **지표성분 비율(%)** 로 선언한다.
  둘 다 위 계약에 해당하지 않아 기능성 키가 **한 건도 잡히지 않는다**.

즉 공식 원문(BASE_STANDARD)에는 기능성 원료가 명확히 선언되어 있는데, 파이프라인이 그것을 볼 수 없는 상태였다.

## 2. 해결 — C 전용 additive key mapping (공용 파일 무편집)

공용 파일은 한 줄도 수정하지 않고, **C 소유 신규 파일 2개**만 추가했다.

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/scripts/hff-nfk-c-registry.ts` | C 전용 규격 항목 열거 · 비기능 라벨 판정 · additive key mapping · EN 정본 오버레이 |
| `apps/api-server/src/scripts/hff-nfk-c-build.ts` | C 소유 빌드(DB write 0). 게이트 전량 적용 후 apply 대상 산출 |
| `apps/api-server/src/scripts/hff-nfk-c-census.ts` | READ-ONLY 원인 census — 모든 매핑 결정의 원문 근거 |

### 2-1. 귀속 계약 — 선행 WO 보다 **강화**

선행 WO 는 `parseSpecs` 가 인식한 키만 셌으므로 «파서가 못 본 원료»가 보이지 않을 여지가 있었다.
본 WO 는 BASE_STANDARD 의 **규격 항목을 전수 열거**하고, 모든 라벨이 다음 중 하나로 **반드시 해소**되어야 한다.

1. 비기능 라벨(성상·미생물·중금속·잔류물 등 `… 이하` 한도시험)
2. 공용 `classify()`
3. 공용 `SF_INGREDIENTS` 의 `labelRe` / `indicatorRe`
4. C 전용 `NFK_LABELS`

**하나라도 미해소면 `C_UNKNOWN_SPEC_LABEL` HOLD.** 따라서 «선언되어 있는데 우리가 못 본 원료»가 구조적으로 존재할 수 없고,
그 위에서 «기능성 키가 정확히 1종» 규칙이 성립하므로 오귀속이 불가능하다. (0종=`STILL_NO_FUNCTIONAL_KEY`, 2종 이상=`MULTI_INGREDIENT`)

### 2-2. 추가된 key (전부 공식 원문 근거, 제품명 추정 0)

| key | 원문 근거 라벨 |
|---|---|
| `프로바이오틱스` | `프로바이오틱스 수` / `유산균 수` / `생균 수` / `락토바실루스 수` (CFU 표기) |
| `홍삼` | `진세노사이드 Rg1·Rb1·**Rg3**의 합` |
| `인삼` | `진세노사이드 Rg1·Rb1의 합` |

**홍삼 / 인삼 구분은 MFDS 공식 지표성분 표기로만 판정한다.** 홍삼은 Rg3 를 포함하고 인삼은 포함하지 않는다.
제품명(`○○홍삼캡슐` 등)은 판정에 일절 사용하지 않으며, 정규식 순서상 Rg3 규칙이 먼저 평가된다.

### 2-3. 기능성 문장은 원문 그대로 — 매핑은 EN 정본에만

KO 는 공식 `MAIN_FNCTN` 문장 그대로 사용한다. EN 은 `mapFunctionEnNfk`(C) → `mapFunctionEnC`(C) → `mapFunctionEn`(공용)
순으로 정본만 사용하고, 한 원자라도 미매핑이면 `GROUNDING_PENDING_EN` HOLD 한다(임의 영문 생성 0).

## 3. 생산 중 발견·차단한 콘텐츠 무결성 결함 2건 (DB write 이전)

| 결함 | 증상 | 조치 |
|---|---|---|
| **EN 기능성 소실** | `NFK_ATOM_EN` 이 접두 매칭이라, 결합 원자 `피로개선…(나) 혈소판응집억제를통한혈액흐름` 이 `피로개선` 에만 매칭되어 **혈소판 절이 EN 에서 조용히 사라짐** | 전 원자 regex 를 완전일치(`^…$`)로 고정 + `splitHangulItems()` 로 `(가)/(나)` 항목 선분해. 미매핑 결합 원자는 절단이 아니라 HOLD |
| **KO 기능성 누락** | 공용 `extractFunctionsKo` 는 `도움\|개선\|유지\|억제\|완화\|증진\|보호\|보습` 로 필터링 → **"피로회복"** 같은 공식 기능성이 탈락 | `fnCoverageResidue()` + `FN_COVERAGE_INCOMPLETE` 게이트 신설. 추출 문장을 MAIN_FNCTN 에서 전부 제거한 뒤 한글 잔여가 2자 이상이면 HOLD |

두 결함 모두 **적재 전에 차단**되었고, 영구 게이트로 남겼다. (열거 마커 `(가)(나)` 는 기능성 문장이 아니므로 잔여 계산에서 제외)

## 4. 결과

### 배치 1

| 단계 | 값 |
|---|---|
| scanned / inShard / noBracket | 41,261 / 13,767 / 7,903 |
| 이미 승격(promoted) | 2,009 |
| NFK lane 외(선행 계약이 이미 커버) | 3,158 |
| eligible = target | **155** |

`distKey`: 프로바이오틱스 105 · 식이섬유 21 · 홍삼 11 · 가르시니아 5 · 인삼 4 · 비타민E 3 · 루테인 2 ·
녹차 1 · 테아닌 1 · 밀크씨슬 1 · 오메가3 1

**dry-run** — candMatch 155(missing 0 / ambiguous 0) · masterDup 0 · expectedWrites 620 ·
postVerify masters 155 / spdKo 155 / spdEn 155 · canonicalDup 0 · `postVerifyPass true` → ROLLBACK(DB write 0)
**apply** — 동일 수치 · `"result": "COMMIT 완료"` · **DB write 620**

### 배치 2

`(가)(나)` 마커 오탐 제거 후 재빌드 → eligible **1**(홍삼). dry-run PASS → apply · **DB write 4**.

### 배치 3 — 소진 확인

`promoted` 2,164 → **2,165**(= +1, 내 배치가 정확히 승격으로 이동), `eligible 0 / target 0`.
**본 계약하 shard 2 의 `NO_FUNCTIONAL_KEY` 안전 후보는 156 으로 소진**되었다.
(WO 는 1,000건 배치를 지시했으나 안전 후보 총량이 156 이므로 배치는 채워지지 않는다.)

### 독립검증 (`hff-nb-c-verify.ts` — 별도 커넥션·별도 쿼리·매니페스트 master ID 기준, READ-ONLY)

```json
{ "b1": { "expect":155, "masters":155, "withPermit":155, "spdKo":155, "spdEn":155,
          "nonCanonical":0, "badSourceType":0, "noSourceRef":0, "emptyBody":0,
          "candLinked":155, "canonicalDup":0, "stmtDupMasters":0, "independentVerifyPass": true },
  "b2": { "expect":1, "masters":1, "spdKo":1, "spdEn":1, "canonicalDup":0,
          "stmtDupMasters":0, "independentVerifyPass": true } }
```

## 5. HOLD 상위 원인 (최종 기준, 전량 shard 2 · NFK lane)

| 원인 | 건수 | 성격 |
|---|---:|---|
| `COMPOSE_SERVING_PARSE_FAILED` / `_ABSENT` | 336 / 10 | 공용 composer 의 섭취량 파싱 계약 밖 |
| `STILL_NO_FUNCTIONAL_KEY` | 190 | additive mapping 이후에도 공식 규격에 기능성 원료 선언 없음 |
| `C_UNKNOWN_SPEC_LABEL` | 134 | 규격 라벨 미해소 → 성분 집합 불완전 가능 → 정당 HOLD |
| `MULTI_INGREDIENT` | 97 | 복합형 — 단일 귀속 앵커 부적용 |
| `GROUNDING_PENDING_EN` | 78 | EN 정본 미매핑(임의 영문 생성 0) |
| `FN_COVERAGE_INCOMPLETE` | 40 | 공용 KO 추출기가 공식 기능성을 일부 누락 → 정당 HOLD (§3) |
| `FN_NOT_OFFICIAL` | 31 | 우리 키의 공식 기능성 집합 밖 문장 존재 |
| `GUARD_REVIEW` / `GUARD_BLOCKED` | 21 / 11 | Guard 정당 차단 |
| `FOREIGN_FN` / `NO_FUNCTION` | 6 / 3 | 개별 HOLD |

**최소 보완 검토 결과 — 보완 없음.** `C_UNKNOWN_SPEC_LABEL` 134 를 실제 라벨 단위로 분해하면
최다가 `프로바이오틱스` 19 · `계피산` 7 · `피브린용해효소활성` 5 · `철` 5 로 **단일 원인 100건 이상이 없다**.
`COMPOSE_SERVING_*` 346 은 공용 `hff-sf-compose` 계약 문제이며 공용 수정은 WO 금지 사항이자 A/B lane 동시 영향 → 기록만 남긴다.

## 6. 품질 — 콘텐츠 불변 원칙 준수

- KO 기능성 문장은 공식 `MAIN_FNCTN` 원문 그대로. 삭제·순화·완화 0 (오히려 누락 탐지 게이트를 신설).
- 원문 밖 치료·예방 주장 추가 0. 제품명 기반 원료·기능성 추정 0.
- EN 은 정본 매핑만 사용, 미매핑 전량 HOLD.
- 전문가 상담 footer 유지. 동일 원료명 중복 등록 0(키 집합은 `Set`).

## 7. 산출물

| 경로 | 내용 |
|---|---|
| `apps/api-server/src/scripts/hff-nfk-c-registry.ts` | C 전용 additive key mapping · 비기능 라벨 · EN 오버레이 · 커버리지 잔여 계산 |
| `apps/api-server/src/scripts/hff-nfk-c-build.ts` | C 소유 빌드(DB write 0) |
| `apps/api-server/src/scripts/hff-nfk-c-census.ts` | READ-ONLY 원인 census |
| `apps/api-server/docs/checks/data/product-description-guard/hff-nfk-c/{census,b1,b2,b3,manifests}` | target · pool · hold · selfcheck · rollback manifest |

공용 파일(`hff-source-parse` · `hff-sf-registry` · `hff-nutrient-registry` · `hff-sf-compose` ·
`hff-sf-c-en-overlay` · `hff-sf-apply` · `content-guard`) **편집 0**.
