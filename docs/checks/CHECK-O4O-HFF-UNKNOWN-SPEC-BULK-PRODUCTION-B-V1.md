# CHECK-O4O-HFF-UNKNOWN-SPEC-BULK-PRODUCTION-B-V1

> WO: **WO-O4O-HFF-UNKNOWN-SPEC-BULK-PRODUCTION-B-V1** (에이전트 나 / Agent B)
> 대상: 규격 미해석(`UNKNOWN_SPEC_LABEL` · `noSpec`) HFF 후보 중 STORE canonical 미보유 · shard `stableHash(STTEMNT_NO) % 3 = 1`
> 상태: **완료 — 안전 후보 소진** · 신규 LIVE **634** · DB write **2,536** · 독립검증 **PASS**

---

## 1. 핵심 발견 — 미해석의 지배적 원인은 원료가 아니라 **비율 표기 변형**이었다

직전 라운드(`CHECK-O4O-HFF-NOBRACKET-BULK-PRODUCTION-B-V1` §5)는 `unknownLabel` 을 "성분 집합 불완전 → 회수 불가" 로 판정했다. 본 라운드에서 **미해석 원인을 라벨 단위로 분리 계측**한 결과, 그 판정은 원인의 절반만 본 것이었다.

공용 `hff-source-parse.ts` 의 `SPEC_RE` 는 비율 tail 을 `X~Y%` 와 `이상` 두 형태만 인정한다. 실측 상위 미해석 라인은 **값·단위·기준량이 모두 명확한데 비율 표기만 다른** 경우였다.

| 표기 | 공용 파서 | 의미 |
|---|:---:|---|
| `아연 : 표시량(12 mg/1,000 mg)의 80~150%` | 인식 | 기준 |
| `... 의 80%~150%` | **미인식** | 동일 |
| `... 의 80% 이상 150% 이하` | **미인식** | 동일 |
| `... 의 80～120%` (전각 물결 U+FF5E·U+301C) | **미인식** | 동일 |

라벨 매핑 결함은 단 1건이었다. 공용 `classify` 의 철 정규식은 `/철분|헴철|철\s*[:：(]|.../` 라서 **콜론이 이미 소비된 bare `철` 라벨에 매치되지 않는다**(명백한 false negative, shard1 라인 432건).

`specReFail` 실측 상위(라벨은 분류되나 SPEC_RE 미캡처): 아연 696 · 비타민D 487 · 비타민B6 481 · 비타민B1 426 · 비타민B2 412 · 비타민E 363 · 셀레늄 342 · 나이아신 336 · 비타민C 298 · 판토텐산 283 …

---

## 2. 처리 방식 — B 전용 additive resolver (공용 파서 무수정)

WO 제약("공용 parser를 수정하지 않는다 / B 전용 mapping으로 **명백한 동일 표현만** 처리한다")에 따라 신규 B 소유 모듈을 만들었다.

### `hff-spec-b-resolve.ts` (B 신규)

- 비율 tail 을 **동의 표기 3종**으로 확장(`X%~Y%` · `X% 이상 Y% 이하` · 전각 물결). 값·단위·기준량은 원문에서 그대로 캡처한다.
- 라벨 보완 1건: `철` / `철(Fe)` → canonical `철`. **신규 원료는 추가하지 않았다.**
- 안전망은 공용보다 **강화**: 기준량 단위가 `mL|L|㎖` 인 라인(액상)도 미해석 라벨로 올려 부분 파싱 상태로 생산에 들어가지 않게 한다.

### `hff-combo-b-select.ts` (B 신규)

공용 `hff-combo-select.ts` 는 내부에서 `parseSpecs` 를 직접 호출하므로 B 해석을 주입할 지점이 없다. 따라서 **게이트 체인·seed 계약을 그대로 복제한 B 소유 사본**을 만들고 `extractSpecs` 한 곳만 `parseSpecsB` 로 교체했다. 공용 파일은 한 줄도 수정하지 않았다.

