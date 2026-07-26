# CHECK-O4O-NETURE-SUPPLIER-SPOT-POLICY-LOAD-ERROR-CONTRACT-V1

WO: `WO-O4O-NETURE-SUPPLIER-SPOT-POLICY-LOAD-ERROR-CONTRACT-V1`
선행 IR: `IR-O4O-NETURE-SUPPLIER-REMAINING-C-LOAD-ERROR-CONTRACT-AUDIT-V1` (권장 묶음 3)
작성일: 2026-07-26 (KST)

---

## 1. backend endpoint 계약 (정적 확인)

```text
GET /neture/supplier/spot-policies/offer/:offerId
```

```text
spot-price-policy.controller.ts:61-75
  supplierId = req.user?.supplierId
  if (!supplierId) → 403 { success:false, error:'Supplier access required' }
  policies = await service.listByOffer(req.params.offerId, supplierId)
  → 200 { success: true, data: policies }
  catch → 500 { success:false, error:'Failed to list spot price policies' }

spot-price-policy.service.ts:56-61
  return this.repo.find({ where: { offerId, supplierId }, order: { createdAt: 'DESC' } })
```

| 상황 | 응답 |
|------|------|
| 정상 + 정책 있음 | 200 + `SpotPricePolicy[]` |
| **정상 + 정책 없음** | **200 + `[]`** |
| **offer 미존재** | **200 + `[]`** — 404 개념이 없다 |
| **타인 소유 offer** | **200 + `[]`** — `where` 에 `supplierId` 가 포함되어 결과가 비어 있을 뿐 |
| 권한 없음(`supplierId` 부재) | **403** |
| 서버 오류 | 500 |

### 판정

```text
404 처리 불필요 — endpoint 에 404 경로 자체가 없다.
따라서 not-found 상태는 만들지 않는다 (WO §8 의 "별도 처리 불필요 시 합칠 수 있다" 적용).
403 은 실재하므로 별도 코드로 구분한다.
```

> WO §6 의 "offer 미존재 404" 전제는 이 endpoint 에 해당하지 않는다. 추측하지 않고 코드로 확정했다.

### 추가 확인

| 항목 | 결과 |
|------|------|
| `offerId` 빈 값 호출 | 없음 — `if (!product?.id \|\| !open) return` 가드 |
| 드로어 open 시 offer 확정 여부 | 확정 (`product.id` 필수) |
| mutation 후 재조회 endpoint | 동일 endpoint |

## 2. 기존 `[]` fallback

```ts
catch (error) { console.warn(...); return []; }
return response.data?.data || [];
```

정상 정책 없음 · 조회 실패 · 403 · offer 미존재 · 깨진 payload 가 모두 `[]` 로 수렴했다.

## 3. 적용한 고정 오류 코드와 payload 검증

```text
SUPPLIER_SPOT_POLICIES_LOAD_FAILED
SUPPLIER_SPOT_POLICIES_FORBIDDEN
```

```ts
catch  → status === 403 ? _FORBIDDEN : _LOAD_FAILED  (console.warn 은 원문)
!result?.success || !Array.isArray(result.data) → _LOAD_FAILED
정상 [] → 그대로 반환 (오류 아님)
```

서버 원문·stack trace·응답 본문은 화면에 노출하지 않는다.

## 4. ProductDetailDrawer 상태 구조

```ts
const [spotPolicies, setSpotPolicies] = useState<SpotPricePolicy[] | null>(null); // null = 미수신/실패
const [spotLoading, setSpotLoading] = useState(false);
const [spotError, setSpotError] = useState<null | 'load' | 'forbidden'>(null);
const spotReqRef = useRef(0);   // stale 응답 가드
```

```text
[]                     정상 "정책 없음"
null + spotError       조회 실패 / 권한 없음
배열                    정책 목록
```

## 5. 호출 지점 3곳 — 공통 로더로 통일

```ts
loadSpotPolicies(offerId, keepExisting = false)
```

| # | 지점 | 호출 |
|---|------|------|
| 1 | 드로어 최초 open / offer 전환 | `loadSpotPolicies(product.id)` |
| 2 | 정책 생성 후 | `loadSpotPolicies(product.id, true)` |
| 3 | 정책 상태 변경 후 | `loadSpotPolicies(product.id, true)` |

