# IR-O4O-CODEBASE-SIZE-AUDIT-V1 — 조사 결과 보고서

> **조사일:** 2026-03-10
> **조사 범위:** `apps/api-server/src` + `services/*` + `packages/*`
> **대상 파일:** `.ts`, `.tsx`, `.js` (node_modules, dist, .next 제외)

---

## 1. 전체 통계 요약

| 영역 | 파일 수 | 비고 |
|------|---------|------|
| Backend (`apps/api-server/src`) | 1,394 | API 서버 |
| Frontend (`services/*`) | 1,087 | 6개 웹 서비스 |
| Packages (`packages/*`) | 1,891 | 공유 패키지 |
| **전체** | **4,372** | |

### 크기별 파일 분포

| 기준 | 파일 수 | 의미 |
|------|---------|------|
| 2000+ lines | **3** | 위험 |
| 1000-1999 lines | **27** | 정비 필요 |
| 800-999 lines | **52** | 정비 후보 |
| 500-799 lines | **236** | 관리 필요 |
| **500+ lines 합계** | **318** | 전체의 7.3% |

---

## 2. Top 30 Largest Files

| Rank | File | Lines | Type | Area |
|------|------|------:|------|------|
| 1 | `modules/neture/neture.routes.ts` | 5,079 | routes | Backend |
| 2 | `routes/kpa/kpa.routes.ts` | 2,860 | routes | Backend |
| 3 | `modules/neture/neture.service.ts` | 2,759 | service | Backend |
| 4 | `controllers/forum/ForumController.ts` | 1,468 | controller | Backend |
| 5 | `main.ts` | 1,437 | entry-point | Backend |
| 6 | `services/DatabaseOptimizationService.ts` | 1,390 | service | Backend |
| 7 | `routes/signage/services/signage.service.ts` | 1,337 | service | Backend |
| 8 | `services/authentication.service.ts` | 1,308 | service | Backend |
| 9 | `services/service-snapshot.service.ts` | 1,299 | service | Backend |
| 10 | `services/DeploymentMonitoringService.ts` | 1,257 | service | Backend |
| 11 | `routes/signage/controllers/signage.controller.ts` | 1,231 | controller | Backend |
| 12 | `services/extension-portability.service.ts` | 1,225 | service | Backend |
| 13 | `services/OperationsMonitoringService.ts` | 1,188 | service | Backend |
| 14 | `pages/partner/PartnerOverviewPage.tsx` | 1,166 | page | Frontend (neture) |
| 15 | `services/SelfHealingService.ts` | 1,162 | service | Backend |
| 16 | `services/AutoScalingService.ts` | 1,104 | service | Backend |
| 17 | `services/AutoRecoveryService.ts` | 1,093 | service | Backend |
| 18 | `pages/mypage/AnnualReportFormPage.tsx` | 1,092 | page | Frontend (kpa) |
| 19 | `pages/pharmacy/PharmacyStorePage.tsx` | 1,075 | page | Frontend (kpa) |
| 20 | `routes/cms-content/cms-content.routes.ts` | 1,057 | routes | Backend |
| 21 | `pages/PatientsPage.tsx` | 1,050 | page | Frontend (glucoseview) |
| 22 | `routes/platform/unified-store-public.routes.ts` | 1,044 | routes | Backend |
| 23 | `routes/signage/repositories/signage.repository.ts` | 1,040 | repository | Backend |
| 24 | `app-manifests/appsCatalog.ts` | 1,034 | config | Backend |
| 25 | `pages/forum/ForumPostPage.tsx` | 1,034 | page | Frontend (neture) |
| 26 | `services/CDNOptimizationService.ts` | 1,019 | service | Backend |
| 27 | `common/middleware/auth.middleware.ts` | 1,011 | middleware | Backend |
| 28 | `routes/dashboard/dashboard-assets.routes.ts` | 1,010 | routes | Backend |
| 29 | `database/connection.ts` | 1,005 | config | Backend |
| 30 | `pages/DashboardPage.tsx` | 1,004 | page | Frontend (kpa) |

