# CHECK-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1

- **WO**: WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1
- **일자**: 2026-08-14
- **범위**: `apps/api-server` — store_owner 접근의 organization 해석 (KPA / K-Cosmetics / GlycoPharm / Pharmacy-Hub)
- **판정**: **PASS** (DB write 0 · migration 0)

---

## 1. 기존 비결정적 경로 (조사 결과)

| # | 경로 | 문제 |
|---|------|------|
| 1 | `utils/store-owner.utils.ts` `isStoreOwner()` | role 은 serviceKey 로 걸렀으나 조직은 `organization_members ... LIMIT 1` — **정렬·서비스 조건 없음** |
| 2 | `createRequireStoreOwner()` / `resolveStoreAccess()` | 위 결과를 그대로 사용 → 다중 조직 계정에서 매장이 요청마다 달라질 수 있음 |
| 3 | `auth/auth-context.middleware.ts` `requireStoreAuth` | 같은 해석기를 serviceKey 없이 사용 |
| 4 | `controllers/pharmacy-hub/store-organization.resolver.ts` | 규칙 자체는 올바르나(enrollment 스코프 + ambiguous 차단) `STORE_MEMBER_ROLES` 를 **로컬 중복 정의** |
| 5 | `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` | `STORE_MEMBER_ROLES` 로컬 중복 정의 |
| 6 | `routes/kpa/helpers/event-offer-organization.helper.ts` (2곳) | enroll 스코프는 있으나 `LIMIT 1` 무정렬 |
| 7 | `modules/store-ai/utils/product-access.utils.ts` (2곳) | `organization_members ... LIMIT 1` 무정렬 |
| 8 | `modules/auth/controllers/auth-helpers.ts` | `organizationRole` 표시값이 무정렬 `LIMIT 1` |

**정상으로 판정해 손대지 않은 것** (조직이 이미 인자로 고정된 **검사형** 쿼리 — 선택이 아님):
`routes/o4o-store/utils/kpa-store-owner.util.ts` · `routes/o4o-store/controllers/store-settings.controller.ts` ·
`utils/dashboard-access.guard.ts` · `middleware/signage-role.middleware.ts` ·
`routes/glycopharm/pharmacy-context.middleware.ts` · `modules/glycopharm/resolve-pharmacy.ts`
(GlycoPharm 은 이미 enrollment 확인 + `ORDER BY is_primary` 로 결정적)
`routes/kpa/controllers/kpa-checkout.controller.ts`(알림 수신자 LIMIT 20) ·
`controllers/market-trial/marketTrialOperatorController.ts`(운영자 목록 표시용 서브쿼리) — 접근 판정 아님.

---

## 2. Canonical "service → organization" 판정 방식

새 테이블·컬럼·backfill 없이 **이미 운영 중인 두 계약의 합집합**을 사용한다.

- (a) `organization_service_enrollments(service_code, status='active')` — K-Cosmetics / Pharmacy-Hub / GlycoPharm / Neture 프로비저닝이 기록
- (b) `platform_store_slugs(service_key, is_active = true)` — **KPA 약국 매장 주소 발급 경로가 기록** (KPA 는 enrollment row 를 만들지 않는다)

프로덕션 read-only 실측으로 확인: (a) 만 쓰면 **KPA store_owner 5명 전원 후보 0** 이 되어 전부 403 이 된다.
따라서 (a) 단독 스코프는 채택 불가이며, 합집합이 유일하게 회귀 없이 스코프되는 규칙이다.

`STORE_SERVICE_ORG_LINKAGE` (신규 `utils/store-organization.resolver.ts`) — 두 테이블의 키 체계가 다르므로 실측값을 그대로 반영:

| serviceKey | enrollmentCodes | slugKeys |
|---|---|---|
| `kpa` | kpa-society, kpa | kpa |
| `glycopharm` | glycopharm | glycopharm |
| `cosmetics` | k-cosmetics, cosmetics | k-cosmetics, cosmetics |
| `pharmacy-hub` | pharmacy-hub | pharmacy-hub |

role prefix → `service_memberships.service_key` 매핑은 로컬 중복 맵을 제거하고
`resolveCanonicalServiceKey()` (`@o4o/security-core`, F1 · 소비 전용) 하나만 쓴다.

---

## 3. 변경한 소비처

**신규 2**
- `utils/store-organization.resolver.ts` (SSOT 해석기)
- `__tests__/store-owner-service-scoped-org.spec.ts` (11 tests)

