# CHECK-O4O-NETURE-B2B-E2E-TEST-SUPPLIER-ONBOARDING-SEED-V1

> **판정: PASS** (Phase 1~8 완료, 코드 변경 없음 — 운영 흐름/자원 seed)
> WO: `WO-O4O-NETURE-B2B-E2E-TEST-SUPPLIER-ONBOARDING-SEED-V1`
> 작성일: 2026-06-04
> 환경: production (api.neture.co.kr / neture.co.kr)

---

## 1. 목적

Neture B2B canonical end-to-end positive smoke 를 위한 테스트 공급자 자원을 실제 온보딩 흐름(가입 상태 확인 → 운영자 승인 → 배송정책 → 테스트 상품/SPO → buyer 장바구니 담기)으로 준비한다. 실제 결제(checkout-confirm-b2b/Toss)는 후속 `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V1` 에서 수행한다.

---

## 2. 테스트 자원 (운영 데이터와 구분 — `[E2E_TEST]` / 수동 정리 대상)

> ⚠️ **자격증명은 본 문서(git 추적)에 평문 기록하지 않는다** (CLAUDE.md §15 / no-secrets 정책 우선 — WO §8 의 평문 허용 문구는 미적용). 비밀번호는 SSOT `docs/local/TEST-ACCOUNTS.local.md`(gitignore) 참조.

| 자원 | id / 값 | 비고 |
|------|---------|------|
| 테스트 계정 (공급자 = buyer 겸용) | `renagang21@gmail.com` (userId `6967ebe0-2f87-4cab-809b-8c7190493cef`) | 비번 SSOT 참조. KPA 약국 경영자 계정과 **동일 멀티롤 계정** |
| Neture supplier | `91169739-6291-4bed-b1e9-b3d4a93d65eb` "(주)네뚜레 공급자 테스트" | PENDING → **ACTIVE 승인됨** |
| 승인자 (operator) | `sohae2100@gmail.com` (neture operator/admin) | |
| 테스트 SPO (offer) | `d10c68ae-e6f9-4d07-a734-60feccadf653` "[E2E_TEST] Neture B2B 테스트 상품 1" | priceGeneral 12000, masterId `6f6f7be8-09b9-4962-be33-e8e1c56f204e` |
| SPO 분배 | distributionType **PRIVATE**, allowedSellerIds `[6967ebe0…]`, isActive **true**, approvalStatus **PENDING** | PRIVATE 타깃(공개 마켓 비노출). PENDING 은 공개 승인 상태로 PRIVATE 직접 분배 구매를 막지 않음 |
| 배송정책 (supplier profile) | baseShippingFee **3000** / freeShippingThreshold **50000** / averageDispatchDays **2** | |
| Cart item (b2b) | `287651b8-61ef-4d92-876a-4d4e0f056ff3` | serviceKey neture, qty 2, priceSnapshot 12000 — 후속 E2E checkout 용으로 잔존 |

자원 metadata 권장(테스트 식별): `testResource: true`, `testPurpose: NETURE_B2B_CANONICAL_E2E`. (현 supplier/offer 엔티티에 자유 metadata 컬럼이 없어 `[E2E_TEST]` 상품명 prefix + 본 CHECK 의 id 기록으로 식별/정리.)

> **이 계정/자원은 서비스 시작 전 사용자가 수작업으로 삭제하거나 비밀번호를 변경할 예정이다.** (단, `renagang21@gmail.com` 은 KPA 약국 smoke 와 공유되는 멀티롤 계정이므로 삭제 시 KPA 약국 테스트 흐름 영향 — 비번 변경/공급자 비활성화 권장.)

---

## 3. 단계별 결과

### Phase 1 — 사전 상태 (read-only)
- `renagang21@gmail.com` Neture 로그인 성공. 이미 **linked supplier** 존재 (supplierId 91169739, name "(주)네뚜레 공급자 테스트", **status PENDING**, products 0). → 신규 가입 불필요, **운영자 승인부터 진행**.
- 자격증명 정정: WO 기재 `seochuran1!` 은 renagang21 에 대해 401(실패). 실제 비번은 SSOT 값(검증 200). `Seochuran1!` 은 `sohae21@naver.com` 의 비번. → renagang21 은 SSOT 비번으로 진행.

### Phase 2 — 회원가입
- 생략 (supplier record 이미 존재).

### Phase 3 — 운영자 승인 ✅
- operator(sohae2100) `GET /operator/suppliers?status=PENDING` → 91169739 표시 확인.
- `POST /operator/suppliers/91169739…/approve` → success, **status ACTIVE**.
- renagang21 재조회 → supplier status **ACTIVE** 확인.

### Phase 4 — 공급자 로그인/접근 ✅
- renagang21 로그인 후 `GET /supplier/profile` 200, `GET /supplier/dashboard/summary` 200. 공급자 workspace 접근 가능.

