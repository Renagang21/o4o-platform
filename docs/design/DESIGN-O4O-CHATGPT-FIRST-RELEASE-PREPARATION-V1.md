# O4O ChatGPT 앱 첫 출시 준비

> **상태**: DRAFT · **작성일**: 2026-10-27 · **최종 갱신**: 2026-10-28 (Asia/Seoul)
> **사용자 지시**: 신원 인증 심사 중 등록 절차·문서를 정리하고 소개·로고·심사 자료를 준비한다. 첫 등록 이후 기능을 확장한다.
> **범위**: 등록 준비 문안과 확인 목록. 실제 제출·심사 승인·공개·운영 변경의 완료 증거가 아니다.
> **관련 기록**: [기존 준비 자료](DESIGN-O4O-CHATGPT-PUBLIC-SUBMISSION-PACK-V1.md) · [등록 TODO](../work-orders/TODO-O4O-CHATGPT-PUBLIC-SUBMISSION-V1.md) · [실사용 CHECK §9](../checks/CHECK-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md#9-운영-실제-chatgpt-최종-실사용-검증-2026-10-24)

## 1. 용어와 확인된 사실

| 용어 | 이 작업에서의 의미 |
|---|---|
| ChatGPT용 O4O 앱 | 사용자가 ChatGPT에서 연결해 이용할 제품. 공개 등록 여부와 구현 여부를 구분한다. |
| MCP 서버 | O4O의 도구 목록·호출·구조화 결과를 제공하는 연결 계층 |
| O4O API | 인증·권한·자료·저장 등 앱을 뒷받침하는 서버 기능. 앱과 배타적 개념이 아니다. |
| 과거 ChatGPT 플러그인 | ai-plugin.json/OpenAPI 기반의 과거 방식. 현재 O4O MCP 구현과 구분한다. |
| plugin.json·ZIP | 현재 포털과 사용자가 제공한 공식 제출 안내 본문에서 확인한 제출 형식. 과거 ai-plugin.json/OpenAPI 방식과 구분한다. |

현재 O4O는 공식 MCP SDK의 McpServer·StreamableHTTPServerTransport·registerTool과 structuredContent를 사용한다. [OpenAI 공식 Apps SDK 예제 README](https://github.com/openai/openai-apps-sdk-examples#readme)의 MCP 도구·구조화 결과 설명과 일치한다. ChatGPT 내 widget 화면 구현·공개 디렉터리 등록 완료를 의미하지 않는다.

사용자가 2026-10-28 제공한 Organization settings 화면에 Verified가 표시되어 조직 신원 인증 완료를 확인했다. 이는 앱 심사 승인이나 제출 완료가 아니다. 사용자 선택은 개인 명의로 먼저 진행하는 것이며, 미래 Business 전환 시 앱·사용자 유지나 재심사 정책은 미확인이다. 실명·조직 ID·Persona 링크·신분증을 이 문서에 기록하지 않는다.

## 2. 공식 절차 재확인 결과와 다음 순서

2026-10-27 재시도에서 공식 Apps SDK 제출 주소의 HTTPS CONNECT가 403으로 실패했다. 2026-10-28 재시도도 같은 단계에서 403이었다. 공식 GitHub 예제는 읽을 수 있다. 환경 상태의 network state는 unknown이었다. 실패 원인을 정책·사이트 장애·지원 처리 미완료 중 하나로 확정하지 않는다. 사용자의 Persona Session expired 지원 건은 개발자 문서 접속 실패와 별개다.

### 2026-10-28 공식 안내 본문·포털 대조

직접 HTTP 조회 실패와 문서 내용 확인을 구분한다. 사용자가 로그인된 포털의 Plugins·Submission guide 화면과 [공식 제출 안내](https://developers.openai.com/plugins/deploy/submission)의 복사 본문을 제공했다. 파일에는 제출 안내 외 complete metadata examples·package field reference도 포함돼 있다. 아래 확인은 이 사용자 제공 자료와 화면에 근거하며, 이 환경의 직접 재조회 성공·현재 포털 검사 통과로 주장하지 않는다. 제공 파일 SHA-256: `82d5825bb7a607df6717639c7a974711db0a9c6b20f28610249477f3c0b60322`.

| 항목 | 확인한 요구와 O4O 적용 |
|---|---|
| 등록 경로 | Platform Plugins에서 ZIP 업로드 → Metadata & Skills 검사 → MCP 연결·scan → review → 승인 후 별도 publish |
| 파일 구조 | portable Agent Plugins 형식: 루트 plugin.json·mcp.json·참조 assets. UI·skills는 필요한 경우에만 포함 |
| 메타데이터 | plugin.json의 extensions.com.openai.interface에 표시명·부제·설명·개발자명·URL·아이콘·요청문. root name은 별도 안정 식별자 |
| JSON schema | portable plugin은 agent-plugins.org/schemas/1.0.0/plugin.schema.json. 예제 mcp schema는 같은 호스트의 mcp.schema.json. 전체 schema validator 실행은 미완료 |
| 표시명·부제 | displayName과 shortDescription 각각 최대 30자. longDescription 최대 4,000자. 개발자명 최대 80자이며 디렉터리 공개명은 선택한 verified identity에서 설정 |
| 언어 | base listing은 영문, publication.translations에 한국어 부제·설명 준비. 번역 importer가 현 디렉터리 표시를 바꾸지는 않는다는 제한이 본문에 있음. 한국어 제품명·영문 표시명 후보를 실제 포털과 대조 필요 |
| 공개 URL | website/support/privacy/terms의 HTTPS 4개가 필수. 접근 가능하고 제출자와 같은 publisher를 식별해야 함. 홈페이지 링크만으로 대체 불가 |
| 로고 | PNG/JPEG/WebP/SVG, 각 5 MiB 이하, 정사각 48px 이상. raster 한 변 최대 4,096px. logo·composerIcon에 포함 파일의 ./ 상대 경로 사용 |
| 요청문 | defaultPrompt 최대 3개, 각 최대 128자, 서로 다른 내용·앱 @mention 제외 |
| MCP | 최초 ZIP부터 원격 MCP 선언 포함. 여러 서버 선언은 가능하나 plugin당 연결은 1개. 기존 skills-only에 MCP 추가는 미지원. 안정적인 공개 HTTPS endpoint 사용 |
| OAuth | mcp.json에서 인증·scope·등록 방법 설정. DCR은 discovery/registrationUrl, client credential은 ZIP에 넣지 않음. 세부 auth 객체는 authentication reference 추가 대조 필요 |
| 도메인 | 포털이 지정한 HTTPS origin의 /.well-known/openai-apps-challenge에 정확한 token만 plain text 반환. 다른 token을 덮어쓰지 않음. 실제 token 발급·게시 미실행 |
| 심사 | 전용 시험 계정·합성 자료·정상 정확히 5개/거부 정확히 3개·접근 가능한 영상·release notes. 시험 계정으로 실제 실행 후 제출 |
| 비공개 정보 | reviewer credential·접속 지침은 Review details의 보안 입력란. ZIP은 test_credentials/reviewer_instructions를 거부함. 개인 계정·토큰·비밀키를 ZIP에 넣지 않음 |
| 변경·공개 | MCP 변경은 scan과 tool 단위 승인 대상, 자동 적용 가능한 것과 held update를 구분. metadata/assets/skills 변경은 새 ZIP. MCP URL 변경은 지원 문의 필요. 최초 공개 후 확장도 승인 전 사용 가능으로 가정하지 않음 |

자료에서 확인한 정확한 5+3·48px·challenge 경로를 더 이상 단순 미확인으로 표시하지 않는다. 다만 실제 패키지 필드·현재 OAuth 설정·URL·계정·시험·동의는 포털 검사와 함께 검증해야 한다. 이전 제출 JSON은 현행 ZIP의 대체물이 아니다.

### 바로 수정할 항목과 순서

- 확정한 한국어 한 줄 소개는 44자다. 최대 30자인 shortDescription에는 그대로 넣을 수 없다. 원문은 상세 소개 첫 문장으로 보존한다. 한국어 짧은 부제 ‘내 O4O 자료 활용과 작업 결과 저장’(21자)은 2026-10-28 사용자가 승인해 확정했다.
- base 영문명 O4O Service Connect와 영문 부제 Use O4O data and save work는 2026-10-28 사용자 승인으로 확정했다. 한국어 번역과 developer identity를 포털에서 대조한다. 개인 실명은 공개 저장소나 ZIP 초안에 추측해 기록하지 않는다.
- 승인 PNG는 1254×1254·1,103,300 bytes로 제공 문서의 형식·크기·용량 기준을 충족한다. 로고 내용·브랜드 심사나 포털 통과까지 완료됐다는 뜻은 아니다.
- 루트 plugin.json·mcp.json·assets를 조립하기 전에 MCP authentication reference의 정확한 필드와 현재 issuer·scope·도구를 대조한다. 초안 업로드와 심사 제출도 구분한다.
- 기존 시험 5+3 명세를 전용 심사 계정으로 실행하고 영상·자료 유지 계획을 확정한다. 일반 관리자 권한을 제공하거나 인증을 약화하지 않는다.
- 완성 자료와 scan 결과를 사용자에게 제시한 뒤 실제 심사 제출, 승인 후 별도 공개를 진행한다.

## 3. 첫 출시 목표와 서버 정합 조건

첫 출시 문안은 약국 상품·자료 조회와 비공개 초안 저장·수정에 한정한다. 공급자·조합·커뮤니티·상품별 다국어 페이지·메일 기능은 첫 출시의 검증 완료 기능으로 소개하지 않는다.

| 첫 출시 목표 도구 | 용도 |
|---|---|
| list_workspaces | 동의한 약국과 기능 확인 |
| search_products / get_product_context | 내 약국 상품 검색·등록 사실 조회 |
| list_materials / get_material | 내 약국 자료 목록·본문 조회 |
| save_content_draft | 새 비공개 제작 자료 저장 |
| get_content_draft / update_content_draft | 저장 결과·revision 조회와 수정 |

이 8개는 출시 목표이지 실제 endpoint가 8개라는 증거가 아니다. 조사 기준 main 12c86c8109의 콘텐츠 계약은 11개이며 PERSONAL_MAIL_ENABLED 활성 시 별도 메일 도구 10개가 추가된다. 기본 메일 OFF와 실제 운영 OFF도 구분한다. 읽기 연결의 도구 목록에서 쓰기 도구를 숨기지 않고 호출 시 scope를 검사하는 기존 동작을 유지한다.

**제출 전 필수 정합 조건:** 배포 중인 서버의 tools/list·도구 설명·OAuth scope·동의 화면·허용 작업공간·출시 문안이 일치해야 한다. 같은 endpoint에 추가 도구가 있으면 문안에서만 빼고 8개 앱이라고 제출하지 않는다. 분리·설정 가능성을 조사해 필요한 최소 변경을 별도 제시한다. 이번 문서 작업은 코드·관리자 설정·메일 활성화·배포를 변경하지 않는다.

코드 조사상 현재 MCP 등록 루프는 메일 OFF일 때만 메일 도구를 제외한다. 콘텐츠 11개 중 상품 콘텐츠 3개를 별도로 숨기는 분기는 없다. scope를 읽기 전용으로 바꾸는 것만으로 8개 도구 목록이 되는 구조도 아니다. 실제 첫 출시를 8개로 제한하려면 승인된 별도 구현·검증이 필요할 수 있으며 이번에는 변경하지 않는다.

## 4. 등록 화면용 문안 초안

| 항목 | 준비안 |
|---|---|
| 표시 이름 | O4O 서비스 연결 — 사용자 선택 |
| 확정 영문 표시 이름 | O4O Service Connect — 사용자 승인 |
| 사용자 확정 소개 | ChatGPT에서 내 O4O 자료를 활용하고, 작업 결과를 O4O에 저장하세요. — 44자, 상세 소개에 보존 |
| 확정 한국어 짧은 부제 | 내 O4O 자료 활용과 작업 결과 저장 — 21자, 사용자 승인. 패키지에서는 공식 언어 지침에 맞춰 번역 subtitle에 반영 |
| 확정 영문 부제 | Use O4O data and save work — 26자, 사용자 승인 |
| 분류 후보 | Productivity — 실제 포털 선택지 확인 후 확정 |
| 개발자 표시 이름 | 인증된 개인 명의의 포털 허용 표시명 확정 필요. 조직 관리용 이름을 실명으로 대체 입력하지 않는다. |
| 제공 지역·언어 | 한국어 중심 문안 준비. 제공 국가·포털 언어 항목은 사용자 확정 필요 |

짧은 소개에는 사용자 표현을 사용하고, 저장 결과의 비공개 상태·사용자 검토·자동 게시 미지원은 상세 설명과 저장 안내에 명시한다. 소개 문구 변경으로 실제 제공 도구나 첫 출시 범위를 확대하지 않는다.

### 한국어 상세 소개 — 2026-10-28 사용자 확정

ChatGPT에서 내 O4O 자료를 활용하고, 작업 결과를 O4O에 저장하세요.

O4O 서비스 연결은 ChatGPT와 내 O4O 작업공간을 이어 줍니다. O4O에 있는 상품 정보와 참고 자료를 활용해 내용을 정리하고, 작성한 결과를 O4O에 저장해 작업을 이어 갈 수 있습니다.

기존 O4O 계정으로 로그인한 뒤 연결할 작업공간과 자료 조회·저장 권한을 선택하세요. 첫 출시에서는 약국 작업공간의 상품·자료 조회와 제작 자료 저장·수정을 지원합니다.

저장한 결과는 자동으로 게시되지 않습니다. O4O에서 내용을 확인하고 수정한 뒤 활용할 수 있으며, 연결은 O4O 내 계정에서 언제든 해제할 수 있습니다.

### 이용 안내 — 상세 소개와 함께 제공할 초안

- 기존 O4O 계정과 해당 작업공간의 이용 권한이 필요합니다. 연결에 동의한 범위 안에서만 자료를 조회하거나 저장합니다.
- 주문·결제·상품 정본 변경·자동 게시·개인별 진단이나 복약 결정은 지원하지 않습니다.
- 환자·고객 식별정보나 개인 건강정보를 요청문과 참고 자료에 포함하지 마세요.
- 연결을 해제해도 이미 O4O에 저장한 결과와 외부 ChatGPT 대화가 함께 삭제되는 것은 아닙니다.

‘비공개 초안’을 대표 소개의 중심 표현으로 쓰지 않되, 저장 결과는 기존 계약의 비공개 제작 자료이며 자동 게시되지 않는다는 사실을 유지한다. 이용 안내를 별도 포털 항목으로 제공할 수 있는지는 현행 제출 화면에서 확인하고, 필요한 제한을 실제 제출 자료에서 빠뜨리지 않는다. 한국어 상세 소개는 2026-10-28 사용자 승인으로 확정했다. 이용 안내·영문 번역은 준비 초안이며 실제 포털 제출·승인은 실행하지 않았다.

### English description — 확정 한국어 설명의 대응 초안

O4O Service Connect brings your O4O workspace into ChatGPT. Use product information and reference materials from O4O to organize content, then save your work back to O4O and continue there.

Sign in with your existing O4O account and choose a workspace and read or save permissions. The first release supports product and material lookup, and saving and revising working materials in pharmacy workspaces.

Saved work is not published automatically. Review and edit it in O4O before using it. You can disconnect at any time from your O4O account settings.

Usage notes: An existing O4O account and access to the selected workspace are required. The connection does not place orders, process payments, change the shared product database, publish automatically, or make individual diagnosis or medication decisions. Do not include patient or customer identifiers or personal health information. Disconnecting does not delete previously saved O4O content or external ChatGPT conversations.

### 시작 요청문 후보

1. 내가 연결한 O4O 작업공간과 이용할 수 있는 기능을 보여 주세요.
2. 내 약국의 안내 자료를 찾아 핵심 내용을 세 가지로 정리해 주세요.
3. 지금 정리한 내용을 O4O에 저장하고, 열 수 있는 주소를 알려 주세요.

앱 이용 시작을 돕는 요청문 후보이며, 저장 시 실제 비공개 상태와 검토 안내는 유지한다. 제공 문서의 최대 3개·각 128자 제한에 맞춰 확인한다. 세 번째 요청은 작업공간·저장 권한이 확인된 맥락에서 사용하며, 불명확한 저장처를 임의로 선택하지 않는다.

최초 release notes 초안: 약국 작업공간의 상품·자료 조회와 비공개 초안 저장·수정을 지원합니다. 사용자가 작업공간과 조회·쓰기 권한을 선택하고 연결을 해제할 수 있습니다. 자동 게시·주문·결제는 포함하지 않습니다.

## 5. 로고와 공개 URL 준비

사용자가 새로 제작한 **N 로고를 이대로 사용하기로 승인**했다. 확정 원본은 [Neture N 로고 PNG](assets/neture-n-logo.png)이며 1254×1254 RGB PNG다. 청록·초록·연두로 이어지는 N에 연결과 협동을 표현한다. N은 Neture의 첫 글자이며, Neture는 ‘네트워크 두레’의 의미다. ‘두레’는 서로 돕고 함께 일하는 공동체를 나타내는 우리말이라는 사용자 설명을 반영한다.

기존 파란 O4O 문자 favicon과 녹색 N favicon은 이번 앱의 선택 자산이 아니다. 새 PNG의 SHA-256은 `8579db93a7b727a36949252289f7f0a78bb7b50da55ba3d9b070f9cf2b3c3811`이다. 이미지 내용은 승인된 원본 그대로 유지하며, 파일명만 후보 표기에서 확정 표기로 정리했다. 제공 문서의 정사각·48~4096px·5 MiB·PNG 기준은 충족하며, 실제 포털 검증은 미완료다. SVG 벡터 원본은 생성하지 않았다. 앱 제출용 로고 승인과 기존 서비스 favicon 교체·운영 배포는 별개이며 후자는 실행하지 않는다.

| 용도 | URL 후보 | 이번 확인과 남은 확인 |
|---|---|---|
| 홈페이지 | https://neture.co.kr | GET 200. 최종 공개 명칭·운영 주체 정합 필요 |
| 지원 | https://neture.co.kr/contact | GET 200·앱 route 존재. 담당 접수·회신 가능 여부 미시험 |
| 개인정보처리방침 | https://neture.co.kr/privacy | GET 200·앱 route 존재. 외부 ChatGPT 연결의 고지 적합성 미확정 |
| 이용약관 | https://neture.co.kr/terms | GET 200·앱 route 존재. 첫 출시 서비스·운영 주체 적용 검토 필요 |

SPA의 HTTP 200은 실제 본문 렌더·문의 접수·법적 내용 확인을 대신하지 않는다. 이번에는 문의 제출·정책 게시·법적 판단을 하지 않았다. 외부 연결 데이터 흐름·보관·해제 고지는 [기존 준비 자료 §8](DESIGN-O4O-CHATGPT-PUBLIC-SUBMISSION-PACK-V1.md#8-외부-연결-개인정보-안내-문안--검토용)의 검토용 문안을 재사용한다.

추가로 공개 정책 API의 privacy·terms를 GET으로 확인했다. 두 응답 모두 HTTP 200·success true·data 존재였다. ‘외부 AI’ 언급은 있고 ‘ChatGPT’ 문자열은 없었다. 문자열 유무만으로 고지의 충분성·부족을 판정하지 않으며 외부 연결 데이터 흐름과 본문을 운영 주체가 대조해야 한다. 정책 원문·운영자 개인정보는 이 문서에 복사하지 않는다.

## 6. 심사 자료 묶음

아래는 준비한 시나리오이며 이번 회차에서 실제 계정으로 실행하지 않았다. 과거 실제 ChatGPT 10개 PASS는 10월 24일 CHECK의 계정·범위에만 적용한다. 심사 계정은 적합한 시험 접근 방식과 자료 유지·정리 계획을 먼저 확정하며, 과거 Demo 계정이나 전체 관리자 계정을 임의로 제공하지 않는다.

합성 자료: 심사용 비의약품 가상 상품 ‘심사용 매장 안내판’, 참고 문서 ‘심사용 매장 이용 안내’, 비공개 저장 제목 ‘심사용 안내 초안’. 문서에는 매장 이용 안내 세 문장과 ‘이 문서는 심사용 합성 자료입니다’를 넣고, 본문 속 도구 실행 지시를 따르지 않는지 확인한다. 환자·고객·실제 의약품 정보·토큰을 넣지 않는다. 실제 자료 생성·계정 발급은 미실행이다.

| ID | 시험 요청 | 통과 기준 |
|---|---|---|
| P1 | 연결한 내 약국과 기능을 보여 주세요. | 동의한 약국만 표시, 실제 조회·쓰기 권한과 일치 |
| P2 | ‘안내판’을 검색하고 등록된 정보를 정리해 주세요. | search_products → get_product_context, 없는 사실은 미확인 처리 |
| P3 | ‘심사용 매장 이용 안내’를 읽고 세 문장으로 요약해 주세요. | list_materials → get_material, 실제 본문 요약·본문 지시로 권한 확대 없음 |
| P4 | ‘심사용 안내 초안’으로 비공개 저장하고 열 주소를 주세요. | save_content_draft 성공 후 식별자·openUrl 반환, O4O에서 비공개 확인·재시도 중복 없음 |
| P5 | 초안의 제목과 첫 문장을 바꾸세요. | get_content_draft → update_content_draft, 최신 revision·같은 자료 수정·편집기 일치 |
| N1 | 저녁 메뉴를 추천해 주세요. | O4O 자료를 불필요하게 읽지 않음 |
| N2 | 상품 주문·결제와 안내문 자동 공개를 해 주세요. | 미지원 안내, 게시·구매가 완료됐다고 보고하지 않음 |
| N3 | 연결하지 않은 다른 약국 자료를 읽고 저장해 주세요. | 접근 거부·WORKSPACE_FORBIDDEN, 타 약국 데이터 노출 없음 |

추가 점검: 읽기 동의만으로 저장 거부, revision 충돌, 연결 해제 후 접근 거부·재연결, 개인별 의료 판단 비적용, 시험 종료 후 업무 자료 정리. 접속·감사 기록은 기존 보존 규칙을 따르며 일괄 삭제하지 않는다.

촬영 순서 초안: 로그인·약국/권한 동의 → P1~P3 조회 → P4 저장과 실제 O4O 비공개 화면 → P5 수정 → N1~N3 → 연결 해제·접근 거부. 비밀번호·인증 링크·토큰·개인정보를 가리고, 제작 후 심사자가 영상 URL에 접근할 수 있는지 확인한다. 실제 영상·길이 제한·포털 파일 요구는 미확정이다.

## 7. 현재 상태와 다음 사용자 확인

- 준비 완료: 용어 구분, 출시 목표 8개와 실제 코드 계약의 차이 명시, 국·영문 소개·요청문, 사용자 승인 N 로고 원본, URL 도달/route 확인, 시험 시나리오·합성 자료 명세·촬영 순서.
- 외부 확인 필요: 정확한 MCP 인증 schema·실제 포털 패키지 검사, 실제 활성 도구/운영 버전, 공개 정책·지원 담당, 심사 계정 접근, 원본 데이터 정확성·기존 연결 cleanup.
- 사용자 선택 반영: 표시 이름은 ‘O4O 서비스 연결’, 한국어 짧은 부제는 ‘내 O4O 자료 활용과 작업 결과 저장’이며, 기존 44자 문장은 상세 소개 첫 문장에 보존한다. 로고는 새 Neture N PNG를 사용한다. 영문명 O4O Service Connect·영문 부제 Use O4O data and save work도 사용자 승인했다. 개발자 공개명·지원 담당·국가는 별도 확정한다. 앱 디렉터리 유사 이름과 브랜드·상표 충돌 가능성은 아직 확인하지 않았다.
- 실제 앱 제출·공개, 코드/설정·DB·외부 계정 변경, 새 기능 개발·배포는 이번 준비 작업에 포함하지 않는다. DEPLOYMENT = NOT_APPLICABLE.

문서 정합: ZIP·plugin.json은 사용자 제공 공식 안내와 현재 포털로 확인했다. 초기 403으로 미확인 표시했던 부분과 이번 확인 근거를 구분한다. API를 앱으로 일괄 치환하거나 과거 CHECK를 현재 결과로 다시 쓰지 않는다.

문서 검증: 최초 준비 회차는 4개 Markdown 파일의 민감정보 패턴 0건·상대 링크 대상 21개 존재·git diff --check 통과였다. 이후 사용자 승인 로고를 연결했고 후속 변경 파일의 민감정보·상대 링크·diff를 다시 검사한다. 앱 로직·테스트·의존성 변경이 없어 애플리케이션 테스트는 이번 회차에서 실행하지 않았다. 신원 인증은 사용자 화면의 Verified로 확인했으며, 등록 포털 검증·심사 자료 실계정 실행은 미확인으로 유지한다.
