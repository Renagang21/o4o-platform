# CHECK-O4O-ADMIN-PRODUCT-CONSOLE-SUPPLIER-NAME-JOIN-FIX-V1

> WO: `WO-O4O-ADMIN-PRODUCT-CONSOLE-SUPPLIER-NAME-JOIN-FIX-V1`
> 작업일: 2026-08-01 · 브랜치 `main` · 작업 전 HEAD `42efe3449`
> **결과: 2개 지점 수정 완료 · 중지 조건 4개 전부 미해당**

---

## 1. 오류 원인

`neture_suppliers` 에는 **상호(company_name) 컬럼이 존재하지 않는다.**

```
ERROR: column ns.company_name does not exist   (SQLSTATE 42703)
```

이 테이블의 이름 계열 컬럼은 다음뿐이다:

```
manager_name · representative_name · settlement_bank_name · settlement_contact_name
```

즉 **담당자·대표자·정산 담당자 이름**만 있고 사업체 상호는 없다.
공급자의 상호는 `organizations` 로 분리되어 있고 `neture_suppliers.organization_id` 로 연결된다.

수정 전 프로덕션에서 두 지점 모두 오류를 **직접 재현**했다 (§5-1).

## 2. 수정한 조인과 공급자명 SSOT

### 2-1. SSOT 판정 (중지 조건 ① 대조)

공급자 표시명의 정본은 **`organizations.name`** 이다. 이미 다수의 정상 지점이 이 축을 쓰고 있었다.

| 파일 | 표현 |
|---|---|
| `PharmacyHubOrderController` | `COALESCE(org.name, '공급자')` |
| `PharmacyHubStoreProductController` | `COALESCE(org.name, '공급자')` |
| `operator-service-approval.controller` | `COALESCE(supplier_org.name, 'Unknown')` |
| `admin.service` (2곳) | `supplier_org.name AS "supplierName"` |

경쟁하는 별도 상호 SSOT 는 **없다**. → 중지 조건 ① 미해당.

### 2-2. 수정 내용 — 2곳

| # | 파일 | 지점 |
|:-:|---|---|
| ① | `controllers/operator/ProductConsoleController.ts:327` | 상품별 공급자 offers 조회 |
| ② | `modules/neture/controllers/operator-product-cleanup.controller.ts:383` | 삭제된 offers 목록 |

두 곳 모두 동일한 기계적 치환이다.

```diff
-        ns.company_name AS supplier_name
+        supplier_org.name AS supplier_name
   FROM supplier_product_offers spo
   LEFT JOIN neture_suppliers ns ON spo.supplier_id = ns.id
+  LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
```

기존 `LEFT JOIN neture_suppliers` 는 **그대로 두고** organizations 조인만 이어붙였다.
`LEFT` 를 유지했으므로 공급자/조직이 없어도 행이 사라지지 않는다(§4-2).

## 3. 동일 참조 전수조사

`company_name` 전체를 훑고 **테이블별로** 판정했다.

| 참조 | 테이블 | 판정 |
|---|---|---|
| `ProductConsoleController` `ns.company_name` | `neture_suppliers` | ❌ **결함 → 수정** |
| `operator-product-cleanup` `s.company_name` | `neture_suppliers` | ❌ **결함 → 수정** |
| `service-legal.mapper` `p.company_name` | `service_legal_profiles` | ✅ 정상 — 컬럼 실재 |
| `PartnerApplication.entity` | `partner_applications` | ✅ 정상 — 컬럼 실재 |
| `CreateKpaSupplierStaffProfiles` | `kpa_supplier_staff_profiles` | ✅ 정상 — 컬럼 실재 |
| `auth-register` · `PharmacyHubJoin` 등의 `companyName` | DTO/요청 본문 | ✅ SQL 아님 |

**`neture_suppliers` 대상 잘못된 참조 잔여: 0건.**

두 곳뿐이고 같은 도메인(운영자 상품 콘솔)이라 최소 수정으로 닫혔다 → 중지 조건 ② 미해당.

## 4. 기존 계약 보존

### 4-1. 응답 필드명 불변

```
supplier_name   ← 두 지점 모두 그대로 유지 (별칭만 같은 이름으로 재지정)
```

프론트 수정 **불필요** → 중지 조건 ③ 미해당. 선택 컬럼·정렬·`LIMIT/OFFSET`·`WHERE` 조건도
건드리지 않았다.

| 보존 항목 | 상태 |
|---|---|
| offers 조회 정렬 `ORDER BY spo.created_at DESC` | 불변 |
| cleanup 정렬 `ORDER BY o.deleted_at DESC` | 불변 |
| 페이지네이션 `LIMIT $1 OFFSET $2` | 불변 |
| count 쿼리 | 미접촉 |
| 권한 가드 | 미접촉 (§5-3) |

