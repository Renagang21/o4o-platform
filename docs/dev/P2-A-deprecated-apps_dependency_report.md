# P2-A: Deprecated Apps Dependency Analysis Report

> Phase P2-A: 삭제 예정 앱 의존성 전수 조사 보고서
> 작성일: 2025-01-25
> 분석 대상: crowdfunding, forum, digital-signage 앱 및 관련 타입 패키지

---

## 1. Executive Summary

### 조사 대상 (5개)

| 항목 | 경로 | 타입 | 상태 |
|------|------|------|------|
| Crowdfunding App | `apps/crowdfunding` | Frontend App | 🔴 Active Integration |
| Forum App | `apps/forum` | Frontend App | 🔴 Active Integration |
| Digital Signage App | `apps/digital-signage` | Frontend App | 🔴 Active Integration |
| Crowdfunding Types | `packages/crowdfunding-types` | Package | 🟡 Used by 15 files |
| Forum Types | `packages/forum-types` | Package | 🟡 Used by 13 files |

### 핵심 결론

**⚠️ 즉시 삭제 불가능 - 모든 앱이 API Server 및 Admin Dashboard와 긴밀하게 통합되어 있음**

- **API Server**: 3개 앱 모두 활성화된 API 엔드포인트, 컨트롤러, 서비스, 엔티티 보유
- **Admin Dashboard**: 3개 앱 모두 보호된 라우트 및 전용 Router 컴포넌트 보유
- **Database**: Crowdfunding 및 Forum은 마이그레이션으로 생성된 테이블 보유
- **Permissions**: RBAC 시스템에 권한 등록 (`crowdfunding:read`, `forum:read`, `signage:read`)

---

## 2. Dependency Matrix

### 2.1 Apps Dependency Matrix

| App | API Server | Admin Dashboard | Main Site | Database | Build Config | Status |
|-----|------------|-----------------|-----------|----------|--------------|--------|
| **crowdfunding** | ✅ Active (18 files) | ✅ Active (Router) | ⚠️ Minimal (3 files) | ✅ Tables exist | ✅ Workspace | 🔴 Cannot delete |
| **forum** | ✅ Active (26 files) | ✅ Active (Router) | ❌ No usage | ✅ Tables exist | ✅ Workspace | 🔴 Cannot delete |
| **digital-signage** | ✅ Active (18 files) | ✅ Active (Router) | ❌ No usage | ❌ No tables | ✅ Workspace | 🔴 Cannot delete |

### 2.2 Packages Dependency Matrix

| Package | Imported By | Import Count | Used In API Server | Status |
|---------|-------------|--------------|-------------------|--------|
| **@o4o/crowdfunding-types** | api-server, admin-dashboard, crowdfunding | 15 files | ✅ Yes | 🟡 Remove imports first |
| **@o4o/forum-types** | api-server, admin-dashboard, forum | 13 files | ✅ Yes | 🟡 Remove imports first |

---

## 3. API Server Integration Analysis

### 3.1 Crowdfunding Integration (18 files)

#### Routes
**File**: `apps/api-server/src/routes/crowdfunding.ts` (46 lines)
- **Registered**: `routes.config.ts:461-462`
  ```typescript
  app.use('/api/crowdfunding', standardLimiter, crowdfundingRoutes);
  app.use('/api/v1/crowdfunding', crowdfundingV1Routes);
  ```

**Active Endpoints**:
- `GET /api/crowdfunding/projects` - 프로젝트 목록 조회
- `GET /api/crowdfunding/projects/:id` - 프로젝트 상세 조회
- `POST /api/crowdfunding/projects` - 프로젝트 생성 (인증 필요)
- `PATCH /api/crowdfunding/projects/:id` - 프로젝트 수정
- `POST /api/crowdfunding/backings` - 후원하기 (인증 필요)
- `GET /api/crowdfunding/backings/my` - 내 후원 목록
- `PATCH /api/admin/projects/:id/status` - 프로젝트 상태 변경 (관리자)

#### Controllers (4 files)
- `controllers/crowdfunding/BackingController.ts`
- `controllers/crowdfunding/FundingProjectController.ts`
- `controllers/crowdfunding/index.ts`
- `modules/funding/controllers/funding.controller.ts`

#### Services (3 files)
- `modules/funding/services/FundingProjectService.ts`
- `modules/funding/services/FundingService.ts`
- `services/crowdfunding.service.ts`

