# WO-O4O-STORE-COMMERCE-BOUNDARY-POLICY-DOCUMENT-V1 — CHECK

- **작업일**: 2026-08-25
- **시작 기준**: `origin/main` (`eb2c4db7f`) — `git fetch` → `git pull --ff-only` (충돌 없는 fast-forward 1건)
- **성격**: 정책 문서 확정 작업. **코드 기능 변경 없음.**

---

## 1. 작성한 canonical 문서

```text
docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md
```

### 경로 결정 사유

WO §3 은 `docs/business/O4O-STORE-COMMERCE-BOUNDARY-V1.md` 를 우선 사용하되, 저장소 문서 체계와
맞지 않으면 기존 canonical business/architecture 구조를 조사해 적절한 위치에 저장하라고 했다.

조사 결과:

| 확인 항목 | 결과 |
|---|---|
| `docs/business/` 디렉터리 | **존재하지 않음** |
| 저장소 전체 `docs/business` 참조 | **0건** (`docs/`, `CLAUDE.md`, `AGENTS.md`) |
| 사업 철학 SSOT `O4O-BUSINESS-PHILOSOPHY-V1.md` 위치 | `docs/baseline/` |
| 3자 Canonical Flow SSOT `O4O-3-ROLE-FLOW-BASELINE-V1.md` 위치 | `docs/baseline/` |
| `docs/baseline/README.md` 자기 정의 | "플랫폼 기준선 문서 — Frozen/Active 정책 및 구조 정의" |

즉 **사업 수준 canonical 문서의 기존 home 은 `docs/baseline/`** 이다. 새 디렉터리를 만들면
같은 위상의 문서가 두 곳으로 갈라진다. 파일명은 WO 가 요구한 의미를 그대로 유지했다.

---

## 2. 확정한 사업 원칙 요약

WO §2 의 9개 원칙을 임의 변경·완화 없이 문서화했다.

| 문서 절 | 확정 내용 |
|---|---|
| §2 최상위 원칙 | 매장 경영자는 O4O를 이용해 소비자에게 판매하지 않는다 / O4O는 매장용 자체 소비자 전자상거래를 만들지 않는다 |
| §3 오프라인 판매 구조 | 소비자 → 매장 방문 → 상담·선택 → **별도 POS** → 판매·결제. `판매 실행 = 외부 POS` / `정보·콘텐츠·업무지원 = O4O` |
| §4 태블릿·QR | 정보 제공 수단. O4O 장바구니·checkout·소비자 결제·매장 온라인 환불로 사용하지 않는다 |
| §5 외부 판매채널 | 네이버·쿠팡의 주문·결제·배송·취소·환불은 외부채널이 실행. Order System of Record = 외부채널 |
| §6 외부채널 주문 데이터 | 연동·조회·분석 허용. **저장한다고 해서 O4O가 판매·결제 원천 시스템이 되지 않는다** |
| §7 매장 환불 | 내부 매장 소비자 주문이 없으므로 매장 경영자 자체 PG 환불은 canonical 기능이 아니다 |
| §8 기존 코드 취급 | `기존 코드의 존재 ≠ 현재 사업 기능` + 6단계 판정 순서 |
| §9 legacy 분류 | 6분류 정의 + **`UNKNOWN` 상태에서는 복구·확장하지 않는다** |
| §10 개발 금지선 | 7개 항목 (자체 쇼핑몰 / 장바구니 / checkout / 매장 온라인 결제 / 매장 PG 환불 / 소비자 배송관리 / 매장 자체 소비자 주문) |
| §11 POS 연동 구분 | 연동은 허용. `POS 연동 ≠ O4O가 POS가 되는 것` |
| §12 B2B vs 소비자 order | `order` 자체는 금지 아님. 판정 질문 = "소비자가 O4O 안에서 매장을 상대로 결제하는 주문인가?" |
| §13 플랫폼 직접판매 | `platform-seller` / `platform checkout` / `platform refund` 존재 ≠ 사업 승인. 별도 계약 필요, 없으면 현행성 조사 대상 |
| §14 precedence | 6단계. **오래된 코드가 현재 사업 규정보다 우선하지 않는다** |
| §15 변경 절차 | 자체 소비자 commerce 도입은 일반 WO 불가 — 9개 선행 요건 후 별도 프로젝트 |
| §16 적용 영역 | WO §4 의 17개 키워드 그대로 명시 |

---

## 3. 기존 관련 문서 조사 결과

WO §13 이 요구한 최소 키워드로 검색했다:
`commerce` / `checkout` / `cart` / `payment` / `refund` / `store owner` / `B2C` / `consumer` / `POS` / `Naver` / `Coupang`

