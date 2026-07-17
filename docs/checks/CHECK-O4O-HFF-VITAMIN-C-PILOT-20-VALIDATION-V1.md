# CHECK — 비타민 C 파일럿 20건 종합 판정 (검증 완료)

- 일자: 2026-07-17
- 대상: 비타민 C 단일형 파일럿 **20건** (`hff-vitamin-c-20.json`, candidateId `hff-vc:vc-01..20`)
- 성격: **검증된 파일럿 산출물 보존** — DB 적재·ProductMaster·SPD·canonical 승격 **아님**.
- 경위: 중지된 Agent B 산출물을 최신 물 규칙·Guard·Parser로 소급검사 → 정정 없이 통과 → 종합 판정.

---

## 판정: PASS 20/20

| 차원 | 결과 |
|---|---|
| 최신 Guard 전수 (G-WATER 포함) | **PASS 20 · REVIEW 0 · BLOCKED 0** |
| 물 규칙 | 근거없는 물 **0** (물OK 11 + 물없음 9) |
| grounding 연결 (declaredAmount·serving) | 결손 **0** |
| **함량 정합 (핵심)** | 20/20 — `표시량(X/Y)`의 비타민 C 함량 X를 초안이 정확히 표기, 정제중량 Y는 "표시 기준"으로 명기 |
| calc 논리 | 전건 **calculationAllowed=false 정당** (비타민 C 함량 ≠ 정제중량, 단순 환산 불가) |
| 효능·질병 표현 | 인정 기능성(결합조직 형성·철 흡수·항산화)만 · **질병 단정 0 · 과장 0** |
| 렌더러 호환 | `<style>`/`<script>` 0 · 검증된 sd-* 구조만 → 유산균 반응형 검증 상속 |

## 비타민 C 고유 패턴 (검증 요지)

```text
비타민 C 단일형 = 함량(비타민 C mg) 과 정제/1회량 중량(basis) 이 다르다
  예: 표시량(100mg/700mg)  → 700mg 정제에 비타민 C 100mg
  초안: "비타민 C 100mg 를 표시량으로 담았습니다(표시 기준 700mg당)"
  calc=false: 정제중량으로 비타민 C 함량을 환산하지 않는다
```

유산균(CFU) 패턴과 구별되는 **두 번째 검증된 제작 패턴**. Agent B 작성물은 정정 없이 최신 기준 통과.

## 물 처리 (소급)

원문 intake의 물 명시 여부와 초안이 정확히 일치. vc-05 "직접 또는 물과 함께"는 원문 명시라 정당. 씹어서/직접(물없음) 9건은 물 문구 없음. **근거없는 물 0**.

## 산출물 (보존)

- `hff-vitamin-c-20.json` (검증된 입력 정본)
- `docs/guides/products/health-functional-food/pilot-vitamin-c-single/drafts/vc-01..20.{ko,en}.html`
- `result-vitamin-c-20.json` (최신 Guard 재생성 결과)
- 검사 스크립트 `hff-vc-guard-scan.ts`

## 후속

- 확장: 추가 30건 검증 → 100건 제한 대량작업 (병렬 Agent B 라인).
- HOLD·액상형·복합형은 별도 예외 관리(Agent F).
- 공통 Guard/Parser 변경 시: 전체 중단이 아니라 각 라인의 다음 체크포인트 진입 전 영향 확인·해당 라인만 소급.
