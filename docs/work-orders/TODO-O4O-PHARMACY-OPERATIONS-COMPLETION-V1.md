# TODO-O4O-PHARMACY-OPERATIONS-COMPLETION-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-16 · **최종 갱신**: 2026-10-16 (KST)
> **근거**: 약국 협력사업 잔여 전체를 단일 TODO로 묶어 조사·보완·구현·검증·push·통합·배포까지 진행 요청

## 확정 기준

- pharmacy.neture.co.kr은 현재 사업별 특별 서비스가 없다. 이번 완료의 미구현 항목이나 신규 개발 대상으로 두지 않는다.
- 표준 구조는 운영자/가입자의 사업 공간과 약국별 내 매장이다. 한 약국은 여러 사업에 가입하며 운영자는 지정된 사업만 관리한다.
- 공급자의 제품 승인·운영자 자체 콘텐츠 제작/게시·가입 약국의 열람/복사·내 매장 업무 연결을 끝까지 대조한다.
- 콘텐츠는 독립 사본을 만드는 복사 모델이다. 저작권·동기화·회수 기능을 추가하지 않는다.
- 실제 Google·카카오 로그인과 계정 선택은 사용자 확인 항목이다. 조회 결과·합성 검증과 구분하며 임의 계정 병합/연결 변경을 하지 않는다.
- 분회 운영자 지정은 신규 분회 구축 후까지 보류한다. 기존 가입·권한 정리나 재구축도 이번 범위가 아니다.

## 작업 기준과 정본

