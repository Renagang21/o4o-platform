# WO-O4O-SUPPLIER-NON-AI-WORKSPACE-CLOSURE-V1

> 상태: IN_PROGRESS · 작성일: 2026-10-15
> 승인: 사용자 지시 — AI를 제외한 잔여를 TODO·문서·코드로 점검한 후 구현·push·배포까지 수행.
> 담당: 이 세션이 개발·순차 통합·배포 결과 검증을 수행한다.
> 기준: `origin/main` `e6202355af0fc0f39a778d5a2bb51b76bab70896`, 기존 PR #629 HEAD `4e9f38aabceae8d99e6ab01073044d87c38cebde`.

## 1. 선행 작업과 실행 경계

[기존 업무 동선 WO](WO-O4O-SUPPLIER-WORKSPACE-TASK-FLOW-V1.md)의 push·PR 인계 이후,
같은 업무 동선의 review 보완·최종 검증·통합·배포를 이어가는 연속 Phase다.
미병합 [PR #629](https://github.com/Renagang21/o4o-platform/pull/629)의 자기 branch
`wo/supplier-workspace-task-flow`와 전용 worktree를 유지한다(AGENTS §4-1(a)의 연속 Phase 예외).
기존 COMPLETED WO/CHECK의 당시 결과는 수정하지 않는다. 이번 수정·검증·배포는 별도 CHECK에 기록한다.
통합 전에 자기 branch에 최신 main을 merge하고 재검증한다. force push·direct main push·gate 우회는 하지 않는다.

## 2. 문서·코드 점검과 확정 범위

- [x] Supplier Domain 및 역할별 업무공간 정본: 상품·주문·자료·판매활동의 기존 책임과 메뉴 도달성을 보존한다.
- [x] 소비자 commerce 경계·B2B 계약: payment-first, 기존 주문·배송 API를 유지한다.
- [x] 공통 변경 절차: 상품 Drawer의 운영자 소비처를 유지하며 공급자 복귀 문맥에서만 후속 작업을 표시한다.
- [x] 기존 PR review와 코드 대조: 아래 3건을 실제 수정 대상으로 확정한다.
- [x] 상품·주문·자료·판매활동의 대표 진입·상세·복귀·조회 실패/재시도·잘못된 대상·역할 경계를 문서·코드로 최종 점검한다.

| 확인된 문제 | 수정 방향 | 완료 증거 |
|---|---|---|
| 내장 HTML 가져오기 하단 취소가 상품 목록으로 이동해 기존 입력·파일을 잃음 | 모든 내장 종료를 부모 callback에 연결하고 복사 중 이탈을 막음 | 위/아래 취소·적용·실패 후 입력 유지 행동 검증 |
| 과거 설명서 행을 열어 저장하면 상품·언어의 현재 초안을 덮어쓸 수 있음 | 과거/게시 행은 조회만 허용하고 기존 작업 초안을 잘못 덮어쓰지 않도록 차단 | 동일 상품·언어의 과거/현재 행이 함께 있는 회귀 검증 |
| 검색 입력마다 목록·카운트 API가 재호출되고 debounce 후 중복 호출됨 | 입력 상태와 확정 URL 검색어를 분리하고 확정 시 한 번 조회 | debounce·페이지 초기화·뒤로가기/복귀 검증 |
| 모바일 설명서 목록의 언어별 상태 칩이 편집 버튼을 화면 밖으로 밀어냄 | 상태를 상품명 아래에서 줄바꿈해 표시 | 390px 브라우저의 문서 전체 가로 넘침 없음 |
| 같은 화면에서 URL 대상을 정상 상품에서 없는 상품으로 바꾸면 이전 선택/편집이 남을 수 있음 | 판매활동 3종은 선택을 비우고 사이니지는 이전 편집창을 닫음 | 컴포넌트 재마운트 없는 URL 전환 행동 회귀 |

AI 기능·내부 LLM·새 프레임워크·새 상태머신·DB/migration·권한/결제 정책·배포 설정 변경은 제외한다.
단순 행 수를 이유로 큰 화면을 추가 분리하지 않는다. 이미 종료된 기능 정비와 데이터 정리는 다시 열지 않는다.

## 3. TODO — 구현·검증

- [x] 내장 가져오기 종료 시 초안 보존 수정 및 행동 회귀.
- [x] 과거 설명서 읽기 전용 진입/편집 방어, 미저장 닫기·저장 실패 재시도 및 행동 회귀.
- [x] 상품 검색 debounce·URL·목록 복귀·폐기된 지연 검색 차단 및 행동 회귀.
- [x] 모바일 설명서 목록 상태 칩의 줄바꿈 보완.
- [x] URL 대상 전환 실패 시 판매활동·사이니지의 이전 선택/편집 잔류 차단. 관련 행동 25건·빌드·desktop/mobile fixture 재통과.
- [x] Sonar 14개 지적의 코드 보완: URL 조건문 중괄호·닫기 영역 접근성·props/state 명명·중첩 조건·상품/설명서 표시 책임 분리. 로컬 복잡도·ESLint·전체 1,019건·경계 41건·빌드·PC/mobile 회귀 PASS. 원격 Sonar 재분석은 통합 gate에서 확인한다.
- [x] 실제 잔여 census 결과와 수정 범위를 [CHECK](../checks/CHECK-O4O-SUPPLIER-NON-AI-WORKSPACE-CLOSURE-V1.md)에 기록.
- [x] web-neture 관련 테스트·타입/빌드·Supplier boundary·문서 민감정보·diff 검증.
- [x] desktop/mobile 격리 브라우저 smoke: 원문 입력 왕복, 상품/주문/자료/판매활동 대상·복귀·실패/재시도 확인.

## 4. TODO — push·통합·배포

- [ ] 명시적 파일 scope 점검 후 commit·push, PR 본문을 최종 범위와 검증에 정렬.
- [ ] 실제 main ruleset·정확한 HEAD의 CI·Codex findings·미해결 스레드·main 이동을 확인.
- [ ] 정상 PR merge 및 post-merge CI 확인.
- [ ] 진행 중 공유 배포와 충돌 없이 Delivery의 서비스별 분류·freeze·배포 결과 확인.
- [ ] 필요한 정식 배포 후 Neture serving SHA와 production status 확인.
- [ ] 운영 테스트 계정으로 desktop/mobile 읽기 전용 smoke, 권한/오류·toast/API 확인.
- [ ] CHECK·TODO를 실제 결과로 마감하고 문서 push·PR·통합, 자기 worktree 종료 조건 확인.

## 5. 데이터·배포 경계

행동/실패/저장 회귀는 격리 fixture 또는 정리 가능한 로컬 환경에서 수행한다.
운영 browser smoke는 조회·탐색만 하며 상품·주문·결제·배송·게시 등의 일회성 업무 데이터를 만들지 않는다.
로그인/접속·보안 감사기록은 정상 보존 정책을 따른다. 운영자 승인은 사용자가 담당한다.
사용자 계정값·credential·production 응답 원문은 문서·커밋·공유 로그에 남기지 않는다.

배포는 현행 README의 Delivery/promote·freeze·CI·권한 경계를 따른다.
누적 변경 때문에 미승인 migration/운영 DB write가 필요해지면 해당 작업을 자동 실행하지 않고 근거와 범위를 보고한다.
