# IR-O4O-STORE-HUB-CROSSSERVICE-COMMONIZATION-RECHECK-V1

> **Type:** IR (read-only 재조사)
> **Date:** 2026-06-11
> **Scope:** KPA / GlycoPharm / K-Cosmetics 3개 Store 서비스의 Store Hub 영역 공통화 완료 상태 전체 재점검
> **수정 파일:** 없음 (read-only)

---

## 1. 조사 개요

"Store Hub 공통화 완료" 보고 이후 실제 코드/route 기준으로 3서비스 parity·경계·dead surface 를 재검증한다.
**read-only** — 코드/UI/API/DB/route/menu 무수정.

**핵심 결론(요약):**
- **Store Hub 골격(route/menu/경계)·backend asset contract 는 이미 공통·service-neutral 하게 완료.** Neture 비대상 정상.
- **최대 편차는 frontend 제작 자료(StoreProductionMaterials) parity** — KPA(Phase 1, 1039줄, 4소스 병합+cross-create) vs GP/KCos(Phase 2-D, 311–313줄, executionAssets 단일). **backend 는 동등 지원** → frontend-only uplift WO 로 닫을 수 있음.
- **2개 실(實)결함**: ① GP `SignagePreviewPage` live-routed **mock surface**(E), ② derivation **read 엔드포인트 serviceKey 필터 누락**(F, 경계 드리프트).

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|-----|
| branch | `main` |
| HEAD (조사 기준 commit) | `6025809d01f2c500121a4f6f2877082c4993bf3a` |
| origin/main ahead/behind | `0 / 0` |

**다른 세션 WIP (본 IR 미접촉):** `M docs/.../CHECK-...-ORDER-VIEW-LOOP`, `?? docs/.../IR-...-AUX-SECTION`, `?? *.png`. 본 IR 은 신규 문서 1개만 생성(커밋은 별도).

---

## 3. Store Hub 대상/비대상 서비스 정의

| 서비스 | 대상 | 비고 |
|--------|:---:|------|
| KPA-Society | ✅ Store Hub (reference impl) | `/store-hub` + `pages/pharmacy/StoreHubPage.tsx` |
| GlycoPharm | ✅ Store Hub | `/store-hub` + `pages/hub/StoreHubPage.tsx` |
| K-Cosmetics | ✅ Store Hub | `/store-hub` + `pages/hub/KCosmeticsHubPage.tsx` |
| **Neture** | ❌ **비대상** | supplier/partner/operator 중심. Store Hub route·menu·backend mount **없음**(정상) |

---

## 4. route/menu 매트릭스

Store Hub 메뉴는 **공통 config** `packages/store-ui-core/src/config/storeMenuConfig.ts` 로 통일 관리(서비스별 config 객체).

| Store Hub 항목 | route | KPA | GP | KCos |
|----------------|-------|:---:|:--:|:----:|
| Hub home | `/store-hub` (index) | ✅ | ✅ | ✅ |
| B2B 카탈로그 | `/store-hub/b2b` | ✅ | ✅ | ✅ |
| 콘텐츠 | `/store-hub/content` | ✅ | ✅ | ✅ |
| 사이니지 | `/store-hub/signage` | ✅ | ✅ | ✅ |
| 블로그 | `/store-hub/blog` | ✅ | ✅ | ✅ |
| POP | `/store-hub/pop` | ✅ | ✅ | ✅ |
| QR | `/store-hub/qr` | ✅ | ✅ | ✅ |
| 이벤트 오퍼 | `/store-hub/event-offers` | ✅ | ✅ | ✅ |
| 장바구니 | `/store-hub/cart` | ✅ | ✅ | ✅ |

근거: KPA `App.tsx:686+`, GP `App.tsx:631+`, KCos `App.tsx:542+`; 메뉴 config `storeMenuConfig.ts:97–287`.

**route/menu 불일치:**
- KCos "매출 요약" 메뉴 label `/store/billing` → 실제 `/commerce/billing` 라우팅(의도적 alias, dead 아님). **표기 정합성만 점검 필요(경미).**
- KCos "자체 상품"(`/commerce/local-products`)은 route 有·menu 의도적 제외(dead link 방지).
- 그 외 dead menu(route 없는 메뉴)·고아 route 미발견.

