# CHECK-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1

> WO: [`WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1`](../work-orders/WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1.md)
> 선행 WO: [`WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1`](../work-orders/WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1.md) (완료 — `489f497de` · `b3f2ef807`)
> 실행 전 HEAD: `796eee02f7b0e2a31a546858d4ebaa1823c1ce19`
> 실행 일자: 2026-07-30
> 판정: **PASS** — 2026-07-31 사후 E2E 로 §10 미실행 항목 전부 실측 완료 (§13)

---

## 1. 조사한 공통 membership 구조

| 축 | 실체 | 확인 결과 |
|----|------|----------|
| 가입 write-path SSOT | `AuthRegisterController.register` (`POST /api/v1/auth/register`) | 서비스별 가입은 모두 이 경로를 통과한다. `service_memberships` 를 직접 INSERT 하는 별도 가입 경로는 만들지 않았다. |
| 가입/승인 원장 | `service_memberships (user_id, service_key, status, role, approved_by, approved_at, rejection_reason)` | unique (userId, serviceKey). status = `pending / active / suspended / rejected / withdrawn`. **역할별 가입 신청 표현 가능** → 중지 조건 1 미해당 |
| 승인 SSOT | `MembershipApprovalService.approveMembership / rejectMembership` | `SELECT ... FOR UPDATE` 후 membership → users → `role_assignments` 를 **단일 트랜잭션**에서 처리. 승인 시 `membership.role` 값을 그대로 role 로 부여한다. |
| RBAC SSOT | `role_assignments` (F9/F11) | unique constraint `unique_active_role_per_user` 기준 멱등 upsert. 중복 role 생성 없음. |
| 역할 카탈로그 | `roles` 테이블 | admin/operator 역할 부여 경로(`roleService.getRoleByName`)가 참조한다 → pharmacy-hub 3행 seed 필요 (§8). |
| 서비스 scope guard | `createMembershipScopeGuard` (security-core, F1/F10 Frozen) | `requirePharmacyHubScope` 가 1:1 `scopeRoleMapping` 으로 이미 Foundation 에서 구성됨. **변경 없음.** |
| 접두 role 파싱 | `parseServiceRole` (':' 2분할) | 하이픈 포함 `pharmacy-hub` 접두를 정상 처리. `resolveCanonicalServiceKey` 는 self-map(identity fallback). |

**결론:** 공통 회원 모델의 대규모 변경 없이 구현 가능 → 중지 조건 2 미해당.

---

## 2. 재사용한 기존 API · 서비스 · 컴포넌트

| 재사용 대상 | 용도 |
|------------|------|
| `AuthRegisterController.register` | 가입 신청 write (사용자 생성/조회 + membership pending 생성) |
| `MembershipApprovalService` | 승인 / 반려 트랜잭션 + role_assignments 부여 |
| `requireAuth` (auth.middleware) | 인증 |
| `requirePharmacyHubScope` (Foundation) | 운영자 콘솔 scope guard |
| `ActionLogService` (@o4o/action-log-core) | 승인·반려 감사 로그 |
| `users.businessInfo` (JSONB) | 최소 프로필 저장 — **신규 프로필 테이블 없음** (§4.4) |
| `service_memberships.rejection_reason / approved_by / approved_at` | 반려 사유 · 처리자 · 처리 일시 — **컬럼 신설 없음** (§5.4) |
| `MembershipGate` · `AuthContext` · `apiClient` · `config/service.ts` | 프론트 기존 Foundation 구조 |

**신규 도입한 외부 의존성: 0** (프론트 신규 화면은 기존 Tailwind 마크업 컨벤션을 그대로 사용).

> §6-D 의 "기존 공통 DataTable·pagination·ActionBar 재사용" 은 `services/web-pharmacy-hub` 가 `@o4o/ui` 를 소비하지 않는 독립 서비스이므로, **공통 UI 패키지를 신규 의존성으로 추가하지 않고** Foundation 이 이미 쓰고 있는 동일 마크업 컨벤션(카드/테이블/페이지네이션)으로 구현했다. 새 UI 패턴을 도입하지 않았고, `pnpm-lock.yaml` 과 Dockerfile 을 건드리지 않기 위한 선택이다. `@o4o/ui` 편입은 후속 작업(§12)으로 남긴다.

