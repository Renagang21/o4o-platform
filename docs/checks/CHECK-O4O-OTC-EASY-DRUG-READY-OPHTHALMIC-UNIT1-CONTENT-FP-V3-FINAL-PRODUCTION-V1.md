# CHECK — WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1

- **일자**: 2026-07-29
- **에이전트**: 가 (agent-ga) — 본 WO 단일 DB write-owner
- **대상**: `ophthalmic-unit-1` — content fp 26 · master 253 · 1,518T (KO 1,012 + EN 506)
- **판정**: **GREEN**

## 1. 근거 baseline

| 항목 | 커밋 | 상태 |
|------|------|------|
| V3 content-fingerprint 전역 재승인 SSOT | `00851d237` | APPROVED_FOR_PRODUCTION |
| ophthalmic readiness (PRE_APPLY READY) | `4e062dcc2` | 산출물 digest 불변 |
| oral route COMPLETE (540 master · 3,240T) | `3f200900a` | 실측 재확인 |
| topical-unit-1 GREEN (327 master · 1,962T) | `196c5de65` | 실측 재확인 |

## 2. 선행 게이트 (10/10 PASS · write 0)

러너: `otc-v3-ophthalmic-production-prereq-gate.ga.ts`

| 게이트 | 실측 |
|--------|------|
| P1 oral COMPLETE | KO 540 · EN 540 · easy deprecated 540 · easy 잔존 0 |
| P2 topical GREEN | KO 327 · EN 327 · easy deprecated 327 · easy 잔존 0 |
| P3 readiness digest 불변 | dry-run manifest MD5 `4ded10109bc96bb6ff57097f5131c7fc` · PRE_APPLY_READY · writePlan 1518 |
| P4 타 세션 LIVE write | 0 |
| P5 기존 authored canonical | KO 0 · EN 0 |
| P6 easy KO canonical | 253 |
| P7 V3 sourceRef LIVE 충돌 | 0 |
| P8 canonicalDup | 0 |
| P9 oromucosal 14 write | 0 (easy canonical 14 유지) |
| P10 승인 SSOT · unit ledger | APPROVED_FOR_PRODUCTION · 214fp/1134master 불변 |

## 3. 코드 변경 — apply 화이트리스트 해제

`otc-easy-drug-ready-ophthalmic-253-v3-executor.ga.ts`

- `apply()` 하드락(`LIVE apply 는 본 WO 범위 밖`) 제거 → 승인 WO 화이트리스트 `PRODUCTION_WO_BY_UNIT` 기반 실행 경로 구현
- 4중 게이트: `--apply --lang ko|en` + `V3_APPLY_GATE1`/`V3_APPLY_GATE2` + per-lang confirm env(`V3_APPLY_{KO|EN}_OPHTHALMIC_UNIT_1=CONFIRM`) + preflight blockers 0
- **write SQL 무변경** — `applyKoTx`/`applyEnTx` 를 rollback-test 와 동일 함수로 공유(계약 이탈 0)
- audit metadata: `wo` 는 readiness 검증본 **VERBATIM 유지**(원장 대조축 불변), 실행 WO 는 `productionWo` 로 병기 — agent-na 형제 러너 규약과 동일

코드 변경 후 rollback-test 재실행: KO 1,012 / EN 506 in-TX → 강제 ROLLBACK, **net write 0** (before == after).

## 4. LIVE apply

| 단계 | fp | master | write | 예상 | commit | TX 내 사후검증 |
|------|---:|-------:|------:|-----:|:------:|:--------------:|
| KO | 26 | 253 | 1,012 | 1,012 | ✅ | fails 0 |
| EN | 26 | 253 | 506 | 506 | ✅ | fails 0 |
| **계** | 26 | 253 | **1,518** | 1,518 | | |

