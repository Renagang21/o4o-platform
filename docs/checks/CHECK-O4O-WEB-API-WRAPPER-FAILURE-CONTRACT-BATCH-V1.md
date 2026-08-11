# CHECK-O4O-WEB-API-WRAPPER-FAILURE-CONTRACT-BATCH-V1

> WO: `WO-O4O-WEB-API-WRAPPER-FAILURE-CONTRACT-BATCH-V1`
> 목적: 5개 web 서비스 API wrapper 계층에서 **API 실패를 정상 데이터로 위장하는 경로**를 제거한다.
> 선행 배치: `CHECK-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1` (화면 4상태 계약) — 본 배치는 그 **전제 계층**.
> 판정: **PASS (부분 · HOLD 4건 명시)**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 시 HEAD | `9743d5f6f` |
| 작업 중 origin/main 진행 (타 세션) | `c2be1f693` |
| 본 배치 커밋 | §9 |
| 브랜치 | `main` (직접 작업) |

작업트리에 타 세션 변경(`apps/admin-dashboard`, `apps/api-server` 등)이 있었으나 본 WO 경로(`services/web-*`, `docs/checks/`)와 **경로 충돌 없음** → path-specific stage 로 진행.

---

## 2. 서비스별 API wrapper 목록 (스캔 결과)

전 서비스 `src/**` 에서 `catch` 블록이 값을 반환하는 지점을 기계 스캔.

| 항목 | 수 |
|---|---:|
| 스캔 대상 파일 | 46 |
| 실패 반환 지점(hit) | 267 |
| **HARD** (`[] / null / 0 / {data:[]}` 반환 — 실패가 정상 데이터로 위장) | **113** |
| SOFT (`{success:false}` / `{error}` 반환 — 호출층이 판정 가능) | 154 |

주요 wrapper 파일:

| 서비스 | wrapper |
|---|---|
| web-neture | `src/lib/api/{admin,dashboard,operatorDashboard,partner,product,seller,serviceApproval,supplier}.ts`, `src/services/forumApi.ts`, `src/api/trial.ts`, `src/lib/cart.ts` |
| web-kpa-society | `src/api/{participation,platform-services,signageTemplate,token-refresh,dashboard,...}.ts` |
| web-k-cosmetics | `src/services/{forumApi,storeApi,operatorApi}.ts` |
| web-glycopharm | `src/services/api.ts` (`apiClient` 공통 계약), `src/api/glycopharm.ts` |
| web-pharmacy-hub | `src/api/**` (HARD 해당 없음 — 알림 배지 KEEP 1건만) |

---

## 3. 실패 삼킴 패턴 목록

| 패턴 | 예 | 판정 |
|---|---|---|
| P1 | `catch { return []; }` (목록 조회) | FIX_STOP_EMPTY_FALLBACK → throw |
| P2 | `catch { return null; }` (단건 조회) | FIX_THROW_ON_FAILURE → **404 만 null**, 그 외 throw |
| P3 | `catch { return { data: [], meta: {...} }; }` (페이지네이션) | FIX_STOP_EMPTY_FALLBACK → throw |
| P4 | `catch { return { success:false, error } }` (mutation) | **KEEP** — 실패 보존 계약(호출층이 `success` 검사) |
| P5 | `catch { return 0; }` (알림 미읽음 배지) | KEEP_INTENTIONAL_OPTIONAL |
| P6 | `{ error }` 를 정상 반환하는 공통 client | HOLD (§6) |
| P7 | `return res.data \|\| []` (catch 아님, 필드 기본값) | 대상 아님 — 실패는 이미 throw 됨 |

---

## 4. 수정한 wrapper (FIX 44건 · 소비처 가드 1건)

전환 규칙
- **R1** 목록/페이지네이션 조회 → `throw error`
- **R2** 단건 조회 → `if (status === 404) return null; throw error`

