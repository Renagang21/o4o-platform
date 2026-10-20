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
