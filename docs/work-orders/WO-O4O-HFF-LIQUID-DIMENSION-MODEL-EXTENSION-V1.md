# WO-O4O-HFF-LIQUID-DIMENSION-MODEL-EXTENSION-V1 (DRAFT)

> 상태: **DRAFT · 검수 대기** (커밋 전 · 내가 검수 후 커밋) · 2026-07-17 · 작성 Agent F
> 성격: 설계 초안. 본 WO 자체는 코드/DB 무변경 — 착수 승인 시 별도 구현.
> 근거: [HFF HOLD 코드 레지스트리 V1.1 `UNSUPPORTED_DIMENSION`](../checks/HFF-DESCRIPTION-HOLD-CODE-REGISTRY-V1.md) · [HOLD 예외군 분석 §2·§5-A](../checks/HFF-HOLD-EXCEPTION-ANALYSIS-DRAFT-V1.md)
> 규칙 SSOT: [HFF-DESCRIPTION-RULES-SSOT-V1 (HFF-R09)](../guides/products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md)
> 가드 엔진: `apps/api-server/src/modules/content-guard/{product-description-guard,source-grounding-parser}.ts`

---

## 1. 배경 · 문제 확정

현재 유산균 설명서 라인은 표시량을 **CFU / 중량(mg·g)** 축으로만 grounding·검증한다
(`source-grounding-parser.parseBasis` 는 `mg|g` 만 파싱, `ServingSpec` 중량은 mg 환산).
**액상 제품은 표시 기준량이 부피(mL)** 라 이 축이 성립하지 않는다.

```text
고형(현 모델):  프로바이오틱스 100억 CFU / 12 g      ← 중량 기준 → 검증 가능
액상(범위 밖):  프로바이오틱스 100억 CFU / 65 mL     ← 부피 기준 → 현 모델 밖
```

→ 액상은 `HOLD_UNSUPPORTED_DIMENSION` 으로 격리되어 있다(레지스트리 V1.1).
**데이터·grounding 은 정상**이며 결함이 아니다 — 해소 경로 = **우리 모델 확장**(부피 차원 지원).

### 절대 원칙 (명문화)
```text
밀도 추정 금지 · mg 환산 금지.
액상 밀도를 임의 가정해 부피를 중량으로 환산하지 않는다 —
근거 없는 환산은 창작(HFF-R09 grounding 실패 유형 ⑤ 추론 확장)이다.
부피는 부피 그대로(mL) 다룬다.
```

---

## 2. 대상 8건 (전수)

| # | 톤 | 제품 | 제조사 | 품목보고번호 | 표시 기준량(부피) | 현 상태 |
|---|----|------|--------|-------------|------------------|--------|
| 1 | BEVERAGE | 야쿠르트 라이트 | (주)에치와이 평택공장 | 2014001710732 | 100억 CFU / 65 mL | HOLD(prod-a cp06) |
| 2 | BEVERAGE | 야쿠르트 프리미엄 라이트 | (주)에치와이 평택공장 | 2014001710730 | 100억 CFU / 100 mL | 미격리(신규) |
| 3 | BEVERAGE | 거꾸로먹는 야쿠르트 | (주)에치와이 평택공장 | 2014001710731 | 100억 CFU / 110 mL | HOLD(pilot cp1) |
| 4 | DROP_OIL | 차일드라이프 베이비 액상 유산균 드롭스 | 코스맥스엔비티(주) | 200700170352801 | 2억 CFU / 0.295 mL | 미격리(신규) |
| 5 | DROP_OIL | 닥터드랍비 | 코스맥스엔비티(주) | 200700170351676 | 1.0×10⁸ CFU / 0.155 mL | 미격리(신규) |
| 6 | DROP_OIL | Kids Garden® Babyflora Probiotic drops | 코스맥스엔비티(주) | 200700170352069 | 20억 CFU / 0.152 mL | 미격리(신규) |
| 7 | DROP_OIL | 락티브 베베 우리아이 유산균 프로바이오틱스 드롭 | 코스맥스엔비티(주) | 200700170352352 | 1억 CFU / 0.188 mL | 미격리(신규) |
| 8 | DROP_OIL | 신터액트 베이비 오일드롭 | 코스맥스엔비티(주) | 200700170351715 | 1억 CFU / 0.2 mL | 미격리(신규) |

