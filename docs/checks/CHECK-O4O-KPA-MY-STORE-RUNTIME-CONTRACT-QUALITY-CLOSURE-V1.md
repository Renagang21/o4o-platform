# CHECK-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1

- **WO**: `WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1`
- **작업 브랜치**: `work/kpa-my-store-runtime-contract-quality-v1` (worktree `C:/tmp/o4o-kpa-my-store`)
- **일자**: 2026-09-04
- **범위**: KPA-Society "내 매장" 런타임 계약 4축 (A 태블릿 노출 / B 조직 해석 / C isStoreOwner / D Screen Set·QR)
- **프로덕션 변경**: schema 0 · migration 0 · 데이터 write 0 (SELECT 전용 검증)

---

## 1. KPA 내 매장 주요 census

| 계층 | 경로 | 판정 |
|---|---|---|
| 편집기 상품 풀 | `GET /store/product-pool` (`store-tablet.routes.ts`) | 조직의 `organization_product_listings` 를 그대로 반환 — **런타임 게이트 미반영**(BUG 원인) |
| 진열 등록 | `organization_product_listings` (OPL) | 매장 취급 등록 축 |
| 채널 연결 | `organization_product_channels` (OPC, `product_listing_id` · `is_active`) | 상품↔채널 연결 축 |
| 채널 | `organization_channels` (`channel_type='TABLET'` · `status='APPROVED'`) | 매장 단위 노출 스위치 |
| 공개 resolver | `store-public/store-public-screen-set-resolve.ts` → `queryTabletVisibleProducts` | 위 3축 + `supplier_product_offers.is_active` + `neture_suppliers.status='ACTIVE'` + `opl.service_key = ANY(serviceKeys)` |
| 런타임 | TabletKiosk / QR screen_set 랜딩 | 공개 resolver 와 **동일 함수** 소비 |

`resolveServiceKeys('kpa')` → `['kpa','kpa-society']` (`platform_store_slugs` 는 `kpa`, OPL 은 `kpa-society` 를 쓴다).

## 2. 축 A — TABLET 채널 ↔ 상품 노출 진리표

| Case | 채널 | OPC | 편집기 선택 | 미리보기 | 런타임 | 판정 |
|---|---|---|---|---|---|---|
| A | TABLET 채널 없음 | – | **가능** | 0건 | 0건 | **BUG(무증상 실패)** |
| B | 채널 `PENDING/REJECTED` | 연결됨 | **가능** | 0건 | 0건 | **BUG(무증상 실패)** |
| C | 채널 `APPROVED` + OPC 활성 | 연결됨 | 가능 | 노출 | 노출 | ALREADY_CANONICAL |
| D | 채널 승인 · OPC 미연결 | 없음 | **가능** | 0건 | 0건 | **BUG(무증상 실패)** |
| E | offer 비활성 / 공급자 비활성 | – | **가능** | 0건 | 0건 | BUG(동일) |
| F | `service_key` 불일치(예: KPA 매장의 `neture` OPL) | – | **가능** | 0건 | 0건 | BUG(동일) |

**선택 결과**: WO §4-4 의 4안 중 **B안(편집기에서 노출 불가 상태를 사실대로 표시)**.
런타임 게이트는 한 줄도 완화하지 않았다 — 채널 status 무시 0 / OPC 무시 0 / 공개 resolver gate 제거 0.
자동 채널 생성(A안)은 매장 단위 노출 승인 정책 변경이라 §16 제품 결정 사항으로 분류해 수행하지 않았다.

구현: `store-tablet-product-visibility.ts` (신규)

- `resolveStoreTabletChannelState(dataSource, organizationId)` → `none | not_approved | approved`
- `annotateTabletVisibility(...)` → 각 상품에 `tabletVisible` + `tabletVisibilityReason`
  (`visible` / `no_tablet_channel` / `channel_not_approved` / `not_linked_to_channel` / `offer_inactive` / `service_scope_mismatch`)
