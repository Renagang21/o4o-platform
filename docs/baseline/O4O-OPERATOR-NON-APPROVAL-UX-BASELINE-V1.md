# O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1

> 이 문서는 운영자 비승인(Non-Approval) UX의 기준 문서이다.
> 5 Workspace UX Baseline이며, 세부 워크스페이스 구조는 후속 문서 또는 개별 WO를 따른다.

## 문서 목적

운영자 UX가 승인·심사 중심이 아닌, **정보 가시화·진열·운영 보조 중심**이어야 한다는 기준을 정의한다.

## §1. 핵심 원칙

**운영자 = 심사관이 아니라 서비스 운영 사업자다.**

운영자의 주요 역할:
- 공급자 자료 수신·등록·구성 (자료 등록 Workspace)
- AI 활용으로 초안·품질 향상 (AI 작업 Workspace)
- 콘텐츠·자산 큐레이션 (큐레이션 Workspace)
- 매장 경영자 지원 (매장 지원 Workspace)
- 운영 수익 모델 구축 (운영 수익 Workspace)

## §2. 5 Workspace 구조

| Workspace | 코드 | 핵심 기능 |
|-----------|:----:|---------|
| A. 자료 등록 | `A` | 공급자 원천 자료 수신·등록·구성 |
| B. AI 작업 | `B` | AI 보조 초안 생성, 품질 향상 |
| C. 큐레이션 | `C` | HUB 콘텐츠 선택·분류·진열 |
| D. 매장 지원 | `D` | 매장 경영자 실행 지원 |
| E. 운영 수익 | `E` | 수익 모델 설정·관리 |

> 검수·승인 UX(Workspace F)는 필요한 영역에만 선택적으로 적용한다.
> 상세: `docs/architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md`

## §3. 승인 UX를 기본값으로 만들지 않는 이유

- 모든 항목에 운영자 승인을 요구하면 운영 병목이 발생한다.
- 대부분의 HUB 콘텐츠는 운영자가 게시 기준을 설정하고, 기준에 맞으면 자동 가시화가 원칙이다.
- 예외: 법적·운영 리스크가 있는 영역(회원 가입 심사, 공급자 계약, 결제 관련)은 별도 승인 흐름을 둔다.

## §4. 승인 UX가 필요한 영역 (예외)

- 회원 가입 신청 → 서비스 운영 방침에 따라 승인 필요
- 공급자/파트너 계약 → 운영자 검토 필요
- 결제·정산 조건 변경 → 운영자 또는 admin 승인 필요
- 법적 규제 대상 콘텐츠 → 검수 흐름 적용

## §5. Operator Dashboard와의 관계

Operator Dashboard는 5 Workspace 진입 허브다.
- 5-Block 구조(KPI → AI Summary → Action Queue → Activity Log → Quick Actions)는 운영 상태를 보여주는 진입점이며, 심사 큐가 주목적이 아니다.
- A~F 6 Workspace 모두 동등하게 접근 가능한 허브를 기본으로 한다.
- 상세: `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md`

## 구현 주의사항

- 승인 대기 수를 KPI의 첫 번째 항목으로 두지 않는다.
- 운영자 대시보드를 "심사 대기 목록"처럼 설계하지 않는다.
- 5 Workspace는 모두 동등하게 노출되는 진입 허브를 기본으로 한다.
- 승인 Workspace(F)는 필요한 서비스에서만 적용한다.

## 후속 문서

| 문서 | 관계 |
|------|------|
| `docs/architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md` | 검수·승인 UX 상세 |
| `docs/baseline/BASELINE-OPERATOR-OS-V1.md` | 운영자 OS 구조 (Freeze) |
| `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` | 대시보드 구조 기준 |

---
*작성 기준: O4O Operator Non-Approval UX 원칙 (2026-06)*
*상태: Active Baseline*
