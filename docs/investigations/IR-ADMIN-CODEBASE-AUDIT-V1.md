# IR-ADMIN-CODEBASE-AUDIT-V1

> **Admin / API 코드베이스 사용 여부 조사**
> 작성일: 2026-03-04
> 상태: READ-ONLY 조사 완료
> 목적: 코드 삭제가 아니라 **현재 코드의 사용 상태를 파악하고 Dead Code 후보를 식별하는 것**

---

## 1. 코드 규모 분석

### Frontend (`apps/admin-dashboard/`)

| 항목 | 수량 |
|------|------|
| Pages (`.tsx`) | 489 |
| Components | 356 |
| API Modules | 26 |
| Custom Hooks | 53 |
| Services | 19 |
| Routes (정의) | 197 |

### Backend (`apps/api-server/`)

| 항목 | 수량 |
|------|------|
| Controllers | 163 |
| Services | 172+ |
| Entities | 130+ |
| Route Files | 90 |
| TypeScript 파일 전체 | 1,299 |
| Migrations | 100+ |

---

## 2. Frontend 사용 상태

### 2.1 Router 기준 페이지 분류

**ACTIVE (Router 등록, 정상 사용): 470+**

모든 주요 섹션이 lazy-loaded 라우트로 정상 등록:
- Admin Core (15 routes), Users (8), CMS V2 (20), Commerce (15)
- Services: Yaksa, Glycopharm, GlucoseView, Cosmetics (35+)
- Editor (6), Appearance/Theme (12), Forums (8), Signage (15)
- Dashboards (8), Test/Debug (25)

**UNREFERENCED (파일 존재, Router 미등록): ~10개 디렉토리**

| 디렉토리 | 파일 수 | 상태 | 비고 |
|----------|---------|------|------|
| `pages/ag-demo/` | 6 | DEMO | 내부 컴포넌트 쇼케이스 |
| `pages/cosmetics-products-admin/` | 4 | ORPHANED | 상위 라우터 미발견 |
| `pages/cosmetics-sample/` | 5 | LEGACY | 데모 데이터 |
| `pages/cosmetics-supplier/` | 6 | LEGACY | 공급자 관리 |
| `pages/dropshipping-offers/` | 3 | ORPHANED | Offers 관리 미사용 |
| `pages/feedback/` | 1 | ORPHANED | 피드백 페이지 미사용 |
| `pages/vendors/` | 4 | ORPHANED | 벤더 관리 미사용 |
| `pages/yaksa-forum/` | 4 | LEGACY | 커뮤니티 포럼 |
| `pages/wordpress/` | 1 | LEGACY | WordPress 관련 레거시 |

### 2.2 메뉴 기준 접근 가능 여부

| 상태 | 수량 | 설명 |
|------|------|------|
| MENU_ACTIVE | ~60 | 사이드바 메뉴에서 접근 가능 |
| ROUTE_ONLY | ~137 | 메뉴 없음, 직접 URL로만 접근 |
| DEAD_PAGE | ~10 | Router 미등록 (위 UNREFERENCED 목록) |

### 2.3 API Client 사용 여부

**ACTIVE (18개, 69%)**:
`userApi`, `contentApi`, `presets`, `menuApi`, `dropshipping-cpt`, `dropshipping-admin`, `content-assets.api`, `service-applications`, `admin-apps`, `partner`, `unified-client`, `ai-references.api`, `erp-connector`, `vendor/products`, `categoriesApi`, `settings`, `sso`, `app-system.api`

**UNUSED (8개, 31%)**:

| 모듈 | 상태 | 비고 |
|------|------|------|
| `apiRequest.ts` | ORPHANED | 레거시 유틸리티, base re-export 확인 필요 |
| `base.ts` | ORPHANED | Base HTTP client, re-export 가능 |
| `apps.ts` | ORPHANED | `admin-apps.ts`에 의해 대체됨 |
| `apps/index.ts` | ORPHANED | 인덱스 re-export |
| `dashboard.ts` | ORPHANED | 레거시 대시보드 API |
| `notifications.ts` | ORPHANED | 알림 서비스 미사용 |
| `policy-settings.ts` | ORPHANED | 정책 설정 미사용 |
| `store-network.ts` | ORPHANED | 스토어 네트워크 API |

