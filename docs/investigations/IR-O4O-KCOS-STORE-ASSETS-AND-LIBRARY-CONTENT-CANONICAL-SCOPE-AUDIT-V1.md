# IR-O4O-KCOS-STORE-ASSETS-AND-LIBRARY-CONTENT-CANONICAL-SCOPE-AUDIT-V1

- **WO**: WO-O4O-KCOS-STORE-ASSETS-AND-LIBRARY-CONTENT-CANONICAL-SCOPE-AUDIT-V1
- **작성일**: 2026-09-10
- **기준점**: `origin/main` `3eb8d7f3a` (ff-only pull · working tree clean · 병렬 세션 충돌 없음)
- **성격**: 조사 — 코드 변경 0 / schema 0 / migration 0 / production write 0
- **근거**: 소스 전수 + 프로덕션 read-only 실측 (Cloud SQL Auth Proxy)
- **선행**: `CHECK-O4O-KCOS-LIBRARY-ORGANIZATION-SCOPE-AND-SNAPSHOT-ROUTE-CLOSURE-V1` (`/assets` 마운트 교정 `cefec2e2d`)
- **짝 문서**: [`DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1`](../design/DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1.md)

---

## 0. 한 줄 결론

> `/assets` 는 세 개 중 하나였다. **`/store-assets` · `/store-contents` 도 같은 결함**(KCos route → KPA org resolver)이고,
> KCos 자료함 '콘텐츠' 탭이 나열하는 `type=content` 는 **KPA 콘텐츠 허브 사본의 asset type** 이라
> KCos 에서는 구조적으로 비어 있다. KCos·PH 가 실제로 쓰는 원장은 **`store_execution_assets` + POP V2 + QR** 뿐이며
> 이는 프로덕션 행수로 증명된다.

---

## 1. `/store-assets` 전체 census (§2)

### 1-1. 마운트 3곳 — 컨트롤러는 1개, 조직 해석은 KPA 고정

| 서비스 | 마운트 | 프론트 소비처 | 판정 |
|---|---|---|---|
| KPA | `kpa.routes.ts:454` | `api/assetSnapshot.ts` → 채널/자산 화면 | 정상 (KPA 조직) |
| **K-Cosmetics** | `cosmetics.routes.ts:185` | `api/assetSnapshot.ts storeAssetControlApi` → **`StoreChannelsPage`(채널 관리)** | **KPA 조직으로 해석 — 결함** |
| Neture | `neture.routes.ts:55` | **없음** (`services/web-neture` 에 `store-assets` 호출 0) | **DEAD 마운트** |

컨트롤러 `routes/o4o-store/controllers/store-asset-control.controller.ts`:

```ts
async function resolveOrgId(ds, userId) {
  const { organizationId } = await isStoreOwner(ds, userId, 'kpa');   // ← 'kpa' 하드코딩
  if (organizationId) return organizationId;
  const member = await ds.getRepository(KpaMember).findOne({ where: { user_id: userId } });  // ← KPA fallback
  return member?.organization_id || null;
}
```

- `GET /` : `o4o_asset_snapshots LEFT JOIN kpa_store_asset_controls` — **읽기 유출** (KCos 채널 관리에 KPA 스냅샷 노출)
- `PATCH /:id/publish` · `PATCH /:id/channel` : `kpa_store_asset_controls` **upsert** — **쓰기 유출** (KCos 화면의 조작이 KPA 조직 행으로 기록)
- body/query `organizationId` : 받지 않음 (신뢰 문제 없음). 결함은 전적으로 resolver.

### 1-2. 같은 클래스의 결함 — `/store-contents`

