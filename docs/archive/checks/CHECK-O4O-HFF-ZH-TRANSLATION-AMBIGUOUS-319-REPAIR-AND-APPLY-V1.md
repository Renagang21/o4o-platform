# CHECK-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1

> ZH 최종 문제 큐의 `TRANSLATION_AMBIGUOUS` 319건 전수 분석·교정·생산 결과.
> 대상 WO: `WO-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1`
> 착수 HEAD: `c5059aee6`
> **결과: 319/319 생산 완료 · 최종 HOLD 0 · ZH 문제 큐 0 · ZH canonical 40,918 = KO canonical 40,918**

---

## §1 착수 상태

| 항목 | 값 |
|------|-----|
| 브랜치 | `main` |
| 착수 HEAD | `c5059aee6` |
| 작업 트리 | **not clean** — 의약품 등 타 세션 WIP 다수 존재. WO 사전 지시대로 타 경로는 열람·수정하지 않고, 본 WO 경로만 다뤘다 |
| 기준 수치 | KO 40,918 / EN 40,902 / ZH 40,599 / `TRANSLATION_AMBIGUOUS` 319 / `NUMBER_STRUCTURE_AMBIGUOUS` 0 |

---

## §2 모집단 재현

`hff-zh-ta-scan.mjs` — 최종 문제 큐(`hff-zh-deferred-issue-queue-through-final-v1.jsonl`)의 `issueType=TRANSLATION_AMBIGUOUS` 항목 → KO canonical 존재 · ZH canonical 부재로 DB 재현.

| 항목 | 값 |
|------|-----|
| 큐 총계 / TA | 319 / 319 |
| 재현된 모집단 | **319** (요구치 일치) |
| ProductMaster 중복 / koCanonicalId 중복 | 0 / 0 |

모집단은 `data/hff-zh-ta-ids-v1.json` 으로 고정한 뒤 렌더·Apply·검증 전 구간에서 같은 목록을 썼다.

---

## §3 원인 분석

`TRANSLATION_AMBIGUOUS` 는 "슬롯을 조립했으나 확정 번역을 만들지 못했다"는 뜻이며, 세 갈래였다.

1. **엔진이 해석 가능한데 규칙이 좁아서 못 푼 조각** — 재귀 깊이 상한(`depth > 4`), 누락 제형·단위(앰플/스푼/일), 억·만·천 단위 함량, 배수 접미·`(가)(나)(다)` 꼬리, `（국문）…（영문）…` 병기, `… 모양 …` 성상, 빈도 토큰(`N일 M회`)의 ZH 쪽 비대칭.
2. **사전에 없는 고유 문장 조각** — 성상·시험 규격·균수 표기 등 141개.
3. **조용한 누수(silent leak)** — `zh()` 가 non-null 을 돌려주면서도 결과에 한글이 남는 경우. `hff-zh-ta-leak.mjs` 로 별도 탐지했고 착수 시점 36개(`compose` 33 / `marker+compose` 2 / `dict(spec)` 1), 잔여 한글 토큰은 `균수는 / 따로 / 계산하지 / 않았습니다 / 캡슐당 / 포당 …` 이었다. 이 축을 따로 보지 않았으면 "미스 0" 인데도 한글이 남은 문서가 생산될 수 있었다.

---

## §4 교정 내용

### (1) 공용 엔진 `hff-zh-b01-translate.mjs` — 9건

| # | 수정 | 내용 |
|---|------|------|
| 1 | `resolveAtom` 재귀 깊이 | `depth > 4` → `depth > 8` (중첩 조립 조기 포기 해소) |
| 2 | `UNIT_ZH` / `DU` | 누락 투여단위 보강 (예: `앰플 → 支安瓿`) |
| 3 | `NUMTOK` 꼬리 | `스푼 → 勺`, `일 → 日` |
| 4 | `FORM_RAW` | 누락 제형 표기 보강 |
| 5 | `ingredientAmount()` | 억·만·천 단위 함량 표기 |
| 6 | `tailNorm()` | 배수 접미 + `(가)(나)(다) → (甲)(乙)(丙)`, `circled()` 뒤에 배선 |
| 7 | 국·영문 병기 | `（국문）…（영문）…` 규칙(한글 꼬리 처리 포함) |
| 8 | 성상 | 일반형 `… 모양 …` + `SHAPE_ZH` |
| 9 | 빈도 대칭 | ZH 쪽 `freqTokens`/`stripFreq` 에 `N日/N天` 인식 추가 (KO 쪽만 세던 비대칭 제거) |