→ Store Hub route/menu 골격 **A(공통 완료)**. guard: KPA `HubGuard`, GP `GlycoHubGuard`, KCos `RoleGuard(allowedRoles)` — 형태 다르나 경계 동등.

---

## 5. KPA Store Hub 조사 결과 (reference)

- Hub home(`StoreHubPage`) + 9개 Hub 항목 + 제작 자료 viewer 풍부.
- `StoreProductionMaterialsPage.tsx` **1039줄** — 4소스 병합(direct content + execution assets + QR + blog), cross-create(POP/QR/블로그/사이니지), derivation viewer(POP/QR/blog 전체), `생성 출처` 컬럼.
- POP/QR/Blog/Signage 실행 화면 모두 완성(Signage 2359줄). Signage = asset snapshot 기반(제품 파생 아님, 정상).

→ KPA = Store Hub 기준선(Phase 1 완성).

---

## 6. GlycoPharm Store Hub 조사 결과

- Hub home(`pages/hub/StoreHubPage.tsx`) + Hub 9항목 ✅.
- `StoreProductionMaterialsPage.tsx` **313줄** — **executionAssets 단일 소스(Phase 2-D)**. direct content 병합·QR/blog 목록·cross-create **없음**. derivation viewer 는 **POP 한정**.
- POP/QR/Blog/Signage 실행 화면 존재(공통 컴포넌트 사용).
- **결함(E): `pages/store-management/signage/SignagePreviewPage.tsx`** — `mockPlaylist`/`mockChannels` 하드코딩(YouTube/Neture mock). **live-routed**(`App.tsx:791` `signage/preview`, `App.tsx:947` `marketing/signage/preview`). GP 전용(KPA/KCos 미존재).
- 도메인 추가: "약국 경영/정산" 그룹(My Store 영역, 도메인 차이로 유지 — I).

---

## 7. K-Cosmetics Store Hub 조사 결과

- Hub home(`pages/hub/KCosmeticsHubPage.tsx`, `StoreHubTemplate` 기반) + Hub 9항목 ✅.
- `StoreProductionMaterialsPage.tsx` **311줄** — GP 와 동일 **executionAssets 단일(Phase 2-D)**, cross-create·QR/blog·direct 병합 없음, derivation viewer POP 한정.
- POP/QR/Blog/Signage 실행 화면 존재(공통 컴포넌트). mock surface 미발견.

→ KCos ≈ GP 수준(제작 자료 thin, 나머지 parity).

---

## 8. Neture 비대상 확인

| 확인 | 결과 |
|------|------|
| Store Hub route(`/store-hub`) | ❌ 없음(정상) |
| Store Hub 공통 menu/컴포넌트 혼입 | ❌ 없음 |
| backend store-execution-assets mount | ❌ 미마운트(`neture.routes.ts:26-72`, 의도적) |
| Blog controller | 제거됨(`WO-O4O-NETURE-BLOG-RETIRE-V1`) |

→ **H: Neture 비대상 정상 — Store Hub 공통화에 섞이지 않음.**

---

## 9. 주요 기능별 parity 매트릭스

| 기능 | KPA | GP | KCos | 분류 |
|------|:---:|:--:|:----:|:---:|
| Store Hub home | ✅ | ✅ | ✅ | **A** |
| Hub 9항목 route/menu | ✅ | ✅ | ✅ | **A** |
| POP/QR/Blog/Signage 실행 화면 | ✅ | ✅(편차) | ✅(편차) | **B** |
| 제작 자료 multi-source 병합 | ✅ | ❌ | ❌ | **C** |
| 제작 자료 cross-create | ✅ | ❌ | ❌ | **C** |
| 제작 자료 QR/blog 목록 | ✅ | ❌ | ❌ | **C** |
| derivation viewer 커버리지 | POP/QR/blog | POP만 | POP만 | **C** |
| derivation viewer 컴포넌트 | 공통 | 공통 | 공통 | **A** |
| Store Hub↔My Store 경계 | ✅ | ✅ | ✅ | **A** |
| backend asset contract | service-neutral | 동등 | 동등 | **A** |

---

## 10. 제작 자료 / derivation viewer parity