| 항목 | 값 |
|---|---|
| 마운트 | `cosmetics.routes.ts:191` → `createStoreContentController` (공용, KPA 하드와이어) |
| 조직 해석 | `isStoreOwner(…, 'kpa')` + `KpaMember` fallback (`store-content.controller.ts:178·193·393`) |
| KCos 소비처 | `api/storeProductionSources.ts getStoreDirectContents()` → **`StoreProductionMaterialsPage`(매장 제작 자료)** 의 multi-source 병합 |
| 효과 | KCos 매장 제작 자료 페이지에 **KPA 조직의 direct 콘텐츠(13행)** 가 섞여 보인다 (읽기 유출). 쓰기 UI 는 KCos 에 없다 |
| KCos 전용 사용자 | `isStoreOwner('kpa')` false → KpaMember 없음 → 403 `NO_ORGANIZATION` (기능 부재) |

### 1-3. 결함 아님으로 판정한 마운트

| 마운트 | 근거 |
|---|---|
| `/` `createStoreExecutionAssetsController(…, 'cosmetics')` | `createRequireStoreOwner(ds, 'cosmetics')` — 서비스 스코프 정상 |
| `/` `createStoreLibraryController(…, 'cosmetics')` | 동일 |
| `/pharmacy/pop-v2` `createStorePopV2Controller(…, 'cosmetics')` | 동일 (선행 CHECK 에서 "404 는 V2 가 옳았다"로 실증) |
| `/published-assets` (공개, org 를 URL 로 받음) | 조직 해석 문제 없음. 단 `INNER JOIN kpa_store_asset_controls` 라 **KCos 조직은 항상 0건** — KCos 프론트 소비처도 0 → KCos 에서는 DEAD |

### 1-4. 결함 지도 (2026-09-10 현재)

```text
cosmetics.routes.ts
  /assets          → createCosmeticsAssetSnapshotController   ✅ 교정됨 (cefec2e2d)
  /store-assets    → createStoreAssetControlController        ❌ KPA resolver + kpa_store_asset_controls 읽기/쓰기
  /store-contents  → createStoreContentController             ❌ KPA resolver + kpa_store_contents 읽기
neture.routes.ts
  /store-assets    → createStoreAssetControlController        ⚪ 소비처 0 (DEAD)
```

---

## 2. `kpa_store_asset_controls` 역할 확정 (§3)

### 2-1. 구조

```text
snapshot_id · organization_id (UNIQUE 쌍) · publish_status(draft|published|hidden) · channel_map jsonb
is_forced · forced_by · forced_from/until · is_locked · snapshot_type(user_copy|hq_forced|campaign_push|template_seed)
lifecycle_status(active|expired|archived)
```

**컬럼 자체에는 KPA 고유 개념이 없다.** `o4o_asset_snapshots`(frozen core) 위에 얹은 *게시 상태 / 채널 매핑 / 본사 강제 배포* 확장 레이어다.

### 2-2. 소비자 전수 (소스)

| 소비처 | 용도 | 서비스 |
|---|---|---|
| `store-asset-control.controller` | 매장 게시/채널 편집 | KPA (KCos·Neture 는 잘못된/죽은 마운트) |
| `store-library-feed.controller` | 자료함 피드에서 `hidden` 제외 | **KPA 전용 마운트** |
| `published-assets.controller` | 공개 렌더 — `published` + 기간 + 채널 필터 | KPA (KCos 마운트는 소비처 0) |
| `asset-render-filter.ts` | 서비스 화면 노출 필터 | KPA |
| `admin-force-asset.controller` | 본사 강제 배포(is_forced) | KPA admin |
| `operator-dashboard.service` · `operator-summary.controller` | KPI 카운트 | KPA operator |
| `AdminSnapshotBrowserPage` | admin UI | KPA |

**KPA 밖의 실제 소비자: 0.**

### 2-3. 프로덕션 실측

```text
행수 7 · 조직 3 (전부 KPA: pharmacy 2 · association 1) · is_forced 0 · is_locked 0
snapshot_type 전부 user_copy · publish_status hidden 6 / published 1
orphan(스냅샷 없음) 0 · 조직 불일치 0
```

