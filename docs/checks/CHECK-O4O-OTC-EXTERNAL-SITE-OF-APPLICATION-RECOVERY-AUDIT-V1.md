# CHECK-O4O-OTC-EXTERNAL-SITE-OF-APPLICATION-RECOVERY-AUDIT-V1 — 에이전트 라

WO: `WO-O4O-OTC-EXTERNAL-SITE-OF-APPLICATION-RECOVERY-AUDIT-V1`
선행: `WO-O4O-OTC-REMAINING-CENSUS-IDENTITY-ROUTE-STRENGTH-CORRECTION-V2` (commit `81b39da72`)
상태: **PASS — 전 게이트 통과. DB write 0 · 설명서 생성 0 · apply 0 · V2 READY shard 미수정.**

## 0. 결론

> V2 가 적용부위 미확정으로 보류한 **651 master** 를 공식 용법 원문으로 재판정했다.
> **RECOVERABLE 457 (70.2%)** · HOLD_ROUTE 유지 194 · (모집단 진입 전 EXCLUDE 62 별도).
> 회수 대상 중 identity 미분산 **278 master / 47 fp** 로 신규 가·나·다 shard 를 **제안**한다 (승인 전 생산 금지).

## 1. 모집단 재현 — V2 선언값과 일치

V2 의 분류 우선순위(EXCLUDE → 완료 → grounded → 원문 2축 → identity → route)를 그대로 재현했다.

| 항목 | 값 |
|---|---:|
| V2 선언 `siteAmbiguousDeferredMasters` | **651** |
| 본 감사 재현 모집단 | **651** |
| 일치 | **PASS** |
| 모집단 진입 전 EXCLUDE 분리 | 62 |

CLQ/CDS/CSI · 일반명코드 단일 보유 master 총계 713 = 회수 대상 651 + EXCLUDE 62 로 정합한다.

## 2. 판정 규칙

| 판정 | 조건 |
|---|---|
| **RECOVERABLE** | e약은요 canonical **`용법·용량`** 원문에 적용부위가 **정확히 1종** 명시 |
| **HOLD_ROUTE 유지** | 서로 다른 부위 2종 이상 명시(상충) 또는 0종(미명시) |
| **EXCLUDE** | 수출·군납·비매품·비소매 대용량 (모집단 진입 전 분리) |

- 판정 근거는 **용법·용량 섹션에 한정**했다. 효능·효과·주의사항은 근거로 사용하지 않았다.
- **제품명은 적용부위 판정에 일절 사용하지 않았다.** EXCLUDE 판정에만 사용했다.
- 외용 대분류 코드(`[7]=C`)만으로는 어떤 대상도 승격시키지 않았다.
- 근거는 `sites[].evidence` 필드에 **정규화된 용법 원문의 매칭 표현 전후 문맥을 그대로 인용**하여 사후 검증 가능하게 남겼다.

탐지 부위 7종: 직장 / 질 / 구강·인후 / 점안 / 비강 / 외이도 / 피부.

## 3. 판정 결과

| 판정 | master | 비율 |
|---|---:|---:|
| **RECOVERABLE** | **457** | 70.2% |
| ├ shard 배정 가능(identity 미분산) | 278 | 42.7% |
| └ SPLIT_REQUIRED(identity 분산) | 179 | 27.5% |
| **HOLD_ROUTE 유지** | **194** | 29.8% |
| ├ 용법에 부위 미명시 | 154 | 23.7% |
| ├ 상충 cutaneous/oromucosal | 33 | 5.1% |
| └ 상충 nasal/oromucosal | 7 | 1.1% |
| **합계** | **651** | 100% |
| (별도) EXCLUDE — 모집단 외 | 62 | 전량 `수출명`/`수출용` 키워드, bulk 0 |

## 4. 적용부위별 분포 (RECOVERABLE 457)

| 적용부위 | master | fp | 접미 내역 |
|---|---:|---:|---|
| 피부 (cutaneous) | **286** | 42 | CDS 148 · CLQ 118 · CSI 20 |
| 구강·인후 (oromucosal) | **80** | 15 | CLQ 80 |
| 비강 (nasal) | **78** | 20 | CSI 61 · CLQ 17 |
| 직장 (rectal) | **7** | 1 | CLQ 7 |
| 질 (vaginal) | **6** | 1 | CLQ 6 |
| 점안 · 외이도 | 0 | 0 | — |

> V2 가 지적한 "`CLQ` 하나에 관장·질·가글·피부가 혼재" 가 실제로 **4개 부위로 분해**됐다(피부 118 · 구강 80 · 비강 17 · 직장 7 · 질 6).

## 5. 판정 근거 실례 (공식 용법 원문 인용)

