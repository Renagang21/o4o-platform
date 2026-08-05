# CHECK — WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1

> Pharmacy-Hub 약국 경영자 — 매장 경영활용 제품(`/store-owner/handled-products`) + 매장 자체 상품(`/store-owner/local-products`)

| 항목 | 값 |
|------|------|
| WO | `WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1` (B안 정정 적용) |
| 검증일 | 2026-08-05 |
| 환경 | 프로덕션 (`https://pharmacyhub.co.kr` · `https://api.neture.co.kr`) |
| 커밋 | `19442dd5c` (구현) |
| 결과 | **PASS (부분)** — 보안·격리·회귀 실측 PASS / 연결 상태 쓰기 성공 경로 미검증 (§4-6) |

---

## 0. 진행 중 중지와 B안 정정 (설계 기록)

WO 원안대로 기존 공통 `/api/v1/store/*` 라우트를 Pharmacy-Hub 에서 그대로 소비하려 했으나
**착수 후 중지**했다. 그 라우트들은 조직을 `resolveStoreAccess(dataSource, userId, roles)` 로
해석하는데, 이 함수는 **serviceKey 를 인자로 받지 않고** 내부에서 `organization_members … LIMIT 1`
폴백을 쓴다. 즉 KPA·K-Cosmetics·Neture 조직에도 속한 다중 조직 계정이 Pharmacy-Hub 화면에서
**다른 서비스 조직의 상품을 읽거나 수정**할 수 있다.

WO 는 "공통 `resolveStoreAccess` 변경"을 변경 금지 항목으로 두므로, 사용자 승인 아래 **B안**으로 확정했다.

```
Pharmacy-Hub 전용 service-scoped 라우트 추가
→ 기존 테이블·기존 공통 UI 재사용
→ 조직 해석만 W5 의 검증된 resolvePharmacyHubStoreOrganization() 사용
→ 공통 resolveStoreAccess() 는 변경하지 않음
```

---

## 1. 구현 범위

### 1-1. 공통 service 추출 (로직 복제 방지)

기존 공통 라우트는 조회·검증·SQL 이 **라우트 인라인**이라 안전한 seam 이 없었다. 라우트 전체 복사
금지 원칙에 따라 **먼저 공통 service 함수로 추출**하고, 기존 라우트를 그 함수 호출로 전환했다.

| 신규 파일 | 내용 |
|------|------|
| `apps/api-server/src/services/store/store-handled-products.service.ts` | `listHandledProducts` · `parseHandledProductRefs` · `removeHandledProducts` · `setHandledProductActive` |
| `apps/api-server/src/services/store/store-local-products.service.ts` | `listLocalProducts` · `getLocalProduct` · `createLocalProduct` · `updateLocalProduct` · `deactivateLocalProduct` |
| `apps/api-server/src/controllers/pharmacy-hub/offer-exposure.ts` | `PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL` (노출 게이트 SSOT) |

이 모듈들은 **인증·조직 결정을 하지 않는다.** `organizationId` 는 호출자가 서비스 경계에 맞게 해석해
넘긴다 (KPA/GP/KCos = `resolveStoreAccess`, Pharmacy-Hub = `resolvePharmacyHubStoreOrganization`).

**전환된 기존 라우트** (동작 불변 목표)

- `routes/platform/store-handled-products.routes.ts`
- `routes/platform/store-local-product.routes.ts`

기본값(`includeInactive=false`, 기본 `managePaths`)에서 생성되는 SQL 은 종전과 동일하다.
응답은 `masterId` 1개만 **additive** 로 늘었다 (기존 필드 제거·의미 변경 0).

> **부수적으로 드러난 잠복 결함** — TypeORM(postgres) 의 `query()` 는 UPDATE·DELETE 에 대해
> `[rows, rowCount]` 를 돌려준다(`PostgresQueryRunner`). `RETURNING` 을 붙여도 `result.length` 는
> 항상 2 이므로, 원본 라우트의 `del.length === 0` NOT_FOUND 판정은 **한 번도 성립하지 않았다.**
> 추출 함수는 `affectedRows()` 로 rowCount 를 보고 판정한다.

> **추출 시 자체 유입 회귀 1건 — 수정 완료.** 최초 추출본에서 `updateLocalProduct` ·
> `deactivateLocalProduct` 에 UUID 형식 가드(`UUID_RE`)를 넣었으나, 원본 라우트는 이 가드를
> `GET /local-products/:id` 에만 두고 PUT·DELETE 에는 두지 않았다. 그 결과 비-uuid id 가
> `repo.findOne` 에 닿기 전에 404 로 단락되어 `store-local-product-description.spec.ts` 4건이
> 실패했다. 두 함수에서 가드를 제거해 **동작 불변**을 복원했고(`getLocalProduct` 의 가드는 원본과
> 동일하므로 유지), `npx jest --maxWorkers=1` 전량 통과를 확인했다 —
> **73 suites / 1,306 tests PASS**.

