# WO-O4O-STORE-WORKFLOW-HARDENING-V1

> **상태**: COMPLETED · **작성일**: 2026-10-12 · **최종 갱신**: 2026-10-12 (KST)
> 근거: 사용자 승인 — 조회 오류·직원 권한 정합성·대형 화면 기능 분리·문서 정리를 하나의 작업으로 구현·검증·push·main 통합·배포
> 정본: [매장 접근](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md), [약국 commerce](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)

## 범위와 TODO

- [x] 최신 main·현행 정책·화면 및 API 소비처 조사
- [x] QR·채널·태블릿의 조회 실패와 빈 목록 구분 및 재시도
- [x] 직원 승인 관계·Role 발급 트랜잭션, 승인·해제·수락·취소 직렬화, 해제 Role 정리 재시도
- [x] QR·사이니지 목록과 채널·태블릿 조회 기능을 화면 밖으로 분리
- [x] 현행 약국 직원 접근과 선택 매장 설명·퇴역 서비스 주석 정합
- [x] 실패·재시도·동시 요청 회귀 검사 및 API 타입·웹 빌드·품질 검사
- [x] commit·push·PR·CI·리뷰 후 main 통합·운영 배포 확인

직원은 최종 승인 후 업무 전체를 이용하며 구성원 관리는 경영자만 이용한다. 데이터·Role schema와 Frozen Core를 변경하지 않는다. 기존 canonical Role writer를 사용한다. 승인·Role 발급은 기존 manager 지원을 재사용하고 해제도 관계·Role 변경을 한 트랜잭션으로 반영하여 부분 실패를 롤백하고 재시도한다. Role writer의 기존 호출 계약·인가 SSOT를 유지하는 선택적 manager 지원만 보완한다(Freeze의 버그 수정 범위). 운영 계정 생성·권한 backfill·운영 업무 데이터 변경은 이 코드 작업에 포함하지 않는다.

실제 직원 계정은 사용자 생성 예정이며 기존 경영자·공급자 로그인은 INVALID_CREDENTIALS 확인 뒤 인증 담당의 확인을 기다린다. 이 작업의 로컬 회귀·합성 화면 검증을 실제 계정·기기 검증으로 기록하지 않는다.

## 구현·검증 결과

- 직원 초대·수락·승인·취소·해제는 같은 사용자 키의 PostgreSQL transaction advisory lock을 공유한다. 관계 SQL과 Role writer가 같은 EntityManager를 사용한다. 기존 removeRole 호출은 유지하고 optional manager만 assignRole과 같은 방식으로 지원한다. commit/rollback 뒤 Role 캐시를 다시 무효화한다. 데이터 schema·HTTP API·Role 값 변경 없음.
- 실패한 해제는 관계와 Role을 함께 롤백하며 재시도할 수 있다. 이미 종료된 직원 관계도 Role 정리 재시도 대상으로 읽되 owner/admin/manager 변경 금지는 유지한다.
- QR·사이니지 목록은 공통 resource hook으로 분리했다. 늦게 온 이전 조회는 새 결과를 덮지 않으며 오류와 실제 빈 목록을 구분한다.
- 채널·태블릿의 필수 source loader와 태블릿 미디어 자료함 병합을 화면 밖으로 분리했다. source 실패 시 빈 배열을 만들어 편집하지 않고 오류·재시도를 제공한다. 태블릿 변경 시 이전 pool·진열·대기 자료를 비우고 이전 응답을 무시한다.
- API/Role 4 suites / 55 tests PASS. 웹 8 files / 50 tests PASS. 트랜잭션 rollback 검사는 unit fixture이며 실제 운영 DB 동시 변경 검증이 아니다.
- API tsc noEmit·웹 타입 포함 production build PASS. 저장소 ESLint ratchet PASS(기존 46 errors baseline 유지), 변경 파일 ESLint 0 errors(기존 unused-disable warning 1개). 문서 민감정보 검사 PASS.
- Chromium 합성 API fixture: QR·사이니지·태블릿·현역 서비스 경로의 채널 화면, 1280px·375px에서 조회 실패 안내→재시도→정상 빈 목록 및 화면 오류 없음 36 assertions PASS. 실제 계정·운영 데이터·물리 기기 검증과 구분한다.
- 후속 화면 폼·출력 구성요소의 추가 분리는 유지보수 후보이며 이번에는 확인된 조회·상태 경계를 분리했다. 기존 route·Core UI·출력·결제 계약은 유지한다.

## PR 리뷰 보완

[PR #514](https://github.com/Renagang21/o4o-platform/pull/514)의 최초 CI·CodeQL·정책 검사 PASS. P2 두 건을 보완했다: 태블릿 목록 실패는 목록 resource loader를 다시 실행하며, QR 상품 편집 종료·유형 변경 시 관련 오류를 지우고 재시도 버튼을 감춘다. PC·모바일 36개 합성 화면 확인에 두 재현을 포함해 PASS다. 최신 main의 다른 작업 문서도 충돌 없이 통합했다.

후속 P2 보완: 상품 관리에서는 사용하지 않는 slug·자료 설정 조회를 요청하지 않는다. 상품 관리가 설정 source의 장애에 막히지 않는 검사를 추가했으며 웹 50개·타입 포함 빌드 PASS다.

태블릿 상세 조회 실패 후 위치 목록으로 돌아오면 이전 상세 오류·pool·진열·대기 목록을 초기화한다. PC·모바일 합성 검증에 상세 실패→목록 복귀를 추가해 36개 PASS다.

CI 38255436395는 변경하지 않은 auth-react 카카오 가입 테스트에서 `resolve is not a function`으로 실패했다(앞선 두 PR CI의 같은 인증 테스트는 PASS). 비동기 terms 요청의 준비 전 테스트 resolve 호출이며 인증 코드는 임의 수정하지 않는다. 현재 보완 커밋의 required CI가 최종 gate다.

## 완료 판정

구현·검증·PR #514 main 통합·API 및 내 매장 웹 운영 배포를 완료했다.
배포 SHA·CI·합성 브라우저 결과와 실제 계정·기기 검증 경계는
[CHECK-O4O-STORE-WORKFLOW-HARDENING-V1](../checks/CHECK-O4O-STORE-WORKFLOW-HARDENING-V1.md)에 기록한다.
