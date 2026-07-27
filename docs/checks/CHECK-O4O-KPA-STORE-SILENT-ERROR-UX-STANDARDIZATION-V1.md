# CHECK-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1

**WO:** WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1
**일자:** 2026-07-27
**범위:** KPA `/store` 4개 화면의 silent error UX 정비 (API 계약·DB·기능 흐름 변경 0)

---

## 1. 정비 전 오류 처리 (read-only 조사)

| 화면 | 작업 | 정비 전 catch 처리 | 사용자 표시 | 상태 훼손 | 재시도 |
|------|------|------------------|------------|----------|-------|
| **StoreAssetsPage** | 목록 조회 | `setError(e.message)` | 있음 — 오류 + 다시 시도 (`StoreAssetsPanel` error 계약) | 없음 | 있음 |
| StoreAssetsPage | publish 토글 | `catch { /* Silently fail */ }` | **없음** | 없음(상태 미갱신) | 버튼은 복구되나 안내 없음 |
| StoreAssetsPage | 일괄 상태 변경 | `allSettled` 후 실패분 **무시** | **없음** | 없음 | 없음 |
| **RecruitmentApplications** | 목록 조회 | `catch { setRows([]) }` | **"신청한 판매자 모집이 없습니다"로 위장** | **기존 rows 삭제** | 없음 |
| RecruitmentApplications | 신청 취소 | `window.alert` | 있음 | 없음 | 버튼 재사용 가능 |
| **ProductMarketingPage** | 초기 조회 | `catch { /* silent */ }` + `success:false` 무시 | "데이터를 불러올 수 없습니다"(오류·빈 상태 미구분) | 없음 | 없음 |
| ProductMarketingPage | 연결 해제 | `catch { /* silent */ }` | **없음** | 없음 | pending 없음(중복 클릭 가능) |
| **PharmacySellPage** | 목록+채널 조회 | `catch { console.error }` | **"진열 상품이 없습니다"로 위장** | 없음 | 없음 |
| PharmacySellPage | 진열 토글 | `setActionError` | 있음(기존) | 없음 | pending 없음(중복 클릭 가능) |
| PharmacySellPage | 채널 설정 조회/저장 | `loadError` / `saveResult` | 있음(기존) | 없음 | 있음 |

**기존 재사용 자산:** `StoreAssetsPanel` 의 error 계약(오류 문구 + `다시 시도`), `PharmacySellPage` 의 인라인 오류 배너 스타일.
새 공통 컴포넌트·package·전역 오류 프레임워크를 만들지 않고 위 패턴을 그대로 재사용했다.

---

## 2. 화면별 변경 내용

### 2.1 StoreAssetsPage

- `actionError` state 추가 — **조회 오류(`error`)와 분리**. 조회 오류는 기존 `StoreAssetsPanel` 계약 그대로 둔다.
- publish 토글 실패 → `게시 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.` 인라인 배너.
  실패 시 `publishStatus` 를 갱신하지 않으므로 **이전 상태 그대로 유지**(성공으로 표시하지 않음).
- 일괄 변경 부분 실패 → `N건의 게시 상태를 변경하지 못했습니다. 해당 항목은 이전 상태로 남아 있습니다.`
- pending: 기존 `updatingId`(단건) 유지 — `finally` 에서 해제되어 재시도 가능.

### 2.2 StoreRecruitmentApplicationsPage

- `catch { setRows([]) }` **제거** → `loadError` state 도입, **rows 를 지우지 않는다**.
- 실패 + 데이터 없음 → 오류 상태(제목/안내/`다시 시도`), **빈 상태 문구 미표시**.
- 실패 + 기존 데이터 있음 → 목록 유지 + 상단 인라인 안내 + `다시 시도`.
- 재시도는 기존 `load()` 재호출.
- `StoreRecruitmentApplicationsView`(@o4o/store-ui-core)는 error prop 이 없어 **래퍼에서 렌더** — 공통 패키지 미변경(WO 12 준수).

### 2.3 ProductMarketingPage

- `loadError` 추가. `catch` 뿐 아니라 **`res.success === false` 도 실패로 취급**(이전에는 조용히 통과).
- 실패 + data 없음 → 오류 상태 + `다시 시도`. (기존 `!data` 안내와 분리)
- 재조회 실패 + data 있음 → 내용 유지 + 인라인 안내 + `다시 시도`.
- `unlinkingId` pending 추가 — 요청 중 해당 버튼 disabled, 중복 클릭 차단.
- unlink 실패 → `연결을 해제하지 못했습니다.` 배너. 목록에서 제거하지 않아 **연결 상태 유지**.
- 단일 조회 API(`getProductMarketing`) 하나로 화면 전체가 구성되어 **페이지 단위 오류**가 정합(영역 분리 불필요).

### 2.4 PharmacySellPage

