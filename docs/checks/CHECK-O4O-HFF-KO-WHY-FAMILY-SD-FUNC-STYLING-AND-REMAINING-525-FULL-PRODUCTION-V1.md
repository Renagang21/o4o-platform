# CHECK-O4O-HFF-KO-WHY-FAMILY-SD-FUNC-STYLING-AND-REMAINING-525-FULL-PRODUCTION-V1

`sd-func` 스타일 계약 확정 + 왜-family 기능성 섹션 부재 잔여 **525건 전수 판정 · 511건 적용**

- 근거 WO: `WO-O4O-HFF-KO-WHY-FAMILY-SD-FUNC-STYLING-AND-REMAINING-525-FULL-PRODUCTION-V1`
- 기준 커밋: `16c50886e` (HEAD 조상 확인)
- 착수 HEAD: `66dcfde5c` (= `origin/main`)
- 판정: **PASS** — A안 CSS 적용 · 511건 backfill · 기능성 섹션 부재 **525 → 14**

---

## 1. 실행 조건

| 항목 | 결과 |
|---|---|
| `ide_selection` | 없음 |
| 작업트리 | 타 세션 WIP(`MM pnpm-lock.yaml`) — **미접촉** |
| DB read-only | 감사·판정·독립검증 전 세션 `SET default_transaction_read_only = on` |
| 변경한 공용 파일 | `packages/content-editor/src/components/ContentRenderer.tsx` (CSS **+874 bytes / 셀렉터 5개**) |
| targeted 검증 | `@o4o/content-editor` typecheck **통과** · build **성공** |
| 전체 앱 build | 미실행 (WO 지시대로) |

---

## 2. sd-func 사용 구조 실측 — 요청서 수치 정정

| 항목 | 값 |
|---|---|
| **`sd-func` 사용 문서** | **17,432** (요청서·직전 보고 8,277 → **정정**) |
| 언어 구성 | ko **8,716** + en **8,716** (완전 1:1 쌍) |
| `source_type` | 전량 `o4o_hff_generated` |
| `description_type` | 전량 `STORE` |
| 태그 종류 | **`<ul>` 단독** (17,432/17,432) |
| h2 직후가 아닌 위치 사용 | **0** |
| 내부 구조 | `<li><b>원료</b><ul class="sd-why">…` **17,432/17,432 균일** |
| 평문/텍스트 변형 | **0** |
| 미정의 class (사용 문서 전체) | **`sd-func` 단 하나** |

> 직전 보고의 8,277 은 `왜 이 제품인가` + `원료별 공식 인정 기능성` 조합만 센 값이었다. 실제 총량은 17,432 이며 en 쌍이 절반이다.

### 2-1. 헤딩 문맥 (용도 단일성 근거)

| 헤딩 | 건수 |
|---|---|
| `원료별 공식 인정 기능성` | 8,355 |
| `Officially recognised functions by ingredient` | 8,355 |
| `공식 인정 기능성` / `Officially recognised functions` | 282 / 282 |
| `관절·피부 원료별 공식 인정 기능성` (+ en) | 79 / 79 |

**전 헤딩이 기능성 목적**이며 다른 의미 사용은 0건이다.

### 2-2. 판정 로직 결함 1건 (교정 기록)

1차 판정에서 `optionAViable: false` 가 나왔으나 **판정 로직 결함**이었다.

| 결함 | 내용 | 교정 |
|---|---|---|
| 언어 편향 | 헤딩 검사를 `/기능성/` 로만 수행 → en 문서 8,716건이 "기능성 아님" 으로 오판 | `/기능성\|function/i` 로 언어 중립화 |
| family 검사 오용 | `왜 이 제품인가` 존재로 family 판정 → en 문서는 영문 헤딩이라 전부 family 밖으로 오판 | 구조 균일성·태그·source_type·description_type 기준으로 대체 |

교정 후 **`optionAViable: true`** — 모든 축에서 단일 용도·균일 구조.

---

## 3. 선택한 처리안 — **A안** (저장 콘텐츠 무변경)

근거:

```
sd-func 는 기능성 목록 용도로만 사용됨 (다른 의미 0)
구조 100% 균일 (ul + li>b + 중첩 ul.sd-why)
h2 직후 위치 100%
HFF STORE 한정, 다른 서비스 콘텐츠 미사용
→ 17,432건 UPDATE(B안) 없이 CSS 지원만으로 해결 가능
```

B안(8,277~17,432건 canonical UPDATE)은 저장 콘텐츠를 건드려야 하므로 채택하지 않았다.

