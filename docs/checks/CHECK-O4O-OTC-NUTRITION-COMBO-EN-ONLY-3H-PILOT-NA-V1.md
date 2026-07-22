# CHECK-O4O-OTC-NUTRITION-COMBO-EN-ONLY-3H-PILOT-NA-V1 — nutrition_combo EN-only 파일럿 (에이전트 나)

WO: `WO-O4O-OTC-NUTRITION-COMBO-EN-ONLY-3H-PILOT-NA-V1` · 일자: 2026-07-22 · 상태: **완료 — 단일성분 비타민 4그룹/53 master EN 완결 LIVE. 안전 후보(단일 비타민) 소진으로 조기 종료.**
runner: `otc-nutrition-combo-en-only-runner-na.ts`(자기 전용, 공용 registry 미수정) · config: `otc-nutrition-combo-en-only-na.config.json` · claim: `otc-production-claim.na.json` · 채널: Cloud SQL Auth Proxy(127.0.0.1:5442) → production.

---

## 0. 결론

> **nutrition_combo(source_type `mfds_drug_otc_nutrition_combo`) EN-only 계약을 확정**하고, 단일성분 비타민 4그룹(비타민E 100·400·1000 IU + 비타민C 1000mg) = **53 master 의 영문 STORE 설명서를 fresh 번역 → en canonical 완결(LIVE)**. en write 106(persist 53 + flip 53). **ko canonical 전량 불변**(count·지문 사후검증). 전 그룹 dry-run 2회 byte-identical · TX 사후검증 PASS(en canonical=T·nr 0·dup 0·koUnchanged) · 독립검증 PASS · 재실행 ALREADY_COMPLETE(write 0). **진짜 복합제(종합비타민·마그네슘+B6)는 효능 합성/다약물 상호작용 위험으로 HOLD**. 단일 비타민 안전 후보 소진으로 조기 종료.

---

## 1. 배정 상한·실제 작업시간·종료 이유

| 항목 | 값 |
|---|---|
| 배정 상한 | 최대 3시간 |
| 실제 작업 | 계약 조사·확정 + 4그룹 생산(<3시간) |
| 종료 이유 | **안전 후보(단일성분 비타민) 소진** — 잔여 nutrition_combo 는 진짜 복합제(정책 필요)로 HOLD. WO "안전 후보 소진 시 조기 종료" |

---

## 2. 시작 상태 (WO §1)

- main == origin/main(0/0), working tree 자기 이전 scratch 만(untracked), 미완료 자기 작업 0.
- 타 에이전트 claim: nutrition_combo **0**(가/다 config 는 grounded-upgrade Track A — 비타민 아님). 교집합 0 확인.

---

## 3. 후보 감사 (WO §2)

nutrition_combo EN-only 16그룹(1,915 master, [reclassify CHECK](CHECK-O4O-OTC-NEXT-POOL-RECLASSIFY-AND-CLAIM-CONTRACT-NA-V1.md)) 을 master 오름차순 확인 → 성분 복잡도 판정(전 그룹 ko 지문 균일 md5 kinds=1):

| 그룹(source_ref) | master | 성분 | 판정 |
|---|---:|---|---|
| 비타민E 100IU `cda011db` | 3 | 단일(토코페롤) | **READY**(증상 효능·sd-* 적합) |
| 비타민E 400IU `03751234` | 7 | 단일 | READY |
| 비타민E 1000IU `6343c0f5` | 18 | 단일(고용량) | READY |
| 비타민C 1000mg `6f143bbc` | 25 | 단일(아스코르빈산) | READY |
| 마그네슘+B6 `91d2a67d` | 16 | **2성분**·다약물 상호작용 | **HOLD**(§7) |
| 종합비타민 `5a342fe9`·`fcf616ee`·`270a10a2` 등 | 4~21 | **복합 비타민** | **HOLD**(§7) |