### 4-2. 공급자 없는 offer 처리

`LEFT JOIN` 을 유지했으므로 동작이 이전과 같다.

| 상황 | 이전 | 이후 |
|---|---|---|
| `supplier_id` 없음 | 행 유지 · 이름 NULL | 행 유지 · 이름 NULL |
| 공급자에 조직 미연결 | (쿼리 자체가 실패) | 행 유지 · 이름 NULL |

즉 이번 변경으로 **행이 사라지거나 새로 생기지 않는다**.

## 5. 검증

### 5-1. 수정 전후 프로덕션 실행 (read-only)

| 쿼리 | 수정 전 | 수정 후 |
|---|---|---|
| ① offers 조회 | ❌ `column ns.company_name does not exist` | ✅ **실행 성공** |
| ② 삭제 offers 목록 | ❌ `column s.company_name does not exist` | ✅ **실행 성공** · 0건 |

수정 후 ① 이 돌려준 실제 값 — UUID 도 null 도 아닌 **조직명**:

```
a9b823f8-… | 251adaaf-… | (주)쓰라이프존
3bb54519-… | 251adaaf-… | (주)쓰라이프존
```

### 5-2. 데이터 분포 실측

```
supplier_product_offers 전체 2건
  supplier_id NULL 0 · 공급자 미존재 0 · organization_id NULL 0 · 이름 NULL 0
```

현재 데이터에서는 모든 offer 가 조직명을 얻는다.

### 5-3. 권한 가드 (미접촉 확인)

| 엔드포인트 | 가드 |
|---|---|
| `GET /operator/products/:productId/suppliers` | `authenticate` → `requireRole([platform:admin, platform:super_admin, neture:*, glycopharm:*, cosmetics:*, kpa:*])` → `injectServiceScope` |
| `GET /neture/operator/product-cleanup/*` | `requireAuth` → `requireNetureScope('neture:operator')` |

미인증 401 / 권한 없음 403 은 이 가드가 그대로 담당한다 — 이번 변경은 가드 코드를 건드리지 않았다.

### 5-4. 빌드·테스트

| 항목 | 결과 |
|---|---|
| `tsc --noEmit -p tsconfig.build.json` | ✅ **0 errors** |

### 5-5. 배포 후 라이브 검증 (프로덕션)

커밋 `cb748a02f`. 이 커밋의 전용 run 은 병행 push 로 **취소(superseded)** 되었고,
이를 포함한 후속 run `30693851145` (head `8b8d222c0`) 가 **success** 로 배포됐다.
`git merge-base --is-ancestor cb748a02f 8b8d222c0` → **포함 확인**.

| # | 검증 | 결과 |
|:-:|---|---|
| ① | 미인증 offers | ✅ **401** |
| ② | 미인증 recycle-bin | ✅ **401** |
| ③ | 관리자 offers (실제 상품) | ✅ **200** |
| ④ | **공급자명 표시** | ✅ `"supplierName": "(주)쓰라이프존"` — UUID·null 아님 |
| ⑤ | 응답 필드 계약 | ✅ `id / supplierId / supplierName / distributionType / approvalStatus / isActive / priceGeneral …` 전부 유지 |
| ⑥ | 관리자 recycle-bin | ✅ **200** · `pagination {page,limit,total,totalPages}` 유지 |

> ④ 의 `supplierName` 은 컨트롤러가 SQL 별칭 `supplier_name` 을 매핑한 응답 필드명이다.
> SQL 별칭·응답 필드명 모두 이번 변경으로 바뀌지 않았다.

> 비관리자 계정으로는 **401** 이 돌아왔다(403 아님). `authenticate` 미들웨어가 해당 세션을
> 인증 단계에서 먼저 거르기 때문이며, **이번 변경과 무관한 기존 가드 동작**이다.
> 권한 가드 코드는 건드리지 않았다(§5-3).

## 6. 데이터 변경

```
migration 0 · DB write 0 · 신규 컬럼 0 · 신규 테이블 0 · 데이터 보정 0
```

전부 read-only SELECT 로만 검증했다.

## 7. 중지 조건 판정

| 조건 | 판정 |
|---|---|
| `organizations.name` 외 별도 공식 상호 SSOT 확인됨 | ❌ 미해당 — 유일 SSOT (§2-1) |
| 동일 오류가 여러 도메인에 광범위 | ❌ 미해당 — 2곳, 같은 도메인 (§3) |
| 응답 필드 변경·프론트 수정 필요 | ❌ 미해당 — `supplier_name` 불변 (§4-1) |
| 병행 세션 파일 수정 필요 | ❌ 미해당 |