| 서비스 | 파일 | 건수 | 대표 함수 |
|---|---|---:|---|
| web-neture | `src/lib/api/admin.ts` | 13 | `adminSupplierApi.getPendingSuppliers` · `operatorSupplierApi.getSuppliers` · `adminSettlementApi.getSettlements` · `adminProductApi.getProducts` · `adminCommissionApi.getCommissions` · `adminRegistrationApi.getRequests` · `operatorContactApi.list/bulkMarkRead` · `serviceAudiencePolicyApi.list` |
| web-neture | `src/lib/api/partner.ts` | 10 | `recruitingApi.getRecruitingProducts` · `partnerDashboardApi.getItems/browseContents/getLinkedContents` · `partnerCommissionApi.getCommissions/getDetail` · `partnerSettlementApi.getSettlements` |
| web-neture | `src/lib/api/dashboard.ts` | 4 | `fetchAdminDashboard` · `dashboardApi.get{Supplier,Operator,Partner}Dashboard*` |
| web-neture | `src/lib/api/supplier.ts` | 4 | `supplierCopilotApi.getProductPerformance/getDistribution/getTrendingProducts/getAiInsight` |
| web-neture | `src/services/forumApi.ts` | 3 | `fetchForumPostBySlug` · `fetchForumComments` · `fetchUserContactSettings` |
| web-neture | `src/lib/api/serviceApproval.ts` | 2 | `operatorServiceApprovalApi.list/analytics` |
| web-neture | `src/lib/api/product.ts` | 2 | `productApi.getMasterByBarcode` · `productApi.searchMasters` |
| web-neture | `src/lib/api/operatorDashboard.ts` | 1 | `fetchOperatorDashboard` |
| web-neture | `src/lib/api/seller.ts` | 1 | `sellerApi.getAvailableSupplyProducts` |
| web-k-cosmetics | `src/services/forumApi.ts` | 2 | `fetchForumPostById` · `fetchForumComments` |
| web-k-cosmetics | `src/services/storeApi.ts` | 1 | `storeApi.getStoreListings` |
| web-kpa-society | `src/api/participation.ts` | 1 | `participationApi.getMyResponse` |
| **합계 (wrapper)** | | **44** | |
| web-neture (소비처 가드) | `src/pages/operator/ProductServiceApprovalPage.tsx` | 1 | `analytics(...).catch(() => setShowAnalytics(false))` — 보조 패널만 숨김 |

---

## 5. 소비처 확인 결과

throw 전환의 유일한 회귀 위험은 **소비처가 try/catch 또는 `.catch()` 로 감싸지 않은 경우** — unhandled rejection 으로 `setLoading(false)` 가 실행되지 않아 무한 스피너가 된다. 따라서 전 대상에 대해 소비처 전수 확인 후 판정했다.

| 구분 | 수 | 처리 |
|---|---:|---|
| 소비처 전부 guarded | 대다수 | FIX 적용 |
| 소비처 0 (내부/미사용) | 일부 | FIX 적용(위험 없음) |
| 소비처 일부 unguarded (MIXED) | 7 | **제외** — HOLD 또는 미대상 |
| unguarded 1곳 + 보조 패널 | 1 | 소비처에 최소 `.catch()` 추가 후 FIX |

MIXED 로 제외된 7건 (다음 batch 후보):

| 서비스 | 함수 | unguarded 소비처 |
|---|---|---|
| web-neture | `productApi.getCategories` | 4/6 (ProductDataCleanup · StoreProductLibrary · ProductDetailDrawer · SupplierProductImport) |
| web-neture | `productApi.getBrands` | 3/4 |
| web-neture | `supplierApi.getOrderById` | 1/2 (SupplierOrderDetailPage) |
| web-neture | `operatorCategoryApi.updateCategory` | 1/2 — mutation, 실패 보존 계약이라 KEEP 성격 |
| web-kpa-society | `tryRefreshToken` | 12/13 — 토큰 재발급, KEEP_INTENTIONAL_OPTIONAL |
| web-glycopharm | `fetchOperatorDashboard` | 2/4 |
| web-k-cosmetics | `fetchForumPosts` | 2/4 (ForumHubPage · OperatorForumPage) |

KEEP_INTENTIONAL_OPTIONAL 14건 (의도된 fail-open — 수정하지 않음):

- `notificationsApi.getUnreadCount` × 5 (neture/kpa/glycopharm/k-cosmetics/pharmacy-hub) — 실패 시 배지 0
- `tryRefreshToken` · `clearAllTokens` (kpa `token-refresh.ts`)
- `loadAndClearDraft` · `looksLikeFirstmallAdmin` · `pickLargestSrcset` — localStorage/parser (API 아님)
- `downloadDocument` · `downloadRegulatedEvidence` · `downloadEvidence` 등 4건 — 액션 경로(로드 계약 아님)

### 5-1. 1차 변환에서 되돌린 오적용 (자체 발견)

기계 변환 후 diff 전수 검토에서 아래를 **오적용으로 판정하고 원복**했다.

