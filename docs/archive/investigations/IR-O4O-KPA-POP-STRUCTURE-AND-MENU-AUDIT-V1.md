# IR-O4O-KPA-POP-STRUCTURE-AND-MENU-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI·migration 변경 없음.**
>
> KPA 의 POP 기능이 현재 어느 수준까지 구현되어 있는지, Blog 패턴 mirror 와 기존 entity 재사용 (store_execution_assets / kpa_store_contents) 중 어느 방향이 적합한지 전수 조사 + Canonical 문서 정합 평가.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [WO-O4O-OPERATOR-BLOG-PUBLISHING-V1](../work-orders/) 시리즈 (Phase 2-1 ~ Phase 2-4 완료 — Blog 패턴 reference)
  - [WO-O4O-STORE-HUB-BLOG-CONTENT-IMPORT-V1](../work-orders/) (Blog import 흐름 완료)
  - [WO-O4O-KPA-STORE-MENU-BLOG-POP-QR-ALIGNMENT-V1](../work-orders/) (commit `bf031921a`, 매장 sidebar 에 "매장 실행" 그룹 + 3 항목 복원)
- **참조 SSOT:**
  - `CLAUDE.md` §5 (Store Production Material Canonical 우선 참조)
  - `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md` (POP / QR / Blog 모두 Production Material 범주 명시)
  - `docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md` (Store Menu Canonical 6 항목)
  - `docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md`
- **검증 환경:** local repo (origin/main `bf031921a` 와 0 commits 차이)
- **수정 행위:** **없음** (조사 전용)

---

## 0. 최종 권고 — 한 줄 요약

> **Option D — Foundation 만 먼저 분리 진행.** POP 는 현재 stateless PDF 생성 service 만 존재하며 영속 entity 0. Blog 패턴을 그대로 mirror 하려면 신규 도메인 구축 규모이므로, 사용자 원칙 ("무리하게 DB 대규모 변경하지 않는다") 에 따라 **신규 entity / migration / CHECK 제약** 만 먼저 분리 (Phase 1 Foundation WO). 그 후 Phase 2-1 (operator write API) / Phase 2-2 (HUB query + resolver) / Phase 2-3 (UI) 별도 분리.

> **단, QR 은 POP 와 다른 트랙으로 분리 권장.** QR 은 이미 `StoreQrCode` entity 보유 + 스캔 추적 metadata 보유 → Blog 패턴 mirror 가 더 자연스러움. POP 는 stateless 특성상 "선택적 저장" 모델 (kpa_store_contents 활용) 가 적합할 수도.

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main `bf031921a` 와 일치 |
| 조사 방법 | 2 회 병렬 Explore agent + Canonical 문서 정합 |
| 조사 범위 | apps/api-server (entity / controller / migration) + services/web-kpa-society (page / route / menu) + packages/{store-ui-core, asset-snapshot-core, types} + canonical docs |

---

## 2. 산출물 1 — POP 현재 구조 (확정 사실)

### 2.1 Frontend

| 페이지 | 라우트 | 비고 |
|---|---|---|
| `StorePopPage.tsx` | `/store/marketing/pop` | 매장 측 PDF 생성 도구 (stateless) |
| `ProductPopBuilderPage.tsx` | `/store/commerce/products/:productId/pop` | 상품별 POP 생성 (AI prefill + PDF) |
| (운영자 측 POP 페이지) | — | **부재** |
| (HUB POP 진열 페이지) | — | **부재** |

### 2.2 Backend

| Controller | Endpoint | 저장 동작 |
|---|---|---|
| `store-pop.controller.ts` | `POST /api/v1/{service}/pharmacy/pop/generate` | **PDF 즉시 생성·전송, DB 저장 0** |
| (운영자 POP write API) | — | **부재** |
| (HUB queryPop / resolvePop) | — | **부재** |

### 2.3 Entity / Table

