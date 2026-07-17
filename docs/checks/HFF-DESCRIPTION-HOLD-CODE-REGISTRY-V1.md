# HFF 설명서 HOLD 코드 레지스트리 V1

- 근거: `WO-O4O-HFF-DESCRIPTION-PROBIOTICS-LIMITED-BULK-100-V1` (100건) + `...PRODUCTION-BATCH-001-V1` (생산)
- 일자: 2026-07-16 확정 · 2026-07-17 `HOLD_MULTI_FUNCTIONAL` 추가
- 목적: 설명서 제작 대상에서 격리하는 사유를 **성격별로 분리**해, 해소 경로가 다른 예외를 뒤섞지 않는다.

---

## 원칙

> HOLD 는 "**지금 이 라인에서 만들지 않는다**"는 격리이지, 제품·데이터가 나쁘다는 판정이 아니다.
> 격리된 제품은 초안·입력 JSON 을 만들지 않고 별도 `*-hold.json` 에만 기록한다.
> HOLD 사유는 **해소 경로**로 구분한다 — 원문 정정 / 우리 모델 확장 / 별도 패턴 파일럿.

## 코드 (6종)

| 코드 | 의미 | 판정 신호 | 해소 경로 | 최초 사례 |
|---|---|---|---|---|
| `HOLD_SOURCE_ABNORMAL` | 원문 표기가 깨져 수치 확정 불가 | 파서 `ABNORMAL` (소수점·천단위 혼용 등) | **식약처 원문 정정** | 100억 프로바이오틱스 플러스+ (CP1) |
| `HOLD_GROUNDING` | 표시 CFU·기준량이 **원문에 아예 없음** | 파서 `ABSENT` + 숫자 토큰 0 | **원문 보완** 전까지 불가 | 신프로바이오틱스 (CP3) |
| `HOLD_UNSUPPORTED_DIMENSION` | 근거는 온전하나 현재 모델이 그 **차원**을 지원 안 함 | 기준량이 부피(mL) 등 중량 모델 밖 | **우리 모델 확장** (밀도·부피) | 거꾸로먹는 야쿠르트 (CP1) |
| `HOLD_MULTI_FUNCTIONAL` | 제품·데이터 정상이나 **다른 기능성 조합**(다기능 복합) | 표시량에 2번째 기능성분(식이섬유 등) | **별도 복합형 파일럿** | 쾌변엔 식이섬유 유산균 (A-CP03) |
| `HOLD_DATA_CONFLICT` | 공식 필드 간 **불일치**(데이터 결함) | 원문 필드 상호 모순(예: 표시량 vs 성상 단위 불일치) | **식약처 원문 정정/확인** | (Batch 003 WO 정의) |
| `HOLD_NAME_UNGROUNDED_CLAIM` | 데이터·grounding 정상이나 **공식 제품명 자체**에 근거 없는 주장('특허받은' 등) | 제품명 H1 렌더 시 `D-CLAIM-UNGROUNDED-001` BLOCKED (제품명 임의 변경 금지) | **근거(특허 등) 확보 시 해소** — grounding family | 특허받은 듀얼액션 유산균 (C-CP11) |

> **범위 제외(선정 단계, HOLD와 구분)**: 대상성 제품(아동/영유아/여성 인티메이트)은 데이터 HOLD가 아니라 **선정 필터 제외**다. 선정 필터 철자 갭으로 frozen selection에 유입되면 in-place로 `HOLD_OUT_OF_SCOPE_{KIDS,INFANT,WOMENS}` 격리 후, 향후 배치 selection 재생성 전 필터 보강. (커밋된 permit 재배치 위험으로 소급 재생성은 안 함.)

### 구분의 핵심

```text
데이터 결함이냐?
  ├─ 원문 표기 깨짐        → SOURCE_ABNORMAL   (원문 정정)
  └─ 원문에 근거 없음      → GROUNDING         (원문 보완)
데이터는 정상, 범위 밖이냐?
  ├─ 우리 모델이 못 다룸    → UNSUPPORTED_DIMENSION (모델 확장)
  └─ 다른 제작 패턴이다     → MULTI_FUNCTIONAL  (별도 파일럿)
```

`UNSUPPORTED_DIMENSION` 과 `MULTI_FUNCTIONAL` 은 둘 다 "정상 데이터 · 현재 라인 밖 · 해소 가능"이지만
분리한다: 전자는 **우리 쪽 모델**을 고치면 되고, 후자는 **다른 기능성 패턴 자체의 검증**이 필요하다
(비타민 C 단일형이 별도 파일럿인 것과 같은 이유).