---

## 3. Backend 사용 상태

### 3.1 Controller → Route 연결 여부

**UNREGISTERED Controllers (라우트 미등록): 9개**

| Controller | 상태 | 비고 |
|------------|------|------|
| `autoRecoveryController.ts` | ORPHANED | 라우트 미등록, 사용처 없음 |
| `analyticsController.ts` | ORPHANED | 라우트 미등록, 사용처 없음 |
| `monitoringController.ts` | ORPHANED | 라우트 미등록, 사용처 없음 (내부 서비스만 import) |
| `SmtpController.ts` | ORPHANED | `smtp.routes.ts` 존재하나 main.ts 미등록 |
| `ThemeController.ts` | ORPHANED | `theme.routes.ts` 존재하나 main.ts 미등록 |
| `MigrationController.ts` | ORPHANED | 라우트 미등록, 사용처 없음 |
| `formController.ts` | ORPHANED | 라우트 미등록, 사용처 없음 |
| `templatesController.ts` | ORPHANED | 라우트 미등록, 사용처 없음 |
| `customFieldsController.ts` | ORPHANED | 라우트 미등록, 사용처 없음 |

**추가 ORPHANED Controllers (Forum/CPT):**

| Controller | 상태 |
|------------|------|
| `ForumRecommendationController.ts` | LEGACY |
| `forum-organizations.ts` | LEGACY |
| `forumIconSamples.ts` | LEGACY |
| `FieldGroupsController.ts` | ORPHANED |
| `FormsController.ts` | ORPHANED |
| `TaxonomiesController.ts` | ORPHANED |
| `EcommerceSettingsController.ts` | ORPHANED |
| `SupplierEntityController.ts` | ORPHANED |
| `adminController.ts` | LEGACY (admin/* 으로 대체) |
| `userController.ts` | LEGACY (users.routes.ts로 대체) |
| `post-creation.ts` | ORPHANED |

**합계: ~20개 미등록 컨트롤러**

### 3.2 Service 사용 여부

**ORPHANED Services: 1개**

| Service | 상태 | 비고 |
|---------|------|------|
| `ScheduledReportingService.ts` | ORPHANED | index.ts export만 존재, 실제 import 0건 |

**나머지 13개 서비스는 모두 ACTIVE** (startup.service.ts, PerformanceMonitoringInitializer, 또는 controller에서 사용):
AutoRecovery, AutoScaling, Backup, CircuitBreaker, DatabaseOptimization, ErrorAlert, GracefulDegradation, IncidentEscalation, MaterializedViewScheduler, PerformanceOptimization, RefreshToken, SecurityAudit, SelfHealing

### 3.3 Entity 사용 여부

**모든 Entity는 connection.ts에 등록되어 ACTIVE.**

**Removed (주석 처리) Entities:**

| Entity 그룹 | 상태 | 비고 |
|-------------|------|------|
| Media/MediaFile/MediaFolder | REMOVED | 레거시 CMS |
| Post/PostMeta/Page/PostAutosave | REMOVED | 레거시 WP-like CMS |
| Shipment/ShipmentTrackingHistory | REMOVED | 레거시 커머스 |
| Menu System entities | REMOVED | 레거시 CMS |
| Cart/Order/Settlement | REMOVED | 레거시 커머스 |
| SupplierProfile/SellerProfile/PartnerProfile | REMOVED | dropshipping-core 패키지로 이전 |
| ForumCategoryRequest | REMOVED | KpaApprovalRequest로 이전 |
| Dropshipping entities | REMOVED | @o4o/dropshipping-core로 이전 |

### 3.4 미등록 라우트 파일

| 라우트 파일 | 상태 | 비고 |
|------------|------|------|
| `routes/v1/approval.routes.ts` | UNREGISTERED | main.ts 미마운트, ApprovalController 사용 |
| `routes/v1/smtp.routes.ts` | UNREGISTERED | main.ts 미마운트 |
| `routes/v1/theme.routes.ts` | UNREGISTERED | main.ts 미마운트 |

### 3.5 비활성화된 도메인 라우트 (Phase R2)

| 도메인 | 상태 | 비고 |
|--------|------|------|
| `@o4o/reporting-yaksa` | DISABLED | Phase R2 재통합 대기 |
| `@o4o/annualfee-yaksa` | DISABLED | Phase R2 재통합 대기 |
| `@o4o/cosmetics-seller-extension` | DISABLED | Phase R2 재통합 대기 |
| `@o4o/cosmetics-sample-display-extension` | DISABLED | Phase R2 재통합 대기 |
| `@o4o/cosmetics-supplier-extension` | DISABLED | Phase R2 재통합 대기 |
| `@o4o/groupbuy-yaksa` | DISABLED | Phase R2 재통합 대기 |

---

## 4. Legacy 기능 후보 조사

### 4.1 Campaign

| 항목 | 파일 | 상태 |
|------|------|------|
| Entity | `SellerCampaign.entity.ts` | ACTIVE (Signage seller extension) |
| Entity | `PharmacySeasonalCampaign.entity.ts` | ACTIVE (Signage pharmacy extension) |
| Service | `QuizCampaignService.ts` | ACTIVE (LMS) |
| Service | `SurveyCampaignService.ts` | ACTIVE (LMS) |
| Migration | `CampaignCleanCore.ts` | COMPLETED |
| Migration | `CampaignSimplification.ts` | COMPLETED |

**판정**: Campaign은 LMS + Signage에서 여전히 사용 중. 완전 제거 불가.

### 4.2 Clone Signage (Asset Snapshot)

| 항목 | 파일 | 상태 |
|------|------|------|
| Entity | `asset-snapshot.entity.ts` | ACTIVE |
| Entity | `care-kpi-snapshot.entity.ts` | ACTIVE |
| Service | `asset-snapshot.service.ts` | ACTIVE |
| Service | `service-snapshot.service.ts` | ACTIVE |
| Controller | `asset-snapshot.controller.ts` (KPA) | ACTIVE |
| Controller | `neture-asset-snapshot.controller.ts` | ACTIVE |

**판정**: Snapshot 패턴은 현재 활발히 사용 중. Dead Code 아님.

### 4.3 Approval Flow

| 항목 | 파일 | 상태 |
|------|------|------|
| Entity | `ProductApproval.entity.ts` | ACTIVE |
| Entity | `ApprovalLog.entity.ts` | ACTIVE |
| Entity | `RoleApplication.entity.ts` | ACTIVE |
| Controller | `ApprovalController` | ⚠️ 라우트 미등록 |
| Service | `approval-workflow.service.ts` | ACTIVE |
| Service | `product-approval-v2.service.ts` | ACTIVE (v2) |
| Route | `approval.routes.ts` | ⚠️ main.ts 미마운트 |

**판정**: Entity/Service는 사용 중이나, `approval.routes.ts`는 main.ts에 미등록 → ORPHANED 라우트.

### 4.4 RBAC Legacy

| 항목 | 파일 | 상태 |
|------|------|------|
| DB 테이블 | `users.role` | DROPPED (Phase 3-E) |
| DB 테이블 | `users.roles` | DROPPED (Phase 3-E) |
| DB 테이블 | `user_roles` | DROPPED (Phase 3-E) |
| Utility | `hasPlatformRole()` | ⚠️ signage-role.middleware에서 사용 |
| Utility | `logLegacyRoleUsage()` | ⚠️ 감사용 |
| SSOT | `role_assignments` | ACTIVE |

**판정**: DB 정리 완료. `role.utils.ts`의 legacy 함수 2개가 signage middleware에서 아직 사용 중 → signage 역할 리팩토링 후 제거 가능.

### 4.5 Store Legacy

Store v1 구조는 Hub Refactor(WO-O4O-STORE-HUB-STRUCTURE-REFACTOR-V1)로 정리 완료. 레거시 라우트는 redirect로 전환됨.

---

## 5. Dead Code 후보 목록

### Frontend

| 파일/디렉토리 | 상태 | 설명 | 예상 줄수 |
|--------------|------|------|----------|
| `pages/ag-demo/` (6 files) | DEMO | 내부 쇼케이스, 프로덕션 불필요 | ~300 |
| `pages/cosmetics-products-admin/` (4 files) | ORPHANED | 라우터 미발견 | ~200 |
| `pages/cosmetics-sample/` (5 files) | LEGACY | 데모 데이터 | ~250 |
| `pages/cosmetics-supplier/` (6 files) | LEGACY | nested router 확인 필요 | ~300 |
| `pages/dropshipping-offers/` (3 files) | ORPHANED | 미사용 | ~150 |
| `pages/feedback/` (1 file) | ORPHANED | 미사용 | ~50 |
| `pages/vendors/` (4 files) | ORPHANED | 미사용 | ~200 |
| `pages/yaksa-forum/` (4 files) | LEGACY | nested router 확인 필요 | ~200 |
| `pages/wordpress/` (1 file) | LEGACY | WordPress 레거시 | ~50 |
| `api/apps.ts` | ORPHANED | admin-apps.ts로 대체 | ~50 |
| `api/dashboard.ts` | ORPHANED | 레거시 API | ~50 |
| `api/notifications.ts` | ORPHANED | 미사용 | ~50 |
| `api/policy-settings.ts` | ORPHANED | 미사용 | ~50 |
| `api/store-network.ts` | ORPHANED | 미사용 | ~50 |
| **소계** | | | **~1,950줄** |

### Backend

| 파일 | 상태 | 설명 | 예상 줄수 |
|------|------|------|----------|
| `controllers/autoRecoveryController.ts` | ORPHANED | 라우트 미등록 | ~200 |
| `controllers/analyticsController.ts` | ORPHANED | 라우트 미등록 | ~150 |
| `controllers/monitoringController.ts` | ORPHANED | 라우트 미등록 | ~200 |
| `controllers/SmtpController.ts` | ORPHANED | main.ts 미등록 | ~100 |
| `controllers/ThemeController.ts` | ORPHANED | main.ts 미등록 | ~100 |
| `controllers/MigrationController.ts` | ORPHANED | 라우트 미등록 | ~100 |
| `controllers/formController.ts` | ORPHANED | 라우트 미등록 | ~150 |
| `controllers/templatesController.ts` | ORPHANED | 라우트 미등록 | ~150 |
| `controllers/customFieldsController.ts` | ORPHANED | 라우트 미등록 | ~100 |
| `controllers/adminController.ts` | LEGACY | admin/* 로 대체 | ~200 |
| `controllers/userController.ts` | LEGACY | users.routes.ts로 대체 | ~200 |
| `controllers/post-creation.ts` | ORPHANED | 미사용 | ~100 |
| `controllers/forum/ForumRecommendationController.ts` | LEGACY | 미사용 | ~100 |
| `controllers/forum/forum-organizations.ts` | LEGACY | 미사용 | ~100 |
| `controllers/forum/forumIconSamples.ts` | LEGACY | 미사용 | ~50 |
| `controllers/cpt/FieldGroupsController.ts` | ORPHANED | 미사용 | ~100 |
| `controllers/cpt/FormsController.ts` | ORPHANED | 미사용 | ~100 |
| `controllers/cpt/TaxonomiesController.ts` | ORPHANED | 미사용 | ~100 |
| `controllers/ecommerce/EcommerceSettingsController.ts` | ORPHANED | 미사용 | ~100 |
| `controllers/entity/SupplierEntityController.ts` | ORPHANED | 미사용 | ~100 |
| `services/ScheduledReportingService.ts` | ORPHANED | export만, import 0건 | ~100 |
| `routes/v1/approval.routes.ts` | ORPHANED | main.ts 미마운트 | ~50 |
| `routes/v1/smtp.routes.ts` | ORPHANED | main.ts 미마운트 | ~30 |
| `routes/v1/theme.routes.ts` | ORPHANED | main.ts 미마운트 | ~30 |
| **소계** | | | **~2,710줄** |

---

## 6. 영향도 분석

### Dead Code 제거 시 영향 서비스

| Dead Code | 영향 서비스 | 위험도 |
|-----------|-----------|--------|
| Frontend ORPHANED pages (cosmetics-*) | cosmetics 서비스 nested router 확인 필요 | MEDIUM |
| Frontend vendors/feedback | 없음 | LOW |
| Frontend ag-demo | 없음 (개발 도구) | LOW |
| Backend 미등록 controllers (20개) | 없음 (라우트 미등록이므로 접근 불가) | LOW |
| Backend ScheduledReportingService | 없음 | LOW |
| Backend approval.routes.ts | 승인 워크플로우 — Service/Entity는 별도 경로로 사용 중 | LOW |
| Backend SmtpController/ThemeController | 없음 (라우트 미등록) | LOW |
| Phase R2 비활성 도메인 (6개) | 재통합 계획 확인 필요 | MEDIUM |

---

## 7. 종합 요약

### 수치 요약

| 구분 | 전체 | Active | Dead Code 후보 | 비율 |
|------|------|--------|---------------|------|
| **Frontend Pages** | 489 | ~455 | ~34 (10 dirs) | 7% |
| **Frontend API Modules** | 26 | 18 | 8 | 31% |
| **Backend Controllers** | 163 | ~143 | ~20 | 12% |
| **Backend Services** | 172+ | 171+ | 1 | <1% |
| **Backend Entities** | 130+ | 130+ | 0 | 0% |
| **Backend Route Files** | 90 | 87 | 3 | 3% |

### Dead Code 총 추정

| 영역 | 줄수 |
|------|------|
| Frontend | ~1,950줄 |
| Backend | ~2,710줄 |
| **합계** | **~4,660줄** |

전체 코드베이스 대비 약 **3~5% 수준**의 Dead Code가 존재.

### 핵심 결론

1. **Entity/Service는 건전하다.** 130+ Entity 모두 등록, 171+ Service 중 1개만 orphaned.
2. **Controller가 가장 많은 Dead Code.** 20개 컨트롤러가 라우트 미등록. 대부분 초기 개발 시 생성 후 모듈 구조로 대체된 레거시.
3. **Frontend는 Nested Router 확인 필요.** cosmetics-*, yaksa-forum 등은 상위 라우터에서 동적으로 로딩될 가능성 있음 → 제거 전 확인 필수.
4. **Phase R2 비활성 도메인(6개)은 의도적 비활성.** 재통합 계획에 따라 결정.

---

## 8. 정비 필요 항목 (WO 후보)

| 우선순위 | WO 후보 | 범위 | 예상 효과 |
|----------|---------|------|----------|
| **P0** | 미등록 Controller 정리 | 20개 컨트롤러 파일 삭제 | ~2,500줄 제거 |
| **P0** | 미등록 Route 파일 정리 | 3개 라우트 파일 삭제 | ~110줄 제거 |
| **P1** | Frontend ORPHANED 페이지 정리 | 10개 디렉토리, 34 파일 | ~1,700줄 제거 |
| **P1** | Frontend unused API 모듈 정리 | 8개 API 파일 | ~250줄 제거 |
| **P2** | Phase R2 비활성 도메인 결정 | 6개 패키지 | 재통합 or 영구 제거 |
| **P2** | RBAC legacy utility 정리 | role.utils.ts 2개 함수 | signage 리팩토링 후 |

---

## 9. 중요 원칙

이 조사에서는 다음 작업을 **수행하지 않았다**:
- 코드 삭제
- 리팩토링
- 구조 변경

조사 목적은 **현재 코드 상태를 정확히 파악하는 것**이다.

---

## 10. 다음 단계

조사 결과 기반으로 다음 WO 생성:

```
WO-ADMIN-CODE-CLEANUP-V1
```

포함 내용:
1. Dead Code 제거 (P0: 미등록 Controller/Route)
2. Legacy 기능 정리 (P1: Frontend ORPHANED pages)
3. API 모듈 통합 (P1: unused API modules)
4. Phase R2 도메인 결정 (P2)

---

*IR-ADMIN-CODEBASE-AUDIT-V1 완료*
*조사 일자: 2026-03-04*
