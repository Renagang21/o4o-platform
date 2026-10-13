# O4O AI Core + Extension 공통 기반 정비

> 상태: COMPLETED · 작성일: 2026-10-13 · 근거: 사용자 AI 전반 조사·구조 정비 요청

사용자 요청의 승인 범위를 기록한다. F1 `@o4o/ai-core`에 additive 업무 실행 계약을 추가하고 기존 콘텐츠 번역에 연결한다. 기존 execute/provider 계약은 유지한다. F10 Auth/Membership/Approval/RBAC·DB schema·메뉴·결제·운영 인증은 변경하지 않는다.

순서: [조사·구조안·TODO](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md) → 공통 계약·실행 → 콘텐츠 번역 Extension → 권한·자료·실패·업체 교체·이력·기존 route 검증.
유료 호출·외부 계약/결제·운영 인증·DB write·배포는 별도 작업이다.

완료 범위: 로컬 구현·문서·관련 검증. main 통합/운영 배포/실제 유료 호출은 미실행. 같은 WO의 서비스 확대 단계를 `wo/ai-core-extension-foundation` 전용 worktree/branch에서 이어간다(사용자 2026-10-13 계속 진행 요청). 검증 세부·잔여 TODO는 구조안 §6·§8 참조.


## 서비스 확대 — 사용자 요청: push까지만

기존 번역 Phase를 commit한 뒤 최신 `origin/main`(`b3f792578a`) 위로 정리했다.
카탈로그의 현행 서비스 전체에 provider-neutral 질의/요약/초안 Extension을 등록한다.
LMS·운영자 추천/요약·공용 웹 리서치의 기존 업무 규칙도 같은 Core 계약에 연결한다.
공통 질의는 제출한 자료만 처리하며, AI 등록/서비스 선택으로 도메인 읽기·역할·가입을 부여하지 않는다.
공용 principal은 consumer read만 허용하며, staff 자료/초안/위조 actor 전달은 거부한다.
외부 계정·운영 키·결제·메뉴 재배치·DB schema는 범위 밖이다.
종료 범위는 관련 검증 → 작업 경로 commit → branch push. PR 병합/배포는 수행하지 않는다.
