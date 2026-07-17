# CHECK — 유산균 생산 배치 (신규 200) · A-CP07 (20건)

- **WO**: `WO-O4O-HFF-DESCRIPTION-PROBIOTICS-PRODUCTION-BATCH-001-V1`
- **일자**: 2026-07-17 · **판정**: **PASS** (작성 18 PASS 18 / BLOCKED 0 / HOLD 2)
- **DB write**: 0 · **migration**: 0

---

## 1. 결과 집계
```text
선정 20 / 작성 18 / HOLD 2 / 작성 완료 18 → PASS 18 / REVIEW 0 / BLOCKED 0
```
(초안 1차 BLOCKED 1 = 파워 장케어 PRE-SRC-CFU-MISMATCH → HOLD 처리 후 0)

## 2. 파서 상태
작성 18 × 3 = 54 PARSED · ABSENT/PARSE_FAILED/ABNORMAL 0 · 벌크 0 · 수작업 grounding 불일치 **0/54** · 절단 0

## 3. HOLD 2
| 제품 | 코드 | 사유 |
|---|---|---|
| 생유산균화이버(종근당) | `HOLD_MULTI_FUNCTIONAL` | 식이섬유(표시량 4.0g/6g의 80% 이상) 복합 기능성 — 코디네이터 확정 3건 중 2번째 |
| 파워 장케어(풀무원) | `HOLD_SOURCE_ABNORMAL` | 표시량에 **CFU 단위 라벨 누락**(`10,000,000,000/350mg`). 파서 CFU ABSENT + **가드 PRE-SRC-CFU-MISMATCH-002 로 초안 차단** → 원문 표기 보완 필요 |

> **분류 판단 보고**: 파워 장케어는 숫자(10,000,000,000)는 있으나 CFU 단위 표기가 없어 가드가 ungrounded 로 차단.
> `HOLD_GROUNDING`(ABSENT+숫자토큰 0)의 "숫자토큰 0"엔 안 맞아, **CFU 근거 표기 결함 → 원문 보완** 취지가 더 가까운 `HOLD_SOURCE_ABNORMAL`로 분류.
> CP05 뉴장안에화제(`1.0*x10^9` 표기 깨짐)와 함께 **"파서가 CFU를 추출 못 해 가드가 ungrounded 차단"** 계열. 코디네이터가 별도 코드를 원하면 재분류 가능(현재는 SOURCE_ABNORMAL 유지, 진행 지속).

## 4. 특이 원문 (보고, 차단 아님)
| 제품 | 원문 | 처리 |
|---|---|---|
| 프리미엄 코어 | 보관칸에 **유통기한 문구**(`제조일로부터 18개월까지`) 오입력 | 실제 보관 지시 없음 → **보관 행 생략**(STORAGE_SIGNAL 판정 추가). 실화면 확인 |
| 장펴난 | 기준량 `CFU/g`(=1g) | 1g=1포, 포당 1억 CFU(근거 있음) |
| 청인 쾌장에스 | `1포(5g) 씹어드십시오` | chew 칩, per-포 근거 |
| 셀티아이 맘 | 14℃ 냉소 / 제품명 "맘" | 보관 원문 그대로, 제품명만(모성 소구 0) |

## 5. 작성기 1건 수정 — 보관칸 유통기한 오입력 필터
보관 필드에 유통기한 문구만 있는 경우(`제조일로부터 N개월`, 보관 지시어 부재) 보관 행 생략. `STORAGE_SIGNAL`(보관·직사광선·냉장·실온·서늘·℃ 등) 없으면 미표기. CP01~06 무영향(전부 보관 지시어 보유, 재생성 diff 0).

## 6. 반응형 · 품질
180 조합 전부 PASS · overflow/잘림/겹침/ko-en 오류 0 · 제품명 밖 연령/가족/모성 소구 0 · 비교·우월 0

## 7. 검증
| 항목 | 결과 |
|---|---|
| content-guard 테스트 | 123 PASS (변경 없음) |
| 전 배치 회귀 | BLOCKED 0 (25·30A~C·CP1~5·A-CP01~07) |
| 가드 수정 | 0 · 작성기 수정 1(보관칸 유통기한 필터) |

→ **A-CP07 종료, A-CP08 진행.** (HOLD 누계 5: MULTI_FUNCTIONAL 2 + SOURCE_ABNORMAL 2 + UNSUPPORTED_DIMENSION 1)
