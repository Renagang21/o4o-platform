# CHECK-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1

- **WO**: WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1
- **일자**: 2026-08-10
- **기준 commit**: `01fb9123f` (작업 시작 시점 `HEAD == origin/main`)
- **감사 범위**: `apps/admin-dashboard/src` 전체 (백엔드 무변경)
- **선행 자매 수정**: `a20415e7b` — WO-O4O-OPERATORS-PAGE-SILENT-NOOP-FIX-V1 (OperatorsPage)

---

## 1. 감사 방법

정적 전수 grep + 라우팅 도달성 확인 + 화면별 문구 확인의 3단계.

| 단계 | 방법 |
|---|---|
| 패턴 수집 | `set[A-Z]\w*\(\[\])` · `Array.isArray` · `catch { setX([]) }` (multiline regex) |
| 실패 가시성 | 각 파일에서 `{error && (` / `loadError` / `다시 시도` 렌더 여부 |
| 도달성 | `routes/*.tsx` 의 lazy import 146개를 추출해 라우팅된 화면만 FIX 대상으로 승격 |
| 오인 가능성 | `emptyMessage` · 빈 상태 문구가 "없습니다" 로 끝나는지 |

## 2. 발견 패턴 수

| 패턴 | 건수 |
|---|---:|
| `setX([])` 총 출현 | 80건 / 56파일 |
| `Array.isArray` 총 출현 | 167건 / 70파일 |
| **`catch` 내부 `setX([])`** (핵심 패턴) | **약 30건 / 28파일** |
| 그중 **라우팅된 화면 + 실패 불가시/오인** = FIX | **8건** |

## 3. 판정표

### FIX (8건 — 이번 WO 에서 수정)

| # | 파일 | 실패 시 화면에 뜨던 문구 | 실질 위험 |
|---|---|---|---|
| 1 | `pages/users/UsersListClean.tsx` | "조건에 맞는 권한 할당이 없습니다." + 통계 카드 전부 0 | OperatorsPage 와 동일한 쌍둥이 결함. 권한 현황 0건 오인 |
| 2 | `pages/o4o-product-db/StoreRequestReviewModal.tsx` | "동일 바코드/상품명+제조사의 기존 상품이 없습니다. **신규 승인 가능합니다.**" | 중복 확인 실패를 "중복 없음" 으로 위장 → **중복 표준 상품 생성 유도** |
| 3 | `pages/sellerops/pages/ProductSearchPage.tsx` | "검색 결과가 없습니다" → [직접 입력] 유도 | 기존 ProductMaster 를 못 찾은 채 **중복 마스터 수기 생성** |
| 4 | `pages/supplierops/pages/ProductSearchPage.tsx` | 위와 동일 (쌍둥이 화면) | 동일 |
| 5 | `pages/lms-instructor/dashboard/index.tsx` (수강신청 모달) | "현재 대기 중인 수강 신청이 없습니다." | 승인 대기자 방치 |
| 6 | `pages/posts/Categories.tsx` | 무성 실패 — 빈 표 + "0 items" | 카테고리 0건 오인 (toast 조차 없었음) |
| 7 | `pages/store/qr/QrCreatePage.tsx` | "등록된 공급자 상품이 없습니다." | QR 연결 대상 없음 오인 |
| 8 | `pages/content-resource/MediaAssetsPage.tsx` (사용처 탭) | "…사용하는 매장 실행 자산이 없습니다." | **삭제해도 안전하다**는 판단 근거로 읽힘 |

### PASS (지속 오류 배너가 이미 렌더됨 — 무수정)

`cosmetics-products/ProductListPage` · `cosmetics-products/BrandListPage` ·
`glycopharm/products/ProductListPage` · `glycopharm/pharmacies/PharmacyListPage` ·
`admin/settlements/AdminSettlementsPage` (재시도 버튼까지 보유) · `pages/PageList` ·
`o4o-product-db/StoreProductRequestsPage` · `o4o-product-db/ProductMastersPage` ·
`o4o-product-db/ProductCandidatesPage` · `o4o-product-db/ImageQualityPage` ·
`lms-instructor/dashboard` 의 **강좌 목록** fetch (배너 + 다시 시도)

