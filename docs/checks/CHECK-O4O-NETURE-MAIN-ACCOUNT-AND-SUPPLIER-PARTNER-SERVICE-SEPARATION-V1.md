# CHECK-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1

> **WO**: WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
> **일자**: 2026-09-15
> **범위**: `neture.co.kr` 대표 홈(O4O 계정 · 로그인 · 회원가입 · 내 정보 · `O4O 로그아웃`) 과 공급자 · 파트너 **서비스**(각각 독립된 신청 · 승인 · 이용 상태) 의 분리. 서비스 이탈 ≠ 대표 로그아웃. 서버 권한은 서비스별 이용 상태로 판정.
> **원칙**: 기존 신청 · 승인 원본 재사용 · 회원 상태 일괄 변경 없음 · 서비스별 세션 · 서비스 전용 로그아웃 없음 · O4O 계정 탈퇴 · 전역 SSO 로그아웃은 범위 밖.

## 1. 조사 결과 (상태 원본 · 기존 데이터)

### 1-1. 서비스 상태 단일 출처(SSOT)

| 서비스 | SSOT | 상태 값 | 신청 원본(재사용) | 승인 원본(재사용) |
|---|---|---|---|---|
| 공급자 | `neture_suppliers.status` (user_id 1:1) | `PENDING` → 신청 중 · `ACTIVE` → 이용 중 · `REJECTED` → 반려 · `INACTIVE` → 정지 · 행 없음 → 미가입 | `POST /neture/supplier/register` (supplier-management) | `/neture/operator/suppliers/:id/approve\|reject` (`OperatorSupplierApprovalPage`) |
| 파트너 | `neture.neture_partners.status` (user_id 1:1) | `pending` · `active` · `rejected`(신설) · `suspended` → 정지 · `inactive` → 탈퇴 · 행 없음 → 미가입 | `POST /neture/partner/register` (partner.controller — 기존 자기등록 흐름을 서비스 신청으로 정리) | `/neture/operator/partners/:id/approve\|reject` (신설, 공급자 승인의 대칭) + `operator-registration.service` 의 partner 승인 · 반려가 `neture_partners` 에 동기화 |

- `role_assignments` 의 `supplier` / `partner` 문자열은 **판정 근거로 쓰지 않는다**. legacy fallback 은 SSOT 행이 **없을 때만**: `service_memberships(neture)` 의 `role` 이 supplier/partner 이면 그 가입 신청 상태(pending · rejected 등, source=`service_memberships`) 를 해당 서비스 상태로 본다 — 역할 가입은 승인 시점에 서비스 행이 만들어지므로(`operator-registration.service` 4 · 5 단계) 승인 전 회원만 여기에 해당한다. 데이터는 바꾸지 않는다.
- 서버 해석기: `apps/api-server/src/modules/neture/services/neture-service-state.service.ts` (`resolveNetureServiceStates`) → `GET /neture/home/entry` 응답 `serviceStates: { supplier: {status, source}, partner: {status, source} }`.

### 1-2. 운영 DB 조회(read-only, 2026-09-15)

| 항목 | 값 |
|---|---|
| `role_assignments` active (neture 관련) | `neture:admin` 1 · `neture:operator` 1 · 접두사 없는 `supplier` 6 · `partner` 0 |
| `service_memberships` (`neture`) | 7 |
| `neture_suppliers` | `ACTIVE` 2 · `PENDING` 1 |
| `neture.neture_partners` | 0 |
| `supplier` role 은 있으나 `neture_suppliers` 행 · neture membership 모두 없는 사용자 | 3 (과거 데이터 · 판단 근거 없음 → **손대지 않음**, 본 WO 후 공급자 서비스 = 미가입으로 표시됨. 필요 시 운영 판단으로 별도 처리) |

**backfill 불필요**: 승인된 공급자 2 명은 `neture_suppliers.ACTIVE` 로 그대로 이용 중 판정. 파트너 행 0 → 변환 대상 없음. 운영 회원 상태 변경 0 건 · 삭제 0 건.

