# CHECK — 유산균 생산 배치 (신규 200) · A-CP08 (20건)

- **WO**: `WO-O4O-HFF-DESCRIPTION-PROBIOTICS-PRODUCTION-BATCH-001-V1`
- **일자**: 2026-07-17 · **판정**: **PASS** (작성 18 PASS 18 / BLOCKED 0 / HOLD 2)
- **DB write**: 0 · **migration**: 0

---

## 1. 결과 집계
```text
선정 20 / 작성 18 / HOLD 2 / 작성 완료 18 → PASS 18 / REVIEW 0 / BLOCKED 0
```

## 2. 파서 상태
작성 18 × 3 = 54 PARSED · ABSENT/PARSE_FAILED/ABNORMAL 0 · 벌크 0 · 수작업 grounding 불일치 **0/54** · 절단 0

## 3. HOLD 2
| 제품 | 코드 | 사유 |
|---|---|---|
| 유지연의 쾌변엔 장 건강(세종바이오팜) | `HOLD_MULTI_FUNCTIONAL` | 식이섬유(표시량 3.9g/6g의 80% 이상) 복합 — 코디네이터 확정 3건 중 **3번째(마지막)** |
| 닥터유산균프리미엄(한풍네이처팜) | `HOLD_SOURCE_ABNORMAL` | `프로바이오틱스 수(CFU/2,000mg) : 표시량(250,000,000)` — CFU 단위가 값과 분리돼 파서 CFU PARSE_FAILED·가드 ungrounded. 원문 표기 보완 필요 |

> **식이섬유 3건 전량 격리 완료**: CP03 쾌변엔식이섬유 / CP07 생유산균화이버 / CP08 유지연의쾌변엔.
> `HOLD_SOURCE_ABNORMAL` 계열(파서가 CFU 추출 못 함) 누계 3: 뉴장안에화제(표기 깨짐) · 파워장케어(단위 누락) · 닥터유산균프리미엄(단위 분리).

## 4. 대조 사례 — 진행 vs HOLD (판정 일관성)
| 제품 | 원문 | 파서 CFU | 처리 |
|---|---|---|---|
| 유산균 장건강(유유) | `[3,000,000,000(30억)/2,000 mg]` (CFU 단위 없음) | **PARSED 30억**(`(30억)` 마커) | **진행** — 파서 파싱+일치 |
| 파워장케어 / 닥터유산균프리미엄 | CFU 단위 누락/분리 | ABSENT/PARSE_FAILED | **HOLD** — 가드 차단 |

## 5. 사람검수 (CP5 트리거) — 대표 실화면 검수 결함 0
- **락토셀 (1일 2회 + 1회 2캡슐, 최고난도)**: 인트로 `1일 2회, 1회 2캡슐`, "1회=하루" 없음, 캡슐당 파생 없음 (정상)
- 츄잉비드 (1g(1정) 씹어) per-정 근거 · 셀로맥스 1캡슐(350mg) per-unit 근거 · 김치유산균 냉장보관 원문 그대로 · 트루락우먼 제품명만(여성 소구 0)

## 6. 반응형 · 품질
180 조합 전부 PASS · overflow/잘림/겹침/ko-en 오류 0 · 제품명 밖 연령/가족/여성 소구 0 · 비교·우월 0

## 7. 검증
| 항목 | 결과 |
|---|---|
| content-guard 테스트 | 123 PASS (변경 없음) |
| 전 배치 회귀 | BLOCKED 0 (25·30A~C·CP1~5·A-CP01~08) |
| 가드/작성기 수정 | 0 |

→ **A-CP08 종료, A-CP09 진행.** (HOLD 누계 7: MULTI_FUNCTIONAL 3 + SOURCE_ABNORMAL 3 + UNSUPPORTED_DIMENSION 1)