> 이들은 실패 시 목록을 비우지만 **같은 화면에 지속 오류 배너가 함께 뜬다.** 실패와 0건이 구분되므로
> 위장에 해당하지 않는다. 다만 `emptyMessage` 자체는 여전히 "없습니다" 문구다 → §6 후속 후보.

### REVIEW (오인 가능하나 이번 범위 밖 — 보고만)

| 대상 | 사유 |
|---|---|
| `o4o-product-db/ProductMasterDetailPage` 보조 3 fetch (메모 / 이미지 / 작업이력) | 목록 화면이 아닌 상세 보조 패널. 본문 row 는 이미 error 처리됨 |
| 선택기(picker) 계열 — `ProductSelector` · `OrganizationSelector` · `PresetSelector` · `TaxonomyTermSelector` · `MediaSelector` · `FileSelector` · `EditorSidebar` | 조회 목록 화면이 아니라 입력 보조 위젯. 공통 위젯 수정은 소비처 전수 확인이 필요(§CLAUDE.md Shared Module Rule) |
| `components/routing/DynamicRouteLoader` | 라우트 로딩 인프라. 실패 UX 는 별도 판단 대상 |
| 훅 계열 — `hooks/posts/usePostsData` · `hooks/cpt/useCPTData` | `setError` 를 함께 세팅한다. 소비처의 error 렌더 여부는 화면별 확인 필요 |

### N/A (라우팅되지 않는 dead 화면 — 무수정)

`vendors/VendorsAdmin` · `vendors/VendorsCommissionAdmin` (`useVendorsAdmin` / `useVendorsCommission` 의
toast-only + wipe 패턴 보유) · `partner/PartnerDashboard` · `categories/TagList` · `categories/CategoryList` ·
`menus/AdminMenuList` · `ag-demo/*` · `pages/test/*` · `pages/__debug__/*`

> `routes/*.tsx` 의 lazy import 146개를 추출해 대조한 결과 라우트 등록이 없다. 사용자 도달 경로가 없어
> 실사용 위험이 0 이므로 수정하지 않았다. **은퇴 여부는 별도 판단 대상**이다(§6).

## 4. 수정 방식 (8건 공통 — OperatorsPage canonical 준수)

```text
1. 지속 오류 상태(loadError / dupsError / searchError / usageError / enrollmentsError) 추가
2. 실패 배너 + 재시도 버튼 렌더 (role="alert")
3. 재조회 실패 시 기존 목록을 비우지 않음 (1·6·7번) — 마지막 성공 화면 유지
4. HTTP 200 + success:false 를 실패로 판정 (raw axios 소비처: 1·6번)
5. 배열이 아닌 예상 밖 응답을 실패로 판정 (1·3·4·5·7·8번)
6. 실패 상태에서 빈 상태 문구를 "불러오지 못함" 으로 교체 (1·7번) 또는
   실패 분기를 0건 분기보다 먼저 렌더 (2·3·4·5·8번)
```

`3~5`번 검색·수강신청은 실패 시 결과를 비우되(이전 검색어 결과가 남으면 더 오해된다) **"0건" 이 아니라
"실패" 로 표시**한다.

## 5. 검증 결과

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (admin-dashboard) | **PASS** (에러 0) |
| `eslint` (변경 8파일) | **0 errors** / warning 9건은 모두 기존 미사용 import (본 WO 무관) |
| `npm run build` (admin-dashboard) | **PASS** — `✓ built in 47.69s` |
| migration | **0건** (스키마·SQL 무변경) |
| 백엔드 변경 | **0건** |
| 권한 / role / 인증 정책 변경 | **0건** |
| API 계약 변경 | **0건** |
| write 액션 실행 | **0건** (모두 조회 경로 수정) |
| OperatorsPage 회귀 | 본 WO 는 해당 파일을 **수정하지 않음** (§7 참조) |

## 6. 후속 후보

