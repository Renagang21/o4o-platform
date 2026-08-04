# WO-O4O-ADMIN-DASHBOARD-OPERATION-SECURITY-BOUNDARY-ROLE-ACCESS-V1 — CHECK

**판정: `PASS_WITH_POLICY_FOLLOWUP`**

작업일 2026-08-04 · 대상 `apps/admin-dashboard` + 소비 backend · 운영 DB 접근 0 · 배포 0

이 작업은 새 권한을 구현하지 않는다. **기능별 정상 운영 주체와 보안 경계를 확정**하고, 8번(운영 계정 role census)·9번(역할별 브라우저 smoke)에서 쓸 검증표를 만든다.

---

## 0. 이번 조사의 핵심 결론 (먼저 읽을 것)

**관리자 대시보드의 보안 경계 문제 대부분은 "권한이 잘못 열려 있다" 가 아니라 "화면이 부르는 API 가 존재하지 않는다" 이다.**

정적 분석으로 관리자 대시보드의 API 호출 415건을 실제 마운트와 대조한 결과, **182건(44%)이 백엔드에 대응 마운트가 없다.** 배포된 운영 API(`https://api.neture.co.kr`)에 비인증 요청으로 실측해 이 결과를 교차 확인했다(§13).

| 경로 | 실측 | 의미 |
|------|:----:|------|
| `/api/v1/users` | 401 | 존재 + guard 동작 |
| `/api/v1/membership/members` | 401 | 존재 + guard 동작 |
| `/api/v1/membership/audit-logs` | 401 | 존재 + guard 동작 |
| `/api/v1/posts` | 404 | **마운트 없음** |
| `/api/v1/annualfee/policies` | 404 | **마운트 없음** |
| `/api/v1/partnerops/partners` | 404 | **마운트 없음** |
| `/api/v1/presets` · `/vendors` · `/orders` · `/categories` · `/tags` · `/media` · `/menus` · `/roles` · `/taxonomies` · `/templates` · `/widgets` · `/inventory` · `/monitoring/*` · `/reporting/*` · `/storefront/*` · `/template-parts` · `/ds/*` · `/sellerops/*` · `/pharmacy` | 모두 404 | **마운트 없음** |

즉 **G(DEAD_OR_UNIMPLEMENTED)가 이번 모집단에서 가장 큰 분류**다. 이 화면들은 권한을 넓혀도 좁혀도 동작이 달라지지 않는다. 8·9번에서 "권한 문제로 안 보인다" 와 "애초에 백엔드가 없다" 를 혼동하지 않도록 §9에 전량을 기록했다.

---

## 1. 모집단

| 축 | 수 | 근거 |
|----|---:|------|
| 정적 메뉴 항목(path 보유) | 48 | `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx` |
| route 선언 | 198 (`<Route key=`) / 고유 path 222 | `apps/admin-dashboard/src/routes/*.tsx` 14개 파일 |
| 프런트 API 호출(클라이언트 base 해석 가능) | 415 | `authClient.api` · `utils/apiClient` · `lib/api-client` 임포트 파일 전수 |
| 그중 백엔드 마운트 대응 | 233 | `register-routes.ts` 의 `app.use('/api/...')` 전수와 접두 대조 |
| 그중 대응 없음 | **182** | 운영 API 실측으로 교차 확인(§13) |
| 접두 중복(`/api/v1/api/...`) | **51 → 50** | 이번에 1건 교정 |
| guard 토큰 보유 backend router 파일 | 257 | `apps/api-server/src/routes` · `modules` · `packages` |

**클라이언트 base 3종** (경로 판정의 전제):

| 클라이언트 | base | `/api/...` 로 호출하면 |
|-----------|------|----------------------|
| `@o4o/auth-client` → `authClient.api` | `…/api/v1` | `/api/v1/api/...` → **404** |
| `apps/admin-dashboard/src/utils/apiClient.ts` | `…/api/v1` | 동일 **404** |
| `apps/admin-dashboard/src/lib/api-client.ts` | `https://api.neture.co.kr` (**루트**) | 정상. 반대로 `/api/v1/...` 을 **명시해야** 한다 |

> WO 원칙 "정상 API prefix 가 여러 형태로 공존하므로 전역 문자열 치환을 하지 않는다" 를 그대로 적용했다. 같은 `/api/membership/...` 문자열이라도 클라이언트에 따라 정답이 다르다.

---

## 2. A~H 분류 건수 (기능군 기준)

