# CHECK-O4O-OTC-BACILLUS-LICHENIFORMIS-250MG-EN-COMPLETE-DA-V1 — 바실루스 250mg 캡슐 영어 설명서 완결 (에이전트 다)

WO: `WO-O4O-OTC-BACILLUS-LICHENIFORMIS-250MG-EN-COMPLETE-DA-V1` · 일자: 2026-07-20 · 상태: **완료 — en 56건 canonical LIVE (독립검증·no-op PASS)**
runner: `apps/api-server/src/scripts/drug-otc-en-complete-runner.ts`(범용 en-complete, 트리메부틴 검증본 일반화) · 번역: `…/translations/otc-en-translations-bacillus-liche-250mg-v1.json` · 채널: Cloud SQL Proxy(:5442) → production.

---

## 0. 결론

> **바실루스리케니포르미스균 250mg 캡슐 56 target 의 영어 STORE 설명서를 en needs_review 56 전개 → canonical 56 완결. en write 112(persist 56 + flip 56). dry-run 2회 byte-identical. TX 사후검증 PASS(en canonical 56·nr 0·dup 0·ko canonical 56 불변·flip 지문 56/56). 독립검증 PASS. 재실행 ALREADY_COMPLETE no-op(write 0). 범용 en-complete runner 로 일반화 — 트리메부틴 regression 도 no-op 재현(회귀 0).**
>
> **스코프 안전(사전 조사)**: source_ref_id `022f4af0…` = **64 ko canonical 공유**(56 target[fp 13208b06] + 8 out56). out56 8 은 이미 en canonical LIVE. → **56 master_id 리스트로만 스코프**(source_ref_id 스코프 금지). 56 ko == 8 ko(byte-identical md5 `2d1036543d…`, 동일 약물) → 번역 = out56 검토완료 en 재구성, **build == live out56 en byte-identical(md5 `377e7f4ca23fc4846b7cd401bbf31f7b`)** 게이트로 새 medical fact 0 증명. 결과: 바실루스 250mg **전체 64 master en 통일**.

---

## 1. 사전 스코프 조사 (WO 필수)

| 축 | 값 | 처리 |
|---|---|---|
| 56 target (grounded-upgrade runner) | ko canonical 56 · en **0** · en nr **0** | **대상**(master_id 리스트) |
| out56 (source_ref_id 공유) | ko canonical 8 · en canonical **8**(LIVE) | **미접촉** |
| source_ref_id=022f4af0 총 | ko canonical 64 · en canonical 8 | source_ref_id 스코프 **금지** |
| 56 ko vs 8 ko | md5 `2d1036543d…` **동일** | 동일 약물 → 번역 재사용 근거 |
| out56 en canonical 지문 | `377e7f4ca23…` 균일(8) | 재사용 기준본 |

---

## 2. 번역 (그룹당 1건 · §0-B 충실 번역)

- 소스 = 56 ko canonical(= out56 8 과 동일). 번역 = out56 검토완료 en 재구성(`otc-en-translations-bacillus-liche-250mg-v1.json`, GUIDE V0.5·GLOSSARY V0.2).
- **일관성 게이트**: `buildDrugOtcEnConsumerHtml` md5 `377e7f4ca23fc4846b7cd401bbf31f7b` == live out56 en(8건 균일) → **byte-identical**. 새 medical fact 0 구조적 증명.
- 게이트: 한글 0 · `<table>` 0 · 주석 0 · 이중 escape 0 · sd-warn 유지 · 필수필드 누락 0.

### TEST-LOG (ko↔en 수치·용법·기간·금기·주의 대조)