### 1-3. 범위 밖 · 보고 항목

| 항목 | 내용 |
|---|---|
| `partner_commissions.partner_id` 불일치 | 기존 코드가 `users.id` 를 넣는 곳과 identity guard 가 `neture_partners.id` 를 partnerId 로 두는 곳이 섞여 있음(기존 결함). 본 WO 는 guard 기준을 유지하고 데이터 · 커미션 로직은 건드리지 않음 → 별도 WO |
| `SupplierRoute`(App.tsx) | 여전히 neture membership + supplier role 로 1차 차단. 그 안쪽 `SupplierSpaceLayout` 의 `ServiceUsageGate` 가 이용 상태로 2차 판정하므로 결과는 정합. role 만 있고 상태가 없는 사용자는 게이트 안내 화면에 도달 |
| `/supplier/*` 의 판매자(매장 소유) 화면 | store-owner 축(`organizationId`) 이며 공급자 서비스 상태와 다른 축 → 미변경 |
| 공급자 반려 후 재신청 | 기존 API 가 `USER_ALREADY_HAS_SUPPLIER` 로 거부(행 1:1). 화면은 "운영자 문의" 안내. 파트너는 rejected/inactive 행을 pending 으로 재사용 |

## 2. 변경 내용

### 2-1. 서버 (`apps/api-server/src`)

| 파일 | 변경 |
|---|---|
| `modules/neture/services/neture-service-state.service.ts` (신규) | `resolveNetureServiceStates(dataSource, userId)` — 서비스별 SSOT 조회 · 상태 정규화 |
| `routes/neture/controllers/neture-home-entry.controller.ts` | 응답에 `serviceStates` 추가(`stores` · `branches` 유지) |
| `modules/neture/middleware/neture-identity.middleware.ts` | 파트너 상태 비교 대소문자 무시 · `requireActivePartner` 의 active 판정을 `neture_partners.status` 로 |
| `modules/neture/controllers/partner-dashboard.controller.ts` · `partner-commerce.controller.ts` | 보호 API 에 파트너 이용 상태 guard(`createRequireActivePartner`) — 대표 로그인만으로 직접 호출 불가 |
| `modules/neture/controllers/partner.controller.ts` | `POST /partner/register` — 로그인 회원의 파트너 **서비스 신청**(pending 행 생성, 1:1) |
| `modules/neture/services/neture-partner-service-application.service.ts` (신규) | 신청 · 목록 · 승인(`active` + `partner` role) · 반려(`rejected`) |
| `modules/neture/controllers/operator-partner.controller.ts` (신규) | `GET /operator/partners?status=` · `POST /operator/partners/:id/approve\|reject` (`requireAuth` + `requireNetureScope('neture:operator')`) |
| `modules/neture/services/operator-registration.service.ts` | 가입 승인 · 반려에서 partner role 인 경우 `neture_partners` 동기화(승인 → active 행 upsert · 반려 → rejected) |
| `routes/neture/entities/neture-partner.entity.ts` | `REJECTED` 상태 추가(enum 확장, 마이그레이션 없음 — 컬럼은 varchar) |
| `modules/neture/neture.routes.ts` | operator-partner 컨트롤러 마운트 |

### 2-2. 프론트 (`services/web-neture/src`)

