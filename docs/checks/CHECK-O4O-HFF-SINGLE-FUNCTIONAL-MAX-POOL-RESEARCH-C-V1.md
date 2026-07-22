# CHECK — 단일 기능성 MAX 풀 조사 장/피부/눈/인지 (Agent C) V1

- 상위 WO: `WO-O4O-HFF-SINGLE-FUNCTIONAL-MAX-POOL-RESEARCH-C-V1`. 자동승인 계약 `WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1`(조사·manifest·CHECK·commit·push 사전승인, generate/apply 범위 외).
- 성격: **read-only 조사 · DB write 0 · 공용 parser/composer/registry 수정 0 · 임의 EN 생성 0 · generate/apply 0.**
- 시작~종료 `2026-07-22 ~22:22 +0900` · 단일 세션. 채널: 자체 Cloud SQL Auth Proxy 5434(fresh 토큰), SELECT only.
- 담당 계열: **gut / skin / eye / cognitive**. A/B 담당 원료(바나바·쏘팔메토·가르시니아·전립선) 명시 제외.

## 0. 결론

> **담당 4계열 pure-single 고형·미승격·not-taken 원료 45종 조사. 실제 자동 생산 가능(producible: solid+not-taken+섭취파싱+전 편익 EN HIT) = 481.**
> 특수트랙(CFU 프로바이오틱스·홍삼 own-track) 제외 **READY-clean = 21종 / 397건** (stmt-shard 0/1/2 = **165/167/163**, 균형).
> GROUNDING_PENDING 12종(EN 미매핑, registry 확장 선행) · REVIEW_LATER 8종. DB write 0.

## 1. 기준선 (새 연결 read-only)

- 단일 기능성(비-CFU) LIVE 79 · 프로바이오틱스(장건강) LIVE 726 · canonicalDup 0(집계 STORE·canonical·o4o_hff_generated). 본 조사는 write 0 → 불변.
- scanned 41,261 후보. lineage 함수 매칭(gut=배변/유산균증식/유해균억제/장건강, skin=피부보습/피부건강/자외선피부, eye=눈건강/눈피로/황반/시력/건조한눈, cognitive=인지력/기억력).
- pure-single = MAIN_FNCTN `[원료]` 브래킷 정확히 1종. producible 판정: `parseServing` PASS + `mapFunctionEn`(전 편익 분해 매핑) 전부 HIT.

## 2. READY-clean 상위 (즉시 생산 가능 · 특수트랙 제외)

| 원료 | 계열 | producible | single/complex | shard 0/1/2 | 비고 |
|---|---|---:|---|---|---|
| 차전자피식이섬유 | gut | **137** | 69/90 | 58/56/45 | 콜레스테롤 개선·배변활동 원활 |
| EPA및DHA함유유지 | eye | **127** | 15/117 | 35/42/55 | ⚠ OMEGA_CROSS_LINEAGE(혈중지질=타계열, 눈=본계열) |
| 은행잎추출물 | cognitive | 32 | 10/26 | 12/12/12 | 기억력·혈행 개선 |
| 차전자피 | gut | 27 | 27/13 | 12/14/14 | |
| 난소화성말토덱스트린 | gut | 14 | 5/11 | 5/5/6 | 혈당·중성지질·배변 |
| 마리골드꽃추출물 | eye | 10 | 10/2 | 3/6/3 | 황반색소밀도(루테인 인접) |
| 알로에전잎 | gut | 10 | 11/0 | 3/3/5 | ⚠ COORD_OVERLAP(병렬 assignment WIP) |
| 루테인 | eye | 9 | 8/1 | 3/5/1 | 루테인 라인 인접 |
| 감마리놀렌산함유유지 | skin | 7 | 3/4 | 3/0/4 | |
| 이눌린/치커리추출물 | gut | 6 | 1/5 | 2/2/2 | |
| 오메가-3지방산함유유지 | eye | 3 | 1/2 | 1/0/2 | OMEGA_CROSS_LINEAGE |
| 식이섬유 | gut | 3 | 1/2 | 1/1/1 | |
| 프락토올리고당 | gut | 2 | 25/4 | 9/11/9 | ⚠ 대부분 '유익균 증식' EN 부재 → PENDING 다수 |
| 곤약감자추출분말 · 천마등복합(HX106) · 헤마토코쿠스 · 등 | 각 | 1~2 | | | |

- **single vs complex 분리(WO §5)**: 식이섬유·장 계열은 단일(배변만)과 복합(콜레스테롤+배변, 혈당+중성지질+배변)이 혼재. producible 은 **전 편익 EN 매핑되는 것만**(복합도 전 편익 HIT면 생산가능). 차전자피식이섬유 single 69/complex 90, 프락토올리고당 single 25지만 '유익균 증식' EN 부재로 producible 2뿐.

