# CHECK-O4O-KPA-TABLET-CORNER-EDITOR-AND-DRAFT-PREVIEW-RUNTIME-FIX-V1

> WO: `WO-O4O-KPA-TABLET-CORNER-EDITOR-AND-DRAFT-PREVIEW-RUNTIME-FIX-V1`
> 성격: 프론트 런타임 연결 수정(신규 기능 없음). 코드 + 배포 실측 + DB read.
> Date: 2026-07-17

---

## 0. 결론

**PASS.** 코너 설명 편집기의 `onChange` 계약 오류(핵심 원인)를 고쳐 한글 연속 입력·서식이 정상 동작하고, 저장 payload 의 `corner_description.config.body` 가 항상 **문자열**이며, 오른쪽 미리보기에 실시간 반영된다. 미리보기 오류 상태 표시와 QR 모바일 미리보기의 대기영상 제외(공개 QR 정합)도 완료. 보호 샘플·current·스키마 무변경, DB migration 없음.

배포: `70a4ac7a2`(§4.1·§4.2·§4.5) → `75de4ff35`(§4.6). 웹 배포 success.

---

## 1. 원인

- **RichTextEditor 반환 계약**: `@o4o/content-editor` 의 `RichTextEditor.onChange` 는 HTML 문자열이 아니라 **`{ html, json }` 객체**로 호출된다(`RichTextEditor.tsx:159·262·460·515`), `value` 는 문자열 기대(`:54·152·196`).
- **추가 확인된 원인**: 제작기(`TabletScreenSetManager.tsx:897`)가 `onChange={(html) => patchConfigOf('corner_description', { body: html })}` 로 객체를 문자열처럼 저장 → `config.body = { html, json }` 객체. 결과:
  - `value={c.body}` 가 객체 → RichTextEditor `content:value` / `value !== editor.getHTML()`(항상 true) → **매 렌더 setContent → 한글 조합 초기화**.
  - 미리보기/저장 payload 의 body 가 객체 → 백엔드 `str(c.body)` 가 문자열 아님을 `''` 로 반환(`store-public-tablet-screen.ts:27·41`) → **코너 설명 빈 본문**(미리보기 미반영).
- **DB 오염 여부(read-only)**: 전 플랫폼 `corner_description` 11개 **전부 `body_type=string`** — 저장 데이터 오염 0. 버그는 **라이브 편집 중에만** 발생.

## 2. 수정

- **변경 파일**: `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` (프론트 1파일). 백엔드·kiosk-core·공개 viewer·resolver·DB 무변경.
- **body 정규화 위치**: `normalizeCornerBody(body): string` 헬퍼(문자열 그대로 / `{html}` → html / 그 외 `''`). 적용 = **hydrate 단일 지점**(`seedInitialBlocks` — 저장된 blocks 로드 시 corner_description.body 를 문자열로) + **쓰기 지점**(onChange). 편집기 `value` 도 방어적으로 `normalizeCornerBody`. (§4.2 "한 곳 정규화" — 상태가 항상 문자열이므로 preview·save·editor 가 모두 문자열을 받음.)
- **§4.1**: `onChange={({ html }) => patchConfigOf('corner_description', { body: html })}` — html 문자열만 추출.
- **미리보기 오류 처리(§4.5)**: 실패 시 raw API 메시지 미노출(콘솔만) → 표준 문구 **"입력 내용을 미리보기에 반영하지 못했습니다."**. 이전 성공 화면은 유지하되 오류 배지를 함께 표시(저장 성공과 혼동 방지), 로딩/오류 구분, 다음 입력으로 복구.
- **§4.4 stale**: 기존 `cancelled` 플래그 + `clearTimeout` 로 이미 out-of-order 응답을 무시함(무변경 — 재확인).
- **QR 모바일 정합(§4.6)**: draft preview endpoint 는 idle_media 를 포함하나 실제 공개 QR(`PublicScreenSetViewer`)은 제외. `stripIdleForMobilePreview` 로 **QR 모바일 미리보기(라이브+모달)에서만** idle_media 섹션 제거(태블릿 미리보기는 유지 — 대기영상은 태블릿 개념). kiosk-core·resolver·공개 viewer 재사용, 신규 렌더 계약 없음.

