# CHECK-O4O-OTC-TRIMEBUTINE-100MG-EN-COMPLETE-DA-V1 — 트리메부틴 100mg 정 영어 설명서 완결 (에이전트 다)

WO: `WO-O4O-OTC-TRIMEBUTINE-100MG-EN-COMPLETE-DA-V1` · 일자: 2026-07-20 · 상태: **완료 — en 66건 canonical LIVE (독립검증·no-op PASS)**
스크립트: `apps/api-server/src/scripts/drug-otc-trimebutine-100mg-en.ts` · 번역: `docs/guides/products/drug/pilot-en-design/translations/otc-en-translations-trimebutine-100mg-v1.json` · 채널: Cloud SQL Proxy(:5442) → production.

---

## 0. 결론

> **트리메부틴말레산염 100mg 정 66 target 의 영어 STORE 설명서를 en needs_review 66 전개 → canonical 66 완결. dry-run 2회 byte-identical. en write 132(persist 66 + flip 66). TX 사후검증 PASS(en canonical 66·nr 0·dup 0·ko canonical 66 불변·flip 지문 66/66 불변). 독립검증 PASS. 재실행 ALREADY_COMPLETE no-op(write 0). BULK-TRANSLATION-GUIDE §0-B(grounded ko canonical 충실 번역) 경로.**
>
> **핵심 안전 발견**: candidate/source_ref_id `003beef8…` 는 **104 ko canonical 에 공유**(66 target[fp 7a4aab0b] + 38 out66). out66 38 은 이미 en canonical LIVE. → **대상을 source_ref_id 로 잡으면 104 를 잡아 기존 en 38 과 충돌**. 따라서 grounded-upgrade runner 산출 **66 master_id 리스트로만 스코프**. 66 ko == 38 ko (byte-identical, 동일 약물) → 번역은 out66 검토완료 en 을 재구성, **build 가 live out66 en 과 byte-identical(md5 `bd0595e5e454ad05687a335305cb379e`)** 임을 게이트로 증명(새 medical fact 0). 결과: 트리메부틴 100mg **전체 104 master en byte-identical 통일**.

---

## 1. 스코프 (source_ref_id 오염 대응)

| 축 | 값 | 처리 |
|---|---|---|
| 66 target (grounded-upgrade runner) | ko canonical 66 · en 0 | **대상**(master_id 리스트 스코프) |
| out66 (source_ref_id 공유) | ko canonical 38 · en canonical 38(LIVE) | **미접촉**(스코프 밖) |
| source_ref_id=003beef8 총 | ko canonical 104 · en canonical 38 | source_ref_id 스코프 **금지** |
| 66 ko vs 38 ko | md5 `4076161888…` **동일** | 동일 약물 → 번역 재사용 근거 |

---

## 2. 번역 (그룹당 1건 · §0-B 충실 번역)

- 소스 = 66 ko canonical(= out66 38 과 동일). 번역 = out66 검토완료 en 재구성(`otc-en-translations-trimebutine-100mg-v1.json`, GUIDE V0.5·GLOSSARY V0.2).
- **일관성 게이트**: `buildDrugOtcEnConsumerHtml(번역)` md5 `bd0595e5e454ad05687a335305cb379e` == live out66 en(38건 균일) → **byte-identical**. 새 medical fact 0 을 구조적으로 증명.
- 게이트: 한글 0 · `<table>` 0 · 주석 0 · 이중 escape 0 · sd-warn 유지 · 필수필드 누락 0. builtLen 2531.

### TEST-LOG (ko↔en 수치·용법·기간·금기·주의 대조)

