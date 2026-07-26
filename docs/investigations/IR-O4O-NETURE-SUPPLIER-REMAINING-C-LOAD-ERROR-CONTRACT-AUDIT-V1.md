# IR-O4O-NETURE-SUPPLIER-REMAINING-C-LOAD-ERROR-CONTRACT-AUDIT-V1

조사일: 2026-07-26 (KST) · 기준: `origin/main` 동기 상태
선행: `IR-O4O-NETURE-SUPPLIER-API-LOAD-ERROR-CONTRACT-AUDIT-V1` ·
`CHECK-…-CONTENT-DISTRIBUTION-LOAD-ERROR-CONTRACT-V1` · `CHECK-…-TABLET-LIST-PERSISTENT-ERROR-STATE-V1`

**성격: read-only 조사.** 코드 0 / API 0 / UI 0 / backend 0 / DB 0 / migration 0 / 배포 0 / 운영 데이터 접근·write 0.

---

## 1. 대상 4종 정의 위치와 endpoint

| 함수 | 정의 | endpoint |
|------|------|----------|
| `supplierApi.getLibraryItems()` | `lib/api/supplier.ts:869` | `GET /neture/library` |
| `supplierApi.listSpotPolicies(offerId)` | `lib/api/supplier.ts:1177` | `GET /neture/supplier/spot-policies/offer/:offerId` |
| `supplierOnboardingApi.getOnboarding()` | `lib/api/supplier.ts:1299` | `GET /neture/supplier/onboarding` |
| `supplierRegulatedCategoryApi.list()` | `lib/api/supplier.ts:1427` | `GET /neture/supplier/regulated-categories` |

## 2. 정상 응답 구조

| 함수 | 성공 payload | 정상 "없음" |
|------|--------------|-------------|
| `getLibraryItems` | `{ data: { items: SupplierLibraryItem[] } }` | `items: []` |
| `listSpotPolicies` | `{ data: SpotPricePolicy[] }` | `[]` |
| `getOnboarding` | `{ data: SupplierOnboarding }` | `data` 없음 → `null` (온보딩 미시작) |
| `regulatedCategory.list` | `{ data: SupplierRegulatedCategory[] }` | `[]` (선택한 품목군 없음) |

## 3. 현재 실패 fallback

```ts
getLibraryItems      catch → console.warn → return []            // + result.data?.items || []
listSpotPolicies     catch → console.warn → return []            // + response.data?.data || []
getOnboarding        catch → console.warn → return null          // + response.data?.data ?? null
regulatedCategory.list catch → console.warn → return []          // + response.data?.data ?? []
```

4종 모두 **API 레벨에서 실패를 정상 기본값으로 확정**한다. 추가로 200 이지만 payload 가 깨진 경우(`data` 누락)도 같은 기본값으로 흐른다.

## 4. 전체 소비처 (전수 조사)

함수명 + 반환값 별칭(`libraryItems` / `spotPolicies` / `onboarding` / `regulatedCategories`)으로 검색했다.

| 함수 | 소비처 | route | 호출 시점 |
|------|--------|-------|-----------|
| `getLibraryItems` | `SupplierLibraryPage.tsx:76` | `/supplier/library` | 목록 진입 |
| | `SupplierLibraryFormPage.tsx:66` | `/supplier/library/:id/edit` (수정 모드) | 폼 prefill |
| `listSpotPolicies` | `ProductDetailDrawer.tsx:393` | `/supplier/products` (드로어) | 드로어 open |
| | 동 `:433`, `:445` | 동일 | 정책 생성·수정 후 재조회 |
| `getOnboarding` | `SupplierProfilePage.tsx:163` | `/mypage/business-profile` | 초기 `Promise.all` |
| | 동 `:280` | 동일 | 저장 후 재조회 |
| `regulatedCategory.list` | `SupplierProfilePage.tsx:164` | `/mypage/business-profile` | 초기 `Promise.all` |
| | 동 `:363` | 동일 | 선택·해제 후 재조회 |

