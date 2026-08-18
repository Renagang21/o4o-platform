# CHECK — O4O Cross-Service Self-Profile Write Contract V1

- **WO**: [`WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1`](../work-orders/WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1.md)
- **선행**: [`CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1`](CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1.md) (§11 MUST_FIX #6·#7·#8)
- **작성일**: 2026-08-18
- **상태**: ACTIVE

---

## 1. 기준 commit

| 항목 | 값 |
|------|-----|
| 시작 기준 | `871e28c1e` (origin/main, fast-forward pull 후) |
| 선행 commit `e51ddcf3a` (프로필 공통화) | `git merge-base --is-ancestor` → **포함** |
| 선행 commit `fdf6595b9` (PH 내 프로필 진입점) | `git merge-base --is-ancestor` → **포함** |

작업 중 다른 세션이 `871e28c1e` 를 push 하여 ff-only pull 로 반영했다 (작업 파일과 경로 충돌 없음).

---

## 2. self-profile write census (미조사 0)

`users`(ACCOUNT_CORE) 를 **본인이** 수정하는 모든 경로를 backend·frontend 양쪽에서 전수 조사했다.

### 2-1. Backend write path

| # | route | 인증 | role/scope | 대상 table | 허용 필드 | 실제 consumer | 동작 | 판정 |
|---|-------|------|-----------|-----------|----------|--------------|------|------|
| B1 | `PUT /api/v1/users/profile` | — | — | — | — | GP·KCos·Neture frontend | **라우트 미등록**. `/profile` 이 `router.use(requireAdmin)` 뒤 `PUT /:id`(`param('id').isUUID()`) 에 걸려 비관리자 403 / 관리자 400 | **DEAD (구현만 존재, mount 0)** |
| B2 | `GET/PATCH /api/v1/users/me/contact` | `authenticate` | 없음 (self) | `users` | `contactEnabled`·`kakaoOpenChatUrl`·`kakaoChannelUrl` | Neture 외부 연락처 | 정상 | LIVE (self 축 관례) |
| B3 | `PUT /api/v1/users/password` | `authenticate` | 없음 (self) | `users` / `service_credentials` | 비밀번호 | 전 서비스 | 정상 | LIVE (범위 밖) |
| B4 | `PUT /api/v1/users/:id` | `authenticate` | `requireAdmin` | `users` | 관리자 필드 | admin 콘솔 | 정상 | LIVE (admin 축 — self 아님) |
| B5 | `PUT /api/v1/kpa/mypage/profile` | `authenticate` | 없음 (self) | `users` + `kpa_members` | `name·lastName·firstName·nickname·phone·university·workplace` | KPA 마이페이지 | 정상 | LIVE (KPA 전용 — §10 미변경) |
| B6 | `PATCH /api/v1/auth/me/profile` | `requireAuth` | 없음 (self) | `kpa_pharmacist_profiles`·`kpa_members`·`users.businessInfo` | `activityType`·`pharmacistFunction` 등 | KPA `AuthContext` | 정상 (KPA 직역/면허 전용, 그 외 400) | LIVE (SERVICE_PROFILE 축) |
| B7 | `GET/PATCH /api/v1/pharmacy-hub/store-owner/account/profile` | `requireAuth` | `pharmacy-hub:store_owner` | `users` | `name·nickname·phone` | PH `/account`·`/store-owner/account` | 정상이나 **store_owner 아닌 본인은 403** | **LEGACY (canonical 로 대체, 소비처 0)** |
| B8 | `PUT /api/v1/users/profile` 구현체 `UserController.updateProfile` | — | — | `users` | `name·firstName·lastName·nickname·phone·avatar` | 없음 | 라우터에서 호출 0 | DEAD 구현 (본 WO 미삭제 — §13) |

### 2-2. Frontend consumer

| # | 서비스 | 화면 | 호출 (작업 전) | 결과 | 작업 후 |
|---|--------|------|---------------|------|--------|
| F1 | GlycoPharm | `/mypage/profile` | `PUT /users/profile` | 저장 실패 (403/400) | `PATCH /users/me/profile` |
| F2 | K-Cosmetics | `/mypage/profile` | `PUT /users/profile` | 저장 실패 | `PATCH /users/me/profile` |
| F3 | Neture | `/mypage/profile` | `PUT /users/profile` | 저장 실패 | `PATCH /users/me/profile` |
| F4 | Pharmacy-Hub | `/account`, `/store-owner/account` | `GET/PATCH /pharmacy-hub/store-owner/account/profile` | store_owner 만 성공, operator·supplier 는 403 → 조회 전용 | `GET/PATCH /users/me/profile` |
| F5 | KPA | `/mypage/profile` | `GET/PUT /kpa/mypage/profile` | 정상 | **미변경** (회귀만 확인) |
| F6 | KPA | 직역/면허 | `PATCH /auth/me/profile` | 정상 | **미변경** |
| F7 | GP/KCos | 사업자정보 (`BusinessProfileSection`) | 서비스별 기존 API | 정상 | **미변경** |
| F8 | Neture | 공급자 프로필 | 기존 Neture API | 정상 | **미변경** |

**미조사 0** — `grep -rn "users/profile" services/ packages/` 및 `users.routes.ts` 전 route 열거로 확인했다.

---

## 3. legacy / dead route 판정

| 경로 | 판정 | 근거 |
|------|------|------|
| `PUT /api/v1/users/profile` | **DEAD** | `users.routes.ts` history 에 `'/profile'` 등록 이력 0 (`git log -S"'/profile'"` 무결과). 구현은 `modules/user/controllers/user.controller.ts` 에만 존재하며 그 전용 router 는 `7fbd5351e` (WO-O4O-ADMIN-USERS-ROLES-DEAD-BACKEND-CLEANUP-V1) 에서 제거됨 |
| `GET/PATCH /pharmacy-hub/store-owner/account/profile` | **LEGACY** | canonical 도입으로 frontend 소비처 0. 라우트는 이번 WO 에서 제거하지 않는다 (제거는 별도 WO — §13) |
| `PUT /api/v1/kpa/mypage/profile` | **LIVE 유지** | KPA 전용 축 (university/workplace 포함). §10 기본 미변경 |

---

## 4. canonical endpoint 선택 근거 (§5 → **B안**)

```text
canonical: GET  /api/v1/users/me/profile
           PATCH /api/v1/users/me/profile
```

A안(`PUT /users/profile` 복구)을 택하지 않은 근거는 추측이 아니라 다음 실측이다.

1. **소비처는 많지만 계약은 존재한 적이 없다.** GP·KCos·Neture 3서비스가 호출하고 있으나, 그 라우트는
   `users.routes.ts` 에 **한 번도 등록된 적이 없다** (history 검색 무결과). 즉 "복구" 대상이 아니라 애초에 없는 계약이다.
2. **admin 축과 literal/param 충돌.** `/users/profile` 은 `requireAdmin` 뒤 `PUT /:id` 에 흡수된다.
   `/profile` 을 requireAdmin 앞에 두면 동작하지만, 같은 router 안에서 literal 과 `:id` 파라미터가
   의미상 충돌하는 구조가 남는다 (관리자 user update 와 self update 가 같은 표면).
3. **살아 있는 self 축 관례는 `/me/*` 다.** 같은 router 의 유일한 정상 self 계약이 `GET/PATCH /users/me/contact` 이며,
   `/me` prefix 는 파라미터 라우트와 충돌하지 않는다.

→ B안 조건(`/users/profile` 이 dead + 의미 충돌 + `/me` 패턴이 더 명확)이 모두 충족되어 B안으로 확정했다.

---

## 5. 허용 ACCOUNT_CORE 필드 (allowlist)

| 필드 | 최대 길이 | 비고 |
|------|:--------:|------|
| `name` | 200 | NOT NULL — 공백 저장 불가 (400) |
| `firstName` | 100 | 공백은 NULL 로 정리 |
| `lastName` | 100 | 공백은 NULL 로 정리 |
| `nickname` | 100 | 공백은 NULL 로 정리 |
| `phone` | 20 | 공백은 NULL 로 정리 |

응답은 `editableFields` 를 포함한다. 화면은 **역할이 아니라 이 값**으로 편집 가능 여부를 판단한다.

---

## 6. 금지 필드

`roles` · `role` · `status` · `isActive` · `serviceKey` · `businessInfo` · `organizationId` · `membership` ·
`approvedAt` · `email` · `password` · `id` · `userId` — allowlist 밖은 **전부 400 `FIELD_NOT_EDITABLE`** 이며 DB write 0.
조용히 무시하지 않고 거부하여 우회 시도가 성공한 것처럼 보이지 않게 한다.

---

## 7. Backend 구현

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/modules/user/controllers/self-profile.controller.ts` (신규) | `SelfProfileController.getSelfProfile` / `updateSelfProfile` + `SELF_PROFILE_EDITABLE_FIELDS` |
| `apps/api-server/src/modules/user/controllers/index.ts` | barrel export 추가 |
| `apps/api-server/src/routes/users.routes.ts` | `router.get('/me/profile')` · `router.patch('/me/profile')` 를 **`router.use(requireAdmin)` 앞**에 등록 |

구현 계약 (§6 준수):

```text
authenticate (router.use) → req.user.id 확인 → allowlist validation
→ allowlist 컬럼만 SET 하는 UPDATE (전부 파라미터 바인딩)
→ WHERE id = <인증 사용자 id> (항상 자기 row)
→ 최신 profile 재조회 후 응답
```

- `requireAdmin` 없음 · role 분기 없음 · `serviceKey` 로 owner 결정 없음
- body/path 에서 대상 사용자를 지목할 수 없음 (`id`/`userId` 는 allowlist 밖 → 400)
- `businessInfo` spread merge 없음 · 임의 JSON 전체 update 없음
- DB schema / migration **0건**

---

## 8. 서비스별 adoption

| 서비스 | 변경 파일 | 내용 |
|--------|----------|------|
| GlycoPharm | `services/web-glycopharm/src/pages/mypage/MyProfilePage.tsx` | `api.put('/users/profile')` → `api.patch('/users/me/profile')` |
| K-Cosmetics | `services/web-k-cosmetics/src/pages/mypage/MyProfilePage.tsx` | 동일 |
| Neture | `services/web-neture/src/pages/mypage/MyProfilePage.tsx` | 동일 |
| Pharmacy-Hub | `services/web-pharmacy-hub/src/lib/api/pharmacyHubAccount.ts` | `PROFILE_PATH` → `/users/me/profile`, `editableFields` 타입 추가 |
| Pharmacy-Hub | `services/web-pharmacy-hub/src/pages/account/MyProfilePage.tsx` | `canEdit` 판정을 **서버 `editableFields`** 기준으로 정리 (역할 하드코딩 없음) |
| Core | `packages/account-ui/src/components/AccountProfileSection.tsx` | 주석의 계약 표기만 canonical 로 갱신 (동작 변경 없음) |

경계 유지: `AccountProfileSection` → canonical self-profile / `BusinessProfileSection` → 기존 서비스 API /
Neture 공급자 프로필 → 기존 Neture API. StoreOwnerGuard·PH scope 가드는 **완화하지 않았다**.

---

## 9. KPA 회귀

KPA 는 **코드 변경 0건**이다 (§10 기본 미변경).

| 항목 | 경로 | 상태 |
|------|------|------|
| 기본 프로필 저장 | `PUT /kpa/mypage/profile` | 미변경 |
| 직역/면허 | `PATCH /auth/me/profile` | 미변경 |
| businessInfo | `buildBusinessInfoUpdateStatement` (DB-side merge) | 미변경 |
| 비밀번호 변경 | `PUT /users/password` | 미변경 |
| 정적 검증 | `services/web-kpa-society` tsc | PASS |
| backend 회귀 | api-server Jest 전체 2,314 tests | PASS |

---

## 10. Security tests

신규: `apps/api-server/src/__tests__/security/self-profile-write-contract.spec.ts` — **26 tests PASS**

| 그룹 | 검증 |
|------|------|
| 인증 경계 | 미인증 PATCH → 401 + DB write 0 / 미인증 GET → 401 |
| 정상 수정 | 200 + `WHERE id = <자기 id>` 단일 UPDATE / allowlist 컬럼만 SET / 공백 → NULL / `name` 공백 400 / 변경 없음 400 |
| 금지 필드 | 13종(`roles`·`role`·`status`·`isActive`·`serviceKey`·`businessInfo`·`organizationId`·`membership`·`approvedAt`·`email`·`password`·`id`·`userId`) 각각 400 + write 0 |
| 타 사용자 | body 로 타 user id 지목 시 해당 id 가 어떤 쿼리 파라미터에도 도달하지 않음 (변경 0) |
| 권한 상승 | UPDATE SQL 에 `role_assignments`·`service_memberships`·`status` 미포함, 응답에 roles 없음 |
| route 위치 | `/me/profile` 이 `router.use(requireAdmin)` **앞**에 등록 / GET·PATCH 동시 등록 / controller 코드에 `requireAdmin`·`hasAnyRole`·`isAdmin` 0 |

기존 보안 스위트 회귀: `src/__tests__/security` + guard inventory **20 suites / 473 tests PASS**.

---

## 11. Production browser smoke

### 11-1. API 레벨 (production `api.neture.co.kr`, 6 시나리오)

각 시나리오: 로그인 → `GET /users/me/profile`(변경 전 값 기록) → `PATCH` nickname → 200 확인 → 재조회 → 금지 필드 probe → 원래 값 복원 → 재조회 확인.

| # | 서비스 / 계정 | `editableFields` | PATCH | 재조회 persist | 금지 필드(`roles`,`status`) | 원복 |
|---|---------------|------------------|:-----:|:--------------:|-----------------------------|:----:|
| 1 | GlycoPharm (`glycopharm`) | name·firstName·lastName·nickname·phone | 200 | O | 400 `FIELD_NOT_EDITABLE` | O |
| 2 | K-Cosmetics (`k-cosmetics`) | 동일 | 200 | O | 400 `FIELD_NOT_EDITABLE` | O |
| 3 | Neture (`neture`) | 동일 | 200 | O | 400 `FIELD_NOT_EDITABLE` | O |
| 4 | PharmacyHub operator (`pharmacy-hub`) | 동일 | 200 | O | 400 `FIELD_NOT_EDITABLE` | O |
| 5 | PharmacyHub store_owner (`pharmacy-hub`) | 동일 | 200 | O | 400 `FIELD_NOT_EDITABLE` | O |
| 6 | KPA-Society (`kpa-society`) | 동일 | 200 | O | 400 `FIELD_NOT_EDITABLE` | O |

- 계정은 전부 `docs/local/TEST-ACCOUNTS.local.md` 의 테스트 계정. 실사용자 계정 write 0.
- 수정 대상은 `nickname` 1개 필드뿐이며 6건 모두 원래 값으로 복원 후 재조회로 확인했다 (원복 실패 0).
- role / status / membership / service_credentials / businessInfo / organizations write 0.

### 11-2. 브라우저 레벨 (실 브라우저)

| # | 대상 | 시나리오 | 결과 |
|---|------|----------|:----:|
| 1 | PharmacyHub operator — `/account` | 사용자 메뉴 "내 프로필" 진입 → 프로필 수정 노출 → nickname 수정 → 저장("계정 정보를 저장했습니다.") → 재진입 유지 → 원복 · 비밀번호 변경 모달 open/cancel 정상 · console error 0 | PASS |
| 2 | PharmacyHub — `/store-owner/account` (thin wrapper) | wrapper 경로 렌더 → 프로필 수정 → 저장 → 값 반영 → 원복 · console error 0 | PASS |
| 3 | GlycoPharm — `/mypage/profile` | 로그인 → 프로필 수정 → nickname 수정 → 저장("프로필이 수정되었습니다.") → **새로고침 후 값 유지** → 원복 → 새로고침 재확인 | PASS |
| 4 | KPA-Society — `/mypage/profile` (회귀) | 로그인 → 수정 → 저장("기본 정보가 저장되었습니다.") → 값 반영 → 원복. 기존 KPA 전용 write 경로 동작 변화 없음 | PASS (회귀 이상 0) |
| 5 | K-Cosmetics — `/mypage/profile` | **미수행** | SKIPPED |
| 6 | Neture — `/mypage/profile` | **미수행** | SKIPPED |

**5·6 SKIPPED 사유 (숨기지 않고 명시)** — 두 사이트는 브라우저에 저장된 자격증명이 없어 로그인 폼 자동 채움이 되지 않는다. 자격증명을 자동화 입력으로 넘기려면 `docs/local/TEST-ACCOUNTS.local.md` 의 비밀번호를 평문으로 노출해야 하는데, 이는 §15 자격증명 취급 원칙 위반이므로 수행하지 않았다 (자격증명을 로컬에서 브라우저로 전달하는 우회 경로도 환경 정책상 차단됨).

**대체 근거** — 두 서비스의 화면 변경분은 GlycoPharm 과 **동일한 1줄 호출 전환**(`api.put('/users/profile')` → `api.patch('/users/me/profile')`)이며, GP 브라우저 PASS + KCos/Neture API 레벨 PASS(위 11-1 #2·#3)로 계약 동작이 확인된다. 잔여 미확인 범위는 두 서비스의 화면 렌더링뿐이다.


---

## 12. DB / schema / migration

| 항목 | 결과 |
|------|------|
| schema 변경 | 0 |
| migration 추가 | 0 |
| 새 테이블/컬럼 | 0 |
| 데이터 대량 수정 | 0 |
| production write | 테스트 계정 ACCOUNT_CORE 최소 수정 → 원복 (§11) |

---

## 13. 잔존 위험

| # | 항목 | 성격 | 제안 |
|---|------|------|------|
| R1 | `UserController.getProfile/updateProfile` (dead 구현) 잔존 | dead code | dead backend cleanup 계열 WO 로 제거 |
| R2 | `PharmacyHubAccountController` + `/pharmacy-hub/store-owner/account/profile` 라우트 (소비처 0) | legacy | canonical 안정화 후 별도 WO 로 은퇴 |
| R3 | `avatar` 는 allowlist 밖 (업로드 계약 부재) | 미구현 | 아바타 업로드 WO 에서 함께 설계 |
| R4 | `email` 변경 계약 부재 (본인 인증 절차 필요) | 미구현 | 별도 WO |
| R5 | 4서비스 `마이페이지` ↔ PH `내 프로필` 라벨 축 불일치 | 용어 | 선행 CHECK §11-4 의 후속 WO 로 유지 |

---

## 14. Profile closure 에 미치는 영향

선행 CHECK `CHECK-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1 §11-6` 의 MUST_FIX 중:

| # | 내용 | 상태 |
|---|------|------|
| #6 | PH operator 가 본인 프로필을 **수정**할 수 없음 (backend 계약 부재) | **해소** — canonical 계약으로 인증 사용자 전원 수정 가능 |
| #7 | GP/KCos/Neture 의 `PUT /users/profile` 저장 실패 | **해소** — canonical 로 전환 |
| #8 | 프로필 write 계약이 서비스별로 흩어져 있음 | **해소** — ACCOUNT_CORE write 단일 계약 확정 (KPA 전용 축은 의도적 유지) |

---

## 15. CHECK / commit / push

| 항목 | 값 |
|------|-----|
| 구현 commit | `408fe8e0c` — feat(account): 플랫폼 공통 self-profile write 계약 확정 (11 files, +788/−32) |
| CHECK commit | 본 문서 (docs only) |
| 배포 | push → GitHub Actions `Deploy API Server (Cloud Run)` success → revision `o4o-core-api-03362-mzn` / `Deploy Web Services` success |
| 인프라 변경 | 0 (Cloud Run config·env·secret·IAM 무변경, migration 0) |
| stage 방식 | path-specific only (`git add .` 미사용) |
| 타 세션 작업 | `packages/lms-ui/**` · `packages/shared-space-ui/**` · `services/web-kpa-society/src/components/education/**` 등 LMS 계열 미커밋 변경은 **손대지 않았다** (수정·삭제·stash 0) |
| 완료 기준 | 본 WO 범위 미커밋 변경 0 / `HEAD == origin/main` |


---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (R1·R2·R4·R5)