- lang 단위 **단일 트랜잭션**. 사후검증 통과 시에만 COMMIT, 1건이라도 실패하면 전량 ROLLBACK.
- EN 선행조건 실측: KO authored canonical 253 · V3 sourceRef 앵커 26/26 · 기존 EN canonical 0.
- KO 사후검증: authored KO 253 / easy deprecated 253 / easy 잔존 0 / audit 253 / **EN canonical 0**(KO 단계 EN 미변경) / sourceRef scope 253 / leak 0 / dup 0.
- EN 사후검증: EN authored canonical 253 / dup 0 / sourceRef scope 253 / leak 0 / **EN 한글 잔존 0**.

## 5. 독립 검증 (13축 + 점안축 + scope) — PASS · fails 0

러너: `otc-v3-ophthalmic-track-verify.ga.ts` (executor 미import · 계약/합성기/공식 원문에서 재유도 후 **DB 저장 실물** 대조)

targetMasters 253 · contentFp 26 · koAuthoredCanonical 253 · enCanonical 253 · easyDeprecated 253 ·
easyStillCanonical 0 · auditKo 253 · canonicalDup 0 · sourceRefLeak 0 · **storedContentHashMismatch 0** ·
officialSixSectionsMismatch 0 · enHangul 0 · nonOphthalmicWritten 0 · 실측 write 1,518.

### 점안 고유 축 (공식 원문 ↔ DB 저장본)

| 축 | 결과 |
|----|------|
| KO 수치 보존 (점안 횟수·방울 수·투여 간격·기간·연령) | 26/26 — 효능·효과 + 용법·용량 원문 수치 전량 잔존 |
| KO 안전 4섹션 공식 헤딩 | 26/26 (경고·사용상 주의사항·이상반응·상호작용) |
| EN drop count | 26/26 (`missingDropCountsEn` 누락 0 — '방울/적' 양쪽) |
| EN 한쪽/양쪽 눈 표현 | 26/26 통과. **단 원문이 명시한 fp = 0** → 요구축 없음(공허 통과). 원문에 없는 표현은 창작하지 않음 |
| EN 콘택트렌즈 / 용기 끝 접촉 / 타 점안제 간격 | 26/26 (요구 fp 26/26 — 원문에 존재하는 축 전량 보존) |

## 6. scope post-check

oral 540 (KO 540 · EN 540) 불변 · topical 327 (KO 327 · EN 327) 불변 · oromucosal 14 write 0(easy canonical 14 유지) ·
기존 V1/V2 LIVE 불변(본 WO audit 대상 밖 0 · V3 sourceRef leak 0) · 실측 write 1,518.

## 7. 정정 사항

`track-verify` 초판이 EN 점안 주의 3축(렌즈·용기 끝·간격)을 fp 전량에 **무조건** 요구하여 15 false fail 발생.
계약(`missingEyeCautionEn`)은 **공식 원문 주의 문언에 해당 축이 있을 때만** 요구한다. 원문에 없는 주의를 EN 에
만들어 넣는 것은 콘텐츠 정책 위반이므로 무조건 요구는 오판정이다. 판정축을 계약축으로 정정 후 26/26 PASS.
정정 전후 DB write 0 (검증기는 read-only).

topical `196c5de65` 의 §C false-fail 과 **동일 계열**(계약축 ≠ 검증기 임의축)이며, 데이터 이상은 아니다.

## 8. 상태 기록

| unit | 상태 | 파일 |
|------|------|------|
| `ophthalmic-unit-1` | **GREEN** | `apps/api-server/src/scripts/data/otc-easy-drug-ready-ophthalmic-253-v3-green-ledger.ga.json` |
| `oromucosal-unit-1` | **UNBLOCKED** (14 master · 2 fp · 84T) | `apps/api-server/src/scripts/data/otc-easy-drug-ready-oromucosal-unit-1-unblocked.ga.json` |

승인 SSOT · V3 unit ledger · readiness 산출물은 **미수정**. 실행 상태만 별도 파일로 기록.

## 9. 트랙 진행

READY 1,134 V3 — **1,120 / 1,134 master (6,720 / 6,804T) 완료.**
잔여 = `oromucosal-unit-1` 14 master · 84T (agent-na 소유 러너).
