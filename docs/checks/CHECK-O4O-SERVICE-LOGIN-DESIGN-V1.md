# 서비스 로그인 디자인 검증

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-16
> **연결 WO**: [WO](../work-orders/WO-O4O-SERVICE-LOGIN-DESIGN-V1.md)

## 변경과 영향 범위

`@o4o/auth-react`에 표현 전용 `LoginCard`·`LoginLayout`과 `.o4o-login-*` 범위의 CSS를 추가했다. 공통 `EmailLoginForm`·`PasswordInput`의 로직과 공유 기본 스타일은 바꾸지 않고 새 카드 안에서만 입력·버튼·도움말·체험 버튼을 꾸민다. 신규 의존성, API·권한·세션·업무 계약 변경은 없다.

소비처는 Neture 로그인 모달(5개 호스트 profile), 약국 로그인 모달, 내 매장·분회·강의 페이지 및 관리자 Google 전용 화면이다. 동일 `LoginMethods`를 쓰는 분회 가입 페이지, 이메일 가입·재설정 화면, 다른 공통 UI에는 새 카드 범위 CSS가 적용되지 않는다. 기존 서비스별 계정 링크와 복귀 처리, 약국 미가입 안내, Neture Demo 로직, 관리자 세션 충돌 안내를 유지했다. 계정센터·무로그인 원내 약품 앱은 별도 인증 UI를 만들지 않았다.

## 실행 검증

- Node 22.18.0 · pnpm 10.25.0 · npm 10.9.3. frozen offline 설치 및 공통 패키지 빌드 PASS.
- 여섯 소비 앱 production build PASS: Neture, 약국, 내 매장, 분회, 강의, 관리자. 관리자 외 5개는 앱 build에 TypeScript 검사가 포함된다.
- 기존 Vitest 총 210 files / 2,249 tests PASS: auth-react 19/229, Neture 103/980, 약국 18/139, 내 매장 34/436, 분회 5/39, 강의 10/40, 관리자 21/386.
- 약국의 navigation 테스트 2개 파일은 전체 package mock 대신 기존 mock을 유지하는 partial mock으로 바꿔 실제 새 카드도 렌더한다. 인증 완료·명시적 복귀 계약 assertions는 유지했다.
- 변경 TS/TSX ESLint 오류 0건. 기존 약국 테스트의 Hook dependency 경고 1건은 범위 밖이며 유지했다.
- Chromium · React StrictMode에서 10개 화면/profile × 1440/390/320px, 총 30개 화면 검사 PASS. 카드 clipping·문서 가로 overflow·pageerror 0건.
- 높이 480px 모바일에서 Neture·약국의 닫기 버튼·Escape·backdrop 취소 6건 PASS.
- 브라우저 fixture는 실제 서비스 화면·컴파일된 서비스 CSS·공통 로그인 CSS를 사용한다. 인증·Google SDK만 합성 구현으로 대체하고 외부 요청은 차단한다. 실제 OAuth·운영 로그인·운영 DB 쓰기를 검증한 결과가 아니다.

서비스별 실제 호출 callback과 복귀 링크는 유지했다. 브라우저에서는 이메일·비밀번호 payload, 보기/숨기기, 실패 alert, 필드 공백 시 제출 차단, 계정 도움말 링크, 강의 returnPath, 관리자 수단 제한, 모달 스크롤과 카드 너비를 검사한다. CSS·스크린샷·fixture는 `/tmp/o4o-login-browser`에 두고 저장소에 추가하지 않는다. 기존 Browserslist·큰 chunk 경고는 비차단이며 dependency/lockfile은 변경하지 않았다.

문서 정합: WO·CHECK만 추가했다. 현행 정본은 변경하지 않았다. 병합·배포·운영 확인은 통합 담당에게 인계한다.


## 통합 후속 (2026-10-16 KST)

통합 전용 branch에서 최신 main df5f28a와 #621 전체 이력을 결합했다. Sonar가 지적한 두 모달의 mouse-only backdrop을 native button으로 교체했다. 외곽 dialog의 클릭 listener를 없애고 배경 버튼과 카드의 쌓임 순서를 분리했다. 인증 callback·role·route·복귀·메일·OAuth·Demo 동작을 바꾸지 않았다.

| 소비처 | 영향 / route·role·capability | 이번 통합 검증 / 한계 |
|---|---|---|
| Neture main·supplier·funding·community·carepharm | 로그인 modal 배경 닫기, 기존 호스트·계정·return URL 유지 | 전체 1019 tests, production build; 실제 OAuth·운영 로그인 미실행 |
| 약국 | 로그인 modal 배경 닫기, 기존 membership 안내·복귀 유지 | 전체 150 tests, production build; 실제 계정 미실행 |
| 내 매장 | 원본 LoginLayout 적용, 이번 후속 overlay CSS 소비 없음 | 원개발 436 tests·build·browser 기록 유지; 이번 통합 재실행 아님 |
| 분회 | 원본 LoginLayout 적용, 가입의 LoginMethods는 카드 범위 밖 | 원개발 39 tests·build·browser 기록 유지; 이번 통합 재실행 아님 |
| 강의 | 원본 LoginLayout 적용, 기존 returnPath 유지 | 원개발 40 tests·build·browser 기록 유지; 이번 통합 재실행 아님 |
| 관리자 | Google 전용 수단·세션 충돌 안내 유지, overlay CSS 소비 없음 | 원개발 386 tests·build·browser 기록 유지; 이번 통합 재실행 아님 |
| 공통 auth-react / 가입·재설정·계정센터 | CSS는 새 카드/overlay 범위, 공통 인증 계약 불변 | auth-react 229 tests; 실제 인증은 검증하지 않음 |

이번 통합 재실행 합계는 **1398 tests PASS**(auth-react229/Neture1019/약국150), 두 앱 production build PASS다. 위 원개발 2249개 전체를 이번 통합에서 재실행했다고 보고하지 않는다. CI·Sonar·Codex는 새 head에서 확인한다.

추가 브라우저 검증: Chromium의 실제 Neture·약국 modal과 빌드 CSS·합성 인증으로 PC1440/mobile390×배경 클릭·배경 버튼 Enter·Escape·카드 닫기 16시나리오 PASS. pageerror0, 실제 인증 write0, 가로 overflow0, 닫힌 후 body scroll 복구 확인. 임시 서버 종료·node_modules symlink 해제 완료.
