# CHECK-O4O-OTC-BATCH-01B-GLUCOSAMINE-ADDITIVE-SOURCE-VERIFY-AGENT-GA-V1 — 글루코사민 황색5호 첨가제 원문 검증 (에이전트 가)

WO: `WO-O4O-OTC-BATCH-01B-GLUCOSAMINE-ADDITIVE-SOURCE-VERIFY-AGENT-GA-V1` · 일자: 2026-07-18 · 상태: **완료 (read-only 조사)**
계승: [BATCH-01B KO DRAFT CORRECTION §2](./CHECK-O4O-OTC-BULK-BATCH-01B-KO-DRAFT-CORRECTION-AGENT-GA-V1.md) — 결정글루코사민 250mg ungrounded 8 첨가제 트랙
채널: **Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only** (사용자 인가). shard 0·1·2 파일 **0** · Batch 01·02 canonical **0** · 공통 GUIDE/GLOSSARY **0** · draft/번역/ProductMaster **0** · DB write **0**.

---

## 0. 결론

> **대상 8 master 는 프로덕션 DB 에 첨가제·주의·경고를 담은 원문이 전혀 없다(모두 `SOURCE_MISSING`). 유일 매칭 후보는 바코드/표준코드 레지스트리(`mfds-drug-master-standard-code`)로 첨가제 텍스트를 담지 않으며, 두 itemSeq(코스민=200003542·오라테오=200000936)는 전 소스에서 e약은요 후보 0. 같은 성분·함량·제형 grounded 는 황색5호 함유(2/2 제품)이나 제조사가 다른 제품(오스테민=삼진제약·골사민=신일제약 ↔ target=영풍제약·바이넥스)이라 전이 불가(WO 추정 금지). → 8 전건 원문 미확보로 보류. 공유 draft 미수정, 황색5호 경고 추가 없음. 승격 불가.**

---

## 1. 대상 (8 = 2 제품 / 2 itemSeq)

| # | master_id(head) | 제품 | 제조사 | itemSeq | 매칭 소스 | 판정 |
|---|---|---|---|---|---|:---:|
| 1 | cdf7db47 | 오라테오캡슐 | (주)바이넥스 | 200000936 | 표준코드 레지스트리 | SOURCE_MISSING |
| 2 | b9a05c58 | 오라테오캡슐 | (주)바이넥스 | 200000936 | 표준코드 레지스트리 | SOURCE_MISSING |
| 3 | 94958423 | 오라테오캡슐 | (주)바이넥스 | 200000936 | 표준코드 레지스트리 | SOURCE_MISSING |
| 4 | 4c342745 | 코스민캡슐 | 영풍제약(주) | 200003542 | 표준코드 레지스트리 | SOURCE_MISSING |
| 5 | 6cc7a7fa | 코스민캡슐 | 영풍제약(주) | 200003542 | 표준코드 레지스트리 | SOURCE_MISSING |
| 6 | fcd9b9d6 | 코스민캡슐 | 영풍제약(주) | 200003542 | 표준코드 레지스트리 | SOURCE_MISSING |
| 7 | bb3b6b34 | 코스민캡슐 | 영풍제약(주) | 200003542 | 표준코드 레지스트리 | SOURCE_MISSING |
| 8 | 392569e9 | 코스민캡슐 | 영풍제약(주) | 200003542 | 표준코드 레지스트리 | SOURCE_MISSING |

- 대상 수 = 8 (target 파일과 일치, ABORT 없음). ATC 전건 `M01AX05`(글루코사민), spec 250밀리그램 캡슐.
- **8 master → 2 제품(포장/수량 SKU 분화) → 2 itemSeq.** 즉 실제 제품은 오라테오(바이넥스)·코스민(영풍) 2종.

---

## 2. 원문 조사 결과 (원천 우선순위 전수)

| 원천 | 결과 |
|---|---|
| ① 식약처 e약은요(`MFDS_EASY_DRUG_INFO`) | itemSeq 200000936·200003542 **후보 0건** — 원문 없음 |
| ② 품목 표준코드 레지스트리(`mfds-drug-master-standard-code_2025-10-31`) | 8 master 매칭 O. 그러나 payload = barcode·standardCode·mfdsCode·dosageForm·package·제조사 메타뿐, **첨가제·주의·경고 텍스트 없음** → 첨가제 근거 아님 |
| ③ 기타 소스(허가상세/NB_DOC) | 두 itemSeq 로 매칭되는 후보 **0** (전 소스 스캔) |
| ④ 기존 `shared_product_descriptions` | 8 master 전건 SPD **0** (canonical/draft 미보유) |