- 상품 풀 응답에 매장 단위 `tabletChannel` 상태 추가 (additive)
- 편집기(`@o4o/tablet-screen-set-editor`)는 amber "노출 불가" 배지 + 매장 단위 채널 배너를 표시하고 **선택은 막지 않는다**(선등록 후 채널 승인 동선 보존).

### 프로덕션 실측 (SELECT 전용)

- KPA 매장 조직 `9c87f46b…`(테스트 약국): `organization_channels` **0행** → TABLET 채널 없음 (Case A 재현)
- 동 조직 OPC 연결 **0건**, screen set **32건**, tablet **4대**
- 동 조직 OPL(active): `neture` 20 · `kpa-society` 1 · `k-cosmetics` 1 · `glycopharm` 1
  → KPA scope 에서는 20건이 `service_scope_mismatch` (Case F)

## 3. 축 B — 조직 resolver census (미조사 0)

| 소비처 | serviceKey 주입 | 결과 |
|---|---|---|
| `utils/store-organization.resolver.ts` | SSOT | enrollment(active) ∪ `platform_store_slugs`(active) |
| `utils/store-owner.utils.ts` `isStoreOwner()` | 인자 | `{isOwner, organizationId, memberRole, resolution}` |
| `createRequireStoreOwner` | 인자 | 401/403 `MEMBERSHIP_NOT_FOUND` · `MEMBERSHIP_NOT_ACTIVE` · `STORE_OWNER_REQUIRED` · 409 `AMBIGUOUS_STORE_CONNECTION` |
| `store-tablet.routes.ts` (약 40 endpoint · `withStoreAuth` 단일 seam) | **본 WO 에서 추가** (`storeOwnerServiceKey`) | KPA mount 는 `'kpa'` |
| `kpa.routes.ts` | `createStoreTabletRoutes(ds, { storeOwnerServiceKey: 'kpa' })` | `/api/v1/kpa/store/*` 신설 |
| 서비스 중립 `/api/v1/store` mount | 미주입(기존) | back-compat 유지 (§9 타 서비스 무변경) |
| signage | 기존 `useStoreOrganizationId()` 축 | 무변경 |

### 다중 서비스 사용자 판정 (프로덕션 실측)

계정 `renagang21@gmail.com` 의 `organization_members`(left_at IS NULL) 5개 조직:

| 조직 | 이름 | 연결 서비스 | is_primary | joined_at |
|---|---|---|---|---|
| `95aad740…` | (주)네뚜레 공급자 테스트 | neture | true | 2026-06-11 |
| `13c08a86…` | [E2E_TEST] 글라이코팜 검증 약국 | glycopharm | true | 2026-08-13 |
| `e3d14288…` | 네뚜레 약국 | pharmacy-hub | true | 2026-09-03 |
| `9c87f46b…` | 테스트 약국 | **kpa-society** (+ slug `kpa`) | false | 2026-05-29 |
| `83ff96c7…` | 테스트 뷰티샵 | k-cosmetics | false | 2026-06-02 |

- serviceKey 없는 중립 경로는 back-compat 정렬(`is_primary DESC → joined_at ASC`)로 **`95aad740`(Neture 공급자 조직)** 을 고른다 → KPA 매장 화면이 전부 빈 화면.
- 브라우저 실측(동일 세션·동일 토큰): `/api/v1/store/local-products?limit=5` → **0건**, `/api/v1/kpa/store/local-products?limit=5` → **5건**.
  `/api/v1/store/product-pool` → `supplierProducts: []`, `/api/v1/store/screen-sets` → `[]`, `/api/v1/store/tablets` → 0,
  화면 `/store/commerce/tablet-displays` → "아직 등록된 태블릿이 없습니다".
- KPA mount 주입 후에는 `'kpa'` scope 로 `9c87f46b` 만 후보가 되어 **타 서비스 조직 오염 0**.

판정: **BUG (축 B)** — 수정 완료. 신규 resolver 생성 0 (§3 준수).

## 4. 축 C — isStoreOwner 진리표

