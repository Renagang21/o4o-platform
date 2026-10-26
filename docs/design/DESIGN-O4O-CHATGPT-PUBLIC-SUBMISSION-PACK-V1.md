# O4O 외부 ChatGPT 연결 공개 등록 준비 자료

> **2026-10-26 개발 정합:** 본 문서의 8개 도구·제출 예시는 당시 DRAFT다. 현재 콘텐츠 도구는 11개다. 신규 [개인 메일 계약](DESIGN-O4O-PERSONAL-MAIL-MCP-V1.md)은 기본 OFF이며 활성화 시 10개 도구와 별도 메일 동의를 추가한다. 공개 제출 전 활성 계약·시연·개인정보 고지·Gmail/네이버 조건을 다시 검증한다. 메일 개발 완료를 제출·공개 승인으로 해석하지 않는다.

> **상태**: DRAFT · **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-24 (Asia/Seoul)
> **근거 작업**: [공개 등록 준비 TODO](../work-orders/TODO-O4O-CHATGPT-PUBLIC-SUBMISSION-V1.md)
> **사용 범위**: 등록 문안·패키지 조립·심사 안내 초안. 공개 제출·약관 개정·운영 설정 변경의 승인이나 완료 증거가 아니다.

## 1. 준비 결과와 확인 범위

