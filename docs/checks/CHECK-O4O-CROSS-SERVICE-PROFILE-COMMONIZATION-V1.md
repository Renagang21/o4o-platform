# CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1

> **WO**: [`WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1`](../work-orders/WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1.md)
> **선행 감사**: [`CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1`](CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1.md)
> **작업일**: 2026-08-18
> **기준선**: `origin/main` (작업 시작 시점 최신 — 특정 과거 commit 기준 아님)
> **상태**: ACTIVE · 판정 **CLOSED_WITH_FOLLOWUPS** (코드 수렴 완료 / 배포 후 브라우저 스모크 잔여)

---

## 1. 전체 census — 기능 단위 × 5 서비스

판정 라벨: `FULLY_COMMON` (공통 컴포넌트 소비) · `CORE_ONLY` (공통 계층은 있는데 미채택)
· `VIEW_DUPLICATED` (서비스별 복제 구현) · `SERVICE_SPECIFIC` (업무상 고유)
· `NOT_IMPLEMENTED` (기능 없음) · `OUT_OF_SCOPE` (본 WO 범위 밖)

**미조사 0** — 아래 10 기능 단위 × 5 서비스 = 50 칸 전부 판정했다.

### 1-1. Before (작업 전)

| # | 기능 단위 | KPA-Society | GlycoPharm | K-Cosmetics | Neture | Pharmacy-Hub |
|:--:|---|---|---|---|---|---|
| 1 | 기본 개인정보 (이름/성명) | VIEW_DUPLICATED | VIEW_DUPLICATED | VIEW_DUPLICATED | VIEW_DUPLICATED | VIEW_DUPLICATED |
| 2 | 연락처 | VIEW_DUPLICATED | VIEW_DUPLICATED | VIEW_DUPLICATED | NOT_IMPLEMENTED | VIEW_DUPLICATED |
| 3 | 닉네임 | VIEW_DUPLICATED | VIEW_DUPLICATED | VIEW_DUPLICATED | NOT_IMPLEMENTED | VIEW_DUPLICATED |
| 4 | 직역 · 면허 | SERVICE_SPECIFIC | VIEW_DUPLICATED (면허 read-only 행) | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 5 | 사업자정보 (`users.businessInfo`) | SERVICE_SPECIFIC | VIEW_DUPLICATED | VIEW_DUPLICATED | SERVICE_SPECIFIC | NOT_IMPLEMENTED |
| 6 | 매장정보 (`organizations`) | SERVICE_SPECIFIC | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | SERVICE_SPECIFIC |
| 7 | 서비스 membership · 신청 내역 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | NOT_IMPLEMENTED |
| 8 | 비밀번호 변경 | VIEW_DUPLICATED (인라인 폼) | VIEW_DUPLICATED | VIEW_DUPLICATED | VIEW_DUPLICATED | FULLY_COMMON |
| 9 | 계정 상태 · 탈퇴 | NOT_IMPLEMENTED (탈퇴) | NOT_IMPLEMENTED (탈퇴) | NOT_IMPLEMENTED (탈퇴) | NOT_IMPLEMENTED (탈퇴) | NOT_IMPLEMENTED (탈퇴) |
| 10 | 서비스별 고유 profile | SERVICE_SPECIFIC | SERVICE_SPECIFIC | SERVICE_SPECIFIC | SERVICE_SPECIFIC | SERVICE_SPECIFIC |

부속 판정 (같은 축의 보조 화면):

| 화면 | Before |
|---|---|
| 로그인 필요 안내 블록 (GP/KCos/Neture × Profile·Settings, 6개소) | VIEW_DUPLICATED |
| 보안 설정 / 모든 기기 로그아웃 본문 (GP/KCos/Neture) | VIEW_DUPLICATED |
| MyPageHub · MyRequests (GP/KCos/Neture/KPA) | FULLY_COMMON (기존 공통 소비) |

