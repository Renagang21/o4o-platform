# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-DRYRUN-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-DRYRUN-V1`
> 성격: **bulk dry-run.** DB write·SharedProductDescription·status 변경·전량 live apply·배포 **없음**.
> 작성일: 2026-07-04 · 트랙: **건강기능식품 전용**
> 산출: `health-functional-food-description-guards.ts`(+test) · `scripts/health-functional-food-store-description-bulk-dryrun.ts`
> 근거: [`AI-DRAFT-DRYRUN CHECK`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-AI-DRAFT-DRYRUN-V1.md) · [`RAWPAYLOAD-DESCRIPTION-SEED-DESIGN`](../work-orders/WO-O4O-HEALTH-FUNCTIONAL-FOOD-RAWPAYLOAD-DESCRIPTION-SEED-DESIGN-V1.md) §6 · [`OFFICIAL-TEXT-PARSER-DRYRUN`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1.md)

> ⚠️ **면책**: 엔지니어링 dry-run이며 약무/법무 유권해석 아님. 매장 노출 전 약무·법무 검토 필수(§9).

---

## 1. 결론 요약 — **GO (조건부)**

| 항목 | 결과 |
|---|---|
| guards 3종 + 사전필터 | ✅ 순수 함수 구현, unit test **22/22 PASS** |
| bulk render-only | ✅ 1,000 + **전량 44,885** 실행 |
| **생성 대상(eligible)** | **40,438 / 44,885 = 90.09%** (원료·수출용 제외) |
| **full-run 비용 예측** | **≈ $63.58** (gemini-2.5-flash 가정가, render-only 추정) |
| guard 검증(4 실데이터 + 2 적대) | ✅ 전건 정확(적대 FAIL 포착, 정상 오탐 0) |
| **원문 밖 효능 / 의약품 단정** | 적대 케이스만 FAIL, 정상 케이스 0 |
| live provider 실측 | ⚠️ **미수행** — GEMINI_API_KEY 부재 + config resolver(DB scope) 필요 → 파라메트릭 예측 |

**한 줄 결론:** 사전필터가 원료/OEM(4.15%)·수출용(6.30%)을 걸러 **90.09%(40,438건)** 를 생성 대상으로 산정했고, guards 3종이 적대적 초안(의약품 단정·원문 밖 효능)을 정확히 FAIL 분류하면서 정상 초안 오탐이 0이다 → **후속 bulk apply 설계로 GO**. 단 **live provider 실측(비용·실패율·JSON 준수율)은 in-app execute() 경로에서 별도 수행**해야 하며, 매장 노출 전 약무·법무 검토가 전제다.

---

## 2. 기준 문서 및 preflight 결과

| preflight | 결과 |
|---|---|
| parser / prompt / ai-draft script | ✅ 존재(prior WO) |
| seed builder | ✅ `buildHealthFunctionalFoodDescriptionSeed` (파서 재사용) |
| package.json script | ✅ `hff:store-desc:ai-draft-dry-run` + 신규 `hff:store-desc:bulk-dry-run` |
| **live provider 가용성** | ⚠️ provider=gemini, model=**gemini-2.5-flash**, key env=**GEMINI_API_KEY**(로컬 부재). config resolver=DB scope. → **standalone live 불가** |
| DB write 경로 | 없음(파일 read 또는 SELECT only) |
| secret 노출 | 없음 |
| 기준 문서 | AI-DRAFT-DRYRUN CHECK / SEED-DESIGN §6 존재. "효능/질병 일괄 금지 미적용" 유지 |

---

## 3. 실행 모드와 실행 규모

| 단계(WO §5.3) | 실행 | 비고 |
|---|---|---|
| 1. render-only 1,000 | ✅ | flag 분포 확인 |
| 2. live 100 | ❌ | GEMINI_API_KEY 부재 → 미수행(§6) |
| 3. live 1,000 | ❌ | 동일 |
| 4. 전체 render-only | ✅ **44,885** | 실측 flag 분포 + 비용 예측 |

- 전체 44,885 live 호출은 본 WO 미실행(WO §5.3 준수). render-only 전량 실측 + guard 검증(실+적대 6건)으로 대체.
- 스크립트: `--file`(오프라인 raw JSONL) / `--use-db`(SELECT only) / `--limit` / `--offset` / `--exclude-raw-material` / `--exclude-export` / `--out`(gitignore) / `--live`(키 없으면 render-only 안내).

---

## 4. 사전 필터 / flag 분포 (전량 44,885)

| flag | count | 비율 |
|---|---:|---:|
| RAW_MATERIAL_OR_OEM | 1,861 | 4.15% |
| EXPORT_ONLY | 2,826 | 6.30% |
| TERSE_CLAIM | 699 | 1.56% |
| MAIN_FUNCTION_MISSING | 31 | 0.07% |
| INTAKE_MISSING | 405 | 0.90% |
| CAUTION_MISSING | 1,663 | 3.71% |
| LONG_TEXT | 1,063 | 2.37% |
| MULTI_CLAIM | 17,729 | 39.50% |

