# CHECK-O4O-OTC-EXTERNAL-SITE-SPLIT-REQUIRED-AUDIT-V1 — 에이전트 라

WO: `WO-O4O-OTC-EXTERNAL-SITE-SPLIT-REQUIRED-AUDIT-V1`
기준선: 외용 최종 생산 완결 `f8549e767` (42 fp / 199 master LIVE)
상태: **PROPOSAL — 전 게이트 PASS. DB write 0 · 설명서 생성 0 · LIVE apply 0.**

## 0. 결론

> SPLIT_REQUIRED **179 master** 를 전수 재현·조사했다.
> **READY_SPLIT 90 master / 신규 하위 fingerprint 24개** — 예상 write **540T**.
> HOLD 89 (전문용 67 · 복수경로 22). EXCLUDE 0 · HOLD_SOURCE 0.
> 승인 전 단계이므로 `status: PROPOSAL` 로만 작성했고, 기존 SSOT·감사 결과는 수정하지 않았다.

## 1. 모집단 재현

회수 감사(`3b1181145`) 파이프라인을 그대로 재현했다.

| 항목 | 값 |
|---|---:|
| 기대 모집단 | 179 |
| 재현 모집단 | **179** |
| 중복 | **0** |
| 판정 합계 = 모집단 | **179** |

## 2. 판정 결과

| 판정 | master | 비율 |
|---|---:|---:|
| **READY_SPLIT** | **90** | 50.3% |
| HOLD_PROFESSIONAL_USE | 67 | 37.4% |
| HOLD_MULTI_ROUTE | 22 | 12.3% |
| HOLD_SOURCE | 0 | — |
| EXCLUDE | 0 | — |
| **계** | **179** | 100% |

### HOLD 사유 내역

| 사유 | master |
|---|---:|
| `SURGICAL_SITE` (수술부위 소독) | 67 |
| `multi_site(cutaneous/oromucosal)` | 16 |
| `multi_site(cutaneous/rectal)` | 6 |

## 3. 하위 그룹 분리 — 신규 fingerprint 24개

### 분리 기준 (WO 조사원칙 3 — 9축 전부 명시 검증)

| 축 | 근거 |
|---|---|
| 적용부위 · 투여경로 | 공식 **용법·용량** 원문에서 도출 (제품명 미사용) |
| 함량 · 제형 · 단일제/복합제 | 일반명코드 `[1-4]`성분 `[5-6]`함량 `[7-9]`제형 |
| 용법 수치 | 용법 원문의 수치+단위 집합 signature |
| 연령 | 용법+주의 원문의 연령·대상군 signature |
| 사용 기간 | 용법+주의 원문의 기간·횟수 signature |
| 금기·주의사항 | 주의 원문의 금기 선행 문맥 signature |

일반명코드·기존 fp 일치는 **후보 연결 키로만** 사용했고(WO 원칙 4), 최종 동일성은 위 9축 전부로 판정했다.

### 분할 구조

| 항목 | 값 |
|---|---:|
| READY 90 master 가 걸쳐 있던 **기존** fp | 24 |
| 제안하는 **신규** 하위 fp | **24** |
| 신규 fp 가 기존 fp 를 **병합한** 그룹 | **0** |
| READY 의 identityKey(gencode\|site) 수 | 12 |

> identityKey 12개가 각각 fp 2개로 갈라져 있던 것이 SPLIT_REQUIRED 의 실체다. 신규 fp 는 기존 fp 경계와 **정확히 일치**하며, 서로 다른 기존 fp 를 합치지 않는다(병합 0). 9축을 추가 검증한 뒤에도 분할선이 그대로라는 것이 안전성의 근거다.

### route 분포 (READY 90)

| 적용부위 | master |
|---|---:|
| 피부 (cutaneous) | 35 |
| 비강 (nasal) | 33 |
| 구강·인후 (oromucosal) | 22 |

## 4. 판정 근거 실례

### READY_SPLIT

| route | 제품 | 용법·용량 원문 근거 |
|---|---|---|
| 비강 | 미놀노즈점비액(자일로메타졸린염산염) | "1회 1번씩, 1일 3회의 범위 내에서 각 **코안에 뿌립니다**" |
| 구강 | 이텍스벤지다민액 | "원액 그대로 또는 소량의 물로 희석하여 **양치질합니다**" |
| 피부 | 성광티눈액 | "1일 1~2회 적당량을 **환부에 바릅니다**" |

### HOLD_PROFESSIONAL_USE (67)

> 큐앤큐포비돈요오드탈지면볼 — "찢긴 상처, 화상, 창상의 살균소독, 궤양, 농양의 살균소독, 감염피부면의 소독, **수술부위의 살균소독**, 주사 및 카테터 부위의 소독에 사용합니다."

매장 소비자 용도(상처 소독)와 전문 용도(수술부위·카테터)가 한 허가사항에 병존한다. 잘라 쓰지 않고 전체 보류했다.

### HOLD_MULTI_ROUTE (22) — 용법 단독 판정의 한계를 잡아낸 게이트

