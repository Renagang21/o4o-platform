# CHECK-O4O-OTC-ACETAMINOPHEN-NAPROXEN-KO-EN-COMPLETE-DA-V1 — 아세트아미노펜 325mg / 나프록센 250mg 연질캡슐 ko 승격 + 영어 완결 (에이전트 다)

WO: `WO-O4O-OTC-ACETAMINOPHEN-NAPROXEN-KO-EN-COMPLETE-DA-V1` · 일자: 2026-07-20 · 상태: **완료 — 2그룹 ko+en canonical LIVE (독립검증·no-op PASS)**
runner: `drug-otc-grounded-upgrade-runner.ts`(ko) · `drug-otc-en-complete-runner.ts`(en) · 채널: Cloud SQL Proxy(:5433) → production.

---

## 0. 결론

> **아세트아미노펜 325mg 연질캡슐 18 + 나프록센 250mg 연질캡슐 15 = 총 33 target 을 그룹별 단일 write-owner 로 ko 승격 → en 완결 순차 처리. 각 단계 dry-run 2회 byte-identical · TX 사후검증 PASS · 독립검증 PASS · 재실행 no-op(ALREADY_UPGRADED / ALREADY_COMPLETE).**
>
> **SPD write**: 아세트아미노펜 90(ko 54 + en 36) + 나프록센 75(ko 45 + en 30) = **165**(WO 예상 일치). audit ko 18+15=33.
> **제형 격리**: 두 그룹 모두 coarse 전량 **연질캡슐 only**(정·캡슐 혼입 0). fp-harvest allForms=["연질캡슐"] 확인.
> **스코프 안전**: candidate/source_ref_id 공유 out master 는 이미 en canonical LIVE. → en 은 **각 그룹 target master_id 리스트로만 스코프**(source_ref_id 스코프 금지). 대상 ko == out ko(동일 약물) → out 검토완료 en 재구성, **build == live out en byte-identical** 게이트로 새 medical fact 0 증명.

---

## 1. 아세트아미노펜 325mg 연질캡슐 (target 18 / exclude 6)

정본: GA next-batch `evaluatedSummary` — targetFp `26587fd5ff28e6b3` · READY · target 18 · bridge 18. excludeFp fp-harvest 확정(target 18 == bridge 18 자체검증).

### ko
| 게이트 | 값 | 판정 |
|---|---:|:---:|
| coarse / target / exclude / other | 24 / 18 / 6 / 0 | ✅ |
| 교집합 / easy canonical 정확히1 / authored 충돌 | 0 / 18 / 0 | ✅ |
| allForms (연질캡슐 only) / target route | 연질캡슐 / oral | ✅ |

> exclude 3 fp = 2+2+2 = 6 (`3cbae904`·`2b1fa0e4`·`8ace0cbc`, 전부 oral·연질캡슐).
> **apply**: SPD 54(nr 18 + demote 18 + flip 18) + audit 18 · post canonical1 18·authored 18·deprecatedEasy 18·dup 0 → PASS · ALREADY_UPGRADED no-op · contentHash `7d008999…`.

### en
- source_ref `07fd7b8f` = 20 ko 공유(18 target + 2 out). out2 en canonical LIVE md5 `daf4d06d…`. 18 ko == 2 ko(byte-identical `7d008999…`).
- 번역 = out2 검토완료 en 재구성(`otc-en-translations-v1.json` 동일 groupKey 발췌). summary "Fever, headache, nerve pain, muscle pain, period pain, toothache, joint pain".
- **일관성 게이트**: build md5 `daf4d06d…` == live out2 → byte-identical(새 fact 0). 한글·table·주석·이중escape 0 · sd-warn 유지.
- **apply**: en write 36(nr 18 + flip 18) · post enCanonical 18·nr 0·dup 0·koCanonical 18 · fingerprintOk 18 → PASS · ALREADY_COMPLETE no-op.

### TEST-LOG (ko↔en · 함량 325mg 보존)
| 축 | ko | en | 보존 |
|---|---|---|:---:|
| 효능 | 감기 발열·두통·신경통·근육통·생리통·염좌통·치통·관절통 | fever and pain from a cold, headache, nerve pain, muscle pain, period pain, sprain pain, toothache and joint pain | ✅ |
| 성분 | 아세트아미노펜 **325mg** | Acetaminophen **325 mg** | ✅ |
| 용량 | 성인·12세↑ 1회 2캡슐 1일 3~4회, 4~6시간마다, **1일 12캡슐(4g) 초과 금지** | two capsules 3–4 times a day, every 4–6 hours; **no more than 12 capsules (4 g) a day** | ✅ 수치 |
| 금기 | 과민반응·소화성궤양·중증 혈액·간·신·심부전·아스피린천식·음주 | peptic ulcer, severe blood/liver/kidney, severe heart failure, aspirin-induced asthma, alcohol | ✅ |
| 기간 | 발열 3일·통증 10일 초과 상담 | fever >3 days or pain >10 days | ✅ |

---

## 2. 나프록센 250mg 연질캡슐 (target 15 / exclude 72)

정본: GA next-batch `evaluatedSummary` — targetFp `b2b5edea34cff218` · READY · target 15 · bridge 15. excludeFp fp-harvest 확정(target 15 == bridge 15 자체검증).

