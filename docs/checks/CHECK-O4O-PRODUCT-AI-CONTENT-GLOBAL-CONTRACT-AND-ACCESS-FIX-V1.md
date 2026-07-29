# CHECK-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1

> **판정: PARTIAL — 범위 A(소유권 계약 명문화) + §8.1 ID 계약 완료 / 범위 B(가드 재설계) STOP / 고아 정리·migration PAUSED_DATA_APPROVAL**

| 항목 | 값 |
|------|-----|
| WO | `WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1` |
| 상위 설계 | [DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1](../design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md) §12 WO-1 |
| 선행 IR | [IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1](../investigations/IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1.md) |
| 일자 | 2026-07-29 |
| DB write | **0건** (read-only SELECT 만 실행) |
| migration | **0건** |
| 배포 | **0건** |

---

## 1. 결론 요약

| 범위 | 상태 | 사유 |
|------|:----:|------|
| A. entity/service 소유권 계약 명문화 (§5) | ✅ 완료 | 코드 주석 계약 반영 |
| §8.1 ID 계약 가드 (master 전용 → 404) | ✅ 완료 | 쓰기 경로 3곳에 적용 |
| §8.3 DELETE 경계 검증 | ✅ 이미 충족 | 기존 코드가 복합 조건 delete |
| B. 접근 가드 재설계 (§6·§7) | ⛔ **STOP** | ProductMaster 의 service scope 판정 불가 (§19-1) |
| §10 POP PDF 가드 | ⛔ STOP | 범위 B 결과에 의존 |
| §11 고아 12행 정리 | ⏸ **PAUSED_DATA_APPROVAL** | DELETE 승인 필요 |
| §12 FK + UNIQUE migration | ⏸ PAUSED | 고아 정리 선행 필수 |
| §14 권한 테스트 매트릭스 | ⛔ 실행 불가 | 판정 대상 분류가 존재하지 않음 |

WO §19 "부분 완료 보고가 가능하다" 에 따른 부분 완료 보고이다.

---

## 2. 범위 B STOP 근거 — ProductMaster 에 service scope 축이 없다

WO §6.3 은 다음을 명시한다.

> "단순히 `role.endsWith(':operator')` 만 검사하지 않는다 … 대상 ProductMaster 의 service scope 와 일치해야 한다"
> "**service 경계를 확인할 수 없으면 전 서비스 운영자 우회를 만들지 말고 중지한다.**"

프로덕션 실측 결과, ProductMaster 를 service 로 분류할 canonical 축이 **존재하지 않는다.**

| 후보 축 | 실측 | 판정 |
|---------|------|------|
| `product_masters` 자체 컬럼 | 26개 컬럼 전수 확인 — service/tenant 컬럼 **없음** | ❌ |
| `service_products` (service_key + master_id, UNIQUE) | **0행** → 219,608 master 중 0개가 service scope 보유 | ❌ |
| `organization_product_listings.service_key` | 20행뿐이며 **전부 `'neture'`** (실제로는 KPA 약국 listing) → 신뢰 불가, 커버리지 0.009% | ❌ |
| `supplier_product_offers.service_keys` | **0행** | ❌ |
| 라우트 mount 경로 | 3개 라우터 모두 `app.use('/api/v1/products', …)` — service-neutral, 경로에 service 문맥 없음 | ❌ |

- `product_masters` 총 219,608행 중 **service scope 를 확인할 수 있는 행 0건.**

따라서 WO §14.1 이 요구하는 필수 테스트
"`kpa:operator` → KPA master 허용 / GlycoPharm master 차단"
은 **분류 자체가 존재하지 않아 구현·검증이 불가능**하다.

여기서 가드를 만들려면 둘 중 하나뿐인데 둘 다 금지된다.

1. suffix(`:operator`)만 보고 전 서비스 허용 → WO §18 명시 금지 + §6.3 명시 금지
2. OPL `service_key` 를 근거로 사용 → 데이터가 실제와 불일치(KPA listing 이 `'neture'`)하며 커버리지 0.009%. 오분류 가드는 무가드보다 위험

→ **§19-1 중지 조건 성립. 가드 코드는 한 줄도 변경하지 않았다.**

### 2.1 STOP 이 아닌 축 (확인 완료 — 참고)

| 축 | 결과 |
|----|------|
| 공급자 소유권 (§6.4) | ✅ canonical 명확: `neture_suppliers.user_id` → `supplier_product_offers.supplier_id/master_id`. `neture-identity.middleware.ts` 가 표준 해석기 |
| `product_ai_tags.product_id` 축 (§19-3) | ✅ master 기반. 유일 소비처 `web-neture ProductDetailDrawer.tsx` 가 `product.masterId` 사용 |
| 고아 건수 (§19-7) | ✅ 정확히 3 + 9 = 12 |
| UNIQUE 중복 (§19-8) | ✅ `(product_id, content_type)` 중복 0건 |
| 다른 세션 WIP (§19-9) | ✅ 없음 (`git status --short` 공백, staged index 공백) |