| 축 | ko canonical | en (byte-identical to LIVE) | 보존 |
|---|---|---|:---:|
| 효능 | 식도역류·열공헤르니아, 위·십이지장염·궤양의 소화기 이상, 과민성 대장·경련성 결장 | acid reflux and hiatal hernia; gastritis, duodenitis or ulcers …; irritable bowel syndrome and spastic colon | ✅ |
| 용량 | 1회 1~2정(**100~200mg**) | one to two tablets (**100–200 mg**) | ✅ 수치 |
| 횟수·시점 | **1일 3회 식전** | **three times a day, before meals** | ✅ |
| 조절 | 연령·증상에 따라 조절 | adjusted to suit your age and symptoms | ✅ |
| 금기(유전) | 갈락토오스 불내성·Lapp 유당분해효소 결핍·포도당-갈락토오스 흡수장애 → 복용 안 함 | **Do not take this if** … galactose intolerance, Lapp lactase deficiency or glucose-galactose malabsorption | ✅ 강도 |
| 주의(임부·수유) | 임부·임신가능·수유부 복용 전 약사 상담 | Talk to a pharmacist before taking it if you are pregnant, may be pregnant, or are breastfeeding | ✅ |
| 기간·악화 | 증상 오래 지속·악화 시 약사·의사 상담 | if your symptoms last a long time or get worse | ✅ |

> ko 에 없는 새 medical fact **0**. 수치·연령·기간·금기·주의 강도 전량 보존. (build byte-identical 이 최종 증명.)

---

## 3. 전개·완결 (en write 132)

| 단계 | 연산 | 수 | 기대 | 판정 |
|---|---|---:|---:|:---:|
| STEP1 | en needs_review INSERT (WHERE NOT EXISTS) | **66** | 66 | ✅ |
| STEP2 | needs_review → canonical flip | **66** | 66 | ✅ |
| — | **en write 총** | **132** | 132 | ✅ |
| flip 지문 불변 | content md5 전후 동일 | **66/66** | 66 | ✅ |

- **TX 사후검증**: en canonical 66 · en needs_review 0 · en canonical dup 0 · **ko canonical 66 불변** → PASS → COMMIT.
- **독립 검증(별도 pg)**: 66 en canonical(mfds_drug_otc·source_ref_id 003beef8) 66 · en 정확히1 66 · en nr 0 · ko canonical 66 · 66 en content md5 균일 `bd0595e5…`(=live 38) · **out66 38 en canonical 불변**.
- **재실행 no-op**: `status=ALREADY_COMPLETE`, dbWrite 0(66 en 이미 canonical·내용 build 일치 감지).
- dry-run 2회 byte-identical.

---

## 4. 게이트 준수

| WO 필수 게이트 | 결과 |
|---|---|
| ko/en master_id 1:1 | ✅ 66 master 각 ko·en 1건 |
| ko 에 없는 medical fact 0 | ✅ build == live 검토완료 en byte-identical |
| 수치·연령·기간·금기·주의 강도 보존 | ✅ (§2 TEST-LOG) |
| 한글 잔존 0 · `<table>`·주석·이중escape 0 | ✅ |
| `sd-*`·`sd-warn` 유지 | ✅ |
| 기존 ko canonical UPDATE 0 | ✅ (INSERT/flip만, ko 불변 확인) |
| 대상 외 write 0 | ✅ 66 스코프, out66 38 미접촉 |
| en duplicate 0 | ✅ |

중단 조건 해당 없음(대상 66 일치 · 기존 en canonical 충돌 0[66 내] · 번역·수치·안전 게이트 통과 · 혼입 0 · write 132=예상 일치).

---

## 5. 완료 보고 요약

- **en**: needs_review 66 → canonical 66 LIVE (write 132)
- **번역**: build byte-identical to live out66 en(md5 `bd0595e5e454ad05687a335305cb379e`) — 동일 약물 104 master en 통일
- **독립 검증**: PASS · **재실행 no-op**: ALREADY_COMPLETE(write 0)
- **ko canonical**: 66 불변 · **out66 38 en**: 불변
- **commit SHA**: 본 커밋

> 트리메부틴 100mg 정 ko(66)·en(66) 완결. 남은 clean 후보: 디오스민 300mg 캡슐(38) — 별도 WO. 바실루스 en 은 별도 WO 지시 시 동일 경로.
