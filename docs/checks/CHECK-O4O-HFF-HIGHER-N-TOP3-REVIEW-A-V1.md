# CHECK — HFF higher-N 상위 3그룹 기준·검수 (Agent A)

- 상위 WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` §6
- 역할: **Agent A 기준·검수** — Agent C 인벤토리(`CHECK-O4O-HFF-HIGHER-N-5-8-STRICT-INVENTORY-V1`)의 상위 후보 생산 가능 판정.
- 성격: **read-only · DB write 0**. generate/dry-run/apply/LIVE수정/lut-va수정/C산출물변경 미실행. 검수 도구 = `hff-combo-select`(로컬 JSON만 출력).
- 기준선: 복합형 LIVE **421**, 기준 커밋 `2eeaac1a7`. lut-va = `PAUSED_GROUP_DEFECT` 작업 금지.
- 동기화: `origin/main` ahead0·behind0, HEAD `caee0f8ce`, 자기 미커밋 0 (untracked 3건은 타 에이전트 소유 — 미접촉).

## 검수 방법

제품명 문자열이 아니라 `hff-combo-select` 엄격추출로 **공식 기능성 원료 스펙 == 지정 조합(정확히)** 을 확인. 원료별 표시량·단위·basis 독립추출 + 기능성 귀속(INGREDIENT_FN) 검증. 각 ELIGIBLE 제품의 승격여부(LIVE중복)는 `product_candidates.candidate_status` 로 read-only 확인.

## 그룹별 판정

### ① 비타민B 컴플렉스 완전형 (N=8) — 나이아신+비오틴+B1+B12+B2+B6+엽산+판토텐산

| 항목 | 값 |
|------|----|
| mention(정확 8-set) | 558 |
| **ELIGIBLE** | **43** |
| HOLD_GROUNDING | 6 (매핑실패 5 · 부원료 1) |
| HOLD_MULTI(상위집합=별조합) | 509 |
| 제형 | tablet 34·capsule 6·powder 2·softgel 1 (고형·액상 0) |
| 전제품 실%basis | TRUE |
| basis 단위 | NE·μg·mg (기존 SPEC 범위, 신규 0) |
| 기존 LIVE 중복 | **0** |
| **판정** | **READY_WITH_HOLD** (43 생산 · 6 HOLD, HOLD율 12%) |

### ② 간건강+B군 (N=6) — 나이아신+밀크씨슬+B1+B2+B6+판토텐산

| 항목 | 값 |
|------|----|
| mention | 242 |
| **ELIGIBLE** | **28** |
| HOLD_GROUNDING | 14 (부원료 8 · 매핑실패 6) |
| HOLD_MULTI | 200 |
| 제형 | tablet 21·capsule 4·softgel 3 (고형·액상 0) |
| 전제품 실%basis | TRUE |
| 기존 LIVE 중복 | **0** |
| **판정** | **READY_WITH_HOLD** (28 생산 · 14 HOLD, HOLD율 33%). 밀크씨슬 간건강 귀속은 LIVE ms-b126 실증. |

### ③ B군+비타민C (N=6) — 나이아신+B1+B2+B6+비타민C+판토텐산

| 항목 | 값 |
|------|----|
| mention | 1,155 |
| **ELIGIBLE** | **3** |
| HOLD_GROUNDING | 28 (부원료/미귀속 25 · 매핑 3) |
| HOLD_MULTI | 1,124 |
| 기존 LIVE 중복 | **0** |
| **판정** | **HOLD** (생산 가능 3건뿐, 부원료/미귀속 기능성 25건 지배 = 제품별 근거 불명확). 그룹 정의는 valid → PAUSED_GROUP_DEFECT 아님. Agent B 대상 제외. |

## 공통 판정 근거

- **새 원료 0**: 15개 원료 전량 `hff-nutrient-registry` NUTRIENT_META 존재.
- **새 제형 0**: 전부 tablet/capsule/softgel/powder — 기존 지원(액상/드롭 0).
- **기존 basis 재사용 YES**: declaredAmount(value/unit/basisAmount/basisUnit/ratio) 구조·단위(mg/μg/NE/DFE) 전부 기존 처리 경로. 신규 basis 0.
- **새 공통 Guard 0**: compose N-제너릭(`ings.map`) + G-MULTI(카드수/순서/기능성) 기존 강제로 N=6·8 동일 경로.
- **기존 LIVE 중복 0**: LIVE 전량 N≤4, 본 그룹 N6/N8 exact-set. 3그룹 ELIGIBLE 74건 중 이미승격 0.

## 조건 (Guard 변경 아님)

- 5+ 카드 세로 스택은 프로덕션 시각 미검증. Agent B 첫 generate(특히 N=8) 시 **8-카드 세로 스택 시각 스모크 1회** 동반 권장(360~1440). 코드/Guard 변경 아님.

## Agent B 권장 대상

```text
1순위: ① 비타민B 컴플렉스 완전형 N=8 → READY_WITH_HOLD, 43 생산 / 6 HOLD
2순위: ② 간건강+B군 N=6           → READY_WITH_HOLD, 28 생산 / 14 HOLD
제외 : ③ B군+비타민C N=6           → HOLD (3건뿐, attribution 불명확 지배)
```

## 보고 요약

```text
검토 그룹: 3 (인벤토리 count 상위 3)
대상 수: 122 (49+42+31, strict clean)
READY: 71 (①43 + ②28, 둘 다 READY_WITH_HOLD)
HOLD: 48 (①6 + ②14 + ③28)  · ③은 그룹 자체 HOLD
BLOCKED: 0
기존 basis: 재사용 (신규 0)
새 원료: 0
새 제형: 0
기존 LIVE 중복: 0
Agent B 권장 대상: ① N8 B컴플렉스(43), ② N6 간건강+B군(28)
중지 사유: 없음 (조건: N8 첫 generate 시 8-카드 시각 스모크 1회)
```

## 실행 결과 (Agent B) — ① N8 B컴플렉스 LIVE

- **비타민B 컴플렉스 N8 43건 LIVE**(2026-07-20). select 실측 ELIGIBLE **43**(본 검수와 정확 일치)·grounding HOLD 6·HOLD∩target 0. generate PASS 37·REVIEW 6(코팅정제 known-safe)·BLOCKED 0·G-MULTI HOLD 0. 8-카드 시각 스모크 360/768/1440 가로 오버플로 0. dry-run 예상=실측 write 172 → apply COMMIT → 독립검증 PASS(canonicalDup 0·기존 421 무변경). **복합형 441 → 484**(직접 카운트).
- **공통 Guard 버그수정 동반**: 최초 generate 3건이 `G-MULTI-AMOUNT-SOURCE` 오탐(라벨 정규식 `비타민B1`이 `비타민B12` 오매칭, 단어경계 부재). B1+B12 최초 공존 배치라 표면화 → `\b` 추가(select CLS 정합)로 43/43. 커밋 `8b100389a`, 회귀(ms-b126) 불변. 상세: 상위 WO §6 "higher-N 헤드라인 LIVE".
- **② N6 간건강+B군 28건 LIVE**(2026-07-20). select 실측 ELIGIBLE **28**(검수 일치)·grounding HOLD 14·HOLD∩target 0. generate PASS 26·REVIEW 2(코팅정제)·BLOCKED 0·G-MULTI HOLD 0(B12 부재, Guard 무충돌). dry-run 예상=실측 112 → apply COMMIT → 독립검증 PASS(canonicalDup 0·기존 484 무변경). **복합형 484 → 512**(직접 카운트). tag `batch:single-nutrient-ms-niacin-b126-panto`. 상세: 상위 WO §6 "higher-N 2순위 LIVE".
- ③ N6 비타민C(3건)는 그룹 자체 HOLD(attribution 불명확 지배) — Agent B 대상 제외 유지.

*본 검수 자체는 read-only · DB write 0. 위 실행 결과는 별도 Agent B apply(승인 기반).*
