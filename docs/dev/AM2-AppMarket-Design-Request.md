# AM2: App Market V1 설계 요청서 (Design Phase)

**작성일**: 2025-11-28
**Phase**: AM2 – App Market V1 설계
**상태**: 🚀 설계 시작
**선행 Phase**: AM1 (조사 완료)

---

## 1. 목표 및 범위

### 1.1 Phase 목표

AM2 Phase의 목표는 다음과 같습니다.

1. **App Market 인프라 V1**을 설계한다.
   - 앱을 "설치/활성화/비활성화/삭제"할 수 있는 시스템
   - 첫 번째 목표: Forum을 "설치 가능한 앱"으로 만들기

2. AM1 조사 결과를 바탕으로 **실제 구현 가능한 설계**를 도출한다.
   - 이상적인 아키텍처가 아닌, **현재 O4O 플랫폼 구조에서 점진적으로 적용 가능한 설계**

3. 다음 설계 산출물을 작성한다:
   - App Manifest 스키마 v1
   - `app_registry` 데이터베이스 스키마
   - AppManager 서비스 설계
   - Admin UI 설계 (App Market 관리 화면)
   - Feature Flag 통합 시스템 설계

### 1.2 범위

**포함**:
- App Manifest 정의 (앱 메타데이터)
- App Registry 스키마 (설치된 앱 정보 저장)
- AppManager 서비스 API 설계
  - `installApp(appName)`
  - `activateApp(appName)`
  - `deactivateApp(appName)`
  - `uninstallApp(appName)`
  - `listInstalledApps()`
- Admin 화면 설계 (App Market UI)
- Feature Flag 통합 (`app_registry.is_active` ↔ `ENABLE_{APP}`)
- 라우트 동적 등록 메커니즘 설계

**제외** (AM3 이후에서 처리):
- Forum 앱의 실제 분리 구현
- 멀티테넌트/서비스별 앱 번들
- 앱 버전 관리 및 업그레이드
- 앱 마켓플레이스 (외부 앱 다운로드)
- 앱 간 통신 (Event Bus)

---

## 2. 전제 및 선행 정보

### 2.1 전제

- AM1 조사 결과:
  - 7개 앱 후보 식별 (Forum, Seller/Supplier, Settlement, Partner, Notification, Wishlist, Analytics)
  - Forum은 백엔드 완성, 프론트 미구현, 의존성 없음 → **첫 번째 앱으로 최적**
  - 대부분의 앱이 Feature Flag 없음
  - 라우트가 `App.tsx`에 하드코딩됨

- 현재 플랫폼 구조:
  - TypeORM 사용 (PostgreSQL)
  - React Router v6 (프론트)
  - Express (백엔드)
  - 환경변수 기반 설정

### 2.2 참고 문서

- **AM1 조사 결과**:
  - `docs/dev/audit/app_market_current_apps_overview.md`
  - `docs/dev/audit/forum_current_state.md`
- **AM1 요청서**:
  - `docs/dev/AM1-AppMarket-Investigation-Request.md`
- **플랫폼 가이드**:
  - `CLAUDE.md` (프로젝트 규칙)
  - `DEPLOYMENT.md` (배포)
  - `BLOCKS_DEVELOPMENT.md` (CPT/ACF)

---

## 3. 설계 항목

### D-1. App Manifest 스키마 v1

**목표**: 앱의 메타데이터를 표현하는 JSON 스키마 정의

**설계 내용**:

1. Manifest 파일 위치
   - 예: `apps/api-server/src/apps/{appName}/manifest.json`
   - 또는 코드 내 상수 (`apps/api-server/src/apps/registry.ts`)

