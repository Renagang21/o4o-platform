# WO-O4O-CONTENT-DOCUMENT-FINAL-AUDIT-V1

작성일: 2026-07-08
성격: O4O 콘텐츠 제작(의약품 설명서 중심) 문서 체계 최종 감사(Final Audit)
대상: 현재 구축된 Guide·Registry·Knowledge·ADR·IR·WO·CHECK·CLAUDE.md 관련 문서

금지: DB write · 코드 변경 · 설명서 신규 작성 · Rule Registry 신규 생성 · **문서 삭제 · 문서 이동**

> 이번 작업은 "현재 문서 체계가 운영 가능한 수준인지 **최종 검증**"이 목적이다. **삭제 작업 아님.** 정리 대상 식별까지만.

---

# 1. 목적

CONSOLIDATION → ARCHITECTURE → APPLY → DELTA-AUDIT → DELTA-APPLY 과정을 기준으로 현재 문서 체계를 재조사한다. 새 규칙 창작이 아니라 **누락·중복·잘못된 위치·참조 오류·운영 문제·미사용 문서**를 확인한다.

# 2. 조사 대상

`docs/guides/{common,content-authoring,ai,products,services}/` · Knowledge Catalog · Rule Registry(CR/DR/AR/OR) · ADR · IR · WO · CHECK · CLAUDE.md · DOCUMENT-INDEX/ARCHITECTURE/WORKFLOW/CHECK-STANDARD · Track Memory.

# 3. 감사 항목 (A~J)

A 규칙 누락 · B 규칙 중복 · C 잘못된 위치 · D 문서 계층 유지 · E Guide=SSOT 역할 · F Registry(CR/DR/AR/OR) 분리 적절성 · G Knowledge 추가 필요 · H Workflow 충분성 · I AI(Prompt/Grounding/Review/Safety) 완비 · J 참조 무결성.

# 4~5. 문서 분류 + 기준

ACTIVE(운영) · REFERENCE(참고) · ARCHIVE(역사 보존) · DEPRECATED(미사용, 삭제 안 함) · DELETE_CANDIDATE(삭제 가능).

# 6. 필수 표

```text
| 문서 | 현재 역할 | 대체 문서 | 상태 | 조치 | 이유 |
```

# 7. 품질 평가

문서 구조·참조 구조·규칙 구조·Registry·Knowledge·AI·Workflow·ADR·운영 가능성 → A/B/C/D 등급.

# 8. 최종 판단

READY · MINOR FIX · MAJOR FIX · NOT READY.

# 9. 산출물

CHECK: `docs/checks/CHECK-O4O-CONTENT-DOCUMENT-FINAL-AUDIT-V1.md`. 필수: 조사 문서 수 · 분류별 수 · 누락/중복/참조오류 수 · Guide/Registry/Knowledge 보강 필요 수 · READY 여부.

# 10. 완료 기준

전체 조사·분류·규칙/참조/Workflow/Registry/Knowledge/AI 감사 · CHECK · commit · push · DB write 0 · 코드 변경 0.

# 11. 완료 보고

조사 문서 수 · ACTIVE/REFERENCE/ARCHIVE/DEPRECATED/DELETE_CANDIDATE · 누락/중복/참조오류 · READY 여부 · commit hash · push 여부.

# 12. 후속 WO

READY 시 → `WO-O4O-CONTENT-DOCUMENT-CLASSIFICATION-V1`(문서 확정 분류) → 사용자 승인 → `WO-O4O-CONTENT-DOCUMENT-CLEANUP-V1`(실제 삭제·정리). **본 WO는 식별까지만.**
