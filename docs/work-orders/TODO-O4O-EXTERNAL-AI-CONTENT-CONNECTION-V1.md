# TODO-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1

> 상태: ACTIVE — 전체 작업공간 개발·검증 완료, 같은 branch push 인계 · 운영 활성화 전 · 작성일: 2026-10-22
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

## 전체 범위 연속 작업 (2026-10-22 사용자 지시)

작업을 나누지 않고 같은 branch에서 공급자·약국·협력조직·공동/사업 커뮤니티를 모두 연결한다.

- [x] 기존 약국 원장·직원 권한·자료함 편집/이용 경계 조사 및 adapter
- [x] 협력사업/협동조합 운영 관계·기존 콘텐츠 draft 원장 연결
- [x] 독립 커뮤니티 및 사업 게시판의 가입·폐쇄형 게시판·작성자 권한 연결
- [x] 작업공간 종류별 설정·동의·실행 시 재검증, 저장처/상품 지원 범위 안내
- [x] O4O 편집 화면에서 초안 열기·명시적 게시 흐름 확인 및 보완
- [x] 네 종류 모두 격리 DB/MCP 왕복·오소유·중지·권한 회수·충돌·멱등 검증
- [x] 관리자·동의 UI desktop/mobile 및 영향 소비처 검증
- [x] 설계/CHECK 최종 정합·commit·push (PR·병합·배포 제외)

이미지·영상의 바이너리 전달 및 실제 외부 provider 생성 호출은 기존 텍스트 초안 연결 계약에 포함되지 않는다.
영상 구성안·상품 설명·일반 글 등 텍스트 콘텐츠는 기존 공간에 저장하며 실제 파일은 기존 제작환경에서 관리한다.

## 검증·운영 경계

실제 ChatGPT 계정 연결과 Google 로그인은 운영 공개 endpoint/승인 계정이 준비된 후 별도로 확인한다.
이번에는 일회용 로컬 fixture와 공식 MCP client를 사용하며 실제 외부 AI 호출·운영 업무 데이터는 만들지 않는다.
신규 migration은 push에 포함하지만 운영에 적용하지 않는다. 연결 기본값은 중지다.

개발 검증 결과와 운영 적용 조건은 [CHECK](../checks/CHECK-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md)에 기록한다.
현재 로컬 검증: 격리 DB/MCP 40건, API 164건, admin 446건, Neture 24건,
Store 6건, 약국/메가팜 공통 게시판 9건, 조합 16건, desktop/mobile 12건 PASS.
frontend 전체 타입·API 타입/컴파일·bundle, 변경 5개 웹 build, 정적 검사와 문서 검사를 완료했다.
일반 게시판의 draft 비공개 누락도 보완하여 실제 원장 저장부터 본인의 게시까지 검증했다.
테스트 DB 0개 및 전용 컨테이너 제거를 확인했다. 실제 ChatGPT·Google 인증, PR·병합·배포·운영 DB 적용은 미실행이다.

최초 구현 `9b0067ef7a` 및 상태 기록 `5a1382dfd7` 뒤의 같은 branch에서 전체 범위를 연속 보완했다.
최종 원격 HEAD는 완료 보고에서 확인한다. 새 migration 추가 없이 최초 연결 원장 6개 테이블과 기존 콘텐츠 원장을 사용한다.

## 통합 단계 추가 지시 (2026-10-22)

사용자가 개발 push 뒤 main 병합·운영 배포를 지시했다. 위 개발 종료 기록과 구분하여 아래를 진행한다.

- [x] 최신 main merge 및 변경된 공통 소비처 재검증
- [x] PR #766 생성, Codex 지적 2건 보완 및 43개 격리 DB 통합 검증
- [x] 재리뷰의 동의 요청 저장 상한 보완 및 HTTP/DB 동시성 포함 46개 통합 검증
- [ ] 최종 HEAD의 필수 CI·재리뷰·미해결 스레드 확인 후 PR merge
- [ ] post-merge CI·Delivery 판정 및 운영 migration 실행 승인 확인
- [ ] 표준 API 선행 배포·영향 프런트 배포·협동조합 frontend_only 배포 확인
- [ ] 서빙 SHA/health 확인 및 종료 보고 (실제 ChatGPT 활성화는 별도 설정·계정 검증 필요)
