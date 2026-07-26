# CHECK-O4O-OTC-UNPRODUCED-ORAL-UNIT2-FINAL-PRODUCTION-V1 — 경구 미생산 Unit 2 생산 (에이전트 다)

WO: `WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-FINAL-PRODUCTION-V1`
기준: Unit 1 GREEN `dddd9b9ab` · Unit 2 readiness `bedda7433` · Unit 2 EN 완료 `f003b1271` · 승인 SSOT `8328047ac`
대상: 374 fp / 1,849 master · 예상 11,094T (KO 7,396 + EN 3,698)
상태: **GREEN — KO 7,396T + EN 3,698T = 11,094T LIVE 완료. 독립검증 10/10 · 범위 사후검증 8/8. 경구 트랙(Unit 1+2) 전체 22,194T 완결.**

## 0. 결론

> 적용 전 게이트 **17/17 PASS** · dry-run **2회 byte-identical** (`d61d6c45b6c3902730b3335557e5193c`) · **rollback 시험 PASS** 후 **KO 7,396T → EN 3,698T 순서로 LIVE apply**. 예상=실측 정확 일치(7396 MATCH / 3698 MATCH).
> 독립검증 **10/10 PASS**, 범위 사후검증 **8/8 PASS** — Unit 1 무변경, 선행 외용 LIVE 무변경, 빅콘에스600정 HOLD write 0.
> 실행 순서 원장: `oral-unit-2 = GREEN`, 경구 route **COMPLETE (747 fp / 3,699 master / 22,194T)**.

## 1. 단일 write-owner

**agent-da**. Unit 1 에 이어 동일 write-owner 를 유지했다.

- 가 에이전트 EN 산출물은 **읽기 전용 입력**으로만 사용 — apply 전후 md5 `f48856404bbf95c8bf58850dddbc414d` 동일, **수정 0**
- 사전 게이트에서 `authored ko/en canonical 0` · `sourceRef 사전 충돌 0` 확인, 사후 `sourceRef leak 0` 재확인
- Unit 1 대상 1,850 master 는 apply 전후 KO/EN canonical 1,850 유지 — **다른 트랙 write 없음**

## 2. 러너 — Unit 1 러너의 분리 사본

`apps/api-server/src/scripts/otc-unproduced-oral-unit2-production.ts`

Unit 1 산출물은 GREEN 마감 후 동결이라 공용화(=Unit 1 파일 수정)를 택하지 않고 **분리 사본**으로 두었다. 차이는 입력 상수·기대 수치·Unit 1 교집합 게이트뿐이고, write 계약·트랜잭션·rollback·사후검증 구조는 Unit 1 과 동일하다.

- 그룹 키 = 승인 SSOT 의 **10축 안전지문 fp** · `sourceRef = fpToUuidV2(fp)` — **산식 변경 0**
- KO 4T/master · EN 2T/master · INSERT-only · 기존 canonical 본문 UPDATE 재사용 없음
- 제품명은 성분·제형·경로 판정에 사용하지 않는다
- Unit 1 SSOT 는 **교집합 0 검증 목적으로만** 읽는다(대상 포함 0)

### EN 입력 검증을 dry-run 단계로 끌어올렸다

Unit 1 러너는 EN 렌더 게이트를 EN apply 시점에만 돌렸다. Unit 2 는 EN 저작 주체가 다른 에이전트이므로, **KO apply 전에 EN 불가 사유가 드러나야** 한다. 그래서 `prepare()` 안에서 단계와 무관하게 374 그룹 전건 `renderEn` 을 실행해 한글 잔존·경구 동사·수치/연령/횟수/간격/기간 mismatch 를 검사한다. KO dry-run 시점에 이미 `EN 374/374 · anomalies 0` 이 확인됐다.

## 3. EN 입력 검증 결과

