# CHECK — 소셜 우선 로그인·가입 화면·SVG 로고 정합

- 일자: 2026-11-03
- 범위: 사용자 요청에 따른 로그인·가입 시각 체계 및 기존 로고의 SVG 전환
- 종료 범위: 로컬 검증·commit·push. PR 생성·main 병합·배포 없음.

## TODO

- [x] 공통 모듈과 서비스별 소비처·계정센터 연결형 화면·Google 전용 관리자 구분
- [x] 소셜 버튼 우선, 이메일 선택형 폼과 기존 복구 링크 유지
- [x] Google medium 공식 버튼으로 이름·이메일 추천 비표시, 가입 문구 구분
- [x] 가입·복구 화면을 공통 인증 카드에 정합
- [x] 기존 Neture PNG N 표식과 기존 O4O SVG 표식을 도형/path 기반 SVG로 정리
- [x] 독자 협업체 로고의 교체 지점 제공, 기본값 O4O
- [x] 소셜·이메일·Demo·오류·복귀·초대 상태 회귀 검증
- [x] 실제 브라우저 PC·태블릿·모바일 검증
- [x] 영향 있는 소비처 빌드·타입 검사
- [x] 문서·diff·민감정보 검사

TODO를 소비처 목록과 다시 대조했다. commit·push 결과는 최종 인계의 branch·SHA로 보고하며 PR·병합·배포는 수행하지 않는다.

## 적용 경계

- LoginMethods: 내 매장·분회·약국 서비스, 협동조합 로그인.
- Neture 모달: 메인·공급자·펀딩·커뮤니티·CarePharm의 기존 성공/오류/복귀/Demo 분기 유지.
- 강의·계정센터: 기존 Neture 로그인/handoff 연결 유지.
- Partner: 기존 cookie 세션 확인을 사용. 새 창의 계정센터 진입으로 원래 탭의 초대·작성 상태를 보존하고 명시적 상태 확인 후 진행.
- Admin: Google 전용 유지, 계정 추천 없는 공식 버튼만 적용.
- 병원약국: 현재 무로그인 서비스이므로 새 로그인 화면을 만들지 않음.
- 로고: `packages/auth-react/src/assets/`가 인증 화면 원본. 서비스/협업체는 LoginCard·LoginLayout의 `logoSrc`로 독자 SVG를 지정할 수 있다. Neture favicon도 같은 SVG를 사용한다.
- 기존 PNG는 기존 PWA/호환 소비처 확인 없이 일괄 삭제하지 않는다. 새 SVG에는 raster image나 외부 font 참조를 넣지 않는다.
- 인증 API·서버 권한·계정 병합·OAuth 증명·약관 동의 계약은 변경하지 않는다.

## 검증

- Node 22.18.0 / pnpm 10.25.0에서 frozen offline install 및 `pnpm run build:packages` 통과. 런타임 버전·의존성·lockfile 변경 없음.
- 단위/통합 검사: auth-react 23파일 286건, Neture 인증 focused 4파일 38건, Partner 전체 7파일 101건, 협동조합 전체 11파일 88건, 약국 로그인 member-home 회귀 1파일 3건 — 총 516건 통과. 전체 저장소 Jest 실행 결과는 아니다.
- Neture 복귀 검사에서 공개 홈 배너 조회의 미격리 HTTP가 jsdom 오류를 만들던 원인을 확인하고 해당 API를 mock 처리했다. 최종 38건 실행에서는 이 오류가 없다.
- Neture·Store·Branch·Pharmacy·Coop·Partner·Lecture·Account·Admin 9개 소비 앱의 타입 검사 포함 production build 통과. 공통 스타일 최종 보완 후 Neture·Partner build 재확인.
- 변경 TS/TSX의 ESLint 통과. `git diff --check` 및 두 변경 문서의 민감정보 검사 통과. `LoginCard`·`LoginMethods`·`GoogleContinue`·favicon 리터럴 소비처를 확인했다.
- Chromium 실제 컴포넌트 기반 fixture: Neture 로그인/가입, Store, Branch, Partner 인증 카드 × 1365/820/390px — 15개 통과. 로고 SVG 로드, 소셜 우선 순서, 가로 넘침, 이메일 열기/상태 보존, 이메일 오류/재발송, 가입 후 다른 소셜 버튼 제거를 검사했다. Partner는 기존 개별 폼과 새 카드 조합의 이메일 입력·비밀번호 정리를 확인하고, 세션/초대/복귀는 서비스 단위 검사로 확인했다.
- 브라우저에서 인증 API·GIS를 합성 응답으로 격리했다. 외부 요청 0건·page error 0건. Google 공식 SDK에 전달하는 `medium`/일반 문구를 검증했으며, 실제 Google 계정 추천 비표시는 [공식 personalized button 조건](https://developers.google.com/identity/gsi/web/guides/personalized-button)에 근거한다. 운영 OAuth 창·실제 계정·확인 메일·데이터 변경은 실행하지 않았다.
- 화면 캡처와 브라우저 결과는 작업공간의 로컬 artifact로 보관한다. 기존 build chunk/Browserslist 및 React Router future 경고는 이번 범위에서 의존성 변경으로 처리하지 않았다.

## 인계

- 저장소: `Renagang21/o4o-platform`
- 작업 branch: `wo/social-first-login-20261103`
- 기준 main: `ff8f1fce26e273f69d9108b63a5f1e9ea7c0dabf`
- 통합 후 실제 제공자 로그인과 배포 화면의 후속 확인은 통합 담당 범위다. 이 작업은 push에서 종료한다.

## 문서 정합

인증·서비스 가입 정본에 2026-11-03 사용자 정책과 이 CHECK를 연결했다. 과거 가입 방식 보완 기록은 당시 결과로 유지한다.

## 후속 통합 검토 — PR #932

사용자가 main 병합·배포를 추가 지시해 통합 검토를 진행했다. Codex 리뷰에서 Neture localStorage 세션은 Partner의 cookie 확인만으로 전달되지 않는 점을 확인했다. 소셜 진입 링크를 기존 `/service-entry/partner-support?returnPath=%2Fcommunity` → `/auth/handoff` → Partner `/handoff`로 연결했다. 새 창의 Partner 수신기가 같은 origin의 토큰을 저장하면 원래 탭의 명시적 상태 확인이 그 토큰을 읽는다. 초대·작성 상태는 원래 탭에서 유지하며 계정·서비스 가입·권한을 새로 만들지 않는다. Neture 출발점은 유한한 `partner-support` 대상을 허용하며 외부 복귀 경로를 전달하지 않는다.

수정 후 Neture 인증/출발점 5파일 61건, Partner 전체 7파일 102건 및 두 서비스의 타입 검사 포함 build를 재검증했다. 변경 파일 ESLint·문서 민감정보·diff 검사도 통과했다. 출발점의 로그인 전 대기·로그인 후 handoff·외부 복귀 차단·서비스별 거절 안내와 수신 토큰 저장 후 원래 클라이언트의 Bearer 재조회가 포함된다.