### 1-2. After (작업 후)

| # | 기능 단위 | KPA-Society | GlycoPharm | K-Cosmetics | Neture | Pharmacy-Hub |
|:--:|---|---|---|---|---|---|
| 1 | 기본 개인정보 | SERVICE_SPECIFIC ※1 | **FULLY_COMMON** | **FULLY_COMMON** | **FULLY_COMMON** | **FULLY_COMMON** |
| 2 | 연락처 | SERVICE_SPECIFIC ※1 | **FULLY_COMMON** | **FULLY_COMMON** | NOT_IMPLEMENTED | **FULLY_COMMON** |
| 3 | 닉네임 | SERVICE_SPECIFIC ※1 | **FULLY_COMMON** | **FULLY_COMMON** | NOT_IMPLEMENTED | **FULLY_COMMON** |
| 4 | 직역 · 면허 | SERVICE_SPECIFIC | **FULLY_COMMON** (`licenseField`) | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 5 | 사업자정보 | SERVICE_SPECIFIC ※2 | **FULLY_COMMON** | **FULLY_COMMON** | SERVICE_SPECIFIC ※3 | NOT_IMPLEMENTED |
| 6 | 매장정보 | SERVICE_SPECIFIC ※4 | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | SERVICE_SPECIFIC ※4 |
| 7 | 서비스 membership · 신청 내역 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | NOT_IMPLEMENTED |
| 8 | 비밀번호 변경 | **FULLY_COMMON** | **FULLY_COMMON** | **FULLY_COMMON** | **FULLY_COMMON** | FULLY_COMMON |
| 9 | 계정 상태 · 탈퇴 | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 10 | 서비스별 고유 profile | SERVICE_SPECIFIC | SERVICE_SPECIFIC | SERVICE_SPECIFIC | SERVICE_SPECIFIC | SERVICE_SPECIFIC |

| 화면 | After |
|---|---|
| 로그인 필요 안내 블록 6개소 | **FULLY_COMMON** (`MyPageAuthRequired`) |
| 보안 설정 / 모든 기기 로그아웃 본문 (GP/KCos/Neture) | **FULLY_COMMON** (`AccountSecuritySettings`) |

**완료 판정**

- 미조사: **0**
- `VIEW_DUPLICATED`: **0**
- `CORE_ONLY`: **0** (신설 4 컴포넌트 모두 최소 1개 서비스가 실제 소비)
- `NOT_IMPLEMENTED` 은 "기능이 없음" 이므로 공통화 대상이 아니다 (탈퇴 · Neture 연락처/닉네임 등).

---

## 2. 공통화한 기능 (Profile Core)

신규 패키지를 만들지 않았다. 기존 **`@o4o/account-ui`** 안에 4 컴포넌트를 추가했다
(→ `package.json` · lockfile · Dockerfile 선별 COPY 변경 없음 = WO §5 중지 조건 회피).

| 컴포넌트 | 해소한 중복 | 채택 서비스 |
|---|---|---|
| `AccountProfileSection` | `ProfileCard` + `ProfileInfoField` 목록 + 편집/저장 상태기계 **4벌** | GP · KCos · Neture · PH |
| `BusinessProfileSection` | 95% 동일하던 사업자정보 화면 **2벌** (488 L + 475 L) | GP · KCos |
| `AccountSecuritySettings` | 보안 설정 / 모든 기기 로그아웃 본문 **3벌** | GP · KCos · Neture |
| `MyPageAuthRequired` | "로그인이 필요합니다" 블록 **6개소** | GP(2) · KCos(2) · Neture(2) |
| `SecuritySection` + `PasswordChangeModal` (기존) | KPA 인라인 비밀번호 변경 폼 → 공통 모달 | KPA |

### 서비스 차이의 표현 방식 (분기 대신 props)

