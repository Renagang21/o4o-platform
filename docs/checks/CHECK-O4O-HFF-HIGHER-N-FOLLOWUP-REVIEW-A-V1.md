# CHECK — HFF higher-N 후속 그룹 기준·검수 (Agent A)

- 상위 WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` §6
- 역할: **Agent A 기준·검수** — higher-N 미생산 후보에서 다음 생산 가능 그룹 선별.
- 성격: **read-only · DB write 0**. generate/dry-run/apply/LIVE수정/lut-va수정/C산출물변경 미실행. 도구 = `hff-combo-select`(로컬 JSON만).
- 기준선: 복합형 LIVE **512**(직접 카운트 SSOT), 기준 커밋 `1f01a71d5`. 완료 제외 = N5(mg-mn-vd-zn-ca 20)·N8(b-complex 43)·N6(ms-niacin-b126-panto 28). lut-va `PAUSED_GROUP_DEFECT`. ③ N6 비타민C HOLD 유지.
- 동기화: `origin/main` ahead0·behind0, HEAD `1f01a71d5`, 자기 미커밋 0.

## 검수 대상 선정

인벤토리(`CHECK-O4O-HFF-HIGHER-N-5-8-STRICT-INVENTORY-V1`) count 순위에서 완료 3그룹 + HOLD ③ 을 제외한 **다음 상위 3그룹**(#4·#5·#6)을 검수. 전부 저수율로 확인되어, 동수준 count 의 **미네랄 계열 2그룹**(#9·#11 — 기 성공 N5 미네랄 배치와 동류)을 추가 probe 하여 실제 생산 가능 광맥을 확정.

## 그룹별 판정 (select 엄격추출, 실측)

| # | N | 조합 | 전체후보 | ELIGIBLE | grounding HOLD | LIVE중복 | 판정 |
|---|:-:|------|:-:|:-:|:-:|:-:|------|
| #4 | 7 | 나이아신+밀크씨슬+B1+B2+B6+아연+판토텐산 | 31 | **9** | 22 (부원료 21·매핑 1) | 0 | **READY_WITH_HOLD** (수율 낮음) |
| #5 | 5 | 나이아신+B1+B2+B6+판토텐산 (B군 코어) | 30 | **2** | 28 | 0 | **HOLD** (2건뿐) |
| #6 | 6 | 나이아신+B1+B2+B6+아연+판토텐산 | 25 | **1** | 24 | 0 | **HOLD** (1건뿐) |
| **#9** | 5 | **마그네슘+망간+비타민D+비타민K+칼슘** | 17 | **17** | **0** | 0 | **READY** (완전 clean) |
| **#11** | 5 | **마그네슘+비타민D+비타민K+아연+칼슘** | 16 | **16** | **0** | 0 | **READY** (완전 clean) |

- #4/#5/#6 전제품 실%basis TRUE·제형 tablet/softgel/capsule(신규 0)·dup 0 — 단 부원료/미귀속 기능성 grounding HOLD 지배(71~96%).
- #9/#11 전제품 실%basis TRUE·제형 tablet+chewable(신규 0)·dup 0·**grounding HOLD 0**.

## 핵심 판정

- **B-complex clean 광맥 소진**: 헤드라인 ①(43)·②(28) 이후 남은 B군 변형(#4~#6)은 clean full-set 이 단자릿수로 붕괴. 원인 = 이들 "코어+1" 세트가 실제로는 더 큰 종합비타민의 부분집합(HOLD_MULTI mention 1,247~1,776 지배) + 아연/밀크씨슬 다기능 귀속 충돌(부원료/미귀속). 그룹 정의 자체 결함 아님(valid) → PAUSED 아닌 HOLD.
- **미네랄 계열이 실제 다음 광맥**: #9·#11 은 기 LIVE `mg-mn-vd-zn-ca`(20)·`mg-vd-vk-ca`(4원료 72) 와 동류 — 미네랄 단일기능 귀속으로 **grounding HOLD 0**. 최우선 생산 대상.

## 공통 근거 (5그룹)

- **새 원료 0**(전량 registry NUTRIENT_META) · **새 제형 0**(tablet/softgel/capsule/chewable, 액상 0) · **기존 basis 재사용 YES**(declaredAmount 구조·mg/μg/NE/DFE, 신규 0) · **새 공통 Guard 0**(compose N-제너릭 + G-MULTI 기존, N5·N7 동일 경로; B12 부재로 B1 `\b` Guard 무충돌) · **기존 LIVE 중복 0**.
- **중지 사유 없음**. (N5·N7 은 검증완료 N8=8카드 범위 내 → 추가 시각 스모크 불요.)

## Agent B 권장 생산 순서

```text
1순위: #9  마그네슘+망간+비타민D+비타민K+칼슘 (N5)   → READY,           17 생산 / 0 HOLD
2순위: #11 마그네슘+비타민D+비타민K+아연+칼슘 (N5)   → READY,           16 생산 / 0 HOLD
3순위: #4  나이아신+밀크씨슬+B1+B2+B6+아연+판토텐산(N7) → READY_WITH_HOLD, 9 생산 / 22 HOLD (선택, 저수율)
제외 : #5(2건)·#6(1건) HOLD — batch 가치 없음. ③ N6 비타민C HOLD 유지.
```

## 보고 요약

```text
그룹: 5 검수 (인벤토리 count 상위 3 [#4·#5·#6] + 미네랄 probe 2 [#9·#11])
전체 후보: 119 (31+30+25+17+16)
ELIGIBLE: 45 (#4 9 + #5 2 + #6 1 + #9 17 + #11 16)
HOLD: 74 (#4 22 + #5 28 + #6 24; #9·#11 0)
기존 LIVE 중복: 0
basis 재사용: YES (신규 0)
새 원료/제형: 0 / 0
판정: #9 READY · #11 READY · #4 READY_WITH_HOLD · #5 HOLD · #6 HOLD
Agent B 권장 순서: #9(17) → #11(16) → #4(9, 선택)
중지 사유: 없음
```

*read-only · DB write 0 · generate/dry-run/apply 미실행.*
