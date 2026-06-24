# CHECK-O4O-STANDARD-EDITOR-HTML-DIRECT-INPUT-PREVIEW-SAVE-FIX-V1

> 표준 편집기(canonical `RichTextEditor`)의 **HTML 직접 입력 모드**에서 입력값이
> 미리보기·저장과 연결되지 않던 버그 수정 검증 기록.
>
> 상위 WO: `WO-O4O-STANDARD-EDITOR-HTML-DIRECT-INPUT-PREVIEW-SAVE-FIX-V1`
> 관련 표준: `docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md` (§3.2 RichTextEditor 기반)

---

## 1. 범위

HTML 디자인 개선이 아니라 **HTML 탭 입력값이 미리보기/저장과 연결되지 않는 버그 수정**으로 한정.

- 표준 편집기 전체 구조 개편 / 새 블록 에디터 도입 / HTML 템플릿 신규 개발 → **비범위**
- QR 랜딩 렌더링 구조 변경 / OSMU 변환 기능 → **비범위**

---

## 2. 문제 확정 (근본 원인)

근본 원인은 전부 공용 `RichTextEditor`(`packages/content-editor`)에 존재.
→ HTML 탭을 쓰는 **모든 소비처**(QR / 블로그 / POP / 콘텐츠 허브 등)에서 공통 재발 구조.

| # | 증상 | 원인 |
|---|------|------|
| 2.2 | 저장 시 본문 없음 | HTML `<textarea>` `onChange` 가 로컬 `htmlSource` 만 갱신하고 부모 `onChange` 미호출 → 소비처 `form.body` 가 빈 채로 유지 |
| 2.1 | 미리보기 공백 | `switchTab` 이 HTML→미리보기 전환 시 `htmlSource` 를 빈 editor HTML(`<p></p>`)로 **덮어씀** → draft 소실 |
| 2.3 | 초기 `<p></p>` 노출 | 빈 editor HTML 을 그대로 HTML 탭에 표시 |
| 2.4 | `</div></p>` 잔여 | 직접 입력 경로 sanitize/normalize 누락 |

---

## 3. 수정 내용 (최소 수정)

### 3.1 `packages/content-editor`

- **`sanitize.ts`** — 빈 본문 판정 `isBlankHtml()` 추가·export.
  `<p></p>` · `<p><br></p>` · `<div></div>` · `<br>` · 공백만 → 빈 본문.
  단, 텍스트가 없어도 `img/iframe/video/hr` 미디어가 있으면 본문 있음.
  **에디터와 소비처가 같은 정의를 공유**하도록 단일 출처로 둠.
- **`RichTextEditor.tsx`**
  - HTML `<textarea>` `onChange` → keystroke 마다 부모 `onChange({ html })` 전파.
    저장 버튼이 에디터 외부(소비처)에 있어 **탭 전환 없이 저장**되어도 반영됨. (§4.1/§4.5)
  - `switchTab` 재작성:
    - HTML 탭을 떠날 때만 draft 를 `sanitizeRichHtml` 후 editor 에 commit(`setContent(clean, /*emitUpdate*/ true)`).
      malformed wrapper(`</div></p>`)·위험 태그 정리 + 부모 본문 동기화. (§4.3/§4.5)
    - **`htmlSource`(draft) 는 보존** → 미리보기는 입력값 그대로 렌더. (§4.4)
    - 편집 탭을 떠날 때만 editor→draft 스냅샷, 빈 문서는 빈 textarea (`<p></p>` 미노출). (§4.2)
- **`index.ts`** — `isBlankHtml` re-export.

### 3.2 `services/web-kpa-society` (대상 화면: 운영자 콘텐츠 허브, "원본 유형: 직접 입력")

- **`OperatorContentHubPage.tsx`** `handleSave`
  - `isBlankHtml(form.body)` 로 빈 본문 정규화 → 저장 payload `body` 는 빈 태그 대신 `null`.
  - `source_type === 'manual'` 이면서 본문 빈 경우 "내용이 없습니다" 차단. (§5.4)

> 공용 editor 수정으로 다른 소비처(QR/블로그/POP)의 미리보기·저장도 함께 정상화.
> 각 페이지가 빈 본문을 차단하려면 export 된 `isBlankHtml` 을 동일하게 사용.

---

## 4. 코드 레벨 검증 (PASS)

| 항목 | 판정 |
|------|------|
| HTML 입력값이 부모 form 으로 전달 | PASS |
| HTML 탭에서 바로 저장해도 body 비지 않음 | PASS |
| HTML → 미리보기 전환 시 draft 소실 | PASS |
| `<p></p>` / `<p><br></p>` / `<div></div>` / `<br>` 빈 본문 판정 (단위검증) | PASS |
| `</div></p>` 비정상 잔여 태그 정리 (sanitize commit) | PASS |
| `@o4o/content-editor` `tsc --noEmit` | PASS (EXIT=0) |
| `web-kpa-society` `tsc --noEmit` | PASS (EXIT=0) |
| `content-editor` dist 재빌드(tsup) | PASS |

---

## 5. 잔여 — 브라우저 smoke (최종 종료 전제)

운영자 화면에서 1회 확인 후 최종 종료(PASS) 판정.

1. 콘텐츠 작성 화면 진입
2. 원본 유형 `직접 입력`
3. HTML 탭에 정상 HTML 입력
4. 미리보기 탭에서 표시 확인
5. 저장 성공 확인
6. 다시 열었을 때 본문 유지 확인
7. 새 콘텐츠에서 HTML 탭 최초 진입 시 `<p></p>` 미노출 확인
8. `<p></p>` 만 넣고 저장 시 "내용이 없습니다" 차단 확인

### 회귀 확인
- 편집 탭 일반 텍스트 입력 후 저장 / 미리보기
- 기존 저장 콘텐츠 수정
- HTML ↔ 편집 탭 상호 전환

---

*Status: 코드 검증 PASS / 브라우저 smoke 대기*
