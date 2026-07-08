# DRUG-TEMPLATE — 의약품 설명서 형식 (운영)

상태: Active · V1 (2026-07-08) · 진입: [DOCUMENT-INDEX](../../common/DOCUMENT-INDEX.md)
Rule: [DR-009](DRUG-RULE-REGISTRY.md) · [DR-017](DRUG-RULE-REGISTRY.md)

> 설명서 형식·필수/선택 블록·GMP 문구의 운영 진입점.
>
> **상세 원문**: 구조·요약표·문구 = [`docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md`](../../O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md) §5·§6 · canonical template = `O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1` §12-A.

---

## 1. 필수 블록 순서 (DR-017)

```text
어떤 경우에 사용하나
→ 사용(복용) 방법
→ 주의 대상
→ 병원에 가야 하는 경우
→ 사용 확인 포인트
→ 성분 기준 선택 (GMP 공통 문구)
```

## 2. 선택 블록 (권장)

- **Selection Point**: 세대·계열이 갈리는 약효군에서 "어떤 상황에 이 계열을 고르나". "졸림 없음" 등 단정 금지(개인차 명시).
- **Counseling Point**: 약국 상담 환경 전제. **원문 근거로만, 창작 0**(CR-004).

## 3. route별 "사용 안내" (DR-009)

- 경구=복용 / 점안·점비·비강=넣기·뿌리기 / 트로키=씹지 말고 녹임 / 가글=삼키지 않음 / 스프레이=환부 분사·들이마심 금지 / 겔·연고·부착정=환부에만 / 좌제·질정=경구 복용하지 않음.

## 4. 하단 공통 문구 (GMP, CR-013)

> "의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다. 같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다. 제품명보다 성분·함량을 기준으로 약사에게 확인하세요."

"완전히 같다" 금지 → "동일한 기준으로 관리된다".
