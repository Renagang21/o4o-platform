# CHECK-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1

> **WO**: [WO-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1](../work-orders/WO-O4O-CAFE24-PRODUCT-MATCHING-CONTROLLED-PILOT-V1.md)
> **선행 CHECK**: [CHECK-O4O-CAFE24-CONTROLLED-PILOT-RESUME-READINESS-V1](../investigations/CHECK-O4O-CAFE24-CONTROLLED-PILOT-RESUME-READINESS-V1.md)
> **실행일**: 2026-09-04 · **몰**: `sohae2100` · **scope**: `mall.read_product` 단독
> **판정**: **PASS** — 표본 30건 전량 생성, variants 조회 성립, 매칭축 우선순위 확정
>
> **정정 (2026-09-04, [CHECK-...-RECALL-CLOSURE-...](CHECK-O4O-PRODUCTMASTER-MATCHING-RECALL-CLOSURE-FOR-CAFE24-V1.md) 재집계)**
> 본 문서 §0 · §4-1 의 판정 분포 수치가 틀렸다. 산출물 `controlled-pilot-report.json` 재집계 결과가 정본이다.
> `SIMILAR` **3 → 2** · `NOT_FOUND` **6 → 7** · 사다리 정답 **23 → 22/30** · 미적중 **7 → 8건**.
> §4-2 표(미적중 상세)는 8건 중 7건만 싣고 있었다 (누락 1건 = G군 `홍삼농축액 15`, 동명이인 13건).
> 원인 분석·결론(후보검색 recall 실패이지 키 변별력 문제가 아님)은 재집계 후에도 그대로 성립한다.

---

## 0. 요약

| 항목 | 결과 |
|---|---|
| 표본 생성 | **30/30** (몰 전체 70 = 기존 40 + 표본 30, product_no 51~80) |
| `custom_product_code` 왕복 | 보낸 13 → **13 동일** (36자 UUID 포함 무손실) |
| `model_name` / `internal_product_name` 왕복 | 18 → 18 / 12 → 12 |
| `product_name` 왕복 | **30/30 동일** |
| variants 조회 (`mall.read_product` 단독) | **실패 0/30** — scope 확대 불필요 |
| 옵션 → 품목 수 | 기대 3/2/3 → **실제 3/2/3** (옵션 없는 27건은 전부 1품목) |
| `custom_variant_code` / `gtin` | **0/35 · 0/35** — 1차 업로드 양식에 해당 열이 없어 공란 (2차 필요) |
| 사다리 정답률 | 22/30 (정정) (미적중 8건은 전부 **후보검색 실패**, 키 변별력 문제 아님 — §4) |
| 최우선 매칭축 | ① `custom_product_code → product_identifiers` ② `normalized_name` (§5) |

DB write 0 (token refresh 로 인한 `cafe24_connections` 갱신은 예외). Cafe24 write API 0. 산출물은 전부 repo 밖 `C:/tmp/cafe24-pilot/`.

---

## 1. 생성 결과 (WO 확인항목 1)

v5 업로드로 표본 30건이 전량 등록됐다. 몰 상품 수 70 = 기존 무관 상품 40(2026-09-04 11:15 생성) + 표본 30.

| 군 | 설계 의도 | 건수 | 몰에서 되찾은 경로 |
|---|---|---:|---|
| A | 자체상품코드 = MFDS 코드 (`product_identifiers` 실재) | 5 | `custom_product_code` 5 |
| B | 상품명 정확히 동일 · 코드 없음 | 5 | `product_name` 5 |
| C | 상품명 경미 변형(띄어쓰기·괄호·용량 표기) | 5 | `product_name` 5 |
| D | 상품명 중간 변형(브랜드 접두사·본품 표기 등) | 5 | `product_name` 5 |
| E | 자체상품코드 = O4O ProductMaster UUID(36자) | 4 | `custom_product_code` 4 |
| F | 옵션 상품(variants 2건 이상) | 3 | `custom_product_code` 3 |
| G | 동명이인(ProductMaster 이름 중복군) | 3 | `custom_product_code` 1 · `product_name` 2 |

## 2. 왕복 보존 (WO 확인항목 2·5·6)

