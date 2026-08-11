# CHECK — O4O 공통 Product DB write 권한 경계 정렬 V1

- **WO**: `WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1`
- **일자**: 2026-08-11
- **상태**: COMPLETED
- **범위**: 공통 Product DB(`product_masters` · `product_identifiers` · `shared_product_descriptions` · candidate/landing) 의 **write 권한만** O4O 전체 관리자 + 정당한 공급자로 닫는다.
- **비범위**: 서비스별 Product DB 분리 · 새 역할 체계 · 새 테이블/migration · 대형 UI 재설계 · 대량 생성/정규화/번역(기존처럼 개발/배치 유지)
- **schema 변경 0 · migration 0 · DB write 0**

---

## 1. 권한 계약 (§3)

새 역할을 만들지 않고 **기존 계약을 재사용**한다.

```
PRODUCT_DB_WRITE_ROLES = ['platform:super_admin', 'neture:admin', 'neture:operator']
```

근거 — 기존 `/admin/masters/:id` 의 `requireNetureScope('neture:admin')`, operator-product-cleanup 의 `requireNetureScope('neture:operator')`, `platformBypass: true` 계약과 동일 집합이다.

| 주체 | 공통 Product DB 조회 | 공통 Product DB 수정 |
|---|:---:|:---:|
| O4O 전체 관리자 (`platform:super_admin` · `neture:admin` · `neture:operator`) | O | **O** |
| 서비스 admin/operator (`cosmetics:*` · `kpa-society:*` · `glycopharm:*`) | **O (유지)** | **X (403)** |
| 정당한 공급자 (`requireActiveSupplier` + `supplierId` 스코프) | 자기 제품 O | **자기 제품 O / 타 공급자 X (기존 계약 불변)** |
| 매장 경영자 | 매장 경로 한정 | X |

- 백엔드 정의: [product-db-write-authority.ts](apps/api-server/src/modules/neture/controllers/product-db-write-authority.ts) → `requireProductDbWrite = requireRole(PRODUCT_DB_WRITE_ROLES)`
- 프런트 판정: [adminRouteAccess.ts](packages/auth-context/src/adminRouteAccess.ts) → `canWriteProductDb(user)` (동일 집합, 테스트로 동기 고정)

**중요**: 서비스 운영자의 "접근"을 막은 것이 아니라 "수정"만 막았다. 모든 GET 은 그대로다.

---

## 2. 현행 write 경로 전수 감사 결과 (§2)

감사 대상 write(POST/PATCH/PUT/DELETE) route **29건** — 이 중 공통 Product DB 를 실제로 바꾸는 **16건**을 닫았다.

### 2-1. `requireProductDbWrite` 적용 (16건) — 이전에는 서비스 admin/operator 9역할 전원 write 가능

| controller | route | 공통 DB 영향 |
|---|---|---|
| product-master-create | `POST /` | product_masters INSERT |
| product-master-status | `PATCH /:id/status` | product_masters UPDATE |
| product-master-description | `POST /:id/store-descriptions` | shared_product_descriptions |
| product-master-image | `POST /:id/images` · `POST /:id/images/:imageId/set-primary` · `DELETE /:id/images/:imageId` · `POST /:id/images/:imageId/restore` | master 이미지 |
| product-db-maintenance | `POST /jobs/orphan-registered-candidates/apply` · `POST /jobs/cancelled-drug-pending-candidates/apply` | 대량 정비 (dry-run 은 유지) |
| product-landing | `POST /` | 공통 landing |
| operator-supplier-store-description-review | `POST /expiry/apply` · `POST /:id/approve` · `POST /:id/request-revision` · `POST /:id/reject` | canonical 승격/회수 |
| product-candidate | `POST /:id/promote-master` | product_masters INSERT |
| store-product-request-admin | `POST /:id/approve-new` | product_masters + product_identifiers INSERT |

### 2-2. 의도적 미적용 (§9 — 서비스 경계 안의 필수 업무는 막지 않는다)

| route | 유지 사유 |
|---|---|
| product-candidate `POST /` · `/bulk-action` · `/:id/reject` · `/:id/archive` · `/:id/refine-drug-category` · `/:id/link-to-listing` | 후보는 `injectServiceScope` 로 서비스 격리된 큐레이션 대상이다. 공통 master 로 넘어가는 것은 `promote-master` 뿐이라 그것만 닫았다. |
| product-master-note `POST /:id/notes` · `DELETE /:id/notes/:noteId` | 운영 메모. ProductMaster 자체를 바꾸지 않는다. |
| store-product-request-admin `/:id/link` · `/:id/request-revision` · `/:id/reject` | 요청 레코드 상태만 바꾼다. 공통 DB INSERT 는 `approve-new` 뿐. |
| maintenance `*/dry-run` 2건 | 조회 성격. |
| supplier 전용 API (`/neture/supplier/*`) | 별도 계약. admin API 와 섞지 않는다 (§4). |

