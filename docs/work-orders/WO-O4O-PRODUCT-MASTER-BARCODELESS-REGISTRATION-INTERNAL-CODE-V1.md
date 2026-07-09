# WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1

> **한 줄 요약**: ProductMaster(공식 상품) 등록에서 **바코드가 없으면 등록이 막히는** 결함을 수정한다. O4O는 이미 **자체 내부 코드 생성 규칙**(`generateInternalBarcode`, GS1 200 내부 예약 대역 EAN-13)을 가지고 있고 **공급자 등록 경로는 이미 이를 사용**한다. 그러나 admin/이미지 기반 등록 경로(`resolveOrCreateMaster`)는 바코드를 **필수 + GTIN 유효성**으로 요구하여, 자체 코드로 등록되어야 할 상품을 막는다. 이 **경로 간 불일치**를 해소한다.

- **상태**: 착수 대기 (조사 완료 · read-only, 코드 변경 0)
- **작성일**: 2026-07-09
- **성격**: 백엔드 등록 파이프라인 결함 수정 (스키마 변경 없음)
- **연관**: F12 Product Resource Architecture / [IR-O4O-PRODUCT-IMAGE-TO-DESCRIPTION-START-POINT-AUDIT-V1](../investigations/IR-O4O-PRODUCT-IMAGE-TO-DESCRIPTION-START-POINT-AUDIT-V1.md) §2
- **선행 근거 WO**: `WO-NETURE-PRODUCT-REGISTRATION-REFACTOR-AND-AI-TAGGING-V1`(내부 바코드 도입), `WO-O4O-PRODUCT-MASTER-CORE-RESET-V1`(GTIN 검증 도입)

---

## 0. 발견 경위 (왜 이 WO가 나왔나)

제품 사진(건강기능식품 "맨 파워 포텐") → 매장 설명서 작성 워크플로우 진행 중, 사용자가 **해당 제품을 O4O 공식 상품(ProductMaster)으로 등록**하기를 요청했다. 등록 경로를 조사한 결과 두 가지 문제가 드러났다.

1. **관리자 대시보드에 신규 ProductMaster 등록 UI가 없다.** "O4O 상품 DB" 하위 화면 전체가 read-only 스켈레톤(`WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1`)이며 mutation이 없다. → 이는 **별도 WO(등록 UI)** 영역.
2. **현재 유일하게 동작하는 ProductMaster 직접 생성 경로(admin API `masters/resolve`)가 바코드를 필수로 요구**하여, 바코드를 읽을 수 없거나 없는 상품은 등록 자체가 불가능하다. → **본 WO의 대상.**

사용자 지적(정확함): *"O4O 상품 DB 등록에 바코드가 반드시 필요한 것은 아니다. O4O 자체 기준 코드가 있고, 이는 제품 등록 시 내부적으로 만든다. 공급자가 neture.co.kr에서 신규 상품을 등록할 때 자체 코드 규칙에 따라 등록되는 것과 동일하게 되면 된다."*

조사 결과 이 지적대로 **자체 코드 규칙은 이미 구현되어 있고 공급자 경로에서 실제로 쓰이고 있다.** 문제는 그 규칙이 admin/이미지 등록 경로에 **적용되어 있지 않은 불일치**다.

---

## 1. 조사 (근거 — 코드 기준)

### 1-A. 자체 내부 코드 규칙은 이미 존재한다