| 후보 entity | 존재 여부 | POP 관련 |
|---|:---:|---|
| `store_pops` (전용) | ❌ | 부재 |
| `store_execution_assets` | ✅ | `assetType` (file/pop/qr/signage) 컬럼 보유 — **`'pop'` 값은 schema 허용하나 현재 미사용** |
| `kpa_store_contents` | ✅ | Store Production Material SSOT, `source_type` / `content_json` 보유 — POP 도 의미상 포함 가능 |
| `store_blog_posts` | ✅ | Blog 전용 — POP 와 무관 |

### 2.4 HUB / Asset Snapshot 통합

| 항목 | 현 상태 |
|---|---|
| `HubSourceDomain` union (packages/types/src/hub-content.ts) | `'cms' \| 'signage-media' \| 'signage-playlist' \| 'blog'` — **`'pop'` 부재** |
| `VALID_DOMAINS` (hub-content.controller.ts) | 위와 동일 — **`'pop'` 부재** |
| `HubContentQueryService.querySingleDomain` switch | cms / signage-media / signage-playlist / blog — **`'pop'` 부재** |
| `KpaAssetResolver.resolve` switch | cms / signage / lesson / content / resource / blog — **`'pop'` 부재** |
| `asset-snapshot.controller.ts` `allowedAssetTypes` | 동일 6종 — **`'pop'` 부재** |

→ **POP 는 HUB query 파이프라인 전혀 미통합.**

### 2.5 Sidebar 메뉴

| 영역 | POP 메뉴 |
|---|:---:|
| 운영자 (`operatorMenuGroups.ts`) | ❌ 부재 |
| 매장 HUB (`PharmacyHubLayout.tsx` HUB_MENU_ITEMS) | ❌ 부재 |
| 내 매장 (`KPA_SOCIETY_STORE_CONFIG`) | ✅ "매장 실행 > POP" — `bf031921a` 으로 복원 (라우트는 기존 StorePopPage) |

---

## 3. 산출물 2 — Blog 와 POP 의 구조적 차이 비교

| 차원 | Blog (완료) | POP (현 상태) | 차이의 의미 |
|---|:---:|:---:|---|
| 영속 entity | ✅ `store_blog_posts` | ❌ 없음 | POP 는 stateless 만 — Blog 패턴 mirror 시 entity 신설 필요 |
| `authorRole` (operator/store 분리) | ✅ + DB CHECK | ❌ 개념 자체 없음 | POP 도 author_role 신설 필요 |
| HUB query 지원 | ✅ (queryBlog + sourceDomain='blog') | ❌ | querySingleDomain switch + HubSourceDomain union 확장 필요 |
| Asset Resolver | ✅ resolveBlog | ❌ | resolver 신설 필요 |
| `asset-snapshot.controller.allowedAssetTypes` | ✅ 'blog' 포함 | ❌ | 확장 필요 |
| Operator write controller | ✅ (operator-blog.controller) | ❌ | 신설 필요 |
| Store import endpoint | ✅ (POST /stores/:slug/blog/staff/import) | ❌ | 신설 필요 |
| Frontend Operator page | ✅ (OperatorBlogList/Write) | ❌ | 신설 필요 |
| Frontend HUB page | ✅ (HubBlogLibraryPage) | ❌ | 신설 필요 |
| Frontend Store 사본 관리 | ✅ (PharmacyBlogPage, author_role='store' 필터) | △ (StorePopPage 는 PDF 생성 도구 — 사본 관리와 다른 페이지) | StorePopPage 와 분리된 PopListPage 신설 필요 가능성 |

→ **mirror 비용 매우 큼.** Blog 의 전체 4 phase WO 시리즈 (2-1 schema, 2-2 query, 2-3 write API, 2-4 import) 를 POP 에 거의 그대로 반복 필요.

---

## 4. 산출물 3 — QR 과의 비교 (구조적 유사성)

| 항목 | POP | QR |
|---|:---:|:---:|
| 영속 entity | ❌ | ✅ `StoreQrCode` (`store_qr_codes`) |
| Stateless 흐름 | ✅ (PDF 생성 only) | ❌ (slug + landingType + scan metadata 영속) |
| Blog 패턴 적합도 | △ "선택적 저장" 모델이 더 적합할 수도 | ✅ entity 확장으로 직접 mirror 가능 |
| Store Menu Canonical 위치 | "매장 실행 > POP" | "매장 실행 > QR-code" |