---

## 3. 변경 파일

### 신규

```text
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubJoinController.ts
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubMembershipConsoleController.ts
apps/api-server/src/database/migrations/20270216000000-SeedPharmacyHubServiceAndRoles.ts
services/web-pharmacy-hub/src/pages/JoinPage.tsx
services/web-pharmacy-hub/src/pages/JoinStatusPage.tsx
services/web-pharmacy-hub/src/pages/operator/MembershipsPage.tsx
services/web-pharmacy-hub/src/pages/operator/MembershipDetailPage.tsx
```

### 수정

```text
apps/api-server/src/modules/auth/controllers/auth-register.controller.ts   (pharmacy-hub 분기 additive)
apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts             (join / operator 라우트 추가)
apps/api-server/src/config/service-catalog.ts                             (joinEnabled false → true)
services/web-pharmacy-hub/src/App.tsx                                     (라우트 4개 추가)
services/web-pharmacy-hub/src/components/MembershipGate.tsx               (§6-F 상태별 CTA)
services/web-pharmacy-hub/src/pages/RoleEntryPage.tsx                     (links prop additive)
services/web-pharmacy-hub/src/pages/HomePage.tsx                          (가입 안내 문구)
services/web-pharmacy-hub/src/pages/LoginPage.tsx                         (가입 안내 문구)
```

`auth-register.controller.ts` 변경은 `serviceKey === 'pharmacy-hub'` 조건 안에서만 동작한다.
기존 서비스(Neture / GlycoPharm / KPA / K-Cosmetics)의 가입 분기는 코드·동작 모두 불변 → 중지 조건 3 미해당.

---

## 4. 가입 신청 상태 전이

```text
(미가입)         --POST /pharmacy-hub/join-->   pending
pending          --중복 신청-->                 409 ALREADY_PENDING   (상태 불변)
active           --중복 신청-->                 409 ALREADY_MEMBER    (상태 불변)
rejected         --중복 신청-->                 409 ALREADY_REJECTED  (상태 불변)
suspended        --중복 신청-->                 409 REACTIVATION_REQUIRED
withdrawn        --중복 신청-->                 409 REACTIVATION_REQUIRED
```

- `serviceKey` 는 서버가 `'pharmacy-hub'` 로 강제한다. 클라이언트 값은 무시된다.
- `status` 는 Core 경로가 항상 `pending` 으로 생성한다. 클라이언트가 `active` 를 지정할 수 없다.
- `roleType` 은 `store_owner | supplier` 만 허용한다. `operator` 자가 신청은 400 `PHARMACY_HUB_SIGNUP_ROLE_REQUIRED` 로 차단된다 (§5.2).
- 최소 프로필 미충족 시 400 `PHARMACY_HUB_REQUIRED_FIELDS_MISSING` + `missingFields`.
- 상태 조회: `GET /pharmacy-hub/join/status` — 미가입이면 `status='none'`.

---

## 5. 운영자 승인 상태 전이

```text
pending  --PATCH .../approve-->  active    (+ role_assignments 부여, approved_by / approved_at 기록)
rejected --PATCH .../approve-->  active    (재승인 — MembershipApprovalService 기존 정책)
pending  --PATCH .../reject-->   rejected  (+ rejection_reason 기록, 역할 부여 없음)
active   --PATCH .../reject-->   rejected  (기존 정책)
그 외 상태 / 타 서비스 membership → 404 MEMBERSHIP_NOT_APPROVABLE | MEMBERSHIP_NOT_REJECTABLE
```