### (2) 라운드 사전 `data/hff-zh-b04-z83-translations-v1.json` — 141건

로더 범위(`b04z1..120`) 안의 z83 슬롯 사용, 로더 변경 없음.
키 목록은 `data/hff-zh-ta-z83-keys-v1.json` 으로 **동결**했다 — 스캔 결과는 교정이 진행될수록 줄어들기 때문에, 스캔 산출물에서 키를 다시 뽑으면 생성기가 재현되지 않는다(실제로 `LENGTH_MISMATCH ko=2 zh=141` 로 한 번 드러났다).

---

## §5 공용 자산 회귀 감사 — 기존 40,599건에 대한 영향

### (1) 엔진 격리 회귀 `hff-zh-ta-engine-regress.mjs`

저장된 ZH 와 현재 재렌더를 바로 비교하면 **과거 사전 증분 전부**가 섞여 잡힌다(첫 시도에서 25,128건). 그래서 비교축을 저장본이 아니라 **HEAD 시점 엔진**으로 바꿔, 같은 KO 원문을 HEAD 엔진 / 현재 엔진으로 각각 렌더해 대조했다.

| 항목 | 값 |
|------|-----|
| 대상 | 40,599 (기존 ZH canonical 전수) |
| 텍스트가 달라지는 문서 | 3,532 |
| **구조가 달라지는 문서** | **0** |
| distinct 변경 | 2,679 |

### (2) 생산 가능성 비교 `hff-zh-ta-cleanliness-v1.json`

| 항목 | 값 |
|------|-----|
| 나빠진 문서 | **0** |
| 좋아진 문서 | 1 |
| 동일 | 40,598 |
| verdict | **PASS** |

즉 엔진 수정은 "더 많이 해석한다" 방향으로만 작동했고, 기존 문서를 생산 불가로 만든 사례가 없다.

### (3) z83 사전 침범 `hff-zh-ta-z83-overlap.mjs` / `hff-zh-ta-z83-effect-v1.json`

`any` 사전은 kind 를 가리지 않고 **조립 중 부분 조각**에도 걸린다. 그래서 141개 키가 기존 KO 원문에 등장하는지 전수로 봤다.

- 겹치는 키 9개 (최다 `공식 섭취` 4,238건).
- 초기 안(원문 오탈자를 그대로 옮긴 카드뮴 2키)에서는 재렌더 시 **2,970건**이 달라졌다. 키 3개를 빼는 방식은 모집단을 다시 4건 blocked 로 되돌려 부적합했고, 최종적으로 해당 값의 **표기만 조립 경로와 같게 정규화**(값 `0.5/1.0 이하` 는 원문 그대로 유지)해 영향을 줄였다.
- 최종 잔여 영향: **214 문서 / 53 distinct**, 전부 `⑤镉(mg/kg)：0.5以下` → `⑤ 镉(mg/kg)：0.5以下` 류의 **구분자 뒤 공백 정규화**. 수치·단위·의미 변화 없음.
- 이 영향은 **가정적 재렌더**에 대한 것이며, 이번 WO 는 기존 행을 한 건도 수정하지 않았다(§7 `koUnchanged/enUnchanged`, INSERT 전용).

---

## §6 교정 후 모집단 상태

`hff-zh-ta-scan.mjs` 재실행 (2026-08-06T02:00Z):

| 항목 | 값 |
|------|-----|
| `alreadyClean` | **319** |
| `blockedDocuments` | **0** |
| 미해결 조각 `atomCount` | **0** |
| 한글 잔존 문서 | 0 |

→ **최종 HOLD 0**. WO §1 의 "확정할 수 없는 문서만 근거 있는 HOLD" 조건에 해당하는 문서가 없다.

---

## §7 렌더 감사 · Apply

### 렌더 (`ZH_LIMIT_IDS=hff-zh-ta-ids-v1.json`, `ZH_OUT_TAG=ta`, `ZH_QUEUE_RETRY` OFF)

| 항목 | 값 |
|------|-----|
| 대상 / 생산 후보 | 319 / **319** |
| 미생산 | 0 |
| 렌더 문서 / 구조 시그니처 | 292 / 66 |
| 렌더 횟수 | 876 (430 / 820 / 1280 px) |
| 13개 카운터 (구조 parity·overflow·clipped·emptyH2/Ul/Li·undefinedClass·rawHtml·hangulVisible·markerVisible·labelLost·licenseNoLost) | 전부 **0** |
| verdict | **PASS** |

