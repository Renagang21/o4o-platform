# IR-O4O-STORE-HUB-END-TO-END-CURRENT-STATE-AUDIT-V1

> **조사 전용 문서.** 코드 변경 0 / DB write 0 / migration 0 / 배포 0 / 테스트 데이터 생성 0.
> 발견사항은 후속 WO 로 분리한다. 본 IR 에서 수정하지 않는다.

---

## 1. Executive Summary

### 1.1 전체 판정

| 축 | 판정 | 요지 |
|----|:----:|------|
| **목록 노출 계약** (serviceKey / status / source) | **대체로 PASS** | `HubContentQueryService` 7개 도메인 전부 serviceKey + status + author_role 3중 게이트, Raw SQL parameter binding 준수 |
| **가져오기 게이트** (콘텐츠 계열) | **PASS** | blog / pop / qr / video / screen-set 전용 import 엔드포인트가 목록과 **동일 조건**을 서버에서 재검증 |
| **가져오기 게이트** (상품 계열) | **FAIL (P0)** | `POST /pharmacy/products/apply` 가 목록의 서비스 승인 게이트를 재검증하지 않음. PRIVATE 의 `allowed_seller_ids` 미검사 |
| **서비스 격리** (GP / K-Cosmetics 자료함) | **FAIL (P0)** | GP·KCos 가 **KPA 전용 컨트롤러**를 자기 경로에 마운트 — 권한·리졸버·조직 해석이 전부 `kpa` 고정 |
| **원본·사본 독립성** | **PASS (FULL_COPY)** | 전 자원 값 복사. QR 은 `content_hub` 원본 참조를 매장 사본으로 치환하는 가드까지 존재 |
| **매장 간 격리** | **PASS** | `author_role='store'` / `source='store'` 자원은 HUB 노출·재복사 경로에서 전부 배제 |
| **검색·필터·페이지네이션** | **부분 FAIL (P1)** | GP·KCos 콘텐츠 HUB 검색어가 서버에서 **무시됨**. mixed 모드 `total` 부정확 |
| **cross-service parity** | **부분 FAIL (P1)** | GP·KCos 에 동영상 / 태블렛 화면 HUB 부재 |

**한 줄 결론:** 콘텐츠 계열(blog·pop·qr·video·screen-set)의 HUB→매장 사본 계약은 **잘 설계돼 있고 게이트가 일관**하다. 결함은 (a) **상품 계열의 신청 경로**, (b) **GP/KCos 자료함의 KPA 하드와이어링**, (c) **cross-service parity·검색** 세 축에 집중된다.

### 1.2 조사 규모

- 서비스 4 (KPA-Society / GlycoPharm / K-Cosmetics / Neture 경계 확인)
- 자원 10 (상품 / 일반 콘텐츠 / CMS 콘텐츠 / POP / QR / 동영상 / 사이니지 미디어 / 사이니지 플레이리스트 / 태블렛 화면 세트 / 다국어 상품 콘텐츠)
- 발견사항 **19건** — P0 4 / P1 6 / P2 9

### 1.3 가장 중요한 발견 5건

| # | ID | 요지 |
|:-:|----|------|
| 1 | **HUB-P0-03** | `/glycopharm/assets`·`/cosmetics/assets`·`/{gp,cos}/store-assets` 가 KPA 전용 `createAssetSnapshotController` / `store-asset-control.controller` 를 마운트. `allowedRoles=['kpa:*']`, `KpaAssetResolver`, `resolveOrgId=isStoreOwner(...,'kpa')`, `sourceService:'kpa'` — GP/KCos 콘텐츠 가져오기가 구조적으로 성립하지 않고, 두 역할을 겸한 사용자는 **KPA 조직으로 복사**된다 |
| 2 | **HUB-P0-01** | `POST /pharmacy/products/apply` 가 `offer_service_approvals` 재검증 없이 offer id 만으로 신청 생성 — 목록에 보이지 않는 offer 를 ID 직접 지정으로 가져올 수 있음 |
| 3 | **HUB-P0-02** | PRIVATE offer 가 `allowed_seller_ids` 검사 없이 HUB 카탈로그에 노출·신청 가능. 차단은 **checkout 단에서만** 존재 |
| 4 | **HUB-P0-04** | `/apply`·`/applications` 의 `service_key` 가 클라이언트 body/query 입력 (`resolveServiceKeyFromBody`) — Boundary Policy Guard Rule 4 (serviceKey 스푸핑 금지) 이탈 |
| 5 | **HUB-P1-01** | GP·KCos HUB 콘텐츠 검색창이 `search=` 를 서버로 보내지만 `/api/v1/hub/contents` 컨트롤러가 파라미터를 읽지 않음 → 검색해도 전체 목록이 그대로 표시 |

---

## 2. 조사 기준

| 항목 | 값 |
|------|-----|
| 저장소 | `c:\Users\sohae\coding\o4o-platform` (canonical clone) |
| 브랜치 | `main` |
| 기준 commit | `d9cc1b0fb3f4f37f49be4d36ea0589b59c596f18` (2026-07-26) |
| 조사 방식 | **정적 코드 분석 100%** (프론트 route/메뉴 → API client → controller → service → SQL) |
| DB / 프로덕션 실증 | **미수행** |
| 다른 세션 WIP | `pnpm-lock.yaml`, `apps/api-server/src/scripts/data/*.json`, `docs/checks/CHECK-...BATCH-V1.md` — **미수정** |

> **근거 등급 표기** — 본 문서의 모든 판정은 `[코드]` 등급이다.
> `[코드]` 코드 경로 정적 확인 · `[문서]` 기존 문서 근거 · `[실증]` 프로덕션 확인 · `[미확인]` 확인 못함.
> **프로덕션 실증을 하지 않았으므로 PASS 는 "코드상 게이트가 존재한다"는 의미이며, 실제 데이터에서의 무결성을 단정하지 않는다.**

---

## 3. 서비스·자원 인벤토리

### 3.1 서비스별 HUB 진입점

| 서비스 | HUB route | Layout | Guard |
|--------|-----------|--------|-------|
| KPA-Society | `/store-hub` | `PharmacyHubLayout` | `HubGuard` |
| GlycoPharm | `/store-hub` | `GlycoPharmHubLayout` | `GlycoHubGuard` |
| K-Cosmetics | `/store-hub` | `KCosmeticsHubLayout` | `RoleGuard(cosmetics:store_owner\|operator\|admin\|platform:super_admin)` |
| Neture | — | — | 매장 HUB 없음. 공급자/유통 도메인 전용 |