---

## 3. 위험 파일 상세 분석 (2000+ lines)

### 3.1 neture.routes.ts — 5,079 lines (CRITICAL)

**역할:** Neture 도메인 전체 라우트 파일

**내부 구조:**
- 엔드포인트 134개 + 서브 라우터 3개
- 인라인 `AppDataSource.query()` 호출 **82회**
- 인라인 비즈니스 로직이 라우트 핸들러에 직접 포함
- 50개 섹션으로 나뉘지만, 대부분 서비스 레이어 없이 직접 SQL 실행

**핵심 문제:**
1. **Routes + Business Logic 혼합** — 주문 생성(90라인 인라인), 재고 관리, 배송 상태 머신, 정산 로직이 라우트 핸들러 안에 존재
2. **수동 트랜잭션** — `BEGIN`/`COMMIT`/`ROLLBACK` 직접 관리 (TypeORM transaction 미사용)
3. **Cross-domain 쿼리** — `cms_contents`, `organizations`, `users` 테이블 직접 JOIN
4. **SQL 중복** — Order item enrichment 패턴이 2곳에서 복제

**분리 제안 (15개 컨트롤러):**

| Priority | 추출 모듈 | 예상 라인 | 사유 |
|----------|----------|----------|------|
| P0 | `supplier-order.controller` | ~260 | 상태 머신 + 소유권 검증 + 페이지네이션 |
| P0 | `shipment.controller` | ~170 | 상태 전이 + 자동 주문 상태 변경 |
| P0 | `seller-order.controller` | ~220 | Referral 어트리뷰션 + 커미션 스냅샷 |
| P0 | `inventory.controller` | ~140 | Dynamic SQL builder |
| P1 | `partner-dashboard.controller` | ~475 | 대시보드 아이템 + 컨텐츠 링크 |
| P1 | `supplier-commission-policy.controller` | ~180 | 커미션 정책 CRUD |
| P1 | `partner-affiliate.controller` | ~160 | Referral 링크 생성 + 충돌 재시도 |
| P1 | `admin-partner-monitoring.controller` | ~425 | 수동 트랜잭션, 정산 생성/지급 |

---

### 3.2 kpa.routes.ts — 2,860 lines (CRITICAL)

**역할:** KPA Society 도메인 전체 라우트 파일

**내부 구조:**
- 인라인 엔드포인트 101개 + 위임 라우트 42개
- 인라인 `dataSource.query()` 호출 **72회**
- `queryRunner` 트랜잭션 블록 **9개**
- 인라인 헬퍼 함수 5개, 유틸리티 함수 2개

**핵심 문제:**
1. **Dual-table 쿼리 중복** — `kpa_approval_requests` + `kpa_organization_join_requests` 이중 테이블 패턴이 ~20개 핸들러에서 복제
2. **Routes + 승인 워크플로우 혼합** — 분회원 승인, 강사 자격, 과정 요청, 포럼 카테고리 승인 로직이 라우트에 직접 존재
3. **Groupbuy 주문 생성** — 115라인의 완전한 체크아웃 플로우가 라우트 핸들러 안에 존재

**분리 제안:**

| Priority | 추출 모듈 | 예상 절감 | 사유 |
|----------|----------|----------|------|
| P0 | `InstructorQualificationService` + controller | ~380 lines | Q1-Q7 자격 CRUD |
| P0 | `CourseRequestService` + controller | ~500 lines | C1-C11 과정 요청 워크플로우 |
| P0 | `BranchMemberApprovalService` + controller | ~200 lines | 승인/거절 + 이중 테이블 |
| P1 | `ForumCategoryRequestService` + controller | ~260 lines | F1-F8 카테고리 요청 |
| P1 | `GroupbuyService` + controller | ~220 lines | 주문 생성 로직 |
| P3 | `ApprovalRequestRepository` (공유) | N/A | 이중 테이블 패턴 통합 |

