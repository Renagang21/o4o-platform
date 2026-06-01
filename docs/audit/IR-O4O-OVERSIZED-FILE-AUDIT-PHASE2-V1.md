# IR-O4O-OVERSIZED-FILE-AUDIT-PHASE2-V1

**날짜:** 2026-03-21
**기준 커밋:** `19622ca7c` (WO-O4O-DEAD-CODE-CLEANUP-PHASE1-STEP2-FINAL-V1)
**범위:** api-server, web-neture, web-glycopharm, web-glucoseview, web-k-cosmetics, web-kpa-society, packages, admin-dashboard
**유형:** 조사 전용 (수정 없음)

---

## 1. 전체 요약

| 서비스 | 500+ | 800+ | 1200+ | 즉시 분해 권장 (P0) |
|--------|:----:|:----:|:-----:|:-------------------:|
| **api-server** | 76 | 24 | 3 | 3 |
| **web-neture** | 43 | 5 | 0 | 1 |
| **web-glycopharm** | 36 | 7 | 0 | 1 |
| **web-kpa-society** | 55 | 5 | 0 | 1 |
| **web-k-cosmetics** | 13 | 3 | 0 | 0 |
| **web-glucoseview** | 9 | 1 | 0 | 0 |
| **packages** | 48 | 5 | 1 | 1 |
| **admin-dashboard** | 122 | 18 | 2 | 2 |
| **합계** | **402** | **68** | **6** | **9** |

### 핵심 발견

1. **3,021줄 모놀리스 1건**: `neture.service.ts` — 플랫폼 최대 파일, 6개 하위 도메인이 한 클래스에 혼재
2. **크로스-서비스 복제 패턴 10건**: UserDetailPage, UsersPage, RoleManagementPage 등이 3~5개 서비스에 복사 — **추정 15,000~18,000줄 중복**
3. **admin-dashboard가 최다 후보 보유**: 122개 파일 (대부분 mega page 패턴)
4. **인라인 비즈니스 로직이 포함된 Route 파일 17건**: api-server에서 service layer 없이 raw SQL 직접 실행
5. **Frozen Core 파일 10건**: 분해 대상에서 제외 (WO 승인 필요)
6. **Dead code 추가 발견 2건**: admin-dashboard 내 `.backup.tsx`, `.old.tsx` 파일

---

## 2. P0 — 즉시 분해 권장 (9건)

### P0-1: `apps/api-server/src/modules/neture/neture.service.ts` (3,021줄)

| 항목 | 내용 |
|------|------|
| 유형 | Service |
| 책임 수 | **6개**: 공급자 생명주기, 상품/오퍼 관리, 파트너십 워크플로, 파트너 신청/계약, 브랜드/카테고리, 대시보드 집계 |
| 왜 P0 | 플랫폼 최대 파일. 60+ 메서드. 수정 시 6개 도메인 중 어디가 영향 받는지 추적 불가. 네처 관련 버그 수정 시 항상 이 파일에서 시작/종료 |
| 분리 방향 | `SupplierService`, `OfferService`, `PartnershipService`, `PartnerApplicationService`, `CatalogService`(brand/category), `NetureDashboardService` 6개로 분해 |
| 분해 단위 | 6개 서비스 |
| 난이도 | 중 (메서드 간 직접 호출이 일부 존재, repository 공유 패턴 정리 필요) |

### P0-2: `apps/api-server/src/controllers/forum/ForumController.ts` (1,448줄)

| 항목 | 내용 |
|------|------|
| 유형 | Controller |
| 책임 수 | **5개**: Post CRUD, Category CRUD, Comment CRUD, Like/통계, Moderation |
| 왜 P0 | 포럼은 5개 서비스(kpa, neture, glycopharm, k-cosmetics, glucoseview)가 공유하는 핵심 기능. 한 컨트롤러에서 5개 하위 도메인이 섞여 있어 변경 영향 범위가 과도 |
| 분리 방향 | `ForumPostController`, `ForumCategoryController`, `ForumCommentController`, `ForumModerationController` 4개로 분해 |
| 분해 단위 | 4개 컨트롤러 |
| 난이도 | 하 (메서드 간 의존이 적음, scope filter만 공유) |

