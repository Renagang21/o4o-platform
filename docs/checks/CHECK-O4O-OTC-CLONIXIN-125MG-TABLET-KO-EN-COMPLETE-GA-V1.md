# CHECK — WO-O4O-OTC-CLONIXIN-125MG-TABLET-KO-EN-COMPLETE-GA-V1

**에이전트 가 (단일 write-owner) · APPLIED (production DB write) · 2026-07-20**

클로닉신리시네이트 125mg **정** target 26건을 ko authored canonical 승격 → en 번역·디자인·canonical 까지 **연속 완결**.
125mg **연질캡슐**(SOFTCAP-GA-V1, 27건)과 별개 groupKey(제형 축). 전량 미접촉.

---

## 1. 대상 재확인 (fp-probe 재고정 · runner dry-run 권위)

감사 JSON([`NEXT-BATCH-AUDIT-GA-V1`](CHECK-O4O-OTC-GROUNDED-UPGRADE-NEXT-BATCH-AUDIT-GA-V1.md))의 **백업 후보**(§3 "클로닉신 125mg 정(26)")로, top5 에 target master IDs 미열거 → read-only fp-probe 로 재고정.

| 항목 | 값 |
|---|:-:|
| target (fp `30552579b0a3088e`, 그대로확장) | **26** (전건 oral·form 정) |
| coarse (easy SPD 보유) | **51** |
| exclude (2 fp: `84b185d4` 20 + `4374e598` 5) | **25** (안전지문불일치) |
| other(미분류) | **0** (51 = 26 + 25) · 교집합 0 |
| source_ref_id (authored draft) | `01994863-920a-45ea-97d1-f493416cafa7` |
| 이미 authored 29 (easy SPD 부재) | coarse 밖 → **authored 충돌 0** |
| disjoint | softcap 27 ∩ 0 · softcap exclude ∩ 0 · 트리메부틴150 28 ∩ 0 |

---

## 2. ko 승격

- selftest PASS(14) · **dry-run 2회 byte-identical PASS**(target 26/26, other 0, 교집합 0, easyCanonical정확히1 26, authoredConflict 0, nonOral 0, 이상 0).
- apply(이중게이트): **easy demote 26 · authored flip 26 · audit 26** · SPD 78(stepA 26 + demote 26 + flip 26). 사후검증 `canonical1=26·authored=26·deprecatedEasy=26·dup=0`.
- **독립 검증**: target `canon1=26·authored=26·dep_easy=26·right_ref(source_ref 01994863)=26` · audit 26. **제외 25 미접촉**(still_easy=25) · 이미 authored 29 미접촉.
- 재실행 → `ALREADY_UPGRADED · write 0`.

---

## 3. EN 완결

### 스코프
- EN 정본 = ko runner `rollback_master_ids` **26** (master_id 스코프, source_ref 단독 열거 금지).
- source_ref `01994863` 공유 ko canonical **55** (26 target + **29 out**). out 29 EN canonical **LIVE**(uniform md5 `67144df254a3d2a4ce92efc34ecd4a59`, summary **null**). target 26 기존 EN **0**(clean).

### 번역 (그룹당 1건 · 검토완료 EN 재사용)
- 배치 전용 파일: [`otc-en-translations-clonixin-125mg-jeong-v1.json`](../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-clonixin-125mg-jeong-v1.json). GUIDE V0.5·GLOSSARY V0.2·TEST-LOG 포함.
- struct = bulk **batch-01** 번역(`otc-en-translations-batch-01-v1.json`)의 동일 groupKey entry(title **"Clonixin Lysinate 125 mg Tablet"**) 그대로 채택 → `buildDrugOtcEnConsumerHtml` 산출 md5 `67144df2` = live out 29 en **byte-identical(diff 0)**.
- **동일 약물 증명**: ko content out-29 md5 == target-26 md5 (`c1c0bede8e6de07e5f2b0df3f4b2b858`) → ko 에 없는 medical fact 0. 125mg 연질캡슐 EN(md5 `d359211f`, "Soft Capsule")은 **함량만 같은 별개 제형 → 재사용 금지**, title "Tablet" 로 구분.
- TEST-LOG: `one to two tablets (125–250 mg) three times a day`·다른 소염진통제 병용금지 보존 · 금기(소화성궤양·NSAID/아스피린 알레르기·천식/두드러기·CABG·중증 간/신·중증 심부전·IBD·임부) · 주의(고혈압·심부전·기관지천식·간/신 → 약사 상담) — 대상·강도 보존.

### 실행
- **dry-run 2회 byte-identical PASS**(consistencyMatch true, builtMd5=referenceEn `67144df2`, 이상 0).
- apply(이중게이트): **en needs_review 26 INSERT → canonical 26 flip**(지문 불변 26/26) · EN write 52. 사후검증 `enCanonical=26·nr=0·dup=0·koCanonical=26`.
- 재실행 → `ALREADY_COMPLETE · write 0`.

---

## 4. ko/en 독립 검증

| 검증 | 결과 | 판정 |
|---|---|:-:|
| target 26 EN canonical 정확히 1/master | `md5 67144df2 uniform · summary null` · en_canon=26·nr=0 | ✅ |
| ko/en `master_id`·`source_ref_id` 1:1 (source_ref 01994863) | **26** | ✅ |
| **제외 25 미접촉** | still_easy=25 (fp 84b185d4·4374e598 불변) | ✅ |
| **이미 authored 29 미접촉** | source_ref 01994863 out, ko/en 불변 | ✅ |
| ko canonical 불변 · EN canonical 중복 0 | koCanonical 26 · dup 0 | ✅ |
| 재실행 | ko `ALREADY_UPGRADED` · en `ALREADY_COMPLETE` (write 0) | ✅ |

---

## 5. write 합계 · 게이트

- **ko**: SPD 78 + audit 26 = 104 · **en**: 52 · **총 156** (예상 최대 156 일치).
- 필수 게이트 전부 준수: target 26 / exclude 25 / other 0 · 제외 25 전량 미접촉 · 이미 authored 29 미접촉 · 대상 밖 기존 EN(out 29·softcap 34) 보호 · ko 에 없는 fact 0 · 수치·용법·금기·주의 강도 보존 · 한글/`<table>`/주석/이중escape 0 · ko/en 1:1 · 대상 외 write 0 · canonical 중복 0 · 연질캡슐 groupKey/파일 미접촉.

**결론**: 클로닉신리시네이트 125mg **정 ko 26 + en 26 canonical LIVE** (ko/en 완결). 제외 25·이미 authored 29·연질캡슐 전량 불변, 멱등 확인. 연속 완결 종료.