| 필드 | 보낸 값 | 되읽은 값 | 판정 |
|---|---:|---:|---|
| `custom_product_code` | 13 | **13 동일** | **보존** — 36자 UUID(E군 4건)도 길이 36 그대로 |
| `product_name` | 30 | **30 동일** | **보존** — 대괄호·괄호·공백 포함 원문 유지 |
| `model_name` (제조사명 운반) | 18 | **18 동일** | **보존** |
| `internal_product_name` (브랜드명 운반) | 12 | **12 동일** | **보존** |
| `manufacturer_code` | (미입력) | 전부 `M0000000` | 양식 미입력 시 기본 코드. **제조사명은 코드 마스터라 이름으로 실을 수 없다** |
| `brand_code` | (미입력) | 전부 `B0000000` | 동일 |

**결론**: Cafe24 는 `custom_product_code` · `product_name` · `model_name` · `internal_product_name` 을 **가공 없이 그대로 되돌려준다.** 제조사/브랜드만 코드 마스터라 이름 축으로 못 쓴다. 이 4개가 매칭에 쓸 수 있는 텍스트 축이다.

## 3. variants (WO 확인항목 3·4)

- `GET /api/v2/admin/products/{no}/variants` 를 **`mall.read_product` 단독으로 30/30 성공.** scope 확대 불필요 (WO §5 중지조건 해당 없음).
- 품목 수 분포: `{1: 27, 3: 2, 2: 1}` — 합계 35.
- 옵션 문법 → 품목 수: `용량{50ml|100ml|200ml}` → **3**, `용량{30ml|50ml}` → **2**, `수량{30정|60정|90정}` → **3**. 전부 의도대로.
- 옵션 없는 27건도 **예외 없이 1품목** 생성 (`{product_code}000A`).
- `custom_variant_code`: **35건 전부 빈 문자열**. `gtin`: **35건 전부 null**.
  1차 업로드 양식(90열)에 두 열이 존재하지 않기 때문이며, 예상된 결과다.
- 샘플: `{"variant_code":"P00000BZ000A","custom_variant_code":"","gtin":null,"options":null}`

**따라서 variant 축은 "구조적으로 안정하지만 아직 값이 없다"** — 후속 식별축으로 쓰려면 2차 입력(관리자 재고 엑셀 자체품목코드)이 선행돼야 한다.

## 4. 매칭 사다리 (WO 확인항목 7·8)

### 4-1. 판정 분포

| 판정 | 건수 | 정답 | precision |
|---|---:|---:|---|
| `EXACT(identifier)` | 6 | 6 | **100%** |
| `EXACT(name)` | 14 | 14 | **100%** |
| `SIMILAR` (dice ≥ 0.7) | 2 | 2 | **100%** |
| `AMBIGUOUS(name)` | 1 | 0 | 0% |
| `NOT_FOUND` | 7 | — | — |
| 합계 | 30 | 22 | |

`identifier_exact` 히트 6건은 **전부 기대 ProductMaster 적중** (A군 5 + G군 1).

### 4-2. 미적중 8건은 "매칭키 실패"가 아니다

정답 ProductMaster 를 직접 읽어 Cafe24 상품명과의 거리를 따로 측정했다.

| 군 | Cafe24 상품명 | 정답 master.name | 정규화 유사도 | 후보풀 포함 |
|---|---|---|---:|---|
| C | 지엠팜임산부리포퍼액상철분제 | 지엠팜 임산부 리포퍼 액상 철분제 | **1.000** | ✗ |
| C | [피부생생] 어린콜라겐 비오틴 | 피부생생 어린콜라겐 비오틴 | **1.000** | ✗ |
| C | 제나 데일리 발효 칼슘365 | 제나 데일리 발효 칼슘 365 | **1.000** | ✗ |
| D | 아크네트러블스팟패치 | 아크네 트러블 스팟패치 | **1.000** | ✗ |
| D | 김 PDRN 하이드로 퍼밍 크림 50ml | 김 PDRN 하이드로 퍼밍 크림 | 0.857 | ✗ |
| D | 닥터트리엔 페이셜 버블 폼 클렌저 (본품) | 닥터트리엔 페이셜 버블 폼 클렌저 | 0.929 | ✗ |
| D | [비오템옴므] 포스 수프림 토너 | 포스 수프림 토너 | 0.706 | ✗ |

