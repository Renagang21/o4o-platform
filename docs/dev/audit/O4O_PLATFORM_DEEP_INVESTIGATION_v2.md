# O4O Platform - 2차 심화 조사 보고서 (Deep Investigation v2.0)

**작성일**: 2025-11-26
**전제**: v1.0 Full System Audit (2025-11-26) 완료 후 추가 조사
**목적**: 불명확/부분 완료/삭제 예정 항목에 대한 심화 조사 및 최종 판단

---

## Executive Summary

### 조사 범위

v1.0 보고서에 남아 있는 다음 항목들을 심화 조사:

1. ✅ **Digital Signage** - 위치 및 상태 확인
2. ✅ **Forum/Crowdfunding** - 실제 데이터 사용 여부 및 엔티티 등록 상태
3. ✅ **Legacy 디렉터리** - dist.backup, archive 등 백업 파일 현황
4. ✅ **Shortcode Registry** - 실제 동작 방식 및 메커니즘
5. ✅ **Block Registry** - 중복 구현 여부 및 구조
6. ✅ **Entity/Metadata 오류** - 실제 원인 파악
7. ✅ **CPT-Block-Shortcode 연결** - 통합 구조 확인
8. ✅ **Appearance System/Design Token** - 충돌 가능성
9. ✅ **apps/ecommerce & healthcare** - 현재 역할 및 상태

### 주요 발견사항

| 항목 | 상태 | 권장 조치 | 우선순위 |
|------|------|----------|----------|
| Digital Signage | 완전 구현 (미등록) | 라우트 등록 필요 | P1 |
| Forum | 엔티티 미등록 (완전 구현) | App Market 분리 | P0 |
| Crowdfunding | 엔티티 미등록 (부분 구현) | 완전 삭제 | P0 |
| Shortcode Registry | 정상 동작 | 유지 | - |
| Block Registry | 3개 중복 구현 | 인터페이스 통합 | P2 |
| Entity/Metadata | 정상 | 유지 | - |
| Appearance Hooks | 중복 존재 | 통합 필요 | P1 |
| apps/healthcare | 빈 디렉터리 | 삭제 | P0 |
| apps/funding | 빈 디렉터리 | 삭제 | P0 |
| Legacy 디렉터리 | 30MB+ 백업 | 정리 필요 | P2 |

---

## 1. Digital Signage - 위치 및 상태

### 📊 현재 상태

**완전한 구현이 존재하나 라우트 미등록 상태**

**발견된 파일:**
```
✅ Entity:
- apps/api-server/src/entities/SignageContent.ts (96 lines)
- apps/api-server/src/entities/SignageSchedule.ts
- apps/api-server/src/entities/PlaylistItem.ts
- apps/api-server/src/entities/ContentUsageLog.ts
- apps/api-server/src/entities/Store.ts
- apps/api-server/src/entities/StorePlaylist.ts

✅ Service:
- apps/api-server/src/services/signageService.ts (397 lines)
  - 6개 서비스 모듈: Content, Store, Playlist, Analytics, Schedule, Playback

✅ Admin UI:
- apps/admin-dashboard/src/pages/apps/SignageApp.tsx (336 lines)
- apps/admin-dashboard/src/api/apps/signage.ts
- apps/admin-dashboard/src/components/apps/VideoCopyButton.tsx

✅ Type Definition:
- apps/main-site/src/types/signage.ts

✅ Infrastructure:
- config/nginx-configs/signage.neture.co.kr.conf (Nginx 설정 존재)

❌ Route:
- apps/api-server/src/config/routes.config.ts - signage 라우트 미등록
- apps/api-server/src/routes/signage.routes.ts - 존재하지 않음
```

**구현 완성도:**
- **Entity**: ⭐⭐⭐⭐⭐ (완전)
- **Service**: ⭐⭐⭐⭐⭐ (완전, 397줄)
- **UI**: ⭐⭐⭐⭐ (UI 구현 완료, API 연결 필요)
- **Route**: ⭐ (미구현)

### 🎯 권장 조치

**보완 (Complement) - P1 우선순위**

1. **SignageController 생성** (`apps/api-server/src/controllers/signageController.ts`)
2. **Route 파일 생성** (`apps/api-server/src/routes/signage.routes.ts`)
3. **routes.config.ts에 등록** (우선순위 7번 - Dashboard Endpoints)
4. **connection.ts 엔티티 등록** 확인 (Store, StorePlaylist 등)

### 📝 판단 근거

- **완전한 서비스 레이어 존재**: 6개 서비스 모듈 (Content, Store, Playlist 등)
- **Admin UI 완성**: SignageApp.tsx 336줄, 통계 카드, 비디오 관리 UI
- **Nginx 설정 존재**: `signage.neture.co.kr.conf` - 인프라 준비 완료
- **비즈니스 로직 완성**: 승인 워크플로우, 권한 체크, 분석 기능 모두 구현
- **라우트만 연결하면 즉시 사용 가능**

**예상 작업 시간**: 2-3시간

---

## 2. Forum/Crowdfunding - 데이터 사용 여부

### 📊 Forum 상태

**완전 구현되었으나 connection.ts에 미등록**