2. Manifest 필수 필드
   ```json
   {
     "name": "string",           // 앱 고유 ID (예: "forum")
     "version": "semver",        // 버전 (예: "1.0.0")
     "displayName": "string",    // 표시 이름 (예: "Forum")
     "description": "string",    // 설명
     "author": "string",         // 작성자
     "category": "enum",         // 카테고리 (business, community, analytics, etc.)
     "isCore": "boolean",        // 코어 앱 여부 (삭제 불가)
     "dependencies": ["string"], // 의존 앱 목록
     "entities": ["string"],     // TypeORM Entity 목록
     "permissions": ["string"],  // 권한 키 목록
     "routes": {                 // 라우트 정의
       "api": ["string"],        // API 경로 (예: "/api/v1/forum/*")
       "admin": ["string"],      // Admin UI 경로
       "main": ["string"]        // Main Site 경로
     },
     "featureFlags": ["string"]  // 환경변수 목록
   }
   ```

3. Manifest 검증 로직
   - 필수 필드 누락 체크
   - 의존성 순환 참조 체크
   - 권한 키 네이밍 규칙 체크

**산출물**:
- `docs/dev/design/app-manifest-schema-v1.md`
- `apps/api-server/src/types/AppManifest.ts` (TypeScript 타입 정의)

---

### D-2. `app_registry` 데이터베이스 스키마

**목표**: 설치된 앱 정보를 저장하는 테이블 설계

**설계 내용**:

