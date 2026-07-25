# CHECK-O4O-OTC-BIGCON-HOLD-REASON-RECORD-CORRECTION-V1 — 빅콘에스600정 HOLD 사유 기록 정정 (에이전트 다)

WO: `WO-O4O-OTC-BIGCON-HOLD-REASON-RECORD-CORRECTION-V1`
상태: **PASS — 기록 사유만 정정. HOLD 상태·대상 수 불변, DB write 0.**

## 0. 결론

> `otc-oral-combo-shardC-hold-source.da.json` 의 HOLD 사유가 **사실과 달라** 정정했다.
> 기존 기록 "효능·용법·주의 **전부 부재**" → 실측 "**공식 효능·주의·이상반응은 존재하나 공식 용법·용량이 부재함**".
> **HOLD_SOURCE_CONFIRMED 유지 · 설명서 생성 0 · apply 0 · DB write 0 · DB 접속 0.**

## 1. 대상

| 항목 | 값 |
|---|---|
| 제품명 | 빅콘에스600정 |
| fingerprint | `44a15789a2cc1596` (1 fp) |
| master | 3 (`96b520aa…` / `ae6ada5f…` / `bf9dba11…`) |
| ATC | A11EX · MFDS 품목기준코드 201404702 |
| 소유 | 경구 복합 shard C (에이전트 다) — 자기 파일 |

## 2. 정정 근거 (확정 사실, 본 WO 입력)

| 축 | 공식 원문 | 정정 전 기록 | 실측 |
|---|:---:|:---:|:---:|
| 효능·효과 | ✅ 존재 | 부재로 기록 | **PRESENT** |
| 사용상 주의사항 | ✅ 존재 | 부재로 기록 | **PRESENT** |
| 이상반응 | ✅ 존재 | (미기재) | **PRESENT** |
| **용법·용량** | ❌ 부재 | 부재 | **ABSENT** |

- e약은요 candidate `6be75b79` (itemSeq 201404702) = **unmatched** — compose 가 매칭 원문을 보지 못한 부수 원인.
- 근거 출처: `CHECK-O4O-OTC-ORAL-COMBO-BIGCON-S600-HOLD-SOURCE-RESOLUTION-V1` §4·§6 (원문 보강 전용 세션 조사, DB write 0). 해당 CHECK §6 이 원 파일 정정을 소유 세션(다) 몫으로 남겨두었고, 본 WO 로 이행.

## 3. 수정 내용 (파일 1개)

`apps/api-server/src/scripts/data/otc-oral-combo-shardC-hold-source.da.json`

- `reason` 문자열 정정 (`HOLD_SOURCE —` prefix 유지).
- 감사 추적용 필드 추가: `reasonCorrectedBy`(WO·일자·불변식 명시), `sourceAxes`(효능/주의/이상반응 PRESENT · 용법 ABSENT), `easyDrugCandidate`(itemSeq·candidateId·matchStatus=unmatched).
- 기존 키(`fp` · `name` · `size` · `atc` · `target_ids`) **무변경**.

## 4. 검증

| 항목 | 결과 |
|---|---|
| JSON parse | **PASS** |
| HOLD 상태 | **불변** — `HOLD_SOURCE` 유지, 해제·전환 0 |
| fingerprint 수 | **1 → 1 불변** (`44a15789a2cc1596`) |
| master 수 | **3 → 3 불변** (`size`=3, `target_ids`.length=3) |
| DB write | **0** |
| DB 접속 | **0** (프록시 미기동, 쿼리 0) |
| 설명서 생성·apply | **0** |
| 용법 추정 | **없음** — 부재 축은 부재로만 기록 |
| 기존 LIVE 영향 | **0** — 3 master 의 easy_drug STORE ko canonical 3건 그대로 유지 |
| 라 census 파일 | **미접근** |

## 5. 잔여 불일치 (본 WO 범위 밖 — 미수정)

동일한 구(舊) 사유 문구가 아래 2곳에 남아 있다. 본 WO 가 지정한 파일이 아니므로 **수정하지 않았다.**

| 파일 | 위치 | 현재 문구 |
|---|---|---|
| `otc-oral-combo-shardC-manifest.da.json` (다 소유) | `hold_source.reason` | "ko-compose SKIP: 원문 효능/용법/주의 섹션 부재" |
| `otc-combo-shard-assignment-ga-v9.json` (GA 생성 공용 SSOT) | `shardCStatus.hold_source.reason` | "원문 효능/용법/주의 섹션 부재" |

→ 정정이 필요하면 별도 WO 로 지시 요망. 공용 SSOT 는 특히 소유 세션 확인 후 진행.

## 6. Git / 무결성

- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 파일 미접촉
- `_msm.mjs` / `_msmx.mjs` / `apps/api-server/.env` / `otc-remaining-full-corpus-census.ts`(라) **미접촉** — untracked 상태 유지
- 자기 산출물 2개(정정 JSON + 본 CHECK)만 path-specific stage·commit·push
- 재실행 시 no-op (파일 내용 이미 정정 상태)