### 3-1. 변경 범위 (최소)

`.store-desc-content .sd-func` 하위 전용 셀렉터 **5개**, 기존 토큰(`--sd-navy`)만 사용. 새 색상·카드·아이콘·UI 패턴 없음.

```
.sd-func            list-style:none; margin/padding:0; flex column; gap:14px
.sd-func>li         margin/padding:0
.sd-func>li>b       block; 15px/800; var(--sd-navy)
.sd-func .sd-why    display:block (중첩 목록 1열 고정)
.sd-func .sd-why li:last-child  border-bottom:0
```

중첩 `sd-why` 를 1열로 고정한 이유: 상위 `sd-why` 는 `@container (min-width:640px)` 에서 2열 grid 가 되는데, 원료 그룹 내부에서 2열이 되면 **원료별 절이 좌우로 섞여** 귀속이 흐려진다.

---

## 4. sd-func 렌더 회귀 결과

변경 전/후 CSS 를 각각 주입해 **동일 콘텐츠로 실측 대조**했다.

| `.sd-func` computed | 변경 전 | 변경 후 |
|---|---|---|
| `list-style-type` | **`disc`** (브라우저 기본 = 무스타일 확증) | **`none`** |
| `padding-left` | **`40px`** | **`0px`** |
| `display` | `block` | `flex` |
| `row-gap` | `normal` | `14px` |

| 검사 | 결과 |
|---|---|
| sd-func 문서 12건(ko 8 + en 4) × 430/820/1280 | 텍스트 길이·li 수 **보존** · overflow·클리핑·빈 li **0** · 중첩 목록 1열 |
| **sd-func 비사용 문서 12건 회귀 대조** | **전 폭 지표 완전 동일 (회귀 0)** |
| 판정 | **PASS** |

> 작업 중 오류 1건: CSS 주석에 backtick 을 써서 템플릿 리터럴이 조기 종료되어 typecheck 가 깨졌다(`TS1005`). 주석에서 backtick 을 제거하고 그 금지 사유를 코드 주석으로 남겼다.

---

## 5. 잔여 525건 전수 판정

| 상태 | 건수 |
|---|---|
| **SAFE_APPLY** | **511** |
| **HUMAN_REVIEW** | **14** |
| NO_CHANGE / BLOCKED_SOURCE / BLOCKED_STRUCTURE / FAILED_SYSTEM | 0 / 0 / 0 / **0** |
| 합계 | **525** ✅ |

### 5-1. 직전 WO 판정이 과도하게 엄격했음 (정정)

직전 WO 는 이 525건을 전부 `HUMAN_REVIEW`(457=마커 부재)로 분류했다. **원인은 데이터가 아니라 파서였다.**

| 결함 | 내용 |
|---|---|
| 마커 정규식 누락 | `①~⑮`·`(가)` 만 인정 → `1)` `1.` `·` `•` `-` 형태 전부 미인식 |
| 원료 헤더 미처리 | `* 프로바이오틱스` / 맨이름 헤더 라인을 절로 오인 |
| 단일 평문 라인 미처리 | 마커 없는 1행 = 명백한 1절인데 불확정 처리 |

형태 실측 분포:

| 형태 | 건수 |
|---|---|
| 단일 라인 평문 (마커 없음) | 358 |
| 닫힌 라벨 + 마커 절 라인 | 102 |
| `*` 원료 헤더 + 마커 절 | 52 |
| 맨이름 헤더 + 마커 절 | 7 |
| 닫힌 라벨 다원료 | 2 |
| `·` 불릿 절 | 2 |
| 기타 | 2 |

### 5-2. 확장한 안전 규칙

| 규칙 | 조건 | 적용 |
|---|---|---|
| `R-A` | 단일 라인 · 대괄호/`*` 없음 → 라인 전체 1절 (선두 불릿 마커 제거, 인라인 `원료 :` 라벨 분리) | **358** |
| `R-B` | 1행 원료 헤더 + 이후 마커 절 라인들 | **71** |
| `R-B2` | 1행 원료 헤더 + 단일 절 라인 | **79** |
| `R-C` | 헤더 없이 전 라인이 불릿 절 | **1** |
| `R-D` | 닫힌 라벨 다원료 → `sd-func` idiom | **2** |

절 분할은 **라인 단위**만 사용했다. 라인 내부의 `･`·`•`·`,` 재분할은 하지 않았다(원문 충실 — 예: `유산균 증식 및 유해균 억제･배변활동 원활･장 건강에 도움을 줄 수 있음` 은 1절로 유지).

