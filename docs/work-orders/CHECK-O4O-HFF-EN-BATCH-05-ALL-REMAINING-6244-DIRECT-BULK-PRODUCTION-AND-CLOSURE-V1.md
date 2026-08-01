# CHECK — WO-O4O-HFF-EN-BATCH-05-ALL-REMAINING-6244-DIRECT-BULK-PRODUCTION-AND-CLOSURE-V1

- 대상: 건강기능식품(HFF) 매장 설명서 EN canonical, Batch 05 — **5,000 절단 없이 정상 생산 가능 잔여 전량**
- 기준 커밋: `4cbce30e1` (조상 확인 완료)
- 환경: 프로덕션 Cloud SQL (`o4o-platform-db` / `o4o_platform`), Cloud SQL Auth Proxy v2 포트 5621 (이번 세션 기동분만 종료)
- 선행 조건: 편집기 선택 공유 없음(`ide_selection` 미첨부 상태에서 착수)

---

## 1. Batch 05 전체 6,244 상태

| 상태 | 건수 |
|---|---:|
| **CREATED** (신규 EN canonical INSERT) | **6,157** |
| UPDATED | 0 |
| NO_CHANGE | 0 |
| **HOLD** (문제 큐 이관) | **87** |
| FAILED | 0 |
| 합계 검증 | 6,157 + 87 = **6,244** ✅ |

`PENDING_DIRECT_TRANSLATION` / `ASSET_MISSING` / `NO_ENTRY` / `TEMPLATE_UNSUPPORTED` / `LOW_EFFICIENCY` 는 최종 원장에 **한 건도 없다**.

---

## 2. 모집단 게이트

| 게이트 | 결과 |
|---|---|
| 정상 생산 후보 전량 고정 (절단 없음) | ✅ 6,244 = 후보 풀 6,244 |
| 기대값 = 직전 배치 잔여(6,820) − 기존 문제 큐(576) | ✅ 6,244 (상수 아님, 매니페스트에서 재계산) |
| Batch 01~04 중복 | 0 |
| 기존 통합 문제 큐 576건 제외 | ✅ (선정 단계에서 제외) |
| ProductMaster 중복 / koCanonicalId 중복 | 0 / 0 |
| renderer family 미판정 | 0 (DRIVER 6,244) |

---

## 3. 직접 번역 라운드

KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만 치환**한다. 렌더러 계열·절 수·원료 귀속·수치·단위·괄호 용량은 구조상 승계된다.
없는 문장은 제품 문맥에 맞게 신규 번역했고, 문구 자산 부족·저빈도·파서 미지원은 HOLD 사유로 쓰지 않았다.

```
classify (read-only) → render audit (JSDOM + .store-desc-content + computed style, 430/820/1280px) → apply (--apply + CONFIRM)
```

| 라운드 | 적용 | 라운드 | 적용 |
|---|---:|---|---:|
| 초기(사전 재사용) | 4,412 | t7 | 141 |
| t1 | 350 | t8 | 142 |
| t2 | 210 | t9 | 147 |
| t3 | 127 | t10 | 162 |
| t4 | 142 | t11 | 24 |
| t5 | 148 | t12 | 16 |
| t6 | 136 | **합계** | **6,157** |

**신규 문구 번역 수**: t1~t12 합계 약 **1,300 문구** (clause / meta / label 슬롯).
전 라운드 렌더 감사 `totalIssues 0 / verdict PASS`, 적용 시 `koUnchanged: true`, `pmUnchanged: true`.
shard 단위 expected UPDATE·INSERT·SKIP 과 actual 이 매 shard 일치했다(불일치 시 shard 롤백 계약).

기존 확정 규칙을 그대로 유지했다 — `null`/`undefined`/`NaN` 리터럴 → `KO_SOURCE_DAMAGED`, `&lt;원료명&gt;` → `[Ingredient]` 로 귀속 보존, PUA·제로폭 문자는 조회 키에서만 제거(KO 원문 불변), 수치 검증은 번역 슬롯별로만 수행.

### 3-1. 라운드 t10 렌더 감사 FAIL → 교정 → 재검증