- **용어**: `entityLabel` ('약국' / '매장'), `businessEmailLabel` ('회사 대표 이메일')
- **색**: `accent` 정적 class map (`emerald` / `pink`) — Tailwind 는 동적 문자열을 인식하지 않으므로 map 고정
- **API**: `load` / `save` / `onSave` / `onChangePassword` adapter 주입. account-ui 는 서비스 apiClient 를 알지 못한다
- **라우팅**: `react-router-dom` 은 peerDependency 이므로 `Link` 를 직접 import 하지 않고 `renderLink` 로 주입
- **피드백**: `onError` 주입 시 toast(GP/KCos/Neture), 생략 시 인라인 배너(PH)
- **선택 요소**: `licenseField`(GP 약사면허 read-only) · `showTwoFactorNotice`(GP) · `securityDescription`(KCos)

### 부수 수정 2건 (공통화에 필요한 최소 범위)

1. `PasswordChangeModal` 오류 메시지 추출에 `err.message` fallback 추가
   — KPA `mypageApi.changePassword` 는 `Error` 를 던지므로 fallback 없이는 원인 메시지가 사라진다.
2. `BusinessProfileSection` 의 `load` 를 `useRef` 로 고정
   — 호출자가 인라인 화살표로 넘겨도 재조회 루프가 생기지 않게 한다.

---

## 3. 서비스별 Extension (그대로 둔 것)

| 서비스 | Extension | 형태 |
|---|---|---|
| KPA | 탭 UI(기본/직역), 약사면허·직역 select·출신교·근무처, `pharmacy_owner` businessInfo 편집(`AddressSearch`), 소속 조직 목록 | `MyProfilePage` 내부 유지 |
| KPA | 알림 설정 토글(email/SMS/마케팅) + 모든 기기 로그아웃 | `MySettingsPage` 유지 |
| GlycoPharm | 약사면허번호 read-only 행 | 공통 `licenseField` prop 으로 표현 |
| K-Cosmetics | 매장 신청 · LMS 수강 신청 병합 | 기존 `MyRequestsInbox` 소비 |
| Neture | 공급자 프로필(1,285 L, `SupplierProfilePage`) | `MyBusinessProfilePage` 래핑 유지 |
| Pharmacy-Hub | `NotificationBell` · 세션(로그아웃) 블록 · 매장 정보(`organizations`) | 유지 |

---

## 4. 남긴 SERVICE_SPECIFIC 사유

| 대상 | 사유 |
|---|---|
| ※1 KPA 기본정보(이름/연락처/닉네임) | KPA 는 **탭 UI + 이메일 편집 + 서비스 테마 토큰(`styles` 객체) 기반 InfoRow** 로, 다른 4 서비스의 `ProfileCard` 관용구와 화면 골격 자체가 다르다. 강제 수렴은 KPA UX 를 바꾸는 구조 변경이라 본 WO 범위를 넘는다. **동일 복제가 아니므로 `VIEW_DUPLICATED` 가 아니다.** |
| ※2 KPA 사업자정보 | `pharmacy_owner` 전용으로 직역 탭 안에 들어가 있고 `AddressSearch` 기반 주소 3분할 · `setActivityType` → `PATCH /auth/me/profile` 경로를 쓴다. GP/KCos 의 `PATCH /{svc}/mypage/business-info` 와 write path 가 다르다. |
| ※3 Neture 공급자 프로필 | 공급자 계약·정산·유통 축까지 포함한 1,285 L 도메인 화면. 계정 프로필 축이 아니다. |
| ※4 KPA/PH 매장정보 | 둘 다 `organizations` 를 SSOT 로 쓰지만 필드 집합과 정책이 다르다 — PH 는 `editableFields` / `not_connected` / `ambiguous` 연결 상태와 조직 코드·서비스 연결·공개 매장 주소를 다루고, KPA 는 약국 기본 정보만 다룬다. 공통화하면 한쪽에 없는 정책을 강요한다. |
| 탈퇴 (5 서비스) | 백엔드 API 부재. 과거 mock stub 은 `WO-O4O-MYPAGE-TIER1-DEAD-STUB-CLEANUP-V1` 에서 제거됨. 재도입은 별도 WO. |