**수정 10**
- `utils/store-owner.utils.ts` — `LIMIT 1` 제거 → 공통 해석기 위임, 반환형에 `resolution` 추가, membership key 중복 맵 제거
- `auth/auth-context.middleware.ts` — `requireStoreAuth` ambiguous 차단
- `controllers/pharmacy-hub/store-organization.resolver.ts` · `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` — `STORE_MEMBER_ROLES` 공통 SSOT 사용
- `routes/o4o-store/controllers/store-playlist.controller.ts` — factory 4번째 인자로 `storeOwnerServiceKey` 주입, `resolveStoreAccess()` 호출 **10곳** 전부 스코프
- `routes/kpa/kpa.routes.ts`(`'kpa'`) · `routes/cosmetics/cosmetics.routes.ts`(`'cosmetics'`) · `routes/glycopharm/glycopharm.routes.ts`(`'glycopharm'`) — mount 시 serviceKey 명시
- `routes/kpa/services/event-offer.service.ts` — `resolveStoreAccess(..., 'kpa')`
- `routes/kpa/helpers/event-offer-organization.helper.ts` · `modules/store-ai/utils/product-access.utils.ts` · `modules/auth/controllers/auth-helpers.ts` — 허용 집합 불변, 정렬만 결정적으로 (`is_primary DESC NULLS LAST → joined_at ASC → organization_id ASC`)

Neture mount 는 store_owner role 이 registry 에 없어 의도적으로 스코프하지 않았다.

---

## 4. Multi-org ambiguity 처리

- serviceKey 지정: 후보 0 → `none` (호출 측 기존 정책대로 403 `STORE_OWNER_REQUIRED` / null),
  후보 2+ → `ambiguous` + `logger.warn`, 가드는 **409 `AMBIGUOUS_STORE_CONNECTION`** (Pharmacy-Hub 해석기와 동일 코드).
  임의 선택·fallback 없음.
- serviceKey 미지정(back-compat, `/api/v1/store/*` 서비스 중립 mount): API 계약 변경이 금지되어 **허용 집합은 그대로 두고 선택만 결정적**으로 고정, 후보 2+ 이면 경고 로그.

**프로덕션 read-only 예측 (write 0)**: ambiguous **0건**.
KPA 5/5 결정적 해석(기존에 Neture 공급자 조직으로 해석될 수 있던 계정 1건 교정), cosmetics 2/3, glycopharm 0/2, pharmacy-hub 1/3.
새로 차단되는 (user × service) 5건은 전부 다중 서비스 **테스트 계정 2개**(`3f5582bc`, `6967ebe0`)이며, 모두 WO 가 금지한 교차 서비스 조직 노출에 해당한다.
GlycoPharm 자체 SSOT(`resolveGlycopharmPharmacyId`)는 해당 계정을 이미 차단하고 있었다 — 공통 가드 쪽이 예외였다.

---

## 5. 테스트 / typecheck

- `npx tsc --noEmit -p tsconfig.json` (api-server) — **PASS** (출력 없음)
- `npx jest src/__tests__ src/services/pharmacy-hub/__tests__` — **35 suites / 686 tests PASS**
- 신규 spec 11 tests — 검증 케이스 A~F 커버. B 는 후보 SQL 에 두 linkage 테이블이 모두 들어가고 `LIMIT 1` 이 없음을 단언, back-compat SQL 에는 enrollment 조건이 **없음**을 단언.
- 케이스 G(4서비스 기존 정상 사용자 회귀)는 프로덕션 read-only 예측 쿼리로 대체 검증했다.
  **브라우저 smoke 는 이번 WO 에서 수행하지 않았다** — 본 변경은 로그인 사용자별 조직 해석이라
  실계정 세션이 필요하고, WO 의 "DB write 0 · 기존 membership/enrollment 미수정" 제약 아래에서
  ambiguous 경로를 실브라우저로 재현할 수 있는 계정이 없다. PASS 로 기록하지 않는다.

---

## 6. DB / migration

- **DB write 0**, migration 0, schema 변경 0.
- 프로덕션 접근은 Cloud SQL Auth Proxy 경유 **read-only SELECT** 뿐이며 자격증명은 파일로 남기지 않았다.
- organization / enrollment 자동 생성 없음, 사용자 조직 이동 없음, 기존 운영 데이터 수정 없음.

---

## 7. 잔여 부채 (별도 판단 대상 — 본 WO 에서 고치지 않음)

1. `/api/v1/store/*` 서비스 중립 mount 는 여전히 serviceKey 를 모른다. 스코프하려면 API 계약 변경이 필요하다(본 WO 금지).
2. `modules/store-ai/utils/product-access.utils.ts` 는 조직을 하나 고른 뒤 OPL 을 확인하므로, 다중 조직 사용자가 "다른 조직에 있는 진열"로는 여전히 거부될 수 있다. 정렬 고정으로 **결정적**이 되었을 뿐 의미 확장은 하지 않았다.
3. KPA 가 `organization_service_enrollments` 를 쓰지 않는 것 자체(서비스별 연결 계약 이원화)는 데이터 모델 정합 과제로 남는다.