| 분류 | 정의 | 건수 | 대표 |
|:----:|------|---:|------|
| **A** PLATFORM_ADMIN_ONLY | 플랫폼 전역 데이터. `platform:admin`·`platform:super_admin` 만 | 5 | 사용자 관리, Membership 4화면, 플랫폼 계정, 플랫폼 사용자, 보안 IP |
| **B** SERVICE_ADMIN | 서비스 접두 admin 경계 | 3 | 서비스 법적문서 설정, 서비스 문의 설정, 서비스 관리 |
| **C** SERVICE_OPERATOR | 서비스 접두 operator 경계 | 4 | 문의 처리, 법적문서 게시, HUB 콘텐츠, 콘텐츠 승인 |
| **D** ORGANIZATION_SCOPED | organization/ownership 범위 필요 | 2 | 매장 네트워크, 오프라인 매장 |
| **E** DOMAIN_ACTOR | supplier·seller·매장 경영자 등 도메인 주체 | 3 | 공급자 승인 큐, 상품 등록 요청, 매장 상품 요청 |
| **F** SHARED_READ_ONLY | 관리자급 공통 조회 | 4 | 대시보드 Overview, Ops Metrics, 앱 가용성, 알림 |
| **G** DEAD_OR_UNIMPLEMENTED | 백엔드 마운트 부재 / 소비처 0 | **19 기능군 (호출 182건)** | 연회비 6화면, CMS Pages·Posts, Reporting 3화면, Signage v2, zone/theme, PermissionGuard 외 |
| **H** POLICY_REQUIRED | 정책 결정 없이는 판정 불가 | 6 | §8 |

> 건수는 **기능군** 단위다(화면 1:1 아님). G 는 화면 수보다 호출 수가 훨씬 크므로 두 값을 함께 적었다.

---

## 3. 기능별 정상 운영 주체 표

| 기능 | 화면(route) | 최종 API | 데이터 범위 | 정상 운영 주체 | 조회 | 변경 | service scope | org scope | 판정 |
|------|------------|---------|-----------|--------------|------|------|--------------|----------|:----:|
| 사용자 관리 | `/users` | `/api/v1/admin/users/*` | 플랫폼 전역 users | platform 관리자 | `platform:admin`, `platform:super_admin` | 동일 | 없음(전역) | 없음 | **A** |
| Membership 대시보드·회원·검증·유형·감사로그 | `/admin/membership/*` (6) | `/api/v1/membership/*` 관리자 subtree | 플랫폼 전역 회원 | platform 관리자 | `platform:admin`, `platform:super_admin` | 동일 | 없음(전역) | 없음 | **A** |
| 플랫폼 계정 | (route only) | `/api/v1/admin/platform-accounts` | 플랫폼 전역 | platform 관리자 | `ADMIN_ACCESS_ROLES` | 동일 | 없음 | 없음 | **A** |
| 플랫폼 사용자 | (route only) | `/api/v1/admin/platform-users` | 플랫폼 전역 | platform 관리자 | requireAdmin | 동일 | 없음 | 없음 | **A** |
| 차단 IP | (route only) | `/api/v1/admin/security/*` | 플랫폼 전역 | platform 관리자 | requireAdmin | 동일 | 없음 | 없음 | **A** |
| 서비스 법적문서 **설정** | `/admin/service-content-manager` | `/api/v1/admin/services/*/legal` | 서비스별 | 서비스 admin | `requireServiceLegalScope('admin')` | 동일 | **있음** | 없음 | **B** |
| 서비스 문의 **설정** | 동상 | `/api/v1/admin/services/*/contact-settings` | 서비스별 | 서비스 admin | `requireServiceLegalScope('admin')` | 동일 | **있음** | 없음 | **B** |
| 서비스 문의 **처리** | 동상 | `/api/v1/admin/services/*/inquiries` | 서비스별 | 서비스 operator | `requireServiceLegalScope('operator')` | 동일 | **있음** | 없음 | **C** |
| 법적문서 게시·검토 | 동상 | `/api/v1/admin/services/*/legal/*` (조회·초안) | 서비스별 | 서비스 operator | `('operator')` | 게시·삭제는 `('admin')` | **있음** | 없음 | **C** |
| HUB 콘텐츠 | `/operator/hub-contents` | `/api/v1/hub/*` | serviceKey | 서비스 operator | operator | operator | **있음** | 없음 | **C** |
| 콘텐츠 승인 | `/operator/approvals` | `/api/v1/operator/*` | serviceKey | 서비스 operator | operator | operator | **있음** | 없음 | **C** |
| 매장 네트워크 | `/admin/store-network` | `/api/v1/admin/store-network` | 매장 집합 | platform 관리자 + org 범위 | requireAdmin | requireAdmin | 없음 | **필요** | **D** |
| 오프라인 매장 | `/admin/physical-stores` | `/api/v1/admin/physical-stores` | 매장 | platform 관리자 + org 범위 | requireAdmin | requireAdmin | 없음 | **필요** | **D** |
| 공급자 승인 큐 | `/admin/o4o-product-db/candidates` | `/api/v1/operator/product-candidates` | 공급자 제출물 | operator | operator | operator | 있음 | 없음 | **E** |
| 상품 등록 요청 | `/admin/o4o-product-db/store-requests` | `/api/v1/operator/store-product-requests` | 매장 요청 | operator | operator | operator | 있음 | 매장 단위 | **E** |
| 기본 상품·데이터 정비 | `/admin/o4o-product-db/*` | `/api/v1/admin/o4o-product-db/*` | 플랫폼 상품 마스터 | platform 관리자 | requireAdmin | requireAdmin | 없음 | 없음 | **A/F 경계 — §8-3** |
| 대시보드 Overview | `/admin` | `/api/v1/admin/dashboard/*` | 집계 | 관리자급 공통 | requireAdmin | — | 없음 | 없음 | **F** |
| Ops Metrics | `/admin/ops/metrics` | `/api/v1/admin/ops/*` | 운영 지표 | 관리자급 공통 | requireAdmin | — | 없음 | 없음 | **F** |
| 앱 가용성 | (레이아웃 공통) | `/api/v1/apps` | 활성 앱 | 인증 사용자 read-only | authenticate | — | 없음 | 없음 | **F** |
| 앱 관리 | `/apps/store` | `/api/v1/admin/apps` | 앱 설치·정책 | platform 관리자 | requireAdmin | requireAdmin | 없음 | 없음 | **A** |
| Forum | `/forum/*` | `/api/v1/forum/*` | organizationId | 조직 운영자 | 조직 경계 | 조직 경계 | 없음 | **있음** | **D** |
| Yaksa 콘텐츠 | `/admin/yaksa` | `/api/v1/yaksa/*` | serviceKey(yaksa) | yaksa admin/operator | `requireYaksaScope` | 동일 | **있음(JWT scope)** | 없음 | **C** |
| 설정 | `/settings` | `/api/v1/settings/*` | 사이트 설정 | platform 관리자(변경) | **일부 비인증 공개** | requireAdmin | 없음 | 없음 | **H — §8-1** |
| 조직 목록 | (선택기) | `/api/v1/organizations` | 조직 | — | **비인증 공개(명시적)** | — | 없음 | 없음 | **H — §8-2** |
| 연회비 6화면 | **route 없음** | `/api/annualfee/*` | — | — | — | — | — | — | **G** |
| Reporting 3화면 | `/admin/reporting/*` | `/api/v1/reporting/*`·`/api/v1/yaksa/reports` | — | — | — | — | — | — | **G** |
| CMS Pages/Posts | `/admin/cms/pages` 외 | `/api/v1/posts`, `/api/v1/presets`, `/api/v1/template-parts` | — | — | — | — | — | — | **G** |
| Signage v2 채널 | `/admin/digital-signage/*` (일부) | `/api/signage/:service/channels` | — | — | — | — | — | — | **G** |
| yaksa-admin 콘솔 5화면 | `/admin/yaksa/{members,reports,officers,education,fees}` | `/api/membership/*`(오타) · `/api/v1/yaksa/reports`(부재) · `/api/v1/lms-yaksa/*`(부재) · `/api/annualfee/*`(부재) | 플랫폼 전역 회원 외 | — | — | — | — | — | **H — §8-4** |

