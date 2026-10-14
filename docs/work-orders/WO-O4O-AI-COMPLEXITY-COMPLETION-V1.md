# AI 실행부·편집기 lifecycle·전체 소비처 정비

> **상태**: COMPLETED (코드·검증 완료, branch 전달)
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (Asia/Seoul)
> **근거 WO/IR**: 사용자 세 묶음 진행·push 지시 · [실행 문맥 정비](WO-O4O-WORK-AGENT-CONTROL-LIFECYCLE-MAINTENANCE-V1.md) · [편집기 상태 정비](WO-O4O-AI-CONTENT-EDITOR-STATE-MAINTENANCE-V1.md)

## 조사·범위

최신 main `3809c42db3`에서 전용 branch/worktree를 만들고 앞 push `9a38882fcd`를 연결했다. 앞 unmerged AI 작업을 함께 보존한다. 최신 AI 경로/import 후보는 330 files / 4883 functions / 101 동일-body 그룹이다. 이전 지표와 모집단 차이는 supplier 상위 코드 정비 때문이다. 전체 repository 소비처도 import/reexport/alias/dynamic registry/문자열·raw-source까지 조사한다. 모든 플랫폼 업무를 변경하거나 모든 동일 body를 통합하는 작업은 아니다.

AGENTS·canonical index·[공통 소비처](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)·[자동화 §25](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)·[Assistant V2 §18](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md)·[Memory 배치](../baseline/O4O-ASSISTANT-MEMORY-PLACEMENT-POLICY-V1.md)·[업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)·[콘텐츠 운영](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)·[제작 흐름](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md)·[설치](../../SETUP.md)를 확인한다. 기존 Core/provider/권한·Node·Task 완료·저장 API/소유권을 보존한다. 새로운 서비스 공통화는 전체 소비처 계약과 기존 공통 구현을 비교한 뒤 판정한다. canonical/Freeze/index·DB·운영 인증·결제·실 PC·main 병합·배포 변경 없이 push까지다.

## 구조안·TODO

| 묶음 | 문제 | 정비 방향 |
| --- | --- | --- |
| 실행부 | execActOnce 분기 59·중첩 9, 읽기 dispatch 분기 38, 도움 기록 분기 40 | 행동 명령 선택/실제 실행/기록/표면별 오류 판단을 구분. 행동 실패 상태는 요청별 소유, 기록과 도움 이벤트는 순수 구조 투영 활용 |
| 편집기 | 모달 자체 743줄. 닫기/탭 변경/재생성 뒤 이전 응답·복사 timer가 상태 갱신 가능 | 생성·복사·화면 session을 좁힌 hook으로 정리. 늦은 응답은 새 화면에 반영하지 않음. POST 저장은 자동 취소/재전송하지 않으며 실제 성공 callback 유지 |
| 전체 구조 | 101 동일-body 후보와 미사용처럼 보이는 export | 전 repository 소비처/등록·정책·기존 공통 구현 확인. 실제 계약 없는 private 노출만 제거하고 나머지는 근거와 유지/통합 판정을 기록 |

편집기 성공 경로의 요청 body·headers/credentials·90초 URL guard·미리보기·YouTube/삽입·저장 4개 업무 계약을 유지한다. 늦은 응답 격리는 의도한 수정이다. 같은 저장 영역의 진행 중 write는 종료까지 추적해 중복 제출을 막고, 다른 저장 영역은 독립적으로 유지한다. 서버의 commit 여부를 브라우저 abort로 판단하지 않는다.

- [x] 최신 기준·상태/소비처 지도와 세 묶음 구조안 작성.
- [x] 행동/읽기/도움 기록 정비 및 기존 안전·재생·단위/계측 회귀.
- [x] 생성·복사·저장 lifecycle 정비 및 닫기/재진입/역순 응답·callback/동시 저장 회귀.
- [x] 전체 소비처·중복·미사용 후보 판정과 코드 정리.
- [x] API/package/소비 앱 build·lint·desktop/mobile mock smoke·문서/전후 지표 검증.
- 소유 경로 commit/push·원격 HEAD·미커밋 0 확인은 branch 전달 결과로 기록한다.