## 3. GROUNDING_PENDING (EN 미확정 → registry 확장 WO 선행, 임의생성 금지) (WO §6)

| 원료 | 계열 | not-taken | 미매핑 KO 편익 |
|---|---|---:|---|
| 포스파티딜세린 | skin/cog | 45 | 노화로 인해 저하된 인지력 개선 · 자외선에 의한 피부손상으로부터 피부건강 유지 |
| 스피루리나 | skin | 13 | 피부건강 · (항산화·콜레스테롤 복합) |
| 빌베리추출물 | eye | 8 | 눈의 피로 개선 |
| 저분자콜라겐펩타이드 | skin | 7 | 자외선 피부손상 피부건강 유지 |
| 클로렐라 | skin | 7 | 피부건강 |
| 알로에겔 · 배초향(Agatri®) · N-아세틸글루코사민 · 등 | | 4~5 | 피부건강/장건강 복합 |

- 헤마토코쿠스(눈 피로도 개선)·포스파티딜세린은 기존 sf-5 조사에서도 PENDING 확정분과 일치.
- EN 확정 = 공식 근거 확보 후 `mapFunctionEn` 확장(사람검수). **본 조사에서 임의 EN 생성 0.**

## 4. 표기 변이·지표성분 (요지)

- EPA및DHA함유유지: `EPA 및 DHA 함유 유지`/`EPA및DHA함유유지`(공백변이 다수) · 차전자피식이섬유: `차전자피식이섬유`/`차전자피 식이섬유` · 은행잎추출물: `은행잎추출물`/`은행잎 추출물` · 난소화성말토덱스트린: `~덱스트린`/`~덱스트린 제품` · 마리골드=지아잔틴 함유 · 헤마토코쿠스=아스타잔틴 병용.

## 5. 특수 트랙·조율 (전체중지 미해당)

- **CFU_TRACK**: 프로바이오틱스(유산균) 계열은 `hff-probiotics` **별도 파이프라인**(CFU) — sf(비-CFU) 통합 대상 아님. not-taken 246 은 그 트랙 잔여. → readyClean 에서 제외.
- **OWN_TRACK**: 홍삼(korean-ginseng)은 홍삼 라인 별도(5-기능 복합). → readyClean 제외, 데이터엔 보존.
- **COORD_OVERLAP**: 조사 중 병렬 세션이 broader max-pool assignment(WIP·미커밋: aloe/korean-ginseng/chitosan/red-yeast-rice/rosehip/mucopolysaccharide/chitooligosaccharide)를 `hff-sf-assignment/` 에 생성 관측. 본 조사(-C)는 **read-only·distinct output(그 WIP 미접촉)**. 겹치는 원료(알로에·홍삼)만 note=COORD_OVERLAP 태깅 → Agent B 통합 시 dedup. **전체중지(범위중복) 미해당**: 담당 계열의 비중복 대량(차전자피식이섬유·EPA/DHA·은행잎·마리골드·루테인·감마리놀렌산·이눌린 등)이 본 조사 고유 산출.

## 6. 보고 요약

```text
시작~종료 2026-07-22 ~22:22 +0900 · read-only · DB write 0 · registry 수정 0 · 임의 EN 0
조사 원료 45종(gut16·skin14·eye8·cognitive7) · scanned 41,261
producible(raw) 481 → 특수트랙 제외 READY-clean 21종/397 · shard 0/1/2 = 165/167/163
계열별 producible: gut 209 · eye 152 · cognitive 105 · skin 15
status: READY 25 · GROUNDING_PENDING 12 · REVIEW_LATER 8
공식 KO 기능성·기존 EN mapping·표기변이·지표성분 = §1~4
Agent B 전달: hff-sf-maxpool-C.json(전체) · hff-sf-maxpool-manifest-C.json(분류+producibleStmts)
전체중지 사유: 없음(오귀속 0·범위중복은 COORD_OVERLAP 태깅으로 조율, 병렬 WIP 미접촉)
```

## 7. 산출물 (Agent B 통합용)

- 전체 데이터: `docs/checks/data/product-description-guard/hff-sf-maxpool-C.json` (45종 · producibleStmts 포함)
- manifest(분류·producibleStmts·shard·note): `docs/checks/data/product-description-guard/hff-sf-maxpool-manifest-C.json`
- 본 문서. (조사 도구는 read-only 임시 스크립트 — 커밋 제외.)

---

*read-only 조사. DB write 0 · 공용 코드 수정 0 · 임의 EN 생성 0 · generate/apply 0 · 병렬 WIP 미접촉.*