> 집계: BEVERAGE 3 · DROP_OIL 5. 유산균 잔여 풀 735건 기준 스캔(스캔 스크립트 `scratchpad/hold-exception-scan.mjs`).
> **선행 조치**: 미격리 6건(#2·4·5·6·7·8)은 본 WO 착수 전 `*-hold.json` 격리 기록을 먼저 남긴다(라인 오작성 방지).

---

## 3. 두 톤 분리 설계 (핵심)

액상은 부피 기준이라는 공통점 외에 **제작 톤이 갈린다.** 하나의 템플릿으로 섞지 않는다.

### 3.1 `UNSUPPORTED_DIMENSION:BEVERAGE` — 음료형
| 항목 | 내용 |
|------|------|
| 신호 | 기준량 65~110 mL/병, 성상 "액상"(음료), 1병 섭취 |
| 대상 | 성인·일반 |
| 표시 축 | **"1병(NN mL)당 프로바이오틱스 XX CFU 이상"** — 병 단위가 자연스러운 소비 단위 |
| 카피 톤 | 기존 유산균 톤 계승. 1병 = 1회 섭취 단위로 명확 |
| 주의 | mL 을 mg 로 환산하지 않는다. "1병당 CFU"만 표시 |

### 3.2 `UNSUPPORTED_DIMENSION:DROP_OIL` — 영유아 드롭·오일형
| 항목 | 내용 |
|------|------|
| 신호 | 기준량 0.1~0.3 mL/회, 성상 "액상/오일 드롭", 방울 적하 |
| 대상 | **영유아**(제품명 베이비·베베·Baby·Kids 다수) |
| 표시 축 | "1회 NN mL(방울)당 프로바이오틱스 XX CFU 이상" |
| **별도 검증 필요** | ① **영유아 주의문구**(연령 표기·섭취량은 원문 그대로만, F-AGE 가드 준수 — 원문에 연령별 없으면 어린이 적합 단정 금지) ② **보호자 톤**(구매·섭취 주체가 보호자) ③ 적하 섭취방법(방울 수·젖병·이유식 혼합 등 원문 표기 그대로) |
| 지뢰 | 제품명에 Baby/Kids 있어도 **원문 연령별 섭취량 없으면 어린이 적합 주장 금지**(가드 F-KIDS-NAME-001 / PRE-F-AGE). 밀도·용량 환산 금지 |

---

## 4. 변경 범위 (구현 시) — 구체 스펙

> 가드는 **작성 도구가 아니다**(검출·보고·차단만). 아래는 "부피 차원을 정상 인지"시키는 최소 확장이다.
> **이 WO 는 스펙 제안이며 실제 파일 수정은 오케스트레이터 구현 단계에서 수행한다**(본 문서는 무변경).

### 4.1 파서 — `source-grounding-parser.ts`

현재 `parseBasis` 는 분모를 `mg|g` 로만 매치한다(L177 `numbered = /[/]\s*([\d,.]+)\s*(mg|g)(?![a-zA-Z가-힣])/`).
부피 원문(`/ 65 ml`, `/ 0.295 ml`)은 이 매치에 걸리지 않아 `bare`/`PARSE_FAILED` 로 떨어진다(=오분류).

- **정규화**: `normalizeSource` 에 `㎖ → mL` 치환 1줄 추가(현 `㎎→mg` 옆). 대소문자 `ml|mL|㎖` 흡수.
- **분모 인지**: `parseBasis` 에 부피 분기를 **중량 분기와 분리**해 신설.
  ```text
  volNumbered = /[/]\s*([\d,.]+)\s*m[lL]\b/    // "/65 mL", "/0.295 ml"
  volDang     = /([\d,.]+)\s*m[lL]\s*당/       // "65 mL 당"  (드묾)
  ```
  매치 시 `{ kind:'PARSED', value:{ amount, unit:'mL' } }` 반환.
- **반환 타입**: `ParsedBasis.unit` 을 `'mg' | 'g' | 'mL'` 로 확장. **부피는 부피로만** 표현(중량 필드에 섞지 않음).
- **불변**: 부피 amount 를 mg 로 환산하지 않는다. 밀도 상수 도입 금지.
- **CFU 파서(`parseCfu`)는 무변경** — 부피여도 CFU 수치 규칙(억/raw/과학표기 교차검증)은 동일.

### 4.2 타입 — `product-description-guard.types.ts`
- `DeclaredAmount.basisUnit` 는 이미 `string` 이므로 값에 `'mL'` 허용(타입 변경 불필요, **문서화만**).
- `ServingSpec` 에 부피 규격 필드를 **역산 금지 원칙 유지**로 추가(모두 원문 명시 시에만, 없으면 null):
  ```text
  servingVolume       1회 섭취 부피(mL)  ← 음료=1병 부피, 드롭=1회 적하 부피. 원문 명시값만
  servingVolumeUnit   'mL'
  dropsPerServing?    1회 방울 수        ← 원문이 "N방울"을 적을 때만. 없으면 null(방울 수 창작 금지)
  bottleVolume?       1병 부피(mL)       ← 음료형. 원문 성상/표시 기준량과 동일할 때
  ```
  **불변**: 부피 ↔ 중량 상호 역산 금지. `unitWeight`·`servingTotalWeight` 계열과 **독립**.

### 4.3 규칙 — `product-description-guard.rules.ts`
- **`computeBasis` 분기**: 현재 `basisMg = toMg(da.basisAmount, da.basisUnit)` 가 `mL` 에 대해 `null` →
  `deny('기준량 단위 미지원(mL)')` 로 떨어진다(L82-83). 이를 **부피 전용 경로 `computeVolumeBasis`** 로 분리:
  - `basisEquals` 판정을 **부피 축**(1병 부피 / 1회 적하 부피)으로 수행. mg 축과 뒤섞지 않음.
  - `perUnitAllowed`(per-capsule) 개념은 부피에 **부적용**(방울당 CFU 는 방울 수가 원문에 있을 때만).
  - 산출은 **부피당 CFU** 만: 음료=`1병당 CFU`, 드롭=`1회 부피(mL)당 CFU`. **mg 파생 count 는 생성 자체를 금지**.
- **Rule A 확장(A-UNIT-BASIS)**: 부피 기준일 때
  - 허용: "1병(NN mL)당 XX CFU" / "1회 NN mL당 XX CFU"
  - **BLOCKED**: 임의의 `… mg 당 … CFU`, `mg`·`g` 파생 수치(밀도 환산 흔적).
- **신규 검출 `A-VOLUME-TO-WEIGHT-mL2mg`(제안)**: 초안이 부피 제품에서 `NN mg`/`g` 기준 수치를 서술하면 BLOCKED
  (원문 기준량이 mL 인데 mg 파생 = 밀도 창작). matchedText = 그 mg 표현.
- **Rule F(연령) 무변경 — 추가 완화 절대 금지**: DROP_OIL 영유아 대비 기존 F 전부 그대로.
  - `F-KIDS-NAME-001`: 제품명 베이비/베베/Baby/Kids + 원문 연령별 섭취량 부재 → "어린이 적합" 주장 BLOCKED.
  - `F-AGE-BOUNDARY-001`: 원문에 없는 연령 경계("N개월 이상") 확정 BLOCKED.
  - 액상 확장이 F 규칙에 **어떤 예외도 만들지 않는다**(모델 축만 부피로 늘림).
- **Rule G(제형)**: 드롭 "젖병·이유식 혼합·직접 적하" 서술은 원문(SRV_USE)이 명시할 때만(기존 G 그대로).

### 4.4 작성 템플릿(스크래치 빌더 — DB 미저장)
- BEVERAGE / DROP_OIL 2종 스켈레톤(§4-A). sd-* 시맨틱 구조·`<style>` 금지 계승(렌더러 variant 담당).
- 밀도·mg 환산 문구 원천 배제. 방울 수는 원문 표기 있을 때만.

---

## 4-A. 템플릿 2종 — 구체 스펙 + 예시 문안 (초안, DB 미저장)

> sd-* 시맨틱 HTML(스타일 없음) · ko/en 2언어 · 표기 축은 **부피당 CFU 만**.
> 아래 문안은 **가드 통과 목표 예시**이며 저장·게시하지 않는다.

### 4-A.1 `BEVERAGE` 음료형 — "1병당 CFU"

| 스펙 | 값 |
|------|-----|
| 대상 | 성인·일반 |
| 소비 단위 | 1병(=1회 섭취) |
| 표기 축 | `1병(NN mL)당 프로바이오틱스 XX CFU 이상` |
| 톤 | 기존 유산균 톤 계승. 규격은 규격으로("표시량 … 이상") |
| 금지 | mL→mg 환산 · 최상급 · 유통기한 보장 · 원문 없는 보관/효능 주장 |

예시 문안(야쿠르트 라이트, ko 발췌):
```text
sd-title:   야쿠르트 라이트
sd-spec:    이 제품의 표시 기준은 1병(65 mL)당 프로바이오틱스 100억 CFU 이상입니다.
sd-intake:  1일 1회, 1회 1병을 식사와 관계없이 드실 수 있습니다.   ← SRV_USE 원문 그대로
sd-form:    연한 노란색의 액상                                     ← 성상 원문 그대로
```
en 발췌: `The labelled standard for this product is at least 10 billion CFU of probiotics per 65 mL bottle.`

### 4-A.2 `DROP_OIL` 영유아 드롭·오일형 — "1회 N mL(방울)당 CFU" + 보호자 톤

| 스펙 | 값 |
|------|-----|
| 대상 | 영유아 (섭취·구매 주체 = **보호자**) |
| 소비 단위 | 1회 적하(0.1~0.3 mL) |
| 표기 축 | `1회 NN mL당 프로바이오틱스 XX CFU 이상` (방울 수는 **원문 표기 있을 때만** 병기) |
| **별도 준수** | ① F-AGE/F-KIDS: 원문 연령별 섭취량 없으면 **어린이 적합 단정 금지** ② 보호자 대상 문체 ③ 적하 방법(젖병·이유식 혼합 등)은 SRV_USE 원문 그대로만 |
| 금지 | mL→mg 환산 · 방울 수 창작 · "우리 아이에게 딱"류 적합 단정 · 연령 경계 확정 |

예시 문안(차일드라이프 베이비 드롭스, ko 발췌 — F 준수형):
```text
sd-title:   차일드라이프 베이비 액상 유산균 드롭스
sd-spec:    이 제품의 표시 기준은 1회 0.295 mL당 프로바이오틱스 2억 CFU 이상입니다.
sd-intake:  <SRV_USE 원문 그대로>. 섭취 전 보호자가 섭취 방법을 확인하세요.
sd-caution: <원문 주의사항 그대로>                       ← 연령·적합 문구 창작 금지
```
en 발췌: `The labelled standard for this product is at least 200 million CFU of probiotics per 0.295 mL serving.`

> ⚠️ 제품명에 Baby/Kids 가 있어도 원문에 연령별 섭취량이 없으면 "어린이에게 적합/좋다" 를 쓰지 않는다.
> 방울 수("N방울")는 SRV_USE 원문이 명시할 때만. 없으면 mL 로만 표기한다(방울 수 역산·창작 금지).

---

## 4-B. 8건 각 대상별 예상 표기 샘플

> 아래 표기는 **가드 통과 목표 문안**(부피당 CFU 축)이며 DB 미저장. mg 환산 0.

| # | 톤 | 제품 | 표시 기준량(원문) | 예상 표기(ko) | 예상 표기(en) |
|---|----|------|------------------|--------------|--------------|
| 1 | BEVERAGE | 야쿠르트 라이트 | 100억 CFU / 65 mL | 1병(65 mL)당 프로바이오틱스 100억 CFU 이상 | at least 10 billion CFU per 65 mL bottle |
| 2 | BEVERAGE | 야쿠르트 프리미엄 라이트 | 100억 CFU / 100 mL | 1병(100 mL)당 프로바이오틱스 100억 CFU 이상 | at least 10 billion CFU per 100 mL bottle |
| 3 | BEVERAGE | 거꾸로먹는 야쿠르트 | 100억 CFU / 110 mL | 1병(110 mL)당 프로바이오틱스 100억 CFU 이상 | at least 10 billion CFU per 110 mL bottle |
| 4 | DROP_OIL | 차일드라이프 베이비 드롭스 | 2억 CFU / 0.295 mL | 1회 0.295 mL당 프로바이오틱스 2억 CFU 이상 | at least 200 million CFU per 0.295 mL serving |
| 5 | DROP_OIL | 닥터드랍비 | 1억 CFU / 0.155 mL | 1회 0.155 mL당 프로바이오틱스 1억 CFU 이상 | at least 100 million CFU per 0.155 mL serving |
| 6 | DROP_OIL | Kids Garden® Babyflora | 20억 CFU / 0.152 mL | 1회 0.152 mL당 프로바이오틱스 20억 CFU 이상 | at least 2 billion CFU per 0.152 mL serving |
| 7 | DROP_OIL | 락티브 베베 우리아이 드롭 | 1억 CFU / 0.188 mL | 1회 0.188 mL당 프로바이오틱스 1억 CFU 이상 | at least 100 million CFU per 0.188 mL serving |
| 8 | DROP_OIL | 신터액트 베이비 오일드롭 | 1억 CFU / 0.2 mL | 1회 0.2 mL당 프로바이오틱스 1억 CFU 이상 | at least 100 million CFU per 0.2 mL serving |

**공통 준수**: (a) mL→mg 환산 0 · 밀도 상수 0. (b) DROP_OIL 5건(#4~8)은 원문 연령별 섭취량 부재 시 어린이 적합 단정 금지(F-KIDS/F-AGE). (c) 방울 수는 원문 표기 있을 때만 병기. (d) 성상·SRV_USE·주의는 원문 그대로.

---

## 5. 검증

```text
1. 파서 단위테스트: 8건 base 전부 parseBasis → 부피(mL) PARSED, mg 오환산 0.
2. 가드 전수: 8건 ko/en 초안 → BLOCKED 0 목표. 특히
   - 부피→중량 환산 흔적 0
   - DROP_OIL 어린이 적합 단정 0 (F-KIDS-NAME / PRE-F-AGE PASS)
3. 반응형 실측(sd-* 렌더러) — 기존 유산균 라인 기준 계승.
4. 이중게이트: 저장은 승인 후(HFF-R10). 본 WO 범위는 모델·초안까지.
```

---

## 6. 범위 밖 · 후속

- **복합형(MULTI_FUNCTIONAL)** 은 별건([복합형 파일럿](../guides/products/health-functional-food/pilot-multi-fiber/)) — 본 WO 무관.
- SOURCE_ABNORMAL / GROUNDING(원문 의존) 은 원문 정정·보완 트랙(본 WO 무관).
- 타 기능성 그룹(면역·항산화 등)의 액상은 이 8건 확장 검증 후 동일 모델로 편입 검토.
- ProductMaster·SPD·canonical 저장은 승인·이중게이트 후 별도(F12 baseline · HFF-R10).

---

## 부록. 판정 신호 요약 (레지스트리 V1.1 §제안 A 대응)

```text
UNSUPPORTED_DIMENSION
  ├─ :BEVERAGE   기준량 65~110 mL/병 · 성상 액상(음료) · 성인 · "1병당 CFU"
  └─ :DROP_OIL   기준량 0.1~0.3 mL/회 · 성상 액상·오일 드롭 · 영유아 · 보호자 톤·주의문구 별도
공통: 밀도 추정·mg 환산 금지. 부피는 부피(mL)로.
```
