# CHECK-O4O-HFF-KO-LAST-6-AUTHORITY-DECISION-AND-CLOSURE-V1

최종 수동 판정 6건 전수 처리 · **한국어 비번역 생산 트랙 종료**

- 근거 WO: `WO-O4O-HFF-KO-LAST-6-AUTHORITY-DECISION-AND-CLOSURE-V1`
- 기준 커밋: `85e4a2807` (HEAD 조상 확인)
- 착수 HEAD: `f182a4212` (= `origin/main`, ahead 0)
- 판정: **PASS** — 4건 해결 · **34절 복원** · 2건 영구 HOLD · 트랙 **CLOSED**

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | `pnpm-lock.yaml`(타 세션 소유)만 존재 — **미접촉**, 경로 미중첩 |
| DB read-only | 조사·판정·스캔·독립검증 전 세션 `SET default_transaction_read_only = on` |
| **공용 renderer·CSS** | **미수정** (구조 전환을 기존 지원 class 만으로 해결) |
| ProductMaster / candidate / 신규 canonical | **0 / 0 / 0** |
| EN 대상 write | **0** |

---

## 2. 모집단 재현

| 검사 | 결과 |
|---|---|
| 총계 | **6** ✅ |
| `INGREDIENT_OWNERSHIP_UNRESOLVED` | 5 |
| `CANONICAL_REDESIGN_REQUIRED` | 1 |
| candidateId / canonicalId 중복 | **0 / 0** |
| DB 미존재 | **0** |
| ko · STORE · canonical · `o4o_hff_generated` · master_id 일치 | **전건 true** |
| **공식 원천 부재 343 혼입** | **0** |
| EN 대상 혼입 | **0** |
| renderer family | why 5 · fn 1 |

---

## 3. 핵심 발견 — 귀속 근거는 다른 공식 필드에 있었다

직전 WO 는 이 5건을 "공식 MAIN_FNCTN 에 원료 라벨이 없어 귀속 불가"로 남겼다. 그러나 **같은 공식 원천의 `BASE_STANDARD`(기준·규격) 필드에 그 제품에 실제 배합된 기능성 원료가 순서대로 명시**되어 있었다.

```
BASE_STANDARD : 1) 성상 … 3) 뮤코다당•단백 4) 비타민 D 5) 망간 6) 비타민 K 7) 셀레늄 8) 아연
MAIN_FNCTN    : 관절및연골 / 칼슘과인·뼈형성·골다공증 / 뼈형성·에너지이용·유해산소 /
                혈액응고·뼈의구성 / 유해산소 / 면역·세포분열
```

WO §6 이 근거로 요구한 "공식 원료 순서"가 바로 이 필드다.

### 판정 게이트 (둘 다 통과해야 SAFE)

| 게이트 | 내용 |
|---|---|
| **G1 순서** | `BASE_STANDARD` 기능성 원료 수 == `MAIN_FNCTN` 블록 수, 순서 1:1 |
| **G2 문구** | 각 원료의 「건강기능식품의 기준 및 규격」 고시 기능성 문구가 대응 블록과 **정확히 일치** |

G2 문구표는 **귀속의 근거가 아니라 G1 순서 귀속에 대한 독립 검증**으로만 썼다. 두 필드는 서로 다른 공식 필드이며, **제품마다 원료 순서가 다른데도 기능성 블록 순서가 그에 맞춰 함께 달라진다**는 점이 대응의 결정적 근거다.

```
관절엔 소연골  : 뮤코다당 → 비타민D → 망간   → 아연   → 셀레늄 → 비타민K
뼈·연골·관절엔 : 뮤코다당 → 비타민D → 망간   → 비타민K → 셀레늄 → 아연
성균관 소연골  : 뮤코다당 → 비타민K → 비타민D → 아연   → 셀레늄 → 망간
```

세 제품 모두 6블록이 각자의 순서에 정확히 대응했다. 우연으로 설명되지 않는다.

---

## 4. Track A — 원료 귀속 5건

| 제품 | BASE 원료 | 블록 | 판정 |
|---|---:|---:|---|
| 관절엔 소연골 뮤코다당단백(콘드로이친) 1200 | 6 | 6 | **RESOLVED_UPDATED** |
| 뼈·연골·관절엔 소연골 뮤코다당·단백 1200 | 6 | 6 | **RESOLVED_UPDATED** |
| 성균관 소연골 뮤코다당 단백[콘드로이친]1200 | 6 | 6 | **RESOLVED_UPDATED** |
| 대관절 만보 천보 | 6 | 4 | `FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP` |
| 로젠빈 우먼밸런스 | 6 | 5 | `FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP` |

**대관절 만보 천보** — `BASE_STANDARD` 에 `AKBA` · `Total curcuminoids` · `Gallic acid` 가 있는데 이는 **지표성분**이지 원료가 아니다. 지표 3개가 각각 다른 개별인정 원료의 마커인지, 하나의 복합 원료의 마커인지 공식 원천으로 확정할 수 없다. 기능성 블록 4개 중 3개가 모두 "관절 및 연골 건강"이라 문구로도 구분되지 않는다.

