# CHECK-O4O-OTC-REMAINING-READY-SHARD-DA-V2-PREFLIGHT — V2 다 shard 사전검증 · 러너 fp 산식 상충 (에이전트 다)

WO: `WO-O4O-OTC-REMAINING-READY-SHARD-DA-V2`
기준 commit: `81b39da72` (HEAD 일치) · SSOT: `otc-remaining-shard-assignment-ssot-v2.json`
상태: **BLOCKED_TOOLING — 대상 검증 전부 GREEN. 정본 러너가 V2 fingerprint 를 재현 불가(산식 상충)하여 저작·dry-run 착수 불가. DB write 0.**

## 0. 결론

> V2 다 shard **238 fp / 839 master** 는 구조·격리·축 정합 **전 항목 PASS**. V1 결함(D1~D5)은 실측으로 소거 확인.
> 그러나 정본 러너 `otc-oral-combo-store-leaflet-runner.ga.ts` 의 fingerprint 산식이 **V2 census 산식과 다르다**. 러너의 재현 게이트(`재계산 fp == targetFp`)는 V2 fp 238건 **전량 실패**한다.
> 중지 조건 "V2 SSOT와 실측 불일치 / identity·route 상충" 해당 → **착수 전 중지**. 설명서 생성 0 · apply 0 · DB write 0 · DB 접속 0.

## 1. 대상 검증 (전 항목 PASS)

| 게이트 | 결과 |
|---|---|
| 기준 commit | HEAD == `81b39da72` **일치** |
| 사용 SSOT | V2 전용. V1(`-v1.json` · `ssot-v1.json`) **미사용**, `supersedes.status=SUPERSEDED_FOR_PRODUCTION` 확인 |
| 다 fp / master | **238 / 839** — WO 선언 일치. fpList unique 238, masterIds unique 839 |
| readyGroups ↔ SSOT masterIds | 238 group · masterSum 839 · **집합 완전 일치** |
| fp 교집합 da∩ga / da∩na / ga∩na | **0 / 0 / 0** |
| master 교집합 da∩ga / da∩na / ga∩na | **0 / 0 / 0** |
| shard 합계 | fp 716 / master 2,517 — totals 일치 |
| 기존 완료분 교집합 | `readyCompleteIntersection` 0 (라 게이트) |
| **CLQ/CDS/CSI 651m** ∈ 다 | **0 fp** — 전량 HOLD_ROUTE 격리 |
| allowlist 미등재 접미 ∈ 다 | **0 fp** |
| **빅콘에스600정** ∈ 다 / ∈ 전체 READY | **0 / 0** |
| 수출명·대용량 혼입 | `exportNameInReady` 0 · `readyNoExportOrBulk` true |
| **축 정합** — gencode 접미 ↔ route/form | **불일치 0 fp** (238/238 allowlist 정합) |
| fp ↔ gencode | **1:1** (238 fp = 238 distinct gencode, 9자리) · 조성 균질 `heterogeneousFpCount` 0 |

**다 route 분포** (SSOT 선언과 완전 일치): oral 206 fp/697 m · topical 20 fp/87 m · ophthalmic 9 fp/38 m · oromucosal 3 fp/17 m.

## 2. 중지 사유 — 러너 fingerprint 산식 상충

### 산식 대조

| | 산식 | 축 |
|---|---|---|
| **V2 census** (`otc-remaining-full-corpus-census-v2.ts:306`) | `H([ H(norm(ind)), H(norm(dos)), H(norm(cau)), gencode, route ])` | **5축** — 원문 3축 + **일반명코드** + 코드 유래 route. **제품명 미개입** |
| **정본 러너** (`otc-oral-combo-store-leaflet-runner.ga.ts:59`) | `H([ H(norm(ind)), H(norm(dos)), H(norm(cau)), H(ingredientOf(name)\|strengthOf(spec)), H(formOf(name)), routeSig(name) ])` | **6축** — 원문 3축 + **제품명 유래** 성분·함량·제형·경로 |

