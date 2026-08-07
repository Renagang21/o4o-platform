# WO-O4O-HFF-EN-FULL-40902-SEMANTIC-LINGUISTIC-QUALITY-CENSUS-AND-REPAIR-PLANNING-V1 — CHECK

HFF 영어 STORE canonical **40,902건 전수** 품질 census. EN 을 타 언어 기준본(pivot)으로 쓸 수 있는지 판정.

| 항목 | 값 |
|------|----|
| 착수 HEAD | `7ff4624aae4527e3e073d664d27419dd310f3e38` |
| 브랜치 | `main` |
| DB | 프로덕션 `o4o_platform` (Cloud SQL Auth Proxy `:5531`) — **read-only, write 0** |
| 판정 | **완료 — EN 은 현 상태로 pivot 사용 불가** |

> ## 결론
> **EN canonical 을 JA/ZH 등 타 언어의 번역 기준본으로 사용할 수 없다.**
> 40,902건 중 **40,896건(99.99%)** 에 한글 미번역 구간이 남아 있고(문서당 중앙값 31토큰),
> 기능성 누락 4,802문서 · 원료명-기능성 문장 붙음 58,734 인스턴스가 확인됐다.
> 단순히 "영어가 존재한다"를 PASS 로 보지 않는다는 §실행승인 기준에 따라 **PASS 문서 0건**이다.

---

## 0. 착수 시 타 세션 WIP 감지 (기록)

착수 점검에서 제가 만들지 않은 **staged 삭제 200여 건**(`.vite-cache`, `playwright-report`,
`test-results`, `.github/workflows` 문서)과 미추적 `CHECK-O4O-REPOSITORY-DOCUMENT-SCRIPT-FULL-CLEANUP-V1.md`
가 있었다. 병렬 세션의 저장소 정리 작업이다. §2 에 따라 **일절 손대지 않고** 제 산출물만 path-specific 으로 다뤘다.

`pnpm install` 은 병렬 작업 중단 위험이 있어 실행하지 않고, `require.resolve('pg')` 로 의존성 해석을 확인했다.

## 1. 모집단 재현 (§3) — 과거 수치 미사용, 현재 DB 재계산

`data/hff-en-full-quality-census-v1.json`

| 항목 | 값 |
|------|----|
| KO STORE canonical | **40,918** |
| EN STORE canonical | **40,902** |
| KO 있음 + EN 없음 | **16** |
| KO↔EN 쌍 | **40,902** (`pairsHash bfa70545…`) |
| KO canonical 중복 | **0** |
| EN canonical 중복 | **0** |
| ProductMaster 중복(쌍 내) | **0** |
| EN 비-canonical 행(계약 밖) | 31 (canonical 집합 밖이므로 census 대상 아님) |
| (참고) JA / ZH canonical | 32,270 / 40,918 |

예상값과 일치하나 **전부 현재 DB 에서 재계산한 값**이다.

## 2. 검사 축과 방법 (§9)

기계 검사는 40,902 전수, 의미·언어 검사는 **슬롯 단위 KO↔EN 쌍을 중복 제거**해 수행했다.
같은 EN 문장이 수천 문서에 재사용되므로 소수 패턴이 대다수 문서를 설명한다(§8 군집화 전제).

| 축 | 규모 |
|---|---:|
| 고유 KO↔EN 슬롯 쌍 | **170,578** |
| 그중 실제 번역된 쌍(한글 없음) | **72,640** |
| 한글이 남은 쌍 | **97,938** |
| 고유 EN 문자열 | 135,953 |

### 2-1. 오탐 제거 (중요)

초안 카운터가 대량 오탐을 냈다. **결론 전에 실제 사례를 확인해 축을 교정**했다.

| 초안 | 초안 값 | 확인 결과 | 교정 후 |
|---|---:|---|---:|
| `NUMERIC_DRIFT` | 38,832 | 단위 없는 맨숫자(`1`,`2`=항목번호·`1일 1회`의 어형변화)를 셈 | **1,010** (단위 동반분만) |
| `SPACE_BEFORE_PUNCT` | 64,720 | 대부분 미번역 **한글 구간**에서 발생 — 한글 잔존과 중복 계상 | 별도 계상 폐기 |
| `HANGUL_REMAINS` | 40,896 | **진짜 결함** (`성상`·`고유의`·`[연질캡슐]` 등, 제품명·제조사 제외 후) | 40,896 유지 |
| `LICENSE_LOST` | 77 | **진짜 결함** (`2021-7` 등 개별인정번호 소실) | 77 유지 |