| 파일 | 변경 |
|---|---|
| `lib/home-entry.ts` | `NetureServiceStates` · `SERVICE_STATUS_LABELS` · `NETURE_SERVICE_INFO` · `normalizeServiceStates`. `buildHomeEntryModel` 이 `serviceStates` 로 「내가 이용하는 서비스」(active) · 「가입 · 이용 상태」(pending · rejected · suspended) · 「신청 안내」(none · withdrawn) 분기. role 문자열 · `neture:active` 만으로 추정하지 않음 |
| `lib/neture-service-state.ts` (신규) | `useNetureServiceStates` — `/neture/home/entry` 의 `serviceStates` 만 읽음. 조회 실패 = 미가입 아님(재시도) |
| `components/auth/ServiceUsageGate.tsx` (신규) | 업무 공간 게이트: active 만 통과 · 그 외 상태별 안내 + `O4O 홈으로`(로그인 유지). 로그아웃 버튼 없음. **관리자 예외 없음**(서버 guard 와 동일 — 초기 구현의 관리자 통과는 운영 검증에서 401→refresh→로그아웃 연쇄가 확인되어 제거, §4-3) |
| `components/layouts/SupplierSpaceLayout.tsx` · `PartnerSpaceLayout.tsx` | role 기반 「접근 권한 없음」 제거 → `ServiceUsageGate`. 사이드바 최상단 `O4O 홈으로`(`/`, 로그인 유지) 추가. 기존 `/login` 리다이렉트(미인증) 유지 |
| `components/auth/ServiceApplyPanel.tsx` (신규) | 랜딩 페이지의 로그인 회원용 신청 · 상태 패널(회원가입 아님). none → 신청 폼 · pending → 신청 중 · active → 업무 이동 · rejected/suspended/withdrawn → 안내 |
| `pages/SupplierLandingPage.tsx` · `PartnerLandingPage.tsx` | 로그인 전 = 기존 회원가입(`/register`) · 로그인 버튼 유지 / 로그인 후 = `ServiceApplyPanel` |
| `pages/O4OHomePage.tsx` | 우상단: 로그인 전 `로그인` + `회원가입`(기존 모달) / 로그인 후 이름 · 계정 메뉴(`내 정보` · `O4O 로그아웃`, 모바일 동일). 로그아웃 · 사용자 변경 시 AI 입력 · 응답 · 첨부 · 진행 중 응답 초기화(세대 카운터로 늦은 응답 폐기) |
| `contexts/AuthContext.tsx` | `pageshow(persisted)` · `storage(o4o_accessToken)` 에서 `refresh()` — 로그아웃 후 뒤로가기(bfcache) · 다른 탭 로그아웃 시 개인화 화면 잔존 방지 |
| `components/NetureGlobalHeader.tsx` · `NetureBottomNav.tsx` · `pages/mypage/MyPageHub.tsx` | 로그아웃 라벨 `O4O 로그아웃` |
| `pages/operator/OperatorPartnerApprovalPage.tsx` (신규) · `App.tsx` · `config/operatorMenuGroups.ts` | `/operator/partners` 파트너 승인(OperatorRoute) · 운영자 메뉴 `파트너 승인` |

### 2-3. 공통 패키지 (라벨 prop 추가 — 기본값 유지, 소비처 무영향)

| 파일 | 변경 | 소비처 |
|---|---|---|
| `packages/ui/src/layout/GlobalHeader.tsx` | `logoutLabel?: string`(기본 `'로그아웃'`) | KCos · KPA · Neture · PharmacyHub GlobalHeader — Neture 만 전달 |
| `packages/account-ui/src/components/QuickActionsSection.tsx` | `logoutLabel?: string`(기본 `'로그아웃'`) | KCos · Neture MyPageHub — Neture 만 전달 |

`MobileBottomNavProfileSheet` 는 이미 `logoutLabel` 지원 → 재사용.

### 2-4. 버튼 의미

| 위치 | 라벨 | 동작 |
|---|---|---|
| 대표 홈 계정 메뉴 · 헤더 · 마이페이지 · 모바일 시트 | `O4O 로그아웃` | 실제 토큰 제거 → 비로그인 홈. AI 상태 초기화 |
| 공급자 · 파트너 업무 공간 사이드바 | `O4O 홈으로` | `/` 이동, 로그인 유지 |
| 게이트 안내 화면 | `O4O 홈으로` · `{서비스} 신청` · `신청 상태 보기` · `다시 신청하기` | 로그인 유지 |

## 3. 자동 테스트

