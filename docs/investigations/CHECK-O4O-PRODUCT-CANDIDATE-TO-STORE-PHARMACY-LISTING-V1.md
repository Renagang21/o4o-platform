# CHECK-O4O-PRODUCT-CANDIDATE-TO-STORE-PHARMACY-LISTING-V1

> 매칭된 ProductCandidate 를 약국/매장 활용 상품(StoreProductProfile + OrganizationProductListing)으로 연결하는 흐름 구현 검증 보고.
>
> WO: `WO-O4O-PRODUCT-CANDIDATE-TO-STORE-PHARMACY-LISTING-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §7 (Store/Pharmacy Boundary)
> 선행: Phase 3 후보 큐, Phase 4 모바일 draft, Phase 5 운영자 검토 UI
> 작성일: 2026-06-06
> 상태: 구현·정적검증 완료 (브라우저 라이브 smoke 후속)

---

## 1. Summary

운영자가 후보 검토 화면에서 **이미 ProductMaster 에 매칭된** 후보를 약국/매장의 활용 상품으로 추가하는 흐름을 추가했다. ProductMaster 를 새로 만들지 않으며, 기존 master 를 `StoreProductProfile` + `OrganizationProductListing`(offer 없는 master-only)으로 **idempotent upsert** 한다.

운영 루프 완성:
```
수집/등록 후보 → 운영자 검토 → 기존 ProductMaster 연결 → 내 약국/내 매장 활용 상품 추가(linked)
```

검증: api-server `tsc` 0 errors, web-neture `tsc` 0 errors.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts` | status union/상수에 `linked` 추가 (varchar — migration 불필요) |
| `apps/api-server/src/modules/neture/services/product-candidate.service.ts` | `linkCandidateToOrganizationListing()` 추가 |
| `apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts` | `POST /:id/link-to-listing` + 에러 매핑 보강 |
| `services/web-neture/src/lib/api/operatorProductCandidates.ts` | `linked` 타입 + `LinkToListingPayload/Result` + `linkToListing()` |
| `services/web-neture/src/pages/operator/ProductCandidateReviewPage.tsx` | `linked` 배지/탭 + "활용 상품으로 추가" 액션 |
| `docs/investigations/CHECK-O4O-PRODUCT-CANDIDATE-TO-STORE-PHARMACY-LISTING-V1.md` | 본 문서 |

> DB migration 없음. ProductMaster/ProductIdentifier/MobileProductDraft/SupplierProductOffer 구조·기존 store-core 엔티티 무변경.

---

## 3. Existing Store/Pharmacy Listing Structure (조사)

| 요소 | 사실 |
|---|---|
| `StoreProductProfile` (`store_product_profiles`) | `UNIQUE(organization_id, master_id)`. 컬럼: display_name, description, pharmacist_comment, is_active. **service_key 없음** (org+master 기준) |
| `OrganizationProductListing` (`organization_product_listings`) | `master_id`(필수) + `offer_id`(nullable, master-only 허용 — WO-O4O-KPA-STORE-MY-PRODUCTS-FLOW-SIMPLIFY-V1) + `service_key`(기본 kpa) + `is_active`(기본 false) + `status`(기본 pending) |
| canonical master-only 등록 | `store-product-library.controller.ts:281` — `INSERT … is_active=true, offer_id=NULL … ON CONFLICT (organization_id, service_key, master_id) WHERE offer_id IS NULL DO NOTHING` + 충돌 시 lookup |

→ 본 WO 는 이 canonical INSERT 패턴을 **그대로 재사용**(중복 구현 없음). profile 은 `ON CONFLICT (organization_id, master_id) DO NOTHING`.

---

## 4. Backend Link Flow

`ProductCandidateService.linkCandidateToOrganizationListing(candidateId, input)`:

1. candidate 조회 — 없으면 `CANDIDATE_NOT_FOUND`
2. status 가 `rejected`/`archived` → `CANDIDATE_NOT_LINKABLE`
3. `matchedProductMasterId` 없으면 → `CANDIDATE_NOT_MATCHED`
4. `organizationId`/`serviceKey` 검증 → `*_REQUIRED`
5. master 존재 확인 (`product_masters`) — 없으면 `PRODUCT_MASTER_NOT_FOUND`
6. **StoreProductProfile upsert**: `INSERT … ON CONFLICT (organization_id, master_id) DO NOTHING` + 충돌 시 lookup. display_name = input.displayName || candidate.candidateName || master.name
7. **OrganizationProductListing upsert** (master-only): `INSERT … is_active=true, offer_id=NULL, price=NULL … ON CONFLICT (organization_id, service_key, master_id) WHERE offer_id IS NULL DO NOTHING` + 충돌 시 lookup
8. `alreadyExisted = !listingCreated && !profileCreated`
9. candidate: `candidateStatus='linked'`, reviewedBy/reviewedAt, rawPayload.link={org,serviceKey,storeId,masterId,listingId,profileId,created flags}

> 모두 raw SQL + parameter binding (CLAUDE.md §7). ProductMaster/Identifier/Offer 생성 없음.

