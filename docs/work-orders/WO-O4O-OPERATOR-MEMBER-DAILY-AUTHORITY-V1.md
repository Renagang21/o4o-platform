# 서비스 operator의 일상 회원관리 권한 정비

> 상태: ACTIVE · 2026-10-12 사용자 작업 지시
> 기준: main `c9b630feb` · 작업 branch `wo/operator-member-daily-authority`

## 확정 범위

전체 관리자(admin.neture.co.kr)는 서비스 admin/operator를 지정·회수한다. 서비스에서 operator 추가가 필요하면 오프라인으로 요청한다. 서비스 operator는 담당 서비스의 조회·승인·반려·사용중지·복구·일반 회원 역할 변경을 담당한다. 전체 계정 완전 제거와 민감한 삭제는 admin 업무이며 이번에 operator에게 열지 않는다. 운영자 지정 전후 가입 방식은 후속 조사 대상이고 자동 가입을 금지하거나 별도 가입을 강제하지 않는다.

## 조사 및 보완 TODO

- [x] 최신 main·회원관리 API·공유 화면·서비스 wrapper·권한 테스트 대조.
- [x] 최신 #505 계정 제거 작업 확인: Core 구현은 기본 비활성이고 이 작업에서 재구현/활성화하지 않음.
- [x] API 일상 업무와 삭제 권한 분리. 실제 활성 operator service scope만 사용.
- [x] 일반 역할 변경은 카탈로그의 서비스와 선택 서비스·대상 가입을 대조. 서비스 admin/operator 부여·회수는 전체 관리자 전용 유지.
- [x] Neture/KPA 목록·일괄 처리·편집·상세 및 Lecture/Community/Supplier/Funding 공통 wrapper 정비.
- [x] 삭제 슬롯·일괄 탈퇴와 일상 사용중지·복구 분리. 미변경 소비처는 기존 동작 유지.
- [x] API/공유 UI/웹 회귀·타입/빌드·PC/모바일 fixture 검증.
- [ ] PR·필수 CI·리뷰·main 통합·필요한 배포 검증. 운영 DB write·실제 계정 삭제 테스트 없음.

## Shared Module Change Verification

| 소비처 | 영향 및 경계 | 검증 |
|---|---|---|
| Neture | 회원 목록·일괄 사용중지/복구·일반 역할·상세. 삭제는 admin | 웹 회귀·빌드 |
| KPA-Society | 회원 목록·일괄 처리·회원 유형 편집·상세. kpa prefix 유지 | 웹 회귀·빌드 |
| Lecture/Community/Supplier/Funding | ServiceMembersWorkspace 목록·상세 재사용 | 공유 fixture·서비스 빌드 |
| 전체 관리자 | 공통 UserDetailPage 신규 일상권한 prop은 기본 isAdmin; 지정/회수 API는 불변 | 공통 UI·중앙 역할 회귀 |
| 분회/개별 커뮤니티/사업 담당 | 별도 원장·guard는 이번 범위 밖. 서비스 membership 권한과 혼합하지 않음 | 소비처 조사 |
| PH/KCos | 퇴역 기능 복구/신규 역할 부여 없음. 기존 공통 prop 기본값 유지 | source census |
| Store/My Home/Forum | 직접 회원관리 컴포넌트 변경 없음. 계정/사업/개체 원장 불변 | source census |

## 구현 전 확인한 차이

memberManagementPolicy는 정지·복구·membershipRole·역할 부여를 서비스 admin으로 제한했다. shared console의 canManageLifecycle은 삭제 노출까지 결합했고 상세 화면 isAdmin도 일상 작업과 삭제를 같이 제어했다. API의 일반 역할 변경은 선택 서비스뿐 아니라 해석된 카탈로그 서비스 및 해당 대상 가입을 확인해야 한다. 기존 서비스 admin/operator tier 제한·자기 역할 회수 보호·Demo 보호는 유지한다.

## 문서 정합

기존 상위 roadmap의 admin 전용 정지/복구 설명은 이번 사용자 정정과 다르다. 과거 실행 기록을 소급 변경하지 않고 본 WO와 현행 회원관리 표준에서 일상 업무 분담을 설명한다. 앞선 용어 문서 정비는 별도 `wo/admin-terminology`에 보존돼 있으며 이 작업으로 그 변경을 덮어쓰지 않는다.


## 로컬 검증 및 외부 제약

- 공유 operator-core-ui: 6 files / 50 tests PASS. 일반 operator의 승인·사용중지와 삭제 미노출, 관련 공유 소비처 회귀.
- 공유 ui: 2 files / 21 tests PASS. 신규 canManageMembers로 상세 일상 업무를 열고 삭제를 분리; 서비스별 역할 목록·operator 역할 옵션 제외 검증.
- Neture: 71 files / 605 tests PASS. KPA-Society: 16 files / 132 tests PASS.
- API 권한/서비스 경계/운영 역할 회수 집중 회귀: 3 suites / 93 tests PASS.
- 공통 패키지·API TypeScript·Neture/KPA/Lecture의 타입 포함 production build PASS. lockfile/dependency/schema/migration 변경 없음.
- Chromium 공유 회원관리 fixture: 1440/390px에서 lecture operator + 타 서비스 admin으로 사용중지/복구 요청 및 serviceKey 유지 PASS; pageerror 0. 실제 서비스 앱 로그인·운영 데이터 검증을 대신하지 않는다.
- 변경 파일 ESLint, docs 민감정보 검사, git diff --check PASS.
- GitHub HTTPS Git fetch는 정상. GitHub API rulesets 요청은 현재 proxy에서 Forbidden이므로 PR 생성·원격 필수 CI/review·main 통합·배포 상태 확인은 차단. API 접근 실패를 Git 읽기/쓰기 인증 실패로 간주하지 않는다. 필요한 연결이 확보되면 PR gate부터 이어간다.
- 새 완전 제거 Core 기능의 운영 활성화와 실제 계정/파일 삭제는 이 작업 범위 밖이다.
