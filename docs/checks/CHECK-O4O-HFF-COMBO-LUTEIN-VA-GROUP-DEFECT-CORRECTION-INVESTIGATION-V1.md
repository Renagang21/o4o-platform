# CHECK — HFF lut-va(루테인+비타민A) PAUSED_GROUP_DEFECT 교정 조사 (Agent A) V1

- 상위 WO: `WO-O4O-HFF-SINGLE-NUTRIENT-MULTI-INGREDIENT-MISCLASSIFICATION-AUDIT-AND-LUTEIN-CORRECTION-V1` (OPEN)
- 관련: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` PART B (lut-va `PAUSED_GROUP_DEFECT` 격리)
- 성격: **read-only 조사 · DB write 0 · apply 미실행**. 교정은 승인·이중게이트 후 위 OPEN WO 하에서 통합 실행.
- 대상: 보존 산출물 `docs/checks/data/product-description-guard/hff-combo-lut-va.json` (20 guard-input).

---

## 0. 결론

lut-va 는 **#11 칼슘 오기와 근본적으로 다르다.** 원문 오기가 아니라 **분류·게시 무결성 결함**이며, 원문 20건은 정상이다.
→ **제품 단위 교정 불가. 그룹 재분류 + 기존 LIVE canonical 대체 필요.** 현 `PAUSED_GROUP_DEFECT` 유지가 정답.

## 1. 결함 A — 단일 루테인 라인으로의 오분류 (기존 LIVE 오염)

- combo-select 로 20건({루테인, 비타민A} 조합) 선정 시, dry-run 에서 **ALREADY_PROMOTED 13** — 20건 중 **13건이 이미 `batch:single-nutrient-lutein`(단일 루테인 라인, PART A)으로 LIVE 승격**돼 있었다.
- 13건은 제품명·원문상 **실제 루테인+비타민A 2원료 제품**("루테인 & 비타민A", "눈 건강엔 포커스 루테인 A+", "밝고 환하게 프리미엄 루테인 플러스" 등).
- 표본 3건 현행 LIVE ko STORE SPD 확인: 2건 **비타민A 기능성 완전 누락**(루테인만 게시), 1건 비타민A 가 제품명 문자열로만 등장(기능성 카드 아님).
- 원인: 단일 루테인 셀렉터가 "정확히 1 기능성 스펙" 요구했으나 당시 비타민A 스펙 미인식 → 2원료 제품을 단일로 흡수, 비타민A 누락 게시.

> 정확한 13건 stmt 매핑은 현재 dry-run 산출물 미보존. 교정 WO 에서 **fresh dry-run 의 ALREADY_PROMOTED 목록**으로 재확정한다.

## 2. 결함 B — lut-va 20건 조합셋 자체의 불순물 (본 조사 신규 발견)

`hff-combo-lut-va.json` 20건은 "정확히 {루테인, 비타민A} 2 기능성 스펙"으로 알려졌으나, 실제로는 **4건이 3원료(+베타카로틴)** 제품이다. 각 4건은 베타카로틴 **표시량 spec + 독립 MAIN_FNCTN**(어두운 곳 시각적응 / 피부·점막 형성·유지 / 상피세포 성장·발달)을 보유한다.

| candidateId | 제품 | stmt | 실제 기능성 구성 | 베타카로틴 표시량 |
|---|---|---|---|---|
| lut-va-006 | 눈건강 | 20040020003157 | 루테인+비타민A+**베타카로틴** | 0.43mg/500mg |
| lut-va-008 | 예스나우 아이EYE 솔루션 | 20120019007268 | 루테인+비타민A+**베타카로틴** | 1.26mg/350mg |
| lut-va-013 | 에이아이루테인플러스 | 20040017006477 | 루테인+비타민A+**베타카로틴** | 1.26mg/500mg |
| lut-va-017 | 눈에 좋은 아이안 | 20040020028638 | 루테인+비타민A+**베타카로틴** | 1.26mg/500mg |

- 나머지 16건 = 순수 {루테인, 비타민A} 2원료(basis 는 제품별 상이: 350·500·2000·2500mg 등 — 정상, 결함 아님).
- 4건을 2원료 lut-va SPD 로 게시하면 **베타카로틴 기능성 누락** → 결함 A(비타민A 누락)와 **동일 유형의 재발**.
- 이는 상위 WO §2 감사 질문("비타민A 외 다른 숨은 기능성 원료 포함 여부")에 대한 구체적 답 = **베타카로틴, 4건**.

## 3. 판정 — 그룹 재분류 (제품 단위 교정 아님)

| 항목 | 판정 |
|------|------|
| 결함 유형 | 분류·게시 무결성 (오분류 13 + 조합셋 불순 4) — 원문 오기 아님 |
| 교정 단위 | **그룹 재분류 + 기존 canonical SPD 대체** |
| 제품 단위 교정 | **불가** — (i) 13건은 이미 게시된 canonical SPD 은퇴/대체 필요(source_ref_id·QR 참조 영향), (ii) 20건 셋이 2원료/3원료 혼재라 균질 배치 아님 |

### 재-세분화 방향
- 순수 **{루테인, 비타민A} 2원료** → 진짜 lut-va 조합 (`batch:single-nutrient-combo-lut-va`)
- **{루테인, 비타민A, 베타카로틴} 3원료 (4건)** → 별도 조합 그룹(예: lut-va-bc / N3)으로 분리 생산

## 4. 기존 LIVE 영향 범위

- **13건 단일 루테인 SPD(ko, 비타민A 누락)** = 실 오염 LIVE — canonical 대체 대상.
- 감사 확장 필요: `batch:single-nutrient-lutein` 전체 LIVE(≈203) 중 raw 기능성 스펙 ≥2 인 건 전수 색출(WO §2). 루테인 외 단일 라인(zinc/magnesium/vitamin-d 등)의 동일 다중원료 흡수 패턴 존재 여부 포함 → 공통 결함 여부 확정.
- **클린 7건(미승격) 부분 apply 금지** — 13건 오염 방치 + 베타카로틴 4건 누락 재발 우려. 20건은 교정 WO 에서 통합 처리.

## 5. 교정안 (승인·이중게이트 후 · apply 미실행)

```text
1. lut-va 20건 원료구성 재판정 → 2원료(16) / 3원료+베타카로틴(4) 분리
2. 단일 루테인 LIVE 전수 감사 → 다원료 오분류 목록 전수 확정 (비타민A 누락 범위)
3. 오분류 단일 SPD canonical 대체 (은퇴 후 combo 재게시), source_ref_id·QR·rollback 영향 검토
4. 2원료 lut-va + 3원료 lut-va-bc 각각 정합 태그로 재게시
5. 이중 게이트(dry-run→독립검증) 후 apply
```

## 6. 보존 산출물 상태 (미적용)

- `docs/checks/data/product-description-guard/hff-combo-lut-va.json` (20 guard-input) + `production-combo/lut-va/drafts/` (40 draft).
- **상태 고정**: apply 금지 · 기존 LIVE 수정 금지 · 7건 부분 apply 금지 · 임의 삭제 금지.
- **`PAUSED_GROUP_DEFECT` 유지.** 복합형 기존 LIVE 무변경, DB write 0.

---

*read-only · DB write 0 · generate/dry-run/apply 미실행. 교정은 승인·이중게이트 후 상위 OPEN WO 하에서.*
