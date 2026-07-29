# CHECK-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1

> **판정: PASS — 전역 자원 경계 완성 (소유권 계약 + actor 기반 가드 + 고아 정리 + FK/UNIQUE)**
> 매장 상품 설명 화면의 403 은 후속 `WO-2` 전까지 **의도된 상태**로 유지된다.

| 항목 | 값 |
|------|-----|
| WO | `WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1` |
| 상위 설계 | [DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1](../design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md) §12 WO-1 |
| 선행 IR | [IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1](../investigations/IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1.md) |
| 일자 | 2026-07-29 |
| DB write | **12행 DELETE 1회** (사용자 명시 승인) — 그 외 SELECT only |
| migration | **1건** `20270214000000-AddProductAiGlobalIntegrityConstraints` (DDL 전용) |

---

## 0. 진행 이력 (2단계)

| 단계 | 결과 |
|------|------|
| 1차 (`bd7a7f63b`) | 범위 A(소유권 계약 §5) + §8.1 ID 계약 완료. 범위 B(가드) **STOP** — ProductMaster 의 service scope 판정 불가 (WO §19-1). 고아 12행 **PAUSED_DATA_APPROVAL** |
| 2차 (본 문서) | 사용자 정책 결정으로 차단 해제 → DELETE 승인·실행, 가드 재설계, migration, 테스트 |

1차 STOP 근거는 §2 에 보존한다. 그 STOP 은 "코드가 정책을 임의로 가정할 수 없다" 였고, 정책이 확정되면서 해소되었다.

---

## 1. 확정 정책 (사용자 결정, 2026-07-29)

> **표준 ProductMaster 는 전 서비스 공용 자원이다. ProductMaster 에 service 소유권을 부여하지 않는다.**

명시적으로 **채택하지 않은** 대안:

| 대안 | 판정 |
|------|------|
| `service_products` 에 219,608행 인위 적재 | ❌ 기각 |
| `product_masters` 에 `service_key` 컬럼 신설 | ❌ 기각 |
| `organization_product_listings.service_key='neture'` 를 가드 기준으로 사용 | ❌ 기각 (ProductMaster 소유 service 를 의미하지 않음) |

따라서 접근 판정 축은 **service 경계가 아니라 actor 와 master 의 관계**로 재정의되었다.

| 주체 | 전역 쓰기 | 관리 조회 (ai-contents / ai-tags API) | 렌더 조회 (POP PDF) |
|------|:---------:|:---:|:---:|
| `platform:super_admin` | ✅ | ✅ | ✅ |
| 내부 자동 생성·임포트 (스케줄러·시드) | ✅ (HTTP 미경유 → 가드 대상 아님) | – | – |
| 공급자 — 자기 offer 의 master | ✅ (ACTIVE 만) | ✅ (status 무관) | ✅ |
| 공급자 — 타 공급자 master | ❌ | ❌ | ❌ |
| `{service}:operator` / `{service}:admin` (역할만) | ❌ | ❌ | ❌ |
| 매장 — active OPL 보유 master | ❌ | ❌ | ✅ **read-only** |
| 매장 — 그 외 | ❌ | ❌ | ❌ |

- role 은 **정확 문자열** `platform:super_admin` 만 우회한다. suffix(`:operator`)·prefix(`platform:`) 매칭 분기는 만들지 않는다 (WO §18).
- 매장 read 기준은 `organization_product_listings.organization_id` + `.master_id` + `is_active = true` **뿐**이다.
  `offer_id → supplier_product_offers` 경유는 **제거**했다 (그 테이블 0행 → 기존 dead JOIN 의 원인).

### 1.1 "active" 를 `is_active = true` 로 정한 근거

프로덕션 OPL 20행은 **전부 `is_active=true` + `status='pending'`** 이다.
`status='approved'` 를 요구하면 매칭 0행이 되어 **지금 고치는 버그와 동일한 dead gate** 를 새로 만든다.
→ `is_active = true` 단일 기준을 채택했다.

