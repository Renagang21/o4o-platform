# IR-O4O-OVERSIZED-FILE-AUDIT-PHASE2-REBASE-V1

> **Oversized File Audit — Phase 2 Rebase 조사 보고서**
> 기준: `main` 브랜치 (`c951e3acd`)
> 조사일: 2026-03-22

---

## 1. 전체 요약

### 스캔 범위 및 결과

| 구분 | 서비스 | 500+ | 800+ | 1200+ |
|------|--------|-----:|-----:|------:|
| Backend | api-server | 107 | 28 | 5 |
| Frontend | admin-dashboard | 104 | 25 | 5 |
| Frontend | main-site | 12 | 2 | 2 |
| Services | web-neture | 32 | 14 | 2 |
| Services | web-glycopharm | 28 | 9 | 1 |
| Services | web-glucoseview | 8 | 3 | 1 |
| Services | web-k-cosmetics | 10 | 4 | 0 |
| Services | web-kpa-society | 46 | 18 | 4 |
| Services | signage-player-web | 3 | 0 | 0 |
| Packages | 전체 | 48 | 5 | 0 |
| Other | scripts, e2e, page-generator | 4 | 1 | 1 |
| **합계** | | **402** | **109** | **21** |

### 핵심 수치

| 항목 | 수치 |
|------|------|
| 500줄+ 총 파일 수 | 402 |
| 1200줄+ 최우선 후보 | 21 |
| 이미 정비 완료 (DONE) | 10 |
| 즉시 분해 권장 (P0) | 3건 (5파일) |
| 다음 사이클 권장 (P1) | 12건 |
| 새롭게 떠오른 후보 | 서비스 프론트엔드 148파일 (services/) |

---

## 2. DONE 항목 별도 정리

### 완료 상태 검증 (main 기준)

| # | 파일 | 이전 줄 수 | 현재 줄 수 | 상태 | 후속 조치 |
|---|------|----------:|----------:|------|----------|
| 1 | `modules/neture/neture.service.ts` | ~3,000 | **3,021** | **부분 완료** | 21개 sub-service 생성됨. 원본 facade 미축소. **P0으로 재분류** |
| 2 | `authentication.service.ts` | ~800 | **149** | 완전 완료 | 5개 sub-service. 불필요 |
| 3 | `partner.controller.ts` | ~600 | **48** | 완전 완료 | 4개 sub-controller. 불필요 |
| 4 | `unified-store-public.routes.ts` | ~900 | **53** | 완전 완료 | 5개 handler. 불필요 |
| 5 | `cms-content.routes.ts` | ~700 | **69** | 완전 완료 | 6개 sub-file. 불필요 |
| 6 | `mail.service.ts` | ~700 | **529** | 부분 완료 | template/transport 추출. P2 유지 |
| 7 | `ContentBlockLibrary.tsx` | ~1,237 | **363** | 완전 완료 | 7개 sub-component. 불필요 |
| 8 | `TemplateBuilder.tsx` | ~1,038 | **170** | 완전 완료 | 9개 sub-component. 불필요 |
| 9 | `VendorsAdmin.tsx` | 1,078 | **286** | 완전 완료 | 5개 파일. 불필요 |
| 10 | `VendorsCommissionAdmin.tsx` | 1,162 | **212** | 완전 완료 | 6개 파일. 불필요 |

**8건 완전 완료, 2건 부분 완료 (neture.service.ts, mail.service.ts)**

---

## 3. P0 — 즉시 분해 권장

### P0-1. `neture.service.ts` (3,021줄) — 최우선

| 항목 | 내용 |
|------|------|
| 파일 | `apps/api-server/src/modules/neture/neture.service.ts` |
| 줄 수 | 3,021 |
| 유형 | Backend service (facade/orchestrator) |
| 현재 상태 | 21개 sub-service가 이미 생성됨 (총 6,763줄). 그러나 원본 facade가 여전히 3,021줄 유지 |
| 문제 | 플랫폼 전체에서 **유일한 3,000줄+ 파일**. 기존 sub-service로 위임한 메서드들이 facade에 잔존하고 있을 가능성 높음 |
| 분리 방향 | sub-service로 이미 위임된 메서드를 facade에서 제거/축소. 목표: 500줄 이하 thin facade |
| 난이도 | 중 — sub-service가 이미 존재하므로 facade 축소만 수행 |
| WO | 단독 WO 권장 |

### P0-2. Signage 트리플렛 (3,608줄)

