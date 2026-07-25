# CHECK-O4O-OTC-BIGCON-HOLD-REASON-MANIFEST-SYNC-DA-V1 — shard C manifest HOLD 사유 동기화 (에이전트 다)

WO: `WO-O4O-OTC-BIGCON-HOLD-REASON-MANIFEST-SYNC-DA-V1`
선행: `WO-O4O-OTC-BIGCON-HOLD-REASON-RECORD-CORRECTION-V1` (commit `0536db227`)
상태: **PASS — manifest HOLD 사유를 hold-source 정본과 동기화. HOLD 상태·대상 수 불변, DB write 0.**

## 0. 결론

> `otc-oral-combo-shardC-manifest.da.json` 의 `hold_source.reason` 구(舊) 문구
> "ko-compose SKIP: 원문 효능/용법/주의 섹션 부재" 를
> **"공식 효능·주의·이상반응은 존재하나 공식 용법·용량이 부재함. 용법 1축 미확보로 authored 설명서 저작 불가하며 용법 추정은 금지한다."** 로 정정하고,
> `sourceAxes` · `easyDrugCandidate` 를 `otc-oral-combo-shardC-hold-source.da.json` 과 **동일 구조로 복사**했다.
> **HOLD_SOURCE 유지 · 1 fp / 3 master 불변 · 설명서 생성 0 · DB 접속 0 · DB write 0.**

## 1. 대상

| 항목 | 값 |
|---|---|
| 파일 | `apps/api-server/src/scripts/data/otc-oral-combo-shardC-manifest.da.json` (agent-da 소유) |
| 블록 | `hold_source` |
| 제품 | 빅콘에스600정 · fp `44a15789a2cc1596` · 3 master |

## 2. 변경 내용

- `reason` — 구 문구 → 확정 사실 문구(`HOLD_SOURCE —` prefix 부여, hold-source 정본과 동일 의미).
- `reasonCorrectedBy` 추가 — 본 WO·일자·불변식 명시.
- `sourceAxes` 추가 — `efficacy: PRESENT` · `caution: PRESENT` · `adverseReaction: PRESENT` · `usageDosage: ABSENT`.
- `easyDrugCandidate` 추가 — `itemSeq 201404702` · `candidateId 6be75b79` · `matchStatus unmatched`.
- `detailRef` 추가 — `otc-oral-combo-shardC-hold-source.da.json` (정본 포인터, 단방향 참조).
- `fp` · `master` · `name` · `fpid` **무변경**. manifest 의 다른 모든 키 **무변경**.

## 3. 검증

| 항목 | 결과 |
|---|---|
| manifest JSON parse | **PASS** |
| hold-source JSON parse | **PASS** (동반 확인) |
| HOLD 상태 | **불변** — `HOLD_SOURCE` 유지, 해제·전환 0 |
| fingerprint | **1 → 1** (`44a15789a2cc1596`, hold-source `fp` 와 일치) |
| master | **3 → 3** (manifest `master`=3 == hold-source `size`=3) |
| `sourceAxes` 두 파일 동일 | **true** (deep-equal) |
| `easyDrugCandidate` 두 파일 동일 | **true** (deep-equal) |
| `name` 두 파일 동일 | **true** |
| manifest 기타 불변 | `producible` 68 fp/204 m · `status` DONE · `writeActual` 816/408/1224 · `canonicalDup` 0 · `fullCorpusCensus` A210/B210/C204/624 · `groups` 68 — 전부 무변경 |
| 설명서 생성 · apply | **0 / 0** |
| DB 접속 / write | **0 / 0** (프록시 미기동, 쿼리 0) |
| 용법 추정 | **없음** — 부재 축은 부재로만 기록 |
| 기존 LIVE | 3 master 의 easy_drug STORE ko canonical 3건 **무변경** |
| 라 census 파일 | **미접근** |
| 재실행 | no-op (이미 동기화 상태) |

## 4. 잔여 불일치 (본 WO 범위 밖 — 미수정)

| 파일 | 위치 | 현재 문구 |
|---|---|---|
| `otc-combo-shard-assignment-ga-v9.json` (GA 생성 **공용 SSOT**) | `shardCStatus.hold_source.reason` | "원문 효능/용법/주의 섹션 부재" |

→ 공용 SSOT 이므로 소유 세션(가) 확인 후 별도 WO 로 진행. 본 세션 미접촉.

## 5. Git / 무결성

- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 파일 미접촉
- `_msm.mjs` / `_msmx.mjs` / `apps/api-server/.env` / `otc-remaining-full-corpus-census.ts`(라) **미접촉** — untracked 상태 유지
- 자기 산출물 2개(manifest + 본 CHECK)만 path-specific stage·commit·push
