# CHECK — HFF 단일 기능성 관절·간·혈행·면역 계열 max pool 조사 (Agent A) V1

- WO: `WO-O4O-HFF-SINGLE-FUNCTIONAL-MAX-POOL-RESEARCH-A-V1` · 자동승인 계약 적용(조사·manifest·CHECK·commit·push 사전승인, generate/apply 범위 외).
- 성격: **read-only 조사 · DB write 0**. 공용 parser/composer/registry **수정 0**(import만). 제품 generate/apply 미실행.
- 종료 `2026-07-22 22:20 +0900`.
- 방법: 조사 스캐너 `hff-sf-maxpool-research.ts`(공용 helper import: `source-parse.classify`·`source-grounding-parser.parseServing/parseBasis/isBulkMaterial`·`hff-nutrient-registry.mapFunctionEn`·`hff-sf-registry.extractFunctionsKo`) — sf-select READY 계약 동일 재현, 라벨(실제 기능성 원료) 기준 버킷팅.

## 0. 결론

> **관절·간·혈행·면역 계열 realistic auto-producible(READY) = 211** (stmt-shard 0:75 / 1:72 / 2:64, 균형).
> notTaken(미생산·not-taken) 1,195 · produced(기생산) 329 · GROUNDING_PENDING 267 · 액상 674.
> **PENDING 267 은 대부분 `extractFunctionsKo` 구분자/포맷 변이 미분리**(∙/․/･/⦁·"기능성 내용:" 접두·KO+EN 인라인) — 파서 하드닝 시 대량 언락(별도 WO 권고, 본 조사 범위 외).

## 1. 기준선 (새 DB 연결 실측)

| SSOT | 값 |
|---|---|
| 단일 기능성 LIVE | 3,358 |
| 프로바이오틱스 LIVE | 767 |
| 복합형 LIVE(구조적 카드≥2) | 4,527 |
| **canonicalDup** | **0** |
| **statementNo 중복 master** | **0** |

- 전체 HFF 후보 41,261 · pure-single([원료] 브래킷 1종) 5,531.

## 2. 원료별 producibility (라벨 기준, notTaken 중)

| 계열 | 원료 | READY | notTaken | 기생산 | PENDING | 액상 | 아동/여성 | shard 0/1/2 |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 관절 | **뮤코다당·단백(콘드로이친)** | **54** | 54 | 0 | 0 | 0 | 0 | 24/19/11 |
| 간 | 밀크씨슬 | **37** | 45 | 71 | 4 | 2 | 0 | 17/10/10 |
| 혈행 | 은행잎추출물 | **33** | 38 | 8 | 4 | 1 | 0 | 11/11/11 |
| 면역 | 인삼 | **28** | 98 | 0 | 25 | 43 | 0 | 7/8/13 |
| 관절 | MSM | **21** | 31 | 50 | 4 | 4 | 0 | 8/7/6 |
| 혈행 | 코엔자임Q10 | **13** | 38 | 44 | 21 | 2 | 1 | 3/6/4 |
| 면역 | 알로에겔 | **10** | 76 | 0 | 6 | 60 | 0 | 3/2/5 |
| 지구력 | 옥타코사놀 | **4** | 11 | 12 | 4 | 2 | 0 | 0/4/0 |
| 관절 | 글루코사민 | **3** | 31 | 22 | 20 | 6 | 0 | 1/2/0 |
| 면역 | 표고버섯균사체 | **3** | 13 | 0 | 8 | 1 | 0 | 1/1/1 |
| 면역 | 스피루리나 | **2** | 17 | 0 | 14 | 1 | 0 | 0/0/2 |
| 면역 | 클로렐라 | **2** | 9 | 0 | 7 | 0 | 0 | 0/1/1 |
| 면역 | 홍삼 | **1** | 690 | 122 | 124 | 547 | 6 | 0/1/0 |
| | **합계 READY** | **211** | | | | | | **75/72/64** |

- 조사 원료 26종(0-READY 13종 포함): 홍삼·인삼·알로에·표고·클로렐라·스피루리나·베타글루칸·상황버섯(면역) / 밀크씨슬·헛개(간) / Q10·나토키나제·피크노제놀·정어리펩타이드·은행잎(혈행) / MSM·글루코사민·NAG·보스웰리아·초록입홍합·콘드로이친·강황·뮤코다당(관절) / 옥타코사놀 / 회화나무.
- **콘드로이친 = 뮤코다당·단백 동일 MFDS 기능성**(콘드로이친황산=지표성분) → 1 config 로 통합(54). Agent B 통합 시 slug=`mucopolysaccharide-protein`.

## 3. 공식 KO 기능성 · EN mapping 상태

