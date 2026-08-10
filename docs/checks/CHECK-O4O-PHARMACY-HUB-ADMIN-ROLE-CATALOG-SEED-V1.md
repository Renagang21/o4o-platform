# CHECK-O4O-PHARMACY-HUB-ADMIN-ROLE-CATALOG-SEED-V1

- **WO**: `WO-O4O-PHARMACY-HUB-ADMIN-ROLE-CATALOG-SEED-V1`
- **작성일**: 2026-08-10
- **판정**: **PASS** — `roles` 카탈로그에 `pharmacy-hub:admin` 1행 등재. write 는 정확히 이 1행뿐이며 다른 테이블 변경 0.

선행: [`CHECK-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1`](CHECK-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1.md) §2 에서
"승인 후 처리" 로 남겨 뒀던 항목이다.

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `0198c1627` (worktree clean) |
| migration commit | `39d30bb21` |

---

## 2. 재사용한 기존 seed 패턴

`apps/api-server/src/database/migrations/20270216000000-SeedPharmacyHubServiceAndRoles.ts` 의
`roles` INSERT 를 **그대로** 재사용했다 (신규 방식 도입 없음).

```sql
INSERT INTO roles (name, display_name, description, service_key, role_key,
                   is_system, is_admin_role, is_assignable, is_active)
VALUES (...)
ON CONFLICT (name) DO UPDATE SET ... , updated_at = now()
```

필드 값 표준은 기존 4서비스 Admin 역할 실측에서 가져왔다.

| name | display_name | description | role_key | is_system | is_admin_role | is_assignable |
|---|---|---|---|:--:|:--:|:--:|
| `kpa:admin` | KPA Admin | KPA service administrator | admin | t | t | t |
| `neture:admin` | Neture Admin | Neture administrator | admin | t | t | t |
| `glycopharm:admin` | GlycoPharm Admin | GlycoPharm administrator | admin | t | t | t |
| `cosmetics:admin` | K-Cosmetics Admin | K-Cosmetics administrator | admin | t | t | t |
| **`pharmacy-hub:admin`** | **Pharmacy-Hub Admin** | **Pharmacy-Hub administrator** | **admin** | **t** | **t** | **t** |

신규 파일: `apps/api-server/src/database/migrations/20270226000000-SeedPharmacyHubAdminRole.ts` (1파일)
— 직전 migration `20270225000000` 의 +1일 규칙을 따랐다. 등록은 glob 기반이라 index 수정이 없다.

---

## 3. 적용 전후 대상 역할 상태

| 축 | 적용 전 | 적용 후 |
|---|---|---|
| `roles` where name = `pharmacy-hub:admin` | **0행** | **1행** |
| `roles` where service_key=`pharmacy-hub` | operator · store_owner · supplier (3) | + admin (4) |
| `roles` 전체 | 38 | 39 |

적용 후 행 실측:

```text
pharmacy-hub:admin | Pharmacy-Hub Admin | Pharmacy-Hub administrator
service_key=pharmacy-hub | role_key=admin | is_system=t | is_admin_role=t | is_assignable=t | is_active=t
```

---

## 4. migration 적용 · 실제 write 결과

프로덕션 DB write 는 **직접 실행하지 않았다.** main push → CI/CD 표준 경로로 적용했다
(`PRODUCTION-MIGRATION-STANDARD`).

| 항목 | 값 |
|---|---|
| workflow | `Deploy API Server (Cloud Run)` — **success** |
| headSha | `39d30bb21` |
| `typeorm_migrations` 기록 | `SeedPharmacyHubAdminRole20270226000000` **1건** |
| 실제 write | `roles` **INSERT 1행** |

---

## 5. 불변성 검증 (read-only 실측)

| 검증 | 결과 |
|---|:--:|
| `pharmacy-hub:admin` 정확히 1건 | **PASS** |
| 동일 역할 중복 0 (`service_key='pharmacy-hub' AND role_key='admin'` → 1) | **PASS** |
| 기존 roles 38행 전량 불변 | **PASS** — 신규 행 제외 fingerprint `cb81e95e…` **적용 전후 동일** |
| `users` write 0 | **PASS** — 45 → 45 |
| `role_assignments` write 0 | **PASS** — 43 → 43 |
| `service_memberships` write 0 | **PASS** — 21 → 21 |
| `service_credentials` write 0 | **PASS** — 41 → 41 |
| roles 외 테이블 변경 | **없음** — migration SQL 이 `roles` 단일 문 1개 |
| 스키마 변경 | **없음** — DDL 0 |

> fingerprint = `md5(string_agg(name|display_name|description|service_key|role_key|is_admin_role|is_assignable|is_active, order by name))`
> 를 `name <> 'pharmacy-hub:admin'` 조건으로 계산한 값. 적용 전 전체 38행 값과 적용 후 값이 같다.

