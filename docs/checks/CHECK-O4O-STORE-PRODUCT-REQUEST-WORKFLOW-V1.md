# 매장 신규 상품 등록 요청·보완 재제출 흐름 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 (한국시간)
> **범위**: 사용자 승인 — 남은 매장 화면을 묶어서 정비하고 검증·commit·push·PR 생성
> **기준 main**: `09e08d97df1016fd4ee7a4d23f3274a389df8c3e` · branch: `wo/store-product-request-workflow`

## 조사와 정책 경계

최신 origin/main의 `services/web-store/src/pages/pharmacy` 비테스트 TSX 77개를 다시 조사했다.
상위 화면은 사이니지 1,657줄, 태블릿 1,644줄, 채널 1,164줄, 주문 작업대 1,090줄,
콘텐츠 선택기 1,071줄이었다. 이번 범위는 신규 상품 등록 요청 모달 484줄과 요청 현황 모달 172줄,
직접 소비자인 `StoreHandledProductsPage`의 연결 props, 기존 표준 상품 검색·매장 추가·등록 요청 API다.
진입 route는 `App.tsx`의 `my-products`·`handled-products`이며 기존 mount를 유지한다.
제품 목록·QR의 별도 PR #592와 상담·분석의 PR #594를 확인하고 해당 파일과 미병합 훅에 의존하지 않았다.
다른 worktree는 변경하거나 정리하지 않았다.

검색 실패가 성공한 빈 검색처럼 표시되고, 입력 수정·다음 단계·창 재열기 이후 오래된 검색 결과가 반영될 수 있었다.
제출·기존 상품 추가는 즉시 잠금이 없었고, 이전 창의 완료가 현재 창을 닫거나 알림·목록 갱신을 실행할 수 있었다.
요청 현황은 페이지·새로고침·닫기 사이의 응답 순서를 구분하지 않았고, 삭제 등으로 사라진 마지막 페이지를 보정하지 않았다.
두 모달은 이름·Escape·초점 복귀를 가진 native dialog가 아니었다.

정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §9,
[매장 웹 설계](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md),
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md),
[B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md).
기존 상품 정보 등록·관리자 검토 요청의 UI 상태 처리만 정비했다.
신규 승인·자동 연결·주문·결제 기능은 추가하지 않았다.
API·권한·route·DB·공통 Core·의존성·lockfile·배포 설정·AI 연결은 변경하지 않았다.

## 변경과 같은 범위 재조사

- 신규 요청은 서비스 내부 `useProductRequestForm`으로 상태·IO를 분리했다. 모달을 닫으면 controller를 해제하고,
  매장·서비스·편집 요청 ID가 달라지면 새 controller를 만든다. 같은 ID의 부모 재렌더는 초안을 초기화하지 않는다.
- 검색은 입력 수정 즉시 결과를 무효화하고 최신 요청만 반영한다. 실패·정상 0건을 구분하고 안전한 오류·재검색을 제공한다.
  폼으로 넘어간 뒤 이전 검색이 결과를 바꾸지 않는다. 숫자 검색어의 바코드 프리필은 유지한다.
- 제출·재제출·기존 상품 추가는 동기 잠금을 공유한다. 제출 중 입력과 다른 쓰기를 막고 제출 당시 값을 유지한다.
  서버의 요청 ID·검토 중 상태와 기존 상품 추가의 success를 확인한 뒤만 완료를 알린다.
  실패 시 입력을 보존하고 raw 서버 오류·사용자 값을 toast에 넣지 않는다.
- 중복 바코드는 초안을 보존한 채 기존 상품 추가로 명시적으로 이동할 수 있다. 자동으로 창을 닫지 않는다.
  이전 창·이전 매장의 완료는 현재 창·알림·부모 갱신을 바꾸지 않는다.