전역 `/api/v1/admin/*` 을 blanket 방식으로 되돌리지 않았다 — route 단위 guard 만 추가했다.

---

## 3. UI 정합 (§5)

`canWriteProductDb` 기반 [useProductDbWriteAccess.tsx](apps/admin-dashboard/src/pages/o4o-product-db/useProductDbWriteAccess.tsx) 훅으로 write Action 만 숨긴다. 조회·검색·상세는 전원 유지, 대형 재설계 없음.

| 화면 | 숨긴 Action | 유지 |
|---|---|---|
| ProductMastersPage | 상태 변경 · 새 상품 등록 | 목록/검색/필터 |
| ProductMasterDetailPage | 상태 변경 · 이미지 추가/대표/숨김/복구 · 매장용 설명서 작성 | 상세·이미지 열람·설명서 목록·노트 |
| ProductMasterCreatePage | 등록 폼 전체 | 안내 문구 |
| ProductDbMaintenancePage | apply 패널 | dry-run |
| SupplierStoreDescriptionReviewPage | 승인·교체·수정요청·만료정리 | 목록·미리보기 |
| CandidateConflictDrawer | 신규 기본상품 등록(승격) | 후보 검토·보류·제외 |
| StoreRequestReviewModal | 신규 상품 승인 | 기존 상품 연결·보완 요청·등록 불가 |

숨김 자리에는 "공통 Product DB 는 O4O 전체 관리자가 관리합니다" 안내를 노출한다 (기능 은폐가 아니라 권한 안내).

---

## 4. 테스트 (§7)

[product-db-write-authority.test.ts](apps/api-server/src/bootstrap/__tests__/product-db-write-authority.test.ts) — **33 tests PASS**. 경계 스위트 전체 2 suites / 67 tests PASS. `tsc --noEmit` — api-server · admin-dashboard 모두 clean.

- 서비스 admin/operator 5역할: GET `not 403`, POST `403`
- O4O 전체 관리자 3역할: GET/POST 권한으로 막히지 않음
- 역할 없는 사용자 403 / 미인증 401
- 백엔드 `PRODUCT_DB_WRITE_ROLES` == 프런트 집합 (동기 고정)
- GUARDED 11경로 소스 스캔 / NOT_GUARDED 2경로 소스 스캔 (과잉 차단 회귀 방지)

> ProductMaster 생성·상태변경 controller 는 `neture.service` 전체를 끌어와 jest 에서 mount 불가하여 런타임 대신 소스 스캔으로 계약을 고정했다 (숨기지 않고 명시).

---

## 5. 공급자 경로 회귀 (§6)

- supplier controller 파일 **변경 0건** (`git status` 확인)
- 프런트 supplier 화면은 `/neture/supplier/*` 만 호출 — admin API 를 타지 않는다
- supplier write 는 기존대로 `requireAuth` + `requireActiveSupplier` + `supplierId` 스코프. 타 공급자 제품 수정 BLOCK 유지
- 운영자 검수 큐(`operator-supplier-store-description-review`)를 닫아도 공급자의 **제출** 경로는 영향 없음

---

## 6. postVerify (§10) — read-only, DB write 0

`tmp/product-db-write-authority/postverify.mjs` 실행 결과 (`postverify.json`).

| 항목 | 값 | 판정 |
|---|---:|:---:|
| ProductMaster 총수 | 272,035 | 기준선 |
| canonical STORE 설명서 | 232,860 (ko 96,059 / en 63,207 / zh 41,324 / ja 32,270) | 기준선 |
| canonical 중복 그룹 | 0 | PASS |
| orphan 설명서 | 0 | PASS |
| **판정** | | **PASS** |

제품군별 분포 — 권한 계약은 `regulatory_type` 을 분기하지 않으므로 전 제품군에 동일 적용된다 (guard 는 route 단위, 제품군 조건 없음).

| DRUG | 건강기능식품(HFF) | COSMETIC | QUASI_DRUG | MEDICAL_DEVICE | 기타 |
|---:|---:|---:|---:|---:|---:|
| 177,413 | 40,948 | 32,674 | 17,148 | 3,826 | 26 |

