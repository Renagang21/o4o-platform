# 앱장터(플러그인 마켓) 구축 조사 체크리스트

**작성일:** 2025-11-09
**목적:** O4O 플랫폼에 앱 마켓 시스템 도입을 위한 기술 조사 및 설계
**범위:** 코어 시스템 분석 → Manifest 설계 → 생명주기 API → 배포/보안

---

## 1. 현재 시스템 구조 분석

### 1.1 CPT/ACF 등록 메커니즘
**조사 대상:** 현재 CPT(Custom Post Type) 및 ACF(Advanced Custom Fields) 등록 방식

- [x] **CPT 등록 위치 및 방식**
  - 파일 경로: `/apps/api-server/src/entities/CustomPostType.ts`, `CustomPost.ts`
  - 등록 함수: TypeORM Entity 기반 (명시적 등록)
  - 초기화 시점: 애플리케이션 시작 시 (`connection.ts`에서 entities 배열에 명시)
  - 데이터베이스 테이블 생성 방식: TypeORM 마이그레이션 (수동 실행)

- [x] **ACF 등록 위치 및 방식**
  - 파일 경로: `/apps/api-server/src/entities/ACFField.ts`, `ACFFieldGroup.ts`, `CustomField.ts`, `FieldGroup.ts`
  - 등록 함수: TypeORM Entity + 컨트롤러 API (`FieldGroupsController`, `ACFController`)
  - 메타데이터 저장 구조:
    - CustomPost.fields (JSON 컬럼) - 인라인 저장 방식
    - CustomFieldValue 테이블 - 정규화 저장 방식
  - 타입 정의 위치: `ACFFieldType` enum (20+ 필드 타입 지원)

- [x] **현재 등록된 CPT 목록**
  ```
  현재는 동적 CPT 시스템 (CustomPostType 테이블에 저장)
  예시:
  1. page (페이지)
  2. post (게시물)
  3. forum_topic (포럼 주제)
  4. forum_reply (포럼 답글)
  5. product (상품)
  ```

- [x] **현재 등록된 ACF 그룹 목록**
  ```
  FieldGroup / ACFFieldGroup 테이블에 동적 저장
  위치 기반 표시 (location rules)
  예시:
  - Product Meta Fields (product CPT용)
  - Forum Topic Meta (forum_topic CPT용)
  ```

**발견사항 및 이슈:**
```
✅ CPT 등록: **중앙집중식** - connection.ts의 entities 배열에 명시적 등록
   - 모든 Entity는 수동으로 등록 필요 (glob 패턴 미사용)
   - 장점: 명확한 의존성, 순서 제어 가능
   - 단점: 새 앱 추가 시 코어 파일 수정 필요

✅ 등록 해제 메커니즘:
   - TypeORM은 런타임 Entity 등록/해제 미지원
   - 현재는 애플리케이션 재시작 필요
   - 해결 방안: JSON 기반 CPT 시스템으로 재설계 필요

✅ 데이터 정리 정책:
   - CASCADE DELETE 설정됨 (FieldGroup → CustomField 등)
   - CustomPost는 soft delete 없음 (완전 삭제)
   - 앱 제거 시 데이터 정리 정책 필요 (현재 없음)

⚠️ 앱 마켓 도입 시 필요한 변경:
   1. 런타임 CPT 등록/해제 메커니즘 구현
      - Option A: TypeORM Entity 동적 생성 (복잡, 제한적)
      - Option B: JSON 기반 CPT 시스템 (WordPress 방식, 권장)
   2. 앱별 CPT 네임스페이스 (prefix 또는 스키마 분리)
   3. 앱 제거 시 데이터 처리 정책 (keep-data vs purge-data)
```

---

### 1.2 라우팅 시스템
**조사 대상:** 동적 라우트 등록 및 관리 방식

- [x] **Frontend 라우팅 구조**
  - 라우터 라이브러리: React Router v6 (BrowserRouter)
  - 라우트 정의 위치:
    - Main-Site: `/apps/main-site/src/App.tsx` (223 lines)
    - Admin Dashboard: `/apps/admin-dashboard/src/App.tsx` (755 lines)
  - 동적 라우트 추가 가능 여부:
    - ✅ 가능 (React Router의 동적 라우트 배열 지원)
    - 현재는 하드코딩됨 (앱별 라우트 모듈 분리 없음)
    - Lazy loading 사용 중 (`React.lazy`, `Suspense`)

- [x] **Backend 라우팅 구조**
  - API 라우트 등록 위치: `/apps/api-server/src/routes.config.ts` (중앙집중식)
  - 미들웨어 적용 방식: 10단계 우선순위 기반 등록
    1. Health & Monitoring (rate limit 제외)
    2. Authentication (rate limit 제외)
    3. Public Routes (lenient limit)
    4. Settings (special limit)
    5. V1 API (standard limit)
    6. Legacy Routes
    7. Dashboard Endpoints
    8. Root & Stub Routes
    9. Error Handlers (MUST BE LAST)
  - 동적 라우트 추가 메커니즘: **현재 없음** (routes.config.ts 수정 필요)

- [x] **현재 라우트 목록 (앱별 분류 가능)**
  ```
  Forum (10+ routes):
  Frontend:
    - /forum
    - /forum/:topicId
  Backend:
    - GET /api/v1/forum/topics
    - POST /api/v1/forum/topics
    - GET /api/v1/forum/topics/:id
    - POST /api/v1/forum/topics/:id/replies
    - PATCH /api/v1/forum/topics/:id
    - DELETE /api/v1/forum/topics/:id

  Admin - Forum:
    - /admin/forum/topics
    - /admin/forum/categories

  Admin - Enrollments (P0 RBAC):
    - GET /admin/enrollments
    - POST /admin/enrollments/:id/approve
    - POST /admin/enrollments/:id/reject
    - POST /admin/enrollments/bulk-approve
    - POST /admin/enrollments/bulk-reject

  총 90+ 라우트 모듈 등록됨
  ```

