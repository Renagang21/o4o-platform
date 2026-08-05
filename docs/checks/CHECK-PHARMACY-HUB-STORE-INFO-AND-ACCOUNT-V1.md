# CHECK — WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1

> Pharmacy-Hub 매장 경영자 — 매장 정보 조회·수정 (범위 A) + 사용자 계정·비밀번호·알림·로그아웃 (범위 B)

| 항목 | 값 |
|------|------|
| WO | `WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1` |
| 검증일 | 2026-08-05 |
| 환경 | 프로덕션 (`https://pharmacyhub.co.kr` · `https://api.neture.co.kr`) |
| 커밋 | `d69998cda` (구현) · `76b5a2271` (pnpm-lock 정렬) · `932ee4bae` (계정 프로필 엔드포인트 정정) |
| 결과 | **PASS** |

---

## 1. 구현 범위

### 범위 A — 매장 정보 `/store-owner/info`

| 계층 | 산출물 |
|------|--------|
| resolver | `apps/api-server/src/controllers/pharmacy-hub/store-organization.resolver.ts` (신규) |
| controller | `PharmacyHubStoreInfoController.ts` (신규) |
| route | `GET|PATCH /api/v1/pharmacy-hub/store-owner/info` (`storeOwnerGuards`) |
| 화면 | `services/web-pharmacy-hub/src/pages/store-owner/StoreInfoPage.tsx` |

SSOT — 매장 정보 `organizations` / 서비스 연결 `organization_service_enrollments` / 공개 매장 주소 `platform_store_slugs`.
`users.businessInfo` 는 **읽지도 쓰지도 않는다** (매장 SSOT 아님).

수정 allowlist = `name · phone · address · addressDetail · description`.
읽기 전용 = `code` · `businessNumber` · `slug` · `isActive` (사유를 화면에 명시).

> **`businessNumber` 를 읽기 전용으로 둔 이유** — 사업자등록번호는 가입 심사 근거이며
> 매장이 단독으로 바꿀 값이 아니다 (K-Cosmetics 플랫폼 정책과 동일). 신청 시점 기재값은
> `users.businessInfo` 에 있으나 이 WO 는 그것을 매장 SSOT 로 승격하는 것을 금지한다.

### 범위 B — 내 계정 `/store-owner/account`

| 항목 | 계약 |
|------|------|
| 프로필 조회·수정 | `GET|PATCH /api/v1/pharmacy-hub/store-owner/account/profile` (allowlist `name·nickname·phone`) |
| 비밀번호 변경 | **기존 공통 계약** `PUT /api/v1/users/password` (`serviceKey='pharmacy-hub'` → V2 `service_credentials`) |
| 알림 | **기존 공통 계약** `/api/v1/notifications` (`NotificationApiClient` 주입) |
| UI | `@o4o/account-ui` (ProfileCard · ProfileInfoField · SecuritySection · PasswordChangeModal · NotificationBell · useNotifications) |
| 로그아웃 | 기존 `AuthContext.logout()` |

> **프로필만 PH scope 인 이유 (설계 정정 기록)** — 최초 구현은 `GET|PUT /api/v1/users/profile`
> 을 가정했으나 **그 경로는 존재하지 않는다.** `users.routes.ts` 는 `/password` 를 제외한
> 모든 라우트를 `router.use(requireAdmin)` 뒤에 두므로 `/users/profile` 요청은 admin 전용
> `GET /:id` 에 매칭되어 `403 Admin privileges required` 를 반환한다 (프로덕션 스모크에서 실측).
> 공통 가드 정책 변경은 이 WO 의 **변경 금지 항목**이므로 건드리지 않고, `users` 의 **자기 행만**
> 다루는 PH service-scoped 최소 계약을 추가했다. `PUT /api/v1/kpa/mypage/profile` 은 KPA 전용이라
> 재사용 대상이 아니다. 비밀번호·알림은 공통 계약 그대로다.

### 메뉴

