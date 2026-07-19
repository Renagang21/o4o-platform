# OTC 대량 번역·디자인 작업 실행 지침서 V1

> **목적**: 검토 완료된 한국어 OTC 설명서 그룹을 **여러 컴퓨터에서 동일한 절차**로 영문 번역·전개·검수·공개 전환하는 배치 실행 표준.
> **원칙**: 이 문서에는 **이미 검증된 절차만** 담는다(은행엽·포도엽 299 트랙 실증 — CHECK 6종). 신규 실험 절차는 포함하지 않는다.
> **상태**: Active · 일자 2026-07-17 · 근거 트랙 = [HERBAL 6 CHECK](#부록-근거-check)

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

- **master 집합 = 그룹 ko canonical**(`source_ref_id=candidate`) → **ko↔en `master_id`·`source_ref_id` 정합**.
- content = `buildDrugOtcEnConsumerHtml(번역)`.
- 저장: `description_type=STORE · language=en · status=needs_review · source_type=mfds_drug_otc · source_ref_id=candidate`.
- INSERT: `WHERE NOT EXISTS(en STORE needs_review/canonical)` → 충돌 0 + 멱등.
- 게이트(전건): 번역 그룹당 1건 · ko canonical 예상수 존재 · master 교집합 0 · 필수필드 누락 0 · **한글 0** · `<table>` 0 · 주석 0 · sd-warn.

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