### P0-3: `apps/api-server/src/services/authentication.service.ts` (1,277줄)

| 항목 | 내용 |
|------|------|
| 유형 | Service |
| 책임 수 | **5개**: 로그인(email/OAuth/서비스유저/게스트), 토큰 관리, 세션 관리, 이메일 발송, 테스트 계정 |
| 왜 P0 | 인증은 모든 서비스의 진입점. `login` 메서드 하나가 ~395줄. 인증 관련 버그 디버깅 시 모든 전략이 한 파일에 있어 추적이 어려움 |
| 분리 방향 | `LoginStrategyService`(email/OAuth/서비스유저/게스트 분리), `TokenService`(생성/검증/갱신), `SessionService`(쿠키/로그아웃), `AuthEmailService`(찾기/알림) |
| 분해 단위 | 4개 서비스 |
| 난이도 | 중상 (Core FROZEN 경계와 겹침 — `auth.controller.ts`가 F10에 해당. service 분해 시 WO 승인 검토 필요) |

### P0-4: `packages/mail-core/src/mail.service.ts` (1,226줄)

| 항목 | 내용 |
|------|------|
| 유형 | Service |
| 책임 수 | **4개**: SMTP 트랜스포트 관리, Handlebars 템플릿 렌더링, 비즈니스별 이메일 메서드(welcome/reset/order 등), 로깅 |
| 왜 P0 | 모든 이메일 발송의 단일 경로. 비즈니스별 send 메서드가 계속 추가되면서 비대해짐 |
| 분리 방향 | `MailTransportService`(SMTP 연결/전송), `MailTemplateEngine`(Handlebars 렌더링), 비즈니스 이메일은 각 도메인에서 MailTransportService 호출 |
| 분해 단위 | 2~3개 |
| 난이도 | 하 |

### P0-5: `apps/admin-dashboard/src/types/dashboard-api.ts` (1,715줄)

| 항목 | 내용 |
|------|------|
| 유형 | Types + Utility |
| 책임 수 | **2개**: 42개 타입 정의 + `DashboardFormatter` 유틸리티 클래스 |
| 왜 P0 | 타입 파일에 formatting 유틸리티가 혼재. admin-dashboard의 거의 모든 페이지가 이 파일을 참조 — 타입 변경 시 전체 재빌드 유발 |
| 분리 방향 | `dashboard-api.types.ts` (타입만) + `dashboard-formatter.ts` (유틸리티). 타입을 도메인별로 추가 분할 가능 (ecommerce/content/monitoring 등) |
| 분해 단위 | 2~5개 |
| 난이도 | 하 |

### P0-6: `apps/admin-dashboard/src/pages/digital-signage/v2/ContentBlockLibrary.tsx` (1,237줄)

| 항목 | 내용 |
|------|------|
| 유형 | Page (mega page) |
| 책임 수 | **4개**: 블록 리스트 + 필터/검색 + 상세/미리보기 + CRUD 모달 |
| 왜 P0 | admin-dashboard 최대 페이지. 사이니지 콘텐츠 블록 관리의 단일 진입점 |
| 분리 방향 | `ContentBlockList` + `ContentBlockDetail` + `ContentBlockFormModal` + `useContentBlocks` hook |
| 분해 단위 | 4개 |
| 난이도 | 하 |

### P0-7: 크로스-서비스 복제 — `UserDetailPage` (5개 서비스, ~3,900줄 합계)

| 항목 | 내용 |
|------|------|
| 서비스 | glycopharm(782), glucoseview(786), k-cosmetics(782), kpa-society(783), neture(765) |
| 왜 P0 | 동일 코드가 5번 복사. RBAC 변경 시 5개 파일을 모두 수정해야 하며, 이번 RBAC WO에서도 실제로 이 문제 발생. 공유 컴포넌트 추출이 가장 효과적인 중복 제거 |
| 분리 방향 | `@o4o/operator-shared` 패키지에 `OperatorUserDetailPage` 공유 컴포넌트 생성, 서비스별 thin wrapper로 교체 |
| 분해 단위 | 1개 공유 컴포넌트 + 5개 wrapper |
| 난이도 | 중 (서비스별 미세 차이 확인 필요) |