**7건 전부 유사도 0.706~1.000.** 즉 키의 변별력은 충분했고, 실패한 것은 **후보 생성(recall)** 이다.
ILIKE 접두사·토큰 검색이 (a) 공백 없는 이름, (b) 대괄호 접두사, (c) `LIMIT 300` 상한에서 정답을 놓쳤다.
정답 master 가 후보풀에 들어온 건은 17/30 에 불과했다.

전체 30건 기준 Cafe24 상품명 ↔ 정답 master.name 정규화 유사도 분포: `1.00` **25건**, `0.85~0.99` 4건, `0.70~0.84` 1건 — **0.7 미만 0건**.

### 4-3. 군별 정답 유사도 (변형 강도 확인)

| 군 | n | min | avg | 1.000 |
|---|---:|---:|---:|---:|
| A · B · E · F · G | 20 | 1.000 | 1.000 | 20 |
| C (경미 변형) | 5 | 0.870 | 0.962 | 3 |
| D (중간 변형) | 5 | 0.706 | 0.898 | 2 |

## 5. 매칭축 실측 비교 → 권장 계약 (WO 확인항목 9)

후보 생성 방식을 바꿔 `normalized_name`(공백·괄호·구두점 제거 후 완전일치) 축을 DB 에서 직접 측정했다.

| 축 | UNIQUE(단일 후보) | AMBIGUOUS | 미발견 | precision |
|---|---:|---:|---:|---|
| `custom_product_code` → `product_identifiers` | **6** | 0 | — | **100%** (보낸 13 중 실재 6) |
| `product_name` 원문 완전일치 | 19 | 2 | 9 | 100% (UNIQUE 기준) |
| **`normalized_name` 완전일치** | **22** | 3 | 5 | **100%** (UNIQUE 기준) |
| `name_similar` (dice ≥ 0.7) | — | — | 0 | 30/30 이 임계 이상 (후보만 들어오면) |

`normalized_name` 군별 UNIQUE: A5 B5 C3 D2 E4 F3 (G 3건은 전부 다중 후보 — 2 / 13 / 2).

### 권장 계약 (Cafe24 → O4O ProductMaster)

```text
1순위  custom_product_code  →  product_identifiers.identifier_value / normalized_value
       · precision 100% · 단일 후보 · 값이 있으면 무조건 신뢰
       · 단, 값 존재 여부는 몰 운영자에 달림 (이번 표본 13/30 만 값 보유)

2순위  normalized_name (공백·괄호·구두점 제거, lower)  →  product_masters
       · UNIQUE 22/30 · precision 100%
       · 다중 후보(동명이인)면 자동확정 금지 → 후보추천으로 넘긴다

보조   name_similar (dice ≥ 0.7)
       · 후보풀에만 들어오면 30/30 이 임계 이상
       · 단독 자동확정 금지. 2순위가 0건일 때 후보 제시용

미사용 manufacturer_code / brand_code  — 코드 마스터라 이름 매칭 불가
보류   custom_variant_code / gtin      — 구조는 있으나 이번 1차에서 값 0 (2차 입력 후 재측정)
```

**설계 함의**: 매칭 엔진의 병목은 **비교 알고리즘이 아니라 후보 생성**이다.
`product_masters` 에 **정규화 이름 인덱스**(생성 컬럼 + index)가 없으면 ILIKE 로는 recall 이 무너진다.
다음 단계 설계에서 이 인덱스가 선행 조건이다. (이번 WO 범위 밖 — schema 변경이므로 구현하지 않았다.)

## 6. 이 Pilot 이 답한 것 / 답할 수 없는 것 (WO 확인항목 10)

### 이 통제 Pilot 으로 확정된 것

- Cafe24 가 `custom_product_code`(36자 UUID 포함) · `product_name` · `model_name` · `internal_product_name` 을 **무손실 왕복**시킨다.
- `mall.read_product` **단독으로 products + variants 둘 다 조회 가능**하다. 매칭을 위해 scope 를 넓힐 이유가 없다.
- 옵션 유무와 무관하게 **variant 는 항상 1건 이상 안정 생성**된다. 옵션 문법 → 품목 수는 결정적이다.
- 매칭축 우선순위: `custom_product_code` > `normalized_name` > `name_similar`. 앞의 둘은 단일 후보일 때 precision 100%.
- **병목은 후보 생성(recall)** 이다. 정규화 이름 인덱스가 없으면 정답이 후보에 들어오지도 않는다.
- 동명이인(G군)은 이름 축만으로는 **원리적으로 자동확정 불가** — 13개까지 후보가 붙었다.