### 2-4. 판정

| 질문 | 답 |
|---|---|
| KPA 전용 business entity 인가 | **아니다** — 컬럼은 서비스 중립. 이름·JOIN 지점·소비자가 KPA 다 |
| 단순 ownership/control ledger 인가 | 게시/채널/강제 배포 **운영 제어** ledger 다. ownership 은 `o4o_asset_snapshots.organization_id` 가 갖는다 |
| 다른 서비스 consumer 가 있는가 | **없다** (KCos·Neture 마운트는 죽었거나 잘못됨) |
| KCos 가 참조해야 할 이유 | **없다** — KCos 에 "게시/채널/본사 강제" 운영 축이 없고, KCos 스냅샷도 0행 |
| 조직 축 | `organization_id` (일반 `organizations`). `kpa_organizations` 에 묶이지 않는다 |
| 공통 승격 가능 구조인가 | **구조적으로 가능** — 그러나 수요 0 |

```text
판정: KPA_SPECIFIC  (구조는 COMMONIZABLE 이나 KPA 밖 수요·데이터·소비자 모두 0 → 지금 승격하지 않는다)
```

행수 7 만으로 내린 판정이 아니다. 소비자 7곳이 전부 KPA 운영 흐름(강제 배포·KPI·공개 렌더)이라는 점이 근거다.

---

## 3. KCos 자료함 탭별 source map (§4)

`PHARMACY_HUB`/`KPA` 와 같은 공통 셸(`storeMenuConfig.ts` `COSMETICS_STORE_CONFIG` `[내 자료함]`).

| UI 라벨 | 경로 | API | 원장 | 조직 해석 | serviceKey | **KCos 실제 행** |
|---|---|---|---|---|---|---|
| 콘텐츠 | `/library/contents` | `GET /cosmetics/assets?type=content` | `o4o_asset_snapshots` (asset_type=content) | `resolveCosmeticsOrgId` ✅ | cosmetics | **0** |
| 자료 | `/library/resources` | `GET /cosmetics/pharmacy/library` | `store_library_items`(store-library.service) | `createRequireStoreOwner('cosmetics')` ✅ | cosmetics | (자료 원장) |
| 매장 제작 자료 | `/library/production-materials` | `GET /cosmetics/store/assets` **+ `GET /cosmetics/store-contents`** + QR + 블로그 병합 | `store_execution_assets` ✅ / **`kpa_store_contents` ❌(KPA org)** / QR ✅ | 혼합 | cosmetics + **kpa** | exec 5 · **direct 0(KCos) but 13(KPA) 유출** |
| (HUB) 콘텐츠 | `/store-hub/content` → 사본 목록 | `GET /cosmetics/assets?type=cms` · `POST /assets/copy {cms}` | `o4o_asset_snapshots` (cms) ← `cms_contents serviceKey k-cosmetics` | ✅ | cosmetics | **0 / 원천 0** |
| (HUB) 사이니지 | `/store-hub/signage` | `POST /assets/copy {signage}` | `signage_media serviceKey k-cosmetics` | ✅ | cosmetics | **원천 0** |
| (채널) 채널 관리 | `/channels` | `GET /cosmetics/store-assets` · PATCH publish/channel | `o4o_asset_snapshots ⋈ kpa_store_asset_controls` | **`isStoreOwner('kpa')` ❌** | **kpa** | **KPA 7 유출** |

---

## 4. content 탭이 왜 비는가 (§5)

```text
KCos 자료함 '콘텐츠' 탭   →  GET /assets?type=content   →  asset_type='content'
asset_type='content' 의 정의  →  KpaAssetResolver.resolveContent = **kpa_contents(KPA 콘텐츠 허브) Full Copy**
KCos HUB 복사              →  POST /assets/copy {assetType:'cms'}  →  asset_type='cms'
```