---

## 2. 1차 STOP 근거 (보존) — ProductMaster 에 service scope 축이 없다

프로덕션 실측:

| 후보 축 | 실측 | 판정 |
|---------|------|------|
| `product_masters` 자체 컬럼 | 26개 컬럼 전수 확인 — service/tenant 컬럼 **없음** | ❌ |
| `service_products` (service_key + master_id, UNIQUE) | **0행** → 219,608 master 중 0개 | ❌ |
| `organization_product_listings.service_key` | 20행뿐, **전부 `'neture'`** (실제로는 KPA 약국 listing) → 커버리지 0.009% | ❌ |
| `supplier_product_offers.service_keys` | **0행** | ❌ |
| 라우트 mount 경로 | 3개 라우터 모두 `app.use('/api/v1/products', …)` — service-neutral | ❌ |

이 실측이 §1 정책 결정("전 서비스 공용")의 근거가 되었다.

### 2.1 기존 가드가 전원 403 이던 3중 결함 (모두 해소)

| # | 결함 | 해소 |
|:-:|------|------|
| 1 | `PLATFORM_ADMIN_ROLES = ['admin','operator']` 정확 일치 — RBAC SSOT 상 무접두 역할 활성 보유자 **0명** | `platform:super_admin` 으로 교체 |
| 2 | `organization_product_listings JOIN supplier_product_offers ON spo.id = opl.offer_id` — 우변 **0행** → 항상 공집합 (dead JOIN) | JOIN 제거, `opl.master_id` 직접 사용 |
| 3 | 공급자 축 부재 — 자기 offer master 에 접근 경로 없음 | 공급자 축 신설 (`neture_suppliers.user_id` → `supplier_product_offers`) |

---

## 3. 고아 데이터 정리 (§11) — 승인·실행 완료

| 항목 | 값 |
|------|-----|
| 승인 | 사용자 명시 승인 (건수 고정 조건부) |
| 원문 보존 | [`product-ai-orphans-before-cleanup-2026-07-29.json`](../data-audits/product-ai-orphans-before-cleanup-2026-07-29.json) — 12행 전 컬럼 |
| 절차 | ① 트랜잭션 밖 PRE 재확인 → ② 트랜잭션 내 `DO $$ … RAISE EXCEPTION` 건수 강제 → ③ DELETE → ④ COMMIT → ⑤ POST 검증 |

```
PRE   contents=3  tags=9  total=12   (승인 건수와 일치 → 진행)
COMMIT OK
POST  orphan_contents=0  orphan_tags=0
      total_contents=0   total_tags=0   dup_content_type=0
```

**material finding:** 고아 12행이 **두 테이블의 전체 내용**이었다.
→ 삭제 후 `product_ai_contents` / `product_ai_tags` 는 **각각 0행**이다.
따라서 기능 손실 0, FK·UNIQUE 적용의 데이터 리스크 0.

- 재연결 **미수행** — 고아 `product_id` 3개는 `store_local_products` 에도 없어 물리적으로 대상 부재
- 수동 저작(`source='manual'`) 0건 / 화면 노출 0 / `product_masters.tags` 오염 0
- DELETE 는 migration 과 **분리**하여 별도 실행했다 (WO §12: "하나의 migration 에 DELETE 를 숨겨 넣지 않는다")

---

## 4. 변경 내역

### 4.1 가드 — [`product-access.utils.ts`](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts)

`verifyProductOrgAccess` → **`resolveGlobalProductResourceAccess`** 로 개명(호출부 전량 store-ai 내부, 외부 소비처 0).
"organization 소유권 가드" 주석은 제거하고 전역 자원 계약으로 대체했다.

3 모드:

