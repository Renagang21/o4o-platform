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

## 7. 교정 실행 기록 (Agent B · 2026-07-20 · COMMIT LIVE)

§6 교정안을 승인·이중게이트 후 실행 완료. **DB write 4 · COMMIT.**

| 단계 | 스크립트 | 실측 |
|------|----------|------|
| 1. normalization | `hff-11-ca-basis-normalize.ts` (source-level, DB write 0) | 칼슘 라인 `1,1500mg→1,500mg` 단일 치환. 가드: `1,1500` 전체 1회·칼슘 라인 한정 / 교정후 `1,500mg` 5회 / BASE_STANDARD 외 필드 불변 |
| 2. select 재실행 | `hff-combo-select` (`--source file`, corrected 단일 stmt) | ELIGIBLE **1** · HOLD 0. 5원료 basis 전부 1500(칼슘 300/1500mg) |
| 3. target 고정 | — | **1건** (stmt 2020000997275) |
| 4. generate·Guard | `hff-combo-generate` | PASS **1** · REVIEW 0 · BLOCKED 0 · G-MULTI 0. `PRE-SRC-BASIS-MISMATCH-002` 해소. 초안 오기 문자열 0 |
| 5. dry-run | `hff-nutrient-store-canonical-apply` (slug `mg-vd-vk-zn-ca`) | postVerifyPass ✓ · 예상=실측 4 · canonicalDup 0 |
| 6. ROLLBACK | — | dry-run DB write 0 |
| 7. COMMIT | `--apply` (이중게이트 `HFF_NUTRIENT_APPLY_CONFIRM=YES`) | **완료** — ProductMaster 1 · candidate UPDATE 1 · STORE SPD ko 1 · en 1 = **4** |

### 독립 사후검증 (`hff-11-ca-postverify.ts` · fresh read)
- ProductMaster `6c0e9b59-b7a7-4ebf-8a62-5e3a41d084a3` · ACTIVE · `건강기능식품` · mfds_permit `2020000997275` · tag `batch:single-nutrient-mg-vd-vk-zn-ca`
- STORE SPD ko/en 둘 다 `canonical`·`o4o_hff_generated` · **has_typo=false** · **칼슘 basis 300mg/1500mg OK**
- candidate `pending → approved_new_master` (matched)
- **#11 그룹 masters 15 → 16 · 복합형 LIVE 572 → 573 · 기존 LIVE 무영향**

리스크 판정(§6 "낮음") 그대로 실현 — 신규 basis/원료/제형/Guard 0, 단건.

---

*조사(§1~6) read-only. §7 교정은 승인·이중게이트(dry-run→독립검증) 후 COMMIT 실행 완료.*