**예상 절감:** ~1,980 lines (69%)

---

### 3.3 neture.service.ts — 2,759 lines (HIGH)

**역할:** Neture 도메인 "God Service" — 46개 공개 메서드

**내부 구조:**
- Lazy repository getter 12개
- 공개 비즈니스 메서드 46개
- 20개 섹션으로 구분
- **8개 이상의 서로 다른 도메인 관심사** 혼합

**핵심 문제:**
1. **God Service 안티패턴** — 공급자 생명주기, 제품 카탈로그, 대시보드, 파트너십, 계약 관리가 하나의 클래스에 공존
2. **SQL 중복** — `product_approvals JOIN supplier_product_offers` 패턴이 **8곳**에서 반복
3. **Approval cascade 중복** — 승인 취소 + 리스팅 비활성화 로직이 여러 메서드에서 복제

**분리 제안 (7개 서비스):**

| 신규 서비스 | 예상 라인 | 핵심 메서드 |
|------------|----------|------------|
| `SupplierLifecycleService` | ~500 | register, approve, reject, profile |
| `ProductCatalogService` | ~650 | offer CRUD, Master, Category, Brand, Image |
| `DashboardService` | ~500 | 4개 대시보드 + KPI |
| `PartnerContractService` | ~280 | 계약 CRUD + 커미션 |
| `SupplierStorefrontService` | ~230 | 공급자 공개 목록 + 신뢰 시그널 |
| `PartnershipService` | ~200 | 파트너십 요청 CRUD |
| `ProductApprovalService` | ~200 | 승인/거절 + cascade |

---

## 4. Dead Code 발견 (즉시 삭제 가능)

분석 중 **사용되지 않는 것이 거의 확실한 대형 파일**이 발견되었습니다.

| File | Lines | 근거 |
|------|------:|------|
| `service-snapshot.service.ts` | 1,299 | NestJS 데코레이터(Express 서버에서 무효), in-memory Map, `simulateDelay()`, 0개 임포터 |
| `extension-portability.service.ts` | 1,225 | NestJS 데코레이터, in-memory Map, 하드코딩 샘플 데이터, 0개 임포터 |
| `DeploymentMonitoringService.ts` | 1,257 | Cloud Run에서 무의미한 로컬 서버 패턴 (git revert, service restart), 미호출 |
| `DatabaseOptimizationService.ts` | 1,390 | main.ts에서 미임포트, PerformanceMonitoringInitializer를 통해서만 연결 |
| `OperationsMonitoringService.ts` | 1,188 | `os.cpus()`, `df -h` 등 Cloud Run에서 무의미한 패턴 |
| `SelfHealingService.ts` | 1,162 | 위 서비스들과 동일 그룹 |
| `AutoScalingService.ts` | 1,104 | GCP 관리 서비스 중복 |
| `AutoRecoveryService.ts` | 1,093 | 위 서비스들의 소비자, 함께 dead |
| `CDNOptimizationService.ts` | 1,019 | 위 그룹과 동일 패턴 |
| **합계** | **~10,737** | |

**공통 특징:**
- "Phase 11" 태스크 헤더 (AI 생성 보일러플레이트)
- NestJS `@Injectable()` 데코레이터 (Express 서버에서 무효)
- In-memory `Map` 저장 + 하드코딩 샘플 데이터
- `simulateDelay()` 메서드
- Cloud Run 환경에서 무의미한 로컬 서버 모니터링 패턴

> **이 9개 파일을 삭제하면 즉시 ~10,700 라인이 제거됩니다.**

---

## 5. Frontend 대형 파일 분석

### 1000+ lines 프론트엔드 페이지 (6개)

