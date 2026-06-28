# IR-O4O-NETURE-PRIVATE-OFFER-SELLER-IDS-CREATE-UPDATE-INVARIANT-AUDIT-V1

> `create` vs `update` 의 PRIVATE seller-ids 검증 비대칭이 **실사용 경로에서 수정 불가 상품을 만들 수 있는지** read-only 조사. **코드/데이터 변경 없음.**
>
> 선행: `IR-O4O-NETURE-PRODUCT-DRAWER-B2C-DESCRIPTION-SAVE-PERSISTENCE-AUDIT-V1` §5
> 작성일: 2026-06-28 · 결론: **실사용 경로(기본 PRIVATE 등록)로 재현 가능한 실결함 → 코드 수정 WO 권고(옵션 A).**

---

## 1. 핵심 비대칭 (확정)
| | create (`createSupplierOffer`, offer.service.ts:923) | update (`updateSupplierOffer`, offer.service.ts:1053) |
|---|---|---|
| PRIVATE + seller 없음 | **허용** — `allowedSellerIds:[]` 항상 강제(line 997), `validateCreateInput`(812)는 `PUBLIC_REQUIRES_DESCRIPTION`만 검사 | **전면 차단** — line 1159-1163 가드가 `offer.save()`(1165) 직전 `PRIVATE_REQUIRES_SELLER_IDS` 반환 |
| 영향 범위 | — | name/price/stock/**consumerDetailDescription** 등 **모든 필드 수정 불가**(가드가 필드 적용 후 save 전) |

## 2. 조사 항목별 결과
1. **Wizard 기본 distributionType** = **PRIVATE**. `SupplierProductCreatePage.tsx:97-99`: `importDraft?.isPublic ? 'PUBLIC' : (serviceKeys?.length ? 'SERVICE' : 'PRIVATE')`. 신규 등록(importDraft 없음)·서비스 미선택 → **PRIVATE 기본값**.
2. **PRIVATE 시 allowedSellerIds 입력 필수 아님** — Wizard/ProductForm 어디에도 seller(판매처) 입력 UI 없음. distribution 은 `isPublic` 토글 + `serviceKeys` 두 축이며 PRIVATE 는 "둘 다 아님"의 **파생 결과**(ProductForm.tsx:65-68). create 도 `allowedSellerIds:[]` 고정.
3. **offer 생성 경로**: 단일 서비스 `createSupplierOffer` 로 수렴 — (a) 신규 등록 Wizard, (b) Import Assistant(`importDraft`→동일 Wizard), (c) CSV 일괄(같은 service). 모두 `allowedSellerIds:[]`. 운영자 직접 생성 경로는 본 서비스 외(별도).
4. **create 가 PRIVATE-no-seller 허용하는 이유**: 모델상 PRIVATE = "공개도 서비스공급도 아님"의 기본/초안 상태. seller 는 이후 `updateDistribution`(공급 방식 변경 모달)에서 부여하는 설계. 즉 **불완전 PRIVATE 를 초안으로 허용**하는 정책.
5. **update 차단 범위**: 가드가 모든 필드 대입(1088-1157) **후** save 전(1159) 위치 → PRIVATE-empty offer 는 설명/가격/이름/재고 **무엇도 저장 불가**. (B2B 전용 모드는 별도 분기 1294로 우회 가능하나, B2C/기본 정보 저장은 불가.)
6. **초안 vs 승인/활성화 검증 차이**: create→`PENDING`/`isActive:false`. PRIVATE seller 가드는 **기본 edit(updateSupplierOffer)에 상존**하며 승인 단계와 무관 → **초안 상태에서도 편집 차단**. 승인요청/활성화 전용 검증과 분리되어 있지 않음(=문제의 핵심).
7. **운영 DB PRIVATE+빈 allowedSellerIds 건수**: ⚠️ **CLI 측정 실패** — `gcloud sql connect` 가 IP allowlist 후 psql 연결에서 hang(본 환경 방화벽/SSL). **Cloud Console SQL editor 로 §5 쿼리 실행 권고**.
8. **실제 수정 불가 여부**: ✅ **확정** — read-only 라이브 재현(PATCH `{consumerDetailDescription}` → `success:false, error:PRIVATE_REQUIRES_SELLER_IDS`) + 코드(가드 위치). 선행 IR 에서 재현·정리 완료.
9. **프론트 success:false 처리**: ✅ 정상 — `ProductDetailDrawer.tsx:356-360` `if(!result.success) toast.error(...)+return`. API 는 HTTP **400**(controller:272) 반환, axios throw→catch→`success:false`. **HTTP 성공처럼 처리하지 않음**.
10. **오류 toast 표시**: 표시되나 **원문 에러코드** 노출(`저장 실패: PRIVATE_REQUIRES_SELLER_IDS`) — 사용자 친화 메시지 아님(부차 개선 대상).

## 3. 판단 (요청 기준 적용)
- create 가 **불완전 PRIVATE 를 초안으로 허용/기본**하고(2·4), 그 상태가 **기본 Wizard 경로로 도달 가능**(1)하며, **실제로 모든 수정이 막힘**(5·8)이 확인됨. → **테스트 데이터 한정 아님 = 실결함**.
- 따라서 요청 기준의 **첫 번째 정책 방향**이 적합: *"불완전 PRIVATE 를 초안으로 허용하는 정책이면, 일반 정보 수정은 허용하고 sellerIds 필수 검사는 승인 요청·활성화·distribution 변경 시점으로 이동."*

## 4. 권고 (별도 WO — 코드 변경)
**옵션 A (권장):** `updateSupplierOffer` 의 `PRIVATE_REQUIRES_SELLER_IDS` 가드를 **무조건 차단에서 distribution 불변식 검사로 한정**.
- 설명/가격/이름/재고 등 **비-distribution 필드 수정은 PRIVATE-empty 에서도 허용**.
- seller 필수는 **distribution 변경(updateDistribution)·승인 요청·활성화(isActive=true)** 시점에만 강제.
- (대안 옵션 B: create 부터 동일 invariant 강제 = PRIVATE 선택 시 seller 입력 필수 + Wizard 기본값 재검토. 초안 허용 정책과 상충하므로 비권장.)
- 부수: 오류 toast 를 코드 대신 한국어 안내로(예: "비공개 상품은 대상 판매처를 먼저 지정해야 저장됩니다").

→ 사용자 승인 후 `WO-O4O-NETURE-PRIVATE-OFFER-EDIT-LOCK-RECONCILE-V1`(가칭)로 분리 권장.

## 5. 운영 DB 확인 쿼리 (Console SQL editor, read-only)
```sql
SELECT distribution_type, count(*) AS total,
  count(*) FILTER (WHERE allowed_seller_ids IS NULL OR cardinality(allowed_seller_ids)=0) AS empty_sellers,
  count(*) FILTER (WHERE distribution_type='PRIVATE'
    AND (allowed_seller_ids IS NULL OR cardinality(allowed_seller_ids)=0)) AS private_stuck
FROM supplier_product_offers
GROUP BY distribution_type ORDER BY 1;
```
`private_stuck` > 0 이고 그 중 테스트(`[E2E_TEST]` master 등) 외 실 supplier offer 가 있으면 영향 규모 확정.

## 6. 테스트 데이터
- 본 조사는 코드 정적 추적 + 선행 IR 의 재현 결과 재사용. 본 IR 자체는 신규 offer 생성 없음(운영 DB 쿼리도 미완 — 변경 0).

---

**작성:** O4O Platform Team · 2026-06-28
**상태:** 조사 완료(코드 변경 0). **실사용 경로(기본 PRIVATE 등록)로 수정 불가 offer 생성 가능 = 실결함.** 권고=옵션 A(비-distribution 수정 허용 + seller 검사를 승인/활성화/distribution 변경 시점으로 이동). 운영 DB 건수는 Console SQL 로 확인 권고(CLI 측정 불가).