→ **POP 와 QR 은 별도 트랙 권장.** QR 은 entity 가 이미 있으므로 Blog 패턴 mirror 비용이 적음 (authorRole 컬럼 추가 + queryQr + resolveQr + assetType='qr'). POP 는 entity 자체 신설부터.

---

## 5. 산출물 4 — Canonical 문서 정합

### 5.1 `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` (CLAUDE.md §5)

> "POP / QR / 블로그 모두 Store Production Material 범주에 포함"
> SSOT 흐름: 입력 (원천) → 편집/AI 정리 → **Store Production Material** (`kpa_store_contents` legacy physical table) → 결과물 (POP / QR / Blog)

→ **`kpa_store_contents` 가 canonical SSOT.** POP / QR 의 "원본 자료" 는 의미적으로 여기 저장이 옳음. 단 Blog 는 별도 entity (`store_blog_posts`) 로 분리됐음 (의도된 선택 — Blog 는 full content 관리 + author_role + status 가 복잡해 전용 entity 가 깔끔).

### 5.2 `O4O-STORE-MENU-CANONICAL-TREE-V1`

| Canonical 항목 | 운영자 → HUB → 매장 흐름 | 현 상태 |
|---|---|---|
| 상품 상세 | (별도 도메인) | — |
| **POP** | 미정렬 | 본 IR 의 대상 |
| **QR-code** | 미정렬 | 별도 트랙 권장 |
| **블로그** | ✅ 정렬 완료 (4 WO 시리즈) | reference |
| 사이니지 | (별도 도메인) | — |
| 고객 안내문 | (별도 도메인) | — |

---

## 6. 산출물 5 — 후보 분석 (A ~ E)

### Option A — `store_execution_assets` 재사용

- `assetType='pop'` 값 신설 (schema 변경 0, application-level 만)
- `usageType='pop'` 도 활용
- 비용: 매우 낮음
- 단점:
  - `author_role` 개념 없음 (Blog 의 operator/store 분리 패턴 적용 어려움)
  - HUB query 인덱스 없음 (Blog 의 `IDX_store_blog_posts_hub_query` 같은 service_key+author_role+status 인덱스 부재)
  - cross-service isolation 보장 약함
  - 결과물 (PDF) 과 "운영자 게시 POP" 가 같은 테이블에 섞임 — semantic confusion

판정: **부분 적합. POP 의 "매장 결과물 보관" 용도로는 가능하나 "운영자 게시 → HUB 진열" 흐름에는 불충분.**

### Option B — `kpa_store_contents` 재사용 (Canonical SSOT 따라가기)

- `source_type='pop_create'` 또는 비슷한 값 신설
- `content_json` 에 POP 본문 + 메타 저장
- 비용: 낮음 (`source_type` 화이트리스트 확장 + application 흐름)
- 장점:
  - `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` 의 SSOT 모델 정합
  - `author_role` / `workspace_status` 가 이미 존재
  - 3 service (KPA / GP / Cosmetics) 공통 — 향후 이식 비용 낮음
- 단점:
  - HUB query 흐름 신설 시 sub_type 또는 별도 분류 필요
  - canonical 문서가 "POP 의 결과물도 여기 보관" 명시했는지 추가 확인 필요

판정: **Canonical 정합 최고. 가장 유력한 후보.**

### Option C — `store_pops` 신규 entity (Blog 패턴 완벽 mirror)

- 신규 entity + migration + controller + page + menu 모두 신설
- Blog 와 100% 동일 패턴 (author_role / status / service_key / IDX hub_query)
- 비용: **매우 큼** (Blog 의 4 phase WO 시리즈 반복)
- 장점:
  - 일관성 최고
  - cross-service isolation 강함
  - HUB query 최적화 인덱스 명확
- 단점:
  - canonical SSOT (`kpa_store_contents`) 와 분리 — 같은 의미의 데이터가 여러 entity 에 흩어짐
  - 작업 규모 큼 (race condition / lockout 위험)

판정: **일관성 최고이나 Canonical 분리. 비용 큼.**

