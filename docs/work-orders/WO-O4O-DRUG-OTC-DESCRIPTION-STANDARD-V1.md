# WO-O4O-DRUG-OTC-DESCRIPTION-STANDARD-V1

작성일: 2026-07-08
성격: **기준 WO (Standard Work Order)** — 모든 OTC 소비자 설명서 제작의 상위 규격
상태: Active Standard

> 이 문서는 모든 **증상군별 OTC 설명서 제작 WO** 의 공통 규칙을 정의한다.
> 이후 증상군별 WO(비염·구강·귀·안과·피부·여성질환·치질 등)는 **이 표준을 참조**하고,
> **차이나는 부분(대상 / 제외 / bucket / 조사 키워드 / 필수 주의문구 / 증상별 템플릿 / 후속 WO)만 작성**한다.
> 공통 규칙이 바뀌면 이 문서 한 곳만 수정한다.

관련 문서:
- 작성 가이드 SSOT: `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` (§3.6~§3.11)
- 실행 선례: `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-RHINITIS-ALLERGY-DRAFT-V1.md` · `docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-ORAL-THROAT-DRAFT-V1.md`

---

## 1. 목적

OTC(일반의약품) 소비자 설명서 제작의 **공통 원칙**을 정의한다.

제품별 설명서가 아니라 **허가사항·제형·투여경로·용법이 같은 그룹별 대표 설명서**를 만든다. 목표는 약국 상담·매장 활용에 쓰이는, 소비자가 이해할 수 있는 안전한 설명서다.

---

## 2. 적용 범위

모든 일반의약품 (`regulatory_type='DRUG'` AND `drug_category='otc'`):

- 경구
- 외용(피부)
- 안과(점안)
- 비강
- 귀(점이)
- 여성질환(질)
- 치질(직장)
- 구강·인후

증상군별 WO는 이 중 자신의 범위만 지정한다.

---

## 3. 작업 흐름 (모든 Batch 동일)

```text
WO 작성
  ↓
운영 DB read-only 조사
  ↓
후보 분류
  ↓
grounding 확인 (e약은요 / 허가 원문)
  ↓
대표 설명서 작성
  ↓
SOURCE GAP 적용
  ↓
CHECK 작성
  ↓
commit
  ↓
push
```

**완료 기준은 CHECK 작성 + commit/push 완료다. WO 작성만으로 멈추지 않는다.**
(단, WO 문서 생성 자체는 핸드오프이며, **실행은 별도 명시 지시가 있을 때 착수**한다 — `feedback-wo-handoff-only-no-auto-execute`.)

---

## 4. 절대 금지 (모든 WO 공통)

```text
DB write
draft insert
canonical 승격
shared_product_descriptions 변경
ProductMaster / ProductCandidate 변경
Admin apply / Admin 개발
코드 구조 변경
AI 추정 생성 (성분·효능·용법 창작)
```

모든 조사는 **read-only(SELECT)** 로만 수행한다.

### 4-A. DB 접속 (read-only 표준)

- `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db` (127.0.0.1:5434, ADC) + `psql` user `o4o_api`.
- 자격증명은 Cloud Run env(`DB_PASSWORD`)에서 직접 추출, 리터럴 미노출.
- **SELECT 전용.** 데이터 변경(UPDATE/DELETE/DDL)은 이 트랙에서 수행하지 않는다.
- 한글 정규식/키워드는 **UTF-8 SQL 파일**(`psql -f`)로 실행(CLI 인라인 인코딩 깨짐 방지).
- 원문 grounding: `shared_product_descriptions.content` (source_type=`mfds_easy_drug`, e약은요), join `master_id`.
- **데이터 제약(전 batch 공통)**: `product_drug_extensions` 임상 필드(efficacy_text·active_ingredients·dosage_form·strength 등)는 **OTC 전량 NULL**. 조성·제형·효능은 **name + ATC + e약은요 원문**에서만 추론한다.

---

## 5. 설명서 공유 원칙 (가장 중요)

다음이 **모두 같을 때만** 대표 설명서 하나를 공유한다.

```text
성분
+ 함량
+ 제형
+ 투여경로
+ 효능·효과
+ 용법·용량
+ 주요 주의사항
```

다음 기준으로는 **분리하지 않는다** (같은 대표 설명서 공유):

```text
브랜드명 · 제조사 · 포장단위 · 바코드 · 판매 채널 · 약국별 취급 여부
```

---

## 6. 절대 공유 금지

### 6-1. 투여경로가 다르면 절대 공유 금지

