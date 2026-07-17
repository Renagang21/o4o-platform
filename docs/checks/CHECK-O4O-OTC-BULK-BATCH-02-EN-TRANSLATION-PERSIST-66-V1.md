# CHECK-O4O-OTC-BULK-BATCH-02-EN-TRANSLATION-PERSIST-66-V1 — Batch 02 영문 번역 전개 (에이전트 나)

WO: `WO-O4O-OTC-BULK-BATCH-02-EN-TRANSLATION-PERSIST-66-V1` · 일자: 2026-07-17 · 상태: **완료 (APPLY)**
담당: **에이전트 나** · 배치: **OTC Batch 02** · 선행: [KO-CANONICAL-PROMOTION-66](CHECK-O4O-OTC-BULK-BATCH-02-KO-CANONICAL-PROMOTION-66-V1.md) (커밋 `f9b4a8d9d`) · 근거: [실행 지침서 V1 §3~§4](../guides/products/drug/OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md)

> **DB write = en needs_review INSERT 66.** UPDATE **0** · DELETE **0** · ko canonical 변경 **0**(지문 md5 불변) · draft 변경 **0** · Batch 01 변경 **0** · 공통 파일 변경 **0**.
> 실행: `DRUG_OTC_BATCH02_EN_CONFIRM=YES npx tsx drug-otc-bulk-batch-02-en-persist.ts --apply` (이중 게이트 + 단일 TX). 번역 = `data/otc-en-translations-batch-02-v1.json` (GUIDE `OTC-EN-TRANSLATION-GUIDE V0.5 · OTC-KO-EN-GLOSSARY V0.2`).

---

## 0. 결론

> **Batch 02 8그룹 영문 번역(그룹당 1건) 작성 → ko canonical 66 master 에 en needs_review 전개 완료.**
>
> | 지표 | 값 |
> |---|---:|
> | en needs_review INSERT | **66** |
> | ko↔en master_id 정합 | **66 / 66** |
> | ko↔en source_ref_id 정합 | **66 / 66** |
> | UPDATE / DELETE | **0 / 0** |
> | ko canonical 지문 (md5) | **불변** (전후 동일) |
> | 한글 포함 / `<table>` / 주석 / 이중 escape | **0 / 0 / 0 / 0** |
> | sd-warn | **66 / 66** |
> | 아르기닌 효능 확장 표현 | **0** |
> | 재실행 newInsert | **0** (멱등 no-op) |

---

## 1. 번역 원칙 이행

| 원칙 | 이행 |
|---|---|
| 그룹당 en 번역 1건 | ✅ 8건 (groupKey 중복 0) |
| ko canonical 을 유일한 번역 기준 | ✅ ko draft 구조화 필드(=canonical 원천) |
| GUIDE·GLOSSARY 버전 기록 | ✅ `V0.5 · V0.2` (파일 header + testLog) |
| 정보축(효능·용법·주의) 유지 | ✅ §2 TEST-LOG |
| 수치·단위·횟수·간격·연령·기간 불변 | ✅ §2 numericCheck |
| 금기·상담 강도 약화 금지 | ✅ §2 cautionStrength |
| 원문 없는 효능·마케팅 추가 금지 | ✅ (아르기닌 §3) |
| `translatorNote` 본문 삽입 / `bodyMarkdown` | ✅ 미사용 (빌더 타입 수준 차단, CR-021) |
| GMP 푸터 = 영문 빌더 상수 | ✅ `buildDrugOtcEnConsumerHtml` 자동 |

저장: `description_type=STORE · language=en · status=needs_review · source_type=mfds_drug_otc · source_ref_id=candidate`(ko와 동일). **INSERT only** (`WHERE NOT EXISTS(en STORE)`).

---

## 2. TEST-LOG (8그룹 — 핵심 수치·금기 강도 대조)

| 그룹 | 핵심 수치 대조 | 금기 강도 대조 | 판정 |
|---|---|---|:---:|
| 나프록센250연질 | 초기 2캡슐(500mg)→two capsules (500 mg) · 유지 250mg q6~8h→every 6 to 8 hours · 1일 ≤1,250mg | CABG·2세↓·임부수유부·소화성궤양 금기 + 심혈관혈전/GI출혈 경고 유지 | PASS |
| 알파칼시돌1㎍ | 0.5~1캡슐(0.5~1㎍) 1일1회→half to one capsule (0.5–1 μg) once a day · 적응증 4종+골다공증 | 고칼슘·고인산·고마그네슘·비타민D독성 금기 + 초과금지 유지 | PASS |
| **아르기닌티디아시케이트** | 100~200mg 1일2회 식후→100–200 mg twice a day, after food | 15세↓·심한 신부전 금기 + 1개월 미개선 상담 유지 | PASS |
| 이부프로펜400연질 | 1/2~1정(200~400mg) 1일3~4회 · 편두통 24h≤400mg→not exceeding 400 mg in 24 hours | 위장관궤양·심부전·고혈압·CABG·임신말기3개월 금기 유지 | PASS |
| 클로닉신125연질 | 1~2캡슐(125~250mg) 1일3회→three times a day | 소화성궤양·천식/두드러기·CABG·염증성장질환 금기 유지 | PASS |
| 플루벤다졸500 | 1정(500mg) 단회→one tablet (500 mg) as a single dose | 임부 금기·1세미만 상담 + 요충 가족관리 문구 유지 | PASS |
| 이부프로펜아르기닌369 | 1~2정 q4~6h · 최대 6정(1,200mg as ibuprofen) · 12세↑ | 소화성궤양·혈액이상·심근경색·CABG·임부 금기 유지 | PASS |
| L-시스틴500 | 2~4캡슐(1,000~2,000mg) · 1개월 중 10~20일 | 신장애·간성혼수·6세↓·시스틴뇨·대두유/콩/땅콩 과민 금기 전건 유지 | PASS |

