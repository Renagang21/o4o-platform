# CHECK-O4O-OTC-BULK-BATCH-02-EN-CANONICAL-PROMOTION-66-V1 — Batch 02 영문 canonical 전환 (에이전트 나)

WO: `WO-O4O-OTC-BULK-BATCH-02-EN-CANONICAL-PROMOTION-66-V1` · 일자: 2026-07-17 · 상태: **완료 (APPLY)**
담당: **에이전트 나** · 배치: **OTC Batch 02** · 선행: [EN-TRANSLATION-PERSIST-66](CHECK-O4O-OTC-BULK-BATCH-02-EN-TRANSLATION-PERSIST-66-V1.md) (커밋 `4704b2e5d`) · 근거: [실행 지침서 V1 §5](../guides/products/drug/OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md)

> **DB write = 상태 전환 UPDATE 66** (`needs_review → canonical`). content **불변** · summary **불변**(지문 md5 전후 동일) · INSERT **0** · DELETE **0** · ko canonical **0** · draft **0** · Batch 01 **0**.
> 실행: `DRUG_OTC_BATCH02_EN_PROMOTE_CONFIRM=YES npx tsx drug-otc-bulk-batch-02-en-canonical-promotion.ts --apply` (이중 게이트 + 단일 TX).

---

## 0. 결론

> **Batch 02 영문 설명서 66건 `needs_review → canonical` 전환 완료. 상태만 변경, 본문·요약 불변.**
> **→ Batch 02 = 8그룹 66 master 에 ko·en canonical 완비로 종료.**
>
> | 지표 | 값 |
> |---|---:|
> | flip (UPDATE status) | **66** |
> | content·summary 지문 (len+md5) | **66/66 동일** |
> | en canonical (post) | **66** |
> | en needs_review 잔여 (post) | **0** |
> | en canonical master당 중복 (post) | **0** |
> | ko canonical | **66 불변** |
> | 재실행 flip | **0** (멱등) |

---

## 1. 실행 전 게이트 (dry-run = apply 직전 일치)

| 게이트 | 기대 | 실측 |
|---|---:|---:|
| en needs_review | 66 | **66** |
| ko canonical | 66 | **66** |
| ko↔en master_id 일치 | 66/66 | **66/66** |
| ko↔en source_ref_id 일치 | 66/66 | **66/66** |
| 기존 en canonical 충돌 | 0 | **0** |
| Batch 01 master 교집합 | 0 | **0** |
| 대상 내부 master 중복 | 0 | **0** |
| 한글 포함 / `<table>` / 주석 / 이중 escape | 0 | **0 / 0 / 0 / 0** |
| sd-warn | 66/66 | **66/66** |
| 아르기닌 금지 표현 | 0 | **0** |
| TEST-LOG 8그룹 PASS | 8 | **8** (선행 PERSIST §2) |

> 이상 1건이라도 → ABORT(DB write 0). 실제 이상 **0** → apply.

---

## 2. 지문 검증 (content·summary 불변)

적용 전 66건 각각 `master_id · source_ref_id · content(len+md5) · summary(len+md5)` 고정 → 적용 후 동일 값 비교.

| 검증 | 결과 |
|---|---|
| content 지문 동일 | **66/66** |
| summary 지문 동일 | **66/66** (전건 summary=NULL, len 0+md5 동일) |
| flip 수 == needs_review 수 | 66 == 66 |

> TX 내 `fingerprintOk !== toFlip` 또는 `flipped !== 66` 또는 `post can/nr/dup != 66/0/0` 시 ROLLBACK 설계 — 미발동.

---

## 3. 사후검증 (독립 재조회 — 재-dry-run)

| 검증 | 결과 |
|---|---|
| en canonical | ✅ **66** |
| en needs_review 잔여 | ✅ **0** |
| ko canonical 불변 | ✅ **66** |
| content·summary 지문 불변 | ✅ 66/66 (TX 내 재확인) |
| ko↔en master_id·source_ref_id 정합 유지 | ✅ **66/66 · 66/66** |
| en canonical master당 중복 | ✅ **0** |
| 아르기닌 금지 표현 | ✅ **0** |
| Batch 01 변경 | ✅ **0** (교집합 0) |
| 대상 외 SPD 지문 불변 | ✅ (상태-only UPDATE, 대상 66행 외 무접촉) |
| 재실행 시 UPDATE 0 | ✅ 재-dry-run needs_review 0 · toFlip **0** |

---

## 4. 안전 설계 이행

| 조건 | 이행 |
|---|---|
| dry-run 우선 | ✅ |
| 단일 트랜잭션 | ✅ QueryRunner |
| 이중 승인 게이트 | ✅ `--apply` + `DRUG_OTC_BATCH02_EN_PROMOTE_CONFIRM=YES` |
| 예상 UPDATE≠66 시 롤백 | ✅ `flipped != 66` → ROLLBACK |
| canonical 중복 시 롤백 | ✅ `postDup != 0` → ROLLBACK |
| 상태 변경 후 독립 재조회 | ✅ (§3) |
| `UPDATE…RETURNING` 카운트 gotcha | ✅ `Array.isArray(res[0])?res[0]:res` 로 `[rows,affected]` 대응 |

---

## 5. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 영어 66건 canonical 전환 | ✅ |
| 상태 외 콘텐츠 변경 0 | ✅ 지문 66/66 불변 |
| 한국어 canonical 변경 0 | ✅ 66 불변 |
| Batch 01 충돌 0 | ✅ |
| 사후검증 통과 | ✅ (§3) |
| commit·push | ⏳ 본 CHECK + 전환 스크립트 |

---

## 6. 병렬 충돌 방지 준수

- Batch 01 번역·승격 파일 **미수정** · Batch 01 대상 **미변경**
- 공통 GUIDE·GLOSSARY·Registry **미수정** · Batch 02 전용 스크립트만 생성(`drug-otc-bulk-batch-02-en-canonical-promotion.ts`)
- `git add .` 금지 → 담당 산출물만 pathspec stage · 타 에이전트 미추적 파일 무접촉

---

## 7. Batch 02 종료 · 다음

> **Batch 02 완결**: 8그룹 66 master 에 ko canonical 66 + en canonical 66 완비.
>
> | 그룹 | master | ko | en |
> |---|---:|---:|---:|
> | 나프록센250연질 | 14 | ✅ | ✅ |
> | 알파칼시돌1㎍ | 10 | ✅ | ✅ |
> | 아르기닌티디아시케이트 | 10 | ✅ | ✅ |
> | 이부프로펜400연질 | 8 | ✅ | ✅ |
> | 클로닉신125연질 | 7 | ✅ | ✅ |
> | 플루벤다졸500 | 7 | ✅ | ✅ |
> | 이부프로펜아르기닌369 | 6 | ✅ | ✅ |
> | L-시스틴500 | 4 | ✅ | ✅ |
> | **합** | **66** | **66** | **66** |
>
> **커밋 체인**: READINESS `ecadbfeed` → FINALIZE `782f3f397` → KO `f9b4a8d9d` → EN-PERSIST `4704b2e5d` → **EN-CANONICAL(본 WO)**.
>
> **권고 (사용자 방향)**: 소규모 배치 반복 대신 **약 2만 OTC master 전체 대상 원문 지문 기반 자동 그룹화 전수조사**로 전환. 표기변형 병합(itemSeq/주성분코드 정규화) + 투여경로 사전필터 + 함량축 RX필터 + 저grounding/민감약효군 취급을 선행 설계하면 그룹 소진 문제 없이 확장 가능.
