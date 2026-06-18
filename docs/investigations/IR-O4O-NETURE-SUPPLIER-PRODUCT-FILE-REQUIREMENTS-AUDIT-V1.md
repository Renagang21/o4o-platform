# IR-O4O-NETURE-SUPPLIER-PRODUCT-FILE-REQUIREMENTS-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** Neture 공급자 **제품 등록** 단계의 파일·이미지·허가/증빙 요구사항.
> **핵심 결론: 제품 등록 단계는 법정 증빙 파일을 전혀 요구하지 않는다(번호 only). 철학과 거의 완전 정합.** 일반 상품=기본정보+이미지(선택) 중심, 규제 상품=번호(mfdsPermitNumber)+규제명(텍스트), license/cert PDF 0, 사업자/통신판매/정산 서류 재요구 0. **과도 파일 요구 없음.** 실제 gap 1건 = 운영자 제품 승인이 binary(approve/reject), 제품단계 '보완(needs-info)' status 부재.
> 선행: IR-O4O-NETURE-SUPPLIER-REGISTRATION-REQUIREMENTS-AUDIT-V1 — 2026-06-17

---

## 0. 결론 요약 (TL;DR)

핵심 질문 "제품 등록 단계에서 과도한 파일 제출 요구가 있는가?" → **아니오.**

| 항목 | 결과 |
|------|------|
| 제품 단계 license/cert **PDF 파일** | **0** — 서버·클라이언트 어디에도 제품 허가증/신고증/인증서/시험성적서/광고심의 파일 업로드 **없음** |
| 규제 정보 | **번호/텍스트 only** — `mfdsPermitNumber`(번호) + `regulatoryName`(식약처 공식명, 텍스트). 파일 아님 |
| 대표/상세 이미지 | **선택**(required 아님, submit 미차단). PUBLIC 유통 시 `consumerShortDescription`(텍스트)만 필수 |
| 자유 첨부파일 | **없음**(이미지 + RichText 설명만) |
| 사업자/통신판매/정산 서류 재요구 | **0** — 전부 공급자 단계 entity, 제품 단계 미재요구 |
| 일반 상품 | 기본정보+카테고리+가격+이미지(선택)+설명 — **규제 필드/파일 0** |
| 증빙 PDF 위치 | **공급자 단계**(regulated-category evidence), 제품 단계 아님 |

→ **이전 IR 결론(공급자 등록은 낮은 장벽) + 본 IR(제품 등록도 파일 과도 요구 없음) = 전체 흐름이 철학에 정합.** 제품 단계 정비(파일 완화)는 **사실상 불필요(no-op)**. 유일한 실질 개선 후보 = 제품 승인의 운영자 '보완' status 추가.

---

## 1. 현재 제품 등록 흐름

- 진입: `SupplierProductRegisterEntryPage`(의약품/비의약품 → OTC/Rx → 단건/대량) → `SupplierProductCreatePage`(3-step wizard: 기본정보 / 가격 / 이미지·설명).
- 생성: `POST /neture/supplier/products`(`supplierApi.createProduct`) → `NetureOfferService.createSupplierOffer`(ProductMaster + SupplierProductOffer). 이미지 업로드는 생성 후 비동기(`POST /neture/products/:masterId/images`).
- 승인 요청: 별도 `POST /neture/supplier/products/submit-approval`(목록에서). 생성 ≠ 승인요청.

## 2. 제품 등록 파일/이미지 요구