---

## 5. API Endpoint

`POST /api/v1/operator/product-candidates/:id/link-to-listing` (operator/admin guard + service scope, Phase 3 컨트롤러에 additive)

- body: `organizationId`(필수), `serviceKey`(필수), `storeId?`, `displayName?`, `displayDescription?`, `note?`
- response: `{ candidate, storeProductProfile, organizationProductListing, alreadyExisted }`
- 에러: 400 `*_REQUIRED` / 404 `*_NOT_FOUND` / 409 `CANDIDATE_NOT_LINKABLE`·`CANDIDATE_NOT_MATCHED`

---

## 6. Operator UI Changes

`ProductCandidateReviewPage` 상세 모달에 "활용 상품으로 추가" 섹션:
- `matchedProductMasterId` 없으면 안내문(비활성) — "먼저 재매칭/수동매칭하세요"
- 있으면 organizationId/serviceKey 입력(후보값 자동 prefill) + 매장 표시명(선택) + 추가 버튼
- 성공 시 메시지("활용 상품으로 추가되었습니다" / "이미 추가된 활용 상품입니다") + 상세/목록 새로고침
- `linked` 상태 배지/필터 탭 추가
- 입력은 1차로 org/serviceKey 직접 입력(자동 prefill). 조직 검색 UI 는 후속(WO §5 허용).

---

## 7. Idempotency Policy

- profile: `ON CONFLICT (organization_id, master_id) DO NOTHING` → 동일 org+master 중복 생성 없음
- listing: `ON CONFLICT (organization_id, service_key, master_id) WHERE offer_id IS NULL DO NOTHING` → 동일 org+serviceKey+master(master-only) 중복 없음
- 충돌 시 기존 row lookup 반환, `alreadyExisted=true`
- 재호출 안전 (멱등)

---

## 8. Permission / Boundary

- operator/admin guard + `injectServiceScope` (Phase 3 컨트롤러 상속)
- `organizationId` + `serviceKey` 는 operator 가 명시 제공 (membership derive 아님 — operator 가 조직 대행)
- Store Ops boundary(CLAUDE.md §7) = organization_id; listing 은 (org, service_key, master) 기준. self-service(약국/매장 사용자 직접 전환)는 후속 분리.

---

## 9. What Was Not Changed

- ✅ ProductMaster 신규 생성 없음 (`approveAsNewProductMaster` 미호출)
- ✅ ProductIdentifier 구조 변경 없음
- ✅ ProductCandidate table migration 없음 (status union 에 `linked` TS/varchar 추가만)
- ✅ MobileProductDraft 구조 변경 없음
- ✅ SupplierProductOffer 흐름 변경 없음 (master-only listing, offer_id=NULL)
- ✅ StoreProductProfile / OrganizationProductListing 기존 구조 변경 없음 (canonical INSERT 재사용)
- ✅ OTC/Rx 미구현
- ✅ 모바일 UI 미구현
- ✅ 약국/매장 사용자-facing 등록 화면 미구현
- ✅ 조직 검색 UI 신규 구현 없음 (직접 입력 + prefill)
- ✅ product_masters.barcode 변경 없음

---

## 10. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit -p tsconfig.json` | ✅ 0 errors |
| web-neture `tsc --noEmit` | ✅ 0 errors |
| 기존 ProductCandidate API no-regression | ✅ (additive endpoint) |
| store-core 엔티티 compile 영향 | ✅ 무변경 |
| idempotency (ON CONFLICT DO NOTHING + lookup) | ✅ SQL 검토 |
| ProductMaster 자동 생성 없음 | ✅ |

> 정적(컴파일 + SQL/코드 경로) 검증 기준. 실제 동작(매칭 후보 → listing/profile 생성, 재호출 멱등, 미매칭 후보 비활성)은 배포 후 `/operator/product-candidates` 브라우저 smoke + DB 확인. (참고: 브라우저 lock 이슈는 Phase 5 와 동일 — 가용 시 수행)

---

## 11. Follow-ups

| # | 항목 |
|---|---|
| F1 | 브라우저 라이브 smoke (활용 상품 추가 → 내 약국/매장 노출 확인) — 2026-06-06 부분 수행: 배포·페이지 렌더·`linked` 탭·API(create/archive) end-to-end PASS. link-to-listing 시각 검증은 service-scoped operator 계정 부재로 보류(전 계정 platform:super_admin → page list 무scope 400). 상세는 [`CHECK-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1`](CHECK-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1.md) §10.1 |
| F2 | 조직 검색 picker (현재 organizationId 직접 입력) |
| F3 | listing/profile 생성 결과 상세 요약 표시(현재 메시지 + rawPayload.link) |
| F4 | 약국/매장 self-service 후보 활용 전환(operator 외) |
| F5 | 다음 단계: 비의약품/OTC extension 분기 (Phase 6) |

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** 구현·정적검증 완료 / 브라우저 smoke 후속. 운영 루프(수집→검토→연결→활용상품 추가) 1차 완결.