---

## 3. 현재 가드가 왜 전원 403 인가 (변경하지 않았으므로 그대로 유지됨)

[`product-access.utils.ts`](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts) `verifyProductOrgAccess`:

1. **우회 역할**: `PLATFORM_ADMIN_ROLES = ['admin','operator']` **정확 문자열 일치**.
   RBAC SSOT 상 무접두 `admin`/`operator` 활성 보유자 **0명**. 실 역할은 접두형:
   `platform:super_admin`(2) / `kpa:operator`(1) / `kpa:admin`(1) / `glycopharm:operator`(2) /
   `glycopharm:admin`(2) / `cosmetics:operator`(1) / `cosmetics:admin`(1) / `neture:operator`(1) / `neture:admin`(1)
   → 운영자·관리자 전원 우회 실패.
2. **소유 판정**: `organization_product_listings` JOIN `supplier_product_offers ON spo.id = opl.offer_id`.
   `supplier_product_offers` **0행** → JOIN 결과 항상 공집합 (dead JOIN) → 매장 사용자 전원 실패.
3. **공급자 축 부재**: 공급자가 자기 offer 의 master 에 접근할 경로가 없다.

→ 세 결함이 겹쳐 **모든 주체가 403**. 본 WO 는 이 사실을 코드 주석으로 명문화만 하고 수정은 중지했다.

> WO §16 명시: 이번 WO 이후에도 매장 화면이 403 을 유지하는 것은 회귀가 아니라 **의도된 상태**이다
> ("전역 row 오염 방지 > 기능 정상화").

---

## 4. 실제 변경 내역 (6파일)

모두 **scope 독립적**이며, 현재 모든 요청이 그 이전 단계(403)에서 종료되므로 **관측 가능한 동작 변화 0**.

| 파일 | 변경 |
|------|------|
| [product-ai-content.entity.ts](../../apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts) | 소유권 계약 주석: master 전용 / org·store·service_key 없음 / 전역 단일행 upsert / 매장 쓰기 금지 / 매장 설명은 `store_local_products`, canonical 은 SPD |
| [product-ai-tag.entity.ts](../../apps/api-server/src/modules/store-ai/entities/product-ai-tag.entity.ts) | 동일 계약 + `syncMasterTags()` 오염 경로 경고 |
| [product-access.utils.ts](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts) | ① 헤더의 잘못된 "canonical ownership source" 서술을 실제 상태(전원 403·dead JOIN·무접두 역할 0명)로 교체 ② `productMasterExists()` 신규 export |
| [product-ai-content.controller.ts](../../apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts) | 헤더 계약 갱신 + `PUT /:productId/ai-contents/:type` 에 §8.1 404 게이트 |
| [product-ai-tag.controller.ts](../../apps/api-server/src/modules/store-ai/controllers/product-ai-tag.controller.ts) | 헤더 계약 갱신 + `POST …/ai-tags/manual`, `POST …/ai-tags/manual/batch` 에 §8.1 404 게이트 |
| [AUDIT-…-PREFLIGHT-V1.md](../data-audits/AUDIT-O4O-PRODUCT-AI-ORPHAN-CLEANUP-PREFLIGHT-V1.md) + JSON | 고아 12행 원문 보존 및 승인 요청 |

### 4.1 §8.1 ID 계약 — 어디에 적용했고 왜 그 위치인가

신규 전역 행을 만들 수 있는 쓰기 경로에만 적용했다.

| 엔드포인트 | 조치 |
|-----------|------|
| `PUT /:productId/ai-contents/:type` | ✅ 신규 404 게이트 |
| `POST /:productId/ai-tags/manual` | ✅ 신규 404 게이트 |
| `POST /:productId/ai-tags/manual/batch` | ✅ 신규 404 게이트 |
| `POST /:productId/ai-contents/generate`(+`/:type`) | 이미 404 — `loadProductContentInput()` 이 master 미존재 시 null 반환 |
| `POST /:productId/ai-tags/regenerate`·`/suggest` | 생성 입력이 master 조회에 의존 |
| GET 계열 / DELETE | 신규 행을 만들지 않음 → 변경 없음 |

**의도적 편차 (기록):** 존재 검사를 **접근 판정(403) 이후**에 둔다.
- 미인가 호출자에게 master 존재 여부를 노출하지 않는다 (존재 여부 탐침 차단)
- 결과적으로 현 시점에는 모든 요청이 403 에서 끝나므로 **동작 변화 0** 이 보장된다
- WO §8.2 의 "없는 ID → 404 / 권한 없는 유효 ID → 403" 은 가드가 정상화된 뒤 그대로 성립한다