| 항목 | 값 |
|---|---|
| 파일 | `otc-unit2-en-config-ga-all.json` (가 에이전트) |
| md5 | `f48856404bbf95c8bf58850dddbc414d` — 선언값 일치 · 수정 0 |
| 엔트리 | 374 (중복 fp 0) |
| 승인 SSOT fp 매칭 | **374/374** · 누락 0 · 고아 0 |
| 렌더 게이트 | **374/374 PASS** · 한글 0 · 수치·연령·횟수·간격·기간 mismatch 0 |

## 4. 적용 전 게이트 17/17 PASS

| # | 게이트 | 결과 |
|---|---|---|
| G1 | Unit1=GREEN / Unit2=UNBLOCKED (원장 + Unit1 apply 원장 3플래그) | PASS |
| G2 | SSOT status=APPROVED_FOR_PRODUCTION | PASS |
| G3 | 총계 374fp / 1,849master (원장 선언과 교차) | PASS |
| G4 | fp 재현 100% (1,849/1,849) | PASS |
| G5 | master 누락·중복 0 | PASS |
| G6 | 10축 안전지문 mismatch 0 | PASS |
| G7 | 공식 효능·용법·주의 결손 0 | PASS |
| G8 | route=oral 전건 일치 | PASS |
| G9 | EN 입력 무변형 (md5 일치) | PASS |
| G10 | EN fp 매칭 374/374 · 중복·고아 0 | PASS |
| G11 | EN 한글·수치·연령·기간 mismatch 0 | PASS |
| G12 | Unit 1 fp/master/sourceRef 교집합 0 (Unit1 1,850 확인) | PASS |
| G13 | 본 트랙 sourceRef 정합 (단계별 기대값) | PASS |
| G14 | authored canonical 상태 정합 (단계별) | PASS |
| G15 | canonicalDup 0 | PASS |
| G16 | 예상 write (KO 7,396 / EN 3,698) | PASS |
| G17 | 이상 그룹 0 | PASS |

- dry-run 2회 byte-identical: `d61d6c45b6c3902730b3335557e5193c` (cmp 일치)
- dry-run DB write **0**
- rollback 시험: 시도 INSERT 4 · before 233 → after 233 · **PASS (전량 rollback)**

## 5. LIVE apply

| 단계 | 결과 |
|---|---|
| KO apply | `APPLIED ko — 374그룹 · writeActual 7396 MATCH` |
| KO postVerify | KO 계열 전항목 PASS (EN canonical 0 = 해당 시점 정상) |
| EN 사전 게이트 | KO authored canonical **1,849** · EN canonical **0** 확인 |
| EN dry-run | 17/17 PASS · writePlan EN 3,698 |
| EN apply | `APPLIED en — 374그룹 · writeActual 3698 MATCH` |

이중 게이트: `--apply` + `OTC_ORAL_U2_KO_CONFIRM` / `OTC_ORAL_U2_EN_CONFIRM`. 단일 트랜잭션 · 커밋 전 사후검증.

## 6. 독립검증 — 10/10 PASS

```json
{"targetMasters":1849,"koAuthoredCanonical":1849,"enCanonical":1849,"easyDeprecated":1849,
 "easyStillCanonical":0,"needsReviewLeft":0,"auditKo":1849,"canonicalDup":0,
 "sourceRefLeak":0,"enHangul":0}
```

## 7. 범위 사후검증 — 8/8 PASS

`otc-unproduced-oral-unit2-postverify-scope.ts` (read-only · DB write 0)

| # | 게이트 | 실측 | 결과 |
|---|---|---|---|
| S1 | KO apply 원장 7,396 | 7,396 | PASS |
| S2 | EN apply 원장 3,698 | 3,698 | PASS |
| S3 | Unit 2 총 write 11,094 | 11,094 | PASS |
| S4 | Unit 1 KO/EN canonical 1,850 유지 | 1,850 / 1,850 | PASS |
| S5 | Unit 1 easy canonical 잔존 0 | 0 | PASS |
| S6 | 외용 final 199m 무변경 | 199 / 199 | PASS |
| S7 | split 90m 무변경 | 90 / 90 | PASS |
| S8 | 빅콘에스600정 authored write 0 | 0 (전체 3행, authored 0) | PASS |

