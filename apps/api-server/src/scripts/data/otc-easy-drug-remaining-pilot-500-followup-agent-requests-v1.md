# 후속 에이전트 작업 요청서 초안 — pilot 500 (V4 per-master 트랙)

> WO: `WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-QUEUE-V1`
> 작성: 라 에이전트 · 상태: **초안(핸드오프 전용)** — 본 문서는 실행 지시가 아니며, 사용자가 별도로 발주할 때 비로소 실행된다.
> 전제 산출물(동일 디렉터리):
> - `otc-easy-drug-remaining-pilot-500-ledger-v1.json` (pilot 500 원장)
> - `otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json` (가 입력 + 실행 계약)
> - `otc-easy-drug-remaining-pilot-500-agent-na-handoff-schema-v1.json` (예외 인계 schema · 예외코드 15 · SYS-01~17 · 전량 확대 게이트)
> - `otc-easy-drug-remaining-pilot-500-identity-criteria-correction-v1.md` (identity 판정 정정 근거)
> - `otc-easy-drug-remaining-pilot-500-check-v1.json` (게이트 27/27 · DB write 0)

---

## A. 후속 **agent-ga** 작업 요청서 초안

### A-1. 제목

`WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-GA-PRODUCTION-V1`

### A-2. 목적

pilot 500 master 를 **제품별 독립 단위**로 KO·EN 매장용 설명서까지 생산하고, 실패를 제품 단위로 격리하여 예외 원장으로 인계한다.
목적은 성공률이 아니라 **잔여 전량 확대 가능 여부의 확정**이다.

### A-3. 입력

- 대기열: `otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json` (`batchId = otc-v4-pilot-500`, 500건, masterId 오름차순)
- grounding: 각 master 자신의 e약은요 공식 원문 6섹션
- sourceRef namespace: `otc-v4-master-leaflet:<masterId>` → `uuid(md5(...))` (V2 gencode·V3 content-fp 네임스페이스와 반드시 구분)

### A-4. 불변 규칙

1. **1 master = 1 작업 단위.** 다른 master 의 원문을 절대 혼합하지 않는다.
2. **공식 원문에 없는 의료 사실을 외부 LLM 으로 생성·보강하지 않는다.**
3. **route 는 제품명 문자열로 추론하지 않는다.** 단일 유효 gencode 의 `resolveRoute()` 또는 그 제품 자신의 공식 용법·용량 동사에서만 도출한다.
4. **EN 은 KO canonical 선행 필수.** KO 미확정 상태의 EN 보류는 `HELD_KO_NOT_CANONICAL` 이며 예외가 아니다.
5. **기존 LIVE 는 변경하지 않는다.** 특히 **pilot 100 GREEN 80 은 절대 불변**(SYS-13), **pilot 100 예외 20 에는 write 금지**(SYS-14).
6. **write owner 는 agent-ga 단독.** agent-na 는 DB write 0.
7. **identity 판정은 정정 기준(v2)** 을 사용한다 — `gencodeCount >= 2` 단독은 예외가 아니다.

### A-5. 실행 계약 (제품 단위 continue)

- master 별 savepoint 또는 독립 transaction. 실패 시 ROLLBACK → **그 master 의 dbWriteActual = 0** → 예외 원장 1행 → **다음 master 로 계속**.
- **개별 제품 문제는 전체 중지 조건이 아니다.**
- 멱등: 재실행 시 이미 완료된 master 는 자동 SKIP(CREATED 0).
- checkpoint: 10~25 master 단위 기록. 중단 후 재개 시 중복 write 0.

### A-6. master 별 preflight (필수)

1. `officialSourceHash` 재계산 → 원장 값과 **일치** 확인. 불일치 = **SYS-01 즉시 전체 중지**.
2. `existingCanonicalKo` / `existingCanonicalEn` = 0 확인. >0 → `EXISTING_CANONICAL_CONFLICT`.
3. `sourceRef` LIVE 점유 0 확인. >0 → `SOURCE_REF_CONFLICT` (누적 2건 이상 = **SYS-04 전체 중지**).
4. `professionalSuspect = false` 확인. true → `PROFESSIONAL_USE` (terminal).
5. identity: `permitCodeCount >= 2` 또는 `officialSourceHashCount >= 2` 일 때만 `IDENTITY_CONFLICT`.

### A-7. 전체 중지 조건 (시스템 수준만)

`SYS-01 ~ SYS-17` — schema JSON `systemStopConditions` 참조.
pilot 100 대비 추가: **SYS-13** GREEN 80 변경 · **SYS-14** 예외 20 write · **SYS-15** 완료 master skip 실패 · **SYS-16** checkpoint 재개 중복 write · **SYS-17** sourceRef 타 master 재사용.

### A-8. 산출물

