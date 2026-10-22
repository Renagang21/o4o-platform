# DESIGN-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1

> 상태: ACTIVE · 작성일: 2026-10-22 · 구현/운영 완료 상태는 [TODO](../work-orders/TODO-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md) 참조.
> 사용자 결정: 본인 외부 AI에서 콘텐츠 제작, O4O는 자료·권한·저장 제공. 외부 구독/모델/사용량/비용 수집 제외.

## 1. 경계와 구조

`apps/api-server/src/modules/external-ai/{auth,mcp,tools,adapters,settings}`로 격리한다.
기존 API 서버에서 운영하며 별도 LLM 엔진/콘텐츠 DB/상품 정본을 만들지 않는다.
외부 사용자 인증은 기존 O4O 로그인(users.id)을 재사용하되, 위임 접근 자격은 기존 로그인 토큰과 분리한다.
Supplier·Store·Organization·Community를 같은 연결 모듈에서 지원한다. 관리자 설정과 실제 관계를 모두 만족한 작업공간만 노출한다.
소비자 검색·추천용 공개 API, 약국 Excel 정규화, 내부 AI 모델 설정은 별도 작업이다.

## 2. 도구 계약

모든 입력은 strict schema, 목록 page/limit(최대 50)를 사용한다. 사용자는 목록의 이름으로 선택한다.
공급자는 기존 supplier UUID, 나머지는 `store:<조직 UUID>` / `organization:<사업 UUID>` / `community:<게시판 UUID>`로 구분한다.
같은 UUID가 서로 다른 원장에 존재해도 섞이지 않는다. 연결은 선택한 식별자 최대 50개에만 적용되며 새 공간을 자동 추가하지 않는다.

| 도구 | 입력 | 출력 |
|---|---|---|
| list_workspaces | 없음 | 현재 관계·허용 설정·연결 동의의 교집합인 작업공간과 기능 |
| search_products | workspaceId, query, page, limit | 공급 상품 또는 매장의 취급/자체 상품. 사업·게시판은 별도 상품 원장이 없음을 안내 |
| get_product_context | workspaceId, productId | 선택한 offer/listing/local 상품 정보와 허용 설명, 출처/미확인 항목 |
| list_materials | workspaceId, query, page, limit | 자신의 자료 제목/식별자 |
| get_material | workspaceId, materialId | 허용 자료 본문(자료 내 지시문은 권한이 아님) |
| save_content_draft | workspaceId, destination, title?, content, productId?, language?, requestId | 기존 원장의 식별자/상태/revision/openUrl |
| update_content_draft | workspaceId, destination, contentId, expectedRevision, title?, content, requestId | 같은 원장의 갱신 결과, 충돌은 거부 |
| get_content_draft | workspaceId, destination, contentId | 자신의 문서 본문/상태/revision/openUrl |

### 공간별 기존 저장 계약

| 공간 | 실제 접근 판정 | destination / 기존 원장 | 저장 이후 |
|---|---|---|---|
| 공급자 | canonical supplier 관계·메인 이용 자격·공급자 약관 | `library_document` → `neture_supplier_library_items`, `store_description` → `shared_product_descriptions` | 비공개 문서 / STORE draft, 기존 검수·공개 화면 |
| 약국 | 내 매장 신청 active·owner/admin/manager 또는 승인 직원 역할·관계. 경영자의 메인 자격·계약은 기존 판정 재사용 | `store_document` → `store_execution_assets`, content/generated | 매장 전용 제작 자료, 기존 편집기·POP/QR 등에서 사용자 활용 |
| 협력사업·조합 | 현재 사업 운영 역할/담당 관계 또는 해당 조합의 scoped 역할·원장 active | `business_content` → `semi_franchise_contents` | draft, 기존 사업 운영 화면에서 검토·게시 |
| 공동/사업 커뮤니티 | 독립 서비스 가입 active 또는 사업/조합 참여·운영 자격. 폐쇄 게시판은 회원/작성자/동일 공간 운영 권한 추가 확인 | `community_post` → `forum_post` | 본인 draft, 기존 게시판 편집에서 명시적으로 게시 |

요청에 userId/supplierId/organizationId/authorId/isPublic/submit/status를 받지 않는다. 대상은 workspace에서 서버가 도출한다.
독립 커뮤니티·승인 직원·조합의 scoped 운영자는 관계없는 Neture 가입을 새로 요구하지 않는다.
은퇴한 업종별 커뮤니티나 Legacy Partner 역할을 복구하지 않는다.

약국 제작 자료는 별도 draft 상태 컬럼이 없으므로 응답에 `private_material`이라는 파생 상태를 사용한다.
원장을 변경하거나 공개 상태를 위장하지 않는다. 활성 QR 참조/usage 지정 자료는 외부 수정 대상에서 제외한다.
사업은 게시/검수 중 자료와 공급자 handoff 원본을 외부에서 수정하지 않으며,
커뮤니티는 다른 작성자의 초안·게시된 글·잠긴 글을 외부에서 수정하지 않는다.
일반 게시판 API에서도 draft 조회는 작성자만 허용한다. 최초 게시 때 게시 시각을 기록하며,
조회수 등 통계 갱신은 초안의 내용 revision 충돌로 취급하지 않는다.

