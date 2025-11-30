# Forum 도메인 Phase 3 조사 보고서

**작성일**: 2025-11-30
**패키지**: `@o4o-apps/forum` (Core), `@o4o-apps/forum-yaksa`, `@o4o-apps/forum-neture` (Extensions)

---

## 1. Forum Core 구조 분석

### 1.1 Core App 정의 (`forum-app/src/manifest.ts`)

```typescript
{
  appId: 'forum-core',
  name: 'Forum Core',
  type: 'core',
  version: '1.0.0',

  // 데이터 소유권
  ownsTables: [
    'forum_post',
    'forum_category',
    'forum_comment',
    'forum_tag',
    'forum_like',
    'forum_bookmark',
  ],

  // CPT 정의
  cpt: [
    { name: 'forum_post', storage: 'entity', label: '포럼 게시글' },
    { name: 'forum_category', storage: 'entity', label: '포럼 카테고리' },
    { name: 'forum_comment', storage: 'entity', label: '포럼 댓글' },
    { name: 'forum_tag', storage: 'entity', label: '포럼 태그' },
  ],

  // 권한
  permissions: [
    'forum.read',
    'forum.write',
    'forum.comment',
    'forum.moderate',
    'forum.admin',
  ],

  // 삭제 정책
  uninstallPolicy: {
    defaultMode: 'keep-data',
    allowPurge: true,
    autoBackup: true,
  },
}
```

### 1.2 핵심 엔티티 구조

#### ForumPost
```typescript
@Entity('forum_post')
class ForumPost {
  id: string;
  title: string;
  content: string;
  categoryId: string;  // → organizationId 추가 가능
  authorId: string;    // User 연동

  status: PostStatus;  // DRAFT, PUBLISHED, PENDING, REJECTED, ARCHIVED
  type: PostType;      // DISCUSSION, QUESTION, ANNOUNCEMENT, POLL, GUIDE

  isPinned: boolean;
  isLocked: boolean;
  allowComments: boolean;

  viewCount: number;
  commentCount: number;
  likeCount: number;

  tags?: string[];
  metadata?: Record<string, unknown>;  // Extension 확장 포인트

  // 권한 메서드
  canUserView(userRole: string): boolean;
  canUserEdit(userId: string, userRole: string): boolean;
  canUserComment(userRole: string): boolean;
}
```

#### ForumCategory
```typescript
@Entity('forum_category')
class ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;

  accessLevel: 'all' | 'member' | 'business' | 'admin';
  requireApproval: boolean;

  postCount: number;
  createdBy?: string;

  // 권한 메서드
  canUserAccess(userRole: string): boolean;
  canUserPost(userRole: string): boolean;
}
```

### 1.3 Lifecycle Hooks

#### Uninstall Hook (`lifecycle/uninstall.ts`)
```typescript
export async function uninstall(context: UninstallContext) {
  const { dataSource, logger, options = {} } = context;
  const { purgeData = false } = options;

  // 1. 의존성 검증 (AppManager가 처리)
  // 2. 데이터 보존 or 삭제
  if (purgeData) {
    await purgeForumData(dataSource, logger);
  } else {
    logger.info('Keep-data mode - Forum data preserved');
  }
  // 3. 권한 제거 (AppManager의 PermissionService가 처리)
}
```

---

## 2. Forum Extension 구조 분석

### 2.1 Forum-Yaksa Extension (`forum-yaksa/src/manifest.ts`)

