# CHECK-O4O-OTC-DIOSMIN-300MG-KO-EN-COMPLETE-DA-V1 — 디오스민 300mg 캡슐 ko 승격 + 영어 완결 (에이전트 다)

WO: `WO-O4O-OTC-DIOSMIN-300MG-KO-EN-COMPLETE-DA-V1` · 일자: 2026-07-20 · 상태: **완료 — ko 38 승격 + en 38 canonical LIVE (독립검증·no-op PASS)**
runner: `drug-otc-grounded-upgrade-runner.ts`(ko) · `drug-otc-en-complete-runner.ts`(en) · 감사 기준: 커밋 `c15c6bbb4`(에이전트 가) · 채널: Cloud SQL Proxy(:5442) → production.

---

## 0. 결론

> **디오스민 300mg 캡슐 38 target 을 같은 write-owner 로 ko 승격 → en 완결 연속 처리. ko: e약은요→authored canonical 38(SPD 114·audit 38). en: needs_review 38 → canonical 38(write 76). 각 단계 dry-run 2회 byte-identical · TX 사후검증 PASS · 독립검증 PASS · 재실행 no-op(ALREADY_UPGRADED / ALREADY_COMPLETE).**
>
> **스코프 안전**: source_ref_id `05be62a5…` = **50 ko 공유**(38 target[fp e0a551d8] + 12 out). out12 이미 en canonical LIVE. → en 은 **38 master_id 리스트로만 스코프**(source_ref_id 스코프 금지). 38 ko == 12 ko(byte-identical md5 `2b029385…`, 동일 약물) → 번역 = out12 검토완료 en 재구성, **build == live out12 en byte-identical(md5 `5e22fbf8bb041d8bd482f767e0f278c6`)** 게이트로 새 medical fact 0 증명. 결과: 디오스민 300mg **전체 50 master en 통일**.

---

## 1. ko 승격 (grounded-upgrade runner)

| 게이트 | 값 | 기대 | 판정 |
|---|---:|---:|:---:|
| coarse total | 45 | 45 | ✅ |
| target (fp e0a551d8) | **38** | 38 | ✅ |
| excluded (비대상 2 fp: 21bd2e89·2c027163 = 4+3) | **7** | 7 | ✅ |
| other / 교집합 | 0 / 0 | 0 / 0 | ✅ |
| easy STORE ko canonical 정확히 1 | 38 | 38 | ✅ |
| authored 충돌 / 기존 nr | 0 / 0 | 0 / 0 | ✅ |

**apply**: STEP A authored needs_review INSERT 38 · STEP B easy demote 38 · authored flip 38 · audit `canonical_replaced` 38. SPD 114 · audit 38 · 총 152.
TX 사후검증: canonical1 38 · authored 38 · deprecatedEasy 38 · dup 0 → PASS. 재실행 **ALREADY_UPGRADED**(write 0). dry-run 2회 byte-identical.

---

## 2. en 완결 (en-complete runner)

### 사전 스코프 조사

| 축 | 값 | 처리 |
|---|---|---|
| 38 target 내부 en | canonical 0 · nr 0 | 대상(master_id 스코프) |
| out (source_ref 공유) | ko 12 · en canonical 12(LIVE) | 미접촉 |
| source_ref 05be62a5 총 | ko 50 · en 12 | source_ref 스코프 금지 |
| 38 ko vs 12 ko | md5 `2b029385…` 동일 | 동일 약물 |
| out en canonical | `5e22fbf8…` 균일(12) | 재사용 기준 |

### 번역 · 게이트

- 번역 = out12 검토완료 en 재구성(`otc-en-translations-diosmin-300mg-v1.json`, GUIDE V0.5·GLOSSARY V0.2).
- **일관성 게이트**: build md5 `5e22fbf8bb041d8bd482f767e0f278c6` == live out12 en → byte-identical(새 fact 0 증명).
- 한글 0 · `<table>` 0 · 주석 0 · 이중 escape 0 · sd-warn 유지 · 필수필드 누락 0.

### TEST-LOG (ko↔en 수치·용법·기간·금기·주의 대조)

| 축 | ko canonical | en (byte-identical to LIVE) | 보존 |
|---|---|---|:---:|
| 효능 | 정맥부전 다리 중압감·통증, 모세혈관 취약증 보조치료, 치질 징후 | heaviness and pain in the legs … fragile capillaries … signs of haemorrhoids | ✅ |
| 용량 | 1회 **1정** 1일 **2회** | one capsule **twice a day** | ✅ 수치 |
| 증량 | 치질 재발·악화 시 1일 **1,200~1,800mg** | up to **1,200–1,800 mg a day** | ✅ |
| 금기 | 과민증·**수유부** 복용 안 함 | Do not take this if you have ever reacted … or if you are **breastfeeding** | ✅ 강도 |
| 주의(임부) | 임부 복용 전 약사 상담 | Talk to a pharmacist before taking it if you are pregnant | ✅ |
| 기간·경고 | 오래 복용 말고, 안 나아지면 **항문검사**·치료 재검토 | Do not take it for a long period … an **examination of the anus** and a review of your treatment | ✅ |

> ko 에 없는 새 medical fact **0**. build byte-identical 이 최종 증명.

### 전개·완결 (en write 76)

| 단계 | 연산 | 수 | 기대 | 판정 |
|---|---|---:|---:|:---:|
| STEP1 | en needs_review INSERT | **38** | 38 | ✅ |
| STEP2 | needs_review → canonical flip | **38** | 38 | ✅ |
| flip 지문 불변 | content md5 전후 동일 | 38/38 | 38 | ✅ |

- **TX 사후검증**: en canonical 38 · nr 0 · dup 0 · **ko canonical 38 불변** → PASS → COMMIT.
- **독립 검증(별도 pg)**: 38 en canonical 38 · exactly1 38 · nr 0 · ko 38 · 38 en md5 균일 `5e22fbf8…`(=live 12) · **out12 en 불변**.
- **재실행 no-op**: ALREADY_COMPLETE(write 0). dry-run 2회 byte-identical.

---

## 3. 게이트 준수 / 중단 조건

| 게이트 | 결과 |
|---|---|
| source_ref_id 공유 조사 | ✅ 50 공유(38+12), 38 스코프 |
| ko/en master_id 1:1 | ✅ |
| ko 에 없는 fact 0 | ✅ build == live en byte-identical |
| 한글 0·table·주석·이중escape 0 | ✅ |
| ko 불변·중복 0·대상 외 write 0 | ✅ (out12 미접촉) |

중단 조건 해당 없음(대상 38 일치 · target/exclude 불변 · 혼입 0 · 안전지문·수치 불일치 0 · 충돌 0 · write ko 152/en 76 = 예상 일치 · 사후검증 PASS).

---

## 4. 완료 보고 요약

- **ko**: e약은요→authored canonical 38 LIVE (SPD 114·audit 38·총 152) · ALREADY_UPGRADED no-op
- **en**: needs_review 38 → canonical 38 LIVE (write 76) · ALREADY_COMPLETE no-op
- **번역**: build byte-identical to live out12 en(md5 `5e22fbf8bb041d8bd482f767e0f278c6`) — 디오스민 300mg 50 master en 통일
- **독립 검증**: PASS(ko·en) · **ko/en 불변**: out12 en·타 그룹 미접촉
- **commit SHA**: 본 커밋

> 디오스민 300mg 캡슐 ko(38)·en(38) 완결. Track A clean 후보(에르도스테인·트리메부틴·바실루스·디오스민) ko/en 완결. 로라타딘·알벤다졸·알마게이트는 에이전트 가 소유.
