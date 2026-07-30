# CHECK-O4O-HFF-KO-WHY-FAMILY-REMAINING-14-AND-AUTHORING-POLICY-FULL-CLEANUP-V1

왜-family 한국어 저작 계약 정비 — 잔여 기능성 14건 + `이런 분께` 제거 + 전문가 안내 보완

- 근거 WO: `WO-O4O-HFF-KO-WHY-FAMILY-REMAINING-14-AND-AUTHORING-POLICY-FULL-CLEANUP-V1`
- 기준 커밋: `a0a5175e3` (HEAD 조상 확인)
- 착수 HEAD: `aeb9035e9` (= `origin/main`)
- 판정: **PASS** — 15,371건 단일 트랜잭션 적용 · rollback 역연산 전량 해시 검증

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | 타 세션 `MM pnpm-lock.yaml` — **미접촉** |
| DB read-only | 조사·판정·독립검증 전 세션 `SET default_transaction_read_only = on` |
| 공용 renderer·CSS | **미수정** (직전 WO 의 `sd-func` CSS 는 이미 반영됨) |
| candidate·ProductMaster | **미수정** |
| EN canonical | **미변경** (실측 0건) |

---

## 2. 실측 모집단 — 요청서 전제 1건 정정

| 집합 | 전체 ko | 왜-family | 비-왜-family |
|---|---|---|---|
| **A** 기능성 섹션 부재 | **14** | 14 | 0 |
| **B** `이런 분께` 보유 | **15,435** | **15,308** | **127** |
| **C** 전문가 문구 부재 | **13,955** | **13,828** | **127** |

교집합: `A∩B` 14 · `A∩C` 14 · `B∩C` 13,892 · `A∩B∩C` 14.

### 정정 — "전문가 footer 부재"는 footer 자체가 아니라 **문구** 부재

| 실측 | 값 |
|---|---|
| `<div class="sd-foot">` 보유 | **40,913 / 40,913 (전량)** |
| `매장 내 약사 등 전문가` 문구 보유 | 26,958 |
| **footer 는 있으나 전문가 문구가 없음** | **13,955** |

즉 footer 요소를 **추가**할 대상은 0건이고, 기존 `sd-foot` 에 **전문가 안내 절을 보완**하는 작업이다. 요청서 §Phase D 의 "footer 부재 → 추가" 는 "전문가 안내 절 부재 → 보완" 이 정확하다.

---

## 3. 최종 저작 계약 (실측으로 확정)

### 3-1. `이런 분께` section 구조 — 100% 균일

| 검사 | 결과 |
|---|---|
| `<h2>이런 분께</h2><ul class="sd-who">…</ul>` 형태 | **15,435 / 15,435** |
| 다른 형태 | **0** |
| h2 없이 문구만 존재 | **0** |
| section 직후 요소 | `</div>` **15,435 / 15,435** |

경계가 단일하게 확정되므로 정규식 과잉 삭제 없이 정확 제거가 가능하다.

### 3-2. 표준 전문가 안내 절 — 왜-family 자체 계약

왜-family 는 driver 의 `<h2>매장 전문가 문의 안내</h2> + sd-cta`(25,415건) 를 쓰지 않고, **`sd-foot` 말미 절**을 쓴다.

```
· 건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은 매장 내 약사 등 전문가와 상담하십시오
```

| 검사 | 값 |
|---|---|
| 왜-family 내 이 절 사용 | **1,543** (전량 문서 말미 `</div></div>` 직전) |
| 왜-family 내 다른 전문가 표현 | **0** (1,543 = 전문가 문구 보유 전량) |
| 왜-family `sd-foot` 마감 형태 | `<div class="sd-foot"><b>…</b>…</div></div>` **15,371 / 15,371** |

→ 신규 문구·신규 class 없이 **기존 절을 그대로 재사용**했다.

---

## 4. 잔여 기능성 14건 판정

| 판정 | 건수 |
|---|---|
| `SAFE_FUNCTION_APPLY` | **1** |
| `BLOCKED_AMBIGUOUS_BOUNDARY` | **13** |
| `BLOCKED_SOURCE` / `BLOCKED_STRUCTURE` / `FAILED_SYSTEM` | 0 / 0 / 0 |

14건 전량 개별 판정했다(표본 축소 없음). 13건은 절 경계를 단일하게 확정할 수 없어 사람 검토 큐에 남겼고, 이들에도 `이런 분께` 제거·전문가 절 보완은 정상 적용했다(기능성만 보류).

---

## 5. 작업 조합 (canonicalId 당 1회 UPDATE)