| 항목 | 필수? | 제한 | 위치 |
|------|:--:|------|------|
| 대표 이미지(thumbnail) | **선택** | image/* (클라 mime만), 1장 | FE 765–799, `uploadProductImage` |
| 상세/성분 이미지(content) | **선택** | image/*, 다중 | FE 801–834 |
| 상품 설명(소비자 간이) | PUBLIC 시 **필수**(텍스트) | RichTextEditor HTML | FE 847, val 299 |
| 상품 상세 설명 | 선택 | RichTextEditor HTML(인라인 이미지→media) | FE 859 |
| 법정 증빙 PDF(허가/신고/인증/시험/광고) | **없음** | — | 제품 단계 미존재 |
| 자유 첨부파일 | **없음** | — | 미존재 |

- 이미지도 서버 required 아님(ProductImage optional, 승인 미차단 — 완성도 점수에만 반영).

## 3. 제품 등록 번호/허가/인증 필드

- `regulatoryType`(GENERAL/QUASI_DRUG/MEDICAL_DEVICE/HEALTH_FUNCTIONAL/COSMETIC/DRUG) — 항상 표시(기본 GENERAL).
- 규제 카테고리(`category.isRegulated=true`)일 때만: `regulatoryName`(**필수**, 텍스트) + `mfdsPermitNumber`(선택 입력, 번호).
- **모두 번호/텍스트** — 파일 아님. 형식/존재 검증 없음(메타데이터).

## 4. 품목군별 제품 파일 매트릭스

| 품목군 | 제품 번호 필드 | 제품 **파일** 필드 | 파일 필수 | submit gate 영향 | 운영자 노출 | 과도 | 정비 |
|------|------|:--:|:--:|------|------|:--:|------|
| 일반(GENERAL) | regulatoryType(GENERAL) | **없음** | — | 없음 | 이미지/번호 | **없음** | 불요 |
| 의약품(DRUG) | regulatoryType+규제명+mfdsPermitNumber | **없음** | — | 공급자 category 'approved' + permit(승인) | 번호/규제필드/이미지 | 없음(번호 only) | 불요 |
| 의약외품(QUASI_DRUG) | 〃 | **없음** | — | 〃 | 〃 | 없음 | 불요 |
| 의료기기(MEDICAL_DEVICE) | 〃 | **없음** | — | 〃 | 〃 | 없음 | 불요 |
| 건강기능식품(HEALTH_FUNCTIONAL) | 〃 | **없음** | — | 〃 | 〃 | 없음 | 불요 |
| 식품(food) | (카테고리 isRegulated 여부 따름) | **없음** | — | 〃 | 〃 | 없음 | 불요 |
| 화장품(COSMETIC) | 〃 | **없음** | — | 〃 | 〃 | 없음 | 불요(책임판매=공급자단계) |
| 기타 | 〃 | **없음** | — | 〃 | 〃 | 없음 | 불요 |

→ **전 품목군 제품 단계 파일 필드 0.** 과도 요구 없음.

## 5. frontend validation 위치

`SupplierProductCreatePage` — step1: marketingName+categoryId(+규제 시 regulatoryType/regulatoryName) val(266–271), step2: priceGeneral>0(275), step3: PUBLIC→consumerShortDesc(299). **파일/이미지 필수 검증 없음.** 제품 생성 후 이미지 비동기 업로드(선택).

## 6. backend validation 위치

`offer.service.createSupplierOffer`(909): 공급자 ACTIVE 필수, regulated 시 regulatoryType/regulatoryName/manufacturerName 필수, `mfdsPermitNumber`는 `isMfdsVerified=false`일 때만 필수(`PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED`), PUBLIC→consumerShortDescription. **파일/문서 서버 필수 0.** `assertRegulatedPermit`(79–94): registration(미검증 시 번호) / approval(번호 필수). 전부 **번호**.

## 7. DB/entity 저장 구조

- `ProductMaster`(barcode/regulatoryType/regulatoryName/mfdsPermitNumber/drugCategory) — 번호/텍스트. **license file 컬럼 없음.**
- `ProductDrugExtension`(approvalNumber/efficacy/dosage 등) — 규제품만, 생성 후 enrichment(초기 null). 파일 아님.
- `ProductImage`(imageUrl/gcsPath/type) — 선택, 정보용.
- **제품 단계 "document/attachment/license-file" entity 부재.** 증빙 파일은 공급자 단계 `KycDocument`/`NetureSupplierRegulatedCategory.evidenceDocumentId`만.

## 8. submit-approval gate 영향

`submitForApproval`(411–510): ① 공급자 regulated-category status='approved'(번호/status, **파일 아님**) ② service eligibility(glycopharm/kpa-society/k-cosmetics) ③ pharmacy-audience(규제품) ④ 승인 시 mfdsPermitNumber. **파일 게이트 0.**

## 9. operator/admin 승인 화면 노출

- 운영자 뷰: productName/barcode/regulatoryType/**mfdsPermitNumber(번호)**/isMfdsVerified/imageUrl/imageCount/completenessScore/serviceKeys/price/hasShort·DetailDescription.
- 액션: **approve / reject(사유 텍스트)** — **binary**. 파일 부재로 승인 차단 안 됨(이미지 optional).
- ⚠️ **제품 단계 '보완(needs-info)' status 부재** — 공급자 regulated-category엔 `needs_update` 있으나, 제품 승인엔 pending→approved|rejected만.

## 10. 공급자 등록 서류와 제품 등록 서류 중복

- **중복 0.** 사업자등록증/통신판매업/정산통장 = `NetureSupplier` 필드(공급자 단계). 품목군 증빙 = `NetureSupplierRegulatedCategory`(공급자 단계). 제품 create/submit/approval에서 **재요구·재검증 없음**.

## 11. 네이버/쿠팡 대비 과도 후보