### Option D — Foundation only 먼저 분리 (단계 진행)

- 신규 entity + migration + CHECK 제약 만 먼저 commit
- 그 후 Phase 2-1 (operator write API) → 2-2 (HUB query + resolver) → 2-3 (UI) 별도 WO 분리
- 비용: 작은 commit 여러 개 (Blog 패턴 그대로)
- 장점:
  - 각 단계 검증 가능
  - race condition 위험 분산
  - 사용자 원칙 ("무리하게 DB 대규모 변경하지 않는다") 부합
- 단점:
  - 사이클 길어짐 (4 WO 시리즈)

판정: **사용자 원칙 정합 + 안전. Option C 의 단계 분리 버전.**

### Option E — 구현 보류, 문서/메뉴만 정리

- 매장 sidebar 메뉴는 이미 복원됨 (bf031921a)
- 운영자 / HUB 측 POP 는 추후 결정
- 비용: 0
- 단점: Store Menu Canonical 정합 미회복

판정: **현 상태 유지. canonical 정합 욕구 강하면 Option B 또는 D 로 진입.**

---

## 7. 권장 결정

### 7.1 권고 — **Option D (Foundation 분리) + Option B (Canonical SSOT 활용) 혼합 검토**

**근거:**
1. 사용자 원칙 "무리하게 DB 대규모 변경하지 않는다" → Option C 단일 commit 대규모 변경 회피
2. Canonical SSOT (`kpa_store_contents`) 정합 욕구 → Option B 의 `source_type` 확장 우선 검토 가치
3. POP 의 stateless 특성 → Blog 처럼 "운영자 publish 흐름" 이 정말 필요한지 사용자 정책 결정 선행 필요

### 7.2 진입 전 결정 필요 사항 (사용자)

1. **운영자 POP publish 흐름이 정말 필요한가?**
   - YES → entity 신설 (Option B 또는 D)
   - NO → 매장 측 PDF 생성 (현 stateless) 유지 + sidebar 메뉴 복원 (이미 완료) 만으로 종료
2. **Canonical SSOT 활용 (Option B) vs 전용 entity (Option D)?**
   - `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` 의 정확한 의도 재확인 필요 — POP 의 "운영자 원본 게시물" 도 `kpa_store_contents` 에 저장이 옳은가?
   - Blog 가 별도 entity 인 이유: full content (title/slug/excerpt/content) + author_role + status + publishedAt 의 복잡한 관리. POP 도 같은 복잡도면 별도 entity 가 옳음.
3. **QR 과 분리할 것인가?**
   - 본 IR 권고: 분리. QR 은 entity 보유 + Blog mirror 비용 적음. POP 와 다른 트랙.

---

## 8. 다음 WO 권장 범위 (사용자 결정 분기)

### 분기 A — Canonical SSOT 활용 (Option B)

```
WO-O4O-KPA-POP-OPERATOR-PUBLISHING-VIA-PRODUCTION-MATERIAL-V1
  - kpa_store_contents.source_type 화이트리스트에 'operator_pop' 추가
  - operator-pop.controller (write API + status 관리)
  - HubContentQueryService.queryPop (kpa_store_contents WHERE source_type='operator_pop')
  - KpaAssetResolver.resolvePop
  - asset-snapshot.allowedAssetTypes 에 'pop' 추가
  - frontend: OperatorPopPage + HubPopLibraryPage + 사본 관리
```

### 분기 B — 전용 entity (Option D 단계 분리)

```
WO-O4O-KPA-POP-FOUNDATION-V1                  (Phase 1)
  - store_pops entity + migration + CHECK 제약 (Blog Phase 2-1 mirror)

WO-O4O-OPERATOR-POP-PUBLISHING-V1              (Phase 2)
  - operator-pop.controller (write API)
  - HubContentQueryService.queryPop
  - KpaAssetResolver.resolvePop
  - asset-snapshot allowedAssetTypes 확장
  - sourceDomain/assetType 'pop' 등록

WO-O4O-OPERATOR-POP-WRITE-PAGE-KPA-V1          (Phase 3)
  - OperatorPopListPage + OperatorPopWritePage + route + sidebar

WO-O4O-STORE-HUB-POP-CONTENT-IMPORT-V1         (Phase 4)
  - HubPopLibraryPage + import endpoint + 매장 사본 관리
```

