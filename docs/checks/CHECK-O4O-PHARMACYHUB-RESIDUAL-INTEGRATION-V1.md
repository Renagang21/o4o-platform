# PharmacyHub 잔여 guard 통합 검증

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **연결 작업**: [퇴역 TODO](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md), PR #609

## 통합 범위

최신 main의 별도 통합 branch에서 원본 #609를 읽고 두 리뷰 결함을 보완했다. 퇴역 전용 조직의 생존 근거는 Neture 약국 가입 중 active 상태로 제한한다. pending/rejected/suspended/terminated 가입만으로 PH 전용 조직을 다시 노출하지 않는다. 기존 활성 Neture 가입·다른 서비스 활성 enrollment/slug와 다른 조직은 보존한다.

CMS slot 수정은 contentId가 바뀔 때뿐 아니라 serviceKey 단독 변경과 동일 contentId 재전송에서도 결과 콘텐츠/서비스 쌍을 검증한다. KPA 콘텐츠의 Neture 배치는400, 저장된 퇴역 콘텐츠 재배치는410으로 저장 전에 거절한다. 기존 alias와 platform 콘텐츠의 서비스 slot 배치는 유지한다. Core 계약·API payload·role 부여·DB schema·의존성은 변경하지 않았다.

## 실행 증거

- 원본 #609 CI38672805485 SUCCESS. 아래 보완 commit의 CI 결과로 대체하지 않는다.
- 실제 격리 PostgreSQL15 SQL 경계9건 PASS. 비활성 Neture 가입4종, active 가입·서비스 enrollment·slug 보존, 다른 조직과 PH 이력 없는 조직을 검증했다. 전용 fixture URL을 명시해야 실행되며 loopback/전용 DB명을 검증한다. 운영/공유 DB에 연결하지 않는다.
- CMS slot·콘텐츠 mutation·PH residual focused API3 suites/51건 PASS. 초기에 테스트의 platform admin 원장 mock이 false라500이 발생했고 원장 mock을 실제 가정에 맞춰 수정 후 재실행했다. production 인가 코드를 완화하지 않았다.
- 변경4개 TS파일 ESLint 오류0, 기존 slot handler 미사용 변수 warning1 유지. diff whitespace PASS.
- API 타입/build와 기타 소비처 검증 및 최신 통합CI/리뷰는 진행 중이다. main 통합·배포 완료를 주장하지 않는다.

## 실제 삭제와 분리

사용자는 PH 데이터가 테스트용이며 PH/전용 인프라를 재사용하지 않는다고 확인했다. 실제 삭제 전 development plan38673377851은 실패했고 apply는 실행하지 않았다. worker 진단은 로컬 관리자 로그 조회로 확인 중이다. GitHub job 로그 redirect는 현재 환경의 네트워크 정책으로 거절돼 우회하지 않았다.

purge 도구·Demo/운영자 공유 workflow·잔여 데이터 경로와 signage fail-closed 목록은 원본 의도대로 보존한다. 데이터·GCS·전용 자원 삭제와 잔여0 확인 뒤 전용 도구를 제거하고, 공유 단계는 중립 경로로 분리한다. 다른 서비스 공유 자원·계정·상품/조직을 PH 이름만으로 삭제하지 않는다. WIF 제한/복구와 임시 권한 정리는 검증된 실행 창에서 수행할 별도 운영 단계다.

문서 정합: 원본 역사 기록과 현행 퇴역 정본을 보존하며, 이번 통합 검증과 실제 삭제를 구분한다.
