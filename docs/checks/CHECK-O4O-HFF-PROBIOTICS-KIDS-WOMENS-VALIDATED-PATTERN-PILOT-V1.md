# CHECK · HFF 유산균 아동/여성 검증 패턴 20-파일럿 (WO-O4O-HFF-PROBIOTICS-KIDS-WOMENS-VALIDATED-PATTERN-PILOT-V1)

- 담당: Agent A (유산균·프로바이오틱스 전용). 비타민·Agent B·의약품 미접촉.
- 일자: 2026-07-18
- status: **PAUSED_EXTERNAL_DEPENDENCY_DB_WRITE_PERMISSION** (DB 프리로드/dry-run/apply 미실행 — 적재 대기 큐)
- **확대 전 오케스트레이터 재검 대상**

---

## 1. 결과 요약

| 항목 | 값 |
|---|---|
| 선정 | 20 (KIDS 16 + WOMENS 4; INFANT 후보 유일건이 blacklist 라 이번 파일럿 제외) |
| 작성(production) | **19** (KIDS 15 + WOMENS 4) |
| HOLD | **1** — `HOLD_SOURCE_ABNORMAL` (락토베베F, CFU 이중표기 정정 필요) |
| BLOCKED(작성분) | **0** |
| REVIEW(작성분) | **0** |
| 물/음용수 근거위반 | 0 · 파편 0 · style/script 0 · sd-card 결손 0 |
| 신고번호 유일 | 19/19 · 기존 배치 교집합 0 |
| 반응형 5뷰포트 | PASS (19 × ko/en × 360·390·768·1024·1440) |
| ko/en 수치 대조 | 일치 (H-COUNT-MISMATCH 0) |

## 2. 검증 패턴 (규제 톤) — 판정 근거

**핵심 관찰**: 파일 풀의 아동/여성 유산균은 **모두 표준 유산균 3-기능성**(유산균 증식·유해균 억제·배변활동·장 건강)만 보유. 아동·여성 **특이 기능성 없음**, **연령 하한 원문 없음**, **임신/수유 주의 원문 대부분 없음**. 따라서 검증 패턴 = P1 grounded 템플릿 + **보호자 톤 프레이밍** + 대상성(제품명 근거)이며, 창작 요소는 도입하지 않았다.

1. **보호자 톤(KIDS)**: 구매·판단 주체 = 보호자. 아이에게 직접 말하지 않고 "아이의 장 건강을 챙기려는 보호자를 위한", "아이에게 먹이기 전 …" 관점. 불안 조장·과장 없음. → 실화면 확인(뉴오리진 베이비).
2. **연령 하한**: 원문에 연령/섭취대상 수치 **없음** → **임의 연령 창작 안 함**(§2 준수). 대상성은 공식 제품명(키즈/베이비/우먼/여성)에서만 근거.
3. **급여 방법(영유아)**: 원문에 있는 것만 반영 — 우유·분유·이유식·젖병 키워드 검출 시에만 "물 외에 …에 타서 먹일 수 있습니다 — 공식 표기". 근거 없으면 미표기.
4. **여성(WOMENS)**: 여성 특이 기능성·임신/수유 주의 **원문에 없어 창작 안 함**. 성인 프레이밍 + 장건강 유산균만.
5. **규제 불변**: 건강기능식품 인정 기능성(유산균 3-기능) verbatim. 성장·발달·면역·두뇌·키 등 **주장 없음**. 질병 치료·예방 **단정 없음**. 코팅=성상 중립인용.
6. **기존 규칙**: 물/음용수 양방향, CFU 근거, Q-SPEC-ITEMNO 파편 0, 파서 최신(정수-우선, 1억2천만 gloss 포함).

Guard 전수 결과 BLOCKED 0 · REVIEW 0 이 위 판정을 뒷받침(제품명의 "보장"·"여성유산균" 등은 공식 명칭 인용으로 통과, 본문은 인정 기능성만).

## 3. HOLD 1건

`20040017014271` 락토베베F — 원문 CFU 이중표기 `102,000,000(1억2백만) cfu/2g` 가 파서/가드에 상충값(1e8 vs 1.02e8)으로 읽힘 → ko 원문인용이 en 과 수량집합 불일치(`H-COUNT-MISMATCH-001` BLOCKED). 값은 1억2백만으로 일관하나 표기 정정 필요 → `HOLD_SOURCE_ABNORMAL`. (PART B 셀립·일양·17종과 동일 계열 — 원문 이중표기 트라이아지.)

## 4. 새 산출물 (파이프라인)

- 작성기 `kwp-write.mjs`: 검증된 P1 템플릿(spec/why/probioClause/Q-SPEC 로직 verbatim 보존) + 보호자 톤 프레이밍(`_target` 기반 KIDS/WOMENS 분기) + 원문근거 급여방법 bullet. 신규 실패유형 **0**.
- grounding `kwp-gen.mjs`(정수-우선 파서), build `kwp-build.mjs`(`_target` 반송), guard `kwp-guard-final.ts`, responsive `kwp-responsive.mjs`.

## 5. 적재 대기 큐 (실행 안 함)

- production 19: `hff-b3-store-canonical-apply.ts` 계약 재사용(loadTargets → `hff-probiotics-kw-cp01.json`, TARGET=19, 기대 write **76** = master19+candidate19+SPD ko19/en19). env 이중게이트·단일 트랜잭션·사후검증·롤백매니페스트.
- 매니페스트: `docs/guides/products/health-functional-food/batch-probiotics-kids-womens-pilot/PILOT-KIDS-WOMENS-MANIFEST.json`.
- 재개: 권한 세션에서 Batch003(226)+D-CP01(1)+KW(19) 묶어 순차 처리.

## 6. 확대 판단(오케스트레이터)

파일 풀 잔여 아동/여성 clean 후보: KIDS 62 · WOMENS 9(파일럿 사용분 제외 시 KIDS ~47 · WOMENS 5). 파일럿에서 **신규 실패유형 0**(유일 이슈=원문 CFU 이중표기 HOLD, 기존 계열). 패턴 안전성 확인 시 잔여 전량 확대 가능. INFANT(분유·젖병 급여 명시 제품)는 별도 소그룹으로 재검 권장.

## 7. 산출 파일

- 입력: `docs/checks/data/product-description-guard/hff-probiotics-kw-cp01.json`(+`-hold.json`)
- 초안: `docs/guides/products/health-functional-food/batch-probiotics-kids-womens-pilot/KW-CP01/drafts/*.{ko,en}.html`
- 매니페스트·본 CHECK.
