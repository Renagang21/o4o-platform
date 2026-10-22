# DESIGN-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1

> 상태: ACTIVE · 작성일: 2026-10-22 · 구현/운영 완료 상태는 [TODO](../work-orders/TODO-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md) 참조.
> 사용자 결정: 본인 외부 AI에서 콘텐츠 제작, O4O는 자료·권한·저장 제공. 외부 구독/모델/사용량/비용 수집 제외.

## 1. 경계와 구조

`apps/api-server/src/modules/external-ai/{auth,mcp,tools,adapters,settings}`로 격리한다.
기존 API 서버에서 운영하며 별도 LLM 엔진/콘텐츠 DB/상품 정본을 만들지 않는다.
외부 사용자 인증은 기존 O4O 로그인(users.id)을 재사용하되, 위임 접근 자격은 기존 로그인 토큰과 분리한다.
첫 adapter는 Supplier. 이후 Store/Organization/Community adapter는 실제 업무 계약 검증 후 활성화한다.
소비자 검색·추천용 공개 API, 약국 Excel 정규화, 내부 AI 모델 설정은 별도 작업이다.

## 2. 도구 계약

모든 입력은 strict schema, 목록 page/limit(최대 50), UUID 식별자를 사용한다. 사용자는 목록의 이름으로 선택한다.

| 도구 | 입력 | 출력 |
|---|---|---|
| list_workspaces | 없음 | 현재 관계·허용 설정·연결 동의의 교집합인 작업공간과 기능 |
| search_products | workspaceId, query, page, limit | 자신의 공급 상품과 확인된 이름/제조사/포장/바코드 |
| get_product_context | workspaceId, productId | 자신의 offer에 연결된 상품 정보와 확인된 설명, 출처/미확인 항목 |
| list_materials | workspaceId, query, page, limit | 자신의 자료 제목/식별자 |
| get_material | workspaceId, materialId | 허용 자료 본문(자료 내 지시문은 권한이 아님) |
| save_content_draft | workspaceId, destination, title?, content, productId?, language?, requestId | 기존 원장의 식별자/상태/revision/openUrl |
| update_content_draft | workspaceId, destination, contentId, expectedRevision, title?, content, language?, requestId | 같은 원장의 갱신 결과, 충돌은 거부 |
| get_content_draft | workspaceId, destination, contentId | 자신의 문서 본문/상태/revision/openUrl |

destination은 `library_document` 또는 `store_description`. 요청에 userId/supplierId/isPublic/submit을 받지 않는다.
설명서 저장은 자기 offer의 master 연결이 필수다. 없으면 자료함 저장을 안내하고 임의 전환하지 않는다.
설명서는 draft만 변경하고 검수 진행/확정 행은 수정하지 않는다. 자료함은 비공개 document만 변경한다.
새 저장이 기존 작업행을 덮어쓰지 않도록 사전 확인한다. 본문 sanitize는 기존 서버 sanitizer를 재사용한다.
성공 응답은 저장 완료 후에만 반환하며 기존 화면의 실제 URL을 제공한다.

## 3. 인증·권한

공식 MCP SDK OAuth handler로 code+S256 PKCE, client/redirect/resource/scope 검증, 토큰 재발급·폐기를 처리한다.
허용 redirect URI는 서버 배포 설정의 exact allowlist. 임의 URL metadata fetch나 client 이름 신뢰는 하지 않는다.
연결 시작 시 만료되는 요청을 만들고 기존 웹 로그인→명시적 동의→선택한 workspace와 scope에 한해 code를 발급한다.
access 15분, refresh/연결 최대 30일을 초기값으로 사용한다. refresh는 회전하고 재사용은 연결 폐기한다.
매 도구 실행에서 연결·계정·관리자 설정·현재 업무 관계·메인 가입·필수 약관과 대상 소유를 확인한다.
읽기/쓰기 역할을 새로 발급하지 않으며 기존 role/relationship/credential 경계를 유지한다.
기능 중지는 이후 호출부터 적용하고 쓰기는 DB transaction 안에서 설정/연결을 다시 확인한다.

## 4. 보관

설정/작성 예제, OAuth client metadata, 연결 동의, 일회용 code 및 access/refresh 검증 정보,
동일 요청 중복 방지 결과, 최소 오류 코드를 기존 PostgreSQL에 구분하여 보관한다.
OAuth 자격은 해시만 저장하고 기존 로그인 토큰/Google token/AI API key를 재사용·저장하지 않는다.
연결·자격·요청은 계정 삭제 시 CASCADE. 만료 데이터는 모듈 정리 동작으로 삭제한다.
ChatGPT 대화·요청 본문·자료 본문·토큰을 오류 기록에 넣지 않는다. 오류 메타는 기존 AI 메타 보존기간을 따른다.
멱등 결과는 콘텐츠 복제본이 아니라 식별자와 수정 기준값만 보관한다. 재시도에도 현재 소유·공개/상태를 확인한다.

## 5. 관리자·사용자 화면

기존 AI 운영 관리 안의 외부 AI 연결: 전체 중지/허용 기능 체크, 준비된 작업공간, 작성 예제 CRUD, 최근 오류.
기존 내 계정: 연결 client 이름(외부 제공 이름임을 명시), 허용 공간·기능·만료와 연결 해제.
동의 화면: 실제 client/저장 공간/허용 기능을 표시하며 기존 로그인 후 사용자가 확인한다.
외부 모델·구독·토큰·생성비용·개별 사용량 통계는 관리하지 않는다.

## 6. 적용과 검증

기본 OFF. 운영 활성화 전에 migration, canonical HTTPS issuer/web URL/redirect allowlist 설정,
실제 ChatGPT connector의 지원 조건·OAuth 왕복과 Google 로그인 검증이 필요하다.
사용자 콘텐츠 저장은 기존 서비스의 공개/검수/등재와 별개이며 이번 도구가 이를 대행하지 않는다.
SDK client HTTP round-trip과 격리 PostgreSQL로 PKCE/code 재사용/resource/refresh 회전/소유/중지/
연결 해제/멱등/동시 수정/HTML sanitize/desktop·mobile UI를 검증한다.
