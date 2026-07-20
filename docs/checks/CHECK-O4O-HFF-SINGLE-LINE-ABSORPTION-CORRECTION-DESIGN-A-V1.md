# CHECK — HFF 단일형 다중원료 흡수 교정 설계 (Agent A) V1

- 기준: `CHECK-O4O-HFF-SINGLE-LINE-MULTI-INGREDIENT-ABSORPTION-PLATFORM-AUDIT-A-V1` (commit `1f55b943e`) 추정 224건을 **제품별 검증 가능한 교정 큐**로 확정.
- 상위 WO: `WO-O4O-HFF-SINGLE-NUTRIENT-MULTI-INGREDIENT-MISCLASSIFICATION-AUDIT-AND-LUTEIN-CORRECTION-V1` §3(교정 설계).
- 성격: **read-only 설계 · DB write 0 · canonical 변경 0 · 부분 apply 0**. 교정 실행은 승인·이중게이트 후 별도.
- 큐 산출물: [`data/product-description-guard/hff-single-line-absorption-correction-queue.json`](data/product-description-guard/hff-single-line-absorption-correction-queue.json) — 제품별 `baseSpecSet / mainFnctnAttributed / verifiedFullSet / category / action / registryReady` 259행.

---

## 1. 검증 방법 (제품별 교차검증)

각 단일형 LIVE 제품에 대해:
1. **BASE_STANDARD** → 기능성 표시량 spec 집합(강건 파서: 표시량 접두 누락·선행 괄호·공백 라벨 포함).
2. **MAIN_FNCTN** → 기능성 원료 귀속 집합(브래킷 `[원료]`+기능성 동사 / 인라인 원료명+동사). registry `fnBelongsTo` 원리.
3. **verifiedFullSet = BASE spec ∩ MAIN_FNCTN 귀속** — 표시량+등록 기능성 **양쪽** 있는 원료만 = 재분류할 실제 조합.

→ BASE 에만 있고 MAIN_FNCTN 기능성 없음 = **부원료**(예: 항산화 비타민E, 비기능성 크롬) → full-set 에서 제외.

## 2. 분리 결과 — A확정 / C미확정 / benign

**총 ≥2 spec 흡수 의심 259** (기능성 라인 258 + single-Zn 1):

| 범주 | 정의 | 건수 | action |
|------|------|:-:|------|
| **A. CONFIRMED** | 모든 부가 원료가 MAIN_FNCTN 등록 기능성 보유 → verifiedFullSet 확정 | **155** | **RETIRE_REPLACE** |
| **C. REVIEW** | BASE 부가 spec 존재하나 MAIN_FNCTN 귀속 불완전 → 제품별 수동검증 | **81** | **REVIEW** |
| **B. BENIGN** | 부가=비타민E뿐·MAIN_FNCTN E 기능성 없음 → 항산화 부원료 | **23** | **KEEP_SINGLE** |

- 확정 교정 수 = **155** · 미확정(검토) = **81** · benign(제외) = **23**.
- 라인별:

```text
                A확정  C검토  B제외
single-루테인      53    24    2
single-가르시니아   23    19    0
single-코엔자임Q10  13    12    3
single-녹차        11    11    0
single-오메가3      17     3   11
single-감마리놀렌산 20     0    6
single-밀크씨슬      2     6    0
single-프로폴리스     6     1    0
single-테아닌        3     2    0
single-옥타코사놀     4     0    0
single-은행잎        2     2    1
single-MSM          1     0    0
single-아연          0     1    0   ← Zn+Se+Cr, 크롬 비기능성→verified {아연,셀레늄}
```

## 3. 그룹별 재분류 (verifiedFullSet, A확정 155)

교정 실행 시 각 제품은 verifiedFullSet 조합으로 재게시. **registry 준비 여부로 2분**:

### 3-1. registry-READY (레지스트리 무변경 즉시 combo 가능) = 51

```text
{루테인+비타민E}                     15
{루테인+비타민A}                     10   ← 원 lut-va 정확 조합
{비타민E+코엔자임Q10}                 9
{루테인+비타민A+비타민E}              6
{비타민E+옥타코사놀}                  2
{밀크씨슬+셀레늄}                     2
{셀레늄+코엔자임Q10} / {엽산+코엔자임Q10} 각1
{MSM+비타민E}                        1
+ 루테인·밀크씨슬 다원료 소그룹        4
```

### 3-2. registry-EXTENSION 필요 = 104

`INGREDIENT_FN` 미등재 기능성 원료 포함 → **레지스트리 확장이 선행조건**:

```text
{가르시니아+식이섬유}  18   {감마리놀렌산+비타민E} 18   {비타민E+오메가3}     17
{루테인+오메가3}       12   {녹차+식이섬유}        10   {가르시니아+셀레늄}    4
{루테인+비타민E+오메가3} 4   {비타민B6+테아닌}       3   {아연+프로폴리스}      2
... (오메가3/GLA/가르시니아/녹차/프로폴리스/은행잎/테아닌 관련)
```

- **미등재 원료 7종**: `가르시니아·오메가3·녹차·감마리놀렌산·프로폴리스·은행잎·테아닌` → INGREDIENT_FN ko 기능성 배열 추가 필요. (en 매핑은 `mapFunctionEn` COMPONENT 에 대부분 존재 — 체지방감소·혈중중성지질·혈행·간건강·황반색소·구강항균·긴장완화 등.)

## 4. 기존 단일 SPD 유지·은퇴·대체 기준