| 후보 | 내용 |
|---|---|
| `WO-O4O-ADMIN-DASHBOARD-COMMON-LOAD-ERROR-CONTRACT-V1` | PASS 판정 화면들의 `emptyMessage` 도 실패 상태에서 문구가 바뀌도록 공통화. **이번 WO 에서는 금지(§5)라 만들지 않았다** |
| dead 화면 은퇴 | `vendors/*` · `partner/PartnerDashboard` · `categories/TagList` · `categories/CategoryList` · `menus/AdminMenuList` 라우팅 부재 확인 → 은퇴 또는 라우트 복구 판단 |
| 공통 picker 실패 UX | REVIEW 판정 선택기 6종. Shared Module Change Protocol 대상 |
| 중복 확인 실패 시 신규 승인 차단 여부 | `StoreRequestReviewModal` 에서 경고만 하고 버튼은 유지했다. 차단은 승인 정책 변경이라 별도 판단 |
| **백엔드 404 3건 조사** | §9-3 — `/content/categories` · `/pharmacy/qr/source/products` 404, LMS instructor client 의 `/api/api` 이중 접두 |

## 7. 다른 세션과의 관계 (중요)

작업 도중 `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` 와
`apps/admin-dashboard/src/tests/operators-service-password.test.ts` 가 **다른 세션에 의해 dirty** 해졌다
(`WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1` — `pharmacy-hub:admin` 역할 도입).

- 본 WO 의 수정 파일 8개와 **경로가 전혀 겹치지 않는다.**
- path-specific stage 로 8개만 커밋했고 해당 2파일은 **건드리지 않았다.**
- 단, `tsc` / `build` 는 그 미커밋 변경이 포함된 작업트리에서 실행되었다.
  (두 파일 모두 role 카탈로그 상수·테스트 추가라 본 수정과 상호작용 없음)

## 8. 변경 파일

```text
apps/admin-dashboard/src/pages/users/UsersListClean.tsx
apps/admin-dashboard/src/pages/o4o-product-db/StoreRequestReviewModal.tsx
apps/admin-dashboard/src/pages/sellerops/pages/ProductSearchPage.tsx
apps/admin-dashboard/src/pages/supplierops/pages/ProductSearchPage.tsx
apps/admin-dashboard/src/pages/lms-instructor/dashboard/index.tsx
apps/admin-dashboard/src/pages/posts/Categories.tsx
apps/admin-dashboard/src/pages/store/qr/QrCreatePage.tsx
apps/admin-dashboard/src/pages/content-resource/MediaAssetsPage.tsx
docs/checks/CHECK-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1.md (본 문서)
```

## 9. 배포 · smoke

| 항목 | 결과 |
|---|---|
| commit SHA | `7b48b8987` |
| push | `01fb9123f..7b48b8987 main -> main` |
| Deploy Admin Dashboard (Cloud Run) | run `31358740808` **success** (전 단계 ✓, Verify deployment 포함) |
| 검증 URL | `https://admin.neture.co.kr` |
| 검증 계정 | `sohae2100@gmail.com` (roles: kpa/neture/glycopharm/cosmetics admin·operator, `platform:super_admin` **없음**) |

### 9-1. 실패 주입 방법

`XMLHttpRequest.prototype.open` / `window.fetch` 를 감싸 특정 URL 조각만 도달 불가 주소로
바꾸는 인터셉터를 브라우저 콘솔에 주입했다 (백엔드·코드 변경 없음). 실패 후 인터셉터를 해제하고
[다시 시도] 를 눌러 복구까지 확인했다.

### 9-2. 화면별 결과

