# CHECK — HFF 다원료 잔여 대량 생산 shard 0 (Agent A) V1

- WO: `WO-O4O-HFF-MULTI-INGREDIENT-REMAINDER-BULK-A-V1` · 자동승인 계약 적용.
- 성격: **잔여 대량 생산(자동 apply)** — `MULTI_INGREDIENT`/`NO_EXPLICIT_STRUCTURE`/`HOLD_MULTI_FUNCTIONAL` 잔여에서 A 주도(관절·연골·피부) 안전 후보 생산.
- 종료 `2026-07-25 07:23 +0900`. 기존 A 전용 cross-domain 빌더 재사용(`hff-combo-a-mixed-build.ts`, `62143ff70`). 공용 parser/registry/classify/composer/apply/Guard **무수정**.

## 0. 결론

> **MIXED_NONA 244 전수 재분석 결과: 신규 생산 가능 0 — A 주도 안전 후보 pool 소진.**
> 244 = 기생산 86(이전 A run) + HOLD 158. target 0. DB write 0(생산 없음).
> 잔여 158 HOLD 는 **비-A 기능성 삭제 방지(완전성 가드)** 로 정당 보류 — 대부분 공용 `mapFunctionEn` EN 미매핑(PENDING_SHARED)·공용 parser 잔여 변이(PENDING_SHARED_PARSER)·액상·Guard.

## 1. A cross-domain build 재실행 (기존 빌더 재사용)

`hff-combo-a-mixed-build --out <dir>` (완전성 가드: MAIN_FNCTN 전 기능성이 A∪비-A `mapFunctionEn` 렌더로 커버 안 되면 HOLD, 삭제 방지):

| funnel | 수 |
|---|:-:|
| mixed(MIXED_NONA 총) | 244 |
| takenOrPromoted(기생산, 이전 A run) | 86 |
| aAttrFail(A_NO_FUNC_MATCH) | 4 |
| liquid | 30 |
| **incomplete + FN_EN_PENDING** | **100** |
| guardBlock | 19 |
| guardReview | 5 |
| **target(신규 생산)** | **0** |

- `--include-liquid` 재실행에서도 target 0(액상 편입분이 incomplete 로 이동, 123).

## 2. HOLD 158 상세 (전수 분류)

| 원인 | 수 | 성격 |
|---|:-:|---|
| INCOMPLETE_NONA_RENDER | 56 | 비-A 기능성 렌더 불가(삭제 방지 HOLD) |
| FN_EN_PENDING | 44 | 비-A 기능성 EN 미매핑 |
| LIQUID | 30 | 액상(별도 모델) |
| GUARD_BLOCKED (Q-TRUNCATED 11·PRE-SRC-BULK 5·D-CLAIM-UNGROUNDED 3) | 19 | 원문 결함/벌크 |
| GUARD_REVIEW (D-CLAIM-GROUNDED·E-NAME-DERIVED) | 5 | 검토 |
| A_NO_FUNC_MATCH | 4 | A 기능성 원문 귀속 실패 |

### PENDING_SHARED — 공용 `mapFunctionEn` EN 미등재 비-A 기능성 (100건 언락 선행)
가장 빈번한 미커버 문장(EN 추가 시 A 주도 병기 생산 가능):
- `눈의 피로도 개선에 도움을 줄 수 있음`(눈, C) 9
- `장내 유익균 증식 및 배변활동 원활에 도움을 줄 수 있음`(장, B) 6
- `체액·산-염기 균형 유지에 필요`·`에너지/포도당/지질 합성에 필요`·`체내 영양성분 운반·저장에 필요`·`뼈 건강에 도움`·`혈액 호모시스테인 정상 유지`·`골다공증 위험감소`·`몰리브덴 대사` 각 4~6

### PENDING_SHARED_PARSER — 공용 파서 잔여 변이
- `유산균 증식 및 유해균 억제･배변활동 원활･장…`(`･` 중점 미완전 분리) 등 DIRTY ≈33건 — 74c9e8f2d 이후에도 남은 `･`-연접 원자화 잔여. 공용 parser 수정 필요(본 WO 금지) → 분리 기록.

- **위 100건은 "일부 기능성 삭제 금지"** 원칙상 자동 생산 불가(공용 EN/parser 보강 = 타 WO). 개별 HOLD 후 배치 계속 = target 0 확정.

## 3. 자동 apply

- **생산 대상 0 → dry-run/apply 없음.** DB write 0. canonicalDup·statementNo 중복·drift 판정 대상 없음(무변경).
- 기존 LIVE 무영향(read-only 재분석 + build DB write 0).

## 4. 보고 요약

```text
종료 2026-07-25 07:23 +0900 · 기존 A cross-domain 빌더 재사용 · 공용 무수정
처리 후보: MIXED_NONA 244 전수 재분석
신규 LIVE 0 · DB write 0 · PASS 0 / HOLD 158(+기생산 86)
HOLD 상위: INCOMPLETE 56 · FN_EN_PENDING 44 · LIQUID 30 · GUARD 24 · A_NO_FUNC 4
원료수별 생산량: 0 (전 조합 생산 없음)
canonicalDup — · statementNo 중복 — · 기존 LIVE drift 0(무변경)
독립검증: 생산 0이라 대상 없음
남은 후보: PENDING_SHARED(공용 mapFunctionEn EN 100)·PENDING_SHARED_PARSER(･분리 ~33)·액상 30
중지 사유: 없음 (A 주도 안전 후보 소진, 잔여는 공용 보강 선행)
```

## 5. 산출물

- HOLD 전수 분류: `docs/checks/data/product-description-guard/hff-mixed-a-remainder/mixed-a-remainder-hold.json` (158, stmt·reason·uncovered).
- 본 문서.
- (빌더 `hff-combo-a-mixed-build.ts`·A registry 는 `62143ff70` 기커밋, 무수정 재사용.)

---

*다원료 잔여 재분석 · 자동 apply 계약. 공용 parser/registry/composer/apply/Guard 무수정 · 기존 A 빌더 재사용 · 신규 생산 0(안전 후보 소진). 잔여 100 = 공용 mapFunctionEn EN 보강(PENDING_SHARED) 선행.*
