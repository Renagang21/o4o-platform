# 주문 작업대 조회·매장 문맥·부분 성공 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-14 (한국시간)
> **범위**: 사용자 승인 — 남은 매장 화면 정비를 묶어서 진행, 개발 에이전트는 커밋·푸시·PR까지만 수행
> **기준 main**: `0b3a63756e` · branch: `wo/store-order-worktable-cohesion`

## 최신 모집단과 정책 경계

최신 origin/main에서 `StoreOrderWorktablePage`(1,090줄), 직접 선택 producer `PharmacyB2BPage`,
`pharmacyProducts`·`storeCart` API adapter, 수량/payload helper, service/store context, 실제 API paging 응답을 대조했다.
이전 태블릿·사이니지 PR #580은 조사 시 OPEN이므로 그 branch를 재사용하거나 병합하지 않았다.

정본: [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md),
[B2B 주문 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §9,
[매장 웹 설계](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md).
작업대는 매장 buyer의 기존 B2B cart producer다. 소비자 checkout을 복구하거나 새 주문 원장을 만들지 않는다.
기존 서버 공급 승인·offer ID·가격 재확정·이벤트 축 분리·선택 매장 헤더의 권한 검증을 유지한다.
API·권한·role·route·서버·DB·공통 Core·의존성·lockfile·배포 설정·AI 연결은 변경하지 않았다.

## 확인된 문제와 변경

- 관심상품 카탈로그는 첫 100건만 읽고, 주문 가능 목록은 20페이지 뒤를 조용히 제외했다. 작업대 전용 loader가 카탈로그 offset·주문 가능 page를 끝까지 읽고 성공 여부·paging 진행·전체 건수의 완결성을 확인한다. 실패·빈 중간 페이지·잘못된 metadata·200페이지 상한에서는 오류로 종료하며 미확인 상품을 주문 불가로 판정하지 않는다.
- 조회·수량·확인·장바구니 쓰기를 `useOrderWorktable`, 확인 화면을 `OrderWorktableConfirmation`으로 분리했다. 본문 페이지는 717줄로 줄었다. 다른 서비스 공통화가 아니라 해당 화면의 소유자 분리다.
- 매장/서비스 변경·A→B→A·재조회·unmount 후 늦은 응답을 격리한다. 읽기와 순차 쓰기 사이에도 실제 전송 계층의 매장·서비스 getter를 확인해 React rerender 전 문맥 변경을 방어한다.
- 같은 문맥의 중복 담기를 차단하며, 이전 매장 요청이 새 매장 작업을 막거나 잠금을 해제하지 않는다. 이미 전송한 요청을 롤백하지는 않으며 그 요청의 헤더는 기존 API client가 제출 당시 매장을 보존한다. 문맥이 바뀌면 후속 페이지 조회·순차 담기·화면 갱신·알림·이동을 중단한다.
- 확인창은 열었을 때의 상품·수량·가격 스냅샷을 표시한다. 제출 중 후속 수량은 값뿐 아니라 편집 revision으로 보존한다. 성공 후 새 입력이 있으면 장바구니로 자동 이동하지 않는다.
- 부분 성공을 상품명 문자열이 아니라 offer ID로 구분한다. 같은 이름의 상품도 성공 수량만 해제하고 실패 상품만 확인창에 남겨 재시도한다. 새 확인창의 동일 revision 항목이 이미 담겼으면 제외하며 새 선택·수량은 유지한다. 성공=false 응답을 성공으로 처리하지 않는다.
- 이벤트 항목이 있는 장바구니에는 기존처럼 B2B 담기를 차단한다. 주문 확정·결제는 실행하지 않으며 `sourceType='b2b'` payload는 기존 helper를 사용한다.
- 상품 목록→작업대 handoff를 매장/서비스별 sessionStorage로 구분한다. metadata·정수 수량을 검증하고 확인된 주문 가능 offer만 한 번 소비한다. 실패한 조회에서는 handoff를 소비하지 않는다. 출처를 알 수 없는 종전 unscoped handoff는 적용하지 않는다.
- 직접 producer의 매장 전환도 선택·수량·페이지·부가정보를 초기화하고 이전 조회를 격리한다. 선택 저장 실패에는 이동 대신 오류를 알린다.
- 작업대는 작은 화면에서 단일 열로 배치하고 표의 가로 스크롤을 내부에 둔다. 확인창은 native dialog로 이름·초점 제한·Escape·닫기 후 복귀를 제공하며 부분 실패와 긴 항목을 줄바꿈한다.

## 실행 검증

- Node 22.18.0 · pnpm 10.25.0, frozen-lockfile 및 store integrity 검증 설치·store-web 의존 패키지 빌드 통과.
- store-web Vitest: **20개 파일 189개 테스트 통과**. 새 회귀 32개: paging 9개, handoff 4개, 작업대 상태/쓰기 19개.
- TypeScript·production build 통과. 기존 큰 chunk·오래된 Browserslist 데이터 경고 유지.
- 변경 런타임 TS/TSX 집중 ESLint: 오류·경고 0. 전체 lint ratchet 통과(오류 46 / 기준 46, 경고 996).
- 실제 `StoreOrderWorktablePage`·`PharmacyB2BPage`와 변경 훅/확인창을 앱의 Tailwind 설정으로 production build한 합성 화면에서 Chromium **1280·375·320px, 63개 assertion 통과**.
- 브라우저는 loopback 외 요청을 차단하고 상품·장바구니 API 및 선택 매장 context를 합성 fixture로 대체했다. producer의 변경 범위 밖 다국어·이벤트 부가 패널은 stub으로 대체했다. 실제 API 호출·계정 로그인·주문 확정·운영 데이터 변경을 하지 않았다.
- 브라우저 확인: 조회 실패·재시도, 두 번째 카탈로그 페이지, 공급 불가 입력, 고정 수량·부분 실패·재시도 중복 방지, 확인창 초점·복귀·반응형, 제출 중 새 수량, 매장 전환 중 후속 쓰기 중단, 실제 producer→consumer의 handoff·한 번 소비·매장 분리. 작업대 가로 넘침과 pageerror 0.
- 로그·합성 도구·스크린샷은 저장소 밖 `/tmp/store-worktable-*`, `/tmp/o4o-worktable-ui`, `/tmp/o4o-device-browser/worktable-check.mjs`에 둔다.

## 인계와 남은 검증

개발 종료 범위는 push·PR다. main 병합·배포 및 실제 계정·실기기 검증은 별도 담당 에이전트/사용자의 기존 진행 범위를 따른다.
테스트 계정·쿠키·인증 상태를 사용하거나 저장하지 않았다. 전용 작업 공간은 미통합 상태에서 KEEP한다.

200페이지를 초과하는 목록은 안전하게 오류로 종료한다. 그 규모의 조회가 필요하면 서버의 offer ID 기반 조회나
작업대 조회 방식이 필요한지 별도 조사하며 API 계약을 이번 작업에서 확장하지 않는다.
동시 서버 데이터 변경에 대한 versioned snapshot 계약은 신설하지 않았다. 담기·확정의 최종 허가는 기존 서버가 판정한다.
다른 호스트의 legacy handoff와 서비스 간 공통화·AI 연결은 이번 범위가 아니다.
