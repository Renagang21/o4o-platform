# CHECK — 유산균 조건부 대량 생산 배치 (신규 200) · 종합 (FINAL)

- **WO**: `WO-O4O-HFF-DESCRIPTION-PROBIOTICS-PRODUCTION-BATCH-001-V1`
- **일자**: 2026-07-17 · **판정**: **PASS** — 10/10 체크포인트 완주, 최종 BLOCKED **0**
- **DB write**: 0 · **migration**: 0 · **canonical 승격**: 0 (이 WO는 DB write 전 최종 보고까지)

---

## 1. 전체 집계

```text
선정 200 = 작성(초안 생성) 192  +  HOLD 8
작성 192 → PASS 192 / REVIEW 0 / BLOCKED 0   (guard@1.1.0 phase=all: pre·post·bilingual + Q)
```

| CP | 선정 | 작성 | PASS | REVIEW | BLOCKED | HOLD |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| A-CP01 | 20 | 20 | 20 | 0 | 0 | 0 |
| A-CP02 | 20 | 20 | 20 | 0 | 0 | 0 |
| A-CP03 | 20 | 19 | 19 | 0 | 0 | 1 |
| A-CP04 | 20 | 20 | 20 | 0 | 0 | 0 |
| A-CP05 | 20 | 19 | 19 | 0 | 0 | 1 |
| A-CP06 | 20 | 19 | 19 | 0 | 0 | 1 |
| A-CP07 | 20 | 18 | 18 | 0 | 0 | 2 |
| A-CP08 | 20 | 18 | 18 | 0 | 0 | 2 |
| A-CP09 | 20 | 19 | 19 | 0 | 0 | 1 |
| A-CP10 | 20 | 20 | 20 | 0 | 0 | 0 |
| **합계** | **200** | **192** | **192** | **0** | **0** | **8** |

- 초안 파일: `docs/guides/products/health-functional-food/batch-probiotics-prod-001/A-CP{01..10}/drafts/*.{ko,en}.html` (192 × ko/en = **384 파일**)
- 선정: 기존 154건과 중복 0 · permit 중복 0 · 제조사 70개(배치내 최다 7) · 브랜드 라인 ≤2 · 제품명 변형 중복 0

## 2. 파서 상태 종합 (독립 대조)

- 작성 192 × 3필드 = **576 PARSED** · ABSENT/PARSE_FAILED/ABNORMAL **0** (작성 대상 기준) · 벌크(mL) **0**
- 원문 파싱값 vs **수작업 grounding**(원문 직접 판독) 불일치 **0 / 576**
- 절단 감사(전 CP): 파편 0 · 요약 0

## 3. 반응형 종합

- 누적 **1,920 조합**(192 × ko/en × 5 뷰포트: 360/390/768/1024/1440) 전부 **PASS**
- 가로 overflow / 텍스트 잘림 / 요소 겹침 / ko-en 전환 오류 **0**

## 4. HOLD 예외 목록 (8건, 4 코드 전부 발생)

| CP | 제품 | 제조사 | 코드 | 사유 |
|:--:|---|---|---|---|
| 03 | 쾌변엔 식이섬유 유산균 | 오투바이오 | `HOLD_MULTI_FUNCTIONAL` | 식이섬유(4.0g→80%) 복합 기능성 |
| 07 | 생유산균화이버 | 종근당건강 | `HOLD_MULTI_FUNCTIONAL` | 식이섬유(4.0g/6g→80%) 복합 |
| 08 | 유지연의 쾌변엔 장 건강 | 세종바이오팜 | `HOLD_MULTI_FUNCTIONAL` | 식이섬유(3.9g/6g→80%) 복합 |
| 06 | 야쿠르트 라이트 | 에치와이 | `HOLD_UNSUPPORTED_DIMENSION` | 기준량 부피 65 mL(액상, 중량모델 밖) |
| 05 | 뉴장안에화제 | 코스맥스엔비티 | `HOLD_SOURCE_ABNORMAL` | CFU 표기 `1.0*x10^9`(연산자 이중) 파서 PARSE_FAILED |
| 07 | 파워 장케어 | 풀무원건강생활 | `HOLD_SOURCE_ABNORMAL` | CFU 단위 라벨 누락 `10,000,000,000/350mg` → 파서 ABSENT·가드 ungrounded |
| 08 | 닥터유산균프리미엄 | 한풍네이처팜 | `HOLD_SOURCE_ABNORMAL` | CFU 단위 값과 분리 `수(CFU/2,000mg):표시량(250,000,000)` → PARSE_FAILED |
| 09 | 헬코11플러스혼합유산균 | 한국씨엔에스팜 | `HOLD_SOURCE_ABNORMAL` | CFU 표기 `2.0 x 100,000,000` 비정형 → 파서 ABNORMAL |

- **MULTI_FUNCTIONAL 3** (식이섬유 3건 — 코디네이터 확정, 순수 프로바이오틱스 범위 제외·대체 미보충)
- **SOURCE_ABNORMAL 4** — 공통: **원문 CFU 표기 결함으로 파서가 CFU를 추출 못 함 → 가드 PRE-SRC-CFU-MISMATCH 차단**. 원문 정정/보완 필요.
- **UNSUPPORTED_DIMENSION 1** — 부피(mL) 액상.

