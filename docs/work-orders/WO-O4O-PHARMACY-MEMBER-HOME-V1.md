# 약국 경영지원 회원 초기화면 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-10 · **최종 갱신**: 2026-10-10
> **근거 WO/IR**: 사용자 지시 — 프랜차이즈 가맹점 UI 조사·비교 후 초기화면 정비, TODO 작성 → 문서·코드 조사 보완 → 전체 작업·push.

## 사용자 기준

로그인하면 약국 협력사업의 실제 회원 화면이 바로 나온다. 커뮤니티 선택·신청 상태를 거쳐 다시 진입하지 않는다. Hero·공지·회원 활동·지원 자료는 회원 초기화면에서 직접 표시한다. 주문 등 매장 지원 실행은 내 매장에 유지하고, 내 매장 이동은 콘텐츠 메뉴와 구분한다. 실제 프랜차이즈 가맹점 UI를 먼저 조사해 앞선 기획안과 비교한다.

## 조사 후 보완한 TODO

- [x] 1. TODO 초안 작성·최신 main 기반 전용 worktree·branch 준비.
- [x] 2. 외부 UI 사례·정본·현재 코드·메뉴 소비처·로그인·데이터 경계를 조사하고 TODO 보완.
- [x] 3. 조사 근거와 앞선안 비교를 기록하고 회원 초기화면·URL·메뉴 설계를 구체화.
- [x] 4. 실제 공지·게시글·자료를 바로 보여주는 회원 초기화면 구현.
- [x] 5. 루트·로그인 기본 화면·기존 URL 연결·내 매장 위치·신청/관리 분리 정비.
- [x] 6. 관련 회귀·빌드·PC/모바일 직접 화면 검증.
- [x] 7. 정본·실행 기록 정합 및 전용 branch commit·push·PR·CI 상태 확인.

## 조사·비교 평가

기준 main: `847ee5d6bda405358ac42234b2551898df343048`. 조사일: 2026-10-10. 외부 자료는 공식 공개 제품 안내·제품 이미지이며 실제 고객 계정에 로그인한 조사는 아니다. 모든 프랜차이즈의 동일한 표준이라고 일반화하지 않는다.