| 부위 | 제품 | 용법 원문 근거 |
|---|---|---|
| 피부 | 콜로덤에스액 | "1일 1~3회 **환부(질환 부위)에 바릅니다**" |
| 피부 | 소프타-맨액 | "(팔꿈치까지)에 골고루 묻혀준 후 3분 이상 **문지르면서** … 위생 목적의 **손 소독**에" |
| 구강 | 삼아탄툼액(벤지다민) | "원액 그대로 또는 소량의 물로 희석하여 **양치질합니다**" |
| 구강 | 케어가글액(벤제토늄) | "1회 적당량을 1일 2~3회 사용해서 **입안을 헹구어 냅니다**" |
| 비강 | 미놀노즈점비액 | "1회 1번씩, 1일 3회의 범위 내에서 각 **코안에 뿌립니다**" |
| 비강 | 레스피비엔액(옥시메타졸린) | "각 **비강에** 12시간마다 1회 2∼3 방울을 1∼2회 분무합니다" |
| 질 | 지노베타딘질세정액 | "액 30 mL를 온수 약 1 L에 희석하여 **질내외를** 1일 1~2회 **세정합니다**" |

### HOLD 유지 실례

| 사유 | 제품 | 판단 |
|---|---|---|
| 미명시 | **오트리빈베이비내추럴비강분무액** | 제품명에 "비강"이 있으나 **용법 원문에 부위 표현 없음** → 제품명 추정 금지 원칙에 따라 HOLD |
| 미명시 | 드리클로액(염화알루미늄수화물) | 용법에 부위 표현 부재 |
| 상충 | 헥시덱스-4액(클로르헥시딘) | 피부 소독 + 구강 소독 양쪽 허가 → 단일 경로 확정 불가 |
| 상충 | 피지오머비강세척액 | 비강 + 구강 표현 공존 |

> 상충 40건은 **오탐이 아니라 실제 다부위 허가** 품목이다. 단일 route 로 확정할 수 없으므로 보류를 유지한다.

## 6. 게이트 — 전부 PASS

| 게이트 | 결과 |
|---|---|
| 모집단 재현 = V2 선언 651 | **PASS** |
| 판정 합계 = 모집단 (457+194=651) | **PASS** |
| shard fp 교집합 | **0** |
| shard master 교집합 | **0** |
| shard fp 합 = fp 그룹 수 (47) | **PASS** |
| shard master 합 = shardable (278) | **PASS** |
| **V2 READY shard 와 master 교집합** | **0** |
| **V2 READY shard 와 fp 교집합** | **0** |
| 제품명 유래 경로 판정 | **0건** |
| EXCLUDE 재검토 | 62건 (전량 수출 키워드) |
| `dbWrite` | **0** |
| 결정론 | 2회 실행 **byte-identical** (md5 일치) |

## 7. 신규 가·나·다 shard 제안 (승인 전 생산 금지)

RECOVERABLE 중 identity 미분산 **278 master / 47 fp**:

| shard | fp | master | 적용부위 분포 |
|---|---:|---:|---|
| 가 | 17 | 93 | 피부 35 · 비강 28 · 구강 23 · 직장 7 |
| 나 | 16 | 93 | 피부 54 · 구강 25 · 비강 8 · 질 6 |
| 다 | 14 | 92 | 피부 73 · 비강 9 · 구강 10 |
| **계** | **47** | **278** | fp·master 교집합 0 |

SSOT: `apps/api-server/src/scripts/data/otc-external-site-recovery-shard-proposal-v1.json` (`status: PROPOSAL — 승인 전 생산 금지`)

## 8. 산출물

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/otc-external-site-recovery-audit.ts` | 감사 script (신규) |
| `apps/api-server/src/scripts/data/otc-external-site-recovery-audit-v1.json` | 감사 결과 (신규) |
| `apps/api-server/src/scripts/data/otc-external-site-recovery-shard-proposal-v1.json` | shard 제안 (신규) |
| 본 문서 | CHECK |

**V2 산출물 처리**: `otc-remaining-full-corpus-census-v2.*` · `otc-remaining-shard-assignment-ssot-v2.json` **읽기 전용 참조, 수정 0**. V2 READY shard 는 그대로 유효하다.

## 9. 후속 결정 요청

1. **RECOVERABLE 278(shardable) 착수 승인** — 신규 가·나·다 배정 및 write-owner 지정.
2. **SPLIT_REQUIRED 179 처분** — identity 분산분. V2 SPLIT_REQUIRED 4,617 과 동일 트랙으로 병합할지 결정.
3. **HOLD 상충 40 처분** — 다부위 허가 품목. 부위별 분리 저작 여부는 콘텐츠 정책 판단 필요(조성 혼합 금지 원칙과 별개 사안).
4. **HOLD 미명시 154** — 회수 불가. 허가사항 원문(`MFDS_DRUG_OTC`) 적재 시 재시도 대상.

## 10. Git / 무결성

- read-only 감사 · **DB write 0** · 설명서 생성 0 · apply 0 · dry-run 0
- V2 산출물 3종 읽기 전용 참조, 수정 0 · V2 READY shard 미수정
- 자격증명: `apps/api-server/.env` 를 `process.env` 로만 전달, 값 열람·출력·수정 0
- **`.env` 보존** — 다 세션의 V2 공용 러너 dry-run 예정에 따라 삭제하지 않음
- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 파일 미접촉 · 본 산출물만 path-specific commit
