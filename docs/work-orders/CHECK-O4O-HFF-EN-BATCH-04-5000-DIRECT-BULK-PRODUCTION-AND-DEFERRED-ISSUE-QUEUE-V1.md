# CHECK — WO-O4O-HFF-EN-BATCH-04-5000-DIRECT-BULK-PRODUCTION-AND-DEFERRED-ISSUE-QUEUE-V1

- 대상: 건강기능식품(HFF) 매장 설명서 EN canonical, Batch 04
- 기준 커밋: `d5f8bbce0` (조상 확인 완료)
- 환경: 프로덕션 Cloud SQL (`o4o-platform-db` / `o4o_platform`), Cloud SQL Auth Proxy v2 (포트 5601 → 토큰 만료 후 5611, 둘 다 이번 세션 기동분만 종료)
- 선행 조건: 편집기 선택 공유 없음(`ide_selection` 미첨부 상태에서 착수)

---

## 1. Batch 04 전체 5,000 상태

| 상태 | 건수 |
|---|---:|
| **CREATED** (신규 EN canonical INSERT) | **4,841** |
| UPDATED | 0 |
| NO_CHANGE | 0 |
| **HOLD** (문제 큐 이관) | **159** |
| FAILED | 0 |
| 합계 검증 | 4,841 + 159 = **5,000** ✅ |

`PENDING_DIRECT_TRANSLATION` / `ASSET_MISSING` / `NO_ENTRY` / `TEMPLATE_UNSUPPORTED` / `LOW_EFFICIENCY` 는 최종 원장에 **한 건도 없다**.

---

## 2. 모집단 게이트 (§3)

| 게이트 | 결과 |
|---|---|
| 총 건수 = 5,000 | ✅ (후보 풀 11,244) |
| Batch 01~03 중복 | 0 |
| 기존 통합 문제 큐 417건 제외 | ✅ (선정 단계에서 417건 제외) |
| ProductMaster 중복 / koCanonicalId 중복 | 0 / 0 |
| renderer family 미판정 | 0 (DRIVER 5,000) |

---

## 3. 직접 번역 라운드

KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만 치환**한다. 렌더러 계열·절 수·원료 귀속·수치·단위·괄호 용량은 구조상 승계된다.
없는 문장은 제품 문맥에 맞게 신규 번역했고, 문구 자산 부족·저빈도·파서 미지원은 HOLD 사유로 쓰지 않았다.

```
classify (read-only) → render audit (JSDOM + .store-desc-content + computed style, 430/820/1280px) → apply (--apply + CONFIRM)
```

| 라운드 | 적용 | 라운드 | 적용 |
|---|---:|---|---:|
| 초기(사전 재사용) | 3,316 | t7 | 114 |
| t1 | 201 | t8 | 134 |
| t2 | 196 | t9 | 117 |
| t3 | 95 | t10 | 133 |
| t4 | 112 | t11 | 136 |
| t5 | 115 | t12 | 47 |
| t6 | 112 | t13 | 13 |
| | | **합계** | **4,841** |

**신규 문구 번역 수**: t1~t13 합계 약 **1,700 문구** (clause / meta / label 슬롯).
전 라운드 렌더 감사 `totalIssues 0 / verdict PASS`, 적용 시 `koUnchanged: true`, `pmUnchanged: true`.
shard 단위 expected UPDATE·INSERT·SKIP 과 actual 이 매 shard 일치했다(불일치 시 shard 롤백 계약).

기존 확정 규칙을 그대로 유지했다 — `null`/`undefined`/`NaN` 리터럴 → `KO_SOURCE_DAMAGED`, `&lt;원료명&gt;` → `[Ingredient]` 로 귀속 보존, PUA·제로폭 문자는 조회 키에서만 제거(KO 원문 불변), 수치 검증은 번역 슬롯별로만 수행.

라운드 t4 진행 중 프록시 토큰이 만료되어(약 1시간) `ECONNREFUSED` 가 발생했다. 기존 프로세스를 종료하고 새 포트(5611)로 재기동한 뒤 해당 라운드를 재실행했다. DB write 는 실패 시점에 발생하지 않았고 `enDelta` 는 재실행분만 반영되었다.

---

## 4. 문제 유형별 건수

### 4-1. Batch 04 (159)

| issueType | 건수 | 성격 |
|---|---:|---|
| `NUMBER_STRUCTURE_AMBIGUOUS` | 86 | 한 슬롯에 복수 용량 축이 겹치거나 KO 안에 영문이 중복 병기되어 슬롯 단위 수치 대조가 성립하지 않음 |
| `KO_SOURCE_DAMAGED` | 73 | KO canonical 슬롯이 손상 조각(빈 절/깨진 문자/리터럴 `null`)을 포함 |

### 4-2. 통합 큐 (Batch 01~04)

| 구분 | 건수 |
|---|---:|
| Batch 01 | 101 |
| Batch 02 | 122 |
| Batch 03 | 194 |
| Batch 04 | 159 |
| **합계** | **576** |

