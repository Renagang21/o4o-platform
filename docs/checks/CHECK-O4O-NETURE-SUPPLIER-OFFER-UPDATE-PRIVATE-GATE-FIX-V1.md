# CHECK-O4O-NETURE-SUPPLIER-OFFER-UPDATE-PRIVATE-GATE-FIX-V1

- **WO**: `WO-O4O-NETURE-SUPPLIER-OFFER-UPDATE-PRIVATE-GATE-FIX-V1`
- **작성일**: 2026-08-12
- **판정**: **PASS_WITH_HOLD** — 코드 수정·회귀 테스트·배포 완료 / 실데이터 공급자 write smoke 는 **계정 자격증명 불일치로 수행 불가(HOLD)**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `f05cb81c0a88a66ff32fbcfd3a93e22ef7b4d258` |
| 작업 트리 상태 | clean (§4 통과) |
| 수정 commit | `6d79a93fd1c8c4a8163fc7c2147312be06d17a9d` |

---

## 2. 원인 분석

`createSupplierOffer` 는 신규 등록 offer 를 **항상** 다음 상태로 만든다.

```
isActive:false · isPublic:false · serviceKeys:[] · allowedSellerIds:[]
→ deriveDistributionType(false, []) = PRIVATE   (UI 표기 "내부 상품")
```

`updateSupplierOffer` 는 저장 직전에 아래 게이트를 **무조건** 적용하고 있었다.

```ts
if (offer.distributionType === PRIVATE && (offer.allowedSellerIds?.length ?? 0) === 0) {
  return { success: false, error: 'PRIVATE_REQUIRES_SELLER_IDS' };
}
```

즉 **등록 계약이 만들어 놓은 상태를 수정 계약이 거부**했다. 공급 방식을 먼저 설정하지
않으면 가격·설명·재고 등 어떤 정보도 저장할 수 없었다 (실사용 차단 수준).
직전 WO 의 실데이터 smoke 에서 `PATCH … 400 PRIVATE_REQUIRES_SELLER_IDS` 로 재현됨
(`CHECK-O4O-NETURE-SUPPLIER-PRODUCT-CREATION-AND-DESCRIPTION-WRITE-SMOKE-BATCH-V1` HOLD a).

### 이 게이트는 노출 안전장치가 아니다

`allowedSellerIds` 가 비어 있는 PRIVATE offer 는 **구조적으로 어디에도 보이지 않는다.**
모든 소비 경로가 동일한 필터를 쓰고, `= ANY('{}')` 는 항상 false 이기 때문이다.

| 소비 경로 | 필터 |
|---|---|
| 매장 HUB 상품 (`pharmacy-products.controller.ts`) | `buildPrivateSellerScopeSql` — `distribution_type <> 'PRIVATE' OR $x = ANY(allowed_seller_ids)` |
| KPA checkout (`kpa-checkout.controller.ts:347`) | 동일 |
| GlycoPharm checkout (`glycopharm/checkout.controller.ts:378`) | 동일 |
| Neture B2B 장바구니 (`neture-b2b-cart-checkout.service.ts:221`) | 동일 |
| 파트너 조달 목록 (`seller.service.ts:78`) | 동일 |

따라서 게이트를 좁혀도 노출·거래 위험이 증가하지 않는다.

---

## 3. 선택한 구현안

**A안** (WO §6 1순위) — 단순 상품 정보 수정은 허용하고, PRIVATE + 판매자 미지정 검증은
**공급 범위/노출 상태를 실제로 변경할 때만** 적용한다.

```ts
const distributionChanged =
  offer.isPublic !== prevIsPublic ||
  (offer.allowedSellerIds?.length ?? 0) !== prevSellerIdCount;
const activating = offer.isActive === true && prevIsActive === false;

if ((distributionChanged || activating) && PRIVATE && sellerIds 비어있음) → 거부
```