### ko
| 게이트 | 값 | 판정 |
|---|---:|:---:|
| coarse / target / exclude / other | 87 / 15 / 72 / 0 | ✅ |
| 교집합 / easy canonical 정확히1 / authored 충돌 | 0 / 15 / 0 | ✅ |
| allForms (연질캡슐 only) / target route | 연질캡슐 / oral | ✅ |

> exclude 26 fp = 7+6+6+5+4+3+3+2×20 = 72 (전부 oral·연질캡슐).
> **apply**: SPD 45(nr 15 + demote 15 + flip 15) + audit 15 · post canonical1 15·authored 15·deprecatedEasy 15·dup 0 → PASS · ALREADY_UPGRADED no-op · contentHash `c5d90685…`.

### en
- source_ref `02355c78` = 29 ko 공유(15 target + 14 out). out14 en canonical LIVE md5 `b117c200…`(summary **null**). 15 ko == 14 ko(byte-identical `c5d90685…`).
- 번역: 나프록센은 `otc-en-translations-v1.json` 에 부재 → **out14 검토완료 en(md5 b117c200) HTML 에서 결정적 역재구성**(en builder `buildDrugOtcEnConsumerHtml` VERBATIM 역산: sd-hero/sd-core/sd-intake/sd-warn 파싱, summaryTable 키 순서·caution 문장결합 복원). summary null.
- **일관성 게이트**: build md5 `b117c200…` == live out14 → byte-identical(새 fact 0). 한글·table·주석·이중escape 0 · sd-warn 유지.
- **apply**: en write 30(nr 15 + flip 15) · post enCanonical 15·nr 0·dup 0·koCanonical 15 · fingerprintOk 15 → PASS · ALREADY_COMPLETE no-op.

### TEST-LOG (ko↔en · 함량 250mg 보존)
| 축 | ko | en | 보존 |
|---|---|---|:---:|
| 효능 | 골관절염·류마티스관절염·강직성척추염, 건염·활액낭염, 급성통풍, 월경통, 근골격계질환, 수술·발치후 통증, 편두통 | osteoarthritis, rheumatoid arthritis, ankylosing spondylitis; tendinitis/bursitis; acute gout; painful menstruation; musculoskeletal disorders; pain after surgery/tooth extraction; migraine | ✅ |
| 성분 | 나프록센 **250mg** | Naproxen **250 mg** | ✅ |
| 용량 | 통증 시 성인 초회 2캡슐(500mg), 이후 1캡슐(250mg) 6~8시간마다, **1일 1,250mg 초과 금지** | first 500 mg, then 250 mg every 6–8 hours, **not exceeding 1,250 mg a day** | ✅ 수치 |
| 금기 | 과민·아스피린/NSAID 과민, 소화성궤양, 중증 간·신, 심부전, 기관지천식, CABG 전후 통증, 임부·수유부, 2세 이하 | reacted to NSAIDs/aspirin, peptic ulcer, severe liver/kidney, heart failure, bronchial asthma, CABG peri-op pain, pregnant/breastfeeding, ≤2 years | ✅ 강도 |
| 경고 | 심혈관 혈전·위장관 출혈 위험 → 복통·흑색변·발진·호흡곤란 시 중단·상담 | risk of cardiovascular clots and GI bleeding → stop and seek advice | ✅ |

---

## 3. 필수 게이트 준수 (공통 중단 조건 대조)

| 중단 조건 | 아세트아미노펜 | 나프록센 |
|---|:---:|:---:|
| 감사 target·exclude·fingerprint 불일치 | 없음(18/6, fp 재현) | 없음(15/72, fp 재현) |
| other > 0 또는 교집합 | 0 / 0 | 0 / 0 |
| 정·캡슐·연질캡슐 혼입 | 없음(연질캡슐 only) | 없음(연질캡슐 only) |
| 기존 authored ko/en canonical 충돌 | 0 / 0 | 0 / 0 |
| 검토완료 EN build byte-identical 불일치 | 일치(`daf4d06d`) | 일치(`b117c200`) |
| 대상 밖 write | 0(master_id 스코프) | 0(master_id 스코프) |
| 예상 write 초과 | SPD 90 = 예상 | SPD 75 = 예상 |
| 사후검증 실패 | PASS | PASS |

교차오염: 아세트아미노펜 ∩ 나프록센 target = 0.

---

## 4. 완료 보고 요약

- **아세트아미노펜 325mg 연질캡슐**: ko 18 + en 18 LIVE · SPD 90 · out2 불변 · ALREADY no-op
- **나프록센 250mg 연질캡슐**: ko 15 + en 15 LIVE · SPD 75 · out14 불변 · ALREADY no-op (번역=out14 en 결정적 역재구성)
- **총 SPD write 165** · audit 33 · 독립검증 PASS(ko·en, out siblings 불변)
- **commit SHA**: 본 커밋

> 두 그룹 모두 연질캡슐 단일 제형으로 격리, 각 그룹 단일 write-owner 로 ko→en 연속 완결. 나프록센 en 은 기존 번역 파일 부재로 live out14 검토완료 en 을 builder VERBATIM 역산하여 byte-identical 재현.