---

## 4. 조회·변경 역할 매트릭스 (10 역할군)

`R`=조회, `W`=변경, `-`=불가, `(=)`=조회·변경 동일 경계.

| 기능군 | platform:super_admin | platform:admin | 서비스 admin (`kpa:admin`) | 서비스 operator (`kpa:operator`) | operator(무접두) | supplier | seller | 매장 경영자 | 일반 사용자 | 미인증 |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 사용자 관리 (A) | RW | RW | - | - | - | - | - | - | - | - |
| Membership 관리자 subtree (A) | RW | RW | - | - | - | - | - | - | - | - |
| 플랫폼 계정·사용자·보안 IP (A) | RW | RW | - | - | - | - | - | - | - | - |
| 앱 관리 (A) | RW | RW | - | - | - | - | - | - | - | - |
| 서비스 법적문서·문의 **설정** (B) | RW | RW | RW(자기 서비스) | - | - | - | - | - | - | - |
| 서비스 문의 **처리** / 법적문서 초안 (C) | RW | RW | RW(자기 서비스) | RW(자기 서비스) | - | - | - | - | - | - |
| HUB 콘텐츠·콘텐츠 승인 (C) | RW | RW | RW | RW | RW | - | - | - | - | - |
| Yaksa 콘텐츠 (C) | RW | RW | RW(yaksa) | RW(yaksa) | - | - | - | - | - | - |
| 매장 네트워크·오프라인 매장 (D) | RW | RW | - | - | - | - | - | **자기 매장만 — 미구현, §7-3** | - | - |
| Forum (D) | RW | RW | R | RW(자기 조직) | - | - | - | - | R(공개 게시판) | R(공개) |
| 공급자 승인 큐·상품 요청 (E) | RW | RW | - | RW | RW | 제출만 | - | 요청만 | - | - |
| 대시보드·Ops Metrics (F) | R | R | R | R | R | - | - | - | - | - |
| 앱 가용성 (F) | R | R | R | R | R | R | R | R | R | - |
| 설정 조회 `/settings/general` 외 3 (H) | R | R | R | R | R | R | R | R | R | **R (§8-1)** |
| 설정 변경 (A) | W | W | - | - | - | - | - | - | - | - |
| 조직 목록 (H) | R | R | R | R | R | R | R | R | R | **R (§8-2)** |
| G 분류 전체 | - | - | - | - | - | - | - | - | - | - |

