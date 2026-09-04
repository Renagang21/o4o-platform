# CHECK-O4O-PRODUCTMASTER-MATCHING-RECALL-CLOSURE-FOR-CAFE24-V1

> **WO**: WO-O4O-PRODUCTMASTER-MATCHING-RECALL-CLOSURE-FOR-CAFE24-V1
> **선행 CHECK**: [CHECK-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1](CHECK-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1.md)
> **실행일**: 2026-09-04 · **대상**: `BulkMatchService` candidate retrieval
> **판정**: **PASS** — `EXPECTED_MASTER_IN_POOL 18/30 → 30/30`, 자동확정 precision 1.000 유지, **DB schema 변경 없음**

---

## 0. 요약

| 항목 | 수정 전 | 수정 후 |
|---|---:|---:|
| `EXPECTED_MASTER_IN_POOL` (최우선 KPI) | **18/30** | **30/30** |
| `EXACT_MATCH` | 17 | 23 |
| `SIMILAR_MATCH` | 2 | 7 |
| `NOT_FOUND` | 11 | **0** |
| 자동확정 건수 / 정답 / 오확정 | 17 / 17 / 0 | 23 / 23 / **0** |
| 자동확정 precision | 1.000 | **1.000** |
| 30건 batch 소요 | 17,746 ms | **5,512 ms** |
| `product_masters` 생성 컬럼 · index 추가 | — | **불필요** |

동일 입력 30건(Cafe24 Controlled Pilot 표본)을 **수정된 실코드에 그대로 통과**시켜 측정했다.
DB write 0 (read-only SELECT 만). Cafe24 API 호출 0.

---

## 1. 대상 확정 — scorer 가 아니라 retrieval

선행 Pilot 에서 정답 ProductMaster 를 직접 대조했을 때 30건 전부 정규화 유사도 ≥ 0.706 이었고,
미적중분도 전부 "정답이 후보풀에 아예 들어오지 않은" 경우였다. 따라서 이번 작업의 대상은
**candidate retrieval recall** 이며, 유사도 임계·랭킹 함수는 건드리지 않았다.

### 1-1. 선행 CHECK 수치 정정

선행 CHECK 의 판정 분포에 집계 오류가 있어 같은 커밋에서 정정했다 (산출물 `controlled-pilot-report.json` 재집계가 정본).

| 항목 | 오기 | 정정 |
|---|---:|---:|
| `SIMILAR` | 3 | **2** |
| `NOT_FOUND` | 6 | **7** |
| 사다리 정답 | 23/30 | **22/30** |
| 미적중 | 7건 | **8건** |

정정 후에도 "미적중은 키 변별력 문제가 아니라 후보검색 실패" 라는 결론은 그대로다.

---

## 2. 실측 환경 (read-only)

| 항목 | 실측 |
|---|---|
| `product_masters` | **272,039** 행 — 전부 `status='ACTIVE'` (상태 필터는 이번 recall 손실의 원인이 아님) |
| 정규화 이름 키 (distinct) | 139,619 · 그중 길이 ≥ 6 = 129,070 |
| `product_aliases` | **0 행** — alias 축은 현재 실효가 없다 |
| `product_identifiers` (active) | **621,280** — MFDS_CODE 194,561 / KOREA_DRUG_CODE 177,413 / ATC_CODE 176,962 / KOREA_INSURANCE_CODE 64,692 / GTIN 3,826 / UDI_DI 3,826 |
| `pg_trgm` | **미설치** (유사도 index 전략은 현재 선택지가 아니다) |

---

## 3. 미적중 원인 전수 분류 (WO §2 · §7)

수정 전 `BulkMatchService` 로 30건을 돌린 결과를 원인별로 분류했다.

| 원인 | 건수 | 설명 |
|---|---:|---|
| **정규화 비대칭** (0건 회수) | **11** | `normalizeName(q)` 로 만든 needle 을 **정규화되지 않은** `product_masters.name` 컬럼에 ILIKE 로 넣는다. 공백·괄호·기호가 한쪽에서만 제거되므로 구조적으로 절대 매칭되지 않는다 |
| **LIMIT 6 컷오프** | **1** | `인텐시브 크림` 은 19건이 회수되지만 `ORDER BY name ASC LIMIT 6` 밖으로 정답이 밀린다 |
| 회수 성공 | 18 | |

원인이 된 코드 (수정 전):

```sql
SELECT ... FROM product_masters
 WHERE name ILIKE $1           -- $1 = '%' || normalizeName(q) || '%'  ← 비대칭
 ORDER BY name ASC LIMIT 6     -- ← 컷오프
```

부수적으로 확인된 recall 손실 요인:

