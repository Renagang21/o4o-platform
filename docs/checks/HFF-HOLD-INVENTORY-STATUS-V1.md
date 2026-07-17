# HFF HOLD 재고 상태표 V1 (DRAFT)

> 상태: **DRAFT · 검수 대기** (커밋 전 · 검수 후 커밋) · 2026-07-17 · 작성 Agent F(HOLD·액상·복합 예외 관리)
> 성격: **read-only 집계.** 코드·데이터·DB 무변경. `*-hold.json` 원본 미수정.
> 근거 레지스트리: [HFF-DESCRIPTION-HOLD-CODE-REGISTRY-V1](HFF-DESCRIPTION-HOLD-CODE-REGISTRY-V1.md) (V1.1 하위분류)
> 예외군 분석: [HFF-HOLD-EXCEPTION-ANALYSIS-DRAFT-V1](HFF-HOLD-EXCEPTION-ANALYSIS-DRAFT-V1.md)
> 액상 모델 확장 WO: [WO-O4O-HFF-LIQUID-DIMENSION-MODEL-EXTENSION-V1](../work-orders/WO-O4O-HFF-LIQUID-DIMENSION-MODEL-EXTENSION-V1.md)
> 집계 소스: `docs/checks/data/product-description-guard/hff-probiotics-{prod-a,prod-b,cp}*-hold.json` (유산균 트랙 전수)

---

## 0. 요약 — 코드별 집계

유산균 트랙(생산 Batch 001=prod-a · Batch 002=prod-b · 파일럿=cp1~5) + 예외군 스캔 신규 발견.

| HOLD 코드 | 기록됨(*-hold.json) | 신규(미격리) | 합계 | 해소 경로 |
|-----------|:---:|:---:|:---:|-----------|
| `HOLD_SOURCE_ABNORMAL` | 5 | 0 | **5** | 식약처 원문 정정/보완 |
| `HOLD_GROUNDING` | 1 | 0 | **1** | 원문 CFU 보완 전까지 대기 |
| `HOLD_UNSUPPORTED_DIMENSION` | 2 | 6 | **8** | 우리 모델 확장(부피, WO 별도) |
| `HOLD_MULTI_FUNCTIONAL` | 3 | 1 | **4** | 별도 복합형 파일럿(유산균+식이섬유) |
| **총계** | **11** | **7** | **18** | — |

- **기록 11건** = prod-a 8 + prod-b 0 + 파일럿 3.
- **신규 7건** = 미격리 액상 6(UNSUPPORTED_DIMENSION) + 미격리 복합 1(MULTI_FUNCTIONAL). → **즉시 `*-hold.json` 격리 대상**(초안 생성 금지).
- prod-b(Batch 002) cp01~10 은 **전부 HOLD 0**(`[]`). Batch 002 는 격리 사례 없음.
- 데이터·grounding 은 전부 정상. HOLD 는 "지금 이 라인에서 안 만든다"는 격리(레지스트리 원칙).

> 범위 밖: 비타민 C 트랙(`hff-vitamin-c-*-hold.json`)은 Agent B 소관 — 본 유산균 재고표에 미포함.

---

## 1. 기록된 HOLD 11건 (배치·체크포인트별)

### Batch 001 (prod-a) — 8건

| # | CP | 제품 | 제조사 | 품목보고번호 | 코드 | 근본 신호 |
|---|----|------|--------|-------------|------|-----------|
| 1 | cp03 | 쾌변엔 식이섬유 유산균 | (주)오투바이오 | 20130020008439 | `MULTI_FUNCTIONAL` | 식이섬유(%) 표시량[5g/12g] 80%↑ + 프로바이오틱스 |
| 2 | cp05 | 뉴장안에화제 | 코스맥스엔비티(주) | 20070017035675 | `SOURCE_ABNORMAL:OPERATOR_TYPO` | CFU `1.0*x10^9`(연산자 이중 오타) → PARSE_FAILED |
| 3 | cp06 | 야쿠르트 라이트 | (주)에치와이 평택공장 | 2014001710732 | `UNSUPPORTED_DIMENSION:BEVERAGE` | 기준량 65 mL(부피) · 액상 음료 |
| 4 | cp07-a | 생유산균화이버 | 종근당건강(주) | 20040020016625 | `MULTI_FUNCTIONAL` | 식이섬유 표시량(4.0g/6g) 80%↑ + 프로바이오틱스 |
| 5 | cp07-b | 파워 장케어 | 풀무원건강생활(주) | 20040020001309 | `SOURCE_ABNORMAL:UNIT_LABEL_ABSENT` | `10,000,000,000/350mg` — CFU 단위 라벨 누락 → CFU ABSENT |
| 6 | cp08-a | 유지연의 쾌변엔 장 건강 | (주)세종바이오팜 | 20190009105367 | `MULTI_FUNCTIONAL` | 식이섬유 표시량(3.9g/6g) 80%↑ + 프로바이오틱스 |
| 7 | cp08-b | 닥터유산균프리미엄 | (주)한풍네이처팜 | 20120019007109 | `SOURCE_ABNORMAL:VALUE_UNIT_SPLIT` | `수(CFU/2,000mg):표시량(250,000,000)` — 수치·단위 분리 → PARSE_FAILED |
| 8 | cp09 | 헬코11플러스혼합유산균 | (주)한국씨엔에스팜 | 200400200071001 | `SOURCE_ABNORMAL:OPERATOR_TYPO` | `2.0 x 100,000,000`(비정형 계수·지수) → ABNORMAL |