**프런트 route 경계의 실효값** (`packages/auth-context/src/adminRouteAccess.ts`):

- 관리자 셸 `App.tsx:186` 은 `requiredRoles={['admin']}` → `admin`·`administrator`·`super_admin`·`operator`·`platform:*` **및 모든 서비스 접두 `*:admin`/`*:operator`** 를 통과시킨다. 즉 **서비스 admin 도 관리자 대시보드에 진입한다.**
- `requiredPermissions` 만 선언한 route 는, 백엔드가 `user.permissions` 를 공급하지 않으므로 **셸과 동일한 경계로 되돌아간다**(fallback). 좁히려면 `requiredRoles` 를 써야 한다.
- `requiredRoles={[...PLATFORM_ADMIN_ROLES]}` 만이 실제로 platform 전용으로 좁힌다.

---

## 5. service legal scope 대조

`requireServiceLegalScope` 소비처는 3개 컨트롤러뿐이며, 레벨 배정이 데이터 성격과 일치한다.

| 위치 | 레벨 | 대상 | 판정 |
|------|:----:|------|:----:|
| `admin-contact-inquiry.controller.ts:88` | operator | 문의 **처리** | 정합 |
| `admin-service-contact-settings.controller.ts:147` | admin | 문의 **설정** | 정합 |
| `admin-service-legal.controller.ts:90,148,169` | operator | 문서 조회·초안 | 정합 |
| `admin-service-legal.controller.ts:105,187,238,287` | admin | 게시·삭제·정책 | 정합 |

**"설정=admin / 실행=operator"** 축이 일관된다. operator 를 admin 하위 호환으로 쓰는 자리는 없다.

Yaksa 만 별도 메커니즘이다 — `requireYaksaScope`(`routes/yaksa/yaksa.routes.ts`)는 `req.user.scopes`(JWT 배열) 또는 `req.user.roles` 의 `platform:admin`/`platform:super_admin` 을 본다. `requireRole` 의 DB `hasAnyRole` 과 **다른 축**이다. 8번 census 에서 JWT scope 공급 여부를 함께 봐야 한다(§16).

## 6. organization / ownership 범위 대조

| 기능 | 현재 guard | organization/ownership 검사 | 판정 |
|------|-----------|---------------------------|:----:|
| 매장 네트워크 `platform/store-network.routes.ts:32` | `router.use(requireAdmin)` | **없음** | 역할 guard 가 범위 검사를 대신하고 있음 → §7-3 |
| 오프라인 매장 `platform/physical-store.routes.ts:32` | `router.use(requireAdmin)` | **없음** | 동일 |
| Forum | 조직 경계 있음 | 있음 | 정합 |
| Membership | 플랫폼 전역 — org 축 없음 | 해당 없음 | 정합 |
| 사용자 관리 | 플랫폼 전역 — org 축 없음 | 해당 없음 | 정합 |

현재는 `requireAdmin` 이 platform 관리자만 통과시키므로 **실사고 경로는 아니다.** 매장 경영자에게 자기 매장 조회를 열어주는 순간 ownership 검사가 필수가 된다. 신규 API 신설은 이번 범위 밖이므로 §7-3 에 기록만 한다.

---

## 7. 이번에 수정한 항목과 근거

수정 3개 파일. 모두 **경계를 좁히거나 오타를 고치는 방향**이며, 권한을 넓히는 변경은 0건이다.

### 7-1. `pages/membership/audit-logs/AuditLogManagement.tsx` — 접두 중복 교정

`authClient.api.get('/api/membership/audit-logs')` → `'/membership/audit-logs'`.

근거: authClient base 가 `…/api/v1` 이라 기존 호출은 `/api/v1/api/membership/audit-logs` = **404**. canonical 마운트는 `/api/v1/membership`(`register-routes.ts`), 운영 실측 `GET /api/v1/membership/audit-logs` → **401**(존재·guard 동작). 6번에서 고친 membership 콘솔 5화면과 같은 계열의 마지막 잔여분이며, 메뉴 없이 route 만 있는 화면이지만 경계(`requiredRoles={[...PLATFORM_ADMIN_ROLES]}`)는 이미 canonical 과 같다.

### 7-2. `routes/yaksa.routes.tsx` — `/admin/yaksa/members` route 경계 축소

`requiredPermissions` 만 있던 선언에 `requiredRoles={[...PLATFORM_ADMIN_ROLES]}` 를 추가.

