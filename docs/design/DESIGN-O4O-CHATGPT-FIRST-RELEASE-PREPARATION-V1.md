# O4O ChatGPT 앱 첫 출시 준비

> **상태**: DRAFT · **작성일**: 2026-10-27 · **최종 갱신**: 2026-10-27 (Asia/Seoul)
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
| plugin.json·ZIP | 10월 24일 준비 문서에 기재된 제출 형식. 이름만으로 과거 플러그인 잔재 또는 현행 공식 형식이라고 판정하지 않는다. |

현재 O4O는 공식 MCP SDK의 McpServer·StreamableHTTPServerTransport·registerTool과 structuredContent를 사용한다. [OpenAI 공식 Apps SDK 예제 README](https://github.com/openai/openai-apps-sdk-examples#readme)의 MCP 도구·구조화 결과 설명과 일치한다. ChatGPT 내 widget 화면 구현·공개 디렉터리 등록 완료를 의미하지 않는다.

사용자 제공 화면상 Individual 신원 인증은 Identity in review다. 이는 앱 심사 신청이 아니다. 사용자 선택은 개인 명의로 먼저 진행하는 것이며, 미래 Business 전환 시 앱·사용자 유지나 재심사 정책은 미확인이다. 실명·조직 ID·Persona 링크·신분증을 이 문서에 기록하지 않는다.

## 2. 공식 절차 재확인 결과와 다음 순서

2026-10-27 재시도에서 공식 Apps SDK 제출 주소의 HTTPS CONNECT가 403으로 실패했다. 공식 GitHub 예제는 읽을 수 있다. 환경 상태의 network state는 unknown이었다. 실패 원인을 정책·사이트 장애·지원 처리 미완료 중 하나로 확정하지 않는다. 사용자의 Persona Session expired 지원 건은 개발자 문서 접속 실패와 별개다.

다음 링크는 확인할 공식 출처 후보이며, 이 회차에서 본문·redirect·현행 제출 규격을 확인한 주소로 주장하지 않는다.

- [Apps SDK](https://developers.openai.com/apps-sdk)
- [Apps SDK 제출 안내](https://developers.openai.com/apps-sdk/deploy/submission)
- [기존 문서에 기록된 plugins 제출 주소](https://developers.openai.com/plugins/deploy/submission)

확인할 것: 최종 이동 주소, 제출 포털, 업로드 형식, 아이콘 규격, 도메인 검증 방식, 심사 자료 수·길이·형식, 인증/소유자 조건. 과거 예시의 schema URL·정확히 5+3·48px·challenge 경로를 현행 공식 요구로 확정하지 않는다. 아래 5+3은 O4O가 준비하는 내부 심사 묶음이다.

1. 인증 심사 중 소개·로고 후보·시험 대본·정책 문안을 준비한다.
2. 공식 안내 또는 사용자가 로그인한 제출 화면을 대조해 미확인 항목을 확정한다. 화면 공유 시 계정·인증 링크를 가린다.
3. Individual 인증 최종 결과를 확인한다. 완료를 가정해 앱 제출을 진행하지 않는다.
4. 실제 서버·도구·심사 계정과 제출 자료를 맞추고 포털이 요구하는 형식으로 조립한다.
5. 완성 자료와 시험 결과를 사용자에게 제시하고 실제 제출한다. 앱 승인과 공개도 각각 확인한다.

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
| 표시 이름 | O4O 콘텐츠 연결 |
| 영문 표시 이름 | O4O Content Connection |
| 짧은 소개 | 내 약국 자료로 콘텐츠 초안을 만들고 O4O에 저장하세요. |
| 영문 짧은 소개 | Read pharmacy materials and save private drafts in O4O. |
| 분류 후보 | Productivity — 실제 포털 선택지 확인 후 확정 |
| 개발자 표시 이름 | 인증된 개인 명의의 포털 허용 표시명 확정 필요. 조직 관리용 이름을 실명으로 대체 입력하지 않는다. |
| 제공 지역·언어 | 한국어 중심 문안 준비. 제공 국가·포털 언어 항목은 사용자 확정 필요 |

### 한국어 설명

O4O 콘텐츠 연결은 ChatGPT에서 사용자가 허용한 약국 작업공간의 상품과 참고 자료를 찾고, 작성한 내용을 O4O의 비공개 초안으로 저장·수정하도록 돕습니다. 기존 O4O 계정으로 로그인하고 이용할 약국과 조회·저장 권한을 선택하세요. 저장한 초안은 O4O 편집 화면에서 검토하고 계속 작업할 수 있습니다. 콘텐츠 자동 게시·상품 정본 변경·주문·결제·개인별 진단이나 복약 결정은 제공하지 않습니다. 환자·고객 식별정보나 개인 건강정보를 요청문과 자료에 포함하지 마세요. 연결은 O4O 내 계정에서 해제할 수 있습니다.

### English description

O4O Content Connection helps you find products and reference materials in pharmacy workspaces you authorize, then save and revise private drafts in O4O. Sign in with your existing O4O account and choose a pharmacy and read or draft permissions. Review saved content in the O4O editor. The connection does not publish content, change the shared product database, place orders, process payments, or make individual diagnosis or medication decisions. Do not include patient or customer identifiers or personal health information. You can disconnect from your O4O account settings.

### 시작 요청문 후보

1. 연결한 내 약국과 이용할 수 있는 기능을 보여 주세요.
2. 내 약국의 안내 자료를 찾아 핵심 내용을 세 가지로 정리해 주세요.
3. 정리한 안내문을 비공개 초안으로 저장하고 O4O에서 열 주소를 알려 주세요.

최초 release notes 초안: 약국 작업공간의 상품·자료 조회와 비공개 초안 저장·수정을 지원합니다. 사용자가 작업공간과 조회·쓰기 권한을 선택하고 연결을 해제할 수 있습니다. 자동 게시·주문·결제는 포함하지 않습니다.

## 5. 로고와 공개 URL 준비

로고 후보는 기존 [매장 favicon SVG](../../services/web-store/public/favicon.svg)의 파란 정사각형·흰 O4O 문자다. 원본은 viewBox 32×32이며 text 요소의 시스템 글꼴을 사용한다. 승인된 최종 로고나 제출 규격 충족 자산으로 주장하지 않는다. [Neture favicon](../../services/web-neture/public/favicon.png)은 녹색 N이므로 O4O 로고로 자동 채택하지 않는다.

제작 brief: O4O 세 글자의 가독성을 유지하고 OpenAI/ChatGPT 로고와 혼동되는 표식을 사용하지 않는다. 기존 파랑·흰색 후보를 사용자에게 먼저 보여 준다. 승인 후 공식 제출 규격을 확인하여 글자 윤곽·배경·작은 크기 가독성·정사각 비율을 검수하고 필요한 파일로 내보낸다. 현재는 원본 후보와 brief 준비까지이며 새 로고 제작·승인은 미완료다.

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

- 준비 완료: 용어 구분, 출시 목표 8개와 실제 코드 계약의 차이 명시, 국·영문 소개·요청문, 로고 원본 후보·brief, URL 도달/route 확인, 시험 시나리오·합성 자료 명세·촬영 순서.
- 외부 확인 필요: 공식 제출 규격·포털과 인증 결과, 실제 활성 도구/운영 버전, 공개 정책·지원 담당, 심사 계정 접근, 원본 데이터 정확성·기존 연결 cleanup.
- 사용자에게 다음 단계로 보여 줄 선택: 표시 이름 ‘O4O 콘텐츠 연결’과 기존 파란 O4O 로고 후보. 결정 전에 인증된 실명·지원 담당·국가를 추측하지 않는다.
- 실제 앱 제출·공개, 코드/설정·DB·외부 계정 변경, 새 기능 개발·배포는 이번 준비 작업에 포함하지 않는다. DEPLOYMENT = NOT_APPLICABLE.

문서 정합: 과거 준비 문서의 ZIP·plugin.json 단정은 재확인 대상으로 분리한다. API를 앱으로 일괄 치환하거나 과거 CHECK를 현재 결과로 다시 쓰지 않는다.

문서 검증: 이번 변경 4개 Markdown 파일의 민감정보 패턴 0건, 상대 링크 대상 21개 존재, git diff --check 통과. 앱 로직·테스트·의존성 변경이 없어 애플리케이션 테스트는 이번 회차에서 실행하지 않았다. 신원 인증 승인·등록 포털 검증·심사 자료 실계정 실행은 미확인으로 유지한다.