**로젠빈 우먼밸런스** — 원료는 5개로 좁혀지지만(대두이소플라본 + 8-Prenylnaringenin = 대두추출물등 복합물(메노세라) 하나의 지표 2개), **BASE 순서와 기능성 블록 순서가 서로 다르다**. 순서 규칙을 적용할 수 없어 G1 실패.

> 두 건 모두 고시 문구 매핑만으로는 "그럴듯한" 귀속이 가능하다. 그러나 그것은 순서 근거 없이 문구표에만 의존하는 것이고, WO §6 이 금지한 추정 귀속이다. 영구 HOLD 로 남겼다.

---

## 5. Track B — 구조 전환 1건

`장인정신 에브리데이 튼튼지니어스 홍삼젤리` — `sd-fn`(평면 전용) family 라 원료 라벨을 담을 수 없어 **나이아신 그룹이 누락**돼 있었다.

원문에 라벨이 명시되어 있다.
```
홍삼 - 면역력 증진·피로개선·혈소판 응집억제를 통한 혈액흐름·기억력 개선·항산화에 도움을 줄 수 있음
나이아신 - 체내 에너지 생성에 필요
```

WO §7 의 이 1건 한정 허가에 따라 전환했다.

| 항목 | 조치 |
|---|---|
| family | `sd-fn` → **`sd-func`/`sd-why`** (기존 HFF 지원 구조, CSS 이미 존재) |
| **공용 renderer·CSS** | **변경 없음** |
| 홍삼 5절 | 기존 분해형 **그대로 보존** (원문 통합 절로 되돌리지 않음) |
| 나이아신 | 1절 **복원** |
| 헤딩 | `이 홍삼의 공식 기능성` → `원료별 공식 인정 기능성` (나이아신 포함으로 기존 헤딩이 내용과 어긋남) |
| 나머지 `sd-fn` 문서 | **268건 미접촉** |

---

## 6. 최종 판정 (합계 6 ✅)

| 상태 | 건수 |
|---|---|
| **RESOLVED_UPDATED** | **4** |
| RESOLVED_NO_CHANGE | 0 |
| `FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP` | **2** |
| `FINAL_PERMANENT_HOLD_SOURCE_CONFLICT` | 0 |
| `FINAL_PERMANENT_HOLD_STRUCTURE_NOT_APPROVABLE` | 0 |
| `FAILED_SYSTEM` | **0** |

**복원 기능성 절: 34** (콘드로이친 3형제 각 11절 + 홍삼젤리 1절)

---

## 7. 적용 전 결함 교정 3건

| 결함 | 증상 | 교정 |
|---|---|---|
| 소수점을 항목 번호로 오인 | `1.0 이상 9.0 이하 4. 비타민D` → 원료명이 `0이상9.0이하4.비타민D` | 번호 뒤 숫자 배제 `[).](?!\d)` |
| 오염물질·시험항목 미제외 | 납·비소·카드뮴 등이 원료로 계수돼 순서 게이트 오탐 | NON_INGREDIENT 확장 |
| **라벨 축소** | 기존 `뮤코다당·단백(콘드로이친)` 을 BASE 표기 `뮤코다당·단백` 으로 덮어써 정보 손실 | 기존 라벨이 더 구체적이면 **기존 라벨 유지** |

세 번째는 스캔의 `LABEL_NARROWED` 검사가 없었다면 그대로 적용됐을 정보 손실이다.

---

## 8. 정밀 스캔 (SAFE 4 전량) — **clean**

절 verbatim · 마커/대괄호 · 영문 · 분리자 · 짧은 절 · 라벨 verbatim · **라벨 축소** · 그룹 내 중복 · 공식 절 소실 · 기능성 외 drift · 전문가 안내 · h2 개수 · `sd-fn` 잔존 — **전 항목 0**.

## 9. 렌더 검증 — **PASS**

래퍼 증명 `"" → 860px` (`cssActuallyApplied: true`), radius `20px`, hero padding `28px 22px 24px`, badge `14px`.

4문서 × 430/820/1280 = **12 렌더**. overflow·clipping·빈 요소·미정의 class·raw HTML·마커·영문·**라벨 소실·개별인정번호 소실**·원료 혼입·그룹 내 중복·전문가 안내 누락 — **전 항목 0**.

구조 전환 대상은 before/after DOM·h2 순서·원료 그룹 수·절 수를 모두 대조했다.

## 10. Apply (LIVE)

이중 게이트(`--apply` + `HFF_LAST6_APPLY_CONFIRM=YES`) · 단일 트랜잭션 · 행별 hash lock.

| 항목 | 값 |
|---|---|
| expected / actual UPDATE | **4 / 4** |
| hash drift | **0** |
| rollback | 없음 |
| SPD 총수 · KO · **EN** · PM | 120,123 / 40,918 / **15,498** / 40,948 — **전부 불변** |

## 11. 독립검증 (별도 read-only 세션) — **PASS**

