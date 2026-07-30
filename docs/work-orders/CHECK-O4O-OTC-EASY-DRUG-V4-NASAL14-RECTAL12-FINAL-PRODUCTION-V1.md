# CHECK-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-FINAL-PRODUCTION-V1

> WO: `WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-FINAL-PRODUCTION-V1`
> readiness 입력 commit: `9c26c0051`
> 단일 LIVE write owner: **agent-ga**
> 판정: **PASS — nasal-unit-1 GREEN · rectal-unit-1 GREEN · REQUIRES_ROUTE_PROFILE 26 COMPLETE**

---

## 1. 결론

| 항목 | 계획 | 실측 | 판정 |
|---|---:|---:|:--:|
| 입력 master | 26 | 26 | PASS |
| GREEN | 26 | 26 | PASS |
| EXCEPTION | 0 | 0 | PASS |
| 총 committed write | 156T | 156T | PASS |
| nasal-unit-1 | 14 master · 84T | 14 GREEN · 84T | PASS |
| rectal-unit-1 | 12 master · 72T | 12 GREEN · 72T | PASS |
| 선행 유효 GREEN | 3,378 불변 | 변경 0 · 소실 0 · 대상 3,378 | PASS |
| 독립검증(사후) | PASS | nasal 27/27 · rectal 27/27 · 전체 27/27 | PASS |
| 중지 조건 발생 | 0 | 0 | PASS |

---

## 2. 단일 write-owner

- LIVE DB write 는 **agent-ga** 실행기(`otc-v4-nr26-executor.ga.ts`) 단일 경로에서만 수행되었다.
- LIVE 이중 잠금: `OTC_V4_APPLY_NR26=CONFIRM` + `OTC_V4_NR26_APPROVAL_WO=<본 WO>` 동시 충족 시에만 APPLY 분기 진입(미충족 시 `exit 3`).
- 승인 WO 값은 본 생산 WO ID 로 기록되어 audit metadata(`productionWo`)에 남는다.
- 다른 에이전트/세션의 LIVE write 는 0 — 대상 26 의 authored 점유·sourceRef 점유가 apply 직전 0 이었고(선행 게이트), apply 후 점유는 전량 본 배치 sourceRef 26개(각 KO+EN 2행)로 설명된다.

---

## 3. 선행 게이트 (apply 직전)

PRE_APPLY 독립검증기 재실행: **43/43 PASS** (`otc-v4-nr26-independent-verification.pre-apply.ga.json` 로 스냅샷 보존)

| 게이트 | 실측 |
|---|---|
| readiness 산출물 hash 불변 | payload contentHash 독자 재계산 0건 불일치 |
| dry-run digest 불변 | plan 파일 sha256 재계산 일치 (nasal/rectal 2 unit) |
| rollback-test 결과 불변 | 26/26 PASS · TX 내부 156T · committed 0 · residue 0 |
| 독립검증 43/43 | PASS |
| 기존 authored KO/EN canonical 0 | 0 |
| easy canonical 26 | 26 (각 1) |
| sourceRef 충돌 0 | LIVE 점유 0행 |
| canonicalDup 0 | 0 |
| 선행 GREEN 3,378 불변 | 변경 0 · 소실 0 |
| source terminal 24 write 0 | ref 0 · audit 0 |
| 기구 멸균제 3 write 0 | ref 0 · audit 0 |
| exclude 266 write 0 | ref 0 · audit 0 |
| 다른 세션 LIVE write 충돌 0 | 대상 26 sourceRef 점유 0 · authored 0 |

---

## 4. nasal LIVE (nasal-unit-1)

| 단계 | 결과 |
|---|---|
| 1. KO apply | 14 master × 4T = 56T |
| 2. KO postVerify | 14/14 PASS (canonical 1 · easy 강등 1 · easy 잔존 0 · storedHash=payload · audit 1 · sourceRef outside 0) |
| 3. EN apply | 14 master × 2T = 28T |
| 4. EN postVerify | 14/14 PASS (en canonical 1 · storedHash=payload · outside 0) |
| 5. 독립검증 | **27/27 PASS** (`otc-v4-nr26-post-verification-nasal-unit-1.ga.json`) |
| 6. GREEN 기록 | `otc-v4-nr26-green-nasal-unit-1.ga.json` · GREEN 14 · write 84 |

- planDigest: `b046d2c41414247b…`
- 총 write **84T** (계획 84T 일치) · EXCEPTION 0 · residueDirty 0

필수 검증 실측: authored KO canonical 14 / authored EN canonical 14 / easy canonical 잔존 0 / audit 14 /
sourceRef leak 0 / canonicalDup 0 / 공식 6섹션 mismatch 0 / 분무·점적·비강 부위 표현 보존(자기 경로 소실 0) /
횟수·간격·기간·연령 누락 0 / 경구·점안·피부·직장 표현 혼입 0 / EN 한글 0.

---

## 5. rectal LIVE (rectal-unit-1)

nasal GREEN 확인 후 실행.

| 단계 | 결과 |
|---|---|
| 1. KO apply | 12 master × 4T = 48T |
| 2. KO postVerify | 12/12 PASS |
| 3. EN apply | 12 master × 2T = 24T |
| 4. EN postVerify | 12/12 PASS |
| 5. 독립검증 | **27/27 PASS** (`otc-v4-nr26-post-verification-rectal-unit-1.ga.json`) |
| 6. GREEN 기록 | `otc-v4-nr26-green-rectal-unit-1.ga.json` · GREEN 12 · write 72 |