| # | membership(kpa-society) | role(`kpa:store_owner`) | 조직 해석 | 종전 me-context | 백엔드 게이트 | 수정 후 |
|---|---|---|---|---|---|---|
| 1 | active | 있음 | 성공(1개) | true | 통과 | **true** |
| 2 | suspended | 있음 | – | false | 403 `MEMBERSHIP_NOT_ACTIVE` | **false** |
| 3 | active | 없음 | – | false | 403 `STORE_OWNER_REQUIRED` | **false** |
| 4 | active | 있음 | **조직 0** | **true** ← 불일치 | 403 | **false** (+ `storeOwnerRoleGranted: true`) |
| 5 | active | 있음 | **후보 2개** | **true** ← 불일치 | 409 ambiguous | **false** (+ `storeOrganizationResolution: 'ambiguous'`) |

- 4·5 는 프런트에서 매장 표면이 열리는데 모든 매장 API 가 403/409 로 막히는 **무증상 실패**였다 → **BUG**, 수정.
- 판정을 canonical helper `isStoreOwner(dataSource, userId, 'kpa')` 로 위임. role/membership 축 기준은 종전과 동일.
- additive 진단 필드 3개(`storeOwnerRoleGranted` · `storeOrganizationId` · `storeOrganizationResolution`) 추가 — 기존 소비처 계약 불변.
- WO §4-C 지시대로 **필드 제거는 하지 않았다**(제거 후보 판정: 유지 — 프런트 게이트가 유일 소비처이며 이제 백엔드와 동일 판정이다).

### 자격 조직 ≠ 매장 조직 (신규 발견)

프로덕션에서 이 계정은 **`테스트 약국` 이름의 조직을 2개** 갖는다.

- `c92b857f…` — `kpa_members`(회원 **자격** 축) 소속. `organization_members` 행 **없음**. `organization_channels` 0행.
- `9c87f46b…` — `organization_members` + `kpa-society` enrollment + slug `kpa` (매장 축). tablet·screen set 실데이터 보유.

me-context 의 `organization` 은 여전히 자격 축(`kpa_members`)을 반환한다(무변경). 매장 축은 신규 `storeOrganizationId` 로 분리 노출한다.
판정: **UX_GAP / COMMONIZATION_CANDIDATE** — 두 축을 한 이름으로 부르는 표기 정리는 본 WO 범위 밖(별도 WO 제안).

## 5. 축 D — Screen Set / QR / Tablet 계약

| 항목 | 판정 |
|---|---|
| `templateKey` 허용값 5종 (`SET_TEMPLATE_KEYS_ALLOWED`) | ALREADY_CANONICAL |
| 저장 의미 | `PUT /screen-sets/:id/blocks` = **full replace** (단일 트랜잭션 DELETE + INSERT) — 부분 병합 없음 |
| `product_list` 아이템 | `{productType, productId, qrCodeId?}` 왕복 보존 (`validateDisplayItems`) |
| 상품 순서 | 저장 순서 그대로 출력(supplier/local 혼합 순서 보존) — 미리보기·런타임 동일 |
| 미리보기 ↔ 런타임 | `resolveSelectedProductListSection` **동일 함수** 소비 → 드리프트 구조적으로 0 |
| 런타임 제외 | `selectionMode:'selected'` + `selectedCount` + `excludedCount` 로 노출 |
| QR | `qrUrl` 을 상품별 additive 로 해석 · QR 비저장(동적 생성) |
| 태블릿 상품 버튼 ↔ QR 랜딩 | 동일 product/master 의 STORE canonical `ko` 설명서 재사용 |

판정: **ALREADY_CANONICAL** — 축 D 에서 수정 사항 없음. 축 A 배지로 `excludedCount` 의 원인이 편집기에서 설명된다.

## 6. 실브라우저 E2E

프로덕션(`api.neture.co.kr` / KPA 웹)에서 로그인 → 내 매장 → 태블릿 화면까지 실브라우저로 수행했다.