t10 최초 렌더 감사에서 1개 제품(3 폭 전부) `MARKER` 로 `verdict: FAIL`. 원인은 KO 원문의 `⓵⓶⓷` 를 EN 에서 원문자 `①②③` 로 옮긴 것이며, 렌더 감사가 원문자 노출을 금지한다. `(1) (2) (3)` 로 교정한 뒤 재분류·재렌더하여 `totalIssues 0 / verdict PASS` 확인 후 적용했다. **FAIL 상태로 적용한 라운드는 없다.**

마지막 잔여 16건은 blockers 추출기가 0을 보고했으나(정규화 텍스트 기준 필터) 분류 원장 `why[]` 를 직접 조회해 14개 미등록 문구를 확인하고 t12 로 해소했다.

---

## 4. 문제 유형별 건수

### 4-1. Batch 05 (87)

| issueType | 건수 | 성격 |
|---|---:|---|
| `NUMBER_STRUCTURE_AMBIGUOUS` | 59 | 한 슬롯에 복수 용량 축이 겹치거나 KO 안에 영문이 중복 병기되어 슬롯 단위 수치 대조가 성립하지 않음 |
| `KO_SOURCE_DAMAGED` | 27 | KO canonical 슬롯이 손상 조각(빈 절/깨진 문자/리터럴 `null`)을 포함 |
| `TRANSLATION_AMBIGUOUS` | 1 | 중첩 마크업·비표준 구분자로 번역 슬롯에 한국어가 남음 |

### 4-2. 통합 큐 (Batch 01~05)

| 구분 | 건수 |
|---|---:|
| Batch 01 | 101 |
| Batch 02 | 122 |
| Batch 03 | 194 |
| Batch 04 | 159 |
| Batch 05 | 87 |
| **합계** | **663** |

| issueType | 건수 |
|---|---:|
| `KO_SOURCE_DAMAGED` | 369 |
| `NUMBER_STRUCTURE_AMBIGUOUS` | 289 |
| `TRANSLATION_AMBIGUOUS` | 5 |

- 중복 0 / 누락 0 (배치별 원장 합과 일치: 101+122+194+159+87 = 663)
- 금지 사유 0 / 분류 체계 밖 사유 0
- 기존 576건은 **원문 그대로 승계**했고 Batch 05 의 87건만 추가했다.
- 기존 576건을 Batch 05 종료 시점 번역 자산으로 read-only 재판정한 결과 **재생산 가능으로 전환된 건 0** — 전량 실제 문제로 유지된다.
- 이번 작업에서 KO canonical 은 한 건도 수정하지 않았다.

각 행에 `batch / productMasterId / koCanonicalId / productName / issueType / problematicSourceText / confirmedFacts / requiredNextAction / retryCondition` 을 기록했다.

---

## 5. expected / actual write

| 항목 | 결과 |
|---|---|
| shard 단위 expected INSERT/UPDATE/SKIP = actual | ✅ 전 shard 일치 |
| 라운드 `enDelta` 합 | 6,157 = 완료 건수 |
| UPDATE 건수 | 0 (전량 신규 INSERT) |
| rollback 발생 | 0 |

---

## 6. 렌더·독립검증 결과

렌더 감사: 430px / 820px / 1280px, `.store-desc-content` 스코프 + computed style 증명(`max-width` 미적용 `""` → 적용 `860px`), 최종 전 라운드 `totalIssues 0 / verdict PASS` (overflow·clipping 0, 번역 슬롯 한국어 0, raw HTML·marker 0, 기능성·라벨·개별인정번호 손실 0).

독립검증 (read-only 재조회):

| 항목 | 결과 |
|---|---|
| Batch 05 상태 합계 6,244 | ✅ |
| KO canonical hash drift | 0 |
| ProductMaster 변경 | 0 |
| EN 증가량 일치 | ✅ |
| canonicalDup | 0 |
| 번역 슬롯 한국어 | 0 |
| 구조 drift (`li`/`h2`/`sd-item`/`sd-tag`/`b`) | 0 |
| Batch 밖 write | 0 |
| 문제 큐 누락·중복 | 0 |
| **verdict** | **PASS** |

