# 분회 서비스 현황·신규 개발자 인수 기록

> **상태**: ACTIVE · 현황 문서 작성 완료, 신규 개발자 후속 WO 인수 전 참고 기록
> **작성일**: 2026-10-12 · **최종 갱신**: 2026-10-12
> **근거 WO/IR**: WO-O4O-FRONTEND-INTEGRATED-STABILIZATION-V1 · 분회 작업 중단·신규 개발자 인계
> **조사 기준**: main `899e871ccee0114f6cf7ac73999011a1d364b994`의 코드·문서와 아래 GitHub Actions 관측. 운영 데이터 조사 결과가 아니다.

## 1. 사용자 결정과 인수 범위

2026-10-12 사용자는 **분회 관련 추가 개발을 이 작업에서 중단**하고, 새로 참여하는 개발자가 **전면 정비**하도록 결정했다. 이 기록은 현재 구현과 미확인 사항을 인수하는 자료다. 현재 구현을 새 개발자의 최종 기획으로 확정하지 않는다.

이 세션은 분회 기능/UI·권한·API·DB·배포 설정을 추가 수정하거나 분회 배포를 실행하지 않는다. 기존 서비스·메뉴·데이터를 제거하거나 운영 서비스를 폐기한다는 결정은 아니다. 신규 개발자의 별도 작업과 비분회 후속 작업을 구분하며, 공통 인증/정책/UI 수정이 분회에도 영향을 주는지는 계속 확인해야 한다. 배포 gate를 낮추거나 분회 오류를 숨겨 전체 성공으로 처리하지 않는다.

## 2. 구조·주소·코드 진입점

| 영역 | 현재 위치·계약 |
| --- | --- |
| 공용 주소 | `https://kpa.neture.co.kr/`는 분회 찾기, `/:branchSlug`는 해당 분회 첫 화면. 약국 지원 서비스 `pharmacy.neture.co.kr`와 별도 서비스 |
| 자체 도메인 | 같은 프런트엔드 번들이 Host로 분회를 해석하고 slug 세그먼트 없는 경로를 사용. 분회별 별도 배포/백엔드를 만들지 않음 |
| 프런트엔드 | [services/web-kpa-branch](../../services/web-kpa-branch), 패키지 `kpa-branch-web`. React·TypeScript·Vite. [App.tsx](../../services/web-kpa-branch/src/App.tsx), [BranchLayout.tsx](../../services/web-kpa-branch/src/layouts/BranchLayout.tsx), [tenant.tsx](../../services/web-kpa-branch/src/lib/tenant.tsx)에서 라우트·메뉴·tenant 처리 |
| API | 기존 API 서버의 [kpa-branch.routes.ts](../../apps/api-server/src/routes/kpa-branch/kpa-branch.routes.ts), mount `/api/v1/kpa-branch`. [controllers](../../apps/api-server/src/controllers/kpa-branch)·[services](../../apps/api-server/src/services/kpa-branch)·[entities](../../apps/api-server/src/routes/kpa-branch/entities) |
| 권한 guard | [kpa-branch-scope.middleware.ts](../../apps/api-server/src/middleware/kpa-branch-scope.middleware.ts). 클라이언트 메뉴는 안내이며 서버 권한 판정을 대체하지 않음 |
| 이미지/배포 | [Dockerfile](../../services/web-kpa-branch/Dockerfile), [deploy-web-services.yml](../../.github/workflows/deploy-web-services.yml)의 `deploy-kpa-branch`, [promote.yml](../../.github/workflows/promote.yml). 운영 서비스명 `kpa-branch-web` |

주소/역할 정본은 [주소별 서비스 의미](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md), [분회 역할 행렬](../baseline/KPA-BRANCH-ROLE-MATRIX-V1.md), [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) 순으로 확인한다. `kpa:*`/`kpa-society`와 `kpa-branch:*`/`kpa-branch`를 같은 권한으로 합치지 않는다.

## 3. 화면·업무 구현 현황