| File | Lines | useState | API 호출 | 주요 부풀림 원인 |
|------|------:|:--------:|:--------:|----------------|
| PartnerOverviewPage.tsx | 1,166 | 14 | 9개 orchestration | 복잡한 API 오케스트레이션 + 대형 JSX |
| AnnualReportFormPage.tsx | 1,092 | 2 | 0 | 대형 멀티섹션 폼 JSX + 타입 정의 |
| PharmacyStorePage.tsx | 1,075 | 8 | 2 (추출됨) | **Styles 객체 553줄 (52%)** |
| PatientsPage.tsx | 1,050 | 15 | 3 직접 호출 | 3개 인라인 모달 + 83% JSX |
| ForumPostPage.tsx | 1,034 | 16 | 7 orchestration | 7개 내부 정의(함수/컴포넌트) + styles 43% |
| DashboardPage.tsx | 1,004 | 0 | 0 | **Styles 객체 614줄 (61%)**, 목 데이터 |

**공통 패턴:**
1. **Inline CSS-in-JS Styles** — PharmacyStorePage (52%), DashboardPage (61%), ForumPostPage (43%) — 스타일 객체가 파일의 절반 이상
2. **API 오케스트레이션** — PartnerOverviewPage, ForumPostPage에서 9-16개 useState + 7-9개 API 호출이 컴포넌트 내부에 인라인
3. **모달 인라인** — PatientsPage에서 3개 모달(등록, 수정, 임포트)이 하나의 파일에 존재

---

## 6. Backend 유형별 500+ lines 파일 요약

| Type | 500+ files | 800+ files | 1000+ files | 비고 |
|------|:----------:|:----------:|:-----------:|------|
| routes | 33 | 9 | 5 | **가장 심각** — 비즈니스 로직 혼합 |
| service | 30 | 14 | 11 | 9개는 dead code |
| controller | 10 | 5 | 2 | ForumController fat controller |
| middleware | 2 | 0 | 1 | auth.middleware.ts |
| repository | 3 | 0 | 1 | signage.repository.ts |
| entity | 2 | 0 | 0 | |
| other (config/util/migration) | 14 | 3 | 4 | main.ts, connection.ts 등 |

---

## 7. Refactor Target List (정비 우선순위)

### Tier 1 — 즉시 정비 (HIGH Priority)

| # | File | Type | Lines | Action | 예상 효과 |
|---|------|------|------:|--------|----------|
| 1 | `neture.routes.ts` | routes | 5,079 | 15개 컨트롤러 분리 + 서비스 레이어 추출 | ~4,000줄 → ~500줄 (라우트 와이어링만) |
| 2 | `kpa.routes.ts` | routes | 2,860 | 5개 서비스/컨트롤러 분리 | ~1,980줄 절감 |
| 3 | `neture.service.ts` | service | 2,759 | 7개 도메인 서비스 분리 | God Service 해소 |

### Tier 2 — Dead Code 삭제 (QUICK WIN)

| # | File | Lines | Action |
|---|------|------:|--------|
| 4 | `service-snapshot.service.ts` | 1,299 | 삭제 |
| 5 | `extension-portability.service.ts` | 1,225 | 삭제 |
| 6 | `DeploymentMonitoringService.ts` | 1,257 | 삭제 |
| 7 | `DatabaseOptimizationService.ts` | 1,390 | 삭제 |
| 8 | `OperationsMonitoringService.ts` | 1,188 | 삭제 |
| 9 | `SelfHealingService.ts` | 1,162 | 삭제 |
| 10 | `AutoScalingService.ts` | 1,104 | 삭제 |
| 11 | `AutoRecoveryService.ts` | 1,093 | 삭제 |
| 12 | `CDNOptimizationService.ts` | 1,019 | 삭제 |
| | **소계** | **~10,737** | |

### Tier 3 — 구조 개선 (MEDIUM Priority)

