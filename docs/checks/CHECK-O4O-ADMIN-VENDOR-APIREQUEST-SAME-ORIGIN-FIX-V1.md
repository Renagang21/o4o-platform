# CHECK-O4O-ADMIN-VENDOR-APIREQUEST-SAME-ORIGIN-FIX-V1

> WO: `WO-O4O-ADMIN-VENDOR-APIREQUEST-SAME-ORIGIN-FIX-V1`
> **결과: HOLD — 코드 변경 없음 · 배포 없음**
> 사유: WO §4.3 *"backend route가 없으면 HOLD로 보고한다"* 및 §0 HOLD 조건 2개 충족

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 시점 main | `897e339f6c95289f4b5c573dc888f7d2b74cdd06` (clean) |
| 코드 변경 | **없음** |
| 배포 | **없음** (admin `o4o-admin-dashboard-01100-f5f` 유지 · api `o4o-core-api-03268-cq2` 유지) |
| 조사 일자 | 2026-08-10 |

---

## 2. `apiRequest` live 호출 재확인 결과

제네릭 인지 패턴 `apiRequest\s*(<|\()` 으로 재스캔했다.

| 위치 | 호출 | method | path |
|---|---|---|---|
| `api/vendor/products.ts:42` | `getProducts` | GET | `/vendor/products` |
| `api/vendor/products.ts:49` | `getProduct` | GET | `/vendor/products/${id}` |
| `api/vendor/products.ts:55` | `createProduct` | POST | `/vendor/products` |
| `api/vendor/products.ts:62` | `updateProduct` | PUT | `/vendor/products/${id}` |
| `api/vendor/products.ts:69` | `deleteProduct` | DELETE | `/vendor/products/${id}` |
| `api/vendor/products.ts:75` | `approveProduct` | POST | `/vendor/products/${id}/approve` |
| `api/vendor/products.ts:81` | `rejectProduct` | POST | `/vendor/products/${id}/reject` |

**총 7건 · 전부 `/vendor/products` 계열 · import 지점은 `api/vendor/products.ts:5` 단 1곳.**
(직전 WO 보고와 일치. 7건 초과 증가 없음 → 해당 HOLD 조건은 미충족.)

### 도달 가능한 live 경로

```text
/supplierops/*                            routes/apps.routes.tsx:147
  └ /supplierops/products                 SupplierOpsRouter.tsx:43   → "상품 추가" 버튼
      └ /supplierops/products/new         SupplierOpsRouter.tsx:44   ProductSearchPage (master 선택)
          └ /supplierops/products/create  SupplierOpsRouter.tsx:45   ProductCreatePage
              └ SupplierProductForm.tsx:139  createVendorProduct(data)   ← 실제 제출 경로
```

`components/vendor/ProductApprovalManager.tsx` 도 같은 모듈을 import 하나 **소비처 0건(unrouted)** 이다.

---

## 3. 스캐너 오판 원인 (IR 보정)

선행 IR 의 스캐너 패턴은 다음과 같았다.

```js
['apiRequest', /(?<![.\w])apiRequest\s*\(/g]
```

호출부는 전부 **제네릭 타입 인자**를 동반한다 (`apiRequest<Product>('/vendor/products/…')`).
`apiRequest` 와 `(` 사이에 `<Product>` 가 끼어 `\s*\(` 가 매칭에 실패했고, **7건 전부 미탐**되어
IR 이 이 파일을 "호출부 0건 dead helper" 로 잘못 기록했다.

보정 패턴: `apiRequest\s*(?:<[^>]*>)?\s*\(`
**같은 유형의 미탐이 IR 전체에 더 있을 수 있다** → 후속 `WO-O4O-ADMIN-APIREQUEST-SCANNER-RECHECK-V1`.

---

## 4. 결함 재현 — "성공처럼 보이는 실패" 실측

`apps/admin-dashboard/src/api/apiRequest.ts:20` 은 `/api${endpoint}` 로 **admin 오리진에** `fetch` 한다.
`apps/admin-dashboard/Dockerfile:9-21` 의 nginx 에는 `/api` reverse proxy 가 없고 `location /` SPA fallback 뿐이다.

프로덕션 실측:

```text
GET https://admin.neture.co.kr/api/vendor/products
  → status=200   content-type=text/html   size=2141
  → 본문: <!doctype html><html lang="ko"> …   (index.html)
```

동작 결과:

```text
response.ok === true       →  apiRequest 의 !response.ok 오류 분기를 통과
response.json()            →  HTML 파싱 실패로 throw
SupplierProductForm:143-145 catch  →  toast.error('제품 저장에 실패했습니다')
```

즉 사용자에게는 **원인이 지워진 일반 저장 실패**로 표시된다.
404 도 아니고 네트워크 오류도 아니어서 진단이 불가능하다 — OperatorsPage silent failure 와 동일 계열.

---

## 5. HOLD 사유 — canonical endpoint 부재

### 5-1. backend 에 `vendor/products` route 가 존재하지 않음

**소스 기준**

```text
apps/api-server/src/bootstrap/register-routes.ts   'vendor' mount        0건
apps/api-server/src 전역                            router '/vendor…'     0건
```

api-server 에서 `vendor` 문자열이 잡히는 파일은 role 명·migration·swagger·통계 컨트롤러뿐이며 **route 정의가 아니다.**

