# 서비스·협동조합 Hero 운영 정비 검증

- 작성일: 2026-10-20
- 상태: 구현·로컬 검증 완료 · 개발 branch 개발 branch 인계
- TODO: [TODO-O4O-SERVICE-HERO-OPERATOR-COMPLETION-V1](../work-orders/TODO-O4O-SERVICE-HERO-OPERATOR-COMPLETION-V1.md)
- branch: `wo/service-hero-operator-completion`, 시작 main `0b9821122a`

## 조사 → TODO 보완 → 구현

서비스 Hero의 메뉴·관리 route·저장 API·공개 소비·역할 경계를 조사했다. 기존 운영 메뉴가 있는 서비스는 유지하고 Pharmcoop 연합회/개별 조합 누락을 보완했다. 기존 사업 API의 Neture scope를 개별 조합에 적용하면 Neture 역할이 없는 조합 operator를 차단하므로 기존 cooperative_roles 정책을 별도로 적용했다. 연합회 역할만으로 개별 조합 Hero를 편집할 수 없다.

기존 CMS 예약 metadata 저장·revision 충돌·초안/공개·일정·URL 검증을 재사용한다. 공통 HomeSurface 두 개와 조합 slug 인자를 추가하되 기존 서비스/사업/분회 path는 유지한다. Pharmacy/MegaPharm은 공개 게시된 기존 사업 Hero만 상단에 한 번 표시하고, 미게시·숨김·통신 실패 때 간결한 기존 제목을 유지한다. 옛 대표 홈 Hero 편집 탭은 현행 화면 링크로 정리했다. 데이터를 삭제하거나 자동 이전하지 않았다.

## 실행한 검증

실행 집합이 겹치는 항목은 합산하지 않는다.

| 범위 | 결과 |
|---|---|
| API 홈 route·기존 조합 관리 route | 27 PASS (24 + 3), 기존 별도 조합 PG suite 20개는 기본 실행에서 skip |
| CMS 실제 PostgreSQL | 17 PASS: scope 분리·비공개 초안·revision·동시 최초 저장·예약·숨김·권한 callback 거절 시 변경 없음 |
| 조합 Hero 실제 PostgreSQL + HTTP + 실제 역할 정책 | 5 PASS: Neture 역할 없는 local operator 허용, 다른 조합/연합회 거부, 연합회 operator 구분, 회수·비활성 즉시 차단, 공개/초안, body scope 위조 무시 |
| 협동조합 웹 전체 | 52 PASS: 메뉴·화면·공개 저장·연합회/다른 조합 경계 포함 |
| 공통 shared-space-ui 전체 | 129 PASS: 신규 surface 기본값과 기존 Hero/편집 회귀 포함 |
| Pharmacy 사업 화면 | 75 PASS: 상단 h1·하단 광고 분리, 미게시 fallback 포함 |
| Neture 관련 7 suites | 96 PASS: 대표 홈·CarePharm·운영 메뉴·기존 Hero 편집 |
| 강의 / 분회 전체 | 각각 41 / 39 PASS |
| API 타입 검사 및 tsup | PASS |
| 운영 웹 빌드 | Pharmcoop·KPA·Neture·강의·분회 PASS |
| root lint ratchet | 기존 46 errors 기준선 PASS, warnings 979. 기준·rule 변경 없음 |
| Chromium 운영 번들 PC 1440 / 모바일 390 | 8종 × 2 = 16 PASS. 연합회/조합 공개·수정, 실패 입력 보존·재시도·공개 소비, 다른 조합·연합회 우회 차단, Pharmacy/MegaPharm 게시 Hero. 가로 넘침 0·pageerror 0, 모바일 편집 화면 시각 확인 |

브라우저는 격리된 합성 인증·API fixture다. 실패 보존 확인을 위한 첫 PUT 503은 의도된 응답이다. 외부 자산은 로컬 fixture에서 처리하며 실제 운영 API·계정·조합·가입·역할을 변경하지 않았다. 테스트 코드/브라우저 helper를 제품 인증 경로에 추가하지 않았다. 실제 운영 로그인·권한 부여·새 Hero 게시·배포는 미실행이다.

## 통합 담당 인계