- `Promise.all` → **`Promise.allSettled`** 로 교체해 필수/보조 실패를 분리 (WO 7.4 권장안).
  - **핵심(상품 목록) 실패** → 페이지 오류 상태 + `다시 시도`, 빈 상태 문구 미표시
  - **보조(채널 개요) 실패** → 상품 목록 유지 + 인라인 안내 + `다시 시도`
- 재조회 실패 + 기존 목록 있음 → 목록 유지 + 상단 인라인 안내.
- `togglingId` pending 추가 — 요청 중 버튼 `변경 중...` + disabled(중복 제출 방지).
- 토글 실패 시 `loadData()` 미호출 → **기존 진열 상태 유지**(기존 `actionError` 안내 유지).
- 채널 설정 모달(`ChannelSettingsPanel`)의 `loadError`/`saveResult` 는 이미 정상 → **변경 없음(NO-OP)**.

---

## 3. 오류 · 빈 상태 구분

모든 대상 화면에서 상호 배타적으로 렌더한다.

```
loading                       -> 로딩 상태
API 성공 + rows.length === 0  -> 빈 상태 문구
API 실패 (데이터 없음)          -> 오류 상태 + 다시 시도  (빈 상태 문구 표시 안 함)
API 실패 (기존 데이터 있음)      -> 기존 데이터 유지 + 인라인 안내 + 다시 시도
```

---

## 4. 추가한 재시도

| 화면 | 재시도 위치 | 호출 |
|------|-----------|------|
| StoreAssetsPage | (기존) 조회 오류 패널 | `onRefresh` → `fetchItems` |
| RecruitmentApplications | 오류 상태 / 인라인 배너 | `load()` |
| ProductMarketingPage | 오류 상태 / 인라인 배너 | `fetchData()` |
| PharmacySellPage | 오류 상태 / 인라인 배너(목록·채널) | `loadData()` |

mutation 실패 배너는 재시도 버튼 대신 **원래 액션 버튼이 다시 활성화**되어 재실행 가능하다(닫기 제공).

---

## 5. mutation 실패 시 상태 보존

| 액션 | 실패 시 |
|------|--------|
| publish 토글 | `publishStatus` 미갱신 → 이전 상태 유지 |
| publish 일괄 | 성공분만 반영, 실패분은 이전 상태 유지 + 건수 안내 |
| unlink | 목록 미갱신 → 연결 유지 |
| 진열 토글 | `loadData()` 미호출 → 이전 상태 유지 |

**optimistic update 는 애초에 없었고 새로 도입하지도 않았다** — 모두 서버 응답 확인 후에만 화면 상태를 바꾼다(rollback 불필요).

---

## 6. pending · 중복 제출 방지

| 액션 | pending |
|------|---------|
| publish 토글 | `updatingId` (기존) |
| unlink | `unlinkingId` (**추가**) — 해당 버튼만 disabled |
| 진열 토글 | `togglingId` (**추가**) — `변경 중...` 표시, 요청 중 재클릭 차단 |
| 신청 취소 | `cancellingId` (기존) |
| 채널 설정 저장 | `saving` (기존) |

---

## 7. 변경 파일

```
services/web-kpa-society/src/pages/pharmacy/StoreAssetsPage.tsx
services/web-kpa-society/src/pages/pharmacy/StoreRecruitmentApplicationsPage.tsx
services/web-kpa-society/src/pages/pharmacy/ProductMarketingPage.tsx
services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx
```

## 8. API · DB · 공통 모듈 영향

| 항목 | 결과 |
|------|------|
| 백엔드 endpoint · payload | **0** |
| DB · migration · 운영 데이터 | **0** |
| `@o4o/store-ui-core` · `@o4o/store-asset-policy-core` | **0** (래퍼에서만 처리) |
| 사이드바 · route | **0** |
| GlycoPharm · K-Cosmetics | **0** |
| 새 공통 오류 프레임워크 · ErrorBoundary · 로깅 플랫폼 | **도입 0** |

---

## 9. 정적 확인

```
빈 catch 블록                                 -> 0건
catch -> setRows([]) / setData(null) 류        -> 0건
"// silent" / "Silently fail" 주석              -> 0건
console.error|warn                            -> 5건 (전부 사용자 안내 state 와 동반)
```

| console 위치 | 동반 사용자 안내 |
|-------------|----------------|
| `PharmacySellPage:146` 목록 조회 | `setListingsError` |
| `PharmacySellPage:153` 채널 조회 | `setChannelsError` |
| `PharmacySellPage:179` 진열 토글 | `setActionError` |
| `PharmacySellPage:427` 채널 설정 조회 | `setLoadError` (기존) |
| `PharmacySellPage:480` 채널 설정 저장 | `setSaveResult` (기존) |

사용자 액션 관련 silent catch 0 / 빈 배열 위장 0 / console 만 남는 실패 0.

---

## 10. typecheck · build · test

| 검증 | 결과 |
|------|------|
| `npx tsc --noEmit` | **PASS** (에러 0) |
| `pnpm --filter @o4o/web-kpa-society build` | **PASS** (built in 36.80s) |
| 단위 테스트 | **미수행** — 이 서비스에 프론트 테스트 기반 없음(test script·vitest/jest config·기존 test 파일 0). WO 13.2 "새 환경 구축이 과도하면 신설하지 않는다" 에 따라 typecheck·build·브라우저 smoke 로 대체 |

