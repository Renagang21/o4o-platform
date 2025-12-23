# organization-core - Current Status

> 현황 기록 문서 - 사실만 기록

## 앱 정보

- **App ID:** organization-core
- **App Type:** core
- **Version:** 1.0.0
- **Package:** @o4o/organization-core

## 구현 완료된 기능

### Backend
- Organization Entity 및 Service
- OrganizationMember Entity 및 Service
- RoleAssignment Entity
- 계층 구조 관리
- 멤버 관리

### Frontend (Admin)
- 조직 목록 (`/admin/organizations`)
- 조직 상세 (`/admin/organizations/:id`)
- 조직 멤버 관리 (`/admin/organizations/:id/members`)

### API Routes
- `/api/v1/organizations`
- `/api/v1/organizations/:id`
- `/api/v1/organizations/:id/members`

## 부분 구현 기능

(없음)

## 의도적으로 미구현된 기능

(없음)

## 기본 설정

- enableHierarchy: true
- maxDepth: 5
- defaultOrganizationType: 'branch'

## 특징

- @status FROZEN (Foundation Core)
- 모든 조직 서비스에서 사용됨
