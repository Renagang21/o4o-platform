# CHECK — WO-O4O-OTC-EASY-DRUG-READY-ORAL-UNIT2-CONTENT-FP-V3-FINAL-PRODUCTION-V1 (에이전트 다)

**세션:** 에이전트 다 · **단일 DB write-owner** · 2026-07-27
**대상:** `oral-unit-2` — 66 content fp / 270 master
**판정:** **GREEN** — KO 1,080T + EN 540T = **1,620T LIVE**. 독립검증·범위검증 fail 0, 중지조건 9건 전부 미발동
**부가 판정:** **oral route V3 = COMPLETE** (131 fp / 540 master / **3,240T**) · **topical-unit-1 = UNBLOCKED**

---

## 1. 단일 write-owner

`agent-da` 단독. 본 세션 외 LIVE DB write 없음. 실행 중 다른 세션의 대상 master write **0**(적용 전 baseline 이 readiness 선언값과 완전 일치, 적용 후 audit 앵커 밖 변경 0).

## 2. 선행 게이트 13항

| # | 게이트 | 결과 |
|---|--------|------|
| 1 | oral-unit-1 = GREEN | PASS (원장 GREEN + postVerify 재실행 fail 0) |
| 2 | oral-unit-2 = UNBLOCKED · 미반영 | PASS (`PRE_APPLY_READY` · authored 0) |
| 3 | agent-da 단일 write-owner | PASS |
| 4 | 다른 세션 LIVE write | **0** |
| 5 | Proxy · `apps/api-server/.env` | PASS (자격증명 미출력) |
| 6 | 승인 SSOT · unit ledger 불변 | PASS (`00851d237` 이후 변경 0) |
| 7 | **unit-2 dry-run digest** | **`b208727afb9be3bf317aea35d26ef3f2`** — 선언값과 동일 |
| 8 | EN payload · KO source dump 해시 불변 | PASS (`e808b9952` 이후 변경 0) |
| 9 | 대상 270 master authored KO/EN canonical | **0 / 0** |
| 10 | easy KO canonical | **270** |
| 11 | V3 sourceRef 사전 충돌 | **0** (distinct 66) |
| 12 | oral-unit-1 GREEN 기준선 일치 | PASS |
| 13 | canonicalDup | **0** |
| + | rollback-test digest (추가 검증) | **`49b02ec1697cdc3373561c4a5eb3d524`** — readiness 원장과 동일, 66/66 PASS, residue 0 |

> 러너 수정(화이트리스트에 unit-2 추가) 후 dry-run·rollback-test 해시가 readiness 원장과 **byte-identical** → write 계약 이탈 0 이 해시로 증명됨.

## 3. KO LIVE apply

| 항목 | 결과 |
|------|-----:|
| 대상 | 66 fp / 270 master |
| fp commit | **66 / 66** |
| **writeActual** | **1,080T** (예상 1,080T) |
| 게이트 | `--apply --confirm --lang ko` + `OTC_V3_APPLY_KO_ORAL_UNIT_2=CONFIRM` + unit 화이트리스트 |
| 트랜잭션 | fp별 단일 TX · **TX 내부 postVerify 통과 시에만 COMMIT** · 실패 시 전량 ROLLBACK 후 중지 |
| planDigest | `04f5de138c954907b0925265ab66ef68` |

## 4. KO postVerify

| 항목 | 결과 |
|------|-----:|
| authored KO canonical | **270** |
| easy deprecated | **270** |
| easy canonical 잔존 | **0** |
| audit | **270** |
| EN canonical (KO 단계) | **0** |
| V3 sourceRef 정합 (scope) | **270** |
| canonicalDup | **0** |
| sourceRef leak | **0** |
| 저장 content == 검증본 (md5) | 불일치 **0** |
| 공식 안전섹션 보존 | **196 / 196** · 수치누락 **0** |

## 5. EN LIVE apply

선행조건 확인 — KO authored canonical **270**, V3 sourceRef 앵커 **66/66** 일치, EN canonical 기존 **0**.

| 항목 | 결과 |
|------|-----:|
| fp commit | **66 / 66** |
| **writeActual** | **540T** (예상 540T) |
| 한글 잔존 | **0** |
| 수치·연령·횟수·간격·기간 누락 | **0** |
| 경고·주의·이상반응·상호작용 보존 | **196 / 196** |
| planDigest | `b1573be8961795a522ab4ccb7bc2dd15` |

## 6. 총 write

| 구분 | 실측 | 예상 |
|------|-----:|-----:|
| unit-2 KO | 1,080T | 1,080T |
| unit-2 EN | 540T | 540T |
| **unit-2 합계** | **1,620T** | **1,620T** |
| **oral V3 전체** | **3,240T** (KO 2,160 + EN 1,080) | 3,240T |

## 7~10. canonical 상태 · 6섹션 보존 · sourceRef · canonicalDup

**전체 독립검증** (`otc-easy-drug-ready-oral-v3-track-verify.da.ts` — apply/postverify 미사용 별도 경로, read-only):