## 8. 실행 순서 원장 — Unit 2 GREEN · 경구 route COMPLETE

- `otc-unproduced-oral-unit2-apply-order.json` → `koApplied` · `enApplied` · `independentVerified` 모두 true
- `otc-unproduced-oral-execution-order-v1.json` `executionStatus`
  - `oral-unit-1 = GREEN` (11,100T) · `oral-unit-2 = GREEN` (11,094T)
  - `route = COMPLETE` — 747 fp / 3,699 master / **22,194T** (선언치와 일치)
  - 라 세션 승인 선언(`totals`/`sequence`/`gates`/`allGatesPass`)은 **무변경** — 집행 상태만 추가 블록에 기록

## 9. 경구 대량 생산 최종 집계

| 단위 | fp | master | KO | EN | 총 write |
|---|---:|---:|---:|---:|---:|
| oral-unit-1 | 373 | 1,850 | 7,400 | 3,700 | 11,100 |
| oral-unit-2 | 374 | 1,849 | 7,396 | 3,698 | 11,094 |
| **합계** | **747** | **3,699** | **14,796** | **7,398** | **22,194** |

## 10. 비경구 Unit 1 write-owner 인계 — **가능**

경구 Unit 2 GREEN 으로 나 세션 러너가 걸어 둔 실행 순서 게이트(`oralUnit2State`)가 해제됐다.

- 대상: 70 fp / 443 master / 2,658T (KO 1,772 + EN 886) · 승인 SSOT `otc-unproduced-nonoral-unit1-approved-ssot-v1.json`
- 나 세션이 러너·EN·dry-run·rollback·env-block 테스트까지 **PRE_APPLY READY** 로 완료해 둔 상태다(현재 `koAuthoredCanonical 0` / `easyStillCanonical 443`)
- 따라서 **비경구 Unit 1 의 write-owner 는 나 에이전트로 지정하는 것이 자연스럽다.** 다 에이전트로 옮길 경우 러너·EN 산출물 인수 절차가 추가로 필요하다
- 어느 쪽이든 **동시 write 금지 · 단일 write-owner 원칙 유지**가 전제다

## 11. 산출물

| 파일 | 내용 |
|---|---|
| `otc-unproduced-oral-unit2-production.ts` | Unit 2 생산 실행기 (dry-run / rollback-test / apply / verify) |
| `otc-unproduced-oral-unit2-dryrun.json` · `.en.json` | dry-run manifest (각 17/17) |
| `otc-unproduced-oral-unit2-apply-run.ko.json` · `.en.json` | apply 실행 기록 (7,396T / 3,698T) |
| `otc-unproduced-oral-unit2-verify.json` | 독립검증 10/10 |
| `otc-unproduced-oral-unit2-postverify-scope.ts` / `.json` | 범위 사후검증 8/8 |
| `otc-unproduced-oral-unit2-apply-order.json` | Unit 2 실행 원장 (GREEN) |

## 12. Git / 환경

- 자기 생산 산출물만 path-specific stage·commit·push · `git add .` 미사용 · reset/clean/stash 미사용
- **가 에이전트 EN 파일 수정 0** (md5 불변) · Unit 1·2 승인 SSOT 수정 0 · Unit 1 러너·산출물·canonical 수정 0
- 라 census/SSOT/proposal/회수 감사 수정 0 · 실행 순서 원장은 `executionStatus` 갱신만(승인 선언 무변경)
- 공용 fingerprint / sourceRef / write 계약 **변경 0** · 공용 러너(`otc-v2-store-leaflet-runner.shared.ts`) 수정 0
- 나 세션 비경구 산출물 미접촉 · `pnpm-lock.yaml` 미접촉 · 다른 세션 파일 미접촉
- `apps/api-server/.env` 수정·삭제 없음 · 자격증명 값 출력 0 · 루트 `.env` 미사용 · `_msm.mjs`/`_msmx.mjs` 미접촉
