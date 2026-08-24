# WO-O4O-CROSSSERVICE-LEGACY-BARE-ROLE-CENSUS-AND-CLEANUP-V1 — CHECK

> 과거 생성된 접두어 없는(bare) legacy `role_assignments` 전수조사 · 판정 · 안전한 정리
> 작성일 2026-08-24 · 기준 브랜치 main · 프로덕션 census 는 **read-only SELECT** 로만 수행

선행 WO: [`WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1-CHECK.md`](WO-O4O-OPERATOR-CROSSSERVICE-MEMBER-DETAIL-ID-AND-STATUS-CONTRACT-CLOSURE-V1-CHECK.md) §5 D4 · §8 남은 문제 3

---

## 1. 결론

| 항목 | 결과 |
|---|---|
| bare role 전수 census | **22행 / 7종** (프로덕션 `role_assignments`) |
| 판정 | VALID_GLOBAL 18 · LEGACY_SERVICE_ROLE 1 · ALREADY_REVOKED 3 · ORPHAN 0 · **UNKNOWN 0** |
| destructive cleanup | 없음 (row DELETE 0) |
| 실제 정리 | 활성 legacy bare **서비스** 역할 1행 soft revoke (migration) |
| RETAINED_INACTIVE_HISTORY | 3행 (`member` 1 · `super_admin` 1 · `store_owner` 1 — 모두 이미 비활성) |
| 재발 방지 | 결함 2건 수정 + 5개 서비스 회귀 테스트 63 케이스 신설 |
| `users.status` 변경 | **0** |
| service_membership 변경 | **0** |

핵심 판단: **살아있는 사용자에게 붙은 활성 legacy bare 서비스 역할은 존재하지 않는다.**
정리 대상은 멤버십이 0건인 soft-deleted 사용자의 `store_owner` 1행뿐이며, 그 역할을 읽는
consumer 자체가 없어 권한 변화가 발생할 수 없다. 나머지 bare role 은 카탈로그상 정식 전역
역할이거나 이미 회수된 이력이다.

---

## 2. 전수 census — `role_assignments` (2026-08-24, 프로덕션)

접두어 없는 role 총 **22행 / 7종**. (참고: prefixed 56행 / 활성 46)

| role | 행 | 사용자 | 활성 행 | 활성 사용자 | 최초 생성 | 최종 생성 |
|---|---:|---:|---:|---:|---|---|
| `customer` | 8 | 8 | 7 | 7 | 2026-05-23 | 2026-05-23 |
| `supplier` | 6 | 6 | 6 | 6 | 2026-05-24 | 2026-07-23 |
| `store_owner` | 2 | 2 | 1 | 1 | 2026-06-17 | 2026-08-21 |
| `pharmacy` | 2 | 2 | 2 | 2 | 2026-05-28 | 2026-05-29 |
| `user` | 2 | 2 | 2 | 2 | 2026-06-20 | 2026-08-21 |
| `member` | 1 | 1 | 0 | 0 | 2026-08-21 | 2026-08-21 |
| `super_admin` | 1 | 1 | 0 | 0 | 2026-05-26 | 2026-05-26 |

행별 대조(사용자 상태 · 멤버십 · 보유 prefixed 역할)를 모두 확보했다. 요약:

- 활성 18행 중 **9행이 `users.status='deleted'` + 멤버십 0건** 인 휴면 잔재다.
- 살아있는 사용자에 붙은 활성 bare role 은 `customer`(5) · `supplier`(2) · `pharmacy`(1) ·
  `user`(1) 뿐이며 전부 아래 §3 에서 VALID_GLOBAL 로 판정됐다.

### `service_memberships.role` 축 (참고 — 본 WO 의 정리 대상 아님)

접두어 없는 membership role 이 6개 service_key 에 남아 있다:
glycopharm(`member` · `operator` · `pharmacy` · `store_owner`) · k-cosmetics(`customer` ·
`member` · `store_owner`) · kpa-branch(`user`) · kpa-society(`admin` · `member` ·
`store_owner` · `user`) · neture(`member` · `supplier`) · platform(`customer` · `super_admin`).
이 값들은 승인·재활성화 시 `role_assignments` 로 흘러가므로 §5 의 재발 방지 대상이다.

