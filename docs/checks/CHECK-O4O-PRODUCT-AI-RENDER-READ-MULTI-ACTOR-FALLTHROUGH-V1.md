# CHECK-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1

> WO: `WO-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1`
> 선행 WO: [`CHECK-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1`](CHECK-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1.md)
> 일자: 2026-07-29
> 판정: **PASS**

---

## 1. 문제 (선행 WO 에서 발견된 P1)

선행 WO 로 `product_ai_contents` / `product_ai_tags` / POP 렌더의 접근 판정을
`resolveGlobalProductResourceAccess()` 로 통일한 뒤, 프로덕션 smoke 에서 다음이 관측되었다.

- `sohae21@naver.com` 은 요청 master(`0a47e0bc-38d0-45ae-9e6a-15a71ff80e1d`) 에 대해
  **active `organization_product_listings` 를 보유**하고 있음에도 POP PDF 가
  `403 PRODUCT_ACCESS_DENIED`.
- 원인: 해당 사용자가 `neture_suppliers` 링크(ACTIVE)를 **동시에** 보유하고 있어,
  공급자 축에서 `supplier_product_offers` 매칭 실패 시점에 **판정이 종료**되었다.
  매장 관계는 평가조차 되지 않았다.
- 영향 규모: 프로덕션 `supplier_product_offers` 가 0행이므로,
  **공급자 링크 보유자 전원이 POP PDF 를 사용할 수 없었다.**

접근 확대에 해당하므로 임의 수정하지 않고 선택지 A/B 를 기록했고,
사용자가 **B (관계별 독립 평가, render_read 한정)** 를 선택하여 본 WO 가 발행되었다.

---

## 2. 확정 계약

한 사용자는 공급자 관계와 매장 관계를 **동시에** 보유할 수 있다.
따라서 두 관계는 **독립적으로** 평가한다. 공급자 실패를 매장 권한으로 *승격*하는 것이 아니다.

| mode | 공급자 관계 실패 시 |
|------|------|
| `render_read` | **매장 관계 판정으로 계속 진행 (fallthrough)** |
| `manage_read` | 즉시 403 — 변경 없음 |
| `write` | 즉시 403 — 변경 없음 |

- fallthrough 후 매장 판정 경로는 기존과 동일:
  `organization_members` → `organization_product_listings` → `master_id` 일치 → `is_active = true`.
- 매장 관계로 허용된 경우 공급자 링크 보유 여부와 무관하게
  `actorType = 'store'`, `grantReason = 'ACTIVE_ORGANIZATION_LISTING'` 로 기록한다.
  공급자 링크가 있다는 이유로 `actorType='supplier'` 로 기록하지 않는다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| [`apps/api-server/src/modules/store-ai/utils/product-access.utils.ts`](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts) | 공급자 offer 불일치 시 무조건 반환하던 분기를 mode 게이트로 변경. `grantReason` 필드 추가 |
| [`apps/api-server/src/__tests__/security/product-ai-global-access.spec.ts`](../../apps/api-server/src/__tests__/security/product-ai-global-access.spec.ts) | 겸업 사용자 케이스 7건 추가, 기존 1건 재작성 |

**변경 없음 (WO §8 · §12):**
- `product-pop-pdf.controller.ts` / `product-ai-content.controller.ts` / `product-ai-tag.controller.ts` — 컨트롤러·route 무변경. 가드 판정 결과만 달라진다.
- 프론트엔드 4개 서비스 (`web-kpa-society` / `web-neture` / `web-glycopharm` / `web-k-cosmetics`) — 변경 0
- **DB migration 0 / DB write 0**

### 3.1 핵심 diff

```ts
// 공급자 링크는 있으나 자기 offer 의 master 가 아닌 경우
if (mode !== 'render_read') {
  return { ...base, allowed: false, actorType: 'none', supplierId,
           denyReason: 'NO_RELATION_TO_MASTER' };
}
// → 아래 매장 관계 판정을 계속한다.
```

```ts
// 겸업 사용자가 여기까지 온 경우에도 **최종 허용 관계는 매장**
return { ...base, allowed: true, actorType: 'store', organizationId,
         grantReason: 'ACTIVE_ORGANIZATION_LISTING' };
```

---

## 4. 테스트

`npx jest --testPathPattern=security/product-ai-global-access --no-coverage`
→ **34 passed / 34 total**

### 4.1 신규 (겸업 사용자 — 공급자 링크 + 매장 소속)

