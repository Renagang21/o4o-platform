# CHECK-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1

WO: `WO-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1`
선행 IR: `IR-O4O-NETURE-SUPPLIER-REMAINING-C-LOAD-ERROR-CONTRACT-AUDIT-V1` (권장 묶음 1)
작성일: 2026-07-26 (KST)

---

## 1. backend 계약 확인 결과 (정적 소스 확인)

### 1-1. 온보딩 — `GET /neture/supplier/onboarding`

```text
supplier-management.controller.ts:184-196
  data = await onboardingService.getOnboarding(supplierId)
  if (!data) → 404 { error: { code: 'SUPPLIER_NOT_FOUND' } }
  else       → 200 { success: true, data }
  catch      → 500 INTERNAL_ERROR

supplier-onboarding.service.ts:74-78
  supplier = await supplierRepo.findOne({ id: supplierId })
  if (!supplier) return null
  return mapSupplierOnboarding(supplier)
```

**결론 — WO §4-1 의 A/B/C 어디에도 정확히 해당하지 않는다.**

```text
"온보딩 미시작" 이라는 별도 상태가 존재하지 않는다.
서비스는 supplier row 를 매핑해 항상 객체를 반환하며,
미입력 항목은 필드가 비어 있을 뿐이다.
404 SUPPLIER_NOT_FOUND 는 공급자 row 부재 = 오류 상태다.
(requireLinkedSupplier 통과 시 정상적으로는 발생하지 않는다)
```

→ 정상이면 **항상 200 + data 객체**. 따라서 `null` 반환 경로를 아예 제거하고 모든 실패를 throw 하는 것이 계약에 부합한다. **미변경 대상 아님** (WO §4-1 의 C 분기 해당 없음).

> 선행 IR §2 의 "`data` 없음 → `null` (온보딩 미시작)" 기술은 부정확했다. 본 CHECK 가 이를 정정한다.

### 1-2. 품목군 — `GET /neture/supplier/regulated-categories`

```text
supplier-management.controller.ts:273-282
  data = await regulatedCategoryService.listForSupplier(supplierId)
  → 200 { success: true, data }      // 미선택이면 []
  catch → 500 INTERNAL_ERROR
```

**정상 미선택 = 200 + `[]`** 확정.

### 1-3. 중복 select POST 멱등성 — `POST /neture/supplier/regulated-categories`

```text
supplier-regulated-category.service.ts:166-177
  let row = await categoryRepo.findOne({ supplierId, category })
  if (!row) { row = create(...); row = await save(row) }
  return { success: true, data: mapCategory(row, null) }
```

**멱등**이다 (이미 있으면 재생성하지 않음). 중복 POST 로 인한 데이터 손상 위험은 없다.
다만 WO §10 요구대로 조회 실패 중 선택 UI 자체를 차단했으므로 중복 POST 경로도 함께 제거되었다.

## 2. 기존 fallback

```ts
getOnboarding        catch → null    // + response.data?.data ?? null
regulatedCategory.list catch → []    // + response.data?.data ?? []
```

정상 상태·조회 실패·깨진 200 payload 가 모두 같은 값으로 수렴했다.

## 3. 적용한 실패 계약과 오류 코드

```text
SUPPLIER_ONBOARDING_LOAD_FAILED
SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED
```

| 함수 | 성공 | 실패 |
|------|------|------|
| `getOnboarding()` | `SupplierOnboarding` (반환 타입에서 `\| null` 제거) | 4xx·5xx·네트워크·비객체 payload → 고정 코드 throw |
| `regulatedCategory.list()` | `SupplierRegulatedCategory[]` (정상 미선택 `[]` 포함) | 4xx·5xx·네트워크·비배열 payload → 고정 코드 throw |

서버 원문·stack trace 는 `console.warn` 으로만 남긴다.

## 4. payload 검증

```ts
// 온보딩 — 정상은 항상 객체 (§1-1)
if (!data || typeof data !== 'object') throw new Error(SUPPLIER_ONBOARDING_LOAD_FAILED);

// 품목군 — 정상 미선택 [] 은 유효값
if (!Array.isArray(rows)) throw new Error(SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED);
```

새 schema 라이브러리 추가 0 / 응답 구조·필드명 변경 0.

## 5. SupplierProfilePage 상태 구조

```ts
const [regulatedCategories, setRegulatedCategories] =
  useState<SupplierRegulatedCategory[] | null>(null);   // null = 실패/미수신
const [categoriesLoadError, setCategoriesLoadError] = useState(false);
const [onboardingLoadError, setOnboardingLoadError] = useState(false);
```

초기 로딩을 `Promise.all` → **`Promise.allSettled`** 로 바꿔 영역별로 분리했다.