## 소비처·문서 정합

Work Agent의 HTTP/Assistant와 raw-source safety/privacy tests, content-editor Toolbar/RichTextEditor 및 CommunityContentWriteShell의 각 서비스 소비처를 함께 확인한다. raw-source 목록은 새 내부 파일까지 확대하고 기존 단언을 유지한다. 은퇴 매장 내부 AI를 다시 mount하지 않는다. 문서/공개 계약의 유지 여부와 실제 검증 결과는 완료 시 기록한다.

## 전체 소비처·중복·미사용 판정

AI 330개 후보에서 멈추지 않고 전 repository의 production TS/TSX/MTS/CTS **4,479 files / 47,528 functions / 805 동일-body 그룹**을 읽기 전용으로 수집했다. API·packages·services의 src이며 tests/fixtures/migrations/declarations는 모집단에서 제외했다. baseline의 수정 소스는 시작 HEAD로 재구성해 같은 도구/모집단으로 비교한다. 805개가 semantic 중복이나 이번 전체 삭제 대상이라는 뜻은 아니다. 이번 AI 관련 101개 후보는 모두 전역 hash 집합에 존재하고 4개는 추가 소비 소스를 발견했다. 전역 후보 생산 파일은 62개다.

상대 import 외에 package 이름/exports와 `@/` alias, reexport, literal dynamic import/require를 AST로 조사했다. **18,860개 선언 중 13,142개를 source 파일로 해석**, reexport 1,978개, literal dynamic 682개다. 미해석 5,718개에는 외부 package·선언·지원하지 않는 alias 등이 포함된다. 이를 미사용으로 취급하지 않는다. 비literal 호출이 이 TS 모집단에 발견되지 않았어도 JSON/registry/생성 등록·tools의 JS·raw-source 소비가 없다는 뜻은 아니다. `git` tracked symbol/파일 경로 검색과 source guard/route 등록도 함께 확인했다. static graph는 실행/정책 활성의 증거가 아니다. 전역 상대 declaration graph cycle 1개는 기존 값이며 이번 AI 경계는 0개다.

확인한 추가 소비: CLI get getter 2→7개, POP load callback 3→6개, selection/update callback 5→15개, slugify 2→3개. 단일 AI 서비스만 보고 Core를 만들지 않았다. 파일 schema 두 route는 공용 `/api/ai/file-understanding`의 authenticate+limit와 hospital surface의 기존 loginless+rate limit가 서로 다르다. 공통화는 동일 descriptor 검증만 옮기며 각 route의 보호·서비스 선택은 그대로다. 응답 parser 5개도 prompt/업무 출력 type·모델 선택은 유지하고 동일 필드 해석만 기존 common에서 사용한다. public package/Core export·schema·HTTP 계약을 추가하지 않았다.

미사용 후보 `markRecovered`: 전 tracked repo/소비처와 factory return type 사용을 확인했다. 함수는 현재 내부 완료 경로 2곳에서 사용하므로 유지하고, 소비하지 않는 private session 반환 method만 제거했다. module barrel/public package export/동적 등록으로 소비되는 이름은 lexical 검색 결과만으로 제거하지 않았다. Source 존재나 import 수를 근거로 은퇴 기능을 복구하지 않는다.

아래는 시작 시점 101개 후보 전부의 판정이다. `AI / 전역 / 소비 module`은 body 위치 수와 정적 module 소비 수다. callback의 captured setter/apiClient/route context가 다르면 동일 토큰이어도 통합하지 않는다. 유지 판정은 미해결 구현 TODO가 아니며, 사업/공개 계약 변경을 근거 없이 수행하지 않는 결정이다.

