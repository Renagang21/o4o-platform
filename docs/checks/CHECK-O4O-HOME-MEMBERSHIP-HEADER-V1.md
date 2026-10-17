# CHECK-O4O-HOME-MEMBERSHIP-HEADER-V1

2026-10-17 · base `aee4957413` · branch `wo/home-membership-header`

## 변경과 소비처

- 대표 홈: full-width Hero 아래 비로그인 공개 서비스 탐색, 로그인 가입 서비스·내 매장·가입 상태, 다른 서비스 소개, AI, 소식 순서. 본문 My Home 요약 제거, 상단 `/mypage` 직접 링크 유지·버튼 영역 명확화.
- 회원 분류: 기존 `/auth/services`, `/neture/home/entry`, accessible-stores와 기존 buildHomeEntryModel 사용. 서비스 active만 이용 진입, pending·suspended·rejected·withdrawn 별도 상태. 공급자 개인 이용 상태와 매장 조직은 기존 출처 유지. 조회 실패·로딩은 미가입으로 단정하지 않음.
- 공개 서비스 배너 모두 한 문장 설명. 준비 중·Partner·독립 hospital 문서 이동 유지. 공개 탐색에 새 인증 제한 없음.
- 헤더 조사: NetureGlobalHeader(대표 내부·공급자·펀딩·커뮤니티), KpaGlobalHeader(약국), BranchLayout·DirectoryShell(분회), RootShell(매장), AdminHeader(관리자)는 기존 상단 계정 영역 MyHomeButton 직접 진입 확인. StoreWorkspaceShell은 RootShell 아래 부가 메뉴로 공통 상단 진입이 유지됨. 공동체/독립 사업의 권한·기본 접근은 변경하지 않음.
- 병원 파일 도구는 개인 로그인·계정이 없는 공용 로컬 파일 앱으로 확인했다. 개인 세션을 임의로 추가하지 않고 기존 O4O 대표 복귀를 유지한다.
- 강의 SiteShell만 계정이 서비스 탐색 nav에 섞여 모바일에서 내려갈 수 있어 계정 영역 분리. 모바일 첫 줄 브랜드 우측, 탐색은 다음 줄. 로그인 return과 MyHomeButton 기존 세션 전달 유지. 직접 공통 헤더/인증 패키지 수정 없음.

## 검증

- Node 22.18.0 / pnpm 10.25.0, frozen offline 설치·build:packages 완료.
- Neture 전체: 121 files / 1100 tests PASS.
- 강의 전체: 10 files / 41 tests PASS.
- Neture·강의 tsc 포함 production build PASS. 기존 Browserslist 데이터·큰 chunk 안내는 남음.
- 변경 TS/TSX ESLint: 오류 0, 기존 O4OHomePage exhaustive-deps disable 안내 1건.
- Chromium 실제 소스 UI, 합성 인증·API 경계: 24 scenarios PASS. 1440/390/320px × 대표 홈 6상태(게스트·가입/신청·빈 목록·오류·로딩·약관 미동의) 및 강의 게스트/로그인. Hero 양끝·가로 넘침 없음, 공개 탐색/회원 순서, 본문 My Home 요약 없음, 매장 진입 유지, 서비스 중복 제외, 실패 시 재시도, 준비 중 native dialog Enter/Tab/Escape·초점 복원, 강의 계정 첫 줄 확인.
- 합성 이동 실패를 표시·복구하는 경로 확인. 실제 운영 로그인·DB write·서비스 상태 변경 검증은 수행하지 않음.
- 소스 상태별 검증은 실제 배포·운영 인증 검증과 구분한다. 배포 결과는 PR 및 Delivery에 기록한다.

## 문서 정합

현재 사용자 결정에 맞춰 O4O-HOME-SERVICE-DISCOVERY-V1 §2와 CANONICAL-INDEX를 가입 서비스·공개 탐색 우선으로 정합했다. My Home §3 공통 상단 계정 직접 진입 정책은 유지한다. WO에 서비스별 TODO 기록.

DEPLOYMENT = AUTOMATIC (UI, API/DB/infrastructure 변경 없음). 병합·배포 상태는 통합 후 확인한다.