최신 main `a4063be499`에서 새 전용 worktree·`wo/pharmacy-operations-completion`을 만들었다.
기준 checkout과 기존 인증 조사 worktree를 보존한다. 이전 사용자 지시에 따라 이 공간에서 개발·통합·배포를 순차 담당한다.
[정본 지도](../CANONICAL-INDEX.md), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md),
[역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[가입·인증](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md),
[약국 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)를 기준으로 삼는다.
PR #603의 미통합 기록과 분회 보류 결정을 확인했으며 다른 작업 PR을 임의 통합하지 않는다.

## 전체 TODO

- [x] 최신 main·전용 작업공간·지침·기존 완료/미통합 기록 확인.
- [x] 전체 관리자 지정 원장 → 담당 사업 목록 → 각 조회·처리 guard 대조.
- [x] 공급 제안 승인/반려/중단 → 해당 사업/약국 공급 표시 검증.
- [x] 콘텐츠 초안 작성/수정 → 게시/보관 → 사업 가입자 표시 검증.
- [x] 활성/대기/정지/탈퇴 약국·다른 사업·다른 운영자의 접근 경계 검증.
- [x] 가입자 자료 → 대상 약국 명시 선택 → 독립 복사본 이용 검증.
- [x] 사업 홈 공지·소식·공급·자료·Hero/광고의 실제 소비처·전시 구성 점검 및 필요한 연결 보완.
- [x] 표준 업무만 있는 현재 pharmacy 범위와 운영자 안내·문서 정합.
- [x] 이전 화면 표시 계정 census의 기존 결과 확보·집계 판정, OAuth 확인 경계 기록.
- [x] 발견 결함을 코드·문서에서 보완하고 회귀로 검증.
- [x] 영향 소비처 테스트·타입·빌드·lint·PC/모바일 browser 검증.
- [x] 민감정보·diff·staged scope 점검 후 commit·push.
- [x] 실제 ruleset·CI·Codex·최신 main 대조 후 PR 정상 통합.
- [x] Delivery 실제 판정·verified rollout·운영 코드/readiness 확인.
- [x] 전체 TODO 최종 판정·실제 로그인 사용자 확인 항목과 완료 근거 기록.

## 기존 구현 대조표

| 항목 | 최신 main의 출처 | 이번 조사/보완 |
|---|---|---|
| 가입 사업·My Home·자료 복사·공급 미리보기 | 이전 PR #622·#626 및 각 완료 TODO | 현재 소비처와 회귀 확인, 재구현하지 않음 |
| 운영자 심사·콘텐츠 편집 | operator-core-ui pharmacy-management, Neture/KPA 두 소비처 | 지정 사업 scope·전환·쓰기 성공/조회 실패·게시 결과 연결 확인 |
| Hero·광고 전시 | 최신 HomePresentationEditor·사업별 편집 route | 기존 게시 계약·조회 가드·담당 사업/가입자 소비 대조 |
| Google 표시 계정 차이 | 기존 census #38665862802 | 기존 로그만 읽어 집계 확인, 신규 운영 조회·권한/계정 변경 없음 |

## 실행 경계

운영 데이터·권한·Google 연결·DB/schema·migration·dependency·CI 인프라는 변경하지 않는다.
실제 운영 업무 데이터는 만들지 않으며 상태 변경 검증은 격리 fixture에서 수행한다.
새 전시 원장/순위 정책을 임의로 추가하지 않고 기존 전시 계약을 먼저 사용한다.
실제 OAuth는 USER_VERIFICATION_PENDING으로 분리하며 이를 대신했다고 보고하지 않는다.

DEPLOYMENT: AUTOMATIC — Delivery #38858740803 verified rollout 및 production DEPLOYED 확인.
WORKTREE_DISPOSITION: KEEP — 완료 기록 main 포함·clean·검사 종료 확인 후 이번 worktree/branch만 정리한다. 기존 작업공간은 보존한다.

## 조사 결과와 구현 범위 확정

- 지정/조회/처리: 서버의 Neture operator guard와 `requireOperatorOf`는 활성 지정 원장을
  사용자·사업 ID로 대조하며 각 처리도 대상의 같은 사업 ID로 제한한다. 전체 관리자를 서비스 운영자로 재해석하지 않는다.
- 실제 소비처는 Neture wrapper와 약국 App의 공통 pharmacy-management module 두 곳이다.
  기존 공유 모듈/메뉴 규칙을 확인했고 이 운영/편집 페이지의 다른 서비스·분회 소비는 없다. 전체 관리자 페이지는 별도 AdminSemiFranchisePage 소비다.
- 최신 main에 기존 Hero/광고 운영 편집과 게시 계약이 있어 이를 재사용한다. 심사 화면에서
  해당 사업의 홈·전시 편집으로 이동하는 연결만 보완한다. 별도 상품 전시 순위 원장은 만들지 않는다.
- 두 소비처의 기존 목록/편집 wrapper가 계정 ID로 수명을 구분하지 않아 같은 route의 계정 변경 시
  이전 요청/입력이 남을 수 있다. wrapper에서 계정별 재구성으로 해결하고 기존 모듈의 요청 세대 방어를 유지한다.
- 기존 화면 표시 계정 census 로그를 확보했다. readOnly=true / TARGET_NOT_FOUND / 계정·활성·
  Google 연결·전체 관리자 지정 집계 각각 0이다. 실제 Google sub/로그인 세션 일치 조회가 아니므로
  연결 오류나 계정 병합 필요성을 판정하지 않는다. 신규 운영 조회·계정/권한 변경은 없다.
- 실제 OAuth는 사용자 확인 항목이다. 현재 범위의 특별 서비스는 NOT_APPLICABLE이다.

공급 제안/콘텐츠/가입 약국/사본 SQL 검증은 전용 loopback PostgreSQL 15 컨테이너의 일회성 DB에서
기존 canonical baseline·incremental fingerprint와 기존 테스트를 실행한다. DB ownership marker를
확인한 finally 삭제를 사용하며, 종료 후 이번 컨테이너·데이터도 정리한다. 운영 DB를 사용하지 않는다.

## 완료 및 검증 기록

전체 표준 운영 작업은 source PR #654의 main 통합과 Delivery #38858740803의
verified rollout·production DEPLOYED까지 확인했다. 로컬/브라우저/운영 검증과
여러 커밋의 최종 판정은 [이 트랙 CHECK](../checks/CHECK-O4O-PHARMACY-OPERATIONS-COMPLETION-V1.md)에 모았다.
현재 특별 서비스는 NOT_APPLICABLE, 실제 OAuth·현재 운영자 업무 접근은
USER_VERIFICATION_PENDING이다. Sonar gate 통과와 잔여 정적 분석 5개를 구분한다.

완료 기록 PR #655는 동일 WO의 source PR 통합 후 증거 보충이며 기능 수정용 중복 PR이 아니다.
WORKTREE_DISPOSITION은 문서 main 포함·post-merge CI·clean 확인 전까지 KEEP이다.
조건 충족 후 SAFE_TO_REMOVE를 판정해 이번 worktree/branch만 정리하며 기존 공간을 보존한다.

문서 정합: My Home 기준·인증 후속 TODO·단일 TODO와 CHECK가 현재 범위와 확인 경계를 공유한다.
