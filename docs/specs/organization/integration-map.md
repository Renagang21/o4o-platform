# Organization Integration Map

**버전:** 2.0.0
**상태:** Active

---

## 1. 개요

Organization-Core와 도메인 앱(Forum, LMS, Dropshipping)의 연동 가이드입니다.
organizationId를 통한 멀티테넌트 구조를 지원합니다.

---

## 2. 연동 아키텍처

```
┌─────────────────────────────────────────────────────┐
│            organization-core (Core App)             │
│  • Organization Entity                              │
│  • OrganizationMember Entity                        │
│  • RoleAssignment (scopeType/scopeId)               │
└────────────────────────┬────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  forum-core   │ │  lms-core     │ │ dropshipping  │
│  .orgId       │ │  .orgId       │ │  .orgId       │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

## 3. 도메인별 연동

### 3.1 Forum 연동

| 엔티티 | organizationId 용도 |
|--------|---------------------|
| ForumPost | 조직별 게시판 분리 |
| ForumCategory | 조직별 카테고리 |

### 3.2 LMS 연동

| 엔티티 | organizationId 용도 |
|--------|---------------------|
| Course | 조직별 교육과정 |
| Enrollment | 조직별 수강 관리 |

### 3.3 Dropshipping 연동

| 엔티티 | organizationId 용도 |
|--------|---------------------|
| Product | 조직별 상품 관리 |
| Partner | 조직별 판매자 |

---

## 4. 공통 연동 패턴

### Entity 확장

```typescript
@Entity()
export class DomainEntity {
  @Column({ nullable: true })
  organizationId?: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;
}
```

### 조직 기반 필터링

```typescript
// Service
findByOrganization(orgId: string) {
  return this.repository.find({
    where: { organizationId: orgId }
  });
}
```

### 권한 검증

```typescript
// scopeType: 'organization', scopeId: orgId
const hasAccess = await checkPermission(
  userId,
  'forum.post.create',
  { scopeType: 'organization', scopeId: orgId }
);
```

---

## 5. Navigation Registry 연동

조직 기반 메뉴는 Navigation Registry를 통해 자동 구성됩니다.

```typescript
// manifest.ts
navigation: {
  admin: [
    {
      path: '/organization/:orgId/forum',
      label: 'Forum',
      scope: 'organization'
    }
  ]
}
```

---

## 6. 규칙

1. **organizationId 선택적**: 멀티테넌트 필요 시에만 추가
2. **scopeType/scopeId 활용**: RBAC 권한은 scope 기반으로 검증
3. **Extension 패턴**: 조직 특화 기능은 Extension App으로 분리
4. **CMS Registry 연동**: CPT/ACF/View는 CMS Registry에서 통합 관리

---
*최종 업데이트: 2025-12-10*
