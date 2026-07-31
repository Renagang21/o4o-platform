# CHECK — WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1

- 실행 일자: 2026-07-31
- 착수 HEAD: `be2863353e4adc46677defb73423dc1cd4b3dfe6` (기준 commit `8e41d31ae` 조상 관계 확인)
- 대상: 최종 사람 검토 큐 v2 **4,544행** (KO 3,720 / EN 824)
- 환경: 프로덕션 Cloud SQL `netureyoutube:asia-northeast3:o4o-platform-db` / DB `o4o_platform`
- 판정: **PASS** — 독립 검증 `hff-final-review-4544-independent-verification-v1.json` verdict = PASS (검사 20건 전건 통과)

---

## 1. 결과 요약

| 구분 | 대상 | 결과 |
|---|---:|---:|
| 재대조 결과 **이미 해결** (결함 재현 불가) | 3,442 | 큐에서 제외 |
| **안전 적용** (SAFE_APPLY + HOLD→SAFE 승격) | **65** | LIVE 65/65 |
| 최종 HOLD (v3 큐) | 1,037 | KO 213 / EN 824 |
| 합계 | **4,544** | 정합 (3,442 + 65 + 1,037) |

기능성 절 **337개** 복구, 원료 카드 **105개** 신설. DB write 는 `content` + `updated_at` 두 컬럼뿐.

---

## 2. 큐 재대조 — `alsoModifiedInThisWo` 를 신뢰하지 않았다

v2 큐의 플래그가 아니라 **현재 canonical 을 직접 재검증**해 결함이 지금도 재현되는지 판정했다.
그 결과 KO 3,720 중 **3,442건은 이미 공식 기능성 절이 전부 존재**(`ALL_OFFICIAL_CLAUSES_PRESENT`)했다.
직전 WO 가 손댄 행이라는 이유로 자동 제외한 것이 아니라, 재현되지 않아 제외한 것이다.

| 언어 | 상태 | 건수 |
|---|---|---:|
| KO | `ALREADY_RESOLVED` | 3,442 |
| KO | `SAFE_APPLY` | 30 → 적용 30 |
| KO | `HOLD_AMBIGUOUS` | 170 → 35 승격 적용 / 135 잔여 |
| KO | `HOLD_SOURCE` | 68 |
| KO | `HOLD_RENDERER` | 10 |
| EN | `HOLD_NO_EN_GROUNDING` | 824 |

renderer family 판정은 class 존재로 하지 않았다(§6 계약):
`FAMILY_AUDIT_ARTIFACT` 150 / `H2_SIGNAL_SET` DRIVER 2,807 · COMPOSITE 763, UNKNOWN·AMBIGUOUS 0.

---

## 3. KO 처리 — 마커 부재를 자동 HOLD 사유로 쓰지 않았다

사유 그룹별로 전량 검토한 뒤, **판정이 단일하게 확정되는 것만** 안전 대상으로 올렸다.

### 3-1. 적용 (65)

| 경로 | 건수 | 내용 |
|---|---:|---|
| 기존 카드·목록에 절 삽입 | 30 | 83개 절 (`APPEND_TO_FLAT_LIST` 27 / `INSERT_INTO_INGREDIENT_CARD` 3) |
| **원료 카드 신설 (HOLD→SAFE 승격)** | **35** | 105개 카드 / 254개 절 |

카드 신설 승격 조건 — 전부 만족할 때만:

1. 공식 원문 `MAIN_FNCTN` 의 대괄호가 **온전**하다 (손상 시 라벨 자체가 추정이 되므로 제외)
2. 누락 절이 전부 `[원료]` 라벨을 가진다 → 귀속이 원문상 단일 확정
3. 그 라벨과 겹치는 기존 카드가 없다 (신설이지 이동·병합이 아니다)
4. 각 절이 삽입 위험 검사를 통과한다 (부분 중복·서술어 부재·선행 구두점 0)
5. 신설 카드 마크업을 **같은 문서 형제 카드에서 그대로 복제**한다 → 새 class 0, renderer family 불변

승격 대상은 대부분 관절·연골 제품의 `비타민D` / `망간` / `비타민K` / `아연` / `셀레늄` 처럼
공식 원문에 라벨과 함께 명시돼 있으나 canonical 에 카드가 통째로 빠져 있던 건이다.

### 3-2. 승격하지 않은 것 (55건 — 근거)

| 거절 사유 | 건수 | 판단 |
|---|---:|---|
| `MISSING_CLAUSE_WITHOUT_LABEL` | 46 | 공식 블록 선두가 무라벨 → 귀속을 표기할 방법이 없다 |
| `SOURCE_CLOSE_WITHOUT_OPEN` | 5 | 원문 손상 (`홍삼]①…`) |
| `SOURCE_NESTED_OPEN_BRACKET` | 4 | 원문 손상 (`[비타민B1[①…`, `[비오틴][(1)…`) |