**미사용 함수 없음.** 4종 모두 실제 소비처가 존재한다.

## 5. 화면별 오류·빈 상태 처리

| 소비처 | catch | 오류 UI | 빈 상태 UI | 다시 시도 |
|--------|:---:|:---:|------|:---:|
| `SupplierLibraryPage` | **없음** (API 가 삼킴) | 없음 | 자료 0건 안내 | 없음 |
| `SupplierLibraryFormPage` (수정) | **없음** | `자료를 찾을 수 없습니다.` (오인) | — | 없음 |
| `ProductDetailDrawer` (스팟) | **없음** | 없음 | `spotPolicies.length === 0` → 정책 없음 | 없음 |
| `SupplierProfilePage` (온보딩) | **없음** | 없음 | 필드 공백 | 없음 |
| `SupplierProfilePage` (품목군) | **없음** | 없음 | 체크박스 전부 해제 | 없음 |

전 소비처가 API 의 기본값을 그대로 신뢰한다. **정상 0건과 오류를 구분하는 화면이 하나도 없다.**

## 6. A/B/C/D/E 재분류

| # | 함수 | 등급 | 근거 |
|---|------|:---:|------|
| 1 | `regulatedCategory.list()` | **C** | 실패 → `[]` → 선택한 품목군이 **미선택으로 표시**. `운영자 보류(suspended)` 배지도 사라짐 |
| 2 | `getLibraryItems()` | **C** | 실패 → `[]` → 목록은 "자료 없음", **수정 모드는 `자료를 찾을 수 없습니다.` 로 오인** |
| 3 | `listSpotPolicies()` | **C** | 실패 → `[]` → "등록된 스팟 정책 없음" 으로 표시 |
| 4 | `getOnboarding()` | **C** | 실패 → `null` → 온보딩 **미시작과 동일**하게 표시(입력 필드 공백) |

**일괄 C 가 맞았다.** 다만 §7 위험도는 서로 다르다. D(의도적 fail-open)로 볼 근거는 어느 함수에도 코드·주석·UX 상 존재하지 않았다(선행 `getProfile()`/AI 계열과 달리 fail-open 을 명시한 문서가 없음).

### E 등급으로 분리한 판단 보류 항목

| 항목 | 사유 |
|------|------|
| `getOnboarding()` 의 `null` 의미 | backend 가 온보딩 미시작 시 **200 + `data` 없음** 을 주는지, **404** 를 주는지 확인 필요. 전자면 `null`(정상 미시작)과 실패를 구분하려면 catch 만 throw 로 바꾸면 되고, 후자면 상세 조회 패턴(404→null)을 써야 한다 |
| `listSpotPolicies()` 의 정책 부재 | 정책 0건이 "스팟가 미적용" 인지 "정책 조회 불가" 인지는 화면상 동일. backend 가 offer 미존재 시 404 를 주는지 확인 필요 |

## 7. 위험도

| # | 함수 | 위험도 | 오도되는 판단 |
|---|------|:---:|---------------|
| 1 | `regulatedCategory.list()` | **P1** | 공급 예정 품목군 선택 상태·운영자 보류 배지 은폐 |
| 2 | `getLibraryItems()` | **P1** | 수정 모드에서 기존 자료를 "없음" 으로 오인 → 폼 공백 |
| 3 | `getOnboarding()` | **P2** | 정산·세금계산서 정보가 미입력처럼 보임 |
| 4 | `listSpotPolicies()` | **P2** | 스팟 정책 없음으로 오인 |

### P0 없음 — 규제 게이트 재확인 결과

`regulatedCategory.list()` 를 P0 으로 올리지 않은 근거:

```text
SupplierProfilePage.tsx:795 주석 및 화면 안내
  "선택-only — 번호/PDF/검토요청은 프로필 단계에서 제거.
   규제 적합성은 상품 등록·운영자 확인 단계."
```

