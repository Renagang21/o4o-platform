# CHECK — WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT2-OPHTHALMIC-FINAL-PRODUCTION-V1 (에이전트 가)

**세션:** 에이전트 가 · 기계 sohae · 2026-07-26
**단일 DB write-owner:** **agent-ga** (점안 Unit 2). 다른 에이전트의 LIVE write 금지.
**기준:** readiness commit `92cce633e` · 비경구 Unit 1 GREEN commit `8bd8cdbf4`
**판정:** **점안 Unit 2 = GREEN · 비경구 트랙 = COMPLETE**
**총 write 954T (KO 636T + EN 318T) · 실측 = 선언 · rollback 0건**

---

## 1. write-owner 인계

| 항목 | 값 |
|------|----|
| write-owner | **agent-ga** (단독) |
| 인계 근거 | `nonoral-unit-1=GREEN`(agent-na 완결) → `nonoral-unit-2=UNBLOCKED` |
| 실행 순서 | KO apply → EN apply (순차, 단계별 단일 트랜잭션) |
| 사용 자산 | readiness WO 산출물 그대로 — 전용 profile · adapter · 실행기 (신규 저작 0) |

## 2. 선행 게이트 (10건 전건 PASS)

| # | 게이트 | 결과 |
|---|--------|-----:|
| 1 | nonoral-unit-1 = GREEN | **PASS** (원장 `executionStatus`) |
| 2 | nonoral-unit-2 = UNBLOCKED | **PASS** |
| 3 | 다른 세션 LIVE write 없음 | **PASS** (대상 159 master authored ko/en canonical 0 · sourceRef 교집합 0) |
| 4 | Cloud SQL Proxy 127.0.0.1:5442 | **PASS** (LISTENING) |
| 5 | `apps/api-server/.env` 존재 | **PASS** (수정·삭제 0, 값 출력 0) |
| 6 | 승인 SSOT md5 불변 | **PASS** `35763faaed035a7ced4606b948957527` |
| 7 | EN JSON md5 불변 | **PASS** `b5e44bb715c8b2813fbe082387da508c` |
| 8 | authored KO/EN canonical 기존 보유 0 | **PASS** (baseline 검증: ko 0 · en 0) |
| 9 | 기존 LIVE master/fp/sourceRef/canonical 교집합 0 | **PASS** (sourceRefLeak 0 · canonicalDup 0) |
| 10 | HOLD 대상 혼입 0 | **PASS** (holdWritten 0) |

apply 직전 dry-run 12 게이트도 전건 PASS, manifest 는 readiness 시점과 **byte-identical**(`fb1801acc4d04759b7d3fb54ffc5fec1`).

### apply 이전 기준선 (독립검증 `--stage=baseline`)

| 항목 | 값 |
|------|---:|
| targetMasters | 159 |
| koAuthoredCanonical / enCanonical | **0 / 0** |
| easyStillCanonical | 159 (미생산 상태) |
| canonicalDup · sourceRefLeak · holdWritten | **0 · 0 · 0** |
| nonoralUnit1Intact | **443** |
| oralUnitsIntact | **3,699** |

## 3. KO apply

```
OPH-U2 APPLY ko — write-owner agent-ga
  PASS  P1~P5 선행 게이트 · PASS  G1~G12 생산 게이트
  writeActual 636T (예상 636T) · COMMITTED
    koAuthoredCanonical: 159   easyDeprecated: 159   easyStillCanonical: 0
    auditKo: 159               enCanonical: 0        needsReviewLeft: 0
    canonicalDup: 0            sourceRefLeak: 0      enHangul: 0
```

- 확인 환경변수 `OTC_OPH_U2_KO_CONFIRM=YES` + `--apply` 이중 게이트 충족 후 실행.
- master 당 4T: easy_drug ko canonical → `deprecated` / authored ko INSERT(`needs_review`) / `canonical` 전환 / audit log.
- 단일 트랜잭션, **커밋 전 사후검증** 통과 후 commit. 실측 636T = 선언 636T.
- 증적: `otc-unproduced-nonoral-unit2-ophthalmic-apply-run.ko.json`

## 4. EN apply

