# CHECK-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1

**WO**: `WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1` — 소매시장 기준 화장품 제품 census 및 설명서 후보 모집단 산출
**선행**: `WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0` (commit `09e69d213`)
**기준문서**: [O4O-COSMETICS-PRODUCT-GUIDE-PRODUCTION-STANDARD-V0](../cosmetics/O4O-COSMETICS-PRODUCT-GUIDE-PRODUCTION-STANDARD-V0.md)
**일자**: 2026-08-07
**판정**: **PASS** — 최종 설명서 후보 **33,106 단위**, WO §13 판단선(40,000) 이하 → **전량 최소 설명서 생산 권고**
**DB write**: 0 (§9 비교는 read-only SELECT 만)

---

## 1. 결론 숫자

| 항목 | 값 |
|------|---:|
| 소매 raw 수집 (3 소스 합) | 48,734 |
| 비화장품 게이트 제외 | 8,329 |
| 게이트 통과 raw | 40,395 |
| **최종 unique 설명서 후보** | **33,106** |
| 기존 단위로 병합된 행 | 7,299 |
| 식약처 기능성 보고 index | 180,412 |
| 기존 O4O ProductMaster 대비 신규 | 32,918 |

**생산 판단**: 33,106 ≤ 40,000 → 추가 복잡화(우선순위·점수화·단계적 생산) 없이 **전량 최소 설명서 생산**을 권고한다.
40,000 은 hard limit 이 아니라 현재 기획상의 판단선이다.

---

## 2. 소스별 수집 및 추가 기여율 (§7)

| 순서 | 소스 | raw | 게이트 제외 | 정규화 | 누적 unique | 신규 추가 | 직전 대비 추가율 | 자기 행 대비 신규율 |
|:---:|------|----:|----:|----:|----:|----:|----:|----:|
| 1 | MUSINSA_BEAUTY | 43,384 | 8,329 | 35,048 | 28,967 | 28,967 | — | 82.65% |
| 2 | HWAHAE_RANKING | 5,250 | 0 | 5,247 | 33,037 | +4,070 | **14.05%** | 77.57% |
| 3 | OLIVEYOUNG_GLOBAL_BEST | 100 | 0 | 100 | 33,106 | +69 | **0.21%** | 69% |

기여율 곡선은 2번째 소스에서 이미 14%, 3번째에서 0.2% 로 떨어진다. 단 3번째 소스는 상한 100건이라
"소스가 고갈됐다"는 근거가 아니라 **소스 상한의 결과**다 (기준문서 규칙 S5).

### 사용 소스

- **MUSINSA_BEAUTY** — 공개 카테고리 목록 API. 3-depth leaf 88개 전수, reportedTotal 44,856 = fetched 44,856 (누락 0).
- **HWAHAE_RANKING** — 랭킹 테마 트리(category/skin/age) 전수 순회. 노드 2,515 중 데이터 2,074, 노드당 상위 20 상한.
- **OLIVEYOUNG_GLOBAL_BEST** — best-seller 100 고정(limit/offset/page 무시, 실측). 한국어+공식 영문명 쌍을 주는 유일한 소스.

### 제외 소스 (§2 — 차단은 우회하지 않는다)

| 소스 | 사유 |
|------|------|
| OLIVEYOUNG_KOREA | HTTP 403 봇 차단 |
| OLIVEYOUNG_GLOBAL 브랜드 목록 | HTTP 403 |
| STYLEVANA | HTTP 403 |
| YESSTYLE | HTTP 500 + 클라이언트 렌더링, 공개 JSON 없음 |
| GLOWPICK | 클라이언트 렌더링, 공개 목록 JSON 없음 |
| JOLSE | 접근 가능하나 상품명이 **영문 전용** — 한국어 상품명 축과 이름 대조가 불가해 unique 수를 부풀린다. 별도 EN 축 과제로 남긴다. |

---

## 3. 모집단 품질

| 항목 | 값 | 비고 |
|------|---:|------|
| 브랜드 확보 | 33,106 / 33,106 (**100%**) | 소매 소스는 브랜드를 필드로 준다 |
| 유형 판정 | 33,079 (미판정 27, 0.08%) | 파일럿 미판정 83건 → 규칙 T4 로 해소 |
| 공식 영문명 | 98 (0.3%) | OY Global 100 상한이 병목. Jolse 로는 해결 불가 |

상위 유형: 향수 3,727 / 메이크업 3,662 / 세럼 2,617 / 크림 2,388 / 립 1,734 / 토너 1,660 / 선케어 1,645 /
클렌징폼 1,503 / 마스크 1,417 / 바디워시 1,312.

### 비화장품 게이트 (규칙 T5)

무신사 3-depth 카테고리명 기준으로 뷰티 디바이스/소품·미용소품·헬스푸드 계열을 제외했다 — 8,329건(raw 의 19.2%).
여성청결제 등 의약외품/화장품 경계 품목은 이번 범위에서 판정하지 않고 한계로 기록한다.

### 사람 검수 큐 (872건)

| 유형 | 건수 | 의미 |
|------|---:|------|
| MERGE_TYPE_CONFLICT | 739 | 같은 키인데 유형이 다르게 판정됨 (규칙 T4 적용으로 1,073 → 739 감소) |
| MULTI_OPTION_BUNDLE | 123 | "택N/교차선택" 처럼 서로 다른 제품을 한 상품명으로 파는 경우 — 병합하지 않았다 |
| NAME_TOO_SHORT_AFTER_NORMALIZE | 10 | 정규화 후 이름이 과도하게 짧아짐 |

애매한 건은 **병합하지 않고** 큐로 보냈다 (WO §6).