- 이 목록은 **선택 UI 의 체크 상태 표시**에만 쓰인다(`regulatedCategories.find(...)`).
- 실제 규제 게이트는 **상품 등록·운영자 확인 단계의 backend** 다. 프론트 목록이 비어도 규제 상품이 그대로 노출되지는 않는다.
- 따라서 "규제 대상이 없는 것처럼 보여 잘못된 등록·노출 가능"(WO §4-4 우려)은 **성립하지 않는다.**

다만 P1 로 두는 이유:

```text
이미 선택한 품목군이 미선택으로 보임
→ 중복 select() POST 유발 가능 (backend 멱등성 미확인 — §10)
운영자 보류(suspended) 배지가 사라져 제재 상태를 인지하지 못함
```

### `getLibraryItems()` 수정 모드 — 별도 결함 동반

```ts
const items = await supplierApi.getLibraryItems({ limit: 100 });
const item = items.find((i) => i.id === id);
if (item) { …prefill… } else { setError('자료를 찾을 수 없습니다.'); }
```

두 가지 문제가 겹친다.

```text
1) 조회 실패 → [] → '자료를 찾을 수 없습니다.' (실패를 미존재로 오인)
2) limit:100 하드코딩 → 101번째 이후 자료는 정상 응답에서도 동일 증상
```

2번은 본 IR 범위(오류 계약) 밖의 **기존 pagination 결함**이며 별도 기록 대상이다.

## 8. 구현 시 API + 소비처 범위

| 함수 | API 변경 | 소비처 | 공유 컴포넌트 | backend 확인 |
|------|:---:|:---:|:---:|:---:|
| `regulatedCategory.list()` | 1 | 1 파일 (`SupplierProfilePage`, 2 호출 지점) | 없음 | 불필요 |
| `getOnboarding()` | 1 | 1 파일 (`SupplierProfilePage`, 2 호출 지점) | 없음 | **필요** (200+빈 data vs 404) |
| `getLibraryItems()` | 1 | 2 파일 (`SupplierLibraryPage`, `SupplierLibraryFormPage`) | 없음 | 불필요 |
| `listSpotPolicies()` | 1 | 1 파일 (`ProductDetailDrawer`, 3 호출 지점) | **드로어는 상품 목록에 내장** — 목록 페이지 회귀 확인 필요 | **필요** (offer 미존재 404 여부) |

## 9. 묶음 가능 여부

권장 묶음 기준(같은 API 파일 · 같은 소비처 · 같은 업무 의미 · 같은 오류 UI 패턴) 적용 결과:

### 묶음 1 — 공급자 프로필 (권장)

```text
regulatedCategory.list() + getOnboarding()
```

- 소비처가 **동일 파일·동일 `Promise.all`** (`SupplierProfilePage:161-165`).
- 업무 의미가 같다(공급자 프로필 보조 정보).
- 오류 UI 패턴도 동일하게 섹션 단위 실패 표시로 처리 가능.
- 단 `getOnboarding()` 은 §10 backend 확인이 선행되어야 한다. 확인 결과에 따라 **온보딩만 후속으로 분리**할 수 있다.

### 묶음 2 — 라이브러리 (단독)

```text
getLibraryItems()
```

- 소비처 2 파일이지만 성격이 다르다(목록 vs 폼 prefill). 폼 쪽은 `not-found` 와 `error` 분리가 필요해 선행 WO(주문 상세)의 패턴을 따른다.

### 묶음 3 — 스팟 정책 (단독)

```text
listSpotPolicies()
```

- 소비처가 드로어 1곳이지만 **상품 목록 페이지에 내장**되어 회귀 범위가 다르다.
- §10 backend 확인 선행.

**묶지 않을 것**: 프로필(묶음 1)과 라이브러리·스팟(묶음 2·3)은 업무 의미·화면·회귀 범위가 모두 달라 하나의 구현 WO 로 묶지 않는다.

