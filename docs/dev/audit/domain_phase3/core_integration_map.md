# Core Integration Map: Forum + Dropshipping + Organization

**작성일**: 2025-11-30
**목적**: Forum/Dropshipping 도메인과 Organization-Core 통합 시 데이터/권한/UI 연동 구조 정의

---

## 1. 통합 아키텍처 개요

### 1.1 App 의존성 그래프

```
┌─────────────────────────────────────────────────────────────┐
│                       O4O Platform                          │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Forum Domain    │  │ Dropshipping     │                │
│  │                  │  │  Domain          │                │
│  │  ┌────────────┐  │  │  ┌────────────┐  │                │
│  │  │ forum-core │  │  │  │ ds-core    │  │                │
│  │  └─────┬──────┘  │  │  └─────┬──────┘  │                │
│  │        │         │  │        │         │                │
│  │  ┌─────▼──────┐  │  │  ┌─────▼──────┐  │                │
│  │  │forum-yaksa │  │  │  │ ds-cosmet  │  │                │
│  │  └────────────┘  │  │  └────────────┘  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Organization-Core (향후)                   │  │
│  │                                                      │  │
│  │  ┌─────────────┐  ┌──────────────┐                  │  │
│  │  │organization │  │organization  │                  │  │
│  │  │   -core     │  │  -yaksa      │                  │  │
│  │  └──────┬──────┘  └──────────────┘                  │  │
│  │         │                                            │  │
│  │  ┌──────▼───────────────────┐                        │  │
│  │  │organization-forum        │                        │  │
│  │  │organization-groupbuy     │                        │  │
│  │  └──────────────────────────┘                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

의존성 규칙:
1. Extension → Core (필수)
2. Organization Extension → Organization-Core + Domain Core (필수)
3. Core 앱은 서로 독립 (Forum ⊥ Dropshipping ⊥ Organization)
```

### 1.2 독립 웹서버 설치 시나리오

#### Scenario A: 약사회 웹사이트
```
Domain: yaksa.or.kr
설치 앱:
  - forum-core
  - forum-yaksa
  - organization-core (향후)
  - organization-yaksa (향후)
  - organization-forum (향후)

특징:
  - 분회/지부 게시판 자동 생성
  - 약물 메타데이터 지원
  - 드랍쉬핑 기능 없음
```

#### Scenario B: 화장품 쇼핑몰
```
Domain: cosmetics.neture.co.kr
설치 앱:
  - dropshipping-core
  - dropshipping-cosmetics

특징:
  - 피부타입/성분 필터
  - 인플루언서 루틴
  - 포럼 기능 없음
  - 조직 기능 없음
```

#### Scenario C: 약사회 공동구매
```
Domain: groupbuy.yaksa.or.kr
설치 앱:
  - dropshipping-core
  - organization-core (향후)
  - organization-yaksa (향후)
  - organization-groupbuy (향후)

특징:
  - 지부/분회 공동구매
  - 조직별 특가
  - 조직별 정산
  - 포럼 기능 없음
```

#### Scenario D: 통합 플랫폼 (네츄어)
```
Domain: neture.co.kr
설치 앱:
  - forum-core
  - forum-neture
  - dropshipping-core
  - dropshipping-cosmetics

특징:
  - 포럼 + 쇼핑몰 통합
  - 각 도메인 독립 운영
  - 조직 기능 없음
```

---

## 2. 데이터 모델 통합

### 2.1 User ↔ Forum ↔ Dropshipping ↔ Organization 연동

```typescript
// User 엔티티 (Core)
@Entity('users')
class User {
  id: string;
  email: string;
  role: UserRole;  // Deprecated
  roles: string[];  // Deprecated

  // Dropshipping 관계
  supplier?: Supplier;
  seller?: Seller;
  partner?: Partner;
}

// Forum 엔티티 (forum-core)
@Entity('forum_post')
class ForumPost {
  id: string;
  authorId: string;    // User.id

  // Phase 3: Organization 연동 (향후)
  organizationId?: string;  // Organization.id
  organizationScope?: 'branch' | 'division' | 'global';
}

// Dropshipping 엔티티 (dropshipping-core)
@Entity('products')
class Product {
  id: string;
  supplierId: string;  // Supplier.id → Supplier.userId → User.id

  // Phase 3: Organization 연동 (향후)
  organizationId?: string;  // Organization.id
  organizationPricing?: {
    [orgId: string]: {
      price: number;
      minQuantity: number;
      deadline: Date;
    };
  };
}

// Organization 엔티티 (organization-core, 향후)
@Entity('organizations')
class Organization {
  id: string;
  name: string;
  type: 'branch' | 'division' | 'global';
  parentId?: string;  // 계층 구조 (분회 → 지부 → 전체)

  // 관계
  posts?: ForumPost[];     // organizationId로 연결
  products?: Product[];    // organizationId로 연결
  members?: User[];        // OrganizationMember로 연결
}
```

