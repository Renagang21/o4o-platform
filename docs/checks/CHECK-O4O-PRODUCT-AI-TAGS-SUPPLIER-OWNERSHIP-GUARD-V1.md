# CHECK — WO-O4O-PRODUCT-AI-TAGS-SUPPLIER-OWNERSHIP-GUARD-V1

- **일자**: 2026-08-11
- **범위**: `POST /api/v1/products/:productId/ai-tags/*` 소유권 가드
- **DB write**: 0건 (schema 0 / migration 0 / 운영 데이터 변경 0)
- **판정**: **PASS (전제 정정 포함)**

---

## 0. 전제 정정 — 선행 CHECK 의 finding #2 는 사실이 아니었다

선행 `CHECK-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1` 에서
"`ai-tags` 경로는 `authenticate` 만 거쳐 임의 ProductMaster 를 수정할 수 있다" 고 적었으나,
이번 §2 감사 결과 **6개 경로 전부 이미 `resolveGlobalProductResourceAccess` 로 소유권을 판정**하고 있다.
해당 가드는 `WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1` 에서 도입됐다.
즉 본 WO 가 전제한 우회 경로는 **현재 코드에 존재하지 않는다.**

따라서 이번 작업은 "없는 가드를 새로 만드는" 작업이 아니라
**(a) 가드가 조용히 빠지는 회귀를 막는 계약 고정** 과
**(b) 감사 중 실제로 발견된 §6 ProductMaster 비파괴 위반 1건 수정** 으로 수행했다.

---

## 1. §2 현행 경로 감사

라우터: `apps/api-server/src/modules/store-ai/controllers/product-ai-tag.controller.ts`
마운트: `register-routes.ts:702` — `app.use('/api/v1/products', createProductAiTagRouter(dataSource))` (앞단 shadowing 라우터 없음)

| # | method / path | 현재 auth guard | 실제 write 필드 | 호출 주체 |
|---|---|---|---|---|
| 1 | `GET /:productId/ai-tags` | `authenticate` + resolver(`manage_read`) | 없음 (조회) | 공급자 상세 Drawer |
| 2 | `POST /:productId/ai-tags/regenerate` | `authenticate` + resolver(`write`) | `product_ai_tags`, `product_masters.tags` | 공급자 |
| 3 | `POST /:productId/ai-tags/suggest` | `authenticate` + resolver(`write`) | 없음 (제안만 반환) | 공급자 |
| 4 | `POST /:productId/ai-tags/manual` | `authenticate` + resolver(`write`) + `productMasterExists`→404 | `product_ai_tags`, `product_masters.tags` | 공급자 |
| 5 | `POST /:productId/ai-tags/manual/batch` | `authenticate` + resolver(`write`) + `productMasterExists`→404 | `product_ai_tags`, `product_masters.tags` | 공급자 |
| 6 | `DELETE /:productId/ai-tags/:tagId` | `authenticate` + resolver(`write`) | `product_ai_tags`, `product_masters.tags` | 공급자 |

프론트 소비처는 `services/web-neture/src/lib/api/product.ts` (6개 함수) 단일이다.
`apps/main-site/.../AITagSuggestions.tsx` 는 CSS 클래스명만 일치할 뿐 이 API 를 호출하지 않는다.
별도 O4O 관리자용 AI tags 화면·API 는 존재하지 않는다 → **§4 대로 새 관리자 우회 API 를 만들지 않았다.**

---

## 2. §3 ownership 기준 (기존 재사용, 신규 시스템 0)

`modules/store-ai/utils/product-access.utils.ts` 의 `resolveGlobalProductResourceAccess()` 를 그대로 사용한다.

1. `platform:super_admin` (정확 문자열 비교, prefix 매칭 없음) → 허용
2. 공급자 — 본인 `supplier_product_offers(supplier_id, master_id)` 가 있어야 하고,
   `write` 는 `neture_suppliers.status = 'ACTIVE'` 까지 요구
3. 매장 — 활성 OPL 이 있으면 `render_read` 만

거부 코드: `NO_USER` / `INVALID_PRODUCT_ID` / `WRITE_REQUIRES_ACTIVE_SUPPLIER` / `NO_RELATION_TO_MASTER` / `STORE_WRITE_FORBIDDEN` → 403 `PRODUCT_ACCESS_DENIED`.
**supplier 역할 문자열만으로는 아무 권한도 생기지 않는다** (offer 관계가 근거).
`{service}:operator|admin` 은 이 판정에서 어떤 권한도 얻지 못한다 (2026-07-29 승인 정책).

---

## 3. 변경 사항

### 3-1. §6 ProductMaster 비파괴 — `syncMasterTags` 수정 (실제 결함)

`modules/store-ai/services/product-ai-tagging.service.ts`

