# WO-O4O-SERVICE-HEADER-ACCOUNT-DISPLAY-V1

> 상태: ACTIVE · 작성: 2026-10-18 · 범위: 로그인 서비스 헤더 계정 표시

## 요청과 완료 기준

대표 메인의 이름+계정 메뉴는 유지한다. 서비스도 이름+계정 메뉴 하나로 표시한다. 이름·이메일·Demo 안내와 기존 역할별 업무 진입·로그아웃은 보존한다. 인증·권한·서비스 가입 정책은 바꾸지 않는다.

## TODO와 코드 재조사

- [x] 대표 메인, 공통 GlobalHeader, Neture host profile, 약국, 강의, 매장, 분회, 협동조합, 병원약국 헤더 조사.
- [x] 코드와 공통 헤더 기준 문서 대조: 대표 홈은 이름 trigger, Neture/약국 공통 헤더는 단독 색상 아이콘. Neture Demo 안내는 별도 계정 배지로 나뉨. 강의/매장/분회는 별도 로그아웃·내 정보 링크. standalone 협동조합 session은 userId만 전달하며 실제 진입 사업은 Neture/KPA 헤더를 사용. 병원약국은 개인 인증 없이 PC 파일 상태를 표시.
- [x] 공통 이름 trigger·메뉴 표시를 로그인 서비스에 적용. 대표 홈 그대로 유지.
- [x] Demo 안내를 계정 메뉴 안에서 보존. 외부 안내 배지와 별도 계정 아이콘을 중복 노출하지 않음.
- [x] 서비스별 업무 링크, 현재 경로 닫기, Escape/외부 클릭, 로그아웃 1회, 긴 이름·모바일 검증.
- [x] 소비처 테스트·타입·빌드·실제 화면 확인 후 commit/push.

## 범위 경계

대표 홈 UI와 개인 로그인이 없는 병원약국 파일 도구는 바꾸지 않는다. standalone 협동조합 구조 미리보기에 이름을 만들어 넣지 않는다. 운영 DB write와 신규 권한/계정 부여는 없다. 기존 운영자 PR #687 배포와 별도 branch/worktree에서 진행한다.

검증 결과: [CHECK](../checks/CHECK-O4O-SERVICE-HEADER-ACCOUNT-DISPLAY-V1.md). 실제 build PC/모바일 20건, 전체 회귀 2,293 tests와 웹 5개 build를 통과했다. 개발 push와 운영 배포 상태는 구분한다.