- 반려는 `reason` 필수. 미입력 시 400 `REJECTION_REASON_REQUIRED`.
- 반려 사유 = `service_memberships.rejection_reason` / 처리 일시 = `updated_at` / 처리자 = ActionLog `pharmacy-hub.operator.member_reject` 의 actor. **컬럼 신설 없음** (§5.4).
- 운영자 콘솔의 엔드포인트는 위 4개(list/detail/approve/reject)뿐이다. 상품·주문·콘텐츠 승인, 회원 삭제, role 직접 부여는 **존재하지 않는다** → §5.5 준수, 중지 조건 6 미해당.

---

## 6. 역할 부여 방식

`service_memberships.role` 에 **접두 role** 을 저장한다 (k-cosmetics `cosmetics:store_owner` 선례와 동일 축).

```text
가입 신청 role=store_owner  →  service_memberships.role = 'pharmacy-hub:store_owner'
가입 신청 role=supplier     →  service_memberships.role = 'pharmacy-hub:supplier'
```

승인 시 `MembershipApprovalService` 가 동일 트랜잭션에서
`ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO UPDATE` 로 `role_assignments` 를 멱등 부여한다.
→ 중복 role 생성 없음 · 승인과 역할 부여의 단일 트랜잭션 (§6-E 충족).

`pharmacy-hub:operator` 는 가입 신청 경로로 부여되지 않는다. 기존 admin role grant flow 를 재사용하며,
그 경로가 참조하는 `roles` 카탈로그에 3개 역할을 seed 했다 (§7).

---

## 7. platform_services 처리 · 신규 테이블 / migration 여부

**신규 migration 1건 (seed 전용):**
`apps/api-server/src/database/migrations/20270216000000-SeedPharmacyHubServiceAndRoles.ts`

| 처리 | 내용 |
|------|------|
| `platform_services` | `code='pharmacy-hub'` 1행 `INSERT ... ON CONFLICT DO NOTHING` (현행 컬럼에 맞춤: code/name/short_description/entry_url/service_type/approval_required/is_featured/featured_order/icon_emoji/status). `domain`·`display_name` 컬럼은 현행 스키마에 없어 사용하지 않았다. |
| `roles` | `pharmacy-hub:operator / :store_owner / :supplier` 3행 `INSERT ... ON CONFLICT (name) DO UPDATE` |
| DDL | **없음** — `CREATE TABLE` / `ALTER TABLE` / `DROP TABLE` 0건 (정적 grep 확인) |

**금지 테이블 생성 0건:** `pharmacy_hub_users` / `pharmacy_hub_members` / `pharmacy_hub_suppliers` / `pharmacy_hub_stores` / 별도 인증 테이블 / 공급자 원장 복제 — 전부 없음 → 중지 조건 8 미해당.

migration 은 멱등이며 down 에서 seed 3행 + 서비스 1행만 제거한다.

---

## 8. serviceKey 격리 검증 (정적)

| 검증 | 결과 |
|------|------|
| 운영자 콘솔의 서비스 범위 | `const SCOPE_SERVICE_KEYS = [SERVICE_KEY]` — 요청 값에서 유도하지 않음 |
| 승인/반려 호출 | `isPlatformAdmin: false`, `serviceKeys: SCOPE_SERVICE_KEYS` 하드코딩 (4곳 확인) |
| 목록 쿼리 | `WHERE` 절 첫 조건이 항상 `sm.service_key = $1` |
| 상세 쿼리 | `WHERE sm.id = $1 AND sm.service_key = $2` |
| 내 상태 쿼리 | `WHERE user_id = $1 AND service_key = $2` |
| 클라이언트 serviceKey 전달 | `JoinPage.tsx` 가 `service` / `serviceKey` 를 전송하지 않음 (grep 0건) |
| 공통 operator 라우터 오염 | `routes/operator/membership.routes.ts` 의 `requireRole` allowlist 에 `pharmacy-hub:operator` **미추가** — 해당 라우터는 삭제·hard delete·role 직접 부여까지 포함하므로 §5.5 범위를 초과한다. 구조적으로 분리했다. |
| 파라미터 바인딩 | 모든 raw SQL 이 `$n` 바인딩 (문자열 보간 0건) — Boundary Policy Guard Rule 2 |
| serviceKey 충돌 | `SERVICE_KEYS.PHARMACY_HUB='pharmacy-hub'` / `PHARMACY_HUB_EVENT_OFFER='pharmacy-hub-event-offer'` — 기존 5키와 충돌 0 |
| Market Trial 연결 | grep 0건 |

