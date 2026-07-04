# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-AI-DRAFT-DRYRUN-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-AI-DRAFT-DRYRUN-V1`
> 성격: **AI draft dry-run.** 소량 초안 품질 검증. DB write·SharedProductDescription·대량 생성·admin 노출·배포 **없음**.
> 작성일: 2026-07-04 · 트랙: **건강기능식품 전용**
> 산출: `health-functional-food-store-description.prompt.ts`(프롬프트+seed 빌더) · `scripts/health-functional-food-store-description-ai-draft-dryrun.ts`(render-only)
> 근거: [`RAWPAYLOAD-DESCRIPTION-SEED-DESIGN-V1`](../work-orders/WO-O4O-HEALTH-FUNCTIONAL-FOOD-RAWPAYLOAD-DESCRIPTION-SEED-DESIGN-V1.md) §5·§6 · [`OFFICIAL-TEXT-PARSER-DRYRUN-V1`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1.md) · [`O4O-AI-USAGE-FLOW-BASELINE-V1`](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md)

> ⚠️ **면책**: 본 문서는 엔지니어링 초안 검증이며 약무/법무 유권해석이 아니다. 실제 매장 노출 전 약무/법무 검토 필수(seed-design §8 면책 계승).

---

## 1. 결론 요약 — **GO (조건부)**

| 항목 | 결과 |
|---|---|
| 프롬프트 + seed 빌더 | ✅ 작성(순수, §6 금지 카탈로그 내장). tsc 통과 |
| 소량 샘플(12건 계층) render | ✅ parseSuccess 100%, seed 핵심필드 존재율 높음 |
| 대표 초안 생성·평가 | ✅ 4건(단일/원료/기능성결측/혈압 인정문구) |
| **원문 밖 효능 생성** | **관측 0** — 인정 문구 범위 유지 |
| **의약품처럼 단정** | **관측 0** — "높은 혈압 감소에 도움" 등 verbatim 보존, "혈압을 낮춘다" 류 없음 |
| **caution 보존** | ✅ 안정적(삭제 없이 의미 보존) |
| **결측 기능성 처리** | ✅ 창작 없이 기능성 블록 생략 |
| 신규 발견(필터 필요) | ⚠️ **원료(raw material)·수출용 제품 혼입** / terse claim 어미 결손 |

**한 줄 결론:** 프롬프트·seed 구조는 건전하며, 대표 초안은 **원문 밖 효능 생성 0·의약품 단정 0·caution 보존**으로 §8.1 GO 기준을 충족한다 → **후속 bulk dry-run 진행(GO)**. 단 bulk 전에 **소비자 완제품이 아닌 원료/수출용 후보 pre-filter** 와 **terse-claim(어미 결손) 검토 플래그** 2가지를 반영한다(생성 품질 결함이 아니라 대상 스코프·표기 정밀화).

---

## 2. 기준 문서 및 preflight 결과

| preflight 항목 | 결과 |
|---|---|
| 공식 텍스트 parser 파일 | ✅ `health-functional-food-official-text.parser.ts` |
| parser test PASS | ✅ 19/19 (OFFICIAL-TEXT-PARSER-DRYRUN) |
| **seed design 문서 존재** (§3 게이트) | ✅ `WO-...-RAWPAYLOAD-DESCRIPTION-SEED-DESIGN-V1.md` — **구현 진행 조건 충족** |
| AI usage baseline | ✅ `O4O-AI-USAGE-FLOW-BASELINE-V1.md` |
| AI 호출 경로 | `@o4o/ai-core` `execute({systemPrompt,userPrompt,config,meta})` (provider 기본 gemini). config resolver 는 DB scope 필요 |
| guideline CHECK/WO | ⚠️ `CHECK/WO-...-STORE-DESCRIPTION-GUIDELINE-V1` **부재** — 가이드라인 내용은 seed-design §5·§6(금지/보존 카탈로그)에 포함되어 그것을 근거로 사용 |
| secret 노출 | 없음(키·토큰 미기재) |

---

## 3. 샘플 선정 기준

- 소량 계층 샘플 **12건**(WO §5.2 권장 30 이하), 업체 다양성 확보.
- strata 히트: shortMain·longMain·multiClaim·longIntake·hasCaution·longBase·**missingMain**·topLength·avgLength 전부 커버.
- 업체 중복 최대 2건 제한(특정 브랜드 편중 방지). manufacturerDiversity 10.
- 원천 = repo 밖 raw JSONL(= rawPayload.source 동치). raw 대량 미커밋. 샘플 원문은 scratchpad(gitignore).

계층 대표(발췌): 단일 claim(그린청매실정/유산균), 거대 멀티비타민(59~85 claim), 기능성 결측(HemoHIM 수출용), 혈압 인정문구(코엔자임Q10).

---

## 4. 입력 seed 구조

