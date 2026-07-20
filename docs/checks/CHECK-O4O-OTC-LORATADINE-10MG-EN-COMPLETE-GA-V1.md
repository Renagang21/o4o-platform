# CHECK — WO-O4O-OTC-LORATADINE-10MG-EN-COMPLETE-GA-V1

**에이전트 가 (단일 write-owner) · APPLIED (production DB write) · 2026-07-20**

로라타딘 10mg 정 runner 확정 대상 38개에 영어 STORE 설명서를 번역·전개·canonical 완결.
범용 en-complete runner([`drug-otc-en-complete-runner.ts`](../../apps/api-server/src/scripts/drug-otc-en-complete-runner.ts)) 최소 등재 후 이중게이트 apply.

---

## 1. 스코프 조사 (source_ref 공유 범위 · target 밖 EN 상태)

| 항목 | 값 |
|---|---|
| EN 전개 정본 | ko 승격 runner `rollback_master_ids` **38** (master_id 스코프 고정, `source_ref_id` 단독 열거 **금지**) |
| source_ref `0a7dee0b…` 공유 ko canonical | **51** (38 target + **13 out-of-scope**) |
| out 13 EN canonical | **이미 LIVE** · uniform md5 `056512e15b671e487ee7c33793e32125` |
| target 38 기존 EN | **0** (canonical·needs_review 충돌 0) |

→ 트리메부틴/바실루스와 동일 패턴(source_ref 가 target 초과 공유 · out 이미 en). **master_id 38 스코프 + out en 일관성 참조**.

---

## 2. 번역 (그룹당 1건 · 충실 번역)

- 배치 전용 파일: [`otc-en-translations-loratadine-10mg-v1.json`](../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-loratadine-10mg-v1.json) (공유 파일 미수정).
- GUIDE `V0.5` · GLOSSARY `V0.2` · TEST-LOG(수치·용량·연령경계·금기·병용금기 대조) 포함.
- 번역 = grounded ko canonical(source_ref `0a7dee0b`) 충실 번역. **동일 약물 out 13 의 검증본(`otc-en-translations-v1.json` 로부터 verbatim 채용)** — `buildDrugOtcEnConsumerHtml` 산출 md5 `056512e1…` = live out en **byte-identical** → **ko 에 없는 medical fact 0** 증명.
- TEST-LOG 요지: `10 mg / once a day` · `6 to under 12 · 30 kg 경계 / half a tablet` 수치 보존 · 금기 `Do not take this if …`(과민·6세미만·임부/수유·유전질환) 강도 보존 · 주의 `Talk to a pharmacist before …`(간·신) · 병용금기(cimetidine·erythromycin·ketoconazole) 대상 보존.

---

## 3. 실행 · write 결과

- selftest 없음(runner 구조) · **dry-run 2회 byte-identical PASS**(consistencyMatch true, 이상 0).
- apply(`--apply` + `DRUG_OTC_EN_COMPLETE_CONFIRM=YES`): STEP1 en needs_review INSERT(TX1) → STEP2 canonical flip(TX2, 지문 불변).

| 단계 | 값 |
|---|:-:|
| STEP1 en needs_review INSERT | **38** |
| STEP2 en canonical flip | **38** |
| flip 지문 불변(fingerprintOk) | **38/38** |
| EN write total | **76** |

in-script 사후검증: `enCanonical=38 · enNeedsReview=0 · dup=0 · koCanonical=38`.

---

## 4. 독립 검증 (runner 밖 별도 쿼리)

| 검증 | 결과 | 판정 |
|---|---|:-:|
| target 38 EN canonical 정확히 1/master | `n=38 · md5 056512e1 uniform · summary "Allergic rhinitis …"` · exactly1=38 | ✅ |
| ko/en `master_id`·`source_ref_id` 1:1 | **38** (각 master ko+en canonical, source_ref `0a7dee0b`) | ✅ |
| **제외 3건 EN 무접촉** | en row **0** | ✅ |
| **out 13 EN 불변** | md5 `056512e1` × 13 (변화 없음) | ✅ |
| **ko canonical 불변** | target ko canonical **38** | ✅ |
| EN canonical 중복 | **0** | ✅ |

- target 38 EN content·summary = out 13 과 동일(byte-identical) → 동일 약물 일관성 · 새 fact 0.
- target 과 out-of-scope 교집합 0 (스코프 = 38 master_id). **exclude 3 및 대상 외 write 0.**

---

## 5. 멱등성 (ALREADY_COMPLETE)

재실행 → `status=ALREADY_COMPLETE · dbWrite=0` ("대상 en 이미 canonical · 내용 build byte-identical — write 0, 정상 종료"). 재실행 write 0 확인.

---

## 6. 필수 게이트 · 중지조건 준수

| 게이트 | 준수 |
|---|---|
| target 38 / exclude 3 유지 · 교집합 0 | ✅ |
| persist 대상 정확히 38 | ✅ (step1 38 · step2 38) |
| ko/en master_id·source_ref 1:1 | ✅ (38) |
| ko 에 없는 medical fact 0 | ✅ (build == out en byte-identical) |
| 수치·금기·주의 강도 보존 | ✅ (TEST-LOG) |
| 한글·`<table>`·주석·이중 escape 0 | ✅ (build 게이트) |
| ko canonical 불변 · exclude 3 및 대상 외 write 0 | ✅ (독립 검증) |
| EN canonical 중복 0 | ✅ |

**결론**: 로라타딘 10mg 정 **EN 38건 canonical LIVE** (ko/en 완결). out 13·exclude 3·ko 전량 불변, 멱등 확인. 로라타딘 10mg 정 ko/en 완결 종료.