| 모드 | 의미 | 허용 주체 |
|------|------|-----------|
| `write` | 생성·수정·삭제 | super_admin / ACTIVE 공급자(자기 master) |
| `manage_read` | AI contents·tags **관리 API 조회** | super_admin / 공급자(자기 master) — **매장 불가** |
| `render_read` | POP PDF 등 **렌더 소비** | 위 + active OPL 보유 매장 |

판정 순서 (5단계):
1. `userId` 없음 → `NO_USER`
2. UUID 형식 아님 → `INVALID_PRODUCT_ID` (uuid 비교 쿼리 예외로 인한 500 방지, DB 조회 0회)
3. `role_assignments` 정확 `platform:super_admin` + `is_active` → 전 모드 허용
4. `neture_suppliers.user_id` → `supplier_product_offers(supplier_id, master_id)` → 허용
   (`write` 는 `status='ACTIVE'` 필요. **자기 master 가 아니면 여기서 종료 — 매장 축으로 승격하지 않는다**)
5. `mode === 'render_read'` 인 경우에만 `organization_members` → `organization_product_listings(organization_id, master_id, is_active)` → 허용

`resolveCallerOrg()` 는 무변경(추천 인기도 집계 전용).

### 4.2 엔드포인트 모드 배정

| 엔드포인트 | 모드 | §8.1 404 게이트 |
|-----------|:----:|:---:|
| `POST /:productId/ai-contents/generate` | write | 기존 (`loadProductContentInput` null) |
| `POST /:productId/ai-contents/generate/:type` | write | 기존 |
| `PUT /:productId/ai-contents/:type` | write | ✅ |
| `GET /:productId/ai-contents` | manage_read | – |
| `GET /:productId/ai-contents/:type` | manage_read | – |
| `DELETE /:productId/ai-contents/:contentId` | write | – (복합조건 삭제) |
| `GET /:productId/ai-tags` | manage_read | – |
| `POST /:productId/ai-tags/regenerate` | write | 기존 |
| `POST /:productId/ai-tags/suggest` | write | 기존 |
| `POST /:productId/ai-tags/manual` | write | ✅ |
| `POST /:productId/ai-tags/manual/batch` | write | ✅ |
| `DELETE /:productId/ai-tags/:tagId` | write | – (복합조건 삭제) |
| `GET /:productId/pop/:layout` (POP PDF, §10) | **render_read** | – |

POP PDF 는 이전에 `authenticate` 외 가드가 **전무**했다 → `render_read` 신규 적용.
매장 자체 상품(`store_local_products`) POP 는 본 라우트 범위가 아니다 (후속 WO-2).

**의도적 편차:** 존재 검사(404)를 접근 판정(403) **이후**에 둔다 — 미인가 호출자에게 master 존재 여부를 노출하지 않는다.

### 4.3 upsert 계약 — [`product-ai-content.service.ts`](../../apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts)

`generateContent()` 와 `saveContent()` 가 동일한 `upsertContent()` 로 수렴한다.
`(product_id, content_type)` 당 **전역 단일 행**을 보장하고, 경합 시 `23505` 를 잡아 승자 행을 재조회하여 갱신한다.

### 4.4 §8.3 DELETE 경계 — 변경 불필요 (이미 충족)

```ts
deleteContent(id, productId) → contentRepo.delete({ id, productId })
deleteTag(tagId, productId)  → tagRepo.delete({ id: tagId, productId })
```
복합 조건 삭제이므로 route productId 로 타 master 행을 삭제할 수 없다.

### 4.5 migration — [`20270214000000-AddProductAiGlobalIntegrityConstraints.ts`](../../apps/api-server/src/database/migrations/20270214000000-AddProductAiGlobalIntegrityConstraints.ts)

**DDL 전용** (DELETE 없음). 선두에 고아 잔존 시 `RAISE EXCEPTION` 하는 안전장치만 둔다.