- WO §6 원칙 "신규 등록 상품은 운영 노출 전 상태에서도 수정 저장 가능해야 한다" 충족
- WO §6 원칙 "seller 지정 없는 PRIVATE 상품이 실제 거래/노출 상태로 활성화되어서는 안 된다" 유지
  (`activating` 분기가 그대로 차단)
- B안(등록 기본값 조정)·C안(프론트 강제)은 채택하지 않음 — 등록 계약/Distribution 의미를
  건드리면 F8 `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1` 및 WO §8 HOLD("distribution engine
  정책 자체 재설계") 에 해당한다.

> 공급 방식 변경의 canonical 경로인 `updateDistribution()` 은 이 게이트를 애초에 쓰지 않고
> 자체 트랜잭션 검증(serviceKeys diff · 승인 재요청 · 의약품 게이트)을 갖는다. 즉 게이트는
> 원래부터 일반 정보 수정 경로에만 붙어 있던 잔재였다.

---

## 4. 수정 파일

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/modules/neture/services/offer.service.ts` | 변경 전 상태(`prevIsPublic`/`prevIsActive`/`prevSellerIdCount`) 캡처 + 게이트를 `distributionChanged \|\| activating` 로 한정 |
| `apps/api-server/src/__tests__/supplier-offer-update-private-gate.test.ts` | 신규 회귀 가드 7 케이스 |
| `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` | 저장 실패 오류 코드 → 조치 가능한 한국어 문구 매핑 |

- DB schema/migration 변경 **없음**
- 권한·role 변경 **없음**
- ProductMaster 생성 정책 변경 **없음**
- 공통 UI 패키지·타 서비스 변경 **없음**

---

## 5. 신규 등록 상품 수정 저장 smoke

### 결과: **HOLD — 수행 불가 (계정 자격증명)**

프로덕션 `POST /api/v1/auth/login` 실측 (2026-08-12):

| 계정 | 결과 |
|---|---|
| `renagang21@gmail.com` (WO §9 지정 계정, Neture 공급자2) | **401 `INVALID_CREDENTIALS`** |
| `sohae2100@gmail.com` (Neture admin/operator) | **401 `INVALID_CREDENTIALS`** |
| `sohae21@naver.com` (Neture 공급자) | **401 `ACCOUNT_NOT_ACTIVE`** — `users.status='deleted'` |

- `renagang21@gmail.com` 은 `users.status='active'` · password 존재이므로 계정 문제가 아니라
  **`docs/local/TEST-ACCOUNTS.local.md` 의 값이 현재 프로덕션과 불일치**한다 (해당 문서에 실측 메모 추가).
- 직전 WO 의 브라우저 smoke 는 Playwright 프로필에 남아 있던 **기존 세션**으로 수행된 것이며,
  현재 그 프로필의 세션은 `sohae2100@gmail.com`(공급자 아님) 으로 바뀌어 있다.
- 비밀번호 추측·DB 직접 보정·비밀번호 재설정은 모두 WO §3 금지 범위 / 상시 제약에 해당하므로 수행하지 않았다.

따라서 §9 ① ② ⑤ ⑥ ⑦ ⑧ ⑨ (등록 · 수정 저장 · master/offer 유지 · 설명서 draft · 검수요청 · 정리)
**실데이터 smoke 는 HOLD** 이며, 계정 비밀번호 갱신 후 재실행이 필요하다.

### 대신 확보한 증거

| 증거 | 결과 |
|---|---|
| 배포 이미지 태그 | `api-server:6d79a93fd1c8c4a8163fc7c2147312be06d17a9d` = 이번 수정 commit (revision `o4o-core-api-03299-nc7`) |
| 회귀 테스트 (신규 7 케이스) | 수정 전 계약이면 "신규 등록 직후 가격 수정" 케이스가 실패하는 구조. 현재 7/7 PASS |
| 기존 계약 회귀 (44) | PASS — 활성화 차단 · 판매자 비우기 차단 · PUBLIC/SERVICE 전환 회귀 없음 |

## 6. PRIVATE · 판매자 미지정 노출 차단 확인

프로덕션 read-only 조회 (cloud-sql-proxy, SELECT only).

`public.supplier_product_offers` (`deleted_at IS NULL`) 전량 2건:

| id | distribution_type | is_active | allowed_seller_ids |
|---|---|:---:|---|
| `3bb54519…5615` | SERVICE | t | `{}` |
| `a9b823f8…3046` | **PRIVATE** | f | **`{}`** |

소비 경로가 공통으로 쓰는 필터를 그대로 적용한 결과:

```sql
SELECT id, distribution_type,
       (distribution_type <> 'PRIVATE' OR '…seller…' = ANY(allowed_seller_ids)) AS visible_to_seller
FROM supplier_product_offers WHERE deleted_at IS NULL;
```

| id | visible_to_seller |
|---|:---:|
| `3bb54519…` (SERVICE) | t |
| `a9b823f8…` (PRIVATE · 판매자 미지정) | **f** |

→ **판매자 미지정 PRIVATE offer 는 매장 HUB · checkout · 파트너 조달 어디에도 노출되지 않는다.**
이 차단은 이번 수정과 무관하게 소비 경로가 담당하며, 게이트 축소로 영향받지 않는다.
추가로 `is_active=false` 이므로 활성 조건에서도 제외된다.

## 7. 설명서 draft · 검수요청 회귀 확인

- **HOLD** (§5 와 동일 사유). 이번 수정은 `updateSupplierOffer` 의 분기 1개만 바꾸었고
  설명서(`shared_product_descriptions`) 경로 · `offerId → master_id` 해석 · 검수 요청 경로에는
  코드 변경이 없다. 직전 WO(`…PRODUCT-CREATION-AND-DESCRIPTION-WRITE-SMOKE-BATCH-V1`)에서
  draft 저장 · 검수요청 · store-materials-status 반영이 PASS 로 확인된 상태 그대로다.

## 8. 테스트 데이터와 정리 방법

- 이번 WO 에서 **생성한 테스트 데이터 없음** (write smoke 미수행).
- 프로덕션에 남아 있는 2건은 2026-07-30 자 `[E2E_TEST]` 선행 데이터이며 이번 작업이 만들지 않았다. 손대지 않았다.
- 재실행 시 정리 방법은 직전 CHECK 문서와 동일: 공급자 화면의 상품 삭제 → 설명서는 draft 상태에서 철회.

## 9. typecheck · test · build · deploy 결과

| 항목 | 결과 |
|---|---|
| api-server 신규 회귀 테스트 (7) | PASS |
| api-server 기존 계약 테스트 (`supplier-offer-duplicate-contract`, `store-hub-product-apply-gate`, 44) | PASS |
| api-server `tsc --noEmit` | PASS (exit 0) |
| web-neture `tsc --noEmit` | PASS (exit 0) |
| web-neture `vite build` | PASS (14.21s) |
| Deploy API Server (Cloud Run) | success (`o4o-core-api-03299-nc7`) |
| Deploy Web Services (Cloud Run) | success (neture-web) |

## 10. commit SHA

`6d79a93fd1c8c4a8163fc7c2147312be06d17a9d`

## 11. push 결과

`f05cb81c0..6d79a93fd  main -> main` — `HEAD == origin/main` 확인


---

## 12. 남은 HOLD

| # | 내용 | 필요 조치 |
|---|---|---|
| a | 공급자 계정 실데이터 write smoke (§9 ① ② ⑤ ⑥ ⑦ ⑧ ⑨) | `renagang21@gmail.com` 프로덕션 비밀번호 확인·갱신 후 재실행 |
| b | `docs/local/TEST-ACCOUNTS.local.md` 비밀번호 3건 불일치 | 사용자만 갱신 가능 (git 미추적) |

## 13. 문서 정합

- 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
- `docs/local/TEST-ACCOUNTS.local.md` 는 git 미추적 로컬 SSOT 로, 실측 메모만 추가했다 (커밋 대상 아님).