원문 손상 건은 **모호(AMBIGUOUS)가 아니라 원천 보정 대상(SOURCE_REPAIR_REQUIRED)** 으로 재분류했다.
분류 산출물의 evidence 는 400자로 잘려 있어 손상 판정은 **DB 실측 전문**으로만 수행했다.

---

## 4. EN 처리 — 근거 없는 기능성은 생성하지 않았다

EN 824건 전건 재판정 결과 **적용 0건**, HOLD 824건 유지.

- `NO_OFFICIAL_EN_GROUNDING` 819 — 공식 원문이 국문 전용
- `PARTIAL_EN_GROUNDING` 5 — 2개 원료 그룹 중 1개만 영문 표기. 부분 게시는 기능성 축소 표기가 되므로 HOLD

이번 WO 의 EN write 는 0건이다(독립 검증 `en_targets_in_this_wo` = 0).
KO 문구의 기계 번역, 부분 영문 근거의 전체 섹션 확장, 한국어 라벨의 EN 문서 삽입 모두 발생하지 않았다.

---

## 5. Patch 계약 이행 (§10)

- 허용 write: 기존 STORE canonical 행의 `content` + `updated_at` — 실제 write scope 동일
- INSERT / DELETE / status·source metadata·master_id·language·description_type 변경 **0**
- 전면 재생성 0, renderer family 전환 0
- **삽입 전용 증명**: 삽입분을 제거하면 적용 전 원문과 byte 단위로 일치 (`non_function_byte_drift` = 0)
- 불변 보존: 제품명·소개·섭취방법·섭취 시 참고사항·기준규격·전문가 안내·기능성 외 HTML

---

## 6. 렌더 검증 (§12) — 문자열 검사로 판정하지 않았다

대상 65건은 **전건** 렌더했다(카드 신설·라벨 보존·다원료 기능성 = 전부 고위험 op).
`before` / `after` 를 각각 렌더해 **DOM 에서 원료 → 절 귀속 맵**을 추출하고 차집합을 비교했다.

- `after ⊇ before` → 라벨 손실 0 / 공식 기능성 삭제 0 / 절 누락 0
- `after \ before == 계획된 삽입` → 원문 밖 기능성 추가 0 / **원료 간 혼입 0**

| viewport | 문서 | 검사 | 실패 |
|---|---:|---:|---:|
| 430 / 820 / 1280 | 65 | 195 | **0** |

세부 항목 전건 0: `pageOverflow` · `elemOverflow` · `clipped` · `emptyNode` · `sectionMissing` ·
`labelLost` · `clauseLost` · `unplannedAddition` · `crossIngredientMix` · `recognitionNoLost` ·
`rawHtmlVisible` · `bracketFragment`. 렌더 게이트 통과 전 apply 는 차단된다(사전 게이트).

---

## 7. Apply (§13)

- 이중 게이트: `--apply` + `HFF_FINAL4544_APPLY_CONFIRM=YES`
- 행별 낙관적 잠금: `encode(sha256(convert_to(content,'UTF8')),'hex') = oldContentHash` + `rowCount === 1`
- 단일 트랜잭션 + 트랜잭션 내 전건 sha256 재검증 + 스냅샷 불변식 위반 시 즉시 ROLLBACK
- **expected 65 = actual 65**, 실패 0, rollback 발생 0

| 스냅샷 | before | after |
|---|---:|---:|
| HFF KO canonical | 40,913 | 40,913 |
| HFF EN canonical | 15,498 | 15,498 |

---

## 8. 최종 HOLD 큐 v3

`hff-final-review-queue-v3.jsonl` **1,037행** / unique canonicalId 1,037 (중복 0, DB 미존재 0).

| holdReason | 건수 |
|---|---:|
| `NO_OFFICIAL_EN_GROUNDING` | 819 |
| `AMBIGUOUS_INGREDIENT_OWNERSHIP` | 117 |
| `AMBIGUOUS_FUNCTION_BOUNDARY` | 71 |
| `SOURCE_REPAIR_REQUIRED` | 15 |
| `CANONICAL_STRUCTURE_UNSAFE` | 10 |
| `PARTIAL_EN_GROUNDING` | 5 |
| 합계 | **1,037** |

기능성 섹션 부재·중복(10건)은 renderer family 문제가 아니라 canonical 구조 문제이므로
`UNSUPPORTED_RENDERER_STRUCTURE` 가 아닌 `CANONICAL_STRUCTURE_UNSAFE` 로 기록했다.