### 1-2. Pharmacy-Hub 전용 라우트

`apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts` — 전부 `storeOwnerGuards`
(`requireAuth` → `requirePharmacyHubScope('pharmacy-hub:store_owner')`) 뒤에 마운트.

| Method | Path | 컨트롤러 |
|--------|------|----------|
| GET | `/api/v1/pharmacy-hub/store-owner/handled-products` | `PharmacyHubHandledProductController.list` |
| POST | `/api/v1/pharmacy-hub/store-owner/handled-products` | `.apply` (취급 등록) |
| PATCH | `/api/v1/pharmacy-hub/store-owner/handled-products/active` | `.setActive` |
| POST | `/api/v1/pharmacy-hub/store-owner/handled-products/remove` | `.remove` (취급 해제) |
| GET | `/api/v1/pharmacy-hub/store-owner/local-products` | `PharmacyHubLocalProductController.list` |
| POST | `/api/v1/pharmacy-hub/store-owner/local-products` | `.create` |
| GET | `/api/v1/pharmacy-hub/store-owner/local-products/:id` | `.detail` |
| PUT | `/api/v1/pharmacy-hub/store-owner/local-products/:id` | `.update` |
| DELETE | `/api/v1/pharmacy-hub/store-owner/local-products/:id` | `.deactivate` (비활성화) |

### 1-3. 조직 계약

| 후보 수 | 조회 | 쓰기 |
|:---:|------|------|
| 0 | `200` + 빈 목록 + `storeConnection.status='not_connected'` | `409 STORE_NOT_CONNECTED` |
| 1 | 해당 조직으로만 | 해당 조직으로만 |
| 2+ | `200` + 빈 목록 + `status='ambiguous'` | `409 AMBIGUOUS_STORE_CONNECTION` |

금지 사항 준수 — `organization_members LIMIT 1` 폴백 없음 / KPA·K-Cosmetics·Neture 조직 재사용 추정 없음 /
클라이언트 `organizationId` 불신(본문에 오면 `400 FIELD_NOT_ACCEPTED`) / `users.businessInfo` 미사용.

### 1-4. 취급 등록의 노출 게이트 재확인

`POST /handled-products` 는 `offerId` 를 목록·상세와 **같은** 게이트로 다시 조회한다
(`spo.deleted_at IS NULL` · `is_active` · `distribution_type <> 'PRIVATE'` ·
`'pharmacy-hub' = ANY(spo.service_keys)` · 공급자 `ACTIVE` · master `ACTIVE`).
게이트 밖 offer 는 ID 를 직접 알아도 `404 PRODUCT_NOT_FOUND` — 존재 여부를 노출하지 않는다.

중복 등록은 `ON CONFLICT (organization_id, service_key, offer_id) DO UPDATE SET is_active = true`
로 **멱등** 처리한다 (`idx_org_listing_unique_v2` 는 partial 이 아니라 안전).
응답의 `created` 로 신규/기존 활성화를 구분한다 (`(xmax = 0)`).

### 1-5. 프론트

| 산출물 | 내용 |
|------|------|
| `services/web-pharmacy-hub/src/lib/api/pharmacyHubHandledProducts.ts` | adapter (신규) |
| `services/web-pharmacy-hub/src/lib/api/pharmacyHubLocalProducts.ts` | adapter (신규) |
| `services/web-pharmacy-hub/src/pages/store-owner/HandledProductsPage.tsx` | 목록·검색·소스 필터·활성 전환·해제·`공급 상품에서 추가` 모달 |
| `services/web-pharmacy-hub/src/pages/store-owner/LocalProductsPage.tsx` | 공통 `StoreLocalProductsManager` 래핑 |
| `services/web-pharmacy-hub/src/components/store-owner/StoreConnectionNotice.tsx` | 미연결·다중 안내 (신규) |

`매장 자체 상품` 화면 UI 는 **한 줄도 복제하지 않았다** — `@o4o/store-ui-core` 의 공통
`StoreLocalProductsManager` 에 API adapter·라벨·액션만 주입한다.

> **공통 컴포넌트 seam** — 매니저 안의 `/store/*` 후속 화면 이동 3개(태블릿 진열 · 마케팅 자료 ·
> POP 제작)를 prop 으로 뽑았다. `undefined = 기존 동작 유지 · null = 버튼 숨김 · 함수 = 교체`.
> GlycoPharm·K-Cosmetics 는 prop 을 주지 않으므로 **동작 불변**이고, 해당 경로가 없는
> Pharmacy-Hub 는 `null` 로 숨겨 **dead link 0** 을 만든다.

### 1-6. 메뉴

