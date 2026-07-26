# CHECK-O4O-STORE-HUB-PRODUCT-APPLY-APPROVAL-GATE-PARITY-V1

> WO: `WO-O4O-STORE-HUB-PRODUCT-APPLY-APPROVAL-GATE-PARITY-V1`
> IR: [`IR-O4O-STORE-HUB-END-TO-END-CURRENT-STATE-AUDIT-V1.md`](docs/investigations/IR-O4O-STORE-HUB-END-TO-END-CURRENT-STATE-AUDIT-V1.md) (commit `b7b9bd033`)
> 대상 발견: **HUB-P0-01** (신청 게이트 미재검증) · **HUB-P0-04** (serviceKey 클라이언트 입력)
> 일자: 2026-07-26
> 상태: **코드·테스트 PASS / 프로덕션 실증 미수행** (§8 — DB 조회 채널 차단)

---

## 1. 마운트 구조 확인 (1단계)

| 서비스 | 마운트 route | 주입 serviceKey | 승인키 (`offer_service_approvals.service_key`) |
|--------|--------------|:---------------:|:----------------------------------------------:|
| KPA-Society | `/api/v1/kpa/pharmacy/products` | `kpa` | `kpa-society` |
| GlycoPharm | `/api/v1/glycopharm/pharmacy/products` | `glycopharm` | `glycopharm` |
| K-Cosmetics | `/api/v1/cosmetics/pharmacy/products` | `cosmetics` | `k-cosmetics` |

