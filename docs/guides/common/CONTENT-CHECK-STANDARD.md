# CONTENT-CHECK-STANDARD — CHECK 문서 작성 규칙

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](DOCUMENT-INDEX.md)

> CHECK는 **규칙을 설명하지 않는다.** 무엇을 적용·검증했는지와 **결과만** 기록한다. 규칙은 Guide(CR/DR/AR)에 있고 CHECK는 Rule ID로 참조한다.

---

## 1. 필수 항목

```text
후보 수
bucket별 수
grounding 수
대표 콘텐츠 수
대표 콘텐츠 목록 (group_key 단위)
적용 대상 수 (ProductMaster 등, 총 / grounded)
HOLD_SOURCE 수
EXCLUDE 수 / 제외 사유
SOURCE GAP 적용 결과
경로/제형/제품군 오혼입 제외 결과
DB write (반드시 0 확인)
commit hash
push 여부
```

## 2. 필수 표

```text
| group_key | bucket | route | dosage_form | efficacy_signature | master_count | grounding | action | reason |
```

## 3. 작성 원칙

- 규칙 재기술 금지 → 필요 시 `CR-004`, `DR-002` 처럼 Rule ID로 참조.
- 사용한 기준 문서는 경로+ID로 명시(예: `products/drug/DRUG-WRITING`, `DR-006`).
- 수치는 read-only 조사 실측치. 추정은 표기(`~`) 하고 근거를 남긴다.
- DB write는 항상 명시적으로 `0` 또는 실제 적재 행 수 + run 식별자 + rollback 방법.

## 4. 완료 보고 (WO 완료 시)

```text
후보 · grounding · 대표 콘텐츠 · 대표 목록 · 적용 대상 수 · HOLD · EXCLUDE · DB write · commit · push
```

## 5. Track Memory 연계

배치 종료 시 track memory(`wo-drug-otc-description-*-track` 등)에 기록: 대표 콘텐츠(수/group_key) · 적용 대상 · 특이사항(ATC≠route·성분/함량축 등) · HOLD · canonical 이슈. MEMORY.md 인덱스에는 포인터 1행만.
