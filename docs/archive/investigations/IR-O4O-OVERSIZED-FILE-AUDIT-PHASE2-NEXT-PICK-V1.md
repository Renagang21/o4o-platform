# IR-O4O-OVERSIZED-FILE-AUDIT-PHASE2-NEXT-PICK-V1

> **조사 전용** — 코드 수정 없음
> 기준: `main` 브랜치 (2026-03-23)
> 목적: 다음 oversized 정비 WO 1~3순위 선정

---

## 1. 다음 후보 요약 (Top 5)

| 순위 | 파일 경로 | 줄 수 | 유형 | 추천 이유 | 권장 작업 방식 |
|:----:|-----------|------:|------|-----------|:-------------:|
| **1** | `apps/api-server/src/main.ts` | **1,621** | Bootstrap | 전체 코드베이스 최대 파일. route 등록 ~800줄 분리 가능 | 단독 WO |
| **2** | `apps/api-server/src/common/middleware/auth.middleware.ts` | **1,019** | Middleware | 13개 auth 함수 혼합. auth split 연속성 | 단독 WO |
| **3** | `apps/api-server/src/routes/dashboard/dashboard-assets.routes.ts` | **1,010** | Route/Controller | 10개 inline 핸들러. 전형적 controller 분리 대상 | 단독 WO |
| **4** | `apps/api-server/src/routes/kpa/controllers/branch-admin-dashboard.controller.ts` | **905** | Controller | 19개 route 핸들러 (3개 도메인 혼합: 공지/자료/회원) | 묶음 WO (KPA 컨트롤러 정비) |
| **5** | `apps/api-server/src/services/IncidentEscalationService.ts` | **976** | Service | interface/enum 정의가 ~40%. 타입 분리 가능 | 묶음 WO (인프라 서비스 타입 분리) |

### 차점 후보 (5~10위)

| 파일 | 줄 수 | 비고 |
|------|------:|------|
| `GracefulDegradationService.ts` | 967 | IncidentEscalation과 묶음 가능 |
| `AppManager.ts` | 951 | 단일 클래스, lifecycle 단계별 분리 가능 |
| `block-registry.service.ts` | 937 | 8개 섹션, 레지스트리 패턴 |
| `tenant-consolidation.service.ts` | 921 | 인터페이스 ~35%, merge/split 분리 |
| `ForumRecommendationService.ts` | 891 | 추천 전략별 분리 가능 |

---

## 2. 우선순위 상세 (Top 3)

### 1순위: `main.ts` (1,621줄) — Route Registry 추출

**왜 지금 손대는 것이 좋은가:**
- 전체 코드베이스 단일 최대 파일 (1,621줄)
- 이미 완료된 route split 작업들(cms-content, unified-store-public, signage 등)이 모두 이 파일에 등록됨
- 새 도메인/라우트 추가 시마다 이 파일이 커지는 구조적 문제
- 모든 개발자가 main.ts를 건드려야 하므로 충돌 빈도 높음

**파일 구조 분석:**
```
lines   1-200   : imports (~200줄)
lines 200-500   : middleware 설정 (helmet, cors, session, passport 등 ~300줄)
lines 500-1400  : route 등록 (~900줄, 140+ app.use() 호출)
lines 1400-1621 : server 시작, graceful shutdown (~220줄)
```

**예상 분해 방향:**
1. `route-registry.ts` 추출 — 모든 `app.use()` route 등록을 한 파일로 이동
2. `middleware-setup.ts` 추출 — helmet, cors, session, passport 설정
3. `main.ts`는 bootstrap orchestrator로 ~200줄 이하로 축소

**기존 흐름 연속성:** route split 작업의 자연스러운 마무리. 개별 route 파일은 이미 분리 완료, 등록부만 남음.

**리스크:** 낮음. 함수 이동만으로 완료 가능. 런타임 동작 변경 없음.

---

### 2순위: `auth.middleware.ts` (1,019줄) — Auth Strategy 그룹화

**왜 지금 손대는 것이 좋은가:**
- auth controller split, auth service split 완료 후 자연스러운 다음 단계
- 13개 미들웨어 함수가 한 파일에 혼재 (platform/service/guest/permission 4개 카테고리)
- 72개 importer가 이미 이 파일을 re-export point로 사용 중

**현재 함수 목록 (13개):**
```
Platform auth:  requireAuth, requireAdmin, requireRole, optionalAuth
Permission:     requirePermission, requireAnyPermission
Service auth:   requirePlatformUser, requireServiceUser, optionalServiceAuth
Guest auth:     requireGuestUser, requireGuestOrServiceUser, optionalGuestOrServiceAuth
```

**예상 분해 방향:**
1. `auth-platform.middleware.ts` — requireAuth, requireAdmin, requireRole, optionalAuth
2. `auth-permission.middleware.ts` — requirePermission, requireAnyPermission
3. `auth-service.middleware.ts` — requirePlatformUser, requireServiceUser, optionalServiceAuth
4. `auth-guest.middleware.ts` — requireGuestUser, requireGuestOrServiceUser, optionalGuestOrServiceAuth
5. `auth.middleware.ts` — barrel re-export (72 importers 호환 유지)

**기존 흐름 연속성:** auth split 3부작(service → controller → middleware)의 완결편.

**리스크:** 중간. 72개 importer 호환을 위해 barrel re-export 필수. 공통 helper(`extractToken`) 위치 결정 필요.

---

