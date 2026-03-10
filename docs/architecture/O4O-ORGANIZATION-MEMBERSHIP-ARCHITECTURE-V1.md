# O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE

O4O Platform Organization Membership Architecture

Version: **1.0**
Status: **Core Architecture**

---

# 1. 설계 목적

O4O 플랫폼은 단순 사용자 서비스가 아니라
**조직 기반 서비스 플랫폼**이다.

예

* 대한약사회
* 약사회 분회
* 약국
* 공급자 회사
* 파트너 회사
* 매장 운영 조직

즉 사용자는 **개인이지만**, 실제 활동은 대부분 **조직 단위로 이루어진다.**

따라서 인증 구조 위에 다음 계층이 필요하다.

```text
Global User
↓
Service Membership
↓
Organization Membership
↓
Role
↓
Service Access
```

---

# 2. 핵심 개념

## 2.1 Organization

플랫폼 내 **모든 조직의 기본 단위**

테이블

```text
organizations
```

구조

```text
id
name
type
status
created_at
```

type 예

```text
association
branch
pharmacy
supplier
partner
store
```

---

# 3. Organization Membership

사용자가 조직에 속하는 관계

테이블

```text
organization_members
```

구조

```text
id
organization_id
user_id
role
status
joined_at
approved_at
```

status

```text
pending
active
rejected
suspended
```

role 예

```text
owner
admin
operator
member
staff
```

---

# 4. Organization Hierarchy

O4O 조직은 계층 구조를 가진다.

예

```text
대한약사회
  ↓
지부
  ↓
분회
  ↓
약국
```

구조

```text
organizations
```

추가 필드

```text
parent_id
```

예

```text
대한약사회
 id = 1

서울지부
 parent_id = 1

강남분회
 parent_id = 서울지부

약국
 parent_id = 강남분회
```

---

# 5. Organization Role

조직 내부 역할

예

약국

```text
owner
manager
staff
```

공급자

```text
supplier_admin
supplier_operator
```

파트너

```text
partner_admin
partner_member
```

---

# 6. 조직 기반 접근 제어

서비스 접근 시 다음 검사를 한다.

```text
User
↓
Service Membership
↓
Organization Membership
↓
Role
↓
API Access
```

예

```text
GlycoPharm 약국 관리자
```

검사

```text
service_memberships.active
AND
organization_members.role = pharmacy_admin
```

---

# 7. 약사회 조직 모델

KPA 예

```text
대한약사회
  ↓
지부
  ↓
분회
```

구조

```text
organizations
```

type

```text
association
branch
chapter
```

회원

```text
organization_members
```

role

```text
member
branch_admin
chapter_admin
```

---

# 8. 약국 조직 모델

약국

```text
organizations
type = pharmacy
```

회원

```text
organization_members
```

role

```text
owner
manager
pharmacist
staff
```

---

# 9. 공급자 조직 모델

공급자

```text
organizations
type = supplier
```

회원

```text
organization_members
```

role

```text
supplier_admin
supplier_operator
supplier_staff
```

---

# 10. 파트너 조직 모델

파트너 회사

```text
organizations
type = partner
```

회원

```text
organization_members
```

role

```text
partner_admin
partner_member
```

---

# 11. 매장 조직 모델

매장

```text
organizations
type = store
```

회원

```text
organization_members
```

role

```text
store_owner
store_manager
store_staff
```

---

# 12. API 접근 구조

조직 기반 API

예

```text
/pharmacy/:id
```

Guard

```text
requireAuth
requireServiceMembership
requireOrganizationMembership
requireRole
```

---

# 13. Organization Guard

미들웨어

```text
requireOrganizationMembership(organizationId)
```

검사

```text
organization_members.status = active
```

---

# 14. Organization Role Guard

예

```text
requireOrganizationRole("pharmacy_admin")
```

검사

```text
organization_members.role
```

---

# 15. 조직 생성 흐름

예

약국 생성

```text
1 약국 신청
2 organization 생성
3 owner membership 생성
```

---

# 16. 조직 초대

조직 관리자는 사용자를 초대할 수 있다.

예

```text
약국 관리자
→ 직원 초대
```

흐름

```text
invite
↓
pending membership
↓
승인
```

---

# 17. 조직 기반 서비스

조직 기반 서비스 예

| 서비스        | 조직  |
| ---------- | --- |
| KPA        | 약사회 |
| GlycoPharm | 약국  |
| Neture     | 공급자 |
| Cosmetics  | 파트너 |
| O4O Store  | 매장  |

---

# 18. Auth + Organization 구조

최종 구조

```text
User
↓
Service Membership
↓
Organization Membership
↓
Role
↓
Service Scope
↓
API Access
```

---

# 19. 확장 가능 구조

이 구조는 다음 확장을 지원한다.

### Multi Store

```text
사용자
→ 여러 매장
```

---

### Multi Organization

```text
사용자
→ 여러 조직
```

---

### Franchise 구조

```text
본사
↓
지점
```

---

# 20. O4O Core Architecture

O4O 플랫폼 Core

```text
1 Auth Core
2 Organization Core
3 Commerce Core
4 Content Core
5 Signage Core
```

---

# 21. 현재 적용 상태

| 영역                | 상태    |
| ----------------- | ----- |
| Auth Core         | 안정    |
| Organization Core | 부분 구현 |
| Membership Guard  | 완료    |

---

# 22. 핵심 설계 원칙

### Principle 1

```text
User ≠ Organization
```

사용자는 조직에 **속할 뿐이다.**

---

### Principle 2

```text
권한은 조직 안에서 정의된다
```

---

### Principle 3

```text
모든 서비스는 조직 기반으로 확장 가능
```

---

# 23. 결론

O4O 플랫폼은 다음 계층 구조를 따른다.

```text
User
↓
Service Membership
↓
Organization Membership
↓
Role
↓
Service Scope
↓
API Access
```

이 구조는 **O4O 플랫폼 전체 권한 시스템의 기준 아키텍처**이다.
