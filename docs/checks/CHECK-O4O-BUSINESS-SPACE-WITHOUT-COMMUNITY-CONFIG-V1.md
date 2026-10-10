# CHECK-O4O-BUSINESS-SPACE-WITHOUT-COMMUNITY-CONFIG-V1

> 2026-10-10 · PR #376 운영 검증 후속 · 후속 배포 전 기록

PR #376은 merge SHA `82599e911c21607033ae9a76b72c72ea1152b3d9`로 API·admin·Neture·약국·강의·내 매장·분회·병원 앱이 모두 DEPLOYED 판정을 받았다. 공개 실제 주소 9개 × desktop/mobile 18회에서 대표 홈 복귀, 가로 넘침 없음, pageerror 0을 확인했다. 관리자 버튼 라벨과 화면 전환 시점에 맞춰 검증 locator를 보완했다.

공개 매장 경영자 Demo 버튼 → 내 매장 → 대표 홈 → 약국 handoff 발급·교환·auth/me는 모두 200이었다. 사업 정보·사업 가입 조회도 200이지만 기본 사업의 communityKey가 없어 참여자 게시판은 미개설 안내를 표시했다. 개인정보·토큰·로그인 요청 본문을 출력하지 않았고 사업 자료·회원·게시물 수정은 수행하지 않았다.

후속 수정은 기존 연결 주소가 없을 때 `business:<key>`를 계산해 사업 원장을 조회한다. 기존 커뮤니티 주소와 승인 SQL은 유지한다. unknown business namespace는 독립 커뮤니티로 fallback하지 않는다. 사업별 저장 원장은 기존 `sf:<UUID>`이며 DB insert/update/delete, membership 부여, 자동 게시판 개설은 없다.

- 약국 Vitest 11 files / 89 tests PASS. 게시판 연결이 없는 사업의 승인 참가자 자료 조회·미승인 조회 차단·담당 운영자 진입 포함.
- API focused Jest 5 suites / 48 tests PASS. 기존 community/handoff 정책, 두 주소의 동일 승인 SQL·immutable ID·unknown namespace 차단·미연결 사업 메타데이터 포함.
- API Node 22.18.0 TypeScript PASS. 약국 TypeScript·production Vite build PASS.

전용 후속 worktree는 최신 main에서 생성했다. 동일 코드 계열의 기존 의존성·패키지 산출물을 재사용했으며 임시 Vite/Vitest 설정으로 symlink 보존과 dependency inline을 사용했다. 저장소 설정·lockfile은 변경하지 않았다. CI의 정규 설치·빌드·전체 테스트 결과와 후속 실제 체험 검증은 별도로 확인한다.

자동 리뷰 P1 보완: 닫힌 게시판 읽기·글 고정의 sf 원장 역조회도 같은 기본 주소로 해석한다. 비정상/없는 역조회 주소는 예외나 서비스 역할 fallback 없이 거절한다. 기존 독립 커뮤니티 및 UUID 사업의 회원·담당 운영자·무관한 운영자 경계 회귀를 추가했다. 내 매장 사업 목록 DTO에도 기본 주소를 계산해 기존 참여자 진입 버튼이 미연결 상태만으로 사라지지 않게 했으며, 원본 설정과 가입 상태는 바꾸지 않는다.

역조회·내 매장 진입 후속 회귀: API 3 suites / 24 tests PASS, Node 22 API TypeScript 재검증 PASS. 닫힌 게시판 회원 조회, 담당 운영자 moderation, 무관한 운영자 차단 및 null 역조회 fail-closed를 포함한다.