---

## 5. API · backend 변경

**없음.** 백엔드 파일 0건 변경.

기존 계약을 그대로 호출한다.

| 서비스 | 기본 프로필 | 비밀번호 | 사업자정보 |
|---|---|---|---|
| GlycoPharm | `PUT /users/profile` | `PUT /users/password` (`serviceKey: 'glycopharm'`) | `GET·PATCH /glycopharm/mypage/business-info` |
| K-Cosmetics | `PUT /users/profile` | `PUT /users/password` (`serviceKey: 'k-cosmetics'`) | `GET·PATCH /cosmetics/mypage/business-info` |
| Neture | `PUT /users/profile` | `PUT /users/password` (`serviceKey: 'neture'`) | — |
| Pharmacy-Hub | `PATCH /pharmacy-hub/store-owner/account/profile` | `PUT /users/password` (`serviceKey` 주입, 기존 모듈) | — |
| KPA | `mypageApi.updateProfile` (`/mypage/profile`) | `mypageApi.changePassword` (`serviceKey: 'kpa-society'`) | `PATCH /auth/me/profile` |

`serviceKey` 주입은 화면별로 그대로 유지했다 — 공통 컴포넌트가 serviceKey 를 알지 못하게 해
`WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1` 의 서비스 범위 격리를 보존한다.

---

## 6. 데이터 정본 변경 여부

**변경 없음.**

- 테이블 · 컬럼 · migration · seed **0건**.
- `users` / `service_memberships` / `service_credentials` / `organizations` / `users.businessInfo` 의
  소유권과 write path 는 선행 감사(§6) 상태 그대로다.
- 선행 감사의 P0(D-1 `users.updated_at`, D-2 KPA 승인 sync `catch` 삼킴) · P1(D-3~D-6) 은
  **본 WO 범위 밖**이며 이번 작업에서 건드리지 않았다. 별도 WO 후보로 남는다.

---

## 7. 검증 결과

### 7-1. typecheck (`tsc --noEmit -p tsconfig.json`)

| 대상 | 결과 |
|---|---|
| `packages/account-ui` (`tsc --build`) | PASS |
| `services/web-glycopharm` | PASS |
| `services/web-k-cosmetics` | PASS |
| `services/web-neture` | PASS |
| `services/web-pharmacy-hub` | PASS |
| `services/web-kpa-society` | PASS |

### 7-2. build (`npm run build`)

| 대상 | 결과 |
|---|---|
| `services/web-glycopharm` | OK |
| `services/web-k-cosmetics` | OK |
| `services/web-neture` | OK |
| `services/web-pharmacy-hub` | OK |
| `services/web-kpa-society` | OK |

### 7-3. 화면 계약 대조 (정적)

전환 전/후 필드 집합 · 라벨 · 편집 가능 여부 · placeholder · 안내 문구를 1:1 대조했다.

- GP 기본정보 7행(이메일 ro / 성 / 이름 / 닉네임 + 공개 안내 / 연락처 / 역할 ro / 상태 ro) 보존
- KCos 기본정보 5행, Neture 3행, PH 4행 보존
- GP 사업자정보 14행 · KCos 13행, read-only 배지("변경 불가"), 면허 안내문 보존
- 비밀번호 변경 검증 규칙(일치 · 8자 이상)과 KPA 의 "현재 비밀번호가 올바르지 않습니다" 메시지 매핑 보존
- serviceKey 주입값 3종(glycopharm / k-cosmetics / neture) 보존

### 7-4. 브라우저 검증 — **미수행 (숨기지 않고 명시)**

WO §6-1 / §6-2 의 실브라우저 스모크를 **수행하지 못했다.**

