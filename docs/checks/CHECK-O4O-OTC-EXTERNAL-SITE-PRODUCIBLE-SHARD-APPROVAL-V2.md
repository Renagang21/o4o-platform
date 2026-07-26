# CHECK-O4O-OTC-EXTERNAL-SITE-PRODUCIBLE-SHARD-APPROVAL-V2 — 에이전트 라

WO: `WO-O4O-OTC-EXTERNAL-SITE-PRODUCIBLE-SHARD-APPROVAL-V2`
선행: 회수 감사 `3b1181145` → V1 승인 `172a792fd` → 전문용 분리 감사 `3719b8280` (에이전트 다)
상태: **APPROVED_FOR_PRODUCTION — 전 게이트 PASS. DB write 0 · 설명서 생성 0 · apply 0.**

## 0. 결론

> 전문용 분리 감사를 반영해 **42 fingerprint / 199 master** 를 최종 생산 승인 SSOT 로 확정했다.
> V1 승인 278 에서 **HOLD_PROFESSIONAL_USE 5 fp / 79 master 를 전량 제외**했다.
> 199 전건의 `route · officialSite · evidence` 를 보존했고, 근거는 DB 원문에서 재도출해 V1 승인값과 전건 일치시켰다.
> 예상 write **1,194T** 확정. 기존 승인 SSOT·조정 proposal 원본은 수정하지 않았다.

## 1. 최종 승인 대상

| shard | fp | master | route 분포 | write |
|---|---:|---:|---|---:|
| 가 | 15 | 68 | 비강 28 · 구강 23 · 피부 10 · 직장 7 | **408T** |
| 나 | 15 | 85 | 피부 46 · 구강 25 · 비강 8 · 질 6 | **510T** |
| 다 | 12 | 46 | 피부 27 · 구강 10 · 비강 9 | **276T** |
| **계** | **42** | **199** | — | **1,194T** |

### route 총계

| 적용부위 | master |
|---|---:|
| 피부 (cutaneous, PRODUCIBLE_STORE) | **83** |
| 구강·인후 (oromucosal) | **58** |
| 비강 (nasal) | **45** |
| 직장 (rectal) | **7** |
| 질 (vaginal) | **6** |
| **계** | **199** |

WO 선언 route 수치와 전건 일치한다.

### write 산정

master 당 **ko 4T + en 2T = 6T**.

| shard | master | ko | en | 계 |
|---|---:|---:|---:|---:|
| 가 | 68 | 272 | 136 | **408** |
| 나 | 85 | 340 | 170 | **510** |
| 다 | 46 | 184 | 92 | **276** |
| **계** | **199** | **796** | **398** | **1,194** |

WO 선언값(408 / 510 / 276 / 1,194)과 일치한다.

## 2. 제외

| 구분 | fp | master |
|---|---:|---:|
| **HOLD_PROFESSIONAL_USE** | **5** | **79** |
| SPLIT_REQUIRED | 0 | 0 |

전문용 판정 사유(중복 계상): `SURGICAL_SITE` 49 · `SURGEON_HAND` 38 · `APPLICATOR` 38 · `SCRUB` 8 · `ASEPTIC` 3.

HOLD 는 **fp 단위 전체 승격**으로 처리되어 승인분과 혼재가 없다(`F4` 교집합 fp 0 · master 0).

## 3. 게이트 — 전부 PASS

| # | 게이트 | 결과 |
|---|---|---|
| F1 | 총계 = WO 선언 | **42 fp / 199 master** 일치 |
| F1 | shard 별 = WO 선언 | 가 15/68 · 나 15/85 · 다 12/46 **일치** |
| F2 | shard 내 fp·master 중복 | **0 / 0** |
| F2 | 가∩나 · 가∩다 · 나∩다 (fp) | **0 · 0 · 0** |
| F2 | 동 (master) | **0 · 0 · 0** |
| F3 | **V2 LIVE apply 완료 2,509 master** 교집합 | **0** |
| F3 | 동 fp 교집합 | **0** |
| F4 | HOLD_PROFESSIONAL_USE master 포함 | **0** / 79 |
| F4 | 동 fp 포함 | **0** / 5 |
| F5 | 근거 재도출 건수 | **199 / 199** |
| F5 | route 불일치 · 원문 결손 · V1 미등재 | **0 · 0 · 0** |
| F5 | evidence 결손 | **0** |
| F6 | 예상 write | **1,194T** — WO 선언 일치 |
| F7 | **DB 실사** authored STORE canonical 보유 | **0** (실제 미생산 확인) |
| F8 | 199 ⊂ V1 승인 278 | **true** |
| F8 | V1 대비 제외 | **79** (= HOLD 전량) |
| F9 | cutaneous 83 전건 `PRODUCIBLE_STORE` | **true** |
| — | `dbWrite` | **0** |
| — | 결정론 | 2회 실행 **byte-identical** (md5 일치) |