아래는 소스에서 확인한 화면/API의 존재다. 운영 실계정에서 각 업무가 정상 완료된다는 검증 결과가 아니다.

| 이용 영역 | 현재 구현 |
| --- | --- |
| 분회 찾기·가입 | `/`, `/login`, `/join`, `/me`; 분회 탐색·서비스 가입/상태·내 분회·전입/전출 이력 |
| 분회 공개 첫 화면 | `/:branchSlug`: 공지·다가오는 행사·자료. [BranchHomePage.tsx](../../services/web-kpa-branch/src/pages/BranchHomePage.tsx)는 공지/자료 각5개와 미래 행사 최대5개를 조회. 별도 소개 화면을 거치지 않음 |
| 공개 정보 | `notices`, `resources`, `officers`, `events`; 게시된 사이트 및 공개 범위의 공지/자료/임원/행사 |
| 회원 영역 | `meetings`, `mypage`, `mypage/annual-report`, `mypage/fees`, `mypage/education`, `mypage/events`; 회의 자료·신상신고·본인 회비/교육·행사 응답 |
| 분회 운영자 | `operator/site`, `posts`, `domains`, `annual-reports`, `fees`, `education`, `members`, `events`, `officers`; 사이트/게시/도메인·신상신고 검수/승인/동기화·회비·연수교육·회원 콘솔·행사·임원 명부 |
| 서비스 관리자 | `/service-admin`; 서비스 가입 심사·분회 개설 심사·분회 운영자 지정/해제·연도별 신상신고 양식 등. 실제 허용 범위는 router guard 확인 |
| 내 업무 공간 이동 | 기존 O4O 메인/My Home 이동 버튼. 프런트 role 판정으로 공개/회원/운영 메뉴를 나누고 모바일 메뉴는 접이식 구성 |

현재 첫 화면은 사이트/공지/자료 중 하나라도 실패하면 오류 상태가 된다. 행사 조회 실패는 빈 행사 배열로 처리되어 실제 행사0건과 구분되지 않는다. 이는 [BranchHomePage.tsx](../../services/web-kpa-branch/src/pages/BranchHomePage.tsx)에서 관측한 동작이며 이번 인계에서 고치지 않는다. 신규 개발자는 오류·빈 상태·권한 안내·직접 URL·PC/모바일을 기획과 함께 재평가한다.

## 4. 권한·데이터 경계

- 서비스 축: active `service_memberships('kpa-branch')`와 `role_assignments('kpa-branch:*')`를 확인한다. `member → operator → admin`의 허용 계층과 `platform:super_admin` 우회는 실제 guard가 기준이다.
- 분회 축: `branch_memberships`의 해당 사용자의 active 소속으로 분회를 제한한다. `kpa-branch:operator`는 다른 분회를 관리하지 못한다. 분회 축을 넘는 역할은 `kpa-branch:admin`과 `platform:super_admin`이다.
- tenant: `kpa_organizations`의 `type='group'`, `is_active=true`; URL slug 또는 활성 `branch_domains`의 Host를 organization ID로 해석한다. 조직 계층이 권한 자동 상속을 뜻하지 않는다.
- 소속 원장: 전출은 기존 가입을 `left`로 마감하고 전입은 새 행을 만드는 이력 구조다. 사용자당 active 소속 최대1개이며 소속 원장에 role 컬럼을 추가해 권한을 혼합하지 않는다.
- 약사 자격 원본은 `kpa_pharmacist_profiles`; 분회 소속의 회비구분/근무처와 별도다. `branch_officers`의 임원 명부도 접근 권한 부여와 별도다.

| 데이터 영역 | 주요 테이블 |
| --- | --- |
| 분회 식별·사이트·게시·도메인 | `kpa_organizations`, `branch_sites`, `branch_posts`, `branch_domains` |
| 소속·임원 | `branch_memberships`, `branch_officers` |
| 신상신고 | `annual_report_templates`, `annual_reports` |
| 회비·연수교육 | `branch_fee_policies`, `branch_fee_ledgers`, `branch_education_credit_ledgers` |
| 행사·응답 | `branch_events`, `branch_event_rsvps` |
| 공통 신원·가입·권한·자격 | `users`, `service_memberships`, `role_assignments`, `kpa_pharmacist_profiles` |