근거: 이 화면(`MemberApprovalPage`)이 다루는 데이터는 `/api/v1/membership/*` — `MEMBERSHIP_ADMIN_ROLES = ['platform:admin','platform:super_admin']` 로 보호되는 **플랫폼 전역** 회원 데이터다. `user.permissions` 미공급이므로 기존 선언의 실효 경계는 "관리자급이면 통과"(서비스 접두 `kpa:admin` 포함) 였고, 메뉴에 없는 화면인데 URL 직접 접근으로 렌더됐다. WO 원칙 "메뉴 숨김 역할은 URL 직접 접근도 차단" · "같은 기능군 내 guard 누락" 에 해당한다. 5번이 `/admin/membership/*` 에 적용한 것과 같은 조치다. `requiredPermissions` 는 그대로 두어 permission 이 공급되면 AND 조건이 되게 했다.

**화면 자체를 살리지는 않았다.** 이 콘솔의 API 경로(`/api/membership/...`, 루트 base 클라이언트)는 여전히 404 다. canonical 회원 콘솔과의 중복 여부가 정책 미결(§8-4)이므로, 경로를 고쳐 중복 콘솔을 조용히 되살리지 않았다.

### 7-3. `tests/admin-operation-boundary.test.ts` (신규) — 회귀 고정

11 테스트. ① 플랫폼 전역 회원 화면 7개(membership 6 + yaksa members)가 `PLATFORM_ADMIN_ROLES` 를 선언 ② `PLATFORM_ADMIN_ROLES` 임의 확대 금지 ③ 접두 중복 파일 목록 무증식(알려진 17파일 밖 신규 0) ④ 감사로그 화면 접두 중복 해소 유지 ⑤ membership 마운트 유일성.

---

## 8. POLICY_REQUIRED (H) — 정책 결정이 필요해 수정하지 않은 항목

**8-1. `/api/v1/settings/{general,homepage,customizer,header-builder}` 비인증 공개**
운영 실측 `GET /api/v1/settings/general` → **200**. `siteName`·`timezone`·`language` 외에 `adminEmail`·`maintenanceMode`·`defaultUserRole`·`apiRateLimit`·`enableApiAccess` 가 함께 나온다(`routes/settingsRoutes.ts:10-13` 은 guard 없음, 나머지는 `authenticate + requireAdmin`). 공개 사이트 렌더링이 이 4개를 소비할 가능성이 높아 **가드를 붙이면 프런트가 깨질 수 있다.** 결정 필요: (a) 유지 (b) 공개 응답에서 운영 필드 제외 (c) 공개 전용 엔드포인트 분리.

**8-2. `/api/v1/organizations` 비인증 공개**
실측 200. 코드에 `@access Public (read-only)` 로 **명시**돼 있다(`organization.routes.ts:29`). 의도적 설계이므로 결함으로 보지 않되, 조직명 전량이 비인증 노출되는 것이 현재 정책과 맞는지 확인 필요.

**8-3. `/api/v1/admin/o4o-product-db/*` 의 운영 주체**
현재 `requireAdmin`(platform 관리자). 그러나 이 데이터는 **운영사업자(operator)의 일상 업무**(자료 등록·정비)에 해당한다(CLAUDE.md §11, `O4O-BUSINESS-PHILOSOPHY-V1 §3.2`). A 로 볼지 C 로 볼지는 권한 확대를 수반하므로 결정 필요. **이번에 넓히지 않았다.**

**8-4. `/admin/yaksa/*` yaksa-admin 콘솔 5화면 — canonical 콘솔과 중복**
`MemberApprovalPage` ↔ `/admin/membership/members`, `ReportReviewPage` ↔ `/admin/reporting/*`. 어느 쪽이 canonical 인지 확정 필요. 확정 전에는 API 경로를 고치지 않는다(§7-2).

**8-5. `requireYaksaScope` 의 이중 축**
JWT `scopes` 또는 `roles` 배열을 보는 방식이 RBAC SSOT(`role_assignments` + DB `hasAnyRole`)와 다른 축이다. 통일할지 유지할지 결정 필요. 통일은 인증 응답 구조 변경을 수반하므로 이번 범위 밖.

**8-6. `GET /api/v1/channels` 비인증 요청 시 500**
실측 500(401/404 아님). 인증 이전 단계에서 예외가 난다. 정보 노출은 확인되지 않았으나 guard 순서 점검 필요.

---

## 9. DEAD(G) 항목과 운영 필요성