| 조합 | 건수 |
|---|---|
| `AUD+FOOT` | **13,764** |
| `AUD` | **1,543** |
| `FOOT` | **63** |
| `FN+AUD+FOOT` | **1** |
| **합계 (canonicalId 중복 0)** | **15,371** |

정합: AUD 계 = 13,764+1,543+1 = **15,308** ✅ · FOOT 계 = 13,764+63+1 = **13,828** ✅

## 6. 사후 검증 로직 교정 3건 (기록)

1차 빌드에서 349건이 탈락했는데 **전부 제 검사 오류**였다.

| 오류 | 내용 | 교정 |
|---|---|---|
| `classesOk` 271 | 정의 밖 class 를 **절대 검사** → 기존 문서가 이미 보유한 class 때문에 AUD/FOOT 전용 문서까지 탈락 | **회귀 검사**(신규 유입 0)로 변경 |
| `fnSectionSingle` 65 | 기능성 헤딩 2개를 이미 가진 기존 문서를 절대 검사로 탈락 | 개수 **증가 없음** 검사로 변경 |
| `fnSectionPresent` 13 | FN 차단 문서까지 기능성 섹션 존재를 요구 | FN 을 **실제 삽입한 경우에만** 요구 |

교정 후 후보 15,371건 전량이 대상이 되고 사람 검토는 13건(FN 경계)만 남았다.

## 7. 렌더 검증

FN·삼중작업 전량 + 조합별 표본 = **181 문서 × 430/820/1280 = 543 렌더**.

| 검사 | 결과 |
|---|---|
| 페이지/요소 overflow · 클리핑 | **0 / 0 / 0** |
| 빈 `h2`·`ul`·`li` / 빈 section | **0 / 0** |
| `이런 분께` 화면 노출 | **0** |
| 전문가 문구 누락 | **0** |
| footer 위치 오류 (카드 마지막 요소가 아님) | **0** |
| 기능성 절 누락 | **0** |
| raw HTML 노출 | **0** |
| 판정 | **PASS** |

## 8. Apply (LIVE)

이중 게이트(`--apply` + `HFF_POLICY_APPLY_CONFIRM=YES`) · **단일 트랜잭션 15,371건** · 소요 125s.

낙관적 잠금은 DB 측 해시로 수행했다 — 15,371건의 `oldContent` 전문을 manifest 에 담으면 100MB 급이 되어 커밋이 불가능하므로, `encode(sha256(convert_to(content,'UTF8')),'hex') = oldContentHash` 조건을 WHERE 에 넣었다.

| 항목 | 값 |
|---|---|
| expected / actual UPDATE | **15,371 / 15,371** |
| rollback | 없음 |
| INSERT / DELETE | 0 / 0 |
| SPD 총수 | 120,118 → **120,118** (불변) |
| ko canonical 총수 | 40,913 → **40,913** (불변) |
| **기능성 섹션 부재** | **14 → 13** |
| **`이런 분께`** | **15,435 → 127** (−15,308) |
| **전문가 문구 부재** | **13,955 → 127** (−13,828) |
| HFF canonical | 40,913 → **40,913** (불변) |

## 9. 독립검증 (별도 read-only 세션)

| 검사 | 결과 |
|---|---|
| 대상 new hash 일치 | **15,371 / 15,371** |
| old hash 잔존 | **0** |
| 속성 drift | **0** |
| 대상 내 `이런 분께` 잔존 | **0** |
| 대상 내 전문가 문구 누락 | **0** |
| 표준 절 중복 | **0** |
| 기능성 절 누락 | **0** |
| **rollback 역연산 복원 (해시 대조)** | **15,371 / 15,371** |
| 대상 밖 갱신 | **0** |
| canonicalDup | **0** |
| **EN 문서 변경** | **0** |
| Agent 9 HOLD 348 | **348 불변** |
| HFF canonical | **40,913 불변** |
| 판정 | **PASS** |

### 9-1. rollback 역연산 정밀화 (교정 기록)

최초 rollback 계약은 `이런 분께` 재삽입 위치를 `</div><div class="sd-foot">` 직전으로 **가정**했는데, 해당 section 이 `sd-body` 의 마지막 요소가 아닌 문서 **271건**에서 복원이 실패했다.

→ AUD 대상 전량에 대해 재삽입 offset 을 **탐색·해시 검증**해 manifest 에 고정했다. 271건 offset 교정 후 **15,371 / 15,371 복원 검증 통과**.

최종 역연산 계약:

