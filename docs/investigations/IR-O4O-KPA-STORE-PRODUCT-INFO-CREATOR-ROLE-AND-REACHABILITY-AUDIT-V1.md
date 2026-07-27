# IR-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-ROLE-AND-REACHABILITY-AUDIT-V1

> **성격:** read-only 조사. 코드/DB/배포 변경 0. 진입점·메뉴·라우트·API 무변경.
> **작성일:** 2026-07-27
> **대상:** `StoreProductInfoCreatorPage` (`/store/execution/product-info`, KPA)
> **선행:** IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1 (G1 — UNREACHABLE 실기능 "진입점 부여 or 폐기, 용도 확정 후") · O4O-STORE-MENU-CANONICAL-TREE-V1 §2.1 항목 #1 "상품 상세정보"
> **최종 판정:** **D — 별도 역할이 canonical 로 예약되어 있으나 저장·노출 계약이 불명확 → 후속 설계 필요** (부차적으로 C 축소 가능성 존재)

---

## 1. route · component · importer

| 항목 | 값 | 근거 |
|------|------|------|
| Component | `StoreProductInfoCreatorPage` | `services/web-kpa-society/src/pages/pharmacy/StoreProductInfoCreatorPage.tsx` (482줄, 완전 동작 CRUD) |
| lazy import | `App.tsx:258` | `lazy(() => import('./pages/pharmacy/StoreProductInfoCreatorPage'))` |
| Route 등록 | `App.tsx:1007` | `<Route path="execution/product-info" element={<StoreProductInfoCreatorPage />} />` (App.tsx:1006 주석 "placeholder"=stale) |
| WO 출처 | `WO-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-MENU-V1` | 컴포넌트 헤더 주석 |

importer 존재(App.tsx) → **0-importer 데드코드 아님.** route 마운트됨.

---

## 2. 현재 도달 가능성 → **UNREACHABLE**

전수 조사 결과 인바운드 진입점 **0**.

| 진입 채널 | 결과 |
|-----------|:---:|
| App.tsx route 등록 | ✅ 있음 (App.tsx:1007, 직접 URL 전용) |
| 사이드바 메뉴 (`packages/store-ui-core/src/config/storeMenuConfig.ts` KPA 블록 :259-355) | ❌ 없음 |
| 대시보드 카드 (StoreHomePage) | ❌ 없음 |
| ActionBar 버튼 | ❌ 없음 |
| `navigate('/store/execution/product-info')` | ❌ 없음 |
| `<Link>` / redirect | ❌ 없음 |
| 검색 가능한 진입점 | ❌ 없음 |

`product-info` / `StoreProductInfoCreator` / `상품 정보 제작` 문자열의 코드 내 전 출현:
- `App.tsx:258, 1006-1007` (import + route + stale "placeholder" 주석)
- `StoreProductInfoCreatorPage.tsx` (자기 자신)
- `ProductionTypeSelectorModal.tsx:24` — **명시적 제외** 주석 ("상품 정보 제작(product-info-creator)도 본 모달 범위 외")
- `AboutPage.tsx:187` — 무관한 마케팅 카피 ("상품 정보 제작·배포")

**판정: UNREACHABLE** (route 존재, 인바운드 링크 0, 직접 URL 만 도달). 선행 full-structure audit(IR-...-FULL-STRUCTURE-AUDIT-V1:133,210,264)의 UNREACHABLE 분류와 일치.

---

## 3. 실제 입력 · 저장 · 결과물

| 항목 | 값 | 근거 |
|------|------|------|
| 입력 | 제목(text, max 200) + 내용(plain textarea) | `StoreProductInfoCreatorPage.tsx:95-114` |
| 상품 식별 기준 | **없음** — product master / listing 연결 0. 자유 제목 텍스트만 | 페이로드에 productId/masterId 부재 (`:63-69`) |
| 사용 API | `POST /api/v1/kpa/store/assets` (`createStoreExecutionAsset`) | `api/storeExecutionAssets.ts:119` |
| 저장 페이로드 | `{ assetType:'content', category:'product-info', htmlContent, sourceType:'manual' }` | `:63-69` |
| 저장 테이블 | `store_execution_assets` (엔티티 `StoreExecutionAsset`) | 백엔드 `store-execution-assets.controller.ts:28`; `20260421010000-RenameStoreLibraryToExecutionAssets.ts` |
| 목록/삭제 | `getStoreExecutionAssets({category:'product-info'})` / `deleteStoreExecutionAsset`(soft) | `:142`, `:163` |
| 생성 결과물 | 자유 서식 HTML 텍스트 노트 (제목+본문) | — |
| AI 사용 | **없음** | 모달에 AI 호출 0 |
| 다국어 | **없음** | 단일 텍스트 |
| QR 연결 | **없음** (모달 안내문은 "POP·QR 제작에 활용 가능"이라 주장하나 실제 배선 없음) | §4 소비처 참조 |

