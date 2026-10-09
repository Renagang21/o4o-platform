# PharmacyHub retirement

> 상태: ACTIVE · 2026-10-09 · 실행 승인: 전용 앱·API·배포 경로 제거 및 운영 정리

PharmacyHub 독립 실행 경로를 제거한다. 약국 업무의 현행 경로는 Neture 약국과 공통 매장 업무공간이다.

## 저장소 변경

- `web-pharmacy-hub` 앱, PH 전용 API mount·controller·payment handler·cart checkout 제거.
- web-store PH 업무·결제 복귀 화면 및 문맥, Neture PH 공급자 제공 설정 화면·API 제거.
- PH 웹 배포 job·대상 registry·lockfile importer 제거.
- PH 전용 공통 메뉴 config·안내 copy 제거. 다른 서비스의 공통 Core는 유지.
- 과거 migration·작업/조사/검증 기록은 보존. 기존 주문·membership·forum 저장 식별자는 이력 데이터 해석에 필요하므로 유지한다.

## 운영 정리: 미실행

현재 환경에 GCP 실행 identity·CLI가 없어 Cloud Run·LB·DNS·인증서·DB 작업은 실행하지 않았다. 사용자가 PR #375를 생성했다. 현재 환경의 GitHub API 접근은 차단돼 원격 CI 상태 조회·병합·배포는 실행하지 못했다.

운영 실행 시 잔여 PH 결제·주문과 인쇄 QR 대상을 재조회하고 삭제 범위·결과를 기록한다. 상품의 `service_keys`에서 `pharmacy-hub`만 지우면 기본 공급으로 새로 노출될 수 있으므로 그 변경을 일괄 실행하지 않는다. 다른 서비스가 공유하는 조직·사용자·상품·결제·콘텐츠 원장을 삭제하지 않는다. 기존 인쇄 QR의 도메인 경로와 인증서는 리다이렉트 전환 후 처리한다.

코드 삭제와 운영 삭제·배포 완료는 별도로 보고한다.

## 검증

Store·Neture build, API production TypeScript check 통과. 변경 API spec 27개/637 tests, Neture 45개/371 tests, Store UI 8개/120 tests, Shared Space UI 8개/63 tests, Resources 14 tests, 배포 판정 114 tests 통과. unsafe-route 검사 1,131 files/0 violations, entity registry·문서 민감정보 검사 통과. 전체 API suite는 완료하지 않았고 변경 대상 suite를 실행했다. 운영 DB·실결제·인쇄 QR·Cloud Run 검증은 미실행이다.

## PR #375 CI 후속 수정

첫 PR CI는 Code Quality Check와 API Jest 3개 shard에서 실패했다. 제거 전 웹 배포 job 수를 기대하던 gate 테스트, 삭제된 PH checkout import·slug provisioning census, PH 업무공간 활성화 기대값을 현행 은퇴 상태에 맞춘다. 공통 QR의 migration·원장 경계·KPA renderer 검증은 보존한다. 최신 `origin/main`의 커뮤니티 권한 변경을 전용 branch에 통합한다. 실제 원격 CI PASS 확인 전 병합하지 않는다.

후속 검증: frontend type check·API 전체 type check·lint ratchet 통과, CI 스크립트 352 tests·변경 API 9 suites/144 tests·공통 운영자 UI 43 tests 통과. API Jest 3-shard 전수 실행은 426 suites 중 416 passed/1 failed/9 skipped, 7,089 tests passed/1 failed/77 skipped였다. 실패는 PH 웹 진입 제거가 보존 폐쇄 포럼의 community 운영권 판정에 영향을 준 회귀다. 원장 저장 코드에서 community를 해석하도록 수정했고, 해당 보안 계약과 community catalog 2 suites/42 tests 재실행이 통과했다. 전수 실행 전체를 수정 후 다시 실행한 것은 아니며 실제 원격 CI 결과는 별도 확인해야 한다. 문서 민감정보 검사 3,796 files/0 violations.