#### Entities (5 files)
- `database/entities/crowdfunding/FundingBacking.ts`
- `database/entities/crowdfunding/FundingProject.ts`
- `database/entities/crowdfunding/FundingReward.ts`
- `database/entities/crowdfunding/FundingUpdate.ts`
- `database/entities/crowdfunding/index.ts`

#### Database Migrations
- **1737011779405-InitializeSchema.ts** (line 3045-3201): 테이블 생성
  - `funding_projects`
  - `funding_rewards`
  - `funding_backings`
  - `funding_updates`

#### Type Imports
- **15 files** import `@o4o/crowdfunding-types`:
  - `BackingController.ts`, `FundingProjectController.ts`
  - `FundingBacking.ts`, `FundingProject.ts`, `FundingReward.ts`, `FundingUpdate.ts`
  - `FundingProjectService.ts`, `FundingService.ts`
  - `crowdfunding.service.ts`
  - `crowdfunding.ts` (routes)
  - Plus 5 more files

---

### 3.2 Forum Integration (26 files)

#### Routes
**File**: `apps/api-server/src/routes/forum.ts` (46 lines)
- **Registered**: `routes.config.ts:427-428`
  ```typescript
  app.use('/api/forum', standardLimiter, forumRoutes);
  app.use('/api/v1/forum', forumV1Routes);
  ```

**Active Endpoints**:
- `GET /api/forum/posts` - 게시글 목록
- `GET /api/forum/posts/:id` - 게시글 상세
- `POST /api/forum/posts` - 게시글 작성 (인증 필요)
- `PATCH /api/forum/posts/:id` - 게시글 수정
- `DELETE /api/forum/posts/:id` - 게시글 삭제
- `POST /api/forum/posts/:id/comments` - 댓글 작성
- `GET /api/forum/categories` - 카테고리 목록

#### Controllers (3 files)
- `controllers/forum/ForumController.ts`
- `controllers/forum/ForumCategoryController.ts`
- `controllers/forum/index.ts`

#### Services (2 files)
- `services/forum/forum.service.ts`
- `services/forum/forumCategory.service.ts`

#### Entities (6 files)
- `database/entities/forum/ForumPost.ts`
- `database/entities/forum/ForumComment.ts`
- `database/entities/forum/ForumCategory.ts`
- `database/entities/forum/ForumAttachment.ts`
- `database/entities/forum/ForumReaction.ts`
- `database/entities/forum/index.ts`

#### Database Migrations
- **1737011779405-InitializeSchema.ts** (line 2543-2758): 테이블 생성
  - `forum_categories`
  - `forum_posts`
  - `forum_comments`
  - `forum_attachments`
  - `forum_reactions`

#### Type Imports
- **13 files** import `@o4o/forum-types`:
  - `ForumController.ts`, `ForumCategoryController.ts`
  - `ForumPost.ts`, `ForumComment.ts`, `ForumCategory.ts`, etc.
  - `forum.service.ts`, `forumCategory.service.ts`
  - `forum.ts` (routes)
  - Plus 5 more files

---

### 3.3 Digital Signage Integration (18 files)

#### Routes
**File**: `apps/api-server/src/routes/signage.ts` (50 lines)
- **Registered**: `routes.config.ts:472`
  ```typescript
  app.use('/api/signage', standardLimiter, signageRoutes);
  ```

**Active Endpoints**:
- `GET /api/signage/displays` - 디스플레이 목록
- `GET /api/signage/displays/:id` - 디스플레이 상세
- `POST /api/signage/displays` - 디스플레이 생성 (인증 필요)
- `PATCH /api/signage/displays/:id` - 디스플레이 수정
- `DELETE /api/signage/displays/:id` - 디스플레이 삭제
- `POST /api/signage/content` - 콘텐츠 업로드
- `GET /api/signage/schedules` - 스케줄 목록

#### Controllers (3 files)
- `controllers/signage/SignageController.ts`
- `controllers/signage/SignageDisplayController.ts`
- `controllers/signage/index.ts`

#### Services (2 files)
- `services/signage/signage.service.ts`
- `services/signage/signageDisplay.service.ts`

#### Entities (5 files)
- `database/entities/signage/SignageDisplay.ts`
- `database/entities/signage/SignageContent.ts`
- `database/entities/signage/SignageSchedule.ts`
- `database/entities/signage/SignagePlaylist.ts`
- `database/entities/signage/index.ts`

#### Database Status
- **⚠️ No migrations found** - 테이블 생성 마이그레이션이 없거나 별도 파일에 존재

---

## 4. Admin Dashboard Integration Analysis

### 4.1 Active Routes (App.tsx:713-732)