### 실제 도매몰 Census 가 있어야만 답할 수 있는 것

- **`custom_product_code` 실제 보유율.** 이번 13/30 은 우리가 의도적으로 설계한 값이라 시장 현실이 아니다. 이 숫자가 1순위 축의 실효성을 결정한다.
- **`custom_variant_code` / `gtin`(바코드) 실제 보유율.** 이번엔 값 0 이라 측정 자체가 불가능했다.
- **상품명 변형의 실제 분포.** C/D군 변형은 우리가 만든 것이고, 실제 도매몰은 프로모션 문구·용량·세트 표기가 훨씬 심할 수 있다.
- **동명이인 밀도.** G군은 인위적으로 고른 3건이다. 실모집단에서 이름 충돌이 몇 %인지가 자동확정 비율을 정한다.
- **`manufacturer_code` / `brand_code` 를 실제로 채워 쓰는 몰의 비율.** 채워 쓴다면 코드 마스터를 한 번 내려받아 이름 축으로 복원할 여지가 생긴다.

## 7. 금지선 준수

| 항목 | 결과 |
|---|---|
| ProductMaster / ProductIdentifier 수정 | **0** (SELECT 만) |
| organization / supplier / serviceKey 추가 | **0** |
| QR / Tablet / Signage ownership 변경 | **0** |
| Cafe24 write API | **0** (`GET` products / variants 만) |
| scope 확대 | **0** — `mall.read_product` 단독으로 전부 성립 |
| 주문 / 회원 / 결제 / 배송 endpoint | **0** |
| 소비자 commerce · POS | **0** |

## 8. 산출물 · 검증 · Git

| 산출물 | 경로 |
|---|---|
| 원시 리포트 (30행 왕복 + 사다리) | `C:/tmp/cafe24-pilot/controlled-pilot-report.json` |
| 집계 요약 | `C:/tmp/cafe24-pilot/pilot-summary.txt` |
| 정규화 이름 축 측정 SQL / 결과 | `C:/tmp/cafe24-pilot/norm-name-check.sql` · `norm-name-result.txt` |
| 업로드 CSV (v5 = 등록 성공본) | `C:/tmp/cafe24-pilot/cafe24-pilot-upload-v5.csv` |

- 러너는 임시 파일로 작성해 실행 후 **삭제**했다 (`tmp-cafe24-controlled-pilot.ts`). 저장소에 코드 잔재 0.
- 러너 실행 중 `product_identifiers` 컬럼명을 잘못 쓴 1차 결과가 있었다(`identifier_exact` 전건 0).
  실제 스키마(`product_master_id` / `identifier_type` / `identifier_value` / `normalized_value`)로 고쳐 재실행했고,
  본 CHECK 의 수치는 **수정 후 재실행 결과**다. 초기 오측정치를 그대로 싣지 않았다.
- 저장소 변경은 본 CHECK 문서 1건뿐. `apps/**` · `packages/**` 코드 변경 0 → api-server 빌드 영향 없음.

## 9. 다음 단계

1. **2차 — 자체품목코드 입력**: 관리자 `상품 > 재고 관리 > 상품 재고 관리` 품목 엑셀을 내려받아
   `custom_variant_code` 실험값(옵션 없음 = 자체상품코드 동일 / F군 = `{code}-{n}` / A군 = MFDS 코드)을 넣고 왕복 재측정.
   `gtin` 은 관리자/엑셀 입력 경로가 **미확인**이므로 억지로 만들지 않는다.
2. **실도매몰 Census**: 상품 수백~수천 규모 몰 1곳에서 §6 의 "답할 수 없는 것" 5개를 실측.
   그 숫자가 나와야 자동매칭 중심 / 후보추천+수동확인 / 초기 전체 매핑 지원 중 무엇인지 결정할 수 있다.
3. **정규화 이름 인덱스**는 schema 변경이므로 별도 WO. 이번에 구현하지 않았다.

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(정규화 이름 인덱스)