```text
경구 · 점안 · 점이 · 비강 · 질 · 직장 · 피부 · 구강/인후
```

### 6-2. 제형이 다르면 절대 공유 금지

```text
정 · 캡슐 · 시럽 · 트로키 · 가글 · 스프레이 · 연고 · 겔 · 패치/부착정 · 점안액 · 분무제
```

### 6-3. 성분 계열이 달라 금기·연령·사용기간이 다르면 분리

- 예: 트로키/스프레이 = **소독계(세틸피리디늄·클로르헥시딘) vs NSAID(플루르비프로펜)** 분리 (NSAID = 18세/최대 3일/소화성궤양·아스피린천식 금기).
- 예: 항히스타민 = 성분별 분리 (로라타딘·펙소페나딘·세티리진은 용법·상호작용·졸림 프로파일 상이).
- 예: 구내염제 = **스테로이드(감염성 구내염 금기) vs 비스테로이드** 분리.

---

## 7. 조사 원칙 — ATC는 후보 검색용, 설명서 그룹핑용 아님

```text
ATC = 후보 검색  ✅
ATC = 설명서 그룹 ✗
```

**ATC는 치료군이라 투여경로·제형과 일치하지 않는다.** ATC로 route를 확정하면 대량 오탐이 발생한다. 확정된 함정(비염·구강 작업에서 검증):

- `R01B`(전신 비충혈제거 ATC) → 상당수가 **먹는 감기약**.
- `R02A`(인후용제 ATC) 4자리 코드 → 631건 중 **528건이 먹는 인후·감기약**(캡슐/시럽/정).
- `S01`(안과 ATC) → **눈영양 경구 연질캡슐**(빌베리·은행엽) 혼입.

→ **route/제형은 name 키워드(1차) + ATC 교차(2차) + spec 함량으로 확정**한다. `spec` 첫 토큰은 **병/용기 용량**이지 농도가 아니다(점안·외용 과분할 주의).

---

## 8. 대표 설명서 작성 원칙 (소비자 중심 순서)

```text
어떤 약인가 (어떤 경우에 사용하나)
  ↓
언제 사용하는가 (이런 증상에 사용합니다)
  ↓
사용 방법 (route별 사용법 명시)
  ↓
주의사항 (민감군·금기·중복복용)
  ↓
병원 방문 (진료가 필요한 경우)
  ↓
성분 기준 선택 (공통 GMP 문구)
```

- route "사용" 안내(§3.10): 경구=복용 / 점안·점이·비강=넣기·뿌리기 / 트로키=씹지 말고 녹임 / 가글=삼키지 않음 / 스프레이=환부 분사 / 겔·연고·부착정=환부에만.
- **성분 창작 0**: 효능·용법·함량은 e약은요 원문 실조회 근거만 사용. 원문에 없으면 "제품별 허가 용법 확인"으로 표현하고 수치를 만들지 않는다.

---

## 9. SOURCE GAP (§3.11) — 대표 설명서 허용 게이트

대표 설명서는 다음을 **모두 만족**할 때만 작성한다.

```text
허가 효능·효과 동일(또는 실질 수렴)
허가 용법·용량이 대표 범위에서 표현 가능
제형·사용법 차이가 크지 않음
주요 주의사항(민감군·금기)이 조성별로 크게 다르지 않음
소비자 오해 소지 없음
```

하나라도 불만족 → **대표 설명서를 쓰지 않고 `HOLD_SOURCE`**.

- 조성·함량 gap: 원문 grounding 없는 함량/성분은 **HOLD_SOURCE** 또는 grounded 부분만 작성. 함량축이 다르면(예: 60mg 1일 2회 vs 120mg 1일 1회) 효능은 공유하되 **용법은 함량별 병기**, canonical 승격 시 함량별 group_key 분할이 가능하도록 근거를 남긴다.
- 고위험 세분(스테로이드·항생·국소마취 등)은 draft에 포함하되 **약사 검토 강화** 표기, 세분 큐레이션은 후속 트랙.

---

## 10. CHECK에 반드시 들어갈 항목

```text
후보 수
bucket별 수
grounding 수
대표 설명서 수
HOLD_SOURCE 수
EXCLUDE 수 / 제외 사유
SOURCE GAP 적용 결과
경로/제형 오혼입 제외 결과 (비강/안과/귀/먹는약 등)
DB write 0
```

**이번부터 추가 (V1 신설):**