`packages/store-ui-core/src/config/storeMenuConfig.ts` 의 **`PHARMACY_HUB_STORE_CONFIG` 안에만**
`설정 > 매장 정보 / 내 계정` 추가. 타 서비스 config 는 diff 0 — "준비 중" 메뉴 0, KPA 전용
계정·자격·면허·분회 메뉴 미도입.

---

## 2. 조직 결정 (보안 계약)

홈 요약 · 정보 조회 · 정보 수정이 **동일 해석기**(`resolvePharmacyHubStoreOrganization`)를 쓴다
— "보이는 매장 ≠ 저장되는 매장" 을 구조적으로 차단한다.

```
organization_members (owner|admin|manager, left_at IS NULL)
  → organizations
  → organization_service_enrollments (service_code='pharmacy-hub', status='active')
  ORDER BY o.id
```

| 후보 수 | GET | PATCH |
|:---:|------|------|
| 0 | 200 `status='not_connected'` 안내 | 409 `STORE_NOT_CONNECTED` |
| 2+ | 200 `status='ambiguous'` 안내 | 409 `AMBIGUOUS_STORE_CONNECTION` |
| 1 | 조회 | 수정 |

- 클라이언트가 보낸 `organizationId` 는 **신뢰하지 않는다.** allowlist 밖이므로 400 `FIELD_NOT_EDITABLE`.
- 폴백 금지 5종(K-Cosmetics 조직 / KPA 약국 조직 / Neture 공급자 조직 / `users.businessInfo` /
  일반 `organization_members` LIMIT 1) 미사용.
- 공통 `resolveStoreAccess()` · `isStoreOwner()` 는 **변경하지 않았다** (비결정적 `LIMIT 1` 이슈는 별건).

---

## 3. 프로덕션 검증

### 3-1. 미인증

| 검증 | 결과 |
|------|:----:|
| `GET /pharmacy-hub/store-owner/info` (토큰 없음) | 401 |
| `PATCH /pharmacy-hub/store-owner/info` (토큰 없음) | 401 |
| 로그아웃 후 `GET .../info` | 401 |

### 3-2. 미연결 계정 (`renagang21@gmail.com` — PH enrollment 0, 타 서비스 조직 3개 보유)

| 검증 | 결과 |
|------|:----:|
| `/store-owner/info` 화면 | "연결된 매장이 없습니다." 안내 + `내 가입 상태 보기` 링크 |
| 타 서비스 조직 노출 (테스트 약국 / 테스트 뷰티샵 / (주)네뚜레 공급자 테스트) | **0건 — 누출 없음** |
| 수정 UI 렌더 | 없음 |
| `PATCH .../info {name}` | 409 `STORE_NOT_CONNECTED` |
| `PATCH .../info {organizationId, name}` | 400 `FIELD_NOT_EDITABLE` (다른 서비스 조직 지목 차단) |
| `PATCH .../account/profile {userId, name}` | 400 `FIELD_NOT_EDITABLE` |
| `PATCH .../account/profile {email}` | 400 `FIELD_NOT_EDITABLE` |
| `PATCH .../account/profile {}` | 400 `NO_CHANGES` |
| 계정 화면 (프로필·알림·비밀번호 모달·로그아웃) | 정상 렌더 · 알림 0건 정상 · 이메일 필드 읽기 전용 |
| 이 계정에 대한 DB write | **0** |

### 3-3. 연결된 단일 조직 계정 (전용 E2E 계정 — 사용자 승인 하 write 검증)

대상: user `5ee37566-…4e014` / org `c5e3a37a-…60ed50` (PH enrollment 정확히 1건) /
credential row `a4bf6a85-…c846e97e23e`.

