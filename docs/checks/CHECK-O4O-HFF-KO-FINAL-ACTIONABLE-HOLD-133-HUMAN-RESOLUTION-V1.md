# CHECK-O4O-HFF-KO-FINAL-ACTIONABLE-HOLD-133-HUMAN-RESOLUTION-V1

최종 미결 476건 중 **실제 진전 가능한 133건** 전수 판정 · 51건 해결

- 근거 WO: `WO-O4O-HFF-KO-FINAL-ACTIONABLE-HOLD-133-HUMAN-RESOLUTION-V1`
- 기준 커밋: `1007337a0` (HEAD 조상 확인)
- 착수 HEAD: `1007337a0` (= `origin/main`, ahead 0)
- 판정: **PASS** — 51건 canonical 수정 · 기능성 **253절 복원** · 80건 근거 있는 HOLD 유지

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | 타 세션 WIP(`AdminUserController.ts`, `pnpm-lock.yaml`, `__tests__/`) — **경로 미중첩 · 미접촉** |
| DB read-only | 조사·판정·독립검증 전 세션 `SET default_transaction_read_only = on` |
| 공용 renderer·CSS | **미수정** |
| ProductMaster 생성 / candidate 연결 / 신규 canonical | **0 / 0 / 0** (WO §2 제외 준수) |
| EN 대상 write | **0** |

---

## 2. 모집단 재구성 — 정확 재현

| 검사 | 결과 |
|---|---|
| 총계 | **133** (기대 일치) |
| `FINAL_HOLD_BOUNDARY_AMBIGUOUS` | **124** |
| `FINAL_HOLD_SOURCE_CONFLICT` | **9** |
| candidateId / canonicalId 중복 | **0 / 0** |
| DB 미존재 | **0** |
| 전건 `language=ko` · `STORE` canonical | **true / true** |
| **공식 원천 부재 343 혼입** | **0** (큐에서 정확히 분리) |
| EN 대상 혼입 | **0** |

구조: 기능성 섹션 보유 131 · `sd-func` 82 · `sd-why` 전용 45.

---

## 3. 원문 형태 실측 (판정 설계 근거)

| 형태 | 건수 |
|---|---|
| 라벨이 전혀 없음 | 96 |
| 닫힌 라벨 + 무라벨 평문 혼재 | 18 |
| `*` 라벨 + 평문 | 3 |
| 닫히지 않은 라벨 | 2 |
| 전 라인 닫힌 라벨 | 5 |
| 원문 손상(직전 WO 분류) | 9 |

---

## 4. 직전 WO 규칙 교정 — 과도한 가드 1건

`FINAL_HOLD_SOURCE_CONFLICT` 9건은 **손상이 아니었다.**

```
* N-아세틸글루코사민 → 관절 및 연골건강에 도움을 줄 수 있음
* 엠에스엠(MSM…)     → 관절 및 연골 건강에 도움을 줄 수 있음
```

직전 WO 의 중복 가드가 **그룹 간** 동일 문구까지 손상으로 판정했다. 이는 서로 다른 원료가 각각 공식 보유한 정상 사례이며, 앞서 확립한 **"그룹 간 병합 금지"** 원칙과도 모순된다.

→ 중복·부분문자열 가드를 **그룹 내부로 한정**하도록 교정했다.

추가 교정 규칙 2건:
- 라벨 라인 앞 구두점 제거 (`,[프로바이오틱스]` 형태를 라벨로 인식)
- `(국문)`·마커 없는 기능성 라인을 **직전 라벨 그룹의 계속**으로 귀속 (선행 라벨이 없으면 고아 → HOLD)

---

## 5. 최종 판정 (133 전량)

| 상태 | 건수 |
|---|---|
| **SAFE_UPDATE** | **51** |
| **RESOLVED_NO_CHANGE** | **2** |
| `FINAL_HOLD_SOURCE_CONFLICT` | **58** |
| `FINAL_HOLD_CANONICAL_STRUCTURE_UNSAFE` | **11** |
| `FINAL_HOLD_INGREDIENT_OWNERSHIP_AMBIGUOUS` | **10** |
| `FINAL_HOLD_BOUNDARY_AMBIGUOUS` | **1** |
| `FAILED_SYSTEM` | **0** |
| **합계** | **133** ✅ |

### 5-1. HOLD 세부 사유