개발 종료점은 commit/push다. PR·CI/리뷰 운영·main 병합·배포는 통합 담당이 진행한다. schema/migration·dependency/lockfile·workflow·IAM 변경은 없다. Pharmcoop은 일반 웹 registry와 별도 배포 경로이므로 API 및 각 웹 배포 뒤 연합회/실제 조합 operator 계정으로 자기 범위 Hero의 초안·게시·숨김·공개 소비를 검증한다. 기존 Hero 데이터는 자동 이관/삭제하지 않는다.

문서 정합: 사용자 지시와 현재 경로는 이번 TODO/CHECK에 기록했다. 기존 WO/과거 기록·canonical index는 소급 변경하지 않았다.


## 정리·인계 상태

- 격리 PostgreSQL 테스트 schema 잔존 0개 확인 후 이번 전용 DB를 DROP하고 이번에 시작한 서버를 중지했다. 운영 DB 요청 없음.
- unsafe route guard: 1,285개 파일 검사, 위반 0개. 문서 민감정보 검사 0건, git diff --check PASS.
- push 전 origin/main `6b1a168fbc`의 다른 작업 진행을 확인했다. 이번 변경 파일과 직접 겹침은 없다. 개발 branch를 임의 merge/rebase하지 않았으며 통합 담당이 최신 main CI를 확인한다.


## main 통합·배포 착수 — 2026-10-20

사용자가 main 병합·배포를 명시했다. PR·기술 gate·배포 검증을 수행하는 통합 단계다. 확인한 main `5b2f6bd9ee`에는 #730 협동조합 회원 기능과 #732 Hero 시각 구분이 추가돼 편집기·사업 홈·협동조합 App 세 곳에서 충돌했다. main 기능을 보존해 통합했고, 신규 두 surface의 Hero 디자인 정보/장식과 조합 slug 편집 경로를 함께 유지했다. MegaPharm businessKey의 시각 구분도 상단 Hero에 전달한다. 새 schema·migration·의존성 변경 없음.

통합 검증: 공통 UI 142개, 협동조합 전체 62개, API/기존 조합 route 28개, Neture/CarePharm 52개 PASS. 약국 사업 75개 실행에서 두 건이 병렬 빌드 중 findBy 기본 대기 안에 완료되지 않았으며, 해당 파일 단독 재실행 22개가 모두 PASS했다. 나머지 53개는 최초 실행에서 PASS했다. 기존 실패를 숨기거나 timeout/assertion을 완화하지 않았다. 통합 소비처 빌드·브라우저 재검증 결과를 이어 기록한다.

현재 실행 환경 revision 10에는 사용자 지정 네트워크 허용 목록이 비어 있고 GitHub REST/GraphQL 요청이 모두 HTTP 403으로 거부된다. native Git fetch는 성공했다. GitHub API와 운영 확인에 필요한 정확한 도메인을 환경 설정 초안에 저장했다. 초안 저장은 적용/게시를 뜻하지 않는다. 실행 환경에서 GitHub API 접근이 확인되기 전에는 PR 상태·CI·병합·배포 성공을 주장하지 않는다. 토큰 추출·다른 경로를 통한 네트워크 우회·CI 우회는 하지 않는다.


통합 코드의 공통 패키지 빌드, API 타입/tsup, Pharmcoop·KPA·Neture 운영 빌드 PASS. KPA 충돌 해소 중 광고 컴포넌트에 불필요한 businessKey prop이 전달된 타입 오류를 수정한 뒤 재빌드를 통과했다. 디자인 값은 Hero에만 전달한다. 대상 ESLint 오류/경고 0, 문서 검사와 diff check PASS. 최종 Chromium 운영 번들 PC 1440·모바일 390에서 연합회/조합 12개와 Pharmacy/MegaPharm 4개, 총 16개를 다시 통과했다. 의도한 첫 PUT 503 후 입력 보존·재시도·공개 소비, 다른 조합과 연합회 우회 차단, 가로 넘침/pageerror 0을 확인했다. 모바일 편집 화면도 시각 확인했다.

GitHub API 차단은 실제 프록시 CONNECT 단계 403으로 확인했다. 이번 통합 단계에서 main 병합·원격 CI/리뷰·운영 배포는 미실행이다. native Git으로 검증된 통합 branch를 추가 push해 보존하고, 허용 설정이 실행 환경에 반영되면 PR·기술 gate 확인부터 재개한다. WORKTREE_DISPOSITION은 KEEP(통합/배포 미완료)이다.
