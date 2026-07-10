# CHECK-O4O-PRODUCT-DESCRIPTION-TYPE-MULTILINGUAL-CAPABILITY-V1

> **요구조건 검증 + 해결.** 모든 상품이 **B2B·B2C·매장용(STORE) 설명서**를 각각, 그리고 **각 설명서가 다국어**로 저장될 수 있어야 한다.
> **날짜**: 2026-07-11 · **성격**: 조사 + 최소 API 수정(스키마·migration·서비스 변경 0)

---

## 0. 결론

**스키마·서비스는 이미 충족. 유일한 미흡 = API 컨트롤러가 STORE 하드코딩.** 컨트롤러를 type-generic화하여 해결.

| 계층 | 요구 충족 | 근거 |
|------|:--------:|------|
| **스키마** (`shared_product_descriptions`) | ✅ | `description_type` varchar(32) union **{B2B, B2C, STORE, SUPPLIER_STORE}**(default STORE) + `language` varchar(16) + **canonical partial unique = (master_id, description_type, COALESCE(language,'ko'))** ([SharedProductDescription.entity.ts:79,124,136](../../apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts#L79) · migration `20261228000000-CanonicalPerMasterTypeLanguage`) |
| **서비스** | ✅ | `createCandidate({descriptionType, language, ...})` 파라미터 수용·기본 STORE/ko. `setCanonical`이 **같은 (master, type, language)만 강등**(다른 타입/언어 canonical 무영향) — [shared-product-description.service.ts:238-248](../../apps/api-server/src/modules/neture/services/shared-product-description.service.ts#L238) |
| **API 컨트롤러** | ⚠️→✅ | `product-master-description.controller.ts` 가 GET·POST 모두 **`descriptionType='STORE'` 하드코딩** → B2B/B2C 쓰기·조회 불가였음. **본 변경으로 해소.** |
| 프런트(관리자 패널) | ⚠️(범위 외) | STORE 패널만 존재. B2B/B2C 저작 UI는 후속 WO. (API로는 가능) |

→ **결론: 상품 하나에 B2B×{ko,zh,en,ja} + B2C×{…} + STORE×{…} canonical 이 모두 공존 가능**(모델·서비스 보장). API만 열면 됨.

---

## 1. 수정 내용 (WO-O4O-ADMIN-PRODUCT-DESCRIPTION-TYPE-GENERIC-API-V1)

[product-master-description.controller.ts](../../apps/api-server/src/modules/neture/controllers/product-master-description.controller.ts) — **additive, 하위호환**:

- `ALLOWED_TYPE = {STORE, B2B, B2C, SUPPLIER_STORE}` + `normalizeType()`(허용값만, 그 외 STORE).
- **POST** `/:id/store-descriptions`: body `descriptionType` 수용(기본 STORE) → `createCandidate` 에 전달.
- **GET** `/:id/store-descriptions?descriptionType=STORE|B2B|B2C|SUPPLIER_STORE|all`: 타입 필터(기본 STORE=기존 동작), 응답 item에 `descriptionType` 포함.
- 경로명은 legacy(`store-descriptions`) 유지 → **기존 프런트 STORE 패널 무회귀**(type 미지정=STORE).
- 스키마/migration/서비스 **변경 0**.

**canonical 공존 보장**: `setCanonical`이 (master, type, language) 스코프로만 강등하므로, B2B-ko 저장이 STORE-ko·B2B-zh 를 건드리지 않음.

## 2. 검증

- [x] api-server 배포 빌드 타입체크(`tsc -p tsconfig.build.json --noEmit`) EXIT 0.
- [ ] **배포 후 스모크**(예정): 한 master에 STORE ko/zh + B2B ko/zh + B2C ko/zh 저장 → `GET ?descriptionType=all` 로 6건 canonical 공존 확인. 기존 STORE 패널 무회귀 확인.

## 3. 후속 (범위 외)

- 매장용 설명서를 B2B/B2C로 **복사**하는 배치(현 STORE canonical → B2B·B2C 동일 내용 upsert, 다국어 포함) — 해외 다국어 서비스 대비.
- 관리자 **B2B/B2C 저작 패널**(프런트) — 별도 WO. 현재는 API로만.
- 기존 배치 제품의 STORE 갭 채우기(징코 zh, 흑염소·콸콸포맨 ko+zh) → [health-functional-food/PROCESSED-LEDGER](../guides/products/health-functional-food/PROCESSED-LEDGER.md).

---

*조사 + 최소 API 수정. 스키마·migration·서비스·프런트 변경 0. 배포 후 B2B/B2C×다국어 저장 가능.*
