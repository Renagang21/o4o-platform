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
| `components/auth/ServiceUsageGate.tsx` (신규) | 업무 공간 게이트: active 만 통과 · 그 외 상태별 안내 + `O4O 홈으로`(로그인 유지). 로그아웃 버튼 없음. 관리자는 통과 |
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
| web-neture | `npx vitest run --config services/web-neture/vitest.config.mjs` | 4 files · 36 passed (신규 `ServiceUsageGate.test.tsx` 8 · `home-entry.service-states.test.ts` 8 · 기존 20) |
| web-neture | `tsc --noEmit` · `vite build` | 0 errors · built |
| packages/ui · packages/account-ui | `tsc --noEmit` | 0 errors |
| api-server `tsc --noEmit` | 변경 파일 오류 0. 워크트리 미빌드 `@o4o/security-core` TS2307 · `copilot-engine.service.ts` 3건은 기존 · 무관(`ref-api-server-build-deps-incomplete`) |

신규 테스트가 고정하는 것: role 문자열이 있어도 상태 none 이면 신청 안내 · 한 서비스 정지가 다른 서비스 게이트에 영향 없음 · 조회 실패는 미가입 아님 · pending/rejected/withdrawn 라벨 · 관리자 통과 · 홈 모델의 서비스별 그룹 분기.

## 4. 실 화면 검증 (운영, 배포 후)

_배포 후 기록._

## 5. Git

_커밋 후 기록._
