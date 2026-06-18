# IR-O4O-NETURE-SUPPLIER-REGISTRATION-REQUIREMENTS-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** Neture 공급자 등록(business-profile/onboarding/regulated-category) 요구사항 현황 + 공급자/제품/운영자 단계 분리.
> **핵심 결론: 현재 구조는 진입장벽 철학과 상당 부분 이미 정합.** 일반 상품 backend 완전 면제, ACTIVE 전환은 기본 온보딩만, 제품 허가는 제품 단계 포착, 보완요청(needs_update) 존재. **정비 대상은 2개로 좁음** — ① frontend 가 일반 상품에 번호/파일 입력란 표시(선택이나 오해 유발), ② 규제 품목군 'submitted' status 가 **파일 업로드 트리거**(번호 우선과 어긋남).
> 선행: WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1 등 — 2026-06-17

---

## 0. 결론 요약 (TL;DR)

| 철학 원칙 | 현재 상태 | 판정 |
|------|------|------|
| 일반 상품 서류 없음 | backend **완전 면제**(번호/파일/게이트 0). frontend 만 선택 입력란 노출 | ✅ backend OK / ⚠️ frontend 노이즈 |
| 번호로 확인 가능한 건 번호 우선 | 번호는 free-text 선택(서버 미검증). **단 'submitted' status 는 파일 업로드로만 전이**(번호만으론 운영자 검토 진입 불가) | ⚠️ 파일이 사실상 트리거 |
| 파일은 선택/보완요청 | UI `required` 아님, 폼 제출 미차단. 단 위 트리거 이슈 | ◐ |
| 제품 허가·인증은 제품 등록 단계 | ProductMaster(regulatoryType/mfdsPermitNumber)+ProductDrugExtension **제품 단계 포착**, approval 시 PERMIT 게이트 | ✅ 이미 정합 |
| 고위험만 공급자 단계 자격 확인 | 규제 품목군 'approved' 가 **제품 판매(submit-approval) 게이트**(ACTIVE 게이트 아님) | ✅ 적절 |
| 운영자 보완 요청 | `needs_update` status + 운영자 review endpoint **존재·동작** | ✅ 이미 존재 |

→ **"서류를 대거 줄이자"가 아니라, frontend 일반상품 정리 + 규제 품목군 번호-우선 정렬 2건이 핵심.** 제품단계 분리·보완요청은 이미 구현됨.

---

## 1. 현재 공급자 등록 흐름

- 화면: `/mypage/business-profile` → `SupplierProfilePage`(web-neture). 섹션: A-2 서류·정산 / A-3 통신판매업 / A-4 공급 예정 품목군.
- backend: `/neture/supplier/onboarding`(PATCH), `/supplier/documents/:type`(POST), `/supplier/regulated-categories`(GET/POST/PATCH/DELETE + /:cat/document POST), 운영자 `/operator/suppliers/:id/regulated-categories/:cat`(PATCH review).
- 데이터: `NetureSupplier`, onboarding 필드, `NetureSupplierRegulatedCategory`(category/status/registrationNumber/evidenceDocumentId/reviewedBy/reviewNote), `KycDocument`(PDF, mime 제한).

## 2. 품목군별 요구 매트릭스

| 품목군 | FE 번호입력 | FE 파일 | FE 필수(client) | BE 번호 필수 | BE 파일 필수 | 차단 대상 | 과도 | 정비 후보 |
|------|:--:|:--:|:--:|:--:|:--:|------|:--:|------|
| 일반 상품(general) | 표시(선택) | 표시(선택) | ✗ | ✗ | ✗ | **없음(면제)** | ⚠️ FE 노이즈 | FE 증빙란 미표시 |
| 의약품 | 표시(선택) | 표시 | ✗ | ✗(free-text) | 'submitted'엔 파일 필요 | 제품 submit-approval | ◐ | 번호우선 |
| 의약외품 | 〃 | 〃 | ✗ | ✗ | 〃 | 제품 submit-approval | ◐ | 번호우선/제품단계 |
| 의료기기 | 〃 | 〃 | ✗ | ✗ | 〃 | 제품 submit-approval | ◐ | 번호우선 |
| 건강기능식품 | 〃 | 〃 | ✗ | ✗ | 〃 | 제품 submit-approval | ◐ | 번호우선 |
| 식품 | 〃 | 〃 | ✗ | ✗ | 〃 | 제품 submit-approval | ◐ | 번호우선 |
| 화장품 | 〃 | 〃 | ✗ | ✗ | 〃 | 제품 submit-approval | ◐ | 책임판매자만 |
| 기타 법정 | 〃 | 〃 | ✗ | ✗ | 〃 | 제품 submit-approval | ◐ | 번호우선 |

