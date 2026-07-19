# CHECK-O4O-OTC-FEXOFENADINE-60MG-PILOT-DRYRUN-V1 — 펙소페나딘 60mg 정 파일럿 dry-run (에이전트 가)

WO: `WO-O4O-OTC-FAMOTIDINE-10MG-PILOT-DRYRUN-GA-V1` (파모티딘 stale → **펙소페나딘 전환**, 사용자 승인) · 일자: 2026-07-18 · 상태: **완료 (isOral 선행 수정 + read-only dry-run) · apply 승인 대기**
채널: Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only. DB write **0** · 기존 canonical 수정 **0**.

---

## 0. 결론

> **① isOral 선행 수정: `질용`·`vaginal` 추가(질정 기존) → 클로트리마졸 100mg 질정이 경구 오분류→비경구별도트랙 정정. 재실행 byte-identical(md5 529eaf7e). ② 파모티딘 10mg 정 24건은 병렬 세션이 이미 canonical 적재(mfds_drug_otc 24, 2026-07-18 17:51) → promotable 0(stale). ③ 차순위 clean 후보 펙소페나딘염산염 60mg 정 14건 dry-run PASS — 대상 14·충돌 0·draft 완비·예상 ko/en INSERT 14·flip 14·rollback 14. DB write 0. 실제 apply는 별도 승인 필요.**

---

## 1. isOral 선행 수정 (경로 판정만)

- `NON_ORAL_RE` 에 `질용`·`vaginal`(+ `/i`) 추가. 기존 `질정|질좌|질내|질캡슐|트로키…` 유지. **집계·후보 선정 로직 불변**.
- 효과: `클로트리마졸 100mg 질정`(doseForm 비신뢰='정', title='질정') → `oral:false` → **비경구별도트랙**. 재실행 3회 md5 `529eaf7e…` 동일(결정론).

## 2. 파모티딘 stale (기록)

| 항목 | 값 |
|---|---|
| groupTotal | 128 |
| alreadyPromoted | **128** (e약은요 104 + mfds_drug_otc authored **24**, latest 2026-07-18T17:51:35Z) |
| **promotable** | **0** |
- 병렬 세션이 authored 24를 canonical 적재 완료 → 본 WO 대상 stale. **파모티딘 추가 write 0**(금지 준수). 미보유 모집단 35,292→**35,268**(−24).

## 3. 펙소페나딘 60mg 정 dry-run (대상 14)

| 항목 | 값 | 판정 |
|---|---|:---:|
| groupKey | `펙소페나딘염산염\|60밀리그램\|정` | — |
| candidate_id | `049c2a1c-d834-401a-bc6a-3321fcc3c104` | — |
| 대상(promotable) | **14** (재열거 일치) | ✅ |
| 그룹 OTC total / rx | 50 / **0** (원시 name-match 52 중 rx 2 제외) | ✅ |
| 성분·함량·제형·경로 | 펙소페나딘염산염 · 60밀리그램 · 정 · 경구 | ✅ |
| draft 완비 | efficacy·usage·caution·summaryTable 전부 | ✅ |
| 기존 canonical(koNeedsReview/enCanonical) | 0 / 0 | ✅ |
| 14 master 기존 STORE SPD | **0** | ✅ |
| source_ref_id 정합 (candidate 사용 SPD) | **0** (apply 시 14 전부 source_ref=candidate 공유) | ✅ |
| 예상 write | ko INSERT **14** · en INSERT **14** · en flip **14** · ko flip **14** | ✅ |
| rollback master ID | **14** 고정 (JSON `추천_top3_경구[0].rollback_master_ids`) | ✅ |
| 재실행 결정론 | byte-identical(529eaf7e) | ✅ |
| DB write | **0** | ✅ |

## 4. 완료 기준 / 다음

| 기준 | 결과 |
|---|---|
| 대상 정확히 14 | ✅ (≠14 시 중단 규칙 — 일치) |
| 충돌·중복 0 | ✅ |
| 예상 write·rollback ID 산출 | ✅ |
| 파모티딘/글루코사민/클로트리마졸 미포함 | ✅ (파모티딘 stale·글루코 HOLD·클로트리마졸 비경구) |
| 병렬 canonical 수정 0 · DB write 0 | ✅ |

> **다음(별도 승인)**: 펙소페나딘 60mg 정 14건 = 알파칼시돌형 ko canonical INSERT 14 → en 번역·persist·flip. 승인 시 단일 조합·단일 TX·이중 게이트·트랜잭션 내 사후검증(masters/candidate/ko/en=14·dup 0·자동 ROLLBACK)·독립 검증·재실행 no-op. 산출물: 스크립트(isOral 수정)·JSON·본 CHECK path-specific commit.
