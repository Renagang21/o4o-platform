# ADR — Architecture Decision Record (O4O)

상태: Active · V1 (2026-07-08)

> **ADR = 채택된 결정만 기록한다.** IR(조사·논의·반려·후보안)에서 여러 방향이 나오지만, 실제 프로젝트가 채택한 결정은 일부다. 그 채택을 짧게 남기는 곳이 ADR이다.

문서 계보: **IR**(회의) → **ADR**(결정) → **Guide**(운영) → Registry → Knowledge → WO → CHECK.

## 원칙

- **채택된 결정만** 기록한다. 논의·반려·후보안은 IR에 남긴다.
- **소급 변환 금지**: 기존 IR을 ADR로 바꾸지 않는다(IR의 역사적 논의 보존). **새로운 중요 설계 결정부터** ADR로 기록한다.
- 하나의 ADR = 하나의 결정. 짧게(한 화면). 형식은 [ADR-TEMPLATE.md](ADR-TEMPLATE.md).
- 번호: `ADR-0001`부터. 파일명 `ADR-0001-<슬러그>.md`.
- 상태: `Proposed` → `Accepted` → (필요 시) `Superseded by ADR-XXXX`.

## 목록

| ADR | 제목 | 상태 | 날짜 |
|---|---|---|---|
| [ADR-0001](ADR-0001-content-documentation-architecture-baseline.md) | O4O Content Documentation Architecture Baseline | Accepted | 2026-07-08 |

> ADR-0001로 문서 체계를 **Baseline 선언**했다. 이후 구조 변경은 Major(새 IR/ADR 필요), 신규 규칙=Registry·사례=Knowledge·결정=ADR·작업=WO·결과=CHECK.
