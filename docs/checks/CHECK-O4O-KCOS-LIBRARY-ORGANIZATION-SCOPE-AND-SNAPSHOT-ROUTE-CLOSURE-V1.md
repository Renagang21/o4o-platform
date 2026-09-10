# CHECK-O4O-KCOS-LIBRARY-ORGANIZATION-SCOPE-AND-SNAPSHOT-ROUTE-CLOSURE-V1

- **WO**: WO-O4O-KCOS-LIBRARY-ORGANIZATION-SCOPE-AND-SNAPSHOT-ROUTE-CLOSURE-V1
- **작업일**: 2026-09-10
- **선행**: `CHECK-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1` §14 — KCos 자료함 handoff 404 (판정을 `BLOCKED_BY_PREEXISTING_SCOPE_DEFECT` 로 정정, `1ba8a70f3`)
- **커밋**: `cefec2e2d` (수정) · 배포 `Deploy API Server` success
- **schema / migration**: **0**

---

## 1. 결함 — 무엇이 어긋나 있었나

`apps/api-server/src/routes/cosmetics/cosmetics.routes.ts` 가 `/assets` 에
**KPA 전용** `createAssetSnapshotController` 를 그대로 마운트하고 있었다.

| 항목 | KPA 컨트롤러가 하던 일 | KCos 요청에서의 결과 |
|---|---|---|
| `allowedRoles` | `kpa:admin/operator/pharmacist/store_owner` | KCos 전용 매장은 **403** |
| `resolveOrgId` | `isStoreOwner(…, 'kpa')` → 없으면 `kpa_members` fallback | 두 서비스 가입자는 **KPA 조직**으로 해석 |
| `resolver` | CMS `serviceKey IN ('kpa','kpa-society')` · signage `'kpa-society'` | KCos HUB 자산(`k-cosmetics`)은 **ID 를 알아도 통과 불가** |

그래서 KCos 자료함 목록(`GET /cosmetics/assets?type=content`)이 **사용자의 KPA 조직 스냅샷**을 돌려줬고,
그 id 로 POP V2 `sources/content/snapshot/:id` 를 부르면 V2 resolver 는 계약대로 **KCos organizationId** 로 조회해
찾지 못했다(404). **404 는 V2 쪽이 옳았다는 증거다** — cross-org 유출을 막은 쪽이 resolver 였다.

### 1-1. 프로덕션 실측이 말해준 것

```text
cms_contents (published) serviceKey : kpa-society 53 · neture 3 · kpa 1     → cosmetics/k-cosmetics 0
signage_media serviceKey            : kpa-society 7                          → k-cosmetics 0
o4o_asset_snapshots source_service  : kpa 18 · store-library 1              → cosmetics 0
KCos 테스트 뷰티샵(83ff96c7) 스냅샷 : 0행
```

**KCos 소유 CMS·signage·snapshot 행이 프로덕션에 하나도 없다.**
지금까지 KCos 자료함에 보이던 것은 전부 KPA 조직 유출분이었다.
따라서 수정 후 KCos 자료함이 **비어 보이는 것이 정답**이지, 회귀가 아니다.

---

## 2. 수정 — KPA 파일은 한 글자도 바꾸지 않았다

| 파일 | 변경 |
|---|---|
| `modules/asset-snapshot/resolvers/cosmetics-asset.resolver.ts` | **신규.** KPA 게이트 정책을 그대로 옮기고 키만 KCos 로. CMS `IN ('cosmetics','k-cosmetics')` · signage `'k-cosmetics'` + scope=global + source IN (hq·supplier·community). **content(`kpa_contents`) 분기 없음** — KPA 전용 원장을 KCos 사본으로 흘리지 않는다 |
| `routes/o4o-store/controllers/cosmetics-asset-snapshot.controller.ts` | **신규.** `cosmetics:*` role · `isStoreOwner(…, 'cosmetics')` 만. **KPA fallback 없음.** store_owner 가 아니면 `NO_ORGANIZATION` |
| `routes/cosmetics/cosmetics.routes.ts` | `/assets` 마운트 **1줄 교체** |
| `__tests__/cosmetics-asset-snapshot-scope.spec.ts` | 신규 14건 |