### Phase 5 — 배송정책 ✅
- `PATCH /supplier/profile { baseShippingFee:3000, freeShippingThreshold:50000, averageDispatchDays:2 }` → reload 후 영속 확인 (3000/50000/2).

### Phase 6 — 테스트 상품/SPO ✅
- `POST /supplier/products` → offer `d10c68ae…` 생성 (priceGeneral 12000). 생성 직후 PENDING/PRIVATE/inactive(draft).
- 분배 모델 확인: PUBLIC(공개·설명필요) / SERVICE(serviceKeys 필요 — 공급자 서비스 미연결로 `NO_ELIGIBLE_SERVICE_KEYS`) / PRIVATE(allowedSellerIds 필요).
- `PATCH /supplier/products/d10c68ae… { isActive:true, stockQuantity:100, distributionType:PRIVATE, allowedSellerIds:[6967ebe0…] }` → success, **isActive true, PRIVATE(buyer 타깃)**.
- 비고: buyer 가 공급자 owner 와 동일 계정이라 SERVICE/PUBLIC 대신 PRIVATE 직접 타깃을 사용(공개 마켓 비노출). approvalStatus 는 PENDING 잔존(공개 승인용).

### Phase 7 — buyer 노출 ✅(부분)
- buyer(renagang21) `/store/cart` 렌더에서 seed 상품 + 공급자 배송비 노출 확인(아래 Phase 8 browser).
- 한계: **상품 상세(StoreProductPage) 직접 discovery 는 미검증** — buyer 가 공급자 owner 와 동일 계정(self) + PRIVATE 분배라 product-page 탐색 경로는 self 시나리오로 모호. cart 경로는 API+browser 로 확정 검증.

### Phase 8 — canonical cart seed smoke ✅ (checkout 제외)
**API** (buyer renagang21):
- `POST /api/v1/store/cart/neture/items` (sourceType b2b, supplierId 91169739, offerId d10c68ae, price 12000, qty 2) → success, item `287651b8…`.
- `GET /cart/neture/items` → total 1.
- `GET /cart/neture/groups` → supplierCount 1, subtotal **24000**, **shippingFee 3000**, freeShippingThreshold 50000, policyConfigured true, displayTotal **27000**. (24000 < 50000 → 배송비 3000 정확.)

**Browser** (neture.co.kr, buyer renagang21):
- 로그인 → /supplier/dashboard. `/store/cart` 렌더: `[E2E_TEST]` item + **3,000 배송비** + 공급자/배송 표기 노출.
- **POST `/neture/seller/orders` 호출 0건** (legacy route 미사용, canonical-only).
- console error 0 / API 4xx-5xx 0.
- checkout-confirm-b2b 는 의도적으로 미수행 (후속 E2E CHECK).

---

## 4. 검증 요약 (WO §7, §9)

| 항목 | 결과 |
|------|------|
| 가입 상태 확인 | ✅ linked supplier PENDING |
| 운영자 승인 → ACTIVE | ✅ |
| supplier profile / workspace 접근 | ✅ |
| 배송정책 3000/50000/2 영속 | ✅ |
| 테스트 SPO 생성 + active | ✅ (PRIVATE 타깃) |
| cart add (b2b) | ✅ |
| /store/cart 공급자별 배송비 3000 | ✅ (API + browser) |
| `/neture/seller/orders` 호출 0건 | ✅ (browser network) |
| console / API critical error | 0 |
| TypeScript | 해당 없음 (코드 변경 0) |

---

## 5. 수동 정리 대상 (서비스 시작 전)

```
supplier   91169739-6291-4bed-b1e9-b3d4a93d65eb  → 비활성화/삭제
offer(SPO) d10c68ae-e6f9-4d07-a734-60feccadf653  → 비활성화/삭제
cart item  287651b8-61ef-4d92-876a-4d4e0f056ff3  → 삭제 (또는 후속 E2E 에서 소비)
account    renagang21@gmail.com                   → 비번 변경 (KPA 약국 공유 — 삭제 비권장)
배송정책   supplier profile shipping (3000/50000/2) → 필요시 초기화
```

---

## 6. 후속

- `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V1` — 본 seed 자원으로 cart → checkout-confirm-b2b → paymentGroupId → /store/payment → Toss sandbox 결제 → confirm → checkout_orders paid → neture_orders bridge → 공급자 주문 노출 → 배송 처리 실측.
- (관찰) PRIVATE offer 의 approvalStatus PENDING 잔존이 후속 checkout-confirm-b2b 재검증에 영향 주는지 확인 필요.
- (관찰) 공급자 서비스 연결 부재로 SERVICE 분배 `NO_ELIGIBLE_SERVICE_KEYS` — SERVICE 분배 E2E 가 필요하면 supplier↔service 연결 seed 선행.