```text
대표 설명서 목록 (group_key 단위)
대표 설명서 적용 ProductMaster 수 (각 대표가 커버하는 master 수 / grounded 수)
```

필수 표:

| group_key | bucket | route | dosage_form | efficacy_signature | master_count | grounding | action | reason |
|---|---|---|---|---|---:|---:|---|---|

---

## 11. 완료 보고 (항상 포함)

```text
후보 수
grounding 수
대표 설명서 수
대표 설명서 목록 (group_key)
적용 ProductMaster 수
HOLD_SOURCE 수
EXCLUDE 수
DB write 0 확인
commit hash
push 여부
```

---

## 12. Track Memory (증상군 종료 시 기록)

증상군 batch 종료 시 track 메모리(`wo-drug-otc-description-nonoral-track` 등)에 기록:

```text
대표 설명서 (수 / group_key)
적용 가능한 ProductMaster (총 / grounded)
특이사항 (ATC≠route 함정·성분 분리축·함량축 등)
HOLD_SOURCE
canonical 이슈 (승격 시 분할 근거 등)
```

---

## 13. OTC 설명서 구축 현황 (Living Tracker)

> 각 증상군 batch 완료 시 이 표를 갱신한다. **ProductMaster 수는 해당 CHECK의 확정치(grounded 기준)**. 검증 안 된 값은 임의로 채우지 않는다(`—` = 미확인/미착수).

| 증상군 | 대표 설명서 | 적용 ProductMaster (grounded) | CHECK | 상태 |
|---|---:|---:|---|:---:|
| 비염·알레르기 (R01/R06) | 8 | ≈ 700 (R06 항히스타민 516 + R01A 비강 113 + R01AX 식염수 40 + R01B 복합 44) | `...RHINITIS-ALLERGY-DRAFT-V1` | ✅ |
| 구강·인후 (A01/R02) | 8 | ≈ 188 (겔14+부착2+트로키45+스프레이36+가글36+소독55) | `...ORAL-THROAT-DRAFT-V1` | ✅ |
| 안과 (S01) | 6 | (인공눈물·충혈·알레르기·감염·안연고 — CHECK 확정치 재집계 필요) | `...OPHTHALMIC-DRAFT-V1` / `...BATCH-EYE-DRAFT-STAGE2-V1` | ✅(초안) |
| 외용·피부 (D01/D02/D08 저위험) | 7 | (테르비나핀·클로트리마졸·요소·덱스판테놀 등) | `...BATCH-TOPICAL-LOW-RISK-DRAFT-V1` | ✅(저위험) |
| 파스·첩부 (M02) | 4 | (케토프로펜·디클로페낙·플루르비프로펜·냉온감) | `...BATCH-PATCH-DRAFT-V1` | ✅(대표) |
| 귀 (S02) | — | — | 후속 `...EAR-DRAFT-V1` | 미착수 |
| 여성질환 (질) | — | — | 후속 | 미착수 |
| 치질 (직장) | — | — | 후속 | 미착수 |
| 감기 복합 (종합감기약) | — | — | 후속 (R01B/R02A 경구 이관 대상) | 미착수 |
| 진통제 / 소화기 | — | — | 별도 트랙 확인 필요 | 미확인 |

> 안과/외용/파스는 seed·대표 초안 단계(별도 트랙 CHECK 존재). ProductMaster 적용 수는 각 CHECK 확정치로 재집계 후 채운다. 진통제·소화기·감기 복합은 본 트랙에서 완료로 단정하지 않는다(미확인).

---

## 14. 증상군별 WO 최소 작성 항목

이 표준을 참조하는 증상군 WO는 아래만 작성하면 된다 (공통 규칙은 본 문서 참조):

```text
- 대상 (포함 조건)
- 제외 대상
- 핵심 bucket
- Read-only 조사 키워드 (ATC 후보 · 키워드 · 제형 · 반드시 제외)
- 필수 주의문구 (증상군 특이)
- 증상별 설명서 템플릿
- 우선 작성 대상 (목표 건수)
- 후속 WO
```

나머지(목적·작업 흐름·절대 금지·공유 원칙·공유 금지·조사 원칙·작성 순서·SOURCE GAP·CHECK 항목·완료 보고·Track Memory)는 **본 STANDARD-V1을 참조**한다.

---

## 15. 버전

- V1 (2026-07-08): 비염·구강 작업 경험 반영 최초 표준. ATC≠route 확정, 성분·함량축 분리 원칙, 대표 설명서 적용 ProductMaster 수 신규 추가, 구축 현황 Living Tracker 신설.