- planDigest: `4303497b349b8ffc…`
- 총 write **72T** (계획 72T 일치) · EXCEPTION 0 · residueDirty 0

필수 검증 실측: authored KO canonical 12 / authored EN canonical 12 / easy canonical 잔존 0 / audit 12 /
sourceRef leak 0 / canonicalDup 0 / 공식 6섹션 mismatch 0 / 직장·좌약·관장 표현 보존 /
횟수·간격·기간·연령 누락 0 / 경구·질내·피부·비강 표현 혼입 0 / EN 한글 0.

---

## 6. 전체 사후검증 (26 통합 · 27 게이트 PASS)

독립검증기는 select/compose/author/executor 를 **import 하지 않고** 섹션 파서·sourceRef 산식·수치/연령/기간 추출·
route 마커·검증 SQL 을 재구현하며, 판정 대상은 payload 가 아니라 **LIVE DB 에 실제로 저장된 content** 다.

| ID | 게이트 | 실측 |
|---|---|---|
| PV-01/02 | 대상 26 · sourceRef 독자 재계산 | 26 · 불일치 0 |
| PV-03/04 | authored KO/EN canonical | 26/26 · 26/26 |
| PV-05/06 | easy canonical 잔존 0 · deprecated 강등 | 0 · 26 |
| PV-07 | audit | 26 |
| PV-08/09 | sourceRef leak 0 · 점유 = master 당 2행 | 0 · 26ref 전부 2행 |
| PV-10 | canonicalDup | 0 |
| PV-11 | LIVE content md5 = 승인 payload hash | 0건 불일치 |
| PV-12/13 | 공식 원문 hash drift · 6섹션 mismatch | 0 · 0 |
| PV-14 | 공식 섹션 내용 보존(LIVE content 토큰 커버리지 ≥ 0.95) | 미달 0 |
| PV-15/16/17 | 수치 · 연령 · 기간/횟수 누락 | 0 · 0 · 0 |
| PV-18/19 | KO route 역전 0 · 자기 경로 보존 | 0 · 소실 0 |
| PV-20/21 | EN route 역전 0 · EN 한글 0 | 0 · 0 |
| PV-22 | 대상 밖 audit 0 (batch 전역) | 0 |
| PV-23/24/25 | source terminal 24 · 기구 멸균제 3 · exclude 266 write 0 | ref 0 · audit 0 (3군 전부) |
| PV-26 | 선행 유효 GREEN 3,378 불변 | 변경 0 / 소실 0 / 대상 3,378 |
| PV-27 | 전역 V4 authored KO canonical master | 15,836 (≥ 3,378 + 26) |

**재실행 멱등성**: 동일 실행기를 `--run-tag nr26prod1-rerun` 으로 재실행 →
nasal SKIP 14 / rectal SKIP 12 = **SKIP 26 · 신규 write 0 · EXCEPTION 0**.

---

## 7. 콘텐츠 불변 원칙 준수

- 외부 LLM 이 공식 원문에 없는 의료 사실을 생성한 구간 없음 — KO 는 공식 6섹션 grounding, EN 은 문장 단위 결정론 TM 조립.
- 공식 원문 6섹션(효능·효과 / 용법·용량 / 경고 / 사용상 주의사항 / 이상반응 / 상호작용) hash mismatch 0.
- 수치·연령·기간·횟수 토큰 누락 0 — 방어적 약화 없음.
- 경로 표현: 자기 경로(비강/직장) 소실 0, 타 경로 오도입 0. EN 부정문 면제 규칙은 `--selftest` 7케이스로 비공허성 확인(PASS).

---

## 8. 산출물

| 파일 | 내용 |
|---|---|
| `otc-v4-nr26-independent-verification.pre-apply.ga.json` | PRE_APPLY 43/43 스냅샷 |
| `otc-v4-nr26-apply-{nasal,rectal}-unit-1.run-nr26prod1.ga.json` | 생산 run 결과 원장(불변) |
| `otc-v4-nr26-apply-{nasal,rectal}-unit-1.run-nr26prod1-rerun.ga.json` | 멱등 재실행 원장(불변) |
| `otc-v4-nr26-apply-{nasal,rectal}-unit-1.ga.json` | 대표 원장(최초 1회 기록) |
| `otc-v4-nr26-green-{nasal,rectal}-unit-1.ga.json` | 단위 GREEN 원장 |
| `otc-v4-nr26-post-verification-{nasal-unit-1,rectal-unit-1,all}.ga.json` | 사후 독립검증 |

실행기 변경(추가만): APPLY 모드 `--run-tag` 필수화 + run 별 원장 **덮어쓰기 시 SYSTEM STOP** + 단위 GREEN 원장 emit.
독립검증기 변경(추가만): `--post` POST_APPLY 모드 27 게이트. 기존 PRE_APPLY 43 게이트·selftest 는 불변.

---

## 9. 상태 기록

- `nasal-unit-1` = **GREEN**
- `rectal-unit-1` = **GREEN**
- `REQUIRES_ROUTE_PROFILE 26` = **COMPLETE**
- 누적 유효 GREEN = 3,378 + 26 = **3,404**
- 잔여 route 이월 = **112** (TRUE_MULTI_ROUTE 46 · ROUTE_SOURCE_CONFLICT 31 · HOLD_UNRESOLVED 35)

---

## 10. 후속

1. TRUE_MULTI_ROUTE 46 조사
2. ROUTE_SOURCE_CONFLICT 31 조사
3. HOLD_UNRESOLVED 35 최종 판정