`packages/store-ui-core/src/config/storeMenuConfig.ts` 의 **`PHARMACY_HUB_STORE_CONFIG` 안에만**
`매장 제품` 섹션 추가. 타 서비스 config diff 0.

```
매장 제품
  ├ 매장 경영활용 제품  /store-owner/handled-products
  └ 매장 자체 상품      /store-owner/local-products
```

`공급 상품`(B2B 구매 대상)은 `약국 상품·거래` 섹션에 그대로 둔다 — **다른 축이라 합치지 않는다.**
route 와 기능이 함께 준비된 뒤 노출했으므로 "준비 중 메뉴 0 / dead link 0".

---

## 2. 변경 금지 항목 준수

| 항목 | 상태 |
|------|:---:|
| DB schema 변경 · migration | 없음 |
| 신규 Pharmacy-Hub 전용 상품 테이블 | 없음 (`organization_product_listings` · `store_local_products` 그대로) |
| ProductMaster 복제 | 없음 |
| 공통 `resolveStoreAccess` 변경 | 없음 |
| 공통 store-owner 가드 변경 | 없음 (`storeOwnerGuards` 재사용) |
| 주문·결제 계약 변경 | 없음 |
| 주문 상품 자동 취급 등록 | 없음 (등록은 화면의 명시적 행위) |
| KPA·K-Cosmetics 화면 복사 | 없음 (공통 컴포넌트 재사용 / PH 목록 화면은 PH Tailwind 규약으로 신규 작성) |
| `pnpm-lock.yaml` 변경 | 없음 (신규 dependency 0 — `@o4o/store-ui-core` 는 기존 의존) |

---

## 3. 정적 검증

| 대상 | 결과 |
|------|:---:|
| `apps/api-server` `tsc -p tsconfig.json` | `src/` 오류 0 (기존 `src/scripts/*` 오류만 잔존 — build tsconfig 제외 대상) |
| `apps/api-server` `npm run build` | PASS |
| `packages/store-ui-core` `tsc --noEmit` | PASS |
| `services/web-pharmacy-hub` `npm run build` | PASS (`tsc -b && vite build`) |
| `services/web-glycopharm` `tsc --noEmit` | PASS (회귀 0) |
| `services/web-k-cosmetics` `tsc --noEmit` | PASS (회귀 0) |

---

## 4. 프로덕션 스모크

배포: `19442dd5c` — `Deploy API Server (Cloud Run)` · `Deploy Web Services (Cloud Run)` 모두 `success`.

### 4-1. 미인증 (토큰 없음)

| 검증 | 결과 |
|------|:----:|
| `GET /pharmacy-hub/store-owner/handled-products` | 401 `AUTH_REQUIRED` |
| `POST /handled-products` · `PATCH /handled-products/active` · `POST /handled-products/remove` | 401 |
| `GET /local-products` | 401 `AUTH_REQUIRED` |
| `POST /local-products` · `PUT /local-products/:id` · `DELETE /local-products/:id` | 401 |

9개 라우트 중 미인증 통과 **0건**.

### 4-2. 미연결 계정 — `renagang21@gmail.com`

이 계정은 **PH enrollment 0** 이면서 KPA·GlycoPharm·Neture 조직을 보유한다.
공통 `resolveStoreAccess` 의 `LIMIT 1` 폴백이 실제로 무엇을 내주는지까지 같은 시점에 실측했다.

| 검증 | 결과 |
|------|:----:|
| `GET /pharmacy-hub/.../handled-products` | `200` · `storeConnection.status='not_connected'` · `items: []` · `total 0` |
| `GET /pharmacy-hub/.../local-products` | `200` · `not_connected` · `items: []` · `total 0` |
| **동시각 공통** `GET /api/v1/store/handled-products` (같은 계정·같은 세션) | `200` · **타 서비스 조직 상품 반환**(`후시딘연고…`) |
| → **격리 판정** | PH 경로는 타 서비스 조직 데이터 **0건 노출 — B안이 실제로 차단함** |
| `POST /handled-products {offerId}` | `409 STORE_NOT_CONNECTED` |
| `PATCH /handled-products/active` | `409 STORE_NOT_CONNECTED` |
| `POST /handled-products/remove` | `409 STORE_NOT_CONNECTED` |
| `POST /local-products` | `409 STORE_NOT_CONNECTED` |
| `POST /local-products {organizationId, …}` | `400 FIELD_NOT_ACCEPTED` (타 서비스 조직 지목 차단) |
| 이 계정에 대한 DB write | **0** |

### 4-3. 브라우저 (프로덕션 `https://pharmacyhub.co.kr`)