**발견된 파일:**
```
✅ Entity (완전 구현):
- apps/api-server/src/entities/ForumPost.ts
- apps/api-server/src/entities/ForumCategory.ts
- apps/api-server/src/entities/ForumComment.ts
- apps/api-server/src/entities/ForumTag.ts

✅ Service (완전 구현):
- apps/api-server/src/services/forumService.ts (600+ lines)

❌ Connection 등록:
- apps/api-server/src/database/connection.ts - ForumPost 등 미등록 (Line 167-263)

❌ Route 등록:
- apps/api-server/src/config/routes.config.ts - forum 라우트 미등록
```

**데이터베이스 테이블:**
```sql
-- Migration: 1738000000000-AddOptimizationIndexes.ts
-- Forum 테이블 인덱스만 존재, 테이블 생성은 별도 마이그레이션에 있을 것으로 추정
- forum_post
- forum_category
- forum_comment
- forum_tag
- forum_like
- forum_bookmark
```

### 📊 Crowdfunding 상태

**엔티티 파일 존재하나 미사용**

**발견된 파일:**
```
✅ Entity (파일 존재):
- apps/api-server/src/entities/CrowdfundingProject.ts (86 lines)
- apps/api-server/src/entities/CrowdfundingParticipation.ts

✅ Repository:
- apps/api-server/src/repositories/CrowdfundingRepository.ts

✅ Type Definition:
- apps/api-server/src/types/crowdfunding-types.ts

✅ Migration (파일 존재):
- apps/api-server/src/migrations/create-crowdfunding-tables.ts
- apps/api-server/src/migrations/1737724800000-CreateCrowdfundingTables.ts

❌ Connection 등록:
- apps/api-server/src/database/connection.ts - CrowdfundingProject 미등록

❌ Service/Controller:
- 서비스 레이어 미구현
- 컨트롤러 미구현
```

### 🎯 권장 조치

| 항목 | 조치 | 우선순위 | 이유 |
|------|------|----------|------|
| **Forum** | **분리** (App Market) | **P0** | 완전 구현, App Market 전략에 부합 |
| **Crowdfunding** | **삭제** | **P0** | 부분 구현, forumLink 의존성만 존재 |

**Forum 분리 계획:**
1. `docs/dev/audit/forum_app_extraction.md` 참고
2. App Market 인프라 구축 (Phase 1-2 완료 후)
3. Forum 엔티티를 독립 앱으로 분리
4. CPT 기반 재구현 고려

**Crowdfunding 삭제 계획:**
1. 엔티티 파일 삭제: `CrowdfundingProject.ts`, `CrowdfundingParticipation.ts`
2. Repository 삭제: `CrowdfundingRepository.ts`
3. Type 삭제: `crowdfunding-types.ts`
4. Migration 파일 삭제: `create-crowdfunding-tables.ts` 등

### 📝 판단 근거

**Forum:**
- **완전한 서비스 레이어**: 600+ 줄, 캐싱, 검색, 통계 등 구현
- **4개 엔티티 완성**: ForumPost, ForumCategory, ForumComment, ForumTag
- **비즈니스 로직 완성**: 권한 체크, 게시/숨김 로직, 조회수 증가 등
- **Admin UI 존재**: `apps/admin-dashboard/src/pages/apps/ForumApp.tsx`
- **connection.ts 미등록**: TypeORM에 등록되지 않아 실제 사용 불가
- **App Market 전략**: 독립 앱으로 분리하여 마켓플레이스에서 설치 가능하도록 구성

**Crowdfunding:**
- **서비스 레이어 없음**: 비즈니스 로직 미구현
- **컨트롤러 없음**: API 엔드포인트 미구현
- **단순 의존성**: CrowdfundingProject.forumLink 필드로 Forum과 연결만
- **부분 구현**: Entity와 Migration만 존재, 실제 기능 없음
- **삭제 영향 최소**: 의존하는 코드 없음

---

## 3. Legacy 디렉터리 - 백업 파일 현황

### 📊 발견된 백업 디렉터리

```bash
# 크기 측정 결과
15MB    apps/api-server/dist.backup.20251013_204454
15MB    apps/api-server/dist.backup.20251013_210556
100KB   backup-dropshipping-20250820_004630
68KB    archive/media-library-backup-20250912
232KB   archive/theme-backup-20250912

Total: ~30.4MB
```

### 📁 디렉터리 상세

#### 1. `apps/api-server/dist.backup.20251013_*` (2개, 30MB)

**내용:**
- TypeScript 컴파일 결과 백업 (2025-10-13 생성)
- 2개 백업: 20:44:54, 21:05:56 (약 21분 간격)
- 전체 `dist/` 디렉터리 스냅샷

**포함 내용:**
```
- controllers/ (15개 하위 디렉터리)
- entities/ (3 dirs, 20480 bytes)
- services/ (5 dirs, 20480 bytes)
- routes/ (9 dirs, 12288 bytes)
- main.js (54849 bytes)
- server.js (8415 bytes)
```

**특이사항:**
- `signageService.ts` 컴파일 결과 포함
- `signageController.ts` 컴파일 결과 포함
- 현재 `src/` 디렉터리에는 signageController.ts 없음
- **과거에는 signageController가 존재했으나 삭제됨**