## MULTI_FUNCTIONAL 판정 기준 (생산 라인)

```text
유산균 단일 기능성(유산균 증식·유해균 억제·배변활동·장 건강)
  → 현재 유산균·CFU 생산 라인에서 작성

유산균 + 식이섬유/2~3원료 복합 등 다기능 조합
  → HOLD_MULTI_FUNCTIONAL
  → 제품 데이터·grounding 은 정상
  → 향후 복합형/식이섬유 결합형 파일럿으로 이관
```

순수 유산균 라인은 검증된 템플릿(mainFunction = 유산균 3기능)의 범위다.
다기능은 template 변종을 **생산 중에 즉석 제작하지 않는다** — 미검증 패턴을 라인에 섞지 않는다.

## 하위분류·판정신호 보강 (V1.1 · 2026-07-17, 예외군 분석 채택)

> 근거: `HFF-HOLD-EXCEPTION-ANALYSIS-DRAFT-V1.md` (풀 735 스캔). 제안 A/B/C 채택.

### A. `UNSUPPORTED_DIMENSION` 하위분류 — 액상은 두 톤으로 갈린다

| 하위 | 신호 | 특성 | 모델 확장 시 |
|------|------|------|-------------|
| `UNSUPPORTED_DIMENSION:BEVERAGE` | 기준량 65~110 mL/병, 성상 액상 음료 | 1병 섭취, 성인 | "1병당 CFU" 카피 축 |
| `UNSUPPORTED_DIMENSION:DROP_OIL` | 기준량 0.1~0.3 mL/회, 성상 액상·오일 드롭 | 영유아, 적하 | **영유아 대상 주의문구·보호자 톤 별도 검증** |

밀도 추정·mg 환산 금지 원칙은 공통 유지(액상 밀도 임의 가정 = 창작).

### B. `MULTI_FUNCTIONAL` 판정신호 우선순위 — base 시험항목이 1차

```text
1차 = BASE_STANDARD 시험항목의 2번째 기능성분 정량기준 (예: "식이섬유 : 표시량(4g/6g)의 80% 이상")
2차 = mainFunction(mf_raw) 의 2번째 기능성 블록
주의: 식이섬유형은 mf_raw 에 유산균 기능만 기재되고 식이섬유는 base 에만 나타나는 사례 다수
      → mf_raw 단독 스캔은 복합형을 놓친다. base 시험항목 스캔이 1차 신호.
```

### C. `SOURCE_ABNORMAL` 하위패턴 태깅 (원문 정정 트리아지)

| 태그 | 예 | 정정 성격 |
|------|-----|-----------|
| `:OPERATOR_TYPO` | `1.0*x10^9`, `2.0 x 100,000,000` | 연산자·계수 표기 정정 |
| `:DECIMAL_THOUSAND_MIX` | `10.000,000,000` | 소수점/천단위 구분자 혼용 |
| `:UNIT_LABEL_ABSENT` | `10,000,000,000/350mg`(CFU 라벨 없음) | 단위 라벨 **보완** |
| `:VALUE_UNIT_SPLIT` | `수(CFU/2,000mg):표시량(250,000,000)` | 수치·단위 분리 정규화 |

`:UNIT_LABEL_ABSENT` 는 GROUNDING 인접이나 **숫자 토큰이 존재**하므로 SOURCE_ABNORMAL 유지(GROUNDING 판정신호 "숫자 토큰 0" 미충족).

## 격리 기록 형식 (`*-hold.json`)

```json
{
  "candidateId": "...", "productName": "...", "manufacturer": "...", "statementNo": "...",
  "holdCode": "HOLD_MULTI_FUNCTIONAL",
  "reason": "표시량에 식이섬유 기능성 병기 — 유산균 단일 기능성 범위 밖",
  "baseStandard": "<원문>", "intake": "<원문>"
}
```

## 종합 집계 규칙

체크포인트/배치 보고에서 **선정 = 작성 + HOLD** 로 분모를 분리한다.
HOLD 는 유형별로 집계하고, 생산량 목표(예: 200)를 채우려 대체 후보로 **보충하지 않는다** —
검증된 범위 안에서 정확히 생산하는 것이 목표다(생산량이 197 등으로 줄어도 정상).
