# CHECK-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1

> WO: `WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1`
> 범위: admin-dashboard read-only skeleton (ProductCandidate / ProductMaster 조회)
> 상태: 구현 + typecheck 완료 / 운영 배포·브라우저 smoke 대기

---

## 1. 사전 검증 (WO 가정 대조)

착수 전 WO 의 "추정" 항목을 코드에서 직접 확인했다.

### 1.1 WO대로 맞음

| 항목 | 확인 근거 |
|---|---|
| ProductCandidate mount | `/api/v1/operator/product-candidates` — `apps/api-server/src/bootstrap/register-routes.ts:425` |
| ProductMaster 검색 endpoint | `/neture/products/library/search` + `/:id` — `product-library.controller.ts` |
| ProductMaster 빈 검색어 | 빈 `q` → 전체 목록(이름순). `catalog.service.ts:291` else 분기 |
| ProductMaster 목록 meta | `{ page, limit, total, totalPages }` 반환 (`product-library.controller.ts:68`) |
| Candidate 엔티티 필드 | `candidateName/Manufacturer/Category`, `sourceType/Label`, `identifierType/Value`, `candidateStatus`, `matchStatus`, `createdAt`, `rawPayload` 전부 존재 (`ProductCandidate.entity.ts`) |
| admin 사이드바 | static fallback (`adminMenuStatic`) 사용 |

### 1.2 WO 보정 (코드가 WO와 달라 구현에 반영)

| # | WO 가정 | 실제 | 반영 |
|---|---|---|---|
| 1 | Navigation API registry 확인/추가 필요 | `/v1/navigation/admin` = **Phase R1 stub → 항상 `[]`** (`navigation.routes.ts`). `useAdminMenu` 는 항상 static fallback | **registry 작업 불필요.** `admin-menu.static.tsx` 만 수정 |
| 2 | 후보 목록 meta 사용 | 후보 응답은 `{ data: { items, total } }` — meta/page 없음 | 프론트가 `total`+`limit` 로 페이지 계산 |
| 3 | 후보 sourceLabel/search 필터 | 실제 필터 = `status/matchStatus/sourceType/serviceKey/organizationId` 만. free-text·sourceLabel 검색 없음 | WO §5.2 fallback대로 status/matchStatus/sourceType 3필터만 |
| 4 | 권한 `admin`,`super_admin` | 후보 API = `requireRole([platform:admin, platform:super_admin, {service}:admin/operator])` + `injectServiceScope`. **platform admin 은 `serviceKey` 또는 `all=true` 없으면 400 `PLATFORM_ADMIN_SCOPE_REQUIRED`** (`serviceScope.ts` resolveOperatorScope) | 후보 클라이언트 **`all=true` 기본 전송** (cross-service opt-in, 감사 로그) |
| 5 | masters 목록 `regulatoryType` 컬럼/필터 | 검색 **목록 응답에 regulatoryType 없음** (상세에만 존재), 백엔드 regulatoryType 필터 없음 | V1 목록에서 regulatoryType 컬럼/필터 제외 → **상세 화면에만 표시**. read-only 유지 위해 백엔드 무변경 |
| 6 | 건강기능식품 masters 표시 여지 | Gate A(2026-07-04)는 **product_candidates 44,885 만** 적재, ProductMaster 승격 보류 | 후보 화면엔 표시, masters 화면엔 미표시 = 정상 (WO §7 일치) |

---

## 2. 메뉴 노출

`apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx` — `Core` 와 `Content` 사이 상위 메뉴 추가.

```
O4O 상품 DB (Database)
  ├─ 공공데이터 후보   → /admin/o4o-product-db/candidates   (ClipboardList)
  ├─ 기본 상품         → /admin/o4o-product-db/masters       (Package)
  └─ 데이터 정비       → /admin/o4o-product-db/maintenance   (Settings)
```

- `roles: ['admin','super_admin']`
- `hasMenuPermission` 은 whitelist(미등록 menuId 기본 허용)이므로 rolePermissions 추가 편집 불필요.

---

## 3. 라우트

`apps/admin-dashboard/src/routes/o4o-product-db.routes.tsx` (`O4OProductDbRoutes()`), `App.tsx` 의 보호 라우트 그룹에 추가.