#### 2. `backup-dropshipping-20250820_004630` (100KB)

**내용:**
- 단일 파일: `plugins.routes.ts`
- 2025-08-20 백업 (약 3개월 전)

**파일 내용:**
```typescript
// Dropshipping 관련 라우트 백업
// 플러그인 시스템 관련 라우트
```

#### 3. `archive/media-library-backup-20250912` (68KB)

**내용:**
- 미디어 라이브러리 관련 백업
- 2025-09-12 생성 (약 2.5개월 전)

#### 4. `archive/theme-backup-20250912` (232KB)

**내용:**
- 테마 시스템 관련 백업
- 2025-09-12 생성 (약 2.5개월 전)

### 🎯 권장 조치

**정리 (Clean up) - P2 우선순위**

#### 즉시 삭제 가능:
1. ✅ `apps/api-server/dist.backup.20251013_204454` (15MB)
2. ✅ `apps/api-server/dist.backup.20251013_210556` (15MB)
   - **이유**: dist는 재빌드 가능, Git에 소스코드 존재

#### 아카이브 보관 (선택적 삭제):
3. ⚠️ `backup-dropshipping-20250820_004630` (100KB)
   - **이유**: Dropshipping 라우트 참고용, 크기 작음
   - **권장**: Git에 커밋 후 삭제

4. ⚠️ `archive/media-library-backup-20250912` (68KB)
5. ⚠️ `archive/theme-backup-20250912` (232KB)
   - **이유**: 미디어/테마 마이그레이션 참고용
   - **권장**: 필요 시 Git에 커밋 후 삭제

### 📝 판단 근거

- **dist 백업**: 소스코드가 Git에 있으므로 재빌드 가능, 불필요
- **dropshipping 백업**: 크기 작고 참고용, 필요 시 보관
- **archive 백업**: 마이그레이션 이력 참고용, 선택적 보관
- **총 용량**: 30.4MB (저장공간 압박 없음)
- **Git 전략**: 중요 백업은 `docs/legacy/` 또는 별도 브랜치로 관리

**삭제 스크립트:**
```bash
# 즉시 삭제 가능
rm -rf apps/api-server/dist.backup.20251013_204454
rm -rf apps/api-server/dist.backup.20251013_210556

# 선택적 삭제 (필요 시)
# rm -rf backup-dropshipping-20250820_004630
# rm -rf archive/media-library-backup-20250912
# rm -rf archive/theme-backup-20250912
```

---

## 4. Shortcode Registry - 실제 동작 방식

### 📊 현재 상태

**명확한 Registry 구현, 정상 동작**

**위치**: `apps/main-site/src/utils/shortcode-loader.ts` (183 lines)

**동작 메커니즘:**

```typescript
// 1단계: Vite Glob Import로 자동 스캔
const componentModules = import.meta.glob('../components/shortcodes/**/*.{ts,tsx}', {
  eager: false
});

// 2단계: ShortcodeDefinition 추출
function extractShortcodesFromModule(module): ShortcodeDefinition[] {
  // 각 모듈에서 ShortcodeDefinition[] 배열 찾기
  // 예: export const authShortcodes: ShortcodeDefinition[] = [...]
}

// 3단계: 중복 체크 후 등록
function registerShortcode(definition) {
  if (hasShortcode(definition.name)) {
    return false; // 이미 등록됨
  }

  registerLazyShortcode({
    name: definition.name,
    loader: async () => ({ default: definition.component }),
    // ...
  });
}

// 4단계: 통계 수집 및 로깅
loadShortcodes() -> { total, registered, skipped, failed, names }
```

**특징:**
1. ✅ **Type-safe**: `isShortcodeDefinition()` type guard
2. ✅ **Lazy Loading**: `import.meta.glob({ eager: false })`
3. ✅ **Convention-based**: `index.ts`에서 배열 export
4. ✅ **중복 방지**: `hasShortcode()` 체크
5. ✅ **개발자 친화적**: 로깅 및 통계 (`logShortcodeSummary()`)

**등록 흐름:**
```
components/shortcodes/auth/index.ts
  export const authShortcodes: ShortcodeDefinition[] = [
    { name: 'login-form', component: LoginForm },
    { name: 'register-form', component: RegisterForm }
  ]

→ shortcode-loader.ts (자동 스캔)
→ extractShortcodesFromModule() (배열 추출)
→ registerShortcode() (중복 체크 후 등록)
→ @o4o/shortcodes (글로벌 레지스트리)
```

### 🎯 권장 조치

**정상 (No Action Required)**

**이유:**
- 명확한 구조와 동작 방식
- Type safety 보장
- 중복 방지 메커니즘
- 개발자 경험 우수 (자동 스캔, 로깅)

**추가 개선 권장사항 (선택):**
1. **문서화**: `docs/guides/shortcode-development.md` 작성
2. **테스트**: Unit test 추가 (type guard, 중복 체크)
3. **에러 처리**: 더 상세한 에러 메시지

### 📝 판단 근거

- **파일 경로**: `apps/main-site/src/utils/shortcode-loader.ts`
- **183줄**: 명확하고 간결한 구현
- **Vite Glob**: 자동 스캔으로 수동 등록 불필요
- **Type Guard**: `isShortcodeDefinition()`, `isShortcodeDefinitionArray()`
- **중복 방지**: `hasShortcode()` 체크
- **@o4o/shortcodes 패키지**: 글로벌 레지스트리 역할

