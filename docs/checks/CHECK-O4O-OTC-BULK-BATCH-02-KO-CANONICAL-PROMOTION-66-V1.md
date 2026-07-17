# CHECK-O4O-OTC-BULK-BATCH-02-KO-CANONICAL-PROMOTION-66-V1 — Batch 02 한국어 canonical 승격 (에이전트 나)

WO: `WO-O4O-OTC-BULK-BATCH-02-KO-CANONICAL-PROMOTION-66-V1` · 일자: 2026-07-17 · 상태: **완료 (APPLY)**
담당: **에이전트 나** · 배치: **OTC Batch 02** · 선행: [FINALIZE-DRYRUN](CHECK-O4O-OTC-BULK-BATCH-02-KO-FINALIZE-DRYRUN-AGENT-NA-V1.md) (커밋 `782f3f397`) · 대상 SSOT: `apps/api-server/src/scripts/data/otc-batch-02-ko-final-v1.json`

> **DB write = INSERT 66 (canonical 신규).** UPDATE **0** · DELETE **0** · draft 변경 **0** · Batch 01 변경 **0** · 공통 파일 변경 **0**.
> 실행: `DRUG_OTC_BATCH02_PROMOTION_CONFIRM=YES npx tsx drug-otc-bulk-batch-02-ko-canonical-promotion.ts --apply` (이중 게이트 + 단일 TX). 채널: Cloud SQL Proxy v2 (`127.0.0.1:5433`).

---

## 0. 결론

> **Batch 02 8그룹 · 66 master 에 한국어 STORE canonical 신규 생성 완료.** 아르기닌티디아시케이트 10건 포함(현행 draft — 사용자 승인 (A)).
>
> | 지표 | 값 |
> |---|---:|
> | INSERT (ko STORE canonical) | **66** |
> | ko STORE canonical(mfds_drug_otc) 총계 | 985 → **1,051** (Δ **+66**) |
> | UPDATE / DELETE | **0 / 0** |
> | Batch 01 master canonical | 395 → **395** (불변) |
> | master당 canonical 중복 | **0** |
> | 재실행 promotable | **0** (멱등 no-op) |

---

## 1. 적용 조건 (실측)

```text
description_type = STORE · language = ko · status = canonical · source_type = mfds_drug_otc
source_ref_id  = 그룹 candidate_id   content = buildDrugOtcConsumerHtml(구조화 필드)   summary = summaryTable['성분']
INSERT: WHERE NOT EXISTS(canonical)  → 기존 canonical 절대 보존, 멱등
```

- **bodyMarkdown 미사용**(CR-021) · draft 수정 0 · 신규 INSERT만.
- 열거 = `name LIKE '%(성분)'` + `split_part(spec,' / ',1)=함량` + `formCase=제형키워드`(연질캡슐 우선) — 승격 스크립트(herbal) 패턴 복제.

---

## 2. 실행 전 게이트 (apply 직전 재열거 — dry-run과 일치)

| 게이트 | 기대 | 실측 |
|---|---:|---:|
| 대상 그룹 | 8 | **8** |
| 대상 master (promotable) | 66 | **66** (dry-run 66 재현) |
| Batch 01 교집합 | 0 | **0** (targets 66 ∩ Batch01 586) |
| 대상 내부 중복 | 0 | **0** |
| 기존 STORE canonical 충돌 | 0 | **0** (NOT EXISTS 가드) |
| rx 혼입 | 0 | **0** |
| 비경구 혼입 | 0 | **0** (name 비경구 키워드 0) |
| 빌더 필수필드 누락 | 0 | **0** |
| candidateId 정합 | 8/8 | **8/8** |

> 이상 1건이라도 발생 시 **ABORT (DB write 0)** 설계. 실제 이상 **0** → apply 진입.

---

## 3. apply 결과 (그룹별)