```
OPH-U2 APPLY en — write-owner agent-ga
  PASS  P1~P5 · PASS  G1~G12 (EN 단계 기대값 반전 게이트)
  writeActual 318T (예상 318T) · COMMITTED
    koAuthoredCanonical: 159   enCanonical: 159      easyStillCanonical: 0
    easyDeprecated: 159        auditKo: 159          needsReviewLeft: 0
    canonicalDup: 0            sourceRefLeak: 0      enHangul: 0
```

- 확인 환경변수 `OTC_OPH_U2_EN_CONFIRM=YES` + `--apply` 충족 후 실행.
- fp 별로 **본 트랙 sourceRef 앵커 → KO authored canonical master 목록**을 조회해 SSOT master 목록과 **완전 일치**를 확인한 뒤에만 INSERT. 불일치 시 즉시 ROLLBACK 되도록 계약.
- master 당 en canonical 기존 0 확인 → EN INSERT(`needs_review`) → `canonical` 전환 (2T).
- 트랜잭션 내부에서 fp 34/34 전건 EN 재검증: `renderEn`(한글·경구 동사·수량) + 경구 동사 전 영역 + 점안 경로 표현 + 방울 수 게이트. 실측 318T = 선언 318T.
- 증적: `otc-unproduced-nonoral-unit2-ophthalmic-apply-run.en.json`

## 5. 전체 postVerify

| 항목 | 기대 | 실측 | 판정 |
|------|-----:|-----:|:---:|
| KO authored canonical | 159 | **159** | PASS |
| EN canonical | 159 | **159** | PASS |
| 총 write | 954T | **954T** (636 + 318) | PASS |
| easy deprecated | 159 | **159** | PASS |
| easy canonical 잔존 | 0 | **0** | PASS |
| audit | 159 | **159** | PASS |
| needs_review 잔존 | 0 | **0** | PASS |
| canonicalDup | 0 | **0** | PASS |
| sourceRef leak | 0 | **0** | PASS |
| HOLD write | 0 | **0** | PASS |
| 비경구 Unit 1 변경 | 0 | **0** (443 불변) | PASS |
| 경구 Unit 1·2 변경 | 0 | **0** (3,699 불변) | PASS |
| EN 한글 | 0 | **0** | PASS |

## 6. 독립검증 (생산 실행기와 분리된 경로)

`otc-unproduced-nonoral-unit2-ophthalmic-verify.ga.ts` — 실행기 내부 상태를 재사용하지 않고 승인 SSOT + DB 만으로 재계산. READ-ONLY · DB write 0.

```
OPH-U2 INDEPENDENT VERIFY (post) — ALL PASS
  PASS  targetMasters: 159            PASS  koAuthoredCanonical: 159
  PASS  enCanonical: 159              PASS  easyDeprecated: 159
  PASS  easyStillCanonical: 0         PASS  auditKo: 159
  PASS  needsReviewLeft: 0            PASS  canonicalDup: 0
  PASS  sourceRefLeak: 0              PASS  enHangul: 0
  PASS  holdWritten: 0                PASS  nonoralUnit1Intact: 443
  PASS  oralUnitsIntact: 3699         PASS  enUsageMatched: 159
  PASS  enRowsFound: 159
```

> 초회 실행에서 `auditKo: 0` 이 나왔으나 이는 **검증기 필터 결함**이었다. audit 행은 실행기 상수(readiness WO 문자열)로 태깅되는데 검증기가 production WO 문자열만 조회했다. 실제 audit 데이터는 in-tx postVerify 에서 159 로 확인된 상태였다. 검증기를 `metadata->>'unit'='nonoral-unit-2-ophthalmic'` + WO 태그 2종 허용으로 고쳐 재실행해 159 를 확인했다. **데이터 수정은 없었다.**

## 7. 방울 수 · 간격 · 기간 검증

| 검증 지점 | 결과 |
|-----------|-----:|
| EN apply 트랜잭션 내부 (fp 34/34) — `missingNumericsEn`(횟수·간격·기간) | **누락 0** |
| EN apply 트랜잭션 내부 — 전용 `missingDropCountsEn`(`방울`·`적` 양쪽) | **누락 0** |
| EN apply 트랜잭션 내부 — 점안 경로 표현 · 경구 동사 | **부재 0 · 잔존 0** |
| **LIVE 본문 대조** — 저작 EN 용법 문장이 실제 canonical 행에 그대로 존재 | **159 / 159** (`enUsageMatched`) |
| LIVE EN 한글 | **0** |

