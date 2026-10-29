# WO-O4O-UNIFIED-OPERATIONS-WORKSPACE-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-28 (Asia/Seoul)
> **기준**: main `872cbc73fdcdc261dc77c6ccf0f2e5ffd4a87c9d`, [운영 책임 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md)
> **범위**: 사용자 요청에 따른 통합 운영 UI·UX, 전체 회원 표준 목록, 알림, 직영 운영 메뉴 통합, 메뉴별 업무 위임. 하나의 TODO·작업 브랜치에서 진행한다.

## 전체 TODO

- [x] 직영 서비스의 현행 운영 메뉴·화면·API·가드 및 실제 업무 주체를 전수 대조한다. 강사 신청·강의 개설, 포럼 개설, 펀딩 개설 등 누락 업무를 기록한다.
- [x] 표준 DataTable·ActionBar·탭·상세 drawer·일괄 처리 결과 UI의 기존 사용처를 조사하고 재사용한다.
- [x] Admin과 Operator의 공통 운영 업무공간을 제공하고 관리자 홈·사이드바에서 명확히 진입하게 한다.
- [x] 모든 회원을 공통 계정 기준으로 조회하되 계정·자격·사업 참여·조직 상태를 구분하고 권한에 맞춰 개인정보를 제한한다.
- [x] 자격 검토를 전체·상태별 탭, 검색, 표준 체크 선택 테이블과 상단 후속 작업 UI로 정비한다. 면허 근거 확인·사유·본인 승인 금지·동시성 보호를 유지한다.
- [x] 알림·검토 대기·처리 결과·재조회 오류·빈 상태를 분명히 표시하고 업무 상세 이동 및 처리 후 갱신을 연결한다.
- [x] Admin이 기존 초대·수락·위임 구조로 Operator를 지정하고 메뉴별 업무를 설정·회수하게 한다. 새 전역 Operator 역할을 만들지 않는다.
- [x] 메뉴 노출·직접 URL·실제 업무 API에서 동일한 위임 범위를 검사한다. 만료·회수·자기 권한 확대·타 서비스·독립 조직 접근을 검증한다.
- [x] 직영 운영 메뉴의 실제 기능을 기존 API·화면·공유 모듈을 우선 재사용하여 중앙에 연결한다. 외부 링크만으로 통합 완료 처리하지 않는다.
- [x] 일반 회원·개별 사업자 자기 업무 및 독립 협업체의 자체 운영·데이터 격리를 유지한다.
- [ ] 관련 테스트·typecheck·빌드·desktop/mobile 브라우저 검증, 문서 정합, 리뷰 및 CI 보완을 완료한다.


## 정책·실행 경계

사소한 구현 선택·조사·수정·검증은 추가 승인 없이 진행한다. 새로운 사업 책임 변경과 미승인 운영 변경만 별도 판단 대상으로 둔다. 기존 인증·회원·조직·역할·초대·감사 구조를 우선 재사용한다. 공통 상품 DB 중요 권한은 기존 전체 관리자 경계를 유지한다. MegaPharm·CarePharm·독립 조합/분회 내부 운영과 개인·매장·공급자의 자기 업무는 중앙 직영 운영과 혼동하지 않는다. 퇴역 서비스를 복원하지 않는다.

실제 Google 로그인·자격 승인은 사용자 수동 검증과 합성 테스트를 구분한다. SonarCloud 잔여 분석은 기존 조사 브랜치에서 보존하며 완료로 간주하지 않는다. 이번 작업은 기존 신청·승인 정책을 느슨하게 만들거나 운영 데이터에 가짜 승인을 넣지 않는다.

## 재사용 근거

- `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx`: `@o4o/operator-ux-core`의 `DataTable`, 체크 선택, `@o4o/ui`의 `ActionBar`, 상세 drawer·일괄 결과 패턴.
- `packages/operator-ux-core/src/sidebar/operatorDomainIA.ts`: 서비스 운영·사업 운영·운영 관리 분류. 메뉴 표시 메타데이터와 API 권한이 별개임을 명시한다.
- 기존 `/operations`는 회원 목록 중심의 진입과 제한된 업무 화면만 제공한다. 강의 강사·수료 운영 등 기존 서브도메인의 전체 운영 업무를 아직 포괄하지 않는다.
- `operator-inbox`의 기존 업무 대기 집계, 알림 및 문의 원장을 우선 활용한다. 이메일 알림 설정 API와 업무 알림 자체를 혼동하지 않는다.

## 진행 중 검증과 잔여 범위