| # | 케이스 | 기대 | 결과 |
|---|--------|------|------|
| 1 | 자기 offer master + `render_read` | 허용 · `actorType=supplier` · 매장 관계 **미조회** | PASS |
| 2 | 타 master + active OPL + `render_read` | 허용 · `actorType=store` · `grantReason=ACTIVE_ORGANIZATION_LISTING` | PASS |
| 3 | 타 master + active OPL 없음 + `render_read` | 거부 | PASS |
| 4 | 타 master + active OPL + `write` | 거부 · 매장 관계 **미조회** | PASS |
| 5 | 타 master + active OPL + `manage_read` | 거부 · 매장 관계 **미조회** | PASS |
| 6 | 타 조직이 진열한 master + `render_read` | 거부 | PASS |
| 7 | inactive OPL + `render_read` | 거부 | PASS |

### 4.2 재작성 1건

기존 `'타 공급자 master 접근 시 매장 축으로 승격되지 않는다'` 는
`render_read` 에서 `organization_members` 가 조회되지 않음을 단언했다.
본 WO 계약이 이 동작을 **의도적으로** 바꾸므로, 동일 단언을
`write` / `manage_read` 로 재조준했다 (`it.each`).
→ 공급자 실패의 즉시 종료 성질은 write/manage_read 에서 그대로 검증된다.

### 4.3 회귀 유지 (기존 전량 GREEN)

`platform:super_admin` 전 모드 허용 / `{service}:operator`·`admin` 전역 403 /
role prefix·suffix 우회 불가 / 공급자 자기 offer 허용 / 비ACTIVE 공급자 write 403 /
순수 매장 사용자 `render_read` 허용·`write`·`manage_read` 403 / 타 조직 master 403 /
inactive OPL 403 / `supplier_product_offers` 경유 미사용 / 미인증 403 /
비UUID 는 DB 조회 없이 403 / `productMasterExists` §8.1 계약 4건.

### 4.4 type-check

`pnpm --filter @o4o/api-server type-check`
→ 본 WO 범위 오류 **0**. 잔여 오류는 전부 `src/scripts/*` 의 **선행 존재** 오류
(hff / otc 생산 스크립트, 다른 세션 소유) 로 본 변경과 무관하다.

---

## 5. 정적 검증 (WO §10)

`rg 'NO_RELATION_TO_MASTER|render_read|resolveGlobalProductResourceAccess' apps/api-server/src/modules/store-ai`

- `render_read` 를 사용하는 컨트롤러는 `product-pop-pdf.controller.ts` **1개뿐**이며 무변경.
- `product-ai-content.controller.ts` (6 라우트) / `product-ai-tag.controller.ts` (6 라우트) 는
  전부 `write` · `manage_read` 로, fallthrough 대상이 아니다 → **쓰기·관리조회 확대 0**.
- mode 게이트는 `product-access.utils.ts:181` 단일 지점.

---

## 6. 프로덕션 smoke

계정: `sohae21@naver.com` (공급자 링크 ACTIVE + 매장 소속 겸업)
대상 master: `0a47e0bc-38d0-45ae-9e6a-15a71ff80e1d` (해당 조직 active OPL 보유)

| # | 요청 | 기대 | 결과 |
|---|------|------|------|
| 1 | `GET /api/v1/products/{master}/pop/A4` | 403 해소 | (배포 후 기록) |
| 2 | active OPL 없는 master 의 POP | 403 유지 | (배포 후 기록) |
| 3 | `PUT /api/v1/products/{master}/ai-contents/product_description` | 403 유지 | (배포 후 기록) |
| 4 | `GET /api/v1/products/{master}/ai-contents` | 403 유지 | (배포 후 기록) |
| 5 | `product_ai_contents` / `product_ai_tags` row 수 | 변동 없음 | (배포 후 기록) |

---

## 7. Shared Module 영향

`resolveGlobalProductResourceAccess()` 는 `apps/api-server/src/modules/store-ai` 내부 전용이며
소비처는 위 3개 컨트롤러(13 엔드포인트) 뿐이다.
KPA / Neture / GlycoPharm / K-Cosmetics 어느 프론트도 본 함수를 직접 호출하지 않고,
서비스별 예외 분기를 추가하지 않았다 (전 서비스 공통 계약 유지).

---

## 8. 변경 금지 항목 준수 (WO §15)

| 금지 | 준수 |
|------|------|
| write fallthrough | ✅ 미구현 (테스트 4번으로 고정) |
| manage_read fallthrough | ✅ 미구현 (테스트 5번으로 고정) |
| 매장 전역 AI 콘텐츠 쓰기 허용 | ✅ 없음 |
| 매장 AI 태그 관리 허용 | ✅ 없음 |
| 공급자 타 master 쓰기 허용 | ✅ 없음 |
| active OPL 없는 master 렌더 허용 | ✅ 없음 (테스트 3·6·7) |
| `service_products` 사용 | ✅ 없음 |
| `service_key` 가드 신설 | ✅ 없음 |
| role prefix/suffix 우회 | ✅ 없음 (기존 회귀 테스트 유지) |
| 프론트 변경 | ✅ 0 |
| DB migration | ✅ 0 |
| DB write | ✅ 0 |