| 후보·hash | 생산 파일 묶음 | AI / 전역 / 소비 module | 판정·근거 |
| --- | --- | --- | --- |
| 001 · `237481b1687c` | ai-proxy.routes.ts, hospital.routes.ts | 2 / 2 / 1 | COMMONIZED — 기존 file-understanding 서버 경계에서 동일 descriptor 검증 |
| 002 · `8b6df41dacc0` | kpa.routes.ts | 2 / 2 / 1 | KEEP_OUTSIDE_AI — KPA 콘텐츠 태그 업무 규칙. AI 지원 import로 포함된 비AI 영역 |
| 003 · `cb30f4c1108b` | health-functional-food-store-description-ai-draft-dryrun.ts, health-functional-food-store-description-bulk-dryrun.ts | 2 / 7 / 0 | KEEP_CLI — 7개 CLI 옵션 getter. 운영/조사 실행 정책을 일반화하지 않음 |
| 004 · `3cdcf73ce5b8` | blog.ts, flexible.ts, productDetail.ts | 3 / 3 / 1 | COMMONIZED — 기존 ai-prompts/common 필드 파싱 재사용 |
| 005 · `2e4a8c4e4f7e` | storeQr.ts, storeSns.ts | 2 / 2 / 1 | COMMONIZED — 동일 short/long fallback을 기존 common에 배치 |
| 006 · `233adfde76eb` | assistant-task-store.ts, procedural-memory-store.ts | 2 / 2 / 5 | KEEP_SMALL — 2개 persistence의 작은 raw row adapter. 새 공통 저장소/추상화 비용 회피 |
| 007 · `132bbfa31709` | CommunityContentWriteShell.tsx, ResourceWriteModal.tsx, ResourceWritePage.tsx | 3 / 3 / 3 | KEEP_EXISTING_SHARED — 기존 shared-space-ui shell 존재. modal/page 상태 소유권 유지 |
| 008 · `ae9751c8e254` | PharmacyPopPage.tsx, StorePopStaffView.tsx | 3 / 6 / 3 | KEEP_EXISTING_SHARED — 기존 store-ui-core 우선. wrapper/폼 상태·권한을 동일 body로 대체하지 않음 |
| 009 · `9aaf01a690e2` | PharmacyPopPage.tsx, StorePopStaffView.tsx | 3 / 3 / 3 | KEEP_EXISTING_SHARED — 기존 store-ui-core 우선. wrapper/폼 상태·권한을 동일 body로 대체하지 않음 |
| 010 · `973197da983a` | PharmacyPopPage.tsx, StorePopStaffView.tsx | 3 / 3 / 3 | KEEP_EXISTING_SHARED — 기존 store-ui-core 우선. wrapper/폼 상태·권한을 동일 body로 대체하지 않음 |
| 011 · `72fab1a251b1` | PharmacyPopPage.tsx, StorePopStaffView.tsx | 3 / 3 / 3 | KEEP_EXISTING_SHARED — 기존 store-ui-core 우선. wrapper/폼 상태·권한을 동일 body로 대체하지 않음 |
| 012 · `d57ad5dd1853` | PharmacyBlogPage.tsx, PharmacyPopPage.tsx, StorePopStaffView.tsx | 5 / 15 / 9 | KEEP_EXISTING_SHARED — 기존 store-ui-core 우선. wrapper/폼 상태·권한을 동일 body로 대체하지 않음 |
| 013 · `ed6a10c3fcfc` | PharmacyPopPage.tsx, StorePopStaffView.tsx | 3 / 3 / 3 | KEEP_EXISTING_SHARED — 기존 store-ui-core 우선. wrapper/폼 상태·권한을 동일 body로 대체하지 않음 |
| 014 · `595234c95204` | PharmacyPopPage.tsx, StorePopStaffView.tsx | 3 / 3 / 3 | KEEP_EXISTING_SHARED — 기존 store-ui-core 우선. wrapper/폼 상태·권한을 동일 body로 대체하지 않음 |
| 015 · `ac872ac27e5f` | PharmacyPopPage.tsx, StorePopStaffView.tsx | 3 / 3 / 3 | KEEP_EXISTING_SHARED — 기존 store-ui-core 우선. wrapper/폼 상태·권한을 동일 body로 대체하지 않음 |
| 016 · `ef7cd2849b84` | ContentDocumentsPage.tsx, ContentListPage.tsx | 2 / 2 / 1 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 017 · `d7bb431c3ba2` | ContentDocumentsPage.tsx, ContentListPage.tsx | 2 / 2 / 1 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 018 · `85e41aeeb62a` | ContentListPage.tsx | 2 / 2 / 1 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 019 · `2ffb93dc15ce` | ContentListPage.tsx | 2 / 2 / 1 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 020 · `a5e9b49f2cf8` | ContentListPage.tsx | 2 / 2 / 1 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 021 · `7fabefe58feb` | OperatorMultilingualContentWritePage.tsx, StoreProductMultilingualContentPage.tsx | 3 / 3 / 3 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 022 · `d3ee1ca51958` | CreateContentFromResourcesModal.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 023 · `c4d600636ef6` | CreateContentFromResourcesModal.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 024 · `918ffcef3e80` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 025 · `56d46dbf884c` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 026 · `0638b73bedca` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 027 · `fcf0ebf42527` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 028 · `2f52dd85660c` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 029 · `0a824cd37f5e` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 030 · `f93ecd3947b5` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 031 · `b5bfa4ed5edd` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 032 · `dd6ee2948c8b` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 033 · `3613bef7a055` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 034 · `a86eb7e5b7db` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 035 · `d77c8300320f` | PharmacyBlogPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 036 · `1b0836aff9d7` | PharmacyPopPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 037 · `f7246c952a95` | ProductionMaterialEditorPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 038 · `9b7c167bba34` | ProductionMaterialEditorPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 039 · `81dd2ddc0798` | ProductionMaterialEditorPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 040 · `91fe9c9e8192` | ProductionMaterialEditorPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 041 · `9264419d70a5` | ProductionMaterialEditorPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 042 · `669c93f092e5` | StoreContentEditPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 043 · `006454e7f7cb` | StoreContentEditPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 044 · `a0d98943a922` | StoreContentEditPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 045 · `b3d97f4f321a` | StoreContentEditPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 046 · `7bf49850011f` | StoreContentEditPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 047 · `ee577d7eef7a` | StoreContentEditPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 048 · `ebb1d314407e` | StoreContentEditPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 049 · `d831fc6ab82c` | StoreContentEditPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 050 · `a2e31f48fdd3` | StoreDescriptionViewModal.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 051 · `fc45a5813656` | StoreDescriptionViewModal.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 052 · `c39d79fb9369` | StoreDescriptionViewModal.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 053 · `0940c8aac476` | StoreDescriptionViewModal.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 054 · `8c6dc2ddbfd3` | StoreDescriptionViewModal.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 055 · `4669773a1469` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 056 · `5da575f0415e` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 057 · `cc1178755ecb` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 058 · `cf19e914e48f` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 059 · `35d5bc0f12a0` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 060 · `871f3d4795da` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 061 · `9f0ba340caa8` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 062 · `a02de7f3c7d4` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 063 · `0941f5c8aa44` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 064 · `7842c2bd23fc` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 065 · `0ecdb80fdae6` | StoreDirectContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 066 · `aea40f67f67b` | StoreLocalProductsPage.tsx | 2 / 2 / 3 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 067 · `37457e77e51c` | StoreLocalProductsPage.tsx | 2 / 2 / 3 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 068 · `56132e6da976` | StoreProductDescriptionsPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 069 · `694e46f842d7` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 070 · `0b4eac5b24b3` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 071 · `ca1c093e7837` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 072 · `073c866aaa68` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 073 · `97b3a1131bb2` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 074 · `f292f377f3a9` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 075 · `dd109e101531` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 076 · `ef81bc35a995` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 077 · `9ba3a2eec0a5` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 078 · `ff33a47a3ae7` | StoreProductMultilingualContentPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 079 · `fc23d2321f3a` | StoreQrAiDescriptionPage.tsx | 2 / 3 / 3 | KEEP_SMALL — slug formatter. SEO/업무 공개 URL 계약을 AI 정비로 확대하지 않음 |
| 080 · `fd871f7d8ca7` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 081 · `c72232aaf6cb` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 082 · `8f5237bc5697` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 083 · `83297a64d2f5` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 084 · `92cde908edba` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 085 · `3302987ff3bf` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 086 · `98b1a206bfe9` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 087 · `bb5b05036638` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 088 · `10ebf29107c3` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 089 · `a22fdaa359a4` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 090 · `95e40d514aad` | StoreQrAiDescriptionPage.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 091 · `d2e2783385a5` | TabletScreenSetManager.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 092 · `3959cbf8d436` | TabletScreenSetManager.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 093 · `e99dbbe88d9d` | TabletScreenSetManager.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 094 · `4a3c8791053c` | TabletScreenSetManager.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 095 · `5519f7aff15e` | TabletScreenSetManager.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 096 · `649b4c8c89b8` | TabletScreenSetManager.tsx | 2 / 2 / 2 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 097 · `977c95645887` | ResourceWriteModal.tsx, ResourceWritePage.tsx | 2 / 2 / 2 | KEEP_PAGE_CONTEXT — modal/page의 별도 폼·저장·진입 lifecycle 유지 |
| 098 · `961e01f6ae24` | ResourceWriteModal.tsx, ResourceWritePage.tsx | 2 / 2 / 2 | KEEP_PAGE_CONTEXT — modal/page의 별도 폼·저장·진입 lifecycle 유지 |
| 099 · `b403fb416acc` | ai-clipboard.ts | 2 / 2 / 3 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 100 · `6cb8dc36202c` | ai-clipboard.ts | 2 / 2 / 3 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |
| 101 · `cee2a8e19bd2` | ai-clipboard.ts | 2 / 2 / 3 | KEEP_SERVICE_CONTEXT — 서비스별 client/route/role·local state binding 및 잔여 코드 보존. 동일 AST는 같은 실행 문맥의 증거가 아님 |