| 순서 | 검증 | 결과 |
|:---:|------|:----:|
| 1 | 원본 보존 (org 값 · credential hash md5 · `updatedAt`) | 백업 md5 = DB md5 일치 (60자) |
| 2 | 임시 비밀번호 설정 → PH 로그인 | 성공 |
| 3 | `/store-owner/info` 조회 | 매장명·조직 코드·`pharmacy-hub · active`·공개 매장 주소 정상 |
| 4 | 수정 저장 (연락처·우편번호·기본/상세 주소·소개) | "매장 정보를 저장했습니다." |
| 5 | 재조회 (화면 새로고침 + DB) | 화면·DB 일치 (`address_detail` JSON 3키 포함) |
| 6 | 계정 프로필 수정 → 재조회 → 원복 | 저장·반영·원복 모두 성공 |
| 7 | 비밀번호 변경 — 잘못된 현재 비밀번호 | 서버 메시지 그대로 노출, write 0 |
| 8 | 비밀번호 변경 — 정상 | 성공, `service_credentials`(V2 경로) 갱신 확인 |
| 9 | 매장 정보 원상 복구 | `name` 원본 · `phone/address/address_detail/description` 전부 NULL · `updatedAt` 원본 값 복원 (UPDATE 1) |
| 10 | 사용자 프로필 원상 복구 | `name/nickname/phone/updatedAt` 원본 복원 (UPDATE 1) |
| 11 | 비밀번호 hash 원상 복구 | md5 **`a0d0…af92` = 최초 값 일치**, `updated_at` 원본 복원 (UPDATE 1) |
| 12 | 세션 폐기 · 임시 자격증명 산출물 삭제 | 로그아웃 후 토큰 null · 401 · 백업/해시 파일 삭제 |

**변경 행 수 (전부 복구 완료):** `organizations` 1행 · `users` 1행 · `service_credentials` 1행.
**`renagang21` 및 KPA·K-Cosmetics·Neture 조직 write = 0.**
임시 비밀번호는 문서·CHECK·커밋·로그·환경 파일 어디에도 기록하지 않았다.

### 3-4. 다중 enrollment (AMBIGUOUS)

프로덕션에 PH enrollment 2건 이상인 계정은 **존재하지 않는다** (실측). WO 지시대로
운영 데이터에 임의 fixture 를 만들지 않았으므로 실계정 재현은 미수행이며,
분기는 코드 경로(`candidateCount > 1` → GET `status='ambiguous'` / PATCH 409)와
화면 안내 렌더로만 확인했다. **후속 관측 대상.**

### 3-5. 회귀

| 대상 | 결과 |
|------|:----:|
| `GET /store-owner/dashboard` · `/products` · `/cart` · `/orders` | 전부 200 `success:true` |
| 결제 콜백 서브트리 (`/store-owner/payment/*`) | 라우트·가드 미변경 |
| 모바일 셸 (390×844) — `/store-owner/info` · `/account` | 정상 렌더 |
| 타 서비스 (KPA / K-Cosmetics / Neture) | 공유 `storeMenuConfig` 변경이 `PHARMACY_HUB_STORE_CONFIG` 내부로 한정 (diff 확인) |
| API 서버 typecheck (`tsconfig.build.json`) · 웹 `tsc -b` + `vite build` | 통과 |

---

## 4. 변경 금지 항목 준수

| 항목 | 준수 |
|------|:----:|
| DB schema 변경 · migration · 신규 테이블 | 0 |
| 프로비저닝 변경 | 없음 |
| 공통 `resolveStoreAccess` 변경 | 없음 |
| 공통 가드 정책 변경 | 없음 (`/users/*` requireAdmin 경계 그대로) |
| 주문·결제 계약 변경 | 없음 |
| 다른 서비스 조직 자동 연결 | 없음 |
| `users.businessInfo` 매장 SSOT 승격 | 없음 |

---

## 5. 남은 부채 (별건)

1. 공통 `isStoreOwner()` / `resolveStoreAccess()` 의 `organization_members LIMIT 1` (ORDER BY·service scope 없음) — 비결정적. 이번 WO 는 사용도 수정도 하지 않았다.
2. AMBIGUOUS 해소 UI (매장 선택 / 운영자 연결 정리) 미구현 — 안내까지만.
3. `LoginPage` 가 `returnUrl` 을 복원하지 않아 결제 콜백 서브트리는 `MembershipGate` 만 적용 중 (기존 조건 유지).
4. 사업자등록번호·공개 매장 주소 변경 요청 경로(운영자 콘솔) 미구현 — 화면에 문의 안내만 표기.