- KCos 에서 `content` 타입 스냅샷을 **만들 수 있는 경로가 없다.** `CosmeticsAssetResolver` 는 의도적으로 content 분기가 없다(`kpa_contents` 는 KPA 전용 원장).
- KCos HUB 복사는 `cms` 를 만드는데, 그 원천 `cms_contents serviceKey ∈ {cosmetics,k-cosmetics}` 는 **published 0행**이다.
- 따라서 KCos 콘텐츠 탭은 (a) 타입이 KPA 잔재이고 (b) 대체 타입(cms)도 공급이 0 이라 **두 겹으로 비어 있다.**

### 4-1. KPA 데이터가 왜 보였는가

`cefec2e2d` 이전 `/assets` 가 `resolveKpaOrgId` 로 조직을 풀어 **사용자의 KPA 약국 스냅샷(content 7행)** 을 KCos 목록에 돌려줬다.
같은 이유로 지금도 `/store-assets`(KPA 7행) 와 `/store-contents`(KPA direct 13행) 가 KCos 화면 두 곳에 KPA 데이터를 섞고 있다.

### 4-2. §5 질문 직답

| # | 질문 | 답 |
|---|---|---|
| 1 | KCos 의 canonical "콘텐츠"는 무엇인가 | **매장이 직접 쓴 Store Production Material(`kpa_store_contents` direct) + 그로부터 만든 실행 자산(`store_execution_assets`)** — KPA·PH 와 같은 축 |
| 2 | `cms_contents` 인가 | 아니다. KCos HUB 의 운영자 콘텐츠 원천이지 매장 자료가 아니고, 공급 0 |
| 3 | store-owned copied content 인가 | 부분 — snapshot 은 **HUB 복사 채널**이지 자료함의 1차 원천이 아니다 |
| 4 | production materials 인가 | **KCos 가 실제로 쓰는 축** (exec 5 · POP V2 4 · QR 1) |
| 5 | snapshot 계층이 필요한가 | HUB 복사가 생기면 필요. 지금은 원천 0 → 있어도 비어 있다 |
| 6 | 지금 content 탭은 KPA 잔재인가 | **그렇다.** `type=content` 는 `kpa_contents` 사본 전용 어휘다 |

---

## 5. KCos content canonical source 비교 (§6)

| 안 | tenant 격리 | 편집 가능 | origin 추적 | HUB copy | V2 resolver | Tablet/QR 재사용 | KPA/PH 정합 | 판정 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| A `cms_contents` 직접 | serviceKey | ✗(운영자 소유) | ✓ | — | ✗ | ✗ | ✗ | 매장 자료 아님 · 공급 0 |
| **B 매장 콘텐츠(`kpa_store_contents` direct)** | org ✓ | ✓ | ✓ | (snapshot_edit 로 연결) | **✓ direct** | ✓(QR direct) | **✓ (PH 가 이미 채택)** | **채택** |
| C snapshot 재사용 | org ✓ | ✗(원본 불변) | ✓ | **✓ 유일 경로** | ✓ snapshot | △ | ✓ | **보조 — HUB 복사 채널로만** |
| **D `store_execution_assets`** | org ✓ (서비스 스코프 ✓) | ✓ | ✓ derivation | — | **✓ library** | ✓ | **✓ 3서비스 모두 데이터 보유** | **채택** |
| E 공통 projection 신설 | — | — | — | — | — | — | — | **중지 조건 3** — 만들지 않는다 |

**권고: B + D (기존 축 2개). C 는 HUB 복사 채널로 유지, A·E 는 배제.**
사업 판단이 필요한 지점은 없다 — KPA·PH 가 이미 같은 축을 쓰고 있고, KCos 는 마운트만 어긋나 있다.

---

## 6. KPA / PH 비교 (§7) — 공통 canonical 축