- FE: 모든 품목군 **동일 렌더**(category 분기 없음). 번호=`(선택)`, 파일=`required` 없음, 폼 제출 미차단(`SupplierProfilePage` A-4).
- BE: general **면제**. 규제 품목군은 번호 미검증(free-text), **evidence PDF 업로드 시 status `submitted`** → 운영자 review → `approved`. registrationNumber 만으론 status 미전이.

## 3. backend 필수 검증 위치

- 규제 category: `supplier-regulated-category.service` — `uploadEvidence()`(PDF 포맷만 강제, status→submitted), `updateCategory()`(번호 free-text nullable), `review()`(운영자 status 변경 + reviewNote), `evaluateGate()`(status==='approved' 여부).
- general: 어떤 검증도 없음(완전 면제).

## 4. DB 저장 구조

`NetureSupplierRegulatedCategory`: id/supplierId/category/status(not_requested|submitted|approved|rejected|needs_update|suspended)/registrationNumber(nullable)/evidenceDocumentId(→kyc_documents)/reviewedBy/reviewedAt/reviewNote.
`KycDocument`: documentType('regulated_category_evidence' 등)/fileUrl(gcs)/mimeType(application/pdf 제한)/verificationStatus.

## 5. 운영자 검토 흐름

- `PATCH /operator/suppliers/:id/regulated-categories/:category` → `review(status, reviewNote)`. status 를 approved/rejected/**needs_update(보완요청)**/suspended 로 전환 + 메모. → **보완요청 flow 이미 존재**. 공급자는 needs_update/rejected 시 재업로드(→submitted) 또는 category 삭제 가능.

## 6. ACTIVE 전환 차단 조건

`approveSupplier()` — PENDING→ACTIVE 는 **기본 온보딩만** 요구(`getMissingBasicOnboardingFields`): 사업자등록증 문서 + 정산은행/계좌/예금주 + 통장사본 문서 + 세금계산서 이메일(형식). **규제 category 승인은 ACTIVE 게이트 아님.** → 공급자는 규제 서류 0으로도 ACTIVE 가능(일반 상품 판매 가능).

## 7. 제품 submit-approval 차단 조건

`offer.service.submitForApproval()`:
- **규제 category 게이트**: 제품의 품목군이 규제면, 공급자 해당 category status='approved' 아니면 차단(`SUPPLIER_CATEGORY_NOT_APPROVED`/NEEDS_UPDATE/REJECTED/SUSPENDED/NOT_SELECTED).
- pharmacy-audience 게이트(drug 연결, 별도 IR), service eligibility.
- 제품 approval 시 `assertRegulatedPermit()`: 규제 제품 + `mfdsPermitNumber` 없으면 `PERMIT_REQUIRED_FOR_APPROVAL`.

→ **제품 자체 허가(품목허가/인증/KC)는 제품 단계(ProductMaster.mfdsPermitNumber/regulatoryType + ProductDrugExtension)에서 포착·게이트.** 공급자 단계와 분리되어 있음(이미 철학 정합).

## 8. 네이버/쿠팡 대비 과도 요구사항

| 항목 | 현재 Neture | 네이버/쿠팡 수준 | 판단 |
|------|------|------|------|
| 일반 상품 서류 | BE 면제 / FE 입력란 표시 | 요구 없음 | **FE만 과도(노이즈)** — 정비 |
| 통신판매업 | 번호(상태=신고완료 시 필수) / 파일 "선택" 명시 | 번호 중심·예외 | ✅ 이미 적정 |
| 규제 품목군 자격 | 'submitted'=파일 업로드 트리거(번호만으론 검토 진입 불가) | 자격 필요, 파일은 정책별 | **번호 우선으로 완화 후보** |
| 제품 허가·인증 | 제품 등록 단계 포착 | 제품 단계 | ✅ 이미 정합 |
| ACTIVE 진입 | 기본 온보딩만 | 사업자/정산 중심 | ✅ 적정 |

## 9. 단계 분리 현황 (A/B/C)