잘못된 형식의 UUID 는 쿼리 오류를 피하기 위해 정규식으로 사전 차단하고 `false`(→404) 처리한다.

### 4.2 §8.3 — 변경 불필요 (이미 충족)

```ts
// product-ai-content.service.ts:159
async deleteContent(id: string, productId: string) { await this.contentRepo.delete({ id, productId }); }
// product-ai-tagging.service.ts:244
async deleteTag(tagId: string, productId: string) { await this.tagRepo.delete({ id: tagId, productId }); … }
```
복합 조건 삭제이므로 다른 master 의 행을 route productId 로 삭제할 수 없다. **추가 조치 없음.**

---

## 5. 고아 데이터 (§11) — PAUSED_DATA_APPROVAL

- 실측 **정확히 12행** = `product_ai_contents` 3 + `product_ai_tags` 9
- 원문 전량 보존: [`product-ai-orphans-before-cleanup-2026-07-29.json`](../data-audits/product-ai-orphans-before-cleanup-2026-07-29.json)
- 고아 `product_id` 3개는 `store_local_products` 에도 **없음** → 재연결 대상 부재 (재연결 금지 원칙과 무관하게 물리적으로 불가)
- 수동 저작(`source='manual'`) 0건 / 현재 화면 노출 0 / `product_masters.tags` 오염 0
- **DELETE 미실행.** 대상 ID·SQL·건수 가드·rollback·검증 쿼리는
  [AUDIT-O4O-PRODUCT-AI-ORPHAN-CLEANUP-PREFLIGHT-V1](../data-audits/AUDIT-O4O-PRODUCT-AI-ORPHAN-CLEANUP-PREFLIGHT-V1.md) 참조

## 6. migration (§12) — PAUSED

고아 정리 전에는 FK 생성이 실패하므로 migration 파일을 **생성하지 않았다**.
승인 후 순서: **① DELETE → ② 고아 0/0 검증 → ③ FK 2개 + `UNIQUE(product_id, content_type)`**.
WO §12 "하나의 migration 에 DELETE 를 숨겨 넣지 않는다" 를 준수하여 ①과 ③을 분리한다.

현재 두 테이블의 제약은 **PRIMARY KEY 뿐**이다 (FK·UNIQUE 0개).

---

## 7. 검증

| 항목 | 결과 |
|------|------|
| `pnpm --filter @o4o/api-server type-check` | store-ai 모듈 오류 **0**. 출력된 오류는 전부 `src/scripts/*` 의 **기존(pre-existing)** 오류이며 본 변경과 무관 |
| 프론트엔드 | API 타입·응답 계약 변경 없음 → web-neture / 3개 매장 서비스 재검증 불필요 |
| 프로덕션 smoke | 배포 없음. 동작 변화 0 이므로 smoke 대상 없음 |
| DB | SELECT 만 실행. write/DDL 0 |

---

## 8. Shared Module Change Protocol 영향표 (§17)

| 소비 영역 | 영향 |
|-----------|------|
| KPA-Society (`/store/*`, `/store-hub/*`) | 없음 (403 유지 — §16 의도된 상태) |
| GlycoPharm / K-Cosmetics | 없음 |
| Neture 공급자 콘솔 (`ProductDetailDrawer.tsx` — ai-tags 유일 소비처) | 없음. 이미 `product.masterId` 사용 |
| Admin / Operator 콘솔 | 없음 |
| DB 스키마 | 없음 |

`store_local_products` 스키마, `StoreProductDescriptionsPage`, `ProductPopBuilderPage` **미변경** (§18 준수).

---

## 9. 남은 작업 / 차단 해제 조건

| # | 항목 | 차단 해제 조건 |
|:-:|------|----------------|
| 1 | 범위 B 가드 재설계 | **ProductMaster ↔ service 매핑 정책 결정이 선행되어야 한다.** 선택지: (a) `service_products` 를 실제로 채운다 (b) `product_masters` 에 service 축 신설 (c) "표준 상품은 전 서비스 공용" 으로 공식 선언하고 운영자 축을 service 무관으로 재정의 — (c)는 정책 결정이며 코드가 임의로 가정할 수 없다 |
| 2 | §10 POP PDF 가드 | #1 이후 |
| 3 | §11 고아 12행 DELETE | **사용자 승인** |
| 4 | §12 FK + UNIQUE migration | #3 완료 + 0/0 검증 |
| 5 | §14 권한 테스트 매트릭스 | #1 이후 |
