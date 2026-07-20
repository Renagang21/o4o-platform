# CHECK-O4O-OTC-BROMELAIN-100MG-KO-EN-COMPLETE-DA-V1 — 브로멜라인 100mg 정 ko 승격 + 영어 완결 (에이전트 다)

WO: `WO-O4O-OTC-BROMELAIN-100MG-KO-EN-COMPLETE-DA-V1` · 일자: 2026-07-20 · 상태: **완료 — ko 22 승격 + en 22 canonical LIVE (독립검증·no-op PASS)**
runner: `drug-otc-grounded-upgrade-runner.ts`(ko) · `drug-otc-en-complete-runner.ts`(en) · 채널: Cloud SQL Proxy(:5433) → production.

---

## 0. 결론

> **브로멜라인 100mg 정 22 target 을 같은 write-owner 로 ko 승격 → en 완결 연속 처리. ko: e약은요→authored canonical 22(SPD 66·audit 22·총 88). en: needs_review 22 → canonical 22(write 44). 각 단계 dry-run 2회 byte-identical · TX 사후검증 PASS · 독립검증 PASS · 재실행 no-op(ALREADY_UPGRADED / ALREADY_COMPLETE). 총 write 132.**
>
> **함량 격리**: 100mg 은 45mg 그룹(authored draft `11b41481…`)과 완전 별개 candidate/fp. **45mg 그룹(ko 9·en 9) 미접촉 확인**.
> **스코프 안전**: source_ref_id `0308eaa4…` = **51 ko 공유**(22 target[fp f79d8c596f934095] + 29 out). out29 이미 en canonical LIVE. → en 은 **22 master_id 리스트로만 스코프**. 22 ko == 29 ko(byte-identical md5 `ad63397c…`, 동일 약물·100mg) → 번역 = out29 검토완료 en 재구성(`otc-en-translations-v1.json` 동일 groupKey 발췌), **build == live out29 en byte-identical(md5 `4d4f202fef6f945aced03adb9477be1a`)** 게이트로 새 medical fact 0 증명. 결과: 브로멜라인 100mg **전체 51 master ko+en 통일**.

---

## 1. ko 승격 (grounded-upgrade runner)

정본: next-batch 감사(GA) `otc-grounded-upgrade-next-batch-v1.json` evaluatedSummary — `브로멜라인|100밀리그램|정` targetFp `f79d8c596f934095` · verdict READY · target 22 · bridge 22.
excludeFp 는 **fp-harvest**(`drug-otc-bromelain-100mg-fp-harvest.ts`, runner fingerprint·coarse 쿼리 VERBATIM 재사용, read-only)로 확정. harvest target 22 == GA bridge 22 로 산식 정본 검증.

| 게이트 | 값 | 기대 | 판정 |
|---|---:|---:|:---:|
| coarse total | 86 | 86 | ✅ |
| target (fp f79d8c596f934095) | **22** | 22 | ✅ |
| excluded (비대상 11 fp) | **64** | 64 | ✅ |
| other / 교집합 | 0 / 0 | 0 / 0 | ✅ |
| easy STORE ko canonical 정확히 1 | 22 | 22 | ✅ |
| authored 충돌 / 기존 nr | 0 / 0 | 0 / 0 | ✅ |
| target route | oral(전량) | oral | ✅ |

> exclude 11 fp = 16+9+6+6+6+5+4+4+3+3+2 = 64 (전부 oral, 안전지문불일치). fp = `a997a1bd77c64270`·`4ffd591092293d99`·`bbbe8ddddb8e96fe`·`f9bdc85b3da537f8`·`b196c68bba8f3eea`·`ad96bdaf17dd292b`·`ef7094954139bcca`·`5c6160b5bc6fc5bb`·`9b1526fc3dd4b79f`·`51043688afc1b422`·`53ae867c6036e430`.
> upgradeState(승격 전): authored 0 · easy 22 · none 0.

**apply**: STEP A INSERT 22 · easy demote 22 · authored flip 22 · audit 22. SPD 66 · audit 22 · 총 88.
TX 사후검증: canonical1 22 · authored 22 · deprecatedEasy 22 · dup 0 → PASS. 재실행 **ALREADY_UPGRADED**(write 0). dry-run 2회 byte-identical(contentHash `ad63397c341ab6959fb8c3cdb7238360`).

---

## 2. en 완결 (en-complete runner)

### 사전 스코프 조사

| 축 | 값 | 처리 |
|---|---|---|
| 22 target 내부 en | canonical 0 · nr 0 | 대상(master_id 스코프) |
| out (source_ref 공유) | ko 29 · en canonical 29(LIVE) | 미접촉 |
| source_ref 0308eaa4 총 | ko 51 · en 51(완결 후) | source_ref 스코프 금지 |
| 22 ko vs 29 ko | md5 `ad63397c…` 동일 | 동일 약물·동일 100mg |
| out en canonical | `4d4f202f…` 균일(29) | 재사용 기준 |
| **45mg 그룹** | source_ref `11b41481` ko 9·en 9 | **미접촉(별개 함량·별개 candidate)** |

