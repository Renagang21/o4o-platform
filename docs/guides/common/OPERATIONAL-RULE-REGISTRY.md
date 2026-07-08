# OPERATIONAL-RULE-REGISTRY (OR) — 운영/Git/문서 관리 규칙

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](DOCUMENT-INDEX.md)

> 콘텐츠 작성 규칙이 아니라 **문서·저장소·병렬 협업 운영** 규칙. CR 비대화를 막기 위해 분리한 4번째 Registry 계층.
> 콘텐츠 공통은 [CR](CONTENT-RULE-REGISTRY.md) · 의약품은 [DR](../products/drug/DRUG-RULE-REGISTRY.md) · AI는 [AR](../ai/AI-RULE-REGISTRY.md).
> 정본 이력: `CHECK-O4O-DRUG-DESCRIPTION-RULES-DELTA-AUDIT-V1 §10` · 실증 = `CHECK-O4O-CONTENT-DOCUMENT-ARCHITECTURE-APPLY-V1`.

---

| Rule ID | 요지 | 근거 | 상태 |
|---|---|---|---|
| **OR-001** | 기존 문서 **대량 삭제 금지** — Guide/CHECK/WO/IR은 역사로 보존. 정리는 삭제가 아니라 헤더·참조 변경으로 | APPLY CHECK §2 | active |
| **OR-002** | 참조 많은 기존 문서는 **물리 이동보다 운영 이관 헤더 + 참조 변경 우선**(예: WRITING-GUIDE 66참조 → 원위치 보존 + 헤더) | APPLY CHECK §2 | active |
| **OR-003** | 이미 push된 히스토리는 **force rewrite 금지** — 병렬 세션 작업 보호(commit 메시지 오염이 있어도 재작성보다 후속 커밋으로 정정) | APPLY CHECK §7 | active |
| **OR-004** | 동시 세션에서는 **path-specific commit**(`git add <경로>`) 사용, `git add -A` 지양 — 타 세션 스테이징 번들 방지 | APPLY CHECK §7 정황 | active |

> 신규 운영 규칙은 OR-005부터 부여한다. 서비스별 운영 특성은 OR가 아니라 `services/*`에서 OR Rule ID를 참조해 기술한다.