| 기능군 | 화면 | 호출 | route | 백엔드 | 운영 필요성 판단 |
|--------|------|---:|:---:|--------|---------------|
| 연회비(annualfee) | `pages/annualfee/*` 6 | 24 | **없음** | `/api/v1/annualfee*` 404. `packages/annualfee-yaksa` 는 모듈 로더 등록 실패 | 낮음 — 화면도 route 도 도달 불가. 제거 후보 |
| yaksa-admin 개요 | 교육·연회비·임원·신고 4 | 12 | 있음 | `/api/v1/lms-yaksa/*`·`/api/v1/yaksa/reports`·`/api/organization/organizations/*/members` 전부 404 | §8-4 결정 후 |
| Reporting | `/admin/reporting/*` 3 | 6 | 있음 | `/api/v1/reporting/*` 404 | §8-4 결정 후 |
| CMS Pages/Posts/Templates | PageList, PatternBuilder 외 | 30+ | 있음 | `/api/v1/posts`·`/presets`·`/template-parts`·`/templates`·`/widgets`·`/taxonomies` 404 | **높음** — 메뉴에 노출된 화면 포함. 별도 트랙 필요 |
| Signage v2 채널 | `digital-signage/v2/*` 2 | 7 | 있음 | `/api/signage/:svc` 는 `/api/v1` **밖**에 마운트 → authClient 로는 도달 불가 | 중간 |
| 알림 v2 | `hooks/useNotifications.ts` | 4 | (공통) | `/api/v2/notifications` 없음. `/api/v1/notifications` 는 `GET /`·`/unread-count`·`POST /read` 만 | 중간 — 부분 대응 가능 |
| zone/theme | `services/api/zoneApi.ts` | 5 | — | `/api/zones`·`/api/theme` 없음 | 낮음 |
| PermissionGuard | `components/organization/PermissionGuard.tsx` | 3 | — | `/api/users/me`·`/api/permissions/check` 없음. **소비처 0** | 낮음 — 제거 후보 |
| OrganizationSelector / ProductSelector | 2 컴포넌트 | 2 | — | **소비처 0** | 낮음 — 제거 후보 |
| BulkProductImport | `/dropshipping/products/bulk-import` | 1 | 있음 | `bulk-import` 엔드포인트 저장소 전체에 **0건** | 중간 |
| FloatingAiButton | 컴포넌트 | 2 | — | AdminLayout 에서 **의도적으로 미마운트**(주석 명시) | 낮음 |
| partnerops / sellerops | 6 화면 | 17 | 일부 | manifest 가 `id` 대신 `appId` 를 써서 모듈 로더가 거부 → `/api/v1/partnerops` 미마운트 | **중간 — 원인 명확**(§17) |
| vendors·inventory·orders·monitoring·storefront·categories·tags·media·menus·roles·ds·pharmacy | 다수 | 45 | 혼재 | 전부 404 | 화면별 개별 판단 필요 |

> **원인 한 줄**: `packages/{partnerops,sellerops,supplierops,partner-core,pharmaceutical-core}/src/manifest.ts` 는 객체 키가 `appId` 다. `ModuleLoader.loadModule` 은 `manifest.id` 가 없으면 등록을 거부하므로(`module-loader.ts:100`) `/api/v1/{id}` 동적 마운트가 생기지 않는다. 이 진단은 기록만 하고 고치지 않았다 — 마운트를 살리는 것은 **경계 확정이 아니라 기능 활성화**이고, 활성화 시 운영 주체·guard 를 먼저 정해야 한다.

---

## 10. RBAC 카탈로그 갱신 목록 (별도 문서 WO 로 이월 — Freeze 문서 직접 수정 안 함)

`docs/rbac/RBAC-ROLE-CATALOG-V1.md`(2026-02-27)는 현행 코드와 5개월 차이가 난다. 갱신 필요 항목:

1. `admin`·`super_admin`(무접두)은 더 이상 platform 관리자 경계가 아니다 → `platform:admin`·`platform:super_admin`.
2. `ADMIN_ROLES`(`routes/admin/users.routes.ts:32`) · `MEMBERSHIP_ADMIN_ROLES`(`bootstrap/membership-admin-guard.ts:34`) · `ADMIN_ACCESS_ROLES`(`platform-accounts.routes.ts`) 3 상수의 현행값 기재.
3. `requireServiceLegalScope('admin'|'operator')` 의 "설정=admin / 실행=operator" 축 명문화.
4. `requireYaksaScope` 의 JWT scope 축이 DB 역할 축과 병존한다는 사실(§8-5).
5. 프런트 `ADMIN_LEVEL_ROLES` 와 서비스 접두 role 수용 규칙(`adminRouteAccess.ts`)이 백엔드 경계와 어떻게 대응하는지.
6. `user.permissions` 미공급 사실과 fallback 동작.

## 11. permission 공급 전 감사 목록

`user.permissions` 를 공급하는 순간 `requiredPermissions` 선언이 **즉시 활성화**되어 화면이 사라질 수 있다. 공급 전 반드시 확인:

- `requiredPermissions` 만 선언한 route 전량(대표: `/admin/reporting/*` 3, `/admin/yaksa/*` 10, `/admin/yaksa-hub`).
- 선언된 permission 문자열(`yaksa-admin.*`, `reporting:*`, `membership:*`, `yaksa-scheduler.job.read`)이 **실제 발급 가능한 값인지**. 현재 이 문자열들을 발급하는 코드는 확인되지 않았다 → 공급 시작 시 전원 잠김 위험.
- `hasRequiredPermissions` fallback 제거 시점과 공급 개시 시점의 lockstep.

## 12. 메뉴 – route – backend 재정합성