**기준선 관측 (이번 WO 원인 아님 · 결함 아님)**: `product_identifiers` 의 (type, normalized_value) 다중 master 그룹 66,085건 — MFDS_CODE 44,659 / KOREA_INSURANCE_CODE 19,191 / ATC_CODE 2,235. 품목기준코드·보험코드·ATC 는 본래 다수 포장단위 master 가 공유하는 식별자로 UNIQUE 제약 대상이 아니다.

---

## 7. 소비처 회귀 감사 (§8)

서비스 운영자의 공통 DB 직접 수정을 전제한 소비처를 구분했다.

- **필수 기능** — 후보 큐레이션 · 매장 요청 연결/보완/반려 · 운영 메모: 서비스 경계 안이라 **그대로 유지**
- **공통 DB 침범** — master 생성/상태/이미지/설명서 · 승격 · 신규 승인 · 정비 apply: **O4O 전체 관리자로 이관**
- **서비스 콘텐츠 혼동 없음** — `kpa_store_contents` 등 매장 실행자산 경로는 이번 변경 대상 밖 (F12 계층2)

---

## 8. 별도 WO 제안 (범위 밖 발견 — 이번에 고치지 않음)

1. **`requireAdmin` standalone 위임 구멍** — `if (!req.user) return requireAuth(...)` 로 인해 선행 `authenticate` 없이 단독 사용하면 역할 검사를 건너뛴다. 현재 소비처는 모두 선행 authenticate 가 있어 즉시 위험은 없으나 계약이 취약하다.
2. **`POST /api/v1/products/:productId/ai-tags/*` · `DELETE …/:tagId` 가 `authenticate` 단독** — `product-ai-tagging.service.ts` 가 `product_masters.tags` 를 간접 UPDATE 한다. 소비처가 공급자 화면(`ProductDetailDrawer`)이라 이번 WO 에서 닫으면 §6 공급자 경로를 깨므로 보류. **소유권 검사 부재**(임의 인증 사용자가 임의 master 에 태깅 가능)가 실제 결함이며 supplier 소유권 계약으로 별도 처리해야 한다.
3. 직전 CHECK 문서의 "A그룹 불변 / unguardedAfterBlanket 0" 서술은 부정확했다 — 본 WO 감사에서 서비스 admin/operator 9역할이 공통 Product DB write 16경로에 접근 가능했음이 확인되었다.

---

## 9. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건 (§8)

---

## 부록 A. 배포 후 프로덕션 smoke (2026-08-11)

- 배포: `Deploy API Server (Cloud Run)` success — revision `o4o-core-api-03287-vfp` (2026-08-11T05:53Z).
  이 revision 은 `ced98c58c`(본 WO) 이후 커밋 `7f03c03b6` 빌드이므로 `requireProductDbWrite` 를 포함한다.
- 대상: `GET|POST /api/v1/admin/o4o-product-db/masters/{id}/store-descriptions` (api.neture.co.kr)
- write 호출은 **빈 본문**으로 보냈다 — guard 통과 시 검증 오류로 끝난다. **DB write 0.**

| 계정 | 역할 | GET | write |
|---|---|---|---|
| `sohae2100@gmail.com` | `neture:admin` + `neture:operator` (O4O 전체 관리자) | **200** | **400 `CONTENT_EMPTY`** — guard 통과(=쓰기 권한 유지) |
| `renagang21@gmail.com` | store_owner / supplier | 로그인 실패 | 로그인 실패 |

**한계 (숨기지 않고 기록)**: 프로덕션에 **서비스 운영자 전용 계정이 없다.**
유일하게 로그인되는 관리 계정 `sohae2100@gmail.com` 은 `cosmetics:admin/operator`·`kpa:*`·`pharmacy-hub:*` 와 함께
`neture:admin`·`neture:operator` 를 동시에 보유하므로 **정의상 writer** 이고, 이 계정으로는 403 을 관측할 수 없다.
`renagang21@gmail.com` 은 TEST-ACCOUNTS 문서에 기재된 비밀번호가 현재 프로덕션과 불일치한다(문서 §store-hub 표에도 동일 기재).
WO 규칙상 **계정 생성·비밀번호 변경을 하지 않았으므로**, 서비스 운영자 write 403 은 프로덕션에서 관측하지 못했다.
해당 계약은 `product-db-write-authority.test.ts` 의 33 tests (서비스 admin/operator 5역할 × GET 비403 / write 403) 로 고정돼 있다.

산출물: `tmp/product-db-write-authority/{smoke.mjs,smoke.json,smoke-roles.mjs}`