공통 템플릿: [packages/shared-space-ui/src/StoreHubTemplate.tsx](packages/shared-space-ui/src/StoreHubTemplate.tsx) (5-block) — KPA 만 `renderMainSections` 슬롯으로 최신 자원 피드로 대체.

### 3.2 serviceKey 값 (실측)

| 용도 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|------------|-------------|
| store 콘텐츠 계열 (blog/pop/qr/video/cms) | `kpa` | `glycopharm` | `k-cosmetics` |
| signage / tablet 계열 | `kpa-society` | `glycopharm` | `k-cosmetics` |
| offer 승인 키 (`offer_service_approvals`) | `kpa-society` | `glycopharm` | `k-cosmetics` |
| 라우터 팩토리 주입 키 | `kpa` | `glycopharm` | `cosmetics` |

> KPA 는 **의도된 이축 구조**다 — [store-tablet.routes.ts:66-71](apps/api-server/src/routes/platform/store-tablet.routes.ts#L66-L71) 이 `'kpa'` 와 `'kpa-society'` 혼용 금지를 명문화. 다만 프론트에 두 값이 흩어져 있어 드리프트 위험이 남는다 (HUB-P1-02).

---

## 4. 메뉴 · route 지도

### 4.1 KPA (`PharmacyHubLayout` 사이드바 11 항목 / route 13)

| 자원 | 홈 미리보기 | 전체 목록 | 상세 | 가져오기 후 | 사본 관리 | 실제 활용 |
|------|------------|-----------|------|-------------|-----------|-----------|
| 상품 | ✅ `StoreHubLatestFeed` | `/store-hub/b2b` | 행 내 확장 | `/store/commerce/products` | 동일 | 설명서·QR·POP·태블렛 |
| CMS/일반 콘텐츠 | ✅ | `/store-hub/content` | Drawer | `/store/content` | `/store/content` | QR·태블렛 |
| POP | ✅ | `/store-hub/pop` | `BaseDetailDrawer` | `/store/content/pop` | `/store/content/pop` | POP builder → PDF |
| QR | ✅ | `/store-hub/qr` | Drawer | `/store/marketing/qr` | `StoreQRPage` (전용 사본화면 없음) | 공개 URL·출력·통계 |
| 동영상 | ✅ | `/store-hub/video` | Drawer | 매장 사본 | — | QR 연결 |
| 사이니지 미디어 | ✅ | `/store-hub/signage` (탭) | Drawer | `/store/content?tab=signage` | 자료함 | 플레이리스트 |
| 사이니지 플레이리스트 | ❌ | `/store-hub/signage` (탭) | Drawer | 동일 | 자료함 | 화면 송출 |
| 태블렛 화면 세트 | ❌ | `/store-hub/screen-set` | 인라인 미리보기 | `/store/commerce/tablet-displays` | 동일 (전용화면 없음) | 코너별 운영에서 적용 |
| 블로그 | ❌ | `/store-hub/blog` | Drawer | 매장 블로그 | 동일 | 게시 |
| 다국어 상품 콘텐츠 | ❌ | `/store-hub/multilingual-product-contents` | — | `.../my` | `.../my` | 상품 QR |
| 이벤트·특가 / 장바구니 | — | `/store-hub/event-offers`, `/cart` | — | — | — | 주문 |

**메뉴↔route 정합 확인 결과**

- ✅ 메뉴 있고 route 없는 항목: **0건** (데드링크 0)
- ⚠️ route 있고 메뉴 없는 항목: **1건** — `multilingual-product-contents` (HUB-P2-03). `StoreLocalProductsPage` 의 `onNavigateHub` 로만 도달 가능
- ✅ 중복 메뉴: 0건. legacy `/hub/*` → `/store-hub` redirect, `/event-offers` → `/store-hub/event-offers` redirect 정상

### 4.2 GP / K-Cosmetics (사이드바 9 항목 / route 8)

`홈 · 상품 카탈로그 · 사이니지 · 콘텐츠 · 블로그 · POP · QR · 이벤트 · 장바구니`

**KPA 대비 부재:** 동영상, 태블렛 화면 세트, 다국어 상품 콘텐츠 → HUB-P1-03.

---

## 5. API · controller · service 지도

| 계층 | 파일 |
|------|------|
| HUB 목록 (공통, 무인증) | [hub-content.controller.ts](apps/api-server/src/modules/hub-content/hub-content.controller.ts) → [hub-content.service.ts](apps/api-server/src/modules/hub-content/hub-content.service.ts) |
| 상품 카탈로그·신청 | [pharmacy-products.controller.ts](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts) → [product-approval-v2.service.ts](apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts) |
| POP import | [pop.controller.ts:190](apps/api-server/src/routes/o4o-store/controllers/pop.controller.ts#L190) |
| Blog import | [blog.controller.ts:499](apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts#L499) |
| QR import | [qr.controller.ts:120](apps/api-server/src/routes/o4o-store/controllers/qr.controller.ts#L120) + [qr-content-hub-copy.service.ts](apps/api-server/src/routes/o4o-store/services/qr-content-hub-copy.service.ts) |
| Video import | [video.controller.ts:125](apps/api-server/src/routes/o4o-store/controllers/video.controller.ts#L125) |
| Screen Set HUB | [store-tablet.routes.ts:1563-1900](apps/api-server/src/routes/platform/store-tablet.routes.ts#L1563) |
| CMS/콘텐츠 사본 | [asset-snapshot.controller.ts](apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts) → [kpa-asset.resolver.ts](apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts) → [asset-copy.service.ts](packages/asset-copy-core/src/services/asset-copy.service.ts) |
| 사본 관리 | [store-asset-control.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-asset-control.controller.ts) |

---

## 6. 자원별 노출 계약 (2단계)

`HubContentQueryService` 도메인별 WHERE 조건 (전부 Raw SQL parameter binding — **Guard Rule 2 PASS**):

| sourceDomain | 테이블 | 노출 조건 | 판정 |
|--------------|--------|-----------|:----:|
| `cms` | `cms_contents` | `serviceKey` + `status='published'` + `visibilityScope IN (platform, service)` | PASS |
| `signage-media` | `signage_media` | `serviceKey` + `status='active'` + `scope='global'` + `source IN (hq, supplier, community)` | PASS |
| `signage-playlist` | `signage_playlists` | 동일 | PASS |
| `blog` | `store_blog_posts` | `service_key` + `author_role='operator'` + `status='published'` | PASS |
| `pop` | `store_pops` | 동일 | PASS |
| `qr` | `operator_qr_templates` | 동일 | PASS |
| `video` | `store_videos` | 동일 | PASS |
| `screen-set` | `store_tablet_screen_sets` | `service_key` + `origin='operator'` + `status='operator_template'` + `deleted_at IS NULL` | PASS (단, **소비처 0** → HUB-P2-05) |

### 4소비처 일치 검증

| 소비처 | KPA | GP/KCos | 판정 |
|--------|-----|---------|:----:|
| HUB 홈 미리보기 | pop/qr/video(`kpa`) + signage-media(`kpa-society`) + cms + content hub | 정적 카드 (5-block 기본) | `DIFFERENT_BUT_INTENDED` |
| HUB 전체 목록 | 동일 API·동일 조건 | 동일 | PASS |
| HUB 상세 | 목록 응답 재사용 (별도 조회 없음) | 동일 | PASS |
| 가져오기 resolver | 목록과 **동일 WHERE 를 서버에서 재구성** | 동일 | PASS |

> **핵심:** 콘텐츠 계열은 "목록에 안 보이는 것은 가져올 수도 없다"가 코드상 성립한다. 각 import 엔드포인트가 `serviceKey + author_role='operator' + status='published'` 를 다시 걸기 때문이다.
> 상품 계열은 이 성질이 **깨져 있다** (§7.2).

### 홈 피드 누락 (P2)

`StoreHubLatestFeed` 의 "새로운 디지털 자료" 는 pop/qr/video/signage-media 4종만 병합 — **blog·screen-set 미포함**. 두 자원은 사이드바 메뉴로만 도달. → HUB-P2-08.

---

## 7. 서비스 격리 (3단계)

### 7.1 콘텐츠 계열 — PASS

- 목록: 전 도메인 `service_key = $1` 바인딩
- 상세: 목록 응답 재사용 (별도 ID 조회 경로 없음)
- 단건/일괄 가져오기: import 엔드포인트가 팩토리 주입 `serviceKey` 로 재검증. **클라이언트 입력 아님**
- `KpaAssetResolver.resolveCms`: `serviceKey IN ('kpa','kpa-society')` — 과거 타 서비스 CMS 복사 취약점이 명시적으로 수정된 흔적 확인 ([kpa-asset.resolver.ts:81-93](apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts#L81-L93))
- `resolveSignage`: `serviceKey='kpa-society'` + `scope='global'` + `source IN (hq,supplier,community)` — `source='store'` 배제로 **매장 간 자산 유출 차단**

### 7.2 상품 계열 — FAIL

`GET /pharmacy/products/catalog` ([pharmacy-products.controller.ts:115-133](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L115-L133)):

```sql
AND ( spo.distribution_type = 'PUBLIC'
   OR EXISTS (SELECT 1 FROM offer_service_approvals osa
              WHERE osa.offer_id = spo.id
                AND osa.service_key = $N
                AND osa.approval_status = 'approved') )
```

- ✅ SERVICE / PRIVATE 은 **현재 서비스 승인**이 있어야 노출 — cross-service 누출 차단됨
- ⚠️ PUBLIC 은 게이트 예외 → 모든 서비스 HUB 에 노출 (설계상 의도). **의약품 등 서비스 제한 상품에 대한 별도 카테고리 게이트는 카탈로그 경로에 존재하지 않음** — 태블렛 Screen Set 경로에만 `medicationStoreAccessAllowed` 가드가 있다 → HUB-P1-06
- ❌ PRIVATE 이 `allowed_seller_ids` 없이 노출 → HUB-P0-02
- ❌ `POST /apply` 가 위 게이트를 재검증하지 않음 → HUB-P0-01

### 7.3 GP / K-Cosmetics 자료함 — FAIL

```
glycopharm.routes.ts:388  router.use('/assets',       createAssetSnapshotController(dataSource, coreRequireAuth))
glycopharm.routes.ts:391  router.use('/store-assets', createStoreAssetControlController(dataSource, coreRequireAuth))
cosmetics.routes.ts:155   router.use('/assets',       createAssetSnapshotController(dataSource, coreRequireAuth))
cosmetics.routes.ts:158   router.use('/store-assets', createStoreAssetControlController(dataSource, coreRequireAuth))
```

두 컨트롤러 모두 **serviceKey 파라미터를 받지 않는 KPA 고정 구현**이다 → HUB-P0-03. 상세는 §12.

---

## 8. 상태 · 출처 게이트 (4·5단계)

| 자원 | HUB 노출 상태 | 상세 허용 | 가져오기 허용 | 공개 허용 |
|------|--------------|-----------|--------------|-----------|
| CMS 콘텐츠 | `published` + scope platform/service | 동일 | `published` + serviceKey kpa/kpa-society | — |
| 콘텐츠 허브(`kpa_contents`) | `ready` | 동일 | `ready`·`published` + `sub_type≠resource` + `reusable_policy≠restricted` + `is_deleted=false` | — |
| 블로그 | `published` + operator | 동일 | 동일 | 매장 사본 `draft` 시작 |
| POP | `published` + operator | 동일 | 동일 | 매장 사본 `draft` 시작 |
| QR 템플릿 | `published` + operator | 동일 | 동일 | 매장 사본 `is_active=true`, 공개 랜딩은 `qr.is_active` 라이브 검사 |
| 동영상 | `published` + operator | 동일 | 동일 | 매장 사본 `draft` 시작 |
| 사이니지 미디어/플레이리스트 | `active` + `scope=global` + source 3종 | 동일 | 동일 | — |
| 태블렛 화면 세트 | `operator_template` + `deleted_at IS NULL` | 동일 | 동일 (**트랜잭션 내 재검증**) | 원본에 공개 URL·QR 미발급 |
| 상품 offer | `is_active` + supplier `ACTIVE` + 승인 게이트 | 동일 | **게이트 미재검증** ❌ | — |

### 출처(source/author_role) 계약

| 값 | HUB 공유 | 근거 |
|----|:--------:|------|
| `operator` / `hq` | ✅ | 전 도메인 canonical |
| `supplier` | ✅ (Screen Set·Signage) / Legacy 예외 (CMS) | F4 `PLATFORM-CONTENT-POLICY-V1` §6.3 |
| `community` | ✅ (Signage 만) | — |
| `store` | ❌ **전 경로 배제** | `queryBlog/Pop/Video` 의 `author_role='operator'`, `resolveSignage` 의 `source IN (hq,supplier,community)`, `queryScreenSet` 의 `origin='operator'` |

> Store→Community 공유 흐름은 `WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1` 로 이미 폐기됨이 코드 주석·제거 흔적으로 확인된다. **한 매장 자원이 다른 매장 HUB 에 재노출되는 경로는 발견되지 않았다.**

---

## 9. 가져오기 · 사본 계약 (6·7단계)

| 자원 | 원본 테이블 | 사본 테이블 | 사본 ID 반환 | 원본 추적 | 중복 정책 | 독립성 |
|------|------------|------------|:-----------:|-----------|-----------|:------:|
| 블로그 | `store_blog_posts` (operator) | `store_blog_posts` (store) | ✅ | ❌ excerpt 접두어 텍스트만 | 매번 새 사본 | `FULL_COPY` |
| POP | `store_pops` (operator) | `store_pops` (store) | ✅ | ❌ excerpt 접두어 | 매번 새 사본 | `FULL_COPY` |
| QR | `operator_qr_templates` | `store_qr_codes` | ✅ | ❌ description 접두어 | 매번 새 사본 | `FULL_COPY` |
| 동영상 | `store_videos` (operator) | `store_videos` (store) | ✅ | ✅ **`copied_from_id`** | 매번 새 사본 | `FULL_COPY` |
| 태블렛 화면 세트 | `store_tablet_screen_sets` (operator) | 동 테이블 (store) | ✅ | ✅ **`store_asset_derivations`** | 매번 새 사본 (명시) | `FULL_COPY` |
| CMS / 콘텐츠 허브 | `cms_contents` / `kpa_contents` | `o4o_asset_snapshots` | ✅ | ✅ `sourceAssetId` | 매번 새 사본 (명시) | `FULL_COPY` |
| 사이니지 미디어 | `signage_media` | `o4o_asset_snapshots` | ✅ | ✅ `sourceAssetId` | 매번 새 사본 | `FULL_COPY` |
| 상품 | `supplier_product_offers` | `product_approvals` / `organization_product_listings` | ✅ | ✅ `offer_id` | 중복 차단 (`ALREADY_PENDING/APPROVED`) | `REFERENCE` (의도) |

**독립성 판정 요약**

- 콘텐츠 계열 8종 = **`FULL_COPY`**. 원본 수정·보관·삭제가 기존 사본에 영향 없음 (FK·동기화 없음)
- 상품 = **`REFERENCE`** — 단, 이는 취급 계약이지 콘텐츠 사본이 아니므로 의도된 설계
- QR 의 `landing_type='page'` 는 원래 `content_hub` 원본 ref 를 그대로 담았으나, `ensureStoreCopyForPageTarget` 가드가 **매장 소유 사본으로 치환**한다 ([qr.controller.ts:203-217](apps/api-server/src/routes/o4o-store/controllers/qr.controller.ts#L203-L217)) → §17.9 위험 항목 **해소 확인**

**트랜잭션·부분 실패**

- Screen Set import: `dataSource.transaction` + 트랜잭션 내 원본 재검증 (동시 보관·삭제 방어) — **best practice**
- blog/pop/qr/video 일괄 가져오기: **백엔드 bulk 엔드포인트 없음**. 프론트 `Promise.allSettled` fan-out → `BulkResultModal` 로 성공/실패 건별 표시 + 재시도 제공. 사용자에게 숨겨지지는 않음 → P2

---

## 10. 권한 · 소유권 (9단계)

| 검사 | KPA | GlycoPharm | K-Cosmetics | 판정 |
|------|-----|------------|-------------|:----:|
| HUB 목록 조회 인증 | ❌ 무인증 (`/api/v1/hub/contents`) | ❌ | ❌ | P1 (HUB-P1-05) |
| import 인증 | `requireAuth` | 동일 | 동일 | PASS |
| 매장 소유권 | `kpaStoreOwnerOwnsStore` (role_assignments SSOT) | `created_by_user_id` | `created_by_user_id` | PASS |
| 다른 매장 사본 조회/수정/삭제 | `organizationId` 필수 스코프 | 동일 | 동일 | PASS |
| 상품 카탈로그 | `requireAuth` + `createRequireStoreOwner(serviceKey)` | 동일 | 동일 | PASS |
| 자료함 copy/list 역할 | `kpa:*` | **`kpa:*` (오류)** | **`kpa:*` (오류)** | **FAIL** |
| 공개 QR 랜딩 | 무인증 + `qr.is_active` 라이브 검사 | 동일 | 동일 | PASS |
| Screen Set 원본 미리보기 | `withStoreAuth` (인증 매장만) | — | — | PASS |

`AssetCopyService.updateById` / `deleteById` 는 `{ id, organizationId }` 복합 조건으로 조회 — **UUID 단독 조회 금지 (Guard Rule 1) 준수**.

---

## 11. 검색 · 필터 · 페이지네이션 (10단계)

| 화면 | 검색 | 필터 | page 초기화 | total 정확 | 정렬 |
|------|:----:|------|:-----------:|:----------:|------|
| KPA HUB POP/QR/Video/Blog | ❌ 없음 | ❌ 없음 | ✅ | ✅ | ⚠️ 현재 페이지 내 client sort |
| KPA HUB 사이니지 | ❌ | 소스 탭 (client) | ✅ | ✅ | 동일 |
| KPA HUB 콘텐츠 | ✅ 서버 | 소스 탭 (서버 분기) | ✅ | ✅ | ✅ |
| KPA HUB 태블렛 화면 | ✅ 서버 (`q`) | ✅ 서버 (`templateKey`) | — 페이지네이션 없음 (`LIMIT 200`) | ❌ total 없음 | ✅ |
| KPA HUB B2B | ❌ | ✅ 서버 (distributionType) | ✅ | ✅ | ✅ |
| **GP/KCos HUB 콘텐츠** | ⚠️ **UI 있음 / 서버 무시** | — | ✅ | ✅ | ✅ |
| mixed 모드 (`sourceDomain` 미지정) | — | — | — | ❌ 도메인당 100 cap 후 in-memory 합산 | ✅ |

---

## 12. 발견사항

### P0 — 격리 · 우회 · 독립성 훼손

---

#### HUB-P0-01 · 상품 취급 신청이 목록의 서비스 승인 게이트를 재검증하지 않음

- **현상** `GET /catalog` 는 SERVICE/PRIVATE offer 를 `offer_service_approvals.approval_status='approved'` (현재 서비스) 조건으로 필터한다. 그러나 `POST /apply` 는 offer 를 `WHERE id = $1 AND is_active = true` 로만 조회하고, `createServiceApproval` / `createPrivateApproval` 어디에도 `offer_service_approvals` 검사가 없다.
- **근거**
  - [pharmacy-products.controller.ts:273-276](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L273-L276) — offer 조회 SQL
  - [product-approval-v2.service.ts:43-98](apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts#L43) `createServiceApproval` — distributionType / isActive / supplier ACTIVE / 중복만 검사
  - [product-approval-v2.service.ts:243-298](apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts#L243) `createPrivateApproval` — 동일
- **영향 서비스** KPA / GlycoPharm / K-Cosmetics 전부
- **영향 자원** 상품
- **재현 조건** 자기 서비스에서 승인되지 않은(따라서 카탈로그에 보이지 않는) offer 의 UUID 를 알고 `POST /pharmacy/products/apply { supplyProductId }` 호출
- **위험도** **높음** — IR §8 의 FAIL 정의("목록에 보이지 않는 상태를 ID로 직접 지정하여 가져올 수 있으면 FAIL")에 정확히 해당. 타 서비스 전용 상품이 다른 서비스 매장의 취급 목록에 편입
- **수정 방향** `/apply` 에 마운트 `serviceKey` → `STORE_SERVICE_KEY_TO_APPROVAL_KEY` 매핑 후 카탈로그와 **동일한 approvalFilter** 를 재적용. 게이트 SQL 을 공용 헬퍼로 추출해 목록·신청 단일 소스화
- **권장 후속 WO** `WO-O4O-STORE-HUB-PRODUCT-APPLY-APPROVAL-GATE-PARITY-V1`

---

#### HUB-P0-02 · PRIVATE offer 가 `allowed_seller_ids` 검사 없이 HUB 에 노출·신청 가능

- **현상** PRIVATE 은 "공급자가 `allowed_seller_ids` 로 지정한 비공개 공급" 이다. 그러나 카탈로그 SQL 은 `distribution_type IN ('PUBLIC','SERVICE','PRIVATE')` 로 PRIVATE 을 포함시키고, 서비스 단위 승인만 확인할 뿐 **매장 단위 `allowed_seller_ids` 를 검사하지 않는다**. `createPrivateApproval` 에도 해당 검사가 없다.
- **근거**
  - 노출: [pharmacy-products.controller.ts:179](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L179)
  - 신청: [product-approval-v2.service.ts:243-298](apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts#L243)
  - **대조군 — 차단이 존재하는 곳**: [kpa-checkout.controller.ts:347](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L347), [glycopharm/checkout.controller.ts:378](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts#L378), [neture-b2b-cart-checkout.service.ts:221](apps/api-server/src/services/cart/neture-b2b-cart-checkout.service.ts#L221) — 모두 `allowed_seller_ids.includes(orgId)` 강제
- **영향 서비스** 전 서비스 / **영향 자원** 상품
- **재현 조건** `allowed_seller_ids` 에 포함되지 않은 매장이 자기 서비스에서 승인된 PRIVATE offer 를 HUB 카탈로그에서 열람 → "내 매장에 추가"
- **위험도** **높음** — 비공개 공급 관계·가격이 비대상 매장에 노출. 실패는 checkout 시점까지 지연되어 사용자 혼선까지 유발
- **수정 방향** 카탈로그 SQL 과 `createPrivateApproval` 양쪽에 `($orgId = ANY(spo.allowed_seller_ids))` 조건 추가. checkout 의 기존 검사 로직을 공용화
- **권장 후속 WO** `WO-O4O-STORE-HUB-PRIVATE-OFFER-SELLER-SCOPE-GATE-V1`

---

#### HUB-P0-03 · GP / K-Cosmetics 자료함이 KPA 전용 컨트롤러에 마운트됨

- **현상** GlycoPharm·K-Cosmetics 가 `/assets`(가져오기·목록)·`/store-assets`(사본 관리) 를 자기 라우터에 마운트하면서 **serviceKey 파라미터가 없는 KPA 고정 컨트롤러**를 그대로 사용한다.

  `createAssetSnapshotController` 의 고정 설정 ([asset-snapshot.controller.ts:57-96](apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts#L57-L96)):

  | 설정 | 고정값 | GP/KCos 에서의 결과 |
  |------|--------|---------------------|
  | `allowedRoles` | `['kpa:admin','kpa:operator','kpa:pharmacist','kpa:store_owner']` | `glycopharm:store_owner` / `cosmetics:store_owner` → **403 FORBIDDEN** |
  | `resolver` | `KpaAssetResolver` | `resolveCms` 가 `serviceKey IN ('kpa','kpa-society')` → GP/KCos CMS 는 **404 SOURCE_NOT_FOUND** |
  | | | `resolveSignage` 가 `serviceKey='kpa-society'` → GP/KCos 사이니지 **404** |
  | `resolveOrgId` | `isStoreOwner(ds, userId, 'kpa')` → `KpaMember` fallback | KPA 역할을 겸한 사용자는 GP HUB 자원을 **자신의 KPA 조직으로 복사** |
  | `sourceService` | `'kpa'` | GP/KCos 사본에 `source_service='kpa'` 로 기록 |

  `store-asset-control.controller.ts` 도 동일하게 `isStoreOwner(dataSource, userId, 'kpa')` 로 조직을 해석하고 `kpa_store_asset_controls` 를 사용한다.

- **근거**
  - [glycopharm.routes.ts:388, 391](apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L388)
  - [cosmetics.routes.ts:155, 158](apps/api-server/src/routes/cosmetics/cosmetics.routes.ts#L155)
  - [asset-snapshot.controller.ts:57-96](apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts#L57-L96)
  - [kpa-asset.resolver.ts:91-93, 205](apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts#L91-L93)
  - [store-asset-control.controller.ts:38](apps/api-server/src/routes/o4o-store/controllers/store-asset-control.controller.ts#L38)
  - 호출 지점: [web-glycopharm/src/api/assetSnapshot.ts:58](services/web-glycopharm/src/api/assetSnapshot.ts#L58) `POST /glycopharm/assets/copy`, [HubContentListPage.tsx:95](services/web-glycopharm/src/pages/hub/HubContentListPage.tsx#L95)
- **영향 서비스** GlycoPharm, K-Cosmetics / **영향 자원** CMS 콘텐츠, 사이니지 미디어, 사본 관리 전반
- **재현 조건** GP/KCos 매장 경영자가 `/store-hub/content` 에서 "내 약국에 복사" 클릭
- **위험도** **높음** — 두 축 모두 문제. ① **기능 단절**: GP/KCos 콘텐츠 가져오기가 성립하지 않음 ② **서비스 격리 훼손**: 다중 역할 사용자에게 cross-service 조직 write 가 발생
- **수정 방향** `createAssetSnapshotController` / `createStoreAssetControlController` 를 `serviceKey` 인자를 받는 팩토리로 전환하고, 서비스별 `AssetResolver`(GlycopharmAssetResolver / CosmeticsAssetResolver) 와 `allowedRoles`·`resolveOrgId` 를 주입. QR/POP/Blog staff controller 가 이미 쓰는 팩토리 패턴과 동일하게 정렬
- **참고** CLAUDE.md §"Shared Module / Core+Extension Change Rule" 대상 — 소비처 전수 식별 후 공통 정책으로 해결할 것 (KPA-only 임시 예외 금지)
- **권장 후속 WO** `WO-O4O-ASSET-SNAPSHOT-CONTROLLER-SERVICE-AWARE-FACTORY-V1`

---

#### HUB-P0-04 · 상품 신청·조회의 `service_key` 가 클라이언트 입력

- **현상** `resolveServiceKeyFromBody(req.body)` / `resolveServiceKeyFromQuery(req.query)` 가 클라이언트 제공 `service_key` 를 받아 `SERVICE_KEYS` 목록에 있으면 그대로 통과시킨다(미지정 시 `kpa-society` 기본). 마운트 `serviceKey` 와의 일치 검증이 없다. 이 값이 `product_approvals.service_key` / `organization_product_listings.service_key` 에 **그대로 기록**된다.
- **근거** [pharmacy-products.controller.ts:32-44](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L32-L44), 사용처 L258 / L316, 기록 지점 `createPublicListing` [product-approval-v2.service.ts:558-563](apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts#L558)
- **영향 서비스** 전 서비스 / **영향 자원** 상품
- **재현 조건** KPA 매장 경영자가 `POST /api/v1/kpa/pharmacy/products/apply { supplyProductId, service_key: 'glycopharm' }` 호출
- **위험도** **높음** — CLAUDE.md §7 Guard Rule 4 "serviceKey 스푸핑 금지 — URL 경로 파라미터에서만 추출" 정면 이탈. 다른 서비스 경계의 listing/approval row 생성으로 이어질 수 있음
- **수정 방향** body/query 의 `service_key` 수용을 제거하고 마운트 주입 `serviceKey` 만 사용. 하위호환이 필요하면 불일치 시 400 으로 거부
- **권장 후속 WO** `WO-O4O-STORE-HUB-PRODUCT-SERVICEKEY-SPOOFING-GUARD-V1`

---

### P1 — 동선 단절 · 실질적 불일치

---

#### HUB-P1-01 · GP / K-Cosmetics HUB 콘텐츠 검색이 서버에서 무시됨

- **현상** GP·KCos 의 `hubContentApi.list` 는 `search` / `type` 쿼리 파라미터를 전송하지만, `/api/v1/hub/contents` 컨트롤러는 `serviceKey · producer · sourceDomain · page · limit` 만 읽는다. 검색어를 입력해도 결과가 필터되지 않고 전체 목록이 그대로 표시된다.
- **근거** [web-glycopharm/src/api/hubContent.ts:29-30](services/web-glycopharm/src/api/hubContent.ts#L29-L30), [web-k-cosmetics/src/lib/api/hubContent.ts](services/web-k-cosmetics/src/lib/api/hubContent.ts) vs [hub-content.controller.ts:47](apps/api-server/src/modules/hub-content/hub-content.controller.ts#L47). 검색창 렌더: [ContentHubTemplate.tsx:292-299](packages/shared-space-ui/src/ContentHubTemplate.tsx#L292)
- **영향 서비스** GlycoPharm, K-Cosmetics / **영향 자원** CMS 콘텐츠
- **위험도** 중 — 사용자는 "검색했는데 관련 없는 결과가 나온다"로 인식. 조용한 실패
- **수정 방향** `HubContentQueryService` 에 `search`(title/summary ILIKE) 및 `type` 파라미터 추가, 또는 검색 미지원이면 UI 에서 검색창 제거. KPA 는 이미 소스별 서버 검색을 사용하므로 백엔드 지원 방향을 권장
- **권장 후속 WO** `WO-O4O-HUB-CONTENT-QUERY-SEARCH-PARAM-SUPPORT-V1`

---

#### HUB-P1-02 · KPA HUB 프론트에 `kpa` / `kpa-society` 두 serviceKey 가 혼재

- **현상** 동일 엔드포인트 `/api/v1/hub/contents` 에 KPA 프론트가 두 값을 섞어 보낸다.

  | 파일 | 값 |
  |------|-----|
  | `HubPopLibraryPage` / `HubQrLibraryPage` / `HubVideoLibraryPage` / `HubBlogLibraryPage` | `kpa` |
  | `HubSignageLibraryPage` (media·playlist) | `kpa-society` |
  | `HubContentLibraryPage` | 설정 `kpa-society` / 실제 CMS 조회 `kpa` (동일 파일 내 상이) |
  | `StoreHubLatestFeed` | pop·qr·video = `kpa`, signage-media = `kpa-society` |
- **근거** [HubContentLibraryPage.tsx:115 vs 148](services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx#L115), [HubSignageLibraryPage.tsx:112,137](services/web-kpa-society/src/pages/pharmacy/HubSignageLibraryPage.tsx#L112), [StoreHubLatestFeed.tsx:190-193](services/web-kpa-society/src/pages/pharmacy/StoreHubLatestFeed.tsx#L190)
- **판정** 이축 자체는 **`DIFFERENT_BUT_INTENDED`** — [store-tablet.routes.ts:66-71](apps/api-server/src/routes/platform/store-tablet.routes.ts#L66-L71) 이 혼용 금지를 명문화. 그러나 상수화 없이 문자열이 8곳에 흩어져 있어 **한 글자 드리프트가 빈 목록으로 직결**된다
- **위험도** 중 — 현재 값 조합은 각 테이블 저장값과 정합한 것으로 보이나(정적 확인), 회귀 방지 장치가 없음. **프로덕션 실증 미수행 — 실제 row 의 serviceKey 분포는 미확인**
- **수정 방향** KPA 프론트에 `KPA_STORE_SERVICE_KEY='kpa'` / `KPA_PLATFORM_SERVICE_KEY='kpa-society'` 상수 도입 후 전 소비처 치환. 도메인↔키 매핑 테이블을 한 곳에 고정
- **권장 후속 WO** `WO-O4O-KPA-STORE-HUB-SERVICEKEY-CONSTANT-CONSOLIDATION-V1`

---

#### HUB-P1-03 · GP / K-Cosmetics HUB 에 동영상 · 태블렛 화면 자원 부재

- **현상** 백엔드는 서비스 중립적이나(`store_videos` / `store_tablet_screen_sets` 모두 `service_key` 보유), 프론트 route·메뉴·API 클라이언트가 KPA 에만 존재. `createStoreVideoStaffController` 도 `kpa.routes.ts` 에만 등록.
- **근거** [kpa.routes.ts:479](apps/api-server/src/routes/kpa/kpa.routes.ts#L479) vs `glycopharm.routes.ts` / `cosmetics.routes.ts` 미등록. 메뉴: `GlycoPharmHubLayout` / `KCosmeticsHubLayout` 9항목 vs `PharmacyHubLayout` 11항목
- **위험도** 중 — 기능 부재이지 결함은 아니나, "매장 HUB" 라는 동일 개념의 서비스 간 경험이 불균등
- **수정 방향** POP/QR 이 이미 밟은 port 경로(`WO-O4O-KCOS-STORE-HUB-POP-QR-PORT-V1`) 재사용
- **권장 후속 WO** `WO-O4O-STORE-HUB-VIDEO-SCREENSET-GP-KCOS-PORT-V1`

---

#### HUB-P1-04 · mixed 모드 `total` 부정확 + `screen-set` 미포함

- **현상** `sourceDomain` 미지정 시 `queryMixed` 가 도메인별 최대 100건(`MAX_FETCH_PER_DOMAIN`)만 가져와 in-memory 병합 후 `total = items.length` 로 응답한다. 실제 전체 건수가 아니며, 어느 도메인이 100건에서 잘렸는지도 알리지 않는다. 또한 `queryMixed` 의 `Promise.allSettled` 배열에 `queryScreenSet` 이 **누락**돼 통합 목록에 태블렛 화면 세트가 나타나지 않는다.
- **근거** [hub-content.service.ts:215-252](apps/api-server/src/modules/hub-content/hub-content.service.ts#L215-L252)
- **위험도** 중 — 현재 KPA/GP/KCos 프론트는 전부 `sourceDomain` 을 지정해 호출하므로 **실사용 영향은 낮다**. 다만 무인증 공개 엔드포인트로서 잘못된 total 을 반환
- **수정 방향** mixed 모드에 도메인별 `COUNT` 합산 도입, 또는 mixed 모드를 명시적으로 미지원 처리. `screen-set` 포함 여부를 정책으로 확정
- **권장 후속 WO** `WO-O4O-HUB-CONTENT-MIXED-MODE-TOTAL-AND-DOMAIN-COVERAGE-V1`

---

#### HUB-P1-05 · HUB 목록 API 가 무인증 + serviceKey 쿼리 파라미터

- **현상** `/api/v1/hub/contents` 는 인증을 요구하지 않고 `serviceKey` 를 **쿼리 파라미터로** 받는다. 임의 호출자가 `serviceKey` 만 바꿔 다른 서비스의 운영자 게시 자원 목록(제목·요약·게시일·동영상 URL 포함)을 열람할 수 있다.
- **근거** [hub-content.controller.ts:45-56](apps/api-server/src/modules/hub-content/hub-content.controller.ts#L45-L56); `mapVideoItem` 이 `sourceUrl`(video_url) 노출 [hub-content.service.ts:715](apps/api-server/src/modules/hub-content/hub-content.service.ts#L715)
- **판정** CLAUDE.md §7 Guard Rule 4 는 "URL 경로 파라미터에서만 추출" 을 요구 — **이탈**. 다만 대상이 `status='published'` 운영자 자료이므로 매장 데이터 유출은 아님. 그래서 P0 가 아닌 P1
- **위험도** 중 — 서비스별 콘텐츠 편성이 경쟁 서비스에 그대로 노출
- **수정 방향** ① 경로를 `/api/v1/:serviceKey/hub/contents` 로 이동해 경로 파라미터화, 또는 ② `requireAuth` + 세션 membership 기반 serviceKey 도출. 프론트가 `authClient` 를 쓰지 않는 KPA 클라이언트도 함께 정렬(HUB-P2-04)
- **권장 후속 WO** `WO-O4O-HUB-CONTENT-SERVICEKEY-PATH-SCOPING-V1`

---

#### HUB-P1-06 · 상품 카탈로그에 의약품/매장유형 게이트 부재

- **현상** 태블렛 Screen Set 공급자 HUB 는 매장 유형(`organizations.type`)과 의약품 가드를 **목록·상세·가져오기 3중**으로 검사한다. 반면 상품 카탈로그는 `distribution_type` + 서비스 승인만 확인하며, PUBLIC offer 는 승인 게이트 자체가 예외다. 결과적으로 **PUBLIC 의약품 offer 는 비약국 서비스(K-Cosmetics) 매장 HUB 에도 노출**될 수 있다.
- **근거** 가드 존재: [store-tablet.routes.ts:59-60, 1703-1709](apps/api-server/src/routes/platform/store-tablet.routes.ts#L1703) (`analyzeScreenSetMedication`, `medicationStoreAccessAllowed`) / 가드 부재: [pharmacy-products.controller.ts:175-189](apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts#L175-L189)
- **위험도** 중~높음 — **실제 위험도는 PUBLIC 으로 등록된 의약품 offer 의 존재 여부에 달려 있다. 프로덕션 데이터 미확인이므로 P0 로 단정하지 않는다.**
- **수정 방향** 후속 WO 1단계에서 `supplier_product_offers` 중 `distribution_type='PUBLIC'` 이면서 의약품 카테고리인 row 수를 **read-only 로 확인**한 뒤, 0건이 아니면 카탈로그에 Screen Set 과 동일한 매장 유형 게이트를 도입
- **권장 후속 WO** `WO-O4O-STORE-HUB-PRODUCT-MEDICATION-STORE-TYPE-GATE-V1`

---

### P2 — 표준 · 안내 · 정합

| ID | 현상 | 근거 | 수정 방향 |
|----|------|------|-----------|
| **HUB-P2-01** | KPA HUB POP/QR/Video/Blog/사이니지 목록에 **검색창 없음**. `hubContentApi` 에 `search` 파라미터 자체가 없음 | [api/hubContent.ts:20-26](services/web-kpa-society/src/api/hubContent.ts#L20-L26) | HUB-P1-01 백엔드 지원과 동시 처리 |
| **HUB-P2-02** | `DataTable` `sortable` 이 **현재 페이지 내 client sort**. 서버 페이지네이션과 혼합돼 "전체 정렬"로 오인 | `HubPopLibraryPage.tsx:166-208` 등 | 서버 정렬 도입 또는 정렬 UI 제거 |
| **HUB-P2-03** | `/store-hub/multilingual-product-contents` route 존재하나 **HUB 사이드바 메뉴 없음**. `StoreLocalProductsPage` 를 경유해야만 도달 | `PharmacyHubLayout.tsx:63-95` vs `App.tsx:742` | CLAUDE.md "route 있는 실기능 메뉴는 숨기지 않는다" 위반 — 메뉴 추가 또는 route 회수 결정 |
| **HUB-P2-04** | KPA `hubContentApi` 가 `authClient` 대신 raw `fetch` + `import.meta.env.VITE_API_BASE_URL` 직접 사용 | [api/hubContent.ts:16-38](services/web-kpa-society/src/api/hubContent.ts#L16-L38) | CLAUDE.md §1 "API 호출 규칙" 위반 — `authClient.api.get()` 전환 |
| **HUB-P2-05** | `sourceDomain='screen-set'` 백엔드 구현(`queryScreenSet` + `VALID_DOMAINS` 등록) 존재하나 **소비처 0** — 프론트는 `/store/screen-set-hub/templates` 사용 | grep `sourceDomain: 'screen-set'` → 0 hits | 죽은 경로 제거 또는 용도 명문화 |
| **HUB-P2-06** | 중복 가져오기 정책이 자원별로 다름 — 콘텐츠 계열은 매번 새 사본(의도, 안내 있음), blog/pop/qr 은 **안내 없음** | `HubContentLibraryPage.tsx:199` 안내 vs `HubPopLibraryPage` 무안내 | 안내 문구 표준화 |
| **HUB-P2-07** | 태블렛 화면 HUB 목록이 `LIMIT 200` 고정, **페이지네이션·total 없음** | [store-tablet.routes.ts:1593](apps/api-server/src/routes/platform/store-tablet.routes.ts#L1593) | 표준 Pagination 적용 |
| **HUB-P2-08** | KPA 홈 "새로운 디지털 자료" 가 pop/qr/video/signage-media 4종만 병합 — **blog·screen-set 누락** | [StoreHubLatestFeed.tsx:189-193](services/web-kpa-society/src/pages/pharmacy/StoreHubLatestFeed.tsx#L189-L193) | 홈 피드 대상 자원 정책 확정 |
| **HUB-P2-09** | 원본 추적이 자원별 불균등 — video(`copied_from_id`) / screen-set(`store_asset_derivations`) / snapshot(`sourceAssetId`) 은 구조적, **blog·pop·qr 은 `excerpt`/`description` 접두어 텍스트뿐** | `blog.controller.ts:557`, `pop.controller.ts:247`, `qr.controller.ts:229` | `copied_from_id` 컬럼 도입으로 3종 정렬 (schema 변경 → 별도 WO) |

---

## 13. 우선순위 및 후속 WO 순서

| 순서 | WO | 대상 ID | 근거 |
|:----:|----|---------|------|
| 1 | `WO-O4O-STORE-HUB-PRODUCT-APPLY-APPROVAL-GATE-PARITY-V1` | HUB-P0-01, HUB-P0-04 | 동일 파일·동일 함수 범위. 게이트 재검증과 serviceKey 고정을 한 번에 처리 |
| 2 | `WO-O4O-STORE-HUB-PRIVATE-OFFER-SELLER-SCOPE-GATE-V1` | HUB-P0-02 | checkout 에 이미 있는 로직의 상류 이식 — 위험 낮고 효과 큼 |
| 3 | `WO-O4O-ASSET-SNAPSHOT-CONTROLLER-SERVICE-AWARE-FACTORY-V1` | HUB-P0-03 | Shared Module Change Protocol 대상. 소비처 전수 조사 선행 필요 |
| 4 | `WO-O4O-HUB-CONTENT-QUERY-SEARCH-PARAM-SUPPORT-V1` | HUB-P1-01, HUB-P2-01 | 사용자 직접 체감. 백엔드 단일 지점 수정 |
| 5 | `WO-O4O-HUB-CONTENT-SERVICEKEY-PATH-SCOPING-V1` | HUB-P1-05, HUB-P2-04 | Guard Rule 4 정렬. 3서비스 클라이언트 동시 변경 필요 |
| 6 | `WO-O4O-STORE-HUB-PRODUCT-MEDICATION-STORE-TYPE-GATE-V1` | HUB-P1-06 | **1단계 = read-only 데이터 확인**, 결과에 따라 범위 결정 |
| 7 | `WO-O4O-KPA-STORE-HUB-SERVICEKEY-CONSTANT-CONSOLIDATION-V1` | HUB-P1-02 | 회귀 방지. 동작 무변경 리팩터 |
| 8 | `WO-O4O-HUB-CONTENT-MIXED-MODE-TOTAL-AND-DOMAIN-COVERAGE-V1` | HUB-P1-04, HUB-P2-05 | mixed 모드 정책 확정 + 죽은 경로 정리 |
| 9 | `WO-O4O-STORE-HUB-VIDEO-SCREENSET-GP-KCOS-PORT-V1` | HUB-P1-03 | 기능 확장. 앞 8건 이후 |
| 10 | `WO-O4O-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1` | HUB-P2-02·03·06·07·08 | UX·안내 일괄 정비 (CLAUDE.md 정비 WO 단위 원칙: 감사1 + 구현1) |

> **HUB-P2-09** 는 schema 변경(`copied_from_id` 3테이블 추가)을 수반하므로 위 목록과 분리해 별도 판단한다.

---

## 14. 정직성 선언

| 구분 | 내용 |
|------|------|
| **[코드] 확인** | 본 문서의 모든 발견사항 19건. 프론트 route/메뉴 → API client → controller → service → SQL 전 경로 추적 |
| **[문서] 확인** | serviceKey 이축 구조의 의도성(`store-tablet.routes.ts` 주석), `store` 출처 배제 정책(`WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1` 흔적), F4 supplier Legacy 예외 |
| **[실증] 확인** | **없음.** 프로덕션 DB 조회·브라우저 검증·API 호출 전부 미수행 |
| **[미확인]** | ① 각 테이블의 실제 `service_key` 값 분포 (HUB-P1-02 실위험) ② PUBLIC 의약품 offer 존재 여부 (HUB-P1-06 실위험) ③ PRIVATE offer 의 실제 운용 건수 (HUB-P0-02 실위험) ④ GP/KCos 사용자의 실제 role 조합 — `kpa:*` 겸직자 존재 여부 (HUB-P0-03 실위험) ⑤ 각 화면의 실제 렌더 결과 |

**따라서 §1.1 의 PASS 는 "코드상 게이트가 존재한다"는 의미이며, 프로덕션 무결성을 단정하지 않는다.** 위 4개 미확인 항목은 각 후속 WO 의 1단계 read-only 확인 과제로 이월한다.

---

## 15. 중지 조건 적용 결과

IR §21 에 따라 다음 사유로 **구현으로 확대하지 않았다.**

- 실제 결함 발견 (P0 4건 / P1 6건)
- DB 확인 필요 (§14 미확인 4건)
- 프로덕션 인증 계정 필요 (화면 실증)
- HUB-P0-03 은 Shared Module Change Protocol 대상 — 소비처 전수 식별이 선행돼야 함

---

*작성: 2026-07-26 · 기준 commit `d9cc1b0` · 코드 변경 0 / DB write 0*