| 경로 | 화면 |
|---|---|
| `/admin/o4o-product-db` | index → `candidates` 리다이렉트 |
| `/admin/o4o-product-db/candidates` | 후보 목록 |
| `/admin/o4o-product-db/candidates/:id` | 후보 상세 |
| `/admin/o4o-product-db/masters` | 기본 상품 목록/검색 |
| `/admin/o4o-product-db/masters/:id` | 기본 상품 상세 |
| `/admin/o4o-product-db/maintenance` | 데이터 정비 (준비중) |

- 레이아웃(`ProductDbLayout`) + 탭 NavLink + `<Outlet/>` (Suspense 포함).
- `AdminProtectedRoute requiredRoles={['admin','super_admin']}`. 외곽 `/*` 라우트가 이미 `admin` 게이트 적용.

---

## 4. API (read-only 확인)

`apps/admin-dashboard/src/api/o4o-product-db.api.ts` — 신규 client. **호출 endpoint 전부 GET.**

| 함수 | endpoint | 비고 |
|---|---|---|
| `listProductCandidates` | `GET /operator/product-candidates` | `all=true` 기본 (serviceKey 지정 시 우선), status/matchStatus/sourceType/page/limit |
| `getProductCandidate` | `GET /operator/product-candidates/:id` | rawPayload 포함 |
| `listProductMasters` | `GET /neture/products/library/search` | q/page/limit, meta 사용 |
| `getProductMaster` | `GET /neture/products/library/:id` | 이미지/식별 필드 포함 |

- POST/PUT/PATCH/DELETE 호출 **0**. `/:id/match`, `/reject`, `/link-to-listing` 등 mutation endpoint 미참조.

---

## 5. 금지 사항 준수

| 금지 | 상태 |
|---|---|
| ProductMaster/Candidate 생성·수정·삭제 | ✅ 없음 |
| candidate → master 승격 | ✅ 없음 |
| Identifier/Image write, GCS 업로드 | ✅ 없음 |
| SharedProductDescription / AI 설명 생성 | ✅ 없음 |
| Offer/Listing/StoreLocalProduct 자동 생성 | ✅ 없음 |
| 운영 DB write | ✅ 없음 (GET 전용) |

---

## 6. 정적 검증

```
apps/admin-dashboard $ npx tsc --noEmit
=== total TS errors: 0 ===
```

typecheck 통과. 신규 파일 8개 / 수정 파일 2개, 기존 라우트·메뉴 회귀 없음(추가만 수행).

---

## 7. 브라우저 smoke (배포 후 기록 예정)

> ⚠️ 미완 — 운영 배포 후 약국/운영자 계정으로 확인 필요.

| 항목 | 기대 |
|---|---|
| 사이드바 `O4O 상품 DB` | 표시 |
| 공공데이터 후보 | 목록 접근, 건강기능식품 후보(44,885) 표시 여부 |
| 후보 상세 rawPayload | 접기/펼치기 |
| 기본 상품 | 검색/목록(ProductMaster 230,841) |
| 기본 상품 상세 | 필드·식별자·이미지 |
| 데이터 정비 | 준비중 화면 |
| mutation | write 버튼 0 |

### smoke 시 반드시 확인할 리스크 (보정 #4)

후보 API 는 `platform:admin`/`platform:super_admin` (또는 service `:admin`/`:operator`) 역할을 요구한다. admin-dashboard 계정이 **bare `admin`/`super_admin` 만** 보유하면 `requireRole` 에서 403 가능. `all=true` 는 전송하나 platform-admin 스코프가 아니면 400/403 발생 → 후보 화면 실패 시 **계정의 실제 role 스코프**부터 확인.

---

## 8. 후속 작업

1. `WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-GATE0-CHECK-V1`
2. `WO-O4O-HEALTH-FUNCTIONAL-FOOD-CANDIDATE-IMPORT-DRYRUN-V1`
3. `WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-MAINTENANCE-ACTIONS-V1` (write/승격)
4. `WO-O4O-ADMIN-PRODUCT-DESCRIPTION-AUTHORING-WORKSPACE-V1`
5. (선택) masters 목록 응답에 `regulatoryType` 추가 → HEALTH_FUNCTIONAL 필터 (백엔드 확장, 별도 WO)
