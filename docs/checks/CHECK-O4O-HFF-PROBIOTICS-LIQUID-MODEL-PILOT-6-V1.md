# CHECK · HFF 유산균 액상 모델 6-파일럿 (WO-O4O-HFF-PROBIOTICS-LIQUID-MODEL-PILOT-6-V1)

- 담당: Agent A (유산균·프로바이오틱스 전용). 비타민·Agent B·의약품·294큐 미접촉.
- 일자: 2026-07-18
- status: **PILOT_COMPLETE_DB_WRITE_DEFERRED** · **DB write 0**
- **G-LIQUID 6규칙 공통 가드 승격 완료** — `product-description-guard@1.2.0` (rules.ts: liquidVolumeBasis/liquidPerUnit/liquidCfuBasis/liquidVehicle/liquidStorage/liquidBilingual). `liquidGrounding` 존재 시에만 액상 경로 진입 → 고형 A~H·PRE-SRC 판정 **불변(가법적 확장)**. 승격 근거: types.ts `LiquidGrounding` + product-description-guard.ts `runLiquidGuard`.
- **EN 표시기준 한글 잔존 수정 완료** — 성상·유통기한·보관을 의미 보존 영어로 번역(`liquidGrounding.formEn/shelfLifeEn/storageEn`). 한국어 원문은 `source`·`liquidGrounding.form/prsrvRaw` 에 유지. EN 초안 한글 문자 **0**.
- **회귀·검증**: 페어테스트+6건 실측 **21/21 PASS**, content-guard 전체 **162/162 PASS**(기존 141 불변 + 신규 21), content-guard 타입체크 **0 오류**, CLI end-to-end 6/6 PASS(exit 0).

---

## 1. 결과 요약

| 항목 | 값 |
|---|---|
| 대상 | **6** (액상 유산균, poolA 잔여 전량; 숫자 확대 없음) |
| PASS_LIQUID_MODEL | **6** (per-serving 5 + per-volume-unit-unknown 1) |
| HOLD | **0** |
| G-LIQUID 실측 | BLOCKED **0/6** (공통 가드 `product-description-guard@1.2.0`) |
| 페어테스트 | 6규칙 전부 정상=PASS / 오류합성=BLOCKED ✓ (Jest liquid-guard.test.ts) |
| content-guard 회귀 | **162/162 PASS** (기존 141 불변 + 신규 21) |
| 반응형 5뷰포트 | PASS (12 드래프트 × 360·390·768·1024·1440, 오버플로 0 실브라우저 측정) |
| EN 표시기준 한글 잔존 | **0** (성상·유통기한·보관 영어 번역, 원문은 grounding 보존) |
| ko/en 부피·드롭수·CFU 동치 | 일치 |
| 원문없는 환산/물/희석/냉장/생존율 주장 | **0** |

> ✅ **공통 가드 승격 완료**: 액상은 `liquidGrounding`(별도 구조)라 solid 모델의 `grounding.declaredAmount` 를 참조하는 PRE-SRC·A~H 와 분리한다. `runGuard` 는 `liquidGrounding` 이 있으면 `runLiquidGuard`(G-LIQUID 6규칙)로 분기하고 고형 규칙을 실행하지 않는다 → 고형 판정 100% 불변. 적재는 **별도 apply 경로**(294 b3 큐와 합치지 않음).

## 2. 대상 6건 고정 (grounding)

| STTEMNT_NO | 제품 | 제형 | 1회 | 1회부피 | 1일횟수 | 1일총량 | CFU 기준 | 섭취(원문) | 냉장 | 대상 |
|---|---|---|---|---|---|---|---|---|---|---|
| 200700170352801 | 차일드라이프 베이비 드롭스 | 액상 | 10드롭 | 0.295ml | 1 | 0.295ml | 0.295ml당 2억 | 물과함께 | 개봉후 | INFANT |
| 200700170351676 | 닥터드랍비 | 액상 | 5방울 | 0.155ml | 1 | 0.155ml | 0.155ml당 1억 | 흔들어 | 개봉후 | ADULT(중립) |
| 200700170352069 | Kids Garden Babyflora | 액상 | 5드롭 | 0.152ml | 1 | 0.152ml | 0.152ml당 20억 | 흔들어 | 개봉후 | INFANT |
| 200700170352352 | 락티브 베베 우리아이 드롭 | 액상 | 6드롭 | 0.188ml | 1 | 0.188ml | 0.188ml당 1억 | — | 개봉후 | INFANT |
| 200700170351715 | 신터액트 베이비 오일드롭 | 액상 | 6드롭 | 0.2ml | 1 | 0.2ml | 0.2ml당 1억 | 흔들어 | 개봉후 | INFANT |
| 2014001710730 | 야쿠르트 프리미엄 라이트 | 액상(음료) | 1병 | **미표기** | 1 | **미표기** | 100mL당 100억 | — | 상시 | ADULT |