재정비 전에 개인정보/FK/연도별 제출 스냅샷·회비/교육 원장·소속 이력의 영향도를 다시 조사해야 한다. 같은 이름의 오래된 KPA 조직/회원 테이블이나 migration 파일을 삭제 근거로 삼지 않는다. 운영 DB 변경·DDL·기존 데이터 제거는 [AGENTS.md §5](../../AGENTS.md)의 별도 승인 경계를 따른다.

## 5. main·배포·검증을 구분한 현황

| 근거 | 확인한 결과 | 의미·한계 |
| --- | --- | --- |
| [Promote38190265457](https://github.com/Renagang21/o4o-platform/actions/runs/38190265457), [38192368264](https://github.com/Renagang21/o4o-platform/actions/runs/38192368264) | 전체 FAILURE, 분회 이미지 빌드 실패 | 공통 인증/정책 개편의 전체 배포 완료로 표시하면 안 됨. 다른 서비스의 배포 성공과 분회 실패를 구분 |
| [PR #497](https://github.com/Renagang21/o4o-platform/pull/497) | 2026-10-12 11:17(KST) main `899e871cc` 병합. 분회 약관 UI Docker 의존성 보완 | 별도 담당이 인계 지시 전 진행한 빌드 수정. 소스 병합이 운영 이미지/serving SHA 일치를 증명하지 않음 |
| 공개 주소 읽기 | 이 조사에서 `https://kpa.neture.co.kr/` HTTP200, SPA 문서 제목 확인 | 엔트리 응답만 확인. JavaScript 실행·현재 이미지 SHA·가입/권한/신고/회비 정상 동작 증거 아님 |
| 과거 분회 CHECK | [운영 배포 smoke](../checks/CHECK-O4O-KPA-BRANCH-DEPLOY-AND-RUNTIME-SMOKE-V1.md), [IA/내비게이션](../checks/CHECK-O4O-KPA-BRANCH-IA-AND-NAVIGATION-FINALIZATION-V1.md), [회원 업무 콘솔](../checks/CHECK-O4O-KPA-BRANCH-MEMBER-OPERATIONS-CONSOLE-V1.md) | 당시 결과. 과거 green을 최신 인증/정책 이미지의 검증으로 재사용하지 않음 |

최근 빌드/배포 조사 세부는 [인증 작업 CHECK](../checks/CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md)의 분회 후속 기록을 읽는다. 이 문서 작성 시 새 분회 Promote는 실행하지 않았고 최신 분회 serving SHA 검증은 미완료다. 인수 시 main/Actions/실제 serving 상태를 다시 비교해야 한다.

## 6. 신규 개발자가 재평가할 사항 — 이번에 개발하지 않음

1. 분회 회원·운영자의 실제 업무 흐름과 첫 화면/메뉴/모바일 구성부터 기획한다. 현재 UI를 그대로 유지해야 한다는 요구로 읽지 않는다.
2. 공통 Google/Kakao/이메일 인증과 명시적 연결·동의/정책 흐름을 분회 serviceKey·공용/자체 도메인에서 검증한다. `kpa:*` 세션을 분회 권한으로 오인하지 않는다.
3. 신상신고 파일 첨부는 [FieldRenderer.tsx](../../services/web-kpa-branch/src/pages/annual-report/FieldRenderer.tsx)의 `file` 분기에서 준비 중 안내만 제공한다. 수집 항목·저장/삭제/열람 범위를 확정한 뒤 별도 구현을 판단한다.
4. 홈페이지/행사 조회 실패와 실제 빈 결과, 미게시 분회와 존재하지 않는 분회, 회원/운영자403의 안내를 구분해 점검한다.
5. 공개 게시/임원 명부와 회원 회의자료·개인 신고/회비/교육·개인정보 노출 경계를 검증한다. 현재 데이터의 보유기간·계정 제거 정책은 [개인정보 보유기간 정본](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md)을 기준으로 한다.
6. 전면 정비의 기능/권한/API/schema/기존 자료 이전 범위를 새 WO로 확정한다. 기존 과거 WO를 포괄적인 새 개발·데이터 삭제 승인으로 사용하지 않는다.
7. 신규 개발자의 정비 작업을 시작하면 [SETUP.md](../../SETUP.md)의 설치/검증 절차와 현재 package/CI 정의로 환경을 준비한다. 프런트 검증 설정은 [vitest.config.mjs](../../services/web-kpa-branch/vitest.config.mjs), 서버 검증은 기존 scope/service/route 테스트다. 이 인계는 새 빌드·회원 실계정·데이터 변경 테스트를 수행하지 않았다.

## 7. 새 개발환경에서 비분회 작업 재개

환경 게시 여부를 확인하지 못한다는 UI 메시지는 게시 실패를 확정하는 증거가 아니다. 현재 연결된 클라우드는 설정/관측 버전41 일치·current=true·running·connected·failure 없음, 저장된 설치/시작 지침 존재·pending requirement0을 확인했다. 이것이 새 환경에서의 재현 성공을 뜻하지는 않는다. 사용자 화면 안내에 따라 환경 설정을 시작한 원래 채팅에서 게시 상태를 다시 확인한다. 이 인계에서 설정 재저장/재게시나 새 환경 생성은 실행하지 않았다.

새 환경은 저장소 main을 기준으로 다음을 이어간다. 현재 환경의 ignored/local 파일이나 실행 프로세스가 자동 이전된다고 가정하지 않는다. 이전 환경 삭제는 사용자가 지정한 별도 담당에게 맡긴다.

- [ ] 최신 main·AGENTS.md·SETUP.md와 [통합 WO](../work-orders/WO-O4O-FRONTEND-INTEGRATED-STABILIZATION-V1.md)를 읽고 TODO를 먼저 작성/보완한다. 이 문서의 조사 SHA를 새 환경의 최신 HEAD로 고정하지 않는다.
- [ ] 저장된 설치/시작 지침 또는 setup 스킬로 실제 설치·필요 서비스 시작·대표 검증을 수행한다. 게시 UI 상태와 설정 저장·현재 실행·새 환경 검증을 구분한다.
- [ ] 계정 제거는 개인정보 최소화·Operator 사용중지→Admin 완전 제거의 확정 정책을 따른다. 가입/수행자 이력 존재로 전체 계정 보존을 강제하는 안은 철회됐다. 두 삭제 API/개인 파일 처리·최소 법정 로그 분리의 구체 Core 변경 WO가 후속이며 실제 운영 계정 삭제로 테스트하지 않는다.
- [ ] 커뮤니티 이력 기본 달력1년(법정2년 대상2년)의 분류/예외/파기·처리방침 실제 게시 여부를 담당 기록과 맞춘다. 기간 확정은 자동 job/DB 집행 승인과 별도다.
- [ ] 분회 추가 개발·배포는 이 통합 작업에서 제외한다. 공통 수정의 분회 영향은 인수 담당과 범위 확정 전에 놓치지 않는다.
- [ ] 운영자 공급자/내 매장, 실제 외부 OAuth, My Home 실제 본인 데이터, 약국 회원 홈, 명시적 커뮤니티 공개/철회의 **사용자 실계정 테스트를 마지막**에 둔다. 아직 미실행이며 분회 실사용 검증은 신규 개발자 인수 범위로 분리한다.

문서 정합: 기존 통합 작업의 분회 관련 완료 표시는 당시 완료 기록이다. 이후 분회 추가 개발을 계속한다는 의미로 읽지 않는다. 현재 결정은 추가 개발 중단·신규 개발자 인계이며 서비스 폐기나 최신 운영 배포 완료로 표시하지 않는다.
