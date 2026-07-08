# ADR-0001: O4O Content Documentation Architecture Baseline

- **상태**: Accepted
- **날짜**: 2026-07-08
- **관련**:
  - IR: `docs/guides/IR-O4O-CONTENT-AUTHORING-DOCUMENT-ARCHITECTURE-V1.md` (조사·논의·방향 전환 이력)
  - CHECK: `CHECK-O4O-DRUG-DESCRIPTION-RULES-CONSOLIDATION-V1` · `...-CONTENT-DOCUMENT-ARCHITECTURE-APPLY-V1` · `...-RULES-DELTA-AUDIT-V1` · `...-CONTENT-RULES-DELTA-APPLY-V1`

## 맥락 (Context)

O4O 콘텐츠 생산의 문서 체계를 구축했다: 문서 계보(IR→ADR→Guide→Registry→Knowledge→WO→CHECK), 5축 Guide(common·content-authoring·ai·products·services), 4계층 Rule Registry(CR/DR/AR/OR), Knowledge Catalog 3종(ATC/Grouping/Writing), ADR 도입. 여기서 **문서를 만드는 단계는 끝났고**, 이제 이 체계를 **사용하는 단계**로 넘어간다. 구조가 앞으로 계속 흔들리면 안정성이 훼손되므로, 현 구조를 기준선(Baseline)으로 고정할 필요가 있다.

## 결정 (Decision)

**본 ADR을 기준으로 O4O 콘텐츠 문서 아키텍처를 Baseline으로 선언한다.** 이후:

- **신규 규칙** → Registry(CR/DR/AR/OR)에 Rule ID로 추가
- **신규 사례·패턴** → Knowledge Catalog에 행 추가(Registry 무수정)
- **신규 결정** → ADR에 추가
- **신규 작업** → WO
- **결과** → CHECK
- **구조 자체는 특별한 사유가 없는 한 변경하지 않는다.** 구조 변경은 **Major 변경**으로 간주하고 새 IR/ADR로 근거를 남긴 뒤에만 수행한다.

## 근거 (Rationale)

- 이번 작업에서 확인된 사실: **Rule보다 Knowledge가 훨씬 빠르게 늘어난다.** 따라서 성장은 Registry(규칙)가 아니라 Knowledge/CHECK/WO에서 일어나야 하며, 구조는 고정되어야 확장이 안전하다.
- 문서가 많아진 지금, 더 필요한 것은 "새 문서"가 아니라 "체계의 사용"이다. Baseline 선언이 그 전환점을 명시한다.

## 결과 (Consequences)

- **쉬워지는 것**: 신규 증상군 WO는 대상·제외·bucket·키워드·주의문구·후속만 작성하고 나머지는 `DOCUMENT-INDEX`를 참조 → WO가 짧아진다. 규칙·구조 혼선 감소.
- **제약**: 구조(5축·4계층·계보)를 바꾸려면 Major 절차(IR/ADR) 필요. 임의 폴더·계층 신설 금지.
- **영향 문서/규칙**: `common/DOCUMENT-ARCHITECTURE`(운영 SSOT)·`DOCUMENT-INDEX`(진입점)·CR-015~019·OR-001~004. Baseline 이후 이들의 구조 변경은 ADR 필요.
- **다음 단계(구조 아님, 사용)**: 실제 콘텐츠 생산 — ① 귀 질환 ② 안과 ③ 피부 ④ 여성질환 ⑤ 치질 ⑥ 고위험 큐레이션. 이후 의료기기·의약외품·건기식.
- **예상되는 신규 Knowledge**(Rule 아님): Disease Pattern · Counseling Pattern · Warning Pattern · Interaction Pattern 등 → Knowledge Catalog로 추가(구조 변경 아님).

## 대안 (Alternatives)

- **Baseline 미선언(현행 유지)**: 구조가 계속 리팩터될 여지 → 확장 시 불안정. 반려.
- **CLAUDE.md에 구조 고정**: 규칙 본문 복사 없이 포인터만 두는 현 원칙과 충돌·비대화. 반려(진입점 포인터는 이미 존재).

---
> 이 결정으로 **문서 체계 구축은 종료**한다. 이후는 이 Baseline 위에서 콘텐츠를 생산한다.
