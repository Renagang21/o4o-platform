# Organization-Core 도메인 연동 규칙

**버전**: v1.0
**작성일**: 2025-11-30
**목적**: organization-core와 도메인 앱(Forum, LMS, Dropshipping)의 연동 가이드

---

## 📋 목차

1. [연동 개요](#1-연동-개요)
2. [Forum 연동](#2-forum-연동)
3. [LMS 연동](#3-lms-연동)
4. [Dropshipping 연동](#4-dropshipping-연동)
5. [공통 연동 패턴](#5-공통-연동-패턴)
6. [UI 연동 가이드](#6-ui-연동-가이드)

---

## 1. 연동 개요

### 1.1 연동 원칙

organization-core는 **도메인 중립적인 조직 엔진**입니다.

각 도메인 앱은 다음 방법으로 조직 기능을 활용합니다:

1. **organizationId 외래키 추가**: 도메인 엔티티에 조직 ID 추가
2. **조직 스코프 권한 활용**: RoleAssignment.scopeType/scopeId 사용
3. **조직 기반 필터링**: UI에서 조직별 데이터 필터링
4. **자동화 훅 구현**: 조직 생성 시 자동 리소스 생성

### 1.2 연동 아키텍처

```
┌────────────────────────────────────────────────────────┐
│            organization-core (Core Domain)             │
│  • Organization Entity                                 │
│  • OrganizationMember Entity                           │
│  • RoleAssignment Extension (scopeType/scopeId)        │
└────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Forum Core   │ │   LMS Core    │ │ Dropshipping  │
│               │ │               │ │     Core      │
│ ForumPost     │ │ Course        │ │ Product       │
│ .orgId        │ │ .orgId        │ │ .orgId        │
└───────────────┘ └───────────────┘ └───────────────┘
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│organization-  │ │organization-  │ │organization-  │
│forum          │ │lms            │ │groupbuy       │
│(Extension)    │ │(Extension)    │ │(Extension)    │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

## 2. Forum 연동

### 2.1 엔티티 확장

**ForumPost.organizationId 추가:**

```typescript
// packages/forum-core/src/entities/ForumPost.ts
import { Organization } from '@o4o/organization-core';

@Entity('forum_posts')
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  // ✅ organizationId 추가
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Column()
  authorId: string;

  @Column({ default: false })
  isOrganizationExclusive: boolean;  // 조직 전용 게시글 여부

  @CreateDateColumn()
  createdAt: Date;
}
```

**ForumCategory.organizationId 추가:**

```typescript
@Entity('forum_categories')
export class ForumCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // ✅ organizationId 추가
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Column({ default: false })
  isOrganizationExclusive: boolean;  // 조직 전용 카테고리 여부
}
```

### 2.2 자동화 (Extension App)

**organization-forum Extension:**

```typescript
// packages/organization-forum/src/lifecycle/onOrganizationCreated.ts
export async function onOrganizationCreated(
  context: OrganizationLifecycleContext
): Promise<void> {
  const { organization, dataSource } = context;
  const categoryRepo = dataSource.getRepository(ForumCategory);

  // 조직 전용 게시판 자동 생성
  const category = new ForumCategory();
  category.name = `${organization.name} 공지사항`;
  category.organizationId = organization.id;
  category.isOrganizationExclusive = true;

  await categoryRepo.save(category);

  // 추가 카테고리 생성
  const categories = [
    '자유게시판',
    '질문답변',
    '자료실'
  ];

  for (const name of categories) {
    const cat = new ForumCategory();
    cat.name = `${organization.name} ${name}`;
    cat.organizationId = organization.id;
    cat.isOrganizationExclusive = true;
    await categoryRepo.save(cat);
  }
}
```

### 2.3 권한 검증

```typescript
// ForumPostService.ts
@Injectable()
export class ForumPostService {
  async createPost(
    userId: string,
    dto: CreateForumPostDto
  ): Promise<ForumPost> {
    // 조직 전용 게시글인 경우 권한 검증
    if (dto.organizationId) {
      const hasPermission = await this.permissionService.hasPermissionWithInheritance(
        userId,
        'forum.write',
        dto.organizationId
      );

      if (!hasPermission) {
        throw new ForbiddenException('조직 게시글 작성 권한이 없습니다.');
      }
    }

    const post = new ForumPost();
    post.title = dto.title;
    post.content = dto.content;
    post.organizationId = dto.organizationId;
    post.authorId = userId;

    return await this.postRepo.save(post);
  }
}
```

### 2.4 API 필터링

```typescript
// GET /api/forum/posts?organizationId=org-seoul
@Get('posts')
async listPosts(@Query() query: ListPostsDto) {
  const qb = this.postRepo.createQueryBuilder('post');

  // 조직 필터링
  if (query.organizationId) {
    qb.andWhere('post.organizationId = :orgId', { orgId: query.organizationId });
  }

  // 조직 전용 게시글은 해당 조직 멤버만 조회
  if (query.includeOrganizationExclusive) {
    // 사용자의 조직 확인 후 필터링
  }

  return await qb.getMany();
}
```

---

## 3. LMS 연동

### 3.1 엔티티 확장

**Course.organizationId 추가:**

```typescript
// packages/lms-core/src/entities/Course.ts
import { Organization } from '@o4o/organization-core';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  // ✅ organizationId 추가
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Column({ default: false })
  isOrganizationExclusive: boolean;  // 조직 전용 교육 여부

  @Column({ default: false })
  isRequired: boolean;  // 필수 교육 여부

  @CreateDateColumn()
  createdAt: Date;
}
```

**Enrollment.organizationId 추가:**

```typescript
@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  courseId: string;

  @Column()
  userId: string;

  // ✅ organizationId 추가 (소속 조직 기준 수강)
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'active' | 'completed' | 'cancelled';

  @CreateDateColumn()
  enrolledAt: Date;
}
```

### 3.2 자동화 (Extension App)

**organization-lms Extension:**

```typescript
// packages/organization-lms/src/lifecycle/onOrganizationCreated.ts
export async function onOrganizationCreated(
  context: OrganizationLifecycleContext
): Promise<void> {
  const { organization, dataSource } = context;
  const courseRepo = dataSource.getRepository(Course);

  // 조직 필수 교육과정 자동 생성
  const requiredCourses = [
    { title: '신규 회원 오리엔테이션', isRequired: true },
    { title: '윤리 강령 교육', isRequired: true },
    { title: '정보 보안 교육', isRequired: false }
  ];

  for (const courseData of requiredCourses) {
    const course = new Course();
    course.title = `${organization.name} ${courseData.title}`;
    course.organizationId = organization.id;
    course.isOrganizationExclusive = true;
    course.isRequired = courseData.isRequired;
    await courseRepo.save(course);
  }
}
```

### 3.3 권한 검증

```typescript
// CourseService.ts
@Injectable()
export class CourseService {
  async enrollCourse(
    userId: string,
    courseId: string
  ): Promise<Enrollment> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });

    // 조직 전용 교육인 경우 조직 멤버십 확인
    if (course.isOrganizationExclusive && course.organizationId) {
      const isMember = await this.organizationMemberService.isMember(
        userId,
        course.organizationId
      );

      if (!isMember) {
        throw new ForbiddenException('조직 멤버만 수강 가능한 교육입니다.');
      }
    }

    const enrollment = new Enrollment();
    enrollment.userId = userId;
    enrollment.courseId = courseId;
    enrollment.organizationId = course.organizationId;
    enrollment.status = 'active';

    return await this.enrollmentRepo.save(enrollment);
  }
}
```

---

## 4. Dropshipping 연동

### 4.1 엔티티 확장

**Product.organizationId 추가:**

```typescript
// packages/dropshipping-core/src/entities/Product.ts
import { Organization } from '@o4o/organization-core';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  // ✅ organizationId 추가
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'jsonb', nullable: true })
  organizationPricing?: Record<string, number>;  // 조직별 가격

  @Column({ default: false })
  isOrganizationExclusive: boolean;  // 조직 전용 상품 여부

  @CreateDateColumn()
  createdAt: Date;
}
```

**Order.organizationId 추가:**

```typescript
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  // ✅ organizationId 추가 (조직 공동구매)
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;
}
```

### 4.2 조직별 가격 관리

```typescript
// ProductService.ts
@Injectable()
export class ProductService {
  async getPrice(
    productId: string,
    organizationId?: string
  ): Promise<number> {
    const product = await this.productRepo.findOne({ where: { id: productId } });

    // 조직별 가격이 있는 경우
    if (organizationId && product.organizationPricing?.[organizationId]) {
      return product.organizationPricing[organizationId];
    }

    // 기본 가격
    return product.basePrice;
  }