→ 다른 서비스 membership 에 접근할 수 있는 코드 경로가 존재하지 않는다. 중지 조건 5 미해당(가입 신청은 `service_key='pharmacy-hub'` 행만 생성).

---

## 9. 실행한 검증과 결과

| # | 검증 | 결과 |
|:-:|------|------|
| 1 | `api-server` `tsc -p tsconfig.build.json --noEmit` | **PASS** |
| 2 | `web-pharmacy-hub` `tsc -b --noEmit` | **PASS** |
| 3 | `web-pharmacy-hub` `vite build` | **PASS** (168 modules, 297.64 kB) |
| 4 | 회귀 `web-neture` `tsc -b` | **PASS** |
| 5 | 회귀 `web-glycopharm` typecheck | **PASS** |
| 6 | 회귀 `web-kpa-society` `tsc -b` | **PASS** |
| 7 | 회귀 `web-k-cosmetics` `tsc -b` | **PASS** |
| 8 | headless 렌더 `/` `/login` `/join` `/join/status` `/operator/memberships` `/operator/memberships/:id` | **PASS** — 6/6 렌더, page error 0 |
| 9 | `/join` 역할 선택 인터랙션 | **PASS** — 약국 경영자 → 이름/연락처/**약국명** · 공급자 → 이름/연락처/**회사명·담당자명** 으로 필드 전환 |
| 10 | 비로그인 상태에서 `/operator/memberships` 접근 | **PASS** — MembershipGate 가 차단하고 가입 CTA 노출 |
| 11 | serviceKey / scope 격리 정적 검증 (§8) | **PASS** |
| 12 | 신규 테이블 DDL 0건 정적 검증 | **PASS** |
| 13 | `security-core` 변경 여부 | **변경 없음** → 재빌드 불필요 |

`packages/security-core` 는 이번 WO 에서 수정하지 않았다 (Foundation 에서 이미 반영·커밋됨).

---

## 10. 미실행 검증과 사유

| 미실행 항목 | 사유 |
|------------|------|
| 실제 가입 신청 write smoke (`POST /pharmacy-hub/join` → row 생성 확인) | 로컬 PostgreSQL 미구성 · 프로덕션 DB 는 방화벽 차단 및 **write 금지**. 사용자 지시로 신규 자격증명을 요구하지 않는다. |
| 실제 승인 / 반려 write smoke | 동일 — 프로덕션 `service_memberships` / `role_assignments` mutation 금지 |
| 중복 신청 409 실동작 확인 | DB 선조회가 필요하므로 미실행 (코드 경로는 정적 확인) |
| 승인 후 `role_assignments` 실제 부여 확인 | DB write 필요 |
| 승인 후 역할별 진입(`/store-owner` 등) 실브라우저 E2E | 승인된 테스트 계정 + 배포 필요 |
| 운영자 승인 목록 실데이터 렌더 | pending 실데이터 필요 |
| 백엔드 런타임 부팅 smoke | 로컬에서 TypeORM ESM 엔티티 초기화가 실패하는 기존 제약 (tsx `ColumnTypeUndefinedError`). 컴파일 통과 + 라우트 정적 등록 확인으로 대체 |
| migration 실제 실행 | main 배포 시 CI/CD 자동 실행 (PRODUCTION-MIGRATION-STANDARD) |

> **판정 주의:** 위 미실행 항목은 전부 DB mutation 또는 배포 후 E2E 에 해당한다. WO 실행 지시에 따라 이를 실패로 판정하지 않으며, §12 후속 작업으로 남긴다.
>
> **2026-07-31 갱신:** migration 실제 실행 · 백엔드 런타임 부팅을 제외한 위 항목은 **§13 사후 E2E 에서 프로덕션 실측으로 전부 닫혔다.**

---

## 11. 병행 작업 파일 미포함 확인

commit 대상에서 제외한 병행/보호 파일:

```text
apps/api-server/src/scripts/data/otc-v4-nr26-post-verification-all.ga.json   (병행 작업 — 열람·수정 없음)
pnpm-lock.yaml                                                               (아래 참조)
```

`git add .` 미사용. Pharmacy-Hub 경로만 path-specific stage 했다.
병행 세션의 index 항목을 unstage 하지 않았다. → 중지 조건 7 · 9 미해당.

### pnpm-lock.yaml 판단

- 이번 WO 는 **신규 의존성을 추가하지 않았다** → lockfile 변경이 필요 없다.
- 현재 lockfile diff 에는 (a) Foundation 의 `services/web-pharmacy-hub` importer 항목과 (b) 무관한 transitive 버전 갱신(`@babel/helper-plugin-utils`, `browserslist`, `caniuse-lite`)이 **한 파일 안에 섞여** 있다.
- 두 변경을 파일 단위로 안전하게 분리할 수 없고, 재생성 시 병행 변경을 덮어쓸 위험이 있다.
- → **lockfile 을 수정하지 않고 제외한다.** (사용자 지시 "소유권을 구분할 수 없거나 기존 변경을 덮어써야 하면 lockfile은 수정하지 말고 보고한다")

---

## 12. 후속 작업

| # | 항목 | 비고 |
|:-:|------|------|
| 1 | 배포 후 실제 가입·승인 E2E (승인된 테스트 계정) | 신청 → pending → 운영자 승인 → `role_assignments` 확인 → `/store-owner` 진입 |
| 2 | `20270216000000` migration 프로덕션 반영 확인 | main 배포 후 `platform_services` / `roles` 행 조회 |
| 3 | 최초 `pharmacy-hub:operator` 계정 부여 | 기존 admin role grant flow 사용 (본 WO 범위 밖) |
| 4 | 반려 후 재신청 정책 확정 | 현재는 재신청 write 없이 운영자 재승인 경로(`canReapply:false`). 정책 확정 시 별도 WO |
| 5 | 운영자 콘솔의 `@o4o/ui` 공통 DataTable 편입 | 의존성·Dockerfile·lockfile 변경을 수반하므로 별도 WO |
| 6 | 가입 알림(신청 접수 / 승인 / 반려 메일) | 본 WO 범위 밖 |
| 7 | 상품·주문·콘텐츠·커뮤니티·이벤트 오퍼 | §9 제외 범위 — 각각 별도 WO |
| 8 | 도메인 배포 / DNS / Cloud Run 서비스 생성 | §9 제외 범위 |

---

## 13. 사후 E2E 보완 — 반려 경로 (2026-07-31, 프로덕션 실측)

> 사용자 승인 범위: 프로덕션 전용 `[E2E_TEST]` store_owner 테스트 계정 2개 생성.
> **DB 직접 상태 변경 없이 기존 회원가입 · 가입 신청 · 운영자 승인/반려 API 만 사용**했다.
> 계정 A(승인 경로)의 상품 조회 검증은 [`CHECK-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §11`](CHECK-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1.md) 에 기록한다.

### 13-1. 생성 식별자

| 계정 | 이메일 | userId | membershipId | role_assignment id | 최종 상태 |
|------|--------|--------|--------------|--------------------|-----------|
| A (승인) | `e2e.test.pharmacyhub.owner.active@example.com` | `5ee37566-2a51-4929-8b3d-ccc58ce9e014` | `3b11670e-b818-4066-92ae-bff59acdc530` | `fda73284-f88e-4b7d-af81-3f18d7777b2e` | membership `active` · `pharmacy-hub:store_owner` |
| B (반려) | `e2e.test.pharmacyhub.owner.rejected@example.com` | `0d028c2e-d2f9-4bbe-bf54-eaa99162e611` | `adff519a-1077-44e5-89f6-a614a4a3741b` | `6eb0fa4c-0b79-4f85-a6b8-ed4d59797563` | membership `rejected` · 반려 사유 보존 |

- 이름 · 약국명에 `[E2E_TEST]` 접두. 실제 연락처 · 실제 약국 정보 미사용 (`010-0000-010x`, `@example.com`).
- **비밀번호는 저장소 · 본 문서 · 채팅 어디에도 기록하지 않았다.**
- read-only 실측(`cloud-sql-proxy` SELECT)으로 확인: 두 계정 모두 `service_memberships` 1행(`pharmacy-hub`) · `role_assignments` 1행뿐 — **다른 서비스 membership · role 부여 0**.
- 삭제하지 않고 회귀 테스트용으로 유지한다. 상품 · 주문 생성 없음.

### 13-2. 검증 결과

| # | 시나리오 | 결과 |
|:-:|---------|------|
| 1 | 신규 가입 신청 (store_owner) ×2 | ✅ 201 · `status=pending` · membership `role='pharmacy-hub:store_owner'` (prefixed 저장) |
| 2 | 운영자 콘솔 pending 목록 · 상세 | ✅ 200 · 신청자/약국명/신청 역할/신청 일시 정상 표시 |
| 3 | **승인** (계정 A) | ✅ 200 · membership `active` · `approvedBy`/`approvedAt` 기록 |
| 4 | 승인 후 재로그인 | ✅ 200 · JWT roles 에 `pharmacy-hub:store_owner` |
| 5 | 승인 후 `/join/status` | ✅ `status=active` · `approvedAt` 표시 |
| 6 | 승인 후 `/store-owner/ping` | ✅ 200 (역할별 진입 가능) |
| 7 | **반려** (계정 B, 사유 입력) | ✅ 200 · membership `rejected` · `rejection_reason` 저장 |
| 8 | 반려 후 `/join/status` | ✅ `status=rejected` + **반려 사유 원문 반환** |
| 9 | 반려 후 `/store-owner/ping` · `/store-owner/products` | ✅ **403 `MEMBERSHIP_NOT_ACTIVE`** (차단 확인) |
| 10 | 반려 후 재신청 | ✅ 409 `ALREADY_REJECTED` |
| 11 | 운영자 콘솔 `status=rejected` 목록 · 상세 | ✅ 200 · 반려 사유 노출 |
| 12 | serviceKey 격리 | ✅ 두 계정 모두 pharmacy-hub 외 membership · role 0 |

→ §10 의 미실행 항목(가입 write · 승인/반려 write · 중복 409 · `role_assignments` 실부여 · 역할별 진입) **전부 실측으로 닫았다.**

### 13-2-B. 실브라우저 스모크 (배포된 `pharmacy-hub-web` Cloud Run)

| 화면 | 계정 A (active) | 계정 B (rejected) |
|------|-----------------|-------------------|
| 로그인 후 홈 | ✅ `가입 상태: active` | ✅ `가입 상태: rejected · 신청 상태 확인` 링크 노출 |
| `/join/status` | ✅ "가입이 승인되었습니다" + 신청/승인 일시 + 진입 CTA | ✅ "가입 신청이 반려되었습니다" + **반려 사유 원문 표시** |
| `/store-owner` | ✅ 역할 진입 성공 + "공급 상품 보기" 링크 | ✅ `이용 권한 없음` + "반려 사유 확인" CTA (MembershipGate 차단) |
| `/store-owner/products` | ✅ 1행 · `9,900원` · **"서비스 공급가 적용"** 배지 · 미제공 Offer 미노출 | ✅ 차단 |
| console / page error | ✅ 0건 | ✅ 0건 |

→ D3(잔존 role_assignment)에도 불구하고 **UI 차단은 membership 상태 기준**으로 정상 동작한다 (`MembershipGate`).

### 13-3. 검증 중 확정한 결함 3건 (본 WO 에서 수정하지 않음)

| # | 결함 | 실측 근거 | 영향 |
|:-:|------|----------|------|
| D1 | **신규 가입자는 반려 사유 화면에 도달할 수 없다** | 반려 직후 로그인 → **403 `ACCOUNT_NOT_ACTIVE`**. 신규 등록은 `users.status='pending'` 으로 생성되고 `users.status` 를 `active` 로 바꾸는 것은 **승인 경로뿐**이다. `rejectMembership` 은 `users` 를 건드리지 않으므로 pending 상태가 영구히 남는다. | `/join/status` 의 rejected 분기(§6-B)가 **신규 가입자에게는 dead path**. 게다가 `LoginPage` 는 `SERVICE_NOT_MEMBER` 만 한글 안내로 매핑하므로 사용자에게 영문 `Account is not active` 가 그대로 노출된다. |
| D2 | **`MembershipApprovalService.rejectMembership` 의 `UPDATE … RETURNING` 결과 해석 오류 (공유 Core)** | reject 응답 `data` 가 `{"roleType":null}` 뿐 — `id`/`userId`/`status`/`role` 전부 `undefined`. TypeORM PostgresQueryRunner 는 UPDATE 시 `result.raw = [rows, rowCount]` 를 반환하므로 `result[0]` 은 **행이 아니라 행 배열**이다 (`node_modules/typeorm/driver/postgres/PostgresQueryRunner.js:200-203`). | ① 반려 응답 payload 결손 ② `result.length === 0` 이 항상 false → **404 `MEMBERSHIP_NOT_REJECTABLE` 도달 불가** ③ `membership.service_key === 'kpa-society'` 가 항상 false → **KPA `kpa_members` 반려 동기화(WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1)가 실제로는 한 번도 실행되지 않는다** ④ `REJECTION_SUCCESS` 로그의 userId/serviceKey 가 undefined. **DB 반려 자체는 정상 수행된다.** `approveMembership` 은 `SELECT … FOR UPDATE` 분리 패턴이라 영향 없다. |
| D3 | **반려가 `role_assignments` 를 비활성화하지 않는다** | 반려 후 재로그인 JWT: `roles=["pharmacy-hub:store_owner"]`, `GET /me/access` → `entryPoints.storeOwner=true` (membershipStatus 는 `rejected`). read-only 실측에서도 `role_assignments.is_active=true` 잔존. | 실제 접근은 membership 기반 guard 가 403 으로 막으므로 **권한 누수는 없다**. 다만 역할 배열만 보고 분기하는 소비처(진입점 노출 등)는 오판할 수 있다. |

> D2 는 `MembershipApprovalService` = **4개 서비스 공유 Core** 다. CLAUDE.md §1 Shared Module Change Rule 에 따라
> 전 소비처(neture / glycopharm / k-cosmetics / kpa-society / pharmacy-hub) 영향을 먼저 식별해야 하므로
> 본 사후 E2E 에서 수정하지 않고 별도 WO 로 넘긴다. D1 · D3 도 정책 판단이 필요해 동일하게 분리한다.

### 13-4. 절차 준수

- 프로덕션 DB write 는 **전부 기존 API 경로**(회원가입 · 가입 신청 · 승인 · 반려)로만 발생했다. 직접 SQL mutation 0건.
- 식별자 확인용 SQL 은 `SELECT` 만 사용했다 (`cloud-sql-proxy` · 조회 후 프로세스 종료).
- 계정 B 는 반려 사유 표시를 **도달 가능한 경로**로 확인하기 위해 `승인 → 반려` 순서로 상태를 전이시켰다 (D1 때문에 최초 신청 직후 반려로는 로그인 자체가 불가). 사용 API 는 승인 · 반려 2개뿐이며 DB 직접 변경은 없다.

---

*작성: 2026-07-30 · WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 실행 결과*
*보완: 2026-07-31 — §13 사후 E2E (반려 경로) 추가*