> **판정 일관 규칙**: 파서가 CFU를 **PARSED 하고 수작업 값과 일치**하면 진행(오타·괄호 흐트러짐이어도 faithful 인용). **CFU 를 PARSE_FAILED/ABNORMAL/ABSENT** 이면 가드가 ungrounded 로 차단 → HOLD. (대조: CP04 닥터데넨 괄호오타=PARSED→진행 / CP08 유산균장건강 `(30억)` 마커=PARSED→진행 vs 위 4건 HOLD)

> **분류 판단 보고(SOURCE_ABNORMAL 4건 중 2건)**: 파워 장케어·닥터유산균프리미엄은 CFU **숫자는 존재**하나 단위 라벨이 누락/분리돼 가드가 ungrounded 차단. `HOLD_GROUNDING`(숫자토큰 0)엔 안 맞아 "원문 표기 보완" 취지가 가까운 `HOLD_SOURCE_ABNORMAL`로 분류. 코디네이터가 별도 코드(예: CFU 표기 결함)를 원하면 재분류 가능.

## 5. 서술 논리·실화면 검수에서 잡은 것 (자동검사 전량 통과분)

| CP | 발견 | 조치 |
|:--:|---|---|
| 02 | 표시기준 인용 끝에 **다음 항목 괄호번호 `(3)` 누출** (`(1)(2)(3)` 원문) — 파서·절단·가드·영문 전량 미검출 | 작성기 절끝 순수 괄호숫자 제거. **CP01 3건 소급 정정**(파파키즈·Royale·아이배냇) |
| 02 | 대웅 보관 원문에 판촉 문장 `안심하고 섭취` 유입 → D-CLAIM 차단 | 작성기 `cleanStorage`(주장 문장만 문장단위 제외, 보관 지시 보존) |
| 04 | `물 없이 섭취` 원문을 `물과 함께`로 오탐(정반대) | 작성기 `noWater` 분기, 칩 `물 없이 섭취` |
| 07 | 보관칸에 **유통기한 문구 오입력** → 보관 행이 무의미 | 작성기 `STORAGE_SIGNAL` 판정(보관 지시어 없으면 행 생략) |
| 05·06·07 | 보관 원문 없음(게스프로)·냉장 지시·per-unit 근거 등 | 원문 그대로/생략, 모순 0 |

## 6. 가드 수정 (오탐 2건, 완화 아님 — 검출력 유지)

| ruleId | 오탐 원인 | 수정 | 회귀 |
|---|---|---|---|
| `B-SPEC-MINMAX-COMPARE-004` | 제품명 "**Than**k You" 의 `Than`k 가 비교어 `than` 매칭 | 단어경계 `\bthan\b` | 쌍 테스트 2(오탐 없음/실제 비교 검출) |
| `Q-TRUNCATED-002` | 어절경계 문자군에 **전각 닫음괄호 미포함**(`｝` 등) | `）］｝」』` 추가 | 전각괄호 인용 테스트 1 |

- content-guard 테스트 **120 → 123 PASS**(오탐/검출력 쌍 +3). 커밋 전후 Read 로 Agent B 충돌 확인, 본인 pathspec 만 커밋.

## 7. 알려진 사항 (차단 아님, 프로그램 정합 판단 대상)

- **인테이크 칩**: 원문이 `그대로 섭취`(direct)만 있어도 칩이 `직접 또는 물과 함께`로 `물`을 부가함 — **155 베이스라인·CP 전반 동일한 기존 작성기 동작**(가드 무플래그). 완화 시 프로그램 전반 소급이라 코디네이터 판단 대상으로 유지.
- **엔 스펙 행**(Appearance/Storage) 한국어 유지 — 전 배치 동일(원문 미번역).
- **엘바이오캡슐**(CP10): 섭취 2안 중 1안만 표기(둘 다 유효 옵션, 파생 없음).

## 8. 최종 검증

| 항목 | 결과 |
|---|---|
| content-guard 테스트 | **123 PASS** (4 suites) |
| 전 배치 회귀 (guard all) | **BLOCKED 0** — 기존 155(25·30A~C·CP1~5) + 신규 192(A-CP01~10) |
| 과거 오류 회귀(known-errors) | 유지 |
| 작성 대상 파서 상태 | 576/576 PARSED · 불일치 0 |
| 반응형 | 1,920/1,920 PASS |

## 9. DB write 전 상태 (다음 단계 — 별도 승인)

- 본 WO 산출물은 **초안 HTML + 입력/HOLD JSON + CHECK 문서**까지이며 **DB write·ProductMaster 생성·description candidate 저장·canonical 승격은 일절 미수행**.
- 다음 단계(별도 승인): 192 초안의 SPD STORE canonical 적재 · HOLD 8건 처리(식이섬유 3=복합 파일럿 이관 / SOURCE_ABNORMAL 4=원문 표기 보완 후 재작성 / UNSUPPORTED_DIMENSION 1=액상 모델 확장).
