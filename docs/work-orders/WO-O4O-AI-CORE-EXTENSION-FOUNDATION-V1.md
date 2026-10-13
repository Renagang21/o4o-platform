# O4O AI Core + Extension 공통 기반 정비

> 상태: COMPLETED · 작성일: 2026-10-13 · 근거: 사용자 AI 전반 조사·구조 정비 요청

사용자 요청의 승인 범위를 기록한다. F1 `@o4o/ai-core`에 additive 업무 실행 계약을 추가하고 기존 콘텐츠 번역에 연결한다. 기존 execute/provider 계약은 유지한다. F10 Auth/Membership/Approval/RBAC·DB schema·메뉴·결제·운영 인증은 변경하지 않는다.

순서: [조사·구조안·TODO](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md) → 공통 계약·실행 → 콘텐츠 번역 Extension → 권한·자료·실패·업체 교체·이력·기존 route 검증.
유료 호출·외부 계약/결제·운영 인증·DB write·배포는 별도 작업이다.

완료 범위: 로컬 구현·문서·관련 검증. main 통합/운영 배포/실제 유료 호출은 미실행. 변경은 `wo/ai-core-extension-foundation` 전용 worktree에 미커밋 상태로 보존한다. 검증 세부·잔여 TODO는 구조안 §6·§8 참조.