- READY 원료는 공식 기능성이 공용 `mapFunctionEn`에 **전부 매핑됨**(임의 EN 생성 0). 예:
  - 밀크씨슬 → 간 건강 · MSM/글루코사민/뮤코다당 → 관절 및 연골건강 · 은행잎 → 기억력·혈행 개선 · Q10 → 항산화·높은 혈압 감소 · 인삼 → 면역력·피로 개선.
- **PENDING(267) 원인 = extractFunctionsKo 미분리**(파서 한계, 수정 금지 준수):
  - 구분자 변이 `∙ ․ ･ ⦁ ㆍ` 및 `,` 다기능 연접(홍삼 "면역력 증진․피로 개선․혈소판 응집억제…" 통째 미매핑) → 홍삼 124·인삼 25.
  - `기능성 내용 :` 접두(Q10 21) · KO+EN 인라인("(국문)…(영문)May help…" 베타글루칸 12·표고 8).
  - 표현 변이 "관절 및 연골 건강에 도움"(줄 수 있음 생략, 글루코사민 20).
- **권고(별도 WO)**: `extractFunctionsKo` 구분자 정규화 + `기능성 내용:` 스트립 → PENDING ~184 추가 언락(홍삼 124+Q10 21+인삼 부분+글루코사민 20). 공용 파서 수정이라 본 조사 범위 외.

## 4. 표기 변이 (원료명·지표성분)

- 뮤코다당·단백: `뮤코다당·단백 / 뮤코다당⦁단백 / 뮤코다당ㆍ단백 / 콘드로이친황산염(제2025-63호)` — 구분자 8변이.
- 밀크씨슬: `밀크씨슬추출물 / 밀크씨슬(카르두스 마리아누스) 추출물 / …제품` (카르두스 표기 변이).
- MSM: `MSM / 엠에스엠(MSM) / Dimethylsulfone(MSM) / Opti-MSM(2008-12)`.
- 인삼: `인삼 / 인삼제품 / 인삼가수분해농축액` (홍삼과 정규식 분리 `(^|[^홍])인삼` 확인).
- 은행잎: `은행잎추출물 / 은행잎 추출물 / …제품`. 알로에: `알로에겔 / 알로에 전잎`.

## 5. 액상·BULK·아동/여성·복합 분리

- **액상 674**(홍삼 547·알로에 60·인삼 43 등) — 고형 apply 대상 아님(별도 액상 모델). 아동/여성 6(홍삼 갱년기 등) 별도.
- BULK/복합 기능성 = pure-single(브래킷 1종) 필터로 사전 배제. serving 파싱 실패 0(READY 후보군).

## 6. Agent B 전달 산출물

- 원료별 조사 JSON: `docs/checks/data/product-description-guard/hff-sf-research/sf-research-<slug>.json` (counts·shard·koFunctions·enUnmapped·labelVariants·**readyStmts**[stmt 직접주입용]).
- 후보 manifest: `docs/checks/data/product-description-guard/hff-sf-research/_sf-research-manifest.json` (전 원료 summary + discovery + totals).
- 조사 스캐너(재현용): `apps/api-server/src/scripts/hff-sf-maxpool-research.ts` (공용 helper import, 수정 0).
- **통합 절차(권고)**: Agent B가 `SF_INGREDIENTS`에 READY 원료 config(labelRe·slug·displayEn) 추가 → `hff-sf-select`/`generate`/`apply` 재사용(EN 신규 매핑 불요, READY 는 기존 mapFunctionEn 로 충족). stmt-shard 0/1/2 분할은 본 manifest readyStmts + FNV%3.

## 7. 보고 요약

```text
종료 2026-07-22 22:20 +0900 · read-only · DB write 0
조사 원료 26종(관절·간·혈행·면역·지구력·갱년기) · 후보 스캔 41,261 · pure-single 5,531
realistic auto-producible READY = 211 (shard 0:75 / 1:72 / 2:64)
원료별 최다: 뮤코다당·단백 54 · 밀크씨슬 37 · 은행잎 33 · 인삼 28 · MSM 21 · Q10 13 · 알로에 10
notTaken 1,195 · 기생산 329 · PENDING 267(파서 구분자 변이) · 액상 674 · 아동/여성 6
공식 KO 기능성 = 전 READY 원료 mapFunctionEn 매핑 완료(임의 EN 0)
PENDING 언락 = extractFunctionsKo 구분자/접두 정규화(별도 WO) → ~184 추가 잠재
canonicalDup 0 · statementNo 중복 master 0 · 기존 LIVE drift 없음(read-only)
B/C 중복 회피: 프로바이오틱스·banaba/hyaluronic/saw-palmetto/haematococcus/phosphatidylserine 제외
산출: DATA/hff-sf-research/ (원료별 26 JSON + manifest) · 스캐너
중지 사유: 없음
```

---

*read-only 조사 · DB write 0 · 공용 registry/parser/composer 수정 0 · generate/apply 미실행. Agent B 통합용 후보 풀 확정.*