3곳 모두 정비했다(초기 조회만 정비하고 mutation 후를 방치하는 부분 반영 0).

## 6. 지속 오류 UI

```text
load       스팟 정책을 불러오지 못했습니다.   [다시 시도]
forbidden  이 상품의 스팟 정책을 볼 권한이 없습니다.   (재시도 미제공 — 재시도해도 동일)
```

- 스팟 정책 섹션 **안**에 렌더된다. 토스트로 대체하지 않는다.
- 오류 상태에서 `등록된 스팟 정책이 없습니다` 는 표시하지 않는다(삼항 배타 분기).
- 다른 드로어 섹션(가격 점검, 이미지, 태그 등)은 영향받지 않는다.

## 7. 다시 시도

```text
다시 시도 → loadSpotPolicies(product.id)
```

현재 offerId 의 정책 목록만 재호출한다. 상품 목록 reload·드로어 재오픈·다른 상품 API 재호출 없음.

## 8. mutation 후 재조회 실패 처리

```ts
if (result.success) {
  await loadSpotPolicies(product.id, true);   // keepExisting
}
```

```text
mutation 성공 → 성공 유지 (toast.error 로 뒤집지 않음)
후속 조회 실패 → spotError 만 세우고 기존 spotPolicies 를 비우지 않는다
```

`keepExisting=true` 가 `setSpotPolicies(null)` 을 건너뛰므로 기존 정책 목록이 유지된 채 오류만 표시된다. mutation API(`createSpotPolicy` / `changeSpotPolicyStatus`) 계약은 **무변경**.

## 9. 드로어 상품 전환 처리

```ts
useEffect(() => {
  if (!product?.id || !open) return;
  spotReqRef.current++;      // 진행 중 요청 무효화
  setSpotPolicies(null);
  setSpotError(null);
  setSpotFormOpen(false);
  loadSpotPolicies(product.id);
}, [product?.id, open, loadSpotPolicies]);
```

- offer 전환·재오픈 시 이전 정책 데이터·오류·폼 상태를 먼저 초기화한다.
- `spotReqRef` 로 **stale 응답이 새 offer 를 덮어쓰지 않게** 막는다(요청 id 불일치 시 setState 자체를 건너뜀).
- 공통 상태관리 구조를 새로 만들지 않았다(컴포넌트 지역 ref).

## 10. 오류 주입·복구 결과

프로덕션에서 XHR 가로채기(합성 200/403 응답, 도달 불가 주소)로 정책 요청만 조작. **운영 데이터 write 0.**
계정 상품이 0건이라 드로어를 열기 위해 상품 목록도 합성 1건으로 채웠다(§13).

| 시나리오 | 결과 | 관측값 |
|----------|:---:|--------|
| A 정상 200 + `[]` | PASS | `등록된 스팟 정책이 없습니다` + 추가 버튼, 오류 미표시 |
| B 정상 200 + 합성 정책 | PASS | `합성 스팟 정책` 행 렌더 |
| C 200 + data 비배열 | PASS | 오류 + 다시 시도, **정책 없음 문구 미노출** |
| D 네트워크 실패 | PASS | 동일 |
| E (= C) payload 깨짐 | PASS | 정상 빈 목록으로 흐르지 않음 |
| F **404** | **해당 없음** | endpoint 에 404 경로 없음 (§1) |
| G **403** | PASS | `이 상품의 스팟 정책을 볼 권한이 없습니다.` / 정책 없음 문구·다시 시도 **미노출** |
| H 다시 시도 실패 | PASS | 오류 유지, 다시 시도 유지 |
| I 다시 시도 성공 + `[]` | PASS | 오류 해제 → 정상 빈 상태 |
| J 다시 시도 성공 + 데이터 | PASS | 정책 목록 렌더 |

## 11. 드로어 전환 회귀

