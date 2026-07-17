# CHECK — 비타민 C 단일형 100건 종합 (목표 달성)

- 일자: 2026-07-17
- 대상: 비타민 C 단일형 **누적 100건** (파일럿 20 + batch30 + batch60 + batch100)
- 성격: **작성·검증 완료 산출물 보존 — DB 적재/canonical 아님** (적재는 별도 승인 게이트).
- 작성 Agent B(체크포인트 4회) + **오케스트레이터 매 체크포인트 독립 재검 통과**.

---

## 종합 판정: PASS 100/100

| 차원 | 결과(4배치 독립 재검 누계) |
|---|---|
| 최신 Guard 전수 | **PASS 100 · REVIEW 0 · BLOCKED 0** |
| 신고번호 유일성 | **100/100** (배치 간·배치 내 중복 0) |
| **함량 정합** | 표시량 X(비타민C 함량) 초안 미등장 **0/100** |
| calc 논리 | calculationAllowed=true **0/100** (전건 F — 함량≠정제중량) |
| 물 규칙(양방향) | 근거없는 물 **0** · 원문 물 누락 **0** (오타 `물과함꼐` 보정 포함) |
| 다회량 한정어 | "표시 기준 Y당" 누락 **0** |
| 효능·질병·과장 | 질병 단정 0 · 디톡스/슬리밍 0 · 과장 0 (Detox 브랜드는 h1 제품명만) |
| 렌더러 호환 | style/script 0 · sd-card 루트 200/200 |

## 분포 (누적 100)

```text
용량   100mg:10 200mg:5 250mg:8 300mg:3 400mg:5 500mg:15 1000mg:15 2000mg:12 3000mg:6 + 저용량(32~180mg) 등, 100~3000mg 광범위
serving  tablet 53 · stick(포) 39 · capsule 8
제형    powder 42 · coated 24 · tablet 22 · chewable 7 · capsule 5
```

## 격리 (heldOut) 및 가드 관찰

- **격리 1건**: ATOMY 550mg(말레이시아 수출등록, 2024002808052) — 수출용 미생물 한도 규격(CFU/g 패널) 포함. 국내 clean 동일 제조사·용량품으로 교체. `hff-vitamin-c-100-hold.json` heldOut 기록. (콘텐츠 HOLD 아님 — 수출등록 배제 교정.)
- **공통 Guard 오탐 관찰(수정 안 함)**: `PRE-SRC-CFU-UNVERIFIABLE-003`가 비-프로바이오틱(비타민) 제품의 **미생물 한도 CFU/g**를 효능 CFU 주장으로 오인 → REVIEW(BLOCKED 아님). 초안 CFU 표기 0이라 콘텐츠 위험 없음. 미생물 한도 vs 효능 CFU 구분 룰 개선은 **별도 WO**(공통 코드라 즉시 수정 아님 — 라인 영향 확인 후).

## 비타민 C 고유 패턴 (검증)

```text
표시량(Xmg/Ymg) → X=비타민C 함량, Y=정제/1회량 중량
초안: 함량 X 앞세움 + "표시 기준 Y당" 명기 · calc=false(환산 불가)
다회량(2정·9정)도 "표시 기준 Y당" 한정어 유지
```

## 다음 게이트 (DB 적재)

- 검증 완료. **DB 적재는 별도 명시 승인 후** — 유산균 192 적재 경로(`hff-store-description-canonical-apply.ts`) 재사용.
- 적재 전 read-only 9종 프리로드 검사(대상 100 고정 / candidate 매칭 / STORE canonical 중복 0 / grounding / 최신 Guard BLOCKED 0 / ProductMaster 생성 계획 / write 수 / rollback) 재실행 후 보고 → 승인 → 적재.
