# CHECK — WO-O4O-OTC-BIGCON-HOLD-REASON-SHARD-SSOT-SYNC-GA-V1

**세션:** 에이전트 가 · 기계 sohae · 2026-07-25
**대상 파일:** `apps/api-server/src/scripts/data/otc-combo-shard-assignment-ga-v9.json` (공용 shard SSOT) — `shardCStatus.hold_source.reason`
**판정:** **SYNCED** — 사유 문구만 정정. HOLD_SOURCE_CONFIRMED 유지 · **DB write 0**
**base:** `0536db227` (다 세션 HOLD 상세 기록 정정 포함), HEAD == origin/main

---

## 1. 변경 전/후

| | 값 |
|---|---|
| **before** | `"원문 효능/용법/주의 섹션 부재"` |
| **after** | `"HOLD_SOURCE — 공식 효능·주의·이상반응은 존재하나 공식 용법·용량이 부재함. 용법 1축 미확보로 authored 설명서 저작 불가(용법 추정 금지). 원문 보강 전 생산 불가."` |

추가 필드 1개: `reasonCorrectedBy` — 정정 근거(WO·commit) 감사선. 그 외 필드 추가/삭제/변경 없음.

실제 diff: **2 insertions / 1 deletion** (해당 파일 단일, 사유 라인 한정).

## 2. 확정 근거

| # | 근거 | 내용 |
|---|------|------|
| 1 | commit `26be5839f` | 빅콘에스600정(fp `44a15789a2cc1596`, itemSeq 201404702) 공식 원문 재조사 → **효능·주의·이상반응 3축 PRESENT / 용법·용량 1축 ABSENT**, HOLD_SOURCE_CONFIRMED, DB write 0 |
| 2 | commit `0536db227` | 다 세션이 `otc-oral-combo-shardC-hold-source.da.json` 의 HOLD 사유를 동일 사실로 정정 |
| 3 | CLAUDE.md 콘텐츠 작성 불변 원칙 | 공식 원문에 없는 용법·용량을 LLM/일반지식으로 생성 금지 → 저작 불가 상태 유지 |

기존 SSOT 문구("효능/용법/주의 전부 부재")는 **부정확**했다. 실제로 효능·주의·이상반응은 공식 e약은요 원문에 존재하며, 3 master 전부 STORE ko `canonical` 로 **이미 LIVE** 상태다.

## 3. 다 세션 최신 HOLD 파일과 의미 일치

`otc-oral-combo-shardC-hold-source.da.json` (다 소유, 본 세션 **미수정**) 과 대조:

| 항목 | 다 파일 | shard SSOT (정정 후) | 일치 |
|------|---------|----------------------|:---:|
| reason 문자열 | (원문) | **완전 동일 문자열** | ✅ |
| fp | `44a15789a2cc1596` | `44a15789a2cc1596` | ✅ |
| name | 빅콘에스600정 | 빅콘에스600정 | ✅ |
| master(size) | 3 | 3 | ✅ |
| sourceAxes | efficacy/caution/adverseReaction=PRESENT, usageDosage=ABSENT | reason 문구로 동일 의미 표현 | ✅ |
| HOLD 상태 | 유지 | `untouched: true` 유지 | ✅ |

## 4. 검증 결과 (전 항목 PASS)

| 검증 | 결과 |
|------|------|
| JSON parse (SSOT + 다 HOLD 파일) | PASS |
| summary A/B/C fp = 70/70/69 | 불변 PASS |
| summary A/B/C master = 210/210/207 | 불변 PASS |
| total 209 fp / 627 master | 불변 PASS |
| shards 배열 길이 70/70/69 | 불변 PASS |
| shardAStatus·shardBStatus·shardCStatus = DONE | 불변 PASS |
| hold_source fp=1 / master=3 | 불변 PASS |
| hold_source fpid·name = 다 파일과 동일 | PASS |
| hold_source.untouched = true | 불변 PASS |
| reason == 다 파일 reason (문자 동일) | PASS |
| fullCorpusCensus 624/624/624 · canonicalDup 0 | 불변 PASS |

## 5. 금지사항 준수

- **HOLD 해제 없음** — HOLD_SOURCE_CONFIRMED 유지, 생산 대상 복귀 없음
- **용법 추정 없음** — 용법·용량 텍스트 생성·보강 0
- **DB 접속 0 / DB write 0** — 문서·SSOT 문자열 정정 전용
- shard C DONE 상태·수량·배정 불변, A/B 무영향
- 다 세션 소유 파일(`otc-oral-combo-shardC-hold-source.da.json`, `otc-oral-combo-shardC-manifest.da.json`) **미수정**
- `git add .` / reset / clean / stash 미사용 — path-specific stage만 사용

## 6. 재개 조건 (변동 없음)

itemSeq 201404702 의 **공식 용법·용량**이 검증가능 형태로 확보될 때만 HOLD 해제:
MFDS OpenAPI `UD_DOC_DATA` 확보 · e약은요 `useMethodQesitm` non-null 갱신 · 승인된 공식 허가사항 원문 첨부 중 하나.
확보 전까지 기존 easy_drug ko canonical 3건이 LIVE 설명서로 유지된다(제거 금지).

## 7. 산출물

- `apps/api-server/src/scripts/data/otc-combo-shard-assignment-ga-v9.json` (사유 정정)
- 본 CHECK
