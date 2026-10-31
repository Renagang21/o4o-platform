# CHECK-O4O-SUBDOMAIN-HERO-COVERAGE-V1

> 명칭 정합(2026-10-31): 사용자 지시에 따라 협업체 표시명·기술 키·문서 링크를 현행 이름으로 정규화했다. 과거 검증·배포 기록은 당시 관측이며 새 도메인의 재검증을 뜻하지 않는다.

> **진행 현황 안내 (2026-10-30)**: 강의 Hero·운영 메뉴 보완은 2026-10-24 PR #793(`6a6d20e094`)으로 main에 반영됐다. 아래 「통합·배포 전」 중 통합 대기는 해소됐다. 이 기록만으로 #793 배포 완료를 판정하지 않으며, 실제 lecture operator의 운영 저장·게시와 배포 후 화면은 미검증으로 유지한다.
> 전체 경과와 남은 확인은 [디자인 정비 진행 현황](../guides/O4O-PUBLIC-DESIGN-PROGRESS-V1.md)을 참조한다. 아래 기존 본문·수치·실행일은 과거 회차 기록으로 보존한다.

- 작성일: 2026-10-24
- 상태: 구현·로컬 검증 완료, 통합·배포 전
- 기준: `0d0d878a19` 및 현재 작업 변경
- 요청: 서브도메인 Hero와 해당 서비스 운영자 관리의 누락 조사·도입
- 정책: [홈 탐색 정본 §2](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md), [서브도메인 의미](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md)

## 조사 결과

| 서비스 | 공개 표시 구현 | 운영 관리 | 판정 |
|---|---|---|---|
| 대표 홈 | O4OHomePage / neture | Neture 운영자 HomePresentationPage | 기존 연결 |
| supplier | SupplierServiceEntry / supplier | 해당 host 운영 메뉴 | 기존 연결 |
| funding | MarketTrialHubPage / funding | 해당 host 운영 메뉴 | 기존 연결 |
| community | CommunityHostHomePage / community | 해당 host 운영 메뉴 | 기존 연결 |
| CarePharm | CarePharmHomePage / carepharm | CarePharmOperatorLayout | 기존 연결 |
| pharmacy·drugstore | PharmacyMemberHomePage → BusinessHomeFeature | BusinessHomePresentationPage / 사업별 scope | 실제 게시 소식만 표시하는 현행 정책 유지 |
| kpa 분회 | BranchHomePage / branchSlug | 분회 SiteSettingsPage | 기존 연결 |
| pharmcoop·개별 협동조합 | web-pharmacy-coop App / pharmcoop·cooperativeSlug | 각 운영 공간 HomePresentationEditor | 기존 독자 디자인·조합별 범위 유지 |
| study | `/` → `/courses`, CoursesPage | lecture 운영 업무 메뉴 | 화면·메뉴 누락 수정 |
| store·account·admin | 매장 업무·계정·관리 화면 | 각 업무 공간 | 공개 서비스 홍보 Hero 추가 대상 아님 |
| Partner | 대표 홈의 준비 중 소개 | 출시 전 | 은퇴 기능·예약 도메인을 활성화하지 않음 |
| 병원약국 | `neture.co.kr/hospital` 업무 도구 | 기존 업무 흐름 | 독립 서브도메인 아님 |

위 판정은 소스 연결 조사다. 모든 운영 화면의 실제 계정 검증이나 모든 도메인의 배포 일치를 뜻하지 않는다.
공개 read-only HTTP 조회에서 study·supplier·funding·community·pharmacy·kpa 홈은 200이었다.
공개 presentation API의 neture·supplier·funding·community·lecture·carepharm·pharmcoop 응답은 성공이며 게시본은 null이었다. 기본 Hero와 운영자 게시본을 구분한다. 운영 DB는 변경하지 않았다.

## 변경

강의 목록 상단에 lecture 전용 그래픽·슬라이드와 게시 안내를 연결했다. 미게시 상태에서는 기존 STUDY_HERO 문구를 유지하며 게시 후에는 운영자 설정·게시 기간·노출 중지를 따른다. 강의 목록·검색·로그인 안내는 유지한다.
`/operator/home-presentation`과 업무 메뉴의 `Hero · 광고 관리`를 연결했다. 기존 AccessGate의 lecture operator/admin 경계와 서버의 lecture scope를 사용한다. 계정 변경 시 편집기를 재생성한다. API·권한·DB 계약은 변경하지 않았다.

## 검증·제한

- 공통 패키지 빌드 및 lecture-web TypeScript·Vite 빌드 통과.
- 강의 기존 테스트와 새 Hero 표시·게시 편집 테스트: 17개 파일·72개 항목 통과.
- Chromium 1440px·390px에서 lecture 그래픽·전체 폭 Hero·가로 넘침 없음·pageerror 없음 확인.
- 비로그인 운영 화면은 로그인 안내로 차단됨.
- 실제 lecture 운영자 계정의 운영 저장·게재 및 배포 후 화면은 미검증. 공유 운영 데이터 쓰기는 수행하지 않음.
- 기존 canonical 문서의 Hero 정책 변경 없음. 발견한 연결 누락만 수정.