### 2.2 Organization Member 연결 패턴

```typescript
// OrganizationMember 엔티티 (organization-core, 향후)
@Entity('organization_members')
class OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'admin' | 'member' | 'moderator';  // 조직 내 역할

  isActive: boolean;
  joinedAt: Date;
}

// 사용 예시
const user = await User.findOne({ where: { id: userId } });
const orgMembers = await OrganizationMember.find({
  where: { userId: user.id, isActive: true }
});

// 사용자가 속한 조직 목록
const organizations = await Organization.find({
  where: { id: In(orgMembers.map(m => m.organizationId)) }
});

// 특정 조직의 게시글 조회
const posts = await ForumPost.find({
  where: {
    organizationId: organizations[0].id,
    status: 'published'
  }
});
```

---

## 3. RBAC 통합

### 3.1 RoleAssignment + Scope 패턴

```typescript
@Entity('role_assignments')
class RoleAssignment {
  userId: string;
  role: string;        // 'forum_moderator', 'seller', 'groupbuy_manager'

  scope?: string;      // organizationId or 'global'
  scopeType?: string;  // 'organization' | 'global'

  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
}

// 역할 할당 예시
const assignments = [
  // 글로벌 관리자
  { userId: 'user1', role: 'admin', scopeType: 'global', isActive: true },

  // 지부 공동구매 관리자
  { userId: 'user2', role: 'groupbuy_manager', scope: 'org-seoul', scopeType: 'organization', isActive: true },

  // 분회 포럼 운영자
  { userId: 'user3', role: 'forum_moderator', scope: 'org-gangnam', scopeType: 'organization', isActive: true },

  // Seller (글로벌)
  { userId: 'user4', role: 'seller', scopeType: 'global', isActive: true },

  // Partner (특정 지부)
  { userId: 'user5', role: 'partner', scope: 'org-busan', scopeType: 'organization', isActive: true },
];
```

### 3.2 권한 체크 로직

```typescript
// Forum: 게시글 수정 권한 체크
async function canUserEditPost(userId: string, post: ForumPost): Promise<boolean> {
  // 1. 글로벌 관리자
  const globalAdmin = await RoleAssignment.findOne({
    where: { userId, role: 'admin', scopeType: 'global', isActive: true }
  });
  if (globalAdmin) return true;

  // 2. 조직 포럼 운영자
  if (post.organizationId) {
    const orgModerator = await RoleAssignment.findOne({
      where: {
        userId,
        role: 'forum_moderator',
        scope: post.organizationId,
        scopeType: 'organization',
        isActive: true
      }
    });
    if (orgModerator) return true;
  }

  // 3. 작성자 본인
  if (post.authorId === userId && !post.isLocked) return true;

  return false;
}

// Dropshipping: 상품 관리 권한 체크
async function canUserManageProduct(userId: string, product: Product): Promise<boolean> {
  // 1. 글로벌 관리자
  const globalAdmin = await RoleAssignment.findOne({
    where: { userId, role: 'admin', scopeType: 'global', isActive: true }
  });
  if (globalAdmin) return true;

  // 2. 조직 공동구매 관리자
  if (product.organizationId) {
    const orgManager = await RoleAssignment.findOne({
      where: {
        userId,
        role: 'groupbuy_manager',
        scope: product.organizationId,
        scopeType: 'organization',
        isActive: true
      }
    });
    if (orgManager) return true;
  }

  // 3. Supplier 소유권
  const supplier = await Supplier.findOne({ where: { userId } });
  if (supplier && product.supplierId === supplier.id) return true;

  return false;
}
```

---

## 4. UI 통합 패턴

### 4.1 조직 필터 UI (Forum)