- `otc-easy-drug-remaining-pilot-500-ga-production-result-v1.json` — master 별 outcome, `sum(outcome) = 500` 필수
- `otc-easy-drug-remaining-pilot-500-exception-ledger-v1.json` — 예외 인계 원장(필수 17필드 누락 0, 실패 건 `dbWriteActual = 0`)
- 별개 코드경로 `*-ga-production-verify.ga.ts` 독립검증 결과
- CHECK 문서(`docs/work-orders/CHECK-...-PILOT-500-GA-PRODUCTION-V1.md`)

### A-9. 완료 게이트

`EXPALL-01 ~ EXPALL-14` 전건 PASS → 최종 판정 `APPROVED_FOR_REMAINING_ALL`.
미달 시 `NEEDS_PIPELINE_FIX`, 시스템 중지 발동 시 `SYSTEM_STOP`. **성공률은 게이트가 아니다**(`EXPALL-NOT`).

### A-10. 기대치(참고, 게이트 아님)

`PRODUCE_EXPECTED 416` / `PRE_EXCEPTION_EXPECTED 84`.

---

## B. 후속 **agent-na** 작업 요청서 초안

### B-1. 제목

`WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-NA-EXCEPTION-CLOSURE-V1`

### B-2. 목적

가 에이전트가 인계한 pilot 500 예외 원장을 **원인별로 일괄 마무리**한다. pilot 100 잔여 예외 20 도 동일 그룹 축에 병합하여 함께 판정한다.

### B-3. 입력 / 제약

- 입력: `otc-easy-drug-remaining-pilot-500-exception-ledger-v1.json` + `otc-v4-pilot-100-exception-handoff-na.ga.json` (pilot 100 잔여 20)
- **DB write 0** (read-only SELECT 만). 재진입 후 write owner 는 항상 agent-ga.
- 전용 cloud-sql-proxy 포트 사용(공유 포트 토큰 만료 함정 회피).

### B-4. 그룹 축 (8)

route 미확정 / identity 충돌(정정 기준) / 수치 파싱 실패 / 연령·기간 파싱 실패 / 공식 원문 결손 / composer 미지원 구조 / 전문용 의심 / canonical·sourceRef 충돌.

### B-5. 그룹별 보고 필드

`expectedCount` · `commonCause` · `commonFixPossible` · `parserOrProfileFixPossible` · `gaReentryCondition` · `holdCondition`.

### B-6. 판정 원칙

- **공식 원문 결손(`SOURCE_*_MISSING`)은 ETL 재수집 전 terminal.** 창작으로 메우지 않는다.
- **`PROFESSIONAL_USE` 는 운영자 판단 전 terminal.**
- **`EXISTING_CANONICAL_CONFLICT` 는 운영자 승인 없이 terminal.** 기존 LIVE 변경 금지.
- **`IDENTITY_CONFLICT` 는 정정 기준(permitCode/원문 hash)으로만 판정.** gencode 다중 단독 건은 재편입 대상이다.

### B-7. 산출물

- `otc-easy-drug-remaining-pilot-500-na-exception-closure-v1.json` (그룹별 판정)
- 잔여 전량 확대 권고(GO / GO_WITH_FIX / HOLD) + 근거
- CHECK 문서

### B-8. 완료 게이트

예외 원장 전건이 정확히 1개 그룹에 귀속(누락·중복 0) · terminal 과 retryable 분리 · 재편입 조건이 실행 가능한 형태로 기술 · DB write 0.

---

## C. 잔여 전량 확대 게이트 (요약)

- `EXPALL-01` 500 전량 처리(processed = 500, 중단 0)
- `EXPALL-02` 개별 실패 후 다음 master 계속 처리
- `EXPALL-03` 실패 master DB residue 0
- `EXPALL-04` 정상 생산 master 공식 6섹션 mismatch 0
- `EXPALL-05` 수치·연령·기간 누락 0
- `EXPALL-06` canonicalDup 0
- `EXPALL-07` sourceRef 충돌·누출 0
- `EXPALL-08` 기존 LIVE 변경 0
- `EXPALL-09` pilot 100 GREEN 80 불변
- `EXPALL-10` 재실행 시 완료 master 자동 skip
- `EXPALL-11` 예외 원장 누락·중복 0
- `EXPALL-12` checkpoint 재개 PASS
- `EXPALL-13` 독립검증(별개 코드경로) PASS
- `EXPALL-14` 시스템 수준 오류 0(SYS-01~SYS-17 미발동)
- `EXPALL-NOT` 성공률은 절대 전량 확대 차단 기준이 아니다

최종 판정 enum: `APPROVED_FOR_REMAINING_ALL` | `NEEDS_PIPELINE_FIX` | `SYSTEM_STOP`