---

## 3. 판정 (§6) — 근거는 각 2개 이상

### VALID_GLOBAL — 18행 (`customer` 8 · `supplier` 6 · `user` 2 · `pharmacy` 2)

| role | 근거 1 | 근거 2 |
|---|---|---|
| `customer` | `RBAC-ROLE-CATALOG-V1` §1 Platform Roles 정식 항목 | 살아있는 보유자 5명 전원이 `platform` membership 단독 — 서비스 축이 애초에 없다 |
| `user` | 같은 카탈로그의 **기본값** 역할 | 소셜/일반 가입 write path 가 지금도 `UserRole.USER` 로 부여한다 (`auth-login.service.ts` · `socialAuthService.ts` · `user.service.ts`) |
| `supplier` | 카탈로그 §1 Commerce Roles 정식 항목 | 살아있는 인가 consumer — `content-assets.routes.ts:459` `requireRole(['partner','affiliate','seller','supplier'])`. Neture 는 WO-NETURE-ROLE-NORMALIZATION-V1 로 **의도적 unprefixed** (`supplier.service.ts:145`) |
| `pharmacy` | 살아있는 consumer — `ForumRecommendationController.ts:290` 가 bare 문자열을 그대로 읽어 추천 가중치를 준다 | `scope-assignment.utils.ts` 의 member 매핑 목록 항목. 대응 prefixed 이름(`glycopharm:pharmacy`)이 카탈로그에 **없어** 정규화 대상이 아니다 |

→ 삭제·변환 대상이 아니다. (§8 "정상 global/platform role 삭제" 금지)

### LEGACY_SERVICE_ROLE — 1행 (`store_owner`, 활성)

- 대상: user `5196c1f8…` — `users.status='deleted'` · membership **0건** · prefixed role **0건**
- 근거 1 (consumer 부재): 매장 경영자 판정은 전부 prefixed 다.
  `store-owner.utils.ts` `SERVICE_STORE_OWNER_ROLES` = `kpa:store_owner` · `glycopharm:store_owner` ·
  `cosmetics:store_owner` · `pharmacy-hub:store_owner`, `kpa-store-owner.util.ts` 는 `kpa:store_owner`.
  `scope-assignment.utils.ts` 의 member 매핑 목록에도 `store_owner` 는 없다 → 현재 권한 0.
- 근거 2 (카탈로그): 접두어 없는 정식 목록(Platform/Commerce)에 `store_owner` 가 없다.
  즉 전역 역할이 아니라 서비스 역할의 표기 drift 다.
- 근거 3 (생성 경위): D4 가 고친 `resolveGrantedRole` 이 정규화 대상으로 잡은 값과 동일 계열
  (`BARE_ROLE_NORMALIZATION_TARGETS = ['member','store_owner']`).

### ALREADY_REVOKED — 3행

| role | 사용자 | 근거 |
|---|---|---|
| `store_owner` (비활성) | `972ede50…` | 같은 사용자가 canonical `cosmetics:store_owner` 를 활성 보유 |
| `member` (비활성) | `44fa7733…` (5서비스 fixture) | 선행 WO 에서 회수됨. 5개 서비스 `{prefix}:member` 를 모두 활성 보유 |
| `super_admin` (비활성) | `b0000000…` | canonical `platform:super_admin` 활성 보유 |

→ **RETAINED_INACTIVE_HISTORY**. 회수 계약(`is_active=false` 로 이력 보존)의 정상 산출물이므로
삭제하지 않는다 (§7).

### ORPHAN 0 / UNKNOWN 0

`user_id` 가 `users` 에 없는 행은 0건이다. 판정 불가 행도 0건이다 → §13 중지 조건 미해당.

---

## 4. cleanup (§7) — 방법과 범위