| 대상 | 명령 | 결과 |
|---|---|---|
| api-server | `pnpm test -- neture-service-state.test.ts` | 20 passed |
| api-server | `pnpm test -- operator-registration.roleContract.test.ts` | 12 passed |
| web-neture | `npx vitest run --config services/web-neture/vitest.config.mjs` | 5 files · 41 passed (신규 `ServiceUsageGate.test.tsx` 8 · `home-entry.service-states.test.ts` 8 · `AuthContext.crossTab.test.tsx` 5 · 기존 20) |
| web-neture | `tsc --noEmit` · `vite build` | 0 errors · built |
| packages/ui · packages/account-ui | `tsc --noEmit` | 0 errors |
| api-server `tsc --noEmit` | 변경 파일 오류 0. 워크트리 미빌드 `@o4o/security-core` TS2307 · `copilot-engine.service.ts` 3건은 기존 · 무관(`ref-api-server-build-deps-incomplete`) |

신규 테스트가 고정하는 것: role 문자열이 있어도 상태 none 이면 신청 안내 · 한 서비스 정지가 다른 서비스 게이트에 영향 없음 · 조회 실패는 미가입 아님 · pending/rejected/withdrawn 라벨 · 관리자도 서비스 행 없으면 안내 · 홈 모델의 서비스별 그룹 분기. · 다른 탭 토큰 삭제(storage newValue=null) 는 storage 재조회 없이 즉시 비로그인 · 다른 탭 로그인은 refresh · bfcache pageshow(persisted) 만 refresh.

## 4. 실 화면 검증 (운영, 배포 후)

- 방법: Playwright(node 스크립트, 독립 context · bfcache 기본 비활성 스위치 제거) 로 `https://neture.co.kr` 운영 화면 실행. 계정은 `docs/local/TEST-ACCOUNTS.local.md` 의 공급자 승인(ACTIVE) 계정 · 관리자(neture:admin) 계정. **운영 회원 상태는 변경하지 않았고 신청 폼은 제출하지 않았다.**
- 캡처: `01-prelogin-desktop/mobile` · `02-supplier-home-desktop` · `02-supplier-home-account-menu` · `02-supplier-home-mobile-menu` · `03-supplier-dashboard` · `04-partner-gate-none` · `05-partner-landing-apply` · `05-supplier-landing-active` · `06-after-logout-tab2` · `06-after-logout-tab1-crosstab` · `07-supplier-landing-header-logout` · `08-back-after-logout` · `09-operator-partners` · `10-admin-partner-dashboard` (세션 스크래치, 저장소 미포함).

### 4-1. 상태별 결과