```typescript
// Forum
<Route path="/forum/*" element={
  <AdminProtectedRoute requiredPermissions={['forum:read']}>
    <ForumRouter />
  </AdminProtectedRoute>
} />

// Digital Signage
<Route path="/signage/*" element={
  <AdminProtectedRoute requiredPermissions={['signage:read']}>
    <SignageRouter />
  </AdminProtectedRoute>
} />

// Crowdfunding
<Route path="/crowdfunding/*" element={
  <AdminProtectedRoute requiredPermissions={['crowdfunding:read']}>
    <CrowdfundingRouter />
  </AdminProtectedRoute>
} />
```

### 4.2 Router Components

| Router | Import Path | Status |
|--------|-------------|--------|
| ForumRouter | `./routers/ForumRouter` | ✅ Active, lazy loaded |
| SignageRouter | `./routers/SignageRouter` | ✅ Active, lazy loaded |
| CrowdfundingRouter | `./routers/CrowdfundingRouter` | ✅ Active, lazy loaded |

### 4.3 Total Files Referencing Deprecated Apps

**Search Results**: 35 files in admin-dashboard reference crowdfunding/forum/signage

**File Distribution** (estimated):
- Router files: 3 files (`ForumRouter.tsx`, `SignageRouter.tsx`, `CrowdfundingRouter.tsx`)
- Page components: ~15 files (list pages, detail pages, form pages)
- UI components: ~10 files (tables, cards, modals)
- Types/utilities: ~7 files

---

## 5. Main Site Integration Analysis

### 5.1 Minimal Integration (3 files)

**Search Results**: Only 3 files reference these apps

**Likely Files**:
- Navigation/menu configuration (if these apps are linked in main site menu)
- Type imports (if main site uses crowdfunding-types)
- Legacy code (unused imports)

**Impact**: Low - main site has minimal dependency on these apps

---

## 6. Build Configuration Analysis

### 6.1 Workspace Configuration

**Root package.json** workspaces:
```json
{
  "workspaces": [
    "apps/crowdfunding",
    "apps/forum",
    "apps/digital-signage",
    "packages/crowdfunding-types",
    "packages/forum-types"
  ]
}
```

### 6.2 Type References in tsconfig

- Each app likely referenced in root `tsconfig.json` or app-specific tsconfig paths
- `@o4o/*` package aliases configured

---

## 7. Impact Assessment

### 7.1 삭제 시 영향도 평가

| 항목 | 영향 범위 | 영향도 | 필요 작업 |
|------|-----------|--------|-----------|
| **API Endpoints** | 3개 앱 × 평균 7개 엔드포인트 = ~21개 API | 🔴 Critical | Routes config 수정, 파일 삭제 |
| **Database Tables** | Crowdfunding 4개 테이블, Forum 5개 테이블 | 🔴 Critical | Migration으로 DROP 또는 보존 결정 |
| **Admin UI** | 3개 Router, ~35개 파일 | 🟡 High | Router 제거, App.tsx 수정 |
| **RBAC Permissions** | `crowdfunding:*`, `forum:*`, `signage:*` | 🟡 High | Permission 정의 제거 |
| **Type Packages** | 28개 파일에서 import | 🟡 High | Import 제거 작업 필요 |
| **Main Site** | 3개 파일만 참조 | 🟢 Low | Import 제거 간단 |

### 7.2 데이터 유실 위험

#### 🔴 High Risk
- **Crowdfunding**: `funding_projects`, `funding_backings` 테이블에 실제 데이터 존재 가능
- **Forum**: `forum_posts`, `forum_comments` 테이블에 사용자 생성 콘텐츠 존재 가능

#### 🟡 Medium Risk
- **Digital Signage**: 테이블 존재 여부 불확실, 사용 여부 확인 필요

#### ✅ Safe
- Type packages는 코드만 있으므로 데이터 유실 없음

---

## 8. Deletion Scope Categorization

### 8.1 🔴 Cannot Delete Immediately (즉시 삭제 불가)

**모든 3개 앱 + 2개 타입 패키지**

**이유**:
1. **API Server 활성 통합**: Routes, Controllers, Services, Entities 모두 존재
2. **Admin Dashboard 활성 UI**: Protected Routes, Router 컴포넌트 존재
3. **Database 의존성**: Crowdfunding/Forum은 실제 테이블 보유
4. **RBAC 통합**: 권한 시스템에 등록됨

### 8.2 🟡 Deletable with Significant Work (대규모 작업 후 삭제 가능)

**Phase P2-B 작업 범위 (예상 소요 시간: 4-6시간)**