- **A. 공급자 등록(ACTIVE)**: 사업자등록증·정산·세금계산서 → **적정**(낮은 장벽).
- **B. 규제 품목군 자격(제품 판매 게이트)**: category 선택+evidence+운영자 승인 → 제품 submit-approval 시 적용. **공급자 ACTIVE 와 분리됨**(좋음). 단 'submitted' 가 파일 트리거인 점만 번호우선과 어긋남.
- **C. 제품 등록**: regulatoryType/mfdsPermitNumber/DrugExtension → **이미 제품 단계**. 추가 작업 거의 불요.

→ **A/B/C 분리는 이미 구조적으로 되어 있음.** 혼재는 "B의 파일 트리거" + "FE 일반상품 표시"뿐.

## 10. 정비 우선순위

1. **(명확·저위험) 일반 상품 FE 증빙란 제거** — general 선택 시 번호/파일 입력란 미표시(안내만). backend 이미 면제 → frontend-only.
2. **(중) 규제 품목군 번호 우선** — registrationNumber 입력만으로도 status→submitted(운영자 검토 진입) 가능하게, 파일은 선택/보완요청. backend `updateCategory`/status 전이 소폭 + FE 라벨.
3. (낮음/선택) 화장품: 책임판매업자만 자격, 일반 유통은 면제 구분(현재 단일 category) — 필요 시.
4. (이미 구현) 제품 단계 분리·보완요청 강화 — **신규 WO 거의 불요**(needs_update + 제품 permit 게이트 존재). 문구/UX 보강만 선택.

## 11. 구현 WO 후보

1. **`WO-O4O-NETURE-SUPPLIER-GENERAL-CATEGORY-NO-DOCUMENT-V1`**(권장 1차) — FE general 품목군 번호/파일 입력란 미표시 + 안내 문구. frontend-only, backend 무변경.
2. `WO-O4O-NETURE-SUPPLIER-REGULATED-CATEGORY-NUMBER-FIRST-V1` — 번호 입력만으로 submitted 진입(파일 선택화), 운영자 보완요청 시 파일 요청. backend status 전이 + FE.
3. (선택) `WO-O4O-NETURE-SUPPLIER-COSMETICS-RESPONSIBLE-SELLER-SPLIT-V1` — 화장품 일반유통 vs 책임판매자 구분.
4. (불요/보강) 제품 단계 분리·보완요청은 이미 구현 — 별도 큰 WO 불필요, 문구 보강만.

## 12. 중단/주의

- **'submitted' status 가 evidence 업로드와 강결합**(supplier-regulated-category.service.uploadEvidence) → #2 는 status 전이 로직 소변경 필요(번호 입력 경로에도 전이 추가). backend 변경이라 별도 WO 로 분리(본 IR 권장대로).
- 제품 submit-approval 게이트는 규제 품목군 'approved' 의존 → #2 변경 시 "번호만 제출→운영자 미승인" 동안 제품 판매는 여전히 차단(의도된 안전). general 은 영향 0.
- frontend #1 은 backend 면제 확인됨 → 안전.

## 13. Current Structure vs O4O Philosophy Conflict Check

| 질문 | 답 |
|------|------|
| 공급자 등록이 진입장벽을 과도하게 높이나? | **아니오(대체로)** — ACTIVE 는 기본 온보딩만. 규제 자격은 제품 판매 게이트로 분리. |
| 공급자 단계가 제품 단계 책임을 앞당기나? | **아니오** — 제품 허가는 제품 등록 단계(ProductMaster/DrugExtension)에서 포착. |
| 번호로 될 걸 파일로 강제하나? | **부분 yes** — 규제 품목군 'submitted' 가 파일 업로드 트리거(#2 정비 대상). |
| 비규제(일반)에 증빙 요구? | **backend 아니오 / frontend 표시(노이즈)** — #1 정비 대상. |
| 보완요청으로 될 걸 최초 필수로? | **아니오** — needs_update 보완 flow 존재. |

→ **충돌은 국소적(2건)**, 구조 전반은 철학 정합. 대규모 재설계 불요.

## 14. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정책값/파일/승인 로직 미변경, 운영 데이터 미조회(정적 분석)
✅ 산출물 = 본 문서 1개 (path-specific)
```

---

*read-only · 현재 공급자 등록 = 철학과 상당 정합(일반상품 BE 면제, ACTIVE 기본온보딩만, 제품허가 제품단계, 보완요청 존재) · 정비 2건만: ① FE 일반상품 증빙란 제거 ② 규제 품목군 번호-우선(파일 트리거 완화) · 제품단계 분리/보완요청 이미 구현 · 후속 P1 GENERAL-NO-DOCUMENT(FE), P2 REGULATED-NUMBER-FIRST(BE).*