### 3순위: `dashboard-assets.routes.ts` (1,010줄) — Handler 추출

**왜 지금 손대는 것이 좋은가:**
- 1,000줄 이상인데 아직 미처리
- 10개 inline handler가 한 factory 함수에 밀집
- 이미 완료된 route split 패턴(cms-content, signage 등)과 동일한 방식으로 처리 가능

**현재 route 목록 (10개):**
```
POST   /copy              — 에셋 복사
GET    /                  — 에셋 목록
GET    /copied-source-ids — 복사된 원본 ID 조회
GET    /kpi               — KPI 통계
GET    /supplier-signal   — 공급자 시그널
GET    /seller-signal     — 셀러 시그널
PATCH  /:id               — 에셋 수정
POST   /:id/publish       — 게시
POST   /:id/archive       — 보관
DELETE /:id               — 삭제
```

**예상 분해 방향:**
1. `dashboard-assets-query.handler.ts` — 목록, KPI, signal 조회 (4개)
2. `dashboard-assets-copy.handler.ts` — 복사, 복사 ID 조회 (2개)
3. `dashboard-assets-mutation.handler.ts` — 수정, 게시, 보관, 삭제 (4개)
4. `dashboard-assets.routes.ts` — 라우터 + handler import만 (~100줄)

**기존 흐름 연속성:** cms-content, signage route split과 동일 패턴.

**리스크:** 낮음. 단일 factory 함수에서 handler 추출만으로 완료.

---

## 3. 제외 항목 (이미 완료)

| 파일 | 완료 작업 | 비고 |
|------|-----------|------|
| `neture.service.ts` | Hollowout 완료 | 현재 792줄 (기존 대비 대폭 축소) |
| `authentication.service.ts` | Split 완료 | auth-login, auth-token 등으로 분리 |
| `auth.controller.ts` | Split 완료 | 4개 domain controller로 분리 |
| `partner.controller.ts` | Split 완료 | signage split의 일부 |
| signage routes | Split 완료 | extensions 구조로 분리 |
| `unified-store-public.routes.ts` | Split 완료 | |
| `cms-content.routes.ts` | Split 완료 | slot handler 등으로 분리 |
| `mail.service.ts` | Split 완료 | |
| `ContentBlockLibrary.tsx` | Split 완료 | |
| `TemplateBuilder.tsx` | Split 완료 | |
| `VendorsAdmin.tsx` | Split 완료 | |
| `VendorsCommissionAdmin.tsx` | Split 완료 | |

---

## 4. 부가 관찰: Frontend 크로스 서비스 중복 패턴

> 이 항목은 oversized 정비와 별개의 구조적 문제로, 별도 WO로 다뤄야 함

| 페이지 | 출현 서비스 | 줄 수 범위 |
|--------|------------|:----------:|
| `UserDetailPage.tsx` | neture, glycopharm, glucoseview, k-cosmetics, kpa-society (5곳) | 765~786 |
| `AiReportPage.tsx` | glycopharm, glucoseview, k-cosmetics (3곳) | 940~965 |
| `RoleManagementPage.tsx` | neture, glycopharm, glucoseview, k-cosmetics, kpa-society (5곳) | 502~507 |
| `UsersPage.tsx` | glycopharm, glucoseview, k-cosmetics, kpa-society (4곳) | 588~595 |
| `StoreChannelsPage.tsx` | glycopharm, k-cosmetics, kpa-society (3곳) | 872~910 |
| `StoreLocalProductsPage.tsx` | glycopharm, k-cosmetics, kpa-society (3곳) | 646 |

**5개 서비스에 거의 동일한 코드가 복사**되어 있음 (줄 수 편차 ~20줄 이내).
이는 shared component/page 추출 대상이지만, oversized split과는 성격이 다르므로 별도 검토가 필요함.

---

## 5. 전체 통계 요약

### Backend (api-server)
| 구간 | 파일 수 |
|------|--------:|
| 1,000줄 이상 | 4 |
| 800~999줄 | 22 |
| 500~799줄 | 84 |
| **합계** | **110** |

### Frontend (전체 서비스)
| 구간 | 파일 수 |
|------|--------:|
| 1,000줄 이상 | 10 |
| 800~999줄 | 21 |
| 500~799줄 | 173 |
| **합계** | **204** |

### Packages
| 구간 | 파일 수 |
|------|--------:|
| 800줄 이상 | 8 |
| 500~799줄 | 39 |
| **합계** | **47** |

---

## 6. 최종 제안

| 순위 | WO 대상 | 작업 방식 | 예상 효과 |
|:----:|---------|:---------:|-----------|
| **1순위** | `main.ts` route registry 추출 | 단독 WO | 1,621줄 → ~200줄 (bootstrap only) |
| **2순위** | `auth.middleware.ts` strategy 분리 | 단독 WO | 1,019줄 → ~50줄 (barrel re-export) |
| **3순위** | `dashboard-assets.routes.ts` handler 추출 | 단독 WO | 1,010줄 → ~100줄 (router only) |

**권장 순서:** 1순위 → 2순위 → 3순위 (각각 독립적이므로 순서 변경 가능)

1순위 `main.ts`를 먼저 처리하면:
- 코드베이스 최대 파일 해소
- 이후 route 추가 작업 시 main.ts 충돌 제거
- route split 정비 흐름의 자연스러운 마무리

---

*조사 완료: 2026-03-23*
*다음 단계: ChatGPT 점검 후 WO 1순위 착수*