| 항목 | KPA(1039L) | GP(313L) | KCos(311L) |
|------|:---:|:---:|:---:|
| 데이터 소스 | direct+execution+QR+blog (4) | executionAssets (1) | executionAssets (1) |
| cross-create CTA | ✅ POP/QR/블로그/사이니지 | ❌ | ❌ |
| derivation viewer(`StoreAssetDerivationViewer` 공통) | POP/QR/blog | POP만 | POP만 |
| sourceTitle/kind | 명시 컬럼 | 배지 | 배지 |
| empty/loading/error | ✅ | ✅ | ✅ |

- 공통 컴포넌트 `@o4o/store-ui-core` `StoreAssetDerivationViewer`(read-only, endpoint 주입형)·`GuideBackLink` 는 **3서비스 공유**.
- GP/KCos 의 thin 상태는 **frontend Phase 2-D 미완**(파일 주석에 "Phase 2-D 범위" 명시). **backend 는 이미 지원**(§14) → frontend-only uplift 가능.

---

## 11. POP / QR / Blog / Signage parity

| 자산 | KPA | GP | KCos | 분류 |
|------|:---:|:--:|:----:|:---:|
| POP | ✅ | ✅ | ✅ | B(UI 편차) |
| QR | ✅ | ✅ | ✅ | B |
| Blog | ✅ | ✅ | ✅ | B |
| Signage | ✅ | ✅ | ✅ | B |

- 공통 컴포넌트: `@o4o/store-ui-core`(GuideBackLink, production state parse), `@o4o/content-editor`(RichTextEditor, AiContentModal), `@o4o/ui`(DataTable/ActionBar/BulkResultModal).
- serviceKey/organizationId 처리: 서비스별 context 추상화는 다르나 자산 CRUD 흐름 동일.
- **Signage 제품 파생 오처리 없음** — asset snapshot 기반, Playlist 단일 재생 단위(정상).
- **mock/dead**: GP `SignagePreviewPage`(§16). 그 외 no-op 미발견.

---

## 12. Store Hub vs My Store 경계 확인

| 확인 | 결과 |
|------|------|
| route 분리 | ✅ `/store-hub`(Hub, 별도 guard/layout) vs `/store/*`(My Store) |
| menu 분리 | ✅ `storeMenuConfig` 에 Hub 항목 없음(Hub 는 진입 후 라이브러리) |
| 경계 섞임 | ❌ 없음 — 전이는 Hub→`assetSnapshotApi.copy()`→My Store 단방향만 |
| Event Offer | ✅ Hub 전용(`/store-hub/event-offers`), 상품 탭과 독립 |

→ **A: Store Hub ↔ My Store 경계 완전 분리.** (CLAUDE.md Store Menu Canonical Tree 정합)

---

## 13. 공통 컴포넌트/wrapper 사용 현황

| 컴포넌트 | KPA | GP | KCos | 위치 |
|----------|:---:|:--:|:----:|------|
| `storeMenuConfig`(메뉴) | ✅ | ✅ | ✅ | `packages/store-ui-core` |
| `StoreAssetDerivationViewer` | ✅ | ✅ | ✅ | `packages/store-ui-core` |
| `GuideBackLink` | ✅ | ✅ | ✅ | `packages/store-ui-core` |
| `StoreHubTemplate` | ✅ | ✅ | ✅ | 공통 |
| 제작 자료 페이지 로직 | KPA 풍부 | thin | thin | 서비스별 로컬(복붙 아님, 단계 차이) |

→ 공통 컴포넌트 인프라는 정렬됨. 제작 자료 페이지 **본문 로직만 KPA↔GP/KCos 비대칭**(공통화 여지 = C uplift).

---

## 14. backend / API contract 확인

| 항목 | 결과 |
|------|------|
| `store_execution_assets` controller | **service-neutral 단일** `createStoreExecutionAssetsController`(serviceKey 컬럼 없음, organizationId 격리) |
| 3서비스 mount | ✅ `/kpa/store/assets`(`kpa.routes.ts:395`) · `/glycopharm/store/assets`(`glycopharm.routes.ts:388`) · `/cosmetics/store/assets`(`cosmetics.routes.ts:139`) |
| `store_asset_derivations` write-path | ✅ 3서비스 가능 — POP/QR(`serviceKey ?? 'kpa'`), blog(serviceKey 직접). UNIQUE(service_key, org, source, derived) |
| migration | 이미 신설(`20261103000000-CreateStoreAssetDerivations.ts`, 2026-06-05) → **DB 변경 불필요** |
| Neture mount | ❌ 미마운트(정상) |