### 3-1. 정합 (충돌 없음 — 변경하지 않음)

| 문서 | 내용 |
|---|---|
| `docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md` | **가장 가까운 선행 정책.** "StoreLocalProduct는 Store Private Display Domain이며 Commerce Object가 아니다" — Checkout 진입 / Cart 연결 / 결제 버튼 생성 / B2C Ecommerce / Kiosk 결제를 **영구 금지**. 새 문서는 이 원칙을 매장 commerce 전반으로 확장한 상위 규정이며, §4 에서 상호 링크했다 |
| `docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md` | 상위 SSOT. 매장 소비자 판매를 주장하는 서술 없음 |
| `docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md` | 공급자→운영자→매장 3자 흐름. 소비자 결제 축 없음 |
| `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md` | 주문 **생성 방식**을 정의하는 기술 계약. "어떤 주문이 사업적으로 허용되는가"는 다루지 않음 → 충돌 아님 |
| `docs/architecture/O4O-STORE-RULES.md` | 주문 원장 단일화 규칙(기술). 판매 주체 서술 없음 |
| `docs/baseline/O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1.md` | cart/checkout/결제 언급 **0건** |
| `docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md` | 6항목 모두 콘텐츠 축. commerce 축 없음 |
| `docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md` | 매장경영 지원 구조. 소비자 판매 주장 없음 |

`POS` 키워드는 **기준 문서군(baseline/architecture/platform/rules/guides)에서 0건**이었다.
즉 POS 경계를 정의한 문서가 지금까지 없었고, 새 문서 §3 · §11 이 그 공백을 메운다.

### 3-2. 직접 충돌 문서 — **2건**

| # | 문서 | 충돌 내용 |
|---|---|---|
| K1 | `docs/platform/architecture/O4O-RETAIL-STABLE-V1.md` (**FROZEN**, CLAUDE.md §9 참조) | `Hub → Storefront → Checkout → Payment → Event → Order` **closed loop** 을 "구조적으로 검증 완료"로 선언. Visibility Gate 가 `organization_channels.status='APPROVED' (channel_type='B2C')` 이며, 코드 실측(`routes/glycopharm/controllers/checkout.controller.ts:315-325`)상 **약국 organization 의 B2C 채널을 상대로 소비자가 결제**하는 경로다 → 새 문서 §2 · §12 의 "소비자가 O4O 안에서 매장을 상대로 결제하는 주문인가? YES" 에 해당 |
| K2 | `docs/baseline/CHECKOUT-STABLE-DECLARATION-V1.md` | 같은 loop 의 "Storefront 4중 게이트 / Checkout 7중 검증" 을 Stable 로 선언하고 **WO 없이 수정 불가** 영역으로 보호. K1 과 동일한 충돌 |

### 3-3. 충돌 아님 — 이미 같은 방향으로 정리된 선례 (역사 기록, 수정하지 않음)

| 문서 / WO | 내용 |
|---|---|
| `docs/checks/CHECK-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1.md` | KPA 자체 B2C storefront 철거. 장바구니 `cartService.ts` 삭제, checkout·payment 페이지 삭제, 신규 B2C 채널 생성 `410 STORE_B2C_CHANNEL_RETIRED` 차단(**kpa serviceKey 한정**). B2C 주문·진열 데이터 실측 **0건** |
| `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1` (코드 주석) | 소비자→매장 결제를 `410 STORE_SALE_PAYMENT_DEPRECATED` 로 차단 — glycopharm · cosmetics · kpa 3개 payment controller + `store-hub.controller.ts` |
| `docs/checks/CHECK-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1.md` | 외부 판매채널(네이버) 연동 파일럿. 자격정보 미발급으로 5단계에서 중지 |

**이 선례들이 새 문서의 실질적 근거다.** 사업 경계는 이미 그 방향으로 실행되고 있었으나
**상위 기준 문서가 없어서** 매번 개별 WO 로 재판단하고 있었다 — 이번 WO 가 그 공백을 닫는다.

---

## 4. 수정 / SUPERSEDED / 링크 처리 결과

```text
새 문서 작성        : 1건
링크·정합 표기 추가 : 2건 (K1, K2)
SUPERSEDED 표기     : 0건
색인 추가           : 2건
본문 수정           : 0건
문서 삭제·이동·통합 : 0건
과거 CHECK/WO 수정  : 0건
```

### 4-1. K1 · K2 — 정합 표기만 추가