```typescript
// 프론트엔드: 조직 선택 드롭다운
const ForumPostList: React.FC = () => {
  const [selectedOrg, setSelectedOrg] = useState<string | 'all'>('all');
  const { data: organizations } = useOrganizations();
  const { data: posts } = useForumPosts({
    organizationId: selectedOrg === 'all' ? undefined : selectedOrg
  });

  return (
    <div>
      <Select value={selectedOrg} onChange={setSelectedOrg}>
        <option value="all">전체 게시글</option>
        {organizations?.map(org => (
          <option key={org.id} value={org.id}>
            {org.type === 'branch' ? '분회' : '지부'}: {org.name}
          </option>
        ))}
      </Select>

      <PostList posts={posts} />
    </div>
  );
};

// API 엔드포인트
GET /api/v1/forum/posts?organizationId=org-seoul
GET /api/v1/forum/posts?organizationScope=branch  // 모든 분회 게시글
GET /api/v1/forum/posts?organizationScope=global  // 전체 공지
```

### 4.2 조직 필터 UI (Dropshipping)

```typescript
// 프론트엔드: 공동구매 상품 목록
const GroupbuyProductList: React.FC = () => {
  const { data: myOrganizations } = useMyOrganizations();
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const { data: products } = useProducts({
    organizationId: selectedOrg,
    scope: selectedOrg ? 'organization' : 'global'
  });

  return (
    <div>
      <Tabs>
        <Tab value="global">전체 상품</Tab>
        {myOrganizations?.map(org => (
          <Tab key={org.id} value={org.id}>
            {org.name} 공동구매
          </Tab>
        ))}
      </Tabs>

      <ProductGrid products={products} />

      {selectedOrg && (
        <GroupbuyStatus organizationId={selectedOrg} />
      )}
    </div>
  );
};

// API 엔드포인트
GET /api/v2/products?scope=global
GET /api/v2/products?organizationId=org-seoul&scope=organization
GET /api/v2/products/groupbuy?organizationId=org-busan&status=active
```

### 4.3 Admin UI: 조직별 대시보드

```typescript
// Admin: 조직 선택 후 포럼/공동구매 통합 대시보드
const OrganizationDashboard: React.FC = () => {
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const { data: org } = useOrganization(selectedOrg);

  return (
    <div>
      <OrganizationSelector value={selectedOrg} onChange={setSelectedOrg} />

      {org && (
        <Grid>
          <Card title="포럼 통계">
            <ForumStats organizationId={org.id} />
          </Card>

          <Card title="공동구매 현황">
            <GroupbuyStats organizationId={org.id} />
          </Card>

          <Card title="정산 내역">
            <SettlementSummary organizationId={org.id} />
          </Card>
        </Grid>
      )}
    </div>
  );
};

// API 엔드포인트
GET /api/admin/organizations/:id/stats
{
  "forum": {
    "postCount": 150,
    "activeMembers": 45,
    "recentPosts": [...]
  },
  "groupbuy": {
    "activeCampaigns": 3,
    "totalParticipants": 120,
    "totalAmount": 5000000
  },
  "settlement": {
    "lastMonth": 1500000,
    "pending": 300000
  }
}
```

---

## 5. Extension App 제작 패턴

### 5.1 Organization-Forum Extension

```typescript
// packages/organization-forum/src/manifest.ts
export const organizationForumManifest: AppManifest = {
  appId: 'organization-forum',
  name: 'Organization Forum Extension',
  type: 'extension',

  dependencies: {
    'forum-core': '>=1.0.0',
    'organization-core': '>=1.0.0',
  },

  // Migration: ForumPost에 organizationId, organizationScope 추가
  migrations: [
    './migrations/001-add-organization-fields-to-forum.ts',
  ],

  // ACF: 조직 필터 설정
  acf: [
    {
      groupId: 'organization_forum_settings',
      label: '조직 게시판 설정',
      appliesTo: 'forum_post',
      fields: [
        {
          key: 'organizationId',
          type: 'select',
          label: '소속 조직',
          fetchOptions: '/api/v1/organizations',
        },
        {
          key: 'organizationScope',
          type: 'select',
          label: '공개 범위',
          choices: {
            branch: '분회만',
            division: '지부만',
            global: '전체 공개',
          },
        },
      ],
    },
  ],

  // Lifecycle: 조직별 카테고리 자동 생성
  lifecycle: {
    install: async (context) => {
      const { dataSource, logger } = context;
      const orgRepo = dataSource.getRepository('Organization');
      const categoryRepo = dataSource.getRepository('ForumCategory');

      const orgs = await orgRepo.find({ where: { type: 'branch' } });

      for (const org of orgs) {
        await categoryRepo.save({
          name: `${org.name} 공지사항`,
          slug: `org-${org.id}-announcements`,
          metadata: { organizationId: org.id },
        });

        logger.info(`[organization-forum] Created category for ${org.name}`);
      }
    },
  },
};
```