**프로덕션 실측 (비인증 GET)**

| 상태 | 경로 |
|---|---|
| 404 | `/api/v1/vendor/products` |
| 404 | `/api/vendor/products` |
| 404 | `/api/v1/vendors/products` |
| 404 | `/api/v1/supplier/products` |
| 404 | `/api/v1/products` |

### 5-2. 대체 canonical 후보도 없음

같은 supplierops 화면군의 상품 **목록** 페이지가 근거다.

```text
apps/admin-dashboard/src/pages/supplierops/pages/Products.tsx:30-32
  useEffect(() => { setTimeout(() => { setProducts([ …하드코딩 3건… ]) }) })   // Demo data
```

목록은 **API 를 호출하지 않는 데모 데이터**다.
즉 supplierops 상품 표면 전체가 backend 없이 만들어져 있어, 요청을 돌려보낼 **canonical endpoint 자체가 없다.**

### 5-3. 결론

| WO §0 HOLD 조건 | 충족 |
|---|:---:|
| `apiRequest.ts` 가 더 이상 live import 되지 않음 | ❌ (live 확인) |
| 호출이 7건보다 크게 늘어남 | ❌ (7건 동일) |
| **수정하려면 backend route 신설이 필요함** | ✅ |
| **`vendor/products` 의 canonical endpoint 가 확인되지 않음** | ✅ |
| 범위가 API client canonicalization 전체로 커짐 | ❌ |
| 다른 세션과 파일 충돌 | ❌ |

origin 만 `https://api.neture.co.kr/api/v1` 로 교정하면 **위장된 200 이 정직한 404 로 바뀔 뿐** 기능은 여전히 동작하지 않는다.
backend route 신설은 WO §4.3 에서 명시적으로 금지되어 있다 → **HOLD.**

---

## 6. 금지사항 준수 확인

| 금지 항목 | 상태 |
|---|---|
| authClient / apiClient / unifiedApi 전체 수정 | ❌ 하지 않음 |
| fetch 호출 전수 수정 | ❌ 하지 않음 |
| `VITE_API_BASE_URL` 정책 변경 | ❌ 하지 않음 |
| backend vendor route 신설 | ❌ 하지 않음 |
| supplierops 정책 변경 · 권한/role 변경 | ❌ 하지 않음 |
| DB write · migration | ❌ 하지 않음 (DB 접속 없음) |
| 무관한 dirty 파일 / lockfile 스테이징 | ❌ 하지 않음 |

프로덕션 접촉은 **비인증 GET 6건**(상태코드·content-type 관측)뿐이다.
`apps/` · `packages/` 변경 파일 0건. 본 CHECK 문서 1개만 신규 생성.

---

## 7. 미수행 항목 (WO 대비)

| WO 항목 | 상태 | 사유 |
|---|---|---|
| §4 same-origin 호출 수정 | **미수행** | HOLD |
| §5.2 supplierops 실브라우저 smoke | **미수행** | 수정이 없어 검증 대상 없음 |
| §5.3 회귀 smoke | **미수행** | 코드 변경 0 — 직전 WO(`a76f3cb82`) smoke 결과가 현재 리비전 그대로 유효 |
| §6 typecheck / build / deploy | **미수행** | 코드 변경 0 |

---

## 8. 판단이 필요한 선택지

| 안 | 내용 | 성격 |
|---|---|---|
| **A. 화면 퇴역** | `/supplierops/products/create` 를 안내 화면으로 교체하고 `api/vendor/products.ts` · `ProductApprovalManager` · `apiRequest.ts` 제거. 목록(`Products.tsx`)의 데모 데이터도 함께 판단 | QR 안내 화면과 동일 패턴 · 정책 판단 불필요에 가까움 |
| **B. backend 신설** | 공급자 상품 등록 endpoint 를 신설하고 프런트를 연결 | 사업·권한·데이터 모델 판단 필요 (F12 Product Resource / ProductMaster 경계와 충돌 검토 필수) |
| **C. 기존 경로로 흡수** | `/supplierops/products/new` (ProductSearchPage → ProductMaster) 흐름이 이미 canonical 이라면, create 폼을 그쪽으로 통합 | 중간 규모 · 상품 등록 정책 확인 필요 |

> 참고: `Products.tsx` 목록이 데모 데이터라는 점은 **이 흐름이 한 번도 동작한 적 없을 가능성**을 시사한다.
> A 안이 가장 작고 안전하나, 공급자 상품 등록을 운영에서 어떻게 처리할지에 대한 확인이 선행되어야 한다.

---

## 9. 후속 후보

```text
WO-O4O-ADMIN-SUPPLIEROPS-PRODUCT-CREATE-DISPOSITION-V1   (위 A/B/C 결정 후)
WO-O4O-ADMIN-APIREQUEST-SCANNER-RECHECK-V1               (제네릭 미탐 재집계)
IR-O4O-ADMIN-DASHBOARD-NONV1-MOUNT-POLICY-V1
WO-O4O-ADMIN-SIGNAGE-API-PATH-ALIGN-V1
WO-O4O-ADMIN-API-CLIENT-CANONICALIZATION-V1
```

---

*작성: 2026-08-10 · 기준 commit `897e339f6` · 결과 HOLD (코드 변경·배포 없음)*
