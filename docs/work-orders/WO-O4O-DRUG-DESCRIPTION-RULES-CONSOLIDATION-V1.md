# WO-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1

작성일: 2026-07-08

작업 성격:
의약품 소비자 설명서 작성 규칙 조사 · 통합 · 표준화

대상:
지금까지 O4O 프로젝트에서 생성된 의약품 설명서 관련 Guide, WO, CHECK, IR, Template, Standard 문서

금지:

새 설명서 작성

ProductMaster 변경

DB write

draft insert

canonical 승격

설명서 내용 수정

Admin 기능 개발

이번 작업은 **설명서 제작이 아니라 설명서 제작 규칙을 표준화하는 작업**이다.

---

# 1. 목적

현재 의약품 소비자 설명서 작성 규칙이 여러 Guide / WO / CHECK / IR / Template / Pilot 에 분산되어 있다.

이를 조사하여 중복을 제거하고 표준 문서를 작성하여, 향후 모든 설명서 작업의 기준으로 사용한다. 이후 작성되는 모든 WO는 본 작업에서 정리한 표준 문서를 참조한다.

---

# 2. 조사 대상

docs/guides/ · docs/work-orders/ · docs/checks/ · IR 문서 · 설명서 Template · Pilot · STANDARD · Drug/OTC/Consumer/Canonical Description 문서 · Description Draft 문서 · README · CLAUDE.md · MEMORY.md · 기타 설명서 규칙 포함 문서

---

# 3. 조사 목적 (추출 대상 규칙)

설명서 작성 원칙 · 구조 · 공유 기준 · SOURCE GAP · Grounding · Canonical 규칙 · Draft 규칙 · Group Key 규칙 · Bucket 규칙 · ATC 사용 원칙 · Read-only 조사 원칙 · DB Write 금지 · CHECK 작성 규칙 · Track Memory 규칙 · Commit/Push 규칙 · 설명서 수정 규칙 · 대표 설명서 재사용 규칙

---

# 4. 반드시 조사할 항목

## 설명서 작성
소비자 중심 · 사용 목적 중심 · 성분 설명 최소화 · 약사용 표현 금지 · 효능 과장 금지 · 허가사항 우선 · e약은요 활용 기준 · 제조사 자료 활용 기준 · 병원 진료 권고 기준 · 생활 복약지도 포함 기준

## Grouping
대표 설명서 공유 기준 · 절대 공유 금지 · 제형/투여경로/함량/허가효능/허가용법/주의사항 기준

## SOURCE GAP
대표 설명서 허용 조건 · HOLD_SOURCE 조건 · Grounding 부족 처리 · 대표 설명서 생성 조건

## 조사 방법
ATC 사용 규칙 · Route 우선 원칙 · Keyword 조사 · Read-only SQL · Cloud SQL 접속 · Grounding 조사

## CHECK
필수 항목 · 필수 표 · 완료 보고 · Track Memory

---

# 5. 산출물 표

| 규칙 | 최초 문서 | 중복 문서 | 최종 채택 | 비고 |
|------|-----------|-----------|-----------|------|

---

# 6. 표준 문서 구조 제안

조사 후 최종 표준 문서 체계를 제안한다. 예상 구조:

```text
docs/guides/drug-description/
  DRUG-DESCRIPTION-STANDARD.md
  DRUG-DESCRIPTION-GROUPING.md
  DRUG-DESCRIPTION-TEMPLATE.md
  DRUG-DESCRIPTION-PROCESS.md
  DRUG-DESCRIPTION-CHECK-STANDARD.md
```

필요 시 추가/축소 가능.

---

# 7. CLAUDE.md 정리

반드시 유지할 내용 / 표준 문서만 참조할 내용 / Memory·Guide·WO·CHECK에 둘 내용을 구분한다.

---

# 8. MEMORY.md 정리

변하지 않는 규칙만 남긴다 (예: ATC는 후보 검색용 · Route 다르면 공유 금지 · 제형 다르면 공유 금지 · 대표 설명서 우선 수정 · 신규 설명서는 공유 불가 시에만).

---

# 9. 결과 분류

각 규칙을 KEEP / MERGE / REMOVE / MOVE / NEW 로 분류하고 이유를 기록한다.

---

# 10. 최종 제안

최종 표준 문서 구성 · CLAUDE.md 개편안 · MEMORY.md 개편안 · Guide 구조 · WO 최소 규칙 · CHECK 최소 규칙.

---

# 11. 산출물

CHECK 문서: `docs/checks/CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1.md`

---

# 12. 완료 기준

기존 문서 조사 · 규칙 추출 · 중복 정리 · 표준 문서 구조 제안 · CLAUDE.md 반영 방안 · MEMORY.md 반영 방안 · KEEP/MERGE/REMOVE/MOVE 분류 · CHECK 작성 · commit · push · DB write 0

---

# 13. 완료 보고

조사 문서 수 · 추출 규칙 수 · 중복 규칙 수 · KEEP/MERGE/REMOVE/MOVE/NEW 수 · 최종 표준 문서 수 · CLAUDE.md 변경 제안 · MEMORY.md 변경 제안 · commit hash · push 여부

---

# 14. 후속 WO

`WO-O4O-DRUG-DESCRIPTION-STANDARD-DOCUMENT-APPLY-V1` — 본 WO에서 정리된 표준을 실제 Guide / CLAUDE.md / MEMORY.md / STANDARD 문서에 반영한다.
