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

## 2026-10-15 통합 재검증

원본 #609의 전체 커밋이 #610 head `b29b3111a`에 포함됨을 비교 API의 behind 0으로 확인했다. 원본 PR을 별도로 중복 병합하지 않는다. 이후 main `ac0ef5de9`를 merge 방식으로 반영했고 충돌은 없었다.

후속 리뷰의 초대 직접 수락, 공급자/신청자 모집 이력, 공개 태블릿 토큰, 공개 CMS 콘텐츠와 slot 삭제, 모집 반려·해지·마감, 옛 slug history, 빈 slot 일괄 교체를 코드와 회귀로 대조했다. 통합 후 residual guard·CMS slot scope·store membership 3 suites/60 tests PASS. 소스 구조 검사와 실제 호출 회귀가 함께 포함된 수치이며 실제 운영 DB 검증을 뜻하지 않는다. 최신 CI·Codex 재리뷰와 main 병합·배포는 아직 미완료다.

API 타입 검사도 통과했다. 전체 Jest의 최종 판정은 이 통합 head의 CI에서 확인한다.

추가 재리뷰에서 발견한 CMS 조회수/추천 변경은 저장된 serviceKey를 읽어 퇴역 콘텐츠를410으로 거절하도록 보완했다. 공유 매장의 pairing slug 선택과 heartbeat slug 조건에도 퇴역 키 판정을 적용했다. PH key·event-offer·prefix/앞뒤 공백은 차단하고 NULL·Neture·KPA는 보존한다. 관련 API5 suites/77 tests, API 타입 검사, 변경 파일 ESLint PASS. 격리 PostgreSQL15의 키 판정8경우도 PASS이며 운영 DB에는 연결하지 않았다.

## 실제 삭제와 분리

공유 조직의 상품 풀·runtime 정보·preview·채널 링크·운영자 Store Console이 고르는 활성 slug6곳에도 같은 helper를 적용했다. raw slug SELECT 소비처를 대조했으며 provisioning/회원 권한 근거의 기존 특정 서비스 조건과 migration·삭제 도구는 변경하지 않았다. CMS slot PUT/DELETE 및 일괄 교체는 저장된 contentId의 서비스까지 확인해 PH 연결 slot의 일반 변경·삭제를 차단한다. metadata-only PUT2건과 DELETE/빈 일괄 교체 회귀를 추가했으며 관련 API4 suites/47 tests PASS.

KPA 공용 settings/channels/template/layout의 slug 직접 조회도 퇴역 키이면 조직을 읽기 전에 기존 STORE_NOT_FOUND(404)로 닫았다. 같은 findBySlug 소비처를 전체 검색했으며 나머지 공개 경로는 기존 서비스 귀속 일치 또는 퇴역 판정으로 차단됨을 대조했다. PH key3종×조회/쓰기8경로의 HTTP 회귀와 정상 KPA 조회를 포함한 API2 suites/15 tests PASS, 타입 검사 PASS, lint0errors/기존 catch warning4개. 초기 layout 테스트는 비어 있는 blocks를 보내 입력 검증400이 먼저 발생했으므로 유효한 HERO 블록 요청으로 수정해 퇴역 경계를 검증했다.

공개 QR의 별도 slug 선택 쿼리도 접두사 판정 helper로 통일했고 관련 QR·PH API2 suites/44 tests 및 타입 검사 PASS. 퇴역 키 상수를 직접 소비하는 SQL 경로를 전체 검색해 남은 exact-only slug 필터가 없는 것을 확인했다.

head `d90ed83fb`의 CI38696961700 웹 검증 단계에서 기존 장바구니 회귀2건이 실패했다. 해당 Store 파일은 이번 변경에서 수정하지 않았다. 같은 파일의 단독8건과 Store 전체34 files/436 tests가 로컬에서 통과했다. 이 결과로 실패한 CI를 PASS로 대체하지 않으며 최신 head의 CI 결과를 다시 확인한다.

추가 접두사 리뷰는 조직의 퇴역 slug 이력과 활성 slug 생존 근거에도 동일한 키 판정을 적용해 보완했다. NULL slug는 활성 서비스의 근거로 승격하지 않는다. 격리 PostgreSQL15에서 접두사 단독 이력·등록 이력과의 조합·활성 Neture 공유 조직 보존·NULL slug 4경우를 검증했고 모두 통과했다. 관련 API77건도 재통과했다. opt-in PostgreSQL 회귀3건을 추가했으며 CI에서는 fixture 미설정 시 실행되지 않는다.

사용자는 PH 데이터가 테스트용이며 PH/전용 인프라를 재사용하지 않는다고 확인했다. 실제 삭제 전 development plan38673377851은 실패했고 apply는 실행하지 않았다. worker 진단은 로컬 관리자 로그 조회로 확인 중이다. GitHub job 로그 redirect는 현재 환경의 네트워크 정책으로 거절돼 우회하지 않았다.

purge 도구·Demo/운영자 공유 workflow·잔여 데이터 경로와 signage fail-closed 목록은 원본 의도대로 보존한다. 데이터·GCS·전용 자원 삭제와 잔여0 확인 뒤 전용 도구를 제거하고, 공유 단계는 중립 경로로 분리한다. 다른 서비스 공유 자원·계정·상품/조직을 PH 이름만으로 삭제하지 않는다. WIF 제한/복구와 임시 권한 정리는 검증된 실행 창에서 수행할 별도 운영 단계다.

문서 정합: 원본 역사 기록과 현행 퇴역 정본을 보존하며, 이번 통합 검증과 실제 삭제를 구분한다.
