# CHECK-O4O-STORE-LOCAL-PRODUCTS-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1

- **WO**: WO-O4O-STORE-LOCAL-PRODUCTS-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1
- **일자**: 2026-08-19
- **판정**: FIXED — 서비스 스코프 mount 추가로 `handled-products` 와 `local-products` 의 organization 해석 일치
- **DB write**: 0 (프로덕션 read-only 조회만)
- **관련**: `docs/checks/CHECK-O4O-STORE-OWNER-BACKCOMPAT-SERVICEKEY-MIGRATION-V1.md`,
  `docs/checks/CHECK-O4O-STORE-HANDLED-PRODUCTS-CROSS-SERVICE-DEDUPE-CONTRACT-V1.md`

---

## 1. 문제 (재현된 사실)

같은 My Store 문맥의 두 화면이 **서로 다른 organization** 을 해석했다.

| 화면 | API | serviceKey | 해석된 organization | 결과 |
|---|---|---|---|---|
| 취급제품 | `/api/v1/store/handled-products` | `'kpa'` 고정 | KPA 약국 조직 (`9c87f46b…`) | local 출처 항목 8건 포함 |
| 자체상품 | `/api/v1/store/local-products` | 없음 (서비스 중립 mount) | 네뚜레 공급자 조직 (`95aad740…`) | 0건 |

원인은 `resolveStoreAccess(dataSource, userId, roles)` 를 **serviceKey 없이** 호출한 것이다.
serviceKey 가 없으면 `resolveStoreOrganization()` 의 back-compat 경로가 서비스 조건 없이
`is_primary DESC → joined_at ASC → organization_id ASC` 로 조직을 고른다.

### 프로덕션 실측 (read-only, 계정 식별자 마스킹)

테스트 계정은 매장 역할(owner/admin/manager, `left_at IS NULL`)로 **조직 4개**를 보유한다.

| organization | 서비스 등록 근거 | store_local_products (active) | back-compat 정렬 |
|---|---|---|---|
| `95aad740…` 네뚜레 공급자 테스트 | enrollment `neture` | 0 | **1순위** (`is_primary=true`, 최초 가입) |
| `9c87f46b…` KPA 약국 | slug `kpa` | **8** | 2순위 |
| `83ff96c7…` K-Cosmetics 매장 | enrollment `k-cosmetics` | 0 | 3순위 |
| `13c08a86…` GlycoPharm 매장 | enrollment `glycopharm` | 0 | 4순위 |

서비스 스코프 해석(`STORE_SERVICE_ORG_LINKAGE`)을 적용하면 서비스별 후보가 **정확히 1개**다.
`kpa → 9c87f46b…` / `cosmetics → 83ff96c7…` / `glycopharm → 13c08a86…` (ambiguous 없음).

---

## 2. Census (미조사 0)

| 소비 경로 | 프론트엔드 | 서비스 문맥 | 전달 serviceKey (수정 전 → 후) |
|---|---|---|---|
| `/api/v1/store/local-products*` | `services/web-kpa-society/src/api/localProducts.ts` | KPA | 없음 → `kpa` (경로 `/api/v1/kpa/store/...`) |
| `/api/v1/store/local-products*` | `services/web-k-cosmetics/src/services/localProductApi.ts` | K-Cosmetics | 없음 → `cosmetics` |
| `/api/v1/store/local-products*` | `services/web-glycopharm/src/api/localProducts.ts` | GlycoPharm | 없음 → `glycopharm` |
| `/api/v1/pharmacy-hub/store/local-products*` | Pharmacy-Hub | PH | PH 전용 해석기 사용 — **변경 없음** |
| `/api/v1/store/handled-products*` | KPA 취급제품 | KPA | 이미 `'kpa'` 고정 (기준선) |

- Pharmacy-Hub 는 `controllers/pharmacy-hub/store-organization.resolver.ts` 로 PH enrollment 기준
  조직을 해석하며 handled-products / local-products 가 **같은 해석기**를 쓴다 → 이미 정합. 미변경.
- 요청 단위 service 신호(`X-Service-Key` 등) 계약은 존재하지 않는다
  (`x-service-group` 은 미등록 tenant-context 미들웨어, `x-service-id` 는 partner guard 전용).
  → **새 API contract 를 만들지 않고**, 플랫폼 표준인 *서비스 라우터 mount 시 serviceKey 주입* 을 따랐다 (WO §7-A).

---