앞 3축은 동일 구성이나 **4축 이후가 구조적으로 다르다**(구성요소 수 5 vs 6, gencode vs 제품명 파생). 따라서 러너의 재현 게이트는 V2 fp 를 **하나도 재현할 수 없다** — 238/238 실패가 확정적이다.

핵심은 V2 census 가 D1 정정으로 **제품명을 축 판정에서 완전 배제**한 반면, 러너는 여전히 `ingredientOf(name)` · `formOf(name)` · `routeSig(name)` 에 의존한다는 점이다. 즉 러너는 **V1 축 체계의 구현체**다.

### 부수 제약

- 러너 `:82` 는 `route !== 'oral'` 을 anomaly 로 판정 → fp 가 맞더라도 **topical 20 fp/87 m · ophthalmic 9 fp/38 m · oromucosal 3 fp/17 m (계 32 fp / 142 m)** 는 처리 불가.
- 섹션 버킷팅도 상이하다(러너 `easySections`/`freeSections`/`bucketSections` vs census `sections`). 축 상충 해소 후 별도 정합 확인 필요.

### 영향 범위

이 상충은 다 세션 고유가 아니라 **가·나·다 공통**이다. LIVE apply 1순위인 **가 세션이 동일 지점에서 먼저 막힌다.** 세 세션이 중복 발견하지 않도록 본 CHECK 로 선기록한다.

## 3. DB 채널

| 항목 | 상태 |
|---|---|
| `apps/api-server/.env` | **미배치** (WO 상 사용자 직접 배치 예정). 열람·출력 없음 |
| `127.0.0.1:5442` | **LISTENING** 확인 |
| 루트 `.env` | **미사용** |

## 4. 검증 수치 (본 세션)

| 항목 | 값 |
|---|---|
| 대상 fingerprint / master | 238 / 839 (배정) · 착수 **0 / 0** |
| PASS / REVIEW / HOLD | 대상 검증 **238 fp 전량 PASS** / 0 / 0 |
| dry-run | **미실행** (러너 부적합 · .env 미배치) |
| apply | **미실행** (순번상 나 독립검증 완료 후) |
| canonicalDup | **0** (신규 생성 0) |
| 사후검증 | 해당 없음 |
| DB write / DB 접속 | **0 / 0** |
| 설명서 생성 | **0** |
| 금지 집합 접근 | CLQ/CDS/CSI · HOLD_* · SPLIT · EXCLUDE · 빅콘에스600정 **전부 0** |

## 5. 요청 — 진행에 필요한 결정

1. **V2 러너 확보** (필수) — ① V2 전용 러너 신규 작성(fp = census 산식 그대로, gencode 를 `product_identifiers.MFDS_CODE ↔ candidates.raw_payload->>'mfdsCode'` 조인으로 취득, route = 접미 allowlist), ② 또는 정본 러너를 V2 축으로 개정. ②는 가·나·다 공용 자산 개정이므로 Shared Module Change Protocol 대상 — **①을 권장**한다(V1 러너 무변경 보존).
2. **비-oral route 처리** — 신규 러너의 route 허용 집합에 topical·ophthalmic·oromucosal 포함 여부. 미포함 시 다 shard 는 oral 206 fp/697 m 로 축소된다.
3. **작성 주체** — 러너를 다 세션이 작성할지, 가 세션(1순위 apply) 또는 라 세션이 작성해 3 세션이 공유할지. **단일 작성·공유**를 권장한다.
4. **.env 배치** — 배치 후 알려주시면 즉시 dry-run 준비에 착수한다.

## 6. Git / 무결성

- read-only 조사만 · DB 접속 0 · 설명서 생성 0 · apply 0
- V1/V2 census·SSOT 산출물 **읽기 전용 참조, 수정 0** · 러너 파일 **수정 0**
- `apps/api-server/.env` 미열람(미배치) · 루트 `.env` 미사용 · `_msm.mjs` / `_msmx.mjs` 미접촉
- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 파일 미접촉 · 본 CHECK 만 path-specific commit