1. FK `product_ai_contents.product_id → product_masters(id) ON DELETE CASCADE`
2. FK `product_ai_tags.product_id → product_masters(id) ON DELETE CASCADE`
3. `UNIQUE INDEX (product_id, content_type)` on `product_ai_contents`

`product_ai_tags` 에는 **UNIQUE 를 추가하지 않았다** — 동일 태그 중복 허용 계약이 확정되지 않았다 (사용자 지시).
`ADD CONSTRAINT` 는 비멱등이므로 `pg_constraint` 확인 후 조건부 추가한다.

### 4.6 entity 계약 주석 (1차, §5)

[`product-ai-content.entity.ts`](../../apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts) / [`product-ai-tag.entity.ts`](../../apps/api-server/src/modules/store-ai/entities/product-ai-tag.entity.ts) — master 전용 `productId`, 전역 플랫폼 자원, org/store/service_key 없음, 매장 쓰기 금지, `syncMasterTags()` 오염 경로 경고.

---

## 5. 테스트 (§14 — 사용자 개정 매트릭스)

[`product-ai-global-access.spec.ts`](../../apps/api-server/src/__tests__/security/product-ai-global-access.spec.ts) — **26 tests, 26 passed**.

제거된 개념: `kpa:operator → KPA master 허용` / `kpa:operator → GlycoPharm master 차단`
(§1 정책상 존재하지 않는 분류이므로 테스트 자체를 폐기)

| 케이스 | 결과 |
|--------|:----:|
| `platform:super_admin` → 임의 master 전 모드 허용 | ✅ |
| super_admin 판정이 `service_products` / `service_key` 를 조회하지 않음 | ✅ |
| `kpa:operator` → 역할만으로 전역 쓰기 403 | ✅ |
| `neture:operator` → 역할만으로 전역 쓰기 403 | ✅ |
| role 문자열 prefix/suffix 우회 불가 (`super_admin`, `platform:super_admin_readonly`, `admin`) | ✅ |
| 공급자 A → 자기 offer master 전 모드 허용 | ✅ |
| 공급자 A → 공급자 B master 403 | ✅ |
| 비ACTIVE 공급자 → 쓰기 403 / 조회 허용 | ✅ |
| 타 공급자 master 접근이 매장 축으로 승격되지 않음 (`organization_members` 미조회) | ✅ |
| 매장 owner + active OPL → `render_read` 만 성공 | ✅ |
| 매장 owner + active OPL → `write` / `manage_read` 403 | ✅ |
| 매장 owner + 타 조직 master → 전 모드 403 | ✅ |
| OPL `is_active=false` → 403 | ✅ |
| 매장 판정에 `supplier_product_offers` 미사용 | ✅ |
| 미인증 / 비UUID(DB 조회 0회) / 무관계 사용자 → 403 | ✅ |
| local product UUID → `productMasterExists=false` → 404, 신규 전역 row 0 | ✅ |

### 5.1 실브라우저 smoke 불가 사유 (기록)

- **공급자 축**: 프로덕션 `supplier_product_offers` **0행**. WO §18 "프로덕션에 테스트 offer 를 임의 생성하지 않는다" 에 따라 실계정 smoke 불가 → 사용자 지시대로 **fixture 기반 테스트로 대체**했다.
- **매장 축**: 매장 상품 설명 화면은 §1 정책상 `manage_read` 대상이 아니므로 **403 이 정상**이다. 화면 정상화는 후속 WO-2 범위다.
- **super_admin 축**: `platform:super_admin` 보유자 2명은 실 운영 계정이며 테스트 계정이 아니다 (CLAUDE.md §15).

---

## 6. 검증

| 항목 | 결과 |
|------|------|
| `tsc --noEmit` (api-server) | store-ai / migration / spec 오류 **0**. 출력 오류는 전부 `src/scripts/*` **기존** 오류로 본 변경과 무관 |
| jest security spec | 26/26 PASS |
| `verifyProductOrgAccess` 잔존 참조 | grep 결과 **0건** |
| 프론트엔드 | API 응답 계약·타입 변경 없음 → 재빌드 불필요 |
| DB | 승인된 12행 DELETE 외 write 0. migration 은 CI/CD 자동 실행 |

