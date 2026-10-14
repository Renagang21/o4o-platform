# 매장 태블릿 기기·사이니지 운영 흐름 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-14 (한국시간)
> **범위**: 사용자 승인 — 남은 매장 화면 정비를 묶어서 진행하고 검증 후 커밋·푸시
> **기준 main**: `0d55cb43483860caf9596718cb38f16482ac7174` · branch: `wo/store-device-workflow-cohesion`

## 조사와 정책 경계

최신 origin/main의 태블릿·사이니지·주문 작업대와 직접 소비 훅을 다시 조사했다.
`StoreTabletDisplaysPage` 1,781줄, `StoreSignagePage` 1,639줄, `StoreOrderWorktablePage` 1,090줄이었다.
기존 기기 목록 조회는 실패를 숨기며 매장 선택 변화에 따른 재조회·응답 격리가 없었다.
기기 이동·해제는 단일 busy ID를 공유해 동시 요청 완료가 다른 기기의 잠금을 해제할 수 있었다.
사이니지 항목 조회 오류는 전체 재생목록 오류를 공유해 목록 재시도가 실패한 항목 조회를 재실행하지 못했다.
스케줄 저장 완료는 요청 중의 입력 수정·새 편집 화면을 초기화할 수 있었다.

정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §9,
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md),
[B2B 주문 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[매장 웹 설계](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md).
태블릿은 정보 표시, 기기는 위치 연결·이동·해제의 기존 API만 사용한다.
API·권한·메뉴·route·서버·DB·공통 Core·의존성·lockfile·배포 설정·AI 연결은 변경하지 않았다.

## 변경

- 태블릿 기기 운영은 `useTabletDevices`, 표시는 `TabletDevicePanels`로 분리했다. 위치·진열·대기 화면 편집과 독립된 소유자다.
- 기기 목록은 loading/error/empty/ready를 구분하고 새로고침·재시도를 제공한다. 조회 실패를 0대라고 표시하지 않는다. 매장 전환과 A→B→A, 이전 조회, unmount 후 결과를 격리한다.
- 연결 코드 중복 요청을 차단하고 매장 전환 후 이전 코드를 표시하지 않는다. 기기별 잠금으로 같은 기기의 이동·해제 충돌을 막고 독립된 기기 요청을 허용한다. 이전 매장 작업은 새 매장 목록·알림을 바꾸지 않는다.
- 연결 모달은 native dialog의 초점 제한과 이름, Escape 닫기, 요청 시작 전 버튼으로 초점 복귀를 제공한다. 모든 닫기 경로는 연결 상태를 다시 조회한다. 연결 코드는 저장하지 않는다.
- 사이니지 전체 목록·선택 항목·스케줄의 재생목록 부가정보 오류를 각각 표시하고 해당 조회를 재시도한다. 항목 조회 중 이전 목록의 항목을 숨긴다.
- 재생목록 변경은 매장/재생목록별로 잠근다. 원래 목록의 삭제 완료가 새 선택을 해제하지 않으며, 라이브러리 추가와 일괄 추가 응답이 새로 연 선택창을 닫거나 선택을 비우지 않는다. 닫은 선택창의 성공한 쓰기는 같은 목록을 재조회한다.
- 일괄 추가는 성공 항목을 재시도에서 제외하고 실패·새 선택을 유지한다. 매장이 바뀌면 나머지 순차 쓰기를 중단해 implicit 매장 API가 새 매장으로 이어지지 않게 한다.
- 스케줄 저장은 제출 당시 payload를 유지하고 후속 입력·취소·다른 편집 화면을 보존한다. 매장별 저장 및 스케줄별 삭제 잠금과 응답 격리를 적용했다.

## 검증

- Node 22.18.0 · pnpm 10.25.0, `pnpm install --frozen-lockfile --verify-store-integrity=true` 및 store-web 의존 패키지 빌드 통과.
- store-web Vitest: 18개 파일, 176개 테스트 통과. 새 회귀 19개는 매장 전환/지연 응답/중복 요청/독립 요청/재시도/부분 실패/새 편집 상태/모달 이름·Escape를 검증한다.
- `pnpm --filter store-web build`: TypeScript·production build 통과. 기존 큰 chunk·Browserslist 데이터 경고 유지.
- 변경 런타임 파일 집중 ESLint: 오류·경고 0. 전체 lint ratchet 통과(오류 46 / 기준 46, 경고 996).
- 문서 민감정보 검사·git diff whitespace 검사 통과.
- 실제 변경 훅·기기 패널·스케줄 폼을 앱 Tailwind 설정으로 production build한 합성 화면에서 Chromium 1280·375·320px 42개 assertion 통과. 오류 재시도, 이동 잠금·갱신, 모달 초점·복귀, 선택 변경 후 지연 응답, 제출 payload·후속 입력, 가로 넘침·pageerror를 확인했다.
- 브라우저는 loopback 외 요청을 차단하고 합성 API만 사용했다. 전체 앱 로그인·실제 기기 연결 smoke는 아니다. 계정·쿠키·인증 상태를 저장하지 않았다.
- 검증 로그·합성 도구·스크린샷은 저장소 밖 `/tmp/store-device-*`, `/tmp/o4o-device-ui`, `/tmp/o4o-device-browser`에 둔다.

## 남은 작업과 종료 범위

이번 요청의 종료 범위는 커밋·푸시다. main 통합·운영 배포·실계정 검증은 이번 회차에서 실행하지 않는다.
실제 QR 출력·스캔, 사이니지 재생, 태블릿 연결과 Google 운영자/관리자 검증은 기존 별도 진행 범위를 유지한다.

주문 작업대는 관심상품 카탈로그를 100건 한 페이지만 조회하고, 주문 가능 목록은 20페이지 상한으로 조회한다.
`loadData`에 매장 변경·조회 revision이 없으며 수량·확인 상태도 매장 문맥과 함께 초기화되지 않는다.
장바구니 순차 추가 중 매장 전환을 막는 guard가 없고, 실패 항목의 상품명 문자열로 수량 해제 여부를 판단한다.
이 화면은 canonical B2B producer이므로 legacy 소비자 commerce로 분류하거나 제거하지 않는다.
후속은 페이지 수집의 완결성·매장 격리·offer ID 기준 부분 성공·수량/확인 상태를 묶어서 조사·정비한다.
서비스 간 공통화와 AI 연결은 별도 담당 트랙이다.