**요약:** 특정 상품에 결속되지 않은 자유 서식 텍스트 노트를 `store_execution_assets` 의 `category='product-info'` 슬롯에 적재하는 단독 저작 도구. product master 연결·AI·다국어·QR 배선 모두 부재.

---

## 4. API · 권한 계약

- **엔드포인트 존재:** ✅ `/api/v1/kpa/store/assets` (GET list/single, POST, PUT, DELETE). KPA 마운트 = `kpa.routes.ts:434` (`serviceKey='kpa'`).
- **frontend↔backend 정합:** ✅ `category` free-form varchar pass-through (POST `category: category || null`, controller:237). 서버측 `product-info` 특수 처리 **없음** (enum/whitelist 없음; `apps/api-server/src` 내 `product-info` 매칭 0).
- **저장 API 실제 호출:** ✅ (UNREACHABLE 이므로 실사용 여부는 §8 미확인 — 코드상 호출 경로는 정상).
- **권한 guard:** ✅ `requireAuth` + `requirePharmacyOwner`(=`createRequireStoreOwner(dataSource,'kpa')`) → `service_memberships(active)` + `store_owner` 역할 + `organizationId` 격리. store owner 소유권 정상.
- **DELETE 가드:** active `store_qr_codes` 참조 시 409 `QR_REFERENCE_EXISTS` (controller:324-340) — 단, product-info 자산은 QR 이 참조하지 않음(§4 소비처).

**계약 자체는 정상.** 문제는 계약이 아니라 이 category 의 **소비처 부재**(§6).

---

## 5. 기존 기능 비교표

| 기준 | ProductInfoCreator | StoreProductDescriptionsPage (상품 상세설명) | handled-products (매장용 상세설명서 보기) |
|------|------|------|------|
| 라우트 | `/store/execution/product-info` **[UNREACHABLE]** | `/store/marketing/product-descriptions` **[REACHABLE·정규 생산카드]** | `/store/handled-products` **[REACHABLE·사이드바]** |
| 시작 상품 | 없음 (자유 텍스트) | 상품별 (productId) | 취급상품 (listing/local UNION) |
| 저장 위치 | `store_execution_assets`(category='product-info') | `product_ai_contents`(contentType='product_description') | **저장 안 함** (읽기 전용; STORE 설명 뷰) |
| 결과물 유형 | 자유 HTML 노트 | 상품 카드/상세 본문 | ProductMaster STORE 설명 열람 |
| 수정 화면 | 자기 자신 (모달) | 자기 자신 | 없음 (뷰) |
| QR 활용 | ❌ (주장만) | 간접 | `fetchHandledProductQr` 고정 QR |
| 태블릿 활용 | ❌ (assetType='content'·mimeType 없음→필터 제외) | — | — |
| 공급자 콘텐츠 관계 | 없음 | 없음 | 다국어=operator HUB import 사본 |
| 다국어 | ❌ | ❌ | ✅ (multilingual product content) |
| 정규 생산 플로우 | **명시적 제외** (ProductionTypeSelectorModal:24) | **채택** (4카드 중 "상품 상세설명") | — |
| 실제 소비처 | §6 참조 (생산 소비 0, 자료함 우연 노출) | 정규 카드 소비 | 취급상품 화면 |

