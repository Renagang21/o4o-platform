# CHECK-O4O-OTC-BULK-BATCH-01B-KO-DRAFT-CORRECTION-AGENT-GA-V1 — Batch 01-b ko draft 보완 (에이전트 가)

WO: `WO-O4O-OTC-BULK-BATCH-01B-KO-DRAFT-CORRECTION-AGENT-GA-V1` · 일자: 2026-07-18 · 상태: **완료 (draft 보완·검증)**
근거: [BATCH-01 READINESS §3](./CHECK-O4O-OTC-BULK-BATCH-01-KO-READINESS-V1.md)

> **대상 draft만 수정.** canonical INSERT/UPDATE/DELETE **0** · 영문 **0** · shard 0·1·2 파일 **0** · Batch 01·02 canonical **0** · 공통 GUIDE/GLOSSARY **0** · 단일 TX · 이중 게이트.

---

## 0. 결론

> **알파칼시돌 0.5㎍ draft 는 원문 누락(부갑상선 용법·유육종증)을 보완(UPDATE 1). 결정글루코사민 250mg 은 황색5호가 grounded 10/10 이나 ungrounded 승격대상 8 은 원문 미확보로 함유 미확정 → 과잉경고 방지 위해 draft 미수정, 첨가제 원천 확보 후 서브그룹 분리 트랙으로 이관.**

---

## 1. 알파칼시돌 0.5㎍ 연질캡슐 (draft 0436f0d8 — 보완)

**원문 대조**: 그룹 e약은요 원문 **4종 전부** 부갑상선 용법(1일 1회 2~8캡슐=1~4㎍) + 유육종증 신중 보유 — **제품별 차이 없음 → 공유 draft 보완 가능**(하위 분리 불필요).

| 필드 | 보완 내역 | 원문 근거 |
|---|---|---|
| **usage** | `부갑상선기능저하증 등 비타민 D 대사이상에는 1일 1회 2~8캡슐(1~4㎍)을 복용합니다` 추가(골다공증 0.5~1㎍과 **별도 절**) + `혈청 칼슘 수치에 따라 용량을 조절하며` 추가 | "부갑상선기능저하증…1일 1회 2~8캡슐(1~4㎍)" · "혈청 칼슘수치의 충분한 관리 하에 투여량 조절" |
| **caution** | 상담 대상에 `유육종증 환자` 추가 | 원문 유육종증 신중투여 |

- **숫자 추가**: `2~8캡슐` · `1~4㎍` (원문 근거). **연령·기간·기존 수치 변경 0.** 효능축 변경 0(효능의 부갑상선기능저하증 ↔ 신설 용법 대응 회복).
- **지문**: content_json `bcff8099…` → `6f653836…`. **변경 = usage·caution 2필드만**(타 필드 불변 검증).
- 빌드: `buildDrugOtcConsumerHtml` missing 0 · `<table>` 0 · 주석 0 · sd-warn 유지.

**보완 후 usage**: 성인은 골다공증·만성신부전에 1일 1회 1~2캡슐(0.5~1㎍)을, **부갑상선기능저하증 등 비타민 D 대사이상에는 1일 1회 2~8캡슐(1~4㎍)을** 복용합니다. **혈청 칼슘 수치에 따라 용량을 조절하며,** 복용 중에는 칼슘 섭취 지시를 지키고, 칼슘·비타민 D 함유 제제나 마그네슘 제제와 함께 복용하지 않습니다.

---

## 2. 결정글루코사민 250mg 캡슐 (draft 00e0ca81 — 미수정, 판정)

| 실측 | 값 |
|---|---|
| 그룹 master | 18 (grounded 10 + ungrounded 승격대상 8) |
| grounded 황색5호 언급 | **10 / 10** |
| ungrounded 황색5호 함유 | **미확정**(원문 없음) |

**판정: `일부 제품만 경고 가능 → 원문 근거 불충분(ungrounded)`.**
- grounded 10/10 이 황색5호 신중을 담으므로 이 성분·함량·제형이 황색5호를 흔히 함유함은 강한 근거.
- 그러나 **ungrounded 승격대상 8 은 원문 미확보 → 함유 미확정.** 공유 draft 에 일괄 추가하면 미함유 제품에 **과잉 경고**(WO 금지) → **draft 미수정.**
- **조치**: NB_DOC 첨가제 원천으로 8 master 의 황색5호 함유를 확정한 뒤 **함유 master 만 서브그룹 분리**(첨가제 트랙 연계). 기계 판독 대상 = `docs/checks/data/batch-01b-gluco-additive-verify-targets-v1.json`(ungrounded 8).

---

## 3. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| 알파칼시돌 draft UPDATE | **1** | ✅ |
| 부갑상선 2~8캡슐(1~4㎍) 반영 | ✅ | ✅ |
| 유육종증 신중 반영 | ✅ | ✅ |
| 효능축·연령·기간 불변 | ✅ | ✅ |
| usage·caution 외 필드 변경 | **0** | ✅ |
| 글루코사민 draft 황색5호 미추가 | ✅ 미수정 | ✅ |
| 두 그룹 canonical(mfds_drug_otc) | **0**(미승격 유지) | ✅ |
| `<table>` / 주석 / sd-warn | 0 / 0 / 유지 | ✅ |
| 영문·shard·Batch01·02 변경 | 0 | ✅ |

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 두 그룹 원문 재검토 | ✅ |
| 누락 문구 정확히 보완 | ✅ 알파칼시돌(부갑상선·유육종증) |
| 글루코사민 적용 대상 범위 확정 | ✅ ungrounded 8 = 첨가제 원천 필요(분리 트랙) |
| canonical·영문 변경 0 | ✅ |
| 대상 외 지문 불변 | ✅ |
| commit·push | ✅ |

---

## 5. 산출물 / 다음

- `apps/api-server/src/scripts/drug-otc-batch-01b-ko-draft-correction.ts`
- `docs/checks/data/batch-01b-gluco-additive-verify-targets-v1.json` (글루코사민 ungrounded 8 = 첨가제 확인 대상)

> **다음**: ① 알파칼시돌 = Batch 01-b 로 ko canonical 승격 + 영문 전개 가능(별도 작업). ② 글루코사민 = 첨가제 원천(NB_DOC)으로 8 master 황색5호 함유 확정 후 서브그룹 분리 → 승격. shard 1·2 fingerprint 와 파일·DB 무충돌.