| 사유 | 건수 |
|---|---|
| `CLAUSE_OVERLAP_IN_GROUP` | 19 |
| `DUPLICATE_CLAUSE_IN_GROUP` | 19 |
| `EMBEDDED_MARKER_IN_CLAUSE` | 11 |
| `PARTIAL_LABEL_OWNERSHIP_UNCLEAR` | 10 |
| `POST_CHECK:noEnglishInClauses` (+singleFn) | 7 |
| `POST_CHECK:singleFn` | 3 |
| `TRAILING_DELIMITER` · `INLINE_LABEL_IN_CLAUSE` · `HEADER_PREFIX_AS_CLAUSE` | 3 / 3 / 3 |
| `NO_FUNCTION_BLOCK` · `OPEN_LABEL_NO_MARKER` | 1 / 1 |

---

## 6. 복구 내용 (51건 · 253절)

| 제품 | 복구 |
|---|---|
| 관절엔 MSM2000 글루코사민 비타민D 아연 | 2원료만 렌더 → **비타민D·아연 복원** (4그룹 6절) |
| 모로실 다이어트 & 혈당 관리 | 모로오렌지만 렌더 → **바나바잎추출물 식후 혈당상승 억제 복원** |
| 에버콜라겐 블랙 | 콜라겐만 렌더 → **아연·판토텐산·비오틴 복원** (4그룹 4절) |

`(영문)` 절은 KO canonical 에서 제외했고(번역 금지 계약), 개별인정번호(`제2023-14호` 등)는 라벨에 보존했다.

---

## 7. 파서·검사 결함 교정 5건 (적용 전)

| 결함 | 증상 | 교정 |
|---|---|---|
| 숫자 괄호 마커 분할 미지원 | `[판토텐산](1) A (2) B` 가 한 절로 뭉쳐 손상으로 오판 | 마커 2개 이상이면 경계 분할 |
| 영문 검사 범위 오류 | 원료명 라벨의 영문(`락추로스 파우더(Lactulose Powder)`)을 절 영문으로 오판 | 검사를 **절 텍스트로 한정** |
| 인라인 라벨 미인식 | 라인 중간 `,[난소화성말토덱스트린]` 이 절에 섞임 | 절 내 대괄호 → HOLD |
| 머리말 오인 | `기능성 내용 :` 를 기능성 절로 채택 | 머리말 패턴 → HOLD |
| **검증기 중첩 `<li>` (4회째 재발)** | `<b>라벨</b>` 이 절로 잡혀 TOO_SHORT 36 · ENGLISH 6 · MARKER 3 허위 실패 | 스캔·렌더 모두 **라벨 제외 / 최말단 `li` 한정** |

교정 후 SAFE 51건 **전량 정밀 검사 clean** (verbatim·마커·영문·분리자·라벨 verbatim 전 항목 0).

---

## 8. 렌더 검증

래퍼 증명: `.sd-card` max-width 래퍼 없이 `none` → 적용 **`860px`** (`cssActuallyApplied: true`).

| 검사 (51문서 × 430/820/1280 = **153 렌더**) | 결과 |
|---|---|
| 페이지/요소 overflow · 클리핑 | **0 / 0 / 0** |
| 빈 `h2`·`ul`·`li` | **0** |
| 미정의 class | **0** |
| 전문가 안내 누락 | **0** |
| raw HTML 노출 | **0** |
| 열거 마커 노출 | **0** |
| 영문 노출(절) | **0** |
| 기능성 섹션 부재 | **0** |
| 판정 | **PASS** |

DOM 구조 기준으로 라벨–절 연결을 확인했다(문자열 포함 여부만으로 판정하지 않음).

---

## 9. Apply (LIVE)

이중 게이트(`--apply` + `HFF_133_APPLY_CONFIRM=YES`) · 단일 트랜잭션.

UPDATE 가드: `id` · `master_id` · `STORE` · `canonical` · `ko` · `source_type='o4o_hff_generated'` · `deleted_at IS NULL` · **DB 측 `sha256(convert_to(content,'UTF8'))` = oldContentHash**.

| 항목 | 값 |
|---|---|
| expected / actual UPDATE | **51 / 51** |
| rollback | 없음 |
| SPD 총수 | 120,123 → **120,123** (불변) |
| KO canonical | 40,918 → **40,918** (불변) |
| **EN canonical** | 15,498 → **15,498** (불변) |
| HFF ProductMaster | 40,948 → **40,948** (불변) |

---

## 10. 독립검증 (별도 read-only 세션)

| 검사 | 결과 |
|---|---|
| new hash 일치 | **51 / 51** |
| old hash 잔존 | **0** |
| **rollback 역연산 복원** | **51 / 51** |
| 기능성 절 누락 | **0** |
| **대상 밖 82건 drift** | **0** |
| canonicalDup | **0** |
| 신규 canonical · ProductMaster · candidate 연결 | **0 / 0 / 0** |
| **EN 문서 변경** | **0** |
| 상태 합계 | **133** ✅ |
| 판정 | **PASS** |