#### Step 1: API Server 제거 작업
- [ ] Routes config에서 3개 라우트 제거 (`routes.config.ts`)
- [ ] Controllers 삭제 (10개 파일)
- [ ] Services 삭제 (7개 파일)
- [ ] Entities 삭제 (16개 파일)
- [ ] Routes 파일 삭제 (3개 파일: `crowdfunding.ts`, `forum.ts`, `signage.ts`)
- [ ] Type import 제거 (28개 파일에서 import 문 삭제)

#### Step 2: Database 정리
- [ ] **결정 필요**: 테이블 DROP vs 보존
  - DROP 시: Migration 생성하여 9개 테이블 삭제
  - 보존 시: 데이터 백업 후 read-only 처리
- [ ] RBAC 권한 정의 제거 (seeds/roles-permissions)

#### Step 3: Admin Dashboard 제거 작업
- [ ] App.tsx에서 3개 Route 제거
- [ ] Router 컴포넌트 삭제 (3개 파일)
- [ ] 페이지 컴포넌트 삭제 (~35개 파일)
- [ ] Navigation/menu에서 링크 제거

#### Step 4: Main Site 정리
- [ ] 3개 파일에서 참조 제거 (import 문 정리)

#### Step 5: Build Config 제거
- [ ] Root package.json workspaces에서 5개 항목 제거
- [ ] tsconfig paths 정리

#### Step 6: 앱/패키지 폴더 삭제
- [ ] `rm -rf apps/crowdfunding`
- [ ] `rm -rf apps/forum`
- [ ] `rm -rf apps/digital-signage`
- [ ] `rm -rf packages/crowdfunding-types`
- [ ] `rm -rf packages/forum-types`

#### Step 7: 검증
- [ ] `pnpm install` 정상 실행
- [ ] `pnpm build` 정상 실행
- [ ] Type check 통과 (`pnpm type-check`)
- [ ] API Server 정상 시작
- [ ] Admin Dashboard 정상 빌드

### 8.3 ⏸️ Recommendation: Defer Deletion (삭제 보류 권장)

**권장 사항**: P3 (App Market) 완료 시점까지 보류

**근거**:
1. **기능적 가치**: Crowdfunding, Forum, Signage는 플랫폼 핵심 기능
2. **데이터 보존**: 실제 사용자 데이터 존재 가능성
3. **P3 대체 가능성**: App Market 구조로 전환 시 이들 기능을 독립 앱으로 재구성 가능
4. **리스크 vs 효익**:
   - 리스크: 데이터 유실, 기능 손실
   - 효익: 빌드 시간 단축, 코드베이스 정리 (상대적으로 작음)

**대안**:
- 현재: "Deprecated" 태그 추가, 문서화
- P2-B: Admin Dashboard에서 "개발 중" 표시 추가
- P3: App Market 구조로 마이그레이션 계획

---

## 9. Phase P2-B Execution Plan (If Deletion Proceeds)

### 9.1 Pre-Deletion Checklist

- [ ] **데이터 백업**
  ```sql
  -- Crowdfunding data
  pg_dump -t funding_projects -t funding_backings -t funding_rewards -t funding_updates o4o_platform > backup_crowdfunding.sql

  -- Forum data
  pg_dump -t forum_posts -t forum_comments -t forum_categories -t forum_attachments -t forum_reactions o4o_platform > backup_forum.sql
  ```

- [ ] **사용 현황 확인**
  ```sql
  -- Check if any data exists
  SELECT 'funding_projects' as table_name, COUNT(*) FROM funding_projects
  UNION ALL
  SELECT 'forum_posts', COUNT(*) FROM forum_posts;
  ```

- [ ] **Stakeholder 승인**: 프로덕션 기능 제거에 대한 최종 승인

### 9.2 Execution Order

**권장 순서**: Bottom-up (의존성 낮은 것부터)

1. Admin Dashboard 제거 (UI만 제거, 백엔드는 남음)
2. Main Site 참조 제거
3. API Server Routes 비활성화 (파일은 남김)
4. Type packages import 제거
5. API Server 파일 삭제
6. Database 정리
7. Build config 제거
8. 폴더 삭제
9. 검증 및 테스트

### 9.3 Rollback Plan

각 단계마다 Git commit:
```bash
git add .
git commit -m "P2-B Step 1: Remove admin dashboard integration for deprecated apps"
```

문제 발생 시 rollback:
```bash
git revert HEAD
```

---

## 10. Estimated Effort