| 확인 항목 | 결과 |
|---------|------|
| 메뉴 48 항목 중 route 없는 항목 | 0 (5번에서 해소) |
| route 있으나 메뉴 없는 화면 | 다수. 셸 `['admin']` 게이트 아래이므로 URL 직접 접근 가능 → 플랫폼 전역 데이터 화면만 이번에 경계 축소(§7-2). 나머지는 G 이거나 F |
| 메뉴 보이는 정상 주체가 API 까지 도달하는가 | Membership 6·사용자 관리·o4o-product-db·store-network·physical-stores·forum·yaksa·ops-metrics = **도달**. CMS Pages·Reports = **미도달(G)** |
| backend-only 기능(화면 없음) | 다수. 이번에 화면을 만들지 않았다(WO 금지 사항) |
| 조회·변경이 같은 경계로 묶인 경로 | `/api/v1/admin/*` 대다수가 `router.use(requireAdmin)` 로 조회·변경 동일. platform 전용이라 현재 위험 낮음. operator 확대(§8-3) 시 분리 필요 |
| `window.prompt`·textarea 임시 UI | 6번 CHECK 에 기록된 항목 외 신규 발견 없음 |

---

## 13. 운영 API 실측 (비인증 GET, read-only)

호스트 `https://api.neture.co.kr`. **자격증명·토큰을 사용하지 않았고, 응답 본문은 요약만 기록한다.**

- 401(존재+guard): `/api/v1/users`, `/api/v1/admin/users`, `/api/v1/admin/platform-accounts`, `/api/v1/admin/platform-users`, `/api/v1/admin/apps`, `/api/v1/apps`, `/api/v1/admin/security`, `/api/v1/membership/members`, `/api/v1/membership/audit-logs`, `/api/v1/operator/members`, `/api/v1/operator/stores`, `/api/v1/operator/roles`, `/api/v1/admin/store-network`, `/api/v1/admin/physical-stores`, `/api/v1/admin/dropshipping/suppliers`, `/api/v1/dropshipping/admin/suppliers`, `/api/v1/admin/o4o-product-db/masters`, `/api/v1/admin/o4o-product-db/product-contents`, `/api/v1/admin/cms/contents`, `/api/v1/admin/channels/ops`, `/api/v1/admin/ops/metrics`, `/api/v1/cpt/types`, `/api/v1/content/assets`, `/api/v1/service-admin`, `/api/v1/admin/services`, `/api/v1/admin/platform-services`
- 200(공개): `/api/v1/settings/general`(§8-1), `/api/v1/organizations`(§8-2), `/api/v1/forum/categories`, `/api/v1/cms/contents`, `/api/v1/yaksa/posts`
- 500: `/api/v1/channels`(§8-6)
- 404(마운트 부재): §0 표 + `/api/v1/lms-yaksa/*`, `/api/v1/annualfee-yaksa/*`, `/api/v1/membership-yaksa/*`, `/api/v1/organizations/:id/members`, `/api/v1/yaksa/reports`

> 참고: Cloud Run 기본 URL(`o4o-core-api-…run.app`)은 `/health` 조차 404 를 돌려준다. 실측은 반드시 `api.neture.co.kr` 로 해야 한다 — 9번 smoke 에서 오판 위험.

## 14. 테스트 · typecheck · 변이

| 항목 | 결과 |
|------|------|
| `apps/admin-dashboard` vitest 전체 | **14 파일 / 239 테스트 통과** (이전 13/228 + 신규 11) |
| `apps/api-server` jest — `admin-api-guard-inventory` + `membership-admin-guard` | **2 스위트 / 52 테스트 통과** |
| `apps/admin-dashboard` `tsc --noEmit` | **exit 0** |
| 변이 ① `/admin/yaksa/members` 의 `requiredRoles` 제거 | 해당 테스트 **1건 실패** → 복원 후 통과 |
| 변이 ② 감사로그 경로를 `/api/membership/...` 로 되돌림 | 관련 테스트 **2건 실패** → 복원 후 통과 |

> api-server 는 **jest** 다(`package.json: "test": "jest"`). vitest 로 돌리면 TypeORM 데코레이터 해석 실패로 오탐이 난다.

## 15. DB 접근 0 · 타 세션 보존

- 운영 DB 접근 **0건**. SQL·마이그레이션·Cloud SQL Proxy **미사용**. 검증은 소스 정적 분석 + 비인증 HTTP GET 뿐이다.
- 역할 데이터 변경·역할 부여 **0건**. `ADMIN_ROLES`·`MEMBERSHIP_ADMIN_ROLES`·`PLATFORM_ADMIN_ROLES` **미변경**.
- `user.permissions` 공급 **하지 않음**. 인증 응답 구조 **미변경**.
- 타 세션 WIP(`apps/api-server/src/scripts/easy-drug-ko-critical-content-correction/`, `easy-drug-ko-source-consistency-audit/`) — **열람·수정·stage·stash·commit 전부 하지 않았다.**
- `pnpm-lock.yaml` 미변경. schema·migration 0건. Freeze 문서 직접 수정 0건.

---

## 16. 8번(운영 계정 role census)에서 확인할 대상

