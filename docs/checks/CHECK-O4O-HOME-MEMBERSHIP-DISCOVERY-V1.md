# CHECK-O4O-HOME-MEMBERSHIP-DISCOVERY-V1

상태: 로컬 검증 통과 / 사용자 문제 계정 읽기 검증 완료 / 보정 승인 완료·운영 실행 대기

- ServiceDiscovery 회귀: 13개 통과. 모든 서비스 가입 시 ‘다른 서비스 알아보기’ 미표시, 공개 도구·준비 중 서비스 별도 유지, pharmacy 사업 원장만 있는 가입자 제외, 데이터 없음 시 공개 전체 탐색 유지.
- 홈 주변 회귀: ServiceDiscovery 13 + home-entry.communities 15 + O4OHomePage.entry-pills 12 = 40개 통과. 마지막 안내 문구 변경 후 ServiceDiscovery 13개 재실행 통과(중복 합산 안 함).
- 변경 파일 ESLint 오류 0, 공통 패키지 빌드 및 Neture 타입 검사 포함 production build 통과.
- 실제 사용자 문제 계정: 사용자가 매장 경영자 테스트 로그인 버튼 계정이라고 확인. 같은 코드 정본으로 일반 로그인 및 가입·참여 API를 읽었다. 메인·약국·강의 active, pharmacy 사업 active. 나머지 가입·사업 원장 누락은 WO 표 참조. 공개 조합 목록은 0건이다.
- 운영 가입 데이터·권한 변경: 없음.
- main 반영·배포: 미수행.

초기에는 공개 Demo와 문제 계정의 동일성을 확인하지 못했으나 이후 사용자 답변으로 확인됐다. 계정별 실제 데이터 보정은 승인·안전한 적용 경로·사후 검증 전까지 미완료다.


## 승인 후 실행 준비 (2026-10-20, KST)

- 사용자 운영 데이터 보정 승인 확인. 기존 범위 내 재승인 불필요.
- PostgreSQL 15 로컬 독립 DB: 11개 통과. read-only plan, 네 참여 행 + 복구 한 행 적용, 다른 계정/기존 행 보존, 멱등성, pending/suspended/rejected/withdrawn 보호, stale digest 거부, registry 모호성 거부, 미확인 계정 거부, 복구 저장 실패 전체 rollback 검증.
- workflow의 실제 shell gate: 3개 통과. owner/main/exact digest/unfrozen 조건과 잘못된 입력 차단.
- 공통 packages 빌드, API type-check, 변경 TS lint 통과.
- 운영 SQL plan/apply, 최종 사용자 계정 사후 검증, 이번 PR main 반영 및 배포는 아직 미실행이다.
