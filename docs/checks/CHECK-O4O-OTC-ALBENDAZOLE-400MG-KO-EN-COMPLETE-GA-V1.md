# CHECK — WO-O4O-OTC-ALBENDAZOLE-400MG-KO-EN-COMPLETE-GA-V1

**에이전트 가 (단일 write-owner) · APPLIED (production DB write) · 2026-07-20**

알벤다졸 400mg 정 target 38건을 ko authored canonical 승격 → en 번역·디자인·canonical 까지 **연속 완결**.
ko runner([`drug-otc-grounded-upgrade-runner.ts`](../../apps/api-server/src/scripts/drug-otc-grounded-upgrade-runner.ts)) + en-complete runner([`drug-otc-en-complete-runner.ts`](../../apps/api-server/src/scripts/drug-otc-en-complete-runner.ts)) 각 최소 등재.

---

## 1. 대상 재확인 (bridge full-content fingerprint)

| 항목 | 값 |
|---|:-:|
| target (fp `879d80e7afe2d0f4`) | **38** |
| coarse | **92** |
| exclude (7 fp) | **54** — 안전지문불일치 47(`160f299c`19·`10384de1`17·`28d29201`4·`7da304f9`4·`4bc58b99`3) + 비대상 authored 7(`44ef883e`4·`12dd978c`3) |
| other(미분류) | **0** (92 = 38 + 54) · 교집합 0 |
| source_ref_id | `0178f85b-94d7-4ac9-a061-ac4c2d9ad750` |

---

## 2. ko 승격 (easy → authored canonical)

- selftest PASS(14) · **dry-run 2회 byte-identical PASS**(target 38/38, upgradeState easy 38, 이상 0).
- apply(이중게이트): **easy demote 38 · authored flip 38 · audit 38** · SPD 114. in-script 사후검증 `canonical1=38·authored=38·deprecatedEasy=38·dup=0`.
- **독립 검증**: target `canon1=38·authored=38·dep=38` · audit(source_ref 기준) 38. **제외 54 미접촉**(easy canonical 54 유지·authored/audit row 0).
- 재실행 → `ALREADY_UPGRADED · write 0`.

---

## 3. EN 완결

### 스코프
- EN 정본 = ko runner `rollback_master_ids` **38** (master_id 스코프, source_ref 단독 열거 금지).
- source_ref `0178f85b` 공유 ko canonical **71** (38 target + **33 out**). out 33 EN canonical **LIVE**(uniform md5 `11800175070e91f771fd414cdf040d22`). target 38 기존 EN **0**.

### 번역 (그룹당 1건 · 충실 번역)
- 배치 전용 파일: [`otc-en-translations-albendazole-400mg-v1.json`](../../docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-albendazole-400mg-v1.json) (공유 파일 미수정). GUIDE V0.5·GLOSSARY V0.2·TEST-LOG 포함.
- 동일 약물 out 33 검증본(`otc-en-translations-v1.json` verbatim) → `buildDrugOtcEnConsumerHtml` md5 `11800175` = live out en **byte-identical** → **ko 에 없는 medical fact 0**.
- TEST-LOG: `400 mg once`·요충 7일 뒤 재투여·분선충+촌충 3일 용법 보존 · `24 months / under 2` 연령 보존 · 병용금기 8종(theophylline·cimetidine·praziquantel·dexamethasone·ritonavir·phenytoin·carbamazepine·phenobarbital) 대상 보존.

### 실행
- **dry-run 2회 byte-identical PASS**(consistencyMatch true, 이상 0).
- apply(이중게이트): **en needs_review 38 INSERT → canonical 38 flip**(지문 불변 38/38) · EN write 76. 사후검증 `enCanonical=38·nr=0·dup=0·koCanonical=38`.

---

## 4. ko/en 독립 검증

| 검증 | 결과 | 판정 |
|---|---|:-:|
| target 38 EN canonical 정확히 1/master | `md5 11800175 uniform · summary "Roundworm …"` · exactly1=38 | ✅ |
| ko/en `master_id`·`source_ref_id` 1:1 | **38** | ✅ |
| **제외 54 미접촉** | EN row **0** · ko `mfds_easy_drug:canonical × 54`(불변) · audit row 0 | ✅ |
| out 33 EN 불변 | md5 `11800175` × 33 | ✅ |
| ko canonical 불변 · EN canonical 중복 0 | koCanonical 38 · dup 0 | ✅ |
| 재실행 | ko `ALREADY_UPGRADED` · en `ALREADY_COMPLETE` (write 0) | ✅ |

---

## 5. write 합계 · 게이트

- **ko**: SPD 114 + audit 38 = 152 · **en**: 76 · **총 228** (예상 최대 228 일치).
- 필수 게이트 전부 준수: target 38 / exclude 54 / other 0 · 제외 54 전량 미접촉 · authored ko/en 충돌 0 · ko 에 없는 fact 0 · 수치·연령·용법·금기·주의 강도 보존 · 한글/`<table>`/주석/이중escape 0 · ko/en 1:1 · 대상 외 write 0 · canonical 중복 0.

**결론**: 알벤다졸 400mg 정 **ko 38 + en 38 canonical LIVE** (ko/en 완결). 제외 54·out 33·ko 전량 불변, 멱등 확인. 연속 완결 종료.
