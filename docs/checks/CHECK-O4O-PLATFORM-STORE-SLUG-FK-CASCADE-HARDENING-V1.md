# CHECK-O4O-PLATFORM-STORE-SLUG-FK-CASCADE-HARDENING-V1

- **WO**: `WO-O4O-PLATFORM-STORE-SLUG-FK-CASCADE-HARDENING-V1`
- **일자**: 2026-08-18
- **기준 commit**: `5a81b9ccb`
- **대상**: `platform_store_slugs.store_id` → `organizations.id` FK + `ON DELETE CASCADE`
- **production DB write**: 0 (census 는 read-only, 스키마 변경은 migration 을 통한 CI/CD 자동 적용)

---

## 1. 결론

`platform_store_slugs` 는 매장 공개 주소의 canonical 테이블이지만 **FK 가 없어**
조직이 hard delete 되면 slug 가 orphan 으로 남았다. 지금까지 orphan 은 application
경로(`OrganizationService.deleteOrganization` 의 잔재 정리 + 정리 WO 2건)로만 막고 있었다.

전제(현재 orphan 0 / 중복 0 / 타입 호환)를 실측으로 확인한 뒤
**DB referential integrity 로 재발을 구조적으로 차단**한다.

```sql
ALTER TABLE platform_store_slugs
  ADD CONSTRAINT "FK_platform_store_slugs_organization"
  FOREIGN KEY (store_id) REFERENCES organizations(id) ON DELETE CASCADE;
```

application cleanup 은 **그대로 유지**한다(§5). 리팩터링하지 않았다.

---

## 2. pre-migration production census (read-only)

Cloud SQL Proxy 경유 실측.

| 항목 | 결과 |
|---|---|
| `platform_store_slugs` 총 row | **15** |
| `store_id IS NULL` | **0** |
| `is_active = true` | 15 |
| service_key 분포 | cosmetics 2 / kpa 7 / pharmacy-hub 6 (glycopharm 0) |
| orphan (`organizations` 미존재) | **0** |
| 중복 slug | **0** |
| 동일 org 다중 active slug | **0** |
| `platform_store_slugs.store_id` 타입 | `uuid` NOT NULL |
| `organizations.id` 타입 | `uuid` NOT NULL → **호환** |
| 기존 constraint | `platform_store_slugs_pkey`(PK), `platform_store_slugs_slug_key`(UNIQUE slug) — **FK 0건** |
| 기존 index | pkey / slug_key / `idx_platform_store_slugs_slug` / `idx_platform_store_slugs_service_store(service_key, store_id)` |
| trigger (non-internal) | **없음** |
| RLS (`relrowsecurity` / `relforcerowsecurity`) | `f` / `f` |
| relation size | 139,264 bytes (`reltuples` 1) |
| `organizations` row | 24 |
| 의존 view | `public.v_glycopharm_pharmacies` — `LEFT JOIN platform_store_slugs pss ON pss.store_id = o.id` (조직 축을 재확인해 주며 FK 를 막지 않는다) |
| `platform_store_slug_history` | PK 만 존재, **0 row** |
| 마지막 적용 migration | `CreateHandoffTokens20270311000000` |

테이블이 매우 작아 `ALTER TABLE` lock 영향은 무시할 수 있다 →
`NOT VALID` → `VALIDATE CONSTRAINT` 2단계로 나누지 않았다(불필요한 복잡도 금지).

---

## 3. store_id 축 census (미조사 0)

코드 전체에서 `platform_store_slugs.store_id` 에 **쓰는** 경로 전수.

| 경로 | store_id 표현식 | 축 |
|---|---|:---:|
| `routes/cosmetics/services/cosmetics-store.service.ts` (2곳) | `orgId` / `organizationId` | organizations.id |
| `routes/glycopharm/services/glycopharm-member.service.ts` | `organizationId` | 〃 |
| `routes/glycopharm/services/glycopharm.service.ts` | `org.id` | 〃 |
| `routes/glycopharm/controllers/admin.controller.ts` | `createdOrg.id` | 〃 |
| `routes/glycopharm/controllers/store-applications.controller.ts` | `createdOrg.id` | 〃 |
| `routes/kpa/controllers/organization.controller.ts` | `saved.id` (organization) | 〃 |
| `routes/kpa/services/kpa-store-organization.provisioning.ts` | `orgResult.id` | 〃 |
| `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` | `organizationId` | 〃 |
| `routes/o4o-store/controllers/store-hub.controller.ts` (`changeSlug`) | `organizationId` | 〃 |
| `routes/platform/store-policy.routes.ts` (`changeSlug`) | `ctx.storeId` (= slug record 의 store_id) | 〃 |
| `database/migrations/` KPA backfill 6건 | `SELECT ... FROM organizations` | 〃 |

이 집합은 기존 정적 census 회귀 테스트(`__tests__/store-slug-store-id-axis.spec.ts`)가
이미 고정하고 있다 — 호출부가 늘거나 축이 어긋나면 테스트가 깨진다.

**service-local PK 를 넣는 경로 (중지 조건 §11) 확인**

| 파일 | 내용 | 판정 |
|---|---|---|
| `src/migrations/1771200000001-BackfillPlatformStoreSlugs.ts` | `glycopharm_pharmacies.id` / `cosmetics_stores.id` 를 store_id 로 INSERT | **dead** |
| `src/migrations/1771200000000-CreatePlatformStoreSlugsTables.ts` | 같은 디렉터리 | **dead** |