| 항목 | KPA | PH | KCos |
|---|---|---|---|
| 매장 직접 콘텐츠 | `kpa_store_contents` (15) — 공용 controller(KPA 하드) | `kpa_store_contents` (0) — **PH 전용 controller + `resolvePharmacyHubStoreOrganization`** 가 공용 **service** 호출 | `kpa_store_contents` (0) — 공용 controller 그대로(KPA org) ❌ |
| 실행 자산 | `store_execution_assets` (29) | (4) | (5) |
| 스냅샷(HUB 복사) | (7) | (0) — HUB 복사 경로 미채택 | (0) — 경로는 열렸으나 원천 0 |
| asset control | (5) — 게시/채널/강제 | (0) — 미사용 | (0) — 잘못된 마운트 |
| 자료(`store_library_items`) | 공용 service | PH 전용 controller + 공용 service | 공용 controller('cosmetics') ✓ |
| POP | V2 (6) | V2 (4) | V2 (4) |
| QR | 53 | 22 | 1 |
| 조직 해석 | `isStoreOwner('kpa')` + KpaMember | **`resolvePharmacyHubStoreOrganization`** (enrollment 기반, 0/1/2+ 계약) | `createRequireStoreOwner('cosmetics')` ✓ / KPA 하드 ❌ 혼재 |

**공통 canonical 축 = `kpa_store_contents`(Store Production Material) + `store_execution_assets` + POP V2 + QR.**
스냅샷·asset control 은 **KPA 가 HUB 운영을 위해 얹은 확장**이며 PH 는 채택하지 않았고 KCos 는 데이터가 없다.

**PH 가 이미 답을 보여줬다**: 공용 컨트롤러를 마운트하지 않고, **서비스 전용 controller 가 조직만 정한 뒤 공용 service 를 호출**한다
(`PharmacyHubStoreContentController` 주석: *"공통 store-content.controller 는 … KPA 하드와이어라 Pharmacy-Hub 에서는 항상 실패한다"*).
KCos 가 따라야 할 패턴이 이것이다 — `cefec2e2d` 가 `/assets` 에 적용한 것과 같은 방식.

---

## 7. tenant isolation 위험 경로 (§8)

| 경로 | 상태 | 근거 |
|---|---|---|
| `createRequireStoreOwner(ds, serviceKey)` / `resolveStoreOrganization` | **안전** | enrollment/slug 로 서비스 연결 확인 · 0/1/2+ 계약 · 2+ 면 `AMBIGUOUS` 로 **임의 선택 금지** |
| `isStoreOwner(ds, userId, 'kpa')` 를 **KCos 마운트에서 호출** | **위험 — 결함 원인** | `/store-assets` · `/store-contents` |
| `KpaMember` fallback | **위험** | KCos 전용 사용자에게 KPA 조직을 붙일 수는 없으나(없음), 두 서비스 가입자에겐 KPA 조직 고정 |
| serviceKey 미지정 back-compat (`/api/v1/store/*`) | 결정적이나 **서비스 무인지** | is_primary → joined_at 정렬. 서비스별 마운트가 있는 소비처는 이미 serviceKey 명시 |
| body/query `organizationId` 신뢰 | **없음** | 조사한 컨트롤러 전부 미수용. KCos 클라이언트도 미전송 |
| `published-assets/:organizationId` (공개) | URL 명시 — 격리 문제 없음 | 단 KCos 조직은 controls 0 → 항상 빈 결과 |

실측: 같은 사용자(3개 서비스 조직 보유)에서 KPA 7 / PH 0 / KCos 0 스냅샷이 **서비스 경로별로 정확히 분리**된다(선행 CHECK §3-2). 남은 오염 경로는 위 2개 마운트뿐이다.

---

## 8. POP V2 와의 관계 (§10)

`StoreContentsSelector`(**KPA 전용** — `services/web-kpa-society/src/pages/pharmacy/`) 인라인 POP:
`StorePopCreateModal` → `POST /pharmacy/pop/generate {directContentItemIds | libraryItemIds | snapshotItemIds}` (legacy) → `store_execution_assets(file/pop)`.