→ **본 IR 의 권고: 사용자가 분기 A vs B 결정** 후 진입.

---

## 9. Current Structure vs O4O Philosophy Conflict Check

| 차원 | 평가 | 충돌 |
|---|:---:|:---:|
| 공통 Core (operator-ux-core / @o4o/ui) | ✅ 인프라 충실 — POP entity 신설 시 Blog 패턴 그대로 활용 가능 | 없음 |
| 서비스별 독립 도메인 | ✅ Option B 채택 시 kpa_store_contents 공통 사용, GP/K-Cos 이식 가능 | 없음 |
| Canonical SSOT (Store Production Material) | △ Option C 채택 시 SSOT 분리 위험 / Option B 가 정합 | **약함 (Option C 시)** |
| 운영자 = 게시·진열 주체 (제작 도구 아님) | ✅ 사용자 WO 명시 — POP 도 RichTextEditor 기반 게시 | 없음 |
| 공급자 = Producer 아님 | ✅ supplier POP 흐름 신설 금지 (본 IR 결정) | 없음 |
| 사용자 mental model — "POP 는 매장 결과물" | △ "운영자가 POP 를 어떻게 게시하는가" 의 정의가 모호 — 사용자 정책 결정 필요 | **약함** |

→ **충돌 없음 + 정책 결정 필요 2 건.**

---

## 10. 본 IR 이 결정하지 않는 것

- 분기 A vs B vs E 의 사용자 최종 결정
- 운영자 POP publish 흐름의 실제 필요성 (사용자 정책)
- `kpa_store_contents` 가 POP 의 운영자 원본 보관에 적합한가의 canonical 재해석
- 후속 WO 의 실제 실행 시점
- QR 트랙 (별도 IR 권고)
- GP / K-Cosmetics 이식 (별건)
- POP 디자인 엔진 / 캔버스 편집기 신설 (사용자 명시 금지)

---

## 11. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 즉시 WO 후보 | **0 건** (정책 결정 선행) |
| 후속 IR / WO 후보 | **2 건 (분기 A or B)** + QR 별도 트랙 |
| 핵심 발견 | POP 는 stateless service — Blog 패턴 mirror 비용이 매우 크고 canonical SSOT 와의 정합도 모호 |
| Canonical 정합 강화 | Store Production Material SSOT (`kpa_store_contents`) 활용 가능성 명문화 |
| 사이클 정리 | "POP 구현 진입 전 정책 결정 선행" 원칙 정립 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. POP 관련 entity / table 전수 검색
grep -rln "store_pops\|store_pop\b\|StorePop" apps/api-server/src 2>/dev/null
grep -rln "store_execution_assets\|StoreExecutionAsset" apps/api-server/src 2>/dev/null
grep -rln "kpa_store_contents\|KpaStoreContent" apps/api-server/src 2>/dev/null

# 2. POP 관련 frontend page / route
find services/web-kpa-society/src -name "*Pop*" -o -name "*pop*" | grep -v node_modules

# 3. HUB query / asset resolver 의 'pop' 검색
grep -n "'pop'" apps/api-server/src/modules/hub-content/* apps/api-server/src/modules/asset-snapshot/*

# 4. HubSourceDomain union
grep -n "HubSourceDomain" packages/types/src/hub-content.ts

# 5. assetSnapshot allowedAssetTypes
grep -n "allowedAssetTypes" apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts

# 6. Canonical 문서 — POP / QR / Blog 의 Production Material 범주 명시 확인
grep -n "POP\|QR\|블로그\|pop\|qr\|blog" docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md
grep -n "POP\|QR\|블로그" docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — POP 영속 entity 부재 확정. Option B vs D 분기 결정 필요.*
*Decision Required: (1) 운영자 POP publish 흐름의 실제 필요성 + (2) Canonical SSOT (`kpa_store_contents`) 활용 vs 전용 entity 신설 + (3) QR 분리 트랙.*