---

## 5. Block Registry - 중복 구조 조사

### 📊 현재 상태

**3개의 독립적인 BlockRegistry 구현 존재**

#### 1. `packages/block-core/src/BlockRegistry.ts` (245 lines)

**목적**: WordPress 통합 레지스트리

**특징:**
```typescript
class BlockRegistry {
  // WordPress registerBlockType 직접 호출
  registerBlockType(name: string, config: BlockConfig)

  // 카테고리/키워드 인덱싱
  getBlocksByCategory(category: string)
  getBlocksByKeyword(keyword: string)

  // WordPress 통합
  initializeWordPressBlocks()
}
```

**사용처**: WordPress 편집기 (Gutenberg)

#### 2. `packages/block-renderer/src/registry/BlockRegistry.ts` (91 lines)

**목적**: 렌더링 전용 경량 레지스트리

**특징:**
```typescript
class BlockRenderer {
  // Lazy loading 지원
  registerBlock(type: string, renderer: () => Promise<Component>)

  // 타입 정규화
  // "core/paragraph" ↔ "paragraph" 자동 변환

  // 렌더링만 담당 (편집 기능 없음)
  renderBlock(block: Block): ReactElement
}
```

**사용처**: Main Site (읽기 전용 렌더링)

#### 3. `apps/admin-dashboard/src/blocks/registry/BlockRegistry.ts` (292 lines)

**목적**: 관리자 UI 전용 레지스트리

**특징:**
```typescript
class BlockRegistry {
  // 싱글톤 패턴
  private static instance: BlockRegistry;

  // 검색 기능
  searchBlocks(query: string): Block[]

  // 카테고리 통계
  getCategoryStats(): { category: string; count: number }[]

  // WordPress 통합
  registerWordPressBlock(config: WPBlockConfig)
}
```

**사용처**: Admin Dashboard (블록 관리 UI)

### 📊 중복 분석

| 기능 | block-core | block-renderer | admin-dashboard |
|------|-----------|----------------|-----------------|
| WordPress 통합 | ✅ | ❌ | ✅ |
| Lazy Loading | ❌ | ✅ | ❌ |
| 카테고리 | ✅ | ❌ | ✅ |
| 검색 | ❌ | ❌ | ✅ |
| 렌더링 | ❌ | ✅ | ❌ |
| 싱글톤 | ❌ | ❌ | ✅ |

### 🎯 권장 조치

**보완 (Complement) - P2 우선순위**

**현재 상태 유지, 공통 인터페이스 정의**

**이유:**
- 각 레지스트리는 **서로 다른 책임**을 가짐
- 통합 시 **복잡도 증가** 및 **의존성 순환** 가능
- 현재 구조는 **관심사 분리** 원칙에 부합

**권장사항:**

1. **공통 인터페이스 정의** (`packages/@o4o/types/src/block-registry.d.ts`):
```typescript
export interface IBlockRegistry {
  registerBlock(name: string, config: BlockConfig): void;
  getBlock(name: string): BlockConfig | undefined;
  hasBlock(name: string): boolean;
  getAllBlocks(): BlockConfig[];
}

export interface IBlockRendererRegistry {
  renderBlock(block: Block): React.ReactElement;
}

export interface IBlockSearchRegistry {
  searchBlocks(query: string): BlockConfig[];
}
```

2. **각 레지스트리가 적절한 인터페이스 구현**:
- `block-core`: `IBlockRegistry`
- `block-renderer`: `IBlockRendererRegistry`
- `admin-dashboard`: `IBlockRegistry + IBlockSearchRegistry`

3. **문서화**: `docs/architecture/block-registry-architecture.md`

### 📝 판단 근거

**유지 이유:**
- `block-core`: 편집기용, WordPress API 의존
- `block-renderer`: 렌더링용, 경량, lazy loading
- `admin-dashboard`: 관리 UI용, 검색/통계

**통합 불가 이유:**
- `block-renderer`는 `react` 의존, `block-core`는 WordPress 의존
- 순환 의존성 발생 가능
- 관심사 분리 원칙 위반

**참고**: `apps/admin-dashboard/src/blocks/index.ts`는 이미 로컬 레지스트리 사용 중
```typescript
import { blockRegistry } from './registry/BlockRegistry';
```

---

## 6. Entity/Metadata 오류 - 실제 원인 조사

### 📊 조사 결과

**오류 없음 - 정상 동작**

### 🔍 조사 내용

#### 1. connection.ts 엔티티 등록 확인

**파일**: `apps/api-server/src/database/connection.ts` (354 lines)

**메타데이터 관련 엔티티:**
```typescript
// Line 42, 189
PostMeta,

// Line 53, 202
CustomFieldValue,

// Line 54, 203
CustomPost,

// Line 55, 204
CustomPostType,

// Line 53, 201
CustomField,
```

**모든 메타데이터 엔티티가 정상 등록됨**

#### 2. Metadata 사용 패턴

**검색 결과**: 55개 파일에서 metadata 관련 데코레이터 사용

