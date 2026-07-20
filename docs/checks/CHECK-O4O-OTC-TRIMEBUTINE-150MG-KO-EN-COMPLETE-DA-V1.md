# CHECK-O4O-OTC-TRIMEBUTINE-150MG-KO-EN-COMPLETE-DA-V1 — 트리메부틴 150mg 정 ko 승격 + 영어 완결 (에이전트 다)

WO: `WO-O4O-OTC-TRIMEBUTINE-150MG-KO-EN-COMPLETE-DA-V1` · 일자: 2026-07-20 · 상태: **완료 — ko 28 승격 + en 28 canonical LIVE (독립검증·no-op PASS)**
runner: `drug-otc-grounded-upgrade-runner.ts`(ko) · `drug-otc-en-complete-runner.ts`(en) · 채널: Cloud SQL Proxy(:5442) → production.

---

## 0. 결론

> **트리메부틴말레산염 150mg 정 28 target 을 같은 write-owner 로 ko 승격 → en 완결 연속 처리(100mg 그룹과 별개 함량). ko: e약은요→authored canonical 28(SPD 84·audit 28·총 112). en: needs_review 28 → canonical 28(write 56). 각 단계 dry-run 2회 byte-identical · TX 사후검증 PASS · 독립검증 PASS · 재실행 no-op(ALREADY_UPGRADED / ALREADY_COMPLETE). 총 write 168.**
>
> **함량 격리**: 150mg 은 100mg 그룹과 완전 별개 fp/candidate. **100mg 그룹 en(66건·md5 `bd0595e5…`) 미접촉 확인**. exclude 21 미접촉.
> **스코프 안전**: source_ref_id `00f0325a…` = **67 ko 공유**(28 target[fp f4c610df] + 39 out). out39 이미 en canonical LIVE. → en 은 **28 master_id 리스트로만 스코프**. 28 ko == 39 ko(byte-identical md5 `386c9a0d…`, 동일 약물·150mg) → 번역 = out39 검토완료 en 재구성, **build == live out39 en byte-identical(md5 `a575ea00d1e754c60df114f82b981056`)** 게이트로 새 medical fact 0 증명. 결과: 트리메부틴 150mg **전체 67 master en 통일**.

---

## 1. ko 승격 (grounded-upgrade runner)

| 게이트 | 값 | 기대 | 판정 |
|---|---:|---:|:---:|
| coarse total | 49 | 49 | ✅ |
| target (fp f4c610df21cf32ef) | **28** | 28 | ✅ |
| excluded (비대상 6 fp = 6+4+3+3+3+2) | **21** | 21 | ✅ |
| other / 교집합 | 0 / 0 | 0 / 0 | ✅ |
| easy STORE ko canonical 정확히 1 | 28 | 28 | ✅ |
| authored 충돌 / 기존 nr | 0 / 0 | 0 / 0 | ✅ |

> exclude 21 = 안전지문불일치 14 + 비대상 authored 7 (6 fp: f38569d8·5d0f4525·be9514b4·9e942b7f·afd4c9b2·ed411d6f). fp 확정 = dry-run fpDistribution harvest(fingerprint 정본 verbatim).

**apply**: STEP A INSERT 28 · easy demote 28 · authored flip 28 · audit 28. SPD 84 · audit 28 · 총 112.
TX 사후검증: canonical1 28 · authored 28 · deprecatedEasy 28 · dup 0 → PASS. 재실행 **ALREADY_UPGRADED**(write 0). dry-run 2회 byte-identical.

---

## 2. en 완결 (en-complete runner)

### 사전 스코프 조사

| 축 | 값 | 처리 |
|---|---|---|
| 28 target 내부 en | canonical 0 · nr 0 | 대상(master_id 스코프) |
| out (source_ref 공유) | ko 39 · en canonical 39(LIVE) | 미접촉 |
| source_ref 00f0325a 총 | ko 67 · en 39 | source_ref 스코프 금지 |
| 28 ko vs 39 ko | md5 `386c9a0d…` 동일 | 동일 약물·동일 150mg |
| out en canonical | `a575ea00…` 균일(39) | 재사용 기준 |
| **100mg 그룹** | en `bd0595e5…` 66 | **미접촉(별개 함량)** |

### 번역 · 게이트

