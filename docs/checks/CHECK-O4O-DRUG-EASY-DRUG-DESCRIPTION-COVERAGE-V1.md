# CHECK-O4O-DRUG-EASY-DRUG-DESCRIPTION-COVERAGE-V1

Status: DONE — read-only 실측 완료 (2026-07-06)
Scope: 현재 e약은요 원천으로 `SharedProductDescription`을 **추가로 몇 건** 파생할 수 있는지 실측. write 0. ProductDrugExtension 임상 텍스트 미채움. 처방약 설명/노출 보류. 일반의약품 중심 coverage.

Related:

- `docs/checks/CHECK-O4O-PRODUCT-DB-STRUCTURE-REFINEMENT-CHECK-A-V1.md` (§2.12 설명 11%)
- `apps/api-server/src/modules/neture/drug-import/easy-drug-shared-description-derive.service.ts`

---

## 1. 결론 (한 줄)

**e약은요 파생은 이미 100% 소진됐다. 현재 원천으로 추가 생성 가능 = 0건.** 11% 커버리지는 미완이 아니라 **원천 한계**다. 확대하려면 e약은요가 아닌 **다른 설명 원천**이 필요하다.

---

## 2. 실측 (2026-07-06 · read-only)

### 2.1 e약은요 원천

| 항목 | 값 |
| --- | --- |
| e약은요 candidate 총량 (`external_api`/`MFDS_CODE`/`sourceKind=easy_drug_info`) | **4,757** |
| officialConsumerText 보유 | 4,757 (100%) |
| content(효능/용법/주의 등 1개 이상) 보유 | 4,757 (100%) |

### 2.2 커버리지 (master 단위, drug_category × already/additional)

| drug_category | matchable master | 이미 설명 보유 | **추가 파생 가능** |
| --- | ---: | ---: | ---: |
| otc | 19,385 | 19,385 | **0** |
| rx | 42 | 42 | **0** |
| drug_unspecified | 4 | 4 | **0** |
| **합계** | **19,431** | **19,431** | **0** |

→ e약은요가 매칭하는 모든 master(19,431)에 이미 `SharedProductDescription(source_type='mfds_easy_drug')`이 존재. **추가 0.** (CHECK-A §2.12의 19,431과 정확히 일치.)

→ e약은요 매칭의 **99.8%가 OTC** — e약은요 = 사실상 일반의약품 소비자 정보. 정책(일반의약품 중심)과 정합.

### 2.3 원천 품질 (4,757건 중 필드 보유율)

| 필드 | 보유 | 비율 |
| --- | ---: | ---: |
| efficacy(효능) | 4,748 | 99.8% |
| usage(용법) | 4,752 | 99.9% |
| caution(주의) | 4,746 | 99.8% |
| storage(보관) | 4,744 | 99.7% |
| warning(경고) | 1,122 | 23.6% |

→ 핵심 필드(효능/용법/주의/보관) 품질 우수. warning은 다수 null(약물 특성상 정상).

---

## 3. 커버리지 갭 (전체 DRUG 대비)

| 구분 | 총수 | e약은요 커버 | 미커버 |
| --- | ---: | ---: | ---: |
| OTC | 57,572 | 19,385 (34%) | **38,187 (66%)** |
| Rx | 119,548 | 42 | 119,506 (보류 정책 대상) |
| unspecified | 293 | 4 | 289 |
| **전체** | 177,413 | 19,431 (11%) | 157,982 |

→ **일반의약품(OTC)조차 e약은요로는 34%만 커버.** 나머지 OTC 66%는 e약은요 원천 자체에 없다.

---

## 4. 판단 / 다음

1. **e약은요 추가 파생 apply는 불필요(대상 0).** 이 트랙은 소진됨.
2. 설명 확대의 병목은 파생 로직이 아니라 **원천**이다. 확대 경로 후보:
   - (a) **e약은요 API 추가 수집** — 현재 4,757건만 적재. 원천에 더 있는지(품목 커버리지) 별도 fetch 조사 필요.
   - (b) **다른 MFDS 원천** — 의약품 제품/허가 상세 등(허가정보 기반)으로 OTC 미커버 38,187 보완.
   - (c) **AI 보조 생성** — 원천 텍스트를 기반으로 매장 설명 초안(단, 규제·검수 전제).
3. 방향 유지: 설명 SSOT = `SharedProductDescription`(status='needs_review'), Extension 임상 텍스트 미채움, 처방약 보류.
4. **매장 설명서 1차 후보 = 이미 파생된 OTC 19,385건**(needs_review). 이건 지금 바로 매장 설명서 단계 입력으로 쓸 수 있다.

---

## 5. write 준수

| 항목 | 결과 |
| --- | --- |
| DB write / migration | **0** (전부 SELECT) |
| SharedProductDescription 생성 | 0 |