| 파일 | 줄 수 |
|------|------:|
| `routes/signage/services/signage.service.ts` | 1,337 |
| `routes/signage/controllers/signage.controller.ts` | 1,231 |
| `routes/signage/repositories/signage.repository.ts` | 1,040 |
| **합계** | **3,608** |

| 항목 | 내용 |
|------|------|
| 유형 | Backend service + controller + repository |
| 문제 | 3파일 모두 1,000줄+. signage 도메인 전체가 monolithic. 이미 extension별 sub-repository(seller 583줄, pharmacy 561줄, cosmetics 551줄)가 있지만 core가 분해되지 않음 |
| 분리 방향 | service: schedule/content/device/monitoring 등 기능별 sub-service 추출. controller: 같은 기능 단위로 sub-controller. repository: query/mutation 분리 |
| 난이도 | 상 — 3파일 동시 분해, signage domain 이해 필요 |
| WO | 묶음 WO 권장 (service + controller 최소). repository는 별도 가능 |

### P0-3. `auth.controller.ts` (1,047줄)

| 항목 | 내용 |
|------|------|
| 파일 | `apps/api-server/src/modules/auth/controllers/auth.controller.ts` |
| 줄 수 | 1,047 |
| 유형 | Backend controller |
| 문제 | 인증 controller가 login/register/logout/token/password/session/OAuth 등 모든 인증 엔드포인트를 포함. auth-login.service.ts 등 sub-service는 있지만 controller는 monolithic |
| 분리 방향 | auth-login.controller / auth-register.controller / auth-session.controller / auth-oauth.controller 등으로 분리 |
| 난이도 | 중 — route 등록 변경 필요하지만 sub-service가 이미 있어 패턴 참조 가능 |
| WO | neture 또는 signage 후 단독 WO |

---

## 4. P1 — 다음 사이클 권장

### Backend P1

| # | 파일 | 줄 수 | 유형 | 비고 |
|---|------|------:|------|------|
| 1 | `main.ts` | 1,621 | App bootstrap | route 등록 + middleware + startup. 분리 가능하나 변경 빈도 낮음 |
| 2 | `auth.middleware.ts` | 1,019 | Middleware | 인증/인가 middleware. 복잡한 조건 분기 |
| 3 | `dashboard-assets.routes.ts` | 1,010 | Routes | dashboard asset 관련 route |
| 4 | `appsCatalog.ts` | 1,034 | Static catalog | 상수/선언 중심. **SKIP 후보** |
| 5 | `connection.ts` | 1,081 | DB config | 설정 중심. **SKIP 후보** |
| 6 | `IncidentEscalationService.ts` | 976 | Service | 인프라 서비스 |
| 7 | `GracefulDegradationService.ts` | 967 | Service | 인프라 서비스 |
| 8 | `AppManager.ts` | 951 | Service | 앱 관리 |
| 9 | `block-registry.service.ts` | 937 | Service | 블록 레지스트리 |
| 10 | `tenant-consolidation.service.ts` | 921 | Service | 테넌트 통합 |
| 11 | `branch-admin-dashboard.controller.ts` | 905 | Controller | KPA 분회 대시보드 |
| 12 | `ForumRecommendationService.ts` | 891 | Service | 포럼 추천 |

### Admin-dashboard P1 (1,000줄+ 페이지/컴포넌트)

| # | 파일 | 줄 수 | 유형 | 비고 |
|---|------|------:|------|------|
| 1 | `dashboard-api.ts` | 1,715 | Type definitions | 순수 타입 파일. **SKIP 후보** |
| 2 | `lms-yaksa/credits/index.tsx` | 1,141 | Page | LMS 학점 관리 |
| 3 | `ShortcodeBlock.tsx` | 1,129 | Editor block | 에디터 숏코드 블록 |
| 4 | `CosmeticsPartnerRoutines.tsx` | 1,070 | Page | 화장품 파트너 루틴 |
| 5 | `FileSelector.tsx` | 1,050 | Shared component | 공유 파일 선택기. **분리 임팩트 높음** |
| 6 | `signageV2.ts` | 977 | API lib | 사이니지 API 클라이언트 |
| 7 | `StandaloneEditor.tsx` | 934 | Page | 독립 에디터 |
| 8 | `PageList.tsx` | 924 | Page | 페이지 목록 |
| 9 | `MenuItemTree.tsx` | 920 | Component | 메뉴 트리 |
| 10 | `WidgetBuilder.tsx` | 909 | Component | 위젯 빌더 |