- 실제 기존 화면에서 강의 43건, 펀딩 46건, 공급자 39건, 커뮤니티 48건의 회귀를 확인했다. 목록뿐 아니라 상세·증빙·복구·명령 lifecycle을 공유 모듈로 옮기고 원래 호스트는 transport adapter로 유지한다.
- 공통 회원 directory/자격 목록은 별도 권한이며, 자격 검토 화면에서만 면허와 개인별 심사 명령을 제공한다. 신청/결정 알림은 기존 notifications 원장에 transaction으로 저장하고 선택 메뉴로 수신 범위를 제한한다. 실제 메일을 검증용으로 발송하지 않는다.
- 기존 역할·membership 가드 회귀 85건 PASS, 격리 PostgreSQL의 메뉴 제한/회수/동시 수정·자격 규칙과 route 검증을 진행했다. 초대 수락의 메뉴 이전·신규 표준 directory·native transport·실제 권한 조합 검증은 후속 확인 대상이다.
- 새 migration은 기존 baseline부터 모든 prefix와 신규 down/up을 격리 DB로 검증한다. 최종 설정 테이블에는 부모 할당/초대 외에 별도 사용자 attribution을 복제하지 않는다. 현행 erasure writer fence를 재사용한다.
- Neture의 일반 회원/기존 서비스 가입/상품/주문/매장/콘텐츠/분석 등 남은 원본 화면 연결, 기능 대조 표의 각 행 완료 판정, API 권한별 교차 검증, 모든 공유 소비처의 빌드 및 desktop/mobile 검증이 남아 있다. API·메뉴 등록만으로 전체 완료라고 보고하지 않는다.
- 실제 Google round-trip/사람의 면허 근거 확인·승인은 합성 테스트와 구분한다. 이전 SonarCloud 잔여 사항도 완료로 처리하지 않는다.

## 2026-10-29 추가 지시 및 검증

사용자가 이 작업을 계속하여 main 병합·배포까지 진행하도록 범위를 확장했다. 기존 하나의 TODO/브랜치를 유지하며 required CI·리뷰·직접 URL/API 검증 후 통합한다. 실제 운영 계정 삭제나 가짜 자격 승인은 수행하지 않는다.

- 공통 계정 directory와 Neture 서비스 membership의 관리 업무를 구분했다. 서비스 가입 승인, 이용 정지·복구·탈퇴와 개인별 상세는 기존 `ServiceMembersWorkspace` 및 원래 membership API를 재사용한다. 일반 계정 조회 권한만으로 서비스 membership을 변경하지 못한다.
- native 화면 registry·메뉴 catalog·실제 내비게이션을 교차 검증한다. 검토 당시 69개 메뉴 연결을 확인했으며 서비스 membership 업무 추가 후 모집단을 재검증한다. 이는 사업 책임 대조표/실제 OAuth 검증을 대신하지 않는다.
- 관리자 UI 33건, 중앙 접근·자격·기존 서비스 가드/API 회귀 119건, Partner 실제 PostgreSQL 회귀 33건 PASS. 초대/삭제 연동 49건 PASS 후 이메일 전용 초대 설정 삭제 회귀를 추가하여 재검증 중이다. 범위·시점이 다른 테스트 수를 단순 합산해 전체 테스트 수라고 표기하지 않는다.
- Admin, Neture, Lecture, Store, PharmacyBusiness, Partner, PharmacyCoop production build PASS. desktop 1440px/mobile 390px에서 공통 회원 체크 선택·상단 후속 작업과 자격 화면 직접 진입을 합성 API 응답으로 확인했다. 실제 Google 로그인을 수행한 결과가 아니다. 실행 artifact는 작업공간 외부 `artifacts/unified-operations-workspace`에 두고 개인정보/credential을 커밋하지 않는다.

### 메뉴 위임 계정 삭제 연동

추가된 메뉴 설정은 직접 user FK가 없으므로, 삭제 절차의 명시적 소유 판별에 부모 role assignment 또는 초대의 수신/수락 계정을 반영한다. 설정 ID도 삭제 reference key에 포함하고, 부모의 삭제/초대 익명화 전에 본인 설정만 제거한다. 초대한 사람이라는 이유로 다른 사람의 설정을 제거하지 않는다.

위임 수락/메뉴 변경의 **형식이 확인된 두 감사 이벤트**만 처리한다. 삭제 대상의 UUID와 자유 입력 사유는 최소화하고, 기존 action/time/service/권한 범위 및 가명 attribution을 기존 감사기록 보유기간 안에서 유지한다. 생성 시각이나 보존기간을 초기화하지 않는다. 임의 로그/추가 필드/다른 계정에 복사된 식별자에 대한 기존 `review_required`는 유지한다. 새 삭제 테이블·전역 삭제 허용·운영 backfill은 도입하지 않았다.

최종 문서 대조표, main 통합 후 회귀, CI·리뷰, 배포 및 운영 read-only 확인 결과는 완료 전에 기록한다.

### CI 상시 검증

