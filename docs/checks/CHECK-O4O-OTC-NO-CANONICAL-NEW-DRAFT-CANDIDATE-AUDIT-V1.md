# CHECK-O4O-OTC-NO-CANONICAL-NEW-DRAFT-CANDIDATE-AUDIT-V1 — 신규 draft authoring 후보 audit (에이전트 가)

WO: `WO-O4O-OTC-NO-CANONICAL-NEW-DRAFT-CANDIDATE-AUDIT-GA-V1` · 일자: 2026-07-18 · 상태: **완료 (read-only 집계)**
채널: Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only. DB write **0** · draft/canonical 변경 **0**.
스크립트: `drug-otc-no-canonical-new-draft-candidate-audit.ts` (벌크 로드 + JS 집계, 결정론).

---

## 0. 결론

> **STORE ko canonical 미보유 OTC 35,254 중 draft 없는 경구 단일제 그룹 = 1,258(총 커버리지 5,364). ⚠️ 핵심: e약은요 grounding = 0 (구조적) — e약은요 원문 보유 OTC 는 전부 이미 canonical(mfds_easy_drug)이라 미보유 universe 와 disjoint. 따라서 이 후보들은 e약은요 재사용이 아니라 Model B(관제 원문 신규 authoring) 대상이며 grounding·안전지문은 authoring 시점에 확보한다. 커버리지 순 Top 20 · 첫 5 배치 = 은행엽건조엑스 240/120/40mg 정 · 은행엽엑스 120mg 정 · 라니티딘염산염 75mg 정(커버리지 합 829). 재실행 byte-identical.**

---

## 1. 모집단 · 제외

| 항목 | 값 |
|---|---|
| OTC total | 57,572 |
| **STORE ko canonical 미보유** | **35,254** |
| 제외 — STORE canonical 보유 | 22,318 |
| 제외 — noKey(성분 suffix·함량 미파싱) | 17,219 |
| 제외 — 복합제(혼합·복합·기호) | 5,760 |
| 제외 — 비경구(NON_ORAL) | 2,133 |
| 제외 — 수동 추정(함량 없음·제형 기타) | 2,852 |
| 제외 — 수출전용 | 1,881 |
| 제외 — 글루코사민(첨가제 HOLD) / 클로트리마졸(질정) | 19 / 0 |
| 제외 — 기존 draft 보유 그룹 | 26 |
| **draft 없는 경구 단일제 그룹** | **1,258** (총 커버리지 5,364) |

---

## 2. ⚠️ grounding 구조적 진단 (핵심)

| 항목 | 값 |
|---|---|
| e약은요(MFDS_EASY_DRUG_INFO) 후보 seq | 4,757 |
| **미보유 universe 중 e약은요 원문 보유** | **0** (direct join 검증) |

> e약은요 원문 보유 OTC master 는 **전부 이미 STORE canonical(mfds_easy_drug)** → 미보유 universe 와 **완전 disjoint**([[project_otc_authored_corpus_no_easy_overlap]] 일치). 즉 이 1,258 그룹은 **e약은요 재사용 authoring 이 0**이고, **Model B(관제 품목허가 원문 신규 authoring)** 만 실질 경로. grounding 확보율·안전지문 단일성은 **authoring 시점에 관제 원문으로 확보/검증**한다(본 audit 단계에선 e약은요 기준 0).

---

## 3. Top 20 (커버리지 순) · 첫 5 배치 후보

| # | groupKey | 제품수(coverage) | 예상 ko/en |
|:---:|---|---:|---:|
| 1 | 은행엽건조엑스\|240밀리그램\|정 | **395** | 395/395 |
| 2 | 은행엽건조엑스\|120밀리그램\|정 | **179** | 179/179 |
| 3 | 은행엽건조엑스\|40밀리그램\|정 | **104** | 104/104 |
| 4 | 은행엽엑스\|120밀리그램\|정 | **77** | 77/77 |
| 5 | 라니티딘염산염\|75밀리그램\|정 | **74** | 74/74 |
| 6 | 방풍통성산건조엑스\|237.5밀리그램\|정 | 73 | 73/73 |
| 7 | 라니티딘염산염\|84밀리그램\|정 | 64 | 64/64 |
| 8 | 은교산\|710밀리그램\|캡슐 | 62 | 62/62 |
| 9 | 센텔라정량추출물\|30밀리그램\|정 | 56 | 56/56 |
| 10 | 빌베리건조엑스\|170밀리그램\|정 | 55 | 55/55 |
| 11 | 오소판물질\|830밀리그램\|정 | 46 | 46/46 |
| 12 | 아이비엽70%에탄올유동엑스\|500밀리리터\|시럽 | 45 | 45/45 |
| 13 | 은행엽엑스\|80밀리그램\|정 | 43 | 43/43 |
| 14 | 배농산급탕\|0.67그램\|캡슐 | 42 | 42/42 |
| 15 | 옥수수불검화정량추출물\|35밀리그램\|정 | 41 | 41/41 |
| 16 | 이부프로펜\|400밀리그램\|정 | 38 | 38/38 |
| 17 | 반하사심탕엑스과립\|3그램\|과립 | 32 | 32/32 |
| 18 | 아이비엽70%에탄올유동엑스\|5밀리리터\|시럽 | 32 | 32/32 |
| 19 | 미세정제플라보노이드분획물\|500밀리그램\|정 | 30 | 30/30 |
| 20 | 인삼패독산\|3그램\|과립 | 24 | 24/24 |

- **첫 5 authoring 배치 후보(커버리지 합 829)**: ①~⑤. 은행엽(ginkgo) 3함량 + 은행엽엑스 + 라니티딘. 그룹별 master ID 전량 = JSON `추천_첫5그룹[].masterIds`.
- 예상 총 커버리지(Top 20) = 1,548 / 전체 1,258 그룹 5,364.
- ⚠️ authoring 유의: 라니티딘(NDMA 이슈 이력)·시럽(액상 authoring 경계)·한약 엑스(관제 원문 문구 확인) 는 authoring 시점 정책 확인.

---

## 4. 재실행 결정론 / 완료 기준

| 항목 | 결과 |
|---|---|
| 재실행 byte-identical | ✅ 2회 md5 `fce53b3216d3ab3e4af6ae1e815e40d8` |
| 전체 신규 draft 필요 그룹 수 | **1,258** |
| Top 20 · 첫 5 | ✅ (§3) |
| 원문 확보율·안전지문 | e약은요 기준 0(구조적) → Model B, authoring 시점 확보 |
| 예상 총 커버리지 | 5,364(전체) / 829(첫5) / 1,548(Top20) |
| 그룹별 master ID | JSON 명시(첫5 전량 · top20 요약) |
| DB write | **0** |
| 자동 제외 | 글루코사민·클로트리마졸·복합·비경구·수출·수동추정·기존draft·canonical |

---

## 5. 산출물 / 다음

- `apps/api-server/src/scripts/drug-otc-no-canonical-new-draft-candidate-audit.ts`
- `apps/api-server/src/scripts/data/otc-no-canonical-new-draft-candidates-v1.json`
- 본 CHECK 문서.

> **다음(별도 authoring 승인 봉투)**: 첫 5그룹부터 Model B(관제 원문 grounded ko/en 신규 authoring) → draft 생성 → 검수 → ko/en canonical apply. 하나씩 묻지 않고 authoring 승인 봉투로 연속 진행 설계 가능. 단 grounding 은 e약은요가 아닌 관제 품목허가 원문을 사용해야 하며, 원문 미확보 그룹은 HOLD.
