# CHECK — 유산균 생산 배치 (신규 200) · A-CP09 (20건)

- **WO**: `WO-O4O-HFF-DESCRIPTION-PROBIOTICS-PRODUCTION-BATCH-001-V1`
- **일자**: 2026-07-17 · **판정**: **PASS** (작성 19 PASS 19 / BLOCKED 0 / HOLD 1)
- **DB write**: 0 · **migration**: 0

---

## 1. 결과 집계
```text
선정 20 / 작성 19 / HOLD 1 / 작성 완료 19 → PASS 19 / REVIEW 0 / BLOCKED 0
```

## 2. 파서 상태
작성 19 × 3 = 57 PARSED · ABSENT/PARSE_FAILED/ABNORMAL 0 · 벌크 0 · 수작업 grounding 불일치 **0/57** · 절단 0

## 3. HOLD 1 — `HOLD_SOURCE_ABNORMAL` (헬코11플러스혼합유산균, permit 200400200071001)
표시량 CFU 표기 `2.0 x 100,000,000 CFU / 4 g` — 비정형 표기(2×10^8=2억이나 표기 깨짐)로 **파서 CFU ABNORMAL**.
- 파서 ABNORMAL = `HOLD_SOURCE_ABNORMAL`의 **정확한 트리거**. 원문 정정 필요, 교차검증 불가.

## 4. 특이 원문 (보고, 차단 아님)
| 제품 | 원문 | 처리 |
|---|---|---|
| 혼합유산균17종 | `1회(1g)씩` + **납·카드뮴 규격**(오염물질 한도) | 오염물질 규격은 기능성 아님 → 카드 미표기. 기준량 1g=1회 → per-1g(포) 100억 CFU(근거). 실화면 확인 |
| 장건강생유산균키즈 / 홍이장군 키즈랩 | 제품명 "키즈" | 제품명만, 연령 소구 0 |
| 모아락 골드 | 기준량 6,500mg(대용량) | 원문 그대로 |
| 오직:프로바이오틱스 | 제품명 콜론 + 전각 `｛｝` | 제품명 그대로·균형 인용 |

## 5. 사람검수 (CP5 트리거) — 대표 실화면 검수 결함 0
혼합유산균17종(1g=1회, per-unit 근거·오염물질 규격 배제) / 락토셀라8(1일 2회 파생 없음) / 편안한바이옴 per-unit 근거 / 홍이장군·장건강 키즈 제품명만

## 6. 반응형 · 품질
190 조합 전부 PASS · overflow/잘림/겹침/ko-en 오류 0 · 제품명 밖 연령/가족 소구 0 · 비교·우월 0

## 7. 검증
| 항목 | 결과 |
|---|---|
| content-guard 테스트 | 123 PASS (변경 없음) |
| 전 배치 회귀 | BLOCKED 0 (25·30A~C·CP1~5·A-CP01~09) |
| 가드/작성기 수정 | 0 |

→ **A-CP09 종료, A-CP10(마지막) 진행.** (HOLD 누계 8: MULTI_FUNCTIONAL 3 + SOURCE_ABNORMAL 4 + UNSUPPORTED_DIMENSION 1)