  async setOrganizationPrice(
    productId: string,
    organizationId: string,
    price: number
  ): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id: productId } });

    product.organizationPricing = {
      ...product.organizationPricing,
      [organizationId]: price
    };

    await this.productRepo.save(product);
  }
}
```

### 4.3 공동구매 기능

**organization-groupbuy Extension:**

```typescript
// packages/organization-groupbuy/src/entities/GroupBuy.ts
@Entity('group_buys')
export class GroupBuy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  organizationId: string;  // 필수

  @Column({ type: 'int' })
  minQuantity: number;  // 최소 수량

  @Column({ type: 'int', default: 0 })
  currentQuantity: number;  // 현재 수량

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountedPrice: number;  // 공동구매 가격

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ default: 'active' })
  status: 'active' | 'closed' | 'completed' | 'cancelled';
}
```

---

## 5. 공통 연동 패턴

### 5.1 엔티티 확장 패턴

**모든 도메인 엔티티:**

```typescript
@Entity('domain_entity')
export class DomainEntity {
  // 기본 필드...

  // ✅ organizationId 추가 (nullable)
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  // 조직 전용 여부
  @Column({ default: false })
  isOrganizationExclusive: boolean;
}
```

### 5.2 권한 검증 패턴

```typescript
// 공통 권한 검증 로직
async function checkOrganizationPermission(
  userId: string,
  permission: string,
  organizationId?: string
): Promise<boolean> {
  // 1. 전역 권한 체크
  if (await permissionService.hasPermission(userId, permission)) {
    return true;
  }

  // 2. 조직 권한 체크 (상속 포함)
  if (organizationId) {
    return await permissionService.hasPermissionWithInheritance(
      userId,
      permission,
      organizationId
    );
  }

  return false;
}
```

### 5.3 API 필터링 패턴

```typescript
// 공통 조직 필터링 로직
function applyOrganizationFilter<T>(
  qb: SelectQueryBuilder<T>,
  organizationId?: string,
  includeDescendants: boolean = false
): SelectQueryBuilder<T> {
  if (!organizationId) {
    return qb;
  }

  if (includeDescendants) {
    // 하위 조직 포함 (path LIKE 방식)
    const org = await organizationRepo.findOne({ where: { id: organizationId } });
    qb.andWhere(
      'entity.organizationId IN (SELECT id FROM organizations WHERE path LIKE :path)',
      { path: `${org.path}%` }
    );
  } else {
    // 해당 조직만
    qb.andWhere('entity.organizationId = :orgId', { orgId: organizationId });
  }

  return qb;
}
```

### 5.4 자동화 훅 패턴

```typescript
// 조직 생성 시 자동 리소스 생성
export async function onOrganizationCreated(
  context: OrganizationLifecycleContext
): Promise<void> {
  const { organization, dataSource } = context;

  // 도메인별 자동 리소스 생성
  await createForumCategories(organization, dataSource);
  await createLMSCourses(organization, dataSource);
  await createDefaultProducts(organization, dataSource);
}
```

---

## 6. UI 연동 가이드

### 6.1 조직 선택 컴포넌트

```tsx
// components/OrganizationSelector.tsx
import React from 'react';
import { useOrganizations } from '@/hooks/useOrganizations';

