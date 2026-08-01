# CHECK — WO-O4O-HFF-EN-BATCH-03-5000-DIRECT-BULK-PRODUCTION-AND-DEFERRED-ISSUE-QUEUE-V1

- 대상: 건강기능식품(HFF) 매장 설명서 EN canonical, Batch 03
- 기준 커밋: `37f5f59c2` (조상 확인 완료)
- 환경: 프로덕션 Cloud SQL (`o4o-platform-db` / `o4o_platform`), Cloud SQL Auth Proxy v2 포트 5591 (이번 세션 기동분만 종료)
- 선행 조건: 편집기 선택 공유 없음(`ide_selection` 미첨부 상태에서 착수)

---

## 1. 결과 요약

| 항목 | 값 |
|---|---|
| Batch 03 모집단 | **5,000** (후보 풀 16,244 중 선정) |
| CREATED (신규 EN canonical INSERT) | **4,806** |
| UPDATED | 0 |
| NO_CHANGE | 0 |
| HOLD (문제 큐 이관) | **194** |
| FAILED | 0 |
| 상태 합계 검증 | 4,806 + 194 = **5,000** ✅ |
| 금지 HOLD 사유 존재 | **없음** ✅ |
| 독립 검증 | **PASS** (실패 0/5 항목) |

`PENDING_DIRECT_TRANSLATION`, `ASSET_MISSING`, `NO_ENTRY`, `TEMPLATE_UNSUPPORTED`, `LOW_EFFICIENCY` 는 최종 원장에 **한 건도 없다**.

---

## 2. 모집단 게이트 (§3)

| 게이트 | 결과 |
|---|---|
| 총 건수 = 5,000 | ✅ |
| ProductMaster 중복 | 0 |
| koCanonicalId 중복 | 0 |
| Batch 01·02 중복 | 0 (선정 단계에서 223건 제외) |
| renderer family 미판정 | 0 (DRIVER 4,999 / WAE 1) |
| 원문 축(기능성·섭취방법·주의사항·기준규격) 부재 | 0 |

---

## 3. 생산 방식과 라운드

KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만 치환**한다. 렌더러 계열, 절 수, 원료 귀속, 수치·단위·괄호 용량은 구조상 승계된다.
없는 문장은 제품 문맥에 맞게 신규 번역했고, 문구 자산 부재·저빈도는 HOLD 사유로 쓰지 않았다.

각 라운드는 동일한 3단 게이트를 통과했다.

```
classify (read-only) → render audit (JSDOM + .store-desc-content + computed style, 430/820/1280px) → apply (--apply + CONFIRM)
```

| 라운드 | 적용 | 라운드 | 적용 |
|---|---:|---|---:|
| 초기(사전 재사용) | 3,380 | t7 | 110 |
| t1 | 180 | t8 | 106 |
| t2 | 161 | t9 | 124 |
| t3 | 80 | t10 | 127 |
| t4 | 87 | t11 | 142 |
| t5 | 115 | t12 | 83 |
| t6 | 98 | t13 | 13 |
| | | **합계** | **4,806** |

전 라운드 렌더 감사 `totalIssues 0 / verdict PASS`, 적용 시 `koUnchanged: true`, `pmUnchanged: true`.
shard 단위 expected UPDATE·INSERT·SKIP 과 actual 이 매 shard 일치했다(불일치 시 shard 롤백 계약).

---

## 4. 도중 확정한 결함 2건 (문구 부족이 아니라 원문·조회 결함)

### 4-1. KO 슬롯에 직렬화 리터럴 `null` 이 그대로 들어간 문서

번역 대상이 아니라 원문 손상이다. 분류기의 손상 판정에 `null|undefined|NaN` 리터럴을 추가해 `KO_SOURCE_DAMAGED` 로 정확히 분류했다(강제 번역하지 않음).

### 4-2. `&lt;원료명&gt;` 마커는 태그가 아니라 원료 귀속 표기

`<프로바이오틱스>` · `<칼슘>` · `<비타민K>` 같은 표기는 DRIVER 계열에서 **어느 구성품의 기능인지**를 가리킨다.
정규화가 엔티티를 디코드한 뒤에는 태그로 취급되어 귀속이 사라지므로, 사전 키를 **엔티티 형태 그대로** 등록하고 EN 값은 대괄호(`[Probiotics]`)로 귀속을 보존했다.
꺾쇠를 EN 본문에 그대로 쓰면 렌더 감사에서 `rawHtml` 로 걸리므로 대괄호를 쓴다(Batch 02 판정 유지).

---

## 5. 문제 문서 큐 (§6)

이번 배치의 194건은 생산 대상에서 제외하고 큐에 기록한 뒤 다음 문서로 계속 진행했다. 개별 문제 때문에 전체 생산을 멈추지 않았다.

### 5-1. Batch 03 내역

| issueType | 건수 | 성격 |
|---|---:|---|
| `KO_SOURCE_DAMAGED` | 138 | KO canonical 슬롯이 손상 조각(빈 절/깨진 문자/리터럴 `null`)을 포함 |
| `NUMBER_STRUCTURE_AMBIGUOUS` | 56 | 한 슬롯에 복수 용량 축이 겹치거나 KO 안에 영문이 중복 병기되어 슬롯 단위 수치 대조가 성립하지 않음 |

