# CHECK-O4O-OTC-EXTERNAL-SITE-RECOVERABLE-SHARD-APPROVAL-V1 — 에이전트 라

WO: `WO-O4O-OTC-EXTERNAL-SITE-RECOVERABLE-SHARD-APPROVAL-V1`
선행: `WO-O4O-OTC-EXTERNAL-SITE-OF-APPLICATION-RECOVERY-AUDIT-V1` (commit `3b1181145`)
상태: **APPROVED_FOR_PRODUCTION — 전 게이트 PASS. DB write 0 · 설명서 생성 0 · apply 0.**

## 0. 결론

> 회수 감사의 RECOVERABLE 중 identity 미분산 **47 fingerprint / 278 master** 를 생산 승인 SSOT 로 확정했다.
> 278 **전건**의 공식 적용부위 근거를 원문에서 재도출해 route 를 보존했다(불일치 0 · 근거 결손 0).
> 기존 proposal 원본은 수정하지 않았다.

## 1. 승인 대상

| shard | fp | master | route 분포 |
|---|---:|---:|---|
| 가 | 17 | 93 | 피부 35 · 비강 28 · 구강 23 · 직장 7 |
| 나 | 16 | 93 | 피부 54 · 구강 25 · 비강 8 · 질 6 |
| 다 | 14 | 92 | 피부 73 · 구강 10 · 비강 9 |
| **계** | **47** | **278** | — |

### route 총계

| 적용부위 | master |
|---|---:|
| 피부 (cutaneous) | **162** |
| 구강·인후 (oromucosal) | **58** |
| 비강 (nasal) | **45** |
| 직장 (rectal) | **7** |
| 질 (vaginal) | **6** |
| **계** | **278** |

## 2. 승인 근거

- 공식 e약은요 **`용법·용량`** 원문에서 적용부위가 정확히 **1종**만 확인된 건만 포함
- **제품명으로 경로를 추정하지 않음** — 제품명은 EXCLUDE 판정에만 사용
- 기존 V2 READY 와 fp/master 교집합 0
- V2 LIVE apply 완료분과 master 교집합 0
- shard 상호 fp/master 교집합 0
- 278 전건 근거 재도출 결과가 proposal 의 route 와 전건 일치

### 근거 보존 실례 (SSOT `masters[].evidence`)

| route | 제품 | 용법 원문 근거 |
|---|---|---|
| 피부 | 콜로덤에스액 | "1일 1~3회 **환부(질환 부위)에 바릅니다**" |
| 비강 | 엔클비액(염화나트륨) | "각 **비강에** 2방울씩 **점적합니다**" |
| 구강 | 삼아탄툼액(벤지다민염산염) | "원액 그대로 또는 소량의 물로 희석하여 **양치질합니다**" |
| 질 | 지노베타딘질세정액(포비돈요오드) | "온수 약 1 L에 희석하여 **질내외를** 1일 1~2회 **세정합니다**" |
| 직장 | 베베락스액 | "1회 5 mL **직장내 주입**하고" |

## 3. 제외 (승인 범위 밖)

| 구분 | master |
|---|---:|
| SPLIT_REQUIRED (identity 분산) | 179 |
| HOLD_ROUTE **합계** | **194** |
| ├ 적용부위 미명시 | 154 |
| └ 다부위 상충 | 40 |
| EXCLUDE (수출·비매품 등) | 62 |

> WO 본문의 "HOLD_ROUTE 194 / 상충 40 / 미명시 154" 는 **합산 관계**다(194 = 154 + 40). 별개 3항목이 아니다. SSOT `exclusions` 에 이 관계를 명시했다.

## 4. 게이트 — 전부 PASS

