# KPA Society 서비스 구조 기준 문서

> **상태**: SUPERSEDED · **대체 문서**: [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) · [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) · **표기일**: 2026-10-20

이 문서가 설명하던 "한 도메인 안의 3개 서비스(커뮤니티 · 분회 · 데모)" 구조는 은퇴했다. 그 도메인은 폐지됐고 본문은 혼선을 막기 위해 삭제했다 — 근거: [`WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1`](../work-orders/WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1.md).

현행 기준:

| 대상 | 현행 주소 · 정본 |
|---|---|
| 약국 협력사업 `pharmacy` (다른 협력사업 `megapharm` · `pharmcoop` · `carepharm` 과 동급 독립 사업) | `pharmacy.neture.co.kr` — [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) |
| KPA 분회 서비스 `kpa-branch` (약사 개인 대상) | `kpa.neture.co.kr/{분회}` — 같은 문서 |
| 커뮤니티 (독립 서비스) | `community.neture.co.kr` — [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §5 |
| 데모 서비스 | 제거 완료 (2026-09-17) |

옛 본문은 git 이력에서만 확인한다.