## 4. 근거 보존 실례 (SSOT `masters[].evidence`)

| route | 제품 | 용법·용량 원문 근거 |
|---|---|---|
| 피부 | 콜로덤에스액 | "1일 1~3회 **환부(질환 부위)에 바릅니다**" |
| 비강 | 엔클비액(염화나트륨) | "각 **비강에** 2방울씩 **점적합니다**" |
| 구강 | 삼아탄툼액(벤지다민염산염) | "원액 그대로 또는 소량의 물로 희석하여 **양치질합니다**" |
| 질 | 지노베타딘질세정액(포비돈요오드) | "온수 약 1 L에 희석하여 **질내외를** 1일 1~2회 **세정합니다**" |
| 직장 | 베베락스액 | "1회 5 mL **직장내 주입**하고" |

## 5. 산출물

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/otc-external-site-final-approval.ts` | 최종 승인 검증 script (신규) |
| `apps/api-server/src/scripts/data/otc-external-site-final-approved-ssot-v1.json` | **최종 생산 승인 SSOT** (신규) |
| 본 문서 | CHECK |

### 원본 보존 확인

다음 3종 **수정 0** (git 상태 clean 으로 확인):

- `otc-external-site-recovery-approved-ssot-v1.json` (V1 승인, `172a792fd`)
- `otc-external-site-recovery-adjusted-proposal-v1.json` (조정 proposal, `3719b8280`)
- `otc-external-site-professional-use-audit-v1.json` (전문용 분리 감사, `3719b8280`)

V1 승인 SSOT 는 본 파일 내부에 `supersedes.status = SUPERSEDED_BY_FINAL` 로 표기했다.

### 최종 SSOT 구조

- `status: APPROVED_FOR_PRODUCTION` · `allGatesPass: true`
- `shards.{ga,na,da}` — `fingerprintList` · `masterIds` · `routes` · `writePlan` · `removedByProfessionalUse` · `holdFingerprints`
- `masters[]` — **199 전건**. `masterId · name · shard · fp · gencode · suffix · route · officialSite · evidence · evidenceSection('용법·용량') · professionalUseVerdict · storeSignals`
- `writePlan` — `perMaster {ko:4, en:2, total:6}` · `byShard` · `total: 1194`
- `productionRules` — "cutaneous 는 매장용(PRODUCIBLE_STORE) 만 대상 — 수술부위·술자 손소독·도포기구 용도는 생산 금지" 포함

## 6. 후속

1. **write-owner 지정** — 가·나·다 착수 승인 및 단일 write-owner 순차 apply (예상 1,194T)
2. **HOLD_PROFESSIONAL_USE 79** — 매장 소비자 콘텐츠 대상 아님. 재판정 트랙 필요 여부 결정
3. **선행 트랙 잔여** — SPLIT_REQUIRED 179 · HOLD_ROUTE 194(미명시 154 + 상충 40) · EXCLUDE 62

## 7. Git / 무결성

- read-only 검증 · **DB write 0** · 설명서 생성 0 · apply 0 · dry-run 0
- V1 승인 SSOT · 조정 proposal · 전문용 감사 원본 수정 0
- 소스 기능 변경·리팩터링·패키지 변경·CI 수정·배포 0
- 자격증명: `apps/api-server/.env` 를 `process.env` 로만 전달, 값 열람·출력·수정 0, **보존**
- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 파일 미접촉 · 본 산출물만 path-specific commit