```typescript
{
  appId: 'forum-yaksa',
  name: 'Forum Extension – Yaksa Organization',
  type: 'extension',
  version: '1.0.0',

  // Core 의존성
  dependencies: {
    'forum-core': '>=1.0.0',
  },

  // Extension 테이블
  ownsTables: [
    'yaksa_forum_community',
    'yaksa_forum_community_member',
  ],

  // Core CPT 확장
  extendsCPT: [
    {
      name: 'forum_post',
      acfGroup: 'pharmacy_meta',
    },
  ],

  // 약물 메타데이터 ACF
  acf: [
    {
      groupId: 'pharmacy_meta',
      label: '약물 메타데이터',
      fields: [
        { key: 'drugName', type: 'string', label: '약물명' },
        { key: 'drugCode', type: 'string', label: '약물 코드 (EDI)' },
        { key: 'category', type: 'select', label: '카테고리',
          options: ['복약지도', '부작용', '상호작용', '조제'] },
        { key: 'severity', type: 'select', label: '중요도',
          options: ['일반', '주의', '경고'] },
        { key: 'caseStudy', type: 'boolean', label: '케이스 스터디' },
      ],
    },
  ],

  // 기본 카테고리 설정
  defaultConfig: {
    categories: [
      { name: '지부 공지', slug: 'branch-announcements' },
      { name: '복약지도', slug: 'medication-guidance' },
      { name: '부작용 공유', slug: 'side-effects' },
      { name: '교육자료', slug: 'education' },
    ],
    requireApproval: true,
  },
}
```

### 2.2 YaksaCommunity 엔티티

```typescript
@Entity('yaksa_forum_community')
class YaksaCommunity {
  id: string;
  name: string;
  description?: string;

  type: CommunityType;  // PERSONAL, BRANCH, DIVISION, GLOBAL
  ownerUserId: string;  // → organizationId 추가 가능

  requireApproval: boolean;
  metadata?: Record<string, unknown>;

  // 권한 메서드
  canUserManage(userId: string, userRole: string): boolean;
  canUserView(): boolean;
}
```

---

## 3. Organization-Core 연동 분석

### 3.1 현재 구조

**✅ 좋은 점**:
- `userId` 기반 데이터 연결 → `organizationId` 추가 용이
- `metadata` 필드로 확장 가능
- YaksaCommunity의 `type` 열거형이 조직 계층과 유사

**🔵 현재 상태 (정상)**:
- Organization 테이블 없음 → **예상된 상태** (아직 미도입)
- 조직 기능은 Extension으로 추가 예정

### 3.2 Organization 연동 시나리오

#### Scenario A: ForumPost에 organizationId 추가
```typescript
@Entity('forum_post')
class ForumPost {
  // ... 기존 필드 ...

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;  // 분회/지부/전체

  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  // 조회 필터
  static findByOrganization(orgId: string): Promise<ForumPost[]> {
    return this.find({ where: { organizationId: orgId } });
  }
}
```

#### Scenario B: YaksaCommunity를 Organization 기반으로 변환
```typescript
@Entity('yaksa_forum_community')
class YaksaCommunity {
  id: string;
  name: string;

  organizationId: string;  // Organization 테이블 참조
  type: CommunityType;     // BRANCH, DIVISION, GLOBAL

  // 자동 생성 로직
  static async createForOrganization(org: Organization) {
    if (org.type === 'branch') {
      return this.create({
        name: `${org.name} 커뮤니티`,
        organizationId: org.id,
        type: CommunityType.BRANCH,
      });
    }
  }
}
```

### 3.3 RBAC 확장

#### 조직별 역할 할당
```typescript
// RoleAssignment에 scope 추가
@Entity('role_assignments')
class RoleAssignment {
  userId: string;
  role: string;  // 'forum_moderator', 'branch_admin'

  scope?: string;        // organizationId
  scopeType?: string;    // 'organization', 'global'

  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
}

// 권한 체크
async function canUserModeratePost(userId: string, post: ForumPost) {
  const assignments = await RoleAssignment.find({
    where: {
      userId,
      role: 'forum_moderator',
      isActive: true,
      scope: post.organizationId,  // 조직 스코프 일치
    }
  });
  return assignments.length > 0;
}
```

---

## 4. CPT·ACF·Block Editor 연동

### 4.1 CPT 등록 (App Store 설치 시)