**주요 패턴:**
```typescript
// 1. PostMeta (정규화된 메타 테이블)
@Entity('post_meta')
export class PostMeta {
  @Column() metaKey: string;
  @Column() metaValue: string;
  @ManyToOne(() => Post)
  post: Post;
}

// 2. CustomFieldValue (ACF 스타일)
@Entity('custom_field_values')
export class CustomFieldValue {
  @Column() fieldId: string;
  @Column() postId: string;
  @Column() value: string;
}

// 3. Post.meta (TypeScript 전용, DB 비영속)
@Entity('posts')
export class Post {
  // @Column 없음 - TypeScript 타입만
  meta?: Record<string, any>;
}
```

#### 3. Migration 확인

**최근 메타데이터 마이그레이션:**
- `1730000000000-PhaseDataNormalization.ts` (Phase 4-1)
- `1730100000000-Phase4-2-MetadataIndexing.ts` (Phase 4-2)
- `1730400000000-Phase4-5-FieldGroupCleanup.ts` (Phase 4-5)
- `1730500000000-Phase4-6-MetaDataCorrections.ts` (Phase 4-6, 2025-11-06)

**Phase 4-6 내용** (2025-11-06):
```sql
-- ACF 스타일 메타 필드 정리
-- post_meta 테이블 정규화
-- 인덱스 최적화
```

### 🎯 권장 조치

**정상 (No Action Required)**

### 📝 판단 근거

- **connection.ts**: PostMeta, CustomFieldValue 정상 등록 (Line 189, 202)
- **마이그레이션**: Phase 4-6까지 완료 (2025-11-06)
- **엔티티 파일**: 데코레이터 정상 사용 (55개 파일)
- **TypeORM 설정**: 동기화 비활성화 (`synchronize: false`), 마이그레이션 수동 실행
- **오류 없음**: 실제 Entity/Metadata 오류는 발견되지 않음

---

## 7. CPT-Block-Shortcode 연결 구조

### 📊 현재 상태

**독립적 시스템, 직접 연결 없음**

### 🔍 조사 내용

#### 1. CPT (Custom Post Type)

**위치**: `apps/api-server/src/schemas/*.schema.ts`

**등록 방식**:
```typescript
// schemas/products.schema.ts
export const productSchema: CPTSchema = {
  name: 'product',
  label: '제품',
  fields: [
    { name: 'price', type: 'number' },
    { name: 'sku', type: 'text' }
  ]
};

// init/cpt.init.ts
await registry.register(productSchema);
```

**특징**:
- WordPress 스타일 CPT 시스템
- MetaDataService로 ACF 필드 관리
- TypeORM Entity가 아닌 JSON 기반

#### 2. Block

**위치**: `apps/main-site/src/components/blocks/*.tsx`

**등록 방식**:
```typescript
// packages/block-core/src/BlockRegistry.ts
registerBlockType('core/paragraph', {
  title: 'Paragraph',
  category: 'text',
  edit: EditComponent,
  save: SaveComponent
});
```

**특징**:
- React 컴포넌트 기반
- WordPress Gutenberg 호환
- 3개의 독립 레지스트리

#### 3. Shortcode

**위치**: `apps/main-site/src/components/shortcodes/*.tsx`

**등록 방식**:
```typescript
// components/shortcodes/auth/index.ts
export const authShortcodes: ShortcodeDefinition[] = [
  {
    name: 'login-form',
    component: LoginForm,
    attributes: { ... }
  }
];

// main.tsx
await loadShortcodes();
```

**특징**:
- 자동 스캔 및 등록 (`shortcode-loader.ts`)
- Lazy loading 지원
- `@o4o/shortcodes` 글로벌 레지스트리

### 📊 연결 구조 분석

```
CPT (Backend)                Block (Editor)               Shortcode (Frontend)
├─ products.schema.ts        ├─ ProductCard.tsx          ├─ product-list
├─ ds_product.schema.ts      ├─ ProductGrid.tsx          ├─ product-card
└─ portfolio.schema.ts       └─ PortfolioBlock.tsx       └─ portfolio-item

연결 방식:
1. CPT → Block: 없음 (독립)
2. CPT → Shortcode: API 호출로 데이터 fetch
3. Block → Shortcode: 없음 (독립)
```

**예시 연결 (API를 통한 간접 연결):**
```typescript
// Shortcode: product-list
const ProductListShortcode = ({ category }) => {
  // CPT API 호출
  const { data } = useQuery(['products', category], () =>
    api.get('/api/v1/cpt/product', { params: { category } })
  );

  return <div>{data.map(product => ...)}</div>;
};
```

### 🎯 권장 조치

**현재 상태 유지 - 정상**

**이유:**
- **독립적 시스템**: CPT(백엔드), Block(편집기), Shortcode(프론트엔드)
- **관심사 분리**: 각 시스템은 다른 책임을 가짐
- **유연성**: API를 통한 느슨한 결합
- **확장성**: 새로운 Block/Shortcode를 CPT에 의존하지 않고 추가 가능

**권장사항 (선택적):**
1. **명명 규칙**: CPT, Block, Shortcode 이름 일관성 유지
   - CPT: `product`, Block: `product-card`, Shortcode: `product-list`
