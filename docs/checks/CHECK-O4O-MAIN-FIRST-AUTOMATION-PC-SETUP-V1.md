# Main 첫 자동화 PC 준비 검증

> 상태: ACTIVE · 작성일: 2026-10-28
> [WO](../work-orders/WO-O4O-MAIN-FIRST-AUTOMATION-PC-SETUP-V1.md) · [설치 절차](../guides/O4O-PC-CONNECTION-INSTALL-UPDATE-V1.md)

## 구현

Main 서버의 Work 응답이 PC 미연결/오프라인이며 행동·history가 모두 0인 경우 메인 안에 설치·실행·계정 연결 안내를 펼친다. 기존 LocalAgentCard/PcProgramUpdate·검증 ZIP·pairing/LNA를 재사용한다. 일반 대화 및 이미 가능한 원격 실행에는 localhost 설치 확인을 선행하지 않는다. 모바일/Mac은 로컬 pairing 카드를 마운트하지 않고 실행할 Windows PC의 메인 ‘PC 연결 준비’로 안내한다. 브라우저 OS 신호는 안내용이며 실행 노드·권한 판정은 기존 서버에 남긴다.

설치 중 페이지의 요청·첨부를 유지하고 사용자 버튼으로만 재시도한다. 확인된 문장을 그대로 보낼 때만 기존 work 확인을 승계하고, 수정된 문장은 다시 일반 Router로 보낸다. 기존 resume anchor는 기존 helper로 갱신한다. 이미 행동이 있는 작업을 처음부터 재전송하는 새 버튼은 만들지 않는다. 계정/업무공간 변경 및 이전 문맥의 늦은 응답은 이전 PC 준비 요청을 새 문맥에 열지 않는다. AI 요청·설치 기록을 저장하는 새 Core/Task/Memory/DB/API 계약은 없다.

## 확인

- 관련 Vitest 49개 PASS: 첫 미연결의 안내 자동 표시, 명시적 확인·원본 첨부 보존, 자동 재실행 없음, 수정 문장의 이전 work 강제 해제, 대화/사용 가능한 노드/모바일/부분 실행/계정·scope 변경/늦은 응답, 기존 LNA·주문 준비·데이터 정비·Main entry·검증 다운로드 회귀.
- TypeScript noEmit PASS, 변경 파일 ESLint PASS, production names-profile Vite build PASS. 새 worktree frozen install 후, package source가 동일함을 Git diff로 확인하고 기존의 동일 package build 산출물을 준비했다. dependency/lockfile 변경 없음.
- Chromium desktop 1440px: 기존 설치 카드의 실제 검증 ZIP 다운로드, 합성 health 상태의 미실행→준비, 합성 grant/pair 각 1회, 연결 중 요청 계속 disabled, 사용자 클릭 전 업무 재실행 없음, page error/가로 overflow 없음 PASS.
- Chromium mobile 390px: 실행할 PC 안내, localhost health/pair/grant 접근 0, 명시적 요청 계속, page error/가로 overflow 없음 PASS. screenshot으로 레이아웃 확인.

첫 통합 테스트에서 준비 카드와 주문 패널의 동일 React key 때문에 화면 제거 검사 2건이 실패했다. 준비 카드 key에 전용 prefix를 부여한 뒤 전체 관련 49개 검사를 재실행해 통과했다. 테스트용 HTML wrapper의 charset도 명시해 한글 표시를 확인했다. 실패를 PASS로 계산하지 않았다.

## 검증 범위와 종료점

브라우저 확인은 실제 변경 컴포넌트와 운영에서 이미 검증한 ZIP을 사용하되 health/grant/pair는 합성 fixture다. 실제 Windows 설치 실행·실사용 계정·원격 PC·약국 프로그램/사이트 자동화 성공으로 간주하지 않는다. 승인된 계정 SSOT 파일은 현재 worktree와 기준 checkout에 없으므로 실제 계정 로그인 검증은 하지 않았다. 기존 브라우저 권한 및 업무 확정 승인은 우회하지 않는다.

이번 변경은 로컬 구현·검증·commit·push 후 main 병합 전에서 인계한다. PR/운영 배포/실제 PC 적용 완료로 보고하지 않는다. 앞서 배포된 설치 패키지 자체의 검증 기록과 이번 Main 진입 UX를 구분한다.
