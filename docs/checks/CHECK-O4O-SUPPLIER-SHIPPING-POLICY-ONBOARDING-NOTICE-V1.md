# CHECK-O4O-SUPPLIER-SHIPPING-POLICY-ONBOARDING-NOTICE-V1

> 공급자 배송정책 미설정 시 장바구니·주문 배송비가 0원으로 계산되는 운영 위험을 공급자 화면에서 명확히
> 안내하고 입력을 유도. **배송비 계산식·0원 fallback 무변경**(안내만), frontend-only(backend 무변경).
> **결과: PASS** — web-neture tsc 0 / live 브라우저(공급자 계정) 배너 렌더 확인. — 2026-06-11

---

## 1. 변경 파일 (1, frontend-only)
| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx` | 배송 정책 섹션: ① outdated 안내("배송비 계산에 자동 반영되지 않으며") → 현재 동작(장바구니·주문 반영) 으로 교체 ② 동적 미설정 경고/정상 배너 추가 |

> backend 무변경: `GET /neture/supplier/profile` 가 이미 baseShippingFee/freeShippingThreshold/averageDispatchDays 반환(`supplier.service.ts:563`). 입력 필드/저장도 기존재. 계산식(`calculateSupplierShippingFee`)·0원 fallback·cart/checkout/createOrder/정산 **무변경**.

## 2. 미설정 판단 / 안내 (입력 state 기반, 동적)
- `baseShippingFee` 비어 있음 → **빨간 경고**: "⚠️ 기본 배송비가 설정되지 않았습니다. … 장바구니와 주문에서 배송비가 0원으로 계산됩니다. … 입력해 주세요." + (freeShippingThreshold 빈 경우) 무료배송 기준 선택입력 안내 + (averageDispatchDays 빈 경우) 평균 출고일 안내.
- `baseShippingFee` 입력됨 → **초록 정상**: "✅ 기본 배송비가 설정되어 있습니다. 장바구니와 주문에서 공급자별 상품금액 기준으로 배송비가 계산됩니다." (+ freeShippingThreshold 빈 경우 선택입력 안내)
- 입력 state 기반이라 값 입력 시 경고 즉시 해소. freeShippingThreshold 는 **선택값**(무료배송 미운영 시 비워둠)으로 표현, baseShippingFee 만 핵심 경고.

## 3. outdated 문구 교체 (중요)
기존 amber 박스 "이번 단계에서는 배송비 계산에 자동 반영되지 않으며…" 는 PREVIEW-V1/RESPONSIBILITY-CLEANUP-V1 이후 **사실과 다름**(이제 장바구니·주문에 반영). → "공급자별 상품금액(같은 공급자 일반·이벤트 합산) 기준으로 배송비 계산, 타 공급자 금액은 무료배송 기준 미포함, 펀딩 제외" 로 정확히 교체.

## 4. 검증
- **web-neture tsc 0** ✅
- **live 브라우저** (neture-web `neture-web-01012`, 공급자 계정 sohae21@naver.com / 쓰리라이프존):
  - `/mypage/business-profile` 배송 정책 섹션에 **⚠️ 미설정 경고 배너 렌더**(이 공급자 baseShippingFee=null → 경고 노출, "배송비 0원으로 계산" 문구 포함) ✅
  - 무료배송 기준/평균 출고일 안내 라인 노출 ✅
  - 갱신된 설명 문구(자동반영 안 됨 → 반영됨) 렌더 ✅
  - 입력 필드(기본 배송비/무료배송 기준/평균 출고일) + 저장 버튼 기존 동작 유지, 레이아웃 정상 ✅
  - 데이터 변경 없음(read-only visual, 저장 미수행) ✅

## 5. 회귀 무영향
- 배송비 계산식·0원 fallback·cart preview/confirm·createOrder·정산/결제/fulfillment **무변경**.
- SupplierProfile 저장(기존 필드/입력/PATCH) 무변경. backend 무변경.
- buyer StoreCartPage 의 기존 "배송 정책 미설정" 안내(policyConfigured=false)는 그대로 유지(미변경).

## 6. 완료 기준 체크 (WO §11)
1(미설정 상태 화면 노출) ✅. 2(0원 위험 안내) ✅. 3(무료배송 기준 의미 안내) ✅. 4(평균 출고일 의미 안내) ✅. 5(입력 후 정상 상태 표시) ✅. 6(계산식/fallback 무변경) ✅. 7(cart/checkout/order/settlement/fulfillment 무변경) ✅. 8(tsc) ✅. 9(browser smoke) ✅. 10(CHECK) ✅. 11(path-specific) ✅. 12(다른 세션 무접촉) ✅.

## 7. 남은 GAP/RISK · 후속
- **Supplier dashboard nudge**: `/supplier/dashboard` 는 현재 profile 미로드 → V1 미포함(ProfilePage 안내로 충분, WO §4.2). 후속 `WO-O4O-SUPPLIER-DASHBOARD-SHIPPING-POLICY-NUDGE-V2`(dashboard 에 profile 조회 + 상단 CTA).
- 0원 fallback 정책 자체는 유지(안내만). 정책 강제(미설정 시 주문 차단 등)는 별도 결정 필요 — 본 WO 범위 외.
- 후속: `WO-O4O-KPA-B2C-SHIPPING-POLICY-ALIGNMENT-V1`, `WO-O4O-KPA-PAYMENT-EVENT-HANDLER-FIX-V1`, payment readiness / fulfillment·settlement guard.

---

*Date: 2026-06-11 · Status: PASS (배송정책 미설정 안내 + outdated 문구 교체, 계산식 무변경. dashboard nudge 는 후속).*