---

## 7. Shared Module Change Protocol 영향표 (§17)

| 소비 영역 | 영향 |
|-----------|------|
| KPA-Society (`/store/*`, `/store-hub/*`) | 상품 설명 화면 403 **유지** — §1 정책상 의도된 상태 (후속 WO-2) |
| GlycoPharm / K-Cosmetics | 없음 (동일 라우터, 동일 정책) |
| Neture 공급자 콘솔 (`ProductDetailDrawer.tsx` — ai-tags 유일 소비처) | **개선** — 기존 dead JOIN 으로 전원 403 → 자기 offer master 접근 가능 |
| Admin / Operator 콘솔 | `platform:super_admin` 만 전역 쓰기. `{service}:operator/admin` 은 역할만으로 불가 (신규 제약, 단 기존에도 실질 0명 통과였으므로 회귀 아님) |
| POP PDF | 무가드 → `render_read` 가드 신설. active OPL 매장은 계속 사용 가능 |
| DB 스키마 | FK 2 + UNIQUE 1 신규 (데이터 0행 상태에서 적용) |

`store_local_products` 스키마, `StoreProductDescriptionsPage`, `ProductPopBuilderPage` **미변경** (§18 준수).
다른 세션 WIP(neture supplier governance) 는 조회만 하고 수정·stash·revert 하지 않았으며, path-specific `git add --` 로 분리 커밋했다.

---

## 8. 남은 작업

| # | 항목 | 상태 |
|:-:|------|------|
| 1 | 배포 + migration 적용 확인 | ✅ 완료 (§9.1) |
| 1-a | **P1 — 공급자 링크 보유 매장 사용자의 `render_read` 상실** (§9.3) | ✅ **해소** — [`WO-…-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1`](CHECK-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1.md) (선택지 B) |
| 2 | 후속 `WO-2 O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1` — 매장 상품 설명 화면 정상화 | 미착수 |
| 3 | `product_ai_tags` UNIQUE 여부 | **보류** — 중복 허용 계약 확정 전 추가 금지 |
| 4 | KPA `StoreProductionMaterialsPage` + `SelectContentsForProductionModal` dead code 삭제 | 미승인 |

---

## 9. 배포 / 프로덕션 확인

커밋 `684223b53` → `Deploy API Server (Cloud Run)` **success**.

### 9.1 migration 적용 확인 (read-only SELECT)

```
typeorm_migrations  id=619  timestamp=270214000000
                    name=AddProductAiGlobalIntegrityConstraints20270214000000

FK_product_ai_contents_master  f  FOREIGN KEY (product_id) REFERENCES product_masters(id) ON DELETE CASCADE
FK_product_ai_tags_master      f  FOREIGN KEY (product_id) REFERENCES product_masters(id) ON DELETE CASCADE
UQ_product_ai_contents_product_type  UNIQUE INDEX ON product_ai_contents (product_id, content_type)

contents=0  tags=0  orphan_contents=0  orphan_tags=0
```

`product_ai_tags` UNIQUE 는 계획대로 **없음**.

### 9.2 API smoke (프로덕션)

미인증 — 4개 라우트 전부 `401 AUTH_REQUIRED` (가드 이전 단계에서 차단).

인증 후 (`master_id = 0a47e0bc…`, 해당 매장 조직의 **active OPL 보유 master**):

| 계정 | 보유 축 | ai-contents GET | ai-tags GET | pop/A4 GET | ai-contents PUT | 비UUID GET |
|------|--------|:---:|:---:|:---:|:---:|:---:|
| `sohae2100@gmail.com` — `kpa:operator`·`kpa:admin`·`neture:operator`·`neture:admin`, 공급자 링크 없음, active OPL 없음 | 역할만 | 403 | 403 | 403 | 403 | 403 |
| `sohae21@naver.com` — `kpa:store_owner` + **ACTIVE 공급자 링크** + active OPL 보유 | 매장 ∩ 공급자 | 403 | 403 | **403** | 403 | 403 |