| # | 화면 | 실패 주입 | 정상 조회 | 결과 |
|---|---|---|---|---|
| 8 | content-resource 사용처 탭 | `/usage` 차단 → "사용처를 확인하지 못했습니다. / Network Error / **사용처가 없다는 뜻이 아닙니다. 확인 전에는 삭제 판단을 하지 마세요.**" + [다시 확인] | 목록 35건 정상, [다시 확인] 후 "사용처 (0)" 정상 표시 | **PASS** |
| 6 | posts/Categories | `/categories` 차단 → "카테고리 목록을 불러오지 못했습니다. / Network Error / **카테고리가 0건이라는 뜻이 아닙니다.**" + [다시 시도] | — (§9-3 참조) | **PASS** (배너·재시도 동작) |
| 7 | store/qr QrCreatePage | `/qr/source/products` 차단 → "상품 목록을 불러오지 못했습니다. / Network Error / **연결할 상품이 없다는 뜻이 아닙니다.**" + [다시 시도], 빈 문구도 "목록을 불러오지 못해 표시할 수 없습니다." 로 전환 | — (§9-3 참조) | **PASS** (배너·재시도 동작) |
| 2 | StoreRequestReviewModal | **미수행** — 중복 조회는 `reviewable` 요청에서만 실행되는데 프로덕션에 검토 중 요청 **0건** | 비검토 요청 모달 정상 렌더(회귀 없음) | **미검증** |
| 1 | UsersListClean | **미수행** — `/users` 라우트가 `platform:super_admin` 요구, 보유 테스트 계정 전부 접근 불가 | 동일 | **미검증** (§9-4 간접 확인) |
| 3·4 | sellerops / supplierops ProductSearchPage | **미수행** — 두 앱 모두 `/error/app-disabled` (AppRouteGuard 비활성) | 동일 | **미검증** |
| 5 | lms-instructor 수강신청 모달 | **미수행** — 선행 강좌 목록 조회가 실패해 모달 진입 불가 (§9-3) | 동일 | **미검증** |

> 콘솔 에러는 주입한 실패 요청과 아래 §9-3 의 기존 결함 외에 없었다.

### 9-3. smoke 중 드러난 **기존 백엔드 결함 3건** (본 WO 수정 대상 아님 · 백엔드 변경 금지)

이번 수정이 없었다면 전부 "0건" 으로 보였을 실패들이다. 수정의 효과를 그대로 증명한다.

| 엔드포인트 | 증상 | 종전 화면 표시 | 현재 화면 표시 |
|---|---|---|---|
| `GET /api/v1/content/categories` | **404** | 무성 실패 · "0 items" | "카테고리 목록을 불러오지 못했습니다 / Request failed with status code 404" |
| `GET /api/v1/pharmacy/qr/source/products` | **404** | "등록된 공급자 상품이 없습니다." | "상품 목록을 불러오지 못했습니다 / status code 404" |
| `GET .../api/api/v1/lms/instructor/courses` | **경로 이중 `/api` 접두** | (기존에도 배너 있었음 — PASS 판정 화면) | "강좌 목록을 불러오지 못했습니다" + 다시 시도 |

→ 별도 WO 후보. 본 WO 는 프런트 표시만 다루므로 수정하지 않았다.

### 9-4. 회귀

| 항목 | 결과 |
|---|---|
| admin-dashboard 로그인 | **PASS** |
| OperatorsPage (`a20415e7b` 수정 유지) | **PASS** — `/admin/users` 403 을 "운영자 목록을 불러오지 못했습니다 / Active platform:super_admin role required" + [다시 시도] 로 표시. 빈 표 문구도 "목록을 불러오지 못해 표시할 수 없습니다." |
| o4o-product-db 상품 등록 요청 목록 | **PASS** — 검토 중 0건은 "표시할 요청이 없습니다"(진짜 0건), 전체 4건 정상 |
| content-resource 목록·필터 | **PASS** — 35건, 검색·필터 UI 정상 |
| 다른 세션 파일(OperatorsPage/test) | 미커밋·미수정 유지 (§7) |

> UsersListClean 은 OperatorsPage 와 **동일 엔드포인트(`/admin/users`)·동일 패턴**이며, OperatorsPage 에서
> 403 이 실패로 정확히 표시되는 것을 확인했다. 다만 UsersListClean 화면 자체의 실브라우저 확인은
> 권한 부족으로 **하지 못했다**(권한 정책 변경은 본 WO 금지사항).
