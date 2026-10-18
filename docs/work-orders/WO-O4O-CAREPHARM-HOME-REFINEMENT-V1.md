# CarePharm 초기화면 정비 V1

> 상태: ACTIVE · 작성: 2026-10-18 (Asia/Seoul)
> 범위: 사용자 화면 지적 후 TODO → 문서·코드·사이트·개발자 커뮤니티 조사 → 구현·검증·commit·push.
> 종료점: push. PR 생성·main 머지·배포·운영 사업 등록·가입 승인·권한 부여·DB 변경은 범위 밖이다.

## TODO

- [x] T1. 최신 정본·화면·조회 계약과 공통 소비처 조사.
- [x] T2. 협업체 사이트 공개 코드·개발자 커뮤니티 조사, 출처·제약·채택/제외 기록.
- [x] T3. 조사 결과로 메뉴·홈·회원 조회 오류 처리의 구현안 확정.
- [x] T4. 고정 Study 안내 제거, 홈페이지와 회원 업무 표시 분리, 중복 메뉴 정비.
- [x] T5. 조회 실패 원인별 처리·재시도·미가입/운영 미개설 상태 검증. 권한 우회 없이 기존 서버 gate 유지.
- [x] T6. 공통 소비처 type/build/test·desktop/mobile 브라우저 확인.
- [x] T7. 문서·변경 범위 검사·commit·push, 정확한 HEAD 및 미해결 범위 인계.

## 사용자 확정 경계

Study는 상시 제공하지 않는다. 강의가 있을 때 운영자가 Hero·공지·게시글로 안내한다. 개인 건강관리·상담·후속 관리나 미정 CGM/무료혈당기 기능을 추가하지 않는다. CarePharm 가입·승인은 해당 협력사업에서, 승인된 약국의 실무는 내 매장에서 제공한다. 회원 콘텐츠의 공개 전환을 화면 오류 해결책으로 쓰지 않는다.

## 조사·구현 기록

진행하면서 근거와 실제 검증 결과를 추가한다. 실행하지 않은 검증은 PASS로 기록하지 않는다.

## 조사 결과와 확정 구현안 (T1–T3)

### 저장소·운영 근거

- 정본: `O4O-HOME-SERVICE-DISCOVERY-V1`, `O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`, `O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`. 각 사업의 가입·승인과 선택 약국 active gate를 유지한다.
- 실제 홈페이지 오류는 환경에 현재 연결된 테스트 계정 Secret으로 이메일 로그인 후 읽기 전용 재현했다. 로그인 200, `/neture/pharmacy/businesses/carepharm` 404 `BUSINESS_NOT_FOUND`, `/communities/business%3Acarepharm/access` 404 `COMMUNITY_NOT_FOUND`, `/work-scope/accessible-stores` 200. 계정·비밀번호·토큰을 기록하지 않는다. 활성 CarePharm 사업을 찾지 못하는 상태이며 DB 행 부재/비활성 중 어느 것인지는 운영 DB를 조회하지 않아 구분하지 않는다. 공개 협동조합 목록의 빈 결과로 개별 사업 부재를 추론하지 않는다.
- `CooperationMemberSpace`는 사용처 검색 결과 CarePharm 한 곳이 사용한다. 상단과 본문 nav 중복, 3단계 조회를 한 catch 문구로 통합한 문제가 있다. API 실패를 승인이나 임시 데이터로 우회하지 않는다.
- `ServiceHomeHero`/`ServiceHomePromotion`은 서비스별 공통 소비처가 있다. 공개·예약·운영자 편집 계약을 유지하고 CarePharm의 기본 Hero만 1장으로 정비한다. 다른 서비스 기본 슬라이드는 유지한다.

### 외부 사이트 소스·개발자 커뮤니티 조사

직접 웹사이트 접속은 cloud egress 제한으로 차단됐다. 아래는 **실제 읽은 GitHub 공개 소스·논의**이며 현재 운영 웹사이트의 시각 실사와 구분한다. 원문은 2026-10-18(Asia/Seoul)에 조회했다. 오래된 소스와 열린 이슈를 현행 표준 확정으로 해석하지 않는다.

