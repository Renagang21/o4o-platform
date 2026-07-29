# 후속 에이전트 작업 요청서 초안 — pilot 100 (V4 per-master 트랙)

> WO: `WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-QUEUE-V1`
> 작성: 라 에이전트 · 상태: **초안(핸드오프 전용)** — 본 문서는 실행 지시가 아니며, 사용자가 별도로 발주할 때 비로소 실행된다.
> 전제 산출물(동일 디렉터리):
> - `otc-easy-drug-remaining-pilot-100-ledger-v1.json` (pilot 100 원장)
> - `otc-easy-drug-remaining-pilot-100-agent-ga-input-v1.json` (가 입력 + 실행 계약)
> - `otc-easy-drug-remaining-pilot-100-agent-na-handoff-schema-v1.json` (예외 인계 schema · 예외코드 15 · SYS-01~12 · 확장 게이트)
> - `otc-easy-drug-remaining-pilot-100-check-v1.json` (게이트 22/22 PASS · DB write 0)

---

## A. 후속 **agent-ga** 작업 요청서 초안

### A-1. 제목

`WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-GA-PRODUCTION-V1`

### A-2. 목적

pilot 100 master 를 **제품별 독립 단위**로 KO·EN 매장용 설명서까지 생산하고, 실패를 제품 단위로 격리하여 예외 원장으로 인계한다. 목적은 성공률이 아니라 **실패 격리의 정확성 검증**이다.

### A-3. 입력

- 대기열: `otc-easy-drug-remaining-pilot-100-agent-ga-input-v1.json` (`batchId = otc-v4-pilot-100`, 100건, masterId 오름차순)
- grounding: 각 master 자신의 e약은요 공식 원문 6섹션(효능·효과 / 용법·용량 / 경고 / 사용상 주의사항 / 이상반응 / 상호작용)
- sourceRef namespace: `otc-v4-master-leaflet:<masterId>` → `uuid(md5(...))` (V2 gencode·V3 content-fp 네임스페이스와 반드시 구분)

### A-4. 불변 규칙

1. **1 master = 1 작업 단위.** 다른 master 의 원문을 절대 혼합하지 않는다. gencode 그룹핑은 생산 전제조건이 아니다.
2. **공식 원문에 없는 의료 사실을 외부 LLM 으로 생성·보강하지 않는다.** 제목·요약·소제목·문장 구조·표현만 소비자 친화적으로 재구성한다.
3. **route 는 제품명 문자열로 추론하지 않는다.** 단일 유효 gencode 의 `resolveRoute()` 또는 그 제품 자신의 공식 용법·용량 동사에서만 도출한다. (함정: "연질캡슐" 의 부분문자열 "질캡슐" → vaginal 오탐)
4. **EN 은 KO canonical 선행 필수.** KO 미확정 상태의 EN 보류는 `HELD_KO_NOT_CANONICAL` 이며 **예외가 아니다.**
5. **기존 LIVE 는 변경하지 않는다.** 기존 authored/en canonical 이 점유된 슬롯은 `EXISTING_CANONICAL_CONFLICT` 로 예외 처리하고 건드리지 않는다.
6. **write owner 는 agent-ga 단독.** agent-na 는 DB write 0.

### A-5. 실행 계약 (제품 단위 continue)

- master 별 savepoint. 실패 시 해당 savepoint 만 ROLLBACK → **그 master 의 dbWriteActual = 0** → 예외 원장 1행 기록 → **다음 master 로 계속**.
- **개별 제품 문제는 전체 중지 조건이 아니다**: route 미확정 / identity 충돌 / 수치·연령·기간 파싱 실패 / 공식 원문 결손 / composer 미지원 / 전문용 의심 / 낮은 성공률.
- 멱등: 재실행 시 이미 완료된 master 는 자동 SKIP(CREATED 0).

### A-6. master 별 preflight (필수)

1. `officialSourceHash` 재계산 → pilot 원장 값과 **일치** 확인. 불일치 = **SYS-01 즉시 전체 중지**.
2. `existingAuthoredKoCanonical` / `existingEnCanonical` = 0 확인. >0 → `EXISTING_CANONICAL_CONFLICT`.
3. `plannedSourceRef` LIVE 점유 0 확인. >0 → `SOURCE_REF_CONFLICT` (누적 2건 이상 = **SYS-04 전체 중지**).
4. `professionalSuspect = false` 확인. true → `PROFESSIONAL_USE` (terminal).

### A-7. 전체 중지 조건 (시스템 수준만)

