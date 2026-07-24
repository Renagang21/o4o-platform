# CHECK-O4O-HFF-NOBRACKET-BULK-PRODUCTION-B-V1

> WO: **WO-O4O-HFF-NOBRACKET-BULK-PRODUCTION-B-V1** (에이전트 나 / Agent B)
> 대상: `noBracket` HFF 후보 중 STORE canonical 설명서 미보유 · shard `stableHash(STTEMNT_NO) % 3 = 1`
> 상태: **완료 — 안전 후보 소진** · 신규 LIVE **265** · DB write **1,060** · 독립검증 **PASS**

---

## 1. 핵심 발견 — noBracket ≠ 원료 정보 부재

`noBracket` 은 `MAIN_FNCTN` 에 `[원료]` 라벨 매치가 0인 후보를 말한다(census 정의, `hff-shard0-remainder-census.ts` 와 동일 기준).

조사 결과 **원료 정체와 표시량은 `raw_payload->'source'->>'BASE_STANDARD'` 에 공용 `parseSpecs` 가 파싱 가능한 형식 그대로 존재**한다.

```
BASE_STANDARD = ... 2. 비타민A : 표시량(700㎍RE/6000㎎)의 80~150% 3. 비타민D : 표시량(10㎍/6000㎎)의 80~180% ...
```

따라서 noBracket 후보는 **공용 composer·Guard·apply 를 무편집 재사용**하여 생산할 수 있다. 본 라운드는 공용 파일을 한 줄도 수정하지 않았다.

`RAWMTRL_NM` 은 이 데이터셋에 존재하지 않는다(`source` 키 = ENTRPS · PRDUCT · SRV_USE · DISTB_PD · PRSRV_PD · SUNGSANG · REGIST_DT · MAIN_FNCTN · STTEMNT_NO · INTAKE_HINT1 · BASE_STANDARD).

---

## 2. 파이프라인 (신규 = 플래닝 2개, 생산은 전량 공용 재사용)

| 단계 | 스크립트 | 소유 | DB |
|---|---|---|---|
| census | `hff-nobracket-b-census.ts` | **B 신규** | read-only |
| 플랜(원료 signature 추출) | `hff-nobracket-b-plan.ts` | **B 신규** | read-only |
| 선정 | `hff-combo-select.ts` (`--combo` + `--statement-nos-file` + `--exclude-taken`) | 공용(무편집) | read-only |
| 생성 KO/EN | `hff-combo-generate.ts` | 공용(무편집) | write 0 |
| 적재 | `hff-combo-b-apply.ts` → `hff-sf-apply.ts` | B(무편집) / 공용(무편집) | 이중게이트 |
| 독립검증 | `hff-combo-b-verify.ts` | B(무편집) | read-only |

플랜은 `parseSpecs(BASE_STANDARD).byKey` 의 키 집합을 정렬해 signature 로 만들고, signature 별 **shard 1 한정 statementNo 목록**을 파일로 떨어뜨린다. 공용 select 가 이 파일을 직접 소비하므로 **lane 격리가 구조적으로 보장**된다(제품은 단 하나의 shard 에만 속함).

라운드 네임스페이스: `batch:nobracket-b-<sig>` · rollback manifest `hff-nobracket-b-<i>`.

---

## 3. 후보 규모

```
shard=1 scanned=41,261 · inShard=13,751 · unpromoted=9,901 · notTaken=9,901 · noBracket=6,187
```

플랜 변환 결과:

| 구분 | 건수 | 처리 |
|---|---:|---|
| signature 확보(생산 대상) | **1,181** (384 그룹) | 생산 시도 |
| ├ 식이섬유 계열 | 85 (10 그룹) | **PENDING_SHARED 제외** (§6) |
| └ 실행 대상 | **1,096** (374 그룹) | sweep |
| `noSpec` (BASE_STANDARD spec 0건) | 4,019 | 근거 부재 → 생산 불가 |
| `unknownLabel` (미파싱 규격 라인 존재) | 987 | 성분 집합 불완전 → §5 실증 후 제외 |
| `noMeta` | 0 | — |

---

## 4. 생산 결과 (1라운드)

| 항목 | 값 |
|---|---:|
| sweep 그룹 | 374 |
| 커버 제품 | 1,096 |
| 게이트 통과(target) | 267 |
| A 도메인(MSM 조합) 제외 | 2 |
| **dry-run 통과 signature** | **45 / 45** |
| **apply COMMIT 제품** | **265** |
| **DB write** | **1,060** (= 265 × 4) |
| gateFail | **0** |

제품당 write 4 = master INSERT + candidate UPDATE(`matched_product_master_id`, `candidate_status='approved_new_master'`) + SPD ko INSERT + SPD en INSERT.

상위 signature: 비타민C 98 · 오메가3 44 · 가르시니아 40 · 비타민A 7 · 판토텐산 6 · 비타민D 5 · 칼슘 5 · 은행잎 5 · 테아닌 3 · 비타민E 3 (이하 1~2건 다수).

### HOLD 상위 원인 (1라운드)

| 단계 | 코드 | 건수 |
|---|---|---:|
| select | `HOLD_GROUNDING` | 694 |
| select | `HOLD_UNSUPPORTED_DIMENSION` (액상·mL·겔) | 72 |
| select | `BULK` | 24 |
| select | `HOLD_IDENTITY` | 22 |
| generate | `HOLD_MULTI_GUARD` | 14 |
| generate | `HOLD_GUARD_BLOCKED` | 3 |

`HOLD_GROUNDING` 세부 원인 상위:

- **프로바이오틱스 기능성 미귀속** — `BASE_STANDARD` 의 균수가 `표시량 이상`(정량 불가)이라 signature 에 포함되지 않는데 `MAIN_FNCTN` 에는 "유산균 증식 및 유해균 억제·배변활동 원활·장 건강" 이 존재. 성분 집합이 불완전한 상태이므로 **차단이 정당**하다(생산하면 공식 기능성 누락 또는 오귀속).
- **원료 기능성 귀속/매핑 실패**(inline 폴백 실패) 134 — 귀속 모호 → 개별 HOLD.

→ **공용 파서 보완 대상 아님. Guard/gate 의 정당 차단으로 판정하고 유지한다.**

---

## 5. 2라운드 — `unknownLabel` 987 실증 (신규 LIVE 0)

`unknownLabel` 상위가 `철` 106 등 100건을 넘어, WO 의 "같은 원인 100건 이상일 때만 최소 보완 검토" 조항에 따라 **실증 조사**를 수행했다.

공용 파서는 수정하지 않고, **B 소유 플랜의 사전 게이트만 `ALLOW_UNKNOWN=1` 로 완화**하여 공용 select 가 직접 판정하도록 했다.

```
PLAN shard=1 noBracket=5,922 groups=787 covered=1,903 · reject {noSpec:4019, unknownLabel:0, unknownLabelKept:987}
sweep 773 그룹 / 1,810 제품 → PASS 2
```

결과: 공용 select 가 `HOLD_MULTI_FUNCTIONAL` **979** 로 재차단했다. 즉 플랜의 사전 제외와 공용 게이트의 판정이 일치하며, **회수 가능한 안전 후보는 없다.**

PASS 2 건은 `MSM+아연` · `MSM+비타민D+칼슘` 으로 **A 도메인(관절) 전용 조합**이라 `hff-combo-b-apply.ts` 의 도메인 필터가 제외했다. → **2라운드 신규 LIVE 0 · DB write 0.**

---

## 6. 식이섬유 계열 — PENDING_SHARED 유지

직전 라운드(`CHECK-O4O-HFF-COMBO-COMPLETION-B-GUT-METABOLIC-V1` §10-1)에서 **식이섬유 combo family = PENDING_SHARED** 로 확정했다. generic `식이섬유` 라벨이 상이한 원료를 가리켜 `parseSpecs` 단일 키로 붕괴하며, 원료 귀속이 성립하지 않는다. 해소에는 Agent C 소유 공용 파서 확장이 필요하다.

본 WO 는 "공용 parser·registry 의 대규모 재설계는 하지 않는다" 를 명시하므로, 해당 10 그룹 / 85 제품을 **사전 제외**하고 `plan-fiber-pending.json` 으로 분리 보존했다.

---

## 7. 독립검증 (manifest ID 기준)

`hff-combo-b-verify.ts` · `HFF_COMBO_B_VERIFY_TAG='batch:nobracket-b-%'`

| 항목 | 값 |
|---|---:|
| myMasters | 265 |
| myKo | 265 |
| myEn | 265 |
| candidatesLinked | 265 |
| canonicalDup | **0** |
| permitDup (statementNo 중복) | **0** |
| crossPermitWithOthers | **0** |
| barcodeNonNull | **0** |
| wrongRegType | **0** |
| wrongSourceType | **0** |
| **PASS** | **true** |

### 기존 LIVE drift

최근 2시간 내 변경된 타 세션 행을 INSERT / 기존행 수정으로 분리 검사했다.

| 대상 | 신규 INSERT | 기존행 수정 |
|---|---:|---:|
| SPD (내 태그 제외) | 1,378 | 183 |
| master (내 태그 제외) | 506 | 0 |

기존행 수정 183 건은 전량 `source_type='mfds_easy_drug'` — 동시 진행 중인 **OTC 트랙(타 에이전트)** 의 authored canonical 교체이며 HFF 와 무관하다.

→ **본 라운드로 인한 기존 LIVE 변경 = 0.**

---

## 8. 잔여

| 구분 | 건수 |
|---|---:|
| shard1 noBracket 잔여 | **5,922** |
| ├ `noSpec` (근거 부재) | 4,019 |
| ├ `unknownLabel` (성분 집합 불완전, §5 실증) | 987 |
| ├ select/generate 정당 HOLD | 831 |
| └ 식이섬유 PENDING_SHARED | 85 |

전부 **근거 부족 또는 귀속 불가**로 안전 생산 대상이 아니다. shard1 noBracket 의 **안전 후보는 소진**되었다.

식이섬유 85 건은 공용 파서(Agent C 소유) 확장이 선행되어야 재개할 수 있다.

---

## 9. 중지 조건 점검

| 조건 | 결과 |
|---|---|
| ProductMaster 대량 오연결 | 없음 (candidatesLinked 265 = myMasters 265) |
| 기능성의 체계적 오귀속·누락 | 없음 (귀속 실패는 전건 HOLD 처리) |
| canonical·rollback 실패 | 없음 (canonicalDup 0 · rollback manifest 45건 생성) |
| write 불일치 | 없음 (expected 1,060 = actual 1,060) |
| 기존 LIVE 대량 변경 | 없음 (0) |
| 독립검증 실패 | 없음 (PASS) |
| 타 에이전트 영역 침범 | 없음 (shard 격리 + A 도메인 조합 4건 제외) |

전체 중지 조건 미발동. 개별 실패는 HOLD 후 계속 진행했다.

---

## 10. 콘텐츠 원칙 준수

- 공식 기능성 문구를 삭제·순화하지 않았다(원료별 공식 인정 기능성 그대로 표기).
- 원문 밖 치료·예방 주장을 추가하지 않았다.
- 전문가 상담 footer 를 KO·EN 양쪽에 유지했다.
- 근거(BASE_STANDARD 표시량·SRV_USE 섭취방법)가 불명확한 제품은 생산하지 않고 HOLD 했다.