`docs` 우선순위상 (1) 기존 canonical 회수 경로 재사용을 먼저 검토했다.
`MembershipConsoleController.removeMemberRole` 은 bare 이름으로 호출하면 실제 bare 행을
soft revoke 할 수 있다(D4 수정으로 403 이 풀린 경로). 그러나 대상 사용자는 멤버십이 0건이라
`checkServiceBoundary` 에서 서비스 operator 에게 404 이고, platform admin UI 로도 "회원"으로
조회되지 않아 **실행 가능한 화면 경로가 없다**. → (3) migration 을 선택했다.

신규: [`20270318000000-RevokeOrphanedBareStoreOwnerRole.ts`](../../apps/api-server/src/database/migrations/20270318000000-RevokeOrphanedBareStoreOwnerRole.ts)

```sql
UPDATE role_assignments ra SET is_active = false, updated_at = NOW()
 WHERE ra.role = 'store_owner' AND ra.is_active = true
   AND NOT EXISTS (SELECT 1 FROM service_memberships sm WHERE sm.user_id = ra.user_id)
```

- **soft revoke 만** 한다 (row DELETE 0 · 이력 보존).
- 멤버십이 한 건이라도 있으면 제외 — 어떤 서비스가 그 행을 의도했을 여지를 남기지 않는다.
- `down()` 은 의도적 no-op (되살릴 행을 정상 회수분과 구분할 수 없고, consumer 없는 역할을
  다시 켜는 방향이라 안전하지 않다). `20270317000000` 과 같은 원칙이다.
- 예상 영향: **1행** (`bare_store_owner_active` 1 → 0).

### before / after 기준값 (배포 후 §7 재확인용)

| 지표 | before (2026-08-24) | 기대 after |
|---|---:|---:|
| bare role 총 행 | 22 | 22 (삭제 없음) |
| bare role 활성 행 | 18 | 17 |
| `store_owner` 활성 | 1 | 0 |
| prefixed 총 / 활성 | 56 / 46 | 56 / 46 (불변) |
| `service_memberships` 총 | 42 | 42 (불변) |
| `users.status='deleted'` | 32 | 32 (불변) |
| fixture `44fa7733…` 활성 역할 | 8 | 8 (불변) |

---

## 5. 재발 방지 감사 (§9) — 발견 결함 2건 · 모두 수정

### D-A. Neture 가입 승인이 프로덕션에서 **항상 실패**하고 있었다 (심각)

`operator-registration.service.ts:155` 의 `ON CONFLICT (user_id, role, is_active)` 는
migration `20270301000000` 이 3 컬럼 제약을 부분 유니크 인덱스로 교체하면서 **대응 제약이
사라진 상태**였다. Postgres 는 추론 대상이 없으면 데이터와 무관하게 42P10 으로 실패하므로
Neture 공급자·파트너 가입 승인 트랜잭션 전체가 깨진다.

- 수정: `ON CONFLICT (user_id, role) WHERE is_active` — 같은 규칙을 쓰는 다른 두 호출부
  (`MembershipApprovalService` · `PharmacyHubStoreProvisioningService`)와 표현을 일치시켰다.
- 전수 확인: runtime `INSERT INTO role_assignments` 5곳 중 옛 대상이 남은 곳은 이 1곳뿐이었다.
  옛 제약 이름을 쓰는 migration 들은 `20270301000000` **이전**에 실행되므로 신규 DB 재구축에도 안전하다.

### D-B. 승인·재활성화가 접두어 없는 **admin tier** 역할을 만들 수 있었다

`MembershipApprovalService` STEP3 은 `service_memberships.role` 을 그대로 부여하는데,
정규화 대상은 `member` · `store_owner` 뿐이라 bare `admin` · `operator` · `super_admin` 은
그대로 통과했다. 프로덕션에 그런 membership 이 실재한다(kpa-society/`admin` 1 ·
glycopharm/`operator` 1 · platform/`super_admin` 2).

특히 **`super_admin` 은 로그인 경로가 `platform:super_admin` 과 동등하게 취급**하므로
(`auth-login.service.ts` `PLATFORM_ADMIN_ROLES = ['platform:super_admin','super_admin']`),
해당 membership 을 정지→복구하는 것만으로 플랫폼 관리자 권한이 생길 수 있었다. 실제로 그
membership 보유자 2명 중 1명은 `platform:super_admin` 을 갖고 있지 않다.