### P0-8: 크로스-서비스 복제 — `UsersPage` (5개 서비스, ~2,900줄 합계)

| 항목 | 내용 |
|------|------|
| 서비스 | glycopharm(593), glucoseview(591), k-cosmetics(588), kpa-society(595), neture(529) |
| 왜 P0 | UserDetailPage와 동일 이유. 사용자 목록 + 승인 + 비밀번호 변경이 5번 복사 |
| 분리 방향 | P0-7과 함께 `@o4o/operator-shared`에 추출 |
| 분해 단위 | 1개 공유 컴포넌트 + 5개 wrapper |
| 난이도 | 중 |

### P0-9: 크로스-서비스 복제 — `RoleManagementPage` (5개 서비스, ~2,500줄 합계)

| 항목 | 내용 |
|------|------|
| 서비스 | glycopharm(502), glucoseview(502), k-cosmetics(502), kpa-society(507), neture(502) |
| 왜 P0 | RBAC SSOT 변경 시 5개 서비스 동시 수정 필수. Frozen RBAC 정책과 직결 |
| 분리 방향 | P0-7, P0-8과 함께 `@o4o/operator-shared`에 추출 |
| 분해 단위 | 1개 공유 컴포넌트 + 5개 wrapper |
| 난이도 | 하 (거의 동일한 코드) |

---

## 3. P1 — 다음 단계 정비 권장 (16건)

| # | 서비스 | 파일 경로 | 줄수 | 유형 | 근거 |
|---|--------|----------|:----:|------|------|
| P1-1 | api-server | `routes/platform/unified-store-public.routes.ts` | 1,090 | Route | 16개 핸들러에 raw SQL 인라인. service layer 없음 |
| P1-2 | api-server | `database/connection.ts` | 1,074 | DB Config | 100+ entity imports. 자동생성 가능한 entity 배열이 500줄 |
| P1-3 | api-server | `routes/cms-content/cms-content.routes.ts` | 1,065 | Route | 인라인 TypeORM 쿼리 + 비즈니스 로직 |
| P1-4 | api-server | `modules/neture/controllers/partner.controller.ts` | 1,055 | Controller | 31개 핸들러, partner+admin 두 관객이 혼재 |
| P1-5 | api-server | `modules/auth/controllers/auth.controller.ts` | 1,047 | Controller | **FROZEN (F10)**. register 메서드 266줄. 서비스별 분기가 과도 |
| P1-6 | api-server | `services/IncidentEscalationService.ts` | 976 | Service | 6개 하위 도메인 혼합 |
| P1-7 | api-server | `services/GracefulDegradationService.ts` | 967 | Service | 룰 엔진 + 7종 액션 핸들러 + 모니터링 |
| P1-8 | web-neture | `pages/partner/PartnerOverviewPage.tsx` | 1,166 | Page | mega page + 인라인 styles 200줄+ |
| P1-9 | web-glycopharm | `api/pharmacy.ts` | 1,097 | Service | 타입 정의 + 30+ API 메서드 한 파일 |
| P1-10 | web-kpa-society | `pages/mypage/AnnualReportFormPage.tsx` | 1,093 | Page | 7섹션 mega form. 섹션별 분리 가능 |
| P1-11 | web-kpa-society | `pages/pharmacy/PharmacyStorePage.tsx` | 1,075 | Page | 스토어 설정 + 템플릿 선택 + 디바이스 프리뷰 |
| P1-12 | web-glucoseview | `pages/PatientsPage.tsx` | 1,054 | Page | list+detail split view mega page |
| P1-13 | web-neture | `pages/forum/ForumPostPage.tsx` | 1,035 | Page | 포스트 상세 + 댓글 CRUD + 좋아요 + styles |
| P1-14 | admin-dashboard | `pages/vendors/VendorsCommissionAdmin.tsx` | 1,161 | Page | 커미션 관리 mega page |
| P1-15 | admin-dashboard | `pages/lms-yaksa/credits/index.tsx` | 1,141 | Page | 학점 관리 mega page |
| P1-16 | 복제패턴 | `AiReportPage.tsx` (3개 서비스) | ~2,845 | Page | glycopharm(940)+glucoseview(965)+k-cosmetics(940) 복제 |

---