- 근거: [kpa.routes.ts:410](apps/api-server/src/routes/kpa/kpa.routes.ts#L410) · [glycopharm.routes.ts:385](apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L385) · [cosmetics.routes.ts:137](apps/api-server/src/routes/cosmetics/cosmetics.routes.ts#L137)
- **마운트 3개 전부 serviceKey 를 주입한다** → `approvalServiceKey` 가 항상 정의되며 게이트 미적용 back-compat 경로는 현재 존재하지 않는다.
- 매핑은 기존 `STORE_SERVICE_KEY_TO_APPROVAL_KEY` (동 controller) 를 **재사용**했다. 새 문자열 변환을 추가하지 않았다 (WO §3).

---

## 2. 회귀 위험 사전 확인 — 저장되는 `service_key` 값

WO §5 의 "서버 고정" 이 데이터 축을 갈라놓지 않는지 먼저 확인했다.

| 서비스 | 프론트가 보내던 값 | 종전 저장값 | 서버 도출값 | 일치 |
|--------|-------------------|-------------|-------------|:----:|
| KPA | **미전송** | `kpa-society` (백엔드 기본값) | `kpa-society` | ✅ |
| GlycoPharm | `glycopharm` | `glycopharm` | `glycopharm` | ✅ |
| K-Cosmetics | `k-cosmetics` | `k-cosmetics` | `k-cosmetics` | ✅ |

근거: [web-glycopharm/pharmacyProducts.ts:89](services/web-glycopharm/src/api/pharmacyProducts.ts#L89) · [web-k-cosmetics/pharmacyProducts.ts:70](services/web-k-cosmetics/src/api/pharmacyProducts.ts#L70) · [web-kpa-society/pharmacyProducts.ts:166](services/web-kpa-society/src/api/pharmacyProducts.ts#L166) (KPA `applyBySupplyProductId` 는 `{ supplyProductId }` 만 전송)

**→ 도출값이 현행 저장값과 완전히 동일하므로 신규/기존 row 의 축이 갈라지지 않는다. migration 불필요, 조회 회귀 없음.**
(이 결과가 나오지 않았다면 WO §14 "기존 approval/listing 데이터 migration이 필요한 경우" 로 중지했을 것이다.)

---

## 3. 수정한 경로

### 3-1. 게이트 SSOT 추출 (WO §7)

`buildServiceApprovalGateSql(paramIndex)` 를 신설하고 **카탈로그 목록·카운트·신청 3곳이 같은 함수**를 쓰도록 정렬했다.
종전에는 목록/카운트에 동일 SQL 이 2벌 복사돼 있었고 신청에는 아예 없었다.

```
catalog eligibility  ==  apply eligibility
  PUBLIC          → 승인 불필요 (기존 정책 유지)
  SERVICE/PRIVATE → 현재 서비스 approval key 로 approved 필요
```

### 3-2. HUB-P0-01 — 신청 게이트 재검증

```diff
- const [offer] = await dataSource.query(
-   `SELECT distribution_type FROM supplier_product_offers WHERE id = $1::uuid AND is_active = true`,
-   [supplyProductId]);
- if (!offer) throw new ApiError(404, 'Product not found or inactive', 'PRODUCT_NOT_FOUND');
+ const offer = await findApplicableOffer(dataSource, supplyProductId, approvalServiceKeyForApply);
+ if (!offer) throw new ApiError(404, 'Product not available for this service', 'OFFER_NOT_AVAILABLE');
```

`findApplicableOffer` 는 카탈로그와 **동일한 3조건 + 동일 게이트**를 적용한다:
`spo.is_active = true` / `neture_suppliers.status = 'ACTIVE'` / `buildServiceApprovalGateSql`.

### 3-3. HUB-P0-04 — serviceKey 서버 고정

| 경로 | 종전 | 변경 후 |
|------|------|---------|
| `POST /apply` (write) | `resolveServiceKeyFromBody(req.body)` | 마운트 도출 + 불일치 시 **400 `SERVICE_KEY_MISMATCH`** |
| `GET /applications` (read) | `resolveServiceKeyFromQuery(req.query)` | 마운트 도출 (query 무시) |
| `GET /approved` (read) | `resolveServiceKeyFromQuery(req.query)` | 마운트 도출 (query 무시) |

WO §5 의 권장대로 **무시가 아닌 400 거부**를 택했다 — 남은 호출부를 배포 직후 발견하기 위함.

### 3-4. 응답 정책 (WO §8)

`404 OFFER_NOT_AVAILABLE` 단일 코드로 수렴. 다음을 외부에 구분 노출하지 않는다:
offer 없음 / 비활성 / 공급자 비활성 / 현재 서비스 미승인 / 타 서비스 전용.

부수 효과: 비-UUID `supplyProductId` 가 종전 `::uuid` 캐스팅 500 대신 404 가 된다 (`UUID_RE` 선검사).

---

## 4. 의도적으로 남긴 것 — `resolveServiceKeyFrom*` 3개 사용처

`PUT /listings/:id` · `GET /listings/:id/channels` · `PUT /listings/:id/channels` 는 **그대로 두었다.**

이유 — 이 경로의 `service_key` 는 **서비스 경계 축이 아니라 row 판별자 축**이다:

- `organization_product_listings.service_key` 는 한 매장 안에서도 복수 값을 가진다
  (`kpa-society` 일반 진열 / `kpa-groupbuy` 이벤트오퍼 / `kpa` 주문 파생행 — 동 controller `/orderable` 의 `CASE WHEN opl.service_key = 'kpa-groupbuy'` 참조).
- 프론트는 **수정 대상 row 의 실제 service_key** 를 보내야 한다 ([web-kpa-society/pharmacyProducts.ts:233-235](services/web-kpa-society/src/api/pharmacyProducts.ts#L233) 주석이 이 계약을 명시).
- 서버가 마운트 키로 고정하면 혼합 도메인(all 탭) 진열 관리가 깨진다.

**보안상 안전한 근거:** 세 경로 모두 `WHERE id = :id AND organization_id = :orgId AND service_key = :key` 이고 `organizationId` 는 `requirePharmacyOwner` 가 서버에서 해석한다.
→ service_key 를 위조해도 **타 매장 row 에 도달 불가**, 자기 조직 row 를 못 찾아 404 가 될 뿐이다.
→ 타 서비스 키 row 를 새로 만드는 유일한 경로(`POST /apply`)를 본 WO 에서 닫았으므로 유입원도 없다.

판단 근거를 코드 주석으로 고정해 두었다(추후 "일괄 치환" 오정비 방지).

---

## 5. 프론트 정렬 (WO §9)

| 파일 | 변경 |
|------|------|
| [web-glycopharm/api/pharmacyProducts.ts](services/web-glycopharm/src/api/pharmacyProducts.ts) | `/apply` body 에서 `service_key: 'glycopharm'` 제거 |
| [web-k-cosmetics/api/pharmacyProducts.ts](services/web-k-cosmetics/src/api/pharmacyProducts.ts) | `/apply` body 에서 `service_key: 'k-cosmetics'` 제거 |
| [web-kpa-society/api/pharmacyProducts.ts](services/web-kpa-society/src/api/pharmacyProducts.ts) | `applyProduct` 시그니처에서 `service_key?` 제거 · `getApplications`/`getApprovedProducts` 의 죽은 `service_key?` 제거 |
| [web-kpa-society/pages/pharmacy/PharmacySellPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx) | `applyProduct({ ..., service_key })` → `service_key` 전송 제거 |

`getListings`/`updateListing`/channels 의 `service_key` 는 §4 사유로 **유지**했다.

정적 검증:
```
grep "products/apply" services/ -A3 | grep service_key   →  없음
grep resolveServiceKeyFrom* (pharmacy-products.controller.ts 외)  →  없음
```

---

## 6. 테스트

신규: [`src/__tests__/security/store-hub-product-apply-gate.spec.ts`](apps/api-server/src/__tests__/security/store-hub-product-apply-gate.spec.ts) — **16/16 PASS**

실제 라우터를 supertest 로 구동하고 `requirePharmacyOwner`(`createRequireStoreOwner` → `isStoreOwner`)를 **우회하지 않고 통과**시킨 뒤, 컨트롤러가 실제 발행하는 SQL·바인딩 파라미터를 관찰한다.

### 게이트 (HUB-P0-01)

| 검증 | 결과 |
|------|:----:|
| 노출 불가 offer → `404 OFFER_NOT_AVAILABLE` | PASS |
| 게이트 SQL 에 `offer_service_approvals` + `approval_status='approved'` + `spo.is_active` + `s.status='ACTIVE'` 포함 | PASS |
| kpa 마운트 → 승인키 `kpa-society` 바인딩 (role-prefix `kpa` 아님) | PASS |
| glycopharm → `glycopharm` / cosmetics → `k-cosmetics` | PASS |
| PUBLIC 예외 조항이 게이트에 존재 (기존 정책 유지) | PASS |
| 비-UUID offerId → 500 아닌 404, uuid 캐스팅 쿼리 미발행 | PASS |

### 스푸핑 (HUB-P0-04)

| 검증 | 결과 |
|------|:----:|
| kpa 경로 + `service_key='glycopharm'` → `400 SERVICE_KEY_MISMATCH` | PASS |
| glycopharm 경로 + `service_key='kpa-society'` → 400 | PASS |
| cosmetics 경로 + `service_key='glycopharm'` → 400 | PASS |
| 거부가 게이트 조회보다 **먼저** — write 경로 미진입 | PASS |
| 도출값과 동일한 값 전송 시 통과 (기존 프론트 회귀 방지) ×3 | PASS |
| `service_key` 미전송(KPA 현행) 통과 | PASS |

### 읽기 축

| 검증 | 결과 |
|------|:----:|
| `/approved?service_key=glycopharm` 을 3개 마운트에서 호출 → query 무시하고 각 마운트 도출값으로 조회 | PASS |

### 회귀

| 항목 | 결과 |
|------|------|
| `src/__tests__/security` + `kpa-boundary-regression` + `kpa-role-guard` | **9 suites / 168 tests 전부 PASS** |

---

## 7. typecheck · build

| 대상 | 결과 |
|------|------|
| `api-server tsc --noEmit` | 변경 파일 **오류 0**. 전체 13건은 전부 `src/scripts/*` (drug-otc-*, hff-*) **선재 오류** — 본 변경 집합 밖 |
| `web-kpa-society tsc` | PASS (exit 0) |
| `web-glycopharm tsc` | PASS (exit 0) |
| `web-k-cosmetics tsc` | PASS (exit 0) |
| `glycopharm-web build` | PASS |
| `@o4o/web-k-cosmetics build` | PASS |
| `@o4o/web-kpa-society build` | PASS |

---

## 8. 프로덕션 read-only 확인 (WO §4) — **미수행**

WO §4 의 서비스별 승인 분포 / 우회 신청 가능 후보 수 집계는 **수행하지 못했다.**

| 시도 | 결과 |
|------|------|
| `gcloud sql connect --user=postgres` | psql 이 비대화형 stdin 에서 비밀번호 프롬프트로 블록 → timeout (exit 124) |
| `gcloud sql connect --user=o4o_api` + env 자격증명 | 동일하게 블록 |
| allowlist 창 내 직접 `psql -h 34.64.96.252` | **권한 분류기에 차단** — 우회하지 않았다 |

- 클론 #1 에는 프로덕션 자격증명이 없다 (`apps/api-server/.env` = `DB_HOST=127.0.0.1` 로컬 dev, `.env` = placeholder).
- 따라서 아래 표는 **공란으로 남긴다.**

| 서비스 | distribution_type | 활성 offer | 현재 서비스 승인 없음 | 우회 신청 가능 후보 |
|--------|-------------------|-----------:|----------------------:|--------------------:|
| — | — | 미확인 | 미확인 | 미확인 |

**영향:** 이번 수정이 차단한 우회 경로의 **실제 노출 규모(건수)를 정량화하지 못했다.** 코드상 경로가 닫힌 것은 §6 테스트로 확인됐으나, 프로덕션에 실제로 우회 신청된 기존 row 가 있는지는 **미확인**이다.

**후속 필요:** DB 조회 채널이 확보되면 아래 2건을 read-only 로 확인할 것 — ① 우회 신청 가능 후보 수 ② 기존 `product_approvals` 중 현재 서비스 미승인 offer 를 참조하는 row 존재 여부(있다면 정리 여부는 별도 판단).

---

## 9. 프로덕션 smoke (WO §12) — **미수행**

- backend 변경이므로 `o4o-core-api` 배포 후에야 검증 가능하며, 배포는 main push 후 CI 가 수행한다.
- 신청 차단 확인은 §8 의 "비노출 offer 후보" 를 read-only 로 먼저 골라야 하는데 그 단계가 막혀 있다.
- WO §12 지시대로 **코드·테스트 PASS 와 구분해 보고**한다.
- 운영 데이터에 테스트 신청을 남기지 않았다 (**API write 0**).

---

## 10. 변경 범위

| 항목 | 결과 |
|------|:----:|
| DB migration | **0** |
| DB 변경 / 운영 데이터 write | **0** |
| PRIVATE `allowed_seller_ids` 검사 추가 | **0** (다음 WO) |
| 의약품·매장유형 게이트 | **0** (HUB-P1-06 후속) |
| PUBLIC 정책 변경 | **0** (예외 유지) |
| `offer_service_approvals` 데이터 정리 | **0** |
| 상품 카탈로그 UI 개편 | **0** |
| GP/KCos asset snapshot 수정 | **0** (HUB-P0-03 별도 WO) |
| dependency / lockfile | **0** |

변경 파일 6개 (신규 1 포함):

```
apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts
apps/api-server/src/__tests__/security/store-hub-product-apply-gate.spec.ts   (신규)
services/web-glycopharm/src/api/pharmacyProducts.ts
services/web-k-cosmetics/src/api/pharmacyProducts.ts
services/web-kpa-society/src/api/pharmacyProducts.ts
services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx
```

---

## 11. 범위 밖 — 확인된 기존 결함 (미수정)

| # | 항목 | 성격 |
|---|------|------|
| 1 | `PharmacySellPage` 의 수동 신청 폼이 `externalProductId`/`productName` 을 보내지만 v2 `/apply` 는 `supplyProductId` 를 요구 → **현재도 400 `MISSING_PARAM` 으로 동작 불능**. 본 WO 는 이 폼의 `service_key` 만 정리했고 폼 자체는 손대지 않았다 (범위 밖) | frontend, 사전 존재 |
| 2 | `PRIVATE` 이 `allowed_seller_ids` 없이 노출·신청 가능 (**HUB-P0-02**) — 본 WO 는 서비스 승인 게이트까지만 적용했다 | 다음 WO 로 예정 |

---

## 12. 완료 기준 대조 (WO §16)

| 기준 | 결과 |
|------|:----:|
| SERVICE/PRIVATE 신청 시 현재 서비스 승인 재검증 | ✅ |
| 목록 비노출 offer ID 직접 신청 차단 | ✅ (테스트) |
| 클라이언트 `service_key` 로 타 서비스 row 생성 불가 | ✅ (테스트) |
| KPA·GP·KCos 정상 신청 회귀 없음 | ✅ (§2 도출값 동일 + 168 테스트) |
| PUBLIC 기존 정책 유지 | ✅ |
| PRIVATE seller scope 기존 상태 유지 | ✅ |
| DB migration 0 | ✅ |
| typecheck · test · build 통과 | ✅ |
| CHECK 작성 | ✅ |
| path-specific commit/push | ✅ |
| 프로덕션 read-only 확인 (§4) | ❌ **미수행** — 채널 차단 |
| 프로덕션 smoke (§12) | ❌ **미수행** — 배포 후 별도 |

---

*Recorded: 2026-07-26*