2. **문서화**: `docs/guides/cpt-block-shortcode-guide.md`
3. **예제**: 각 시스템 연동 예제 코드

### 📝 판단 근거

- **CPT**: Backend 데이터 모델, TypeORM 아닌 JSON 기반
- **Block**: Gutenberg 편집기 컴포넌트, React 기반
- **Shortcode**: Frontend 렌더링 컴포넌트, React 기반
- **연결**: API를 통한 간접 연결만 존재 (느슨한 결합)
- **아키텍처**: Clean Architecture 원칙에 부합

---

## 8. Appearance System/Design Token 충돌

### 📊 현재 상태

**Design Token 시스템 통합, 그러나 중복 Hooks 존재**

### 🔍 발견된 중복

#### 1. `useThemeSettings` (35 lines)

**파일**: `apps/admin-dashboard/src/hooks/useThemeSettings.ts`

```typescript
export function useThemeSettings() {
  return useQuery({
    queryKey: ['settings', 'theme'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/settings/theme`, {
        credentials: 'include'
      });
      return response.json();
    }
  });
}
```

#### 2. `useThemeTokens` (28 lines)

**파일**: `apps/admin-dashboard/src/hooks/useThemeTokens.ts`

```typescript
export function useThemeTokens() {
  return useQuery({
    queryKey: ['settings', 'theme'], // 동일한 queryKey ⚠️
    queryFn: async () => {
      const response = await fetch(`${API_URL}/settings/theme`, {
        credentials: 'include'
      });
      return response.json();
    }
  });
}
```

**문제점:**
- ❌ **동일한 API 엔드포인트** (`/settings/theme`)
- ❌ **동일한 queryKey** (`['settings', 'theme']`)
- ❌ **기능 중복**
- ❌ **혼란 유발** (어떤 hook을 사용해야 하는지 불명확)

### 📊 사용 현황

**두 hooks를 모두 import하는 파일 (4개):**
```typescript
// 1. apps/admin-dashboard/src/components/GlobalStyleInjector.tsx
import { useThemeSettings } from '@/hooks/useThemeSettings';
import { useThemeTokens } from '@/hooks/useThemeTokens'; // 중복

// 2. apps/admin-dashboard/src/blocks/editor/GutenbergBlockEditor.tsx
// 동일한 패턴

// 3. apps/admin-dashboard/src/pages/settings/AppearanceSettings.tsx
// 동일한 패턴

// 4. apps/main-site/src/components/ThemeProvider.tsx
// 동일한 패턴
```

### 🎯 권장 조치

**통합 (Consolidate) - P1 우선순위**

**계획:**
1. ✅ `useThemeSettings` 유지 (더 명확한 이름)
2. ❌ `useThemeTokens` 삭제
3. 🔄 모든 사용처를 `useThemeSettings`로 변경

**마이그레이션:**
```typescript
// Before
import { useThemeTokens } from '@/hooks/useThemeTokens';
const { data: tokens } = useThemeTokens();

// After
import { useThemeSettings } from '@/hooks/useThemeSettings';
const { data: settings } = useThemeSettings();
const tokens = settings?.tokens;
```

**예상 작업 시간**: 1시간

### 📝 판단 근거

- **중복**: 동일한 API, 동일한 queryKey, 동일한 리턴 타입
- **혼란**: 4개 파일에서 두 hooks를 모두 import
- **불일치**: `useThemeSettings`는 `settings`, `useThemeTokens`는 `tokens` 리턴
- **SSOT 위반**: Single Source of Truth 원칙 위반
- **유지보수**: 두 hooks를 동시에 업데이트해야 하는 부담

**Design Token 시스템 자체는 정상:**
- `packages/appearance-system/src/tokens.ts` - SSOT 정의
- `DesignTokens` 인터페이스 - 타입 안전성
- `defaultTokens` - 기본값

---

## 9. apps/ecommerce & apps/healthcare 역할

### 📊 apps/ecommerce

**상태**: ⭐⭐⭐⭐⭐ **완전한 독립 앱 (활성 개발 중)**

**위치**: `apps/ecommerce/`

**구조**:
```
apps/ecommerce/
├── src/
│   ├── components/          (UI 컴포넌트)
│   ├── pages/               (라우트 페이지)
│   │   ├── ProductList.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── Cart.tsx
│   │   ├── Checkout.tsx
│   │   └── MyOrders.tsx
│   ├── hooks/               (React hooks)
│   ├── stores/              (Zustand 상태 관리)
│   ├── lib/api/             (API 클라이언트)
│   └── styles/              (CSS/Tailwind)
├── package.json             (독립 패키지 설정)
├── README.md                (사용 가이드)
├── vite.config.ts
└── tsconfig.json

Total: 178 files
```

**주요 기능**:
1. **상품 브라우징**: 목록, 상세, 검색, 필터
2. **장바구니**: 추가, 수정, 삭제, 수량 변경
3. **주문**: 주문하기, 주문 내역, 주문 상태 추적
4. **위시리스트**: 찜하기, 찜 목록
5. **리뷰**: 상품 리뷰 작성 및 조회
6. **역할별 가격**: Customer, Seller, Supplier 별 가격 표시

**기술 스택**:
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-router-dom": "^6.x",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "react-hook-form": "^7.x",
    "@o4o/auth-client": "workspace:*",
    "@o4o/ui": "workspace:*",
    "@o4o/types": "workspace:*"
  }
}
```