## 3. 검사 결과 — 전수

`data/hff-en-full-quality-summary-v1.json` · `data/hff-en-full-quality-issues-v1.jsonl`

| 항목 | 값 |
|------|----|
| 문서 | 40,902 |
| **PASS 문서** | **0** |
| 문제 문서 | **40,902** |
| issue 총수 | **42,435** |

| 코드 | 유형 | 문서 수 |
|------|------|-------:|
| `HANGUL_RESIDUE` | REPAIR_LINGUISTIC | **40,896** |
| `NUMERIC_DRIFT` | REPAIR_SEMANTIC | 1,010 |
| `ITEM_COUNT_DIFF` | REPAIR_STRUCTURE | 285 |
| `EMPTY_SECTION` | REPAIR_STRUCTURE | 104 |
| `LICENSE_LOST` | REPAIR_SEMANTIC | 77 |
| `SECTION_COUNT_DIFF` | REPAIR_STRUCTURE | 63 |
| `STRUCTURE_DIFF`(태그 패리티) | REPAIR_STRUCTURE | 0 |

별도 축(문서 인스턴스 기준):

| 코드 | 유형 | 규모 |
|------|------|---|
| `WORD_CONCATENATION` | REPAIR_LINGUISTIC | 12,702 쌍 / **58,734 인스턴스** |
| `FUNCTIONAL_CLAIM_LOSS` | REPAIR_SEMANTIC | 671 쌍 / **4,802 문서** |
| `TERM_VARIANTS` | REPAIR_TERMINOLOGY | KO 개념 **1,375** / 325,879 인스턴스 |

## 4. 한글 잔존의 정체 — 섹션 2개에 집중 (§8 군집화)

문서당 중앙값 **31 토큰**, 최대 86, 고유 한글 토큰 32,146. `<h2>` 섹션으로 귀속시킨 결과:

| EN 섹션 | 영향 문서 | 잔존 토큰 |
|---|---:|---:|
| **Labelled standard** (확인 가능한 기준·규격 정보) | **40,896** | 969,323 |
| **Speak to our in-store expert** (매장 전문가 문의 안내) | **25,404** | 304,848 |
| Why this product | 489 | 506 |
| Officially recognised functions | 34 | 121 |

**즉 EN 생산이 기준·규격 섹션과 전문가 안내 섹션을 번역하지 않고 KO 원문 그대로 넣었다.**

| 대표 잔존 문구 | 문서 |
|---|---:|
| `섭취 방법이나 본인 상태에 맞는지 궁금하시면 매장 내 약사 등 전문가에게 문의하십시오.` | **25,404** |
| `성상 : 고유의 향미가 있고 이미…` | 1,169 |
| `개봉 후에는 공기의 노출을 최대한 차단하여 보관하십시오.` | 932 |
| `어린이 손에 닿지 않는 곳에 보관하십시오.` | 819 |

> **전문가 안내 25,404건은 고정 문장 1개**다 — 문장 하나를 번역하면 25,404 문서가 해소된다.

## 5. 의미 오류 — 기능성 누락이 가장 위험

`FUNCTIONAL_CLAIM_LOSS` 671쌍 / 4,802문서. KO 가 나열한 기능성 개수를 EN 이 담지 못했다.

| KO | EN | 누락 | 문서 |
|---|---|---|---:|
| `면역력 증진·피로개선·혈소판 응집억제를 통한 혈액흐름·기억력 개선·항산화에 도움을 줄 수 있음` | `May help improve blood circulation by inhibiting platelet aggregation.` | **5→1 (4개 누락)** | **1,066** |
| `기억력 개선·혈행 개선에 도움을 줄 수 있음` | `May help improve memory.` | 2→1 | 226 |
| `혈중 중성지질 개선·혈행 개선에 도움을 줄 수 있음` | `May help improve blood triglycerides.` | 2→1 | 157 |
| `혈중 중성지질 개선·혈행 개선·건조한 눈…` | `May help improve blood triglycerides, improve blood circulation.` | 3→2 | 152 |