## 10. backend 계약 확인 필요 항목

| # | 확인 대상 | 질문 |
|---|-----------|------|
| 1 | `GET /neture/supplier/onboarding` | 온보딩 미시작 시 **200 + `data` 없음** 인가 **404** 인가 |
| 2 | `GET /neture/supplier/spot-policies/offer/:offerId` | offer 미존재·권한 없음 시 **404** 인가 **200 + []** 인가 |
| 3 | `POST /neture/supplier/regulated-categories` | 이미 선택된 category 재선택 시 **멱등** 인가 **409** 인가 (§7 중복 POST 위험 평가용) |

1·2 는 실패 계약 설계에 직접 영향한다. 3 은 위험도 확정용이며 구현 필수 조건은 아니다.

> 본 IR 은 read-only 이므로 API 호출·DB 조회를 하지 않았다. 위 3건은 **backend 소스 정적 확인** 또는 후속 WO 의 선행 조사 단계에서 처리한다.

## 11. 결과 표

| 함수 | 정의 | endpoint | 현재 fallback | 소비처 수 | 주요 route | 0건↔오류 구분 | 등급 | 위험도 | 권장 조치 | 후속 WO |
|------|------|----------|---------------|:---:|------------|:---:|:---:|:---:|-----------|---------|
| `regulatedCategory.list()` | `supplier.ts:1427` | `/neture/supplier/regulated-categories` | `[]` | 1 파일 | `/mypage/business-profile` | ✗ | C | P1 | 고정 코드 throw + 섹션 실패 표시 | 묶음 1 |
| `getOnboarding()` | `supplier.ts:1299` | `/neture/supplier/onboarding` | `null` | 1 파일 | `/mypage/business-profile` | ✗ | C (E 보류) | P2 | backend 확인 후 throw | 묶음 1 |
| `getLibraryItems()` | `supplier.ts:869` | `/neture/library` | `[]` | 2 파일 | `/supplier/library` | ✗ | C | P1 | throw + 목록/폼 각각 상태 분리 | 묶음 2 |
| `listSpotPolicies()` | `supplier.ts:1177` | `/neture/supplier/spot-policies/offer/:id` | `[]` | 1 파일 | `/supplier/products` (드로어) | ✗ | C (E 보류) | P2 | backend 확인 후 throw | 묶음 3 |

## 12. 권장 후속 WO 순서

```text
1. WO-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1
   regulatedCategory.list() + getOnboarding()
   (getOnboarding 은 §10-1 확인 후 포함 여부 확정)

2. WO-O4O-NETURE-SUPPLIER-LIBRARY-LOAD-ERROR-CONTRACT-V1
   getLibraryItems() + 목록/폼 소비처 2곳
   ※ limit:100 하드코딩 pagination 결함도 함께 판단(범위 확대 시 분리)

3. WO-O4O-NETURE-SUPPLIER-SPOT-POLICY-LOAD-ERROR-CONTRACT-V1
   listSpotPolicies() (§10-2 확인 후)
```

이와 별개로 남은 항목:

```text
IR E 등급 2건 — getShipment() / getOrderCondition()
  (선행 IR 에서 이월, backend 404 vs 5xx 계약 확인 필요)
supplierScreenSets.ts 상세·mutation 함수의 call() undefined 통과
  (CHECK-…-TABLET-LIST-… §18-3, 우선순위 낮음)
```

## 13. 변경 0 확인

| 항목 | 값 |
|------|-----|
| 코드 변경 | **0** |
| API 계약 변경 | **0** |
| UI 변경 | **0** |
| backend / DB / migration | 0 / 0 / 0 |
| 배포 | **0** |
| 운영 데이터 접근·write | **0** |
| 조사 방식 | 정적 코드 분석 전용 (프로덕션 호출·브라우저 실행 없음) |