### 5-3. HUMAN_REVIEW 14건

| 사유 | 건수 |
|---|---|
| `BOUNDARY_UNRESOLVED` | 13 |
| `CLAUSE_TRAILING_DELIMITER_ARTIFACT` (포거트 — 절 끝 쉼표 + 중복) | 1 |

---

## 6. 삽입 계약

```
단일 원료군 : <h2>공식 인정 기능성</h2><ul class="sd-why"><li>절</li>…</ul>      (선례 5,702건)
다원료      : <h2>원료별 공식 인정 기능성</h2><ul class="sd-func"><li><b>원료</b><ul class="sd-why">…  (선례 8,355건)
위치        : 왜 이 제품인가 직후 / 섭취방법 앞 (anchor 유일성 검증)
```

## 7. 수동 검토 + 전량 정밀 검사

규칙별 표본 수동 검토(≥60, R-A/R-B/R-B2/R-C/R-D 전 규칙) 중 결함 2건을 발견해 규칙을 보강했다.

| 발견 | 조치 |
|---|---|
| `- 프로바이오틱스 : 유산균…` — **선두 불릿 `- ` 와 원료 프리픽스가 절 안에 혼입** | 선두 불릿을 마커로 인식해 제거 + 인라인 `원료 :` 라벨 분리(R-B 와 동일 계약으로 라벨 생략) |
| `프로바이오틱스 : 유산균…` — 원료 프리픽스 혼입 | 동일 |

이후 표본에 그치지 않고 **SAFE 511건 전량 정밀 검사**를 수행했다.

| 검사 | 결과 |
|---|---|
| 절 원문 verbatim 위반 | **0** |
| 선두 마커 잔존 | **0** |
| 절 끝 분리자 잔존 | **0** |
| 절 내 대괄호 | **0** |
| 번호 마커 잔존 | **0** |
| 라벨 verbatim 위반 | **0** |
| 절 중복 | **0** |
| 단일 그룹에 라벨 삽입(계약 위반) | **0** |
| 다원료인데 `sd-func` 미사용 | **0** |
| 헤딩 어휘 계약 위반 | **0** |
| 판정 | **clean** |

## 8. 렌더 검증 (SAFE 전량)

래퍼 computed-style 증명: `.sd-card` max-width `none` → **`860px`**, radius `0px` → **`20px`**, `.sd-hero` padding `0px` → **`40px 34px 32px`** (`cssActuallyApplied: true`).

| 검사 (511건 × 430/820/1280 = **1,533 렌더**) | 결과 |
|---|---|
| 페이지 overflow / 요소 overflow / 클리핑 | **0 / 0 / 0** |
| 빈 `h2`·`ul`·`li` | **0** |
| 기능성 절 누락 | **0** |
| footer 누락 / 미정의 class | **0 / 0** |
| 헤딩 순서 오류 / 섹션 누락 | **0 / 0** |
| **패치가 새로 들여온 raw bracket** | **0** (기존 `표시량[…]` 공식 표기 93 은 회귀 아님) |
| 판정 | **PASS** |

## 9. Apply (LIVE)

이중 게이트(`--apply` + `HFF_WF525_APPLY_CONFIRM=YES`) · **단일 트랜잭션 511건**.

WHERE: `id` · `master_id` · `STORE` · `canonical` · `ko` · `deleted_at IS NULL` · **`content = oldContent`**(낙관적 잠금).

| 항목 | 값 |
|---|---|
| expected / actual UPDATE | **511 / 511** |
| rollback | 없음 |
| INSERT / DELETE | 0 / 0 |
| SPD 총수 | 120,118 → **120,118** (불변) |
| STORE/ko canonical | 63,321 → **63,321** (불변) |
| **기능성 섹션 부재** | **525 → 14** (−511) |
| HFF canonical | 40,913 → **40,913** (불변) |
| 복원 절 수 | **631** |

트랜잭션 내 사후검증: **전량 hash 대조** · canonicalDup 0 · 총행수 불변 · `without_fn` 델타 정확 −511 → COMMIT.

## 10. 독립검증 (별도 read-only 세션)

| 검사 | 결과 |
|---|---|
| 대상 new hash 일치 | **511 / 511** |
| old hash 잔존 | **0** |
| 속성 / candidate·ProductMaster drift | **0 / 0** |
| 삽입 블록 외 byte drift | **0** |
| 공식 절 노출 / 기대 | **631 / 631** |
| 절 원문 verbatim 위반 | **0** |
| 기능성 섹션 중복 | **0** |
| `sd-intro` / footer drift | **0 / 0** |
| renderer family drift | **0** |
| **대상 밖 14건 drift** | **0** |
| 판정 | **PASS** |