**결함(F) — derivation READ serviceKey 필터 누락:**
`apps/api-server/src/routes/o4o-store/controllers/store-execution-assets.controller.ts:117-118`
```ts
const qb = repo.createQueryBuilder('d')
  .where('d.organizationId = :organizationId', { organizationId });  // serviceKey 필터 없음
```
- entity 에 `service_key` 컬럼 존재 + write 는 service_key 로 격리하나 **read 는 organizationId 단독** → 동일 org 가 복수 서비스에 속하면 cross-service derivation 노출 가능(경계 드리프트). 현재 실 노출 위험은 org 공유 실태에 의존(대부분 단일 서비스 소속이면 낮음)하나 **entity 의도와 불일치 → 보강 권고.**

→ **핵심: "KPA 만 풍부한 게 아니라 backend 는 동등, frontend 만 KPA 진행됨."**

---

## 15. UI-UX 공통성 확인

- page header/back link/empty·loading·error/drawer·modal 패턴: 공통 컴포넌트 기반 대체로 정렬.
- 편차: GP/KCos 제작 자료 본문 thin(§10), GP Signage preview mock(§16). Signage 서브페이지 loading 표준화는 서비스별 독립 구현(경미).

---

## 16. mock / TODO / no-op / dead surface 목록

| # | 위치 | 유형 | 도달성 | 분류 |
|---|------|------|--------|:---:|
| 1 | `web-glycopharm/.../signage/SignagePreviewPage.tsx:31-50` | `mockPlaylist`/`mockChannels` 하드코딩 | **live-routed**(`App.tsx:791`, `:947`) | **E** |

> GP 전용. KPA/KCos 동일 mock 없음. 운영자/매장이 도달 시 가짜 플레이리스트 노출(정직성 위반 소지).

그 외 no-op action·"준비중 위장" 화면 미발견(POP/QR/Blog/Signage 실행 화면은 실 API 연결).

---

## 17. route / menu / dead link 목록

- dead menu(route 없는 메뉴): 미발견.
- 고아 route(menu 없는 의도적 제외): KCos `/commerce/local-products`(dead link 방지, 정상).
- label↔route alias: KCos "매출 요약" label `/store/billing`→`/commerce/billing`(표기 정합만 경미 점검).

---

## 18. 분류표

| 분류 | 항목 |
|:---:|------|
| **A** 공통 완료 | Store Hub route/menu 골격, Hub home, 경계 분리, derivation viewer 컴포넌트, backend asset contract |
| **B** UI 편차 | POP/QR/Blog/Signage 실행 화면 |
| **C** KPA 풍부·GP/KCos 누락 | 제작 자료 multi-source 병합·cross-create·QR/blog 목록·derivation viewer 커버리지 |
| **D** route/menu 불일치 | (경미) KCos billing label alias |
| **E** mock/dead | GP `SignagePreviewPage` mock |
| **F** backend/API | derivation READ serviceKey 필터 누락 |
| **G** My Store 영역 | GP "약국 경영/정산" 그룹(별도 축) |
| **H** Neture 비대상 | 확인 — 미혼입 정상 |
| **I** 도메인 유지 | 서비스별 guard 형태, 약국 경영 그룹 |

---

## 19. 즉시 WO 가능한 후보 (frontend-only)

1. **GP `SignagePreviewPage` mock 제거/실연결**(E) — live-routed mock 노출 차단. 실 API 연결 또는 "준비중" 정직 처리. 저위험.
2. **GP/KCos 제작 자료 parity uplift(C)** — KPA 패턴(multi-source 병합 + cross-create + QR/blog 목록 + derivation viewer 확장)을 GP/KCos `StoreProductionMaterialsPage` 에 이식. **backend 이미 지원**(§14) → frontend-only. 중간 규모(서비스당 페이지 본문 확장).

## 20. backend/API 선행 후보

3. **derivation READ serviceKey 필터 보강(F)** — `store-execution-assets.controller.ts:117` 에 `andWhere('d.serviceKey = :serviceKey')` 추가(boundary hardening). 소규모 backend WO. DB 변경 불필요.

