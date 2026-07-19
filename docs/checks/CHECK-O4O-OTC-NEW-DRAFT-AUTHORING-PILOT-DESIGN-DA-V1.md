# CHECK — 신규 draft authoring 파일럿 설계 (선행 조건 블록 + 슬롯 충돌 플래그)

**WO:** WO-O4O-OTC-NEW-DRAFT-AUTHORING-PILOT-DESIGN-DA-V1 (에이전트 다)
**성격:** read-only · DB write 0
**상태:** ⛔ **그룹 미선정** — ① 에이전트 가 후보 미산출(원칙 준수 대기) ② **e약은요 STORE canonical 슬롯 충돌** 정책 미해결(STEP-0 선결).

---

## 0. 대상 정정 (내 직전 확대 조사와 다른 구획)

신규 authoring 가이드([OTC-NEW-DRAFT-AUTHORING-EXECUTION-GUIDE-V1](../guides/products/drug/OTC-NEW-DRAFT-AUTHORING-EXECUTION-GUIDE-V1.md), 에이전트 나)의 대상은:

- **bridge 통합 `새설명서필요` 구획 = 2,882 그룹 / 9,101 제품**(정본 `90342ce7d`) — authored 후보 없음.
- grounding = 각 제품의 **e약은요 STORE canonical 원문**(mfds_easy_drug) → **grounded(e약은요 보유) 집합**.

> ⚠️ 이는 내 직전 `...TOP5-EXPANSION-AUDIT` 의 **STORE-canonical-미보유 35,254**(draft-less·e약은요 없음)와 **다른 집합**이다. 신규 authoring 은 draft-less 가 아니라 **grounded 새설명서필요**를 다룬다(grounding 존재 — 앞서의 "grounding 소스 부재"는 대상 오인이었음. 정정).

---

## 1. 블로커 1 — 에이전트 가 신규 draft 후보 미산출

- WO 원칙 + 가이드 §1/§19: *"후보 선정은 에이전트 가 소관(개입 금지)", "가의 후보 결과 전 임의 그룹 선정 금지."*
- origin/main 에 가의 clean-그룹 후보(Top20·추천5) 산출물 **없음**.
- 펙소페나딘 60mg 정은 가가 ko·en 완결(`98aaab4a9`) → 제외.
- → 그룹 선정·대상 고정·dry-run **불가**. 후보 산출 후 재개.

---

## 2. 블로커 2 (⚠️ 중대) — e약은요 STORE canonical 슬롯 충돌

**empirically 확인(read-only):**

| 확인 | 값 |
|---|---|
| e약은요(mfds_easy_drug) canonical 저장 형태 | **description_type=STORE · language=ko · status=canonical** (19,177행) |
| grounded named-oral 표본(e약은요 보유) 3,000 중 STORE·ko canonical 슬롯 점유 | **3,000 / 3,000 (100%)** |
| 그 표본 중 authored(mfds_drug_otc) canonical 보유 | 0 |
| DB unique 제약 | `uniq_..canonical_per_master_type_lang (master_id, description_type, COALESCE(language,'ko')) WHERE status='canonical'` — source_type 무관 |

→ **새설명서필요(grounded) master 는 이미 e약은요로 STORE·ko canonical 슬롯을 점유.** 신규 authored(mfds_drug_otc) ko canonical INSERT 는:
- `INSERT ... WHERE NOT EXISTS(canonical)` 이면 → **0건 삽입(no-op)** — e약은요 canonical 이 이미 있어 전건 skip.
- source_type 만 다른 canonical 을 강제 INSERT 하면 → **unique 제약 위반 실패.**

가이드 §1-조건5 "e약은요 표시본과 **별개 축**" 전제는 **DB 레벨에서 성립하지 않는다**(e약은요·authored 가 동일 `(master,STORE,ko)` canonical 슬롯 경쟁). 근거: [`CHECK-O4O-OTC-GROUNDED-CANONICAL-SLOT-CONFLICT-V1`](CHECK-O4O-OTC-GROUNDED-CANONICAL-SLOT-CONFLICT-V1.md) · 파모티딘/아스피린 파일럿 실증.

> ※ 파모티딘/펙소페나딘 파일럿이 성공한 이유 = 그 대상은 **draft-backed 이면서 e약은요-미보유(슬롯 빈)** master 였기 때문. 새설명서필요(grounded) 는 슬롯이 차 있어 상황이 다르다.

---

## 3. 재개 선결 조건

신규 authoring 파일럿(그룹 1개 설계·dry-run)을 진행하려면 **둘 다** 필요:

1. **에이전트 가**의 clean 그룹 후보(groupKey·master수·grounding 확보율·안전지문·§4 태그 0) 산출.
2. **슬롯 충돌 정책 확정**(에이전트 나/사용자):
   - (A) **업그레이드**: e약은요 STORE canonical 을 authored 로 교체(deprecate e약은요 → INSERT authored). = 상태전환(UPDATE) 포함 — 가이드의 "INSERT/상태전환만" 범위·역가역성 재정의 필요.
   - (B) **축 분리**: authored 를 e약은요와 다른 `description_type`(예 별도 표시축)으로 저장 → 유일성 무충돌. 표시/선택 로직 영향 검토 필요.
   - (C) **대상 재정의**: grounded 가 아닌 **e약은요-미보유 그룹**만 신규 authoring(=파모티딘형, 슬롯 빈) — 단 그 집합은 draft-less·grounding 없음(딜레마).
   - → 정책 미확정 시 STEP-0 에서 **CANONICAL_CONFLICT 태깅·전건 제외**가 되어 배치가 비게 됨.

---

## 4. 완료 보고

- **선정 groupKey:** 없음(선행 조건 미충족, 원칙 준수 대기)
- **대상 수 / 원문 확보율 / 안전지문:** N/A(그룹 미선정)
- **예상 draft·ko/en write:** N/A
- **제외:** 펙소페나딘(가 완결)·글루코사민(HOLD)·클로트리마졸(비경구) + 슬롯 충돌 미해결 시 새설명서필요 전건
- **rollback 범위:** N/A
- **dry-run:** 미실행(대상 없음)
- **실제 authoring/apply 진행 가능 여부:** **불가(대기)** — 가 후보 + 슬롯 정책 확정 후 재개
- **DB write:** 0

---

*read-only. 임의 그룹 선정 금지 준수. 핵심 선결 = e약은요 STORE canonical 슬롯 충돌 정책(업그레이드/축분리/대상재정의) — 미해결 시 grounded 새설명서필요 신규 authored INSERT 는 no-op 또는 unique 위반.*