LIVE 본문 대조는 EN JSON 과 DB 본문만 비교하는 독립 경로다. 방울 수·1일 횟수·점안 간격·사용 기간·연령·한쪽/양쪽 눈 표현이 모두 이 용법 문장에 들어 있으므로, 159/159 일치는 해당 축이 LIVE 에 그대로 반영됐음을 뜻한다.

## 8. sourceRef 검증

| 항목 | 결과 |
|------|-----:|
| 앵커 산식 | `fpToUuidV2(fp)` — **변경 0** |
| 앵커 중복 | **0** |
| KO apply 후 앵커 보유 행 | 159 (전량 본 트랙 authored ko canonical) |
| EN apply 시 앵커 → master 목록 = SSOT master 목록 | **34/34 fp 완전 일치** |
| **sourceRef leak** (앵커가 대상 밖 master 로 샌 건수) | **0** |

## 9. 기존 LIVE 변경 0

| 대상 | 기준 | 실측 | 판정 |
|------|-----:|-----:|:---:|
| 비경구 Unit 1 (443 master) | 443 | **443** | 불변 |
| 경구 Unit 1 + Unit 2 (3,699 master) | 3,699 | **3,699** | 불변 |
| HOLD 대상 (55건) | 0 | **0** | 미기록 |
| 대상 밖 sourceRef | 0 | **0** | 없음 |

baseline(apply 전)과 post(apply 후) 양쪽에서 동일 수치를 확인했다.

## 10. 점안 Unit 2 GREEN · 비경구 트랙 COMPLETE

실행순서 원장 `otc-unproduced-nonoral-unit1-execution-order-v1.json` 의 **집행 상태 블록만** 갱신했다 (승인 선언·게이트 수치·Unit 1 기록은 변경 0):

- `nonoral-unit-2.state` : `UNBLOCKED` → **`GREEN`**, `writeOwner: agent-ga`, applied 954T, 독립검증 15항목 allPass
- `trackStatus` 신설 : **`nonoral` 트랙 = `COMPLETE`**, 104 fp / 602 master, 누적 write **3,612T** (KO 2,408 + EN 1,204)

| 유닛 | 상태 | write-owner | applied |
|------|:----:|-------------|--------:|
| nonoral-unit-1 (피부·구강·질) | GREEN | agent-na | 2,658T |
| nonoral-unit-2 (점안) | **GREEN** | **agent-ga** | **954T** |
| **비경구 트랙 합계** | **COMPLETE** | — | **3,612T** |

HOLD 55건(HOLD_ROUTE 10 fp / 53 master + HOLD_MULTI_ROUTE 1 fp / 2 master)은 본 트랙 범위 밖이며 별도 재분류 WO 대상이다.

## 11. 금지사항 준수

| 금지 | 결과 |
|------|:----:|
| 승인 SSOT · EN JSON 수정 | **0** (md5 불변 확인) |
| 공용 러너(`otc-v2-store-leaflet-runner.shared.ts`) 수정 | **0** (import 만) |
| 비경구 Unit 1 · 경구 Unit 1·2 파일 수정 | **0** |
| `pnpm-lock.yaml` 및 타 세션 파일 접촉 | **0** |
| `apps/api-server/.env` 수정·삭제 | **0** |
| 자격증명 출력 | **0** |
| `git add .` / reset / clean / stash | **미사용** (path-specific add 만) |
| 중지 조건 발동 | **0건** (rollback 0회, 전 단계 실측 = 선언) |

## 12. 산출물

| 구분 | 경로 |
|------|------|
| 생산 실행기 (apply 구현 추가) | `apps/api-server/src/scripts/otc-unproduced-nonoral-unit2-ophthalmic-production.ga.ts` |
| 독립검증기 | `apps/api-server/src/scripts/otc-unproduced-nonoral-unit2-ophthalmic-verify.ga.ts` |
| KO apply 원장 | `apps/api-server/src/scripts/data/otc-unproduced-nonoral-unit2-ophthalmic-apply-run.ko.json` |
| EN apply 원장 | `apps/api-server/src/scripts/data/otc-unproduced-nonoral-unit2-ophthalmic-apply-run.en.json` |
| 독립검증 baseline / post | `...-verify.ga.baseline.json` / `...-verify.ga.post.json` |
| 실행순서 원장 (집행 상태 갱신) | `apps/api-server/src/scripts/data/otc-unproduced-nonoral-unit1-execution-order-v1.json` |