- 번역 = out39 검토완료 en 재구성(`otc-en-translations-trimebutine-150mg-v1.json`). 함량 150mg·용법(100~200mg 1일 3회)은 150mg ko canonical grounding.
- **일관성 게이트**: build md5 `a575ea00d1e754c60df114f82b981056` == live out39 en → byte-identical(새 fact 0 증명).
- 한글 0 · `<table>` 0 · 주석 0 · 이중 escape 0 · sd-warn 유지 · 필수필드 누락 0.

### TEST-LOG (ko↔en · 함량 150mg 보존)

| 축 | ko canonical | en (byte-identical to LIVE) | 보존 |
|---|---|---|:---:|
| 효능 | 식도역류·열공헤르니아, 위·십이지장염·궤양 소화기 이상, 과민성 대장·경련성 결장 | acid reflux and hiatal hernia; gastritis, duodenitis or ulcers …; irritable bowel syndrome and spastic colon | ✅ |
| 성분(함량) | 트리메부틴말레산염 **150mg** | Trimebutine maleate **150 mg** | ✅ 함량 |
| 용량 | 1회 **100~200mg** 1일 **3회** 식전 | **100–200 mg** three times a day, before meals | ✅ 수치 |
| 금기 | 유당 대사 유전질환(갈락토오스 불내성 등) 복용 안 함 | **Do not take this** if you have an inherited problem with lactose metabolism, such as galactose intolerance | ✅ 강도 |
| 주의 | 임부·수유부 복용 전 약사 상담 | Talk to a pharmacist before taking it if you are pregnant or breastfeeding | ✅ |
| 기간·악화 | 증상 오래 지속·악화 시 상담 | Get advice if your symptoms last a long time or get worse | ✅ |

> ko 에 없는 새 medical fact **0**. 함량 150mg 반영. build byte-identical 이 최종 증명.

### 전개·완결 (en write 56)

| 단계 | 연산 | 수 | 기대 | 판정 |
|---|---|---:|---:|:---:|
| STEP1 | en needs_review INSERT | **28** | 28 | ✅ |
| STEP2 | needs_review → canonical flip | **28** | 28 | ✅ |
| flip 지문 불변 | 28/28 | 28 | ✅ |

- **TX 사후검증**: en canonical 28 · nr 0 · dup 0 · **ko canonical 28 불변** → PASS → COMMIT.
- **독립 검증**: 28 en canonical 28 · exactly1 28 · nr 0 · ko 28 · 28 en md5 균일 `a575ea00…`(=live 39) · **out39 en 불변** · **100mg 그룹 en 66 불변(md5 bd0595e5)**.
- **재실행 no-op**: ALREADY_COMPLETE(write 0). dry-run 2회 byte-identical.

---

## 3. 필수 게이트 준수

| WO 게이트 | 결과 |
|---|---|
| target 28 / exclude 21 / other 0 | ✅ |
| 100mg 그룹 및 제외 21 전량 미접촉 | ✅ (100mg en bd0595e5 66 불변) |
| 대상 밖 EN canonical 보호 | ✅ out39 불변 |
| ko 에 없는 fact 0 | ✅ build == live en byte-identical |
| 함량 150mg 수치·용법·금기·주의 보존 | ✅ (§2 TEST-LOG) |
| ko/en master_id·source_ref_id 1:1 | ✅ |
| 한글·table·주석·이중escape 0 | ✅ |
| 대상 외 write 0 · canonical 중복 0 | ✅ |

중단 조건 해당 없음(대상 28 일치 · target/exclude 불변 · 혼입 0 · 충돌 0 · write ko 112/en 56 = 예상 일치 · 사후검증 PASS).

---

## 4. 완료 보고 요약

- **ko**: e약은요→authored canonical 28 LIVE (SPD 84·audit 28·총 112) · ALREADY_UPGRADED no-op
- **en**: needs_review 28 → canonical 28 LIVE (write 56) · ALREADY_COMPLETE no-op · **총 write 168**
- **번역**: build byte-identical to live out39 en(md5 `a575ea00d1e754c60df114f82b981056`) — 150mg 67 master en 통일
- **함량 격리**: 100mg 그룹 en(66·bd0595e5) 미접촉 · exclude 21 미접촉
- **독립 검증**: PASS(ko·en) · out39·100mg 불변
- **commit SHA**: 본 커밋

> 트리메부틴 150mg 정 ko(28)·en(28) 완결. 100mg 그룹과 별개 함량으로 격리. 공유 runner 에 에이전트 가 클로닉신 미커밋 등재가 함께 있어 forward 커밋(파괴 아님, 가 데이터파일 미접촉).