> 상세 대조 = `data/otc-en-translations-batch-02-v1.json` `testLog`. 번역 수정 이력: 초안 그대로 검수 통과(수치·금기 대조 이상 0). 최종 검수 판정 8/8 PASS.

---

## 3. 아르기닌 효능 비확장 (특별 원칙)

- ko 효능 = 허가 원문 한 문장 → en = **"This medicine is used as an adjunctive treatment for impaired liver function."** (WO 허용 예시와 동일).
- **금지 표현 부재 실측**: en content 66건 정규식 `(detox|liver recovery|improved liver health|fatigue relief|liver detoxification)` 매칭 = **0**.
- summaryTable 도 ko(작용 "간기능 보조" / 주요증상 "간기능 장애의 보조") 범위 유지 — "Supports liver function" / "Adjunctive care for impaired liver function"(적응증 확장 없음).

---

## 4. 실행 전 게이트 (dry-run = apply 직전 일치)

| 게이트 | 기대 | 실측 |
|---|---:|---:|
| 대상 그룹 | 8 | **8** |
| ko canonical (번역 기준) | 66 | **66** |
| 예상 en INSERT | 66 | **66** |
| 기존 en STORE 설명서 | 0 | **0** (newInsert=ko 전건) |
| Batch 01 master 교집합 | 0 | **0** (targets 66 ∩ Batch01 586) |
| ko canonical/내부 master 중복 | 0 | **0** |
| source_ref_id 누락 / 번역 groupKey 중복 / 번역 누락 | 0 | **0 / 0 / 0** |
| 빌더 결과 빈값·필수필드 누락 | 0 | **0** |

> 이상 1건이라도 → ABORT(DB write 0). 실제 이상 **0** → apply.

---

## 5. 사후검증 (독립 재조회 — `otc-batch02-en-postverify.mjs`)

| 검증 | 결과 |
|---|---|
| en needs_review 66건 생성 | ✅ **66/66** |
| 그룹별 ko/en 수량 일치 | ✅ (14·10·10·8·7·7·6·4) |
| ko↔en master_id | ✅ **66/66** |
| ko↔en source_ref_id | ✅ **66/66** |
| 한글 포함 | ✅ **0** |
| 내부 주석(`<!--`) / `<table>` | ✅ **0 / 0** |
| 이중 escape (`&amp;lt;` 등) | ✅ **0** |
| sd-warn | ✅ **66/66** |
| 아르기닌 효능 확장 표현 | ✅ **0** |
| ko canonical 지문 불변 | ✅ md5 전후 동일 |
| en STORE master당 중복 | ✅ **0** |
| Batch 01 변경 | ✅ **0** (교집합 0) |
| 재실행 시 INSERT 0 | ✅ 재-dry-run newInsert **0** |

---

## 6. 안전 설계 이행

| 조건 | 이행 |
|---|---|
| dry-run 우선 | ✅ |
| 단일 트랜잭션 | ✅ QueryRunner |
| 이중 승인 게이트 | ✅ `--apply` + `DRUG_OTC_BATCH02_EN_CONFIRM=YES` |
| 예상 INSERT 66 불일치 시 중단 | ✅ post `inserted!=66` → ROLLBACK 설계 |
| 기존 en 설명서 발견 시 중단 | ✅ `WHERE NOT EXISTS(en STORE)` + newInsert 게이트 |
| ko canonical 지문 불변 | ✅ TX 내 md5 재확인 후 commit |
| 대상 외 SPD 지문 불변 | ✅ INSERT-only(대상 66 master 외 무접촉) |

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 8그룹 영문 번역 작성·검수 | ✅ (§2 TEST-LOG PASS 8/8) |
| en needs_review INSERT 66 | ✅ |
| ko canonical 변경 0 | ✅ 지문 불변 |
| UPDATE·DELETE 0 | ✅ |
| Batch 01과 충돌 0 | ✅ |
| 사후검증 통과 | ✅ (§5) |
| commit·push | ⏳ 본 CHECK + 번역 JSON + persist 스크립트 |

---

## 8. 병렬 충돌 방지 준수

- Batch 01 번역 JSON·스크립트·CHECK **미수정** · Batch 01 162 master **미변경**
- 공통 GUIDE·GLOSSARY·Registry **미수정** · 공통 번역 JSON(`otc-en-translations-v1.json` 등) **미수정**(clobber 방지 — Batch02 전용 파일만)
- Batch 02 전용 파일만 생성(`data/otc-en-translations-batch-02-v1.json` · `drug-otc-bulk-batch-02-en-persist.ts`)
- 사후검증 probe(`otc-batch02-en-postverify.mjs`)는 read-only·**미커밋**
- `git add .` 금지 → 담당 산출물만 pathspec stage
- 공통 반영 후보: 없음(en 빌더·GLOSSARY 무변경으로 충분)

---

## 9. 다음 (Batch 02 닫기)

> **본문 지문 고정 후 상태만 `needs_review → canonical` 전환하는 별도 WO 로 Batch 02 완결.**
> - 패턴 = `drug-otc-herbal-en-canonical-promotion.ts` (Batch02 전용 신규 파일). 상태만 flip · content·summary 불변(지문 md5 전후 동일) · needs_review 잔여 0 · 재실행 no-op.
> - 전환 후 Batch 02 ko(66)+en(66) canonical 완결 → 에이전트 나 트랙 종료.
