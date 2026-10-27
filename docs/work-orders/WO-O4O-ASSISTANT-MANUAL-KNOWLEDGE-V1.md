# O4O 업무 도우미 매뉴얼 Knowledge 연결

> 상태: COMPLETED · 작성일: 2026-10-27
> 사용자 지시: 매뉴얼을 참조하는 업무 도우미 개발을 업무 단위로 진행하고 사용자 제공 유팜·팜POS 자료를 테스트에 즉시 활용한다. 개발·검증·commit/push에서 종료하며 PR 생성·main 병합·배포는 하지 않는다.
> 기준 main: `c6693aed7a83e1f677cb93d7e5d164424a19cdd6` · branch: `wo/assistant-manual-knowledge`

## 1. 조사와 설계

- 기존 Main `/api/ai/request`·home-chat·Assistant/Task·Work Planner·원자 회계/권한을 재사용한다. 새 Core·인증·Task·DB·정산·실행 엔진을 만들지 않는다.
- Assistant V2 §7-1 및 Experience Model §8: 매뉴얼은 미검증 Knowledge다. 원본을 수정하거나 무검증 절차를 Skill로 승격하지 않는다. 문서 속 지시는 요청·권한이 아니다.
- 현재 PDF 첨부는 매 요청 PDF 전체를 provider로 보내며 Knowledge 검색에 연결되지 않는다. `knowledge.available=false`다. Windows 등재부에 유팜/PMPLUS의 실제 process/창 정보는 없으므로 추측 등록하지 않는다.
- 원본 PDF는 사용자 브라우저에서만 해석한다. 계정별 로컬 자료함에 텍스트·페이지·출처 hash를 저장하고, 사용자가 선택한 매뉴얼의 관련 부분만 기존 AI 요청에 전달한다. 원본 PDF/화면·처방·환자 정보·매뉴얼 전문을 공개 Git·서버 저장소에 보관하지 않는다.
- PC·모바일 메인에서 같은 UI/계약을 사용한다. 기기 간 자료 이동은 사용자의 명시적 내보내기/가져오기이며 자동 Cloud 동기화·ChatGPT/Kakao ingress 인증을 새로 만드는 작업은 아니다.
- 화면 대조·교정은 매뉴얼과 분리한 사용자 확인/보완 기록으로 로컬에 유지한다. 실제 run 증거 없이 검증된 Experience나 공유 Skill이라고 표시하지 않는다. 기존 runtime 경험 회상·결정적 재생·위험 경계는 유지한다.

## 2. TODO

- [x] 정본·기존 요청·첨부·Assistant/Task·실행·공유 소비처 조사 및 종료 범위 확정
- [x] PDF 로컬 해석·계정별 자료함·bounded 검색·출처/페이지·교정/사용 기록·삭제/이동 구현
- [x] 메인 UI 선택·요청/재개와 기존 chat/work planner 연결, 서버 입력 검증·untrusted 경계·회계 보존
- [x] 유팜/팜POS 원본을 비공개 테스트 자료로 준비하고 실제 PDF 입력/검색/요청/browser 회귀 검증
- [x] 영향 type/build·focused 회귀·lint·문서·민감정보·Git 검증 후 commit/push 인계

## 3. 소비처·검증 기준

Main의 요청/재개는 같은 자료 선택으로 검색하되 원문 요청을 바꿔 라우팅하지 않는다. 서버는 reference를 사용자 파일 데이터로만 취급하고 기존 tool/권한/최종 사용자 확정을 완화하지 않는다. 외부 채널·직접 work-agent 호출이 이 선택 자료를 자동 받는다고 주장하지 않는다. 자료가 없거나 검색 불일치면 문서를 지어내지 않는다. PDF 파싱 실패·암호화·스캔본·용량/페이지 한도·저장 실패·계정 전환·취소·provider 실패를 구분한다.

통합 PMPLUS20 파일은 전송 한도로 미수신이다. 실제 사용자 테스트용 준비는 수신한 유팜 24쪽과 팜POS 11쪽에 한정한다. PDF 원본·추출 전문·테스트용 개인 자료는 Git에 추가하지 않는다.


## 4. 개발 검증