사유: 이 변경은 아직 배포되지 않았고, 로컬 dev 서버에는 API 프록시가 없다
(`VITE_API_BASE_URL` 이 원격 Cloud Run 을 직접 가리킨다). 로그인은 쿠키 기반이라
localhost ↔ 원격 API 조합에서는 CORS · 쿠키 도메인 문제로 실제 로그인 흐름을 재현할 수 없다.
가짜 통과를 보고하지 않기 위해 **미수행으로 남긴다.**

→ §9 MUST_FIX_BEFORE_CLOSE 로 이월.

---

## 8. 변경 파일

**신규 (4)**

- `packages/account-ui/src/components/AccountProfileSection.tsx`
- `packages/account-ui/src/components/BusinessProfileSection.tsx`
- `packages/account-ui/src/components/AccountSecuritySettings.tsx`
- `packages/account-ui/src/components/MyPageAuthRequired.tsx`

**수정 (12)**

- `packages/account-ui/src/index.ts` (export 추가)
- `packages/account-ui/src/components/PasswordChangeModal.tsx` (오류 메시지 fallback)
- `services/web-glycopharm/src/pages/mypage/MyProfilePage.tsx` · `MySettingsPage.tsx` · `pages/store/PharmacyInfoPage.tsx`
- `services/web-k-cosmetics/src/pages/mypage/MyProfilePage.tsx` · `MySettingsPage.tsx` · `pages/store/StoreInfoPage.tsx`
- `services/web-neture/src/pages/mypage/MyProfilePage.tsx` · `MySettingsPage.tsx`
- `services/web-pharmacy-hub/src/pages/store-owner/AccountPage.tsx`
- `services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx`

**미변경 (의도적)**

- 백엔드 (`apps/api-server`) 전체
- `package.json` · lockfile · Dockerfile · CI
- DB schema · migration · seed
- 직전 slug WO(`WO-O4O-KCOS-GP-MISSING-STORE-SLUG-CANONICALIZATION-V1`)의 잔존 위험 5건 — 범위 밖

---

## 9. 잔여 MUST_FIX_BEFORE_CLOSE

| # | 항목 | 성격 |
|:--:|---|---|
| 1 | 배포 후 5 서비스 프로필·설정·사업자정보 화면 실브라우저 스모크 (조회 → 수정 → 저장 → 재조회, 비밀번호 변경 모달, 로그인 필요 안내) | 검증 (본 WO 코드 범위는 완료) |
| 2 | 선행 감사 P0 D-1 (`users.updated_at` write) · D-2 (KPA 승인 sync `catch` 삼킴) | 별도 WO |
| 3 | 선행 감사 P1 D-3~D-6 (주소 키 비대칭 · `pharmacyPhone` 비대칭 · KPA operator write 비원자성 · `organizations` 이중 실체) | 별도 WO |
| 4 | 계정 탈퇴 백엔드 API 부재 (5 서비스 공통 NOT_IMPLEMENTED) | 별도 WO |
| 5 | KPA 기본정보 탭 UX 를 공통 `AccountProfileSection` 축으로 정렬할지 여부 | 정책 판단 → 별도 WO |

---

## 10. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 6건 (§9 · §11-6).

---

## 11. 추가 기록 — Production 잔여 결함 1건 (PharmacyHub operator profile entry)

> 본 WO 범위 안에서 처리했다(별도 WO 로 분리하지 않음).

### 11-1. 결함

PharmacyHub 에 `pharmacy-hub:operator` 계정으로 로그인하면 GlobalHeader 사용자 드롭다운에
`서비스 운영자` · `가입 상태` · `로그아웃` 만 노출되고 **개인 Profile 진입점이 없었다.**
운영자는 Profile Core 에 접근할 수 없는 상태였다.

### 11-2. 현재 main 재확인 결과

