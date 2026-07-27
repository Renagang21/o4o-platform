# CHECK-O4O-NETURE-OPERATOR-HOMEPAGE-CMS-AND-CONTENT-ASSETS-LOAD-ERROR-CONTRACT-V1

> WO: **WO-O4O-NETURE-OPERATOR-HOMEPAGE-CMS-AND-CONTENT-ASSETS-LOAD-ERROR-CONTRACT-V1**
> (IR 묶음 3 — 운영자 홈페이지 CMS·콘텐츠 자산 조회 오류 정비)
> 선행 조사: `docs/investigations/IR-O4O-NETURE-LOAD-ERROR-CONTRACT-FINAL-VALIDATION-V1.md`
> 자매 작업: 묶음 1(`...STORE-PRODUCT-DISCOVERY-AND-LISTINGS...`) · 묶음 2(`...OPERATOR-PRODUCTS-AND-OFFERS...`)
> 상태: **API 계약 4/4 완료, 소비 화면 3/3 정비(+1 공통 템플릿 제약 화면)**
> 작업일: 2026-07-27

---

## 1. 문제 (조사 → 확정)

Neture(`services/web-neture`) 운영자 홈페이지 CMS·콘텐츠 자산 조회 API가 실패(4xx/5xx/네트워크/깨진 payload)를
정상 빈 콘텐츠·0 KPI 로 삼켜, 조회 장애가 "등록된 콘텐츠 없음 / 자산 0개 / 조회수 0" 으로 표시되었다.

기존 오류 삼킴:

| 함수 | 기존 | 결과 |
|------|------|------|
| `homepageCmsApi.getContents(section)` | `catch { return [] }` + `result.data \|\| []` | 실패 → 빈 목록 → "등록된 콘텐츠가 없습니다" |
| `contentAssetApi.listAssets()` | `catch { return {success:false, data:[]} }` | 실패 → 빈 자산 목록 |
| `contentAssetApi.getKpi()` | `catch { return {success:false, data:{...0...}} }` | 실패 → 0 KPI 카드 |
| `cmsApi.getContents()` | `catch { return {data:[], pagination:0} }` + `result.data \|\| []` | 실패 → 빈 콘텐츠 목록 |

---

## 2. Backend 계약 (read-only 확인)

| 엔드포인트 | 정상 | 오류 |
|------|------|------|
| `GET /neture/admin/homepage-contents?section=` | `200 { success:true, data:rows[] }` (빈=정상) | 400 잘못된 section·`success:false` / 500·`success:false` / 401·403 `requireNetureScope('neture:admin')` |
| `GET /dashboard/assets?dashboardId=` | `200 { success:true, data:[] }` (미프로비전 테이블도 200 빈배열=정상) | 500·`success:false` / 401 / 400 |
| `GET /dashboard/assets/kpi?dashboardId=` | `200 { success:true, data:{...} }` (0 KPI=정상) | 500·`success:false` / 401 |
| `GET /neture/content` | `200 { success:true, data:[], pagination }` (`optionalAuth`) | 500·`success:false` |

- 정상 0건·0 KPI 는 항상 `200 + success:true`. 4xx/5xx 는 실 HTTP 오류. 404 경로 없음(단, content 상세는 404 있음 — 목록 대상 아님).

---

## 3. 의도된 fail-open (제외 — 유지)

공개 홈 섹션·시그널성 조회는 실패해도 화면 붕괴를 막기 위해 fail-open 을 유지한다(본 계약 대상 아님).

```text
homepageCmsApi.getHeroSlides() / getAds() / getLogos()   — 공개 홈페이지 섹션
cmsApi.trackView()                                        — 조회수
contentAssetApi.getCopiedSourceIds() / getSupplierSignal() — 배지·시그널성 조회
```

---

## 4. 적용 오류 코드 (API 계층)

`services/web-neture/src/lib/api/content.ts` (+ `index.ts` re-export):

