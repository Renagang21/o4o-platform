# organization-core

> **Status**: FROZEN (Foundation Core) | **Version**: 1.0.0 | **Package**: @o4o/organization-core

## 역할

전사 조직 관리 시스템. 모든 조직 서비스에서 사용.

| 책임 | 경계 |
|------|------|
| 조직 계층 구조 (Organization, OrganizationUnit) | 인증 → auth-core |
| 멤버 관리 (OrganizationMember) | 비즈니스 권한 → 서비스 앱 |
| 역할 관리 (OrganizationRole) | |

## 외부 노출

**Services**: OrganizationService, OrganizationMemberService
**Types**: Organization, OrganizationMember, OrganizationUnit, OrganizationRole
**Events**: `organization.created/updated/deleted`, `member.added/removed`

## API Routes

- `/api/v1/organizations`, `/api/v1/organizations/:id`
- `/api/v1/organizations/:id/members`

## 설정

- enableHierarchy: true, maxDepth: 5
- defaultOrganizationType: 'branch'

## Dependencies

없음 (Foundation Core)