### Services (프론트엔드) P1 — 1,000줄+ 페이지

| # | 서비스 | 파일 | 줄 수 |
|---|--------|------|------:|
| 1 | web-neture | `partner/PartnerOverviewPage.tsx` | 1,166 |
| 2 | web-glycopharm | `api/pharmacy.ts` | 1,097 |
| 3 | web-kpa-society | `mypage/AnnualReportFormPage.tsx` | 1,093 |
| 4 | web-kpa-society | `pharmacy/PharmacyStorePage.tsx` | 1,075 |
| 5 | web-glucoseview | `PatientsPage.tsx` | 1,054 |
| 6 | web-neture | `forum/ForumPostPage.tsx` | 1,035 |
| 7 | web-glycopharm | `pharmacy/StoreSignagePage.tsx` | 1,028 |
| 8 | web-kpa-society | `DashboardPage.tsx` | 1,004 |

### Packages P1 (900줄+)

| # | 패키지 | 파일 | 줄 수 |
|---|--------|------|------:|
| 1 | membership-yaksa | `MemberService.ts` | 936 |
| 2 | hub-exploration-core | `B2BTableList.tsx` | 902 |

---

## 5. SKIP 후보

아래 파일들은 줄 수는 크지만 **분리 불필요 또는 비효율적**인 것으로 판단:

| 유형 | 파일 예시 | 사유 |
|------|----------|------|
| **타입 정의** | `dashboard-api.ts` (1,715), `types/roles.ts` (539), `ecommerce.ts` (800) | 순수 타입/인터페이스 선언. 로직 없음 |
| **DB 마이그레이션** | `CreateSignageCoreEntities.ts` (695), `CreateForumTables.ts` (580) 등 | 1회성 실행 코드. 분리 의미 없음 |
| **시드 데이터** | `SeedKpaSignageContent.ts` (586), `SeedKpaTestAccounts.ts` (329) 등 | 데이터 정의. 분리 불필요 |
| **앱 카탈로그** | `appsCatalog.ts` (1,034) | 정적 선언 파일 |
| **DB 설정** | `connection.ts` (1,081) | 설정/초기화 코드 |
| **Swagger 스키마** | `swagger/schemas/index.ts` (806) | 자동 생성에 가까움 |
| **DTO 인덱스** | `signage/dto/index.ts` (741), `glucoseview/dto/index.ts` (351) | 타입 모음 |
| **테스트 파일** | `cross-industry.test.ts` (972) 등 | 테스트는 분리 대상 아님 |
| **백업 파일** | `EnhancedBlockWrapper.backup.tsx` (721) | 레거시/백업 |
| **제너레이터** | `web-admin-generator.ts` (1,208) | 도구 코드 |

---

## 6. 서비스별 Oversized 분포

### Backend (api-server) — 107파일 500줄+

| 줄 수 범위 | 파일 수 | 대표 영역 |
|-----------|------:|---------|
| 1200+ | 5 | neture, signage, main, auth |
| 800-1199 | 23 | signage, glycopharm, cosmetics, kpa, operator |
| 500-799 | 79 | 전 도메인 분산 |

**최대 밀집 영역:** signage (service 1,337 + controller 1,231 + repository 1,040 + extensions), glycopharm controllers (6개 500줄+), cosmetics controllers (4개 500줄+)

### Admin-dashboard — 104파일 500줄+

| 줄 수 범위 | 파일 수 | 대표 영역 |
|-----------|------:|---------|
| 1000+ | 5 | lms-yaksa, editor, cosmetics-partner |
| 800-999 | 20 | digital-signage, editor blocks, shortcodes |
| 500-799 | 79 | 전 영역 분산 |

**최대 밀집 영역:** editor/blocks (15개 500줄+), digital-signage/v2 (8개 500줄+), cosmetics-partner (7개 500줄+), dropshipping (8개 500줄+)

### Services (프론트엔드) — 148파일 500줄+

| 서비스 | 500줄+ | 800줄+ | 비고 |
|--------|------:|------:|------|
| web-kpa-society | 46 | 18 | 가장 많음. pharmacy, admin, branch 페이지 집중 |
| web-neture | 32 | 14 | partner, supplier, admin, forum 페이지 |
| web-glycopharm | 28 | 9 | pharmacy, operator, care 페이지 |
| web-k-cosmetics | 10 | 4 | store, operator 페이지 |
| web-glucoseview | 8 | 3 | patients, operator 페이지 |
| signage-player-web | 3 | 0 | 엔진 코드 |