> cp01·02·04·10 = HOLD 0(`[]`).

### Batch 002 (prod-b) — 0건

cp01~10 전부 `[]`. 격리 사례 없음.

### 파일럿 (hff-probiotics-cp1~5) — 3건

| CP | 제품 | 제조사 | 품목보고번호 | 코드 | 근본 신호 |
|----|------|--------|-------------|------|-----------|
| cp1-a | 100억 프로바이오틱스 플러스+ | 주)팜크로스 | 200400151101215 | `SOURCE_ABNORMAL:DECIMAL_THOUSAND_MIX` | `10.000,000,000`(소수점·천단위 혼용) → 조용한 오파싱 |
| cp1-b | 거꾸로먹는 야쿠르트 | (주)에치와이 평택공장 | 2014001710731 | `UNSUPPORTED_DIMENSION:BEVERAGE` | 기준량 110 mL(부피) · 액상 음료 |
| cp3 | 신프로바이오틱스 | 재단법인 경북바이오산업연구원 | 201200180223 | `GROUNDING` | BASE_STANDARD "표시량 이상"뿐 — CFU·기준량 원문 부재 |

> cp2·4·5 = HOLD 0(`[]`).

---

## 2. 신규 미격리 7건 (즉시 격리 대상 — 초안 생성 금지)

### 액상 6건 → `HOLD_UNSUPPORTED_DIMENSION`

| # | 하위 | 제품 | 제조사 | 품목보고번호 | 기준량(부피) |
|---|------|------|--------|-------------|-------------|
| 1 | `:BEVERAGE` | 야쿠르트 프리미엄 라이트 | (주)에치와이 평택공장 | 2014001710730 | 100억 CFU / 100 mL |
| 2 | `:DROP_OIL` | 차일드라이프 베이비 액상 유산균 드롭스 | 코스맥스엔비티(주) | 200700170352801 | 2억 CFU / 0.295 mL |
| 3 | `:DROP_OIL` | 닥터드랍비 | 코스맥스엔비티(주) | 200700170351676 | 1.0×10⁸ CFU / 0.155 mL |
| 4 | `:DROP_OIL` | Kids Garden® Babyflora Probiotic drops | 코스맥스엔비티(주) | 200700170352069 | 20억 CFU / 0.152 mL |
| 5 | `:DROP_OIL` | 락티브 베베 우리아이 유산균 프로바이오틱스 드롭 | 코스맥스엔비티(주) | 200700170352352 | 1억 CFU / 0.188 mL |
| 6 | `:DROP_OIL` | 신터액트 베이비 오일드롭 | 코스맥스엔비티(주) | 200700170351715 | 1억 CFU / 0.2 mL |

### 복합 1건 → `HOLD_MULTI_FUNCTIONAL`

| 제품 | 제조사 | 2번째 기능성분(base) |
|------|--------|---------------------|
| 슬림풀 나이트 | (주)오투바이오 | 식이섬유 표시량[5g/8g] 80%↑ |

> 격리 기록 형식은 레지스트리 §"격리 기록 형식(`*-hold.json`)" 준수(candidateId/productName/manufacturer/statementNo/holdCode/reason/baseStandard/intake).
> **초안·입력 JSON 생성 금지** — `*-hold.json` 에만 기록.

---

## 3. 코드별 하위 분해

### 3.1 `UNSUPPORTED_DIMENSION` 8건 — 하위분류 (BEVERAGE 3 / DROP_OIL 5)

| 하위 | 건수 | 제품 | 처리 |
|------|:---:|------|------|
| `:BEVERAGE` | 3 | 야쿠르트 라이트 · 야쿠르트 프리미엄 라이트 · 거꾸로먹는 야쿠르트 | 액상 모델 확장 WO(음료형 "1병당 CFU") |
| `:DROP_OIL` | 5 | 차일드라이프 · 닥터드랍비 · Kids Garden · 락티브 베베 · 신터액트 | 액상 모델 확장 WO(드롭형 "1회 mL당 CFU" + 영유아 F 준수) |