---

## 11. 최종 미결 큐

```
hff-ko-final-actionable-unresolved-v1.jsonl        (80행)
hff-ko-final-actionable-unresolved-summary-v1.json
```

| 사유 | 건수 |
|---|---|
| `OFFICIAL_SOURCE_CONFLICT` | **58** |
| `CANONICAL_STRUCTURE_REQUIRES_REDESIGN` | **11** |
| `INGREDIENT_OWNERSHIP_REQUIRES_HUMAN_APPROVAL` | **10** |
| `BOUNDARY_REQUIRES_HUMAN_APPROVAL` | **1** |

각 행에 `officialEvidenceChecked` · `confirmedFacts` · `ambiguousPoints` · `requiredHumanDecision` · `retryCondition` · `rendererFamily` 를 기록했다. **공식 원천 부재 343건은 이 큐에 넣지 않았다**(동결 유지).

---

## 12. 공식 원천 부재 343건 — 동결 확인

| 항목 | 상태 |
|---|---|
| 재조사·재분류 | **미수행** |
| 삭제·archive | **없음** |
| 큐 혼입 | **0** |
| 상태 | `FINAL_HOLD_OFFICIAL_SOURCE_MISSING` 유지 |

---

## 13. 번역 대상 불변

| 항목 | 상태 |
|---|---|
| EN canonical 15,498 | **변경 0** |
| EN 기능성 HOLD 824 | 미접촉 |
| EN 짝 없는 KO 25,415 | 미접촉 |
| KO→EN 번역·영문 디자인 | 미수행 |

---

## 14. 산출물

```
hff-ko-actionable-hold-133-population-v1.json
hff-ko-actionable-hold-133-human-decisions-v1.json
hff-ko-actionable-hold-133-safe-targets-v1.json
hff-ko-actionable-hold-133-rollback-v1.json
hff-ko-actionable-hold-133-render-audit-v1.json
hff-ko-actionable-hold-133-apply-results-v1.json
hff-ko-actionable-hold-133-independent-verification-v1.json
hff-ko-final-actionable-unresolved-v1.jsonl
hff-ko-final-actionable-unresolved-summary-v1.json
```

+ HFF 전용 script 5개 · 본 CHECK. 임시 파일 전량 삭제.

**rollback**: `newBlock → oldBlock` 치환 후 `oldContentHash` 대조 — 51/51 검증 완료.

---

## 15. 잔여 전체 그림

| 집합 | 건수 | 성격 |
|---|---|---|
| 공식 원천 부재 | **343** | 동결 — 식약처 원천 갱신 대기 |
| 원문 손상 | **58** | 사람이 정본 확정 필요 |
| canonical 구조 재설계 | **11** | 기능성 섹션 구조 WO |
| 원료 귀속 | **10** | 사람 승인 |
| 절 경계 | **1** | 사람 승인 |
| **미결 합계** | **423** | (476 − 해결 53) |

> 남은 80건 중 **58건이 원문 손상**이다. 이는 파서로 더 밀어붙일 대상이 아니라 **공식 원천 품질 이슈**이며, 사람이 정본을 확정하지 않으면 어떤 자동 규칙도 안전하지 않다.

## 16. 함정 기록

1. **중복 가드는 그룹 내부로만** — 서로 다른 원료가 같은 기능성 문구를 공식 보유하는 것은 정상이다. 그룹 간 비교는 정상 데이터를 손상으로 오판한다.
2. **검증기 중첩 `<li>` — 이 세션에서만 4회 재발.** `sd-func` 구조에서 라벨이 절로 잡힌다. 스캔·렌더·독립검증 전부에서 **라벨 제외 또는 최말단 `li` 한정**을 기본값으로 삼을 것.
3. **영문 금지는 절에만** — 원료명 라벨의 영문(`(Morosil®)`, `(Lactulose Powder)`)은 공식 원료명의 일부다.
4. **숫자 괄호 마커 `(1)` `(2)`** 도 분할 대상이다. 미지원 시 손상으로 오판된다.
5. **절 안의 대괄호 = 미인식 인라인 라벨** — 라인 기반 파서는 라인 중간 라벨을 놓친다.
6. 라벨 라인 앞 구두점(`,[원료]`)을 제거한 뒤 라벨을 인식할 것.

---

*작성: 2026-07-31*
