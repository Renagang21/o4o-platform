# O4O ChatGPT 앱 등록안 (공개 제출 전 확인용)

> **2026-10-27 우선 안내:** [첫 출시 준비](../../../../../../docs/design/DESIGN-O4O-CHATGPT-FIRST-RELEASE-PREPARATION-V1.md)를 먼저 사용한다. 아래 10월 24일 ZIP/plugin.json 안내는 당시 기록으로, 현행 제출 규격·redirect를 재확인하지 못했다. 공식 페이지 접속 실패를 구형 플러그인 증거로 취급하지 않는다. 이 문서나 기존 JSON을 확정된 업로드 파일로 사용하지 않는다.

> **2026-10-26 개발 정합:** 아래 8개 목록과 JSON은 당시 제출 초안 기록이다. 현재 콘텐츠 계약은 상품별 3개를 포함한 11개이며, 신규 개인 메일은 기본 OFF다. 메일을 활성화하면 도구 10개·별도 조회/관리/본문 scope가 추가된다. [메일 계약](../../../../../../docs/design/DESIGN-O4O-PERSONAL-MAIL-MCP-V1.md)을 참조하고 실제 제출 전에 현재 활성 도구·동의·개인정보 고지·제공자 공개 조건으로 다시 검증한다. 메일 개발·fixture 성공은 공개 제출이나 승인을 뜻하지 않는다.

> 상태: DRAFT — 공개 제출 전 사용자 확인 필요 · 작성일: 2026-10-23 · 최종 갱신: 2026-10-24
> **2026-10-24 당시 등록 절차 기록**: plugin.json·mcp.json·참조 자산을 포함한 ZIP 제출로 기록했다. 현행 여부는 미확인이다. [기존 등록 준비 자료](../../../../../../docs/design/DESIGN-O4O-CHATGPT-PUBLIC-SUBMISSION-PACK-V1.md)의 패키지 예시와 같은 폴더의 [기존 JSON](chatgpt-app-submission.json)은 재검토용 참고 자료이며 확정된 제출 파일로 올리지 않는다. 첫 출시 소개 대상은 약국이며 아래 넓은 adapter 범위를 전부 검증·활성화한 것으로 소개하지 않는다.
> 근거: 도구 정의·annotation 은 `../mcp/mcp.routes.ts`, 동작은 `../tools/tool.service.ts` · `../adapters/*` 를 직접 확인했다.
> 원래 로컬 scratchpad 의 `app-submission-draft.md` 는 이 PC 에서 찾지 못했다. 이 문서는 코드·CHECK 기준으로 새로 작성했다 — 원본이 다른 PC 에 있으면 차이를 대조한다.

## 1. 앱 정보

| 항목 | 값 | 비고 |
|---|---|---|
| 앱 이름 | O4O | |
| 부제(30자 이하) | O4O workspace content drafts | 국문 병기 필요 시: "O4O 작업공간 콘텐츠 초안" |
| 분류 | PRODUCTIVITY | BUSINESS 도 가능 — 사용자 선택 |
| 설명 | JSON `app_info.description` | 연결 시 허용한 작업공간만, 초안은 비공개 저장·게시는 O4O 화면에서 |
| MCP 서버 URL | `<EXTERNAL_AI_ISSUER_URL>/api/external-ai/mcp` | 값은 저장소 variable `EXTERNAL_AI_ISSUER_URL` |
| 인증 | OAuth 2.1 (authorization code + PKCE S256 · 동적 client 등록 · refresh 회전) | 반환 주소는 `EXTERNAL_AI_REDIRECT_URIS` 허용 목록만 |
| 개인정보처리방침 | `<EXTERNAL_AI_WEB_ORIGIN>/privacy` | 외부 AI 연결 항목 반영 여부 사용자 확인 |
| 이용약관 | `<EXTERNAL_AI_WEB_ORIGIN>/terms` | |

## 2. 도구 8개 (annotation 은 코드와 일치)

| 도구 | readOnly | openWorld | destructive | 동작 |
|---|---|---|---|---|
| list_workspaces | true | false | false | 연결에 허용한 작업공간·예제 조회 |
| search_products | true | false | false | 작업공간 취급 상품 검색 |
| get_product_context | true | false | false | 상품 사실·출처별 설명 조회 |
| list_materials | true | false | false | 자료함·게시판 참고 자료 목록 |
| get_material | true | false | false | 참고 자료 본문(첨부·외부 URL 미개방) |
| save_content_draft | false | false | false | 비공개 초안 생성(requestId 재시도 멱등) |
| update_content_draft | false | false | true | 본인 비공개 초안 덮어쓰기(최신 revision 필수, 공개·검수 중 거부) |
| get_content_draft | true | false | false | 저장 결과·revision·O4O 열기 주소 |

이번 변경으로 쓰기 도구는 권한과 무관하게 항상 목록에 나온다. 초안 권한 없는 연결에서 호출하면 `SCOPE_FORBIDDEN` 과 재연결 안내를 돌려준다.

## 3. 시험 사례

JSON 의 positive 5건 · negative 3건. 심사자는 약국 경영자 Demo 계정 기준 시나리오로 재현할 수 있다(아래 4 확인 후).

## 4. 제출 전 사용자 확인 항목 (미확정)

| 항목 | 상태 |
|---|---|
| OpenAI 개발자(조직) 인증 | 사용자 진행 |
| 도메인 확인 토큰 | 사용자 발급 — 토큰 값은 저장소·문서에 기록하지 않는다 |
| 심사용 계정 | 공개 Demo 계정 사용 여부 결정 — 비밀번호는 제출 양식에만 입력, 이 문서에 쓰지 않는다 |
| 시연 영상 | 연결 → 조회 → 초안 저장 → O4O 화면 확인 → 연결 해제 흐름 녹화 |
| 로고 | 정사각 아이콘 파일 준비 |
| 지원 연락처 | 공식 지원 메일/페이지 — 개인 메일 사용 금지 |
| 개인정보처리방침의 외부 AI 연결 문구 | 조회 자료가 연결한 AI 로 전달됨 · 연결 해제 방법 명시 여부 |

## 5. 심사 관점 점검 결과

- **outputSchema 없음 (8개 도구 전부)** — 제출 차단 사유는 아니다. 모델이 결과를 더 안정적으로 쓰도록 추가 권장(별도 작업). 현재 결과는 `structuredContent` 로도 반환한다.
- **민감정보 요청 필드 없음** — 입력은 작업공간·상품·자료 식별자와 초안 제목/본문뿐. 단 본문은 자유 텍스트이므로 사용자가 환자·고객 정보를 넣을 수 있다 → 설명·도구 안내에 "개인 건강정보를 넣지 말 것" 문구 추가 검토.
- **도구 이름·설명** — 동작과 일치. 게시·검수·주문·결제 기능 없음을 설명에 명시했다.
- **위젯 CSP** — 위젯(UI 리소스)을 제공하지 않으므로 해당 없음.
- **의약품 정보** — 상품 문맥이 의약품을 포함할 수 있다. 헤모텐캡슐 설명 불일치 조사 결과(CHECK §8)에 따라 설명 출처 표시·확인 문구 보완 여부를 제출 전에 판단한다.