read-only 로 다음을 센다.

1. `role_assignments` 에 `platform:admin` · `platform:super_admin` 보유 계정 수 — **0이면 A 분류 기능 전체가 아무도 못 쓴다.**
2. 무접두 `admin`·`super_admin`·`operator` 보유 계정 수와 그들이 현재 접근 가능한 화면(셸 통과, A 화면은 403).
3. 서비스 접두 역할(`kpa:admin`, `kpa:operator`, `neture:admin`, `neture:operator`, `kcos:*`) 보유 현황 — B·C 분류 검증에 필요.
4. **JWT `scopes` 공급 여부** — `requireYaksaScope`·`requireDropshippingScope` 는 `user.scopes` 를 본다. DB 역할만 있고 scope 가 안 실리면 yaksa·dropshipping 관리 기능은 `platform:*` 없이 통과 불가(§8-5).
5. `user.permissions` 가 실제로 비어 있는지 재확인(§11 전제).
6. supplier·seller·매장 경영자 역할 표기 실태(무접두/접두 혼재 여부).

## 17. 9번(배포 후 역할별 smoke)에서 검증할 화면·동작

호스트는 **`api.neture.co.kr`** 기준(§13 주의).

| 역할 | 화면 | 기대 |
|------|------|------|
| `platform:super_admin` | `/users`, `/admin/membership/members`, `/admin/membership/audit-logs` | 렌더 + 목록 **200** |
| `platform:admin` | 동일 | 동일 |
| `platform:admin` | `/admin/membership/members` 에서 활성/비활성 토글(PUT) | **200** (6번 수정 확인) |
| `platform:admin` | `/admin/membership/audit-logs` | **200** — 이번 7-1 수정의 직접 확인 대상 |
| `kpa:admin` | `/users`, `/admin/membership/*`, `/admin/yaksa/members` | **route 단계에서 차단**(7-2 확인). API 도 403 |
| `kpa:admin` | `/admin/service-content-manager` (자기 서비스 법적문서 설정) | 200 |
| `kpa:operator` | 문의 **처리** 200 / 문의 **설정** 403 | B·C 축 확인 |
| `kpa:operator` | `/operator/hub-contents`, `/operator/approvals` | 200 |
| 무접두 `operator` | 관리자 셸 진입 O, A 분류 화면 403 | 셸 게이트 실효값 확인 |
| 매장 경영자 | `/admin/store-network`, `/admin/physical-stores` | **403** (현재 ownership 검사 없음 — §6) |
| 일반 사용자 | 관리자 셸 전체 | 차단 |
| 미인증 | `/api/v1/settings/general`, `/api/v1/organizations` | **200** — §8-1·8-2 정책 결정의 근거 자료로 기록 |

**smoke 하지 말 것**: G 분류 화면(§9). 404 를 권한 문제로 오독하게 된다.

## 18. 커밋 · push

- 커밋 `13d30fef3` — `audit(admin): 관리자 대시보드 운영 주체·보안 경계 확정 (…-V1)`
- 포함 파일 4개 (정확한 pathspec 지정 커밋, `git add .` 미사용):
  `apps/admin-dashboard/src/pages/membership/audit-logs/AuditLogManagement.tsx` ·
  `apps/admin-dashboard/src/routes/yaksa.routes.tsx` ·
  `apps/admin-dashboard/src/tests/admin-operation-boundary.test.ts` ·
  `docs/checks/WO-O4O-ADMIN-DASHBOARD-OPERATION-SECURITY-BOUNDARY-ROLE-ACCESS-V1-CHECK.md`
- push 완료 `c9150cb59..13d30fef3 main -> main`. push 후 **ahead 0 / behind 0**, 작업 트리 clean.
- 선행 커밋 `26f04de6e`(5번) · `456242de7`(6번) 이 HEAD 조상에 포함됨을 확인.
- 타 세션이 같은 기간에 `7ecc1e1a8`(easy-drug) 등을 main 에 올렸으나, 본 세션은 해당 파일을 열람·수정·stage·commit 하지 않았다.
- 이 §18 항목만 커밋 후 후속 커밋으로 기재했다(공유 main 의 push 된 커밋은 amend 하지 않는다).

---

### 부록. 조사 체인 재현 방법

1. `apps/admin-dashboard/src` 전수에서 클라이언트 임포트를 판정하고 `authClient.api.*` / `apiClient.*` 호출 경로를 추출.
2. 클라이언트별 base(`/api/v1` 또는 루트)를 붙여 최종 경로 산출.
3. `apps/api-server/src` 전수의 `app.use('/api/...')` 를 **주석 제거 후** 수집(주석에 `app.use('/api/v1', …)` 예시가 있어 제거하지 않으면 전건이 오매칭된다).
4. 최종 경로를 마운트 접두와 `===` 또는 `startsWith(mount + '/')` 로 엄격 대조.
5. 미해결분을 운영 API 비인증 GET 으로 교차 확인(401=존재 / 404=부재).