new hash **4/4** · old hash 잔존 **0** · **rollback 역연산 4/4** · 절 verbatim 위반 **0** · 필드 drift **0** · **대상 밖 2건 drift 0** · canonicalDup **0** · 전역 5종 **불변** · 상태 합계 **6** · HOLD 파일 중복 **0** · 종료 요약 수치 정합 **OK**.

---

## 12. 한국어 비번역 트랙 종료 요약

```
hff-ko-nontranslation-closure-v1.json
hff-ko-nontranslation-permanent-hold-v1.jsonl
hff-ko-nontranslation-permanent-hold-summary-v1.json
```

| 항목 | 값 |
|---|---|
| 전체 HFF KO 대상 | **41,261** |
| KO canonical 생산 | **40,918** |
| 이번 WO 해결 | **4** |
| 최종 수동 영구 HOLD | **2** |
| 공식 원천 부재 (동결) | **343** |
| **한국어 비번역 미해결 총수** | **345** |
| **커버리지** | **99.16%** |
| 트랙 상태 | **CLOSED** |

### 재시도 조건별

| 조건 | 건수 |
|---|---|
| 공식 식약처 원천의 `MAIN_FNCTN` / `SRV_USE` 갱신 | **343** |
| 제조사 표시사항 원본 확보 또는 공식 원천에 원료 라벨 포함 | **2** |

### 번역 트랙 이관 (이번 작업 범위 밖 · 변경 0)

| 항목 | 값 |
|---|---|
| EN canonical 기존 | 15,498 |
| EN 기능성 HOLD | 824 |
| EN 짝 없는 KO | 25,415 |

---

## 13. 공식 원천 부재 343건 — 동결 확인

| 항목 | 상태 |
|---|---|
| 재조사·재분류 | **미수행** |
| 삭제·archive·terminal | **없음** |
| 6건 큐 혼입 | **0** |
| 상태 | `FINAL_HOLD_OFFICIAL_SOURCE_MISSING` 유지 |
| 개별 목록 | `hff-ko-final-unresolved-v1.jsonl` 에 보존 |

영구 HOLD 파일에는 6건 잔여 2건과 343건 집합을 **`track` 필드로 구분**해 기록했다.

> `FINAL_PERMANENT_HOLD` 는 삭제도 terminal 처리도 아니다. 기존 canonical 은 현재 상태를 그대로 유지하며, 공식 원천 또는 사람 권한 판단이 새로 들어오면 재개할 수 있다.

---

## 14. 산출물

```
hff-ko-last-6-population-v1.json
hff-ko-last-6-authority-decisions-v1.json
hff-ko-last-6-safe-targets-v1.json
hff-ko-last-6-rollback-v1.json
hff-ko-last-6-scan-v1.json
hff-ko-last-6-render-audit-v1.json
hff-ko-last-6-apply-results-v1.json
hff-ko-last-6-independent-verification-v1.json
hff-ko-nontranslation-closure-v1.json
hff-ko-nontranslation-permanent-hold-v1.jsonl
hff-ko-nontranslation-permanent-hold-summary-v1.json
```

+ script 6개 · 본 CHECK. 임시 조사 파일 전량 삭제.

**rollback**: `newBlock → oldBlock` 치환 후 `oldContentHash` 대조 — 4/4 검증 완료.

---

## 15. 트랙 종료 선언

**HFF 한국어 비번역 생산 트랙을 종료한다.**

41,261건 중 **40,916건(99.16%)** 이 STORE/ko canonical 로 생산·정비되었다. 남은 345건은 전부 **플랫폼 외부 입력**을 기다린다.

- **343건** — 식약처 공공데이터 원천 자체에 기능성·섭취방법이 비어 있다. 플랫폼이 할 수 있는 작업이 없다.
- **2건** — 공식 원천에 원료 라벨이 없고 원료 순서도 대응하지 않는다. 제조사 표시사항 원본이 필요하다.

자동 재시도로 진전될 대상은 **0건**이다.

---

## 16. 함정 기록

1. **`BASE_STANDARD` 에 원료 순서가 있다.** `MAIN_FNCTN` 에 라벨이 없다고 귀속 불가로 단정하지 말 것. 같은 공식 원천의 다른 필드를 먼저 확인한다.
2. **지표성분 ≠ 원료.** `AKBA` · `Total curcuminoids` · `8-Prenylnaringenin` 은 함량 규격의 마커다. 원료 수를 셀 때 포함하면 순서 대응이 깨진다.
3. **소수점을 항목 번호로 읽지 말 것.** `1.0 이상 9.0 이하 4. 비타민D` — `\d+[).]` 만으로는 `1.` 이 먼저 잡힌다.
4. **기존 라벨이 더 구체적일 수 있다.** 공식 표기로 덮어쓰면 `(콘드로이친)` 같은 정보가 사라진다. 라벨 축소 검사를 스캔에 반드시 넣을 것.
5. **고시 문구표는 검증에만 쓴다.** 문구표만으로 귀속하면 순서 근거 없는 추정이 된다. 순서(G1) + 문구(G2) 이중 통과일 때만 확정.
6. `product_candidates` 에는 `source_kind` 컬럼이 없다. `raw_payload->>'sourceKind'` 를 쓴다.

---

*작성: 2026-07-31*