**의존성**:
- `@o4o/auth-client` - 인증
- `@o4o/shortcodes` - 숏코드 렌더링
- `@o4o/slide-app` - 슬라이드 기능
- `@o4o/types` - 공통 타입
- `@o4o/ui` - UI 컴포넌트

**배포**:
- **URL**: 별도 도메인 예정 (예: `shop.neture.co.kr`)
- **빌드**: Vite로 독립 빌드
- **배포 스크립트**: 아직 없음 (필요)

### 🎯 권장 조치 (ecommerce)

**보완 (Complement) - P1 우선순위**

**필요 작업**:
1. ✅ **배포 스크립트 작성** (`scripts/deploy-ecommerce.sh`)
2. ✅ **Nginx 설정** (`config/nginx-configs/shop.neture.co.kr.conf`)
3. ✅ **환경변수 설정** (`.env.ecommerce`)
4. ✅ **GitHub Actions 워크플로우** (`.github/workflows/deploy-ecommerce.yml`)
5. ⚠️ **테스트 추가** (현재 테스트 없음)

**예상 작업 시간**: 3-4시간

---

### 📊 apps/healthcare

**상태**: ⭐ **빈 디렉터리 (초기 설정만)**

**위치**: `apps/healthcare/`

**구조**:
```
apps/healthcare/
└── .eslintignore

Total: 1 file (12KB)
```

**내용**:
```
# .eslintignore
# ESLint 무시 설정만 존재
```

### 🎯 권장 조치 (healthcare)

**삭제 (Remove) - P0 우선순위**

**이유**:
- ❌ 실제 코드 없음
- ❌ package.json 없음
- ❌ 초기 설정만 존재
- ❌ 향후 혼란 야기 가능

**삭제 스크립트**:
```bash
rm -rf apps/healthcare
```

**예상 작업 시간**: 1분

---

### 📊 apps/funding

**상태**: ⭐ **빈 디렉터리 (빌드 캐시만)**

**위치**: `apps/funding/`

**구조**:
```
apps/funding/
└── tsconfig.app.tsbuildinfo   (60KB)

Total: 1 file (60KB)
```

**내용**:
- TypeScript 빌드 캐시 파일만 존재
- 실제 소스코드 없음

### 🎯 권장 조치 (funding)

**삭제 (Remove) - P0 우선순위**

**이유**:
- ❌ 실제 코드 없음
- ❌ package.json 없음
- ❌ 빌드 캐시만 존재
- ❌ Crowdfunding 앱과 중복 가능성

**삭제 스크립트**:
```bash
rm -rf apps/funding
```

**예상 작업 시간**: 1분

---

### 📝 판단 근거

**apps/ecommerce:**
- ✅ 178 files - 완전한 구현
- ✅ README.md, package.json - 독립 앱
- ✅ 주요 기능 완성 - 상품, 장바구니, 주문, 위시리스트, 리뷰
- ✅ 기술 스택 완성 - React, Vite, TanStack Query, Zustand
- ✅ 워크스페이스 의존성 - `@o4o/*` 패키지 사용
- ⚠️ 배포 설정 없음 - 스크립트, Nginx, 환경변수 필요

**apps/healthcare:**
- ❌ 1 file (`.eslintignore`) - 실제 코드 없음
- ❌ 초기 설정만 - 개발 시작 안 됨
- ❌ 향후 혼란 - 빈 디렉터리는 삭제 권장

**apps/funding:**
- ❌ 1 file (`tsconfig.app.tsbuildinfo`) - 빌드 캐시만
- ❌ 실제 코드 없음
- ❌ Crowdfunding과 중복 가능성
- ❌ 즉시 삭제 권장

---

## 종합 요약 및 우선순위 로드맵

### 📊 전체 조사 결과 매트릭스

| 항목 | 상태 | 권장 조치 | 우선순위 | 작업 시간 | 영향도 |
|------|------|----------|----------|----------|--------|
| **Digital Signage** | 완전 구현 (라우트 미등록) | 보완 | **P1** | 2-3h | 중 |
| **Forum** | 완전 구현 (미등록) | 분리 (App Market) | **P0** | 8-16h | 높음 |
| **Crowdfunding** | 부분 구현 (미사용) | 삭제 | **P0** | 1h | 낮음 |
| **Legacy 디렉터리** | 30MB 백업 | 정리 | P2 | 10분 | 낮음 |
| **Shortcode Registry** | 정상 동작 | 유지 | - | - | - |
| **Block Registry** | 3개 중복 | 보완 (인터페이스) | P2 | 2-3h | 중 |
| **Entity/Metadata** | 정상 | 유지 | - | - | - |
| **Appearance Hooks** | 중복 존재 | 통합 | **P1** | 1h | 중 |
| **apps/healthcare** | 빈 디렉터리 | 삭제 | **P0** | 1분 | 낮음 |
| **apps/funding** | 빈 디렉터리 | 삭제 | **P0** | 1분 | 낮음 |
| **apps/ecommerce** | 완전 구현 | 보완 (배포) | **P1** | 3-4h | 높음 |