## 4. P2 — 당장 급하지 않음 (대표 항목)

| # | 서비스 | 파일 경로 | 줄수 | 유형 | 비고 |
|---|--------|----------|:----:|------|------|
| P2-1 | api-server | `app-manifests/appsCatalog.ts` | 1,034 | Config | 카탈로그 데이터 470줄은 구조상 불가피 |
| P2-2 | api-server | `routes/dashboard/dashboard-assets.routes.ts` | 1,010 | Route | 분리 가능하나 대시보드 자산 도메인 한정 |
| P2-3 | api-server | `services/AppManager.ts` | 951 | Service | 역할이 비교적 단일(앱 생명주기) |
| P2-4 | api-server | `services/block-registry.service.ts` | 937 | Service | 정적 데이터가 대부분 |
| P2-5 | web-kpa-society | `App.tsx` | 876 | Router | 라우트 정의가 대부분. 구조상 불가피 |
| P2-6 | web-neture | `App.tsx` | 800 | Router | 위와 동일 |
| P2-7 | packages | `membership-yaksa/.../MemberService.ts` | 936 | Service | DTO 인라인이지만 단일 도메인 |
| P2-8 | packages | `hub-exploration-core/.../B2BTableList.tsx` | 902 | Component | 인라인 CSS 200줄+ 분리 가능 |
| P2-9 | packages | `groupbuy-yaksa/.../groupbuy.routes.ts` | 862 | Route | 라우트+검증+에러처리 혼합 |
| P2-10 | 복제패턴 | `StoreChannelsPage.tsx` (3개 서비스) | ~2,662 | Page | glycopharm(880)+k-cosmetics(872)+kpa(910) |
| P2-11 | 복제패턴 | `StoreLocalProductsPage.tsx` (3개 서비스) | ~1,938 | Page | glycopharm(646)+k-cosmetics(646)+kpa(646) |
| P2-12 | 복제패턴 | `RegisterModal/RegisterPage` (4개 서비스) | ~2,614 | Component | neture(643)+glycopharm(683)+k-cosmetics(665)+kpa(623) |

---

## 5. SKIP — 현재 구조상 유지 가능

### 5.1 Frozen Core 파일 (10건 — WO 승인 필수)

| 파일 | 줄수 | Freeze 근거 |
|------|:----:|------------|
| `packages/ui/src/index.tsx` | 631 | F1 (Operator OS) + Design Core |
| `packages/ui/src/components.tsx` | 609 | F1 (Operator OS) + Design Core |
| `packages/forum-core/src/backend/services/forum.service.ts` | 681 | §13 APP-FORUM Frozen |
| `packages/forum-core/src/templates/PostSingle.tsx` | 592 | §13 APP-FORUM Frozen |
| `packages/forum-core/src/templates/PostList.tsx` | 527 | §13 APP-FORUM Frozen |
| `packages/forum-core/src/public-ui/components/CommentSection.tsx` | 535 | §13 APP-FORUM Frozen |
| `packages/forum-core/src/migrations/001-create-forum-tables.ts` | 553 | §13 APP-FORUM Frozen |
| `packages/digital-signage-core/src/backend/engine/RenderingEngine.ts` | 574 | §13 APP-SIGNAGE Frozen |
| `packages/types/src/auth/permissions.ts` | 508 | F9 RBAC SSOT |
| `apps/api-server/src/modules/auth/controllers/auth.controller.ts` | 1,047 | F10 O4O Core |

### 5.2 마이그레이션/시드 파일

| 파일 | 줄수 | 비고 |
|------|:----:|------|
| `migrations/2026011700001-CreateSignageCoreEntities.ts` | 695 | DDL 전용 |
| `migrations/20260207400000-SeedKpaSignageContent.ts` | 586 | 시드 데이터 |
| `migrations/1738182000000-CreateForumTables.ts` | 580 | DDL 전용 |
| `migrations/1737100400000-RecreateNetureTables.ts` | 562 | DDL 전용 |

### 5.3 Generated/Config/Types 전용 파일

