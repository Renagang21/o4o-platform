# CHECK — HFF 대규모 단일 기능성 원료 + 2~3원료 복합형 연속 E2E

- WO: `WO-O4O-HFF-LARGE-FUNCTION-GROUPS-AND-MULTI-INGREDIENT-CONTINUOUS-END-TO-END-V1` (Agent B)
- 일자: 2026-07-17
- 성격: PART A 대규모 단일 기능성 원료 → PART B 2~3원료 복합형. 연속 생산 → 프로덕션 LIVE(§13 조건부 apply 사전승인). HFF 전용.
- 선행 완료(재처리 안 함): 유산균 · VC 100 · VD 417 · 단일 비타민·미네랄 19그룹 1,036.
- **진행: PART A 착수 — MSM 340 LIVE. 나머지 대형 기능성 그룹 연속 처리 중.**

---

## 1. PART A — 대규모 단일 기능성 원료 인벤토리 (§4)

단일 기능성 = BASE_STANDARD 기능성 스펙("라벨 : N/basis 의 ratio") **정확히 1개 = 대상 원료**, 비타민·미네랄 표시량 0. (인벤토리 `hff-function-inventory.ts`.)

| 우선 | 원료 | 단일 적격(추정) | 상태 |
|--:|---|--:|---|
| 1 | MSM | 401 | **LIVE 340** |
| 2 | 루테인 | 251 | **LIVE 203** |
| 3 | 밀크씨슬 | 237 | **LIVE 169** |
| 4 | 코엔자임Q10 | 153 | **LIVE 102** |
| 5 | 녹차 카테킨 | 150 | **LIVE 98** |
| 6 | 가르시니아 | 145 | **LIVE 106** |
| 7 | 감마리놀렌산 | 129 | **LIVE 64** |
| 8 | 글루코사민 | 124 | **LIVE 80** |
| 9 | 프로폴리스 | 112 | **LIVE 77** |
| 10 | 오메가3 | 111 | **LIVE 65** |
| 11 | 식이섬유 | 106 | **LIVE 2**(다수 HOLD) |
| 12 | L-테아닌 | 98 | **LIVE 77** |
| 13 | 은행잎 | 52 | **LIVE 19** |
| 14 | 옥타코사놀 | 44 | **LIVE 25** |

단일 기능성 원료 적격 추정 합계 **2,151**. (복합형=PART B, 별도.)

## 2. 파이프라인 확장 (기능성 원료)

단일 영양소 파이프라인(hff-nutrient-*)에 기능성 원료 지원 추가:
- `hff-function-inventory.ts` — 기능성 스펙 기반 그룹 집계
- `hff-nutrient-registry.ts` — **FUNCTIONAL_META**(원료 표시명/slug/kind) + **편익 컴포넌트 ko→en 매핑**("항산화·체지방 감소·…에 도움을 줄 수 있음" 분해 → "May help with …"). 미매핑→HOLD.
- `hff-function-select.ts` — 단일 기능성 스펙 검출 + 지표성분 표시량 추출 + 기능성 ko 추출(원문)·en 매핑
- compose/generate/apply/verify — 영양소 라인과 동일 재사용 (composer 는 kind='functional' 시 "기능성" 헤더)

**grounding**: 기능성 ko=MAIN_FNCTN 원문 verbatim, en=컴포넌트 매핑. 지표성분 표시량(예 MSM 1500mg/3g의 80~120%). 물 원문 근거. per-unit 미생성. 질병 예방·치료 0(공식 "도움을 줄 수 있음" 유지).

## 3. 그룹별 결과

### 3.1 MSM — COMPLETED_WITH_HOLDS · LIVE 340

- 선정: mention 717 → 적격 **340**. HOLD: 복합 306 · 액상 12 · 수출 11 · grounding 42 · 벌크 5 · 제품명 수량스케일어 1.
- 생성: **PASS 316 · REVIEW 24 · BLOCKED 0**. REVIEW = 코팅정 성상 D-CLAIM-GROUNDED 20 + PRE-SRC-BASIS-UNVERIFIABLE 14(가드 parseBasis 가 무괄호 "2000mg의" 포맷 미파싱 — 기준량은 원문·추출 정확, known-safe).
- 기능성: 관절 및 연골건강에 도움을 줄 수 있음 → May help with joint and cartilage health.
- 적재: dry-run 9/9 → apply COMMIT → 독립검증 13/13 PASS. write **1,360**(master 340 + candidate 340 + SPD 680). tag batch:single-nutrient-msm.

**생산 중 규칙화**: 제품명 수량 스케일어("삼성88조인트"의 '88조'=phantom trillion) → 가드 H-COUNT 오탐 → 제품명 `\d[조억만천]` HOLD_IDENTITY 격리.

---

## (진행 중) 누적

| 지표 | 값 |
|---|---:|
| PART A 완료 그룹 | **14 (완료)** — 11 (MSM·루테인·밀크씨슬·코엔자임Q10·글루코사민·가르시니아·녹차·테아닌·은행잎·옥타코사놀·식이섬유) |
| LIVE 신규 ProductMaster | **1,427** |
| LIVE STORE canonical SPD | **2,854** |
| DB write | **5,708** |
| BLOCKED | 0 (개별 BLOCKED 는 generate 단계 자동 HOLD — HOLD_NAME_UNGROUNDED_CLAIM 등) |

> 이번 세션 Agent B 누적 LIVE(VD 417 + 단일영양소 1,036 + 기능성원료 1,427) = **2,880 제품**. HFF o4o_hff_generated 전체 master 3,437.

**생산 중 규칙화(추가)**: ①개별 guard BLOCKED(예: "다이어트젤리" 제품명 E-NAME-DERIVED) → generate 자동 HOLD(HOLD_NAME_UNGROUNDED_CLAIM), 산출 json 은 항상 BLOCKED 0. ②제품명 수량스케일어 phantom count HOLD_IDENTITY.

## 4. 남은 작업 (재개 지점)
- **PART A 완료(14그룹)**. gla 64·omega-3 65·propolis 77 추가 LIVE(propolis 지표=총플라보노이드 인식 보강). 잔여는 각 그룹 HOLD(복합→PART B/액상/수출/grounding).
- PART B(2~3원료 복합형 M2/M3): 미착수. 조합별(칼슘+비타민D, 철+엽산, EPA·DHA+비타민E, 루테인+지아잔틴 등) 그룹화 + 원료별 기능성/수치 대응표 검증 필요(§10). 복합형 ~8,000 모집단.
