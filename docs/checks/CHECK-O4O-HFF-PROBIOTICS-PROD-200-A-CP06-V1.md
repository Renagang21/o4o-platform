# CHECK — 유산균 생산 배치 (신규 200) · A-CP06 (20건)

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

## 3. HOLD 1 — `HOLD_UNSUPPORTED_DIMENSION` (야쿠르트 라이트, permit 2014001710732)
표시기준 `표시량(10,000,000,000 CFU / 65 ml)` · 성상 **액상** · 유통기한 17일(냉장).
- 기준량이 **부피(65 mL)** — 중량(mg/g) 기반 CFU/기준량 모델 밖. 파서도 기준량 PARSE_FAILED(mL 미지원).
- 코드 = `HOLD_UNSUPPORTED_DIMENSION`. 초안·입력 JSON 미생성, hold JSON 기록. (레지스트리 정의 정확 부합)

## 4. 특이 원문 (보고, 차단 아님)
| 제품 | 원문 | 처리 |
|---|---|---|
| 게스프로 장건강 | **보관 원문 없음(PRSV 없음)** | 보관 행 자체 생략(실화면 확인) — 원문 없으면 넣지 않는다 |
| 청인 골드에스 | `1포(5g) 물과 함께 씹어드십시오` | chew 칩 `씹어서 섭취`, 기준량 5g=1포 → 포당 1억 CFU(근거 있음) |
| 건기남의 비피더스 | `표시량 ｛…500 mg｝이상`(전각 중괄호) | 균형 인용(CP03 전각괄호 수정 적용) |
| 장용락 / 이너케어플러스 / 건기남의 | 냉장·10℃ 보관 | 원문 그대로 인용, 실온/냉장불필요 주장 없음 → 모순 없음 |
| 장온 | 1일 2회 | pd2 — "1회=하루" 없음, 캡슐당 파생 없음 |

## 5. 사람검수 (CP5 트리거) — HR 4건(calc 3 + 1일2회 1), 대표 실화면 검수 결함 0
청인(chew·per-unit) / 장온(pd2) / 마이락토 키즈(제품명만·연령소구 0) / 게스프로(보관행 생략) 확인

## 6. 반응형 · 품질
190 조합 전부 PASS · overflow/잘림/겹침/ko-en 오류 0 · 제품명 밖 연령/가족 소구 0 · 비교·우월 0

## 7. 검증
| 항목 | 결과 |
|---|---|
| content-guard 테스트 | 123 PASS (변경 없음) |
| 전 배치 회귀 | BLOCKED 0 (25·30A~C·CP1~5·A-CP01~06) |
| 가드/작성기 수정 | 0 |

→ **A-CP06 종료, A-CP07 진행.** (HOLD 누계 3: MULTI_FUNCTIONAL 1 + SOURCE_ABNORMAL 1 + UNSUPPORTED_DIMENSION 1)