| # | 상태 · 시나리오 | 결과 | 판정 |
|---|---|---|---|
| 1 | 비로그인 홈 | 우상단 `로그인` · `회원가입` 표시, 계정 메뉴 없음, "내가 이용하는 서비스" 없음 (데스크톱 · 390px) | PASS |
| 2 | 비로그인 `/supplier/dashboard` · `/partner/dashboard` 직접 접근 | `/` 로 이동(개인화 화면 없음) | PASS |
| 3 | 비로그인 API `GET /neture/partner/dashboard/summary` · `/neture/supplier/me` | 401 `AUTH_REQUIRED` | PASS |
| 4 | 공급자만 승인(기존 승인 회원) 로그인 → `/neture/home/entry` | `serviceStates.supplier = {active, neture_suppliers}` · `partner = {none, none}` (기존 승인 회원 그대로 유지 · backfill 없음) | PASS |
| 5 | 공급자 로그인 홈 우상단 | 이름 + 계정 메뉴 버튼 · 메뉴 항목 `내 정보` · `O4O 로그아웃` · "내가 이용하는 서비스" 그룹에 공급자 서비스 노출 · 모바일(390px) 작은 계정 메뉴 | PASS |
| 6 | 공급자 `/supplier/dashboard` | 업무 공간 열림(게이트 testid 없음) · 사이드바 `O4O 홈으로` 링크 2(데스크톱·모바일) · 클릭 → `/` 이동 후 **토큰 · 계정 메뉴 유지(로그인 유지)** | PASS |
| 7 | 공급자 계정 `/partner/dashboard` | `service-gate-partner-none` 안내("파트너 서비스 신청이 필요합니다") + `파트너 서비스 신청` · `O4O 홈으로` 링크 · 로그아웃 버튼 없음 · 로그인 유지 | PASS |
| 8 | 공급자 계정 파트너 보호 API `GET /neture/partner/dashboard/summary` · `/neture/partner/contracts` | 401 `NO_PARTNER` (서비스 행 없음 → 차단, Neture 회원 자격 · supplier role 로는 통과 불가) | PASS |
| 9 | `/partner` · `/supplier` 랜딩(로그인 상태) | `service-apply-partner-none`(서비스 신청 패널, 회원가입 아님) · `service-apply-supplier-active`(이용 중 · 업무 공간 이동) | PASS |
| 10 | 다른 탭 로그아웃 | 탭2 홈 계정 메뉴 `O4O 로그아웃` → `POST /auth/logout` 200 · 토큰 삭제 · 탭2 비로그인 헤더 · **탭1(리로드 없이) 도 비로그인 헤더로 전환** | PASS (1차 배포에서는 FAIL → 4-3 ① 수정 후 PASS) |
| 11 | 서비스 화면(`/supplier` 랜딩 GlobalHeader 사용자 메뉴) 의 로그아웃 | 라벨 `O4O 로그아웃` 1 · 기존 `로그아웃` 라벨 0 · 클릭 → 토큰 삭제 · `/` 이동 | PASS |
| 12 | 로그아웃 뒤 뒤로가기 · 새로고침 | 뒤로가기 → `/supplier` 가 **새로 로드**(pageshow persisted 미발생) 되어 비로그인 상태(`공급자 로그인` 버튼) · 새로고침도 비로그인 · `/supplier/dashboard` 직접 접근 → `/` | PASS (bfcache 복원 자체는 운영에서 재현되지 않음 — `pageshow(persisted)` 경로는 단위 테스트로만 고정) |
| 13 | 관리자 `/operator/partners` | 페이지 렌더(`operator-partner-approval-page`) · 사이드바 `파트너 승인` 메뉴 1 · 목록 0건("해당 상태의 파트너 신청이 없습니다" — 운영 `neture_partners` 0행과 일치) · `GET /neture/operator/partners?status=pending` 200 | PASS |
| 14 | 관리자 `/neture/home/entry` | `supplier/partner = none`(관리자 role 이 있어도 서비스 상태는 미가입 — role 로 추정하지 않음) | PASS |
| 15 | 관리자 `/partner/dashboard` (서비스 행 없음) | 1차·2차 배포: `/partner/commissions*` 401 `NO_PARTNER` → auth-client refresh 경로 → 토큰 삭제 → **대표 로그아웃**(`/login` → `/`). 4-3 ② 수정 · 재배포(`34928655944`) 후: `service-gate-partner-none` 안내 표시 · 토큰 · 로그인 유지 · `/supplier/dashboard` 도 로그인 유지 (관리자 로그인 1회 SPA `/auth/login` 401 은 재시도에서 200 — 일시적, API 직접 호출 200) | PASS (수정 후) |

### 4-2. 검증하지 못한 상태 (운영 계정 없음 · 상태 변경 금지)