| 항목 | 현재 Neture(제품 단계) | 네이버/쿠팡 | 판단 |
|------|------|------|------|
| 일반 상품 제품 등록 | 기본정보+이미지(선택) | 동일 | ✅ 적정 |
| 규제 제품 허가 | 번호(mfdsPermitNumber)+규제명 | 번호/카테고리 중심 | ✅ 적정(번호 only) |
| 법정 증빙 PDF | **요구 안 함** | 정책별(보완 요청) | ✅ 오히려 가벼움 |
| 이미지 | 선택 | 보통 대표 1장 권장 | ✅(필요시 권장만) |

→ 제품 단계는 **과도 없음**(오히려 가벼움). 단 이미지가 완전 선택이라 품질 측면 권장 강화는 별개.

## 12. 정비 우선순위

1. **제품 단계 파일 완화 WO 불요(no-op)** — 제거할 파일 요구가 없음. (예상 후보 GENERAL-NO-REGULATORY-FILE / NUMBER-FIRST / IMAGE-VS-LEGAL-SEPARATION / DUPLICATE-BUSINESS-DOC 모두 **현 상태 충족 → 신규 작업 불요**.)
2. **(실질 개선) 운영자 제품 승인 '보완(needs-info)' status 추가** — 현재 binary(approve/reject). 공급자 regulated-category 의 needs_update 와 대칭 보완. → `WO-O4O-NETURE-OPERATOR-PRODUCT-APPROVAL-NEEDS-INFO-V1`(중규모, offer-service-approval + 운영자 UI).
3. (선택·소) 규제 정보 FE 노이즈: regulatoryType 드롭다운 step1+규제섹션 **중복 표시** 정리. `WO-...-PRODUCT-FORM-REGULATORY-DEDUP-V1`(frontend-only).
4. (선택) 규제 상품 `regulatoryName` 필수의 UX(식약처 자동조회 연동 시 자동채움) — 번호 우선 강화. 별 IR.

## 13. 구현 WO 후보 (대부분 no-op 확인)

| 예상 후보 | 판단 |
|------|------|
| GENERAL-NO-REGULATORY-FILE | **불요** — 제품 단계 일반상품 규제 파일 0 |
| PRODUCT-NUMBER-FIRST-REGULATORY-FIELDS | **불요** — 이미 번호 only(파일 없음) |
| IMAGE-VS-LEGAL-DOCUMENT-SEPARATION | **불요** — 법정 증빙 파일 자체가 제품 단계 없음 |
| DUPLICATE-BUSINESS-DOC-REMOVAL | **불요** — 중복 0 |
| **OPERATOR-PRODUCT-APPROVAL-NEEDS-INFO**(신규) | **권장** — 제품 승인 보완 status 추가 |
| PRODUCT-FORM-REGULATORY-DEDUP(선택) | 소규모 FE 노이즈 정리 |

## 14. 중단/주의

- 제품 단계 정비는 "파일 줄이기"가 목적이었으나 **줄일 파일이 없음** → 본 IR 은 "과도 없음" 확인으로 종료. 추가 구현은 §12-2(보완 status)만 실익.
- 보완 status 추가는 `offer_service_approvals` status enum + 운영자 UI + submit gate 영향 → 중규모, 별 WO.

## 15. Current Structure vs O4O Philosophy Conflict Check

| 질문 | 답 |
|------|------|
| 제품 등록이 진입장벽을 과도하게 높이나? | **아니오** — 기본정보+이미지(선택), 파일 0 |
| 일반 상품에 법정 증빙 파일 요구? | **아니오** |
| 번호로 될 걸 파일 필수로? | **아니오** — 규제 정보 번호/텍스트 only |
| 이미지와 법정 증빙 혼재? | **아니오** — 법정 증빙 파일 제품 단계 부재 |
| 공급자 서류 제품 단계 중복? | **아니오** |
| 허가·인증이 제품 단계에 머무나? | **예** — ProductMaster/DrugExtension(번호), 공급자 단계와 분리 |
| 운영자 보완으로 될 걸 최초 필수로? | **아니오**(필수 최소). 단 제품 승인엔 '보완' status 자체가 없음(→ §12-2 개선) |

→ **충돌 사실상 없음.** 전체 공급자+제품 흐름에서 실제 over-ask 는 (이전 IR) **공급자 프로필 일반상품 FE 노이즈 + 규제 category 파일-트리거** 2건뿐. 제품 단계는 깨끗.

## 16. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정적 분석만(운영 데이터 미조회), 산출물 = 본 문서 1개(path-specific)
```

---

*read-only · 제품 등록 단계 법정 증빙 파일 요구 0(번호 only), 이미지 선택, 사업자서류 재요구 0, 일반상품 규제필드 0 → 철학 정합 · 제품 파일 완화 WO 불요(no-op) · 실질 개선 = 운영자 제품 승인 '보완(needs-info)' status 추가 + (선택) FE regulatoryType 중복 정리 · 전체 over-ask 는 공급자 프로필 단계 2건(이전 IR)뿐.*