판정 집계: COMMONIZED 3개, KEEP_CLI 1개, KEEP_EXISTING_SHARED 9개, KEEP_OUTSIDE_AI 1개, KEEP_PAGE_CONTEXT 2개, KEEP_SERVICE_CONTEXT 83개, KEEP_SMALL 2개.


## 구현 결과·전후 지표

- `work-action-session.ts`: 행동 명령 선택, 실제 실행/기록, 안전·visual 실패 상태와 오류 해석을 요청별 session으로 분리했다. 제안/Node 소유권 검증, submit window guard, pre-executed unit의 재전송 금지, history/trajectory/계측 순서는 유지한다. DOM 오류 판정은 읽기에도 재사용한다.
- `work-proposal-dispatch.ts`: 읽기 진입점과 inspect/UIA/DOM 처리 책임을 나눴다. `work-task-session.ts`는 도움 event의 순수 구조 생성과 기존 best-effort 전송/저장 순서를 구분한다.
- `content-editor`: private view epoch, 생성/복사 hook, 순수 결과 preview를 분리했다. 닫기·입력 문맥/헤더 변경·재생성·unmount 후 이전 응답/복사 feedback을 무시한다. URL 90초 guard와 정상 요청 계약은 유지한다. POST 저장은 취소/재전송하지 않고 영역별 진행 중 write를 유지하며 원래 제작 callback은 실제 성공 때 한 번 호출한다. category GET cache는 헤더 문맥 변경 시 정리한다.
- 파일 descriptor 검증은 기존 file-understanding 서버 경계에서 공유하고, 5개 응답 parser는 기존 ai-prompts/common을 재사용한다. Core/public barrel·제공 업체/모델·과금/권한 계약은 변경하지 않았다.