두 문서 **모두 본문·FROZEN 상태를 변경하지 않았다.** 첫 헤딩 바로 아래에
`[2026-08-25 · Business Boundary 정합 표기]` blockquote 한 덩어리만 추가했다. 내용:

- 해당 loop 이 새 canonical 문서 §2 · §12 와 **충돌 후보**임
- 해당 loop 의 **결제 leg 은 이미 `410 STORE_SALE_PAYMENT_DEPRECATED` 로 차단**되어 있어
  문서 그대로는 현재 동작하지 않음
- **본 표기는 판정이 아니며**, 새 문서 §8 판정 절차 전까지 `UNKNOWN` 이고 기능을 복구·확장하지 않음

### 4-2. SUPERSEDED 를 쓰지 않은 이유

`docs/rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1` §2 판정 원칙 2 — **대체 문서 경로를 적을 수
없으면 SUPERSEDED 가 아니다.** K1 은 B2C loop 외에 PaymentCore·Sales limit·동시성 보호 등
새 문서가 대체하지 않는 기술 계약을 함께 담고 있고, K2 도 마찬가지다. 문서 전체를 SUPERSEDED
처리하면 **아직 유효한 기술 계약까지 무효로 읽힌다.** 판정은 §8 절차를 거친 후속 WO 의 몫이다.

### 4-3. 색인 추가 2건

| 파일 | 처리 |
|---|---|
| `docs/baseline/README.md` | 문서 목록에 1행 추가 (`Active`) |
| `CLAUDE.md` — 상세 규칙 문서 목록 | 1행 추가. WO §4 의 적용 키워드를 함께 기재 |

> `CLAUDE.md` 색인 추가는 평상시 인라인 금지 항목(§16-4)이나, **본 WO §4·§17 이 이 문서를
> 해당 영역의 선행 기준으로 지정**하므로 WO 승인 범위 안의 처리로 판단했다.
> **Priority Chain(CLAUDE.md 상단 1~6번) 편입은 하지 않았다** — 문서 위계 재배치는 사용자
> 결정 사항이므로 §7 에 제안으로만 남긴다.

---

## 5. 코드 · 스키마 변경

```text
코드 기능 변경      : 0
checkout 코드 삭제  : 0
refund 코드 변경    : 0
cart 코드 제거      : 0
route 변경          : 0
PG 변경             : 0
DB migration        : 0
schema 변경         : 0
frontend 기능 수정  : 0
```

변경 파일은 **markdown 5건뿐**이다.

| 파일 | 종류 |
|---|---|
| `docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md` | 신규 |
| `docs/checks/WO-O4O-STORE-COMMERCE-BOUNDARY-POLICY-DOCUMENT-V1-CHECK.md` | 신규 (본 문서) |
| `docs/platform/architecture/O4O-RETAIL-STABLE-V1.md` | 정합 표기 추가 |
| `docs/baseline/CHECKOUT-STABLE-DECLARATION-V1.md` | 정합 표기 추가 |
| `docs/baseline/README.md` · `CLAUDE.md` | 색인 1행 |

다른 세션의 dirty·untracked 파일(cms-content · pharmacy-hub · operator-core-ui 계열)은
**수정·restore·stash·stage 하지 않았고 `git add .` 를 쓰지 않았다.** commit 은 path-specific 이다.

---

## 6. 후속 legacy commerce 조사 필요 영역

새 문서 §8 판정 절차를 적용해야 하는 코드 영역이다. **이번 WO 에서는 기록만 하고 손대지 않았다.**