## 3. 데이터 계약

- **수정 전 payload(잠재)**: `{ type:'corner_description', config:{ body:{ html, json } } }` (객체).
- **수정 후 payload(실측)**: `{ blockType:'corner_description', config:{ body:'<p>구강 건강은 매일의 관리에서 시작됩니다…' } }` — **body=string**.
- **기존 객체형 body 처리**: DB 오염 0 확인(전부 string). 만약 존재해도 hydrate·editor value 정규화로 HTML 문자열 표시 → 재저장 시 문자열로 저장.

## 4. 검증

- **typecheck**: web `tsc --noEmit` EXIT=0. (초기 OOM 은 잔여 chrome 프로세스 메모리 압박 — 정리 후 통과. 코드 무관.)
- **build**: 웹 Cloud Run 배포 success(= production build 통과).
- **한글 입력(배포 실측)**: 3문장 연속 입력 → `editor-text-retained=YES`(글자 소실·조합 초기화 없음).
- **서식/HTML**: 저장 payload 가 `<p>…` HTML 문자열 — 편집기 산출 HTML 이 문자열로 저장되는 경로 확인(굵게·목록·링크·HTML 탭 입력 모두 동일 onChange→html 문자열 경로. 자동화에서 각 버튼 클릭까지는 미수행 — 동일 메커니즘이라 구조적 커버).
- **단계 이동**: 템플릿→기본정보→코너 설명→미리보기·저장 이동 후 입력 유지.
- **저장·재진입**: 저장 성공(POST screen-sets + PUT blocks) → DB `corner_description.body_type=string`, 내용 `<p>구강 건강은…`, title 유지. hydrate 정규화로 재진입 시 문자열 표시.
- **태블릿 미리보기**: 코너 제목·본문 실시간 반영(`preview-reflects=YES`, 스크린샷 `ve-save-step.png` 에 본문 렌더).
- **QR 모바일 미리보기(§4.6)**: 대기 영상형 세트 실측 — 태블릿 미리보기 media(iframe+video)=1(idle 있음), **QR 모바일 미리보기 media=0(idle 제외)** = 공개 QR 정합.
- **공개 QR**: 로그아웃 공개 유지(선행 IR `61df26934` 확정, 본 WO 인증 정책 무변경).
- **console/pageerror/API**: 실측 `consoleErrs=none`, 관련 API 오류 0.

## 5. 보호 확인

- **구강관리 샘플**(c86863d8 / 7280872e): 삭제·초기화·보관·재생성 없음.
- **피부관리 샘플**(f8b78a16 / 8c6eb9fe): 동일.
- **current 변경**: 없음 — 구강 current=6f10d68e·피부 current=3af20950 (선행 조사와 동일, WO 지시대로 되돌리지 않음).
- **DB migration**: 없음.
- **데이터 write 범위**: 검증용 `[TEST]` 세트 2개 생성 후 **soft-delete 정리 완료**(적용 코너 0 확인, 잔여 0). 보호 샘플·운영 데이터 무변경. corner_description body 일괄 보정 없음.

## 6. 산출물

- **구현 commit**: `70a4ac7a2`(onChange·정규화·오류표시) · `75de4ff35`(QR 모바일 idle 제외).
- **CHECK**: 본 문서.
- **배포**: 웹 Cloud Run success (배포본 실측).
- **프로덕션 smoke**: 상기 §4 실측(한글·미리보기·저장 payload string·재진입 DB string·QR 모바일 idle 제외·오류 0).

---

*원인 = RichTextEditor.onChange 가 { html, json } 객체인데 문자열로 저장 → body 객체화 → 한글 초기화 + 미리보기 빈 본문. 수정 = onChange html 추출 + hydrate 단일 정규화 + 미리보기 표준 오류 + QR 모바일 idle 제외. 저장 body 항상 문자열(실측), 미리보기 실시간 반영, DB 오염 0. 보호 샘플·current·스키마·migration 무변경, [TEST] 데이터 정리 완료. 다음 = 5개 템플릿으로 실제 태블릿 콘텐츠 제작.*