> build 1회차는 `tsc` 단계에서 **JS heap OOM**(환경 메모리 압박, 코드 오류 아님)으로 실패했고
> `NODE_OPTIONS=--max-old-space-size=8192` 로 재실행하여 PASS. 동일 세션 내 직전 빌드들은 기본 설정으로 성공했다.

---

## 11. 브라우저 오류 smoke

배포: commit `015e71128` 포함 `Deploy Web Services (Cloud Run)` **success** (`ca035f9e1` 기준 — 병렬 세션 push 로 중간 run 이 concurrency 취소되어, 내 커밋을 포함한 후속 run 성공을 확인 후 실행).
Playwright(chromium) + **request abort** 로 실패 재현 — 요청이 서버에 도달하지 않으므로 **운영 데이터 변경 0**.
매장 owner 계정 사용(자격증명 환경변수 주입).

### 11.1 PharmacySellPage `/store/commerce/products/b2c`

| # | 시나리오 | 결과 |
|---|---------|------|
| 1a | 정상 | 오류문구 없음, 빈 상태 문구 없음(데이터 있음) |
| **1b** | `/pharmacy/products/listings` 차단 | **오류문구 표시 / 빈 상태 문구 미표시 / `다시 시도` 노출** |
| 1c | 차단 해제 후 `다시 시도` | 오류 사라짐, 정상 복귀 |
| **1d** | `/store-hub/channels` 만 차단 | **채널 오류 인라인 표시 + 상품 목록 영역은 정상 유지** (필수/보조 분리 실증) |

### 11.2 StoreRecruitmentApplicationsPage `/store/commerce/recruitment-applications`

| # | 시나리오 | 결과 |
|---|---------|------|
| 2a | 정상 | 빈 상태 문구 `신청한 판매자 모집이 없습니다` |
| **2b** | `/partner/applications/mine` 차단 | **오류문구 표시 / 빈 상태 위장 없음(false) / `다시 시도` 노출** |
| 2c | 차단 해제 후 `다시 시도` | 오류 사라짐 + 빈 상태 정상 복귀 |

### 11.3 ProductMarketingPage `/store/commerce/products/:id/marketing`

| # | 시나리오 | 결과 |
|---|---------|------|
| 3a | 정상 | 화면 렌더, 오류문구 없음 |
| **3b** | `/…/marketing` 차단 | **오류문구 + `다시 시도` 표시, 구 문구(`데이터를 불러올 수 없습니다`) 미표시** |
| 3c | 차단 해제 후 `다시 시도` | 오류 사라짐 + 화면 복귀 |

### 11.4 StoreAssetsPage `/store/content` — publish 토글 실패

| # | 시나리오 | 결과 |
|---|---------|------|
| 4a | 정상 진입 | 토글 가능 자산 2건 (`button[title="클릭하여 상태 변경"]`) |
| **4b** | `PATCH /kpa/store-assets/{id}/publish` 차단 후 클릭 | **오류배너 표시** / **상태 라벨 유지(`초안` → `초안`)** / **버튼 disabled 해제(재시도 가능)** / 배너 `닫기` 동작 |

> 1차 시도에서 4b 가 false 로 나온 것은 셀렉터를 상태 토글이 아닌 **필터 칩**에 맞춘 스크립트 오류였고,
> 실제 토글 컨트롤(`button[title="클릭하여 상태 변경"]`)로 다시 실행해 위 결과를 확인했다.

**미실행:** unlink 실패 / publish 일괄 실패 — 테스트 매장에 연결된 마케팅 자산·다중 선택 대상이 없어 UI 상 재현 불가.
해당 경로는 코드상 조회 실패 경로와 동일한 패턴(pending → 실패 시 상태 미갱신 + 배너)이며 typecheck·build 로만 검증했다.

---

## 12. 남은 오류 UX · 후속 항목

| 항목 | 내용 |
|------|------|
| 대상 외 화면 | 본 WO 는 감사에서 지목된 4개 화면만 정비. `/store` 의 다른 화면에도 동일 패턴이 있을 수 있어 후속 감사 권장 |
| 공통 패키지 error 계약 | `StoreRecruitmentApplicationsView` 는 error prop 이 없어 래퍼가 뷰를 대체 렌더한다. 공통 패키지에 error 계약을 추가하면 3서비스 일관성이 오르지만 store-ui-core 변경이 필요해 별도 WO 대상 |
| 오류 문구 | 백엔드 message 를 그대로 노출하는 기존 지점(`actionError = e?.message`)이 남아 있다. 내부 코드·SQL 노출 위험은 낮으나 사용자 문구 정규화는 후속 과제 |
| 테스트 기반 | 프론트 단위 테스트 환경 부재 — 오류/빈 상태 회귀 자동 검증 불가 |