### 2-1. 계약 (WO 필수 계약 대응)

```text
KCos request → cosmetics:store_owner → isStoreOwner(…,'cosmetics') → KCos organizationId → list/copy/patch/delete
```

- **KPA organization fallback 금지** — `kpa_members` 를 보지 않는다 (spec §2 가 `getRepository`/`query` 미호출을 단언).
- **body/query organizationId 불신** — `asset-copy-core` 팩토리가 애초에 받지 않는다. KCos 클라이언트(`api/assetSnapshot.ts`)도 보내지 않는다(응답 DTO 에만 존재).
- "없는 fallback 을 KPA 테이블로 대신 채우는 것"이 바로 이번 결함이었으므로, KCos 에 대응 원장이 없는 admin/operator 는 조직 없음으로 둔다.

---

## 3. 검증

### 3-1. 로컬

| 항목 | 결과 |
|---|---|
| `cosmetics-asset-snapshot-scope.spec.ts` | **14 / 14 PASS** — 라우트 마운트 교체 · KPA 심볼 0 · org 해석에 `'kpa'` 호출 0 · `kpa_members` 경로 0 · resolver 키 집합 · `sourceService='cosmetics'` · KPA 컨트롤러/`kpa.routes.ts` 무변경 |
| `apps/api-server` `tsc --noEmit` | **PASS** (로컬 `@o4o/ai-core` dist 가 stale 해 `glycopharm` 오류가 났으나 rebuild 후 0 — 본 변경과 무관, CI 는 green) |
| `lint-ratchet` | **PASS** — 45 errors ≤ baseline 51 (스크립트가 baseline 45 로 낮추라고 제안 — 공용 스크립트 수정이라 이번 범위 밖, 보고만) |

### 3-2. 프로덕션 E2E (배포 `cefec2e2d` 후 · 동일 계정 `renagang21` · 동일 세션)

핵심 설계: **같은 사용자·같은 쿠키**로 두 서비스 경로를 부른다. 다르게 나오면 그것이 per-service 조직 해석의 증거다.

| # | 호출 | 결과 |
|---|---|---|
| 1 | `GET /kpa/assets?type=content` (회귀) | **200 · 7행 · org = 테스트 약국(9c87f46b) 단일** — 변경 전과 동일 |
| 2 | `GET /cosmetics/assets?type=content` (수정 대상) | **200 · 0행** — KCos 뷰티샵(83ff96c7)의 실제 보유량 |
| — | **CROSS-ORG EXPOSURE** (KCos 목록 안의 KPA 행) | **0** |
| 3 | KPA 스냅샷 id 를 `/cosmetics/…/sources/content/snapshot/:id` 로 직접 조회 | **404 `POP_CONTENT_SOURCE_NOT_FOUND`** — 타 조직 차단 |
| 4 | 같은 id 를 `/kpa/…` 로 (양성 대조) | **200** |
| 5 | `GET /cosmetics/pharmacy/pop-v2/sources/contents` | **200** · `library 5 · snapshot 0` (KPA 는 `library 13 · direct 15 · snapshot 7`) |
| 6 | PH 회귀 `/pharmacy-hub/store-owner/library` · `/qr` | **200 / 200** — PH 는 `/assets` 를 마운트하지 않아 영향 경로 없음 |
| 7 | **KCos 자료함(제작 자료) → POP V2 handoff** `sources/content/library/:id` | **200** · `resolvedFrom: store-content` · `fields.title` seed 됨 · source 가 KCos library id 에 바인딩 |
| 8 | 같은 library id 를 `/kpa/…` 로 (역방향 타 조직) | **404** |

4xx·5xx 중 의도된 것(3·8 = 타 조직 차단)을 제외한 **오류 0**.