- 수정: 승인·재활성화 STEP3 에서 **bare admin tier 역할은 부여하지 않는다**(건너뛰고 warn 로그).
  멤버십 상태 전이는 그대로 진행된다.
- 추측 변환은 하지 않는다 (§8) — bare 값에 서비스 prefix 를 붙이는 것은 권한 확대다.
- prefixed admin tier 는 대상이 아니다 — 정지 시 내려간 역할을 되살리는 정상 lifecycle 이라
  막으면 suspend↔reactivate 대칭이 깨진다.
- **회수 방향은 그대로 둔다.** bare admin 역할이 어떤 경위로든 존재하면 반려·정지는 계속
  회수한다(부여만 막는 비대칭 — 안전한 방향).
- 정책 정합: Neture 가입 승인도 같은 이유로 이미 승격을 거부한다
  (`ROLE_PROMOTION_NOT_ALLOWED`), admin/operator 부여는 플랫폼 관리자 전용 경로의 책임이다
  (WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1).

### 정상으로 확인된 write path (변경 없음)

| 경로 | 부여 role | 판정 |
|---|---|---|
| `cosmetics-store.service.ts` | `cosmetics:store_owner` | prefixed ✔ |
| `glycopharm-member.service.ts` · `glycopharm/admin.controller.ts` | `glycopharm:pharmacist` · `glycopharm:store_owner` | prefixed ✔ |
| `kpa-store-organization.provisioning.ts` | `kpa:store_owner` | prefixed ✔ |
| `kpa/member.controller.ts` ROLE_MAP | `kpa:operator` · `kpa:admin` (member → 부여 없음) | prefixed ✔ |
| `PharmacyHubStoreProvisioningService.ts` | `pharmacy-hub:store_owner` | prefixed ✔ |
| `supplier.service.ts` · `partner-contract.service.ts` | `supplier` · `partner` | 의도적 unprefixed (WO-NETURE-ROLE-NORMALIZATION-V1) ✔ |
| 소셜/일반 가입 3경로 | `user` | Platform Core 기본값 ✔ |

### 회귀 테스트 신설

[`MembershipApprovalService.bareRoleContract.test.ts`](../../apps/api-server/src/services/approval/__tests__/MembershipApprovalService.bareRoleContract.test.ts)
— **5개 서비스 × (승인 / 정지→복구) × role 계열** 63 케이스.

고정하는 계약:
1. legacy bare `member` · `store_owner` 는 자기 서비스 prefix 가 붙어 부여된다
   (prefix 는 canonical service_key 와 다르므로 security-core SSOT 도출값을 그대로 기대).
2. bare `admin` · `operator` · `super_admin` 은 승인·복구 어느 쪽에서도 부여되지 않는다.
3. membership 활성화 자체는 막지 않는다.
4. 의도적 unprefixed 전역 역할(`supplier` · `partner` · `user` · `customer`)은 그대로 부여된다
   — 정규화 대상이 조용히 넓어지면 실패한다.
5. `INSERT` 는 부분 유니크 인덱스를 추론 대상으로 쓴다 (D-A 재발 차단).

---

## 6. fan-out 검증 (§10)

- **정적**: cleanup migration 의 WHERE 는 `role='store_owner' AND is_active AND 멤버십 0건`
  으로, 다른 서비스의 role·membership·`users` 를 건드리는 절이 없다.
- **회귀 테스트**: 5개 서비스 각각에서 자기 서비스 prefix 만 생성되는지 케이스로 고정했다.
- **기존 격리 테스트 회귀**: `src/services/approval` · `src/controllers/operator/__tests__` ·
  neture role contract → **11 suites / 198 tests PASS**.
- **배포 후 데이터 확인**: §4 before/after 표 (fixture `44fa7733…` 활성 역할 8건 불변 포함).

---

## 7. 검증 결과

