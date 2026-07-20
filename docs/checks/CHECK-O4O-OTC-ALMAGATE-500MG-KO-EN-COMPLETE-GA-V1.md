# CHECK — WO-O4O-OTC-ALMAGATE-500MG-KO-EN-COMPLETE-GA-V1

**에이전트 가 (단일 write-owner) · APPLIED (production DB write) · 2026-07-20**

알마게이트 500mg 정 target 37건을 ko authored canonical 승격 → en 번역·디자인·canonical 까지 **연속 완결**.
ko runner + en-complete runner 각 최소 등재.

---

## 1. 대상 재확인 (bridge full-content fingerprint)

| 항목 | 값 |
|---|:-:|
| target (fp `b08e3e7b13e8836f`) | **37** (전건 oral) |
| coarse | **124** |
| exclude (18 fp) | **87** |
| other(미분류) | **0** (124 = 37 + 87) · 교집합 0 |
| source_ref_id | `01a231cd-b471-4d93-8071-b271f8c4627d` |

---

## 2. ko 승격 (easy → authored canonical)

- selftest PASS(14) · **dry-run 2회 byte-identical PASS**(target 37/37, upgradeState easy 37, 이상 0).
- apply(이중게이트): **easy demote 37 · authored flip 37 · audit 37** · SPD 111. 사후검증 `canonical1=37·authored=37·deprecatedEasy=37·dup=0`.
- **독립 검증**: target `canon1=37·authored=37·dep=37` · audit 37. **제외 87 미접촉**(easy canonical 87 유지·authored/audit row 0).
- 재실행 → `ALREADY_UPGRADED · write 0`.

---

## 3. EN 완결

### 스코프
- EN 정본 = ko runner `rollback_master_ids` **37** (master_id 스코프, source_ref 단독 열거 금지).
- source_ref `01a231cd` 공유 ko canonical **63** (37 target + **26 out**). out 26 EN canonical **LIVE**(uniform md5 `8e5a52ffd631fe32252ddc7b847530de`). target 37 기존 EN **0**.

### 번역 (그룹당 1건 · 충실 번역)
- 배치 전용 파일: [`otc-en-translations-almagate-500mg-v1.json`](../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-almagate-500mg-v1.json) (공유 파일 미수정). GUIDE V0.5·GLOSSARY V0.2·TEST-LOG 포함.
- 동일 약물 out 26 검증본(`otc-en-translations-v1.json` verbatim) → `buildDrugOtcEnConsumerHtml` md5 `8e5a52ff` = live out en **byte-identical** → **ko 에 없는 medical fact 0**.
- TEST-LOG: `chew two tablets (1 g) three times a day`·식후 30분~1시간·취침 전 추가 용법 보존 · `12 or older` 연령 보존 · 금기(과민·알츠하이머·치질·부종·임신중독증·설사·미진단 소화관 출혈) · 병용금기(tetracycline계) · 2주 미개선 중단 — 대상·강도 보존.

### 실행
- **dry-run 2회 byte-identical PASS**(consistencyMatch true, 이상 0).
- apply(이중게이트): **en needs_review 37 INSERT → canonical 37 flip**(지문 불변 37/37) · EN write 74. 사후검증 `enCanonical=37·nr=0·dup=0·koCanonical=37`.

---

## 4. ko/en 독립 검증

| 검증 | 결과 | 판정 |
|---|---|:-:|
| target 37 EN canonical 정확히 1/master | `md5 8e5a52ff uniform · summary "Heartburn …"` · exactly1=37 | ✅ |
| ko/en `master_id`·`source_ref_id` 1:1 | **37** | ✅ |
| **제외 87 미접촉** | EN row **0** · ko `mfds_easy_drug:canonical × 87`(불변) · audit row 0 | ✅ |
| out 26 EN 불변 | md5 `8e5a52ff` × 26 | ✅ |
| ko canonical 불변 · EN canonical 중복 0 | koCanonical 37 · dup 0 | ✅ |
| 재실행 | ko `ALREADY_UPGRADED` · en `ALREADY_COMPLETE` (write 0) | ✅ |

---

## 5. write 합계 · 게이트

- **ko**: SPD 111 + audit 37 = 148 · **en**: 74 · **총 222** (예상 최대 222 일치).
- 필수 게이트 전부 준수: target 37 / exclude 87 / other 0 · 제외 87 전량 미접촉 · authored ko/en 충돌 0 · ko 에 없는 fact 0 · 수치·용법·금기·주의 강도 보존 · 한글/`<table>`/주석/이중escape 0 · ko/en 1:1 · 대상 외 write 0 · canonical 중복 0.

**결론**: 알마게이트 500mg 정 **ko 37 + en 37 canonical LIVE** (ko/en 완결). 제외 87·out 26·ko 전량 불변, 멱등 확인. 연속 완결 종료.