**발견사항 및 이슈:**
```
✅ 라우트 충돌 방지 메커니즘:
   - Backend: 우선순위 기반 등록 (routes.config.ts에 순서 명시)
   - Frontend: React Router의 자연스러운 매칭 (먼저 등록된 라우트 우선)
   - 현재는 수동 관리 (충돌 감지 자동화 없음)

✅ 네임스페이스 지원 여부:
   - Backend: `/api/v1/*`, `/api/admin/*` 등 경로 기반 네임스페이스
   - Frontend: 명시적 네임스페이스 없음 (경로 구조로만 구분)
   - 앱별 prefix 강제 없음 (권장사항만 존재)

⚠️ 라우트 우선순위 설정:
   - Backend: routes.config.ts의 배열 순서로 결정
   - Frontend: App.tsx의 <Route> 선언 순서로 결정
   - 동적 우선순위 변경 불가 (코드 수정 필요)

⚠️ 앱 마켓 도입 시 필요한 변경:
   1. 동적 라우트 등록 API 구현
      Backend: `app.use(path, routerModule)` 런타임 호출
      Frontend: React Router의 동적 라우트 배열 업데이트

   2. 라우트 충돌 감지 시스템
      - 설치 시 경로 중복 체크
      - 네임스페이스 강제 (예: `/apps/{appName}/*`)

   3. 라우트 우선순위 메타데이터
      - Manifest에 priority 필드 추가
      - 우선순위 기반 자동 정렬

   4. 라우트 제거 메커니즘
      - 비활성화 시 라우트 제거
      - 404 처리 또는 "앱이 비활성화됨" 메시지
```

---

### 1.3 권한 시스템
**조사 대상:** RBAC 및 권한 스코프 관리

- [x] **현재 권한 모델**
  - 역할(Role) 정의 위치:
    - Enum: `/apps/api-server/src/types/auth.ts` (UserRole enum)
    - 테이블: `roles` (Role entity), `role_assignments` (RoleAssignment entity)
  - 권한(Permission) 정의 위치:
    - 테이블: `permissions` (Permission entity)
    - 관계: `role_permissions` (Many-to-Many)
  - 역할-권한 매핑 방식:
    - P0 구현: 역할 기반 (role_assignments 테이블, 시간 제한 지원)
    - P1 설계: 권한 기반 (roles → permissions 매핑)

- [x] **권한 체크 메커니즘**
  - 미들웨어 위치:
    - `/apps/api-server/src/middleware/auth.middleware.ts` (requireAuth, requireRole)
    - `/apps/api-server/src/middleware/permission.middleware.ts` (requirePermission, requireAdmin)
  - 프론트엔드 권한 체크:
    - `PrivateRoute` 컴포넌트 (인증 체크)
    - `RoleGuard` 컴포넌트 (역할 체크)
    - `AdminProtectedRoute` 컴포넌트 (관리자 체크)
  - API 권한 체크:
    - JWT 검증 → 사용자 로드 → 역할/권한 확인
    - req.user.hasRole(), req.user.hasPermission() 메서드

- [x] **앱별 권한 격리 가능성**
  - 네임스페이스 권한 지원:
    - ✅ 가능 (권한 key에 `{resource}.{action}` 패턴 사용)
    - 예: `forum.read`, `forum.write`, `product.create`
  - 동적 권한 추가/제거:
    - ⚠️ 부분 지원 (permissions 테이블에 INSERT/DELETE)
    - 런타임 적용은 애플리케이션 재시작 또는 캐시 갱신 필요
  - 권한 상속 구조:
    - ❌ 현재 없음 (flat permission 구조)
    - Admin은 하드코딩된 모든 권한 보유

**현재 권한 목록:**
```
User Management:
  - users.view, users.create, users.edit, users.delete
  - users.suspend, users.approve

Content Management:
  - content.view, content.create, content.edit
  - content.delete, content.publish, content.moderate

Taxonomy:
  - categories:write, categories:read
  - tags:write, tags:read

Administration:
  - admin.settings, admin.analytics, admin.logs
  - admin.backup

Advanced Features:
  - acf.manage, cpt.manage, shortcodes.manage
  - api.access, api.admin

현재 12개 역할 정의됨 (UserRole enum):
  - super_admin, admin, vendor, vendor_manager
  - seller, customer, business, moderator
  - partner, beta_user, supplier, affiliate, manager
```

**발견사항 및 이슈:**
```
✅ 권한 모델:
   - P0 단계: 역할 기반 (role_assignments)
   - P1 설계됨: 권한 기반 (roles → permissions)
   - 시간 제한 지원 (validFrom, validUntil)
   - 활성화/비활성화 지원 (isActive)

✅ 미들웨어 체인:
   - requireAuth: JWT 검증 + 사용자 로드
   - requireRole: 특정 역할 확인
   - requirePermission: 특정 권한 확인
   - requireAdmin: admin/super_admin 확인
   - customPermissionCheck: 커스텀 로직

⚠️ 앱별 권한 격리:
   - 네임스페이스는 명명 규칙으로만 지원 (강제 없음)
   - 예: forum.read, forum.write (forum 앱 권한)
   - 충돌 방지 메커니즘 없음 (수동 관리)

⚠️ 동적 권한 관리:
   - permissions 테이블에 추가는 가능
   - User.getAllPermissions()는 런타임 계산
   - 하지만 미들웨어는 코드에 하드코딩됨
   - 예: requirePermission('forum.read') ← 문자열 하드코딩

⚠️ 앱 마켓 도입 시 필요한 변경:
   1. 앱별 권한 네임스페이스 강제
      - Manifest에 permissions 배열 필수
      - 설치 시 prefix 검증 (예: `{appName}.*`)

   2. 동적 권한 등록/해제 API
      - POST /api/admin/apps/:appId/install → permissions 자동 등록
      - DELETE /api/admin/apps/:appId → permissions 제거

   3. 권한 충돌 감지
      - 설치 시 중복 권한 체크
      - 앱 간 권한 격리 보장

   4. 권한 상속 또는 그룹화
      - 예: admin.{appName} → {appName}.* 모든 권한
      - Role 단위로 앱 전체 권한 부여

   5. 프론트엔드 동적 권한 체크
      - usePermissions() hook
      - 앱 설치/제거 시 권한 목록 갱신
```

---

### 1.4 데이터베이스 구조
**조사 대상:** 앱 데이터 격리 및 마이그레이션 지원

- [x] **현재 DB 마이그레이션 도구**
  - 도구: **TypeORM** (PostgreSQL 주, SQLite 개발용)
  - 마이그레이션 파일 위치:
    - `/apps/api-server/src/database/migrations/*.ts` (60+ 마이그레이션)
    - `/apps/api-server/src/migrations/*.ts` (레거시)
  - 실행 방식:
    - Development: `pnpm run migration:run`
    - Production: `node dist/database/run-migration.js`
    - 수동 실행 (migrationsRun: false)
    - 추적 테이블: `typeorm_migrations`

- [x] **앱별 데이터 격리 전략**
  - 스키마 분리 가능성:
    - PostgreSQL 스키마 지원 (현재 미사용, 단일 public 스키마)
    - ⚠️ 앱별 스키마 분리 가능하나 TypeORM 설정 복잡
  - 테이블 네임스페이스:
    - ❌ 현재 없음 (테이블 이름에 prefix 없음)
    - 예: `forum_topics`, `forum_replies` (명명 규칙으로만 구분)
  - 다중 데이터베이스 지원:
    - ⚠️ TypeORM은 다중 Connection 지원
    - 현재는 단일 DataSource만 사용

- [x] **데이터 정리 정책**
  - 앱 삭제 시 데이터 처리:
    - ❌ 현재 정책 없음
    - CASCADE DELETE는 일부 관계에만 설정됨
    - 고아 데이터 가능성 있음
  - 백업/복원 메커니즘:
    - ❌ 자동 백업 미구현
    - pg_dump 수동 사용 가능
  - 고아 데이터 정리:
    - ❌ 자동 정리 메커니즘 없음
    - 수동 SQL 쿼리 필요

**발견사항 및 이슈:**
```
✅ TypeORM 마이그레이션 시스템:
   - 타임스탬프 기반 마이그레이션 파일
   - up/down 메서드 (롤백 지원)
   - 프로덕션 안전 (synchronize: false)
   - 60+ 마이그레이션 파일 존재

✅ 마이그레이션 패턴:
   - Pattern 1: QueryRunner + Raw SQL (빠름, 직관적)
   - Pattern 2: TypeORM API (Table, Index, ForeignKey 객체)
   - Pattern 3: 복합 마이그레이션 (다중 테이블 + 관계)

⚠️ 앱별 데이터 격리 부족:
   - 테이블 네임스페이스 없음 (명명 규칙만)
   - 예: forum_topics, forum_replies (강제 아님)
   - 충돌 가능성: 두 앱이 같은 테이블명 사용 시

⚠️ 데이터 정리 정책 부재:
   - 앱 제거 시 데이터 보존 vs 삭제 선택 불가
   - 고아 데이터 누적 가능성
   - 백업 없이 삭제 시 복구 불가

⚠️ 앱 마켓 도입 시 필요한 변경:
   1. 테이블 네임스페이스 강제
      - Manifest에 `tablePrefix` 필수 (예: `forum_`)
      - 설치 시 prefix 검증 및 충돌 체크
      - 마이그레이션 파일에 prefix 자동 적용

   2. 앱별 마이그레이션 관리
      - 앱마다 독립적인 마이그레이션 이력
      - 테이블: `app_migrations` (appId, version, timestamp)
      - 설치 시: 앱의 모든 마이그레이션 실행
      - 제거 시: 옵션에 따라 down 마이그레이션 실행

   3. 데이터 정리 정책 구현
      - Uninstall 모드:
        a. keep-data: 테이블 유지, 앱만 제거
        b. purge-data: 모든 테이블 DROP
      - 백업 옵션: 삭제 전 자동 pg_dump
      - 롤백 지원: 백업에서 복원

   4. 스키마 격리 (선택적, 고급)
      - 앱별 PostgreSQL 스키마 생성
      - 예: CREATE SCHEMA forum; CREATE TABLE forum.topics;
      - 장점: 완전 격리, 네임스페이스 자동
      - 단점: 복잡도 증가, 크로스 스키마 쿼리 어려움

   5. Migration Conflict Detection
      - 설치 전 마이그레이션 시뮬레이션
      - 테이블/컬럼 충돌 감지
      - 다른 앱 영향 분석

예시 Manifest (마이그레이션):
```typescript
{
  "name": "forum",
  "tablePrefix": "forum_",
  "migrations": [
    "migrations/001-create-topics.ts",
    "migrations/002-create-replies.ts"
  ],
  "uninstallPolicy": {
    "defaultMode": "keep-data",
    "allowPurge": true,
    "autoBackup": true
  }
}
```
```

---

### 1.5 의존성 관리
**조사 대상:** 앱 간 의존성 및 코어 API 버전 관리

- [x] **현재 패키지 구조**
  - 모노레포 여부: **✅ Yes** (pnpm workspaces)
  - 패키지 관리 도구: **pnpm >= 9.0.0**
  - 워크스페이스 구조:
    ```
    o4o-platform/
    ├── apps/
    │   ├── api-server/           # Backend (Express + TypeORM)
    │   ├── main-site/            # 메인 웹사이트 (Vite + React)
    │   └── admin-dashboard/      # 관리자 대시보드 (Vite + React)
    ├── packages/
    │   ├── @o4o/types/           # 공통 타입 정의
    │   ├── @o4o/auth-client/     # 인증 클라이언트
    │   ├── @o4o/auth-context/    # React 인증 컨텍스트
    │   ├── @o4o/ui/              # UI 컴포넌트 라이브러리
    │   ├── @o4o/utils/           # 유틸리티 함수
    │   ├── @o4o/appearance-system/ # 테마/커스터마이저
    │   ├── @o4o/shortcodes/      # 숏코드 시스템
    │   ├── @o4o/block-renderer/  # 블록 렌더러
    │   └── @o4o/slide-app/       # 슬라이드 앱
    ```

- [x] **공통 라이브러리/컴포넌트**
  - 위치: `/packages/*` (10+ 패키지)
  - 버전 관리 방식:
    - 워크스페이스 버전 (workspace:*)
    - 빌드 순서 의존성: packages → apps
    - TypeScript 프로젝트 레퍼런스 사용
  - 앱에서 사용 가능 범위:
    - ✅ 모든 apps는 packages 의존 가능
    - 예: `"@o4o/auth-client": "workspace:*"`

- [x] **코어 API 버전 관리**
  - 코어 버전 정의:
    - 루트 package.json: `"version": "0.5.0"`
    - ❌ 명시적인 API 버전 엔드포인트 없음
  - 호환성 체크 메커니즘:
    - ⚠️ 현재 없음 (앱이 코어 버전 체크 안 함)
    - TypeScript로 컴파일 타임 체크만 가능
  - Breaking changes 처리:
    - ❌ 자동화된 체크 없음
    - 수동 문서화 및 마이그레이션 가이드

**발견사항 및 이슈:**
```
✅ 모노레포 구조:
   - pnpm workspaces로 잘 구성됨
   - 명확한 packages / apps 분리
   - 빌드 순서 관리 (build:packages → build:apps)
   - 타입 안전성 (TypeScript 프로젝트 레퍼런스)

✅ 공통 패키지 재사용:
   - @o4o/auth-client: 인증 API 클라이언트
   - @o4o/ui: 공통 UI 컴포넌트
   - @o4o/types: 공유 타입 정의
   - @o4o/utils: 유틸리티 함수
   - workspace:* 패턴으로 버전 동기화

⚠️ 코어 API 버전 관리 부족:
   - 플랫폼 버전 0.5.0은 package.json에만 존재
   - 런타임 버전 체크 메커니즘 없음
   - GET /api/version 같은 엔드포인트 없음

⚠️ 앱 간 의존성 관리 없음:
   - 현재는 모든 앱이 독립적
   - 앱 A가 앱 B에 의존할 방법 없음
   - 예: "Forum" 앱이 "Notifications" 앱 필요 시

⚠️ 앱 마켓 도입 시 필요한 변경:
   1. 코어 API 버전 엔드포인트
      - GET /api/core/version → { version: "0.5.0", apiVersion: "v1" }
      - Semantic Versioning 강제 (semver 라이브러리)

   2. Manifest 버전 호환성 체크
      ```typescript
      {
        "name": "forum",
        "version": "1.2.0",
        "o4oCore": ">=0.5.0 <1.0.0",  // semver 범위
        "dependencies": {
          "notifications": "^1.0.0"   // 다른 앱 의존성
        }
      }
      ```

   3. 의존성 해결 알고리즘
      - 설치 전 의존성 트리 검증
      - 순환 의존성 감지
      - 버전 충돌 해결 (최신 호환 버전 선택)
      - 예: npm/pnpm의 dependency resolution 참고

   4. 런타임 호환성 체크
      - 앱 로드 시 코어 버전 확인
      - 비호환 시 에러 또는 경고
      - 마이그레이션 가이드 제공

   5. 앱 간 의존성 설치 자동화
      - Forum 설치 시 Notifications도 자동 설치
      - 의존성 순서대로 설치 (topological sort)

예시 의존성 해결:
```typescript
// 설치 요청: Forum v1.2.0
const manifest = {
  name: "forum",
  version: "1.2.0",
  o4oCore: ">=0.5.0 <1.0.0",  // ✅ 현재 코어 0.5.0 호환
  dependencies: {
    "notifications": "^1.0.0",  // Notifications 1.0.0 이상 필요
    "user-profiles": "~2.1.0"   // User Profiles 2.1.x 필요
  }
};

// 의존성 해결:
1. 코어 버전 체크: ✅ 0.5.0 ∈ [0.5.0, 1.0.0)
2. Notifications 설치 필요 → 최신 1.2.3 설치
3. User Profiles 설치 필요 → 2.1.5 설치
4. 모든 의존성 설치 완료 → Forum 설치
```

참고: WordPress Plugin Dependencies 시스템 참고 가능
```

---

## 2. Manifest 스키마 설계

### 2.1 필수 필드 정의

```typescript
interface AppManifest {
  // 기본 정보
  name: string;                    // 앱 고유 이름 (예: "forum")
  version: string;                 // SemVer (예: "1.0.0")
  displayName: string;             // 표시 이름 (예: "포럼")
  description: string;             // 설명
  author: string;                  // 제작자

  // 호환성
  o4oCore: string;                 // 최소 코어 버전 (예: ">=1.0.0")

  // 기능 정의
  routes?: RouteDefinition[];      // 라우트 목록
  permissions?: string[];          // 필요한 권한
  cpt?: CPTDefinition[];          // CPT 정의
  acf?: ACFDefinition[];          // ACF 필드 그룹

  // 생명주기
  lifecycle: {
    install?: string;              // 설치 스크립트 경로
    activate?: string;             // 활성화 스크립트
    deactivate?: string;           // 비활성화 스크립트
    uninstall?: string;            // 제거 스크립트
  };

  // 마이그레이션
  migrations?: string[];           // 마이그레이션 파일 목록

  // UI 확장
  settingsUI?: string;             // 설정 페이지 컴포넌트
  widgets?: WidgetDefinition[];    // 대시보드 위젯
  menuItems?: MenuItemDefinition[]; // 메뉴 항목

  // 의존성
  dependencies?: {
    [appName: string]: string;     // 다른 앱 의존성
  };

  // 메타데이터
  icon?: string;                   // 아이콘 URL
  screenshots?: string[];          // 스크린샷 URL
  homepage?: string;               // 홈페이지 URL
  repository?: string;             // 저장소 URL
  license?: string;                // 라이센스
  tags?: string[];                 // 태그/카테고리
}
```

**검토 사항:**
- [ ] 필드 추가/제거 필요 여부
- [ ] 타입 정의 적절성
- [ ] 검증 규칙 필요 여부

---

### 2.2 라우트 정의 구조

```typescript
interface RouteDefinition {
  path: string;                    // 경로 (예: "/forum/:id")
  component?: string;              // 컴포넌트 경로 (Frontend)
  handler?: string;                // 핸들러 경로 (Backend)
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  middleware?: string[];           // 미들웨어 목록
  public?: boolean;                // 공개 여부 (인증 불필요)
}
```

---

### 2.3 CPT/ACF 정의 구조

```typescript
interface CPTDefinition {
  name: string;                    // CPT 이름 (예: "forum_topic")
  label: string;                   // 표시 이름
  schema: {
    fields: {
      [key: string]: FieldType;    // 필드 정의
    };
  };
  indexes?: IndexDefinition[];     // 인덱스
}

interface ACFDefinition {
  name: string;                    // ACF 그룹 이름
  cpt: string;                     // 연결된 CPT
  fields: {
    [key: string]: ACFFieldType;
  };
}
```

---

## 3. 생명주기 API 설계

### 3.1 설치 (install)

**실행 시점:** 앱이 처음 플랫폼에 추가될 때

**책임:**
- [ ] CPT/ACF 등록
- [ ] 초기 데이터 Seed
- [ ] 권한 등록
- [ ] 설정 초기화

**API 시그니처:**
```typescript
interface InstallContext {
  app: AppManifest;
  core: CoreAPI;
  db: DatabaseConnection;
  logger: Logger;
}

type InstallFunction = (ctx: InstallContext) => Promise<void>;
```

**트랜잭션/롤백:**
- [ ] 설치 실패 시 자동 롤백 메커니즘
- [ ] 부분 설치 방지
- [ ] 충돌 감지 및 처리

---

### 3.2 활성화 (activate)

**실행 시점:** 설치된 앱을 사용 가능 상태로 전환

**책임:**
- [ ] 라우트 등록
- [ ] 메뉴 항목 추가
- [ ] 위젯 등록
- [ ] 검색 인덱스 연결

**API 시그니처:**
```typescript
type ActivateFunction = (ctx: ActivateContext) => Promise<void>;
```

---

### 3.3 비활성화 (deactivate)

**실행 시점:** 앱을 임시로 비활성화 (데이터는 유지)

**책임:**
- [ ] 라우트 제거
- [ ] 메뉴 항목 제거
- [ ] 위젯 제거
- [ ] 검색 인덱스 분리

**데이터 정책:**
- CPT/ACF 데이터는 **유지**
- UI/라우팅만 제거

---

### 3.4 제거 (uninstall)

**실행 시점:** 앱을 완전히 제거

**책임:**
- [ ] CPT/ACF 등록 해제
- [ ] 데이터 정리 (옵션)
- [ ] 권한 제거
- [ ] 설정 제거

**데이터 정리 모드:**
```typescript
interface UninstallOptions {
  mode: 'keep-data' | 'purge-data';
  backup?: boolean;
}
```

- **keep-data (기본):** 데이터 보존, 스키마만 제거
- **purge-data:** 모든 데이터 삭제 (백업 권장)

---

## 4. AppManager (서버) 설계

### 4.1 핵심 책임

- [ ] **앱 생명주기 관리**
  - install/activate/deactivate/uninstall 실행
  - 트랜잭션 관리
  - 에러 핸들링 및 롤백

- [ ] **Manifest 검증**
  - JSON Schema 검증
  - 버전 호환성 체크
  - 의존성 해결

- [ ] **마이그레이션 실행**
  - 순차 실행
  - 실패 시 롤백
  - 마이그레이션 이력 관리

- [ ] **충돌 감지**
  - 라우트 충돌
  - CPT/ACF 이름 충돌
  - 권한 충돌

### 4.2 API 엔드포인트 설계

```typescript
// 앱 목록 조회
GET /api/admin/apps
Response: { apps: AppInfo[], categories: string[] }

// 앱 상세 조회
GET /api/admin/apps/:appId
Response: { app: AppDetail, compatible: boolean }

// 앱 설치
POST /api/admin/apps/:appId/install
Request: { version?: string }
Response: { jobId: string }

// 설치 진행 상태
GET /api/admin/apps/jobs/:jobId
Response: { status: 'pending' | 'running' | 'success' | 'failed', progress: number, logs: string[] }

// 앱 활성화/비활성화
POST /api/admin/apps/:appId/activate
POST /api/admin/apps/:appId/deactivate

// 앱 제거
DELETE /api/admin/apps/:appId
Request: { mode: 'keep-data' | 'purge-data', confirm: boolean }

// 앱 업데이트
POST /api/admin/apps/:appId/update
Request: { version: string }
```

---

## 5. AppRegistry (클라이언트) 설계

### 5.1 핵심 책임

- [ ] **앱 목록 관리**
  - 설치된 앱 캐싱
  - 활성 상태 추적

- [ ] **동적 라우트 등록**
  - React Router 동적 추가
  - Code Splitting (React.lazy)

- [ ] **동적 메뉴 생성**
  - 앱별 메뉴 항목 주입
  - 권한 기반 표시

- [ ] **UI 확장 포인트**
  - 위젯 슬롯
  - 설정 페이지 슬롯
  - 플러그인 훅

### 5.2 React Hook 설계

```typescript
// 설치된 앱 목록
const { apps, loading } = useInstalledApps();

// 앱별 라우트
const { routes } = useAppRoutes(appId);

// 앱별 메뉴
const { menuItems } = useAppMenu(appId);

// 앱 설치/제거
const { install, uninstall, loading } = useAppManager();
```

---

## 6. 배포 및 유통 구조

### 6.1 앱 소스 형태 결정

**옵션 A: 내부 모노레포**
- 장점: 버전 관리 용이, 빌드 통합
- 단점: 외부 개발자 제한

**옵션 B: NPM 패키지**
- 장점: 표준 방식, 버전 관리
- 단점: 비공개 레지스트리 필요

**옵션 C: ZIP + 서명**
- 장점: 유연성, 외부 배포 가능
- 단점: 보안 관리 복잡

**선택:** (여기에 기록)

---

### 6.2 마켓 인덱스 구조

```json
{
  "version": "1.0",
  "apps": [
    {
      "id": "forum",
      "name": "@o4o-apps/forum",
      "version": "1.0.0",
      "displayName": "포럼",
      "description": "커뮤니티 포럼 앱",
      "category": "community",
      "downloads": "https://cdn.o4o.com/apps/forum-1.0.0.zip",
      "checksum": "sha256:abc123...",
      "signature": "...",
      "minCoreVersion": "1.0.0",
      "tags": ["forum", "community", "discussion"]
    }
  ]
}
```

**호스팅 위치:**
- [ ] S3 / CloudFront
- [ ] GitHub Releases
- [ ] 자체 CDN

---

### 6.3 서명 및 무결성 검증

- [ ] **서명 방식 선택**
  - GPG
  - RSA 공개키
  - 자체 시그니처

- [ ] **검증 절차**
  1. 다운로드 후 체크섬 확인 (SHA256)
  2. 서명 검증 (공개키)
  3. Manifest 검증 (JSON Schema)

- [ ] **신뢰 체인**
  - 인증된 개발자 목록
  - 앱 리뷰 프로세스

---

## 7. Admin UI/UX 설계

### 7.1 앱 마켓 페이지

**경로:** `/admin/apps/market`

**기능:**
- [ ] 앱 목록 (카드 뷰 / 리스트 뷰)
- [ ] 카테고리 필터
- [ ] 검색 (이름, 설명, 태그)
- [ ] 정렬 (인기도, 최신, 이름)
- [ ] 설치 여부 표시

**UI 컴포넌트:**
```
AppMarket
├── AppGrid
│   ├── AppCard (icon, name, description, install button)
│   └── AppCard
├── CategoryFilter
├── SearchBar
└── SortDropdown
```

---

### 7.2 앱 상세 페이지

**경로:** `/admin/apps/market/:appId`

**정보 표시:**
- [ ] 스크린샷/데모 영상
- [ ] 상세 설명
- [ ] 버전 정보
- [ ] 호환성 (코어 버전, 의존 앱)
- [ ] 필요 권한
- [ ] 변경 로그
- [ ] 리뷰/평점 (선택)

---

### 7.3 설치 플로우

```
1. "설치" 버튼 클릭
2. 권한 확인 모달 (필요한 권한 표시)
3. 의존성 확인 (필요한 다른 앱 표시)
4. 확인 후 설치 시작
5. 진행률 표시 (다운로드 → 검증 → 설치 → 활성화)
6. 성공/실패 메시지
7. 앱 설정 페이지로 이동 (옵션)
```

---

### 7.4 설치된 앱 관리

**경로:** `/admin/apps/installed`

**기능:**
- [ ] 설치된 앱 목록
- [ ] 활성/비활성 상태 토글
- [ ] 설정 페이지 링크
- [ ] 업데이트 알림
- [ ] 제거 버튼 (확인 모달)

---

## 8. 보안 및 격리

### 8.1 런타임 격리

**옵션 평가:**

**A. iframe 격리**
- 장점: 완전 격리
- 단점: 통신 복잡, 성능 저하

**B. Shadow DOM**
- 장점: CSS 격리
- 단점: JS 격리 불완전

**C. Micro Frontend (Module Federation)**
- 장점: 유연성, 성능
- 단점: 설정 복잡

**D. 네임스페이스만 (현실적)**
- 장점: 간단, 성능
- 단점: 격리 불완전

**선택:** (여기에 기록)

---

### 8.2 API 접근 제어

**Core API 범위 정의:**
```typescript
interface CoreAPI {
  // 허용되는 API
  cpt: CPTRegistry;
  acf: ACFRegistry;
  router: RouterRegistry;
  permissions: PermissionRegistry;
  storage: FileStorage;
  cache: CacheManager;

  // 제한되는 API (관리자 전용)
  admin?: {
    users: UserManagement;
    settings: SettingsManagement;
  };
}
```

**권한 스코프:**
- 앱은 선언된 permissions 범위 내에서만 API 호출 가능
- 코어 API 호출 시 앱 식별자 전달
- 감사 로그 자동 기록

---

### 8.3 CSP (Content Security Policy)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.o4o.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.o4o.com;
```

---

## 9. DoD (Definition of Done)

### 9.1 Phase 1: 기본 인프라 (1주)
- [ ] AppManifest 스키마 정의 및 JSON Schema 검증기
- [ ] AppManager 기본 구현 (install/activate/deactivate/uninstall)
- [ ] CPT/ACF 동적 등록/해제 API
- [ ] 트랜잭션 및 롤백 메커니즘
- [ ] 마이그레이션 러너 구현

### 9.2 Phase 2: 마켓 시스템 (1주)
- [ ] 앱 인덱스 로더 (apps.json)
- [ ] 다운로드 및 검증 (체크섬, 서명)
- [ ] 의존성 해결기
- [ ] 버전 관리 및 업데이트
- [ ] 감사 로그 (설치/제거/활성화 기록)

### 9.3 Phase 3: Admin UI (1주)
- [ ] 앱 마켓 페이지 (목록/상세)
- [ ] 설치 플로우 (진행률, 로그)
- [ ] 설치된 앱 관리 (활성화/비활성화/제거)
- [ ] 설정 페이지 슬롯
- [ ] 위젯 시스템 통합

### 9.4 Phase 4: 테스트 앱 (1주)
- [ ] 샘플 앱 개발 (Hello World)
- [ ] Forum 앱 추출 및 등록
- [ ] 통합 테스트 (설치/제거/업데이트)
- [ ] 성능 테스트 (다중 앱 로딩)
- [ ] 보안 테스트 (권한, 격리)

---

## 10. 조사 산출물

### 10.1 완료해야 할 문서

- [ ] `app-manifest-schema.json` - Manifest JSON Schema
- [ ] `core-api-spec.md` - 코어 API 명세
- [ ] `app-lifecycle-guide.md` - 생명주기 가이드
- [ ] `app-development-guide.md` - 앱 개발 가이드
- [ ] `security-policy.md` - 보안 정책

### 10.2 코드 산출물

- [ ] `packages/app-sdk` - 앱 개발 SDK
- [ ] `apps/api-server/src/services/AppManager.ts` - 앱 관리자
- [ ] `apps/admin-dashboard/src/features/app-market` - 마켓 UI
- [ ] `apps/api-server/src/routes/admin/apps.routes.ts` - 앱 API

---

## 11. 다음 단계 (조사 완료 후)

1. **Phase 1 착수**
   - AppManifest 스키마 확정
   - AppManager 기본 구현
   - CPT/ACF 동적 등록 API

2. **샘플 앱 개발**
   - "Hello World" 앱으로 POC
   - 생명주기 모든 단계 검증

3. **Forum 앱 추출 계획**
   - 별도 조사 문서 (`forum_app_extraction.md`)
   - 데이터 마이그레이션 전략

---

**조사 담당:**
**완료 예정일:**
**검토자:**

---

## 기록 공간 (조사 요약)

### 📊 조사 완료 일자: 2025-11-09

### 🔍 핵심 발견 사항

#### 1. 시스템 현황 종합

**✅ 잘 구현된 부분:**
- **모노레포 구조**: pnpm workspaces로 명확한 packages/apps 분리
- **타입 안전성**: TypeScript + 프로젝트 레퍼런스로 컴파일 타임 보장
- **마이그레이션 시스템**: TypeORM 마이그레이션 60+ 파일, up/down 지원
- **RBAC 시스템**: P0 역할 기반, P1 권한 기반 설계 완료
- **라우팅 우선순위**: Backend는 10단계 우선순위 시스템
- **CPT/ACF 아키텍처**: WordPress 스타일 구현, JSON 저장 지원

**⚠️ 앱 마켓 도입 시 개선 필요 부분:**

1. **런타임 동적 등록/해제 메커니즘 부재**
   - CPT: TypeORM Entity는 앱 시작 시 고정 (런타임 변경 불가)
   - 라우트: 코드 레벨 등록 (동적 추가/제거 API 없음)
   - 권한: permissions 테이블 추가는 가능하나 미들웨어는 하드코딩

2. **앱별 격리 메커니즘 부족**
   - 테이블 네임스페이스: 명명 규칙만, 강제 없음
   - 라우트 네임스페이스: 경로 prefix 권장사항만
   - 권한 네임스페이스: {resource}.{action} 패턴 지원하나 충돌 감지 없음

3. **버전 관리 및 의존성 시스템 미구현**
   - 코어 버전 API 엔드포인트 없음
   - 앱 간 의존성 해결 메커니즘 없음
   - 호환성 체크 자동화 없음

4. **데이터 정리 정책 부재**
   - 앱 제거 시 데이터 처리 정책 없음 (keep-data vs purge-data)
   - 백업/복원 자동화 없음
   - 고아 데이터 정리 메커니즘 없음

---

### 🎯 권장 아키텍처 방향

#### Option A: JSON 기반 동적 CPT 시스템 (권장)

**개념:**
- TypeORM Entity 고정 → JSON 기반 동적 스키마
- WordPress CPT 방식 (CustomPost 테이블에 fields JSON 컬럼)
- 런타임 CPT 등록/해제 가능

**장점:**
- ✅ 앱 설치/제거 시 재시작 불필요
- ✅ 스키마 충돌 없음
- ✅ 빠른 개발 속도

**단점:**
- ⚠️ SQL 쿼리 최적화 어려움 (JSON 컬럼)
- ⚠️ 타입 안전성 약화 (런타임 검증 필요)

**구현 예시:**
```typescript
// Before: TypeORM Entity (컴파일 타임 고정)
@Entity('forum_topics')
class ForumTopic {
  @Column() title: string;
  @Column() content: string;
}

// After: JSON-based CPT (런타임 동적)
const forumTopicCPT = {
  name: 'forum_topic',
  fields: {
    title: { type: 'string', required: true },
    content: { type: 'text', required: true }
  }
};
await AppManager.registerCPT(forumTopicCPT);
```

---

#### Option B: TypeORM Entity 동적 생성 (고급)

**개념:**
- TypeORM의 EntitySchema를 런타임 생성
- 메타데이터 동적 업데이트

**장점:**
- ✅ 타입 안전성 유지
- ✅ SQL 최적화 가능

**단점:**
- ❌ TypeORM 한계 (Connection 재시작 필요)
- ❌ 복잡도 높음
- ❌ 마이그레이션 관리 어려움

**결론: Option A 권장** (WordPress, Strapi 등 성공 사례 존재)

---

### 🏗️ 구현 로드맵 (4주)

#### **Phase 1: 기본 인프라 (1주)**

**목표:** 앱 생명주기 시스템 구축

**산출물:**
- [ ] `AppManifest` 타입 정의 + JSON Schema 검증
- [ ] `AppManager` 서비스 (install/activate/deactivate/uninstall)
- [ ] `app_registry` 테이블 (설치된 앱 목록)
- [ ] `app_migrations` 테이블 (앱별 마이그레이션 이력)
- [ ] 트랜잭션 및 롤백 메커니즘

**주요 파일:**
```
apps/api-server/src/
├── services/
│   └── AppManager.ts         # 앱 생명주기 관리
├── entities/
│   ├── AppRegistry.ts        # 설치된 앱 정보
│   └── AppMigration.ts       # 앱별 마이그레이션 이력
└── types/
    └── app-manifest.ts       # Manifest 타입 정의
```

**DoD:**
- [ ] 샘플 앱 설치/제거 성공
- [ ] 트랜잭션 롤백 테스트 통과
- [ ] 마이그레이션 실행/롤백 동작

---

#### **Phase 2: 마켓 시스템 (1주)**

**목표:** 앱 마켓 백엔드 API

**산출물:**
- [ ] 앱 인덱스 로더 (`apps.json` 파싱)
- [ ] 다운로드 및 검증 (SHA256, 서명)
- [ ] 의존성 해결기 (Topological Sort)
- [ ] 버전 관리 (`semver` 라이브러리)
- [ ] 감사 로그 (설치/제거/업데이트 기록)

**API 엔드포인트:**
```
GET    /api/admin/apps              # 마켓 앱 목록
GET    /api/admin/apps/:id          # 앱 상세
POST   /api/admin/apps/:id/install  # 설치
POST   /api/admin/apps/:id/activate # 활성화
POST   /api/admin/apps/:id/deactivate
DELETE /api/admin/apps/:id          # 제거
GET    /api/admin/apps/jobs/:jobId  # 설치 진행 상태
GET    /api/core/version            # 코어 버전
```

**DoD:**
- [ ] 앱 설치 API 테스트 통과
- [ ] 의존성 순서대로 자동 설치
- [ ] 버전 충돌 감지 동작
- [ ] 감사 로그 기록됨

---

#### **Phase 3: Admin UI (1주)**

**목표:** 관리자 앱 마켓 UI

**산출물:**
- [ ] 앱 마켓 페이지 (`/admin/apps/market`)
- [ ] 앱 상세 페이지 (`/admin/apps/market/:id`)
- [ ] 설치된 앱 관리 (`/admin/apps/installed`)
- [ ] 설치 플로우 (진행률, 로그 표시)
- [ ] React Hooks (`useInstalledApps`, `useAppManager`)

**컴포넌트 구조:**
```
apps/admin-dashboard/src/
├── pages/
│   └── apps/
│       ├── AppMarket.tsx          # 마켓 메인
│       ├── AppDetail.tsx          # 상세 페이지
│       └── InstalledApps.tsx      # 설치된 앱 관리
├── components/
│   └── apps/
│       ├── AppCard.tsx            # 앱 카드
│       ├── InstallProgress.tsx    # 설치 진행률
│       └── DependencyGraph.tsx    # 의존성 시각화
└── hooks/
    ├── useInstalledApps.ts
    ├── useAppManager.ts
    └── useAppRoutes.ts
```

**DoD:**
- [ ] 앱 설치 UI 테스트 통과
- [ ] 진행률 실시간 표시
- [ ] 의존성 그래프 시각화
- [ ] 에러 메시지 표시

---

#### **Phase 4: 테스트 앱 (1주)**

**목표:** Forum 앱 추출 및 검증

**산출물:**
- [ ] Hello World 샘플 앱 (POC)
- [ ] Forum 앱 추출 (`@o4o-apps/forum`)
- [ ] Manifest 작성
- [ ] 마이그레이션 파일 분리
- [ ] 통합 테스트 (설치/제거/업데이트)

**Forum 앱 구조:**
```
apps-marketplace/
└── forum/
    ├── manifest.json             # 앱 메타데이터
    ├── migrations/
    │   ├── 001-create-topics.ts
    │   └── 002-create-replies.ts
    ├── routes/
    │   ├── backend/              # API 라우트
    │   └── frontend/             # React 라우트
    ├── components/
    │   ├── TopicList.tsx
    │   └── ReplyForm.tsx
    └── lifecycle/
        ├── install.ts
        ├── activate.ts
        ├── deactivate.ts
        └── uninstall.ts
```

**DoD:**
- [ ] Forum 앱 독립 실행 가능
- [ ] 설치/제거 5회 이상 반복 테스트
- [ ] 데이터 정리 정책 동작
- [ ] 코어 API 버전 호환성 체크

---

### 🚨 주요 위험 요소

1. **TypeORM 런타임 제약**
   - 리스크: Entity 동적 등록 불가
   - 완화: JSON 기반 CPT로 재설계

2. **기존 앱 마이그레이션 복잡도**
   - 리스크: Forum 등 기존 기능 분리 시 버그 발생 가능
   - 완화: 점진적 마이그레이션, 충분한 테스트

3. **성능 저하**
   - 리스크: JSON 기반 CPT는 쿼리 성능 저하 가능
   - 완화: Indexing, 캐싱, JSONB 연산 최적화

4. **보안 격리 불완전**
   - 리스크: 네임스페이스만으로는 완전 격리 어려움
   - 완화: Code Audit, CSP, Sandbox 검토

---

### 📚 참고 자료

**유사 시스템:**
- WordPress Plugin System (PHP)
- Strapi Plugin System (Node.js)
- Directus Extensions (Vue.js)
- Shopify App System (Ruby/React)

**기술 문서:**
- TypeORM Migrations: https://typeorm.io/migrations
- React Router Dynamic Routes: https://reactrouter.com
- Semver: https://semver.org/
- PostgreSQL JSONB: https://www.postgresql.org/docs/current/datatype-json.html

---

### ✅ 다음 액션

1. **즉시 (오늘):**
   - [ ] 본 조사 결과 검토 및 승인
   - [ ] Phase 1 착수 여부 결정
   - [ ] 리소스 할당 (개발자, 기간)

2. **Phase 1 시작 전:**
   - [ ] AppManifest 스키마 최종 확정
   - [ ] 샘플 앱 요구사항 정의
   - [ ] 개발 환경 준비

3. **Phase 1 완료 후:**
   - [ ] POC 데모 (Hello World 앱)
   - [ ] 성능 테스트
   - [ ] Phase 2 착수

---

**조사 담당:** Claude Code (AI Assistant)
**완료 일자:** 2025-11-09
**검토자:** (사용자 검토 필요)
**다음 단계:** Phase 1 착수 준비
```