| 작업 | 예상 시간 | 복잡도 |
|------|-----------|--------|
| API Server 파일 제거 | 2 hours | Medium |
| Admin Dashboard 제거 | 1.5 hours | Low |
| Type import 제거 (28 files) | 1 hour | Low |
| Database 정리 | 0.5 hour | Low |
| Build config 제거 | 0.5 hour | Low |
| 검증 및 테스트 | 1 hour | Medium |
| **Total** | **6.5 hours** | **Medium** |

---

## 11. Recommendations

### 11.1 Immediate Actions (P2-A 이후)

1. **❌ Do NOT proceed with deletion** - 다음 이유로 보류 권장:
   - 실제 데이터 유실 위험
   - 기능적 가치 존재
   - P3 App Market에서 재활용 가능

2. **✅ Document as Deprecated** instead:
   ```markdown
   # README.md for each app

   ⚠️ **DEPRECATED**

   This app is deprecated and will be migrated to the App Market structure in Phase P3.
   Do not add new features to this app.
   ```

3. **✅ Add UI markers**:
   - Admin Dashboard: "🚧 개발 중" badge
   - Disable new data creation (read-only mode)

### 11.2 Future Actions (P3 App Market)

1. **Migrate to App Market architecture**:
   - Crowdfunding → Standalone app with marketplace listing
   - Forum → Community app
   - Digital Signage → Content display app

2. **Data migration plan**:
   - Export existing data to new app structure
   - Preserve user content
   - Update references

### 11.3 Alternative: If Deletion Must Proceed

**Only proceed if**:
- Confirmed NO production data exists
- Stakeholders approve feature removal
- Have comprehensive backup
- P3 timeline is distant

**Then follow**: P2-B Execution Plan in Section 9

---

## 12. Appendix

### A. File Inventory

#### Crowdfunding (18 files)
```
apps/api-server/src/
├── controllers/crowdfunding/
│   ├── BackingController.ts
│   ├── FundingProjectController.ts
│   └── index.ts
├── database/entities/crowdfunding/
│   ├── FundingBacking.ts
│   ├── FundingProject.ts
│   ├── FundingReward.ts
│   ├── FundingUpdate.ts
│   └── index.ts
├── modules/funding/
│   ├── controllers/funding.controller.ts
│   ├── services/FundingProjectService.ts
│   └── services/FundingService.ts
├── routes/crowdfunding.ts
└── services/crowdfunding.service.ts
```

#### Forum (26 files)
```
apps/api-server/src/
├── controllers/forum/
│   ├── ForumController.ts
│   ├── ForumCategoryController.ts
│   └── index.ts
├── database/entities/forum/
│   ├── ForumPost.ts
│   ├── ForumComment.ts
│   ├── ForumCategory.ts
│   ├── ForumAttachment.ts
│   ├── ForumReaction.ts
│   └── index.ts
├── routes/forum.ts
├── services/forum/
│   ├── forum.service.ts
│   └── forumCategory.service.ts
└── [Additional 14 files with forum references]
```

#### Digital Signage (18 files)
```
apps/api-server/src/
├── controllers/signage/
│   ├── SignageController.ts
│   ├── SignageDisplayController.ts
│   └── index.ts
├── database/entities/signage/
│   ├── SignageDisplay.ts
│   ├── SignageContent.ts
│   ├── SignageSchedule.ts
│   ├── SignagePlaylist.ts
│   └── index.ts
├── routes/signage.ts
├── services/signage/
│   ├── signage.service.ts
│   └── signageDisplay.service.ts
└── [Additional 8 files with signage references]
```

### B. Database Schema

#### Crowdfunding Tables (4)
- `funding_projects`: 크라우드펀딩 프로젝트
- `funding_rewards`: 리워드 정보
- `funding_backings`: 후원 내역
- `funding_updates`: 프로젝트 업데이트

#### Forum Tables (5)
- `forum_categories`: 포럼 카테고리
- `forum_posts`: 게시글
- `forum_comments`: 댓글
- `forum_attachments`: 첨부파일
- `forum_reactions`: 리액션 (좋아요 등)

#### Signage Tables (?)
- Status unknown - migration not found in InitializeSchema

### C. API Endpoints Summary

**Total Endpoints**: ~21 endpoints across 3 apps

**Authentication Required**:
- POST endpoints (create/update)
- User-specific GET endpoints (e.g., `/api/crowdfunding/backings/my`)

**Admin Only**:
- PATCH `/api/admin/projects/:id/status`

---

**최종 업데이트**: 2025-01-25 (Phase P2-A)
**다음 단계**: P2-B 실행 여부 결정 (보류 권장)
