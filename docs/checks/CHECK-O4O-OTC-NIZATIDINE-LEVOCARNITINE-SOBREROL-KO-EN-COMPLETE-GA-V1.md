# CHECK — WO-O4O-OTC-NIZATIDINE-LEVOCARNITINE-SOBREROL-KO-EN-COMPLETE-GA-V1

**에이전트 가 (단일 write-owner) · APPLIED (production DB write) · 2026-07-20**

백업 후보 3그룹을 순서대로 ko authored canonical 승격 → en 재사용 canonical 까지 **각각 연속 완결**.
각 그룹 독립. fp-probe 로 target 재고정(감사 JSON top5 미열거 백업 후보).

---

## 1. 대상 재확인 (fp-probe · runner dry-run 권위)

| 그룹 | fp(그대로확장) | source_ref | coarse(easy) | target | exclude | other | authored충돌 | nonOral |
|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 니자티딘 75mg 정 | `db6e1f0bb7d9763f` | `048ba86f…` | 21 | **18** | 3 (1fp) | 0 | 0 | 0 |
| 엘카르니틴 330mg 정 | `a75d4ff900dbe2a9` | `035efa8f…` | 42 | **16** | 26 (10fp) | 0 | 0 | 0 |
| 소브레롤 200mg 캡슐 | `2e37307573cfb189` | `0ff909f4…` | 15 | **15** | 0 | 0 | 0 | 0 |

- 전 그룹 예상 target 정확 일치(18/16/15) · 예상 exclude 정확 일치(3/26/0) · 교집합 0 · easyCanonical정확히1 = target · 이미 authored out 은 coarse 밖(충돌 0).

---

## 2. ko 승격 (그룹별)

| 그룹 | dry-run 2회 | apply(easy demote/authored flip/audit) | SPD+audit | 사후검증 | 재실행 |
|---|:-:|---|:-:|---|:-:|
| 니자티딘 | byte-identical PASS | 18 / 18 / 18 | 54+18=**72** | canon1=18·authored=18·dep=18·dup=0 | ALREADY_UPGRADED |
| 엘카르니틴 | byte-identical PASS | 16 / 16 / 16 | 48+16=**64** | canon1=16·authored=16·dep=16·dup=0 | ALREADY_UPGRADED |
| 소브레롤 | byte-identical PASS | 15 / 15 / 15 | 45+15=**60** | canon1=15·authored=15·dep=15·dup=0 | ALREADY_UPGRADED |

- 독립검증(별도 SELECT): 전 그룹 `canon1=T·authored=T·dep_easy=T·right_ref(source_ref)=T·dup=0·audit=T`. 제외 미접촉(still_easy=3/26/0).
- ⚠️ 엘카르니틴 apply 1회차 native 크래시(부분 write 0 — 트랜잭션 게이트 보호) → 재실행으로 정상 APPLIED, 이후 ALREADY_UPGRADED 확인.

---

## 3. EN 완결 (그룹별 · 검토완료 EN 재사용)

EN 정본 = ko runner `rollback_master_ids`(master_id 스코프). struct = 마스터 번역(`otc-en-translations-v1.json`) 동일 groupKey entry 그대로 채택 → `buildDrugOtcEnConsumerHtml` 산출이 동일 약물 out master live en canonical 과 **byte-identical(diff 0)**. summary = summaryTable Main symptoms(out 컬럼값 동일). 배치 전용 파일 3종.

| 그룹 | build md5 = live out en | out(공유 source_ref) | ko 동일성(out==target) | en needs_review→canonical | en write | 재실행 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| 니자티딘 | `e18e8f84…` | 33 | md5 `570e1e97` 동일 | 18 → 18 | **36** | ALREADY_COMPLETE |
| 엘카르니틴 | `4319e705…` | 12 | md5 `94749597`(target 동일) | 16 → 16 | **32** | ALREADY_COMPLETE |
| 소브레롤 | `e987fc7c…` | 3 | md5 `c05847a8`(target 동일) | 15 → 15 | **30** | ALREADY_COMPLETE |

- 전 그룹 consistencyMatch true · builtMd5 == referenceEn · ko 에 없는 medical fact 0 · 한글/`<table>`/주석/이중escape 0 · 지문 불변(fpOk=T) · 사후 enCanonical=T·nr=0·dup=0·koCanonical=T.
- 독립검증: en canonical = T · nr 0 · **md5 uniq=1** · master 1:1.

---

## 4. write 합계

| 그룹 | ko(SPD+audit) | en | 소계 |
|---|:-:|:-:|:-:|
| 니자티딘 | 72 | 36 | **108** |
| 엘카르니틴 | 64 | 32 | **96** |
| 소브레롤 | 60 | 30 | **90** |
| **합계** | 196 | 98 | **294** |

> WO 예상치(니자티딘 90/엘카르니틴 80/소브레롤 75, 합 245)는 그룹당 5T 가정. 실제는 6T(ko 4T=stepA insert T + demote T + flip T + audit T, en 2T) — 3그룹 모두 authored needs_review 사전 0 이라 stepA insert = T. 데이터·게이트 정상, 수치 차이는 산정 방식 차이.

**결론**: 니자티딘 75mg 정(ko 18+en 18) · 엘카르니틴 330mg 정(ko 16+en 16) · 소브레롤 200mg 캡슐(ko 15+en 15) **canonical LIVE**. 3그룹 각각 완결·멱등, 제외/out 전량 불변.
