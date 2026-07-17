# CHECK-O4O-OTC-ADDITIVE-WARNING-APPLY-260-V1 — 첨가제 경고 적용 (안전조건 중단)

WO: `WO-O4O-OTC-ADDITIVE-WARNING-APPLY-260-V1` · 일자: 2026-07-17 · 상태: **중단 (dedup 결함 → 대상 수 불일치)**
근거: [WARNING-WHITELIST](./CHECK-O4O-OTC-ADDITIVE-WARNING-WHITELIST-V1.md) · [READINESS-AUDIT](./CHECK-O4O-OTC-ADDITIVE-SUBGROUP-READINESS-AUDIT-V1.md)

> **DB write 0.** WO 안전조건 "대상 130 master / 260 canonical 불일치 시 중단" 발동 → **apply 미실행**(SELECT 검증만).

---

## 0. 결론 — 중단

> **적용 전 중복 검증에서 색소 대상 57 중 13이 현재 설명서에 이미 색소 경고를 보유함을 발견. WHITELIST(V1)의 dedup 결함(정규식 오탐)으로 이미 문구 있는 master 가 대상에 포함돼 있었다. WO 안전조건대로 apply 를 중단하고, 정정 대상 117 master / 234 canonical 을 산출했다.**

---

## 1. 발견 — dedup 결함

- READINESS/WHITELIST 의 색소 "문구없음" 판정은 `setb-masters.json` 의 `has_dye = content ~ '황색\s?\d\s?호|타르색소|색소'` 정규식에 의존.
- **정규식 오탐**: `황색\s?\d\s?호` 는 "황색**203**호"(다중 숫자) 및 일부 케이스에서 기존 색소 문구를 **미검출** → 이미 "황색203호·황색5호 과민증 경험자는 복용 전 약사와 상담" 을 가진 master 를 "문구없음" 으로 잘못 분류.
- **robust 재검증(LIKE)**: `content LIKE '%황색%'/'%타르색소%'/'%적색%'/'%청색%'/'%색소%'` → 색소 대상 57 중 **13 이 이미 색소 경고 보유**.
  - 시트룰린 500mg 정 **10** + 트리메부틴 200mg 정 **3** (전부 색소-단독).
- 유당(98)·아스파탐(1)은 LIKE 기반 판정이라 **충돌 0**(정상).

> 예: `769eeb27`(시트룰린) 현재 caution = "…황색203호·황색5호 과민증 경험자는 복용 전 약사와 상담하고…" — 이미 색소 신중 경고 존재 → **추가 삽입 시 중복**.

---

## 2. 정정 대상 (v2)

| | 원(V1) | **정정(v2)** |
|---|---:|---:|
| distinct master | 130 | **117** |
| ko / en canonical | 260 | **234** |
| 유당 인스턴스 | 98 | 98 |
| 색소 인스턴스 | 57 | **44** |
| 아스파탐 인스턴스 | 1 | 1 |
| 조합 | 유당72·색소32·색소유당25·아스파탐유당1 | 유당72·**색소19**·색소유당25·아스파탐유당1 |

- **탈락 13**: 시트룰린 10 + 트리메부틴200 3 (색소-단독, 이미 색소 상담 경고 보유). 부분재조립 필요 **0**(다중함유 색소+유당 25 는 색소 미충돌 → 유지).
- 정정 화이트리스트: `additive-warning-whitelist-v2.json`(117 entries, ko/en 문구 V1 과 동일).

---

## 3. 조치

- **apply 미실행** — WO 안전조건(130/260 불일치 시 중단) 준수. DB·canonical **불변**.
- 정정 whitelist v2(117/234) + dedup 감사(`additive-dedup-audit.json`) 산출.
- **후속 apply WO 필요**: 대상 수를 **117 master / 234 canonical** 로 정정한 `…-APPLY-234-V1`. 기존 게이트(이중 승인·단일 TX·BUILDER_DRIFT 0·역제거·비대상 불변·멱등) + **적용 직전 robust dedup 재확인**(LIKE).

---

## 4. 완료 기준 대조

| WO 기준 | 결과 |
|---|---|
| 260건 반영 | ⚠️ **미실행** — 대상 불일치(실제 117/234)로 중단 |
| 허용 삽입 외 변경 0 | ✅ DB write 0 |
| 사후검증 통과 | — (미적용) |
| commit·push | ✅ (중단 사유·정정 대상) |

---

## 5. 산출물 / 권고

- `additive-warning-whitelist-v2.json` — dedup 정정 117 master
- `additive-dedup-audit.json` — 결함·정정 근거

> **권고**: 정정 대상 **117 master / 234 canonical** 로 apply WO 를 재발주. 삽입 위치(사용상 주의사항 금기 뒤·일반 주의 앞)·강도(유당·아스파탐 금기 / 색소 신중)·다중 병기·BUILDER_DRIFT 0 는 V1 확정안 유지. 시트룰린·트리메부틴200 색소 13 은 **이미 경고 보유라 제외**(중복 방지).