격리 PostgreSQL 서비스에서 canonical schema의 모든 incremental prefix를 확인한 뒤 초대·메뉴 위임·계정 제거 통합 suite를 실행하는 CI job을 추가했다. `CI Gate`의 필수 upstream으로 연결하여 opt-in DB 테스트가 기본 suite에서 skip되는 것만으로 완료 판정하지 않는다. DB는 runner의 disposable 서비스이며 외부 메일·운영 credential을 사용하지 않는다. 로컬에서 취소된 실행 권한 요청 때문에 미실행한 추가 회귀는 CI 결과로 확인하며 PASS로 미리 기록하지 않는다.

### 현재 작업 상태 (2026-10-29)

- 구현 커밋 `3dd137433a`, 최신 main의 커뮤니티 정비 통합 커밋 `2f5fc0fcd8`. main에서 제거한 공개 community API를 공유 모듈에서 복원하지 않도록 충돌을 해소했다.
- 후속 보완: 위임 감사기록의 두 당사자를 차례로 제거하는 경우, 미분류 감사 payload 보호, 이메일만 지정한 초대의 메뉴 설정 정리, 잘못된 메뉴 설정 대상 UUID 입력 검증. 추가 PostgreSQL 회귀는 실행 권한 요청 취소로 미완료이며 이전 49건 PASS와 구분한다.
- 현재 관리자 UI 34건 PASS, API/Admin typecheck PASS, frozen lockfile의 offline 검증 PASS. 해당 검증에 실패했다고 적힌 로컬 기록 중 `spawnSync git EPERM`은 샌드박스 실행 제한이며 코드 PASS로 바꾸어 기록하지 않는다.
- GitHub push/PR 게시 시도는 네트워크 차단으로 실패했고 추가 네트워크 권한도 허용되지 않았다. 원격 CI·리뷰·main 병합·운영 migration·배포는 아직 수행하지 않았다. 기능 대조표 전체의 최종 판정도 남아 있으므로 병합 준비 완료라고 하지 않는다.


### 재개 검증 및 누락 업무 보완 (2026-10-29)

- 환경 정비 후 원래 작업을 재개했다. `origin/main`의 CarePharm·커뮤니티·PC 연결 정비를 같은 작업 브랜치에 통합했다. 다른 작업공간이나 운영 데이터는 변경하지 않았다.
- 작업 브랜치를 원격에 보존하고 PR #878을 draft로 생성했다. 이전의 네트워크 차단 기록은 당시 상태이며 현재 PR·CI 조회는 가능하다.
- 최신 소스 1,324개에서 관리 경로 165개·메뉴/탭 선언 14곳을 대조하고, 직영 native 메뉴 72개와 독립 사업·전체 관리자·자기 업무·별칭의 판정을 기능 IR에 추가했다. 과거 모집단 표는 변경하지 않았다.
- 기존 Admin의 서비스 상품 승인·철회와 서비스 가입 관계 정리가 일반 상품 승인·서비스 탈퇴와 다른 업무임을 확인해 누락된 화면을 연결했다. 두 메뉴는 기존 `neture:admin`/전체 관리자 보호를 유지하며 일반 Operator에게 위임할 수 없다. 공통 계정이나 타 서비스 관계를 삭제하는 기능으로 확장하지 않았다.
- 삭제 연동의 실제 실패는 다른 수락자의 역할에 남은 `assigned_by` attribution이었다. 해당 필드만 기존 `ON DELETE SET NULL` FK의 처리 대상으로 구분하고 역할·메뉴 설정·감사 생성시각은 유지했다. 다른 필드에 복사된 식별자는 여전히 검토 대상으로 검증했다. 초대/삭제 PostgreSQL 52건 PASS.
- 공유 화면 추출 이후 원래 호스트 테스트도 실제 Provider·API adapter로 실행하도록 정비했다. Neture 전체 UI 1,464건, 강의 전체 UI 83건, 공유 운영 UI 217건, 중앙 Admin UI 34건, 접근/자격 PostgreSQL 26건 PASS를 확인했다. 이후 추가된 Admin 업무/인가 보완은 별도 추가 검증과 최종 CI 대상이다. 서로 다른 시점의 수치를 전체 총합으로 합산하지 않는다.
- desktop 1440px/mobile 390px에서 공통 회원 선택·상단 작업·자격 검토·위임 메뉴 제한·위임 없는 직접 URL 차단 8개 브라우저 시나리오 PASS. 합성 API 응답만 사용했고 실제 Google OAuth·면허 승인이나 운영 삭제는 수행하지 않았다.
- CI 첫 실행에서 API mock의 역할 provenance 부재와 공유 모듈 이동 전 경로를 고정한 정적 계약, 강의 전용 의존성을 가정한 배포 영향도 테스트가 실패했다. 실제 API 가드를 완화하지 않고 합성 fixture를 구체화하고 계약 검증 대상을 공유 구현으로 옮겼다. await 가능한 guard가 추가 위임 조회까지 완료하도록 연결했다. 수정 후 회귀와 최신 HEAD CI를 재검증한다.
- 현재 남은 gate: 최신 변경의 UI/API/typecheck·CI·리뷰, 배포 범위와 migration 실행 승인 경계, main 통합·운영 배포·서빙 SHA 검증. 운영 migration·배포 완료로 기록하지 않는다.

