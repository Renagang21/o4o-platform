# CHECK — 비타민 C 확장 30건 검증 (파일럿 → 50 누적)

- 일자: 2026-07-17
- 대상: 비타민 C 단일형 **추가 30건** (`hff-vitamin-c-30`). 파일럿 20 + 30 = 누적 50.
- 성격: 검증된 파일럿 패턴 확장(체크포인트). **작성·검증만 — DB 적재/canonical 아님.**
- 작성 Agent B + **오케스트레이터 독립 검수 통과**.

---

## 판정: PASS (작성 30 / HOLD 0)

| 차원 | 결과(독립 재검) |
|---|---|
| 최신 Guard 전수 (G-WATER 포함) | **PASS 30 · REVIEW 0 · BLOCKED 0** |
| 물 규칙 | 근거없는 물 **0** |
| **함량 정합 (핵심)** | 표시량 X(비타민C 함량) 초안 미등장 **0/30** |
| calc 논리 | calculationAllowed=true **0/30** (전건 F 정당) |
| grounding · draft 결손 | **0 · 0** |
| 질병 단정 · 과장 | **0 · 0** |
| 렌더러 호환 | style/script 0 · sd-card 루트 60/60 |
| 중복 | 파일럿 20 **0** · 30 내 **0** |

## 엣지 검수 (실물 서술 논리)

- **vc-30-14(희석)**: 원문 "물에 희석" → "1포 물에 희석하여"(물 근거 있음), 3000mg/3000mg 순수 분말.
- **vc-30-23(직접-only)**: 원문 "직접 섭취"(물 없음) → "직접 섭취"만, 물 미부가.
- **vc-30-05(9정/serving, 180mg/540mg)**: 다회량 최초 사례 — "1일 섭취량(9정)에 비타민 C 180mg(표시 기준 540mg당)". 함량 vs 정제중량 구분 + "표시 기준 Y당" 한정어 유지. 다회량 3건(9정·2정·2정) 전부 한정어 누락 **0**.

## 산출물

- `docs/checks/data/product-description-guard/hff-vitamin-c-30.json` (+ `-hold.json`)
- `docs/guides/products/health-functional-food/pilot-vitamin-c-extended/drafts/` (60 HTML)
- 스캔: `apps/api-server/src/scripts/hff-vc-guard-scan-30.ts`

## 후속

- 100건 제한 대량작업으로 확장(체크포인트 유지). 액상·복합·수치깨짐은 strict-pool 선정에서 사전 배제.
