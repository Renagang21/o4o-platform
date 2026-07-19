# CHECK — Model B 첫 canonical write 파일럿 설계·dry-run (파모티딘 10mg 정)

**WO:** WO-O4O-OTC-NO-CANONICAL-PILOT-WRITE-DESIGN-DA-V1 (에이전트 다)
**성격:** read-only dry-run · **DB write 0** · 실제 apply 별도 승인
**스크립트:** `apps/api-server/src/scripts/drug-otc-modelB-apply-pilot-famotidine.ts`
**산출:** `apps/api-server/src/scripts/data/otc-modelB-apply-pilot-famotidine-dryrun-v1.json`

---

## 1. 선정 후보와 이유

STORE canonical 미보유(e약은요-미보유) 경구 후보(결정론 확정, `otc-no-canonical-pilot-candidates-v1.json`) 중 **가장 큰 clean 단일 groupKey**:

| 후보 | promotable | 선정 |
|---|---:|---|
| **파모티딘 10mg 정** | **24** | ✅ 선정 (최대·clean) |
| 펙소페나딘염산염 60mg 정 | 14 | 차순위 |
| 결정글루코사민황산염 250mg 캡슐 | 8 | WO 지시 자동 제외 |
| 클로트리마졸 100mg 질정 | 14 | 비경구(질정) → 제외 |

**선정 이유:** 커버리지 최대(24), 단일 groupKey `파모티딘|10밀리그램|정`, 경구·단일제(usageLabel="복용 안내", H2 차단제 위산과다·속쓰림), draft 완성본, rx·비경구·기존 canonical·needs_review 충돌 0.

---

## 2. 대상 고정 (실행 시점 재열거)

- draft: `0057f50c-e693-4385-b5d8-4f57178db590` ("파모티딘 10mg 정", MFDS_DRUG_OTC), content_json 완성(efficacy·usage·caution·summaryTable), contentPending=false.
- **최종 대상 master 수: 24** (grpBase = `name LIKE '%(파모티딘)' · spec 1st='10밀리그램' · name LIKE '%정%'`, OTC·rx아님·STORE ko canonical 無).
- rollback 대상 ID: 24개 (dry-run JSON `rollback_master_ids`에 동결).

---

## 3. 제외 대상과 사유

| 제외 | 수 | 사유 |
|---|---:|---|
| 그룹 rx-only | 3 | 파모티딘 10mg 은 rx·otc 공존 — rx 판은 승격 대상 아님(promotable 에서 NOT EXISTS rx 로 제외). **promotable 내 rx = 0** 재확인 |
| 그룹 중 이미 canonical 보유 | 그룹 131 − 24 − 3 = 나머지 | 이미 STORE canonical 존재(슬롯 점유) → 대상 아님 |
| 비경구 | 0 | 파모티딘 정은 전량 경구 |
| ko needs_review 충돌 | 0 | — |
| en canonical 충돌 | 0 | — |

---

## 4. 예상 write (승인 후)

| 단계 | 수 |
|---|---:|
| ko needs_review INSERT | **24** |
| ko canonical flip | **24** |
| en needs_review INSERT (번역 후속) | 24 |
| en canonical flip (번역 후속) | 24 |
| **기존 canonical content UPDATE** | **0** |

- `source_ref_id = 0057f50c` **공유**(F12: canonical 유일성 = master_id+type+language, source_ref_id 非키. `CHECK-O4O-OTC-SOURCE-REF-ID-POLICY-V1` 판정 적용).
- content: `buildDrugOtcConsumerHtml`(구조화 필드, bodyMarkdown 미사용). htmlLen 1563, contentHash `d296a0cc…`, sd-warn 유지, `<table>`·주석·이중escape 0.
- en 은 draft en 번역 선행 필요 → 이번 WO 범위 외(후속).

---

## 5. 실행 설계 (apply 시)

- 이중 게이트: `--apply` + `DRUG_OTC_PILOT_FAMO_KO_CONFIRM=YES`.
- 2-STEP 단일 TX: ① needs_review INSERT(WHERE NOT EXISTS canonical/needs_review → 멱등) → ② needs_review→canonical flip.
- 사후 검증: canonical 중복 0 · source_ref_id 기준 canonical count == 24 → 불일치 시 **ROLLBACK**.
- 멱등: 재실행 시 이미 canonical 존재분 INSERT 0·flip 0 (no-op).
- rollback 범위: 이 24 master 의 mfds_drug_otc ko canonical 만.

---

## 6. dry-run 결과

| 항목 | 결과 |
|---|---|
| mode | dry-run (DB write 0) |
| promotable | **24** (= EXPECTED) |
| promotable 내 rx | 0 |
| 비경구 | 0 |
| ko/en 충돌 | 0 / 0 |
| HTML 게이트(빈·table·주석·escape·sd-warn) | PASS |
| anomalies | **0** |
| 재실행 byte-identical | ✅ |
| **dry-run 판정** | **PASS** |

---

## 7. 완료 보고

- **선정:** 파모티딘 10mg 정 (최대 clean 경구 24)
- **최종 대상:** 24 master
- **제외:** rx-only 3(대상 아님) · 이미 canonical 보유분 · 비경구 0 · 충돌 0
- **예상:** ko needs_review INSERT 24 → canonical flip 24 · 기존 canonical UPDATE 0 · en 24/24(번역 후속)
- **rollback 범위:** 24 master(source_ref_id 0057f50c) ko canonical
- **dry-run:** **PASS** (anomalies 0, byte-identical, write 0)
- **실제 apply 승인:** **필요** (`--apply` + env confirm, 별도 승인 전 write 금지)
- **원칙 준수:** production write 0 · 글루코사민 제외 · 비경구 제외 · 기존 canonical UPDATE 0 · source_ref_id 공유 · 단일 groupKey

---

*read-only 설계·dry-run. 실제 24 master ko canonical write 는 사용자 승인 후.*