| 상태 | 사유 | 대체 근거 |
|---|---|---|
| 일반 O4O 회원(공급자 · 파트너 모두 미가입) | 테스트 계정 없음 | `ServiceUsageGate.test.tsx`(none → 신청 안내) · `home-entry.service-states.test.ts` · 관리자 계정의 `serviceStates none/none`(#14) 이 같은 분기 |
| 파트너만 승인 · 공급자+파트너 동시 | 운영 `neture_partners` 0행 · 신청 폼 제출 금지 | `neture-service-state.test.ts`(partner active · both) · `ServiceUsageGate.test.tsx`(supplier suspended + partner active 독립) |
| 한쪽 정지 · 반려 · 탈퇴 | 운영 상태 변경 금지 | `neture-service-state.test.ts`(SUSPENDED/REJECTED/INACTIVE 매핑) · `ServiceUsageGate.test.tsx`(pending/rejected/withdrawn 안내) · 서버 guard 는 `requireActivePartner`(active 외 403 `PARTNER_NOT_ACTIVE`) 기존 계약 |
| 운영자 파트너 승인 · 반려 실행 | 승인 대상 0건 · 상태 변경 금지 | `operator-registration.roleContract.test.ts` · `NeturePartnerServiceApplicationService` 코드 경로(pending 외 `INVALID_STATUS`) |
| 회원가입 실제 가입 | 운영 회원 생성 금지 | 기존 회원가입 모달 · API 무변경(재사용) |

### 4-3. 운영 검증에서 발견 · 수정한 것

| # | 발견 | 원인 | 수정 | 커밋 |
|---|---|---|---|---|
| ① | 탭2 에서 `O4O 로그아웃` 하면 `/auth/logout` 200 인데 토큰이 되살아나 두 탭 모두 로그인 상태로 남음 | 다른 탭(탭1) 의 신규 `storage` 리스너가 `refresh()` → `getAccessToken()` 호출. `clearAllTokens()` 는 키를 순차 삭제하므로 `o4o_accessToken` 삭제 이벤트 시점에 legacy `admin-auth-storage` 가 남아 있고, `getAccessToken()` 의 **legacy 자동 이관**이 access token 을 다시 기록 | `AuthContext` storage 리스너: `o4o_accessToken` 삭제(newValue=null) · `clear()` 는 storage 재조회 없이 `setUser(null)`, 값이 생긴 경우만 `refresh()` · `AuthContext.crossTab.test.tsx` 5 | `6ea6f4494` |
| ② | 관리자(neture:admin, 서비스 행 없음) 가 `/partner/dashboard` 에 들어가면 대표 로그아웃됨 | 게이트의 관리자 통과 예외(서버 guard 에는 없는 예외) → 업무 화면 API 401 `NO_PARTNER` → auth-client 401 refresh 경로 → `/auth/refresh` 401 → `clearAllTokens()`. 종전 `PARTNER_ACCESS_ROLES` 에도 admin 이 있어 **기존에도 같은 연쇄**였음 | `ServiceUsageGate` 관리자 예외 제거(서비스 상태만 판정 · 운영 조회는 `/operator/*`) · 테스트 갱신 | `cc53d5099` |

- ② 의 근본(서비스 행 없음을 401 로 응답 → 클라이언트가 인증 실패로 오인해 refresh · 로그아웃) 은 기존 API 계약(`NO_SUPPLIER` · `NO_PARTNER` 401) 이라 이번 범위에서 바꾸지 않았다 → **별도 WO 제안**: 인증은 유효하고 서비스 자격만 없는 경우 403 으로 정정 + `getAccessToken()` legacy 자동 이관의 삭제 순서 경합 제거.
- 공급자 대시보드 진입 시 "공급자 정보를 등록해 주세요" 모달(프로필 필수 항목 누락 안내) 은 기존 동작이며 이번 변경과 무관(캡처 `03`).

## 5. Git

| 커밋 | 내용 | 배포 |
|---|---|---|
| `4a22be517` | 본 구현(서버 · 프론트 · 공통 패키지 라벨 prop · CHECK 초안) 34 files | API `34926197544` success · Web `34926197562` success |
| `6ea6f4494` | 다른 탭 로그아웃 되돌림 경합 수정(AuthContext storage 리스너) + vitest 5 | Web `34928086872` success |
| `cc53d5099` | ServiceUsageGate 관리자 통과 제거 + 테스트 갱신 | Web `34928655944` success |
| (본 커밋) | CHECK §3 · §4 · §5 기록 | 문서만 |

- 작업 트리: `C:/tmp/o4o-neture-acct-sep`(detached, main 직접 push) · 모든 커밋 pathspec 지정 · `check-staged-scope.mjs` 통과.
- 완료 조건: 이번 WO 범위 미커밋 0건 · `HEAD == origin/main`.
- 저장소 내 다른 세션의 미추적 파일(`docs/checks/CHECK-O4O-STORE-TABLET-...`, `scripts/e2e/`) 은 불가침 · 미접촉.