### Packages — 48파일 500줄+

| 줄 수 범위 | 파일 수 | 대표 패키지 |
|-----------|------:|-----------|
| 800+ | 5 | membership-yaksa, hub-exploration, groupbuy, annualfee |
| 500-799 | 43 | forum-core, dropshipping-core, annualfee-yaksa, mail-core 등 |

---

## 7. 1200줄+ 전체 파일 목록

| # | 구분 | 파일 | 줄 수 | 우선순위 |
|---|------|------|------:|---------|
| 1 | backend | `modules/neture/neture.service.ts` | 3,021 | **P0** |
| 2 | admin | `types/dashboard-api.ts` | 1,715 | SKIP (타입) |
| 3 | backend | `main.ts` | 1,621 | P1 |
| 4 | backend | `routes/signage/services/signage.service.ts` | 1,337 | **P0** |
| 5 | main-site | `lib/cms/client.ts` | 1,319 | P1 |
| 6 | main-site | `pages/member/MemberHome.tsx` | 1,242 | P1 |
| 7 | backend | `routes/signage/controllers/signage.controller.ts` | 1,231 | **P0** |
| 8 | scripts | `generators/web-admin-generator.ts` | 1,208 | SKIP (도구) |
| 9 | services | `web-neture/.../PartnerOverviewPage.tsx` | 1,166 | P1 |
| 10 | admin | `pages/lms-yaksa/credits/index.tsx` | 1,141 | P1 |
| 11 | admin | `components/editor/blocks/ShortcodeBlock.tsx` | 1,129 | P1 |
| 12 | services | `web-glycopharm/api/pharmacy.ts` | 1,097 | P1 |
| 13 | services | `web-kpa-society/.../AnnualReportFormPage.tsx` | 1,093 | P1 |
| 14 | backend | `database/connection.ts` | 1,081 | SKIP (설정) |
| 15 | services | `web-kpa-society/.../PharmacyStorePage.tsx` | 1,075 | P1 |
| 16 | admin | `pages/cosmetics-partner/CosmeticsPartnerRoutines.tsx` | 1,070 | P1 |
| 17 | services | `web-glucoseview/pages/PatientsPage.tsx` | 1,054 | P1 |
| 18 | admin | `components/editor/blocks/shared/FileSelector.tsx` | 1,050 | P1 |
| 19 | backend | `modules/auth/controllers/auth.controller.ts` | 1,047 | **P0** |
| 20 | backend | `routes/signage/repositories/signage.repository.ts` | 1,040 | **P0** |
| 21 | backend | `app-manifests/appsCatalog.ts` | 1,034 | SKIP (카탈로그) |

---

## 8. 현재 최우선 후보 (P0) 상세

### 왜 이 3건이 P0인가

| 순위 | 대상 | 근거 |
|------|------|------|
| 1 | `neture.service.ts` | 플랫폼 전체 최대 파일 (3,021줄). Sub-service 21개가 이미 있으므로 **facade 축소만** 하면 됨. 가장 낮은 리스크로 가장 큰 개선 |
| 2 | Signage 트리플렛 | 3파일 합계 3,608줄. 같은 도메인이라 묶음 분해가 효율적. Extension sub-file이 이미 패턴을 보여줌 |
| 3 | `auth.controller.ts` | 핵심 인증 경로. auth sub-service가 이미 5개 있으므로 controller만 분리하면 패턴 완성 |

### 분리 시작점

| P0 | 시작점 | 안전 확인 |
|----|--------|----------|
| neture facade | 이미 생성된 sub-service 메서드와 facade 메서드를 1:1 대조. 중복 메서드 facade에서 제거 후 re-export | sub-service import 정합성 확인. 기존 호출자가 `netureService.xxx()` 사용 시 re-export 유지 |
| signage split | service → schedule/content/device 등 기능 단위. controller는 service 분리를 따라감 | signage extension들과의 import 관계 확인 필요 |
| auth controller | auth-login.controller / auth-register.controller 등 기능별. 기존 auth sub-service와 1:1 대응 | route 등록 변경. auth.middleware.ts와의 관계 확인 |

### 단독 WO vs 묶음 WO

| 대상 | 권장 |
|------|------|
| neture facade 축소 | **단독 WO** — 독립적, sub-service 활용하므로 빠르게 완료 가능 |
| signage 트리플렛 | **묶음 WO** — service + controller 최소 묶음. repository는 별도 가능 |
| auth controller | **단독 WO** — signage 또는 neture 후 진행 |