## 21. 별도 My Store 채팅방으로 넘길 후보

- GP "약국 경영/정산" 그룹(G), My Store 실행/정산 영역 정비 — 본 Store Hub 공통화 축과 분리.
- POP/QR/Blog/Signage **실행 화면 UI 편차 미세 정렬**(B) — My Store 실행 축에서 다룸.

## 22. 우선순위 제안

| 순위 | 작업 | 분류 | 위험 | 비고 |
|:---:|------|:---:|:---:|------|
| **P1** | GP SignagePreviewPage mock 제거/정직 처리 | E | 낮음 | frontend, 정직성 |
| **P1** | derivation READ serviceKey 필터 보강 | F | 낮음 | backend, 경계 |
| **P2** | GP/KCos 제작 자료 parity uplift(KPA 패턴 이식) | C | 중 | frontend, backend 준비됨 |
| 분리 | My Store 실행/정산(GP 경영 그룹) | G | — | 별도 축 |

권장 첫 작업: **P1 2건(GP mock 제거 + derivation read 필터)** — 작고 위험 낮음. 이후 **P2(제작 자료 parity uplift)** 로 "Store Hub 공통화 완료" 판정을 실질 충족.

---

## 23. Current Structure vs O4O Philosophy Conflict Check

| 확인 | 결과 |
|------|------|
| Store Hub 가 오프라인 매장용 온라인 도구 허브로 작동 | ✅ Hub(자료 진열)→copy→My Store(실행) 흐름 |
| 서비스 차이가 도메인 차이인지 구현 편차인지 | ✅ 구분됨 — 골격/backend 공통(A), 제작 자료 thin 은 **구현 편차(C, frontend 미완)**, 약국 경영은 도메인 차이(I) |
| 3서비스 동등 기본 경험 제공 | ⚠️ **부분** — Hub 골격·실행 화면은 동등, **제작 자료는 KPA 만 풍부**(P2 uplift 필요) |
| Neture 를 Store Hub 대상으로 오포함 | ✅ 아님(H) |
| Store Hub ↔ My Store 분리 | ✅ 완전 분리(A) |
| 제작 자료/POP/QR/Blog/Signage 가 매장 실행 자산 흐름과 일치 | ✅ Signage 제품 파생 오처리 없음, asset snapshot 정합 |
| Event Offer/펀딩/상품 과도 혼입 | ✅ Event Offer Hub 전용, 상품 탭과 독립 |
| 공통화가 1인 개발 유지보수성 향상 | ✅ 공통 config/컴포넌트 정렬. ⚠ 제작 자료 본문 비대칭은 uplift 시 추가 향상 |

**철학 정합 판정:** 구조적 충돌 없음. "완료" 판단은 **골격·경계·backend 기준으로는 유효**하나, **frontend 제작 자료 parity(C) + 2개 결함(E/F)** 이 남아 "3서비스 동등 경험" 기준에선 **부분 완료**. P1 2건 + P2 1건으로 닫으면 실질 완료.

---

## 부록: 핵심 근거 파일

- 메뉴 공통 config: `packages/store-ui-core/src/config/storeMenuConfig.ts:97-287`
- 제작 자료: KPA `web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx`(1039L) / GP `web-glycopharm/src/pages/store-management/StoreProductionMaterialsPage.tsx`(313L) / KCos `web-k-cosmetics/src/pages/store/StoreProductionMaterialsPage.tsx`(311L)
- 공통 viewer: `packages/store-ui-core/src/components/StoreAssetDerivationViewer.tsx`
- backend mount: `kpa.routes.ts:395` / `glycopharm.routes.ts:388` / `cosmetics.routes.ts:139`; Neture 미마운트 `neture.routes.ts:26-72`
- derivation read 결함: `apps/api-server/src/routes/o4o-store/controllers/store-execution-assets.controller.ts:117-118`
- GP mock: `web-glycopharm/src/pages/store-management/signage/SignagePreviewPage.tsx:31-50` (route `App.tsx:791,947`)
- canonical: `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md`

---

*Generated: 2026-06-11 · read-only IR · 코드 무변경 · 조사 기준 commit `6025809d0`*