[apps/api-server/src/utils/gtin.ts:71-87](../../apps/api-server/src/utils/gtin.ts#L71-L87) — `generateInternalBarcode(seed)`:

```
GS1 prefix 200 (매장/기업 내부용 예약 대역) 기반 유효 EAN-13 생성.
형식: 200 + hash(seed) 6자리 + timestamp 3자리 + check digit = 13자리
```

- 정상적인 **check digit을 계산**하므로 `validateGtin()`을 통과하는 유효 EAN-13이다.
- prefix `200`은 GS1이 **사내/매장 내부 용도로 예약한 대역**이라 실제 상용 바코드와 충돌하지 않는다.
- 즉 O4O에는 "바코드 없는 상품을 위한 자체 코드"가 이미 정의되어 있다.

### 1-B. 공급자 등록 경로는 이 규칙을 이미 사용한다 (정상)

[apps/api-server/src/modules/neture/services/offer.service.ts:816-820](../../apps/api-server/src/modules/neture/services/offer.service.ts#L816-L820) — `createSupplierOffer` → `validateCreateInput`:

```ts
let barcode = data.barcode?.trim() || '';
if (!barcode) {
  const { generateInternalBarcode } = await import('../../../utils/gtin.js');
  barcode = generateInternalBarcode(supplierId);   // ← 바코드 없으면 자체 코드 자동 생성
}
```

→ 공급자는 neture.co.kr에서 **바코드 없이도** 신규 상품을 등록할 수 있다. (사용자가 말한 그 규칙)

### 1-C. admin / 이미지 기반 등록 경로는 이 규칙을 쓰지 않는다 (결함)

[apps/api-server/src/modules/neture/services/catalog.service.ts:101-174](../../apps/api-server/src/modules/neture/services/catalog.service.ts#L101-L174) — `resolveOrCreateMaster(barcode, manualData?)`:

- 시그니처가 `barcode`를 **필수 인자**로 받는다.
- 진입 즉시 `validateGtin(barcode)` → 실패 시 `INVALID_GTIN` 반환 (line 114-118).
- barcode가 없거나 유효 GTIN이 아니면 **Master 생성 자체가 불가**. 내부 코드 생성 fallback이 **없다.**

이 메서드를 호출하는 admin 엔드포인트:
[apps/api-server/src/modules/neture/controllers/admin.controller.ts:625-632](../../apps/api-server/src/modules/neture/controllers/admin.controller.ts#L625-L632) — `POST /api/v1/neture/admin/masters/resolve` → `resolveOrCreateMaster(barcode.trim(), manualData)`. 역시 barcode 필수.

### 1-D. DB 모델은 이미 내부 코드를 수용한다 (스키마 변경 불필요)

[apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts:37-39](../../apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts#L37-L39):

- `barcode: varchar(14)` **NOT NULL · UNIQUE · immutable** (F12: 물리제품 1 = barcode 1 = master 1).
- 공급자 경로가 이미 `generateInternalBarcode` 값을 이 컬럼에 저장하고 있으므로, **내부 코드가 barcode 슬롯을 채우는 것은 기존과 동일한 정상 동작**이다. F12 불변식은 유지된다(내부 코드도 master당 1개 유일 값).

### 1-E. 결론 — 문제의 정확한 위치

> **바코드가 canonical 키인 것은 맞지만, "실제 상용 바코드"일 필요는 없다.** 내부 코드도 유효한 barcode 슬롯 값이다.
> 결함은 **`resolveOrCreateMaster`(admin/이미지 경로)에 내부 코드 생성 fallback이 없어서**, 공급자 경로에서는 되는 "바코드 없는 등록"이 admin/이미지 경로에서는 막히는 **경로 간 불일치**다.

---

## 2. 문제 확정

**결함**: 바코드가 없는(또는 사진에서 판독 불가한) 공식 상품을 admin/이미지 기반 경로로 ProductMaster에 등록할 수 없다. 이는 O4O가 이미 보유한 자체 내부 코드 규칙(`generateInternalBarcode`)이 해당 경로에 연결되지 않았기 때문이다.

**영향**:
- 이미지 → 설명서 → 등록 워크플로우(IR-...-START-POINT-AUDIT-V1의 목표)가 "등록" 단계에서 막힌다.
- 바코드 없는 오프라인/수입/매장 유통 상품이 canonical 상품 DB에 올라가지 못한다.
- 공급자 경로와 admin 경로의 동작이 불일치(같은 플랫폼에서 규칙이 두 개).

---

## 3. 최소 수정 (구현 방향)

> **핵심**: `resolveOrCreateMaster`(및/또는 admin 등록 경로)가 **바코드 미제공 시 `generateInternalBarcode`로 자체 코드를 생성**하도록 하여, 공급자 경로와 규칙을 통일한다. **새 코드 규칙을 만들지 말고 기존 규칙을 재사용**한다.

### 3-A. 채택할 접근 (구현자 선택 — 권장: 옵션 B)

| 옵션 | 내용 | 트레이드오프 |
|------|------|------------|
| **A** | `resolveOrCreateMaster`의 `barcode`를 optional로 완화. 빈 값이면 내부에서 `generateInternalBarcode(seed)` 생성 후 진행 | 코드 최소. 단 core 메서드 시그니처 변경(공급자 경로는 이미 항상 값 전달 → 동작 무변경이나 회귀 검증 필요) |
| **B (권장)** | 신규 전용 메서드 `createMasterWithInternalCode(manualData)`(또는 `resolve` 컨트롤러에서 barcode 없을 때 분기) 추가. 내부에서 내부 코드 생성 → 기존 생성 로직 재사용 | `resolveOrCreateMaster` 원형 보존, 격리도 높음 |

### 3-B. 반드시 포함할 것

1. **내부 코드 생성 재사용**: `generateInternalBarcode()` 그대로 사용(신규 규칙 금지). seed는 공급자 경로가 `supplierId`를 쓰듯, admin/이미지 경로에서는 안정적 seed(예: `name + manufacturerName` 정규화 문자열, 또는 요청 단위 uuid)를 사용.

2. **중복 생성 방지 (필수)**: `generateInternalBarcode`는 호출마다 timestamp가 섞여 **매번 다른 코드**를 낸다. 따라서 같은 상품을 두 번 등록하면 **barcode로는 중복 판정이 안 되어 master가 2개** 생긴다. → **내부 코드 생성 전에** 이름/제조사 기반 매칭으로 기존 master를 먼저 조회해야 한다.
   - 재사용: `product-candidate.service.ts`의 `computeMatch`(식별자 → 정규화 식별자 → barcode → 이름 ILIKE) 또는 `NetureCatalogService`에 name+manufacturer 조회 헬퍼 추가.
   - 매칭되면 기존 master 반환, 없을 때만 내부 코드 생성 후 신규 생성.

3. **UNIQUE 충돌 재시도**: 내부 코드 생성이 (희박하지만) UNIQUE 위반을 일으킬 수 있으므로, 저장 실패 시 재생성 재시도(예: 최대 3회) 처리.

4. **규제 게이트 우회 금지 (필수)**: 내부 코드 도입은 **바코드 공백만 해결**한다. 규제 상품(건강기능식품·의약품·의료기기·의약외품 등 `category.isRegulated=true`)의 기존 게이트는 그대로 유지한다.
   - `resolveProductMetadata`의 `REGULATED_FIELDS_REQUIRED`(regulatoryType/regulatoryName), `assertRegulatedPermit`(허가번호) 검증을 내부 코드 경로에서도 **동일하게 적용**한다.
   - 즉 "바코드 없이 등록 가능"이 "규제 검증 없이 등록 가능"으로 번지지 않게 한다. (본 WO의 트리거였던 맨파워포텐도 건기식=규제 카테고리일 수 있으므로, 등록 시 규제 필드가 필요할 수 있음을 인지)

5. **immutable 유지**: barcode는 생성 후 immutable(`MASTER_IMMUTABLE_FIELDS`). 내부 코드도 사후 변경 불가로 둔다.

### 3-C. 하지 말 것

- 스키마 변경(barcode nullable화, 컬럼 추가) 금지 — DB 모델은 이미 충분(§1-D). F12 무변경.
- 새로운 코드 체계 신설 금지 — `generateInternalBarcode` 재사용.
- 원시 SQL INSERT로 우회 금지 — 정식 서비스/파이프라인 경유.
- 규제 검증 완화 금지(§3-B-4).

---

## 4. 검증 (Acceptance Criteria)

- [ ] **바코드 미제공 admin/이미지 등록** → 내부 코드(200 prefix EAN-13)를 가진 ProductMaster 생성 성공.
- [ ] **동일 상품 재등록**(같은 name+manufacturer, 바코드 없음) → **신규 master 생성 없이 기존 master 반환**(중복 0).
- [ ] **실제 바코드 제공 경로** → 기존 동작 그대로(회귀 없음).
- [ ] **공급자 등록 경로**(`createSupplierOffer`) → 기존 동작 그대로(회귀 없음).
- [ ] **규제 카테고리 상품** → 규제 필드/허가 게이트가 내부 코드 경로에서도 동일하게 작동(우회 없음).
- [ ] 스키마 변경 0 · barcode UNIQUE/immutable 유지.
- [ ] 내부 코드 UNIQUE 충돌 시 재시도로 복구.
- [ ] 단위 테스트: (1) 바코드 없음→내부코드 생성, (2) 재등록 dedup, (3) 규제 게이트 유지, (4) 실바코드 경로 무회귀.

---

## 5. 범위 밖 (별도 WO)

- **관리자 등록 UI 신설** — "O4O 상품 DB" read-only 스켈레톤에 실제 등록 화면 추가. (본 WO는 백엔드 등록 경로만 해결)
- **이미지/OCR → 제품 필드 구조화** — IR-...-START-POINT-AUDIT-V1 §6의 `WO-1`(OCR-TO-DESCRIPTION-WORKFLOW-START).
- **내부 코드 ↔ 실제 바코드 사후 정합** — 내부 코드로 등록한 master에 나중에 실제 바코드가 확인될 때의 병합/재연결 정책. barcode가 immutable이라 별도 설계 필요. (follow-up)
- **candidate 승격 게이트 일반화** — `evaluatePromotable`가 drug 소스 전용인 문제(IR §2). 본 WO는 `resolve`/admin 직접 생성 경로로 해결하므로 candidate 승격과는 독립.

---

## 6. 참고 파일 (구현 진입점)

| 역할 | 파일:라인 |
|------|-----------|
| 내부 코드 규칙 | [utils/gtin.ts:71](../../apps/api-server/src/utils/gtin.ts#L71) `generateInternalBarcode` |
| 공급자 경로(참조 구현) | [neture/services/offer.service.ts:816](../../apps/api-server/src/modules/neture/services/offer.service.ts#L816) |
| 수정 대상(core) | [neture/services/catalog.service.ts:101](../../apps/api-server/src/modules/neture/services/catalog.service.ts#L101) `resolveOrCreateMaster` |
| 수정 대상(엔드포인트) | [neture/controllers/admin.controller.ts:625](../../apps/api-server/src/modules/neture/controllers/admin.controller.ts#L625) `POST /masters/resolve` |
| 매칭/중복 방지 재사용 | `neture/services/product-candidate.service.ts` `computeMatch` |
| 규제 게이트 | [neture/services/offer.service.ts:842](../../apps/api-server/src/modules/neture/services/offer.service.ts#L842) `resolveProductMetadata`(REGULATED_FIELDS_REQUIRED / assertRegulatedPermit) |
| 엔티티(무변경 확인용) | [neture/entities/ProductMaster.entity.ts:37](../../apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts#L37) |

---

*조사 read-only. DB write 0 · migration 0 · 코드 변경 0. 구현은 본 WO 승인 후 별도 착수.*