| 파일 | 줄수 | 비고 |
|------|:----:|------|
| `packages/api-types/src/cosmetics.ts` | 963 | OpenAPI 자동생성 |
| `packages/types/src/ecommerce.ts` | 800 | 순수 타입 정의 |
| `api-server/src/types/roles.ts` | 539 | 순수 타입 + 역할 레지스트리 |
| `api-server/src/config/swagger-enhanced.ts` | 595 | OpenAPI 스펙 정의 |
| `api-server/src/swagger/swagger.config.ts` | 548 | Swagger 설정 |
| `packages/block-renderer/src/metadata.ts` | 733 | 블록 메타데이터 레지스트리 |
| `packages/cgm-pharmacist-app/src/backend/mock/mockPatients.ts` | 708 | 목 데이터 |
| `web-k-cosmetics/src/components/icons.tsx` | 507 | SVG 아이콘 정의 |
| `web-glycopharm/src/types/store.ts` | 616 | 순수 타입 정의 |

### 5.4 테스트 파일

| 파일 | 줄수 | 비고 |
|------|:----:|------|
| `dropshipping-core/.../cross-industry.test.ts` | 972 | 통합 테스트 |
| `partner-core/.../__tests__/integration.test.ts` | 589 | 통합 테스트 |
| `dropshipping-cosmetics/.../seller-workflow-api.test.ts` | 540 | API 테스트 |
| `cosmetics-partner-extension/.../commission-integration.test.ts` | 524 | 통합 테스트 |

---

## 6. 추가 발견: Dead Code (admin-dashboard)

| # | 파일 | 줄수 | 판정 | 근거 |
|---|------|:----:|------|------|
| D-1 | `admin-dashboard/.../EnhancedBlockWrapper.backup.tsx` | 721 | SAFE REMOVE | `.backup.tsx` 접미사, 현재 버전으로 대체됨 |
| D-2 | `admin-dashboard/.../ListBlock.old.tsx` | 646 | SAFE REMOVE | `.old.tsx` 접미사, 현재 버전으로 대체됨 |

> 이 2건은 Dead Code Phase 2로 관리하거나, oversized 분해 WO에 함께 포함 가능.

---

## 7. 추가 발견: 타입 중복 (packages)

| # | 파일 | 줄수 | 이슈 |
|---|------|:----:|------|
| T-1 | `packages/types/src/ecommerce.ts` (800줄) vs `packages/types/src/ecommerce.d.ts` (562줄) | 1,362 | 동일 47개 타입을 두 파일에서 export. `.d.ts`는 컴파일 산출물 또는 수동 복사 |
| T-2 | `packages/utils/src/pricing.ts` (666줄) | 666 | `UserRole`, `RetailerGrade`, `PriceByRole`를 로컬 재정의 ("@o4o/types 빌드 이슈 해결 전까지 임시") |

---

## 8. 크로스-서비스 복제 패턴 종합

| 패턴 | 서비스 수 | 총 줄수 | 우선순위 |
|------|:---------:|:------:|:--------:|
| **UserDetailPage** | 5 | ~3,900 | **P0** |
| **UsersPage** | 5 | ~2,900 | **P0** |
| **RoleManagementPage** | 5 | ~2,500 | **P0** |
| **AiReportPage** | 3 | ~2,845 | P1 |
| **StoreChannelsPage** | 3 | ~2,662 | P2 |
| **StoreLocalProductsPage** | 3 | ~1,938 | P2 |
| **RegisterModal/Page** | 4 | ~2,614 | P2 |
| **StoreSignagePage** | 2 | ~1,978 | P2 |
| **GlucoseInputPage** | 2 | ~1,153 | P2 |
| **StoreLibrarySelectorModal** | 2 | ~1,067 | P2 |
| **합계** | | **~23,557** | |

> 크로스-서비스 복제만으로 **~23,500줄**이 중복. 공유 패키지 추출로 **~15,000줄 이상 감소** 가능.

---

## 9. 서비스별 파일 유형 분포

### api-server (76건)

| 유형 | 건수 | 총 줄수 |
|------|:----:|:------:|
| Service | 33 | 23,637 |
| Route | 17 | 12,312 |
| Controller | 11 | 9,004 |
| Config/Registry | 5 | 4,023 |
| Migration | 5 | 3,003 |
| Entity | 2 | 1,077 |
| Utility | 2 | 1,158 |
| Types/Middleware/Validator | 3 | 1,688 |

