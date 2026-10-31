# O4O 공통 UI 남은 적용 영역 정비

> **상태**: ACTIVE · **작성일**: 2026-10-31 (Asia/Seoul)
> **근거**: 사용자 요청 — 조사한 Partner·협동조합·독립 사업의 공통 UI 및 세션·원래 화면 복귀 개발, main 병합 전까지.
> **기준 main**: `b27f0dc4dd57b8fa6b31ba44aa60d3ff78948e2d`

## 범위와 경계

[앞선 공통 UI 작업](WO-O4O-CROSS-SERVICE-UI-UX-STANDARDIZATION-V1.md)의 후속 4단계를 잇는다.
[역할 구조 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md),
[헤더 표준](../architecture/ui/GLOBAL-HEADER-STANDARD-V1.md),
[공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 따른다.

Partner·연합회 헤더를 기존 GlobalHeader에 연결하고 계정·서비스 전환·My Home·알림 진입을 보존한다.
Partner 작업공간은 자체 업무 메뉴·백업·로컬/서버 저장과 소유자/편집자/열람자 권한을 유지하며 중첩 헤더·푸터를 제거한다.
협동조합은 연합회와 개별 조합의 운영·가입·법정정보 출처를 분리한다. 연합회 정책 URL은 조합 slug와 충돌하지 않는 `/about/terms`, `/about/privacy`다.
법정정보는 기존 공개 서비스/사업 API 값만 표시한다. 미설정·오류 시 임의 법정정보를 채우지 않으며 연합회에 공통 저작권자를 강제하지 않는다.
약국·메가팜·CarePharm의 사업별 정책 링크·법정정보 loader·모바일 하단 여백을 유지하면서 공통 ServiceFooter 외형을 사용한다.

세션 전달은 계정 인증의 운반이며 사업 가입·승인·조직·운영 권한이 아니다. 협동조합·메가팜은 정확한 origin에 한정한 기존 Neture 계정 세션 별칭을 사용한다.
신청·반려·정지·탈퇴 상태를 이용 자격으로 승격하지 않는다. 대상 API가 기존 사업 권한을 계속 검사한다.
CarePharm의 실제 현재 회원/커뮤니티/운영 URL과 홈 앵커만 유한 허용 목록에 추가하며 타 사업 namespace·외부 목적지·잘못된 쿼리는 거절한다.

My Home은 알려진 출발 서비스와 안전한 내부 경로·검색·탭을 보관하고 같은 계정의 이전 맥락만 재사용한다.
왕복 모두 기존 단일 사용 세션 교환을 이용한다. 외부 origin·중복 쿼리·정규화 우회·인증/초대 토큰이 담긴 복귀 맥락을 거절한다.
Partner 초대는 기존 초대 복구 handler를 사용하며 로그인 URL에 초대 정보를 복제하지 않는다.
병원 파일 도구의 무로그인 계약과 Partner의 대표 홈 ‘준비 중’ 노출은 유지한다.

새 DB schema·역할·membership·운영 설정·배포 변경은 없다. 추가 의존성은 기존 workspace 패키지 링크뿐이며 frozen install로 확인한다.
main 병합·auto-merge·배포·환경 게시는 수행하지 않는다.

## Consumer Impact Matrix

| 소비처 | 직접/간접 영향 | 보존·검증 기준 |
| --- | --- | --- |
| Partner 커뮤니티·작업공간 | GlobalHeader/계정/전환/푸터·로그인 복귀 | 커뮤니티와 공간 권한 분리, 초대·백업·로컬 저장, PC/모바일 |
| 협동조합 연합회·개별 조합 | 같은 공통 UI, 세션 수신, 로그인 복귀 | 개인 가입·연합회/조합별 운영·사업별 약관/법정정보 격리 |
| 약국·메가팜·CarePharm | 공통 footer·세션 별칭·My Home 왕복 | 사업·조직 검사 유지, 현재 경로/앵커, 모바일 하단 메뉴 |
| Neture/My Home·공급자·펀딩·커뮤니티 | 안전한 복귀 맥락·세션 전환·GlobalHeader | 계정 변경·늦은 응답·실패 재시도·기존 페이지 회귀 |
| 분회·강의·내 매장 | 공통 auth-react 및 헤더 직접/간접 | 기존 route/role·조직 선택·타입/build 회귀 |
| API | 기존 세션 발급/교환·유한 목적지 검증 | origin 고정, 단일 사용, 세션 취소, 사업/역할 원장 write 없음 |
| Admin·병원 파일 도구 | 공통 export 간접 | 기존 타입 호환·별도 인증/무로그인 계약 유지 |

## 검증과 인계

고정 도구·frozen install·전체 공통 패키지 build 후 관련 테스트와 frontend/API 타입 검사를 수행한다.
`scripts/quality/remaining-ui-smoke.mjs`는 로컬 Vite의 Partner/협동조합/약국 사업/Neture 화면을 사용하며 API·외부 요청을 전부 합성 응답 또는 차단한다.
PC 1280px·모바일 390px에서 계정 메뉴·로그아웃 접근·Escape 포커스 복귀·패널/페이지 가로 넘침·법정정보 출처·양방향 세션 교환·원래 화면·reload를 확인한다.
실제 사용자 계정·운영 사업 데이터·유료 AI를 사용하지 않는다. PostgreSQL 검사는 별도 로컬 DB의 일회성 스키마를 사용하고 종료 시 삭제한다.

최종 검사 수치·CI·리뷰와 PR 인계는 이 문서에 후속 기록한다. 합성 검증을 실계정 로그인 또는 운영 배포 검증으로 보고하지 않는다.

문서 정합: 이전 완료 기록은 보존하고 이번 적용·기존 정책·운영 미반영을 구분한다.

## 로컬 검증 결과

| 검사 | 결과 |
| --- | --- |
| auth-react 전체 / ui 전체 | 275 / 41 tests PASS |
| Partner / 협동조합 전체 | 93 / 88 tests PASS |
| 약국 협업체 전체 / Neture 전체 | 169 / 1,493 tests PASS |
| 기존 푸터 raw-source 계약 | 17 tests PASS; 주석이 아닌 실제 공통 View·메뉴·법정정보 출처를 검사 |
| PostgreSQL issuer/client/exchange + 대표 홈 복귀 | 84 tests PASS; 일회성 스키마 정리, origin·재사용·취소·권한 원장 불변 |
| 중복 집중 재실행을 제외한 위 합계 | 2,260 tests PASS |
| 전체 frontend 및 API typecheck, 공통 패키지 build | PASS |
| Partner·협동조합·약국·Neture·강의·내 매장·분회 build 및 API build | PASS |
| 최종 Chromium 1280/390px × Partner/협동조합/메가팜/CarePharm | 8개 PASS; 모바일 계정·로그아웃·포커스·법정정보·원래 경로 왕복·reload |
| 변경 구현 코드 ESLint·문서 민감정보·diff 검사 | PASS |

Neture 전체 검사 후 공통 헤더의 모바일 계정 슬롯을 보완하고 ui 41건·Neture 헤더/My Home 23건을 집중 재실행했다. 이를 전체 수치에 중복 합산하지 않는다.
기존 API 테스트의 사용하지 않는 인자 경고 2건은 변경 전에도 존재한다. 구현 코드의 새 lint 오류/경고는 없다. 번들 크기·Browserslist 경고는 기존 비차단 경고다.

브라우저 검사 초기에는 불완전한 합성 API 응답, 모호한 버튼 locator, 본문 의미상 header까지 센 검사가 실패했다. 실제 API 응답 계약과 정확한 UI/URL 대기로 보완했으며 assertion을 제거하지 않았다.
모바일 계정 슬롯의 실제 숨김은 공통 헤더에서 수정했다. 잘못된 협동조합 세션 응답은 권한 UI에 전달하지 않고 재시도 가능한 오류로 처리한다.
개발 서버 모듈의 연결 재설정만 Playwright의 한정된 전송 재시도를 사용한다. 브라우저/API 검증 실패를 통과로 대체하지 않는다.

최종 브라우저 결과와 스크린샷은 실행 로그가 출력한 고유 임시 디렉터리에 보관한다. 공개 저장소에는 운영 응답·계정·credential을 기록하지 않는다.
원격 필수 gate는 실제 main ruleset의 `CI Gate`다. PR·최종 HEAD의 CI·Codex 리뷰는 PR에서 기록하고, 병합·auto-merge·배포는 통합 담당에게 남긴다.

## 최신 main 정렬

작업 중 아이폰 가입 UI·매장 영상 작업이 main에 반영돼 아직 push하지 않은 자기 branch를 `086fbabda3d8eec37f7fe63d13d949df99abd5a3` 위로 정렬했다. 충돌은 없었고 다른 작업의 이력을 변경하지 않았다.
새 영상 공통 패키지를 포함해 frozen install·전체 package build를 다시 통과했다. 정렬 후 auth-react 전체는 신규 main 회귀를 포함해 282건, 실제 PostgreSQL/대표 복귀 API는 84건 PASS다.
이전 실행과 중복 합산하지 않으며, 기존 2,260건에서 새 main의 auth-react 7건만 추가하면 2,267건이다.
Partner·협동조합의 공개/업무 메뉴 metadata는 각 앱의 `src/config/navigation.ts`에 두고 서버가 확인한 기존 운영 자격으로만 업무 메뉴를 조립한다.
임시 PostgreSQL 스키마 잔존 개수는 0을 확인했다. 최종 PR HEAD의 필수 CI·리뷰 판정은 PR을 따른다.
