# CHECK-O4O-OTC-NO-CANONICAL-PILOT-CANDIDATES-V1 — e약은요-미보유 OTC 첫 파일럿 후보 집계 (에이전트 가)

WO: `WO-O4O-OTC-NO-CANONICAL-PILOT-CANDIDATES-EXECUTE-GA-V1` · 일자: 2026-07-18 · 상태: **완료 (read-only 집계 · 판정 확정)**
채널: **Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only.** DB write **0** · canonical/draft 변경 **0**.
스크립트: `apps/api-server/src/scripts/drug-otc-no-canonical-pilot-candidates.ts`(교정본, 벌크 6쿼리 + JS 집계, 결정론).

---

## 0. 결론

> **OTC STORE ko canonical 미보유 모집단 = 35,292 / OTC 총 57,572. curated draft 95 중 사용가능 경구 4. 판정 적용(비경구 별도 트랙 · 결정글루코사민 HOLD) 후 확정 순수-INSERT 파일럿 경구 후보 = 2: ① 파모티딘 10mg 정(promotable 24) ② 펙소페나딘염산염 60mg 정(promotable 14). 스크립트 raw top3의 3번째 `클로트리마졸 100mg 질정`은 질정=비경구로 별도 트랙 제외(script isOral 오분류). 재실행 byte-identical. DB write 0.**

---

## 1. 모집단

| 항목 | 값 |
|---|---|
| OTC total | **57,572** |
| **OTC STORE ko canonical 미보유** | **35,292** |
| curated draft 총수 | 95 (사용가능 경구 4 · 비경구별도트랙 0 · 제외 91) |

---

## 2. 확정 경구 파일럿 후보 (판정 적용)

| 순위 | draft | groupKey | promotable | groupTotal | rx | 예상 ko/en INSERT | 예상 ko/en flip |
|:---:|---|---|---:|---:|---:|---:|---:|
| 1 | 파모티딘 10mg 정 | `파모티딘\|10밀리그램\|정` | **24** | 128 | 0 | 24 / 24 | 24 / 24 |
| 2 | 펙소페나딘염산염 60mg 정 | `펙소페나딘염산염\|60밀리그램\|정` | **14** | 50 | 0 | 14 / 14 | 14 / 14 |
| | **확정 합** | | **38** | | | **38 / 38** | **38 / 38** |

- 두 그룹 모두 `pharmHomogeneous=true` · `koNeedsReview 0` · `enCanonical 0` (기존 canonical/needs_review 충돌 0) · rx 0. 알파칼시돌형 **순수 INSERT** 적합.
- candidate_id: 파모티딘 `0057f50c…` · 펙소페나딘 `049c2a1c…`. rollback 대상 master_ids = JSON `추천_top3_경구[].rollback_master_ids`(파모티딘 24 · 펙소페나딘 14).

---

## 3. 제외 사유

| 대상 | promotable | 제외 사유 |
|---|---:|---|
| **클로트리마졸 100mg 질정** | 14 | **비경구(질정=vaginal) → 별도 트랙.** script `isOral`이 groupKey formKeyword "정"만 보고 `oral:true` 오분류(title "질정" 미반영). WO "비경구는 별도 트랙" 적용해 경구 top에서 제외 |
| **결정글루코사민황산염 250mg 캡슐** | 8 | **HOLD** — 첨가제(황색5호) 원문 미확보(별도 WO, [CHECK-...GLUCOSAMINE-ADDITIVE-SOURCE-VERIFY](./CHECK-O4O-OTC-BATCH-01B-GLUCOSAMINE-ADDITIVE-SOURCE-VERIFY-AGENT-GA-V1.md)). apply 후보 제외 |
| 제외 draft 91 | — | draft 미완료 / promotable 0 / 비경구 등 |

> 스크립트 raw `추천_top3_경구` = 파모티딘·펙소페나딘·**클로트리마졸(질정)**. 본 CHECK는 WO 판정 원칙(비경구 별도 트랙)을 적용해 클로트리마졸을 비경구로 재분류 → **확정 경구 후보 2**. (script `isOral`의 질정 오분류는 후속 교정 대상으로 기록.)

---

## 4. 예상 write (확정 2 후보, 알파칼시돌형 순수 INSERT)

| 단계 | 파모티딘 | 펙소페나딘 | 합 |
|---|---:|---:|---:|
| ko canonical INSERT | 24 | 14 | **38** |
| en needs_review INSERT (번역 후) | 24 | 14 | **38** |
| en needs_review → canonical flip | 24 | 14 | **38** |

- ko 순수 INSERT(기존 canonical 無) → 충돌 0. en 은 번역 작성 후 needs_review INSERT → canonical flip(알파칼시돌 STEP2·3 동일 계약).
- rollback 대상 = 생성 master_ids(JSON 명시) + 그에 연결될 SPD row.

---

## 5. 재실행 결정론 / 완료 기준

| 항목 | 결과 |
|---|---|
| 재실행 byte-identical | ✅ 3회 md5 `82b02b84686c19d18b4c50c99ee69ed9` 동일 |
| OTC STORE ko canonical 미보유 총수 | **35,292** |
| 확정 Top(경구) | **2** (파모티딘 24 · 펙소페나딘 14) |
| 예상 write | ko INSERT 38 · en INSERT 38 · en flip 38 |
| rollback 대상 ID | JSON `추천_top3_경구[].rollback_master_ids` |
| DB write | **0** |
| 제외 | 클로트리마졸(비경구) · 결정글루코사민(HOLD) |

---

## 6. 산출물 / 다음

- `apps/api-server/src/scripts/data/otc-no-canonical-pilot-candidates-v1.json` (재생성, 결정론)
- 본 CHECK 문서. (스크립트는 기존 커밋, 미수정 실행만)

> **다음(별도 승인)**: 파모티딘 10mg 정 첫 파일럿 = 알파칼시돌형 ko canonical INSERT 24 → en 번역·persist·flip. 검증(dry-run) 후 apply 승인 요청. 클로트리마졸(질정)은 비경구 트랙, 글루코사민은 첨가제 원문 확보 시 재개.