| 동일 측정 도구·대상 | 전 | 후 |
| --- | --- | --- |
| AI 경로/import 후보 파일·함수 | 330 / 4,883 | 335 / 4,922 |
| AI 동일-body 그룹 / 상대 runtime cycle | 101 / 0 | 98 / 0 |
| 전체 production 파일·함수 | 4,479 / 47,528 | 4,484 / 47,567 |
| 전체 동일-body 그룹 / 상대 runtime cycle | 805 / 1 | 802 / 1 |
| `execActOnce` → session `execute` 자체 분기 / 중첩 | 59 / 9 | 24 / 2 |
| `dispatchRead` 자체 줄 / 분기 | 182 / 38 | 9 / 2 |
| `recordAssistance` 자체 줄 / 분기 | 114 / 40 | 72 / 17 |
| `AiContentModal` 자체 줄 / 분기 | 743 / 86 | 620 / 77 |

자체 줄은 내부 함수 body를 제외하는 AST 추정치다. 분리한 코드까지 없어졌다는 뜻이 아니다. 명령 선택 `sendWorkAction`은 14분기/중첩 8, 실패 해석은 19분기, 도움 event 구성은 23분기, DOM 읽기는 22분기로 각 책임에 남는다. `runWorkAgent` 자체 분기는 61로 유지되며 총 body는 508→413줄이다. 도구 지표는 Sonar/ESLint 복잡성이나 미사용 증명이 아니다. 신규 hash 중복은 없고 제거된 그룹은 위 001/004/005와 일치한다. 다른 서비스 문맥의 98개 유지 판정은 미해결 TODO가 아니다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| frozen lockfile 설치·API 의존 package build·API build | PASS |
| content-editor typecheck·Neture 의존 package build·Neture app build | PASS (기존 chunk 크기 경고) |
| 변경 TS/TSX lint | PASS: 오류·경고 0 |
| Work runtime·계획·안전·재생·Task/계측 | 23 suites / 297 tests PASS |
| schema·parser·file understanding·hospital | 4 suites / 86 tests PASS |
| 매장 내부 AI 은퇴·editor/외부 LLM 경계 | 4 suites / 142 tests PASS |
| 편집기 기존 상태/저장 패널 + 신규 lifecycle | 3 files / 34 tests PASS |
| audit + Level 3 CI Node tests | 34 tests PASS |
| 공통화 전후 동일 fixture 비교 | 2 suites / 52 tests PASS (위 수치에 중복 합산하지 않음) |
| desktop/mobile 실제 Modal mock smoke | PASS: 생성/삽입·URL, desktop 저장 계약, 늦은 응답 격리, runtime/console error 0 |
| 정상 생성 화면 전후 pixel 비교 | desktop 1280×900 / mobile 390×844 모두 차이 0 |
| 문서 민감정보·상대 링크·staged scope·diff | PASS |