| 출처 | 확인 | 채택 / 제외 |
|---|---|---|
| [CoopCycle 공식 홈페이지 소스](https://github.com/coopcycle/coopcycle-website/blob/master/layouts/index.html) | 소개 Hero, 네트워크 참여, 소프트웨어·단체 소개를 구분. `config.toml`에서 외부 소식 링크 관리 | 공개 소개와 참여·회원 업무의 분리 채택. 소비자 주문·배달 도시 선택·모바일 앱 안내는 사업 범위가 달라 제외 |
| [Open Food Network 공식 홈페이지 테마](https://github.com/openfoodfoundation/openfoodnetwork-wp/blob/master/wp-content/themes/ofn/header.php) | header 안의 primary nav 한 곳, skip-link, mobile toggle의 aria-controls/expanded | 주 메뉴 단일화와 기존 공통 헤더 재사용 채택. 오래된 WordPress/PHP 구현·쇼핑 기능은 복제하지 않음 |
| [W3C ARIA Practices #353](https://github.com/w3c/aria-practices/issues/353) 및 댓글 | 일반 웹사이트 링크 탐색에 application menu 역할을 강요하는 문제 논의 | 네이티브 링크·nav 사용, 별도 role=menu·키보드 widget 도입 제외 |
| [GOV.UK Design System #4879](https://github.com/alphagov/govuk-design-system/issues/4879) 및 재현 댓글 | desktop에 감춘 mobile 버튼이 VoiceOver 탐색에 남는 사례 | desktop/mobile의 숨김·접기·포커스 이동 브라우저 검증에 반영. iOS VoiceOver 실기기 검증 완료로 보고하지 않음 |

### 구현안

1. 공개 홈페이지: 단일 기본 Hero → 협업체 소개 → 운영자가 게시한 공지·안내 → 회원 이용 상태. 로그인·회원 조회 실패와 관계없이 공개 소개가 유지된다. 거짓 최신글·운영 수치를 생성하지 않는다.
2. 헤더 메뉴 한 곳: 협업체 소개 / 공지·안내 / 회원 커뮤니티 / 자료실 / 참여 안내. 로고는 홈. 기존 문의·My Home·업무 도구 경로의 실제 진입은 유지한다.
3. 고정 Study 박스 제거(홈·운영자). 게시된 Hero·안내 링크의 기존 Study 이동은 허용하며 강의 기능은 추가하지 않는다.
4. 사업 미개설·인증·접근 권한·통신/응답 오류를 구별한다. 홈 상태 요약은 회원 자료 본문을 불러오지 않는다. 자료·도구 화면에서는 선택 약국 active gate를 유지한다.
5. CarePharm 기본 Hero의 상담·지속 건강관리 문구 제거. 기본 1장, 운영자가 실제 게시한 복수 배너는 유지한다.

## 구현·검증 중간 기록

- 홈은 공개 Hero·소개·공지·회원 이용 요약으로 정리했다. 홈에서는 회원 자료 본문을 요청하지 않는다. 자료실·내 매장 업무 화면은 기존 선택 약국 active 판정을 유지한다.
- Study 고정 CTA의 홈·운영자 사용처와 미사용 컴포넌트를 제거했다. 게시된 운영자 안내의 Study 링크·복수 Hero는 공통 테스트로 유지 확인했다.
- 조회 단계별 오류와 실제 사업/회원 공간 미개설 코드를 구분했다. 미개설에는 무의미한 재시도 대신 문의를, 401에는 로그인, 통신 실패에는 재시도를 제공한다.
- 모바일 브라우저에서 새 홈 앵커 이동 시 메뉴가 남는 현상을 발견했다. 공통 `GlobalHeader`의 닫힘 effect가 pathname만 확인하므로 search/hash도 포함하도록 보완했다. 실제 컴포넌트 사용처는 Neture·Pharmacy이며 Store/Operator 패키지의 같은 문자열은 slot 설명 주석으로 직접 소비가 아니다. 기존 pathname 이동과 함께 hash/query 이동 3개 회귀 테스트를 추가했다.
- Neture 전체 123 files / 1118 tests, shared-space-ui 전체 11 / 120, Pharmacy 전체 24 / 167 PASS. 최종 오류 문구·미사용 변수 정리 후 CarePharm/운영자 집중 2 / 32 PASS. 공통 헤더 수정 후 packages/ui 전체 4 / 36 PASS. 집중 테스트는 전체와 중복되므로 합산하지 않는다.
- Neture·Pharmacy·Study·분회 최초 build에서 공통 UI 미사용 변수 오류가 나 이를 제거하고 재실행했다. 성공한 최종 실행을 아래에 기록한다. 초기 실패를 PASS로 바꾸어 기록하지 않는다.

## 최종 검증·인계

- 공통 패키지 빌드, 변경한 `@o4o/types`·`@o4o/ui` 빌드 PASS. Neture·Pharmacy·Study·분회 TypeScript 포함 production build PASS. 공통 헤더 변경 뒤에는 UI 패키지의 실제 `dist`를 재생성하고 Neture·Pharmacy production bundle을 다시 만들었다. 소스 테스트만 통과하고 오래된 패키지 결과물이 번들에 남아 있던 상태는 완료로 판정하지 않았다.
- 변경 파일 ESLint error/warning 0, 문서 민감정보 0, diff whitespace 0. 기존 Browserslist 데이터·bundle 크기 경고는 유지된다.
- Chromium 실제 production bundle, 합성 API/계정, desktop 1440px·mobile 390px 각각 6상태(사업 미개설/승인/승인 대기/통신 실패 후 재시도/비로그인/운영자) 총 12개 시나리오 PASS. 기본 Hero 1장, 고정 Study CTA·본문 중복 nav 없음, 앵커 목적 영역 표시·mobile 메뉴 닫힘, 가로 넘침 0, page error 0, 업무 write 요청 0. 홈에서는 자료 API를 요청하지 않고 승인된 자료실에서만 요청함을 확인했다. desktop/mobile 캡처를 확인하고 모바일 제목 줄바꿈도 정비했다.
- 앞의 운영 API 조회는 실제 현재 환경 Secret 연결 계정의 읽기 전용 결과다. 위 화면 검증은 합성 API 결과이며 실제 사업 개설·실계정 승인 성공을 뜻하지 않는다. iOS VoiceOver 실기기 검증은 하지 않았다.
- 남은 운영 사항: 활성 CarePharm 사업과 회원 공간을 찾지 못하는 상태는 운영자의 실제 사업 등록·운영 상태 확정이 필요하다. 이번 코드에서 DB 행 생성/활성화·가입 승인·권한 부여·메일·migration을 실행하지 않았다. 운영자 게시 Hero·공지 내용도 임의 변경하지 않았다.
- 외부 직접 홈페이지 시각 실사는 네트워크 제한으로 미수행. 실제 조사한 공식 홈페이지 공개 소스와 개발자 커뮤니티 출처·채택 판단은 위 표에 남겼다.

## WORKTREE_DISPOSITION

- worktree: `/workspace/o4o-wt/carepharm-home-refinement`
- branch: `wo/carepharm-home-refinement`
- base: `e5150b03bb64da23e1ddba8d68cf6672dfe94ba2`
- main integration / deployment: 미수행 — 사용자 지정 종료점은 push
- CI/Codex: push 뒤 통합 담당 확인 대상. 로컬 성공을 새 HEAD의 CI 성공으로 대신하지 않는다.
- verdict: KEEP — 아직 main 미반영이며 통합·리뷰 및 후속 운영 개통에 필요


## main 통합·배포 지시 후 재검증 — 2026-10-18

사용자가 push 완료 후 이 공간에서 main 머지·배포를 명시적으로 지시했다. 위 push 종료점·미통합 표기는 이전 단계의 기록으로 유지한다. 같은 작업 branch에서 main `48f84fb776d4c9123408f67cebb7d51c583f15e6`을 충돌 없이 merge했다. 새 migration·의존성 변경은 없다.

- main 반영 후 Neture 전체 126 files / 1129 tests PASS, TypeScript 포함 production build PASS.
- 통합된 production bundle로 기존 합성 API desktop/mobile 12개 상태를 재실행해 PASS. 실제 사업 등록·권한 부여·메일·업무 write 요청은 하지 않았다.
- main ruleset 조회: PR 필수, required `CI Gate`, 필수 human approval 0. PR의 정확한 HEAD에서 CI·Codex·미해결 스레드를 확인하고 통합한다. 다른 main 배포와 동시에 공유 runtime을 변경하지 않는다.
- 아직 이 문단은 PR CI·main 머지·운영 배포 성공을 뜻하지 않는다. 통합 담당이 Delivery/Promote의 실제 serving SHA와 공개 응답을 확인해 최종 결과를 보고한다.

## PR #690 Codex P2 보완

`PRRT_kwDOOXrFm86tlyLA`: 현재 `/#news`에서 메뉴를 열고 같은 항목을 다시 선택하면 pathname/search/hash가 그대로여서 메뉴가 닫히지 않는 경우를 보완했다. 공통 헤더 닫힘과 CarePharm 앵커 스크롤의 effect에 매 navigation마다 달라지는 `location.key`를 포함한다. 같은 앵커로 재진입할 때 스크롤을 다시 내리는 동작도 유지한다.

- 공통 UI 전체 4 files / 39 tests PASS: 최초 이동과 같은 anchor/query/path 재선택을 함께 검증한다.
- CarePharm·운영자 집중 2 / 32 tests PASS, 변경 파일 lint PASS.
- UI 패키지 build, Neture TypeScript 포함 production build, Pharmacy production bundle 재생성 PASS. 최신 bundle로 mobile 현재 앵커 재선택까지 검증한 뒤 같은 branch의 새 HEAD를 push한다.

- 최신 production bundle의 desktop/mobile 합성 API 12개 시나리오 PASS. mobile에서 스크롤을 위로 돌린 뒤 현재 `/#news`를 다시 선택해도 메뉴가 닫히고 공지 영역이 다시 보임을 확인했다.
