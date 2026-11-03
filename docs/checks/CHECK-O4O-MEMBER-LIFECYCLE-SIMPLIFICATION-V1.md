# CHECK-O4O-MEMBER-LIFECYCLE-SIMPLIFICATION-V1

> 상태: COMPLETED · 작성일: 2026-11-03 · 성격: 개발 검증·push 인계 기록. 운영 완료 증거가 아니다.
> 승인 범위: [WO](../work-orders/WO-O4O-MEMBER-LIFECYCLE-SIMPLIFICATION-V1.md), 사용자의 수정·push 지시.

## 결과

- 회원 상세에서 이용 정지·직원 이용 해지, 약국 매도·경영자 이전, 약국 완전폐업·자료삭제를 분리했다. 각 명령은 최신 서버 권한을 다시 확인한다. 매도와 폐업은 전체 관리자·명시적 확인이 필요하다.
- 계정·개인자료 삭제는 별도 Operator 정지를 요구하지 않고 기존 계정 제거 시작 시 접근을 차단한다. 공급자 조직·제품·거래를 계정 FK cascade로 삭제하지 않도록 개인 연결을 먼저 제거한다.
- 직원은 기존 대상자 lock 안에서 단일 사업체 소속을 검사한다. 사업체가 닫힌 뒤 새 초대·수락·승인을 실행하지 못하도록 잠금 후 조직 상태도 재확인한다.
- 매도는 같은 약국 조직·자료를 유지하고 새 경영자의 활성 계정·이메일·승인 약사 자격·소속을 확인한 뒤 관계와 면허를 이전한다. 이전 경영자의 접근과 불필요한 개인 연락처를 정리한다.
- 완전폐업은 기존 Store inventory·미디어 소유/참조 검사·파일 실패 재시도를 재사용한다. 명시적 완전폐업만 기존 7일 계약 종료 대기와 구분한다. 활성 소속·서비스가 남은 조직은 즉시 파기를 거절한다. 일반 계약 종료 API의 기존 동작은 유지한다.
- 미완료 폐업은 개인 계정 삭제도 완료로 표시하지 않는다. 비활성 약국이라는 사실만으로 폐업 자료 파기가 끝났다고 판단하지 않는다. 공급자 개인 증빙파일도 검토가 남으면 완료하지 않는다.
- 삭제 실패를 기능 OFF·권한·schema 준비·개인 파일·사업 처리 필요 등으로 안내한다. 서버 completed/erased 일치만 성공으로 인정하며 늦은 응답·중복 실행 방어를 유지한다.

## 검증

Node 22.18.0, pnpm 10.25.0, frozen lockfile·offline 설치와 필요한 workspace dependency build를 사용했다. 첫 기본 Node 24 설치의 환경 제한 실패는 Node 22 및 허용된 실행 환경에서 기존 lockfile 그대로 재설치해 해소했다. 의존성·lockfile·CI·환경 설정 변경은 없다.

- API: 계정 제거 실제 PostgreSQL/HTTP·JWT, 파일 adapter, readiness, 직원 소속, 중앙 회원 route, 기존 Store 종료 회귀 6 suites/110 tests PASS. 이후 공급자 조직 및 비활성 약국 판정 보강은 실제 DB 집중 6 tests PASS(중복 포함)로 확인했다. 즉시 파기 거절과 직원 회귀도 별도 재검증했다.
- 추가 실제 DB 검증: 직원 이용 해지 후 업무 자료 보존과 개인 연결 제거, 매도 후 같은 약국 자료 유지와 이전 경영자 계정 삭제, 공급자 조직 owner 관계·공급 상품 보존과 개인 연락처 제거, 완전폐업 자료 파기 후 계정 제거, 권한/버전 거절, 비활성 약국의 미완료 판정.
- Admin: 기존 회원 선택·명령 잠금·삭제 상태/오류와 새 이용 해지·매도·폐업 확인·payload 회귀 3 suites/28 tests PASS.
- API type-check·production tsc 검사, Admin type-check, 집중 ESLint, API production build, Admin Vite production build를 수행했다. Vite의 기존 큰 chunk 안내는 유지한다.
- 실제 계정·브라우저의 PC/mobile smoke는 미실행이다. 연결된 Browser 도구와 현재 비공개 테스트 계정 파일이 제공되지 않았으며 과거 계정으로 대체하지 않았다. component 검증을 실제 브라우저 검증으로 표현하지 않는다.

## fixture와 운영 준비의 차이

loopback 전용 일회성 PostgreSQL 15에 정식 baseline과 54개 incremental을 적용했다. 현재 정식 스키마에서 erasure writer fence 미등록 13개를 확인했다. readiness의 차단은 정상 동작이다. 기존 readiness 테스트와 같은 방식으로 **일회성 fixture에만** 동일 writer fence를 등록한 뒤 기능 회귀를 실행했다. 이 조건을 운영 schema 준비 완료나 운영 repair로 주장하지 않는다. 운영 테이블·원문·계정·파일은 조회/변경하지 않았다.

실행 중 합성 면허번호 길이 및 INSERT UUID/text 타입 오류를 실제 schema로 확인해 fixture를 정정했다. 조직 businessProfile은 실제 metadata 저장 위치에 맞췄다. 최종 집중 검증에서 공급자 조직을 약국으로 오인하거나 단순 비활성화를 폐업 완료로 오인하지 않는 것을 확인했다. 운영 gate·테스트 assertion을 약화하지 않았다.

미분류 개인 자료·첨부파일·법정 증빙·외부 저장/공유 객체의 기존 전수 inventory 잔여는 유지한다. Store의 기존 파기 inventory를 전체 신규 사업 domain/file 전수 파기의 증명으로 확대하지 않는다. 운영 활성화 전에 writer fence 보완과 기존 domain/file 잔여를 해결해야 하며 이 변경은 erasure flags를 켜지 않는다.

## 인계

시작 main `ff8f1fce26e273f69d9108b63a5f1e9ea7c0dabf`, branch `wo/member-erasure-simplification`. 사용자 지시대로 commit·push까지만 수행하며 PR·PR CI·main 병합·배포는 미실행이다. 운영 DB DDL/write·실제 계정/GCS 삭제·자동 파기 job 변경 0건. 통합 담당은 인계 HEAD와 이 기록의 미검증·준비 잔여를 함께 확인한다.

WORKTREE_DISPOSITION: KEEP — 미병합 branch와 로컬 검증 재현용. 일회성 DB·preview는 검증 종료 후 제거한다.

문서 정합: 현재 사용자 결정에 따라 역할 Architecture·개인정보 보존 정책에 처리 순서·단일 직원 소속·매도/완전폐업·공급자 분리를 추가했다. 과거 작업 기록·canonical index 판정은 수정하지 않았다. 정책 확정과 운영 실행을 구분한다.