```typescript
// AppManager.install('forum-core')
const cptRegistry = new CPTRegistry();

for (const cptDef of manifest.cpt) {
  cptRegistry.register({
    name: cptDef.name,
    storage: cptDef.storage,
    label: cptDef.label,
    entity: ForumPost,  // TypeORM Entity
    supports: cptDef.supports,
  });
}
```

### 4.2 ACF 필드 확장 (Extension 설치 시)

```typescript
// AppManager.install('forum-yaksa')
const acfRegistry = new ACFRegistry();

for (const acfGroup of manifest.acf) {
  acfRegistry.registerGroup({
    groupId: acfGroup.groupId,
    label: acfGroup.label,
    appliesTo: 'forum_post',  // CPT 확장
    fields: acfGroup.fields,
  });
}

// 게시글 조회 시 ACF 데이터 자동 병합
const post = await ForumPost.findOne({ where: { id } });
const acfData = await acfRegistry.getFieldValues('forum_post', post.id);
return { ...post, acf: acfData };
```

### 4.3 Block Editor 통합 (향후)

```typescript
// forum_post CPT용 Block 정의
const forumPostBlocks = [
  { type: 'core/paragraph', supports: ['text', 'formatting'] },
  { type: 'core/image', supports: ['upload', 'caption'] },
  { type: 'forum/drug-info', acfGroup: 'pharmacy_meta' },  // Extension Block
  { type: 'forum/case-study', acfGroup: 'pharmacy_meta' },
];
```

---

## 5. App Store 패키징 검증

### 5.1 설치 시나리오

```bash
# 1. Core 앱 설치
POST /api/admin/appstore/install
{
  "appId": "forum-core",
  "version": "1.0.0"
}

# 자동 실행:
# - Migration 실행 (forum_post, forum_category 테이블 생성)
# - CPT 등록 (forum_post, forum_category)
# - 권한 등록 (forum.read, forum.write, ...)
# - 라우트 등록 (/admin/forum/*)

# 2. Extension 설치
POST /api/admin/appstore/install
{
  "appId": "forum-yaksa",
  "version": "1.0.0"
}

# 자동 실행:
# - 의존성 검증 (forum-core 설치 여부 확인)
# - Extension 테이블 생성 (yaksa_forum_community)
# - ACF 그룹 등록 (pharmacy_meta → forum_post CPT 확장)
# - 기본 카테고리 생성 (복약지도, 부작용 공유, ...)
```

### 5.2 삭제 시나리오

```bash
# Extension 삭제 (정상)
DELETE /api/admin/appstore/uninstall/forum-yaksa?purgeData=false

# 자동 실행:
# - keep-data 모드 (yaksa_forum_community 테이블 보존)
# - ACF 그룹 비활성화 (데이터 보존)
# - Core는 유지됨

# Core 삭제 시도 (Extension 존재 시 거부)
DELETE /api/admin/appstore/uninstall/forum-core

# 응답:
{
  "error": "Cannot uninstall forum-core: forum-yaksa depends on it",
  "dependents": ["forum-yaksa", "forum-neture"]
}

# Core 삭제 (모든 Extension 제거 후)
DELETE /api/admin/appstore/uninstall/forum-core?purgeData=true

# 자동 실행:
# - Purge 모드 (forum_post, forum_category 등 테이블 삭제)
# - CPT 등록 해제
# - 권한 제거
# - 라우트 제거
```

---

## 6. 독립 웹서버 선택적 설치 패턴

### 6.1 약사회 웹사이트 (yaksa.or.kr)

```json
{
  "installedApps": [
    "forum-core",
    "forum-yaksa",
    "organization-core",     // 향후
    "organization-yaksa"     // 향후
  ],
  "features": {
    "forum": {
      "categories": ["지부 공지", "복약지도", "부작용 공유"],
      "acf": ["pharmacy_meta"],
      "organizationFilter": true  // 분회/지부 필터
    }
  }
}
```

