# CHECK-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1

- 작성: 2026-10-18
- 상태: LOCAL_VERIFIED · PUSH_PENDING · 운영 미적용
- branch: `wo/cooperative-role-management`
- base: `6419df05c7103d77f500b775c6ff914f9cb6c5a6`
- 정책: [설계](../design/DESIGN-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1.md) · [TODO](../work-orders/TODO-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1.md)

## 변경

- 연합회 역할과 조합별 admin/operator 배정을 분리했다. 연합회 역할·일반 Neture 역할·과거 사업 담당 행만으로 산하 조합 권한이 생기지 않는다.
- 연합회 조합 가입 신청·검토·보완·최종 승인/거절·정지/복구 및 조합 admin 지정·해제를 구현했다.
- 개인 가입·보완·탈퇴 요청과 조합 operator의 검토·처리 요청, 조합 admin의 최종 승인/거절·정지/복구·탈퇴/제명 반영 및 operator 지정을 구현했다.
- 모든 mutation은 조합 행 lock 뒤 현재 역할을 검사한다. 사유·처리자·대상·시각·이전/이후 상태를 기록하며 자기 역할 및 마지막 admin 해제를 막는다.
- 조합 역할/개인 가입에 따른 사업 공간 접근을 공통 조회에 연결했다. 약국 조직 가입/소유권과 전역 역할은 만들지 않는다. 다른 약국 협업체 판정은 유지한다.
- 테스트 provisioning은 명시된 테스트 조합의 최초 local admin만 연결한다. 활성·이메일 인증 계정, 충돌 검사, dry-run, transaction, 멱등성은 유지한다. 실제 운영 실행 없음.
- 신규 forward migration `CreateCooperativeManagement1792300000000`만 추가했다. 기존 적용 migration 불변, 전역/옛 담당 배정을 자동 변환하는 backfill 없음.
- 신규 역할과 이력은 공통 계정 삭제의 개인 원장 분류 및 write fence에 포함했다. 조합 자격 종료는 이력·공통 계정 삭제가 아니다.

## 실제 검증

| 항목 | 결과 |
|---|---|
| Node/pnpm · 설치 | 저장소 pinned Node 22.18.0/pnpm 10.25.0 · frozen lockfile 설치 통과, dependency/lockfile 변경 없음 |
| 공통 package build | 통과 |
| API tsc --noEmit / tsc build / production tsup bundle | 통과 |
| 조합 PostgreSQL 실제 SQL 검증 | 19 통과: 역할 분리·타 조합 차단·자격 전이·동시 마지막 admin 해제·CLI dry-run/멱등성·계정 삭제 중 쓰기 차단 |
| HTTP/기존 사업관리 경계 | 5 suites 37 통과 (조합 PostgreSQL 19 포함) |
| 기존 협업체 역할 PostgreSQL 회귀 | 12 통과 (pharmacy/carepharm/megapharm/pharmcoop, 해제·만료·전역 역할 경계) |
| 기존 사업 접근·community workspace·개인정보 storage | 3 suites 10 통과 (사업 접근 검증은 위 관련 suite와 중복) |
| 홈 개인 조합/약국 조직 분리 | 2 suites 3 통과, 약국 정지가 독립된 개인 조합 자격을 정지시키지 않음 |
| 협동조합 Vitest / build | 5 files 43 통과 / 통과 |
| Chromium, 빌드된 앱 + 합성 API | 데스크톱·모바일 네 역할, 공통 로그인·인증 전송·저장 결과·최종 버튼 제한 확인. page error 0, 가로 overflow 0 |
| Migration | 정본 bootstrap + 기존 모든 incremental prefix 일치. 신규 up fingerprint `63a1eff0d73093a57fc459f064d3e883b7b6a9c4de5b41b8c4768aa154ec6e3f` / 6774 lines |
| Migration down | rollback-only transaction에서 이전 fingerprint `2fe675793e6f86734ed83e4317047f7b2548e02c1fea92ae39bba083f8a8f644` / 6741 lines 복원 확인 |
| Migration contract | 21 pass / 0 fail |
| ESLint | 변경 구현 코드 error 0. 기존 neture-pharmacy.routes.ts의 미사용 `_next` warning 1은 유지 |

초기 회귀 실패는 신규 조합 조회를 받지 못한 기존 mock 1곳과 신규 합성 테스트의 UUID/text 바인딩 타입 때문이었다. mock을 새 조회 경계에 맞추고 바인딩 타입을 명시해 각각 재검증했다. 환경 sandbox에서 문서 검사 도구의 git subprocess가 막힌 시도는 통과로 계산하지 않았으며, 작성 문서를 명시한 재실행으로 검사했다.

브라우저 검증은 합성 계정·API를 사용한 로컬 앱 검증이다. 실제 운영 로그인/DB 권한/도메인 확인을 대신하지 않는다. 테스트 DB는 전용 loopback PostgreSQL이며 운영 환경 credential을 사용하지 않았다. 테스트 종료 후 조합·회원·역할·이력 잔여 0을 확인했다.

## 통합 담당 인계

- 사용자 지시의 종료점은 commit·push다. PR 생성·병합·배포·운영 migration·실계정 지정·IAM/DNS 변경 없음.
- 운영 적용 전 신규 migration과 API/web을 정식 통합 절차로 반영해야 한다. 기존 조합 담당을 자동 변환하지 않으므로 연합회 admin이 조합 admin을 명시적으로 지정한다.
- 기존 지정 계정의 존재/이메일 인증 문제는 이 개발로 계정이 생성되어 해결되는 것이 아니다. 테스트 등록 실행 전 실제 계정 상태를 별도로 확인한다.
- 회원 게시판/자료 본문 화면은 기존 placeholder 범위를 유지한다. 이번 구현은 회원관리와 기존 공급조건·콘텐츠 운영 권한 정비다.
- 실제 migration·운영 배포는 별도 통합 담당 공간에서 수행한다. 본 branch를 main에 직접 push하지 않는다.
- 문서 정합: 권한 설계·TODO·서비스 README·현행 사업 설계·RBAC 카탈로그를 새 정책에 맞췄으며 과거 CHECK/WO 이력은 보존했다.