### 기존 정비 흐름과의 연속성

| 단계 | 완료 |
|------|------|
| Phase 1 | neture.service.ts sub-service 추출 → authentication.service.ts split → partner.controller.ts split |
| Phase 1 | unified-store-public split → cms-content split → mail.service.ts partial |
| Phase 2 | ContentBlockLibrary split → TemplateBuilder split → VendorsAdmin split → VendorsCommission split |
| **Phase 3 (다음)** | **neture.service.ts facade 축소 → signage 트리플렛 → auth.controller.ts** |

neture facade 축소는 Phase 1에서 만든 sub-service를 활용하므로 **Phase 1 완결**의 성격.
signage와 auth는 새로운 분해이므로 **Phase 3 시작**에 해당.

---

## 9. 다음 단계 제안

### 권장 실행 순서

| 순서 | 대상 | 예상 WO명 | 성격 |
|------|------|----------|------|
| **1차** | `neture.service.ts` facade 축소 | WO-O4O-NETURE-FACADE-HOLLOWOUT-V1 | Phase 1 완결. 리스크 가장 낮음 |
| **2차** | signage service + controller 분해 | WO-O4O-SIGNAGE-SPLIT-V1 | Phase 3 시작. 가장 큰 임팩트 |
| **3차** | auth.controller.ts 분해 | WO-O4O-AUTH-CONTROLLER-SPLIT-V1 | auth 패턴 완성 |

### 1차 대상: neture facade 축소

- Sub-service 21개가 이미 존재 (총 6,763줄)
- Facade에서 이미 위임된 메서드 body를 제거하고 sub-service 호출로 교체
- 목표: 3,021줄 → 500줄 이하 (thin facade)
- 예상 작업량: 조사 1회 + 실행 1회

### 묶음 처리 가능 조합

| 조합 | 사유 |
|------|------|
| neture facade + neture 잔존 큰 sub-service (supplier 726줄) 점검 | 같은 도메인, 같은 문맥 |
| signage service + signage controller | 같은 도메인, 분리 단위 동일 |
| auth controller + auth middleware (1,019줄) | 같은 인증 도메인 |

### 조사 → 수정 → 조사 흐름

```
[현재] IR-OVERSIZED-PHASE2-REBASE (조사)
  ↓
[다음] WO-NETURE-FACADE-HOLLOWOUT (수정) → IR-POST-CHECK (조사)
  ↓
[이후] WO-SIGNAGE-SPLIT (수정) → IR-POST-CHECK (조사)
  ↓
[이후] WO-AUTH-CONTROLLER-SPLIT (수정) → IR-POST-CHECK (조사)
  ↓
[이후] IR-OVERSIZED-PHASE3-REBASE (조사) — admin-dashboard P1 재정렬
```

---

## 10. 주요 관찰사항

### O1. services/ 프론트엔드 대규모 발견

`services/` 디렉토리에 **148개** 파일이 500줄+ (이전 audit에서는 스캔 대상이 아니었을 수 있음).
web-kpa-society가 46개로 가장 많음. 대부분 자기 완결적 페이지 컴포넌트이며, backend보다 분리 우선순위는 낮지만 향후 Phase 3-4에서 관리 필요.

### O2. admin-dashboard 에디터 영역 집중

`components/editor/blocks/` 디렉토리에 500줄+ 파일이 15개 이상 밀집.
에디터 블록들은 독립적이므로 개별 분리보다는 공통 패턴 (shared component 재사용) 정비가 더 효과적일 수 있음.

### O3. 복제 패턴 발견 (services/ 간)

`operator/UserDetailPage.tsx` (782-786줄), `operator/UsersPage.tsx` (588-595줄), `operator/RoleManagementPage.tsx` (502-507줄) 등이 web-glycopharm/web-glucoseview/web-k-cosmetics/web-kpa-society에 거의 동일한 크기로 존재. 공통화 가능성 있으나 별도 조사 필요.

### O4. neture sub-service 중 대형 파일 존재

neture facade 축소와 별개로, sub-service 중 `supplier.service.ts` (726줄), `offer.service.ts` (623줄), `partner.service.ts` (599줄)이 크지만 이들은 단일 도메인 서비스이므로 현재는 수용 가능. facade 축소 후 재평가.

---

*Generated: 2026-03-22*
*Investigator: Claude Code*
*Branch: main*
*Commit: c951e3acd*