| 전환 | 결과 |
|------|:---:|
| 정상 → 정상 | PASS |
| **오류 → 재오픈(정상)** | PASS — 이전 오류 잔존 **0**, 정상 빈 상태로 전환 |
| 정상 → 오류 | PASS — 이전 정책 데이터 잔존 0 |
| 데이터 → 재오픈(빈 목록) | PASS |

로딩 고착 0, stale response overwrite 0(요청 id 가드).

## 12. 라우트·반응형

| route | 결과 |
|-------|:---:|
| `/supplier/products` | 목록 정상, 드로어 open/close 정상, 승인 탭 카운트 정상, 스팟 정책 영역만 독립 오류 |

정상 상태 **콘솔 오류 0**, unhandled rejection 0. 검색·필터·탭 회귀 0.

| 폭 | 결과 |
|----|:---:|
| Desktop 1440×900 | PASS |
| Tablet 768×1024 | PASS — 다시 시도 노출, 잘림 0, scrollWidth 768 = viewport |
| Mobile 390×844 | PASS — 다시 시도 47×16px 노출, 잘림 0, scrollWidth 387 ≤ 390 |

정책 없음 UI 와 오류 UI 가 동시 렌더되는 경우는 전 폭에서 0건(배타 분기).

## 13. 배포 및 프로덕션 smoke

| 항목 | 값 |
|------|-----|
| commit | `2bec5fa26` |
| workflow | `Deploy Web Services (Cloud Run)` — **success** (run 30193006610) |
| jobs | `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01321-2fl` → **`neture-web-01322-m6r`** |

§10~§12 의 모든 검증은 배포된 프로덕션에서 수행했다.

## 14. 무변경 확인

| 항목 | 값 |
|------|-----|
| 스팟 정책 데이터 모델 · 스팟 가격 계산 | **무변경** |
| 정책 생성·수정·삭제·상태 변경 계약 | **무변경** |
| 상품 offer 소유권 정책 | **무변경** |
| 상품 목록 구조 · ProductDetailDrawer IA | **무변경** |
| 공통 API wrapper · 공통 UI Core · 공통 상태관리 | **무변경** |
| dependency / lockfile | **무변경** |
| backend / DB / migration | 0 / 0 / 0 |
| 운영 데이터 write | **0** |
| typecheck | PASS |
| build | PASS (10.87s) |

## 15. 변경 파일

```text
services/web-neture/src/lib/api/supplier.ts                    (API 1종 + 코드 2)
services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx (소비처, 호출 3지점)
```

2 파일 — 같은 구현 커밋(`2bec5fa26`). **API + 소비처 원자적 반영**, 부분 반영 0.

## 16. 실데이터 제한

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 정상 정책 없음 ↔ 오류 구분 | 확인 완료 | 합성 200 + `[]` |
| 정책 목록 렌더 | **합성 200 응답으로 확인** | 실제 스팟 정책 없음. WO §19 허용, 운영 데이터 생성 0 |
| 드로어 진입 자체 | **합성 상품 목록 필요** | 계정 상품 0건 → 상품 목록을 합성 1건으로 채워 드로어를 열었다 |
| mutation 후 재조회 실패 실동작 | **미확인** | 정책 생성·상태 변경 실행에 운영 write 필요 → WO §15 에 따라 미실시. 코드 경로(`keepExisting=true`)는 정적 확인 |
| 서로 다른 offer 간 전환 | **부분 확인** | 합성 상품이 1건이라 동일 offer 재오픈으로 검증. 초기화·stale 가드는 `product?.id` 의존성과 요청 id 로 정적 확인 |

## 17. 후속 항목

| # | 항목 |
|---|------|
| 1 | `WO-O4O-NETURE-SUPPLIER-LIBRARY-EDIT-ITEM-LOOKUP-PAGINATION-V1` — 자료함 101번째 이후 수정 진입 (선행 CHECK §18-1) |
| 2 | IR E 등급 2건 — `getShipment()` / `getOrderCondition()` (backend 404 vs 5xx 계약 확인 필요) |
| 3 | `supplierScreenSets.ts` 상세·mutation 의 `call()` undefined 통과 (우선순위 낮음) |
| 4 | 실데이터(상품 2건 이상 + 스팟 정책) 보유 계정으로 offer 전환·mutation 후 재조회 재검증 |