### 6.2 네츄어 웹사이트 (neture.co.kr)

```json
{
  "installedApps": [
    "forum-core",
    "forum-neture",
    "dropshipping-core",
    "dropshipping-cosmetics"
  ],
  "features": {
    "forum": {
      "categories": ["공지사항", "상품 Q&A", "리뷰"],
      "acf": [],  // 약물 메타데이터 없음
      "organizationFilter": false
    },
    "dropshipping": {
      "enabled": true
    }
  }
}
```

### 6.3 테스트 사이트 (dev.neture.co.kr)

```json
{
  "installedApps": [
    "forum-core"  // Extension 없음
  ],
  "features": {
    "forum": {
      "categories": ["일반 게시판"],
      "acf": [],
      "organizationFilter": false
    }
  }
}
```

---

## 7. Extension 제작 가이드 (향후)

### 7.1 Organization-Forum Extension 예시

```typescript
// packages/organization-forum/src/manifest.ts
export const organizationForumManifest = {
  appId: 'organization-forum',
  name: 'Organization Forum Extension',
  type: 'extension',

  dependencies: {
    'forum-core': '>=1.0.0',
    'organization-core': '>=1.0.0',
  },

  // Migration: ForumPost에 organizationId 컬럼 추가
  migrations: [
    './migrations/001-add-organization-id.ts',
  ],

  // ACF: 조직 필터 UI
  acf: [
    {
      groupId: 'organization_filter',
      label: '조직 필터',
      appliesTo: 'forum_post',
      fields: [
        { key: 'organizationId', type: 'select', label: '소속 조직' },
        { key: 'visibility', type: 'select', label: '공개 범위',
          options: ['분회만', '지부만', '전체'] },
      ],
    },
  ],

  // 자동 생성 로직
  lifecycle: {
    install: async (context) => {
      // 모든 Organization에 대해 ForumCategory 자동 생성
      const orgs = await Organization.find({ where: { type: 'branch' } });
      for (const org of orgs) {
        await ForumCategory.create({
          name: `${org.name} 게시판`,
          slug: `org-${org.id}`,
          metadata: { organizationId: org.id },
        }).save();
      }
    },
  },
};
```

---

## 8. 권장사항

### 8.1 즉시 작업 가능
- [x] Forum Core 매니페스트 완성됨
- [x] Extension 구조 완성됨
- [x] Lifecycle hooks 구현됨
- [ ] AppManager UI 연동 (설치/삭제 버튼)
- [ ] CPT/ACF 자동 등록 검증

### 8.2 Organization 연동 후 작업
- [ ] ForumPost에 `organizationId` 컬럼 추가
- [ ] YaksaCommunity를 Organization 기반으로 변환
- [ ] RoleAssignment에 `scope: organizationId` 추가
- [ ] "우리 분회/지부/전체" 탭 UI 구현

### 8.3 Block Editor 통합 (장기)
- [ ] forum_post CPT를 Block Editor로 편집
- [ ] Extension Block: `forum/drug-info`, `forum/case-study`
- [ ] ACF 데이터를 Block 속성으로 연동

---

## 결론

**✅ Forum 도메인은 App Store 기반 Core/Extension 구조로 완벽하게 설계됨**

1. **Core/Extension 분리**: forum-app (Core) + forum-yaksa/forum-neture (Extensions)
2. **데이터 소유권**: ownsTables로 명확히 정의
3. **설치/삭제**: Lifecycle hooks + 의존성 검증 + keep-data 정책
4. **독립 웹서버**: 각 서비스별 필요한 앱만 선택 설치
5. **Organization 연동**: userId → organizationId 추가로 확장 가능
6. **RBAC 통합**: RoleAssignment + scope로 조직별 역할 관리
7. **CPT/ACF 확장**: Extension이 Core CPT에 ACF 필드 추가

**다음 단계**: AppManager UI 연동 및 Organization-Core 도입 시 Migration 작성
