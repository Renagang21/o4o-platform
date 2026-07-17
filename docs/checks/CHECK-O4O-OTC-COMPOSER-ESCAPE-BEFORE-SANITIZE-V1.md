# CHECK-O4O-OTC-COMPOSER-ESCAPE-BEFORE-SANITIZE-V1 — composer escape-before-sanitize 보강

WO: `WO-O4O-OTC-COMPOSER-ESCAPE-BEFORE-SANITIZE-V1` · 일자: 2026-07-17 · 상태: **완료**
근거: [SOURCE-RECOVERY IR §5](../investigations/IR-O4O-OTC-OFFICIAL-SOURCE-RECOVERY-AUDIT-V1.md) · [SAMPLE-VALIDATION §0-2](./CHECK-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-VALIDATION-V1.md)

> **코드 보강만.** DB write **0** · 외부 API 재수집 **0** · 기존 설명서 복구 **0** · 첨가제 분리 **0**.
> NB_DOC 대량 재수집의 **선행 작업** — 원문에 `<`/`>`/`&`(및 `&lt;` 엔티티)가 들어와도 write-path 에서 유실되지 않게 한다.

---

## 0. 결론

> **원문 텍스트를 HTML 조합 전에 escape 한다(기존 유효 엔티티는 보존). bare `< 10mL/min` 과 `&lt; 10mL/min` 모두 화면에 `< 10mL/min` 로 표시되며, 문장 유실·이중 escape·injection 이 모두 해소된다.**

---

## 1. 문제 (기존 결함 실증)

`composeEasyDrugContent` 는 원문 값을 escape 없이 `<p>…${v}…</p>` 에 삽입한 뒤 `sanitizeDescriptionHtml`(DOMPurify)을 적용했다. 허가 원문은 **plain text** 지만 `AST<3배`, `혈소판<10만` 처럼 `<` 가 문자·숫자에 바로 붙는 표기를 담는다. 이때 DOMPurify 가 이를 **태그로 파싱**해 문장을 삼킨다.

| 입력 | 기존(escape 없음) 결과 | 판정 |
|---|---|:---:|
| `A<B 이고 C>D 이다` | `<p>A<b>D 이다</b></p>` — **"B 이고 C" 유실 + 구조 오염** | ❌ |
| `청소율 <10mL/min` | `청소율 &lt;10mL/min`(`<`+숫자는 DOMPurify 가 살림) | ⚠️ 우연히 생존 |
| `<script>…</script> 신부전` | `신부전`(script 통째 제거 → **주변 문맥 유실**) | ❌ |

> 실측: `A<B` 처럼 `<` 뒤에 **ASCII 문자**가 오면 실제 태그(`<b>`)로 파싱되어 유실. e약은요 유실(172건)은 source-side 였으나, **재수집 NB_DOC 에 같은 표기가 있으면 write-path 에서 재유실**될 수 있어 선행 보강이 필요.

---

## 2. 수정

**파일**: [`easy-drug-shared-description-derive.service.ts`](../../apps/api-server/src/modules/neture/drug-import/easy-drug-shared-description-derive.service.ts)

- `escapeHtmlPreservingEntities(text)` 신규 export.
  - bare `<` → `&lt;`, `>` → `&gt;`.
  - `&` 는 **유효 엔티티의 시작이 아닐 때만** `&amp;` 로 escape → `&lt;`/`&gt;`/`&amp;`/`&nbsp;`/`&#60;` 이중 escape 방지.
  - 정규식: `/&(?!(?:[a-zA-Z][a-zA-Z0-9]{0,31}|#\d{1,7}|#x[0-9a-fA-F]{1,6});)/g`
- `composeEasyDrugContent` 가 원문 값 삽입 전 이 함수를 적용(label 은 고정 상수라 제외). 이후 기존 `sanitizeDescriptionHtml` 순서 그대로.

> **불변**: 조합 구조(`<p><strong>label</strong><br/>…</p>`) · 섹션 목록 · sanitize-on-write 계약 무변경. 특수문자 없는 일반 텍스트 입력은 escape 무영향(회귀 0).

---

## 3. 검증

**테스트**: [`__tests__/composer-escape-before-sanitize.test.ts`](../../apps/api-server/src/modules/neture/drug-import/__tests__/composer-escape-before-sanitize.test.ts) — **11 case PASS** (jest).

WO 지정 입력 + write-path 재현 결과:

| 입력 | write-path 결과 | 판정 |
|---|---|:---:|
| `A<B 이고 C>D 이다` | `A&lt;B 이고 C&gt;D 이다` (`<b>` 없음) | ✅ 유실 0 |
| `청소율 <10mL/min` (bare) | `청소율 &lt;10mL/min` | ✅ |
| `청소율 &lt;10mL/min` (엔티티) | `청소율 &lt;10mL/min` (동일) | ✅ 이중 escape 없음 |
| `A > B` / `A & B` | `A &gt; B` / `A &amp; B` | ✅ |
| `괄호(참고)와\n줄바꿈 …` | 원문 그대로 | ✅ 회귀 0 |
| `<script>…</script> 신부전 …` | `&lt;script&gt;…` + `신부전 …` 보존 | ✅ injection 차단 + 문맥 유실 0 |

**확인 항목** (WO):

- 문장 유실 **0** ✅
- 이중 escape **없음** ✅ (`&amp;lt;` 미발생)
- HTML injection 차단 유지 ✅ (escape + sanitize 2중)
- 기존 설명서 출력 회귀 **0** ✅
- typecheck: 변경 2파일 오류 0 ✅ (기존 무관 스크립트 3건은 별건 — 병렬 세션 유래 중복선언, 본 WO 범위 밖)
- test: 11/11 PASS ✅

---

## 4. 제외 / 다음

- 제외: 외부 API 재수집 · DB write · 기존 설명서 복구 · 첨가제 그룹 분리.
- **다음**: NB_DOC 대량 재수집 → 유실 172건 복구 → 첨가제 서브그룹 분리. 재수집 composer 는 본 escape 함수를 재사용한다.
