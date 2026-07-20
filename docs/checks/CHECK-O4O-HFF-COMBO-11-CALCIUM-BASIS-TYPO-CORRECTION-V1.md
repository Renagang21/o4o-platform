# CHECK — HFF 복합형 #11 칼슘 basis 오기 단건 교정 조사 (Agent A) V1

- 상위 WO: `WO-O4O-HFF-MX-MULTI-INGREDIENT-EXPANSION-PILOT-V1` §6 (higher-N V2 큐)
- 발단: `CHECK-O4O-HFF-HIGHER-N-FOLLOWUP-REVIEW-A-V2` — #11 `mg+vd+vk+zn+ca`(N5) 배치 15건 LIVE 시 **1건 정당 HOLD**(`HOLD_GUARD_BLOCKED / PRE-SRC-BASIS-MISMATCH-002`) 후속 교정 조사.
- 성격: **read-only 조사 · DB write 0 · apply 미실행**. 교정은 승인·이중게이트(dry-run→독립검증) 후 별도 실행.
- 대상: stmt `2020000997275` — 트러스펙트 칼슘 마그네슘 아연 비타민D K2 · (주)파마피아.

---

## 1. 확정 사실 — 칼슘 basis 원문 오기

공식 원문(MFDS 건강기능식품 raw, `BASE_STANDARD`) verbatim:

```text
1. 성상   : 고유의 향미가 있고 이미, 이취가 없는 점박이를 포함한 백색의 장방형 제피정제
2. 칼슘   : 표시량(300mg /1,1500mg)의 80~150%      ← 오기 (basis 필드)
3. 마그네슘 : 표시량(150 mg /1,500mg)의 80~150%
4. 아연   : 표시량(8.5mg /1,500mg)의 80~150%
5. 비타민D : 표시량(25 μg /1,500mg)의 80~180%
6. 비타민K : 표시량(21 μg /1,500mg)의 80~180%
7. 대장균군 : 음성
8. 붕해시험 : 적합(60분 이내)
```

- 섭취기준(`SRV_USE`): `1일 1회, 1회 1정(1,500mg)을 충분한 물과 함께 섭취하십시오`

### 교정값
- **칼슘 basis `1,1500mg` → `1,500mg`** (표시량 값 300mg 은 정상, basis=1정 중량 필드만 교정).

## 2. 동일 문서 내 교차근거 (self-evidencing)

1정 중량(basis)은 다음 5개 독립 근거가 전부 **1,500mg** 으로 일치, 칼슘 라인만 상이:

| 근거 | basis 값 |
|------|:--------:|
| 마그네슘 표시량 basis | 1,500mg |
| 아연 표시량 basis | 1,500mg |
| 비타민D 표시량 basis | 1,500mg |
| 비타민K 표시량 basis | 1,500mg |
| 섭취기준 `1정(…)` 중량 | 1,500mg |
| **칼슘 표시량 basis** | **1,1500mg ← 유일 이상치** |

- 외부/LLM 추론 0. **동일 표시사항 문서 내 verbatim 교차확인**만으로 확정 → 콘텐츠 grounding 불변 원칙 충족.
- `1,1500` 은 `1,500` 에 숫자 `1` 이 1개 삽입된 전형적 입력 오기(콤마 위치 기준 4자리 정수는 표기 규칙상 성립 불가).

## 3. 차단 원리 (오탐 아님)

- `hff-combo-select` 의 basis 파서(`numOf`)는 콤마 제거 → `"1,1500"` → **11500(mg)**.
- 칼슘 basis 11500 vs 타 원료 basis 1500 → 원료 간 basis 불일치로 generate 표준 Guard 가 정당 BLOCK(`PRE-SRC-BASIS-MISMATCH-002`).
- **데이터 결함이며 오탐 아님** — Guard 는 정상 동작. 교정 대상은 원문 데이터.

## 4. 판정 — 제품 단위 normalization (그룹 재분류 불필요)

| 항목 | 판정 |
|------|------|
| 결함 유형 | 원문 basis 오기 **1 필드**(칼슘 라인 basis) |
| 교정 단위 | **제품 단위 source normalization** |
| 그룹 재분류 | **불필요** — 원료구성 `{칼슘, 마그네슘, 아연, 비타민D, 비타민K}` = `mg+vd+vk+zn+ca`(N5) 그룹과 정확 일치 |
| 값 오염 | 없음 — 표시량 값(칼슘 300mg) 정상, basis 만 오기 |

## 5. 기존 LIVE 영향 — 0

- 본 제품은 #11 배치(15건 LIVE)에서 **BLOCK 으로 제외**돼 미게시. 게시된 LIVE 어디에도 오기 basis 미포함.
- 나머지 15건은 정상 basis(각 제품 고유값) 사용 — 상호 오염 0.
- **교정 후 예상 신규 LIVE = +1** (이 1건만 재생성·추가).

## 6. 교정안 (승인 후 · apply 미실행)

```text
1. stmt 2020000997275 전용 source-normalization 오버라이드
   - 칼슘 라인 basis "1,1500mg" → "1,500mg" (해당 stmt·해당 원료 한정)
   - 근거: 동일 문서 4개 sibling 원료 basis + 섭취기준 = 1,500mg 교차확인 (본 CHECK §2)
2. hff-combo-select (mg+vd+vk+zn+ca) 재실행 → ELIGIBLE 16
3. hff-combo-generate 1건 target → PASS 예상
4. dry-run(예상=실측) → 독립검증(canonicalDup 0 · 기존 LIVE 무변경) → apply COMMIT
5. tag: batch:single-nutrient-mg-vd-vk-zn-ca (기존 #11 배치와 동일 태그)
```

### 리스크
- **낮음**. 단건. 신규 basis 아님(`1,500mg` 은 동일 그룹 15건이 이미 사용 중인 값). 신규 원료/제형/Guard 0.

---

*read-only · DB write 0 · generate/dry-run/apply 미실행. 교정은 승인·이중게이트 후.*