> 산출물 `hff-zh-ta-render-audit-v1.json` 의 `wo` 필드에는 러너가 상수로 들고 있는 직전 WO 문자열이 남아 있다. **라벨일 뿐**이며 대상·수치는 전부 이번 패스의 것이다(대상 319, `globalsBefore.zh=40599`).

### Apply (`hff-zh-final-apply.mjs --apply` + `HFF_ZH_FINAL_APPLY_CONFIRM=YES`)

| 항목 | before | after |
|------|-------:|------:|
| ZH canonical | 40,599 | **40,918** |
| KO canonical | 40,918 | 40,918 (불변) |
| EN canonical | 40,902 | 40,902 (불변) |
| ProductMaster(건기식) | 40,948 | 40,948 (불변) |
| SPD 전체 | 208,268 | 208,587 (+319) |

inserted 319 / skipped 0 / failedShards 0 / `expectedEqualsActual` true.

### Apply 러너 결함 수정 (`hff-zh-final-apply.mjs`, 2줄)

`ZH_OUT_TAG` 로 대상 목록만 이번 패스 것을 읽고 **렌더 감사와 rollback manifest 는 고정 접두 `final`** 을 쓰고 있었다. 그대로 두면 (a) 통과 근거가 이번 렌더가 아닌 직전 WO 의 감사가 되고, (b) 직전 WO 의 rollback manifest 를 덮어썼다. 두 경로를 `OUT_TAG` 축으로 통일했다(기본값 `final` 유지 → 하위 호환).

---

## §8 독립 검증 (`hff-zh-ta-verify.mjs`, read-only)

Apply 산출물이 아니라 **DB 현재 상태**만 읽어 재판정.

| 항목 | 값 |
|------|-----|
| 모집단 / ZH 행 확인 | 319 / **319** |
| 계약 위반 · KO 해시 drift · 한글 문서 | 0 / 0 / 0 |
| 수치 drift · raw HTML · marker 잔존 · 빈 절 | 0 / 0 / 0 / 0 |
| canonical 중복 · 배치 밖 write | 0 / 0 |
| globals | KO 40,918 / EN 40,902 / **ZH 40,918** / PM 40,948 |
| `zhDelta` | +319 |
| **`koWithoutZh`** (KO 있는데 ZH 없는 문서) | **0** |
| `zhMatchesKo` | **true** |
| 큐 정산 (before 319 = 해소 319 + now 0) | true |
| **verdict** | **PASS** |

---

## §9 결론

- `TRANSLATION_AMBIGUOUS` 319건 **전수 해소·생산**, 최종 HOLD 0.
- **HFF ZH 문제 큐 0**, `koWithoutZh` 0 → ZH 트랙이 KO canonical 모집단 전체(40,918)를 덮었다.
- 공용 엔진 수정은 기존 40,599건의 **생산 가능성을 한 건도 악화시키지 않았고 구조 차이 0**이다.
- DB 변경은 **ZH canonical INSERT 319건뿐**이며, KO/EN/ProductMaster 는 불변이다.
- 되돌리기: `hff-zh-ta-rollback-v1.json` 의 `insertedIds` 를 soft delete.

## §10 산출물

| 파일 | 역할 |
|------|------|
| `scripts/hff-zh-ta-scan.mjs` / `data/hff-zh-ta-scan-v1.json` | 모집단 재현·분류 |
| `scripts/hff-zh-ta-leak.mjs` / `…-leak-v1.json` | 조용한 누수 탐지 |
| `scripts/hff-zh-ta-engine-regress.mjs` / `…-engine-regress-v1.json` | HEAD 엔진 vs 현재 엔진 격리 회귀 |
| `scripts/hff-zh-ta-regress.mjs` / `…-regress-v1.json` | 저장본 대조(참고용, 과거 증분 포함) |
| `scripts/hff-zh-ta-z83-overlap.mjs` / `…-z83-overlap-v1.json`, `…-z83-effect-v1.json` | 사전 침범·잔여 영향 |
| `scripts/hff-zh-ta-verify.mjs` / `…-verify-v1.json` | 독립 검증 |
| `data/hff-zh-b04-z83-translations-v1.json`, `…-ta-z83-keys-v1.json` | 라운드 사전 141건 + 동결 키 |
| `data/hff-zh-ta-{ids,safe-targets,render-audit,apply-result,rollback,prior-queue,cleanliness}-v1.json` | 대상·감사·적용·되돌리기 |