### 3-3. 검증하지 못한 것 — 사실대로

| 항목 | 상태 | 이유 |
|---|---|---|
| KCos 자료함 **콘텐츠 탭(snapshot origin) → V2 handoff 200** | **NOT_EXERCISABLE** | KCos 소유 content 스냅샷이 프로덕션에 0행이고, **만들 수 있는 canonical 경로도 없다** — KCos HUB 복사는 `cms`/`signage` 만 만들 수 있는데 그 원천(`k-cosmetics` CMS·signage)도 0행이다. 계약은 spec 과 #3·#5 로 고정했다 |
| 브라우저 console/page error 0 · 저장/re-edit/output | **NOT_RERUN** | 이번 변경은 목록 응답의 **조직 범위**만 바꾼다. 저장/재편집/출력 경로는 코드 미변경이며 선행 CHECK §14 의 KCos PASS 가 그대로 유효하다. KCos 웹 로그인용 L2 자격은 `TEST-ACCOUNTS §2` 대로 unknown 이라 브라우저 재실행을 강행하지 않았다 |
| KCos **자신의** 자료 정상 노출 | 부분 | 제작 자료(library 5행)로 확인. 스냅샷은 0행이라 "정상 노출"의 양성 사례가 존재하지 않는다 |

---

## 4. 조사에서 같이 드러난 것 (범위 밖 — 보고만)

### 4-1. 같은 결함 클래스가 `/store-assets` 에도 있다

`cosmetics.routes.ts` 는 `/store-assets` 에도 `createStoreAssetControlController` 를 마운트하는데,
이 컨트롤러도 `isStoreOwner(…, 'kpa')` + `KpaMember` fallback 으로 조직을 해석하고
**KPA 전용 테이블 `kpa_store_asset_controls`** 를 JOIN 한다.
KCos 에 대응 테이블이 없어 단순 키 교체로 끝나지 않는다 — 별도 판단이 필요해 이번에 손대지 않았다.

### 4-2. KCos 자료함 '콘텐츠' 탭은 구조적으로 비어 있다

`StoreLibraryContentsPage`(KCos) 는 `type=content` 를 나열하는데, `content` 는 **`kpa_contents` Full Copy** 의 asset type 이다.
KCos HUB 복사(`HubContentPage`)는 `type=cms` 를 만든다. 즉 KCos 에서는 **HUB 에서 가져온 사본이 자료함 콘텐츠 탭에 나타날 수 없다.**
지금까지 이 불일치가 보이지 않았던 이유는 KPA 조직의 `content` 사본이 유출돼 탭을 채우고 있었기 때문이다.
이번 수정으로 탭이 정직하게 비면서 처음 드러났다. 후속 정리 대상(③ `StoreContentsSelector` 이관과 인접).

### 4-3. lint baseline

`lint-ratchet` 이 45 → baseline 을 45 로 낮추라고 제안한다. 다른 세션의 오류 감소분이며 공용 스크립트라 이번 회차에서 건드리지 않았다.

---

## 5. 완료 조건

```text
KCOS LIBRARY TENANT SCOPE        = PASS   (동일 세션 KPA 7 / KCos 0 · CROSS-ORG 0)
KCOS SNAPSHOT ROUTE              = PASS   (/assets → createCosmeticsAssetSnapshotController)
CROSS-ORG EXPOSURE               = 0
KCOS LIBRARY → POP V2 HANDOFF    = PASS (library origin 200) / snapshot origin = NOT_EXERCISABLE (KCos 원천 0행)
KPA / PH REGRESSION              = PASS   (KPA 7행 동일 · PH 200)
SCHEMA CHANGE                    = 0
PRODUCTION E2E                   = PASS (API) · 브라우저 재실행은 NOT_RERUN (§3-3)
```

체인 복귀: ③ `StoreContentsSelector` 인라인 생성 V2 이관 → ④ legacy 즉시 PDF 제거.
`.webp` 출력 문제는 이 체인에 섞지 않는다.

---

## 6. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