`SYS-01 ~ SYS-12` — schema JSON `systemStopConditions` 참조. 요지: 원문 오연결 / 원문 혼합 / 정상 제품 6섹션 누락 / sourceRef 산식 충돌 반복 / canonicalDup / 성공·실패 분리 불가 / 실패 master 에 write 발생 / 기존 LIVE 변경 / 재실행 이중반영 / savepoint 격리 미작동 / commit 결과 불신 / 타 세션 LIVE write 감지.

### A-8. 산출물

- `otc-easy-drug-remaining-pilot-100-ga-production-result-v1.json` — master 별 outcome(성공/예외), `sum(outcome) = 100` 필수
- `otc-easy-drug-remaining-pilot-100-exception-ledger-v1.json` — 예외 인계 원장(schema 준수, 필수 17필드 누락 0, 실패 건 `dbWriteActual = 0`)
- 별개 코드경로 `*-ga-production-verify.ga.ts` 독립검증 결과
- CHECK 문서(`docs/work-orders/CHECK-...-GA-PRODUCTION-V1.md`)

### A-9. 완료 게이트

`EXP-01 ~ EXP-11` 전건 PASS. **성공률은 게이트가 아니다**(`EXP-NOT`).

### A-10. 기대치(참고, 게이트 아님)

`PRODUCE_EXPECTED 70` / `PRE_EXCEPTION_EXPECTED 30`. 실제가 기대와 달라도 격리가 정확하면 시험은 성공이다.

---

## B. 후속 **agent-na** 작업 요청서 초안

### B-1. 제목

`WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-NA-EXCEPTION-CLOSURE-V1`

### B-2. 목적

가 에이전트가 인계한 예외 원장을 **원인별로 일괄 마무리**한다. 개별 제품을 한 건씩 되돌리는 방식이 아니라, 원인 그룹 단위로 "공통 수정 가능 여부"를 판정한다.

### B-3. 입력 / 제약

- 입력: `otc-easy-drug-remaining-pilot-100-exception-ledger-v1.json`
- **DB write 0** (read-only SELECT 만). 재진입 후 write owner 는 항상 agent-ga.
- 전용 cloud-sql-proxy 포트 사용(공유 포트 토큰 만료 함정 회피).

### B-4. 그룹 축 (8)

route 미확정 / identity 충돌 / 수치 파싱 실패 / 연령·기간 파싱 실패 / 공식 원문 결손 / composer 미지원 구조 / 전문용 의심 / canonical·sourceRef 충돌.

### B-5. 그룹별 보고 필드

`expectedCount` · `commonCause` · `commonFixPossible` · `parserOrProfileFixPossible` · `gaReentryCondition` · `holdCondition`.

### B-6. 판정 원칙

- **공식 원문 결손(`SOURCE_*_MISSING`)은 ETL 재수집 전 terminal.** 창작으로 메우지 않는다.
- **`PROFESSIONAL_USE` 는 운영자 판단 전 terminal.** 정상 대기열 편입 금지.
- **`EXISTING_CANONICAL_CONFLICT` 는 운영자 승인 없이 terminal.** 기존 LIVE 변경 금지.
- 나머지 retryable 코드는 parser/profile 보완 조건과 함께 **가 재편입 조건**을 명시한다.

### B-7. 산출물

- `otc-easy-drug-remaining-pilot-100-na-exception-closure-v1.json` (그룹별 판정)
- 2차 500 확장 권고(GO / GO_WITH_FIX / HOLD) + 근거
- CHECK 문서

### B-8. 완료 게이트

예외 원장 전건이 정확히 1개 그룹에 귀속(누락·중복 0) · terminal 과 retryable 이 분리 · 재편입 조건이 실행 가능한 형태로 기술 · DB write 0.

---

## C. 2차 500 확장 게이트 (요약)

`EXP-01` 정상 생산 master 공식 6섹션 mismatch 0 · `EXP-02` 수치·연령·기간 누락 0 · `EXP-03` canonicalDup 0 · `EXP-04` sourceRef 충돌 0 · `EXP-05` 기존 LIVE 변경 0 · `EXP-06` 실패 master DB write 0 · `EXP-07` 실패가 배치를 중단하지 않음 · `EXP-08` 재실행 멱등 · `EXP-09` 예외 원장 누락 0 · `EXP-10` 독립검증 PASS · `EXP-11` SYS-01~12 미발동.
`EXP-NOT`: **성공률은 절대 중지·확장 차단 기준이 아니다.**

2차 500 은 동일 층화 규칙(A 정상 / B 경계 / C 원문·composer)을 유지하되, 1차에서 확인된 예외 분포를 반영해 비율을 재산정하고, pilot 100 과의 교집합은 0 이어야 한다.
