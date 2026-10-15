# 매장 상담 요청·홍보 분석 흐름 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 (한국시간)
> **범위**: 사용자 승인 — 다음 매장 정비를 묶어서 진행하고 검증·commit·push·PR까지 완료
> **기준 main**: `09e08d97df1016fd4ee7a4d23f3274a389df8c3e` · branch: `wo/store-requests-analytics-workflow`

## 조사와 경계

최신 origin/main에서 `services/web-store/src/pages/pharmacy`의 비테스트 TSX 77개와 실제 route·API 소비처를 다시 조사했다.
상위 화면은 사이니지 1,657줄, 태블릿 1,644줄, 채널 1,164줄, 주문 작업대 1,090줄,
콘텐츠 선택기 1,071줄이었다. 다른 개발 작업의 브랜치·worktree는 재사용하거나 수정하지 않았다.
이번 모집단은 상담 요청 413줄, 분석 adapter 25줄, 최근 상담 조회·처리 API와 공통 분석 View의 실제 호출 흐름이다.
`App.tsx`의 `requests`, `analytics/marketing` child route는 `/store`와 `/work/:serviceKey/store` 아래에서 재사용된다.

상담은 5초마다 겹치는 조회를 허용해 처리 전 조회가 완료 항목을 되살릴 수 있었다.
일괄 처리 재시도는 공통 batch 훅만 호출해 목록과 선택을 갱신하지 않았고, 일부 성공에도 전체 선택을 지웠다.
오류와 정상 빈 목록을 함께 표시할 수 있었으며 단건·일괄 작업의 잠금과 매장 전환 격리가 없었다.
공통 분석 View는 실패를 숨겨 최초 실패에 재시도가 없고 재조회 실패에는 이전 수치가 남았다.

정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §9,
[매장 웹 설계](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md),
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md),
[B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md).
상담은 기존 상품 정보·응대 지원이며 주문·결제 기능으로 확장하지 않았다.
API·route·권한·DB·공통 Core·의존성·lockfile·배포 설정·AI 연결 변경은 없다.

## 변경과 같은 범위 재조사

- 상담 상태·조회·처리는 서비스 내부 `useConsultationRequests`가 소유한다. 기존 5초 조회·10초 경과 표시를 유지한다.
  조회 직렬화와 revision으로 지연 조회를 무효화하고 단건·일괄·재시도·후속 조회 동안 같은 쓰기 잠금을 유지한다.
- 처리 응답의 요청 ID·목표 상태·시간을 확인한다. 성공한 항목만 목록과 선택에 반영하고 실패 선택은 유지한다.
  실패 항목 재시도도 같은 파이프라인으로 목록·선택·결과를 갱신한다. 이미 없거나 확인된 요청은 건너뛴다.
  처리 후 조회 실패를 쓰기 실패로 바꾸지 않아 성공한 항목을 재전송하지 않는다.
- 최초/자동 조회 실패에 고정 오류와 재조회 경로를 제공하고, 최신 목록을 확인할 때까지 처리를 막는다.
  정상 0건과 오류를 구분하며 raw 예외를 표시하지 않는다. 미래 시각은 음수 경과 시간으로 표시하지 않는다.
- 분석은 기존 공통 View를 유지한다. 서비스 adapter가 응답 형태·최신성을 검증하고 로딩·실패 중 이전 결과를 숨긴다.
  재시도로 View를 새로 초기화하며 실제 0건은 정상으로 표시한다. 날짜 필터·API 계약은 추가하지 않았다.
- 매장·서비스별 controller를 다시 생성하고 unmount/선택 매장 확인으로 이전 작업의 완료를 격리한다.
  분석과 상담·활용 화면 사이의 링크는 현재 route prefix를 유지한다.
- 모바일 표는 설명·키보드 초점이 있는 한 스크롤 영역에 최소 폭을 둬 처리 버튼까지 이동할 수 있다.
- 최근 상담 API의 화면 소비자는 여전히 상담 화면 하나다(내부 controller로 이동).
  공통 분석 View의 소비 계약과 기존 route mount는 유지했다. 미병합 PR의 새 훅에 의존하지 않는다.

## 검증

- Node 22.18.0 · pnpm 10.25.0. frozen install 및 store-web 의존 패키지 빌드 통과.
- store-web Vitest: 19개 파일, 214개 통과. 신규 회귀 37개는 polling 직렬화·지연 응답·StrictMode 재실행·중복 클릭·부분 실패·재시도·선택 보존·후속 조회 실패·매장 전환·잘못된 응답·분석 복구를 검사한다.
- `pnpm --filter store-web build`: TypeScript·production build 통과. 기존 Browserslist 데이터·큰 chunk 경고는 유지된다.
- 변경 파일 ESLint: 오류·경고 0. 전체 lint ratchet 통과(오류 46 / 기준 46, 경고 998).
- 문서 민감정보 검사와 git diff whitespace 검사 통과.
- Chromium 1280·375·320px × 두 route prefix에서 147개 assertion 통과, pageerror 0. StrictMode effect 재실행, 단건 중복 차단, 일괄 부분 실패·실패 항목만 재시도, 목록·선택 갱신, 매장 전환, 실패와 빈 결과 구분, 분석 refresh 실패·잘못된 응답·0건·재시도, 지연 응답과 복귀 경로를 확인했다.
- 모바일은 선택 후 ActionBar의 줄바꿈, 페이지 가로 넘침 없음, 표 영역의 초점과 스크롤 후 처리 버튼이 viewport 안에 나타나는 것까지 검사했다. 데스크톱·모바일 스크린샷도 확인했다.
- 브라우저는 실제 두 페이지와 공통 DataTable·ActionBar·BulkResultModal·분석 View를 앱 Tailwind로 production build한 합성 화면이다.
  loopback 외 요청은 차단했다. 전체 앱 로그인·실제 직원 상담 검증이 아니며 운영 API·데이터를 변경하지 않았다.
  계정·쿠키·토큰·인증 상태를 저장하지 않았다. 임시 harness·로그·스크린샷은 저장소 밖에만 둔다.

## 인계

개발 담당 종료점은 commit·push·PR 생성이다. main 병합·배포는 통합 담당이 진행한다.
실제 계정 로그인·권한·직원 초대/승인/해제, QR 출력·스캔, 실제 기기 재생은 기존 사용자 결정대로 별도 지시 이후 진행한다.
서비스 간 공통화와 AI 연결도 별도 담당 트랙이다. 이번 결과는 개발 검증이며 운영 smoke 완료 선언이 아니다.

문서 정합: 현행 정본 변경 없음. 이번 검증 기록만 추가한다.