| 셀렉터 origin | legacy 파라미터 | V2 origin | V2 resolver | 분류 |
|---|---|---|---|---|
| `direct` | `directContentItemIds` | `direct` | `pop-v2-source.service.ts:318` (org 스코프) | **V2_RESOLVABLE_NOW** |
| `execution-asset` | `libraryItemIds` | `library` | `:330` | **V2_RESOLVABLE_NOW** |
| `snapshot` | `snapshotItemIds` | `snapshot` | `:343` (`{organizationId, assetType:'content'}`) | **V2_RESOLVABLE_NOW** (KPA 조직에서) |

셀렉터의 데이터 원천 `GET /store-library/contents`(`store-library-feed.controller`) 는 **KPA 전용 마운트**이며 `kpa_store_asset_controls` 를 JOIN 한다.
→ 이 피드를 **KCos 로 공통화하면 `/store-assets` 와 같은 결함이 재생산된다.**

---

## 9. StoreContentsSelector 이관 준비도 (§11)

| 질문 | 답 |
|---|---|
| source contract 를 바로잡지 않고 V2 로 넘겨도 안전한가 | **KPA 범위에서는 안전.** 3 origin 이 V2 에 1:1 대응하고 V2 resolver 가 org 스코프다 |
| KCos 자료함의 잘못된 content 축이 V2 에 들어갈 위험 | **낮다 — 단 조건부.** KCos 는 이 셀렉터를 쓰지 않는다(공통 `StoreLibraryContentsView`). 위험은 "셀렉터+피드를 KCos 로 공통화"할 때 생긴다 |
| KPA 인라인 생성과 KCos 자료함 문제를 분리할 수 있는가 | **있다.** 셀렉터=KPA 전용 파일, KCos 콘텐츠 축=별도 마운트 문제 |

```text
판정: READY_FOR_V2_HANDOFF  (KPA 한정)
조건: 이관 회차에서 store-library-feed / StoreContentsSelector 를 KCos 로 공통화하지 않는다.
      KCos 콘텐츠 축은 별도 WO(§11-2) 로 먼저 닫는다.
```

---

## 10. 수정 여부 (§12)

**이번 회차 코드 변경 0.** 이유:

| 대상 | §12 "resolver 교체만으로 안전" 인가 | 판단 |
|---|---|---|
| `/store-contents` (KCos) | 부분 — 공용 controller 안에 resolver 가 박혀 있어 **PH 처럼 서비스 전용 controller 를 새로 써야** 한다(직접 CRUD 만으로 한정 가능). KPA 전용 부기능(상품 링크·SPD import·snapshot_edit)은 제외 필요 | 작은 수정 범위를 넘는다 → **별도 WO** |
| `/store-assets` (KCos) | resolver 만 바꾸면 KCos 조직 행이 `kpa_store_asset_controls` 에 쌓인다 — 동작은 하나 **KPA 확장 레이어를 KCos 에 채택하는 결정**이 된다 | §12 명시 중지 사유 → **보고** |
| `/store-assets` (Neture) | 소비처 0 | 마운트 제거는 라우트 변경 → **별도 WO** |

---

## 11. legacy 분류 (§13)

