# CHECK — WO-O4O-OTC-EASY-DRUG-READY-OROMUCOSAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1

- **일자**: 2026-07-29
- **에이전트**: 나 (agent-na) — 본 WO 단일 DB write-owner
- **대상**: `oromucosal-unit-1` — content fp 2 · master 14 · 84T (KO 56 + EN 28)
- **판정**: **GREEN** · **READY 1,134 V3 트랙 COMPLETE**

## 1. 근거 baseline

| 항목 | 커밋 | 상태 |
|------|------|------|
| V3 content-fingerprint 전역 재승인 SSOT | `00851d237` | APPROVED_FOR_PRODUCTION · md5 불변 확인 |
| topical/oromucosal readiness (PRE_APPLY READY) | `bb2e79a22` | 산출물 6종 md5 불변 확인 |
| oral route COMPLETE (540 master · 3,240T) | `3f200900a` | 실측 재확인 |
| topical-unit-1 GREEN (327 master · 1,962T) | `196c5de65` | 실측 재확인 |
| ophthalmic-unit-1 GREEN (253 master · 1,518T) | `d5b583861` | 실측 재확인 |

## 2. 선행 게이트 (12/12 PASS · write 0)

러너: `otc-v3-oromucosal-preflight-gate.na.ts` (신규 · read-only · apply 러너와 별개 코드경로)

| 게이트 | 실측 |
|--------|------|
| G1 oral COMPLETE | KO 540 · EN 540 · easy deprecated 540 · 잔존 0 · audit 540 |
| G2 oromucosal PRE_APPLY READY | status=PRE_APPLY_READY · 14 master / 2 fp · writePlan 56/28/84 |
| G3 readiness 산출물 불변 | build · en-build · preapply-ready · preapply-verify · reproduce-check · en-check 6종 md5 == `bb2e79a22` blob |
| G4 승인 SSOT·ledger 불변 | ledger · 재승인 SSOT · safety contract 3종 md5 == `00851d237` blob · 214fp/1134master · 대상 집합 일치 |
| G5 easy KO canonical | 14 |
| G6 기존 authored canonical | KO 0 · EN 0 · easy deprecated 0 |
| G7 V3 sourceRef LIVE 충돌 | 0 |
| G8 canonicalDup | 0 |
| G9 대상 트랙 audit | 0 (다른 세션 LIVE write 0 의 직접 증거) |
| G10 선행 route GREEN | topical KO/EN 327 · ophthalmic KO/EN 253 · 각 easy 잔존 0 · audit 327/253 |
| G11 전문용 혼입 | drug_category=otc 14/14 · 비-otc 0 · 원문 전문가전용 표지 fp 0 |
| G12 dry-run digest | `14867f16e6fd0d3a1935d2c0b2b9c9b6` |

## 3. 코드 변경 — apply 화이트리스트 해제

- `otc-v3-topical-oromucosal-apply.na.ts` — `PRODUCTION_WO_BY_UNIT` 에 `oromucosal-unit-1` 승인 WO 등재.
  **write SQL 무변경** (`execKoFp`/`execEnFp` 를 rollback-test 와 동일 함수로 공유).
- `otc-v3-topical-postverify.na.ts` — 동일 WO 맵 추가 + `PEER_UNITS` 에 `topical-unit-1` 추가(자기 제외 필터로 양방향 동작).
- audit metadata: `wo` 는 readiness 검증본 **VERBATIM 유지**(원장 대조축 불변), 실행 WO 는 `productionWo` 로 병기.

코드 변경 후 재실행:
- dry-run planDigest `14867f16e6fd0d3a1935d2c0b2b9c9b6` **불변**.
- rollback-test: fp 2/2 PASS · in-TX 84T → 강제 ROLLBACK · **residue 0**(authored/v3ref/deprecated/audit 전부 0).

## 4. LIVE apply

| 단계 | fp | master | write | 예상 | commit | TX 내 사후검증 |
|------|---:|-------:|------:|-----:|:------:|:--------------:|
| KO | 2 | 14 | 56 | 56 | ✅ 2/2 | fails 0 |
| EN | 2 | 14 | 28 | 28 | ✅ 2/2 | fails 0 |
| **계** | 2 | 14 | **84** | 84 | | |

- fp 단위 **단일 트랜잭션**. TX 내부 사후검증 통과 시에만 COMMIT.
- EN 선행조건 실측: fp별 KO authored canonical 8/8 · 6/6 · 기존 EN canonical 0.
- KO 사후검증: authored 14 / easy deprecated 14 / easy 잔존 0 / audit 14 / sourceRef scope 14 / outside 0 / dup 0 / contentMismatch 0.
- EN 사후검증: EN authored canonical 14 / dup 0 / sourceRef scope 14 / outside 0 / **EN 한글 0**(산출물·DB 양측).