### 5.2 Organization-Groupbuy Extension

```typescript
// packages/organization-groupbuy/src/manifest.ts
export const organizationGroupbuyManifest: AppManifest = {
  appId: 'organization-groupbuy',
  name: 'Organization Group Buying Extension',
  type: 'extension',

  dependencies: {
    'dropshipping-core': '>=1.0.0',
    'organization-core': '>=1.0.0',
  },

  // Extension 테이블
  ownsTables: [
    'groupbuy_campaigns',
    'groupbuy_participants',
    'groupbuy_orders',
  ],

  // Migration: Product에 organizationId, organizationPricing 추가
  migrations: [
    './migrations/001-add-organization-fields-to-product.ts',
    './migrations/002-create-groupbuy-tables.ts',
  ],

  // CPT
  cpt: [
    {
      name: 'groupbuy_campaign',
      storage: 'entity',
      label: '공동구매 캠페인',
    },
  ],

  // ACF: 공동구매 설정
  acf: [
    {
      groupId: 'groupbuy_settings',
      label: '공동구매 설정',
      appliesTo: 'ds_product',
      fields: [
        {
          key: 'organizationId',
          type: 'select',
          label: '대상 조직',
          fetchOptions: '/api/v1/organizations',
        },
        {
          key: 'minQuantity',
          type: 'number',
          label: '최소 주문 수량',
        },
        {
          key: 'deadline',
          type: 'datetime',
          label: '구매 마감일',
        },
        {
          key: 'organizationPrice',
          type: 'number',
          label: '조직 특가',
        },
      ],
    },
  ],

  // Lifecycle: 조직별 공동구매 캠페인 초기화
  lifecycle: {
    install: async (context) => {
      const { dataSource, logger } = context;
      const orgRepo = dataSource.getRepository('Organization');
      const campaignRepo = dataSource.getRepository('GroupbuyCampaign');

      const orgs = await orgRepo.find();

      for (const org of orgs) {
        await campaignRepo.save({
          organizationId: org.id,
          name: `${org.name} 공동구매`,
          status: 'inactive',
          settings: {
            commissionRate: 0.05,
            minParticipants: 10,
          },
        });

        logger.info(`[organization-groupbuy] Initialized campaign for ${org.name}`);
      }
    },
  },
};
```

---

## 6. API 엔드포인트 통합

### 6.1 Forum API (Organization 연동)

```typescript
// GET /api/v1/forum/posts
// Query Params:
//   - organizationId?: string
//   - organizationScope?: 'branch' | 'division' | 'global'
//   - categoryId?: string
//   - status?: PostStatus

router.get('/posts', async (req, res) => {
  const { organizationId, organizationScope, categoryId, status } = req.query;

  const where: any = {};

  if (organizationId) {
    where.organizationId = organizationId;
  }

  if (organizationScope) {
    where.organizationScope = organizationScope;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status) {
    where.status = status;
  } else {
    where.status = 'published';
  }

  const posts = await ForumPost.find({ where, order: { createdAt: 'DESC' } });

  res.json(posts);
});

// POST /api/v1/forum/posts
// Body: { title, content, categoryId, organizationId?, organizationScope? }

router.post('/posts', authMiddleware, async (req, res) => {
  const { title, content, categoryId, organizationId, organizationScope } = req.body;
  const userId = req.user.id;

  // 권한 체크: 조직 게시글 작성 권한
  if (organizationId) {
    const hasPermission = await checkOrganizationPermission(
      userId,
      organizationId,
      'forum.write'
    );
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const post = await ForumPost.create({
    title,
    content,
    categoryId,
    authorId: userId,
    organizationId,
    organizationScope: organizationScope || 'global',
    status: 'published',
  }).save();

  res.json(post);
});
```

### 6.2 Dropshipping API (Organization 연동)