| # | 게이트 | 결과 |
|---|---|---|
| G1 | 총계 = proposal 선언 | **47 fp / 278 master** 일치 |
| G2 | shard 내 fp·master 중복 | **0 / 0** |
| G2 | 가∩나 · 가∩다 · 나∩다 (fp) | **0 · 0 · 0** |
| G2 | 동 (master) | **0 · 0 · 0** |
| G3 | V2 READY(716fp / 2,517m) fp 교집합 | **0** |
| G3 | 동 master 교집합 | **0** |
| G4 | **V2 LIVE apply 완료분 2,509 master** 교집합 | **0** |
| G4 | 동 fp 교집합 | **0** |
| G5 | 근거 재도출 건수 | **278 / 278** |
| G5 | route 불일치 | **0** |
| G5 | 원문 결손 | **0** |
| G6 | **DB 실사** — authored STORE canonical(ko/en) 보유 | **0** (실제 미생산 확인) |
| G7 | EXCLUDE 키워드·대용량 혼입 | **0** |
| — | 근거 문자열 비어있는 master | **0** |
| — | `dbWrite` | **0** |
| — | 결정론 | 2회 실행 **byte-identical** (md5 일치) |

### G4 — 2,509 독립 재현

`otc-v2-apply-run.{ga,na,da}.{ko,en}.json` 의 fp 를 `otc-remaining-full-corpus-census-v2.json` 의 `readyGroups` 로 역산해 **2,509 master** 를 직접 산출했다. WO 선언값 및 commit `e421890b9` 와 일치한다.

V2 READY 2,517 대비 8 master 차이는 가·다 shard 에서 fp 1개씩(각 238→237) 미적용된 데서 발생한다.

## 5. 산출물

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/otc-external-site-recovery-approval.ts` | 승인 검증 script (신규) |
| `apps/api-server/src/scripts/data/otc-external-site-recovery-approved-ssot-v1.json` | **생산 승인 SSOT** (신규) |
| 본 문서 | CHECK |

### 원본 보존 확인

`otc-external-site-recovery-shard-proposal-v1.json`(status: PROPOSAL) · `otc-external-site-recovery-audit-v1.json` · `otc-remaining-shard-assignment-ssot-v2.json` **전부 수정 0** (git 상태 clean 으로 확인).

### 승인 SSOT 구조

- `status: APPROVED_FOR_PRODUCTION` · `allGatesPass: true`
- `shards.{ga,na,da}` — `fingerprintList` · `masterIds` · `groups[]`(fp·gencode·suffix·route·masterIds)
- `masters[]` — **278 전건**. 각 항목에 `masterId · name · shard · fp · gencode · suffix · route · officialSite · evidence · evidenceSection('용법·용량')`
- `productionRules` — "적용부위(route)는 본 SSOT 값을 사용하고 제품명으로 재추정하지 않는다" 포함

## 6. 작업 중 정정 1건

승인 스크립트 초안이 감사 산출물의 적용부위 필드를 `route` 로 읽었으나 실제 필드명은 `site` 였다. DB 실행 전 정적 검증에서 route 분포가 전건 `undefined` 로 나와 발견했고, `g.site` 로 수정한 뒤 재검증했다. 잘못된 값으로 SSOT 가 생성된 적은 없다.

## 7. 후속

1. **write-owner 지정** — 가·나·다 착수 승인 및 단일 write-owner 순차 apply
2. **SPLIT_REQUIRED 179** — V2 SPLIT_REQUIRED 4,617 과 동일 트랙 병합 여부
3. **다부위 상충 40** — 부위별 분리 저작 여부(콘텐츠 정책 판단)
4. **미명시 154** — `MFDS_DRUG_OTC` 허가원문 적재 시 재시도 대상

## 8. Git / 무결성

- read-only 검증 · **DB write 0** · 설명서 생성 0 · apply 0 · dry-run 0
- proposal·audit·V2 SSOT 원본 수정 0
- 소스 기능 변경·리팩터링·패키지 변경·CI 수정·배포 0
- 자격증명: `apps/api-server/.env` 를 `process.env` 로만 전달, 값 열람·출력·수정 0, **보존**(삭제하지 않음)
- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 파일 미접촉 · 본 산출물만 path-specific commit
