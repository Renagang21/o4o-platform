# O4O AI 코드 책임 분리 정비

> 상태: COMPLETED · 작성일: 2026-10-13 · 근거: 사용자 조사 후 정비·TODO 작성·push까지 요청

## 기준·경계

최신 main `e4c48811b6`에서 전용 `wo/ai-code-maintenance` worktree를 만들고, 앞 AI Core+Extension branch `a22cf86884`를 연결했다. 앞 branch는 아직 main에 없으므로 이번 branch는 그 변경을 포함한다.
[AI 공통 구조](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md), [공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [Assistant V2 §18](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md), [자동화 §25](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md), [콘텐츠 운영](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)을 먼저 확인했다.
기존 Auth/RBAC·도구 허용/인자 검증·COMMIT/credential 거부·자료 ownership·API·저장 순서·프롬프트·UI 의미는 유지한다. 새 기능/업체/유료 계약/DB schema/배포 정책은 추가하지 않는다.

## 조사·TODO

- [x] 파일 규모·책임·직접 import와 raw-source test 소비처 조사.
- [x] ai-proxy route에서 URL 수집/HTML·제목 변환을 자료 처리 모듈로 추출. route의 기존 인증과 요청 조립 유지.
- [x] AiContentModal에서 변환 유틸·저장 패널 표시를 분리. 요청/저장 handler·상태·완료 callback은 원래 위치와 동작 유지.
- [x] ai-tool-router에서 도구별 실행 책임 분리. 중앙 assertToolAllowed/validateToolArguments를 거쳐서만 dispatch.
- [x] WorkAgent에서 planner 연결과 종료 기록 단계를 분리. 재개/관찰/계획/실행/복구 loop의 순서·version/owner_key·raw 자료 미기록 유지.
- [x] 실제 동작 회귀와 이동한 코드의 raw-source contract를 함께 검증. 문자열 검사를 삭제하거나 assertion을 약화하지 않음.
- [x] shared package/API build·typecheck·관련 lint·docs 검사 완료 후 결과 기록.
- [x] 이번 경로만 commit하고 branch push. main 병합·배포 없음.

## 조사 결과와 구현 순서

| 대상 | 조사 시 문제 | 이번 분리 | 원래 파일 규모(전→후) |
| --- | --- | --- | --- |
| ai-proxy routes | HTTP/auth·URL 수집·HTML/제목 변환 혼재 | `routes/ai-proxy/url-content.ts` | 2,442→1,824줄 |
| ai-tool-router | 중앙 허용 판정·DOM·supplier 실행 혼재 | `dom-tools.ts`, `supplier-tools.ts` | 2,906→1,910줄 |
| WorkAgent runtime | planner 공급자 연결·실행 loop·종료 기록 혼재 | `work-planner.ts`, `work-run-finalization.ts` | 2,224→1,606줄 |
| AiContentModal | 변환·생성/저장 상태·패널 표시 혼재 | `ai-content-conversion.ts`, `AiContentSavePanels.tsx` | 1,881→1,520줄 |

1. 문서와 실제 import/raw-source 소비처를 조사하고 기존 공통 기반을 연결.
2. URL 자료 처리와 화면의 순수 변환/표시를 우선 분리.
3. 도구별 실행을 분리하되 중앙 `assertToolAllowed`→`validateToolArguments`→dispatch 순서 보존.
4. planner와 종료 기록을 분리하되 재개/복구 loop와 종료→workflow→experience→assistance 순서 보존.
5. 소비처와 mock 회귀, build/type/lint를 검증하고 이 문서와 코드만 commit·push.

기존 export 이름은 router/runtime의 re-export로 유지한다. DOM·supplier 모듈은 중앙 router에서 검증 후 사용하는 내부 실행부이며 공통 권한 대체 API가 아니다. URL 수집은 자료 처리 adapter, planner는 기존 provider 연결, 종료 기록은 기존 실행 이력 adapter, 저장 패널은 presentation 책임이다. 새 AI Core/업무 Extension/외부 업체 계층을 중복 생성하지 않는다.

## 별도 후속 TODO

- 원자 quota 예약/정산·DB 장애 시 허용 정책·이력 실패 관측: 기존 동작/DB 계약이 바뀌므로 별도 설계.
- 모델별 가격/통화/가격 버전·외부 계정: 기존 공통 계획 P2/P5.
- proxy/Core provider transport 중복: multimodal/grounding/구조화 편집/timeout/retry의 현재 차이를 고정한 뒤 통합. 이번에는 업체 호출 semantics 변경 없음.
- WorkAgent 남은 실행 loop 세분화: 이번 분리 후 실제 크기와 회귀 결과를 기준으로 후속 범위를 정함. 새 Runtime 최적화나 Assistant 단계 순서 변경 없음.

## 검증 결과

- API 기존 회귀: 19 suites / 366 tests. 최초 실행은 365 pass + 이전 파일 위치만 읽는 privacy 검사 1 fail. 검사가 `work-planner`·`work-run-finalization`까지 읽도록 확장한 뒤 해당 suite 12/12 pass. 원래 forbidden-key·필수 prompt assertion 모두 유지.
- AI Core/업무 Extension/서비스 HTTP/provider/model registry: 5 suites / 123 tests pass.
- URL 자료 처리 4 tests, 종료 기록 2 tests pass. cloud version 갱신 뒤 local write 실패 시 갱신 version 유지·cloud conflict 때 local write 생략을 확인.
- 저장 패널/HTML 변환 Vitest 4 tests pass. 저장 중·저장 완료 중복 방지, 실패 재시도, 분류 표시, callback과 변환 형태 확인.
- Chromium 데스크톱 1280×900·모바일 390×844: 실제 모달 생성→미리보기→커뮤니티/매장/제작 자료 저장 모두 pass, page error 0. 모든 API 요청을 intercept했으며 실제 유료 호출·운영 저장은 하지 않았다.
- `build:packages`, content-editor build, API build·type-check, Neture production build pass. 수정 코드 ESLint와 `git diff --check` pass. Neture의 큰 bundle/구형 Browserslist 안내는 이번 분리와 별개 기존 build 안내다.
- 후속 source 소비처(local agent / 외부 LLM 은퇴 계약 / Neture membership): 3 suites / 165 tests pass. 총 API 660 tests + UI 4 tests = 664 tests 통과(위 실패 항목은 수정 후 재검증 기준).
- 추출 함수 47개의 AST 본문을 기존 HEAD와 비교하여 동일함 확인. 종료 기록의 closure는 명시적 typed snapshot으로 전달하며 별도 version/owner 회귀 검사로 검증.
- 문서 정합: 앞 공통 구조의 Core 실행 계약·권한·비용 정책 경계는 유지. 이번 작업은 기존 adapter/runtime/presentation의 내부 책임 분리다. 은퇴한 매장 내부 AI 진입을 복구하지 않았다.

mock 검증은 실 PC/유료 provider/운영 적용 증적이 아니다. 실행 loop·UI 상태 관리·provider transport·quota 정책은 후속 TODO로 남긴다.