- 추가 검증: Admin 승인·철회 실패 후 사유 보존/재시도 2건, 원래 호스트의 가입 관계 정리 2건 PASS. 두 Admin 업무는 별도 메뉴이며 Operator 발급 차단·업무 간 분리의 실제 PostgreSQL 회귀를 포함한 접근 suite 27건 PASS. Admin 최신 typecheck·production build와 문서 민감정보 검사 PASS.
- 실제 CI 실패 14개 suite를 재현해 fixture의 비중앙 역할 조회와 shared 구현 경로 검증을 정비했다. 재현 suite 중 11개는 첫 보완에서 통과했고 남은 4개 재검증 83건도 PASS(중복 범위 포함). 배포 영향도 회귀 83건 PASS. 최신 원격 CI 결과는 아직 대기다.
- SonarCloud는 첫 HEAD에서 새 코드 Security C/Reliability D를 보고했다. GitHub annotations를 수집했으며 SonarCloud 상세 API는 HTTP 403으로 직접 확인하지 못했다. 필수 CI와 구별하여 추적하고 분석 완료로 표기하지 않는다.

- 관리자 전체 회귀를 실행하여 50개 파일 554건 PASS를 확인했다. 중앙 진입이 추가된 메뉴/route 계약, Operator 기본 표시 및 초대의 메뉴 범위를 현재 정책으로 검증했다. App의 layout/404 catch-all은 퇴역 화면의 실제 존재 근거로 계산하지 않는다.
- 브라우저 검증을 PC/mobile의 전체 72개 업무 링크 노출까지 확장하여 합성 시나리오 10건 PASS. 실제 Google 로그인을 대신하지 않는다.
- Sonar 진단은 CI에서 공개 API를 읽고 코드 지적 필드만 artifact에 남긴다. 인증키를 추가하지 않고 author/contact를 제외하며 기존 Quality Gate나 문제 상태를 변경하지 않는다. 조회 실패는 unavailable로 기록한다. 운영 환경 변경과 무관하다.

- 수동 삭제 코드 검토에서 형식 검증 대상 `scope`에 임의 객체가 들어갈 수 있는 경우를 발견했다. 알려진 `o4o-direct` 값 또는 필드 부재만 허용하여, 자유 형식 scope 안의 식별정보는 자동 최소화 대상에서 제외하고 기존 review_required로 남긴다. 회귀를 추가한 초대/삭제 PostgreSQL 53건 PASS.

- 자동 Codex 리뷰 P1(query로 중앙 메뉴 검사 우회)·P2(공급자 상태 관리의 진행 펀딩 읽기 누락)를 보완했다. 데이터 조회 범위와 인가를 구별하여 요청 query/빈 조회 scope가 DB의 중앙 위임 검사를 제거하지 못하게 했다. 공급자의 진행 펀딩 GET만 신청 심사·상태 관리 중 하나의 위임으로 허용하고 승인 명령은 공유하지 않는다. 실제 격리 PostgreSQL HTTP 회귀와 API 분류 39건(접근 29 + 분류 10) PASS.

- Sonar 공개 API 진단을 GitHub CI에서 수집하여 Security/Reliability 지적 22건을 확인했다. 정렬 비교 함수를 명시하고, 비동기 조회의 처리 의도를 분명히 하며, 목록/모달의 키보드 진입·닫기를 보완했다. 공급자 품목군 조회 실패는 빈 목록으로 숨기지 않고 재조회할 수 있고 이전 공급자의 늦은 응답은 무시한다. 조사 도구는 외부 명령/PATH 의존을 제거하고 출력 위치를 `.tmp/central-operation-census/surfaces.json`로 고정하여 임의 경로 인자를 거부한다. 진단 로그는 고정 문구만 출력하고 상세는 artifact에 둔다. 검사 기준·문제 상태를 낮추거나 예외 처리하지 않았다. 최종 Sonar 재분석 결과는 대기다.
- 보완 후 공유 운영 UI 221건, 원래 Neture 운영/Admin 화면 237건, 중앙 UI 34건, 접근 PostgreSQL 29건 PASS. PC/mobile 브라우저를 펀딩 키보드 상세 진입까지 12개 합성 시나리오로 확장해 PASS를 확인했다. 조사 도구의 고정 출력과 임의 경로 거부를 실제 실행으로 검증했으며 모집단 1,324개 소스/165개 route/14개 메뉴·탭이 유지됐다.