`buildHealthFunctionalFoodDescriptionSeed(item)` (파서 재사용):
```ts
{ sttemntNo, productName, manufacturerName,
  mainFunction,               // MAIN_FNCTN 정규화(원문 보존)
  functionalClaims: string[], // ⑴⑵/개행 분리 + 라벨/헤더 노이즈 제거(§10 refine)
  intake, caution, baseStandard,
  sourceFields, missingFields }
```
원칙(seed-design §2·§5): MAIN_FNCTN 의미 보존, INTAKE_HINT1 안내용, BASE_STANDARD 는 근거/참고(본문 아님), caution 보존, 원료 필드 없음 → 원료 설명 생성 안 함.

---

## 5. 프롬프트 설계

`HFF_STORE_DESCRIPTION_SYSTEM_PROMPT`(1,707자) — seed-design §5·§6 규칙 내장:
- **효능/질병 표현 "일괄 금지" 아님**: 기능성·건강 맥락·질병명(주의 맥락)·의약품 병용 상담·부작용 주의는 **허용**.
- **금지**: 질병 예방/치료 표방, 의약품 오인 용어, 과대·최상급·안전성 단정, 인정범위 초과, 효과 어미 강화("…된다/낫는다"), 특정 질환자 타겟팅, 원문 밖 원료 설명, 기준규격을 효능 근거화.
- **verbatim**: functionalClaims(인정 문구) 어미("…도움을 줄 수 있음") 보존.
- **caution 보존**: seed.caution 삭제 금지.
- 출력: JSON(title/summary/sections{mainFunction[],howToTake[],caution[],standardNote?}/sourceTrace/reviewFlags).
- user 프롬프트: seed JSON + 결측 필드 안내(창작 금지). avg 3,798자 / max 7,579자.

---

## 6. AI 호출 조건과 모델/정책 scope

| 항목 | 값 |
|---|---|
| 표준 경로 | `@o4o/ai-core` `execute()` (provider 기본 gemini, config resolver=DB scope) |
| **본 dry-run 실행 방식** | **render-only** — 스크립트가 seed+프롬프트 산출. **live gemini API 미호출**(config resolver+키+비용 → standalone 미지원, in-app 서비스 경로 필요) |
| 초안 생성 주체 | **Claude Opus 4.8**(프로덕션급 동급 모델)이 렌더된 프롬프트를 실행 = 프롬프트/seed 충실도 검증. 대량·정식 생성은 in-app `execute()` 경로에서 별도 |
| **live API 호출 수 / 비용** | **0 / $0** (render-only). 대량 dry-run 시 비용은 in-app 경로에서 실측(§10) |

> 정직 고지: 본 파일럿의 "생성"은 live gemini 대신 동급 모델(Claude)로 프롬프트를 실행한 것이다. 프롬프트·seed 검증 목적은 충족하되, provider 별 미세 편차는 bulk dry-run(live 경로)에서 재확인한다.

---

## 7. 생성 결과 품질 평가 (대표 4건)

> 초안 JSON 은 시스템 프롬프트를 따라 생성. 평가는 WO §5.6 기준.

### 7.1 그린청매실정 (단일 claim, terse) — `PASS_WITH_MINOR_EDIT`
- mainFunction: "제조사가 신고한 기능성: 피로 개선" / howToTake: "1일 1회 4cc…" / caution: 알레르기·신맛 보존.
- reviewFlag: **TERSE_CLAIM_NO_SUFFIX** — 원문이 "①피로 개선"으로 인정 어미("도움을 줄 수 있음")가 없음 → 어미 창작 금지, 표기 검토.
- 평가: 원문 밖 효능 없음, caution 보존. terse 어미만 검토 필요.

### 7.2 11종 혼합유산균 (intake="건강기능식품 원료로 사용") — `NEEDS_PROMPT_REVISION`
- mainFunction 인정 문구는 정상이나 **섭취방법이 "건강기능식품 원료로 사용"** = **완제품이 아니라 제조용 원료**.
- reviewFlag: **NOT_CONSUMER_PRODUCT** — 매장 소비자 설명 대상 부적합 → **생성 전 필터 권장**.
- 평가: 생성 품질 문제가 아니라 **대상 스코프 문제**(원료/OEM 혼입).

### 7.3 ATOMY HemoHIM (수출용, mainFunction 결측) — `PASS_READY_FOR_REVIEW`
- mainFunction 결측 → **기능성 블록 생략(창작 0)**. howToTake("1일 2회 20ml") + caution(개별인정형 주의)만.
- reviewFlags: **MAIN_FUNCTION_MISSING**(정상 생략), **EXPORT_PRODUCT**(수출용 — 국내 노출 대상 검토).
- 평가: 결측 처리·주의 보존 정확. "없는 효능 창작" 방지 실증.