`src/migrations/` 는 migration 러너가 스캔하지 않는 디렉터리다
(`database/connection.ts` → `dist/database/migrations/*.js` / `__dirname + '/migrations/*.ts'`,
즉 `src/database/migrations/`). 실행 이력도 없다 — production `typeorm_migrations` 에
`BackfillPlatformStoreSlugs` / `CreatePlatformStoreSlugsTables` **0건**.
따라서 살아 있는 write 경로 중 service-local PK 를 넣는 곳은 **0** → FK 추가 진행.

---

## 4. migration

`apps/api-server/src/database/migrations/20270312000000-AddPlatformStoreSlugsOrganizationFk.ts`

| 단계 | 내용 |
|---|---|
| 0 | `to_regclass` 로 두 테이블 존재 확인 — 없으면 no-op |
| 1 | precondition census: orphan > 0 이면 **ALTER 전에 throw** (원인이 로그에 남는다) |
| 2 | `DROP CONSTRAINT IF EXISTS` → `ADD CONSTRAINT ... ON DELETE CASCADE` (재실행 안전) |
| 3 | 검증: `pg_constraint.confdeltype = 'c'` 아니면 throw |
| down | constraint 만 제거 (데이터 무변경) |

- constraint 명 `FK_platform_store_slugs_organization` — 저장소의 TypeORM 스타일 관례
  (`FK_stcc_tablet`, `FK_checkout_payments_order`, `FK_store_capability_org` 등)를 따랐다.
- entity(`platform-store-slug.entity.ts`) 에는 relation 을 추가하지 않았다 —
  DB 제약만 추가하는 변경이며 entity 관계 신설은 WO 범위 밖이다.

---

## 5. cascade 계약 (§7)

`OrganizationService.deleteOrganization()` 의 slug 잔재 정리는 **유지**한다.

- 정리 → `organizations` DELETE 순서로 **같은 트랜잭션**에서 실행된다.
  CASCADE 발동 시점에는 대상 row 가 이미 0건이라 double-delete 오류가 발생하지 않는다
  (없는 row 를 지우는 DELETE 는 no-op).
- `platform_store_slug_history` 에는 이번에 FK 를 걸지 않았으므로,
  history 정리는 여전히 application cleanup 이 유일한 경로다 → 제거하면 안 된다.
- 이 두 성질을 회귀 테스트로 고정했다(§6).

---

## 6. 테스트

### 6-1. ephemeral postgres 실측 (docker `postgres:16-alpine`, 컨테이너 종료 후 삭제)

프로덕션과 동일한 DDL 형상으로 재현해 FK 의 실제 의미를 확인했다.

| 케이스 | 결과 |
|---|---|
| orphan 1건이 남아 있는 상태에서 FK 생성 | **실패** (`violates foreign key constraint`) — precondition census 의 필요성 실증 |
| orphan 정리 후 FK 생성 | 성공, `confdeltype='c'` / `confupdtype='a'` / `convalidated=true` |
| 정상 org + slug insert | **통과** |
| 존재하지 않는 organization_id insert | **FK 위반으로 차단** (row 0) |
| organization 삭제 | 해당 org slug **cascade 삭제 (0건)** |
| 다른 organization slug | **유지 (각 1건)** |
| 삭제 후 orphan | **0** |
| application cleanup 선행 후 org 삭제 (현행 순서) | 오류 없음 |
| `down` 실행 | constraint 0건 (테이블·데이터 유지) |
| down 후 재적용 | 성공 (멱등) |

### 6-2. Jest

| 항목 | 결과 |
|---|---|
| 신규 `__tests__/platform-store-slug-fk-cascade.spec.ts` | **7/7 PASS** (FK 문구·CASCADE·orphan guard·검증 실패·no-op·down·조직 삭제 순서) |
| slug / provisioning / store-owner 관련 9 suite | **119/119 PASS** |
| api-server 전체 Jest | **144 suite / 2282 test PASS** |
| `tsc --noEmit` apps/api-server | PASS |
| `tsc --noEmit` packages/organization-core | PASS |
| `tsc --noEmit` packages/platform-core | PASS |

4서비스 provisioning 회귀: KPA(`kpa-store-organization.provisioning.test.ts`),
PharmacyHub(`PharmacyHubStoreProvisioningService.reuse-guard.test.ts`),
KCos·GP(`store-slug-store-id-axis.spec.ts` / `store-slug-canonical-contract.spec.ts`) 모두 PASS.

---

## 7. production 적용 검증 (§9)

migration 은 CI/CD 자동 적용이 원칙이다(CLAUDE.md §0). **실데이터 organization 삭제 smoke 는 하지 않았다.**

적용 후 검증 결과는 §7-1 에 기록한다.

---

## 8. 잔존 위험

1. **`platform_store_slug_history` 에는 FK 를 걸지 않았다.** WO §5 범위가 `platform_store_slugs`
   이고, history 는 현재 0 row 다. 조직이 삭제되면 history 는 application cleanup 에만 의존한다
   → 같은 방식의 FK 추가는 별도 WO 로 분리 제안.
2. **dead migration 디렉터리 `apps/api-server/src/migrations/`** 에 축이 어긋난 backfill 이 남아 있다
   (실행 이력 0, 러너 미스캔). 이번 WO 에서는 손대지 않았다 — 디렉터리 정리는 별도 WO.
3. FK 는 orphan 재발만 막는다. **축을 잘못 넣는 write(존재하는 다른 조직의 id)** 는 FK 로 막히지 않으며
   기존 정적 census 테스트가 그 방어선이다.
4. 조직 hard delete 경로가 늘어나면 slug 는 자동 정리되지만, slug 가 사라진다는 사실 자체를
   운영이 인지해야 한다(공개 주소 소멸).

---

## 9. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§8-1, §8-2).