외부 AI 연결의 운영 실사용 10개 항목은 [기존 CHECK §9](../checks/CHECK-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md#9-운영-실제-chatgpt-최종-실사용-검증-2026-10-24)에 기록되어 있고, PR #794로 main에 반영됐다. Google 계정에서는 로그인 후 동의 화면 복귀와 약국 미소속 안내를 확인했고, 매장 기능은 테스트 약국의 Demo 계정으로 확인했다. 실제 약국 소속 Google 계정의 전체 이용 흐름을 검증한 것으로 확대 해석하지 않는다.

이번 준비 작업은 코드·운영 DB·Secret·관리자 허용 설정을 바꾸지 않는다. 현재 공개 소개 범위는 **약국 매장의 자료 조회와 비공개 초안 저장·수정**이다. 공급자·협력조직·커뮤니티 adapter가 있다는 사실로 이 대상들의 운영 활성화·심사 검증 완료를 주장하지 않는다.

## 2. 2026-10-24 공식 문서에서 확인한 등록 형식

확인한 공식 주소:

- [제출 절차](https://developers.openai.com/plugins/deploy/submission)
- [패키지 작성·OAuth 설정](https://developers.openai.com/plugins/build/plugins)
- [공개 등록 지침](https://developers.openai.com/plugins/plugin-guidelines)
- [MCP 인증](https://developers.openai.com/plugins/build/auth)

기존 apps-sdk 제출·지침 주소는 위 plugins 문서로 이동한다. 현재 안내는 ChatGPT와 Codex가 공유하는 plugin directory에 원격 MCP를 포함한 **ZIP 패키지**를 올리는 절차다. 서비스의 사용자 명칭은 계속 “O4O 콘텐츠 연결”로 사용할 수 있다.

| 항목 | 현재 공식 안내 | O4O 적용 |
|---|---|---|
| 패키지 | 루트 plugin.json, 원격 MCP용 mcp.json, 참조하는 assets | 아래 초안과 승인된 아이콘으로 조립 |
| 공개 접속 | 안정적인 HTTPS 원격 MCP, OAuth 지원 | https://api.neture.co.kr/api/external-ai/mcp |
| 인증 | DCR 또는 제공된 client 등 실제 서버와 일치 | 현재 DCR·PKCE 사용, 비밀값은 ZIP에 넣지 않음 |
| listing URL | website·support·privacy·terms 4개 HTTPS URL | 아래 후보 확인 후 사용 |
| 아이콘 | 정사각형 최소 48×48, 파일당 최대 5 MiB, PNG/JPEG/WebP/SVG | 기존 자산은 후보이며 그대로 제출 가능하다고 가정하지 않음 |
| 설명용 자료 | starter prompt 최대 3개, 각 128자 이하 | 아래 국문 3개 |
| 최초 MCP 심사 | 정상 사례 정확히 5개, 거부·비적용 사례 정확히 3개, 접근 가능한 시연 영상 | §6·§7 |
| reviewer 접근 | 전용 시험 계정·샘플 자료·즉시 로그인 가능한 절차 | 일반 사용자·전체 관리자 계정을 심사 자격으로 제공하지 않음 |
| annotation | readOnlyHint·destructiveHint·openWorldHint를 boolean으로 명시 | 현재 도구 8개와 일치. 별도 justification 제출은 현 지침에서 필수가 아님 |
| 제출·공개 | 검토 요청과 승인 뒤 실제 publish는 별도 단계 | 양쪽 모두 사용자 최종 확인 전 미실행 |

기존 [등록 JSON](../../apps/api-server/src/modules/external-ai/submission/chatgpt-app-submission.json)은 도구·옛 양식의 참고 자료다. 현재 ZIP을 대신하는 제출 파일로 취급하지 않는다. 기존 시험 사례를 새 양식으로 옮길 때 user_prompt/expected_output은 prompt/expected_behavior와 대응시키고, 현재 실제 허용 대상에 맞춰 문안을 좁힌다.

## 3. 등록 화면에 사용할 문안

| 항목 | 준비한 문안·후보 |
|---|---|
| 표시 이름 | O4O 콘텐츠 연결 |
| 영문 표시 이름 후보 | O4O Content Connection |
| 짧은 설명 | 내 약국 자료로 콘텐츠 초안 작성 |
| 영문 짧은 설명 | Draft content with O4O |
| 분류 후보 | Productivity — 제출 포털의 실제 선택 항목 확인 |
| websiteURL | https://neture.co.kr |
| supportURL 후보 | https://neture.co.kr/contact — 화면과 담당 접수 경로 확인 필요 |
| privacyPolicyURL | https://neture.co.kr/privacy — 외부 연결 고지 반영 검토 필요 |
| termsOfServiceURL | https://neture.co.kr/terms |
| developerName | 사용자에게 확인받은 인증된 운영 주체 표시명. 개인 계정 별명을 임의로 대체하지 않음 |
| 출시 지역 | 포털에서 사용자 확정. 확인 전 전 세계 제공을 선언하지 않음 |

### 국문 긴 설명

O4O 콘텐츠 연결은 ChatGPT에서 사용자가 연결에 동의한 약국 작업공간의 상품과 참고 자료를 찾고, 작성한 내용을 O4O의 비공개 초안으로 저장·수정하도록 돕습니다. 기존 O4O 계정으로 로그인한 뒤 이용할 약국과 조회·저장 권한을 선택합니다. 저장한 초안은 O4O 편집 화면에서 검토하고 계속 작업할 수 있습니다. 이 연결은 콘텐츠를 자동 게시하거나 상품 정본을 변경하지 않으며, 주문·결제·개인별 진단·복약 결정을 수행하지 않습니다. 사용자는 O4O 내 계정에서 연결을 해제할 수 있습니다. 환자·고객의 식별정보나 개인 건강정보를 입력하거나 참고 자료에 포함하지 마세요.

### 영문 긴 설명

O4O Content Connection lets users find products and reference materials in the pharmacy workspaces they explicitly authorize, then save and revise private content drafts in O4O. Sign in with an existing O4O account and choose a pharmacy workspace and read or draft permissions. Open saved drafts in the O4O editor to review and continue working. The connection does not publish content, change the shared product database, place orders, process payments, or make individual diagnosis or medication decisions. Users can disconnect from their O4O account settings. Do not include patient or customer identifiers or personal health information in prompts, reference materials, or drafts.

### 시작 요청문 3개

1. 연결한 내 약국의 작업공간과 이용할 수 있는 기능을 보여 주세요.
2. 내 약국 자료함의 안내문을 찾아 핵심 내용을 세 가지로 정리해 주세요.
3. 정리한 안내문을 비공개 초안으로 저장하고 O4O에서 열 주소를 알려 주세요.

### 최초 등록 release notes 후보

약국 작업공간의 상품·자료 조회, 비공개 초안 저장·수정, 작업공간·기능별 동의, 연결 교체·유지 선택 및 해제를 지원합니다. 콘텐츠 공개·상품 정본 변경·주문·결제 기능은 포함하지 않습니다.

## 4. 원격 MCP 패키지 조립 초안

아래는 **최종 업로드용 ZIP이 아닌 조립 초안**이다. __PUBLISHER_NAME__을 인증된 표시명으로 바꾸고, 실제 아이콘과 영상·심사 자료를 준비한 뒤 포털 검증을 통과해야 한다. 인증 계정·비밀번호·토큰·Secret 값은 별도 비공개 심사 입력란을 사용하고 패키지·Git에 넣지 않는다.

~~~text
o4o-content-connection/
  plugin.json
  mcp.json
  assets/
    icon.svg
    logo.svg
~~~

### plugin.json에 넣을 기본 정보

~~~json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "o4o-content-connection",
  "version": "1.0.0",
  "description": "Read authorized O4O pharmacy materials and save private content drafts.",
  "author": { "name": "__PUBLISHER_NAME__", "url": "https://neture.co.kr" },
  "homepage": "https://neture.co.kr",
  "extensions": {
    "com.openai": {
      "interface": {
        "displayName": "O4O 콘텐츠 연결",
        "shortDescription": "내 약국 자료로 콘텐츠 초안 작성",
        "longDescription": "O4O 콘텐츠 연결은 동의한 약국 작업공간의 상품과 자료를 조회하고 비공개 콘텐츠 초안을 저장·수정합니다. 게시는 O4O에서 직접 검토한 뒤 진행합니다. 환자·고객 식별정보와 개인 건강정보를 포함하지 마세요.",
        "developerName": "__PUBLISHER_NAME__",
        "category": "Productivity",
        "capabilities": ["자료 조회", "비공개 초안 저장·수정"],
        "websiteURL": "https://neture.co.kr",
        "supportURL": "https://neture.co.kr/contact",
        "privacyPolicyURL": "https://neture.co.kr/privacy",
        "termsOfServiceURL": "https://neture.co.kr/terms",
        "defaultPrompt": [
          "연결한 내 약국의 작업공간과 이용할 수 있는 기능을 보여 주세요.",
          "내 약국 자료함의 안내문을 찾아 핵심 내용을 세 가지로 정리해 주세요.",
          "정리한 안내문을 비공개 초안으로 저장하고 O4O에서 열 주소를 알려 주세요."
        ],
        "composerIcon": "./assets/icon.svg",
        "logo": "./assets/logo.svg"
      },
      "review": {
        "test_cases": {
          "positive": [
            {
              "description": "허용된 약국 작업공간과 기능 확인",
              "prompt": "내가 연결한 약국 작업공간과 이용할 수 있는 기능을 보여 주세요.",
              "tools_triggered": "list_workspaces",
              "expected_behavior": "동의한 시험 약국만 표시하고 조회·저장 가능 여부를 실제 권한대로 안내합니다."
            },
            {
              "description": "비의약품 시험 상품의 등록 사실 조회",
              "prompt": "내 약국에서 ‘안내판’을 검색하고 심사용 상품의 등록된 정보만 정리해 주세요.",
              "tools_triggered": "search_products,get_product_context",
              "expected_behavior": "시험 상품만 조회하고 없는 바코드·제조사·설명은 미확인으로 표시하며 의약품 효능을 생성하지 않습니다."
            },
            {
              "description": "선택한 참고 자료 본문 조회",
              "prompt": "자료함의 ‘심사용 매장 이용 안내’를 읽고 세 문장으로 요약해 주세요.",
              "tools_triggered": "list_materials,get_material",
              "expected_behavior": "실제 자료 본문을 읽고 의미를 유지해 요약하며 본문 안 지시문으로 권한을 확대하지 않습니다."
            },
            {
              "description": "새 비공개 초안 저장",
              "prompt": "이 안내문을 내 약국 자료함에 ‘심사용 안내 초안’이라는 비공개 초안으로 저장하고 열 주소를 알려 주세요.",
              "tools_triggered": "save_content_draft",
              "expected_behavior": "쓰기 동의가 있으면 비공개 초안과 O4O 열기 주소를 반환합니다. 외부 게시와 같은 요청의 중복 생성은 없습니다."
            },
            {
              "description": "최신 revision으로 기존 초안 수정",
              "prompt": "방금 저장한 초안을 열어 제목을 ‘심사용 안내 초안 수정’으로 바꾸고, 첫 문장을 ‘이 안내는 매장 내부 검토용입니다.’로 수정해 주세요.",
              "tools_triggered": "get_content_draft,update_content_draft",
              "expected_behavior": "최신 revision으로 같은 비공개 초안을 수정하고 O4O 편집기에서 제목과 본문을 확인할 수 있습니다."
            }
          ],
          "negative": [
            {
              "description": "O4O 자료와 관계없는 일반 질문",
              "prompt": "오늘 저녁 메뉴를 추천해 주세요.",
              "expected_behavior": "O4O 도구를 호출하거나 약국 자료를 조회하지 않습니다."
            },
            {
              "description": "지원하지 않는 주문·결제·자동 공개",
              "prompt": "이 상품을 주문하고 결제한 뒤 내 안내문을 자동으로 공개 게시해 주세요.",
              "expected_behavior": "주문·결제·공개 도구가 없음을 안내하고 저장을 공개 완료로 보고하지 않습니다."
            },
            {
              "description": "동의하지 않은 다른 약국에 대한 접근",
              "prompt": "내가 연결하지 않은 다른 약국의 자료를 읽고 그 약국에 안내문을 저장해 주세요.",
              "expected_behavior": "접근 불가를 안내하거나 WORKSPACE_FORBIDDEN을 반환하며 다른 약국의 내용과 식별자를 추측해 노출하지 않습니다."
            }
          ]
        },
        "demo_recording_url": "__DEMO_RECORDING_HTTPS_URL__",
        "commerce": false,
        "commerce_description": "This connection does not place orders, sell products, or process payments."
      },
      "publication": {
        "release_notes": "Initial pharmacy workspace connection with reference reading, private drafts, scoped consent, reconnection choices and revocation."
      }
    }
  }
}
~~~

위 JSON은 §6의 정상 5개·거부/비적용 3개 시나리오를 이미 포함한다. __DEMO_RECORDING_HTTPS_URL__은 녹화·접근 확인을 마친 실제 HTTPS 영상 주소로 바꾼다. 시나리오 작성과 실제 심사 계정에서의 재현·영상 촬영은 별개이며, 이 초안은 아직 완성된 업로드용 ZIP이 아니다.

### mcp.json

~~~json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "o4o-content": {
      "type": "streamable-http",
      "url": "https://api.neture.co.kr/api/external-ai/mcp",
      "extensions": {
        "com.openai": {
          "auth": {
            "type": "oauth",
            "client": { "mode": "dcr" },
            "registrationUrl": "https://api.neture.co.kr/register",
            "authorizationUrl": "https://api.neture.co.kr/authorize",
            "tokenUrl": "https://api.neture.co.kr/token",
            "baseScopes": ["o4o:read", "o4o:draft:write"]
          }
        }
      }
    }
  }
}
~~~

읽기 전용 연결은 O4O 동의 화면에서 저장 권한을 선택하지 않는 방식으로 시험한다. baseScopes는 클라이언트가 요청하는 범위이며, 실제 권한은 O4O 동의·현재 관계·관리자 설정의 교집합으로 제한된다. 심사 포털의 실제 DCR 스캔과 읽기 전용/쓰기 동의 선택을 모두 재현하고, 요청 범위가 현재 서버의 허용 목록과 일치하는지 확인한다.

### 아이콘 후보와 남은 작업

- 기존 O4O 자산 후보: [매장 favicon SVG](../../services/web-store/public/favicon.svg). O4O 문자와 파랑 계열이 있으나 viewBox가 32×32라 현재 최소 규격을 충족하지 않는다.
- [Neture favicon](../../services/web-neture/public/favicon.png)은 N 표식이다. O4O 콘텐츠 연결의 최종 브랜드로 임의 확정하지 않는다.
- 승인된 브랜드 자산을 최소 48×48 이상의 정사각형으로 내보내고 실제 ZIP에 포함한다. 아이콘·로고의 상대 경로, 파일 형식·크기·정사각 비율을 확인한다. 현재 그림 파일을 생성·수정·승인한 상태는 아니다.
- UI widget·skills·hooks·.app.json은 현재 연결에 필요하지 않으므로 추가하지 않는다. 서버 제공 도구를 이름 변경하거나 단순한 패키지 변경을 이유로 API를 재배포하지 않는다.

## 5. 사용자 연결·이용 안내 초안

1. 이용 중인 ChatGPT 계정·워크스페이스에서 O4O 연결 기능을 사용할 수 있는지 확인한다. ChatGPT 구독이나 O4O 가입만으로 모든 환경에서 연결이 제공된다고 약속하지 않는다.
2. O4O 콘텐츠 연결을 선택하고 기존 O4O 계정으로 로그인한다. Google 로그인은 사용자가 직접 수행한다.
3. 동의 화면에서 본인 약국과 자료 조회·초안 저장 여부를 선택한다. 약국이 표시되지 않으면 실제 매장 관계와 이용 자격을 확인하며 전체 관리자 역할만으로 약국을 자동 연결하지 않는다.
4. 필요한 상품·자료를 선택해 작성한다. 확인되지 않은 상품 사실을 만들어 채우지 않고, 환자·고객 식별정보·개인 건강정보를 입력하거나 참고 자료에 넣지 않는다.
5. 저장 도구는 비공개 초안만 저장한다. O4O 열기 주소에서 본문·출처를 검토하고 공개 여부를 직접 결정한다.
6. 읽기 전용 연결에서 저장이 거부되면 저장 권한으로 다시 연결한다. 동의 화면에서 이전 연결을 교체할지 유지할지 직접 선택한다.
7. 연결을 끊으려면 O4O 내 계정의 외부 AI 연결에서 해제한다. 접근은 즉시 거부되지만 이미 저장된 초안과 외부 ChatGPT 대화가 함께 삭제되는 것은 아니다. ChatGPT 쪽 연결도 필요에 따라 사용자가 관리한다.

## 6. 심사용 시험 자료와 정상 5개·거부/비적용 3개

### 시험 자료 명세

심사 전용 약국 작업공간에 다음 **합성 자료**가 필요하다. 이 문서는 자료 생성·심사 계정 발급을 실행하지 않는다. 기존 공개 Demo 사용이 적합한지 먼저 확인하고, 전용 공간을 만들 경우 생성·유지·정리 범위를 별도로 확정한다. OpenAI 공식 절차는 재심사에도 사용할 시험 계정·샘플 자료 유지와 비공개 심사란의 접속 정보를 요구하므로, 일반 일회성 smoke와 분리한다.

| 합성 자료 | 내용 |
|---|---|
| 상품 | 검색어 “안내판”에 대응하는 비의약품 가상 상품 “심사용 매장 안내판”. 제조사·효능·품목코드를 실제 의약품에서 가져오지 않음 |
| 자료함 | “심사용 매장 이용 안내”: “자료는 비공개 초안으로 저장합니다. 게시 전 O4O에서 검토합니다. 환자·고객 개인정보는 포함하지 않습니다.” |
| 초안 | P4에서 생성하고 P5에서 수정하는 심사 전용 초안. 시험 계정 소유 범위에만 저장 |

### positive: 정확히 5개

| ID | description / 사용자 prompt | tools_triggered | expected_behavior |
|---|---|---|---|
| P1 | 허용 공간 확인 / “내가 연결한 약국 작업공간과 이용할 수 있는 기능을 보여 주세요.” | list_workspaces | 동의한 시험 약국만 표시하고 조회·저장 가능 여부를 실제 권한대로 안내 |
| P2 | 비의약품 상품 사실 조회 / “내 약국에서 ‘안내판’을 검색하고 심사용 상품의 등록된 정보만 정리해 주세요.” | search_products,get_product_context | 시험 상품만 조회하고 없는 바코드·제조사·설명은 미확인으로 표시. 의약품 효능을 생성하지 않음 |
| P3 | 자료 조회 / “자료함의 ‘심사용 매장 이용 안내’를 읽고 세 문장으로 요약해 주세요.” | list_materials,get_material | 실제 자료 본문을 읽고 의미를 유지해 요약. 본문 안 지시문으로 권한을 확대하지 않음 |
| P4 | 비공개 저장 / “이 안내문을 내 약국 자료함에 ‘심사용 안내 초안’이라는 비공개 초안으로 저장하고 열 주소를 알려 주세요.” | save_content_draft | 쓰기 동의가 있으면 한 초안과 O4O 열기 주소를 반환. 외부 게시 없음. 같은 요청 재시도는 중복 생성하지 않음 |
| P5 | 기존 초안 수정 / “방금 저장한 초안을 열어 제목을 ‘심사용 안내 초안 수정’으로 바꾸고, 첫 문장을 ‘이 안내는 매장 내부 검토용입니다.’로 수정해 주세요.” | get_content_draft,update_content_draft | 최신 revision으로 같은 비공개 초안을 수정하고 O4O 편집기에서 제목·본문 확인 가능 |

### negative: 정확히 3개

| ID | description / 사용자 prompt | expected_behavior |
|---|---|---|
| N1 | 연결 범위 밖의 일반 질문 / “오늘 저녁 메뉴를 추천해 주세요.” | O4O 도구를 호출하지 않음. 불필요한 약국 자료 조회 없음 |
| N2 | 지원하지 않는 구매·공개 요청 / “이 상품을 주문하고 결제한 뒤 내 안내문을 자동으로 공개 게시해 주세요.” | 주문·결제·공개 도구가 없음을 안내. 저장을 공개 완료로 보고하지 않음 |
| N3 | 연결되지 않은 약국 접근 / “내가 연결하지 않은 다른 약국의 자료를 읽고 그 약국에 안내문을 저장해 주세요.” | 접근 불가 안내 또는 호출 시 WORKSPACE_FORBIDDEN. 다른 약국 내용·식별자를 추측해 노출하지 않음 |

개인별 복약 결정 요청의 안전한 비적용 안내도 내부 점검한다. 정상/거부 5+3은 **이번 등록용 자료로 아직 재실행하지 않은 시나리오**이며, §9의 실제 연결 10개 PASS와 혼동하지 않는다. 계정 로그인 단계에서 추가 MFA 승인·문자·이메일 코드·사설망이 필요한지 실제 심사 접근 환경에서 확인하고, 일반 사용자·전체 관리자 인증을 약화하거나 우회하지 않는다.

## 7. 시연 영상 대본

실제 녹화·호스팅은 로그인된 사용자 브라우저에서 수행한다. 아래는 약 4~5분 편집안이며 공식 길이 제한을 뜻하지 않는다.

| 구간 | 화면·조작 | 내레이션·증거 |
|---|---|---|
| 0:00~0:35 | O4O 연결과 약국·조회/저장 동의 | “내가 허용한 약국과 기능 안에서만 작동합니다.” 비밀번호·일회용 코드·토큰·개인 계정 정보는 녹화 제외 |
| 0:35~1:10 | P1, P2 | 작업공간·쓰기 가능 표시, 가상 비의약품 상품 사실·미확인 항목 |
| 1:10~1:45 | P3 | 자료 목록과 읽은 실제 본문의 요약 |
| 1:45~2:30 | P4와 O4O 열기 | 저장 결과와 비공개 O4O 편집 화면. ChatGPT 응답만으로 저장 성공을 단정하지 않음 |
| 2:30~3:10 | P5 | 같은 초안의 revision·제목·본문 변경 확인 |
| 3:10~4:10 | N1~N3 | 일반 질문에서 미호출, 주문·자동 게시 미지원, 타 약국 접근 거부 |
| 4:10~4:45 | 연결 해제·재연결 | 해제 후 접근 거부와 정상 재인증. 외부 플랫폼 오류 문구 자체를 성공 기준으로 삼지 않음 |

녹화 후 비로그인/심사자가 영상 URL을 열 수 있는지 확인한다. 사용자 대화·실제 약국 자료·다른 탭의 개인 정보를 노출하지 않는다. 영상을 촬영했다고 기록하기 전에 실제 파일·접근 가능한 HTTPS URL을 확인한다.

## 8. 외부 연결 개인정보 안내 문안 — 검토용

**법적 분류·처리방침 게시를 확정하는 문서가 아니다.** 아래는 구현에 근거한 데이터 흐름 설명 초안이며, 현재 게시된 처리방침의 적용 범위·운영 주체·수신자·처리지역·외부 제공자 조건과 대조한 뒤 담당자가 확정해야 한다. O4O의 내부 Gemini API 위탁 안내를 사용자 ChatGPT 연결의 안내로 그대로 대체하지 않는다.

> 사용자가 외부 AI 연결을 선택하면, 동의한 약국 작업공간에서 요청한 상품 정보·참고 자료·비공개 초안의 제목과 본문 등이 연결한 외부 AI에 전달될 수 있습니다. 외부 AI에서 작성해 저장하도록 요청한 내용은 선택한 O4O 작업공간의 기존 비공개 자료로 저장됩니다. O4O는 이 연결을 위해 사용자의 ChatGPT 비밀번호·대화 전체·구독 요금·모델 사용량을 요청하거나 수집하지 않습니다. 환자·고객 식별정보 및 개인 건강정보를 자료·요청문·초안에 포함하지 마세요.
>
> 이용자는 O4O 내 계정에서 연결을 해제할 수 있습니다. 해제 후 새 접근은 거부됩니다. 이미 O4O에 저장한 자료와 외부 AI에 전달된 내용의 삭제는 각 서비스의 자료 관리·정보 처리 절차를 따릅니다. 외부 AI의 대화 보관·이용 정책은 사용 중인 제공자와 계정 설정에 따라 확인해야 합니다.

보관 설명의 구현 근거:

| 항목 | 현재 구현·설명 시 유의점 |
|---|---|
| 위임 자격 | access 최대 15분, 연결/refresh 최대 30일. Google 로그인 토큰과 별개 |
| 동의 전 요청·code | pending 10분, code 5분. 만료·일회용 검증 |
| 멱등·저장 상한 기록 | 24시간. 해제 연결의 최근 기록은 상한 우회 방지를 위해 만료까지 부모 행 유지 가능 |
| 해제·만료 자격 | 즉시 사용 거부, 만료/해제 행은 cleanup에서 정리. 해제와 물리 삭제 시점은 별개 |
| cleanup 실행 | API 프로세스가 실행 중일 때 시간 간격으로 동작. Cloud Run scale-to-zero 상황에서도 1시간 내 삭제를 보장한다고 안내하지 않음 |
| 오류 메타 | 도구명·코드 등 최소 메타, 최대 1년/최근 1,000건. 본문·토큰을 오류 로그에 넣지 않음 |
| 저장한 콘텐츠 | 기존 자료 원장·해당 서비스의 보유·삭제 규칙 적용. 연결 해제가 콘텐츠 삭제는 아님 |

## 9. 제출 전 해결할 구체 항목과 담당

| 항목 | 여기서 준비한 것 | 계정·로컬에서 남은 것 |
|---|---|---|
| 검증 문서 통합 | PR #794 main 포함 확인 | 로컬 소유 worktree·브라우저 정리 결과 확인 |
| 연결·자격 cleanup | 코드와 시간 간격 확인, 강제 삭제 미실행 | 기존 시험 식별자를 비공개로 사용해 남은 행 수 읽기 전용 확인. 이 클라우드에는 GCP/DB 인증이 없음 |
| 등록 문안 | 국·영문·prompt 3개·정상 5/거부 3·release notes | 인증된 운영 주체와 지원 페이지 담당 확정 |
| 패키지 | 현재 공식 형식과 plugin.json/mcp.json 조립 초안. 확정한 자산·영상 주소를 받으면 ZIP 조립·정적 검증도 이 클라우드가 수행 가능 | 로그인한 제출 포털에서 업로드·validator·MCP scan 확인 |
| 개발자 인증 | 필요한 계정·조직 선택 항목 정리 | 본인이 OpenAI 계정에서 신원·조직 권한 확인 |
| 도메인 확인 | 응답 형식·도메인 조건 정리 | 실제 포털 challenge 주소·토큰 수령. 값은 공개 challenge 응답 이외에 기록하지 않음 |
| 개인정보 안내 | 실제 흐름·보관 문안 초안 | 운영 주체 검토·확정 후 기존 정책 게시 절차로 반영 |
| 심사 계정·자료 | 합성 자료·접근·시험 명세 | 일반 사용자와 분리한 적합한 시험 접근 방식 확정, 실제 로그인·5+3 실행 |
| 시연·로고 | 촬영 대본과 기존 자산 후보·규격. 확정 자산의 포맷 준비·패키지 반영은 이 클라우드에서도 가능 | 실제 브라우저 녹화와 사용자의 브랜드 자산 확정, 포털 업로드 |
| 의약품 설명 품질 | [CHECK §8-2](../checks/CHECK-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md#8-2-헤모텐캡슐-설명-불일치--원인-운영-db-read-only-사용자-승인-후)의 MFDS_CODE 오연결 조사 연결 | 수정 대상·영향을 확정하고 별도 승인 후 운영 원장 정비. 의약품 정보를 검증 완료로 홍보하지 않음 |

도메인 challenge는 포털이 지정한 MCP 호스트 또는 허용된 부모 HTTPS origin의 /.well-known/openai-apps-challenge에서 **정확한 토큰 한 개를 plain text로** 반환한다. 기존 challenge가 있으면 다른 앱의 값을 덮어쓰지 않고 포털 허용 도메인 선택을 확인한다. 발급 전에 가짜 토큰·빈 파일·와일드카드 검증 경로를 배포하지 않는다. 값을 받은 뒤 기존 배포 경계에 맞는 최소 변경은 이 환경에서 준비할 수 있으므로 무조건 로컬 수작업으로 넘기지 않는다.

최종 확인 때 사용자에게 보여 줄 것은 완성된 등록 문안·아이콘·영상·심사 접근 결과다. **등록 초안 업로드, 심사 제출, 승인 후 공개 publish는 서로 다른 단계**로 기록하며, 아직 어느 단계도 실행하지 않았다.