| # | 영역 | 대표 위치 | 현재 표기 |
|---|---|---|---|
| L1 | **GlycoPharm 매장 B2C checkout loop** | `routes/glycopharm/controllers/checkout.controller.ts` (`channel_type='B2C'` + 약국 organization) · `store.controller.ts` · `organization_product_listings` / `organization_product_channels` | `UNKNOWN` — 결제 leg 은 `410`, 주문 생성 leg 의 현행성 미확인 |
| L2 | **K-Cosmetics 매장 판매 경로** | `routes/cosmetics/controllers/cosmetics-store.controller.ts` · `cosmetics-payment.controller.ts` | `UNKNOWN` — payment 는 `410` |
| L3 | **KPA 매장 주문 상태 변경(취소/환불)** | `routes/kpa/controllers/kpa-checkout.controller.ts` — `PATCH /store-orders/:orderId/status` | `UNKNOWN` — 새 문서 §7 의 `STORE_OWNER_REFUND` 축에 해당 |
| L4 | **Pharmacy-Hub store-owner 취소·결제그룹 취소** | `routes/pharmacy-hub/pharmacy-hub.routes.ts` store-owner cancel 계열 | `UNKNOWN` — 매장이 **구매자**인 B2B 거래일 가능성이 높아 §12 `NO` 로 정리될 수 있음. 확인 필요 |
| L5 | **플랫폼 자체 판매 경로** | `controllers/checkout/checkoutController.ts` (`PHASE_N1_CONFIG.PLATFORM_SELLER_ID='platform-seller'`) · `POST /api/checkout/refund` · `/api/admin/orders/**` | `UNKNOWN` — 새 문서 §13. **사업 계약 존재 여부 확인이 선행** |
| L6 | **`410` 로 막힌 사망 경로들의 최종 처분** | glycopharm · cosmetics · kpa `*-payment.controller.ts` · `store-hub.controller.ts` | `DEAD` 후보 — 유지/제거/archive 결정 필요 |
| L7 | **외부 판매채널 연동** | `modules/external-sales/entities/external-channel-product-link.entity.ts` · `routes/o4o-store/controllers/store-external-sales.controller.ts` · migration `20270306000000` | `EXTERNAL_CHANNEL_SUPPORT` 유력 — 새 문서 §5·§6 기준으로 허용 범위 확인 |
| L8 | **`packages/ecommerce-core` NestJS payment/refund 컨트롤러** | `packages/ecommerce-core/src/controllers/payment.controller.ts` | `DEAD` — Express api-server 에 mount 없음 (선행 WO 에서 확인) |
| L9 | **K1 · K2 문서 최종 처분** | `O4O-RETAIL-STABLE-V1` · `CHECKOUT-STABLE-DECLARATION-V1` | L1 판정 후 SUPERSEDED / 범위 축소 / 유지 중 결정 |
| L10 | **POS 연동 부재** | — | 새 문서 §3·§11 이 POS 를 판매 실행 시스템으로 규정했으나, 저장소에 POS 연동 코드·문서가 **0건**. 사업 흐름상 필요한지 별도 판단 필요 |

### 권고 순서

```text
1. L5 (플랫폼 자체 판매 사업 계약 확인)  ← 사업 결정이 선행이며 다른 판정의 기준이 된다
2. L1 · L2 (매장 B2C loop 현행성 실측)
3. L3 · L4 (매장 환불·취소 축 정리)
4. L9 (문서 처분) → L6 (사망 코드 처분)
5. L7 (외부채널 허용 범위 명문화) · L10 (POS 연동 필요 여부)
```

---

## 7. 사용자 결정이 필요한 사항

| # | 사항 | 이유 |
|---|---|---|
| D1 | 본 문서를 **CLAUDE.md Priority Chain** 에 편입할 것인가 | 현재는 "상세 규칙 문서 목록"에만 있다. 사업 철학 SSOT(2번) 다음 위계로 올릴지는 문서 위계 재배치이므로 사용자 결정 사항이다 |
| D2 | **플랫폼 자체 판매(L5) 사업 계약 존재 여부** | 새 문서 §13 은 "계약 없으면 현행성 조사 필요"로 열어두었다. 이 답이 L1~L6 판정의 기준이 된다 |

---

## 8. 완료 기준 대비

| WO §17 항목 | 결과 |
|---|:---:|
| canonical 문서 작성 · 저장소 저장 | ✅ `docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md` |
| 매장 경영자 O4O 판매 없음 명시 | ✅ §2 |
| O4O 자체 매장 전자상거래 없음 명시 | ✅ §2 |
| 오프라인 판매 = 외부 POS 명시 | ✅ §3 |
| 태블릿/QR = 정보 제공 명시 | ✅ §4 |
| 네이버/쿠팡 판매 = 외부채널 실행 명시 | ✅ §5 |
| legacy checkout/cart/payment/refund 판정 규칙 | ✅ §8 · §9 |
| 개발 금지선 | ✅ §10 |
| B2B order 와 소비자 commerce 구분 | ✅ §12 |
| 플랫폼 직접판매 별도 계약 원칙 | ✅ §13 |
| 관련 문서 충돌 조사 | ✅ §3 (직접 충돌 2건) |
| CHECK 작성 | ✅ 본 문서 |
| 코드 기능 변경 없음 | ✅ §5 |
| path-specific stage / commit / push / `HEAD == origin/main` | 완료 보고 참조 |

---

## 9. 문서 정합

```text
문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크·정합 표기 2건 / 색인 추가 2건 / 별도 WO 제안 10건(L1~L10)
```

과거 완료 CHECK 의 역사적 사실은 수정하지 않았고, 과거 WO 결과를 소급 변경하지 않았다.
