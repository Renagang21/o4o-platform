# WO-O4O-CONTENT-RULES-DELTA-APPLY-V1

작성일: 2026-07-08
성격: DELTA-AUDIT 확정 규칙의 실제 반영(Registry·Guide·ADR·Knowledge Catalog)
선행: `CHECK-O4O-DRUG-DESCRIPTION-RULES-DELTA-AUDIT-V1`(§10 OR/KB/ADR 분리)

---

# 확정 범위

- **CR 추가**: CR-015~019 (문서 아키텍처 정체성·결정 계보)
- **DR 추가**: DR-018 (성분별↔세대/계열 대표 공존)
- **AR 보강**: AR-005 (편집·검수·번역 보조 제한)
- **OR 생성**: `docs/guides/common/OPERATIONAL-RULE-REGISTRY.md`, OR-001~004
- **Knowledge Catalog 3종**: `products/drug/knowledge/{ATC-FALSE-POSITIVE-CATALOG,GROUPING-PATTERNS,CONSUMER-WRITING-PATTERNS}.md`
- **ADR 폴더+템플릿**: `docs/adr/` + `ADR-TEMPLATE.md` (+ README 인덱스)
- **CHECK-STANDARD 보강**: 적용 ProductMaster 수 명시

# 조건

기존 IR 소급 변환 금지 · 기존 CHECK/WO 삭제 금지 · 기존 Guide 대량 이동 금지 · DB write 0 · 코드 변경 0 · 설명서 신규 작성 0.

# 완료 기준

문서 반영 · Rule Registry 정합 · DOCUMENT-INDEX/ARCHITECTURE 참조 확인 · CHECK 작성 · commit · push.

# CHECK

`docs/checks/CHECK-O4O-CONTENT-RULES-DELTA-APPLY-V1.md`

# 완료 보고

생성 문서 수 · 수정 문서 수 · 추가 Rule 수 · KB 생성 수 · ADR 생성 여부 · DB write 0 · commit hash · push 여부.