운영 `product_masters.tags` 는 jsonb 이며 두 형태가 공존한다.

| `jsonb_typeof(tags)` | 건수 | 의미 |
|---|---:|---|
| `array` | 239,361 | 검색용 태그 목록 (동기화 대상) |
| `object` | 32,674 | 배치/rollback 메타 — 전량 COSMETIC, 키 `nameCleanupV1` / `woBatch` / `censusKey` |

기존 `syncMasterTags` 는 형태를 보지 않고 `update(productId, { tags: merged })` 로 배열을 덮어썼다.
정상 소유 공급자가 자기 화장품 master 에 AI tag 를 1건만 붙여도 **선행 WO 의 rollback 키가 소실**된다.
AI 태그는 `product_ai_tags` 에 이미 보존되므로, **object 형태인 master 는 동기화를 건너뛰고 warn 을 남기도록** 수정했다.
변경 대상은 AI tags 관련 필드뿐이며 name/brand/manufacturer/category/regulatory_type/identifiers/canonical 설명서는 건드리지 않았다.

### 3-2. §7 역할별 계약 고정 — route-wiring spec 신규

`apps/api-server/src/__tests__/security/product-ai-tags-route-ownership.spec.ts` (신규, **43 tests PASS**)

- 4개 POST write × {자기 master PASS / 타 공급자 master 403 / offer 없는 master 403}
- `DELETE` 동일 2축
- `PENDING` 공급자 → 403 (`WRITE_REQUIRES_ACTIVE_SUPPLIER`)
- 비소유 6역할(`kpa-society:admin|operator`, `cosmetics:admin|operator`, `glycopharm:admin`, 일반 인증 사용자) × {manual 403 / regenerate 403 / GET 403}
- `platform:super_admin` — 타 공급자 master 포함 PASS
- 미인증 401 / 없는 master 404 `PRODUCT_MASTER_NOT_FOUND` / 비 UUID 403
- `syncMasterTags` §6 비파괴 3건 (object → update 미호출, array → 정상 update, null → update)

기존 `product-ai-global-access.spec.ts` 31 tests 와 합산 **2 suites / 74 tests PASS**, `npx tsc --noEmit` clean.

---

## 4. §8 공급자 회귀

실 공급자 브라우저 계정이 없어 §8 이 허용한 대로 **route-level 테스트 + 코드 경로 정적 추적**으로 대체했다 (계정 생성·비밀번호 변경 없음).
소유 공급자 경로(`ACTIVE` + 자기 offer)의 가드 판정은 이번 변경으로 **바뀌지 않았고**,
`syncMasterTags` 변경은 array/null tags master 에서 기존과 동일하게 동작한다.
**한계**: 실제 브라우저에서의 공급자 AI tag 생성→저장→재조회 UI 동선은 이번에 관측하지 못했다.

---

## 5. §9 운영 DB read-only 감사

| 항목 | 값 |
|---|---:|
| `product_ai_tags` 행 수 | 0 |
| AI tags 보유 distinct product | 0 |
| source 별 분포 | (없음) |
| `product_masters` 총수 | 272,035 |
| `supplier_product_offers` 행 수 | 2 |
| offer 로 연결된 master | 2 |
| 공급자 연결 없는 master 의 AI tags | 0 |
| orphan tag product | 0 |

현재 운영 노출은 사실상 0이다. 과거 데이터의 정오 판단 근거가 없으므로 **추측하지 않았고, tags 대량 삭제·복원도 하지 않았다.**

---

## 6. §11 postVerify (read-only, drift 0)

| 항목 | 기준선 | 현재 | 판정 |
|---|---:|---:|---|
| ProductMaster 총수 | 272,035 | 272,035 | drift 0 |
| regulatory_type 7종 분포 | 동일 | 동일 | drift 0 |
| canonical STORE 설명서 | 232,860 | 232,860 | drift 0 |
| `supplier_product_offers` | 2 | 2 | drift 0 |
| `product_ai_tags` | 0 | 0 | drift 0 |
| 메타 object tags master | 32,674 | 32,674 | drift 0 |

산출물: `tmp/product-ai-tags-ownership/{audit,postverify}.json`.
DB write smoke 를 수행하지 않았으므로 원복할 테스트 변경도 없다.

---

## 7. §10 중지 조건 — 해당 없음

offer 기반 소유 판정 가능 / write 가 다른 필수 소비처와 강결합되지 않음 / 정상 공급자 기능 유지 / 관리자·supplier 구분 가능 / 다른 세션 WIP 충돌 없음.

---

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
— 선행 CHECK 의 finding #2 서술 정정은 본 문서 §0 에 기록했다. 선행 CHECK 본문은 기록물이므로 수정하지 않았다.
