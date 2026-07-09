# CHECK-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1

> 대응 IR: `IR-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1`
> 실행일: 2026-07-09 · 성격: **read-only 조사**. QR 자체 구현 논의 제외.
> **코드 구현 0 / DB write 0 / migration 0 / deploy 0 / 콘텐츠·QR 생성 0.**

---

## 1. 조사한 문서

- SSOT/베이스라인: O4O-3-ROLE-FLOW-BASELINE-V1, O4O-BUSINESS-PHILOSOPHY-V1, PLATFORM-CONTENT-POLICY-V1(F4), CONTENT-STABLE-DECLARATION-V1(F5), O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1(F12), IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1
- 선행: IR-...-PHOTO-TO-DESCRIPTION-QR-FLOW-AUDIT-V2, WO-...-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1, IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1, IR-O4O-OSMU-CONTENT-CONVERSION-CONCEPT-V1

## 2. 조사한 코드/테이블/API/화면

- **테이블**: shared_product_descriptions, product_candidate_description_drafts, supplier_product_offers, product_masters, product_candidates, kpa_contents, operator_multilingual_product_content_*, store_multilingual_product_content_*, store_execution_assets, o4o_asset_snapshots, kpa_store_contents, kpa_working_contents, store_asset_derivations, store_tablet_displays, tablet_interest_request, store_qr_codes
- **API**: /supplier/products*, /operator/products*, /admin/shared-product-descriptions*, /admin/o4o-product-db/description-review-queue, /api/v1/kpa/contents*, /operator/multilingual-product-contents*, /pharmacy/multilingual-product-contents*(+/hub,/import), /store-library/contents, /store-contents*, /pharmacy/pop/generate, /qr/public/:slug, store-tablet
- **화면**: SupplierProductCreatePage/SupplierB2BContentPage, OperatorContentHubPage, OperatorMultilingualContentListPage, HubMultilingual/ContentLibraryPage, StoreHandledProductsPage(+DescriptionSelectionModal), StoreLibraryContentsPage, StorePopPage, StoreTabletDisplaysPage, admin o4o-product-db

## 3. 핵심 결론

- 저장 계층·매장 "가져오기=복사"·"복사본 독립 수정" 견고. 단절은 **주체 인계 지점**과 **OSMU 변환**.
- **거버넌스 정합**: 공급자는 원천 자료 제공만(직접 콘텐츠 제작=Drift). WO의 "공급자 콘텐츠 등록 요청"은 "원천 자료 제출 → 운영자 등록"으로 재해석.
- 3대 단절: (A) offer 승인↔SPD canonical 자동연결 없음 (B) `SUPPLIER_STORE` 생산 경로 0건(소비만) (C) OSMU 통합 변환기 없음(계보추적만).

## 4. 제품 콘텐츠 / 매장 콘텐츠 업무동선 정리

- 표준/공급자/운영자/매장 4주체 흐름 As-Is + 단절을 IR §5~§8에 정리.
- QR/POP/태블릿/상담 연결점 IR §9 (QR page 2단 우선순위 존재, 태블릿=제품 attachment, 상담=CTA만, OSMU 부재).
- 콘텐츠 우선순위(§14)·상태 모델(§15)·source/owner 모델(§16)·권한 모델(§17) 제안.

## 5. 단절 지점 (요약)

G1 승인↔SPD 자동연결 · G2 SUPPLIER_STORE 생산경로 · G3 제출/반려/이력 상태 · G4 운영자 콘텐츠 매장노출 단일진입점(+kpa_contents 3축 컬럼 부재) · G5 OSMU 변환기 · G6 통합 상태/출처/소유 모델 · G7 태블릿/상담 활용 얕음.

## 6. QR 자체 구현 논의 제외 여부

- ✅ 제외. QR 생성 정책(slug/bulk/seed/publicKey/대표QR+언어탭)은 재논의하지 않음. QR은 콘텐츠 활용 연결점(§9)으로만 다룸. (참고: 동시 트랙에서 매장 다국어 publicKey QR MINIMAL이 별도 DONE.)

## 7. 후속 WO 제안 (우선순위)

1. `WO-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1` (G1)
2. `WO-O4O-PRODUCT-CONTENT-SUPPLIER-STORE-PRODUCER-V1` (G2)
3. `WO-O4O-OPERATOR-PRODUCT-CONTENT-HUB-BROWSE-UNIFY-V1` (G4)
4. `WO-O4O-PRODUCT-CONTENT-STATUS-AND-HISTORY-MODEL-V1` (G3/G6)
5. `WO-O4O-STORE-PRODUCT-CONTENT-TO-QR-POP-TABLET-ACTIONS-V1` (G7)
6. `WO-O4O-OSMU-CONTENT-CONVERSION-LAYER-V1` (G5)

## 8. 금지사항 준수

```text
코드 구현 0 / DB write 0 / migration 0 / deploy 0
콘텐츠 생성 0 / QR 생성 0 / 신규 테이블 0
동시 세션 WIP 미접촉 (read-only 조사만)
```

## 산출물

```
docs/investigations/IR-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1.md (신규)
docs/checks/CHECK-O4O-PRODUCT-CONTENT-TO-STORE-CONTENT-WORKFLOW-AUDIT-V1.md (신규)
```
