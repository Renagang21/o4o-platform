# CHECK — HFF higher-N 후속 그룹 기준·검수 (Agent A) V2 — 잔여 상위 그룹

- 상위 WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` §6
- 역할: **Agent A 기준·검수** — V1(`CHECK-O4O-HFF-HIGHER-N-FOLLOWUP-REVIEW-A-V1`, `7abfb2419`)에서 #4·#5·#6 + 미네랄 #9·#11 검수 완료 후, **아직 검수하지 않은 잔여 상위 그룹** 추가 검수로 higher-N 큐 완성.
- 성격: **read-only · DB write 0**. generate/dry-run/apply/LIVE수정/lut-va수정/C산출물변경 미실행. 도구 = `hff-combo-select`.
- 기준선: 복합형 LIVE **512**(직접 카운트 SSOT), 기준 커밋 `1f01a71d5`. 완료 제외 N5/N8/N6. lut-va PAUSED. ③ N6 비타민C HOLD 유지.
- 동기화: `origin/main` ahead0·behind0(HEAD `4e835b7a7`, 동시 세션 진행분 포함), 자기 미커밋 0.

## 검수 그룹 (인벤토리 잔여 상위, V1 미검수분)

| # | N | 조합 | 후보 | ELIGIBLE | grounding HOLD | 제형(eligible) | LIVE중복 | 판정 |
|---|:-:|------|:-:|:-:|:-:|------|:-:|------|
| G7 | 7 | 나이아신+B1+B2+B6+비타민C+비타민E+판토텐산 | 24 | **1** | 23 | chewable | 0 | **HOLD** (1건뿐) |
| G10 | 5 | 비타민B1+B2+B6+비타민C+아연 | 16 | **9** | 7 | tablet/capsule/chewable/powder | 0 | **READY_WITH_HOLD** (9) |
| **G13** | 6 | **마그네슘+망간+비타민D+비타민K+아연+칼슘** | 12 | **10** | 2 | tablet | 0 | **READY** (10, near-clean) |

- 전제품 실%basis TRUE. G13 은 #9(mg+mn+vd+vk+ca)∪#11(mg+vd+vk+zn+ca) 합집합 6-미네랄 — 미네랄 단일기능 귀속으로 near-clean(HOLD 2).
- G7(B군+C+E)·G10(B군+C+아연)은 비타민C/E 다기능 귀속으로 HOLD 발생. G10 은 9건 생산 가능(귀속률 개선), G7 은 1건뿐.

## 재확인: 미네랄 계열 = 실제 생산 광맥

- V1 관찰(미네랄 clean) 재확증: G13 6-미네랄 10/12(HOLD 2). B군 변형은 C/E/아연 혼입 시 귀속 붕괴 지속 → 미네랄 우선 원칙 유지.

## 공통 근거 (3그룹)

- **새 원료 0**(registry NUTRIENT_META) · **새 제형 0**(tablet/capsule/chewable/powder, 액상 0) · **기존 basis 재사용 YES**(신규 0) · **새 공통 Guard 0**(compose N-제너릭 + G-MULTI; N5·6·7 ⊂ 검증완료 N8 범위, 시각 스모크 불요) · **기존 LIVE 중복 0**. **중지 사유 없음.**

## Agent B 통합 권장 생산 큐 (V1+V2, 수율·clean 순)

```text
1순위: #9  마그네슘+망간+비타민D+비타민K+칼슘     (N5) READY            17 / 0 HOLD
2순위: #11 마그네슘+비타민D+비타민K+아연+칼슘     (N5) READY            16 / 0 HOLD
3순위: G13 마그네슘+망간+비타민D+비타민K+아연+칼슘 (N6) READY            10 / 2 HOLD
4순위: #4  나이아신+밀크씨슬+B1+B2+B6+아연+판토텐산(N7) READY_WITH_HOLD  9 / 22 HOLD (선택)
5순위: G10 비타민B1+B2+B6+비타민C+아연           (N5) READY_WITH_HOLD  9 / 7 HOLD  (선택)
제외 : G7(1)·#5(2)·#6(1)·③(3) HOLD — batch 가치 없음. lut-va PAUSED 유지.
```

## 보고 요약 (V2 검수분)

```text
그룹: 3 (인벤토리 잔여 상위 G7·G10·G13)
전체 후보: 52 (24+16+12)
ELIGIBLE: 20 (G7 1 + G10 9 + G13 10)
HOLD: 32 (G7 23 + G10 7 + G13 2)
기존 LIVE 중복: 0
basis 재사용: YES (신규 0)
새 원료/제형: 0 / 0
판정: G13 READY · G10 READY_WITH_HOLD · G7 HOLD
Agent B 권장 순서(통합): #9(17) → #11(16) → G13(10) → #4(9,선택) → G10(9,선택)

## 실행 결과 (Agent B)

- **#9 mg+mn+vd+vk+ca(N5) 17건 LIVE**(2026-07-20). select 실측 ELIGIBLE **17**·grounding HOLD **0**(clean READY, 검수 정확 일치). generate PASS 15·REVIEW 2(코팅정제)·BLOCKED 0·G-MULTI HOLD 0. dry-run 예상=실측 68 → apply COMMIT → 독립검증 PASS(canonicalDup 0·기존 512 무변경). **복합형 512 → 529**(직접 카운트). tag `batch:single-nutrient-mg-mn-vd-vk-ca`. 상세: 상위 WO §6 "higher-N V2 큐 1순위 LIVE".
- 다음: #11(16) → G13(10) 순. #4·G10은 저수율 선택.
중지 사유: 없음
```

*read-only · DB write 0 · generate/dry-run/apply 미실행.*