### Frontend 전체 (156건)

| 유형 | 건수 |
|------|:----:|
| Page (mega page) | ~100 |
| Page (정적 콘텐츠) | ~12 |
| Service/API | ~8 |
| Component | ~10 |
| Router (App.tsx) | 3 |
| Types/Context/Layout | 3 |

### packages (48건)

| 유형 | 건수 | 총 줄수 |
|------|:----:|:------:|
| Service | 24 | 15,197 |
| Component | 7 | 4,278 |
| Test | 5 | 3,165 |
| Types | 5 | 3,293 |
| Controller | 5 | 2,929 |

### admin-dashboard (122건)

| 유형 | 건수 | 총 줄수 |
|------|:----:|:------:|
| Page component | 80 | ~52,000 |
| Editor component | 20 | ~12,400 |
| API client | 5 | ~4,263 |
| Shortcode component | 6 | ~4,267 |

---

## 10. 단계 제안

### Phase 2-Step 1: P0 백엔드 모놀리스 분해 (3건)

| 순서 | 대상 | 예상 효과 |
|:----:|------|----------|
| 1 | `neture.service.ts` (3,021줄 → 6개 서비스) | 네처 도메인 디버깅 난이도 대폭 감소 |
| 2 | `ForumController.ts` (1,448줄 → 4개 컨트롤러) | 포럼 변경 시 영향 범위 축소 |
| 3 | `authentication.service.ts` (1,277줄 → 4개 서비스) | **FROZEN 경계 검토 필요** — WO 승인 후 진행 |

> `authentication.service.ts`는 F10 Core Freeze 경계와 겹침. 서비스 레이어 분해는 구조 변경이 아닌 파일 분할이므로 허용 가능할 수 있으나, 명시적 WO 승인이 안전.

### Phase 2-Step 2: P0 크로스-서비스 복제 해소 (3건)

| 순서 | 대상 | 예상 효과 |
|:----:|------|----------|
| 4 | `UserDetailPage` → `@o4o/operator-shared` | 5개 파일 → 1개 공유 + 5개 thin wrapper |
| 5 | `UsersPage` → `@o4o/operator-shared` | 위와 동일 |
| 6 | `RoleManagementPage` → `@o4o/operator-shared` | 위와 동일 |

> 3개 패턴을 함께 추출하면 **~9,300줄 중복이 ~2,000줄로 감소**.

### Phase 2-Step 3: P0 기타 (3건)

| 순서 | 대상 | 예상 효과 |
|:----:|------|----------|
| 7 | `mail-core/mail.service.ts` (1,226줄) | 이메일 도메인 분리 |
| 8 | `dashboard-api.ts` (1,715줄) | 타입/유틸 분리, 빌드 효율 |
| 9 | `ContentBlockLibrary.tsx` (1,237줄) | admin-dashboard mega page 분해 시작점 |

### Phase 2-Step 4: P1 진행 + 재조사

P0 완료 후 P1 16건을 같은 패턴으로 진행.

### 권장 흐름

```
P0 3건 백엔드 분해 → tsc 검증 → 커밋
→ P0 3건 복제 해소 → tsc 검증 → 커밋
→ P0 3건 기타 → tsc 검증 → 커밋
→ 재조사 (Post-P0 Audit)
→ P1 진행
```

---

## 11. 잔존 관리 항목

| 항목 | 상태 | 관리 방법 |
|------|------|----------|
| Frozen Core 파일 10건 | SKIP | WO 승인 시에만 정비 |
| admin-dashboard dead code 2건 | SAFE REMOVE | 다음 cleanup WO에 포함 |
| 타입 중복 2건 (ecommerce .ts/.d.ts, pricing.ts 로컬 재정의) | NEEDS REVIEW | 패키지 빌드 정비 시 해결 |
| `auth.controller.ts` 분해 | FROZEN (F10) | Step 1에서 authentication.service.ts 분해 시 연계 검토 |

---

*Generated: 2026-03-21*
*Audit Method: 3 parallel agents (api-server / frontend 5 services / packages+admin) + manual cross-verification*
*Verification: wc -l scan, file head/tail read, export count, concern mixing analysis, cross-service duplicate detection*
