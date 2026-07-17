# CHECK — 복합형(유산균+식이섬유) 파일럿 4건 검증 (신규 패턴)

- 일자: 2026-07-17
- 대상: 유산균 + 식이섬유 **복합형 4건** (`hff-probiotics-multi-fiber-4`)
- 성격: MULTI_FUNCTIONAL HOLD군의 첫 검증 세트. **작성·검증만 — DB 적재/canonical 아님.**
- 작성 Agent F + **오케스트레이터 집중 독립 검수 통과**.

---

## 판정: PASS 4/4

| 제품 | 품목번호 | 프로바이오틱스(base) | 식이섬유 표시량(base) | 물 |
|---|---|---|---|---|
| 쾌변엔 식이섬유 유산균 | 20130020008439 | 12g당 100억 CFU | 5g/12g | 물과함께 |
| 생유산균화이버 | 20040020016625 | 6g당 10억 CFU | 4.0g/6g | 물에 타서 |
| 유지연의 쾌변엔 장 건강 | 20190009105367 | 6g당 3억 CFU | 3.9g/6g | 그대로/물 |
| 슬림풀 나이트 | 20130020008478 | 8g당 10억 CFU | 5g/8g | 물에 타서 |

## 가드 사각지대 — 수동 검증 (핵심)

> 가드(`parseCfu`/`parseBasis`)는 **프로바이오틱스 CFU + 첫 슬래시 기준량만** 검증한다. 복합형의 **2번째 기능성분(식이섬유 표시량·기능)은 자동 검증 대상이 아님** — 반드시 수동 대조.

| 검증 | 결과 |
|---|---|
| 최신 Guard 전수(유산균 축) | **PASS 4 · REVIEW 0 · BLOCKED 0** (PRE-SRC-CFU/BASIS MATCH) |
| **식이섬유 표시량 draft ↔ source base** | **4/4 일치** (5g·4.0g·3.9g·5g, grounding._secondFunctional 기록) |
| **식이섬유 기능성 = 배변활동 원활** | 4/4 source mainFunction 인정(창작 0) |
| 슬리밍·체지방 소구(슬림풀 나이트 포함) | **0** — 본문 배변·장건강만 |
| 물 규칙 | 4건 원문 물 근거 有 → 표기 정당 |
| 렌더러 호환 | style/script 0 · sd-card 8/8 |

## 패턴 요지

```text
복합형 = 두 인정 기능성분을 둘 다 정직하게 서술
  프로바이오틱스 3기능(유산균 증식·유해균 억제 / 배변활동 원활 / 장 건강)
  + 식이섬유(배변활동 원활)
둘 다 원문 인정 기능성 · 각 표시량 수기 grounding(grounding._secondFunctional)
```

유산균(CFU)·비타민 C(함량)에 이은 **세 번째 검증된 제작 패턴**. 다원료 조합(비타민/아연 등)은 이 풀 밖(0건) — 복합형 1차 범위 = 유산균+식이섬유 4건.

## 산출물

- `docs/checks/data/product-description-guard/hff-probiotics-multi-fiber-4.json`
- `docs/guides/products/health-functional-food/pilot-multi-fiber/drafts/` (8 HTML)

## 후속

- 가드에 식이섬유(2번째 기능성) 자동 검증 추가 검토(현재는 수동). 별도 WO.
- DB 적재는 승인·이중게이트 후(유산균 192 적재 경로 재사용, F12).