---

## 7. 전체 HFF EN 생산 트랙 마감

| 항목 | 값 |
|---|---:|
| Batch 01 완료 / HOLD | 4,899 / 101 |
| Batch 02 완료 / HOLD | 4,878 / 122 |
| Batch 03 완료 / HOLD | 4,806 / 194 |
| Batch 04 완료 / HOLD | 4,841 / 159 |
| Batch 05 완료 / HOLD | **6,157 / 87** |
| **배치 누적 완료** | **25,581** |
| HFF KO canonical (프로덕션 전체) | **40,918** |
| HFF EN canonical (프로덕션 전체) | **40,255** |
| 남은 미번역 | **663** |
| 통합 문제 큐 | **663** |
| **잔여 − 큐** | **0** |

**정상 생산 가능 잔여는 0이다.** 남은 663건은 전량 실제 문제 유형(`KO_SOURCE_DAMAGED` / `NUMBER_STRUCTURE_AMBIGUOUS` / `TRANSLATION_AMBIGUOUS`)의 통합 문제 큐이며, 각 항목의 `requiredNextAction` · `retryCondition` 이 해소된 뒤 별도 WO 로 재생산한다. 이로써 HFF EN 매장 설명서 생산 트랙(Batch 01~05)을 마감한다.

---

## 8. 산출물

| 파일 | 내용 |
|---|---|
| `data/hff-en-batch05-population-all-v1.json` | 모집단 6,244 + 게이트 |
| `data/hff-en-b05-t1..t12-translations-v1.json` | 라운드별 직접 번역 자산 |
| `data/hff-en-batch05-classification-v1.json` | 최종 분류 (PENDING 0) |
| `data/hff-en-batch05-safe-targets-v1.json` | 안전 대상 |
| `data/hff-en-batch05-render-audit-v1.json` | 렌더 감사 PASS |
| `data/hff-en-batch05-apply-results-v1.json` / `-rollback-v1.json` | Apply 결과 / 롤백 계약 |
| `data/hff-en-batch05-closure-v1.json` | Batch 05 종료 선언 |
| `data/hff-en-batch05-completed-v1.json` | 완료 6,157 원장 |
| `data/hff-en-batch05-final-hold-v1.jsonl` | Batch 05 HOLD 87 원장 |
| `data/hff-en-batch05-independent-verification-v1.json` | 독립 검증 PASS |
| `data/hff-en-deferred-issue-queue-through-batch05-v1.jsonl` / `-summary-v1.json` | 통합 문제 큐 663 |
| `data/hff-en-production-completed-through-batch05-v1.json` | 배치 누적 |
| `data/hff-en-production-track-closure-v1.json` | **전체 HFF EN 트랙 마감 선언** |

스크립트: `hff-en-batch05-{population,blockers,classify,render,apply,closure}.mjs`, 번역 엔진 `hff-en-batch-01-translate.mjs`(Batch 05 사전 로더 추가).

---

## 9. 안전 계약 준수

| 항목 | 상태 |
|---|---|
| 분석·dry-run·독립검증 read-only (`SET default_transaction_read_only = on`) | 적용 |
| KO canonical / ProductMaster / candidate / 다른 언어 수정 | 없음 (`koUnchanged: true`, `pmUnchanged: true`) |
| Batch 05 밖 EN write | 없음 |
| 기존 EN 삭제 | 없음 (전량 신규 INSERT) |
| 자격증명 노출 (코드/JSON/CHECK/로그/명령 인자) | 없음 (env 주입) |
| 프록시 | 이번 세션이 기동한 포트 5621 만 종료 |
| 임시·디버그 파일 | 종료 전 삭제 |
| Git | 경로 지정 commit, `git add .` 미사용, 타 세션 WIP 미접촉, `pnpm-lock.yaml` 미포함 |

착수 시 작업 트리에 타 세션 WIP 이 있었으나 이번 경로와 겹치지 않고 기준 commit 의 후손이므로, 자기 산출물 경로만 지정해 커밋했다.
