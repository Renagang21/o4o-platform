# WORKFLOW — 콘텐츠 작성 → 검토 → 승인 → 배포

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](DOCUMENT-INDEX.md)

> `CONTENT-PROCESS`(작업 절차)와 `CONTENT-PIPELINE`(draft→canonical 승격)을 하나로 통합한 단일 흐름. 모든 제품군·서비스·콘텐츠 유형에 공통 적용된다.

---

## 1. 전체 흐름

```text
작성(draft) → 검토(review) → 승인(approve) → 배포(publish)
```

| 단계 | 하는 일 | 산출/상태 |
|---|---|---|
| **작성** | WO 스코프 → read-only 조사 → 후보 분류 → grounding 확인 → 대표 콘텐츠 초안 | draft (dry-run, DB write 0) |
| **검토** | 전문가(약사 등)·AI 검수, SOURCE GAP 판정, HOLD/EXCLUDE 분리 | needs_review |
| **승인** | 중앙 승인 + 이중게이트 → draft 적재 / SPD 승격 | approved / needs_review 적재 |
| **배포** | canonical 승격(별도 승인) → storefront·태블릿 노출 | canonical |

## 2. 작성 (draft)

- 순서: **WO → 조사 → grounding → 작성 → CHECK → commit → push**.
- **read-only 조사만.** DB write 0. 원문 grounding 없이 성분·효능·수치 창작 금지(→ CR-004).
- 근거 없으면 HOLD (→ CR-007).
- 상세 작성 규칙은 제품군 Guide(예: products/drug/DRUG-WRITING·DRUG-TEMPLATE) 참조.

## 3. 검토 (review)

- 전문가 검수(민감·고위험은 검토 강화) + AI 검수(ai/AI-REVIEW).
- SOURCE GAP 게이트: 효능·용법·주의 수렴 시 대표 작성, 아니면 HOLD_SOURCE(→ CR-007, DR).
- 결과 상태: `needs_review`(미노출) / `manual_curation` / `blocked` / `excluded`.

## 4. 승인 (approve) — 이중게이트

- **draft 적재**: `product_candidate_description_drafts`, review_status=`needs_review` 고정, ai_* null.
- **이중게이트**: `--apply` 플래그 + env `CONFIRM=YES`. 기본은 dry-run.
- **단일 트랜잭션 + 검산**: run 식별자로 적재 수 == 기대치 확인 후 commit, 불일치 시 rollback.
- **rollback**: soft delete(`deleted_at=NOW()`), run 식별자로만.
- **상태 변경 권한**: `approved_for_import`·`imported`는 중앙 전용. 개별 작업방 직접 변경 금지. 모든 변경은 CHECK 근거.

## 5. 배포 (publish) — canonical

- SPD 승격은 우선 `status='needs_review'`(미노출)로 적재 → 화면 무변경(안전).
- **canonical 승격은 항상 별도 승인**(→ CR-009). master당 canonical 1개(partial unique) 불변, 기존 canonical 보존.
- display는 `(master_id + canonical)`로만 조회. 대상 master 전체 N-copy 전개.

## 6. 금지

- 조사 단계 DB write / 승인 없는 canonical 승격 / 이중게이트 우회 / 중앙 외 상태 변경 / DB 비밀정보 문서·커밋 기록.