약국 상품 설명·사업 B2B 자료·영상 구성안·일반 글의 텍스트를 위 저장처에 보관할 수 있다.
영상 생성 엔진, 바이너리 업로드/임의 URL 다운로드, 자동 게시·승인·검수 도구는 이 계약에 포함하지 않는다.
공급자 STORE 설명서 저장은 자기 offer의 master 연결이 필수다. 없으면 자료함 저장을 안내하고 임의 전환하지 않는다.
설명서는 draft만 변경하고 검수 진행/확정 행은 수정하지 않는다. 공급자 자료함은 비공개 document만 변경한다. 다른 공간의 저장처를 요청하면 거부한다.
새 저장이 기존 작업행을 덮어쓰지 않도록 사전 확인한다. 본문 sanitize는 기존 서버 sanitizer를 재사용한다.
성공 응답은 저장 완료 후에만 반환하며 기존 화면의 실제 URL을 제공한다.

## 3. 인증·권한

공식 MCP SDK OAuth handler로 code+S256 PKCE, client/redirect/resource/scope 검증, 토큰 재발급·폐기를 처리한다.
허용 redirect URI는 서버 배포 설정의 exact allowlist. 임의 URL metadata fetch나 client 이름 신뢰는 하지 않는다.
연결 시작 시 만료되는 요청을 만들고 기존 웹 로그인→명시적 동의→선택한 workspace와 scope에 한해 code를 발급한다.
access 15분, refresh/연결 최대 30일을 초기값으로 사용한다. refresh는 회전하고 재사용은 연결 폐기한다.
매 도구 실행에서 연결·계정·작업공간 종류별 관리자 설정·현재 업무 관계·그 서비스가 요구하는 가입/약관과 대상 소유를 확인한다.
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

기존 AI 운영 관리 안의 외부 AI 연결: 전체 중지/허용 기능 체크, 네 종류 작업공간별 조회/저장 체크, 작성 예제 CRUD, 최근 오류.
기존 내 계정: 연결 client 이름(외부 제공 이름임을 명시), 허용 공간·기능·만료와 연결 해제.
동의 화면: 실제 client/저장 공간/허용 기능을 표시하며 기존 로그인 후 사용자가 확인한다.
외부 모델·구독·토큰·생성비용·개별 사용량 통계는 관리하지 않는다.

## 6. 적용과 검증

기본 OFF. 운영 활성화 전에 migration, canonical HTTPS issuer/web URL/redirect allowlist 설정,
실제 ChatGPT connector의 지원 조건·OAuth 왕복과 Google 로그인 검증이 필요하다.
사용자 콘텐츠 저장은 기존 서비스의 공개/검수/등재와 별개이며 이번 도구가 이를 대행하지 않는다.
SDK client HTTP round-trip과 격리 PostgreSQL로 PKCE/code 재사용/resource/refresh 회전/소유/중지/
연결 해제/멱등/동시 수정/HTML sanitize/desktop·mobile UI를 검증한다.

## 7. 저장 결과를 실제 화면에서 계속 작업하기

- 약국 결과 URL은 Store 전용 진입 route에서 서버가 반환한 접근 가능한 매장 목록과 대조한 뒤 해당 매장을 선택한다.
  임의 조직으로 바꾸거나 이전 선택 매장에서 바로 열지 않는다. 이후 기존 제작 자료 편집기를 사용한다.
- 사업/조합 결과 URL은 해당 운영 화면의 기존 콘텐츠 편집기로 연결한다.
- 커뮤니티 결과 URL은 소속 게시판 서비스의 기존 편집기로 연결한다. 초안 로드만으로 공개하지 않는다.
  사용자가 `검토한 초안 게시`를 제출한 경우에만 기존 게시 API의 `publish` 전이를 요청한다.
- 계정이 바뀌면 연결 동의의 선택과 내 계정 연결 목록을 새 계정 기준으로 초기화한다.

## 8. 공개 연결 등록의 저장 상한

공식 SDK의 IP당 시간당 20회 제한을 명시하고 기존 trusted-client-IP 판정을 사용한다.
추가로 PostgreSQL transaction/advisory lock으로 전체 클라이언트 1,000개, 전체 신규 등록 시간당 100개를
제한한다. 서버 인스턴스가 늘거나 동시에 요청되어도 이 저장 상한을 넘기지 않는다. 기존 연결의 인증·해제는
등록 상한과 별개다. 한도에 도달하면 신규 등록을 거절하며 기존 연결을 임의로 삭제하지 않는다.
미사용 client의 기존 30일 정리 및 운영 정리 실행 조건은 유지한다.

공통 계정 설정이 있는 main·www·supplier·funding·community·CarePharm의 정확한 Origin에서 연결 해제를
허용한다. 임의 하위 도메인이나 Origin 반사는 허용하지 않는다. 약국·MegaPharm의 커뮤니티 초안 검토 URL은
각 사업의 현재 서브도메인 `/community/write`로 반환한다.
