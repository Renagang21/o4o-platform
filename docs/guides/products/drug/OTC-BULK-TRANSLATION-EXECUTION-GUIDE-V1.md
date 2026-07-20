# OTC 대량 번역·디자인 작업 실행 지침서 V1

> **목적**: 검토 완료된 한국어 OTC 설명서 그룹을 **여러 컴퓨터에서 동일한 절차**로 영문 번역·전개·검수·공개 전환하는 배치 실행 표준.
> **원칙**: 이 문서에는 **이미 검증된 절차만** 담는다(은행엽·포도엽 299 트랙 실증 — CHECK 6종). 신규 실험 절차는 포함하지 않는다.
> **상태**: Active · 일자 2026-07-17 · 근거 트랙 = [HERBAL 6 CHECK](#부록-근거-check)
> **선행 단계(신규 draft)**: 번역 소스인 ko canonical이 아직 없는 `새설명서필요` 그룹은 먼저 [OTC-NEW-DRAFT-AUTHORING-EXECUTION-GUIDE-V1](OTC-NEW-DRAFT-AUTHORING-EXECUTION-GUIDE-V1.md)로 e약은요 원문 grounding 구조화 draft → ko canonical을 만든 뒤 본 지침의 en 단계로 진입한다.

---

## 0. 범위 · 전제

| 항목 | 값 |
|---|---|
| 작업 대상 | **한국어 canonical 만** 번역 소스로 사용(수정·검토 완료분) |
| 산출 | 그룹당 en 번역 1건 → 연결 master 전체 전개 → 검수 → canonical |
| **제외** | 원문없음(no_item) master(예: 현 115건) — **보류 목록 유지, 배치와 섞지 않음** |
| DB 채널 | Cloud SQL Proxy v2 (`bin/cloud-sql-proxy-v2.exe`, `127.0.0.1:5433`, `gcloud auth print-access-token`) |
| 실행 | `DB_HOST=127.0.0.1 DB_PORT=5433 <GATE_ENV>=YES npx tsx <script> --apply` (apps/api-server 에서) |
| 공통 규칙 | **INSERT/상태전환만**, DB 변경은 **단일 TX + 이중 게이트**, 모든 단계 **dry-run 먼저** |

---

## 0-A. 동시 쓰기 소유권 (Write Ownership) — 필수

> 근거: 파모티딘 10mg 정 파일럿(ko·en 각 24)에서 STEP1(needs_review INSERT)↔STEP2(canonical flip) 사이에
> **병렬 세션이 22건을 flip** 한 레이스 관측. `INSERT ... WHERE NOT EXISTS` 가드로 최종 상태는 정확했으나,
> flip 카운트 불일치·검증 혼선을 유발. (`CHECK-O4O-OTC-NO-CANONICAL-PILOT-WRITE-DESIGN-DA-V1`)

```text
- 동일 groupKey · master 집합의 production write 는 단일 에이전트(세션)만 소유한다.
- apply 시작부터 독립 검증 · no-op 확인 완료까지, 다른 세션의 동일 대상 write 를 금지한다.
- 병렬 세션은 그 구간 동안 read-only 검증만 허용한다.
```

- 소유 세션은 apply 봉투(persist → flip → 독립검증 → no-op)를 **연속**으로 끝낸 뒤 소유를 해제한다.
- 안전판: 모든 INSERT 는 `WHERE NOT EXISTS(canonical|needs_review)`, flip 후 `count == EXPECTED` · `dup == 0` 사후검증 → 불일치 ROLLBACK (레이스가 나도 이중 생성·초과 write 는 구조적으로 차단).

---

## 0-B. 번역 vs 외부 LLM 자동초안 구분 (정책 확정)

> 근거: WO-O4O-OTC-KO-TO-EN-TRANSLATION-POLICY-CLARIFY-NA-V1 (2026-07-20, 문서 정비·DB write 0). CLAUDE.md 콘텐츠 작성 불변 원칙 · [CONTENT-AUTHORING-PRINCIPLES CR-002/004/007](../../content-authoring/CONTENT-AUTHORING-PRINCIPLES.md) · [AI-GROUNDING AR-002](../../ai/AI-GROUNDING.md) 와 본 지침 §3~§6 을 대조해 확정한다.

### 0-B-1. grounded ko canonical 기준 영어 충실 번역 = **허용**

- **검토 완료된 ko canonical 을 소스로 한 영어 충실 번역은 허용된 작업이다.** ko canonical 은 이미 공식 원문(e약은요·허가사항)에 grounding 되고 검토·승격까지 끝난 자산이므로, 그 의미·수치·강도를 보존해 영어로 옮기는 것은 **형식 변환(번역)** 이지 근거 없는 사실 생성이 아니다. (본 지침 §3-1 "번역 소스 = 수정 완료 ko canonical" · 은행엽·포도엽 299 실증)

### 0-B-2. 금지되는 "외부 LLM 자동초안" 과 승인된 번역의 구분

| 구분 | 금지 — 외부 LLM 자동초안 | 허용 — 승인된 번역 |
|---|---|---|
| 무엇을 만드나 | **새 medical fact**(성분·효능·수치·용법·주의)를 원문 grounding 없이 생성·보강 | 이미 grounded·검토완료된 ko canonical 4필드(`efficacy·usage·caution·summaryTable`)를 영어로 변환 |
| 새 사실 | 있음 (창작·일반지식 유입) | **0** (원문에 없는 사실 추가 금지) |
| 근거 | 없음 → 위반 | ko canonical = 원문 grounding 승계 |
| Rule | CR-004·AR-002 위반 | CR-002 원문 우선 준수 |

- **판별 기준 = "이 산출물이 ko canonical 에 없는 새 medical fact 를 만드는가?"** → YES 면 금지(초안 창작), NO(의미 보존 형식 변환)면 허용(번역).
- 번역은 GUIDE/GLOSSARY(§3-3) + TEST-LOG 수치·금기 대조 검수(§3-6) + 이중 게이트(§6)를 거친다. `translatorNote`·`bodyMarkdown` 주석은 소비자 비노출이되 **번역자는 반드시 열람**(오역·안전정보 소실 방지, [TRANSLATION-DRAFTS-V1 §6](pilot-en-design/TRANSLATION-DRAFTS-V1.md)).

### 0-B-3. 수치·금기·주의·첨가제 보존 게이트 (요약)

번역이 "충실"함을 보장하는 보존 게이트 — 상세는 §3~§6, 여기서는 확정 목록만:

| 축 | 보존 규칙 | 위치 |
|---|---|---|
| 수치 | 값 불변, 표기만 변환(`40~80mg`→`40–80 mg`, `1일 3회`→`three times a day`) | §3-3 |
| 금기 | `Do not take this if …` — 강도 보존 | §3-3 |
| 주의 | 문장 단위 `<li>` 분리 · 강도 보존 | §3-3·§7-6 |
| 첨가제(per-master) | 공유 소스 수정 불가 → **caution 복사본 재생성**으로 master 별 canonical 만 갱신 | §7-5 |
| 검수 | TEST-LOG 로 그룹당 **수치·용량·기간·금기 대조** | §3-6 |
| persist 게이트 | **한글 0 · `<table>` 0 · 주석 0 · 필수필드 누락 0 · ko↔en 정합** | §4 |

### 0-B-4. 영어 원문이 별도로 필요한 경우 vs 필요 없는 경우

- **별도 EN 원문 불필요(원칙·대부분)**: STORE en 슬롯이 비어 있으면(grounded 제품은 e약은요 en 미보유가 일반) ko canonical 을 번역해 **authored en canonical 을 직접 INSERT** 한다. **ko canonical 자체가 grounding 소스** 이므로 별도 e약은요 EN 원문은 필요 없다. ([UPGRADE-POLICY §3-2](OTC-EASY-DRUG-TO-AUTHORED-CANONICAL-UPGRADE-POLICY-V1.md))
- **별도 원문/작업이 필요(예외·드묾)**: ① en canonical 이 이미 존재하면 §5 계약을 en 슬롯에 적용(demote→replace, [UPGRADE-POLICY §3-3](OTC-EASY-DRUG-TO-AUTHORED-CANONICAL-UPGRADE-POLICY-V1.md)). ② 번역이 아니라 **영어권 소비자 톤으로 재작성**(예: HFF)하는 경우는 번역이 아닌 **authoring** 이므로 별도 grounding 필요 — OTC 의약품 en 은 이 경로를 쓰지 않는다(충실 번역 원칙).
- **확정**: OTC 의약품 en 은 **ko canonical 번역이 원칙** → "별도 grounded EN 원문 부재" 는 en 진행의 정합적 blocker 가 아니다.

### 0-B-5. 트리메부틴말레산염 100mg 정 66건 en 진행 가능 여부 = **진행 가능 (본 지침 경로)**

- ko 66건 authored canonical **LIVE·검토완료**([TRIMEBUTINE-100MG-RUNNER §7](../../../checks/CHECK-O4O-OTC-TRIMEBUTINE-100MG-UPGRADE-RUNNER-PILOT-DA-V1.md)) → **번역 소스 충족**.
- 66 master 의 non-ko STORE = 0 → en 슬롯 비어 있음 → **authored en canonical 직접 INSERT 경로**(demote 불필요, §0-B-4).
- 위 CHECK §8 의 EN HOLD("grounded EN 원문 부재")는 **grounded-upgrade runner(ko 전용, en 경로 없음) 기준**의 안전 보류였다. 본 **BULK-TRANSLATION 경로**는 ko canonical 을 번역 소스로 쓰므로 별도 EN 원문이 필요 없어 **정책상 진행 가능**하다(모순 아님 — 경로가 다름).
- **단, 실제 en 실행은 별도 apply WO** 로 본 지침 §3(그룹당 en 번역 1건 + GUIDE/GLOSSARY + TEST-LOG) → §4(needs_review 전개) → §5(canonical 전환)를 dry-run→이중게이트로 수행한다. **본 WO 는 정책 확정만(DB write 0)** 이며 en 자동 실행·번역 초안 생성을 지시하지 않는다.

---

## 0-C. EN 전개 master 스코프 가드 (Grounded Upgrade 그룹 — 필수)

> 근거: WO-O4O-OTC-EN-MASTER-SCOPE-GUARD-DOC-NA-V1 (2026-07-20, 문서 정비·DB write 0). 트리메부틴말레산염 100mg 정에서 발견된 스코프 오염(하나의 `source_ref_id`(candidate)를 coarse 127 master 가 공유하나 ko 승격 target 은 fingerprint 확정 **66** 뿐 — 제외 61 은 11개 비대상 fp) 방지. [TRIMEBUTINE-100MG-RUNNER §1~§5](../../../checks/CHECK-O4O-OTC-TRIMEBUTINE-100MG-UPGRADE-RUNNER-PILOT-DA-V1.md).

### 0-C-1. 스코프 정본 = runner 확정 target master_id 집합

- **EN 전개 대상은 `source_ref_id` 를 공유하는 master 전체가 아니라, 해당 ko 승격 runner 가 확정한 `target master_id` 집합을 정본으로 삼는다.** (Grounded Upgrade 는 coarse 그룹을 fingerprint 로 분할해 **일부 fp 만** 승격하므로, `source_ref_id`(candidate) 공유 집합 ⊋ target 이 정상이다.)
  - 정본 소스 = runner 산출 `report.rollback_master_ids` (= dry-run 이 확정한 target IDs, 예: 트리메부틴 `otc-grounded-upgrade-<group>.run.json` 66).
- **`source_ref_id` 는 번역·grounding 연결값(어느 ko 원천에서 왔는가)이지, 안전한 master 범위 식별자가 아니다.** `source_ref_id` 단독으로 master 를 열거하면 승격되지 않은(제외 fp) master 까지 EN 이 전개돼 스코프가 오염된다.

### 0-C-2. 실행 전 필수 조사·게이트

EN persist(§4) 이전에 다음을 확정한다:

| # | 게이트 | 의미 |
|---|---|---|
| 1 | **`source_ref_id` 공유 master 수 조사** | candidate 를 공유하는 전체 master 수를 먼저 센다(예: 트리메부틴 coarse 127). target(66) 과의 차(제외 61)를 명시 확인. |
| 2 | **target 밖 기존 en canonical 보호** | target 외(out-of-scope) master 의 기존 en STORE canonical 은 **미접촉**. persist·flip 대상에서 제외. |
| 3 | **`target master IDs ∩ out-of-scope IDs = 0`** | 정본 target 과 스코프 밖 집합의 교집합 0 을 게이트로 검증. |
| 4 | **예상 대상 수 ≠ persist 대상 수 → ABORT** | dry-run 이 확정한 target 수와 실제 persist 대상 수 불일치 시 **전체 ABORT**(§6 수량 가드의 스코프 판). |

### 0-C-3. herbal 열거 방식 재사용 금지

- **기존 herbal 방식의 `source_ref_id`(candidate) 단독 master 열거를 Grounded Upgrade 그룹에 재사용하지 않는다.** herbal(299)은 그룹 전체가 단일 승격 대상이라 `source_ref_id=candidate` 열거가 곧 target 이었으나, Grounded Upgrade 는 fingerprint 분할로 candidate 공유 집합 ≠ target 이다.
- 따라서 §4 의 "master 집합 = 그룹 ko canonical(`source_ref_id=candidate`)" 은 **herbal 계열 그룹에 한정**하며, **Grounded Upgrade 그룹은 §0-C-1 의 runner 확정 target master_id 집합으로 대상을 고정**한다(§4 주석 참조).

---

## 1. 배치 단위

- **10~20 그룹 단위**로 배치. 그룹 = `성분|함량|제형`(3축, DR-005/DR-019).
- 각 그룹은 이미 **ko canonical 승격 완료** 상태여야 시작한다(§2 는 승격 전 그룹에만).
- 배치 파라미터(그룹별): `groupKey · candidate_id · 예상 master 수(ko canonical 수)`.

---

## 2. (승격 전 그룹 한정) 한국어 canonical 승격

> 이미 ko canonical 이 있으면 건너뛴다. 근거: [HERBAL-CANONICAL-PROMOTION](../../../checks/CHECK-O4O-OTC-HERBAL-CANONICAL-PROMOTION-299-V1.md)

- 스크립트 패턴: `drug-otc-herbal-canonical-promotion.ts` (그룹키·예상수만 교체).
- master 열거(A_no_spd_only): **그룹 master − STORE canonical 보유분**.
  - `name LIKE '%(성분)'`(끝괄호 정확일치) + `split_part(spec,' / ',1)=함량` + **`name LIKE '%제형키워드%'`**.
- content = `buildDrugOtcConsumerHtml`(구조화 필드만).
- INSERT: `WHERE NOT EXISTS(canonical)` → A_no_spd_only + 멱등 동시.
- 게이트: 그룹 총계·promotable 예상 일치, 그룹 간 master 교집합 0, `<table>`·주석 0, sd-warn.

---

## 3. 영문 번역 생성 (그룹당 1건)

> 근거: [HERBAL-EN-TRANSLATION-PERSIST](../../../checks/CHECK-O4O-OTC-HERBAL-EN-TRANSLATION-PERSIST-299-V1.md)

1. **번역 소스 = 수정 완료 ko canonical**(= ko draft content_json 구조화 필드).
2. **그룹당 번역 1건** 을 `DrugOtcEnTranslation` 형식으로 작성:
   - 필드: `groupKey · title · usageLabel · efficacy · usage · caution · summaryTable`.
   - **summaryTable 영문 키**: `Category · Ingredient · How it works · Main symptoms · Who should be careful · Why this one`.
   - **GMP 푸터·`ingredientSelection` 은 빌더 상수** 로 자동 — 번역하지 않는다.
3. **GUIDE/GLOSSARY 적용 + 버전 기록**: `OTC-EN-TRANSLATION-GUIDE V0.5` · `OTC-KO-EN-GLOSSARY V0.2` (파일 헤더에 명시).
   - 스타일: 금기 `Do not take this if …` / 상담 `Talk to a pharmacist before … / seek advice`. 강도 보존.
   - 숫자: `40~80mg`→`40–80 mg`(en dash + space), `1일 3회`→`three times a day`.
   - 색소·유전질환 등 반복 용어는 GLOSSARY 표기 재사용. **반복 이슈만** GUIDE/GLOSSARY 반영.
4. **금지**: `bodyMarkdown` 미사용 · `translatorNote` 는 참고 전용(본문 자동삽입 금지) · 한글 잔존 0.
5. **번역 파일은 배치 전용**(`otc-en-translations-<batch>-v1.json`) — 공유 파일 수정 금지(clobber 방지).
6. **TEST-LOG**: 그룹당 1건 수치·용량·기간·금기 대조(`TRANSLATION-DRAFTS-V1.md` 형식). 검수 = 이 TEST-LOG.

---

## 4. 전개 저장 (needs_review)

> 스크립트 패턴: `drug-otc-herbal-en-persist.ts`

- **master 집합**:
  - **herbal 계열 그룹**: 그룹 ko canonical(`source_ref_id=candidate`) → **ko↔en `master_id`·`source_ref_id` 정합**.
  - **Grounded Upgrade 그룹**: `source_ref_id` 단독 열거 금지 → **runner 확정 `target master_id` 집합(§0-C)** 을 정본으로 대상 고정. `source_ref_id` 는 정합 검증값으로만 사용.
- content = `buildDrugOtcEnConsumerHtml(번역)`.
- 저장: `description_type=STORE · language=en · status=needs_review · source_type=mfds_drug_otc · source_ref_id=candidate`.
- INSERT: `WHERE NOT EXISTS(en STORE needs_review/canonical)` → 충돌 0 + 멱등.
- 게이트(전건): 번역 그룹당 1건 · ko canonical 예상수 존재 · master 교집합 0 · 필수필드 누락 0 · **한글 0** · `<table>` 0 · 주석 0 · sd-warn · **(Grounded Upgrade) target∩out-of-scope=0 · 예상 target 수==persist 수, 불일치 ABORT(§0-C-2)**.

---

## 5. 검수 → canonical 전환

> 스크립트 패턴: `drug-otc-herbal-en-canonical-promotion.ts`

- **상태만** `needs_review → canonical`, `updated_at` 갱신. content·summary **불변**.
- **변경 증명**: flip 대상의 content·summary **지문(md5/길이+본문) 전후 동일**.
- 게이트: en STORE 예상수 · needs_review 예상수 · **기존 en canonical 충돌 0** · ko canonical 불변.
- 멱등: needs_review 만 flip → 재실행 0.

---

## 6. 공통 가드 · 불변식 (전 단계)

| 가드 | 방법 |
|---|---|
| **수량 가드** | 예상 master/row 수 불일치 시 **전체 ABORT** |
| **중복 가드** | `(master_id, language)` canonical 중복 0 (⚠️ language 미구분 집계는 ko+en 정상 케이스라 오탐) |
| **단일 트랜잭션** | 모든 write 는 1 TX, 사후검증 실패 시 ROLLBACK |
| **이중 게이트** | `--apply` + 전용 `*_CONFIRM=YES` env |
| **ko↔en 정합** | en 의 `master_id`·`source_ref_id` 가 ko canonical 과 1:1 |
| **재실행 no-op** | `WHERE NOT EXISTS` / needs_review-only flip 로 재실행 0 |
| **역가역성** | INSERT=NOT EXISTS 로 무해 / 상태전환=지문 불변 증명 |
| **dry-run 우선** | apply 전 반드시 dry-run 으로 게이트·이상 0 확인 |

---

## 7. Gotcha (실증 — 반드시 준수)

1. **제형 열거는 `name` 키워드로** — `split_part(spec,' / ',3)` 는 spec 이 `80밀리그램 / 0`(2토큰)인 master(예 진코넥정) 에서 제형 필드가 비어 **미검출**. `name LIKE '%정%'`/`'%캡슐%'` 로 판정해야 seed masterTotal 과 일치.
2. **존재/중복 판정은 LIKE 다중키워드** — 정규식 `황색\s?\d\s?호` 는 `황색203호`(다중숫자) 미검출. dedup/문구존재 확인은 `content LIKE '%황색%' OR '%타르색소%' …` 로.
3. **`UPDATE … RETURNING` 결과는 `[rows, affected]`** 일 수 있음 → count = `Array.isArray(res[0]) ? res[0].length : res.length`. `res.length`(=2) 오집계 주의.
4. **BUILDER_DRIFT 0 선확인** — 기존 canonical 을 재생성·편집하기 전 `build(draft/translation) === stored` 를 전건 확인(clean 전제). 불일치면 그 master 제외/ABORT.
5. **draft/translation 은 그룹 공유**(master 다수 → ref 소수). **per-master 커스터마이즈**(예: 첨가제 경고)는 공유 소스 수정 불가 → **caution 복사본 재생성**으로 master 별 canonical 만 갱신, 역제거로 최소성 증명.
6. **en 빌더 구조**: `caution` 를 문장(`. `+대문자/괄호) 단위로 `<li>` 분리 · GMP 푸터=빌더 상수 · summaryTable=영문 키.
7. **Korean 을 `psql -c` 셸변수로 넘기면 CP949 깨짐** → `.sql` UTF-8 파일 `-f` 사용.
8. **프록시 안정성**: 세션 간 백그라운드 프록시가 죽을 수 있음 → 기동+쿼리를 한 실행에 묶고, 죽었으면 재기동.

---

## 8. 배치 실행 체크리스트 (그룹 10~20개)

```text
[ ] 배치 그룹 목록 확정(검토 완료 ko canonical 만) + groupKey/candidate/예상수 표
[ ] (승격 전이면) §2 ko canonical 승격 dry-run → apply → 검증
[ ] §3 그룹당 en 번역 1건 작성(전용 파일) + GUIDE/GLOSSARY 버전 + TEST-LOG
[ ] §4 en needs_review 전개 dry-run → apply → 검증(한글0·table0·주석0·sd-warn·ko↔en정합)
[ ] 검수(TEST-LOG 수치·금기 대조)
[ ] §5 canonical 전환 dry-run → apply → 지문 불변·needs_review 잔여 0
[ ] 각 단계 재실행 no-op 확인
[ ] CHECK 문서 작성 + commit/push(파일 pathspec 스코프)
[ ] 원문없음 master 는 배치에서 제외(보류 목록 유지)
```

---

## 부록: 근거 CHECK

| 단계 | CHECK |
|---|---|
| ko 승격 | `CHECK-O4O-OTC-HERBAL-CANONICAL-PROMOTION-299-V1.md` |
| en 번역 전개 | `CHECK-O4O-OTC-HERBAL-EN-TRANSLATION-PERSIST-299-V1.md` |
| en 검수 전환 | `CHECK-O4O-OTC-HERBAL-EN-CANONICAL-PROMOTION-299-V1.md` |
| 첨가제 경고(per-master 재생성 사례) | `CHECK-O4O-OTC-ADDITIVE-WARNING-APPLY-234-V2.md` |
| dedup 결함·정정(안전 가드 사례) | `CHECK-O4O-OTC-ADDITIVE-WARNING-APPLY-260-V1.md` |
| 스크립트 | `apps/api-server/src/scripts/drug-otc-herbal-{canonical-promotion,en-persist,en-canonical-promotion}.ts` |

> **원칙 재확인**: 이 지침서는 검증된 절차의 집약이다. 새 유형(예: 첨가제 서브그룹, 원문없음 복구)은 **별도 파일럿 검증 후** 본 지침서에 반영한다.
