# IR-O4O-NETURE-SUPPLIER-PROFILE-CATEGORY-SELECTION-ONLY-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** 공급 예정 품목군을 프로필에서 **선택-only**로 하고 허가번호·증빙을 **상품 단계**로 이동(D3)할 때의 결합·영향·구현 경로.
> **핵심 결론: 결합은 단 1지점 — `submitForApproval`의 `evaluateGate`가 공급자 품목군 status='approved'를 요구. 프로필을 선택-only로 만들면 status가 'approved'에 도달하지 못해 모든 규제 상품 승인요청이 막힌다. 따라서 D3는 (a) 게이트를 '선택됨'에서 통과하도록 변경 + (b) 규제 검증을 상품 단계로 이전이 필수. 상품 단계엔 이미 번호 게이트(`mfdsPermitNumber`/`assertRegulatedPermit`)가 존재 → PDF 증빙만 신설/선택 여부 결정하면 됨. 중규모 backend 재설계.**
> 선행: IR-...-APPROVAL-GATE-REASON-DISCLOSURE-V1 · IR-...-PRODUCT-FILE-REQUIREMENTS-AUDIT-V1 — 2026-06-18

---

## 1. 현재 공급 예정 품목군 UI (프로필, Section A-4)

`SupplierProfilePage.tsx`(834-965):
- 카테고리 **체크박스**(선택/해제) — 859-863.
- **허가/신고 번호** input — 904-914 (비필수, blur 저장).
- **증빙 PDF** 업로드 — 917-940 (선택, 즉시 업로드).
- **검토 요청** 버튼 — 948-956 (번호 OR PDF 중 하나 있어야 가능, 412-415).
- `general`(일반)은 "서류 불필요" 배지(873-876).
- API: `supplierRegulatedCategoryApi.{list/select/remove/updateRegistrationNumber/submitForReview/uploadEvidence}` (`lib/api/supplier.ts:1187-1267`).

## 2. 품목군 lifecycle / 상태

`supplier-regulated-category.service.ts`:
- status: `not_requested / submitted / approved / rejected / needs_update / suspended`.
- `submitForReview`(213-229): status approved/suspended면 거부, **번호 OR 증빙문서 둘 다 없으면 `REVIEW_REQUIRES_NUMBER_OR_FILE`** → 있으면 status='submitted'.
- 운영자 review(`operator-supplier.controller.ts:151-170` → service.review 289-306): status를 approved/rejected/needs_update/suspended 로 설정.
- **`evaluateGate(category, statusMap)`(146-167): `status==='approved'` 일 때만 `allowed:true`.** not_requested→NOT_SELECTED, submitted/needs_update/rejected/suspended→NOT_APPROVED.

## 3. 결정적 결합 (단일 지점)

`offer.service.ts.submitForApproval`(411-524):
```
statusMap = getStatusMap(supplierId)               (446-447)
resolvedCategory = resolveRegulatedCategoryFromProduct(...)  (476-480)
gate = evaluateGate(resolvedCategory, statusMap)   (481)
if (!gate.allowed) skip(reason=gate.reasonCode); continue;   (482-484)
```
→ **규제 상품의 승인요청은 공급자 품목군 status='approved'에 전적으로 의존.** (상품 생성 `createSupplierOffer`는 품목군 게이트 없음 — ACTIVE만 요구. 즉 결합은 **승인요청(submit)** 단계 1곳.)

## 4. 상품 단계 규제 검증 — 현재 상태

- **번호 게이트 이미 존재**: `assertRegulatedPermit`(offer.service 79-94) — 규제 상품은 승인 시 `mfdsPermitNumber` 필수(미검증 시 등록 단계도 번호 요구). `ProductMaster`에 `regulatoryType/regulatoryName/mfdsPermitNumber`(번호) 보유.
- **운영자 상품 승인**(`operator-product-approval.controller.ts:178-223`): 규제 상품 `mfdsPermitNumber` 확인. **공급자 품목군 status는 미확인**(상품 자체 번호만).
- **PDF 증빙 없음**: 상품(ProductMaster)에 규제 증빙 **PDF/문서 필드 부재**, per-product review status 부재. (증빙 PDF는 현재 공급자 품목군 레벨에만 존재.)

→ **"번호 기반 규제"는 이미 상품 단계.** D3의 "증빙을 상품단계로"는 사실상 ① 공급자-품목군 'approved' 게이트 해제 + ② (선택) 상품 레벨 PDF 증빙 신설.

## 5. 선택-only 전환 시 깨지는 것 (확정)

프로필을 선택-only(번호/PDF/검토요청 제거)로 하면:
- 품목군 status가 **'approved'에 도달 불가**(검토요청 자체가 사라짐) → `evaluateGate` 가 항상 not_requested/submitted → **모든 규제 상품 승인요청 차단**(SUPPLIER_CATEGORY_*).
- 즉 **프로필 UI만 바꾸면 안 되고, §3 게이트를 반드시 함께 변경**해야 함.

## 6. 디커플 옵션