| 단계 | 스크립트 | 소유 | DB |
|---|---|---|---|
| 원인 분리 계측 | `hff-unknown-b-census.ts` | **B 신규** | read-only |
| 재해석 플랜 | `hff-unknown-b-plan.ts` | **B 신규** | read-only |
| spec resolver | `hff-spec-b-resolve.ts` | **B 신규** | — |
| 선정 | `hff-combo-b-select.ts` | **B 신규**(공용 사본 + seam 1) | read-only |
| 생성 KO/EN | `hff-combo-generate.ts` | 공용(무편집) | write 0 |
| 적재 | `hff-combo-b-apply.ts` → `hff-sf-apply.ts` | B(무편집) / 공용(무편집) | 이중게이트 |
| 독립검증 | `hff-combo-b-verify.ts` | B(무편집) | read-only |

라운드 네임스페이스: `batch:unknown-b-<slug>` · rollback manifest `hff-unknown-b-<i>`.

---

## 3. 해석 신뢰성 게이트 (플랜 단계)

플랜은 다음 중 하나라도 걸리면 **제품 전체를 제외**한다.

| 게이트 | 취지 | 실측 |
|---|---|---:|
| `publicAlreadyOk` | 공용 파서가 이미 완전 해석 → 선행 라운드 대상 | 1,693 (범위 밖) |
| `stillNoSpec` | B 해석 후에도 규격 라인 0 → 근거 부재 | 4,873 |
| `stillUnknown` | 미해석 규격 라인 잔존 → 성분 집합 불완전 | 1,820 |
| `conflict` | 공용 해석분과 값·단위·기준량 불일치 | **3** |
| `noMeta` | registry 미등록 원료 | 0 |

`conflict` 3건은 한 `BASE_STANDARD` 안에 `베타카로틴` 과 `비타민A` 라인이 함께 있거나 제형별 규격 블록이 둘인 제품이었다(예: 비타민D `50μg/1100mg` vs `3μg/1100mg`). 어느 값이 정본인지 판정할 수 없으므로 **전량 제외**했다.

플랜 결과: **1,247 제품 / 592 signature** 회수.

---

## 4. 생산 결과

식이섬유 계열 9 그룹 / 25 제품은 [`CHECK-O4O-HFF-COMBO-COMPLETION-B-GUT-METABOLIC-V1` §10-1] 의 **PENDING_SHARED** 판정을 유지해 사전 제외했다(`plan-fiber-pending.json`).

| 항목 | 값 |
|---|---:|
| sweep 그룹 | 583 |
| 커버 제품 | 1,222 |
| 게이트 통과(target) | **647** |
| A 도메인(MSM 조합) 제외 | 13 (8 그룹) |
| dry-run 통과 signature | **330 / 330** |
| **apply COMMIT 제품** | **634** |
| **DB write** | **2,536** (= 634 × 4) |
| gateFail | **0** |

제품당 write 4 = master INSERT + candidate UPDATE(`matched_product_master_id`, `candidate_status='approved_new_master'`) + SPD ko INSERT + SPD en INSERT.

### HOLD 상위 원인

| 단계 | 코드 | 건수 |
|---|---|---:|
| select | `HOLD_GROUNDING` | 463 |
| select | `HOLD_UNSUPPORTED_DIMENSION` (액상·mL·겔) | 78 |
| generate | `HOLD_MULTI_GUARD` | 22 |
| select | `BULK` | 9 |
| select | `HOLD_IDENTITY` | 3 |
| apply | A 도메인 조합 제외 | 13 |

전부 **정당 차단**이다. `HOLD_GROUNDING` 최다 원인은 직전 라운드와 동일하게 프로바이오틱스 균수 `표시량 이상`(정량 불가)과 기능성 귀속 실패이며, 생산하면 공식 기능성 누락·오귀속이 발생한다.

---

## 5. 잔존 미해석의 성격 — 라벨 아티팩트가 아니라 실재 미등록 원료

`stillUnknown` 1,820 중 미해석 라벨이 전부 형태 잡음(`)`, `g)`, `최종제품`)뿐인 제품 **56건**을 별도 표본 조사했다. 잡음은 `감마-오리자놀 (mg/g)` · `공액리놀레산(...)(%)` 처럼 **단위 수식 괄호가 붙은 라벨**의 꼬리였고, 해당 라인은 전부 registry 미등록 **실재 기능성 원료**였다.

```
감마-오리자놀 (mg/g) : 표시량(4.4 mg / 4,000 mg)의 80~120%
Veratric acid(mg/g) : 표시량(8.46mg/1800mg)의 80~120%
락토페린(mg/g) : 표시량(54 mg/2000mg)의 80~120%
```

