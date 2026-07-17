# CHECK-O4O-OTC-BULK-BATCH-01-KO-CANONICAL-PROMOTION-162-V1 — Batch 01 한국어 승격

WO: `WO-O4O-OTC-BULK-BATCH-01-KO-CANONICAL-PROMOTION-162-V1` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [BATCH-01 READINESS](./CHECK-O4O-OTC-BULK-BATCH-01-KO-READINESS-V1.md) · [실행 지침서 §2](../guides/products/drug/OTC-BULK-TRANSLATION-EXECUTION-GUIDE-V1.md)

> **INSERT only 162 (ko canonical).** UPDATE/DELETE **0** · draft 변경 **0** · 제외 2그룹 **미변경** · Batch 02 **무관** · 단일 TX · 이중 게이트.

---

## 0. 결론

> **readiness 통과 8그룹 draft 를 ko STORE canonical 로 승격. INSERT 162 / 그룹별 예상 정확 일치 / rx·비경구 0 / sd-warn 162 / `<table>`·주석 0 / 중복 0 / 제외 2그룹 canonical 0 / 재실행 no-op. Batch 02 master 교집합 0 실측 재확인.**

---

## 1. 적용 (지침서 §2)

| 항목 | 값 |
|---|---|
| 스크립트 | [`drug-otc-bulk-batch-01-ko-canonical-promotion.ts`](../../apps/api-server/src/scripts/drug-otc-bulk-batch-01-ko-canonical-promotion.ts) |
| 게이트 | `--apply` + `DRUG_OTC_BATCH01_PROMOTION_CONFIRM=YES` |
| 저장 | `STORE · ko · canonical · mfds_drug_otc · source_ref_id=그룹 candidate` |
| content | `buildDrugOtcConsumerHtml`(구조화 필드만, bodyMarkdown 미사용) |
| 대상(A_no_spd_only) | name 끝 `(성분)` + spec 첫토큰=함량 + name 제형 · **drug_category≠rx** · STORE canonical 미보유 |
| INSERT | `WHERE NOT EXISTS(canonical)` → 멱등 |

### 1-1. 그룹별 실측 (재열거 = readiness 정확 일치)

| 그룹 | 그룹총 | rx | 승격(신규 INSERT) |
|---|---:|---:|---:|
| 나프록센나트륨\|275\|정 | 136 | 0 | **40** |
| 클로닉신리시네이트\|125\|정 | 80 | 0 | **29** |
| 이부프로펜\|200\|정 | 38 | 0 | **24** |
| 아스피린\|100\|정 | 128 | 0 | **23** |
| 디펜히드라민염산염\|50\|연질캡슐 | 31 | 0 | **16** |
| 독시라민숙신산염\|25\|정 | 32 | 0 | **13** |
| 메코발라민\|500\|캡슐 | 20 | 0 | **10** |
| 이부프로펜\|200\|연질캡슐 | 53 | 0 | **7** |
| **합** | | **0** | **162** |

---

## 2. 병렬 Batch 02 충돌 방지 (실측 재확인)

| 확인 | 결과 |
|---|---|
| groupKey 교집합 (B01 8 ∩ B02 8) | **0** (B02 = 나프록센**250연질**·이부프로펜**400연질**·클로닉신125**연질**·알파칼시돌**1㎍**·아르기닌·시스틴·플루벤다졸·이부프로펜아르기닌 — 전부 다른 염/함량/제형) |
| **master 전개 교집합** | **0** (B01 518 ∩ B02 250 = 0) |
| Batch 02 파일 수정 | **없음**(읽기만 — disjoint 확인용) |

> Batch 02 CHECK(§4) 도 독립적으로 B01 ∩ B02 = 0 을 증명. 양방향 일치.

---

## 3. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| INSERT / ko canonical | **162 / 162** | ✅ |
| 그룹별 실제 = dry-run | **8/8 일치** | ✅ |
| rx·비경구 혼입 | **0** | ✅ |
| sd-warn | **162/162** | ✅ |
| `<table>` / 주석 | 0 / 0 | ✅ |
| language=ko | 162 | ✅ |
| master canonical 중복 | **0** | ✅ |
| **제외 2그룹(알파칼시돌0.5·글루코사민250) canonical** | **0** | ✅ |
| 기존 canonical 덮어쓰기(UPDATE) | 0 (INSERT only) | ✅ |
| 재실행 멱등 | newInsert **0** / INSERT **0** | ✅ |

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| Batch 01 통과 8그룹만 승격 | ✅ |
| 한국어 canonical INSERT 162 | ✅ |
| UPDATE·DELETE 0 | ✅ |
| 제외 2그룹 미변경 | ✅ (canonical 0) |
| Batch 02와 교집합 0 | ✅ (groupKey·master) |
| 사후검증 통과 | ✅ §3 |
| commit·push | ✅ |

---

## 5. 다음

- **en 번역·전개**(지침서 §3–4): 같은 8그룹 162 master 대상, 그룹당 en 번역 1건 → en needs_review 전개.
- 이어 검수 → en canonical(§5).
- 제외 2그룹(알파칼시돌0.5 효능-용법·유육종증 / 글루코사민250 황색5호) = 원문 누락 보완 WO 후 편입.
- 원문없음 115 · combo · rx혼입 · 질정 · 피임약 · Batch 02 = 계속 분리.
