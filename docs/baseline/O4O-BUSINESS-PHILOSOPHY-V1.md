# O4O-BUSINESS-PHILOSOPHY-V1

> 이 문서는 O4O Platform 판단의 최상위 기준 문서이다.
> 세부 구현 지시는 개별 WO 및 하위 기준 문서를 따른다.
> **정정 (2026-09-17, `WO-O4O-FINAL-ROLE-WORKSPACE-ARCHITECTURE-CENSUS-AND-CLOSURE-V1`)**: 역할 경계 · 업무공간 · 콘텐츠 유입 경로는 [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) 이 동급 정본이며 충돌 시 그 문서가 우선한다 (동 문서 §8). 종전 §3 · §4 · §7 · 주의사항의 "3자 구조 / 공급자 직접 제작 주체 아님 / Neture 내 매장 금지" 서술은 그 문서 §1 · §2-1 · §3 기준으로 본문을 정렬했다.

## 문서 목적

O4O(Online for Offline) Platform의 핵심 사업 철학을 정의한다.
모든 서비스 설계, 운영 방향, 역할 경계는 이 문서의 철학을 기반으로 판단한다.

## 적용 범위

O4O Platform 전체 서비스 — canonical service catalog(`platform_services`)에 등재된 서비스 전부 (2026-09 현재 Neture · KPA-Society · K-Cosmetics · Pharmacy-Hub 등). 개별 서비스명은 catalog 가 정본이며 이 문서는 목록을 고정하지 않는다.

## 핵심 철학

### §1. Online for Offline

O4O Platform은 온라인이 오프라인 매장의 경쟁력을 강화하는 도구다.
플랫폼의 목적은 온라인 전환이 아니라, **정보·콘텐츠·자산을 통한 오프라인 실행력 향상**이다.

### §2. 정보가 중요한 다품종 소량 판매 제품

전문성이 필요한 제품(의약품, 화장품, 건강기능식품 등)은 단순 가격 경쟁이 아니라 **신뢰할 수 있는 정보와 전문 매장 경험**으로 선택된다.
O4O는 이 영역에서 오프라인 매장의 설명력과 신뢰를 높이는 데 집중한다.

### §3. 참여 주체와 역할

O4O 의 참여 주체는 **역할별 업무공간**(ROLE-WORKSPACE-ARCHITECTURE §1)으로 구분한다 — Supplier · Service Operator · Store 의 3자 협력 구조에 Community 축을 더한 4 업무공간이며, 업무공간은 역할로 구분되고 서비스로 구분되지 않는다. Platform Admin 은 업무공간이 아니라 내부 관리 영역이다.

| 주체 | 역할 |
|------|------|
| **공급자(Supplier)** | 제품 · 주문 · 콘텐츠를 가지며, 콘텐츠를 **Store Hub 와 Service Operator 에 온라인으로 제공**하는 주체 (공식 경로는 이 두 가지뿐 — 특정 매장 직접 전달 · Community 직접 게시는 제외, ROLE-WORKSPACE §2-1 · §2-2) |
| **운영사업자(Operator)** | 공급자 제공 콘텐츠를 수신·검토·구성하고, AI 활용·매장 실행 자산 제작·큐레이션·매장 지원·운영 수익 모델을 구축하는 서비스 운영 사업자 (서비스 운영 / 사업 운영 / 운영 관리 — ROLE-WORKSPACE §4) |
| **매장 경영자(Store Owner)** | HUB 자료(운영자 · 공급자 · 커뮤니티 출처)를 활용하거나 직접 작성하여 내 매장 실행 자산을 만들고 오프라인 고객 접점을 운영하는 주체 (ROLE-WORKSPACE §3 · §6) |
| **Community 구성원** | 업계 구성원으로서 커뮤니티에 참여하는 주체. Community Identity 는 Service Identity 와 별개다 (ROLE-WORKSPACE §5) |

공급자 콘텐츠의 유입은 온라인 제공 경로(Supplier → Store Hub · Supplier → Service Operator)로 한정되며, 제공 이후의 검토 · 편집 · 발행은 운영자 또는 매장의 업무다. 공급자 책임은 제공에서 끝난다.

### §4. 서비스별 특성은 같은 철학 위에 있다

catalog 에 등재된 각 서비스(Neture · KPA-Society · K-Cosmetics · Pharmacy-Hub 등)는 각각 다른 도메인을 다루지만,
**동일한 O4O 철학(오프라인 실행력 강화, 역할별 업무공간 협력 구조) 위에서 운영된다.**
서비스별 차이는 도메인 차이이지, 철학의 차이가 아니다.

### §5. HUB와 매장 실행의 관계

- **HUB**: 운영자가 매장 경영자를 위해 구성한 자료 공간 (정보·콘텐츠·자산의 집합)
- **내 매장**: 매장 경영자가 HUB 자료를 활용해 실제 매장에서 실행하는 공간
- HUB → 내 매장 흐름은 snapshot/copy 성격이며, 원본은 HUB에 있다

### §6. AI의 역할

AI는 운영자의 작업을 보조하는 도구다.
운영자의 AI 능동 활용(초안 생성, 품질 향상)은 Service Operator Workspace 의 서비스 운영(콘텐츠) 업무 안에서 수행하며,
AI가 사람의 검수 없이 최종 기준을 결정하지 않는다.

### §7. Drift 방지

플랫폼 구조는 역할별 업무공간(Supplier · Service Operator · Store · Community)의 경계가 흐려지는 방향으로 진화하지 않는다.

- 공급자를 운영자 역할로 격상하지 않는다. 공급자의 온라인 제공 경로는 ROLE-WORKSPACE §2-1 의 두 경로로 한정한다.
- 운영자가 매장 경영자의 자율 운영 영역을 침범하지 않는다.
- Community 참여를 위해 별도 membership · role · enrollment 를 만들지 않는다 (ROLE-WORKSPACE §5).
- 새로운 기능이 역할 경계를 바꾸는 경우 명시적 WO와 기준 문서(본 문서 + ROLE-WORKSPACE-ARCHITECTURE) 개정이 필요하다.

## 구현·운영 시 주의사항

- 공급자 역할을 운영자 역할로 혼동하지 않는다.
- Store Workspace 는 catalog 의 `storeWorkspaceEnabled` 서비스에만 조립한다 (현재 Neture 는 매장 기능이 없다). Neture O4O Home 의 「내 매장」은 Neture 자체 매장 기능이 아니라 타 서비스 Store Workspace 로의 진입 목록(`/work-scope/store-services`)이다.
- O4O Coin/Credit 등 보상 시스템은 별도 기준 문서를 따른다.

## 후속 문서와의 관계

| 문서 | 관계 |
|------|------|
| [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) | 역할별 업무공간 · 콘텐츠 제공 경로 · Community/Service Identity · Legacy Partner 은퇴 (동급 정본, 충돌 시 우선) |
| `O4O-3-ROLE-FLOW-BASELINE-V1.md` | 3자 흐름 상세 — §2 · §6 충돌 절 SUPERSEDED(2026-09-16), §4 · §5 만 참고 |
| `BASELINE-OPERATOR-OS-V1.md` | 운영자 OS 구조 (Freeze) |
| 각 서비스 Freeze 문서 | 도메인별 구현 기준 |

---
*작성 기준: O4O Platform 운영 원칙 (2026-06) · 정정: 2026-09-17 (ROLE-WORKSPACE-ARCHITECTURE 정렬)*
*상태: Active Baseline*