### 번역 · 게이트

- 번역 = out29 검토완료 en 재구성(`otc-en-translations-bromelain-100mg-v1.json` — `otc-en-translations-v1.json` 동일 groupKey 항목 발췌, out29 en 을 빌드한 원본). summaryField = 형제 en canonical summary 컬럼("Inflammation with swelling; swelling after injury or surgery").
- **일관성 게이트**: build md5 `4d4f202fef6f945aced03adb9477be1a` == live out29 en → byte-identical(새 fact 0 증명).
- 한글 0 · `<table>` 0 · 주석 0 · 이중 escape 0 · sd-warn 유지 · 필수필드 누락 0.

### TEST-LOG (ko↔en · 함량 100mg 보존)

| 축 | ko canonical | en (byte-identical to LIVE) | 보존 |
|---|---|---|:---:|
| 효능 | 부기(부종) 동반 염증 완화, 외상·수술 후 부종 | ease inflammation that comes with swelling, and swelling after injury or surgery | ✅ |
| 성분(함량) | 브로멜라인 **100mg** | Bromelain **100 mg** | ✅ 함량 |
| 용량 | 성인·12세 이상 1회 **100mg** 1일 **2회** 식전 30분 물과 | **100 mg twice a day**, with water, 30 minutes before meals | ✅ 수치 |
| 금기 | 심한 혈액응고이상(혈우병), 심한 간·신질환, 항응고제·항혈소판제, 임부·수유부, 12세 미만 복용 안 함 | **Do not take this** if severe blood clotting disorder (haemophilia), severe liver/kidney disease, anticoagulants/antiplatelet, pregnant/breastfeeding, under 12 | ✅ 강도 |
| 주의 | 항생제(테트라사이클린) 복용자·알레르기 경험자 약사 상담 | Talk to a pharmacist if taking antibiotics such as tetracycline, or had an allergic reaction before | ✅ |
| 분류 | 일반의약품 | Over-the-counter | ✅ |

> ko 에 없는 새 medical fact **0**. 함량 100mg 반영. build byte-identical 이 최종 증명.

### 전개·완결 (en write 44)

| 단계 | 연산 | 수 | 기대 | 판정 |
|---|---|---:|---:|:---:|
| STEP1 | en needs_review INSERT | **22** | 22 | ✅ |
| STEP2 | needs_review → canonical flip | **22** | 22 | ✅ |
| flip 지문 불변 | 22/22 | 22 | ✅ |

- **TX 사후검증**: en canonical 22 · nr 0 · dup 0 · **ko canonical 22 불변** → PASS → COMMIT.
- **독립 검증**: 22 en canonical 22 · ko 22 · 22 en md5 균일 `4d4f202f…`(=live 29) · 22 ko md5 균일 `ad63397c…` · **out29 en/ko 불변** · **45mg 그룹 ko 9·en 9 불변**.
- **재실행 no-op**: ALREADY_COMPLETE(write 0). dry-run 2회 byte-identical.

---

## 3. 필수 게이트 준수

| WO 게이트 | 결과 |
|---|---|
| target 22 / exclude 64 / other 0 | ✅ |
| 45mg 그룹 및 제외 64 전량 미접촉 | ✅ (45mg ko 9·en 9 불변) |
| 대상 밖 EN canonical 보호 | ✅ out29 불변 |
| ko 에 없는 fact 0 | ✅ build == live en byte-identical |
| 함량 100mg 수치·용법·금기·주의 보존 | ✅ (§2 TEST-LOG) |
| ko/en master_id·source_ref_id 1:1 | ✅ |
| 한글·table·주석·이중escape 0 | ✅ |
| 대상 외 write 0 · canonical 중복 0 | ✅ (source_ref footprint 51 = 22 target + 29 out) |

중단 조건 해당 없음(대상 22 일치 · fp 재현 22 · other 0 · 혼입 0 · 충돌 0 · write ko 88/en 44 = 예상 일치 · 사후검증 PASS).

---

## 4. 완료 보고 요약

- **ko**: e약은요→authored canonical 22 LIVE (SPD 66·audit 22·총 88) · ALREADY_UPGRADED no-op
- **en**: needs_review 22 → canonical 22 LIVE (write 44) · ALREADY_COMPLETE no-op · **총 write 132**
- **번역**: build byte-identical to live out29 en(md5 `4d4f202fef6f945aced03adb9477be1a`) — 100mg 51 master en 통일
- **함량 격리**: 45mg 그룹(source_ref 11b41481 · ko 9·en 9) 미접촉 · exclude 64 미접촉
- **독립 검증**: PASS(ko·en) · out29·45mg 불변
- **commit SHA**: 본 커밋

> 브로멜라인 100mg 정 ko(22)·en(22) 완결. 45mg 그룹과 별개 함량·별개 candidate 로 격리. excludeFp 는 runner fingerprint VERBATIM 재사용 fp-harvest 로 확정(target 22 == GA bridge 22 검증).