```ts
const [profileRes, onboardingRes, categoriesRes] = await Promise.allSettled([...]);
setOnboardingLoadError(onboardingRes.status === 'rejected');
categoriesRes.status === 'fulfilled'
  ? (setRegulatedCategories(categoriesRes.value), setCategoriesLoadError(false))
  : (setRegulatedCategories(null), setCategoriesLoadError(true));
```

- `null` 자체를 온보딩 오류 표현으로 쓰지 않는다(온보딩은 오류 플래그로만 판단).
- `[]` 자체를 품목군 오류 표현으로 쓰지 않는다(`null` 과 분리).

## 6. 온보딩·품목군 독립 실패 처리

### 온보딩 실패

```text
정산·세금계산서 입력값을 비우지 않는다 (미입력 오인 방지)
섹션 상단에 안내 배너만 추가:
  온보딩 정보를 불러오지 못했습니다.
  아래 값은 최신 상태가 아닐 수 있습니다.  [다시 시도]
```

### 품목군 실패

```text
선택 UI(체크박스 8개) 자체를 오류 UI 로 대체:
  공급 예정 품목군을 불러오지 못했습니다.  [다시 시도]
```

이 방식으로 WO §10 의 금지 4항목을 **구조적으로 동시 차단**했다.

```text
모든 체크박스 해제 표시   → 체크박스가 렌더되지 않음
선택된 품목군 없음 표시   → 동일
운영자 보류 배지 제거     → 섹션 자체가 오류 UI 라 오해 여지 없음
선택·해제 mutation 허용   → 조작할 UI 가 없음
```

## 7. 오류 상태 mutation 처리

품목군 조회 실패 중에는 **선택·해제 UI가 렌더되지 않아** `select()`/`remove()` 호출 경로가 존재하지 않는다. 별도 disabled 플래그 없이 UI 대체만으로 차단된다.

온보딩은 입력·저장 UI 를 유지한다(입력값이 보존되므로 저장 자체를 막을 이유가 없다). mutation API·저장 계약은 무변경이다.

## 8. 다시 시도 방식 — 영역별 단독 재호출

| 영역 | 함수 | 재호출 대상 |
|------|------|-------------|
| 온보딩 | `refreshOnboarding()` | `getOnboarding()` 만 |
| 품목군 | `refreshCategories()` | `regulatedCategory.list()` 만 |

전체 프로필(`getProfile()`) 재호출 없음. 두 함수는 저장·선택 후 재조회에서도 동일하게 사용된다(중복 정의 제거).

## 9. 저장 후 재조회 실패 처리

```text
refreshOnboarding()    실패 → onboardingLoadError = true, 기존 입력값 유지
refreshCategories()    실패 → categoriesLoadError = true, regulatedCategories = null
```

- mutation 성공 자체를 실패로 표시하지 않는다(`handleSaveOnboarding` / `handleToggleCategory` 의 성공 처리는 무변경).
- 후속 조회 실패만 해당 섹션 오류로 표시하며, 화면 값을 임의로 비우지 않는다.

## 10. 오류 주입·복구 결과

프로덕션에서 XHR `open()` URL 재작성(도달 불가 주소)으로 대상 요청만 실패시킴. **운영 데이터 write 0.**

### 10-1. 온보딩 (WO §14-2)

| 시나리오 | 결과 | 관측값 |
|----------|:---:|--------|
| A 정상 | PASS | 오류 미표시, 정산 필드 정상 |
| C/D 네트워크 실패 | PASS | `온보딩 정보를 불러오지 못했습니다` + `최신 상태가 아닐 수 있습니다` + 다시 시도. **품목군 8개·기본 프로필·정산 필드 전부 유지** |
| F 다시 시도 실패 | PASS | 오류 유지, 다시 시도 유지 |
| G/H 다시 시도 성공 | PASS | 오류 해제, 다시 시도 사라짐, 정산 필드 유지 |

### 10-2. 품목군 (WO §14-3)

| 시나리오 | 결과 | 관측값 |
|----------|:---:|--------|
| A 정상 `[]` | PASS | 체크박스 **8개**, 오류 미표시 |
| C/D 네트워크 실패 | PASS | 오류 UI + 다시 시도, **체크박스 0개**(전부 미선택 표시 원천 차단), 온보딩·기본 프로필 정상 |
| F 다시 시도 실패 | PASS | 오류 유지, 체크박스 0개 |
| G 다시 시도 성공 | PASS | 오류 해제, 체크박스 **0 → 8개 복구** |

### 10-3. 부분 실패 (WO §14-4)

| 조합 | 결과 |
|------|:---:|
| 온보딩만 실패 | PASS — 품목군 8개·기본 프로필 유지, 다시 시도 1개 |
| 품목군만 실패 | PASS — 온보딩 정상, 정산 필드 유지, 다시 시도 1개 |
| **둘 다 실패** | PASS — 두 섹션만 오류(다시 시도 **2개**), **기본 프로필 입력 22개 유지**, 전체 오류 화면 전환 **없음**, 값 초기화 0 |