- 정체·신고번호 전부 확인(불명 0). candidate_id 는 입력 JSON 보존.
- **야쿠르트 = 핵심 무환산 케이스**: CFU 기준 100mL당, 섭취 1병, **1병 용량 원문 없음** → per-bottle CFU·1일총량 **계산 안 함**.

## 3. 액상 모델 (고형과 별도 구조 — 절대 혼합 금지)

**필드(전부 별개)**: `form` · `totalVolume`(병 총용량) · `servingVolumeMl`(1회 부피) · `servingCount`+`unit`(드롭/방울/병) · `servingsPerDay` · `dailyTotalMl` · `cfu` · `cfuBasisMl`+`cfuBasisType`.

**파서 4상태**: `PARSED` / `ABSENT`(원문에 부피 없음) / `PARSE_FAILED`(표현 있으나 해석불가) / `ABNORMAL`(0·음수). ABSENT≠PARSE_FAILED.

**계산 규칙(연결 근거 필수)**:
- `dailyTotalMl` = servingVolumeMl × servingsPerDay — **둘 다 PARSED 일 때만**(야쿠르트는 servingVolume ABSENT → dailyTotal ABSENT).
- `cfuBasisType`: `per-serving`(기준부피=1회부피, 드롭류) / `per-volume-unit-unknown`(기준 100mL·섭취 병, 병 용량 미지 → 환산 금지) / `per-volume`.
- **금지**: 100mL당→1병당 자동전환 · 1병 용량 추정 · 1회=1일 동일시 · 병↔mL 근거없는 환산 · 총용량↔1회량 혼입.

**STORE 디자인 확장**: 표시 기준 영역을 액상형으로(제형 / 1회 섭취량 / 1일 횟수 / CFU 표시 기준 / [1일 총량 조건부] / 대장균군 / 유통기한 / 보관). **총용량과 1회량 같은 행 병합 금지** — 각 별도 `sd-item`.

## 4. G-LIQUID 6규칙 (승격 재료 — 설계 + 페어케이스)

> 공통 가드 `product-description-guard.rules.ts` 에 승격 완료. 각 규칙 = draft ↔ grounded fact(`liquidGrounding`) 대조. 판정 SSOT = `liquidGrounding`(원문에서 확정된 grounded fact). 페어테스트+실측은 `__tests__/liquid-guard.test.ts` 21/21 PASS, 고형 회귀 141 불변.

### G-LIQUID-VOLUME-BASIS (총용량·1회·1일 혼입)
- **판정**: draft 의 모든 mL 토큰 ∈ 원문 mL 집합. 원문에 없는 부피 등장 = BLOCKED.
- **정규식**: draft `([\d.]+)\s*ml` 집합 ⊄ source `([\d.]+)\s*ml` 집합.
- **정상**: 차일드라이프 — draft mL {0.295} ⊆ 원문 {0.295}. PASS.
- **오류**: "총용량 30ml 중 1회 0.295ml" → 30ml 원문 없음 → BLOCKED ✓.

### G-LIQUID-PER-UNIT (병·포·앰플 ↔ mL 근거없는 환산)
- **판정**: 용기단위 부피가 원문 ABSENT 인데 `1병(Xml)` 또는 `1병당 [수치]` 등장 = BLOCKED.
- **정규식**: `1?\s*(병|포|앰플)\s*\(\s*[\d.]+\s*ml` 또는 `(병|포|앰플)\s*당\s*[\d,]+`(무근거).
- **정상**: 야쿠르트 — "1회 1병" (mL 부기 없음), 명시적 "1병당 균수는 계산하지 않았습니다". PASS.
- **오류**: "1회 1병(100ml)" → BLOCKED ✓.

### G-LIQUID-CFU-BASIS (CFU 기준 전이)
- **판정**: draft CFU 기준 부피 = 원문 기준 부피. 또는 원문 mL 기준을 용기(병/포/앰플)당 CFU 로 전이 = BLOCKED.
- **정규식**: draft `([\d.]+)ml당 … CFU` ≠ source `CFU/([\d.]+)ml` ; 또는 `(병|포|앰플)\s*당\s*[\d,.]+\s*억?\s*CFU`(원문 mL 기준일 때).
- **정상**: 야쿠르트 — "100ml당 100억 CFU"(원문 100mL 그대로). PASS.
- **오류**: "1병당 100억 CFU" → BLOCKED ✓.

### G-LIQUID-VEHICLE (원문 없는 물·희석)
- **판정**: draft 에 물과함께/물에타서/희석 있는데 원문 섭취에 없음 = BLOCKED.
- **정규식**: draft `물\s*과\s*함께|물\s*에\s*타|희석` ∧ ¬(source intake `물\s*(과|와|에)` ∨ `희석|타서`).
- **정상**: 야쿠르트(원문 물 없음, draft 물 없음). PASS. (차일드라이프는 원문 "물과 함께" 有 → draft 물 정당.)
- **오류**: 야쿠르트 draft 에 "1병을 물과 함께" → BLOCKED ✓.