```text
OPERATOR_HOMEPAGE_CONTENTS_LOAD_FAILED   — homepageCmsApi.getContents
CONTENT_ASSETS_LOAD_FAILED               — contentAssetApi.listAssets
CONTENT_ASSET_KPI_LOAD_FAILED            — contentAssetApi.getKpi
CMS_CONTENTS_LOAD_FAILED                 — cmsApi.getContents
```

계약:

```text
200 + success:true + 정상 배열/객체  → 성공 통과 (빈 배열·0 KPI 포함)
4xx·5xx·네트워크                      → describeApiError 로 서버 원문 console.warn → 고정 코드 throw
success !== true                      → throw
data 비배열 (목록) / data 비객체 (KPI) → throw
pagination 누락 (cmsApi)              → throw
```

제거한 패턴: `catch → []`, `catch → {success:false,...}`, `catch → 0 KPI`, `result.data || []`, 빈 pagination fallback.

- 반환 타입 정정: `listAssets` `{success,data}` → `DashboardAsset[]`, `getKpi` `{success,data}` → `DashboardKpi`.
  (두 함수의 유일 소비처 = `MyContentPage.tsx` — 소비처 동반 수정 완료)

---

## 5. 소비 화면·route + 상태 분리

| 소비 화면 | route | 대상 API | 정비 |
|------|------|------|------|
| `HomepageCmsPage.tsx` | `/operator/homepage-cms` | homepageCmsApi.getContents | ✅ loadError + 오류 패널 + 다시 시도 |
| `MyContentPage.tsx` | `/dashboard/my-content` | listAssets + getKpi | ✅ 목록 loadError / KPI kpiError **독립** + 각 다시 시도 |
| `ContentListPage.tsx` | `/content` | cmsApi.getContents | ✅ 기존 error 상태 + 다시 시도 버튼 신설 |
| `NetureResourcesPage.tsx` | `/resources` | cmsApi.getContents | ⚠️ 공통 템플릿 제약 — §6 참조 |

**상태 분리 (loading > error > empty > data):**
- 목록: loading / error(오류 패널) / success+0건("등록된 콘텐츠가 없습니다") / success+데이터
- KPI(MyContentPage): loading(무카드) / error(kpiError 배너) / success(0 포함 실제 지표)
- 오류 상태에서 "등록된 콘텐츠가 없습니다 / 자산 0개 / 조회수 0 / pagination" 미표시.
- 재시도는 현재 tab·정렬·페이지 보존(`loadItems()`/`loadAssets()`/`loadKpi()`/`fetchContents()` 재호출).

**영역 독립성 (MyContentPage):**
- KPI 실패 → 자산 목록 유지 (kpiError 만 표시, assets 무영향)
- 자산 목록 실패 → KPI 유지 (loadError 만 표시, kpi 무영향)
- tab 전환(HomepageCmsPage): `loadItems` 진입 시 `setLoadError(false)` → 이전 오류 잔상 제거, loading 이 목록 대체.

**mutation 후 재조회 (§7):**
- HomepageCmsPage create/update/delete/status/reorder → 성공 후 `loadItems()`.
  재조회 실패 시 mutation 은 이미 성공(모달 닫힘/toast 없음) → `loadError=true` 로 목록 영역만 오류, 기존 `items` 미삭제.
- MyContentPage publish/archive/delete/bulk → 낙관적 state 갱신(`setAssets(prev...)`) 또는 성공 toast 후 `loadAssets()`.
  재조회 실패 시 mutation toast 유지, `loadError=true` 로 목록 영역만 오류, 기존 `assets` 미삭제(setAssets([]) 제거됨).
- 실제 운영 mutation 미실행 — 코드 경로로 확인.

---

## 6. 공통 템플릿 제약 화면 — NetureResourcesPage

`NetureResourcesPage.tsx` 는 공통 UI Core `@o4o/shared-space-ui` 의 `ResourcesHubTemplate` 에
`fetchItems`(= `cmsApi.getContents` 어댑터)를 주입한다.