| # | 확인 항목 | 결과 |
|:--:|---|---|
| 1 | operator 용 canonical 개인 Profile route 존재 여부 | **없음.** 개인 계정 화면은 `/store-owner/account` 하나뿐 |
| 2 | `PharmacyHubGlobalHeader.tsx` 의 계정 진입점 게이트 | 확인됨 — `{isStoreOwner && ...}` 로 `내 계정`(/store-owner/account) 게이트. 주석에 "유일한 계정 화면" 명시 |
| 3 | `App.tsx` 의 account route 위치 | 확인됨 — `/store-owner` 셸(StoreOwnerGuard) 하위. 메뉴만 열면 operator 는 API 403 |
| 4 | `AccountProfileSection` 을 쓰는 별도 공통/운영자 profile route | **없음** |
| 5 | `/store-owner/account` 가 store_owner 전용 도메인 화면인가 | **아니다.** 화면 내용은 `users` 축(이름·닉네임·연락처·이메일·비밀번호)뿐이고 매장 정보는 `/store-owner/info` 소관. 즉 **위치만 매장 셸**이었다 |
| 6 | 나머지 4서비스 동일 결함 | **없음** — KPA `KpaUserMenu.tsx` · GP `GlycoGlobalHeader.tsx` · KCos `KCosGlobalHeader.tsx` · Neture `NetureUserMenu.tsx` 모두 역할 게이트 없이 `/mypage` 노출. 재확인만 하고 미변경 |

**백엔드 경계 (변경하지 않음)**

- `GET·PATCH /api/v1/pharmacy-hub/store-owner/account/profile` 은 `requirePharmacyHubScope('pharmacy-hub:store_owner')` 뒤에 있다.
- `PHARMACY_HUB_SCOPE_CONFIG.scopeRoleMapping` 에서 `store_owner` 는 **store_owner 만** 만족한다(operator/admin 대리 없음 — Foundation 설계 의도).
- 공통 `/api/v1/users/*` 는 `/password` · `/me/contact` 를 제외하면 전부 `requireAdmin` 뒤이고, `PATCH /auth/me/profile` 은 KPA 직역(activityType) 전용이다.
- → **모든 로그인 사용자가 본인 name/nickname/phone 을 수정할 수 있는 공통 계약이 없다.**

### 11-3. 수정 (frontend only)

| 파일 | 내용 |
|---|---|
| `services/web-pharmacy-hub/src/pages/account/MyProfilePage.tsx` (신규) | 개인 계정 화면 본체. Profile Core(`AccountProfileSection` + `SecuritySection` + `PasswordChangeModal` + `MyPageAuthRequired`) 사용 |
| `services/web-pharmacy-hub/src/pages/store-owner/AccountPage.tsx` | 242L → **thin wrapper**. `<MyProfilePage showNotifications />` 만 렌더 — 화면 두 벌 금지 |
| `services/web-pharmacy-hub/src/App.tsx` | 공개 셸 하위 canonical route `/account` 추가 |
| `services/web-pharmacy-hub/src/components/PharmacyHubGlobalHeader.tsx` | `isStoreOwner` 게이트 제거 → 모든 로그인 사용자에게 **`내 프로필`**(/account) 노출 |
| `packages/account-ui/src/components/ProfileCard.tsx` | `canEdit?: boolean` (기본 true) — false 면 수정 버튼 미렌더 |
| `packages/account-ui/src/components/AccountProfileSection.tsx` | 편집 가능 필드가 0 이면 `canEdit=false` 전달 (빈 편집 모드 진입 방지) |

**설계 판단**

- `/store-owner/account` URL 은 유지한다 — 공통 `store-ui-core` 매장 사이드바(설정 › 내 계정)가 이 URL 을 가리킨다. F3 Store Layer 공통 config 는 건드리지 않았다.
- 편집 가능 여부는 **역할 하드코딩이 아니라 서버 응답**으로 결정한다. `GET .../account/profile` 200 → 편집 가능, 403 → 조회 전용 폴백(세션 `GET /auth/me` 값). StoreOwnerGuard 도 backend scope 도 완화하지 않았다.
- 이 화면은 `users` 축만 렌더한다. 매장·사업자 정보(`organizations`)는 포함하지 않으므로 **operator 에게 store_owner 전용 자산이 노출되지 않는다.**