---

## 4. 식약처 기능성 매칭 (§8)

방향은 **소매 → 기능성**. 기능성은 모집단이 아니라 규제정보 보강축이다.

| 구분 | 건수 |
|------|---:|
| RETAIL_FUNCTIONAL_MATCHED | 4,259 |
| RETAIL_NO_FUNCTIONAL_MATCH | 27,608 |
| CHECK | 1,239 |
| FUNCTIONAL_UNMATCHED | 175,788 |

- 매칭 규칙: 정규화 코어 **완전일치**(브랜드 접두 유무 포함)만 연결. 부분일치·유사도 매칭은 하지 않는다.
- CHECK 조건: 같은 이름을 **서로 다른 업체가 공유**하거나, 선케어·염모제·탈모케어 등 기능성 유형인데 매칭이 없는 경우.
- FUNCTIONAL_UNMATCHED 가 175,788 로 큰 것은 정상이다 — 기능성 보고는 소매 유통되지 않는 OEM·수출·단종 품목을 대량 포함한다.
- 원칙: **잘못된 기능성 매칭보다 미매칭 유지가 낫다.**

---

## 5. 기존 O4O ProductMaster 비교 (§9, read-only)

`product_masters` 구성: DRUG 177,413 / 건강기능식품 40,948 / QUASI_DRUG 17,148 / MEDICAL_DEVICE 3,826 / 일반 15 / GENERAL 11.
**화장품 regulatory_type 은 존재하지 않는다.**

DRUG 을 제외한 61,948행과 이름 완전일치 비교 → 매칭 188 / **신규 32,918**.
즉 화장품 설명서 후보는 사실상 전량이 O4O 에 없는 신규 모집단이다.

접속은 cloud-sql-proxy 경유 read-only SELECT 만 사용했고, 자격증명은 실행 시 환경변수로만 전달했다(코드 하드코딩 없음).

---

## 6. 기준문서(V0) 보완 — 반복 확인된 것만

- **정규화 규칙 추가** R15(총량 괄호) / R16(택N·교차선택) / R17(팩·세트 대괄호) / R18(수량 제거 후 잔재, **문자열 끝만**)
- **규칙 확장** R05·R05K — 천단위 쉼표(`1,000ml`)·증량 표기(`60+10매`) 대응 (규칙 N4)
- **규칙 N5** — `X` 는 문자열 끝에서만 제거 (`비타 B3 소스 X` 같은 실제 제품명 보호)
- **규칙 T4** — 소매 3-depth 카테고리명 → 유형 매핑 (~40 alias)
- **규칙 T5** — 비화장품 게이트
- **규칙 S5** — 소스 상한은 가정하지 말고 실측한다
- **§6-3 신설** — 브랜드 결측은 소매가 아니라 **기능성 보고 데이터의 한계**다
- `2+2` 표기는 6건뿐이라 **규칙화하지 않았다** (과적합 방지, 문서에 근거 기록)

정규화 코어는 파일럿과 census 가 단일 SSOT(`cosmetics-census-pilot/normalize-core.mjs`)를 공유한다.
규칙 변경마다 파일럿 산출물을 재실행해 `issueCount: 143` 및 세부 분포가 동일함을 확인했다(회귀 없음).

---

## 7. 산출물

**스크립트** `apps/api-server/src/scripts/cosmetics-retail-census/`
`lib.mjs` (차단 시 우회·재시도 금지 정책 내장) / `01-fetch-musinsa.mjs` / `02-fetch-hwahae.mjs` /
`03-fetch-oliveyoung-global.mjs` / `04-union-normalize.mjs` / `05-fetch-functional-index.mjs` /
`06-functional-match.mjs` / `07-productmaster-compare.mjs` / `08-summary.mjs`

**데이터** `tmp/cosmetics-retail-census/` — [README](../../tmp/cosmetics-retail-census/README.md)
`source-musinsa.json` / `source-hwahae.json` / `source-oliveyoung-global.json` / `retail-raw-union.json` /
`retail-normalized.json` / `retail-unique-guide-candidates.json` / `functional-index.json` /
`functional-match.json` / `productmaster-compare.json` / `issue-queue.json` / `census-summary.json`

원본 합계 120MB → **1MB 이상 파일은 gzip 으로 커밋**(13MB). 재사용 전 `gunzip -k tmp/cosmetics-retail-census/*.gz`.
WO §12 의 파일 목록·내용은 그대로이고 보관 형식만 다르다.

---

## 8. 한계

1. 소매 소스 3개는 시장 전체가 아니다. 403 차단 소스(올리브영 국내 포함)를 우회하지 않았으므로 실제 시장은 33,106보다 크다.
2. OY Global 100 상한 때문에 공식 영문명 확보율(0.3%)은 소스 한계이지 모집단 한계가 아니다.
3. 여성청결제 등 화장품/의약외품 경계 품목의 귀속은 미판정이다.
4. 기능성 매칭은 완전일치만 사용했으므로 실제보다 보수적이다(미매칭 과다 쪽으로 편향).
5. 노드당 20건 상한이 있는 화해는 롱테일을 담지 못한다 — 추가 기여 14.05% 는 하한값이다.

---

## 9. 다음 단계

이번 WO 로 **"화장품 설명서를 몇 개 만들어야 하는가" = 33,106** 이 확정되었다.
다음은 조사·census 가 아니라 **화장품 설명서 전량 생산 트랙**으로 넘어간다.
기능성 매칭 4,259건은 규제정보 보강축으로 붙이고, 사람 검수 큐 872건은 생산 전 선행 처리 대상이다.