### 3.2 `SOURCE_ABNORMAL` 5건 — 하위패턴 태깅 (원문 정정 트리아지)

| 태그 | 건수 | 제품 | 정정 성격 |
|------|:---:|------|-----------|
| `:OPERATOR_TYPO` | 2 | 뉴장안에화제(`1.0*x10^9`) · 헬코11플러스(`2.0 x 100,000,000`) | 연산자·계수 표기 정정 |
| `:DECIMAL_THOUSAND_MIX` | 1 | 100억 프로바이오틱스 플러스+(`10.000,000,000`) | 소수점/천단위 구분자 혼용 |
| `:UNIT_LABEL_ABSENT` | 1 | 파워 장케어(`10,000,000,000/350mg`) | CFU 단위 라벨 **보완**(GROUNDING 경계, 숫자 존재로 구분) |
| `:VALUE_UNIT_SPLIT` | 1 | 닥터유산균프리미엄(`수(CFU/2,000mg):표시량(250,000,000)`) | 수치·단위 분리 정규화 |

### 3.3 `MULTI_FUNCTIONAL` 4건 — 조합 전부 유산균+식이섬유

쾌변엔 식이섬유 유산균 · 생유산균화이버 · 유지연의 쾌변엔 장 건강 · **슬림풀 나이트(신규)**.
→ 별도 복합형 파일럿 1차 범위 = 이 4건(골격 1종으로 소규모 착수 가능).

### 3.4 `GROUNDING` 1건

신프로바이오틱스(경북바이오산업연구원) — 원문 CFU·기준량 확보 전까지 대기.

---

## 4. 처리 우선순위

| 순위 | 대상 | 규모 | 성격 | 즉시 조치 |
|:---:|------|:---:|------|-----------|
| 1 | 신규 액상 6건 격리 기록 생성 | 6 | UNSUPPORTED_DIMENSION | `*-hold.json` 추가(초안 금지) |
| 2 | 신규 복합 1건(슬림풀 나이트) 격리 | 1 | MULTI_FUNCTIONAL | `*-hold.json` 추가 |
| 3 | 액상 모델 확장 WO(BEVERAGE 3 / DROP_OIL 5) | 8 | 우리 모델 확장 | WO-…-LIQUID-DIMENSION-MODEL-EXTENSION-V1(영유아 F 준수) |
| 4 | 복합형 파일럿(유산균+식이섬유) 설계 | 4 | 별도 파일럿 | 골격 1종 소규모 착수 |
| 5 | SOURCE_ABNORMAL 5건 원문 정정/보완 | 5 | 식약처 원문 | 하위태그 4종별 정정 요청 취합 |
| 6 | GROUNDING 1건(신프로바이오틱스) | 1 | 원문 보완 | 원문 CFU 확보 전 대기 |

### UNSUPPORTED_DIMENSION(액상 8) 처리 우선순위 세부

1. **격리 먼저**(순위 1) — 미격리 6건 `*-hold.json` 기록으로 라인에서 확실히 제외.
2. **BEVERAGE 3건 선(先) 착수 권장** — 톤이 기존 유산균 라인 계승, "1병당 CFU" 단일 축이라 검증 부담 최소.
3. **DROP_OIL 5건 후행** — 영유아·보호자 톤 + F-AGE/F-KIDS 별도 검증 필요, 방울 수 창작 금지 등 지뢰가 더 많음.
4. 공통 게이트: mL→mg 환산 흔적 0 · 밀도 상수 0 (파서 단위테스트 + 가드 전수 BLOCKED 0 목표).

> 레지스트리 원칙: 생산량 목표를 채우려 예외를 대체 후보로 보충하지 않는다 — 검증된 범위 내 정확 생산이 목표(생산량이 줄어도 정상).

---

## 5. 정합성 메모

- prod-a 8건 코드 합 = MULTI 3 + SOURCE_ABNORMAL 4 + UNSUPPORTED 1 = 8 ✓ (예외군 분석 §0·§1 일치).
- 파일럿 3건 = SOURCE_ABNORMAL 1 + UNSUPPORTED 1 + GROUNDING 1 = 3 ✓.
- prod-b 20 체크포인트 파일 전부 `[]` 확인(파일 크기 2 bytes) → Batch 002 HOLD 0 ✓.
- SOURCE_ABNORMAL 하위태그 합 = OPERATOR_TYPO 2 + DECIMAL_THOUSAND_MIX 1 + UNIT_LABEL_ABSENT 1 + VALUE_UNIT_SPLIT 1 = 5 ✓.
- UNSUPPORTED 하위 합 = BEVERAGE 3 + DROP_OIL 5 = 8 ✓.
