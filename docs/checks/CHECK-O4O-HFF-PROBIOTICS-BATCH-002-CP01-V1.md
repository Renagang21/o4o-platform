# CHECK — 유산균 Production Batch 002 · B-CP01 (20건) 체크포인트

- 일자: 2026-07-17
- 대상: 유산균(프로바이오틱스) 단일 기능성 **20건** (`hff-probiotics-prod-b-cp01`)
- 성격: 운영 라인(192 적재 완료) 다음 배치 첫 체크포인트. **작성·검증만 — DB 적재/canonical 아님.**
- 작성 Agent A + **오케스트레이터 독립 검수 통과**.

---

## 판정: PASS (작성 20 / HOLD 0)

| 차원 | 결과(독립 재검) |
|---|---|
| 최신 Guard 전수 (G-WATER 포함) | **PASS 20 · REVIEW 0 · BLOCKED 0** |
| 물 규칙 | 근거없는 물 **0** |
| grounding (declaredCfu·serving·declaredAmount) | 결손 **0** |
| 질병 단정 · 과장 | **0 · 0** |
| 렌더러 호환 | style/script 0 · sd-card 루트 40/40 |
| 중복 | 기존 사용(prod-a 192 + 파일럿 152) **0** · 배치 내 **0** |
| 예외 교차검증 | HOLD 분석 제외 7건(액상 6+복합 1)과 선정 교집합 **0** |

## 엣지 검수 (실물 서술 논리)

- **피비 어시스트(calc=true)**: 원문 "1포(2g) 직접 또는 물과 함께" → 물칩 정당. "표시 기준량 2g = 1포 = 하루 · 계산 불필요 · 1포당 50억 CFU" — basis=serving weight라 환산 정당.
- **콜드에이치(츄어블)**: 원문 "씹어서"(물 없음) → "씹어서 섭취"만, 물 미부가. unitWeight null → "1정 중량 공식표기 없어 단위당 균수 계산 안 함"으로 **역산 회피**. `2.0X10^9`=20억 파서 정상.
- 전 20건 효능 = 인정 3기능("도움을 줄 수 있는")만, EN "may help" 프레임.

## 관찰 (수정 안 함)

- 표준 sweep 스크립트 `hff-water-guard-scan.ts` 파일 정규식에 `prod-b-cp\d+` 미포함 → 전수 sweep 자동 포함하려면 정규식 확장 필요(후속). 이번엔 배치 전용 스캔으로 검증.

## 산출물

- `docs/checks/data/product-description-guard/hff-probiotics-prod-b-cp01.json` (+ `-hold.json` = `[]`)
- `docs/guides/products/health-functional-food/batch-probiotics-prod-002/B-CP01/drafts/` (40 HTML)

## 후속

- 다음 체크포인트(B-CP02~) 계속. 20건 단위 검수 유지. HOLD·액상·복합은 Agent F 분석대로 격리.