### 반복 실행 안전성

- `ON CONFLICT (name) DO UPDATE` 의 conflict target 을 **실제 unique index 로 확인**했다 —
  `UQ_roles_name UNIQUE (name)`. (없으면 런타임 오류가 나므로 필수 확인 항목이다.)
- 추가로 `idx_roles_service_role UNIQUE (service_key, role_key) WHERE service_key IS NOT NULL` 이 있어
  같은 서비스에 admin 역할이 둘 생기는 것을 DB 가 구조적으로 막는다.
- 재실행 시 행 수는 불변이고 같은 값으로 수렴한다(`updated_at` 만 갱신).
- `down()` 은 해당 1행만 DELETE 한다.

---

## 6. 역할 목록 노출 확인 (프로덕션 API smoke)

`GET /api/v1/operator/roles?service=pharmacy-hub` → **200**

```text
pharmacy-hub:admin       | Pharmacy-Hub Admin       | assignable=True | adminRole=True  | active=True
pharmacy-hub:operator    | Pharmacy-Hub Operator    | assignable=True | adminRole=False | active=True
pharmacy-hub:store_owner | Pharmacy-Hub Store Owner | assignable=True | adminRole=False | active=True
pharmacy-hub:supplier    | Pharmacy-Hub Supplier    | assignable=True | adminRole=False | active=True
```

`MembershipConsoleController` 의 역할 부여 경로도 같은 `roles` 행의 `isAssignable` 을 읽으므로
(`MembershipConsoleController.ts:1346`) 이제 admin 부여가 카탈로그 기준으로도 유효하다.

---

## 7. 권한 가드 회귀 없음

migration 은 카탈로그 행만 추가하며 guard 2계층은 이 테이블을 읽지 않는다. 실측으로 재확인했다.

| 계정 | route | 결과 |
|---|---|---|
| admin(+operator) | `/pharmacy-hub/operator/ping` | **200** |
| admin(+operator) | `/pharmacy-hub/operator/memberships` | **200** |
| admin(+operator) | `/pharmacy-hub/store-owner/ping` · `/supplier/ping` | **403 / 403** |
| store_owner | `/pharmacy-hub/store-owner/ping` | **200** |
| store_owner | `/pharmacy-hub/operator/ping` | **403** |

---

## 8. 테스트 · 빌드

| 항목 | 결과 |
|---|---|
| `jest src/__tests__/security` | **PASS** 13 suites / 296 tests |
| api-server `tsc --noEmit` | **PASS** |
| api-server `npm run build` | **PASS** — `dist/database/migrations/20270226000000-*.js` 생성 확인 |
| 프런트 빌드 | **불필요** — 프런트 변경 0 |

---

## 9. 중지 조건 점검

| 조건 | 해당 |
|---|:--:|
| roles 스키마 변경 필요 | ❌ |
| 기존 역할 행 수정·삭제 필요 | ❌ |
| 역할 식별자 표준이 코드와 DB 에서 충돌 | ❌ — 코드 `ROLE_REGISTRY['pharmacy-hub:admin']` 과 DB `name` 일치 |
| migration 이 역할 외 테이블 변경 | ❌ |
| 예상 1건 초과 write | ❌ — 정확히 1건 |

---

## 10. commit · push

| commit | 내용 |
|---|---|
| `39d30bb21` | feat(db): roles 카탈로그에 pharmacy-hub:admin 등재 |
| (본 문서) | docs(check): 결과 기록 |

`HEAD == origin/main`, 본 WO 범위 미커밋 0건.

---

## 11. 최종 판정 — 공통화 작업 시작 가능 여부

**시작해도 된다.**

Pharmacy-Hub 4역할이 코드(`PHARMACY_HUB_SCOPE_CONFIG` · `ROLE_REGISTRY`) · 권한 가드 ·
`roles` 카탈로그 · RBAC 문서에서 **모두 같은 정의**로 정렬됐다. 공통화 조사에서 Pharmacy-Hub 역할을
완결된 기준으로 사용할 수 있다.

### 선행 정비로 넘기는 항목 (본 작업에 섞지 않음)

1. **GlycoPharm `scopeRoleMapping` 누락** — mapping 이 없어 admin/operator 가 fallback(`allowedRoles` 전체 허용)
   으로 평가된다. Pharmacy-Hub · KPA · Neture · K-Cosmetics 와 다른 유일한 서비스다.
   공통화 조사에서 **선행 정비 항목**으로 분리해 판단한다.
2. `platform:admin` 카탈로그 행이 `description = 'Platform administrator (deprecated)'` 인데
   `is_active = true` 다 (관찰만 — 이번 범위 밖).

---

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (GlycoPharm `scopeRoleMapping`)