### 7.4 코엔자임Q10 (혈압 인정문구) — `PASS_READY_FOR_REVIEW`
- mainFunction: **"높은 혈압 감소에 도움을 줄 수 있습니다"** — 인정 문구 **verbatim 보존**. "혈압을 낮춘다/치료" 류 **미생성**. 면역·세포분열·세포보호 항목 유지.
- reviewFlag: **BORDERLINE_CLAIM**(혈압 관련 표현 → 노출 전 약무 검토 권장).
- 평가: 의약품 단정 회피 + 인정범위 유지 실증(가장 위험한 verbatim 케이스 통과).

---

## 8. 실패 / 수정 필요 유형 (판정 분포)

| 판정(WO §5.6) | 대표 | 성격 |
|---|---|---|
| PASS_READY_FOR_REVIEW | HemoHIM, 코엔자임Q10 | 즉시 검토 가능 |
| PASS_WITH_MINOR_EDIT | 그린청매실정(terse), 멀티정제(길이 트림) | 경미 편집 |
| NEEDS_PROMPT_REVISION | 11종 혼합유산균(원료) | **대상 필터**(생성 전 제외) |
| FAIL_BEYOND_SOURCE | — | **관측 0** |
| FAIL_MEDICINE_LIKE | — | **관측 0** |
| FAIL_LOW_USEFULNESS | — | 관측 0 |

**핵심**: FAIL(원문 밖 효능 / 의약품 단정) **0건**. 수정 필요는 전부 **스코프·표기 정밀화**(원료 필터, terse 어미, 멀티정제 길이).

---

## 9. 비용 / 시간 / 실패율

| 지표 | 값 |
|---|---|
| live AI 호출 수 | **0** (render-only) |
| live 비용 | **$0** |
| 렌더 실패율 | 0% (12/12 seed·프롬프트 생성) |
| systemPrompt / avg userPrompt | 1,707자 / 3,798자 (max 7,579자) |
| 초안 평가(모델=Claude) 실패 | 0/4 (전건 유효 JSON 초안 생성) |

> bulk dry-run 의 provider(gemini) 토큰·비용·실패율은 in-app `execute()` 경로에서 실측 예정(§10).

---

## 10. 후속 대량 dry-run 가능 여부 — **가능(GO), 조건부**

**GO** → `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-DRYRUN-V1`.

bulk 전 반영할 정밀화(생성 품질 결함 아님):
1. **소비자 완제품 pre-filter** — `intake` 가 "원료로 사용" 류이거나 productName 수출용 표기 → 매장 설명 대상 제외/보류(NOT_CONSUMER_PRODUCT / EXPORT).
2. **terse-claim 어미 플래그** — mainFunction 이 인정 어미 없이 짧은 경우(예: "피로 개선", "항산화 작용") TERSE_CLAIM_NO_SUFFIX → 어미 창작 금지·표기 검토.
3. **멀티정제/멀티성분 claim 그룹핑** — 정제/캡슐 단위 구조 보존(현재 splitFunctionalClaims 는 라벨/헤더 노이즈 제거까지 반영, 그룹핑은 후속).
4. **live provider 실측** — gemini 경로로 토큰/비용/실패율/JSON 스키마 준수율 측정 + claimGuard 룰셋(seed-design §7 [B]) 병행.
5. 매장 노출 전 **약무·법무 검토** 게이트 유지.

---

## 11. 비범위 준수 확인

| 항목 | 결과 |
|---|---|
| DB insert/update/delete | 0 |
| SharedProductDescription / ProductMaster / ProductIdentifier 생성 | 0 |
| ProductCandidate status 변경 | 0 |
| 대량 AI 생성 | 0 (샘플 12 render, 초안 4 평가) |
| admin UI / migration / 배포 | 0 |
| 원료 데이터 신규 수집 | 0 |
| 효능/질병 표현 일괄 금지 룰셋 구현 | 0 (프롬프트 지침으로만) |
| secret/API key/토큰 문서화 | 0 |
| raw/seed 대량 커밋 | 0 (scratchpad only) |

---

## 12. 검증 결과

```
npx tsc --noEmit -p tsconfig.json   → 신규 파일 에러 0 (전체 1건은 marketTrialController, 무관·기존)
hff:store-desc:ai-draft-dry-run     → 12 seed 계층 샘플 render-only, live 호출 0
git diff --check                    → clean
```

산출물:
```
apps/api-server/src/modules/neture/drug-import/health-functional-food-store-description.prompt.ts
apps/api-server/src/scripts/health-functional-food-store-description-ai-draft-dryrun.ts
apps/api-server/package.json  (hff:store-desc:ai-draft-dry-run)
docs/checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-AI-DRAFT-DRYRUN-V1.md
```

**최종:** 매장 설명 생성 프롬프트·seed 는 원문 밖 효능 생성 0·의약품 단정 0·caution 보존으로 검증됐다(GO). bulk dry-run 은 (1) 원료/수출용 pre-filter, (2) terse-claim 플래그, (3) live provider 비용 실측, (4) claimGuard 룰셋, (5) 약무·법무 검토를 조건으로 진행한다.
