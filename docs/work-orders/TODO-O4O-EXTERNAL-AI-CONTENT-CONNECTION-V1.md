# TODO-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1

> 상태: ACTIVE — 개발·검증·push 완료, 통합·운영 활성화 대기 · 작성일: 2026-10-22
> 사용자 승인: 외부 AI 콘텐츠 제작 설계 전체 개발, 검증·commit·push까지. PR·병합·배포·운영 DB 적용은 이번 범위 밖.
> 기준: main `7dc02646da`. 전용 branch `wo/external-ai-content-connection`.

## 목적과 범위

사용자의 외부 ChatGPT에서 기존 O4O 자료를 조회하고 자신의 기존 콘텐츠 공간에 저장한다.
O4O는 외부 ChatGPT 모델·구독·비용·토큰·대화 이력을 관리하지 않는다. 소비자 발견은 후속 작업,
약국 내부 자동화는 별도 AI 정비다. 내부 LLM 호출·공개/게시·상품 정본 쓰기를 추가하지 않는다.

## TODO

- [x] 기존 Supplier identity·자료함·상품 설명서·AI 관리자·내 계정 경로 조사
- [x] 도구 입력·출력·저장·권한·연결 보관 명세와 관련 정본 정합
- [x] 공식 MCP SDK 기반 Streamable HTTP 및 OAuth/PKCE 연결
- [x] DB 연결·자격·설정·멱등 저장 migration 작성, 격리 DB up/down 검증
- [x] 기존 Supplier 관계·메인 가입·계정·약관·콘텐츠 권한 재검증
- [x] 상품·자료 조회, 비공개 문서/상품 설명서 초안 저장·수정 도구
- [x] 관리자 허용 설정·예제 CRUD·도구 오류 확인
- [x] 사용자 연결 동의·작업공간 선택·연결 해제
- [x] MCP 실제 SDK client round-trip, 토큰/소유/중지/멱등/충돌 회귀
- [x] 관리자·사용자 desktop/mobile 브라우저 검증, 관련 type/lint/build
- [x] 변경 경로·검증·미실행·운영 적용 조건을 기록하고 commit·push

## 후속 적용 대상

최초 검증은 공급자다. 약국·협력조직·커뮤니티는 기존 저장·초안·작성 권한 계약을 확인한 adapter만
노출한다. 준비하지 않은 adapter는 기능 체크만으로 사용할 수 없으며 화면에 준비 상태를 명시한다.
이미지·영상 파일 전달, 다른 외부 AI의 실제 client 호환, 소비자 공개 조회는 완료로 보고하지 않는다.

## 검증·운영 경계

실제 ChatGPT 계정 연결과 Google 로그인은 운영 공개 endpoint/승인 계정이 준비된 후 별도로 확인한다.
이번에는 일회용 로컬 fixture와 공식 MCP client를 사용하며 실제 외부 AI 호출·운영 업무 데이터는 만들지 않는다.
신규 migration은 push에 포함하지만 운영에 적용하지 않는다. 연결 기본값은 중지다.

개발 검증 결과와 운영 적용 조건은 [CHECK](../checks/CHECK-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md)에 기록한다.
현재 로컬 검증: 격리 DB 24건, API 91건, admin 446건, Neture 17건, desktop/mobile 8건 PASS.
frontend 전체 타입, API/admin 타입·빌드, API bundle, admin/Neture production build, lint ratchet,
정적 guard와 문서 검사를 완료했다. 실제 ChatGPT·Google 인증, PR·병합·배포·운영 DB 적용은 미실행이다.

구현 commit `9b0067ef7a`를 위 작업 branch에 push했고, 인계 상태 기록을 후속 문서 commit으로 함께 보낸다.