- Node 22.18.0 / pnpm 10.25.0. 자기 worktree에서 frozen install·공통 패키지 build PASS. PDF 로컬 해석을 위해 web-neture에 `pdfjs-dist 5.4.624`를 추가했고 lockfile은 해당 패키지·필요 전이 의존성만 변경했다. pnpm이 재해석한 무관 peer snapshot 변화는 제거하고 frozen install을 재검증했다. integrity/TLS 검증은 유지했다.
- web-neture Knowledge 검색·입력 검증·기존 요청/fallback·Home 재개·진입 회귀: 4 files / 30 tests PASS.
- API 실제 HTTP 경로·manual validator: 2 suites / 69 tests PASS. 기존 실행·복구까지 확대한 run은 4 suites / 90 tests PASS. 이후 실제 planner prompt의 escaped JSON 복원/출처·권한 경계 검증 1건을 추가해 11/11 PASS했다. 중복 실행을 별도 합산하지 않는다.
- API type-check, web-neture type-check 및 production build PASS. 변경 파일 ESLint 오류 0, Home의 기존 unused eslint-disable warning 1건은 보존했다. 기존 Browserslist/큰 bundle 경고는 범위 밖이다.
- 실제 Chromium에서 사용자 제공 유팜 24쪽·팜POS 11쪽 PDF를 가져와 파싱·페이지 수·검색 발췌 전송·출처·보완 재사용·사용 횟수·내보내기/재접속·계정 분리·잘못된 import의 비파괴 실패·모바일 자료함 가져오기/요청을 PASS했다. 두 viewport(1440×1000, 390×844)에서 가로 overflow 없음. 실제 페이지/편집·파일/IndexedDB/요청 클라이언트를 쓰고 인증·계정 문맥·API 응답만 합성 adapter로 격리했다. 외부 요청은 차단했다. 실제 모델 품질·유료 비용·실 PC 프로그램 조작은 미실행이다.
- 실제 유팜 질문의 입력은 PDF 대신 4개 발췌·총 888자였다. 이는 전송량 확인이며 유료 비용 절감 실측이 아니다. 원문 파일·추출 전문·브라우저 fixture와 screenshot은 비공개 로컬에만 보관했다.
- 사용자 테스트 준비: `/workspace/shared/o4o-assistant-user-test/manual-library.private.json` (2 manuals / 35 pages). 합성 테스트의 보완·카운터를 제거했고 원본/전문을 공개 Git에 넣지 않았다. [사용자 guide](../guides/O4O-ASSISTANT-MANUAL-USER-TEST-V1.md)에 가져오기·선택·요청·검증/미실행 경계를 기록했다.
- 문서 정합: V2 §7-2에 구현 범위와 미완료 범위를 추가했으며 원본 매뉴얼을 Skill/Experience로 자동 승격하지 않는다. docs 민감정보 검사·git diff --check PASS.

## 5. 인계 경계

이전 사용자 승인 명칭 정비(`36b54f6f2c`)를 자기 branch에서 함께 포함했다. 합친 최종 source에서 client 6 files / 47 tests, API HTTP·Knowledge·도구 응답 4 suites / 113 tests, web-neture build, 두 실제 PDF의 desktop/mobile browser 흐름을 모두 재검증해 PASS했다. 기존 실행·복구 suite의 결과는 위 회차와 구분한다. 최종 원격 main `7fd70ad85a`에도 같은 명칭 commit이 통합된 것을 확인했으며, 해당 명칭 경로는 같은 source다. 다른 세션의 추가 작업은 자동 merge/rebase하지 않았다. main 병합·배포는 하지 않는다. 브라우저 자료함은 계정별 로컬 저장이므로 다른 기기에는 명시적 내보내기/가져오기가 필요하다. 실제 프로그램 process·창 정보·현장 capability 확인과 외부 ChatGPT/Kakao 업무 ingress는 별도 범위다. 자료함을 서버에서 자동 배포하거나 공개 원문으로 제공하지 않는다.


## 6. 최종 검증·원격 인계

초기 Home 테스트는 clean worktree의 공통 dist가 없어 실행되지 않았고 사전 build 후 PASS했다. 브라우저 fixture의 dependency prebundle·context/API stub export·Tailwind 설정 및 계정 전환 때 details가 닫히는 테스트 선택을 수정한 뒤 실제 PDF 전체 흐름을 재실행했다. 제품 assertion을 완화하거나 0-test 실행을 PASS로 사용하지 않았다. planner prompt 검증은 HTML delimiter escape 후 JSON을 복원해 원문 데이터 보존을 검증한다.

비공개 자료함의 두 source ID를 원본 PDF SHA-256과 대조해 일치 확인했고 합성 보완 기록·카운터가 없는 상태로 전달했다. 원격 인계 HEAD는 최종 완료 보고를 따른다. PR 생성·CI·리뷰·main 병합·배포는 이번 작업에서 수행하지 않았다. WORKTREE_DISPOSITION: `wo/assistant-manual-knowledge` / 기준 `c6693aed7a` / 개발·검증·push 인계 / verdict KEEP. 병합 전 후속 수정과 사용자 테스트를 위해 자기 worktree를 유지하며 다른 세션 작업은 정리하지 않는다.