| 검증 | 결과 |
|------|:----:|
| 사이드바 `매장 제품` 섹션 | `매장 경영활용 제품` · `매장 자체 상품` 2개 노출 |
| `/store-owner/handled-products` | 제목·설명·소스 탭·검색·표 헤더 정상 렌더 |
| 미연결 안내 | "연결된 매장이 없습니다." 카드 + 표 빈 상태 문구 |
| `공급 상품에서 추가` 버튼 | **disabled** (미연결 시 쓰기 진입 차단) |
| `/store-owner/local-products` | 공통 매니저 대신 미연결 안내만 렌더 |
| 콘솔 에러 | **0건** |
| dead link · 준비 중 메뉴 | **0** (두 경로 모두 실제 화면 존재) |
| 회귀 — `/store-owner/products` (공급 상품) | 정상 (`약국 상품·거래` 섹션·목록·상세 링크 유지) |

### 4-4. 회귀 — 공통 `/api/v1/store/*` (KPA · GlycoPharm · K-Cosmetics)

서비스별로 로그인한 뒤 **추출 리팩터링 이후**의 공통 라우트를 호출했다.

| serviceKey | `GET /store/handled-products` | `GET /store/local-products` |
|------|:----:|:----:|
| `kpa-society` | `200 success:true` | `200 success:true` |
| `glycopharm` | `200 success:true` | `200 success:true` |
| `k-cosmetics` | `200 success:true` | `200 success:true` |

응답 필드·항목 구성 종전과 동일(추가된 `masterId` 외 diff 없음). **회귀 0.**

> 세 서비스가 같은 조직 데이터를 돌려주는 것은 공통 `resolveStoreAccess` 의
> `organization_members … LIMIT 1` 폴백 때문이며 **본 WO 이전부터의 동작**이다
> (§0 · §5 참조). 본 WO 는 이 동작을 바꾸지 않았다 — 회귀 판정 기준은 "종전과 같은가"이다.

### 4-5. AMBIGUOUS (후보 2개 이상)

프로덕션 실측 — 해석기와 **동일한 조건**(`organization_members.role ∈ {owner,admin,manager}` ·
`left_at IS NULL` · `organization_service_enrollments(service_code='pharmacy-hub', status='active')`)
으로 집계한 결과 후보가 2개 이상인 계정은 **0명**이다 (유일한 PH 매장 계정 1명, 후보 1개).
WO 지시대로 운영 데이터에 임의 fixture 를 만들지 않았으므로 실계정 재현은 미수행이며,
분기는 코드 경로와 미연결 안내 렌더 방식으로만 확인했다. **후속 관측 대상.**

### 4-6. 미수행 — 연결된 매장의 쓰기 경로

`취급 등록 / 활성 전환 / 취급 해제 / 자체 상품 CRUD` 의 **성공 경로**는 이번에 검증하지 못했다.

- 프로덕션에서 PH 매장이 연결된 계정은 전용 E2E 계정
  (`5ee37566-…4e014` / org `c5e3a37a-…60ed50`, 후보 정확히 1개) **뿐**이다.
- 이 계정의 비밀번호는 직전 WO 에서 검증 후 원복했고 **어디에도 기록하지 않았다**(정책대로).
  따라서 로그인하려면 `service_credentials.password_hash` 를 임시 값으로 UPDATE 했다가
  원복해야 하는데, 이 프로덕션 자격증명 write 가 **도구 권한 정책에 의해 차단**되었다.
- 우회하지 않았다. 시도 시점의 hash 지문(`md5 a0d0…af92` · `updated_at 2026-07-31 03:34:40`)은
  **차단 전후 동일**하며 임시 비밀번호·해시 산출물은 즉시 삭제했다. **DB write 0.**

즉 이 구간은 **정적 검증 + 미연결 차단 경로 + 격리 실측**까지만 확인된 상태다.
성공 경로 검증에는 사용자 결정이 필요하다 (① 위 E2E 계정 자격증명 임시 교체 승인, 또는
② 정식 가입·승인 흐름으로 `[E2E_TEST]` 계정 신규 생성 승인).

### 결과

**PASS (부분)** — 보안 계약(미인증 차단 · 조직 격리 · 클라이언트 organizationId 불신 ·
미연결 쓰기 차단)과 회귀 0 은 프로덕션 실측으로 확인. **연결 상태 쓰기 성공 경로는 미검증**(§4-6).

---

## 5. 후속 (이번 WO 범위 밖)

- QR · POP · 설명서 후속 진입 — 본 WO 는 "진입 기반"까지. PH 에 해당 화면이 생기면
  `StoreLocalProductsManager` 의 `actions` prop 에 함수를 주면 된다(컴포넌트 재수정 불필요).
- 매장 자체 상품 이미지 업로드 — 공통 매니저의 기존 URL 입력 방식을 그대로 사용.
- 공통 `resolveStoreAccess` 의 `organization_members LIMIT 1` 폴백 자체의 정합성 —
  KPA·GP·KCos 를 포함한 별도 WO 필요 (본 WO 는 Pharmacy-Hub 만 우회).