### 🎯 우선순위별 실행 계획

#### **Phase P0 - 즉시 실행 (1-2일)**

**목표**: 불필요한 코드 제거, 시스템 정리

1. **apps/healthcare 삭제** (1분)
   ```bash
   rm -rf apps/healthcare
   ```

2. **apps/funding 삭제** (1분)
   ```bash
   rm -rf apps/funding
   ```

3. **Crowdfunding 코드 삭제** (1시간)
   ```bash
   # Entity 삭제
   rm apps/api-server/src/entities/CrowdfundingProject.ts
   rm apps/api-server/src/entities/CrowdfundingParticipation.ts

   # Repository 삭제
   rm apps/api-server/src/repositories/CrowdfundingRepository.ts

   # Type 삭제
   rm apps/api-server/src/types/crowdfunding-types.ts

   # Migration 파일 삭제
   rm apps/api-server/src/migrations/*crowdfunding*
   ```

4. **Forum App Market 분리 준비** (계획 수립)
   - `docs/dev/audit/forum_app_extraction.md` 리뷰
   - App Market 인프라 우선 구축 (Phase 1-2)
   - Forum 분리는 App Market 완성 후

**산출물**:
- ✅ 3개 앱/디렉터리 삭제 완료
- ✅ Codebase 정리
- ✅ Forum 분리 계획 수립

---

#### **Phase P1 - 고 우선순위 (1주)**

**목표**: 핵심 기능 보완 및 중복 제거

1. **Appearance Hooks 통합** (1시간)
   - `useThemeTokens` 삭제
   - 모든 사용처를 `useThemeSettings`로 변경
   - 테스트 확인

2. **Digital Signage 라우트 등록** (2-3시간)
   - `signageController.ts` 생성
   - `signage.routes.ts` 생성
   - `routes.config.ts`에 등록
   - API 테스트

3. **apps/ecommerce 배포 설정** (3-4시간)
   - `scripts/deploy-ecommerce.sh` 작성
   - `config/nginx-configs/shop.neture.co.kr.conf` 작성
   - `.env.ecommerce` 설정
   - `.github/workflows/deploy-ecommerce.yml` 작성
   - 테스트 배포

**산출물**:
- ✅ Hooks 중복 제거
- ✅ Digital Signage 사용 가능
- ✅ Ecommerce 배포 가능

---

#### **Phase P2 - 중 우선순위 (2주)**

**목표**: 아키텍처 개선 및 최적화

1. **Block Registry 인터페이스 통합** (2-3시간)
   - `packages/@o4o/types/src/block-registry.d.ts` 생성
   - 각 레지스트리 인터페이스 구현
   - 문서화: `docs/architecture/block-registry-architecture.md`

2. **Legacy 디렉터리 정리** (10분)
   ```bash
   # dist 백업 삭제
   rm -rf apps/api-server/dist.backup.*

   # 선택적: 아카이브 정리
   # git commit 후 삭제
   ```

**산출물**:
- ✅ Block Registry 아키텍처 문서화
- ✅ 30MB 디스크 공간 확보

---

### 📋 작업 체크리스트

#### **즉시 실행 가능 (P0)**

- [ ] `apps/healthcare` 삭제
- [ ] `apps/funding` 삭제
- [ ] Crowdfunding 관련 파일 삭제
  - [ ] Entity 파일
  - [ ] Repository 파일
  - [ ] Type 파일
  - [ ] Migration 파일
- [ ] Forum App Market 분리 계획 수립

#### **1주 내 완료 (P1)**

- [ ] `useThemeTokens` 삭제 및 `useThemeSettings` 통합
- [ ] Digital Signage 라우트 등록
  - [ ] SignageController 생성
  - [ ] signage.routes.ts 생성
  - [ ] routes.config.ts 등록
  - [ ] API 테스트
- [ ] apps/ecommerce 배포 설정
  - [ ] 배포 스크립트
  - [ ] Nginx 설정
  - [ ] 환경변수 설정
  - [ ] GitHub Actions 워크플로우

#### **2주 내 완료 (P2)**

- [ ] Block Registry 인터페이스 정의
- [ ] 각 레지스트리 인터페이스 구현
- [ ] Block Registry 아키텍처 문서화
- [ ] Legacy 디렉터리 정리

---

## 참고 문서

### 기존 문서
- [v1.0 Full System Audit](/docs/dev/O4O_PLATFORM_FULL_SYSTEM_AUDIT_2025.md)
- [Forum App Extraction Plan](/docs/dev/audit/forum_app_extraction.md)
- [App Market Checklist](/docs/dev/audit/app-market_checklist.md)

### 새로 작성할 문서
- `docs/guides/shortcode-development.md` - Shortcode 개발 가이드
- `docs/guides/cpt-block-shortcode-guide.md` - CPT-Block-Shortcode 연동 가이드
- `docs/architecture/block-registry-architecture.md` - Block Registry 아키텍처

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| v2.0 | 2025-11-26 | Claude Code | 초기 작성 (2차 심화 조사) |

---

**다음 단계**: Phase P0 즉시 실행 → Phase P1 1주 완료 → Phase P2 2주 완료