**공식 인정 기능성이 소비자 설명서에서 사라진 것**이므로 규제 리스크가 가장 크다.

## 6. 영어 문장 품질 (§6)

**번역된 부분의 영어 자체는 양호하다.** 상위 표본은 자연스러운 영국식 영어였고, 문법 파탄·직역투는
발견되지 않았다 — `Officially recognised functions` · `Speak to our in-store expert` ·
`Needed to protect cells from harmful oxygen species` 등.

규칙으로 확인된 명확한 결함은 **단어 붙음** 하나가 압도적이다.

| 사례 | 문서 인스턴스 |
|---|---:|
| `ZincNeeded for normal immune functionNeeded for normal cell division` | 2,629 |
| `Pantothenic acidNeeded for the metabolism of fat…` | 1,705 |
| `NiacinNeeded for energy production in the body` | 1,643 |
| `Vitamin B6Needed for protein and amino acid utilisation…` | 1,421 |
| `Vitamin DNeeded for the absorption and utilisation of calcium…` | 1,420 |

원료명 라벨과 기능성 본문 사이 **구분자가 빠진 조립 결함**이다. 문구 내용은 온전하므로 표기 분리만으로 해소된다.

기타 명확한 비문은 소수다: `LOWER_SENT_START` 165쌍 · `NOUN_PILEUP` 227 · `UNCLOSED_QUOTE` 26 ·
`DOUBLE_PUNCT` 29 · `DANGLING_CONJ` 10 · `DOUBLE_WORD` 5 · `EMPTY_PAREN` 3 · `DOUBLE_PREP` 1.

## 7. 용어 일관성 (§7)

같은 KO 개념이 여러 EN 으로 갈리는 경우 **1,375개**(325,879 인스턴스). **대부분 무해**하다.

| 유형 | 예 | 판정 |
|---|---|---|
| 대소문자 흔들림 | `Health functional food` / `Health Functional Food` (36,641) | 표준화 권장 |
| 동의 표현 | `2 times a day` / `Twice a day` (14,272) | 통일 불필요 |
| 어휘 선택 | `adverse event` / `adverse reaction` (13,655) | 통일 권장(안전 문맥) |
| 철자 변이 | `hypercalcaemia` / `hypercalcemia` | 영국식으로 통일 |

§7 이 정한 대로 **의미상 모두 자연스럽고 안전하면 통일하지 않았다**. REPAIR 후보는 대소문자·철자 변이와
안전 문맥 어휘로 한정했다.

> **주의 — 제 초안 탐지기의 한계:** "소수 변형이 다른 KO 의 다수 EN 과 같으면 오귀속"이라는 휴리스틱은
> 733건을 잡았으나 대부분이 `…상담할 것` vs `…상담하십시오.` 같은 **무해한 표현 변형**이었다.
> 실제 오귀속은 §5 의 기능성 누락 축에서 잡히며, 그쪽 수치를 신뢰해야 한다.

## 8. 생산 계보 (§8)

EN 은 **2026-07-17 ~ 08-07** 사이에 생성됐고, 생성일 기준 분포는 7/17 3,733 · 7/22 4,219 ·
7/23 2,910 · 7/24 3,821 … 로 여러 배치에 걸쳐 있다. 특기할 점은 **전 배치에서 `updated_at > created_at`**
(생성 후 후속 교정이 있었음)이다. 한글 잔존이 배치와 무관하게 40,896/40,902 에 균일하게 나타나므로
**특정 배치의 사고가 아니라 EN 생산 파이프라인의 구조적 누락**으로 판단한다.

## 9. HOLD 16 재판정 (§10)

`data/hff-en-hold16-reassessment-v1.json`

| 항목 | 값 |
|------|----|
| 대상 | 16 |
| `KO_SOURCE_DAMAGED` | **0** |
| `TRANSLATION_AMBIGUOUS` | **16** |

16건 모두 KO canonical 이 정상 구조(`h2`/`li`)와 충분한 본문(538~1,582자)을 갖추고 있다.
**원인은 원문 손상이 아니라 EN 저작 미완료**다. 이번 WO 에서는 생산하지 않는다(§10).

