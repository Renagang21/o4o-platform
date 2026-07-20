# CHECK — WO-O4O-OTC-CLONIXIN-125MG-SOFTCAP-KO-EN-COMPLETE-GA-V1

**에이전트 가 (단일 write-owner) · APPLIED (production DB write) · 2026-07-20**

클로닉신리시네이트 125mg 연질캡슐 target 27건을 ko authored canonical 승격 → en 번역·디자인·canonical 까지 **연속 완결**.

---

## 1. 대상 재확인 (bridge full-content fingerprint)

| 항목 | 값 |
|---|:-:|
| target (fp `5f1cb691ae1d06e8`) | **27** (전건 oral) |
| coarse | **29** |
| exclude (단일 fp `4fa9e63b65c211ad`) | **2** (안전지문불일치) |
| other(미분류) | **0** (29 = 27 + 2) · 교집합 0 |
| source_ref_id | `03de1849-7d18-4ea4-8896-63a3658540c4` |

---

## 2. ko 승격

- selftest PASS(14) · **dry-run 2회 byte-identical PASS**(target 27/27, upgradeState easy 27, 이상 0).
- apply(이중게이트): **easy demote 27 · authored flip 27 · audit 27** · SPD 81. 사후검증 `canonical1=27·authored=27·deprecatedEasy=27·dup=0`.
- **독립 검증**: target `canon1=27·authored=27·dep=27` · audit 27. **제외 2 미접촉**(easy canonical 2 유지·authored/audit 0).
- 재실행 → `ALREADY_UPGRADED · write 0`.

---

## 3. EN 완결

### 스코프
- EN 정본 = ko runner `rollback_master_ids` **27** (master_id 스코프, source_ref 단독 열거 금지).
- source_ref `03de1849` 공유 ko canonical **34** (27 target + **7 out**). out 7 EN canonical **LIVE**(uniform md5 `d359211f77019739e5f0ec8d5b46931d`, summary **null**). target 27 기존 EN **0**.

### 번역 (그룹당 1건 · 검토완료 EN 재사용)
- 배치 전용 파일: [`otc-en-translations-clonixin-125mg-softcap-v1.json`](../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-clonixin-125mg-softcap-v1.json). GUIDE V0.5·GLOSSARY V0.2·TEST-LOG 포함.
- **표준 번역 파일에 entry 부재** → 동일 약물 out 7 의 **live en canonical HTML 에서 `DrugOtcEnTranslation` 필드를 역구성**, `buildDrugOtcEnConsumerHtml` 산출 md5 `d359211f` = live out en **byte-identical(diff 0)** 확인 → 검토완료 EN 재사용으로 **ko 에 없는 medical fact 0** 증명.
- TEST-LOG: `one to two capsules (125–250 mg) three times a day`·다른 소염진통제 병용금지 보존 · 금기(소화성궤양·NSAID 알레르기·CABG·임부·중증 간/신·심부전·IBD) · 주의(고혈압·기관지천식·간/신) — 대상·강도 보존.

### 실행
- **dry-run 2회 byte-identical PASS**(consistencyMatch true, 이상 0).
- apply(이중게이트): **en needs_review 27 INSERT → canonical 27 flip**(지문 불변 27/27) · EN write 54. 사후검증 `enCanonical=27·nr=0·dup=0·koCanonical=27`.

---

## 4. ko/en 독립 검증

| 검증 | 결과 | 판정 |
|---|---|:-:|
| target 27 EN canonical 정확히 1/master | `md5 d359211f uniform · summary null` · exactly1=27 | ✅ |
| ko/en `master_id`·`source_ref_id` 1:1 | **27** | ✅ |
| **제외 2 미접촉** | EN row **0** · ko `mfds_easy_drug:canonical × 2`(불변) | ✅ |
| **대상 밖 기존 EN 보호** — out 7 불변 | md5 `d359211f` × 7 | ✅ |
| ko canonical 불변 · EN canonical 중복 0 | koCanonical 27 · dup 0 | ✅ |
| 재실행 | ko `ALREADY_UPGRADED` · en `ALREADY_COMPLETE` (write 0) | ✅ |

---

## 5. write 합계 · 게이트

- **ko**: SPD 81 + audit 27 = 108 · **en**: 54 · **총 162** (예상 최대 162 일치).
- 필수 게이트 전부 준수: target 27 / exclude 2 / other 0 · 제외 2 전량 미접촉 · 대상 밖 기존 EN 보호 · ko 에 없는 fact 0 · 수치·용법·금기·주의 강도 보존 · 한글/`<table>`/주석/이중escape 0 · ko/en 1:1 · 대상 외 write 0 · canonical 중복 0 · 디오스민 groupKey/파일 미접촉.

**결론**: 클로닉신리시네이트 125mg 연질캡슐 **ko 27 + en 27 canonical LIVE** (ko/en 완결). 제외 2·out 7·ko 전량 불변, 멱등 확인. 연속 완결 종료.