| 요인 | 판정 |
|---|---|
| **식별자 축 부재** | `BulkMatchService` 는 `product_identifiers` 를 전혀 조회하지 않았다. Pilot 에서 식별자 축은 6/6 = 100% precision 이고 index 도 있다 (`idx_product_identifiers_normalized_value`) |
| **alias 축 무효** | 검색 조건이 index 없는 `pa.alias` 를 본다. index 는 `normalized_alias` 에 있고 저장도 정규화 값 기준이다. (현재 alias 0행이라 실측 효과는 0이지만 계약 결함) |
| **부분 포함 미지원** | Cafe24 쪽 이름이 `50ml` · `(본품)` · `[브랜드]` 처럼 토큰을 더 갖는 실제 패턴에서, 포함 방향이 master ⊂ 입력이다. 이 방향을 보는 질의가 없었다 |
| 상태 필터 | **원인 아님** — 272,039 전부 ACTIVE |
| category / regulatory 필터 | **원인 아님** — 이 경로에서 적용되지 않는다 |

### 3-1. 전략별 회수율 (전체 272,039행 로컬 대조)

| 전략 | 0건 회수 | 정답 도달 | 단일&정답 |
|---|---:|---:|---:|
| A 현행 `BulkMatchService` (정규화 needle → raw ILIKE, LIMIT 6) | 11 | 19 (LIMIT 6 통과 **18**) | 16 |
| B 현행 library search (raw ILIKE) | 9 | 21 | 18 |
| C 정규화 완전일치 | 5 | 25 | 22 |
| D = C + 정규화 포함 (master ⊂ 입력, 길이 ≥ 6) | **0** | **30** | 19 |

C 만으로는 25/30 이고, **포함 축까지 넣어야 30/30** 이 된다.

---

## 4. 수정 내용 (WO §3 — schema 변경 없음)

### 4-1. `bulk-match.service.ts` — 사다리로 재작성

| 단계 | 축 | 확정 정책 |
|---|---|---|
| 1 | `product_identifiers` 완전일치 (batch `= ANY($1)`, index 사용) | 후보 **단일일 때만** `EXACT_MATCH` |
| 2 | 정규화 상품명 완전일치 | 단일 → `EXACT_MATCH` / 복수(동명이인) → `SIMILAR_MATCH` + 후보 전체 |
| 3 | 포함(master 정규화명 ⊂ 입력, 길이 ≥ 6) + Dice ≥ 0.70 | `SIMILAR_MATCH` (자동확정 안 함) |
| 4 | 없음 | `NOT_FOUND` |

- `normalizeKey()` 신설 — 영숫자·한글만 남기는 **비교 전용** 키. 검색어와 대상에 **동일하게** 적용한다.
  기존 `normalizeName()` 은 alias 저장 계약이 걸려 있어 그대로 둔다.
- 이름 축은 batch 당 `product_masters` 를 **1회 선적재**해 메모리 정규화 index 를 만든다.
  기존 패턴 재사용 (`drug-import/drug-master-promotion-apply.db.ts` 의 `preloadCatalog`).
  이름마다 seq scan 을 반복하던 구조가 사라져 30건 기준 **17.7s → 5.5s**.
  상주 캐시는 두지 않는다 (Cloud Run 인스턴스 메모리 상시 점유 회피).
- **동명이인 후보 상한 20** — `홍삼농축액 15` 는 동명 master 가 13건이고 정답이 13번째다.
  5로 자르면 정답이 목록에서 빠진다 (첫 재검증에서 29/30 으로 관측 → 상한 조정 후 30/30).
- 공개 계약 유지: `MatchStatus` / `MasterCandidate` / `MatchResult` / `matchNames()` / `normalizeName()` 그대로.
  추가는 additive (`matchedBy`, `topScore`, `matchItems()`).
- 포함 축 히트는 `EXACT_MATCH` 로 올리지 않는다 → 기존 소비처가 보수적으로 유지된다.

### 4-2. `product-library.controller.ts` — 자체상품코드 additive 입력

`POST /products/bulk-match` 이 `{ items: [{ name, code }] }` 와 XLSX `custom_product_code` 열을 받는다.
기존 `{ names: string[] }` 경로·응답 `summary` 는 불변. code 미전달 시 동작은 종전과 같다.

### 4-3. `catalog.service.ts` — alias 조건 정정

`pa.alias ILIKE` 만 보던 조건에 index 가 있는 `pa.normalized_alias` 를 추가했다 (검색어도 정규화해 대조).
현재 alias 0행이라 측정 가능한 효과는 없으나, alias 적재가 시작되면 index 를 타지 못하고
정규화 차이를 놓치는 결함이었다.

---

## 5. 재검증 — 동일 30건 (WO §4)

수정된 실코드를 임시 러너로 직접 호출했다 (프로덕션 DB read-only, cloud-sql-proxy 경유).

```
status:    { EXACT_MATCH: 23, SIMILAR_MATCH: 7, NOT_FOUND: 0 }
matchedBy: { identifier_exact: 6, normalized_exact: 19, containment: 5, none: 0 }
EXPECTED_MASTER_IN_POOL: 30/30
자동확정(EXACT) 23건 / 정답 23 / 오확정 0 / precision 1.000
```

### 5-1. 미적중 8건의 해소 경로

