# O4O-DISTRIBUTION-EVIDENCE-SEED-PRINCIPLE-V1

> 성격: 공공 데이터 seed / 상품 DB 정제의 **상위 판단 원칙**. 2026-07-05 확정.
> 상위 SSOT: [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) (본 문서는 그 하위 적용 원칙).
> 적용 범위: 모든 공공 규제 seed 트랙(의료기기 · 의약외품 · 건강기능식품 · 약가/의약품) 및 ProductMaster/ProductCandidate 정제.

---

## 1. 원칙

O4O 는 **유통/실행 자산 플랫폼**이다 (공급자 → 운영사업자 → 매장으로 실제 상품이 흐르는 구조).
따라서 상품 DB 는 **유통 정보**로 구성한다. **규제 존재(허가/신고/표준코드)는 그 자체로 유통 정보가 아니다.**

> 규제 존재 ≠ 유통 관련성. "식약처에 허가/표준코드가 있다"는 적재·보존의 충분조건이 아니다.

## 2. 적재·보존 기준

아래 중 하나 이상이면 대상으로 본다:

- **유통 증거**: 공급자 offer(`supplier_product_offers`) / 매장 listing(`organization_product_listings`,
  `store_local_products`) / 실판매 barcode·쇼핑몰(쿠팡·네이버·도매) / 상품 이미지 / 가격 / 매장·운영자 취급.
- **유통 가능성 높은 소비자 품목군**: 일반 소비자·매장이 실제 취급 가능한 카테고리(예: 마스크·생리대·치약·밴드·
  혈압계·체온계·안경렌즈 등). 애매하면 삭제하지 않고 `review_required` 로 보류.

## 3. 배제 기준

- **규제-only 덤프**: 허가/신고/표준코드만 존재하고 유통 증거·유통 가능성이 없는 대량 레코드는 **적재하지 않는다.**
- 특히 **SKU/UDI grain 규제 데이터**(한 허가가 수십~수천 표준코드로 팽창하는 것)를 유통 근거 없이 전량 적재하지 않는다.

## 4. 즉시 적용된 결정 (2026-07-05)

- **의료기기 표준코드 전량 2.66M Gate A apply = HOLD(폐기).** distinct signature 2,656,075 전량이 유통 증거 0
  (공급자/매장/판매/이미지/가격 전무). 허가 1건당 평균 ~34, 최대 4,980 UDI 로 팽창한 규제 SKU 덤프.
  → [`WO-O4O-MEDICAL-DEVICE-FULL-SCALE-GATE-A-APPLY-RUNBOOK-V1`](../checks/WO-O4O-MEDICAL-DEVICE-FULL-SCALE-GATE-A-APPLY-RUNBOOK-V1.md) 실행하지 않음.
- 이 원칙은 기존 정제 흐름과 일관: 의약외품 market-evidence 삭제, 의료기기 등급별 소비자군만 보존.

## 5. 실행 규칙

- 본 원칙은 **방향**이다. 기존 적재분(candidate/master) 정리·삭제는 **건별 사용자 승인** 후 수행한다(대량 삭제는 되돌리기 어려움 — CLAUDE.md §0).
- 신규 seed WO 는 착수 전 본 문서를 참조해 "유통 증거/가능성" 필터를 먼저 정의한다. 규제 존재만으로 apply 하지 않는다.
- ProductMaster 는 유통 증거 축(공급자/매장/시장성)으로 수렴시키는 방향으로 유지·정제한다.