```typescript
// GET /api/v2/products
// Query Params:
//   - organizationId?: string
//   - scope?: 'global' | 'organization'
//   - status?: ProductStatus

router.get('/products', async (req, res) => {
  const { organizationId, scope, status } = req.query;

  const where: any = {};

  if (scope === 'global') {
    where.scope = 'global';
  } else if (organizationId) {
    where.organizationId = organizationId;
    where.scope = 'organization';
  }

  if (status) {
    where.status = status;
  } else {
    where.status = 'active';
  }

  const products = await Product.find({ where });

  res.json(products);
});

// POST /api/v2/products (Supplier)
// Body: { name, description, price, organizationId?, organizationPricing? }

router.post('/products', authMiddleware, supplierOnly, async (req, res) => {
  const {
    name,
    description,
    supplierPrice,
    organizationId,
    organizationPricing,
  } = req.body;
  const userId = req.user.id;

  const supplier = await Supplier.findOne({ where: { userId } });
  if (!supplier) {
    return res.status(403).json({ error: 'Not a supplier' });
  }

  const product = await Product.create({
    name,
    description,
    supplierPrice,
    supplierId: supplier.id,
    organizationId,
    scope: organizationId ? 'organization' : 'global',
    organizationPricing,
    status: 'draft',
  }).save();

  res.json(product);
});

// GET /api/v2/groupbuy/campaigns
// Query Params: organizationId

router.get('/groupbuy/campaigns', async (req, res) => {
  const { organizationId } = req.query;

  const campaigns = await GroupbuyCampaign.find({
    where: {
      organizationId,
      status: 'active',
    },
    relations: ['products', 'participants'],
  });

  res.json(campaigns);
});
```

---

## 7. 테스트 시나리오

### 7.1 Organization + Forum 통합 테스트

```bash
# 1. Organization 생성
POST /api/admin/organizations
{
  "name": "서울지부",
  "type": "division"
}
# → org-seoul

POST /api/admin/organizations
{
  "name": "강남분회",
  "type": "branch",
  "parentId": "org-seoul"
}
# → org-gangnam

# 2. 조직별 포럼 카테고리 자동 생성 (organization-forum Extension)
GET /api/v1/forum/categories
[
  { "id": "cat1", "name": "서울지부 공지사항", "metadata": { "organizationId": "org-seoul" } },
  { "id": "cat2", "name": "강남분회 공지사항", "metadata": { "organizationId": "org-gangnam" } }
]

# 3. 조직 게시글 작성
POST /api/v1/forum/posts
{
  "title": "강남분회 정기 모임 공지",
  "content": "...",
  "categoryId": "cat2",
  "organizationId": "org-gangnam",
  "organizationScope": "branch"
}

# 4. 조직 필터링 조회
GET /api/v1/forum/posts?organizationId=org-gangnam
# → 강남분회 게시글만 반환

GET /api/v1/forum/posts?organizationScope=division
# → 서울지부 전체 게시글 반환 (강남분회 + 서초분회 + ...)
```

### 7.2 Organization + Dropshipping 통합 테스트

```bash
# 1. 조직 공동구매 상품 등록
POST /api/v2/products
{
  "name": "약국용 마스크 100개입",
  "supplierPrice": 50000,
  "organizationId": "org-seoul",
  "organizationPricing": {
    "org-seoul": {
      "price": 45000,
      "minQuantity": 50,
      "deadline": "2025-12-31T23:59:59Z"
    }
  }
}

# 2. 조직 상품 조회
GET /api/v2/products?organizationId=org-seoul&scope=organization
[
  {
    "id": "prod1",
    "name": "약국용 마스크 100개입",
    "supplierPrice": 50000,
    "organizationId": "org-seoul",
    "organizationPricing": {
      "org-seoul": { "price": 45000, "minQuantity": 50, "deadline": "2025-12-31" }
    }
  }
]

# 3. 공동구매 캠페인 생성
POST /api/v2/groupbuy/campaigns
{
  "organizationId": "org-seoul",
  "productIds": ["prod1"],
  "name": "서울지부 마스크 공동구매",
  "status": "active"
}

# 4. 조직별 정산
GET /api/admin/settlements?organizationId=org-seoul&period=2025-11
{
  "organizationId": "org-seoul",
  "period": { "start": "2025-11-01", "end": "2025-11-30" },
  "totalAmount": 2250000,
  "commission": 112500,
  "status": "completed"
}
```