- 비오틴 split 그룹(`79a515f0`)은 WO 지시대로 **제외**.
- 첫 대상 = 최소·최단순 = 비타민E 100IU(3 master).

---

## 4. nutrition_combo EN-only 계약 (WO §4-5, 확정)

| 항목 | 계약 |
|---|---|
| 원문 | **기존 ko canonical 유일** (`source_type=mfds_drug_otc_nutrition_combo`, ko canonical). sibling EN 재사용 아님 → **fresh 번역** |
| ko 변경 | **0** — UPDATE/승격/deprecated/audit write 없음. count·지문 전후 동일 사후검증(koUnchanged) |
| 대상 스코프 | (source_ref_id, source_type, ko canonical) 전체 master_id 고정. combo 는 source_ref 당 단일 그룹 |
| 빌더 | 공용 `buildDrugOtcEnConsumerHtml`(sd-* 계약 CR-020). ko legacy `<table>` 구조는 미승계, sd-* conformant 생성(ko 미변경) |
| source_type / source_ref_id | en = `mfds_drug_otc_nutrition_combo` / ko 의 source_ref 그대로 |
| fact-0 보증 | (a) ko 유일 원문 충실 번역 (b) TEST-LOG 대조 (c) 구조 게이트(한글0·`<table>`0·주석0·이중escape0·sd-warn) (d) ko 불변 |
| 스타일 | GUIDE V0.5·GLOSSARY V0.2 (금기 `Do not take…`·상담 `Talk to a pharmacist…`·수치 `50–1,000 IU` en dash) |
| write | 그룹별 **2T** (en needs_review INSERT T + canonical flip T) · 이중게이트(`--apply`+`DRUG_OTC_COMBO_EN_CONFIRM=YES`) |

---

## 5. 완료 그룹·writePlan/Actual·ko 불변 (WO §6-7)

| 그룹 | master(T) | en writePlan(2T) | writeActual | en canonical | ko 불변 | no-op |
|---|---:|---:|---:|---:|:-:|:-:|
| 비타민E 100IU | 3 | 6 | 6 | 3 | ✅ | ALREADY_COMPLETE |
| 비타민E 400IU | 7 | 14 | 14 | 7 | ✅ | ALREADY_COMPLETE |
| 비타민E 1000IU | 18 | 36 | 36 | 18 | ✅ | ALREADY_COMPLETE |
| 비타민C 1000mg | 25 | 50 | 50 | 25 | ✅ | ALREADY_COMPLETE |
| **합계** | **53** | **106** | **106** | **53** | ✅ | — |

- 전 그룹 TX 사후검증 PASS: en canonical=T · en needs_review 0 · dup 0 · **koUnchanged true**(지문·count 전후 동일). writeActual == 2T(초과 0). 대상 밖 write 0.
- 독립검증(별도 psql): 각 source_ref en canonical=T(균일 md5)·ko canonical=T(불변)·전역 canonical duplicate 0.
- dry-run 2회 byte-identical(전 그룹). 재실행 ALREADY_COMPLETE·write 0.
- **실제 시간당 master**: 계약 확정 포함 파일럿에서 53 master 생산(계약 재사용 구간은 그룹당 dry-run+apply+검증 수분).

---

## 6. 신규 번역 TEST-LOG (수치·단위·연령·횟수·기간·금기·주의 강도 보존)

| 그룹 | 효능(ko→en) | 용법 수치 | 금기/주의 강도 | fact-0 |
|---|---|---|---|:-:|
| 비타민E (100/400/1000IU) | 비타민E 결핍·말초순환장애·갱년기 어깨목결림·수족저림/냉증·간헐성 파행증·동상 → 전량 보존 | 50~1,000 IU/일 → `50–1,000 IU a day` | 금기(과민·대두/콩/땅콩·수유부·임신 고용량 회피)·상담(혈전소인·항응고제·비타민A/K·철분제) 보존. 1000IU: 고용량 장기 정기확인 추가 보존 | ✅ |
| 비타민C 1000mg | 괴혈병 예방·치료·비타민C 보급·모세관출혈(잇몸/코)·색소침착 → 보존 | 500~1,000mg 1일 1회/분할·충분한 물·복용 후 눕지 않음 → 보존 | 금기(고수산뇨증·지중해빈혈·통풍·시스틴뇨증·G6PD결핍·신장수산결석)·상담(임신/수유/흡연/음주)·고용량 장기 신장결석 주의 보존 | ✅ |