| 군 | Cafe24 상품명 | 수정 전 | 수정 후 |
|---|---|---|---|
| C | 지엠팜임산부리포퍼액상철분제 | NOT_FOUND | `EXACT` / normalized_exact |
| C | [피부생생] 어린콜라겐 비오틴 | NOT_FOUND | `EXACT` / normalized_exact |
| C | 제나 데일리 발효 칼슘365 | NOT_FOUND | `EXACT` / normalized_exact |
| D | 아크네트러블스팟패치 | NOT_FOUND | `EXACT` / normalized_exact |
| D | 김 PDRN 하이드로 퍼밍 크림 50ml | NOT_FOUND | `SIMILAR` / containment (정답 1순위) |
| D | [비오템옴므] 포스 수프림 토너 | NOT_FOUND | `SIMILAR` / containment (정답 1순위) |
| D | 닥터트리엔 페이셜 버블 폼 클렌저 (본품) | NOT_FOUND | `SIMILAR` / containment (정답 1순위) |
| G | 인텐시브 크림 | AMBIGUOUS | `SIMILAR` / normalized_exact (동명 2건 제시) |

### 5-2. precision 을 희생하지 않았다 (WO §4 단서)

- 자동확정(`EXACT_MATCH`) 23건 전부 정답. **오확정 0**.
- 동명이인 2건(`홍삼농축액 15` 13건 · `인텐시브 크림` 2건)은 **자동확정하지 않고** 후보만 제시했다.
- 포함 축 5건도 전부 `SIMILAR_MATCH` 로 남겨 사람 확인 대상이다.
- recall 만 올린 것이 아니라, 회수된 후보 중 확정 기준은 오히려 더 좁아졌다
  (수정 전에는 "top-6 안에서 정규화 이름 동일한 후보가 1건" 이면 확정 — 회수 자체가 부실해 우연히 안전했다).

### 5-3. 단위 테스트

`apps/api-server/src/__tests__/productmaster-matching-recall-closure.spec.ts` — 11 tests **PASS**.
사다리 4단계 · `normalizeKey` 대칭성 · 동명이인 비확정 · `matchNames` 기존 계약 유지를 DB 없이 고정한다.

### 5-4. 타입 검사

`tsc --noEmit -p apps/api-server/tsconfig.json` — **오류 0**.

---

## 6. schema · index 필요 여부 (WO §3 · §7)

**필요 없다.** 30/30 은 생성 컬럼·index 없이 달성했다.

| 후보 | 판정 |
|---|---|
| `product_masters` 정규화명 생성 컬럼 + index | **불필요** — batch 당 1회 선적재로 대체. 오히려 현행보다 3배 빠르다 |
| `pg_trgm` + GIN | **불필요** — 미설치이며, 포함 축이 같은 회수를 index 없이 해결 |
| 신규 테이블 | 없음 |

단, 이 결론은 **카탈로그 272,039행 · batch ≤ 200** 이라는 현재 규모에 붙는다.
카탈로그가 이 규모를 크게 넘거나 bulk-match 호출 빈도가 상시화되면 선적재 비용이 지배적이 되므로
그 시점에 정규화 index 를 다시 검토한다 (지금 만들면 근거 없는 schema 부채다).

---

## 7. 다음 단계 판단 — 실제 도매몰 Census 준비 (WO §7)

**준비됐다.** Census 에서 회수 실패가 나오면 이제 Cafe24 데이터 품질 문제로 읽어도 된다.
recall 쪽 알려진 구조적 결함(정규화 비대칭 · LIMIT 컷오프 · 식별자 축 부재 · 포함 축 부재)이 닫혔기 때문이다.

Census 시 유지할 고정 매칭 우선순위 (WO §5):

1. `custom_product_code` → `ProductIdentifier` 완전일치
2. 정규화 상품명 유일 완전일치
3. 상품명 완전일치
4. 상품명 + 사용 가능한 보조 필드
5. 유사 후보 (사람 확인)

Cafe24 `manufacturer_code` / `brand_code` 는 기본값(`M0000000` / `B0000000`)이 그대로 오므로
제조사·브랜드 의미로 해석하지 않는다.

미해결로 남기는 축 (WO §6 제외 범위, 별도 판단 필요):

- `custom_variant_code` / `gtin` 왕복 — 1차 업로드 양식에 열이 없어 전량 공란. variant 축 계약은 아직 없다.
- alias 적재 경로 — 현재 0행. 매칭 UX 에서 사람이 확정한 결과를 alias 로 적립하면 2회차부터 recall 이 더 오른다 (이번 범위 밖).

---

## 8. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/services/bulk-match.service.ts` | 사다리 재작성 · `normalizeKey`/`diceSimilarity`/`matchItems` 추가 (공개 계약 유지) |
| `apps/api-server/src/modules/neture/controllers/product-library.controller.ts` | `bulk-match` 에 `items`/`custom_product_code` additive 입력 |
| `apps/api-server/src/modules/neture/services/catalog.service.ts` | alias 검색에 `normalized_alias` 조건 추가 |
| `apps/api-server/src/__tests__/productmaster-matching-recall-closure.spec.ts` | 신규 (11 tests) |
| `docs/checks/CHECK-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1.md` | 판정 분포 수치 정정 |

DB migration 0 · schema 변경 0 · 신규 테이블 0 · 신규 route 0.