| 제품 | 판정 | 근거 |
|---|---|---|
| 누보클렌액 | `cutaneous/rectal` | 효능 "긁힌 상처, 베인 상처, 창상, 손 및 손가락의 살균과 소독, **치질인 경우 항문 살균 및 소독**" |
| 베타딘인후스프레이(포비돈요오드) | `cutaneous/oromucosal` | 용법 "분사**도포**합니다" → cutaneous / 효능 "**구강내 살균소독**, 인두염, 후두염, 구내염" → oromucosal |

> **베타딘인후스프레이는 실제로는 인후 스프레이다.** 그런데 용법 문구가 "분사도포"여서 **용법 원문만 보는 기존 규칙에서는 `cutaneous` 로 확정**된다. 이번 WO 의 "복수 경로 병존 시 보류"(원칙 5)를 효능·효과 대조로 구현한 결과 이 오분류가 걸러졌다.
>
> 즉 HOLD_MULTI_ROUTE 22 건은 단순 보류가 아니라, **용법 단독 판정이 만들어낼 뻔한 잘못된 적용부위 확정을 차단한 것**이다.

## 5. shard 분배 제안 (승인 전 생산 금지)

| shard | fp | master | route 분포 | write |
|---|---:|---:|---|---:|
| 가 | 8 | 30 | 구강 14 · 피부 12 · 비강 4 | **180T** |
| 나 | 8 | 29 | 비강 17 · 피부 12 | **174T** |
| 다 | 8 | 31 | 비강 12 · 피부 11 · 구강 8 | **186T** |
| **계** | **24** | **90** | — | **540T** |

master 당 **KO 4T + EN 2T = 6T** → KO 360 + EN 180 = **540T**.

## 6. 게이트 — 전부 PASS

| 게이트 | 결과 |
|---|---|
| 입력 총계 179 일치 | **PASS** (179 / 179) |
| 누락·중복 | **0 / 0** |
| 신규 fp 내부 원문 안전지문 일치 (9축) | **PASS** — 불일치 축 **0** |
| 신규 fp 간 master 교집합 | **0** |
| shard fp 교집합 | **0** |
| **기존 LIVE 199 master 교집합** | **0** |
| 기존 LIVE 199 fp 교집합 | **0** |
| **V2 LIVE 2,509 master 교집합** | **0** |
| 제품명 기반 추정 | **0** |
| 공식 근거 결손 (READY) | **0** |
| 전문용 혼입 (READY) | **0** |
| fp 판정 혼재로 인한 HOLD 승격 | **0** |
| `dbWrite` | **0** |
| 결정론 | 2회 실행 **byte-identical** (md5 일치) |

## 7. 산출물

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/otc-external-site-split-required-audit.ts` | 재실행 가능한 감사 script (신규) |
| `apps/api-server/src/scripts/data/otc-external-site-split-required-audit-v1.json` | 179 전수 감사 + 신규 fp proposal + HOLD/EXCLUDE 근거 (신규) |
| `apps/api-server/src/scripts/data/otc-external-site-split-required-shard-proposal-v1.json` | 가·나·다 분배 proposal (신규, `status: PROPOSAL`) |
| 본 문서 | CHECK |

감사 JSON 의 `masters[]` 179 전건에 `verdict · reasons · site · route · siteEvidence · axes(9축 signature) · officialExcerpt(효능/용법) · professionalEvidence` 를 보존했다.

### 규칙 재사용

전문용 판정은 다 세션 `3719b8280` 의 `PRO_MARKERS` · 부정문맥(`NEGATION`/`isNegated`) · `APPLICATOR` 단독배제 규칙을 **VERBATIM 재사용**했다. 마커 패턴은 감사 JSON `markers` 에 원문 그대로 기록했다.

### 원본 보존

기존 SSOT·감사 결과·러너·생산 원장 **수정 0**. 신규 3파일만 생성했다.

## 8. 후속 — 다음 승인 SSOT 단계 착수 가능

게이트 전부 PASS 이고 기존 LIVE 와 교집합이 0 이므로, **READY_SPLIT 24 fp / 90 master 에 대한 승인 SSOT 단계 착수가 가능**하다.

1. 승인 SSOT 확정 WO — 90 master 전건 근거 보존 + write-owner 지정 (예상 540T)
2. HOLD_PROFESSIONAL_USE 67 — 매장 소비자 콘텐츠 대상 아님. 별도 판단 필요
3. HOLD_MULTI_ROUTE 22 — 부위별 분리 저작 여부는 콘텐츠 정책 판단 사안
4. 선행 트랙 잔여 — HOLD_ROUTE 194(미명시 154 + 상충 40) · EXCLUDE 62 · 전문용 79

## 9. Git / 무결성

- read-only 조사 · **DB write 0** · 설명서 생성 0 · LIVE apply 0 · dry-run 0
- 기존 SSOT·감사·러너·생산 원장 수정 0 · 타 세션 파일 미접촉
- 자격증명: `apps/api-server/.env` 를 `process.env` 로만 전달, 값 열람·출력·수정 0, **보존**
- `git add .` 미사용 · reset/clean/stash 미사용 · 본 산출물만 path-specific commit