| 항목 | 결과 |
|---|---|
| 흰 화면 | 0 |
| JS fatal | 0 |
| 예기치 않은 403/404/500 | 0 (`/api/v1/kpa/store/product-pool` 404 는 **미배포 확인**이며 결함 아님) |
| 타 서비스 조직 오염 | **재현됨** — 중립 경로가 Neture 공급자 조직을 선택 |
| 상품 누락 | **재현됨** — 중립 경로 0건 vs KPA 경로 5건 |
| 순서 드리프트 | 0 |
| QR 불일치 | 0 |

**한계(사실대로 보고)**: 수정본은 브랜치에만 있고 프로덕션은 수정 전 빌드가 돌고 있다. 따라서 위 브라우저 근거는 **결함 재현**의 증거이며, 수정 후 런타임 E2E 는 배포 후에 다시 수행해야 한다. 수정 후 동작은 Jest 계약 테스트(§7)로 고정했다.

## 7. 회귀 결과

| 게이트 | 결과 |
|---|---|
| lint-ratchet | EXIT 0 — `ESLint: 55 errors, 1391 warnings (error baseline 59)` |
| api-server `tsc --noEmit` | 0 |
| web-kpa-society `tsc --noEmit` | 0 |
| 관련 패키지 build | 통과 (`packages/financial-core` 의 tsup "No input files" 는 본 WO 이전부터 있던 무관 실패) |
| web-kpa-society production build | 0 (`✓ built in 23.35s`) |
| api-server 전체 Jest | **225 suites / 3781 tests 전부 통과** |

신규/수정 spec

- `kpa-my-store-tablet-runtime-contract.spec.ts` (11) — 축 A 노출 사유 6종 + 축 B 서비스 스코프 4종(중립→Neture / kpa→KPA / cosmetics→KCos / 정지 membership 403)
- `kpa-me-context-store-owner-contract.spec.ts` (5) — 축 C 진리표 5상태
- `store-owner-backcompat-servicekey.spec.ts` — serviceKey 미주입 호출부 census 를 5 → **4** 로 갱신(집합 축소)

## 8. 수정 파일

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/routes/platform/store-tablet-product-visibility.ts` | **신규** — 노출 판정 헬퍼 |
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | `storeOwnerServiceKey` 옵션 · 상품 풀 annotation · `tabletChannel` |
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | `/api/v1/kpa/store/*` mount (`'kpa'` 주입) |
| `apps/api-server/src/routes/kpa/controllers/me-context.controller.ts` | 축 C canonical helper 위임 + 진단 필드 3 |
| `packages/tablet-screen-set-editor/src/index.tsx` | 노출 불가 배지 · 채널 배너 |
| `services/web-kpa-society/src/api/{tabletDisplays,tabletStaff,storeScreenSetHub}.ts` | base `/api/v1/store` → `/api/v1/kpa/store` |
| `apps/api-server/jest.config.cjs` | `@o4o/platform-core/store-identity` → src 매핑 |
| `apps/api-server/src/__tests__/*` | 신규 2 + census 1 갱신 |

## 9. 판정 요약 (§11)

| 발견 | 판정 |
|---|---|
| 편집기에서 선택 가능하나 런타임 0건 (채널/OPC/offer/service_key) | **BUG** → 사실 표시로 마감 |
| TABLET 채널 자동 생성 여부 | **제품 결정 필요** → NO_ACTION (§16) |
| 중립 mount 가 타 서비스 조직 선택 | **BUG** → serviceKey 주입 |
| me-context `isStoreOwner` 가 백엔드 게이트보다 느슨 | **BUG** → canonical helper 위임 |
| `isStoreOwner` 필드 자체 | 유지(제거 대상 아님) |
| 자격 조직 vs 매장 조직 동명 혼동 | **UX_GAP** → 별도 WO |
| Screen Set full-replace · 순서 · QR 왕복 | **ALREADY_CANONICAL** |
| `storeOwnerServiceKey` 주입 패턴 | **COMMONIZATION_CANDIDATE** (KCos/PharmacyHub mount 에 동일 적용 가능 — 본 WO 에서는 미적용) |
| lint error baseline 59 vs 실제 55 | NO_ACTION — 별도 WO 로 baseline 하향 제안 |

## 10. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(자격·매장 조직 표기 정리, lint baseline 하향)