| 축 | ko canonical | en (byte-identical to LIVE) | 보존 |
|---|---|---|:---:|
| 효능 | 급·만성 장염, 급·만성 설사, 급성 이질, 장내 이상발효 | sudden and long-lasting bowel inflammation, … diarrhoea, sudden dysentery, … abnormal fermentation in the bowel | ✅ |
| 용량(성인) | 1회 **2캡슐** 1일 3회(**첫 회 4캡슐**) | two capsules three times a day (**four capsules for the first dose**) | ✅ 수치 |
| 용량(어린이) | 1회 **1캡슐** 1일 3회 | Children take **one capsule** three times a day | ✅ |
| 용량(유아) | 캡슐 내용물 물·우유에 타서 | contents … mixed with a small amount of water or milk | ✅ |
| 주의(영아) | **3개월 미만 영아** 복용 전 약사 상담 | Talk to a pharmacist before giving this to a **baby under 3 months** old | ✅ |
| 병용 | **시프로플록사신** 등 항생제 병용 상의 | if it is taken together with certain antibiotics such as **ciprofloxacin** | ✅ |
| 기간·경고 | 설사 오래 지속·발열·혈변 시 상담 | if the diarrhoea lasts a long time or comes with a **fever or blood in the stool** | ✅ |

> ko 에 없는 새 medical fact **0**. 수치·연령·병용·기간·금기 전량 보존. (build byte-identical 이 최종 증명.)

---

## 3. 전개·완결 (en write 112)

| 단계 | 연산 | 수 | 기대 | 판정 |
|---|---|---:|---:|:---:|
| STEP1 | en needs_review INSERT (WHERE NOT EXISTS) | **56** | 56 | ✅ |
| STEP2 | needs_review → canonical flip | **56** | 56 | ✅ |
| — | **en write 총** | **112** | 112 | ✅ |
| flip 지문 불변 | content md5 전후 동일 | **56/56** | 56 | ✅ |

- **TX 사후검증**: en canonical 56 · en needs_review 0 · en canonical dup 0 · **ko canonical 56 불변** → PASS → COMMIT.
- **독립 검증(별도 pg)**: 56 en canonical(mfds_drug_otc·source_ref_id 022f4af0) 56 · en 정확히1 56 · en nr 0 · ko canonical 56 · 56 en md5 균일 `377e7f4ca23…`(=live 8) · **out56 8 en canonical 불변**.
- **재실행 no-op**: `status=ALREADY_COMPLETE`, dbWrite 0.
- dry-run 2회 byte-identical.

---

## 4. 게이트 준수

| WO 필수 게이트 | 결과 |
|---|---|
| source_ref_id 공유 범위 조사 | ✅ 64 공유(56+8) 확인, 56 스코프 |
| ko 56 runner target master_id 정본 고정 | ✅ grounded-upgrade run.json rollback_master_ids |
| source_ref_id 만으로 대상 열거 금지 | ✅ master_id 리스트 스코프 |
| 기존 en canonical·nr·대상 밖 en 확인 | ✅ 56 내 en 0 · out56 en 8(미접촉) |
| ko/en master_id 1:1 | ✅ |
| 한글 0 · `<table>`·주석·이중escape 0 | ✅ |
| ko 불변 · 중복 0 · 대상 외 write 0 | ✅ (INSERT/flip만, out56 미접촉) |

중단 조건 해당 없음(대상 56 일치 · 기존 en canonical 충돌 0[56 내] · 번역·수치·안전 게이트 통과 · 혼입 0 · write 112=예상 일치).

---

## 5. 완료 보고 요약

- **en**: needs_review 56 → canonical 56 LIVE (write 112)
- **번역**: build byte-identical to live out56 en(md5 `377e7f4ca23fc4846b7cd401bbf31f7b`) — 바실루스 250mg 64 master en 통일
- **독립 검증**: PASS · **재실행 no-op**: ALREADY_COMPLETE(write 0)
- **ko canonical**: 56 불변 · **out56 8 en**: 불변
- **범용 runner**: en-complete runner 일반화, 트리메부틴 regression no-op 재현
- **commit SHA**: 본 커밋

> 바실루스 250mg 캡슐 ko(56)·en(56) 완결. 남은 clean 후보: 디오스민 300mg 캡슐(38) — 별도 WO(동일 en-complete runner 경로, source_ref_id 오염 선조사).