| issueType | 건수 |
|---|---:|
| `KO_SOURCE_DAMAGED` | 342 |
| `NUMBER_STRUCTURE_AMBIGUOUS` | 230 |
| `TRANSLATION_AMBIGUOUS` | 4 |

- 중복 0 / 누락 0 (배치별 원장 건수 합과 일치: 101+122+194+159 = 576)
- 금지 사유 0 / 분류 체계 밖 사유 0
- 기존 Batch 01~03 큐 417건을 유지하고 Batch 04 의 159건을 누적했다.
- 이번 작업에서 KO canonical 은 한 건도 수정하지 않았다.

각 행에 `batch / productMasterId / koCanonicalId / productName / issueType / problematicSourceText / confirmedFacts / requiredNextAction / retryCondition` 을 기록했다.

---

## 5. expected / actual write

| 항목 | 결과 |
|---|---|
| shard 단위 expected INSERT/UPDATE/SKIP = actual | ✅ 전 shard 일치 |
| 라운드 `enDelta` 합 | 4,841 = 완료 건수 |
| UPDATE 건수 | 0 (전량 신규 INSERT) |
| rollback 발생 | 0 |

---

## 6. 렌더·독립검증 결과

렌더 감사: 430px / 820px / 1280px, `.store-desc-content` 스코프 + computed style 증명, 전 라운드 `totalIssues 0 / verdict PASS` (overflow·clipping 0, 번역 슬롯 한국어 0, raw HTML·marker 0, 기능성·라벨·개별인정번호 손실 0).

독립검증 (read-only 재조회):

| 항목 | 결과 |
|---|---|
| Batch 04 상태 합계 5,000 | ✅ |
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

## 7. 누적 현황

| 항목 | 값 |
|---|---:|
| Batch 01 완료 | 4,899 |
| Batch 02 완료 | 4,878 |
| Batch 03 완료 | 4,806 |
| Batch 04 완료 | 4,841 |
| **배치 누적 완료** | **19,424 / 20,000** |
| HFF EN canonical (프로덕션 전체) | **34,098** |
| HFF KO canonical (프로덕션 전체) | 40,918 |
| **남은 미번역** | **6,820** (통합 문제 큐 576 포함) |
| 통합 문제 큐 누적 | **576** |

---

## 8. 산출물

| 파일 | 내용 |
|---|---|
| `data/hff-en-batch04-population-5000-v1.json` | 모집단 + 게이트 |
| `data/hff-en-b04-t1..t13-translations-v1.json` | 라운드별 직접 번역 자산 |
| `data/hff-en-batch04-classification-v1.json` | 최종 분류 (PENDING 0) |
| `data/hff-en-batch04-safe-targets-v1.json` | 안전 대상 |
| `data/hff-en-batch04-render-audit-v1.json` | 렌더 감사 PASS |
| `data/hff-en-batch04-apply-results-v1.json` / `-rollback-v1.json` | Apply 결과 / 롤백 계약 |
| `data/hff-en-batch04-closure-v1.json` | Batch 04 종료 선언 |
| `data/hff-en-batch04-completed-v1.json` | 완료 4,841 원장 |
| `data/hff-en-batch04-final-hold-v1.jsonl` | Batch 04 HOLD 159 원장 |
| `data/hff-en-batch04-independent-verification-v1.json` | 독립 검증 PASS |
| `data/hff-en-deferred-issue-queue-through-batch04-v1.jsonl` / `-summary-v1.json` | 통합 문제 큐 576 |
| `data/hff-en-production-completed-through-batch04-v1.json` | 배치 누적 |
| `data/hff-en-production-remaining-after-batch04-v1.json` | Batch 05 이후 잔여 |

스크립트: `hff-en-batch04-{population,blockers,classify,render,apply,closure}.mjs`, 번역 엔진 `hff-en-batch-01-translate.mjs`(Batch 04 사전 로더 추가).

---

## 9. 안전 계약 준수

| 항목 | 상태 |
|---|---|
| 분석·dry-run·독립검증 read-only (`SET default_transaction_read_only = on`) | 적용 |
| KO canonical / ProductMaster / candidate / 다른 언어 수정 | 없음 (`koUnchanged: true`, `pmUnchanged: true`) |
| Batch 04 밖 EN write | 없음 |
| 기존 EN 삭제 | 없음 (전량 신규 INSERT) |
| 자격증명 노출 (코드/JSON/CHECK/로그/명령 인자) | 없음 (env 주입) |
| 프록시 | 이번 세션이 기동한 포트 5601·5611 만 종료 |
| 임시·디버그 파일 | 종료 전 삭제 |
| Git | 경로 지정 commit, `git add .` 미사용, 타 세션 WIP 미접촉, `pnpm-lock.yaml` 미포함 |

착수 시 작업 트리가 clean 이었으므로 `git checkout main` + `git pull --ff-only origin main` 을 수행했다(결과: Already up to date).
새 커밋이 없어 의존성 변경이 없었으므로 `pnpm install --frozen-lockfile` 은 실행하지 않았다.