### 11-4. 용어 축

- PharmacyHub 사용자 드롭다운의 개인 계정 진입점 명칭 = **`내 프로필`** (기존 `내 계정` 에서 변경).
- `내 약국` / `매장 정보` / `사업자 정보` 는 역할·도메인 화면으로 분리 유지.
- 나머지 4서비스의 `마이페이지` 라벨은 이번에 변경하지 않았다 → §11-6 후속 항목.

### 11-5. 검증

| 항목 | 결과 |
|---|---|
| `@o4o/account-ui` `tsc --build` | PASS |
| `web-pharmacy-hub` `tsc --noEmit` | PASS |
| `web-pharmacy-hub` `npm run build` | PASS |
| `web-kpa-society` · `web-glycopharm` · `web-k-cosmetics` · `web-neture` `tsc --noEmit` | PASS (ProfileCard 변경은 additive · 기본값 true) |
| 모바일/데스크톱 노출 | 코드 확인 — 공통 `GlobalHeader` 는 데스크톱 드롭다운과 모바일 drawer 양쪽에 `userMenuItems` 를 렌더하며 PH 는 `showMobileUserMenu` 를 끄지 않는다 |
| 기존 store_owner / admin / supplier 메뉴 | 미변경 (`내 약국` · `관리자 대시보드` · `운영 대시보드` · `공급자` 항목 그대로) |
| **실브라우저 스모크** | **미수행** — 미배포 상태이며 로컬 dev 에 API 프록시가 없고(`VITE_API_BASE_URL` 이 원격 지정) 쿠키 기반 세션이 localhost 로 넘어오지 않는다. 숨기지 않고 §11-6 에 MUST_FIX 로 남긴다 |

### 11-6. 잔여 MUST_FIX_BEFORE_CLOSE (추가)

| # | 항목 | 성격 |
|:--:|---|---|
| 6 | **operator 본인 프로필 수정 계약 부재** — 현재 operator/supplier 는 `/account` 에서 **조회 + 비밀번호 변경만** 가능하고 이름·닉네임·연락처 수정은 불가하다. 해소하려면 backend 에 "PH 회원 본인" scope 의 self-profile 계약이 필요하다(예: `PharmacyHubAccountController` 를 store_owner scope 가 아닌 membership-active scope 경로에도 등록). 본 WO 는 backend 변경 금지 조건이라 **수행하지 않았다** | 승인 필요 (backend) |
| 7 | 배포 후 PharmacyHub 실브라우저 스모크 — operator/store_owner/supplier/admin 각 역할로 드롭다운 `내 프로필` → `/account` 200 · 조회 · (store_owner) 수정·저장·새로고침 유지 · 비밀번호 모달 · 모바일 drawer | 검증 |
| 8 | 나머지 4서비스 `마이페이지` ↔ PharmacyHub `내 프로필` 라벨 축 정렬 여부 | 정책 판단 → 별도 WO |

**추가 발견 (범위 밖 · 미수정, 보고만)**

GP / KCos / Neture 의 `MyProfilePage` 저장 경로 `PUT /api/v1/users/profile` 은 backend `users.routes.ts` 에 해당 route 가 없어 `router.use(requireAdmin)` 뒤의 `PUT /:id` 로 떨어진다. 일반 사용자에게는 403(또는 UUID 검증 400)이 예상된다. **본 WO 이전부터 있던 상태**이며 이번 공통화가 만든 회귀가 아니다(어댑터가 기존 호출을 그대로 옮겼다). 교정은 backend 변경이 필요하므로 별도 승인 대상이다.