| 요소 | 분류 | 비고 |
|---|---|---|
| `o4o_asset_snapshots` · `@o4o/asset-copy-core` | CANONICAL_KEEP | frozen core · HUB 복사 채널 |
| `kpa_store_contents` (Store Production Material) | CANONICAL_KEEP | 이름만 legacy (CLAUDE.md §5) |
| `store_execution_assets` | CANONICAL_KEEP | 3서비스 모두 데이터 · 서비스 스코프 ✓ |
| `store_pop_documents` (POP V2) | CANONICAL_KEEP | |
| `kpa_store_asset_controls` | **KPA_SPECIFIC** | 구조는 commonizable · 수요 0 |
| `store-content.controller` (공용) | CANONICAL_NEEDS_ALIGNMENT | resolver 가 KPA 하드 — PH 패턴으로 서비스별 wrapper |
| `store-asset-control.controller` KCos 마운트 | LEGACY_INTERMEDIATE | 제거 또는 KCos 채택 결정 후 wrapper |
| `store-asset-control.controller` Neture 마운트 | **DEAD** | 소비처 0 |
| `published-assets.controller` KCos 마운트 | **DEAD (KCos)** | INNER JOIN controls → 항상 0 · 소비처 0 |
| `store-library-feed.controller` | KPA_SPECIFIC | controls JOIN · KPA 마운트만 |
| KCos `StoreLibraryContentsPage` `type=content` | LEGACY_INTERMEDIATE | KPA 잔재 어휘 — B+D 축으로 재정렬 |
| KCos `HubContentPage` cms 복사 | CANONICAL_NEEDS_ALIGNMENT | resolver 는 교정됨 · 원천 공급 0 |
| `StoreContentsSelector` (KPA) | CANONICAL_KEEP | V2 이관 대상 |
| `StorePopCreateModal` + `POST /pharmacy/pop/generate` | LEGACY_INTERMEDIATE | ③ 이관 후 ④ 에서 제거 |
| `KpaAssetResolver.resolveContent` | KPA_SPECIFIC | `kpa_contents` 전용 — KCos 에 복제하지 않는다 |

---

## 12. 다음 구현 묶음 (§17-16)

| # | WO | 범위 | schema |
|---|---|---|---|
| **1** | KCOS-STORE-CONTENTS-AND-STORE-ASSETS-TENANT-SCOPE-CLOSURE | KCos `/store-contents` → PH 패턴 wrapper(직접 CRUD 한정) · KCos `/store-assets` 마운트 **제거**(채널 관리의 자산 목록은 `/assets` 로 전환, 게시/채널 편집은 KCos 미채택 명시) · Neture `/store-assets` DEAD 마운트 제거 · KCos `/published-assets` DEAD 마운트 제거 | 0 |
| **2** | KCOS-LIBRARY-CONTENTS-TAB-CANONICAL-SOURCE-REALIGNMENT | KCos 콘텐츠 탭을 B+D 축(직접 콘텐츠 + 실행 자산 + cms 스냅샷)으로 재정렬 — 공통 `StoreLibraryContentsView` 에 origin 주입 | 0 |
| **3** | (기존 체인 ③) STORE-CONTENTS-SELECTOR-INLINE-POP-V2-MIGRATION | KPA 한정 · 피드 공통화 금지 | 0 |
| **4** | (기존 체인 ④) LEGACY-POP-GENERATE-RETIREMENT | | 0 |

1 과 2 는 독립이며 3 과 병렬 가능하다. **3 이 1·2 를 기다릴 필요는 없다** (§9).

---

## 13. 확인하지 못한 것

- KCos **채널 관리 화면**에서 KCos 사용자가 게시/채널 토글을 실제로 눌러 `kpa_store_asset_controls` 에 KCos 유래 행이 생겼는지는 **행의 provenance 컬럼이 없어 구분 불가**. 현재 7행은 전부 KPA 조직이므로 최소한 KCos 조직 행은 0 이다.
- Neture `/store-assets` 는 프론트 소비처 0 으로 판정했으나 외부(모바일/스크립트) 호출 여부는 로그를 보지 않았다.

---

## 14. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

발견 1건: CLAUDE.md §5 는 `kpa_store_contents` 를 "KPA / Cosmetics 공통 사용 중"으로 적고 있으나,
프로덕션 실측상 KCos 조직 행은 0 이고 KCos 마운트는 KPA 조직으로 해석된다 — **"공통 사용 중"은 의도이지 현황이 아니다.**
CLAUDE.md 는 §16-4(색인 문서 본문) 대상이라 인라인 수정하지 않고 보고만 한다.