## 10. 교정 계획 (§12)

`data/hff-en-full-repair-clusters-v1.json` — 클러스터 **10개**.

| 순서 | cluster | 유형 | 영향 | 자동교정 | 재번역 | 회귀위험 |
|---:|---|---|---:|:---:|:---:|---|
| 1 | `C91` FUNCTIONAL_CLAIM_LOSS | SEMANTIC | 4,802 문서 | ✕ | ○ | **HIGH** — 기능성 누락, 개수 대조 게이트 필수 |
| 2 | `C01` Labelled standard 한글 잔존 | LINGUISTIC | 40,896 문서 | ✕ | ○ | LOW |
| 3 | `C02` 전문가 안내 한글 잔존 | LINGUISTIC | 25,404 문서 | ✕ | ○ (문장 1개) | LOW |
| 4 | `C90` WORD_CONCATENATION | LINGUISTIC | 58,734 인스턴스 | **○** | ✕ | LOW — 표기 분리만 |
| 5 | `C13` NUMERIC_DRIFT | SEMANTIC | 1,010 문서 | ✕ | ○ | MEDIUM |
| 6 | `C14` LICENSE_LOST | SEMANTIC | 77 문서 | **○** | ✕ | LOW |
| 7 | `C16` STRUCTURE | STRUCTURE | 452 문서 | ✕ | ○ | MEDIUM |
| 8 | `C92` TERM_VARIANTS | TERMINOLOGY | 1,375 개념 | **○** | ✕ | LOW |
| 9 | `C03·C04` 잔여 섹션 | LINGUISTIC | 523 문서 | ✕ | ○ | LOW |
| 10 | HOLD 16 | — | 16 | ✕ | ○ | — |

**대량 자동 교정 가능**: `C90`(58,734) + `C14`(77) + `C92`(1,375 개념) — 문구 내용을 만들지 않고 표기만 고친다.
**재번역 필요**: `C91` 4,802 + `C01` 40,896 + `C02` 25,404(문장 1개) + `C13` 1,010 + `C16` 452 + 잔여 523.
**개별 롱테일**: 기준·규격 섹션 고유 잔존 문구 **42,610개** — HFF JA 트랙에서 다룬 규격표·성상 계열과 같은 성격이라 동일한 압축 전략(정형 문법 + 원자 저작)을 적용할 수 있다.
**최종 HOLD 예상**: 16 + 구조 손상 개별 건.

### 권장 실행 순서 근거

`C02` 는 **문장 1개로 25,404 문서**를 해소하므로 비용 대비 효과가 가장 크다. 다만 `C91`(기능성 누락)은
규모는 작아도 **공식 인정 기능성이 소비자 설명서에서 사라진 상태**라 규제 리스크가 커서 1순위에 두었다.

## 11. 중지 조건 (§13) — 해당 없음

모집단 재현 성공 · KO↔EN 대응 정상(쌍 40,902, 중복 0) · canonical 중복 0 · read-only 계약 준수.
오류가 많은 것은 중지 사유가 아니다(§13).

## 12. 산출물

| 파일 | 내용 |
|------|------|
| `data/hff-en-full-quality-census-v1.json` | 모집단 실측 · 계약 · EN 생성 계보 |
| `data/hff-en-full-quality-issues-v1.jsonl` | 문서별 issue (다중 기록) |
| `data/hff-en-full-quality-summary-v1.json` | 전체 요약 · 판정 |
| `data/hff-en-full-repair-clusters-v1.json` | 클러스터 10 · 섹션 잔존 순위 · 대표 잔존 문구 200 |
| `data/hff-en-hold16-reassessment-v1.json` | HOLD 16 재판정 |
| `hff-en-census-fetch.mjs` / `-analyze.mjs` / `-cluster.mjs` | 재실행 가능한 census 파이프라인 |

## 13. 계약 준수

| 항목 | 결과 |
|------|:----:|
| **DB write** | **0** (전 단계 `SET default_transaction_read_only = on`) |
| KO·EN·JA·ZH canonical / ProductMaster 수정 | **없음** |
| 타 세션 WIP 접촉 | **없음** |
| `pnpm-lock.yaml` · `package.json` 접촉 | **없음** |