| # | groupKey | INSERT | sd-warn | `<table>` | 주석 | master당 중복 |
|---|---|---:|---:|:---:|:---:|:---:|
| 1 | 나프록센\|250밀리그램\|연질캡슐 | 14 | 14 | 0 | 0 | 0 |
| 2 | 알파칼시돌\|1마이크로그램\|연질캡슐 | 10 | 10 | 0 | 0 | 0 |
| 3 | **아르기닌티디아시케이트\|200밀리그램\|연질캡슐** | **10** | 10 | 0 | 0 | 0 |
| 4 | 이부프로펜\|400밀리그램\|연질캡슐 | 8 | 8 | 0 | 0 | 0 |
| 5 | 클로닉신리시네이트\|125밀리그램\|연질캡슐 | 7 | 7 | 0 | 0 | 0 |
| 6 | 플루벤다졸\|500밀리그램\|정 | 7 | 7 | 0 | 0 | 0 |
| 7 | 이부프로펜아르기닌\|368.9밀리그램\|정 | 6 | 6 | 0 | 0 | 0 |
| 8 | L-시스틴\|500밀리그램\|연질캡슐 | 4 | 4 | 0 | 0 | 0 |
| | **합** | **66** | **66** | **0** | **0** | **0** |

---

## 4. 사후검증 (독립 재조회 — `otc-batch02-postverify.mjs`)

| 검증 | 결과 |
|---|---|
| ko canonical 66건 신규 생성 | ✅ **66/66** (source_type=mfds_drug_otc · source_ref_id 정합) |
| 그룹별 수량 합계 66 | ✅ (§3) |
| **아르기닌 10건 포함** | ✅ **10** |
| 기존 canonical 덮어쓰기 | ✅ **0** (UPDATE 경로 없음) |
| canonical 중복(master당 >1) | ✅ **0 / 66** |
| route 전건 oral | ✅ (비경구 0) |
| rx 혼입 | ✅ **0** |
| 내부 주석(`<!--`) | ✅ **0** |
| `<table>` | ✅ **0** |
| `sd-warn` | ✅ **66/66** |
| 대상 외 canonical 지문 불변 | ✅ ko STORE canonical Δ=+66 (정확히 신규분만) · **Batch 01 canonical 395 불변** |
| Batch 01 대상 변경 | ✅ **0** |
| 재실행 시 INSERT 0 | ✅ 재-dry-run promotable **0** (전 그룹 `0 !== newInsert`로 ABORT = 잔여 없음) |

---

## 5. 안전 설계 이행

| 조건 | 이행 |
|---|---|
| dry-run 66 == apply 직전 열거 66 | ✅ |
| 단일 트랜잭션 | ✅ (QueryRunner startTransaction/commit) |
| 이중 승인 게이트 | ✅ `--apply` + `DRUG_OTC_BATCH02_PROMOTION_CONFIRM=YES` |
| 대상 외 canonical 지문 불변 | ✅ INSERT-only · Batch 01 canonical 수 사후 재확인 후 commit |
| 그룹별 INSERT 수 기록 | ✅ (§3) |
| 계약 중복 시 롤백 | ✅ post `HAVING count>1` · `inserted!=66` · `Batch01 변동` → ROLLBACK 설계(미발동) |

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| Batch 02 전체 8그룹 승격 | ✅ |
| 한국어 canonical INSERT 66 | ✅ **66** |
| UPDATE·DELETE 0 | ✅ |
| Batch 01과 충돌 0 | ✅ 교집합 0 · Batch01 canonical 불변 |
| 사후검증 통과 | ✅ (§4) |
| commit·push | ⏳ 본 CHECK + 승격 스크립트 |

---

## 7. 병렬 충돌 방지 준수

- Batch 01 대상·스크립트·CHECK **미수정** · 공통 GUIDE·GLOSSARY·Registry·번역 JSON **미수정**
- Batch 02 전용 스크립트만 생성(`drug-otc-bulk-batch-02-ko-canonical-promotion.ts`) · 대상 SSOT = `data/otc-batch-02-ko-final-v1.json`(선행 커밋)
- 사후검증 probe(`otc-batch02-postverify.mjs` 등)는 read-only·**미커밋**
- `git add .` 금지 → 담당 산출물만 pathspec stage

---

## 8. 다음 (en 전개)

> **동일 8그룹 · 66 master 로 영문 번역 진행.** 실행 지침서 §3~§5:
> - §3 그룹당 en 번역 1건(8건) — 전용 파일 `otc-en-translations-batch-02-v1.json`, GUIDE/GLOSSARY 버전·TEST-LOG.
> - §4 en needs_review 전개 66건(ko↔en `master_id`·`source_ref_id` 1:1).
> - §5 검수 → en canonical 전환 66.
> - 아르기닌 en 도 현행 ko(허가 원문 충실) 기준 번역 — 효능 확장 금지.