export const OrganizationSelector: React.FC = () => {
  const { organizations, loading } = useOrganizations();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  return (
    <select
      value={selectedOrgId || ''}
      onChange={(e) => setSelectedOrgId(e.target.value || null)}
    >
      <option value="">전체</option>
      {organizations.map(org => (
        <option key={org.id} value={org.id}>
          {'  '.repeat(org.level)}{org.name}
        </option>
      ))}
    </select>
  );
};
```

### 6.2 조직 필터링 UI

```tsx
// components/ForumPostList.tsx
export const ForumPostList: React.FC = () => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { posts, loading } = useForumPosts({ organizationId });

  return (
    <div>
      <OrganizationSelector
        value={organizationId}
        onChange={setOrganizationId}
      />

      <PostList posts={posts} loading={loading} />
    </div>
  );
};
```

### 6.3 조직 권한 체크

```tsx
// hooks/useOrganizationPermission.ts
export function useOrganizationPermission(
  permission: string,
  organizationId?: string
): boolean {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasPermission(false);
      return;
    }

    // API 호출
    checkPermission(user.id, permission, organizationId)
      .then(setHasPermission);
  }, [user, permission, organizationId]);

  return hasPermission;
}

// 사용 예시
const canManageOrg = useOrganizationPermission('organization.manage', orgId);

if (!canManageOrg) {
  return <Forbidden />;
}
```

### 6.4 조직 대시보드

```tsx
// pages/OrganizationDashboard.tsx
export const OrganizationDashboard: React.FC = () => {
  const { organizationId } = useParams();
  const { organization } = useOrganization(organizationId);

  return (
    <div>
      <h1>{organization.name} 대시보드</h1>

      <OrganizationStats organizationId={organizationId} />

      <Tabs>
        <Tab label="게시판">
          <ForumPostList organizationId={organizationId} />
        </Tab>
        <Tab label="교육">
          <CourseList organizationId={organizationId} />
        </Tab>
        <Tab label="공동구매">
          <GroupBuyList organizationId={organizationId} />
        </Tab>
        <Tab label="멤버">
          <OrganizationMemberList organizationId={organizationId} />
        </Tab>
      </Tabs>
    </div>
  );
};
```

---

**작성자**: Claude Code
**최종 업데이트**: 2025-11-30
**버전**: v1.0
**상태**: 설계 완료