### 5-2. 통합 큐 (Batch 01 + 02 + 03)

| 구분 | 건수 |
|---|---:|
| Batch 01 | 101 |
| Batch 02 | 122 |
| Batch 03 | 194 |
| **합계** | **417** |

| issueType | 건수 |
|---|---:|
| `KO_SOURCE_DAMAGED` | 269 |
| `NUMBER_STRUCTURE_AMBIGUOUS` | 144 |
| `TRANSLATION_AMBIGUOUS` | 4 |

- 중복 0 / 누락 0 (배치별 원장 건수 합과 일치)
- 금지 사유 0 / 분류 체계 밖 사유 0
- Batch 01 의 레거시 사유(`LOW_EFFICIENCY_UNIQUE_PHRASES` 72건)는 본 WO 의 분류 체계에 없으므로 **현재 사전으로 read-only 재판정**하여 실제 문제 유형으로 재분류했다. 재판정 결과 문제가 사라진 건은 0건이었다(모두 실제 문제로 확인).
- 이번 작업에서 KO canonical 은 한 건도 수정하지 않았다.

각 행에 `batch / productMasterId / koCanonicalId / productName / issueType / problematicSourceText / confirmedFacts / requiredNextAction / retryCondition` 을 기록했다.

---

## 6. 독립 검증 (§8)

별도 read-only 스크립트로 재조회하여 확인했다.

| 항목 | 결과 |
|---|---|
| Batch 03 상태 합계 5,000 | ✅ |
| KO canonical hash drift | 0 |
| ProductMaster 변경 | 0 |
| INSERT·UPDATE 수 일치 | ✅ (shard별 expected=actual) |
| EN canonical 증가량 일치 | ✅ (라운드 `enDelta` 합 = 4,806) |
| canonicalDup | 0 |
| 번역 슬롯 한국어 잔존 | 0 |
| 구조 drift (`li`/`h2`/`sd-item`/`sd-tag`/`b`) | 0 |
| Batch 밖 write | 0 |
| 문제 큐 누락·중복 | 0 |
| **verdict** | **PASS** |

프로덕션 현황: HFF EN canonical **29,257** / HFF KO canonical **40,918** → Batch 04 이후 잔여 11,661(문제 큐 417 포함).

---

## 7. 산출물

| 파일 | 내용 |
|---|---|
| `data/hff-en-batch03-population-5000-v1.json` | 모집단 + 게이트 |
| `data/hff-en-b03-t1..t13-translations-v1.json` | 라운드별 직접 번역 자산 |
| `data/hff-en-batch03-classification-v1.json` | 최종 분류 (PENDING 0) |
| `data/hff-en-batch03-safe-targets-v1.json` | 안전 대상 |
| `data/hff-en-batch03-render-audit-v1.json` | 렌더 감사 PASS |
| `data/hff-en-batch03-apply-results-v1.json` / `-rollback-v1.json` | Apply 결과 / 롤백 계약 |
| `data/hff-en-batch03-closure-v1.json` | Batch 03 종료 선언 |
| `data/hff-en-batch03-completed-v1.json` | 완료 4,806 원장 |
| `data/hff-en-batch03-final-hold-v1.jsonl` | Batch 03 HOLD 194 원장 |
| `data/hff-en-batch03-independent-verification-v1.json` | 독립 검증 PASS |
| `data/hff-en-deferred-issue-queue-through-batch03-v1.jsonl` / `-summary-v1.json` | 통합 문제 큐 417 |
| `data/hff-en-production-completed-through-batch03-v1.json` | 배치 누적 |
| `data/hff-en-production-remaining-after-batch03-v1.json` | Batch 04 이후 잔여 |

스크립트: `hff-en-batch03-{population,blockers,classify,render,apply,closure}.mjs`, 번역 엔진 `hff-en-batch-01-translate.mjs`(Batch 03 사전 로더 추가).

---

## 8. 안전 계약 준수

| 항목 | 상태 |
|---|---|
| 분석·dry-run·독립검증 read-only (`SET default_transaction_read_only = on`) | 적용 |
| KO canonical / ProductMaster / candidate / 다른 언어 수정 | 없음 (`koUnchanged: true`, `pmUnchanged: true`) |
| Batch 03 밖 EN write | 없음 |
| 기존 EN 삭제 | 없음 (신규 INSERT 만, 낙관적 락) |
| 자격증명 노출 (코드/JSON/CHECK/로그/명령 인자) | 없음 (env 주입) |
| 프록시 | 이번 세션이 기동한 포트 5591 만 종료 |
| 임시·디버그 파일 | 종료 전 삭제 |
| Git | 경로 지정 commit, `git add .` 미사용, 타 세션 WIP(otc-zh·auth-context·pharmacy-hub) 미접촉 |

작업 트리가 착수 시점에 clean 이 아니었으므로(타 세션 WIP 존재) `git checkout`/`pull --ff-only`/`pnpm install` 은 실행하지 않았다.
HEAD 는 기준 커밋 `37f5f59c2` 의 후손임을 `git merge-base --is-ancestor` 로 확인했다.