```
순서: FOOT → FN → AUD
FOOT : footerClauseAdded 를 ' '+clause 로 제거
FN   : fnInsertedBlock 제거
AUD  : audienceRemovedHtml 을 audienceReinsertOffset 위치에 삽입
검증 : sha256(복원본) == oldContentHash
```

## 10. 최종 왜-family 한국어 계약 감사

| 지표 | 값 |
|---|---|
| ko canonical 총수 | **40,913** |
| 왜-family | 15,371 |
| 공식 기능성 섹션 보유 | **40,900** |
| 기능성 섹션 부재 | **13** (전량 사람 검토) |
| **`이런 분께` 잔여 (왜-family)** | **0** |
| `이런 분께` 잔여 (비-왜-family, 범위 밖) | 127 |
| 전문가 문구 보유 | **40,786** |
| 전문가 문구 부재 (비-왜-family, 범위 밖) | 127 |
| `sd-foot` 보유 | **40,913 (전량)** |
| `sd-func` 사용 (ko) | 8,718 — 직전 WO CSS 로 정상 렌더 |
| canonicalDup | **0** |

**왜-family 한국어 계약은 이번 WO 로 완결됐다.** 잔여는 기능성 13건(사람 판단)과 범위 밖 비-왜-family 127건뿐이다.

## 11. 산출물

```
hff-ko-why-family-policy-cleanup-targets-v1.json
hff-ko-why-family-remaining-14-decisions-v1.json
hff-ko-why-family-policy-cleanup-rollback-v1.json
hff-ko-why-family-policy-cleanup-render-audit-v1.json
hff-ko-why-family-policy-cleanup-apply-results-v1.json
hff-ko-why-family-policy-cleanup-human-review-v1.jsonl
hff-ko-why-family-policy-cleanup-independent-verification-v1.json
hff-ko-why-family-policy-cleanup-post-corpus-audit-v1.json
```

+ HFF 전용 script 6개 · 본 CHECK. 임시 파일(적용용 newContent 전문 캐시 포함) 전량 삭제.

## 12. 남은 사람 검토

| 사유 | 건수 |
|---|---|
| 기능성 절 경계 확정 불가 (`BOUNDARY_UNRESOLVED`) | **13** |

파일: `hff-ko-why-family-policy-cleanup-human-review-v1.jsonl`

## 13. 다음에 크게 묶을 작업

| 항목 | 규모 | 성격 |
|---|---|---|
| 기능성 13건 | 13 | 사람 경계 확정 |
| **비-왜-family 127건** | 127 | `이런 분께` + 전문가 문구 동시 부재. 어느 family 인지 먼저 식별 필요 |
| **EN canonical 정합** | 8,716 | ko 에서 제거한 `이런 분께`·보완한 전문가 절의 **영문 대응 미반영** — ko/en 비대칭 발생 |

> **EN 비대칭이 이번 작업의 가장 큰 후속 항목이다.** ko 15,308건에서 `이런 분께` 를 제거했으나 EN 쌍은 손대지 않았으므로 두 언어의 섹션 구성이 달라졌다. WO 가 EN 변경을 금지했으므로 의도된 결과이지만, 다음 WO 에서 EN 계약을 함께 정리해야 한다.

## 14. 함정 기록

1. **"footer 부재" 를 요소 부재로 읽지 말 것** — `sd-foot` 는 40,913건 전량 보유하고, 없는 것은 전문가 안내 **문구**다.
2. **검사는 절대값이 아니라 회귀로** — 기존 문서가 이미 보유한 정의 밖 class·중복 기능성 헤딩을 절대 검사로 잡으면 무관한 문서까지 탈락한다(본 작업 349건).
3. **rollback 역연산 위치를 가정하지 말 것** — 제거 위치를 구조 패턴으로 추정하면 예외 문서에서 복원이 깨진다(271건). offset 을 해시 검증으로 확정해 manifest 에 담을 것.
4. **대규모 rollback 은 전문 저장 금지** — 15k 건 old/new 전문은 100MB 급이다. 역연산 정보 + 해시로 저장하고, 낙관적 잠금은 DB 측 `sha256(convert_to(content,'UTF8'))` 로 수행한다.
5. 왜-family 전문가 안내는 `sd-cta` 가 아니라 **`sd-foot` 말미 절**이다. driver 계약을 가져오면 family 불일치.
6. `이런 분께` 제거 시 section 직후가 전량 `</div>` 임을 먼저 확인했기에 정확 제거가 가능했다 — 구조 균일성 확인 없이 정규식 제거 금지.

---

*작성: 2026-07-30*