1. 테이블 구조
   ```sql
   CREATE TABLE app_registry (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     app_name VARCHAR(100) UNIQUE NOT NULL,  -- manifest.name
     version VARCHAR(20) NOT NULL,           -- 설치된 버전
     is_active BOOLEAN DEFAULT true,         -- 활성화 여부
     is_core BOOLEAN DEFAULT false,          -- 코어 앱 여부 (삭제 불가)
     installed_at TIMESTAMP DEFAULT NOW(),
     installed_by UUID REFERENCES users(id) ON DELETE SET NULL,
     activated_at TIMESTAMP,
     deactivated_at TIMESTAMP,
     config JSONB,                           -- 앱별 설정값
     metadata JSONB,                         -- 추가 메타데이터
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. 인덱스
   ```sql
   CREATE INDEX idx_app_registry_is_active ON app_registry(is_active);
   CREATE INDEX idx_app_registry_app_name ON app_registry(app_name);
   ```

3. TypeORM Entity
   - `apps/api-server/src/entities/AppRegistry.ts`

**산출물**:
- `docs/dev/design/app-registry-schema.md`
- `apps/api-server/src/migrations/[timestamp]-create-app-registry.ts`
- `apps/api-server/src/entities/AppRegistry.ts`

---

### D-3. AppManager 서비스 설계

**목표**: 앱의 설치/활성화/비활성화/삭제를 관리하는 서비스 설계

**설계 내용**:

1. **서비스 위치**
   - `apps/api-server/src/services/AppManagerService.ts`

2. **주요 메서드**

   ```typescript
   class AppManagerService {
     // 앱 목록 조회
     async listAvailableApps(): Promise<AppManifest[]>
     async listInstalledApps(): Promise<AppRegistry[]>
     async getAppStatus(appName: string): Promise<AppStatus>

     // 앱 설치/삭제
     async installApp(appName: string, userId: string): Promise<AppRegistry>
     async uninstallApp(appName: string, userId: string): Promise<void>

     // 앱 활성화/비활성화
     async activateApp(appName: string, userId: string): Promise<void>
     async deactivateApp(appName: string, userId: string): Promise<void>

     // 앱 설정
     async updateAppConfig(appName: string, config: Record<string, any>): Promise<void>
     async getAppConfig(appName: string): Promise<Record<string, any>>

     // 내부 메서드
     private validateManifest(manifest: AppManifest): void
     private checkDependencies(appName: string): void
     private syncFeatureFlags(appName: string, isActive: boolean): void
     private registerRoutes(appName: string): void
     private unregisterRoutes(appName: string): void
   }
   ```

3. **비즈니스 로직**

   **설치 (`installApp`)**:
   - Manifest 검증
   - 의존성 체크
   - `app_registry` 레코드 생성
   - Entity 마이그레이션 실행 (선택)
   - 권한 키 등록
   - 기본 활성화 (`is_active = true`)

   **삭제 (`uninstallApp`)**:
   - 코어 앱 삭제 방지 (`is_core = true`)
   - 의존하는 다른 앱 체크
   - Entity 데이터 삭제 여부 확인 (위험 경고)
   - `app_registry` 레코드 삭제

   **활성화 (`activateApp`)**:
   - `app_registry.is_active = true` 업데이트
   - Feature Flag 동기화 (`ENABLE_FORUM = true`)
   - API 라우트 등록
   - 메뉴/링크 표시

   **비활성화 (`deactivateApp`)**:
   - `app_registry.is_active = false` 업데이트
   - Feature Flag 동기화 (`ENABLE_FORUM = false`)
   - API 라우트 404 반환
   - 메뉴/링크 숨김

4. **에러 처리**
   - `AppNotFoundError`
   - `AppAlreadyInstalledError`
   - `CoreAppCannotBeUninstalledError`
   - `DependencyNotInstalledError`
   - `CircularDependencyError`

**산출물**:
- `docs/dev/design/app-manager-service.md`
- `apps/api-server/src/services/AppManagerService.ts` (인터페이스)

---

### D-4. Admin UI 설계 (App Market 관리 화면)

**목표**: Admin Dashboard에서 앱을 관리할 수 있는 UI 설계

**설계 내용**:

1. **페이지 구조**

   ```
   /admin/apps                    - 앱 목록 (설치됨 + 사용 가능)
   /admin/apps/:appName           - 앱 상세/설정
   /admin/apps/:appName/config    - 앱 설정 편집
   ```

2. **앱 목록 페이지** (`/admin/apps`)

   - **탭**:
     - "설치됨" (Installed)
     - "사용 가능" (Available)

   - **앱 카드**:
     ```
     [Icon] App Name
     Description
     [Status: Active/Inactive]
     [Actions: Activate/Deactivate/Settings/Uninstall]
     ```

   - **필터**:
     - 카테고리 (Business, Community, Analytics, ...)
     - 상태 (Active, Inactive, Core)

   - **정렬**:
     - 이름, 설치일, 최근 업데이트

3. **앱 상세 페이지** (`/admin/apps/:appName`)

   - **정보 섹션**:
     - 앱 이름, 버전, 작성자, 카테고리
     - 설명
     - 설치일, 마지막 업데이트

   - **설정 섹션**:
     - 앱별 설정값 (JSON 편집 or 폼)
     - Feature Flags 표시

   - **통계 섹션** (선택사항):
     - 앱 사용 통계
     - 데이터 개수 (예: Forum의 게시글 수)

   - **위험 구역**:
     - 비활성화 버튼
     - 삭제 버튼 (코어 앱은 비활성)

4. **API 엔드포인트** (Admin 전용)

   ```
   GET    /api/v1/admin/apps              - 앱 목록
   GET    /api/v1/admin/apps/:appName     - 앱 상세
   POST   /api/v1/admin/apps/:appName/install
   POST   /api/v1/admin/apps/:appName/activate
   POST   /api/v1/admin/apps/:appName/deactivate
   DELETE /api/v1/admin/apps/:appName/uninstall
   PATCH  /api/v1/admin/apps/:appName/config
   ```

5. **권한**
   - `apps:read`: 앱 목록 조회
   - `apps:manage`: 앱 활성화/비활성화
   - `apps:install`: 앱 설치
   - `apps:uninstall`: 앱 삭제
   - `apps:config`: 앱 설정 변경

**산출물**:
- `docs/dev/design/admin-app-market-ui.md`
- Figma/Wireframe (선택사항)

---

### D-5. Feature Flag 통합 시스템

**목표**: `app_registry.is_active` ↔ `ENABLE_{APP}` 환경변수 동기화

**설계 내용**:

1. **Feature Flag 네이밍 규칙**
   - 패턴: `ENABLE_{APP_NAME_UPPERCASE}`
   - 예: `ENABLE_FORUM`, `ENABLE_PARTNER`, `ENABLE_WISHLIST`

2. **동기화 메커니즘**

   **Option A: 런타임 동기화 (권장)**
   ```typescript
   // AppManager가 메모리에 상태 캐시
   class FeatureFlagService {
     private cache: Map<string, boolean> = new Map();

     async isAppEnabled(appName: string): Promise<boolean> {
       // 1. 캐시 확인
       if (this.cache.has(appName)) {
         return this.cache.get(appName)!;
       }

       // 2. DB 조회
       const app = await appRegistry.findOne({ where: { app_name: appName } });
       const isActive = app?.is_active ?? false;

       // 3. 캐시 저장
       this.cache.set(appName, isActive);

       return isActive;
     }

     invalidate(appName: string) {
       this.cache.delete(appName);
     }
   }
   ```

   **Option B: 환경변수 파일 재작성 (비권장)**
   - `.env` 파일을 AppManager가 직접 수정
   - 서버 재시작 필요
   - 위험도 높음

3. **Guard/Middleware 적용**

   **백엔드 API Guard**:
   ```typescript
   // apps/api-server/src/middlewares/app-guard.ts
   export function AppGuard(appName: string) {
     return async (req, res, next) => {
       const isActive = await FeatureFlagService.isAppEnabled(appName);
       if (!isActive) {
         return res.status(404).json({ error: 'App not found or disabled' });
       }
       next();
     };
   }

   // 사용 예
   router.get('/api/v1/forum/*', AppGuard('forum'), forumController.handle);
   ```

   **프론트엔드 Guard**:
   ```typescript
   // apps/main-site/src/guards/AppGuard.tsx
   export function AppGuard({ appName, children }: { appName: string, children: React.ReactNode }) {
     const { data: isEnabled } = useQuery(['app', appName], () =>
       api.get(`/apps/${appName}/status`).then(r => r.data.isActive)
     );

     if (!isEnabled) {
       return <Navigate to="/404" />;
     }

     return <>{children}</>;
   }
   ```

4. **메뉴/링크 표시 제어**

   ```typescript
   // Admin 메뉴
   const menuItems = useAdminMenu();
   const enabledItems = menuItems.filter(item => {
     if (item.appName) {
       return useAppEnabled(item.appName);
     }
     return true;
   });
   ```

**산출물**:
- `docs/dev/design/feature-flag-integration.md`
- `apps/api-server/src/services/FeatureFlagService.ts`
- `apps/api-server/src/middlewares/app-guard.ts`

---

### D-6. 라우트 동적 등록 메커니즘

**목표**: 앱 활성/비활성 시 라우트를 동적으로 등록/해제

**설계 내용**:

1. **백엔드 라우트 동적 등록** (Express)

   ```typescript
   // apps/api-server/src/core/RouteRegistry.ts
   class RouteRegistry {
     private router: Router;
     private registeredApps: Map<string, Router> = new Map();

     registerApp(appName: string, appRouter: Router) {
       this.registeredApps.set(appName, appRouter);
       this.router.use('/', appRouter);
     }

     unregisterApp(appName: string) {
       const appRouter = this.registeredApps.get(appName);
       if (appRouter) {
         // Express에서 라우트 제거는 어려움 → Guard로 404 반환
         this.registeredApps.delete(appName);
       }
     }
   }

   // 사용 예
   const forumRouter = Router();
   forumRouter.get('/api/v1/forum/*', AppGuard('forum'), forumController.handle);
   RouteRegistry.registerApp('forum', forumRouter);
   ```

   **문제점**: Express는 라우트 동적 제거가 어려움
   **해결책**: Guard로 404 반환 (라우트는 등록된 상태로 유지)

2. **프론트엔드 라우트 동적 등록** (React Router v6)

   **Option A: 조건부 렌더링 (권장)**
   ```typescript
   // apps/main-site/src/App.tsx
   function App() {
     const enabledApps = useEnabledApps(); // ['forum', 'wishlist', ...]

     return (
       <Routes>
         {/* 코어 라우트 */}
         <Route path="/" element={<Home />} />

         {/* 앱 라우트 */}
         {enabledApps.includes('forum') && (
           <Route path="/forum/*" element={<ForumRoutes />} />
         )}
         {enabledApps.includes('wishlist') && (
           <Route path="/wishlist/*" element={<WishlistRoutes />} />
         )}
       </Routes>
     );
   }
   ```

   **Option B: 동적 라우트 배열**
   ```typescript
   const appRoutes = [
     { appName: 'forum', path: '/forum/*', component: ForumRoutes },
     { appName: 'wishlist', path: '/wishlist/*', component: WishlistRoutes },
   ];

   function App() {
     const enabledApps = useEnabledApps();

     return (
       <Routes>
         <Route path="/" element={<Home />} />
         {appRoutes
           .filter(route => enabledApps.includes(route.appName))
           .map(route => (
             <Route key={route.appName} path={route.path} element={<route.component />} />
           ))}
       </Routes>
     );
   }
   ```

3. **라우트 정의 위치**
   - 현재: `App.tsx`에 하드코딩
   - 변경: 앱별 라우트 파일 분리
     - `apps/main-site/src/app-routes/forum.routes.tsx`
     - `apps/main-site/src/app-routes/wishlist.routes.tsx`

**산출물**:
- `docs/dev/design/dynamic-route-registration.md`

---

## 4. 설계 제약사항

### 4.1 기술적 제약

1. **Express 라우트 동적 제거 불가**
   - 해결: Guard로 404 반환

2. **환경변수 런타임 변경 어려움**
   - 해결: 메모리 캐시 기반 Feature Flag 시스템

3. **TypeORM Entity는 앱 삭제 시 자동 제거 안 됨**
   - 해결: 삭제 시 경고 메시지, 수동 마이그레이션

### 4.2 비즈니스 제약

1. **코어 앱은 삭제 불가**
   - Seller, Supplier, Settlement, Notification 등

2. **데이터 삭제는 매우 위험**
   - 앱 삭제 시 데이터 삭제 여부를 사용자가 선택

3. **멀티테넌트 고려 안 함 (V1)**
   - 서비스 전체에 앱 활성/비활성 (테넌트별 X)

---

## 5. 완료 기준 (DoD)

AM2 Phase는 아래 조건을 만족하면 "완료"로 본다.

1. **설계 문서 작성**:
   - [ ] `docs/dev/design/app-manifest-schema-v1.md`
   - [ ] `docs/dev/design/app-registry-schema.md`
   - [ ] `docs/dev/design/app-manager-service.md`
   - [ ] `docs/dev/design/admin-app-market-ui.md`
   - [ ] `docs/dev/design/feature-flag-integration.md`
   - [ ] `docs/dev/design/dynamic-route-registration.md`

2. **TypeScript 타입 정의**:
   - [ ] `apps/api-server/src/types/AppManifest.ts`
   - [ ] `apps/api-server/src/entities/AppRegistry.ts` (Entity 정의만)

3. **설계 검토**:
   - [ ] 모든 설계 문서가 AM1 조사 결과를 반영
   - [ ] Forum 앱 분리에 즉시 적용 가능한 설계
   - [ ] 점진적 적용 가능 (Big Bang 방식 X)

---

## 6. 다음 Phase와 연결

### AM3: Forum App 분리 설계

- AM2 설계를 바탕으로 Forum 앱 분리 상세 설계
- Forum manifest 작성
- Forum API 라우트 설계
- Forum 프론트엔드 설계 (새로 개발)
- CASCADE 정책 수정 Migration

### AM4: Forum App 분리 구현

- AM3 설계를 바탕으로 실제 코드 구현
- App Market V1 프로토타입 완성
- Forum을 첫 번째 "설치 가능한 앱"으로 전환

---

**End of Document**
