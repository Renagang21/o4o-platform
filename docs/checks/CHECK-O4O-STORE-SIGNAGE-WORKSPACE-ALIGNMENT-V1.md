# 내 매장 콘텐츠·사이니지 정비 검증

작성일: 2026-11-05. 상태: 로컬 구현·검증 완료, PR 준비. PR 생성까지이며 main 병합·배포는 범위 밖이다.

기준 main: `695fb9814aee3c632aa14551759aaab5846fb8c3`.
정책: [내 매장 정본](../baseline/O4O-STORE-CONTENT-SIGNAGE-WORKSPACE-V1.md).
범위·재점검: [TODO](../work-orders/TODO-O4O-STORE-SIGNAGE-WORKSPACE-ALIGNMENT-V1.md).

## 운영 읽기 조사

환경에 연결된 테스트 매장 운영자는 로그인 200, owner 매장 1개, 약국 원장 active였다.
기존 원장에 사업자번호·면허번호·주소·전화가 있지만 약사 자격 조회는 unrequested였다.
매장 정보·사업 목록은 PHARMACIST_QUALIFICATION_REQUIRED(403), 영상은 SIGNAGE_ACCESS_DENIED(403),
재생목록은 권한 거절을 빈 성공 목록(200)으로 표시했다. 계정·식별자·비밀번호·면허 값은 문서에 기록하지 않는다.

## 구현 검증

기존 테스트가 요구하던 별도 신청·중복 My Home·이전 사업 명칭은 현재 정책으로 정비했다.

| 검사 | 결과 |
|---|---|
| 환경·설치 | Node 22.23.4 · npm 10.9.9 · pnpm 10.25.0, frozen lockfile·store integrity 설치 성공 |
| 의존 패키지·API·store 웹 production build | 성공. 웹의 기존 큰 chunk/Browserslist 경고는 유지 |
| store 웹 전체 Vitest | 93 files, 935 passed (직렬 실행) |
| 마지막 출처/필터·협업체 가져오기 보완 회귀 | 2 files, 20 passed; 전체 검사 후 추가한 출처 검사 포함 |
| API 단위/규칙/선택 매장 경계 | 4 suites, 40 passed |
| 공통 account-ui | 2 suites, 28 passed |
| 실제 PostgreSQL 약국 업무 통합 | 56 passed. 가입/게시 자료 영상 추출·가입 약국 사본·타 매장/철회/보관 거절 포함 |
| 실제 PostgreSQL 공급자→매장 왕복 | 10 passed |
| Demo 추가 자격 준비와 transaction gate 집중 검사 | 5 passed, 나머지 26은 testNamePattern 범위 밖 |
| PC 1440×1000 / mobile 390×844 Chromium | 두 크기 모두 콘텐츠 분리·보조 메뉴 정리·영상 선택/가져오기·목록 이름 수정 충돌/재시도·추가/순서/제거·목록 신규/삭제·매장 정보 직접 URL/재시도·403 자료 비노출 확인. pageerror 0 |
| ESLint | 저장소 ratchet 성공(2 errors/972 warnings, 기존 기준 46 유지). 변경 TS/TSX는 0 errors/기존 route warning 1 |
| 문서 민감정보·diff whitespace | 0건/성공 |

브라우저는 실제 변경 컴포넌트를 실행하되 인증·매장 문맥과 API는 loopback 합성 fixture를 사용했다.
외부 영상 서비스 응답과 운영 계정 쓰기/실제 하드웨어 재생을 검증한 결과로 해석하지 않는다.
수정한 공통 `PharmacyBusinessInfo`는 Store 소비처, `VideoRegistration`은 Store·Neture 커뮤니티 소비처를 확인했다.
새 prop은 선택 사항이며 기존 YouTube 기본값을 유지하고 Store만 O4O 보관을 기본으로 지정한다.

### 숨기지 않은 기존 실패