---

## 8. 데이터 마이그레이션 전략

### 8.1 Organization-Core 도입 시 Migration

```typescript
// Migration: ForumPost에 organizationId 추가
export class AddOrganizationToForumPost1701234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 컬럼 추가
    await queryRunner.addColumn('forum_post', new TableColumn({
      name: 'organizationId',
      type: 'uuid',
      isNullable: true,
    }));

    await queryRunner.addColumn('forum_post', new TableColumn({
      name: 'organizationScope',
      type: 'varchar',
      length: '50',
      default: "'global'",
    }));

    // 2. 외래키 추가
    await queryRunner.createForeignKey('forum_post', new TableForeignKey({
      columnNames: ['organizationId'],
      referencedTableName: 'organizations',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
    }));

    // 3. 인덱스 추가
    await queryRunner.createIndex('forum_post', new TableIndex({
      name: 'idx_forum_post_organization',
      columnNames: ['organizationId', 'organizationScope'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('forum_post', 'idx_forum_post_organization');
    await queryRunner.dropForeignKey('forum_post', 'FK_forum_post_organization');
    await queryRunner.dropColumn('forum_post', 'organizationScope');
    await queryRunner.dropColumn('forum_post', 'organizationId');
  }
}
```

### 8.2 Product에 organizationId 추가

```typescript
// Migration: Product에 organizationId, organizationPricing 추가
export class AddOrganizationToProduct1701234567891 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('products', new TableColumn({
      name: 'organizationId',
      type: 'uuid',
      isNullable: true,
    }));

    await queryRunner.addColumn('products', new TableColumn({
      name: 'scope',
      type: 'varchar',
      length: '50',
      default: "'global'",
    }));

    await queryRunner.addColumn('products', new TableColumn({
      name: 'organizationPricing',
      type: 'jsonb',
      isNullable: true,
    }));

    await queryRunner.createForeignKey('products', new TableForeignKey({
      columnNames: ['organizationId'],
      referencedTableName: 'organizations',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
    }));

    await queryRunner.createIndex('products', new TableIndex({
      name: 'idx_products_organization',
      columnNames: ['organizationId', 'scope'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('products', 'idx_products_organization');
    await queryRunner.dropForeignKey('products', 'FK_products_organization');
    await queryRunner.dropColumn('products', 'organizationPricing');
    await queryRunner.dropColumn('products', 'scope');
    await queryRunner.dropColumn('products', 'organizationId');
  }
}
```

---

## 9. 결론 및 권장사항

### 9.1 현재 상태 평가

**✅ 우수한 설계**:
1. Forum/Dropshipping 도메인이 Core/Extension 구조로 완벽히 분리됨
2. 각 Core 앱은 독립적 (서로 의존성 없음)
3. Extension App이 Core CPT/ACF를 확장하는 패턴 명확
4. 독립 웹서버에서 선택적 설치 가능

**🔵 준비 완료**:
- Organization-Core 도입 시 `userId` → `organizationId` 추가만으로 확장 가능
- RBAC의 `RoleAssignment`에 scope 추가로 조직별 권한 관리 가능

### 9.2 다음 단계 작업 우선순위

#### Priority 1: AppManager UI 연동
- [ ] App Store 설치/삭제 UI 구현
- [ ] 의존성 그래프 시각화
- [ ] CPT/ACF 자동 등록 검증

#### Priority 2: Organization-Core 도입
- [ ] Organization 엔티티 설계
- [ ] OrganizationMember 관계 테이블
- [ ] Migration 작성 (ForumPost, Product에 organizationId 추가)

#### Priority 3: Organization Extension 제작
- [ ] `organization-forum`: 조직별 게시판 자동 생성
- [ ] `organization-groupbuy`: 공동구매 캠페인 관리
- [ ] `organization-yaksa`: 약사회 특화 기능

#### Priority 4: UI/API 통합
- [ ] 조직 필터 드롭다운 UI
- [ ] 조직별 대시보드 (Admin)
- [ ] 조직 스코프 기반 권한 체크 미들웨어

---

**최종 결론**: Forum과 Dropshipping 도메인은 App Store 기반 Core/Extension 구조로 완벽하게 설계되었으며, Organization-Core 연동 시에도 최소한의 Migration만으로 확장 가능한 구조를 갖추고 있음.