> **첨가제/색소 경고를 담는 유일 DB 소스 = e약은요.** 대상 2 itemSeq 는 e약은요 미보유 → **DB 만으로는 황색5호 확정 불가.** 확정하려면 외부 식약처 **품목허가 상세(첨가제 항목)** 원문 — itemSeq 200000936(오라테오/바이넥스)·200003542(코스민/영풍) — 확보가 필요하며 본 read-only WO 범위 밖.

---

## 3. 대조군 (grounded) — 추정 아님, 제조사 대조

같은 ATC(M01AX05)·250mg·캡슐 중 e약은요 보유 = **2 제품 전건 황색5호 함유**.

| 제품 | 제조사 | itemSeq | 황색5호 | 원문 근거 |
|---|---|---|:---:|---|
| 오스테민캡슐 | 삼진제약(주) | 198801103 | ✅ | "…신장애, **황색5호에 과민증 환자**, 당뇨병…의사 또는 약사와 상의" |
| 골사민캡슐(수출명 NEOCOMIN) | 신일제약(주) | 199902612 | ✅ | "…신장애, **황색5호에 과민증 환자**, 당뇨병…의사 또는 약사와 상의" |

- **제조사 교집합 = 0.** grounded(삼진·신일) ↔ target(영풍·바이넥스). 황색5호 배합은 제조사·제품별 처방 사안이므로 **grounded 원문을 target 에 전이 불가**(WO: "제품명 유사성이나 같은 성분·함량만으로 첨가제를 추정하지 않는다").
- 즉 "이 성분·함량·제형이 황색5호를 흔히 함유"는 참이나, **오라테오/코스민 각각의 함유는 미확정.**

---

## 4. CHECK 필수 결론 (8)

| # | 항목 | 값 |
|---|---|---|
| 1 | 대상 8 중 원문 확보 수 | **0** (첨가제 담는 원문 0) |
| 2 | 황색5호 함유 수 | **0** (확정 불가) |
| 3 | 황색5호 미함유 수 | **0** (확정 불가) |
| 4 | 다른 색소 함유 수 | **0** |
| 5 | 원문 미확보·충돌 수 | **8** (SOURCE_MISSING 8 / CONFLICT 0) |
| 6 | 공유 draft 보완 가능 여부 | **NO** (함유 0 → 일괄/서브그룹 보완 불가) |
| 7 | 하위 그룹 분리 필요 여부 | **아니오 (현 단계)** — 확정 0 이므로 분리 대상 없음. 외부 첨가제 원문 확보 후 재판단 |
| 8 | 바로 승격 가능한 master 수 | **0** (미함유 확정 0 · 함유 확정 0) |

---

## 5. 그룹 처리 판정

- WO 그룹 처리 원칙 중 **"원문 미확보 또는 충돌이 남으면 → 해당 master 만 보류"** 에 해당.
- 8 전건 보류. **확정 master 0 → 별도 처리(승격/서브그룹 분리) 후보 없음.**
- 공유 draft(00e0ca81) 에 황색5호 경고 **추가하지 않음** — 과잉경고(WO 금지) 및 추정 방지. draft 미수정 유지.

---

## 6. 안전 조건 대조

| 조건 | 결과 |
|---|---|
| 8건 전수 확인 | ✅ (8/8, ABORT 없음) |
| 추정 판정 0 | ✅ (grounded 전이 안 함 — 제조사 대조로 차단) |
| 원문 없는 제품을 함유로 간주 안 함 | ✅ (8 전건 SOURCE_MISSING) |
| 황색5호 외 색소를 황색5호로 통합 안 함 | ✅ (타 색소 0) |
| 다른 첨가제 경고 별도 기록 | ✅ (해당 없음 — 원문 자체 없음) |
| shard 0·1·2 / Batch 01·02 canonical / 공통 GUIDE·GLOSSARY 수정 | **0** |
| DB write | **0** (SELECT only, 사후 write 검증 0) |

---

## 7. 산출물 / 다음

- `apps/api-server/src/scripts/drug-otc-batch-01b-gluco-additive-source-verify.ts` (read-only 조사 스크립트)
- `docs/checks/data/batch-01b-gluco-additive-source-verification-v1.json` (8 master 판정 + 대조군)
- 본 CHECK 문서

> **다음**: 오라테오캡슐(itemSeq 200000936·바이넥스)·코스민캡슐(itemSeq 200003542·영풍제약)의 **식약처 품목허가 상세 첨가제 항목**(외부 원문) 확보 시 재검증 → 황색5호 함유 확정 master 만 서브그룹 분리 후 승격. DB 에 e약은요/허가상세가 인입되면 본 스크립트 재실행으로 자동 재판정 가능. 외부 원문 미확보 동안 8 전건 승격 보류 유지.
