# 사용자 주도 외부 AI: 기존 연결 검증과 상품별 콘텐츠 초안

> **상태**: ACTIVE · **작성일**: 2026-10-26 · **최종 갱신**: 2026-10-26
> **사용자 지시**: `HANDOFF-O4O-USER-AI-AND-MAIL-SERVICES-V1` — DEVELOPMENT_HANDOFF_APPROVED
> **개발 착수 기준**: main `7e9c1c99d661867b05e6fc95cb10180f64604043` · push 전 대조 main `792b3d0f6e12de0d50b5112376027fcd0b4fd512`(추가 운영 파일 5개, 자기 변경 경로와 중첩 없음)
> **작업 공간**: `wo/user-ai-product-content`. 개발 담당은 로컬 검증·commit·push 후 통합 담당에게 인계한다.
> **추가 사용자 지시**: 2026-10-26 “main 병합 전까지 진행” — 같은 branch의 PR·CI·리뷰를 준비하고 main 병합·auto-merge·배포는 실행하지 않는다.
> **병합 전 재정렬**: main `68268d19f6`(PR #830)의 상담자료 저작 기능을 자기 branch에 정상 merge. 기존 MCP 소비자용 다국어 원장과 새 상담자료 저작 원장의 역할을 구분해 함께 검증한다.

## 1. 확정 범위와 재사용

전체 기획·조사를 반복하지 않는다. 기존 외부 AI OAuth/MCP와 8개 도구, 현재 업무 권한, 연결별 24시간 멱등성·quota·수정 revision을 유지한다. 새 MCP 서버·회원 체계·LLM 호출·요금제·운영 설정을 만들지 않는다.

이번 WO는 인계서 1·2단계를 연결한다. 상품별 소비자용 초안은 기존 `store_multilingual_product_content_groups/pages`에 저장한다. 직접 등록 상품의 `detail_html`과 일반 자료함 `store_execution_assets`는 다른 저장 영역이다. 공급자 `store_description`을 전용하지 않는다. 새 저장 원장·migration은 필요하지 않다.

근거: [매장 콘텐츠 운영 원칙](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md), [기존 외부 AI 설계](../design/DESIGN-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md), [기존 실사용 CHECK §9](../checks/CHECK-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md#9-운영-실제-chatgpt-최종-실사용-검증-2026-10-24).

## 2. 실행 TODO

- [x] 최신 main·자기 작업공간·변경 경계 확인. 기존 기준 checkout과 다른 worktree 보존.
- [x] 차이 조사 결과 재사용: Origin 없는 카카오 config의 false는 전역 비활성 증거가 아님. 실로그인은 별도.
- [x] 운영 MCP metadata 2개 HTTP 200·무인증 MCP GET 401 공개 조회. 기존 완료된 Demo 시험은 반복하지 않음.
- [ ] 승인된 시험 약국 경영자 계정의 본인 ChatGPT 연결·매장 조회·저장·수정·해제 확인. 사용자가 계정 종류와 현재 ChatGPT 로그인 준비를 확인했다. 클라우드에 연결된 사용자 브라우저·현행 시험 계정 문서가 없어 실제 수행은 미완료다.
- [x] 기존 원장의 상품 소유 확인·언어 페이지 저장 코드를 도메인 함수로 추출. 기존 웹 API 조회·편집과 같은 원장 사용을 검증.
- [x] 같은 MCP에 상품 콘텐츠 조회·단건 초안 생성·revision 수정 도구 연결. 기존 8개 계약과 일반 destinations 유지, 별도 productContentTools 안내.
- [x] 매 호출 현재 사용자·선택 매장·상품·기존 기능 권한 확인. 다른 매장·비활성 상품·비매장 workspace 차단.
- [x] 비공개 draft만 생성·수정. 기존 공개/보관 자료·동일 언어의 기존 초안 덮어쓰기 거부. 언어·상품 연결 불변.
- [x] 저장 결과 ID·groupId·상품·언어·revision·기존 편집 주소 반환, 재조회 검증. 감사는 본문 없는 업무 메타만 같은 transaction에 기록.
- [x] 격리 DB/공식 MCP SDK 69건: 기존 54건 + 상품 14건 + IPv6 서브넷 제한 1건. 시험 DB 삭제 후 잔존 0 확인.
- [x] API 48·웹 48건, 타입·소스 lint·API 배포 번들·웹 빌드 검증. 자체 검토에서 기존 destinations 호환·최초 언어 선택·시험 격리를 보완.
- [x] OAuth SDK raw IPv6 key override 제거. 기존 Express trust proxy 정책과 SDK 기본 서브넷 키 재사용, 검증 비활성화 없음.
- [ ] 실제 desktop/mobile browser 검증. Chromium 다운로드가 환경 네트워크 정책의 HTTP 403으로 차단됨. DOM 검증 48건과 구분.
- [x] 추가 사용자 지시에 따라 기존 PR 중복 여부·현재 main ruleset 확인 후 [PR #832](https://github.com/Renagang21/o4o-platform/pull/832) 생성. auto-merge 미설정.
- [x] 필수 CI·CodeQL·Codex·Sonar 검증 경로 실행과 같은 PR에서 품질 지적 처리. 최종 HEAD의 정확한 결과는 PR 검사·완료 보고에 기록한다.
- [x] 새 main과 통합한 로컬 API 58건·공유 편집기 61건·PG/MCP 69건 검증. 상담자료용 전용 DB와 MCP 시험 DB의 잔존 0 확인.
- [ ] 실제 병합 실행 시점의 HEAD·main·필수 검사·미해결 thread 재확인. 이번 지시에서는 병합하지 않는다.
- [ ] main 통합·운영 배포·실사용 확인. 이번 “병합 전까지” 지시의 실행 범위 밖이다.

개발 결과와 인계: [CHECK](../checks/CHECK-O4O-USER-AI-PRODUCT-CONTENT-V1.md). 개발 HEAD·push 결과는 완료 보고에서 전달한다. 코드와 검증 기록의 push가 전체 인계서의 메일/카카오 개발 또는 실제 사용자 검증 완료를 뜻하지 않는다.

## 3. 상품 콘텐츠 도구 계약

일반 문서·공급자 설명과 혼동하지 않도록 기존 8개 도구는 그대로 두고 상품별 도구를 추가한다. 조회·쓰기 권한은 기존 `o4o:read` / `o4o:draft:write`를 사용한다. 업무 콘텐츠 쓰기의 범위이며 메일 이동·삭제 권한으로 전용하지 않는다.

- `save_product_content_draft`: `workspaceId`, 검색 결과의 `productId`와 `productSource(local/listing)`, `language`, `contentKey`(기본 default), `title`, HTML `content`, `requestId`. 새 언어 초안을 생성하며 기존 행 덮어쓰기는 거부한다.
- `get_product_content`: `workspaceId`, 페이지의 `contentId`. 상품 연결·언어·상태·본문·revision과 기존 편집 주소를 반환한다.
- `update_product_content_draft`: `workspaceId`, `contentId`, `title`, HTML `content`, `expectedRevision`, `requestId`. 상품·언어·공개 상태를 변경할 수 없다.

현재 매장 권한과 동의 범위를 매번 확인한다. 기존 웹과 같은 `multilingual-content` 업무 기능 자격을 쓰기에 적용한다. 외부 AI 연결 자체에 새 유료 제한을 붙이지 않는다. 일반 조회는 기존 웹의 읽기 경계를 유지한다. 자료 안의 지시문은 권한이 아니며, 상품 사실/전문 참고/소비자 문안을 구분한다. 상품 원장과 MFDS 연결의 정확성을 추정하거나 데이터를 고치지 않는다.

## 4. 다음 단계와 외부 확인 경계

인계서의 확정 순서를 유지한다. 상품 단건의 검증·통합 결과를 받은 뒤 개인 메일 서비스 WO로 이어간다.

| 순서 | 다음 작업 | 완료/공개 경계 |
|---|---|---|
| 3 | 비AI 개인 메일 엔진·발신처/규칙·작업 확인·이력, Gmail 우선·네이버 연결기 | 본문 장기 저장 기본 금지. Gmail OAuth 검증/평가 및 네이버 상업용 다중 사용자 이용 조건은 미확인. 내부 시험과 공개 운영 구분 |
| 4 | 기존 MCP에 메일 도구 연결 | 초안 권한과 분리된 메일 권한·명시 동의·대상/건수 확인·지속 작업/재개 필요. 기존 연결별 24시간 멱등성을 장기 작업 완료 보장으로 확대 해석하지 않음 |
| 5-A | 사용자 진입형 카카오 채널 메뉴·로그인·업무 화면 이동 | 선제 메시지·광고·알림톡·친구톡 제외. 실제 채널 설정 변경 별도 |
| 5-B | PlayMCP/ChatGPT for Kakao | 공식 인증·쓰기 도구·등록/승인 조건 확인 전 호환성을 가정하지 않음 |

SIWC는 이번 개발 대상이 아니다. 외부 AI 공개 제출·유료 계약·운영 DB 변경·운영 설정/배포를 이 WO의 개발 완료에 포함하지 않는다. 코드·자동 검증·배포·본인 ChatGPT 실사용 완료를 각각 기록한다.