Jest 고유 합계는 31 suites / 525 tests다. lifecycle 신규 11개는 close/reopen/StrictMode/입력·헤더 문맥/역순 응답/90초 timeout/복사 timer/unmount/영역별 저장·원래 callback을 검증한다. raw-source safety 목록은 실제 새 owner 파일을 포함하도록 확대했고 기존 단언은 완화하지 않았다. public 소비처 전체 import/등록·role/경계 검토와 공통 component 검증이며 모든 서비스의 운영 로그인 smoke를 수행했다는 뜻은 아니다. 테스트 계정 파일은 이 환경에 없고 브라우저 확인은 격리 mock fixture다. 운영 DB·실 PC Node·유료 호출·운영 인증은 사용하지 않았다.

## 전달·문서 정합

[공통 소비처 CHECK](../checks/CHECK-O4O-AI-COMPLEXITY-MAINTENANCE-V1.md)에 소비처 매트릭스와 검증 한계를 기록한다. 이전 WO는 당시 실행 기록으로 보존하고 canonical/Freeze/index는 수정하지 않는다. 코드와 문서의 Core/Extension/provider·권한·저장/실행 확인 책임은 유지한다.

branch는 `wo/ai-complexity-completion`, 시작 main은 `3809c42db3`, 앞 AI 작업 연결 HEAD는 `0d0d051ae6`이다. 전달 직전 fetch에서 main `e388b1534f`의 다른 세션 phase2 정비가 같은 runtime/Modal을 변경한 것을 확인했다. AGENTS §4-1(d)에 따라 움직인 main을 자동 병합하지 않는다. 이번 검증은 본 branch의 구현에 대한 결과이며 최신 main과 합친 결과의 검증이 아니다. main 통합 시에는 양쪽 session/hook 경계와 신규 raw-source/lifecycle tests를 함께 조정해야 한다. 사용자 종료 범위는 push까지이며 main 반영/PR merge/배포는 수행하지 않는다.