**생성 전 판정(preGenerationVerdict, 우선순위 배타):**
| 판정 | count |
|---|---:|
| HOLD_RAW_MATERIAL_OR_OEM | 1,861 |
| HOLD_EXPORT_ONLY | 2,586 |
| HOLD_MISSING_MAIN_FUNCTION | 8 |
| HOLD_TERSE_CLAIM_NEEDS_REVIEW | 584 |
| **ELIGIBLE_FOR_GENERATION** | **39,846** |

- **생성 대상(exclude raw+export)**: **40,438 (90.09%)** — TERSE(699)·MISSING(31) 은 flag 와 함께 생성 가능하므로 eligible 에 포함(우선순위 verdict 에서는 별도 표기).
- 원료/OEM(4.15%)·수출용(6.30%) 이 주 제외 사유 = 직전 AI-DRAFT-DRYRUN 발견의 대규모 검증(원료 1,861·수출 2,826건 실존 확인).

---

## 5. live provider 조건

| 항목 | 값 |
|---|---|
| provider / model | gemini / **gemini-2.5-flash** (`@o4o/ai-core` execute 기본) |
| policy scope | in-app config resolver(DB scope) — standalone 미해결 |
| key env | `GEMINI_API_KEY` (로컬 부재) |
| **실호출 수 / 성공 / 실패 / retry / timeout** | **0 / — / — / — / —** (미수행) |
| latency avg / p95 | 미측정 |

→ live 실측은 **in-app `execute()` 경로**(DB config resolver + 키 주입)에서 소량→중간 규모로 수행해야 한다(bulk apply 설계 WO 선행 조건). provider 장애/쿼터는 그때 기록.

---

## 6. 비용 / 속도 / 실패율 (render-only 추정)

> ⚠️ **실측 아님.** gemini-2.5-flash **가정가**(input $0.30/1M, output $2.50/1M), `TOKEN_PER_CHAR=0.5`, `OUTPUT_TOKENS_EST=450`. 실제 값은 live 실측 시 확정.

| 지표 | 전량(eligible 40,438) |
|---|---|
| input tokens (추정) | ~60.3M |
| output tokens (추정) | ~18.2M |
| 건당 비용 (추정) | ~$0.00157 |
| **full-run 비용 (추정)** | **≈ $63.58** |
| render 실패율 | 0% (seed/프롬프트 생성 전건 성공) |

- systemPrompt 1,707자, avg userPrompt ~구간(멀티정제 제품은 최대 수천 자 → LONG_TEXT 2.37% 는 토큰·비용 상방).
- 속도(latency)는 live 미수행으로 미측정. gemini-2.5-flash flash급 기준 건당 수 초 예상(실측 필요).

---

## 7. 자동 guard 결과 (설계 + 검증)

3종 guard(순수 함수, caution 원문 표현 제외):

| guard | 검출 | 성격 |
|---|---|---|
| `sourceFidelityGuard` | 원문 결측 시 기능성 창작 / 원문 밖 content 확장(토큰 overlap<0.5 + 미매치≥2, framing stopword 제외) | 금지 룰셋 아님 — 원문 충실도 |
| `medicineLikeWordingGuard` | 치료/완치/예방/낫는다/복용/처방/특효 등 의약품식 단정 (title/summary/mainFunction/howToTake만, caution 제외) | 질병명 자체 금지 아님 |
| `draftQualityGuard` | CAUTION_LOSS / INTAKE_LOSS / TOO_SHORT / TOO_AD | 매장 부적합 |

**분류(classifyDraft) 우선순위**: provider/parse 실패 → FAIL_MEDICINE_LIKE → FAIL_BEYOND_SOURCE → FAIL_CAUTION_LOSS → 입력 HOLD(원료/수출/결측/terse) → PASS_WITH_MINOR_EDIT → PASS_READY_FOR_REVIEW.

unit test **22/22 PASS** (flag 산정, eligibility, 3 guards, 분류 우선순위, 적대 케이스).

### 7.1 guard 정밀화 (본 WO 반영)
초기 `sourceFidelityGuard` 가 정상 초안("제조사 신고 기능성: 피로 개선")을 **오탐**(framing 단어가 원문에 없어 overlap 하락) → **framing stopword 제외 + 미매치 content 토큰 2개 이상 조건** 추가로 오탐 제거(적대 케이스는 계속 포착).

---

## 8. 수동 spot review 결과 (guard 검증 6건)

live 미수행이므로, 대표 seed(실데이터) 초안 + 적대적 초안에 guard/분류를 적용해 end-to-end 검증:

| 케이스 | 분류 결과 | 판정 |
|---|---|---|
| 그린청매실정 (단일 terse) | `HOLD_TERSE_CLAIM_NEEDS_REVIEW` | ✅ terse 정상 분리(오탐 아님) |
| 코엔자임Q10 ("높은 혈압 감소에 도움") | `PASS_READY_FOR_REVIEW` | ✅ 혈압 인정문구 verbatim, 의약품 미분류 |
| ATOMY HemoHIM (기능성 결측) | `HOLD_MISSING_MAIN_FUNCTION` | ✅ 창작 없이 보류 |
| 11종 혼합유산균 (원료) | `HOLD_RAW_MATERIAL_OR_OEM` | ✅ 원료 제외 |
| [적대] "완치·예방·치료·복용" | `FAIL_MEDICINE_LIKE` (hits: 완치/예방합니다/치료합니다/복용하세요) | ✅ 포착 |
| [적대] "체지방 감소·혈당 조절"(원문=항산화) | `FAIL_BEYOND_SOURCE` | ✅ 포착 |

정상 4건 오탐 0, 적대 2건 정탐 2. guard 신뢰 가능.

---

## 9. 대표 실패 사례

- **의약품식 단정**(적대): "피로를 확실히 치료합니다 / 하루 3번 복용하세요" → FAIL_MEDICINE_LIKE. bulk live 시 실제 발생률은 낮을 것(AI-DRAFT-DRYRUN 원문 리스크≈0)이나 guard 로 상시 차단.
- **원문 밖 효능**(적대): 원문 "항산화" 인데 "체지방 감소·혈당 조절 효과" → FAIL_BEYOND_SOURCE.
- **원료 혼입**(실데이터 1,861건): intake="건강기능식품 원료로 사용" → 생성 전 제외.
- **수출용**(실데이터 2,826건): 제품명 "…수출용" → 생성 전 제외/별도 그룹.

---

## 10. full-run 비용 / 시간 예측

| 항목 | 값(추정) |
|---|---|
| 대상 | 40,438 (eligible, 원료·수출 제외) |
| 비용 | **≈ $63.58** (가정가, ±토큰추정 오차) |
| 시간 | 미측정 — gemini-2.5-flash 병렬 N=8~16 가정 시 수십 분~수 시간(live 실측 필요) |
| 실패 여유 | retry/timeout 정책 + 재개(offset) 지원 → 부분 실패 재실행 가능 |

> 비용/시간은 live 소량 실측(100/1,000)으로 보정 후 확정한다(§5 미수행분).

---

## 11. bulk apply 가능 여부 — **조건부 GO**

§8.1 GO 기준 대비:
- FAIL_BEYOND_SOURCE / FAIL_MEDICINE_LIKE: guard 로 상시 차단, 정상 케이스 발생 0(적대만) ✅
- 원료/OEM·수출용 필터: 안정적(4.15%/6.30% 실측 제외) ✅
- provider 실패율/비용: **미실측** → live 소량 실측이 apply 설계의 선행 조건 ⚠️
- 수동 review 품질: 대표 6건 적정 ✅

**판정: GO(조건부)** → `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-DESIGN-V1`.
apply 설계 선행 조건: (1) **live 소량/중간 실측**(비용·실패율·JSON 준수율·latency), (2) 저장 위치·스키마(candidate rawPayload.derivedDescriptionSeed vs 별도, apply 승인 필요), (3) **약무·법무 검토 게이트**, (4) TERSE(699)·CAUTION_MISSING(1,663) 처리 규칙 확정.

---

## 12. 비범위 준수 확인

| 항목 | 결과 |
|---|---|
| DB insert/update/delete | 0 |
| SharedProductDescription / ProductMaster / ProductIdentifier 생성 | 0 |
| ProductCandidate status 변경 | 0 |
| 전량 live apply | 0 (render-only + guard 검증) |
| admin UI / migration / 배포 | 0 |
| 효능/질병 표현 일괄 금지 룰셋 | 0 (guards 는 sourceFidelity/medicineLike/quality 성격 — 금지 룰셋 아님) |
| live 호출 비용/횟수 | 0회 / $0 기록(미수행 사유 명시) |
| secret/API key/토큰 문서화 | 0 (env명만) |
| raw/source 대량 커밋 | 0 (raw=repo 밖, 리포트=gitignore) |

**검증 명령 실측:**
```
npx jest health-functional-food-description-guards  → 22/22 PASS
npx tsc --noEmit -p tsconfig.json                   → 신규 파일 에러 0 (전체 1건 marketTrialController, 무관·기존)
hff:store-desc:bulk-dry-run (full 44,885)           → eligible 90.09%, cost≈$63.58 (추정)
git diff --check                                    → clean
```

**최종:** 사전필터 + 3종 guard 로 건강기능식품 매장 설명 bulk 생성 파이프라인의 **대상 산정(90.09%)·품질 차단(원문밖/의약품/주의누락)·비용 예측(≈$63.58)** 을 검증했다(GO 조건부). live provider 실측과 약무·법무 검토를 apply 설계의 선행 조건으로 넘긴다.