Demo opt-in 전체 31건 실행에서 28 passed/3 failed였다. 세 항목은 다른 약국의 admin/manager 관계와 공급자 manager 관계를
fixture에 넣는 단계에서 현행 DB trigger의 `OTHER_EMPLOYER_EXISTS`로 거절됐다.
이번 변경 전 main의 테스트 원문으로 같은 격리 DB에서 세 항목을 다시 실행해 모두 같은 오류를 재현했다.
자격 준비 신규 3건을 포함한 집중 검사는 감사 건수를 현재 synthetic reviewer로 한정하여 반복 실행도 성공했다.
기존 trigger·보안 규칙·검사 기준을 낮추거나 실패한 항목을 skip으로 바꾸지 않았다.

첫 전체 웹 병렬 검사에서는 기존 QR 두 항목이 시간 초과였지만, 동일 제한의 직렬 전체 검사에서 모두 통과했다.
DB 검증의 초기 fixture 누락/포트 조건/이전 실행 중복 자료는 소유한 격리 환경에서 정리한 뒤 전체 56건을 재검증했다.
공개 재생, 기존 저장 모델, 직원 초대/권한과 다른 매장 경계는 보존한다.
운영 데이터나 API 권한을 우회해 테스트 계정을 통과시키지 않는다.

## Demo 자격 정합성 준비

기존 `demo-account-reconcile.ts`의 `DEMO_ACCOUNTS_QUALIFICATION=true` 모드를 사용한다.
기본 `DEMO_ACCOUNTS_MODE=plan`은 읽기 전용 계획이다. registry의 현재 공개 STORE_OWNER 하나와 활성 owner/약국 원장을 확인한다.
면허/사업자 값은 그 기존 원장에서 읽으며 임의의 일반 회원·이메일 입력으로 대상을 바꿀 수 없다.

검토 후 별도 실행에서만 `DEMO_ACCOUNTS_MODE=apply`, 계획의 `DEMO_ACCOUNTS_DIGEST`,
현재 활성 전체 관리자 UUID인 `DEMO_ACCOUNTS_REVIEWER_ID`를 제공한다. 변경된 계획·외부 대상·철회/반려 자격·중복 승인 면허는 거절한다.
정합 상태는 보존하고 변경은 한 트랜잭션·감사 로그로 처리한다. 비밀번호·계정 식별·직원·다른 사업의 가입은 바꾸지 않는다.
이 PR 개발 중에는 소유한 loopback PostgreSQL의 합성 자료만 실행 검증한다. 운영 적용은 미실행이다.

## 문서 정합

신규 정본·색인·통합 가입 기준·commerce 설계의 별도 최초 신청 설명·사업 명칭을 함께 정렬한다.
과거 실행 기록은 당시 기록으로 보존한다. 태블릿 ScreenSet/TV/사본 목록과 운영자 미디어 목록의 기존 저장 경계는 유지한다.

## Git·종료 범위

전용 worktree `store-signage-workspace-alignment-20261105`, branch `wo/store-signage-workspace-alignment-20261105`에서 작업했다.
기준 checkout 및 다른 세션 worktree/미커밋 자료는 변경하지 않았다. manifest·lockfile·migration·운영 데이터 변경은 없다.
운영 테스트 약국은 기존 자격 원장 불일치가 남아 있으므로, 이 PR의 검증된 준비 코드를 나중에 검토·적용하기 전까지
운영 화면이 이미 정상화됐다고 보고하지 않는다. 종료점은 push·PR 생성이며 main 병합·배포는 하지 않는다.

### 최신 main 정합

개발 중 PR #944 서비스 로고가 main `bc33210dae`에 반영됐다. push 전 자기 브랜치만 그 기준으로 rebase했다.
헤더의 한 충돌은 새 SVG 로고와 매장 이름 표시를 모두 보존했다. 업무공간/메뉴 회귀 69건을 다시 통과했다.
다른 세션의 브랜치·체크아웃·로고 변경 원본은 수정하지 않았다.