## 11. 전체 corpus 사후 감사

| 항목 | 값 |
|---|---|
| SPD 총수 / STORE-ko canonical | 120,118 / 63,321 (불변) |
| **기능성 섹션 부재 BEFORE → AFTER** | **525 → 14** |
| 누적 복원(직전 WO 300 + 본 WO 511) | **811 / 825** (98.3%) |
| HFF canonical | **40,913 불변** |
| **Agent 9 HOLD 348** | **348 전부 canonical 미보유 유지 — 불변** |
| canonicalDup / manifest 밖 write | 0 / 0 |
| `sd-func` 정상 표시 | **17,432건** (CSS 지원 · 저장 콘텐츠 무변경) |
| 판정 | **PASS** |

## 12. 산출물

```
hff-ko-sd-func-usage-and-style-audit-v1.json
hff-ko-sd-func-render-regression-v1.json
hff-ko-why-family-525-classification-v1.json
hff-ko-why-family-525-safe-targets-v1.json
hff-ko-why-family-525-human-review-v1.jsonl
hff-ko-why-family-525-rollback-manifest-v1.json
hff-ko-why-family-525-render-audit-v1.json
hff-ko-why-family-525-apply-results-v1.json
hff-ko-sd-func-and-525-independent-verification-v1.json
hff-ko-sd-func-and-525-post-corpus-audit-v1.json
hff-ko-why-family-525-review-queue-delta-v1.jsonl
```

+ HFF 전용 script 6개 · 공용 renderer CSS 1개 · 본 CHECK. 임시 script 전량 삭제.

rollback 은 manifest 의 `oldContent`/`oldContentHash` 로 511건 복원 가능. CSS 는 셀렉터 5개 제거로 원복 가능.

## 13. 다음에 크게 묶어 처리할 잔여

| 항목 | 규모 | 성격 |
|---|---|---|
| 기능성 섹션 부재 잔여 | **14** | 경계 확정 13 + 분리자 아티팩트 1 — 사람 판단 |
| `이런 분께` 섹션 | 15,435 | 정책(구매지원 내러티브 축) |
| 전문가 문의 footer 부재 | 13,955 | CLAUDE.md 콘텐츠 원칙 |
| en 쌍 기능성 섹션 | 8,716 | ko 복원분(811)의 영문 대응 미확인 — **별도 조사 필요** |

`sd-func` 문제는 본 WO 로 종결됐다(CSS 지원). 남은 두 정책 문제(15,435 / 13,955)는 왜-family 저작 계약 자체의 문제이므로 **하나의 정책 WO 로 묶는 것이 효율적**이다.

## 14. 함정 기록

1. **중첩 `<li>` 추출 — 본 작업에서 3회 재발**. `sd-func` 구조(`<li><b>라벨</b><ul class="sd-why"><li>절</li></ul></li>`)에서 단순 `<li>…</li>` 정규식은 라벨+절을 한 문자열로 붙여 **허위 not-verbatim / 허위 clause-missing** 을 만든다. 스캔·렌더·독립검증 **모든** 검증기에서 최말단 `<li>` 만 취해야 한다.
2. **CSS 템플릿 리터럴 주석에 backtick 금지** — `storeDescriptionCss` 는 template literal 이라 주석의 backtick 이 리터럴을 종료시킨다(`TS1005`).
3. **존재/용도 판정을 단일 언어 어휘로 하지 말 것** — sd-func 는 ko/en 1:1 쌍이며 en 헤딩은 `Officially recognised functions…` 다.
4. **파서 엄격도를 데이터 특성으로 착각하지 말 것** — 직전 WO 의 "마커 부재 457" 은 실제로 파서가 `1)` `1.` `·` `-` 와 원료 헤더를 몰라서 생긴 수치였다. 형태 분포를 먼저 실측할 것.
5. **선두 불릿(`- ` `· `)은 내용이 아니라 마커** — 제거하지 않으면 렌더 항목에 그대로 노출된다.
6. 중첩 `sd-why` 는 1열 고정 — 상위 `sd-why` 의 2열 grid 가 상속되면 원료별 절이 좌우로 섞인다.
7. `rawBracket` 은 회귀 검사로 — `표시 기준` 의 `표시량[…]` 은 공식 표기다.

---

*작성: 2026-07-30*