### 옵션 1 (권장) — '선택됨'에서 통과 + 규제는 상품 번호 게이트로
- 품목군 선택(row 존재)만으로 `evaluateGate` 통과하도록 변경(예: status가 not_requested/selected 도 allowed, 또는 신규 `selected` 의미 상태).
- 규제 적합성은 **상품 단계 `mfdsPermitNumber`/`assertRegulatedPermit`(이미 존재)** + 운영자 상품 승인에서 판정.
- (선택) 운영자 상품 승인 화면에 규제 증빙 PDF 첨부/확인 필드 신설.
- 프로필: 체크박스만(번호/PDF/검토요청 제거 또는 "필요 시" 접힘).
- 장점: 상품 단위 심사로 일원화, 가입/프로필 경량. 단점: 공급자-레벨 사전 스크리닝 사라짐(상품마다 운영자 판정).

### 옵션 2 — 규제유형만 게이트(품목군 승인 완전 제거)
- evaluateGate 제거, 상품 mfdsPermitNumber+규제유형만. 가장 가볍지만 공급자 스크리닝 0 → 운영 부담 ↑.

### 옵션 3 — 현행 유지 + 상품 레벨 증빙 병행
- 프로필 품목군 흐름 유지 + 상품 승인에 선택적 증빙. 이중 경로로 UX 혼란(권장 안 함).

→ **옵션 1 권장**(사용자 요구 "선택만 + 증빙 상품단계"에 가장 정합).

## 7. 권장 구현 경로 (후속 WO, 중규모)

`WO-O4O-NETURE-SUPPLIER-PROFILE-CATEGORY-SELECTION-ONLY-V1` (D3):
1. **게이트 변경**: `evaluateGate`(또는 submitForApproval 소비부)를 "품목군 **선택됨**이면 통과"로. 규제 적합성은 상품 `mfdsPermitNumber` 게이트가 담당(이미 존재).
2. **프로필 선택-only**: SupplierProfilePage Section A-4에서 번호/PDF/검토요청 제거(또는 "필요 시" 고급영역). 일반=서류 불필요 유지.
3. **(선택) 상품 레벨 규제 증빙**: 필요 판단 시 ProductMaster/Offer에 증빙 문서 + 운영자 상품 승인 확인 추가(신규). 불필요하면 번호만으로 운영.
4. **승인요청 banner 정합**: 직전 `WO-...-APPROVAL-GATE-UX-MESSAGE-IMPROVEMENT-V1`의 SUPPLIER_CATEGORY_* reason 노출이 게이트 변경에 맞게 축소/조정.
5. **운영자 품목군 review 화면**: 선택-only면 공급자-품목군 검토 자체가 줄어듦 — 운영자 화면 정리.

## 8. 회귀 / 마이그레이션 주의

- **기존 'approved' 공급자**: 게이트를 느슨하게 하면 기존 흐름은 계속 통과(상위호환). 단 게이트 의미 변경 시 기존 'submitted/needs_update' 공급자가 갑자기 통과 → 정책 확인 필요.
- **기존 데이터**: 품목군 row/status 유지(migration 0 가능 — 게이트 로직만 변경). 단 'selected' 신규 상태 도입 시 enum 확장 = migration. 옵션 1을 **기존 status 재해석**(row 존재=선택됨)으로 구현하면 migration 회피 가능.
- **상품 게이트 정합**: submitForApproval의 다른 게이트(서비스키/약국 audience/판매전 사업자등록증 — 직전 WO)와 충돌 없는지 확인.
- **규제 컴플라이언스**: 공급자-레벨 품목군 승인을 없애면 규제 상품의 사전 스크리닝이 상품 단계로 이전 → 운영자 상품 승인이 규제 판정 책임을 온전히 짐. 법무/규제 관점 확인 권장.

## 9. 비범위 (본 IR)

- 실제 게이트/프로필/상품 증빙 구현, migration, enum 변경, 운영자 화면 변경 — 본 IR 미수행(조사만).

## 10. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정적 분석만, 산출물 = 본 문서 1개(path-specific)
```

---

## 결론

품목군 선택-only는 **프로필 UI만으로 불가** — `submitForApproval`의 `evaluateGate`(status='approved' 요구)와 단일 지점에서 강결합되어 있어, 게이트를 "선택됨이면 통과"로 변경하는 backend 작업이 **필수 동반**. 규제 적합성은 상품 단계 `mfdsPermitNumber` 게이트가 이미 담당하므로, "증빙을 상품단계로"는 ① 공급자-품목군 'approved' 게이트 해제 + ② (선택) 상품 레벨 PDF 증빙 신설로 구현 가능(옵션 1 권장). 기존 status 재해석으로 구현하면 migration 회피 가능. **중규모 backend 재설계 + 직전 승인요청 banner 정합**이 D3 WO의 범위이며, 공급자-레벨 규제 스크리닝 제거의 컴플라이언스 영향을 사전 확인할 것.

*read-only · 결합=submitForApproval/evaluateGate(status='approved') 단일지점 · 상품 단계 번호게이트(mfdsPermitNumber/assertRegulatedPermit) 이미 존재, PDF 증빙은 부재 · 선택-only=게이트 '선택됨 통과' 변경 필수 + 프로필 번호/PDF/검토요청 제거 + (선택)상품 PDF 증빙 신설(옵션1) · 기존 status 재해석 시 migration 0 · 컴플라이언스(공급자 스크리닝 제거) 확인 권장 · 후속 WO=...-CATEGORY-SELECTION-ONLY-V1(중규모).*