---

## 9. 독립 검증 (§15) — verdict PASS

적용 스크립트 내부 상태를 신뢰하지 않고 DB 를 재측정했다. 검사 20건 전건 통과.

| 항목 | 기대 | 실측 |
|---|---:|---:|
| HFF KO / EN canonical 수 불변 | 40,913 / 15,498 | 동일 |
| EN 짝 없는 KO 불변 | 25,415 | 25,415 |
| 대상 new hash 일치 / old hash 잔존 | 65 / 0 | 65 / 0 |
| 기능성 외 byte drift / 공식 절 삭제 | 0 / 0 | 0 / 0 |
| **대상 밖 canonical drift** (4,479행 재측정) | 0 | 0 |
| manifest 밖 write | 0 | 0 (구간 내 변경 행 65 = 대상 65) |
| Agent 9 HOLD 불변 | 348 | 348 |
| v3 ↔ v2 정합 (3,442 + 65 + 1,037) | 4,544 | 4,544 |
| v3 canonicalId 중복 / DB 미존재 / 적용대상 중복 | 0 / 0 / 0 | 0 / 0 / 0 |
| v3 holdReason 정규화 위반 / 필수 필드 누락 | 0 / 0 | 0 / 0 |
| 이번 WO 의 EN write | 0 | 0 |

`spd_all` 은 120,118 → 120,140 으로 관측됐다. 이는 **타 도메인의 정상 write** 이며 HFF 범위 밖이다.
따라서 불변식에서 제외하고 관측값으로만 기록했다. HFF scope 카운터(KO/EN)는 전부 불변이다.

### 9-1. 검증 과정에서 잡은 자체 결함 1건

`updated_at` 은 `timestamp without time zone` 이라 클라이언트 `Date` 파싱이 로컬 오프셋(KST +9h)만큼
어긋나 65건 전건이 stale 로 오탐됐다. 데이터 결함이 아니라 검사 코드 결함이었고, **서버측 비교로 교정**했다.
(같은 사실을 서버측으로 측정한 `touched_rows_in_window` 는 처음부터 65 로 정상이었다.)

---

## 10. 안전 계약

- 조사 세션은 전부 `SET default_transaction_read_only = on` + `SHOW transaction_read_only` 확인 후 질의
- apply 세션만 read-only 를 걸지 않으며, 이중 게이트 없이는 DRY_RUN 으로 종료
- 자격증명은 코드·JSON·JSONL·CHECK·로그·Git diff·명령 인자 어디에도 남기지 않았다
- 타 세션 WIP 수정·삭제·stash 0, force push 0, `git add .` 0 — path-specific commit 만 수행

---

## 11. 산출물

```
apps/api-server/src/scripts/
  hff-final-review-4544-classify.mjs
  hff-final-review-4544-inspect.mjs
  hff-final-review-4544-build.mjs
  hff-final-review-4544-diff.mjs
  hff-final-review-4544-render.mjs
  hff-final-review-4544-apply.mjs
  hff-final-review-4544-independent-verify.mjs
  hff-final-review-queue-v3-build.mjs
apps/api-server/src/scripts/data/
  hff-final-review-4544-classification-v1.json
  hff-final-review-4544-safe-targets-v1.json
  hff-final-review-4544-rollback-v1.json
  hff-final-review-4544-render-audit-v1.json
  hff-final-review-4544-apply-results-v1.json
  hff-final-review-4544-independent-verification-v1.json
  hff-final-review-queue-v3.jsonl
  hff-final-review-queue-v3-summary.json
```

임시 파일(`tmp-hff-final-4544-newcontent.json`)은 종료 전 삭제했다.

---

## 12. 다음 정책 결정 대상

1. **EN 기능성 824** — 공식 EN 원문 확보가 선행 조건. 확보 전 생성 금지 (부분 근거 5건 포함)
2. **원료 귀속 모호 117** — 무라벨 다원료 목록. 귀속 표기 정책(라벨 도입 여부) 결정 필요
3. **기능성 경계 모호 71** — 결합 세그먼트(`1)… , 2)…`)의 분할 허용 여부는 저작 정책 사안
4. **원천 보정 15** — 공식 `MAIN_FNCTN` 대괄호 손상. 원천 데이터 재수집·보정 트랙 필요
5. **canonical 구조 불안전 10** — 기능성 섹션 부재/중복. 재생성 허용 여부 판정
6. **EN 짝 없는 KO 25,415** — 생성 여부 자체가 정책 판정 사안 (이번 WO 범위 밖, 불변 확인)
