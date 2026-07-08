# WO-O4O-DRUG-DESCRIPTION-RULES-DELTA-AUDIT-V1

작성일: 2026-07-08

작업 성격: 규칙 통합 이후 추가·변경된 의약품/콘텐츠 작성 규칙의 증분 감사

대상: `WO-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1` 이후 생성·수정된 문서와 규칙

목적: RULES-CONSOLIDATION-V1 이후 새롭게 추가·변경·누락된 규칙을 조사하여 Rule Registry(CR/DR/AR) 및 Guide 반영 필요성을 판단한다. **규칙을 새로 창작하지 않고, 후속 작업에서 실제로 확정된 규칙만 조사·분류한다.**

---

# 1. 배경

`RULES-CONSOLIDATION-V1`에서 62건을 조사·분류한 이후 다음이 진행되었다: 비염·알레르기 Batch 보강 · 구강·인후 Batch · STANDARD 문서 · DOCUMENT-ARCHITECTURE IR(→ Content Authoring 일반화) · CONTENT-DOCUMENT-ARCHITECTURE APPLY · common/content-authoring/ai/products/services 문서 체계 · CR/DR/AR Registry 실체화 · CLAUDE.md 포인터화 · MEMORY 불변식 정리.

→ 이후 추가된 규칙을 감사하여 현재 Guide/Registry에 누락이 없는지 확인한다.

---

# 2. 조사 대상

`docs/guides/{common,content-authoring,ai,products,services}/` · `docs/work-orders/` · `docs/checks/` · CLAUDE.md · MEMORY/Track memory.

우선: RULES-CONSOLIDATION CHECK · CONTENT-AUTHORING IR · APPLY CHECK · RHINITIS/ORAL-THROAT CHECK · common/* · ai/AI-RULE-REGISTRY · products/drug/DRUG-RULE-REGISTRY · CLAUDE.md.

---

# 3. 조사할 규칙 유형

문서 아키텍처 규칙 · Guide 구조 규칙 · Rule Registry 규칙 · Workflow 규칙 · AI 규칙 · 증상군 Batch 이후 추가 규칙 · 문서 운영 규칙. (상세는 §5 delta 표로 추출.)

---

# 4. 분류 기준

| 분류 | 의미 |
|---|---|
| EXISTING | 기존 Registry에 이미 있음 |
| NEW_RULE | 신규 Rule ID 필요 |
| MERGE | 기존 Rule에 병합 |
| UPDATE | 기존 Rule 설명 보강 필요 |
| ARCHIVE | 역사 기록/구조 문서로만 보존 |
| CONFLICT | 기존 규칙과 충돌, 판단 필요 |

---

# 5. 산출 표

CHECK에 작성:

| delta_id | candidate_rule | source_doc | current_registry | classification | proposed_action | note |
|---|---|---|---|---|---|---|

---

# 6. 반영 계획

감사가 목적. 기본값 = **문서 수정 최소화**. 허용: CHECK 작성 · 누락 규칙 목록 · Registry 반영 필요성 제안 · 후속 APPLY WO 제안.

금지: Rule Registry 직접 대량 수정 · 기존 Guide 대량 이동 · 기존 CHECK/WO 삭제 · CLAUDE.md 대규모 수정 · MEMORY 대규모 수정 · 코드 변경 · DB write.

---

# 7. CHECK 문서

`docs/checks/CHECK-O4O-DRUG-DESCRIPTION-RULES-DELTA-AUDIT-V1.md`

필수: 조사 문서 수 · 추가 후보 규칙 수 · EXISTING/NEW_RULE/MERGE/UPDATE/ARCHIVE/CONFLICT 수 · Registry 반영 필요 항목 · Guide 보강 필요 항목 · CLAUDE.md 변경 필요 여부 · MEMORY 변경 필요 여부 · 후속 APPLY 필요 여부 · DB write 0 · commit hash · push 여부.

---

# 8. 완료 기준

CONSOLIDATION 이후 문서 조사 · 추가/변경 규칙 후보 추출 · CR/DR/AR 대조 · delta_id 부여 · 분류 · CHECK 작성 · DB write 0 · 코드 변경 0 · commit · push · 완료 보고.

---

# 9. 완료 보고

조사 문서 수 · 추가 후보 규칙 수 · 분류별 수 · Registry/Guide 보강 필요 여부 · CLAUDE.md/MEMORY 변경 필요 여부 · 후속 APPLY 필요 여부 · DB write 0 · commit hash · push 여부.

---

# 10. 후속 WO

필요 시 `WO-O4O-CONTENT-RULES-DELTA-APPLY-V1` — NEW_RULE/UPDATE/MERGE 규칙을 CR/DR/AR Registry와 해당 Guide에 실제 반영. 기존 문서 삭제 금지, CHECK/WO 역사 보존.
