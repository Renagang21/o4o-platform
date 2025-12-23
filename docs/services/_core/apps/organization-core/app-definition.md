# organization-core - Definition

> 앱 정의 문서

## 앱 정보

- **App ID:** organization-core
- **App Type:** core
- **Package:** @o4o/organization-core
- **Service Group:** All organization services
- **Status:** @status FROZEN - Foundation Core

## 역할 및 책임

### 주요 역할
전사 조직 관리 시스템으로서 계층 구조 조직, 멤버 관리, 조직 스코프 권한을 제공한다.

### 책임 범위
- 조직 계층 구조 관리 (Organization, OrganizationUnit)
- 조직 멤버 관리 (OrganizationMember)
- 조직 역할 관리 (OrganizationRole)
- 조직 스코프 권한 제공

### 경계
- 조직 구조만 담당
- 사용자 인증은 auth-core에 위임
- 비즈니스 권한은 각 서비스 앱이 담당

## 의존성

### Core Dependencies
(없음 - Foundation Core)

### Optional Dependencies
(없음)

## 외부 노출

### Services
- OrganizationService
- OrganizationMemberService

### Types
- Organization
- OrganizationMember
- OrganizationUnit
- OrganizationRole

### Events
- `organization.created`
- `organization.updated`
- `organization.deleted`
- `member.added`
- `member.removed`

## 설정

### 기본 설정
- enableHierarchy: true
- maxDepth: 5
- defaultOrganizationType: 'branch'

### 환경 변수
(없음)

## 특징

- @status FROZEN (Foundation Core)
- 모든 조직 서비스에서 사용
- Phase A/B complete (2025-12-14)
