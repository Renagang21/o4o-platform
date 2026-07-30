# CHECK-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1

> WO: [`WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1`](../work-orders/WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1.md)
> 선행 WO: [`WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1`](../work-orders/WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1.md) (완료 — `489f497de` · `b3f2ef807`)
> 실행 전 HEAD: `796eee02f7b0e2a31a546858d4ebaa1823c1ce19`
> 실행 일자: 2026-07-30
> 판정: **PASS (실제 DB write smoke 미실행 — 사유 §10)**

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

*작성: 2026-07-30 · WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 실행 결과*