| 공식 근거 | 확인 사실 | O4O 적용 판단 |
|---|---|---|
| [FranConnect The Hub](https://www.franconnect.com/platform-overview/the-hub/) | 공지·업데이트, 커뮤니티·협업, 권한별 자료함, 지원을 하나의 회원 경험으로 제공한다고 안내한다. 해당 페이지의 대표 이미지는 홍보 사진이며 UI 캡처가 아니다. | 신청 상태를 첫 화면으로 두지 않고 회원 콘텐츠를 직접 모은다. |
| [World Manager Frontline](https://www.franconnect.com/platform-overview/world-manager-frontline/) · [공개 Notices 제품 이미지](https://www.franconnect.com/wp-content/uploads/2024/04/World-Manager-Social-Collaboration.png) | 제품 이미지에서 브랜드 헤더·공지 Hero·실제 공지 제목/본문/댓글·오른쪽 My Tasks/Links가 함께 보인다. World Manager는 FranConnect 제품군이며 별도 업체 사례로 중복 집계하지 않는다. | Hero를 회원 소통의 브랜드 영역으로 두고 공지·게시글을 바로 표시한다. 업무 바로가기는 옆 패널로 분리한다. |
| [FranchiseSoft Digital Library](https://franchisesoft.com/digital-library/) · [Franchisee Management](https://franchisesoft.com/franchisee-management/) | 자료함은 운영 매뉴얼·브랜드 자료의 권한별 저장소이고 회원 정보·소통·운영 기록을 통합한다고 안내한다. 관리 제품 설명을 가맹점 첫 화면으로 오인하지 않는다. | 기존 사업별 승인·콘텐츠 범위를 지키며 자료 제목·요약을 첫 화면에 보여준다. 신규 티켓·교육·할 일 기능은 만들지 않는다. |

| 비교 항목 | 앞선안·현재 구현 | 보완한 구현 |
|---|---|---|
| 첫 화면 | 신청 상태 → 참여자 게시판 링크 → 게시글 | `/`에서 회원 초기화면이 바로 표시되고 실제 최근 공지·글·자료를 읽는다. 게시판 목록은 세부 탐색 기능이다. |
| 브랜드·Hero | 내부 사업명 `pharmacy`와 승인 상태 | O4O 약국 경영지원 회원 Hero. 대형 서비스 소개나 별도 Home 메뉴를 만들지 않는다. |
| 공지 | 게시판 안으로 들어가야 확인 | 기존 게시글 중 상단 고정/공지 유형을 최근 공지로 표시한다. 신규 공지 원장·확인 여부·가짜 수치를 만들지 않는다. |
| 내 매장 | 기본 로그인 이동·콘텐츠 메뉴·모바일 경영 탭 | 회원 첫 화면의 업무 바로가기에서 기존 로그인 유지 handoff로 이동. 주문 기능은 복제하지 않는다. 계정 메뉴의 기존 업무 진입은 유지한다. |
| 신청·개설·운영 | 초기화면·회원 게시글 메뉴에 섞임 | 참여 상태는 `/my/participation`, 게시판 개설/운영은 별도 관리 링크. 담당 운영자 경계 유지. |
| URL | `/businesses/pharmacy/...` | `/`, `/community`, `/materials`, `/tools`, `/my/participation`. 이전 pharmacy 주소는 query/hash를 보존해 전환. 다른 사업 키의 경로와 공통 커뮤니티 `/forum/*` 이동은 보존. |

## 조사한 문서·코드 모집단

- 정본: [서비스 탐색](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md) §5, [역할·업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §0·§3·§5·§9, [공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).
- 라우트·기본 로그인: `services/web-kpa-society/src/App.tsx`, `config/dashboard.ts` → App fallback·LoginModal. 일반 회원·매장 경영자의 기본 로그인은 회원 초기화면, 기존 운영자/관리자 기본 업무 이동과 명시적 returnTo는 유지한다.
- 메뉴 소비처: `config/navigation.ts` → KpaGlobalHeader·Footer·브랜드 회귀; MobileBottomNav → Layout. 공통 UI 패키지 및 타 서비스 config는 수정하지 않는다.
- 사업 범위: BusinessWorkspace → 사업 정보·community access 판정 → 참여/자료/게시판/운영/도구. 사업 UI 경로는 기존 모든 소비처를 함께 변경한다.
- 게시글 API: 기존 `/communities/:key/forum/posts`; 공개 상태·폐쇄 게시판 자격·게시판 범위는 서버가 판정한다. 첫 페이지 최근 20개 중 공지/일반 글을 표시하며 전체 공지 집계라고 표시하지 않는다.
- 자료 API: 기존 `/neture/pharmacy/store/contents` + `sf=pharmacy`; 승인 회원만 조회하고 응답의 사업 키도 확인한다. 담당 운영자에게 약국 소유자 전용 조회를 요구하지 않고 기존 운영 화면을 연결한다.

## 구현 순서·검증 조건

1. 사업 UI 경로 helper·이전 URL 전환을 만들고 기존 사업 페이지 링크 전체를 정비한다.
2. 루트 회원 화면에 Hero·최근 공지·최근 게시글·자료 제목/요약·별도 업무 바로가기를 구현한다. 신청 전 사용자는 Hero와 자격 안내만 보며 회원 데이터를 조회하지 않는다. 오류·로딩·정상 빈 목록을 구분하고 재시도를 제공한다.
3. 헤더·푸터·모바일 메뉴를 콘텐츠 중심으로 정비하고 매장 경영자의 강제 내 매장 로그인 이동을 제거한다. 운영자·관리자 기본 이동과 명시적 상세 화면 returnTo는 보존한다.
4. 기존 pharmacy URL 전환·다른 사업 키 격리·회원 API 실패/재시도·미승인·운영자·사업 자료 범위·직접 게시글 열기를 회귀 검증한다. PC·모바일 브라우저에서는 실제 콘텐츠 노출·메뉴·handoff 실패·URL·가로 넘침을 확인한다.
5. 정본 §5에 이 화면/URL 규칙을 반영하고 현재 WO에 실행 결과를 기록한다. 대표 홈 과거 상태 정비 PR #409와는 별도 변경으로 관리한다.
6. frozen 설치·서비스 빌드·관련 테스트·문서 검사 후 파일별 stage·범위 검사·commit·명시적 branch push·PR을 완료한다.

신규 권한·API·DB 계약을 만들지 않고 기존 사업 승인·소유권·자료 공개 범위를 유지한다. main 통합·운영 배포와 이전 작업공간 삭제는 이번 push 작업에 포함하지 않는다. 운영 계정 없이 수행한 브라우저 fixture 검증을 운영 검증으로 보고하지 않는다.

## 로컬 실행·검증 결과

- 구현: 회원 초기화면·최근 공지/게시글/자료·업무 바로가기, 짧은 URL·기존 상세 URL 전환, 콘텐츠 메뉴·회원/관리 분리, 일반 회원/약국 경영자의 기본 로그인 이동을 완료했다.
- 회귀: web-kpa-society Vitest **14 파일·115 tests PASS**. 사업 범위·미승인·운영자·계정 전환·오류/빈 목록·재시도·기존 상세 경로와 로그인 콜백 우선순위를 검증했다.
- 인증·서비스 이동: 기존 API Jest `neture-pharmacy-handoff-semi-franchise.spec.ts` **1 suite·7 tests PASS**. 이동으로 회원 자격을 부여하지 않는 기존 경계를 확인했다.
- 빌드: pinned Node/pnpm frozen 설치, 약국 서비스 의존 패키지 빌드, `pnpm --filter @o4o/web-kpa-society build`(TypeScript + Vite) PASS. 기존 Browserslist/큰 chunk 안내는 남아 있다.
- 브라우저: Chromium **1440×900 / 390×844**, 각 5상황(회원·미승인·운영자·비로그인·게시글 조회 실패) **10상황 PASS**. 첫 화면 실제 응답 제목/요약, 게시글/자료 직접 열기, 기존 상세 주소 query/hash 보존, 재시도, 내 매장 handoff 요청·성공 목적지/실패 안내, 모바일 메뉴와 가로 넘침 0을 확인했다.
- 브라우저 응답·계정·매장 이동 목적지는 합성 fixture이며 운영 계정 로그인·실제 세션 교환·운영 DB 검증은 수행하지 않았다. 외부 제품 UI는 공식 공개 자료 조사다.
- 정본 §5에 회원 초기화면 정책을 반영했다. 대표 홈의 과거 구현 상태 정비는 별도 PR #409(OPEN)이며 해당 기록을 이 작업에서 병합하지 않는다. 두 PR이 같은 §5 문장을 수정하므로 통합 순서에 따라 문서 충돌 정리가 필요하다.
- [PR #414](https://github.com/Renagang21/o4o-platform/pull/414)를 제출하고 `wo/pharmacy-member-home`에 구현 커밋 `90bbd331f9f894d16742b430004f4719e8174973`을 push했다. 작업 중 들어온 main 변경은 QR/DB 재연결 운영 스크립트이며 화면·패키지와 겹치지 않았다. push 전에 최신 main `0f66555b4fb5e49cda5c4c789151d3fb840cfdef`에 정렬했고 검증한 앱 소스의 동일성을 확인했다.
- GitHub CI·자동 리뷰의 최종 상태는 PR #414의 최신 HEAD checks·리뷰 스레드에서 확인한다. 제출 후 정적 검사·문서 검사·약국 운영 빌드·관리자 앱 빌드·CodeQL 통과를 확인했다. 변하는 GitHub 결과를 이 기록에 최종 상태로 고정하지 않는다. main 병합·운영 배포는 미수행이며 운영 반영에는 Pharmacy 프런트엔드 배포가 필요하다.

## 작업공간 유지

`/workspace/o4o-wt/pharmacy-member-home` · `wo/pharmacy-member-home`은 main 미통합 상태이므로 **KEEP**한다. 이전 작업공간은 삭제하지 않았다. 운영 배포 전이며 새 화면은 branch에만 존재한다.
