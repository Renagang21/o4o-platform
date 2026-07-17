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

## 4. 변경 범위 (구현 시)

> 가드는 **작성 도구가 아니다**(검출·보고·차단만). 아래는 "부피 차원을 정상 인지"시키는 최소 확장이다.

### 4.1 파서 — `source-grounding-parser.ts`
- `parseBasis` 에 **부피 분모(mL/㎖) 인지** 추가. 현재는 `mg|g` 만 → 부피면 `PARSE_FAILED`/오분류 위험.
  - 반환 타입에 부피 차원(`unit: 'mL'`)을 **별도로** 표현(중량과 뒤섞지 않음).
  - 부피 기준량은 mg 환산하지 않고 부피 그대로 유지.
- CFU 파싱(`parseCfu`)은 무변경(부피여도 CFU 수치는 동일 규칙).

### 4.2 타입 — `product-description-guard.types.ts`
- `DeclaredAmount.basisUnit` 에 `'mL'` 허용(현 `'mg'|'g'`).
- `ServingSpec` 에 부피 단위(1회/1병 mL) 표현 — **역산 금지 원칙 유지**(밀도 가정 없음).
- `computeBasis`(rules) 의 `toMg` 는 부피에 대해 `null` 반환이 아니라 **부피 차원으로 통과**시키되, 중량 파생(per-mg) 은 생성 금지.

### 4.3 규칙 — `product-description-guard.rules.ts`
- Rule A(기준량·환산): 부피 기준일 때 **부피당 CFU** 만 허용, mg 파생 수치는 BLOCKED(기존 A-UNIT-BASIS 확장).
- Rule F(연령): DROP_OIL 영유아 대비 **기존 F 규칙 그대로 적용**(추가 완화 금지) — 원문 연령 표기 보존.
- 신규 검출(선택): 부피를 중량으로 환산한 흔적(`mL`→`mg` 서술) BLOCKED 규칙.

### 4.4 작성 템플릿(스크래치 빌더)
- BEVERAGE / DROP_OIL 2종 스켈레톤. sd-* 구조·`<style>` 금지 계승(검증된 유산균/복합형 라인 동일).
- 밀도·mg 환산 문구 원천 배제.

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