| 항목 | 결과 |
|------|-----:|
| targetMasters | **540** |
| contentFp | **131** |
| koAuthoredCanonical | **540** |
| enCanonical | **540** |
| easyDeprecated | **540** |
| easyStillCanonical | **0** |
| auditKo | **540** |
| **canonicalDup** | **0** (KO 0 / EN 0) |
| **sourceRefLeak** | **0** (distinct refs used 131 · V3 rows 1,080) |
| **storedContentHashMismatch** | **0** |
| **officialSixSectionsMismatch** | **0** (unit1 199/199 + unit2 196/196 = **395/395**) |
| **enHangul** | **0** |

## 11~12. oral-unit-1 불변 · 다른 route write 0

| 항목 | 결과 |
|------|-----:|
| oral-unit-1 KO/EN canonical 유지 | **270 / 270** |
| oral-unit-1 easy canonical 잔존 | **0** |
| oral-unit-1 audit 유지 | **270** |
| oral-unit-1 저장 content hash 불변 | 불일치 **0** |
| 본 WO audit 이 unit-1 을 건드림 | **0** |
| topical·ophthalmic·oromucosal 594 master — 본 트랙 audit | **0** |
| 〃 oral V3 sourceRef 행 | **0** |
| 〃 authored KO canonical | **0** (easy canonical **594** 그대로) |
| 기존 V1/V2 LIVE 변경 | **0** (audit 앵커 밖 변경 0 · V2 namespace 미사용) |

## 13~14. 독립검증 · 범위 사후검증

- 전체 독립검증 **PASS · fails 0** (§7~10 표).
- 범위 사후검증 **PASS** — unit-1 불변, 타 route 무변경, 트랙 밖 audit 0 (§11~12 표).
- postVerify 는 apply 러너와 **별개 커넥션·별개 코드경로**, 트랙 검증자는 **또 다른 독립 경로**로 3중 확인.

> **검증 스크립트 2건 정정(데이터 이상 아님)**: KO postVerify 1차 실행에서 4건 fail 이 났으나 전부 검증기 로직 문제였다.
> ① `postverify` 의 `PRODUCTION_WO` 가 unit-1 WO 로 하드코딩 → unit-2 audit 이 0 으로 오독 → **unit별 맵으로 정정**.
> ② isolation 게이트가 "상대 unit 미적용"을 전제 → 이미 GREEN 인 unit-1 을 오탐 → **상대 unit 상태 자동판별(fresh/applied/partial)** 로 정정. `partial` 은 즉시 FAIL 로 유지.
> 정정 후 재실행 전부 PASS. DB 데이터는 1차 실행 시점부터 정상이었다.

## 15~17. 상태 기록

- **oral-unit-2 = GREEN** — `.../data/otc-easy-drug-ready-oral-v3-green-oral-unit-2.json`
- **oral route V3 = COMPLETE** (131fp / 540m / 3,240T) — `.../data/otc-easy-drug-ready-oral-v3-route-complete.json`
- **topical-unit-1 = UNBLOCKED** (55fp / 327m / 예상 1,962T) — 동 파일 `nextHandoff` 블록

**승인 선언·unit 대상·fingerprint 원장은 수정하지 않았다.** 실행 상태 블록만 별도 파일로 기록.
topical 착수에는 topical 전용 readiness + 승인 WO + 화이트리스트 추가 + confirm 토큰 + 단일 write-owner 지정이 필요하다
(na 형제 러너 `otc-v3-topical-oromucosal-apply.na.ts` 존재 — **write-owner 중복 지정 금지**).

## 18. 중지 조건 점검

| 중지 조건 | 결과 |
|-----------|:----:|
| oral-unit-1 GREEN 불일치 | 미발동 |
| unit-2 기존 authored canonical 발견 | 미발동 (0) |
| 승인 SSOT·원장·payload·digest 변경 | 미발동 (전부 불변) |
| 예상 write 와 실측 불일치 | 미발동 (1,620 == 1,620) |
| 공식 6섹션 보존 실패 | 미발동 (196/196 · 수치누락 0) |
| canonicalDup 또는 sourceRef 충돌 | 미발동 (dup 0 · leak 0) |
| oral-unit-1 또는 다른 unit 변경 | 미발동 |
| transaction·postVerify·독립검증 실패 | 미발동 (전부 PASS) |
| 다른 세션 LIVE write 감지 | 미발동 |

## 19. Git 안전

자기 산출물만 path-specific add · `git add .` 미사용 · commit 전 `git diff --cached --name-only` 확인 ·
reset/clean/stash **미사용** · amend/rebase/force-push **미사용** · 공유 main 기존 commit 메시지 **미수정** ·
승인 SSOT·unit ledger·기존 GREEN 파일 **미수정** · `pnpm-lock.yaml`·`.env`·다른 세션 파일 **미접촉** · 자격증명 출력 **0**.

## 산출물

| 구분 | 경로 |
|------|------|
| apply 러너 (unit별 승인 WO 맵 + 화이트리스트) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-apply.da.ts` |
| LIVE 사후검증자 (unit별 WO · isolation 자동판별) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-postverify.da.ts` |
| **트랙 독립검증자** (신규) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-track-verify.da.ts` |
| **oral-unit-2 GREEN 원장** | `.../data/otc-easy-drug-ready-oral-v3-green-oral-unit-2.json` |
| **oral route COMPLETE + topical 인계** | `.../data/otc-easy-drug-ready-oral-v3-route-complete.json` |

---

**최종 판정: oral-unit-2 GREEN (1,620T) · oral route V3 COMPLETE (3,240T) · topical-unit-1 UNBLOCKED (write 0)**