정규 "콘텐츠 만들기" 플로우(ProductionTypeSelectorModal, 4카드 화이트리스트 = POP/QR/블로그/**상품 상세설명**)는 "상품 상세설명" 슬롯을 **StoreProductDescriptionsPage** 로 배선하고 product-info-creator 를 **의도적으로 제외**(`ProductionTypeSelectorModal.tsx:24`)했다. 즉 "상품 정보/상세 저작" 역할은 이미 정규 화면이 담당 중이다.

---

## 6. 실제 소비처 (category='product-info')

`getStoreExecutionAssets` 전 소비처 조사 결과, **`category='product-info'` 를 의도적으로 조회하는 소비처는 StoreProductInfoCreatorPage 자기 자신뿐.**

| 소비처 | category 필터 | product-info 노출? |
|--------|------|:---:|
| StoreProductInfoCreatorPage | `'product-info'` | 자기 자신 |
| StoreAssetSelectorModal (QR/자산 선택) | usageType 필터 | ❌ (product-info 는 usageType 없음) |
| SelectContentsForProductionModal (콘텐츠 픽커) | `sourceType==='generated' && assetType==='content'` | ❌ (product-info=`manual`) |
| StorePopPage | `usageType:'pop'` | ❌ |
| StoreProductionMaterialsPage (제작 자료) | `sourceType==='generated'` | ❌ |
| StoreTabletDisplaysPage (태블릿) | mimeType `video/`·`image/` | ❌ (htmlContent, mimeType 없음) |
| **StoreLibraryResourcesPage (약국 자료함 → 자료)** | **필터 없음** (`libraryToUnified` 전량 매핑) | **⚠️ 우연 노출 O** (`:198,203`) |
| **StoreHomePage** | 필터 없음 (`limit:1`, `.total` 만) | ⚠️ libraryCount 집계에 포함 (`:87`) |

**핵심:** 생산 산출물 흐름(QR/POP/태블릿/블로그/픽커/제작자료) 어디서도 이 category 를 소비하지 않는다. 유일한 실 노출은 **약국 자료함(자료 탭)의 무필터 우연 노출** + 홈 카운트 집계뿐이다. → 저장 결과가 "완전히 사장"은 아니나(자료함에 자유 노트로 보임), **정의된 생산 소비 계약이 없다.**

---

## 7. 중복 · 고립 여부

WO §6 판정 기준 적용:

- "저장 대상·결과물·소비처 동일 → 중복": ❌ (StoreProductDescriptionsPage 는 `product_ai_contents`·상품결속, handled-products 는 저장 안 함 — 저장 대상 다름).
- "일부 필드만 다르지만 별도 사용처 없음 → 사실상 중복": △ **역할(상품 정보/상세 저작)은 정규 화면과 사실상 중복**이나, 저장 대상이 다르고(별도 category) 정규 플로우에서 제외됨.
- "명확한 독립 결과물 + 실제 소비처 존재 → 별도 기능": ❌ (독립 결과물은 있으나 생산 소비처 0).
- "저장되지만 어떤 화면에서도 사용하지 않음 → 고립 기능": **△ 사실상 고립** — 생산 소비 0, 자료함 우연 노출만.

**결론: 역할상 정규 화면과 (약한) 중복 + 저장 결과는 사실상 고립(자료함 우연 노출 제외).** 완전한 0-소비 고립도, 완전한 중복도 아닌 경계 상태.

---

## 8. 매장 업무동선 적합성

WO §7 질문에 코드 근거로 답:

| 질문 | 답 |
|------|------|
| 매장이 직접 상품 정보를 새로 만들어야 하는가 | 의문. 정규 "상품 상세설명" 카드가 이미 제공. 자유 텍스트 노트는 상품 결속·QR·태블릿 배선이 없어 업무 산출물로 이어지지 않음 |
| O4O 표준 상품 설명과 차이 | 표준(product_ai_contents / SPD STORE)은 상품 결속·구조화. 본 화면은 비결속 자유 HTML — **더 약한 계약** |
| 공급자 제공 콘텐츠와 차이 | 공급자 콘텐츠 import 는 snapshot/다국어 사본 테이블로 적재. 본 화면과 무관 |
| 결과물이 QR·POP·태블릿 중 어디서 사용 | **어디서도 사용 안 됨** (§6) |
| handled-products 단건 액션으로 충분하지 않은가 | 매장용 상세설명 열람+QR+다국어는 handled-products 가, 저작은 StoreProductDescriptionsPage 가 담당 → 별도 자유노트 화면의 반복 사용 근거 약함 |
| 별도 메뉴를 둘 만큼 반복 사용 업무인가 | 근거 약함. 자유 텍스트 노트 저작은 매장 경영자에게 콘텐츠 기획 부담을 과도 전가 |

**적합성 낮음.** 매장에 비결속 자유 콘텐츠 저작을 요구하는 구조이며 산출물이 생산 흐름으로 연결되지 않는다.

---

## 9. 최종 판정 → **D (후속 설계 필요)**

### 왜 A/B/C 가 아닌가

- **A (링크만 추가) ❌**: 조건 "저장·소비 계약 정상 + 실제 매장 업무에 필요" 불충족. 생산 소비 계약이 정의되지 않았고(§6), 업무 필요성이 약하다(§8). 진입점만 부여하면 산출물이 자료함에만 쌓이는 반쪽 기능을 노출하게 됨.
- **B (기존 화면 통합) △ 후보**: "상품 상세설명" 저작이 이미 StoreProductDescriptionsPage 로 정규화되어 있어, 자유노트 역할을 그쪽/handled-products 로 흡수하는 안은 성립 가능. 단 이는 아래 D 의 설계 결정 결과 중 하나.
- **C (제거) △ 부차 가능**: "대체 기능 존재 + orphaned" 는 성립하나, "저장 결과 미사용" 이 완전 성립하지 않고(자료함 우연 노출), 무엇보다 **canonical 메뉴 트리(SSOT #5) O4O-STORE-MENU-CANONICAL-TREE-V1 §2.1 항목 #1 "상품 상세정보" 가 이 페이지를 "기존 구현(부분)·후속 필요" 로 명시 예약**하고 있어, read-only IR 이 baseline 을 거슬러 단독 폐기를 확정할 수 없다.

### D 선택 근거

- **역할은 canonical 로 예약됨**: 메뉴 트리 §2.1 #1 "상품 상세정보" (매장 제작 = StoreProductInfoCreatorPage, 저장 후보 = `store_execution_assets`/`kpa_store_contents`, 후속 = "필요").
- **그러나 저장·노출 계약이 불명확**: (a) `category='product-info'` 를 소비하는 생산 흐름 0, (b) product master 결속·출처(§2.2 canonical 요구)·HUB 진열·가져가기 미구현, (c) 정규 생산 플로우가 이미 StoreProductDescriptionsPage 를 채택하고 본 화면을 제외.
- **해소에 설계 결정 + 데이터모델 확인 필요**: 아래 §10.

---

## 10. 후속 구현 범위 (별도 WO — 이번 IR 범위 외)

canonical 메뉴 트리 §2.1 #1 "상품 상세정보" 슬롯을 **무엇으로 채울지** 설계 결정 필요. 3택:

1. **완성 (canonical 준수)**: StoreProductInfoCreatorPage 를 §2.2 요구(HUB 진열 + 매장 제작 + 가져가기 + 출처 + product 결속)에 맞춰 확장하고 진입점 부여. → 대규모, `store_execution_assets`↔HUB↔product master 계약 신설.
2. **통합 (B)**: 자유노트 역할을 StoreProductDescriptionsPage(정규 "상품 상세설명") 또는 handled-products 흐름으로 흡수하고 `/store/execution/product-info` 라우트 은퇴. → canonical #1 슬롯을 StoreProductDescriptionsPage 로 재지정하는 baseline 정합 갱신 동반.
3. **은퇴 (C)**: 정규 화면이 역할을 담당함을 확인하고 본 화면 폐기 + 메뉴 트리 §2.1 #1 "기존 구현" 항목 갱신 + 자료함 우연 노출 정리 + 기존 `category='product-info'` 데이터 존재 여부 확인(§8 미확인) 후 처리.

**권장 진행 순서:** 정규 "상품 상세설명"(StoreProductDescriptionsPage)이 canonical #1 슬롯 요건을 얼마나 충족하는지 먼저 평가 → 충족 시 2/3(통합·은퇴), 미충족·차별 역할 존재 시 1(완성). 어느 경우든 **baseline(메뉴 트리 §2.1) 갱신을 동반**해야 하므로 별도 설계 WO 필요.

---

## 11. 미확인 (코드만으로 판단 불가)

- 프로덕션 DB 에 `category='product-info'` row 가 실제로 존재/사용되는지 (read-only IR — DB 조회 안 함).
- handled-products 의 STORE b2c-descriptions 엔드포인트(`/store-contents/b2c-descriptions`) 백킹 테이블이 문자 그대로 `shared_product_descriptions`(SPD)인지 (frontend 만 확인; 무관하므로 미개봉).

---

## 12. 변경 없음 선언

```
코드 변경 0 · DB write/조회 0 · 배포 0
진입 버튼/사이드바/route/redirect/API/공통 UI 변경 0
IR 문서만 path-specific stage → main push
```

다른 세션 변경 파일(kpa.routes.ts / operatorMenuGroups.ts / OperatorStoreDetailPage.tsx / OperatorRoutes.tsx / otc-* / pnpm-lock)은 조회만 하고 **미변경**.

---

*판정: D (후속 설계 필요) · 부차적으로 canonical 슬롯 재지정 시 C(은퇴)로 축소 가능 · 이번 IR 은 read-only 조사, 구현 0*