### G-LIQUID-STORAGE (원문 없는 냉장·개봉후·생존율)
- **판정**: draft 냉장/개봉후 있는데 원문 보관에 없음, 또는 생존율/균수보장 추정 = BLOCKED.
- **정규식**: (`냉장` ∧ ¬source`냉장`) ∨ (`개봉\s*후` ∧ ¬source`개봉후`) ∨ `생존율|균수\s*보장|끝까지\s*살아`.
- **정상**: 차일드라이프(원문 "개봉 후 냉장보관 권장" 有 → draft 보관 원문 그대로). PASS.
- **오류**: 야쿠르트(원문 개봉후 없음) draft 에 "개봉 후 즉시 섭취" → BLOCKED ✓.

### G-LIQUID-BILINGUAL (ko/en 부피·횟수·CFU 동치)
- **판정**: ko/en mL 집합·드롭수·CFU 동일.
- **정규식**: ko `([\d.]+)ml` 집합 = en `([\d.]+)ml` 집합 ; ko `(\d+)(드롭|방울)` = en `(\d+)drops?`.
- **정상**: 차일드라이프 ko{0.295}=en{0.295}, 10=10. PASS.
- **오류**: en "12 drops" (ko 10) → BLOCKED ✓.

## 5. 지원/미지원 표현 · CFU 기준 유형

- **지원 부피표현**: mL/㎖(정규화) · 드롭·방울(개수, 괄호 mL 있을 때 부피 확정) · 병(개수, mL 미표기면 부피 ABSENT·환산 안 함).
- **미지원(현 모델 밖 → 향후)**: 스포이드 눈금·앰플 다단계·희석배수·병 총용량 명시형 CFU/병 — 본 6건엔 없음. 등장 시 `HOLD_UNSUPPORTED_DIMENSION`.
- **CFU 기준 유형**: `per-serving`(0.295ml당 등, 5건) · `per-volume-unit-unknown`(100mL당+섭취 병, 1건). 자동전환 0.
- **원문없는 주장 수**: 환산 0 · 물/희석 0 · 냉장/개봉후 0 · 생존율보장 0.

## 6. 판정 레지스트리

| 판정 | 수 | 근거 |
|---|---|---|
| PASS_LIQUID_MODEL | 6 | 부피·CFU기준·섭취·보관 전부 원문 grounded, G-LIQUID BLOCKED 0 |
| HOLD_SOURCE_ABNORMAL | 0 | — |
| HOLD_GROUNDING | 0 | — |
| HOLD_UNSUPPORTED_DIMENSION | 0 | (스포이드·다단계 없음) |
| HOLD_DATA_CONFLICT | 0 | — |

## 7. 적재 후보 / 후속 모델 확장

- **적재후보 6** (별도 production manifest). **294 큐와 미합침.** 별도 dry-run·별도 apply 경로.
- **선결**: 액상 items 는 `liquidGrounding` 구조라 현 b3/content-guard(solid `grounding.declaredAmount`) 로 적재 불가 → **① G-LIQUID rules.ts 승격 ✅ 완료(본 WO)** + **② 액상 grounding 을 SPD apply 가 수용하도록 apply 경로 확장(후속 WO)** 후 적재. DB write 는 본 WO 범위 밖.
- **후속 모델 확장 필요**: 스포이드 눈금·앰플·희석배수·병 총용량+CFU/병 형 → 부피·밀도 모델 확장. 파일풀엔 없음(추가 모집단 DB read 필요).

## 8. 산출 파일

**공통 가드 승격(코드):**
- `apps/api-server/src/modules/content-guard/product-description-guard.types.ts` — `LiquidGrounding` 타입 + `GuardProductInput.liquidGrounding?` + GUARD_VERSION 1.2.0
- `apps/api-server/src/modules/content-guard/product-description-guard.rules.ts` — G-LIQUID 6규칙(liquidVolumeBasis/liquidPerUnit/liquidCfuBasis/liquidVehicle/liquidStorage/liquidBilingual) + 3 composer(runLiquidGroundingRules/BodyRules/BilingualRules)
- `apps/api-server/src/modules/content-guard/product-description-guard.ts` — `runLiquidGuard` + `runGuard` 액상 분기
- `apps/api-server/src/modules/content-guard/__tests__/liquid-guard.test.ts` — 페어테스트 12 + 6건 실측 + EN 한글잔존 검사 (21 test)

**산출물(콘텐츠):**
- 입력 JSON: `docs/checks/data/product-description-guard/hff-probiotics-liq-cp01.json` (liquidGrounding.formEn/shelfLifeEn/storageEn + grounding 스텁 추가, drafts.en 한글 3필드 → 영어)
- 초안: `docs/guides/products/health-functional-food/batch-probiotics-liquid-pilot/LIQ-CP01/drafts/*.{ko,en}.html` (ko 불변, en 표시기준 3필드 영어화)
- production manifest: `.../batch-probiotics-liquid-pilot/LIQUID-PILOT-MANIFEST.json`
- 워킹스크립트(scratchpad, 커밋 안 함): `liq-regen.mjs`(EN 번역·재생성) · `liq-responsive-harness.mjs`(반응형 하네스).
- 본 CHECK.