→ 이 제품들을 생산하면 **해당 원료의 공식 기능성이 누락**된다. HOLD 유지가 정답이며, 해소에는 registry 신규 원료 등재(공용 자산, Agent C 소유)가 선행되어야 한다.

`stillUnknown` 상위 라벨: 코로솔산 138 · Rg3의 합 93 · 로르산 75 · 식이섬유 55 · 모나콜린 K 47 · 히알루론산 46 · 아스타잔틴 41 · 폴리감마글루탐산 32 · 로사빈 32 · 포스파티딜세린 31 — 전부 registry 미등록 원료다.

---

## 6. 독립검증 (manifest tag 기준)

`hff-combo-b-verify.ts` · `HFF_COMBO_B_VERIFY_TAG='batch:unknown-b-%'`

| 항목 | 값 |
|---|---:|
| myMasters | 634 |
| myKo | 634 |
| myEn | 634 |
| candidatesLinked | 634 |
| canonicalDup | **0** |
| permitDup (statementNo 중복) | **0** |
| crossPermitWithOthers | **0** |
| barcodeNonNull | **0** |
| wrongRegType | **0** |
| wrongSourceType | **0** |
| **PASS** | **true** |

### 기존 LIVE drift

최근 10시간 변경 행을 `created_at` 기준으로 **신규 INSERT / 기존행 수정**으로 분리했다.

| 대상 | 신규 INSERT | 기존행 수정 |
|---|---:|---:|
| 내 태그 SPD | 1,268 (= 634 × 2) | **0** |
| 타 산출 SPD | 7,804 | 2,283 (전량 `mfds_easy_drug`) |
| 타 산출 master | 1,619 | **0** |

기존행 수정 2,283 은 전량 `source_type='mfds_easy_drug'` — 동시 진행 중인 **OTC 트랙(타 에이전트)** 의 authored canonical 교체이며 HFF 와 무관하다.

→ **본 라운드로 인한 기존 LIVE 변경 = 0.**

---

## 7. 잔여 (shard1)

| 구분 | 건수 |
|---|---:|
| 규격 미해석 계열 잔여 | **7,309** |
| ├ `stillNoSpec` (규격 라인 자체 없음 = 근거 부재) | 4,873 |
| ├ `stillUnknown` (registry 미등록 실재 원료 — §5) | 1,820 |
| ├ select/generate 정당 HOLD | 575 |
| ├ 식이섬유 PENDING_SHARED | 25 |
| ├ A 도메인 조합 | 13 |
| └ 해석 conflict (§3) | 3 |

전부 **근거 부족 · 원료 미지원 · 귀속 불가 · 타 도메인**으로 안전 생산 대상이 아니다. shard1 규격 미해석 후보의 **안전 후보는 소진**되었다.

재개 조건: registry 신규 원료 등재(공용, Agent C 소유) 또는 식이섬유 파서 확장.

---

## 8. 중지 조건 점검

| 조건 | 결과 |
|---|---|
| ProductMaster 대량 오연결 | 없음 (candidatesLinked 634 = myMasters 634) |
| 기능성의 체계적 오귀속·누락 | 없음 (귀속 실패·미등록 원료는 전건 HOLD) |
| canonical·rollback 실패 | 없음 (canonicalDup 0 · rollback manifest 330건) |
| write 불일치 | 없음 (expected 2,536 = actual 2,536) |
| 기존 LIVE 대량 변경 | 없음 (0) |
| 독립검증 실패 | 없음 (PASS) |
| 타 에이전트 영역 침범 | 없음 (shard 격리 + A 도메인 13건 제외 + 공용 파일 무수정) |

전체 중지 조건 미발동. 개별 실패는 HOLD 후 계속 진행했다.

---

## 9. 콘텐츠 원칙 준수

- 수치·단위를 **추정하지 않았다**. 회수한 것은 비율의 **표기 형태**뿐이며 값·단위·기준량은 원문 그대로다.
- 총 내용량을 기능성 원료량으로 사용하지 않았다(기준량은 원문 `표시량(값/기준량)` 의 기준량 그대로).
- 표시량이 불명확하거나 미해석 라인이 남은 제품은 개별 HOLD 했다.
- 공식 기능성 문구를 삭제·순화하지 않았고, 원문 밖 치료·예방 주장을 추가하지 않았다.
- 전문가 상담 footer 를 KO·EN 양쪽에 유지했다.