| 기준 | 대상 | 처리 |
|------|------|------|
| **KEEP (유지)** | B_BENIGN 23 + verifiedFullSet=={own} 전건 | 단일 SPD 가 유일 등록 기능성 정확 표현 → 무변경 |
| **RETIRE+REPLACE (은퇴·대체)** | A_CONFIRMED 155 | 기존 단일 STORE SPD(canonical) → 은퇴(status canonical→아카이브 or deleted_at) + verifiedFullSet combo STORE SPD(ko+en) 신규 canonical. **master_id 불변** |
| **REVIEW (판정)** | C_REVIEW 81 | 제품별 MAIN_FNCTN 등록 기능성 확인 → 2기능성 확정 시 RETIRE+REPLACE, 부원료면 KEEP |

- **canonical 키 = (master_id, description_type='STORE', language)** — 대체는 **동일 master** 의 canonical 콘텐츠 교체. 신규 master 생성 아님.
- 이중 canonical 금지: 교정 트랜잭션 내 은퇴→신규를 원자적으로, postVerify `canonicalDup=0` 필수.

## 5. QR / source_ref_id / rollback 영향

| 항목 | 스키마 사실 | 영향 |
|------|-----------|------|
| **QR** | F12 불변식 ④ **QR 비저장·동적생성**. `/r/{resourceId}` → resource(master 앵커) → 현재 canonical SPD 해석 | master_id 불변 + resolver 가 현재 canonical 선택 → **교정 콘텐츠 자동 반영, QR 변경 0·데드링크 0** |
| **source_ref_id** | `shared_product_descriptions.source_ref_id` = 원천 `product_candidate.id`(제품 동일) | 동일 candidate 유지 → 보존. 검증 `spdRefLinked = EXPECT×2`(ko+en) 유지 |
| **candidate** | 흡수 제품은 이미 `candidate_status='approved_new_master'`·master 매칭됨 | 교정 시 재매칭 불요(기존 링크 유지) |
| **rollback** | apply 계약 = 단일 트랜잭션 dry-run→postVerify→ROLLBACK / COMMIT | 은퇴+신규를 한 트랜잭션. postVerify 실패 시 전체 롤백(기존 단일 SPD 원복) |

### 선행조건 — 교정 전용 apply 스크립트 필요
- 현 `hff-nutrient-store-canonical-apply` 는 **신규 master INSERT 흐름**(가드 `canonicalSpdDup=0`, candidate `pending→approved_new_master`). 흡수 교정은 **기존 master 의 canonical 대체**(기존 canonical 1건 은퇴 전제, candidate 이미 matched)라 **계약이 반대**.
- → `hff-absorption-correction-apply`(가칭) 신규 필요: 기존 canonical 은퇴 + 신규 combo SPD, master 불변, canonicalDup=0 postVerify, 이중게이트. **본 설계 범위 = 정의만, 구현·apply 미실행.**

## 6. 라인별 교정 우선순위

```text
1. single-lutein   registry-READY 31 (루테인+비타민A 10 · 루테인+비타민E 15 · 3원료 6)
                   → 원 WO 정확 대상, 신규 원료/레지스트리 0, 파일럿 최적
2. single-Q10      registry-READY (비타민E+Q10 9 + 소그룹) — 레지스트리 무변경
3. [레지스트리 확장 후] single-garcinia (가르시니아+식이섬유 18 등 23)
4. [확장 후] single-green-tea (녹차+식이섬유 10 등 11)
5. [확장 후] single-omega3 / GLA (A 37, benign 17 제외)
6. single-Zn 1건   → verified {아연,셀레늄} (크롬 비기능성 제외) 재분류, 단건
C 검토 81 · benign 23 는 별도 트랙(수동검증 / 무변경)
```

## 7. 권장 첫 교정 배치

```text
배치: single-lutein registry-READY 31건
  · 그룹: {루테인+비타민A} 10 + {루테인+비타민E} 15 + {루테인+비타민A+비타민E} 6
  · 선정 사유:
    - 원 lutein-correction WO 정확 대상(lut-va 포함)
    - 전 원료(루테인·비타민A·비타민E) INGREDIENT_FN 등재 → 레지스트리 변경 0
    - 신규 원료/제형/basis 0
    - RETIRE+REPLACE apply 계약을 소규모로 검증(파일럿) 후 확장
  · 선행: hff-absorption-correction-apply 구현 + 이중게이트
  · 검증: verifiedFullSet=BASE spec 전건 재확인 → generate PASS → dry-run(canonicalDup 0) → 독립검증 → COMMIT
제외: benign 23(E 항산화) 오교정 금지 · C 81 수동검증 선행 · registry-EXTENSION 104 확장 선행
```

## 8. 보고 요약

```text
확정 교정(A):     155  (registry-READY 51 / EXTENSION 필요 104)
미확정(C 검토):    81  (제품별 MAIN_FNCTN 수동검증)
benign(B 제외):    23  (비타민E 항산화 — 오교정 금지)
그룹별 재분류:     verifiedFullSet 큐(259행 산출물) — 최다 가르시니아+식이섬유18·GLA+E18·오메가3+E17·루테인+E15·루테인+A10·녹차+식이섬유10
기존 LIVE 대체 범위: A 155 RETIRE+REPLACE(동일 master canonical 교체) + C 확정분
QR/source_ref/rollback: QR 무영향(동적·master앵커) · source_ref_id 보존 · 단일TX 롤백. 교정전용 apply 스크립트 선행 필요
권장 첫 배치:      single-lutein registry-READY 31 (레지스트리 무변경 파일럿)
선행조건:          ① 교정전용 apply(기존 canonical 은퇴+대체) ② INGREDIENT_FN 7원료 확장(가르시니아·오메가3·녹차·GLA·프로폴리스·은행잎·테아닌)
금지 준수:         DB write 0 · canonical 변경 0 · 부분 apply 0
```

---

*read-only 설계 · DB write 0 · canonical 변경 0 · 부분 apply 0. 교정 실행은 승인·이중게이트 후 상위 OPEN WO 하에서.*