| # | File | Type | Lines | Action |
|---|------|------|------:|--------|
| 13 | `ForumController.ts` | controller | 1,468 | 서비스 레이어 분리 (fat controller → thin controller) |
| 14 | `signage.service.ts` | service | 1,337 | 유지 (구조 양호, 엔드포인트가 많아서 큰 것) |
| 15 | `authentication.service.ts` | service | 1,308 | 유지 (의도적 SSOT, 분리 시 위험) |
| 16 | `signage.controller.ts` | controller | 1,231 | 유지 (thin controller, 구조 양호) |
| 17 | `main.ts` | entry-point | 1,437 | 라우트 등록부 분리 가능 |

### Tier 4 — Frontend 정비 (LOW Priority)

| # | File | Lines | Action |
|---|------|------:|--------|
| 18 | `PartnerOverviewPage.tsx` | 1,166 | API 오케스트레이션 커스텀 훅 추출 |
| 19 | `ForumPostPage.tsx` | 1,034 | 7개 내부 정의 별도 파일로 추출 |
| 20 | `PatientsPage.tsx` | 1,050 | 3개 모달 컴포넌트 분리 |
| 21 | 각 서비스 대형 페이지 | 800+ | CSS-in-JS styles 별도 파일 추출 검토 |

---

## 8. 구조 문제 요약

### 문제 1: Routes + Business Logic 혼합 (가장 심각)
```
neture.routes.ts: 82회 인라인 SQL, 134개 엔드포인트
kpa.routes.ts: 72회 인라인 SQL, 101개 인라인 엔드포인트
→ 합계 154회 인라인 SQL이 라우트 핸들러에 존재
```

### 문제 2: Dead Infrastructure Code (~10,700 lines)
```
9개 AI 생성 인프라 서비스
Cloud Run에서 무의미한 로컬 서버 모니터링 패턴
NestJS 데코레이터가 Express 서버에서 사용됨
in-memory Map + simulateDelay() = 실제 기능 없음
```

### 문제 3: God Service 패턴
```
neture.service.ts: 46개 메서드, 8개 도메인 관심사, 1개 클래스
→ 수정 시 전체 도메인에 영향, 테스트 불가, LLM 분석 정확도 저하
```

### 문제 4: SQL 중복
```
product_approvals JOIN 패턴: 8곳에서 복제
Dual-table 쿼리 패턴 (KPA): ~20개 핸들러에서 복제
Order item enrichment: 2곳에서 거의 동일한 코드
```

### 문제 5: Frontend Inline Styles 비대
```
DashboardPage: styles 61%
PharmacyStorePage: styles 52%
ForumPostPage: styles 43%
→ 실제 로직 대비 스타일 코드가 과도하게 큼
```

---

## 9. 다음 단계 제안

### Phase 1: Quick Win (Dead Code 삭제)
```
대상: Tier 2의 9개 파일
효과: 즉시 ~10,700 라인 제거
위험: 매우 낮음 (사용되지 않는 코드)
작업: 임포트 참조 확인 후 삭제
```

### Phase 2: 핵심 라우트 파일 분리
```
대상: neture.routes.ts, kpa.routes.ts
효과: ~6,000 라인 → 적절한 서비스/컨트롤러 구조
원칙: 기능 변경 금지, 구조 분리만 수행
```

### Phase 3: God Service 해체
```
대상: neture.service.ts
효과: 7개 도메인별 서비스로 분리
원칙: 기존 API 계약 유지
```

### Phase 4: Re-Audit
```
Phase 1-3 완료 후 재조사
반복: 통상 2-3회 반복으로 대부분 해결
```

---

## 10. 이 문서에서 수행하지 않은 것

```
❌ 코드 수정
❌ 파일 분리
❌ 구조 변경
❌ API 변경
❌ Dead code 삭제 실행
```

모든 변경은 별도 WO로 진행합니다.

---

*Generated: 2026-03-10*
*Status: Investigation Complete*
*Next: WO-O4O-CODEBASE-REFACTOR-PHASE1*
