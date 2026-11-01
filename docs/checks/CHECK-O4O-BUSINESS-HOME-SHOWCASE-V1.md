# CHECK-O4O-BUSINESS-HOME-SHOWCASE-V1

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

2026-10-19 · 기준 main 491be1bb82 · branch wo/business-home-showcase

## 절차와 범위
WO 최초 TODO 작성 → 정본/코드 소비처 재검증 → 구현 전 TODO 보완 → 구현 → 아래 검증. 상세 계약: DESIGN-O4O-BUSINESS-HOME-SHOWCASE-V1. 네 사업 승인 원장과 홈을 공통 진열 경로로 연결했다. Pharmacy 기본 공급·주문/가격/대상 약국·사본 정책은 유지한다. 운영자 진열은 일상 업무이며 영구 삭제 API는 추가하지 않았다.

## 실행 결과
- API 4 suites / 73 tests PASS. 로컬 전용 PostgreSQL에서 새 진열 8개, 기존 공급자 콘텐츠 12개, 사업 운영자 권한 12개와 Supplier 도메인 경계 41개를 실행했다. fixture는 합성 데이터이며 실행 후 테스트 schema/임시 테이블 정리. 운영 DB를 사용하지 않았다.
- 검증 내용: 선택 약국/개별 조합원 범위, 특정 약국 제안 비노출, 가격/첨부 DTO 제외, 같은 조직의 타 사업 설정 보존, 동시 version 충돌, 종료/비활성/가입 정지 후 비노출, 감사 실패 rollback, 요청자 및 canonical 공급자 owner의 콘텐츠 자기 승인 금지, 독립 운영자 승인·보관 이력.
- operator-core-ui 약국 관리 7 files / 50 tests PASS. 새 진열 관리자 테스트는 입력 보존·버전 충돌 오류·중복 실행·사업 변경 후 늦은 완료 폐기를 확인한다.
- shared-space-ui 전체 12 files / 126 tests PASS. 신규 회원 진열 6개는 로그인 전 조회 금지·복수 약국 선택·계정/사업 변경 후 늦은 응답 폐기·오류와 빈 목록 구분·담당 미리보기/숨김 비노출을 확인한다.
- Pharmacy/해당 협업체(당시 구명칭) 공용 사업 화면 6 files / 68 tests PASS. 기존 홈 기대값은 원장 최근 목록 대신 새 사업별 진열 API·회원 범위로 정합화했다. CarePharm 1 file / 29 tests PASS. Pharmcoop 4 files / 39 tests PASS.
- 합계 385 tests PASS. API TypeScript production build, Neture·Pharmacy 공용 앱·Pharmcoop production build PASS. 공통 패키지 build:packages 및 frozen-lockfile 설치 PASS. 새 외부 의존성 없음. 협동조합 앱의 기존 shared-space-ui workspace 참조만 추가.
- 실제 Chromium에서 production 산출물에 합성 API만 연결하여 16 cases PASS: 네 사업 × 회원/운영자 × 1440/390px. 회원 승인 제품/콘텐츠 본문 열람, 운영자 숨김 저장 후 갱신, viewport 가로 넘침/JS 오류 없음. 회원 쓰기 0, 운영자 클릭당 진열 PUT 1. 실제 운영 API/계정에 쓰지 않았다. 검증 스크립트·로그는 저장소 밖 /tmp/showcase-*에 보관한다.
- 변경 TS/TSX ESLint error 0. neture-pharmacy.routes.ts의 기존 _next 미사용 warning 1개는 이번 변경 전부터 존재한다. 새 warning 없음.

## 미실행 / 인계
실제 운영 계정/사업 등록·담당 지정·개별 조합의 가입 상태·DNS/호스트 연결 검증은 미실행이다. 실제 공급 요청/승인·가입·제품·콘텐츠·조직 설정·감사 로그 데이터는 변경하지 않았다. 새 migration 없음. 개발 종료점은 push이며 PR·CI·병합·배포는 통합 담당 범위다. 작업 worktree/branch는 후속 수정용 KEEP.

## main 통합 후 재검증
최신 협동조합 역할/회원관리 main을 보존해 API import 충돌을 해결했다. 통합 후 API·권한·도메인 경계 76개, 공통 운영자 50개, Pharmcoop 43개 및 API/Pharmcoop production build, 협동조합 PC/모바일 4개 시나리오 PASS. 이어 최신 협동조합 정책과 기존 진열 조회를 대조해 개인 조합원의 Neture 메인 상태 결합을 해소하고 회귀 검증을 추가했다. 앞의 385개 개발 검증 기록은 최초 개발 HEAD의 결과다.
개인 조합 자격 분리 수정 후 API·권한·경계 5 suites / 77 tests와 API production build, 변경 코드 ESLint 및 문서 민감정보 검사 PASS. 약국은 기존 Neture/조직/사업 자격을 유지하고 개인 조합원만 최신 독립 자격 정책을 따른다.