### 10-4. 미실시 시나리오

`B/E`(합성 non-zero·깨진 payload)는 합성 XHR 응답 주입 시 Playwright 세션이 반복 종료되어 미실시했다(§14 참조). 검증 함수는 정적 확인했다.

## 11. 라우트·반응형 회귀

| route | 렌더 | 로딩 고착 | 오탐 오류 | 저장 버튼 | 가로 overflow |
|-------|:---:|:---:|:---:|:---:|:---:|
| `/mypage/business-profile` | OK | 없음 | 없음 | 정상 | 없음 |

정상 상태 **콘솔 오류 0**, unhandled rejection 0. 체크박스 8개·기본 프로필 정상 복원.

| 폭 | 결과 |
|----|:---:|
| Desktop 1440×900 | PASS |
| Tablet 768×1024 | PASS — 다시 시도 2개 노출, 텍스트 잘림 0, scrollWidth 753 ≤ 768 |
| Mobile 390×844 | PASS — 다시 시도 73×30px·89×38px 터치 가능, 잘림 0, scrollWidth 375 ≤ 390 |

체크박스 영역과 오류 UI 가 동시 렌더되는 경우는 전 폭에서 0건(상호 배타 렌더).

## 12. 배포 및 프로덕션 smoke

| 항목 | 값 |
|------|-----|
| commit | `659c56081` |
| workflow | `Deploy Web Services (Cloud Run)` — **success** (run 30191710568) |
| jobs | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01319-lpz` → **`neture-web-01320-kpq`** |

§10~§11 의 모든 검증은 배포된 프로덕션에서 수행했다.

## 13. 무변경 확인

| 항목 | 값 |
|------|-----|
| 공급자 승인 정책 / 프로필 완성도 결합 | **무변경** |
| 온보딩 필수 조건 | **무변경** |
| 품목군 규제 게이트 / 상품 등록 규제 확인 로직 | **무변경** |
| mutation 계약 (`updateOnboarding` / `select` / `remove` / 문서 업로드) | **무변경** |
| 상태 ENUM | **무변경** |
| 공통 API wrapper · 공통 UI Core | **무변경** |
| dependency / lockfile | **무변경** |
| 사이드바 · 프로필 IA | **무변경** |
| backend / DB / migration | 0 / 0 / 0 |
| 운영 데이터 write | **0** |
| typecheck | PASS |
| build | PASS (7.38s) |

## 14. 변경 파일 · 실데이터 제한

```text
services/web-neture/src/lib/api/supplier.ts               (API 2종)
services/web-neture/src/pages/supplier/SupplierProfilePage.tsx (소비처)
```

2 파일 — 같은 구현 커밋(`659c56081`). **API + 소비처 원자적 반영**, 부분 반영 0.

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 정상 상태 ↔ 오류 구분 | 확인 완료 | 계정 품목군 0건 — 본 WO 핵심 회귀 검증에 적합 |
| 선택된 품목군이 있을 때의 체크 상태·보류 배지 | **미확인** | 선택 데이터 없음. 테스트 데이터 생성은 WO 금지. 실패 시 섹션 자체를 대체하므로 배지 은폐 위험은 구조적으로 제거됨 |
| 합성 non-zero·깨진 payload 렌더 (B/E) | **미실시** | Playwright 세션이 합성 XHR 주입에서 반복 종료. 검증 함수는 정적 확인 |
| 저장 후 재조회 실패 실동작 | **미확인** | 저장 mutation 실행에 실데이터·운영 write 필요 → WO 금지 |

## 15. 미반영 함수와 사유

**없음.** 묶음 1 의 2종(`getOnboarding` / `regulatedCategory.list`)을 모두 반영했다.
WO §19 의 "getOnboarding 미변경" 분기는 §1-1 에서 계약이 명확히 확정되어 적용되지 않았다.

## 16. 후속 항목

| # | 항목 |
|---|------|
| 1 | `WO-O4O-NETURE-SUPPLIER-LIBRARY-LOAD-ERROR-CONTRACT-V1` (IR 묶음 2) — `getLibraryItems()` + 소비처 2곳. `limit:100` pagination 결함 동반 판단 |
| 2 | `WO-O4O-NETURE-SUPPLIER-SPOT-POLICY-LOAD-ERROR-CONTRACT-V1` (IR 묶음 3) — `listSpotPolicies()`, backend 404 계약 확인 선행 |
| 3 | IR E 등급 2건 — `getShipment()` / `getOrderCondition()` |
| 4 | `supplierScreenSets.ts` 상세·mutation 의 `call()` undefined 통과 (우선순위 낮음) |
| 5 | 실데이터 보유 계정으로 품목군 선택 상태·보류 배지·저장 후 재조회 재검증 |