- 템플릿 내부(`ResourcesHubTemplate.tsx` L309-319)는 `try { setItems(res.items) } catch { setItems([]) }` 로
  fetch 오류를 자체 삼키며 **error 상태가 없다.**
- 이 템플릿은 WO §9 제외(**공통 UI Core 변경 금지**) 대상이므로 본 WO 에서 수정하지 않는다.
- **안전 저하 확인**: `cmsApi.getContents` throw → 어댑터 throw → 템플릿 catch → 빈 목록("등록된 자료가 없습니다").
  크래시·unhandled rejection 없음. 단, 이 화면에 한해 오류 vs 정상 0건 분리는 템플릿 개선 시 후속 반영 필요.
- 묶음 2 의 `AllProductsOverviewPage`(동시 DataTable 작업 제약)와 동류의 **범위 밖 제약 화면**으로 기록.

---

## 7. 검증

### 7.1 typecheck / build
```text
pnpm --filter @o4o/web-neture exec tsc --noEmit -p tsconfig.json  → EXIT=0
pnpm --filter @o4o/web-neture build                                → EXIT=0 (built in ~15s)
```

### 7.2 코드 경로 / 합성 응답

| 입력 | getContents(homepage) | listAssets | getKpi | cmsApi.getContents |
|------|------|------|------|------|
| 200 `{success:true,data:[]}` | 정상 0건([]) | 정상 0건([]) | (kpi 0객체=정상) | 정상 0건 |
| 200 정상 데이터 | 배열 반환 | 배열 반환 | 객체 반환 | {data,pagination} |
| 500 `success:false` | **throw** | **throw** | **throw** | **throw** |
| 401/403 | **throw** | **throw** | **throw** | (optionalAuth) |
| 네트워크 오류(no response) | **throw** | **throw** | **throw** | **throw** |
| 200 `success:false` | **throw** | **throw** | **throw** | **throw** |
| 200 data 비배열/비객체 | **throw** | **throw** | **throw** | **throw** |
| pagination 누락 | — | — | — | **throw** |
| 재시도 실패/성공 | 오류 패널 유지 / 목록 복귀 | 동일 | KPI 배너 / KPI 복귀 | 오류/목록 복귀 |

- 서버 원문은 `console.warn(describeApiError(error))` 로만 로깅(고정 코드 throw, 원문 UI 노출 없음).
- unhandled rejection 0: 모든 소비 화면이 `.catch`/`try-catch` 로 수신.
- 로딩 고착 0: `finally { setLoading(false) }` 및 KPI `.catch`.
- 운영 write 0: mutation 미실행, GET 계약만 변경.

### 7.3 배포
- 커밋: (본 문서 §8)
- 배포 run / revision: (배포 후 기록)
- 엔드포인트 게이팅: (배포 후 401 확인 기록)

---

## 8. 제외 (WO §9 범위 외)

```text
공개 홈페이지 hero/ads/logos fail-open 변경   backend/DB/migration 변경
CMS 데이터 모델 변경                          홈페이지 IA 재설계
공통 API wrapper 변경                         공통 UI Core 변경(ResourcesHubTemplate 포함)
dependency 추가                               운영 데이터 write
```

---

## 9. 변경 파일

```text
services/web-neture/src/lib/api/content.ts                     — 4 함수 계약화 + 오류 코드 + describeApiError
services/web-neture/src/lib/api/index.ts                       — 오류 코드 re-export
services/web-neture/src/pages/operator/HomepageCmsPage.tsx     — loadError + 오류 패널 + 재시도
services/web-neture/src/pages/dashboard/MyContentPage.tsx      — 목록 loadError / KPI kpiError 독립 + 재시도
services/web-neture/src/pages/content/ContentListPage.tsx      — fetch 콜백화 + 재시도 버튼
docs/checks/CHECK-...-V1.md                                    — 본 문서
```

미포함(범위 밖): `NetureResourcesPage.tsx`(공통 템플릿 제약, 코드 무변경) · 동시 세션 소유 파일 일체.