- 요청 목록은 `useProductRequestList`가 loading/error/empty, 페이지·재조회 revision, 응답 메타·표시 상태 검증을 소유한다.
  페이지·갱신 조건이 바뀌면 이전 행을 숨기고, 현재 페이지가 범위를 벗어나면 유효한 마지막 페이지를 다시 조회한다.
- 두 모달은 서비스 내부 native dialog로 이름·Escape·초기 초점·닫기 전 버튼으로 복귀·배경 요소의 비활성화를 제공한다.
  검색→폼 이동 시 상품명으로 초점을 옮긴다. 이미지 선택 Escape는 부모 초안을 유지한다.
  제출 중 안내 위치 변화에 따른 연속 클릭이 배경 닫기로 처리되지 않도록 처리 중 배경 클릭 닫기를 막는다.
  명시적 닫기·매장 전환으로 닫힌 요청의 지연 완료도 격리한다.
- 모바일 폼·footer·페이지 탐색은 줄바꿈을 허용한다. 목록은 설명과 키보드 초점이 있는 영역에서 가로 스크롤해 보완 버튼에 접근한다.
- 소비자는 기존 `StoreHandledProductsPage` 하나이며 props·route·API 호출 계약은 유지했다.
  화면은 484→348줄, 172→162줄로 바뀌었고 IO·세션 생명주기·검증은 서비스 내부 모듈로 이동했다.

## 검증

- Node 22.18.0 · pnpm 10.25.0. frozen install(무결성 검증 유지)과 store-web 의존 패키지 빌드 통과.
- store-web Vitest: 19개 파일 **214개 통과**, 신규 회귀 **37개**.
  검색 경합·입력 수정·닫기/재열기·매장 전환·중복 제출·실패 초안·응답 확인·재제출 ID·페이지 보정·StrictMode·초점 복귀를 검사한다.
- `pnpm --filter store-web build`: TypeScript·production build 통과. 기존 Browserslist 데이터·큰 chunk 경고는 유지된다.
- 변경 파일 ESLint 오류·경고 0. 전체 lint ratchet 통과(기존 오류 46 / 기준 46, 경고 998).
- Chromium 1280·375·320px, StrictMode 합성 호스트에서 **143개 assertion 통과**, pageerror 0.
  검색 오류/재시도·오래된 응답, 기존 상품 추가, 입력·이미지 보존, 중복 제출·제출 실패 후 재시도,
  중복 바코드 명시적 전환, 닫은 재제출의 완료 무시, 현황 오류·빈 결과·페이지 보정·보완 편집,
  매장 전환, native dialog 이름·초기/단계 초점·배경 버튼 Tab 제외·Escape·초점 복귀를 확인했다.
  모바일은 페이지·dialog 가로 넘침 없음, 스크롤 후 보완 버튼의 viewport 진입과 영역 초점을 검사했다.
  데스크톱·모바일 스크린샷도 확인했다.
- 실제 변경 모달·훅과 기존 Pagination을 앱 Tailwind로 production build했다. API와 이미지 선택기는 합성 fixture다.
  전체 부모 화면·실제 이미지 업로드·전체 앱 로그인·실계정 검증은 아니다. loopback 외 요청을 차단했다.
  운영 API·DB 쓰기와 인증 상태 저장을 하지 않았다. 임시 harness·로그·스크린샷은 저장소 밖에만 둔다.
- 문서 민감정보·whitespace 검사 통과. staged scope는 커밋 직전에 확인한다.

## 인계

개발 담당은 commit·push·PR까지 수행하고 branch·worktree를 후속 수정용으로 보존한다.
통합 담당이 required CI·review 확인, main 병합·배포와 운영 smoke를 진행한다.
실제 계정 로그인·직원 업무·실제 QR·기기 검증은 기존 사용자 결정대로 별도 지시 이후 진행한다.
다른 미병합 개발 PR의 결과를 이번 main 검증에 포함하지 않았다. 서비스 간 공통화·AI 연결도 별도 담당 범위다.

문서 정합: 현행 정본 변경 없음. 이번 검증 기록만 추가한다.