## 5. 독립 검증 (13축 + 구강점막 축 + scope) — PASS · fails 0

러너: `otc-v3-oromucosal-track-verify.na.ts` (신규 · apply/postverify 미참조 · 대상은 승인 SSOT ledger 에서 직접 유도)

targetMasters 14 · contentFp 2 · koAuthoredCanonical 14 · enCanonical 14 · easyDeprecated 14 ·
easyStillCanonical 0 · auditKo 14 · canonicalDup 0 · sourceRefLeak 0 · **storedContentHashMismatch 0** ·
officialSixSectionsMismatch 0 · enHangul 0 · **routeExpressionMismatch 0** · 실측 write 84.

### 구강점막 route 표현 축 (공식 원문 ↔ DB 저장 EN 실물)

| fp | 제형 | 요구축(원문 존재) | 누락 | 삼킴 축 |
|----|------|------------------|:----:|--------|
| `6ac6d622…` | 껌 (A87803AMS, 8 master) | 씹기 | 0 | not-stated |
| `b22ecff7…` | 구강용해필름 (227736ATD, 6 master) | 구강 부위 · 삼킴 | 0 | swallow |

- **가글·도포·분사** 축은 두 fp 공식 원문에 존재하지 않아 요구하지 않음(공허 통과). 원문에 없는 투여 표현을 EN 에
  창작 삽입하는 것은 콘텐츠 정책 위반이므로 무조건 요구는 오판정 — ophthalmic §7 정정과 동일 계열.
- **삼킴은 방향 검증**: 구강용해필름 원문이 "녹은 후 바로 삼키도록" 이므로 EN 은 swallow 지시를 보존해야 하며
  `do not swallow` 류로 역전되면 FAIL. 실측 역전 0.
- 공식 6섹션: 안전 4섹션 헤딩 5/5 보존 · 효능·효과/용법·용량 원문 수치 7/7 잔존(누락 0).

## 6. scope 사후검증

oral 540 (KO 540 · EN 540 · audit 540) 불변 · topical 327 불변 · ophthalmic 253 불변 ·
각 route 에 이번 WO audit 0 · oromucosal V3 sourceRef 행 0 ·
기존 V1/V2 LIVE 불변(이번 WO audit 이 대상 14 master 밖 0 · sourceRef leak 0) · 실측 write 84.

### 트랙 전체 실측

| 축 | 실측 |
|----|------|
| content fp | 214 (사용된 V3 sourceRef 214) |
| master | 1,134 |
| KO authored canonical | 1,134 |
| EN authored canonical | 1,134 |
| easy 잔존 canonical | **0** |
| V3 sourceRef 행 | 2,268 (대상 밖 0) |
| write | KO 4,536 + EN 2,268 = **6,804** |

## 7. 상태 기록

| 대상 | 상태 | 파일 |
|------|------|------|
| `oromucosal-unit-1` | **GREEN** | `apps/api-server/src/scripts/data/otc-easy-drug-ready-oromucosal-14-v3-green-ledger.na.json` |
| READY 1,134 V3 트랙 | **COMPLETE** | `apps/api-server/src/scripts/data/otc-easy-drug-ready-1134-v3-track-complete.na.json` |

실행 순서 전 unit GREEN: oral-unit-1 · oral-unit-2 · topical-unit-1 · ophthalmic-unit-1 · oromucosal-unit-1.
**승인 SSOT · V3 unit ledger · readiness 산출물은 미수정** — 실행 상태만 별도 파일로 기록.

## 8. 공식 완료율 갱신 근거

러너: `otc-v3-ready-1134-completion-basis-census.na.ts` (read-only)

- delta = 트랙 authored KO canonical master **1,134 실측**(대상 전량) · easy 잔존 0 → easy→authored 교체 완결.
- **14,442 + 1,134 = 15,576** · 15,576 / 19,385 = **80.35%**.
- 보조 census(전역): authored STORE canonical KO 12,432 master · EN 12,432 master · easy canonical 잔존 3,829 master.
  (전역 authored 12,432 는 STORE authored canonical 전수이며, 공식 완료 15,576 은 다른 카테고리를 포함하는 별도 집계축이다.)

## 9. 중지 조건

중지 조건 발생 0. 선행 route GREEN 일치 · readiness digest 불변 · 기존 authored canonical 0 ·
route 표현 오류 0 · 예상 write == 실측 write · 공식 6섹션 보존 · canonicalDup/sourceRef 충돌 0 ·
타 unit 및 기존 LIVE 변경 0 · transaction·postVerify·독립검증 전건 통과 · 다른 세션 LIVE write 감지 0.