## 3. 수정 내용 (최소 범위)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/platform/store-local-product.routes.ts` | `createStoreLocalProductRoutes(dataSource, serviceKey?)` — 조직 해석에 명시적 service context 전달 |
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | `router.use('/store', createStoreLocalProductRoutes(dataSource, 'kpa'))` |
| `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts` | 동일 (`'cosmetics'`) |
| `apps/api-server/src/routes/glycopharm/glycopharm.routes.ts` | 동일 (`'glycopharm'`) |
| `services/web-kpa-society/src/api/localProducts.ts` | BASE `/api/v1/store` → `/api/v1/kpa/store` |
| `services/web-k-cosmetics/src/services/localProductApi.ts` | BASE `/store` → `/cosmetics/store` |
| `services/web-glycopharm/src/api/localProducts.ts` | 경로 8곳 `/store/...` → `/glycopharm/store/...` |
| `services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx` | 주석의 경로 표기 정정(동작 변경 없음) |

- `bootstrap/register-routes.ts` 의 `app.use('/api/v1/store', createStoreLocalProductRoutes(dataSource))`
  는 **SERVICE_NEUTRAL_BACKCOMPAT** 로 유지한다(외부 소비 가능성 · 기존 계약 보존).
- 프론트엔드 변경은 WO §11 예외에 해당한다: 서비스 중립 mount 에서는 backend 가 service context 를
  알 방법이 없음이 census 로 증명됐고, 각 클라이언트의 base 경로 한 줄만 서비스 스코프로 옮겼다.
  organization id 를 프론트가 전달하는 계약은 도입하지 않았다.

### 하지 않은 것 (WO §6/§8/§12)

- membership 우선순위로 서비스 추정 ✗ / 첫 organization 선택 ✗ / `LIMIT 1` fallback ✗ /
  타 서비스 organization fallback ✗ / frontend organization id 전달 ✗
- `StoreLocalProduct` ↔ `OrganizationProductListing` 모델 통합 ✗ (조직 해석만 일치시켰다)
- schema · migration · RBAC · membership 정책 · organization 데이터 변경 ✗

---

## 4. 회귀 검증

`apps/api-server/src/__tests__/store-local-products-service-scoped-org.spec.ts` (신규, 10 케이스)

| 케이스 | 검증 |
|---|---|
| A | serviceKey 없는 mount 는 타 서비스 조직을 골라 0건 (회귀 대상 현상 고정) |
| B | `serviceKey='kpa'` mount → KPA 약국 조직 → 8건 |
| C | **`handled-products` org == `local-products` org** (WO 핵심 완료 기준) |
| D | KCos / GP mount 가 각자 서비스 조직 선택 (타 서비스 fallback 0) |
| E | 타 서비스 조직만 보유 → 후보 0 → 쓰기 403, 조직 SQL 유출 0 |
| F | store_owner role 비활성 → 조직 해석 자체를 수행하지 않음 |
| G | 같은 서비스 후보 2개 → 임의 선택 없이 차단 (ambiguity 계약 유지) |
| H | pharmacy-hub 는 공통 linkage 로 후보 0 (자체 해석기 사용) |
| I | kpa / cosmetics / glycopharm 라우터가 serviceKey 를 명시해 mount |
| J | 서비스 중립 mount 가 back-compat 로 유지됨 |

`store-owner-backcompat-servicekey.spec.ts` 의 허용 목록에서
`routes/platform/store-local-product.routes.ts` 를 제거했다(이제 serviceKey 를 받는다) — 6곳 → 5곳.

### 실행 결과

| 항목 | 결과 |
|---|---|
| api-server typecheck (`tsc --noEmit`) | 변경 파일 관련 오류 0 (잔여 오류는 미빌드 workspace 패키지 `TS2307` 및 무관 파일 1건 — 기존 상태) |
| api-server Jest 전체 | **156 suites / 2,462 tests PASS** (실패 0) |
| 프로덕션 데이터 write | 0 |

---

## 5. 배포 후 확인 (예상)

`/api/v1/kpa/store/local-products` 가 KPA 약국 조직(`9c87f46b…`)을 해석해 자체상품 8건을 반환하고,
`handled-products` 와 organization 이 동일해야 한다.
(WO §10: 데이터 건수를 맞추는 것이 목표가 아니라 **조직 해석이 같아지는 것**이 목표다.)

---

## 6. 남은 부채 (별도 WO 후보)

1. **SERVICE_NEUTRAL_BACKCOMPAT 잔여 5곳** — `store-tablet.routes.ts`, `store-library.routes.ts`,
   `store-product-library.controller.ts`, `product-ai-recommendation.controller.ts`, `seller.controller.ts`
   가 여전히 serviceKey 없이 조직을 해석한다. 같은 다중 조직 계정에서 동일한 불일치가 재현될 수 있다.
2. **서비스 중립 mount 은퇴 여부** — 외부 소비처 실측 후 `/api/v1/store/local-products` 를
   유지할지/은퇴할지 판단이 필요하다(현재는 무변경 유지).

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