| 항목 | 결과 |
|---|---|
| `npx jest` (approval · operator · neture role contract) | **11 suites / 198 tests PASS** |
| 신규 bare role 계약 테스트 | **63 tests PASS** |
| `npx tsc --noEmit` (apps/api-server) | **PASS** (출력 없음) |
| 프로덕션 census | read-only SELECT 만 수행 — write 0 |
| 프로덕션 배포 후 검증 (§11) | 런타임 코드 변경 + migration 이 있으므로 main 배포 후 수행 — 아래 §8 |

---

## 8. 프로덕션 검증 (§11) — 배포 후 확인 항목

migration 은 main 배포 시 CI/CD 로 실행된다.

- [ ] `typeorm_migrations` 에 `RevokeOrphanedBareStoreOwnerRole20270318000000` 기록
- [ ] `store_owner` 활성 행 1 → 0, bare 총 행 22 유지 (삭제 0)
- [ ] prefixed 56/46 · `service_memberships` 42 · `users.status='deleted'` 32 불변
- [ ] fixture `44fa7733…` 활성 역할 8건 불변
- [ ] 서비스 operator 로그인 → 회원 상세 진입 → 역할 조회 정상 (403/404/5xx 없음)

---

## 9. 남은 문제

1. **`service_memberships.role` 의 bare 표기 자체는 남아 있다.** 부여 경로는 정규화·차단으로
   막았지만 저장값은 그대로다. `pharmacy-hub` 처럼 표기 교정 migration 을 하려면 서비스별로
   "대응 prefixed 역할을 이미 활성 보유" 가드가 성립해야 하는데, glycopharm `pharmacy` 처럼
   대응 prefixed 이름이 카탈로그에 없는 값이 있어 일괄 처리할 수 없다 → 별도 WO.
2. **bare `pharmacy` 의 서비스 축 부재.** GlycoPharm 전용 의미인데 전역 역할로 저장되고
   consumer 도 bare 를 읽는다. 정리하려면 consumer 와 함께 옮겨야 한다 → 별도 WO.
3. **soft-deleted 사용자에 남은 활성 bare 전역 역할 9행.** 카탈로그상 정상 역할이고 계정이
   비활성이라 권한 영향이 없어 이번 범위에서 제외했다. 계정 hard delete 정책과 함께 다뤄야 한다.
4. **`RBAC-ROLE-CATALOG-V1` §1 의 bare `super_admin`·`admin` 항목과 현재 정책의 충돌.**
   `requireAdmin` 은 `platform:super_admin` 만 인정하고(WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1)
   `create-admin-user.ts` 도 bare `super_admin` 을 카탈로그 밖으로 본다. 카탈로그 갱신이
   필요하나 기준 문서 **내용 변경**이라 인라인 대상이 아니다(CLAUDE.md §16-4) → 별도 WO.
5. 후속 예정: `membership` 이 `suspended` 일 때 서비스 역할 취급을 5개 서비스 lifecycle
   계약으로 통일하는 작업 (선행 WO §8 남은 문제 2).

---

## 10. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/services/approval/MembershipApprovalService.ts` | bare admin tier 부여 차단 (승인 · 재활성화) |
| `apps/api-server/src/modules/neture/services/operator-registration.service.ts` | `ON CONFLICT` 대상을 정본 부분 유니크 인덱스로 교정 |
| `apps/api-server/src/database/migrations/20270318000000-RevokeOrphanedBareStoreOwnerRole.ts` | 신규 — 고아 bare `store_owner` soft revoke |
| `apps/api-server/src/services/approval/__tests__/MembershipApprovalService.bareRoleContract.test.ts` | 신규 — 5개 서비스 bare role 계약 회귀 63 케이스 |
| `docs/checks/WO-...-CHECK.md` | 본 문서 |

스키마 변경 없음 · API 계약 변경 없음 · 응답 형식 변경 없음.

---

*작성: 2026-08-24 · WO-O4O-CROSSSERVICE-LEGACY-BARE-ROLE-CENSUS-AND-CLEANUP-V1*