- ✅ `{service}:operator` / `{service}:admin` 은 **역할만으로 전역 쓰기·조회 불가** — 정책대로 동작
- ✅ 매장 사용자의 `write` / `manage_read` 차단 — 정책대로 동작
- ✅ 비UUID `productId` 는 **500 이 아니라 403** — DB 조회 0회
- ✅ smoke 의 PUT 시도 후에도 `product_ai_contents` **0행 유지** (신규 전역 row 생성 0)

### 9.3 신규 실측 발견 (P1) — 공급자 링크 보유 매장 사용자는 `render_read` 를 잃는다

`sohae21@naver.com` 은 **active OPL 을 보유한 매장 owner** 인데도 POP PDF 가 403 이다.
원인은 판정 순서 §4.1-4 이다: 이 사용자는 `neture_suppliers` 링크(ACTIVE)를 갖고 있으므로 공급자 축에서 먼저 평가되고,
해당 master 가 자기 offer 가 아니므로 `NO_RELATION_TO_MASTER` 로 **종료되어 매장 축(5단계)에 도달하지 못한다.**

- 현재 `supplier_product_offers` 는 **0행**이므로, **공급자 링크를 가진 모든 사용자는 POP PDF 를 전혀 사용할 수 없다.**
- 실측상 KPA 매장 테스트 계정 2개가 **모두** 공급자 링크를 갖고 있어(`renagang21@gmail.com`, `sohae21@naver.com`)
  → **매장 `render_read` 200 경로는 실계정으로 smoke 할 수 없었다.** (fixture 테스트로만 검증됨)

이는 "공급자 축 판정 후 매장 축으로 승격하지 않는다" 는 지정된 순서의 직접적 귀결이며,
접근을 **넓히는** 변경이므로 **임의로 수정하지 않았다.** 정책 판단이 필요하다.

| 선택지 | 내용 | 영향 |
|:--:|------|------|
| A (현행 유지) | 공급자 링크 보유자는 매장 축 미평가 | 겸업 사용자의 POP PDF 상실. 현재 offer 0행이므로 사실상 공급자 전원 |
| B (권장) | `render_read` 에 한해 공급자 축 실패 시 매장 축으로 fallthrough | 겸업 사용자가 자기 매장 진열 상품의 POP 를 다시 사용. 권한 확대는 "active OPL 보유" 범위로 한정 |

→ ~~미결. 사용자 결정 후 별도 변경으로 처리한다.~~
**해소 (2026-07-29).** 사용자가 **B** 를 선택하여
`WO-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1` 로 처리 완료.
공급자 관계와 매장 관계를 **독립적으로** 평가하되 확대 범위는 `render_read` 한정.
프로덕션 재smoke: 동일 계정·동일 master 의 POP PDF **200 (`application/pdf`)**,
`write` · `manage_read` 는 **403 유지**.
→ [`CHECK-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1`](CHECK-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1.md)

### 9.4 브라우저 smoke 불가 사유 (재확인)

- 공급자 축 200 경로: `supplier_product_offers` **0행** → WO §18 "프로덕션에 테스트 offer 를 임의 생성하지 않는다" 로 불가
- 매장 `render_read` 200 경로: §9.3 사유로 불가 → **후속 WO 에서 해소되어 실계정 200 확인됨**
- `platform:super_admin` 축: 보유자 2명이 실 운영 계정 (CLAUDE.md §15)
- → 위 3개 축은 [`product-ai-global-access.spec.ts`](../../apps/api-server/src/__tests__/security/product-ai-global-access.spec.ts) fixture 테스트로 검증했다.
