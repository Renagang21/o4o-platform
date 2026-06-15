# CHECK-O4O-SUPPLIER-PRODUCT-LIST-NEXT-ACTIONS-CLARITY-V1

> **작업명:** WO-O4O-SUPPLIER-PRODUCT-LIST-NEXT-ACTIONS-CLARITY-V1
> **유형:** 저위험 UI·동선 정비 — 공급자 제품 목록의 "제품 등록 후 다음 단계" 안내 + 후속 action 라벨 명확화. 구조/gate/가격/route **무변경(신규 기능 0)**.
> **결과: PASS — 제품 목록에 "제품 등록 후 다음 단계 안내"(collapsible) 패널 추가(승인요청/서비스 등록 신청/B2B 콘텐츠 관리/이벤트·펀딩 연결/판매자 모집 준비중 + 의약품→약국 서비스 안내, 기존 route 링크). 후속 작업 드롭다운 라벨 "연결" 어휘로 정비, placeholder 명확화. 신규 기능·구조·gate·가격 무변경. web-neture build ✓ · api-server typecheck 0(회귀).**
> 선행: `IR-O4O-SUPPLIER-PRODUCT-SERVICE-REGISTRATION-TYPE-AUDIT-V1`(cab35f345) + 정책 IR 3건(a84e3a3fe) — 2026-06-15

---

## 1. 정책 결정 반영 (구현 전제)

- **가격: 옵션 A 유지** — `NeturePriceArchitectureFreeze` 미개정, 서비스/모집별 가격 side table 미생성.
- **B2B: 기본 오퍼 측면 유지** — 독립 채널/가격 미생성, businessShort/DetailDescription 콘텐츠 역할.
- **판매자 모집: C 브리지 후속 채택** — 본 WO 에서 구현 안 함("준비 중" 표기 유지).

## 2. 조사한 제품 목록 구조

- 화면: `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx:529`. 헤더(1099) + 운영자 노출 안내 배너(1130) + 탭/검색 + 엑셀형 테이블.
- 현재 action: **승인요청**(bulk 버튼) · "후속 작업" 컬럼 `<select>`(857-912: supply/recruit/event/funding) · 의약품(restricted)은 `getDrugSupplyGate` 라벨만(액션 차단).
- 후속 route 존재: B2B `/supplier/b2b-content` · 공급오퍼 `/supplier/supply-offers` · 이벤트 `/supplier/event-offers` · 펀딩 `/supplier/market-trial/new`. 판매자모집=route 없음(`ready:false`). 서비스 등록 신청=별도 route 없음(상품 편집 serviceKeys + 승인요청 경로).
- action 메타 `SUPPLIER_OFFER_ACTION_META`(supplierProductTypes.ts) — SupplierProductsPage 단독 사용(라벨 변경 안전).

## 3. 상태별 action 조건 (무변경 확인)

- 의약품/규제상품(`getAllowedOfferActions` restricted) → 후속 작업 드롭다운 대신 `getDrugSupplyGate` 안내 라벨(OTC/Rx/미분류). 기존 동작 유지.
- 비규제 → 드롭다운 노출, `recruit` 는 `ready:false` → option disabled. 의약품 service gate 는 backend(createSupplierOffer/submitForApproval) + 승인요청 토스트로 이미 적용 — 본 WO 는 **안내만**, gate 무변경.

## 4. 변경 내용 (2 파일, frontend only)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 운영자 노출 배너 아래 **"제품 등록 후 다음 단계 안내"** `<details>` 패널 추가(6 후속작업 + 의약품→약국 서비스 안내 + B2B 콘텐츠 route 링크). 후속 작업 드롭다운 placeholder "활용 선택…" → "후속 작업 연결…" |
| `services/web-neture/src/lib/supplierProductTypes.ts` | `SUPPLIER_OFFER_ACTION_META` 라벨 어휘 정비: supply "일반 공급 오퍼 연결" / recruit "판매자 모집 연결 (준비 중)" / event "이벤트 오퍼 연결" / funding "유통참여형 펀딩 연결" |

- 안내 패널 문구: "실제 노출·판매는 운영자 확인 후 진행" 명시. 금지 표현(자동 등록/즉시 노출/즉시 판매/판매 시작) 미사용 — 신청/연결/관리/준비중만.
- 미구현(판매자 모집) = "준비 중" 표기 유지(기능 구현 0). 서비스 등록 신청 = 별도 화면 없이 "상품 편집 → 서비스 선택 → 승인 요청" 동선 안내.

## 5. 준비중으로 둔 기능

- **판매자 모집 연결**: route 없음 · `ready:false` 유지 · 안내 "준비 중". (C 브리지 후속 WO 에서 구현)

## 6. 제외 범위 (WO §8 준수)

B2B·서비스승인·판매자모집 신규 구현 / 이벤트·펀딩 lifecycle / 가격 구조·채널 가격 테이블 / `NeturePriceArchitectureFreeze` 개정 / Product·Offer·Approval·OPL 구조·정책 / 의약품 service gate · 약국 서비스 설정 UI / migration / package.json·lock. **모두 미수행.**

## 7. 검증

- **web-neture:** `pnpm --filter @o4o/web-neture build` → `✓ built in ~12s` ✅
- **api-server:** `pnpm --filter @o4o/api-server type-check` → `0 errors` ✅ (backend 무변경 회귀 확인)
- **정적:** 안내 패널·라벨만 변경. 후속 작업 드롭다운 로직(`getAllowedOfferActions`/`buildOfferActionUrl`/ready 분기)·승인요청 bulk·의약품 gate·route 무변경. `SUPPLIER_OFFER_ACTION_META` 소비처 단일(SupplierProductsPage) → 라벨 변경 부작용 없음.
- **browser smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** `/supplier/products` 안내 패널 펼침/접힘, B2B 콘텐츠 링크 이동, 후속 작업 드롭다운 라벨, 승인요청·의약품 gate 기존 동작 유지.

## 8. 완료 판정 / 후속

**PASS.** 제품 등록 후 다음 단계 안내 + 후속 action 라벨 명확화. 신규 기능·구조·gate·가격 무변경. build/typecheck 통과.

**커밋:** path-specific 3파일(2 코드 + CHECK) · `<commit>`.
**차기:** 정책 결정대로 — (모집 C 브리지) `WO-O4O-SUPPLIER-SELLER-RECRUITMENT-PRODUCT-FLOW-V1` 등 흐름별 구현 WO. 가격은 옵션 A 유지(별도 WO 불요).

---

*Date: 2026-06-15 · UI 동선 정비 PASS · 제품 목록 "다음 단계" 안내 패널 + 후속 action 라벨 "연결" 어휘. 신규 기능·구조·gate·가격 무변경(정책 A/B2B 측면/모집 준비중 준수). web-neture build ✓ · api-server typecheck 0.*
