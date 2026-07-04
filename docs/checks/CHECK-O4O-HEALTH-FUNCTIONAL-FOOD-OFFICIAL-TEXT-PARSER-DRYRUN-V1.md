# CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1

> WO: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1`
> 성격: **Gate C 준비 / read-only dry-run.** DB write·SharedProductDescription·AI·ProductMaster·migration·배포 **없음**. 순수 parser + unit test + read-only dry-run.
> 작성일: 2026-07-04 · 트랙: **건강기능식품 전용**
> 선행: [`CHECK-...-GATE0-V1`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-SEED-GATE0-V1.md) · [`CHECK-...-GATE-B-PREREQUISITE-SOURCE-AUDIT-V1`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-GATE-B-PREREQUISITE-SOURCE-AUDIT-V1.md)
> 산출 코드: `apps/api-server/src/modules/neture/drug-import/health-functional-food-official-text.parser.ts` · `__tests__/health-functional-food-official-text.parser.test.ts` · `apps/api-server/src/scripts/health-functional-food-official-text-parser-dryrun.ts`

---

## 1. 결론 요약 — **GO** (→ STORE-DESCRIPTION-GUIDELINE)

| 항목 | 결과 |
|---|---|
| parser 작성 | ✅ 순수 함수(`parseHealthFunctionalFoodOfficialText` + `normalizeOfficialTextField` + `classify...`) |
| unit test | ✅ **19/19 PASS** (jest) |
| read-only dry-run | ✅ 전량 44,885 오프라인 실행(raw JSONL = rawPayload.source 동일 데이터) |
| **파싱 성공률** | **100.00%** (44,885/44,885, parsedSectionCount>0) |
| 설명 핵심필드 존재율 | mainFunction 99.93% · intake 99.10% · baseStandard 99.99% (전부 >96%) |
| **원문 claim 리스크** | **거의 0** — 기능성/섭취 필드 disease-claim 키워드 **1건/44,885** (MAIN_FNCTN 은 식약처 승인 기능성 문구라 규제됨) |
| 설명 적합성 | READY_FOR_GUIDELINE **44,852 (99.9%)** · PARTIAL 32 · REVIEW_RISK 1 · INSUFFICIENT 0 |

**한 줄 결론:** 건강기능식품 공식 텍스트는 **파싱 성공률 100%, 설명 핵심필드 존재율 96~100%** 로 매장용 설명 생성 준비에 충분하다 → **GO, 후속 `STORE-DESCRIPTION-GUIDELINE` WO 진행.** 단, **원문 자체의 불법 효능표현 리스크는 사실상 0**(승인 기능성 문구)이고, **리스크는 AI 재작성 단계에 있다** — 가이드라인의 검수 초점은 원문 필터가 아니라 생성 규칙이어야 한다(§9·§11).

---

## 2. 입력 데이터 범위

- 대상: `ProductCandidate` where `source_label = 'MFDS_HEALTH_FUNCTIONAL_FOOD'` (44,885건, status pending). Gate A apply 완료분.
- 파서 입력 = `raw_payload.source` 의 건강기능식품 item(11필드). Gate A mapper 가 원본 item 을 `raw_payload.source` 에 무손실 보존(GATE0 §4).
- 본 dry-run 은 **DB 방화벽/병렬세션 clobber 회피**를 위해 동일 데이터인 **repo 밖 raw JSONL**(`G:\...\mfds-health-functional-food-info-raw.jsonl`, 44,885 line)을 오프라인 파싱했다. rawPayload.source == raw item 이므로 지표는 DB 적재분과 동치. (dry-run script 는 `--use-db` 읽기전용 경로도 제공)

---

## 3. 실제 raw_payload 필드 목록 + alias mapping

건강기능식품 item 실측 필드는 **11개**이며, WO §5 가 후보로 든 `PRDLST_NM`/`BSSH_NM` 은 **이 데이터셋 필드명이 아니다**(타 식품 API 명칭). 실제 명칭으로 매핑한다.

| 실제 필드 | 의미 | 섹션 매핑 | WO §5 후보명 |
|---|---|---|---|
| `PRDUCT` | 제품명 | productName(trim) | (PRDLST_NM 아님) |
| `ENTRPS` | 업체명 | manufacturerName | (BSSH_NM 아님) |
| `STTEMNT_NO` | 품목제조신고번호 | sttemntNo(식별자) | 동일 |
| `MAIN_FNCTN` | 주된 기능성 | **sections.mainFunction** | 동일 |
| `SRV_USE` | 섭취방법/용도 | **sections.intake** | 섭취방법 |
| `INTAKE_HINT1` | 섭취 시 주의사항 | **sections.caution** | 주의사항 |
| `BASE_STANDARD` | 기준·규격 | **sections.baseStandard** | 기준규격 |
| `SUNGSANG` | 성상 | sections.appearance | 성상 |
| `PRSRV_PD` | 보관조건 | sections.storage | 보관방법 |
| `DISTB_PD` | 유통기한 | sections.shelfLife | 소비/유통기한 |
| `REGIST_DT` | 등록일자 | (섹션 아님, 메타) | 등록일자 |

**원료명/주원료/기능성 원료 필드는 이 데이터셋에 없음** → `sections.ingredients` 는 **항상 부재**. (설명에서 원료 표기 필요 시 별도 원천 — §11 리스크)

---

## 4. parser 설계

파일: `health-functional-food-official-text.parser.ts` (순수 함수, DB/네트워크/파일/AI 미접근).

- `normalizeOfficialTextField(raw)`: null/공백 → ''; HTML entity decode; `<br>`/`<p>`/`</li>` → 줄바꿈, `</td>` → 탭, 기타 태그 제거; **ㆍ(가운뎃점 불릿) → 줄바꿈**; CRLF 정리·중복공백 축소. **`;` 와 `-` 는 내용(예: "1-2정", "비타민-C")일 수 있어 분리하지 않음** — 숫자/단위/원료명 보존, 지나친 재작성 금지(WO §6.1).
- `parseHealthFunctionalFoodOfficialText(item)` → `{ sourceKind, sttemntNo, productName, manufacturerName, sections, flags, metrics }`.
  - flags: `RAW_PAYLOAD_MISSING` / `RAW_TEXT_MISSING` / `MAIN_FUNCTION_MISSING` / `INTAKE_MISSING` / `BASE_STANDARD_MISSING` / `HAD_HTML` / `RISK_DISEASE_CLAIM`.
  - metrics: `sourceFieldCount` / `parsedSectionCount` / `textLength`.
- `classifyHealthFunctionalFoodDescriptionSuitability(result)` → `READY_FOR_GUIDELINE` / `PARTIAL_TEXT_ONLY` / `REVIEW_RISK_CLAIM` / `INSUFFICIENT_TEXT` / `RAW_PAYLOAD_MISSING`.
- **RISK 스캔 범위(핵심 설계 결정)**: 질병 치료/예방 암시 키워드(`치료|완치|치유|질병|질환|예방|진단|처방|의약품|부작용|억제제|항암|당뇨|고혈압|…`)는 **claim-bearing 섹션(mainFunction + intake)만** 검사한다. caution(주의사항)의 "질환이 있거나 의약품 복용 시 상담/부작용" 은 **법정 표준 안내문**이라 여기에 걸면 전건 오탐(§9). 위험 문구는 **flag 로만 분리**하고 삭제/치환하지 않는다(원문 보존).
- 위치: 기존 HFF 트랙 파서(`health-functional-food-jsonl.parser.ts`)와 동일 디렉터리(`drug-import/`)에 배치 — WO 의 권장 경로(`health-functional-food/`) 대신 **기존 트랙 일관성** 우선(선례 parser/mapper/test 전부 여기 위치).

---

## 5. unit test 결과

`npx jest health-functional-food-official-text.parser` → **19/19 PASS**.

WO §6.2 필수 9케이스 전부 커버: ① 정상 full · ② MAIN_FNCTN만 · ③ INTAKE_HINT1만 · ④ BASE_STANDARD만 · ⑤ HTML entity/br(HAD_HTML) · ⑥ 줄바꿈/중복공백 정규화 · ⑦ 빈문자/null(RAW_PAYLOAD/RAW_TEXT_MISSING) · ⑧ 질병 치료/예방 단어(RISK_DISEASE_CLAIM, 원문 보존 확인) · ⑨ 숫자/단위/원료명 손실 없음. + normalize 세부(하이픈/세미콜론 보존) + 적합성 분류 5케이스.

---

## 6. dry-run 실행 조건

- 명령: `pnpm --filter @o4o/api-server hff:official-text:dry-run -- --file "<raw jsonl>"` (오프라인, read-only) 또는 `--use-db --limit N` (DB SELECT only).
- read-only 보장: 파일 read 또는 `SELECT raw_payload FROM product_candidates WHERE source_label=$1 AND deleted_at IS NULL`. **INSERT/UPDATE/DELETE 없음.** 후보 status/matchStatus 무변경.
- 기본 `--no-sample-out`(원문 대량 파일 미저장). `--sample-out` 은 gitignore 경로만.
- 본 실행: 전량 44,885(오프라인 raw JSONL). DB `--use-db` 는 방화벽/병렬세션 리스크로 미실행(경로는 제공·준비됨).

---

## 7. 파싱 성공률 / 결손률

| 지표 | 값 |
|---|---|
| total | 44,885 |
| rawPayloadMissing | 0 |
| **parseSuccess (parsedSectionCount>0)** | **44,885 (100.00%)** |
| RAW_TEXT_MISSING | 0 |
| 식별자 존재(sttemntNo/productName/manufacturer) | 44,885 / 44,885 / 44,885 (100%) |
| textLength avg / median / max | 728 / 593 / 5,969 |

파싱 손실 0. 전건 최소 1개 이상 설명 섹션 확보.

---

## 8. 필드별 존재율 (섹션 = 정규화 후 비어있지 않은 값)

| 섹션 (원천 필드) | 존재 | 존재율 | 결손 flag |
|---|---:|---:|---:|
| mainFunction (`MAIN_FNCTN`) | 44,854 | **99.93%** | MAIN_FUNCTION_MISSING 31 |
| intake (`SRV_USE`) | 44,480 | 99.10% | INTAKE_MISSING 405 |
| caution (`INTAKE_HINT1`) | 43,222 | 96.29% | — |
| baseStandard (`BASE_STANDARD`) | 44,881 | **99.99%** | BASE_STANDARD_MISSING 4 |
| appearance (`SUNGSANG`) | 44,867 | 99.96% | — |
| storage (`PRSRV_PD`) | 44,470 | 99.08% | — |
| shelfLife (`DISTB_PD`) | 44,883 | **100.00%** | — |
| ingredients | 0 | **0%** | 원천 필드 부재(§3) |
| HAD_HTML | 9 | 0.02% | 마크업 극소수(정규화됨) |

설명 생성 핵심 3필드(mainFunction/intake/baseStandard) 존재율 99% 이상. 원료(ingredients)만 원천 부재.

---

## 9. risk flag 분포 (핵심 발견)

| 스캔 범위 | RISK_DISEASE_CLAIM | 해석 |
|---|---:|---|
| **claim 필드(mainFunction + intake)만** — 채택 | **1 / 44,885 (0.002%)** | MAIN_FNCTN 은 **식약처 승인 기능성 문구**라 불법 효능표현 거의 없음 |
| (참고) 전체 섹션 광범위 스캔 | 30,367 / 44,885 (67.7%) | caution 의 "질환/의약품/부작용" 표준 안내문 대량 오탐 — **claim 아님** |

**발견:** 원문 공식 텍스트 자체의 불법 효능표현 리스크는 사실상 **0**(1건만 수동 검토). 광범위 스캔의 67.7% 는 주의사항 boilerplate 로, 실제 리스크가 아니다. → **위험은 원문이 아니라 AI 재작성 단계에 있다.** 가이드라인은 원문 필터가 아니라 **생성 시 효능·질병 표현 금지 규칙 + caution 원문 보존**에 초점을 둔다.

---

## 10. 설명 생성 적합성 분류 결과

| 분류 | count | 비율 | 의미 |
|---|---:|---:|---|
| **READY_FOR_GUIDELINE** | **44,852** | **99.93%** | 기능성 + (섭취/기준) + 충분 텍스트 |
| PARTIAL_TEXT_ONLY | 32 | 0.07% | 일부 텍스트만 |
| REVIEW_RISK_CLAIM | 1 | 0.002% | claim 필드 위험문구 — 수동 검토 |
| INSUFFICIENT_TEXT | 0 | 0% | — |
| RAW_PAYLOAD_MISSING | 0 | 0% | — |

거의 전량이 설명 생성 준비 완료 상태.

---

## 11. 후속 `STORE-DESCRIPTION-GUIDELINE` WO로 넘길 결정

**판정 = GO (WO §9.1).** 다음: `WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-GUIDELINE-V1`.

**설명 생성에 사용 가능한 필드:**
- `mainFunction`(기능성) — **핵심**. 단 원문 그대로 노출/재작성 시 승인 문구 범위 유지(효능 강화 금지).
- `intake`(섭취방법), `storage`(보관), `shelfLife`(유통기한), `appearance`(성상) — 사실정보. 그대로 참고 가능.
- `baseStandard`(기준규격) — **내부 참고**(소비자 문구 부적합, 기술 규격).

**설명 생성 시 주의(가이드라인으로 넘길 규칙):**
- `caution`(주의사항) — **원문 그대로 보존·노출**. 소비자 문구로 재작성 금지(법정 안내).
- **질병 치료/예방/진단 암시 표현 금지** — 원문엔 거의 없으나(§9) AI 재작성에서 발생 가능. 이것이 가이드라인의 1순위.
- `ingredients` **부재** — 원료 표기가 필요하면 별도 원천 확보 전까지 원료 문구 생성 금지.
- 승인 기능성 표현("~에 도움을 줄 수 있음", "~위험 감소에 도움") 범위 밖 확대 금지.

**제외/보류:**
- `SharedProductDescription` 테이블 파생·저장 = Gate C, 별도 WO(ProductMaster 부재로 master 기반 파생은 불가 — 후보 rawPayload 소비 경로로 설계).

---

## 12. read-only 준수 증거

| 항목 | 결과 |
|---|---|
| parser DB/네트워크/파일/AI 접근 | **0** (순수 함수) |
| dry-run DB write / mutation | **0** (파일 read 또는 SELECT only) |
| ProductMaster/Identifier/Image/SharedProductDescription 생성 | **0** |
| 후보 status/matchStatus 변경 | **0** |
| migration / 배포 / admin UI 수정 | **0** |
| AI 호출 / 프롬프트 | **0** |
| 공식 원문 → 소비자 문구 재작성 | **0** (구조화·평문화만) |
| secret/API key/토큰 문서화 | **0** |
| raw 대량 파일 커밋 | **0** (raw 는 repo 밖 G:드라이브) |

**검증 명령 실측:**
```
npx jest health-functional-food-official-text.parser  → 19/19 PASS
npx tsc --noEmit -p tsconfig.json                     → 신규 파일 에러 0 (전체 1건은 marketTrialController, 무관·기존)
git diff --check                                      → clean
```

이번 변경 = parser 1 + test 1 + dry-run script 1 + package.json script 1줄 + CHECK 1.

---

## 부록. 산출물 파일

```
apps/api-server/src/modules/neture/drug-import/health-functional-food-official-text.parser.ts
apps/api-server/src/modules/neture/drug-import/__tests__/health-functional-food-official-text.parser.test.ts
apps/api-server/src/scripts/health-functional-food-official-text-parser-dryrun.ts
apps/api-server/package.json  (hff:official-text:dry-run 스크립트)
docs/checks/CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-OFFICIAL-TEXT-PARSER-DRYRUN-V1.md
```
