# CHECK-O4O-BUSINESS-PARTICIPANT-SERVICE-SPACE-V1

> 작성일: 2026-10-10 · PR #376 · 로컬 검증 기록, 운영 반영 전

## 조사

사업 참가자 게시판은 `semi_franchises.community_key`로 찾고 `sf:<UUID>` 원장으로 격리되어 있다. 따라서 화면·진입 경로를 사업 서비스로 옮기되 게시물·댓글·승인 데이터를 이동할 필요가 없다. 독립 약사 커뮤니티와 사업 참가자 공간은 다른 원장이므로 독립 커뮤니티 진입은 유지한다.

메인 복귀 변경은 PR #376이 OPEN 상태로 운영에 미반영이었다. 로그인 모달 내부에도 복귀 버튼을 추가했다. 버튼 누락 보완과 명확한 문구를 이번 PR에서 함께 전달한다.

## 검증

- 약국 Vitest: 11 files / 86 tests PASS. 비로그인·미승인·승인·사업 불일치·조회 실패·신청 조건·자료 차단·담당 운영자 전용 진입·사업 게시글 작성·닫힌 게시판 가입 신청을 포함한다.
- Neture Vitest: 47 files / 387 tests PASS. 공통 커뮤니티와 사업 진입 분리, 소개 Home 미노출 및 404 이외 조회 실패를 미가입으로 처리하지 않는 검증 포함.
- auth-react Vitest: 13 files / 162 tests PASS. 대표 홈 복귀, 단일 인증 인계, 목적지 origin/path 검증 포함.
- shared-space-ui Vitest: 9 files / 64 tests PASS. 동일 사업 원장의 소유 게시판·회원 관리 경로 및 인코딩 포함.
- 내 매장 Vitest: 1 file / 9 tests PASS. 강의 Vitest: 1 file / 2 tests PASS.
- API focused Jest: 커뮤니티 경로 가드·기존 사업 규칙 48 tests, 사업 identity/원장 보존 2 tests, 최소 사업 정보 조회 2 tests PASS.
- production 산출물 브라우저: 1280px/390px × 승인 대기/승인 완료 4회 PASS. 사업 내부 게시판, 미승인 게시글 조회 0회, 가로 넘침 없음, 대표 홈 인증 인계 1회 확인. 실제 운영 계정·운영 API를 사용하지 않은 모의 세션 검증이다.
- 추가 비로그인 브라우저: 약국·커뮤니티·내 매장·강의 × 1280px/390px 8회 PASS. 로그인 창 내부 복귀 포함, 인증 인계 POST 없이 대표 홈으로 직접 이동하며 가로 넘침 없음. 강의 root의 최초 진입 오류를 발견해 Navigate import를 보완하고 재검증했다.
- 잘못된 주소 브라우저: 위 네 서비스 × 두 화면 크기 8회 PASS. 약국·Neture 독립 404 화면의 복귀 버튼 누락을 보완했다. 총 브라우저 20회 검증이며 운영 검증과 구분한다.
- 약국·Neture·내 매장·강의 TypeScript 및 production Vite build PASS. API TypeScript PASS.

로컬 의존성은 기존 환경을 재사용했다. API typecheck는 저장소 권장 Node 22.18.0에서도 확인했다. DB 변경·운영 계정 변경·운영 데이터 조회는 수행하지 않았다. CI 및 운영 검증 결과는 후속 기록으로 구분한다.

배포 준비 판정: `origin/main..HEAD` 기준 LEVEL_3, 대상 API·admin·Neture·약국·강의·내 매장·분회·병원 약품 앱. 실제 배포는 main 병합 뒤 serving SHA를 기준으로 Delivery가 다시 판정하며, LEVEL_3이면 승인된 main SHA로 promote를 실행한다.

Sonar 지적 보완: 게시판 조회·본문 표시를 분리해 함수 복잡도를 낮추고, 상태 표시를 output 요소로 정비했다. 버튼 타입, 읽기 전용 props 및 중복 import도 수정했다. 약국·Neture·인증 테스트와 타입 검사, 네 서비스 production build, 브라우저 20회 검증을 다시 통과했다. 기존 매장 선택·가입·승인 가드는 유지하며 복수 매장의 임의 선택이나 권한 부여는 하지 않는다.