> ko 에 없는 새 medical fact **0**. 복합 성분 임의 단순화·효능 합성 **0**(단일 성분만 대상).

---

## 7. HOLD 목록·사유 (WO 중지 조건)

| 그룹 | 사유 |
|---|---|
| 마그네슘+B6 `91d2a67d`(16) | 2성분 복합 + 다약물 상호작용 주의(인산염·칼슘염·테트라사이클린·제산제·레보도파) → 복합제 콘텐츠 정책·의료 판단 필요 |
| 종합비타민 `5a342fe9`·`fcf616ee`·`270a10a2`·`029b8650`·`b96f3977`·`b21c54a6`·`2bb82579`·`26c2af33`·`d29b1340` 등 | 복합 비타민(A·B·C·D·E±아연) — 결합 효능 표현이 단일 번역 계약 밖, 효능 합성 위험 → 정책 결정 필요 |
| 레날비타·눈모아·마그신·셀레트론·벤포벨브이·지오로사(단, 지오로사=`cda011db` 비타민E 100IU 는 완결) | 위 복합제군 |
| 비오틴 `79a515f0`(8) | split(combo+easy) — WO 제외 |

> **중지 조건 발동 없음**(대상 밖 write·ko 변경·writeActual>2T·dup·오류 반복 전부 0). 복합제는 "신규 의료 판단·정책 결정 필요"로 **HOLD 후 다음 안전 그룹 이동**, 안전 그룹 소진으로 정상 종료.

---

## 8. claim 계약 준수 (WO §3)

- 자기 claim `otc-production-claim.na.json` 1개만 소유·수정. 각 그룹 착수 전 claim 반영→commit→push→fetch→교집합 0 재확인(전 그룹 교집합 0).
- 완료 그룹 status=DONE 갱신.

---

## 9. 준수 / 금지

| 항목 | 결과 |
|---|---|
| source_type=mfds_drug_otc_nutrition_combo | ✅ |
| 기존 ko canonical 변경 | **0**(koUnchanged 전 그룹) |
| EN 없는 그룹만 대상 | ✅(existingEnCanonical 0) |
| 대상 master_id 그룹별 고정 | ✅(source_ref ko canonical) |
| 공용 runner registry(.ts) 수정 | **0**(자기 전용 runner/config) |
| writeActual > 2T / 대상 밖 write / dup | **0** |
| git add . | 미사용, path-specific commit |

---

## 10. 완료 보고 요약

- **완료 4그룹 / 53 master EN LIVE** (비타민E 100·400·1000 IU + 비타민C 1000mg) · en write 106
- **ko 불변** 전 그룹 검증 · 독립검증 PASS · 재실행 ALREADY_COMPLETE(write 0)
- **계약 확정**: nutrition_combo EN-only(fresh 번역·sd-* 빌더·source_type/ref·2T·ko 불변·구조/TEST-LOG 게이트)
- **HOLD**: 진짜 복합제(종합비타민·마그네슘+B6·비오틴 split) — 정책/의료 판단 필요
- **commit SHA**: ↓ · origin/main 동기 · 미푸시 자기 산출물 0

> 단일성분 비타민 안전 파일럿 완결. 복합제 EN 은 콘텐츠 정책 확정 후 별도 WO. 계약·runner 는 복합제에도 재사용 가능(번역 authoring 만 정책 선결).