| 대상 | 원복 사유 |
|---|---|
| `web-neture/src/lib/cart.ts` `getCart` | localStorage + `JSON.parse` — API 아님 |
| `web-neture/src/services/forumApi.ts` `updateUserContactSettings` · `createForumPost` | `{ success:false, error }` 실패 보존 계약(호출층이 `success` 검사) |
| `web-neture/src/lib/api/operatorCategory.ts` `createCategory` | 동일 (mutation 실패 보존 계약) |
| `web-neture/src/api/trial.ts` `getParticipation` | 이미 `404 → null / 그 외 throw` 로 올바름 |
| `web-neture/src/lib/api/supplier.ts` `getInventoryItem` · `getSettlementDetail` | 이미 `isNotFound() → null / 그 외 throw` 로 올바름 |
| `web-glycopharm/src/services/api.ts` `forumAnalyticsApi.getTrend/getActivity` | 소비처가 공통 패키지 `@o4o/operator-core-ui` 의 `OperatorForumAnalyticsPage.loadAll()` — try/catch·error 상태 없음 → throw 시 무한 스피너. **HOLD** |

---

## 6. HOLD 항목과 이유

| # | 대상 | 라벨 | 이유 | 다음 수정 방법 |
|---|---|---|---|---|
| H1 | `web-glycopharm/src/services/api.ts` `ApiClient.request` | HOLD_COMPLEX_CALLER | 실패를 `{ error }` 로 **정상 반환**하는 공통 계약. 소비처 13개 파일. throw 전환 시 13곳 동시 수정 필요 | 직전 배치에서 주요 read 화면 3곳은 `if (response.error)` 판정을 이미 추가함. 나머지 10곳 정리 후 계약 전환 |
| H2 | `web-glycopharm` `forumAnalyticsApi.getTrend/getActivity` | HOLD_COMPLEX_CALLER | 소비처가 공통 패키지 `@o4o/operator-core-ui/modules/forum-analytics` — 4서비스 공유, error 상태 없음 | 공통 모듈에 4상태 계약을 먼저 도입(별도 WO — 공통 모듈 변경) |
| H3 | `web-k-cosmetics/src/services/storeApi.ts` `fetchWithAuth` · `mutateWithAuth` | HOLD_COMPLEX_CALLER | 파일 내 거의 모든 export 가 경유하는 범용 헬퍼. 소비처 blast radius 과대 | 화면 단위로 4상태 계약을 먼저 갖춘 뒤 헬퍼 전환 |
| H4 | `web-k-cosmetics/src/services/operatorApi.ts` `fetchWithAuth` | HOLD_COMPLEX_CALLER | 동일 | 동일 |

> 참고: `web-kpa-society/src/api/platform-services.ts:64`, `src/api/signageTemplate.ts:163` 의 `return ... || []` 는 **catch 가 아니라 필드 기본값**이다. HTTP 실패는 이미 throw 되므로 본 배치 대상이 아니다(P7).

---

## 7. 실제 실패 UI smoke 결과

§8 (배포) 이후 실측. 인위적으로 API 를 깨는 변경은 하지 않았고, **운영에서 이미 실패하는 read endpoint** 를 이용했다.

| # | 축 | 대상 | 결과 |
|---|---|---|---|
| S1 | 정상 데이터 | (§9 이후 기재) | |
| S2 | API 실패 → error 상태 | (§9 이후 기재) | |
| S3 | empty 상태 | (§9 이후 기재) | |
| S4 | 로그인 필요 | (§9 이후 기재) | |
| S5 | 없는 route 404 | (§9 이후 기재) | |

---

## 8. typecheck · build · deploy 결과

| 서비스 | typecheck | vite build | deploy |
|---|:---:|:---:|:---:|
| web-neture | PASS | PASS | (§9 이후) |
| web-k-cosmetics | PASS | PASS | (§9 이후) |
| web-kpa-society | PASS | PASS | (§9 이후) |
| web-glycopharm | 변경 없음 | — | 배포 대상 아님 |
| web-pharmacy-hub | 변경 없음 | — | 배포 대상 아님 |

API 서버 변경 0 · 배포 0.

---

## 9. commit SHA

(커밋 후 기재)

---

## 10. push 결과

(push 후 기재)

---

## 11. 변경하지 않은 것

- backend / API endpoint / 권한 / role / route 변경 **0**
- DB write · migration **0**
- 공통 패키지(`packages/**`) 변경 **0**
- 대규모 화면 상태 리팩터링 **0** (소비처 수정은 `.catch()` 1줄 1건)
