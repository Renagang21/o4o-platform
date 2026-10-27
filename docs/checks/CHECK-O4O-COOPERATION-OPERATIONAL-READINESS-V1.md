# 약국 협업체 운영 개통 검증 기록

> **상태**: ACTIVE
> **작성일**: 2026-10-27 · **최종 갱신**: 2026-10-27
> **근거 WO**: [WO-O4O-COOPERATION-OPERATIONAL-READINESS-V1](../work-orders/WO-O4O-COOPERATION-OPERATIONAL-READINESS-V1.md)

## 판정

자료 본문·첨부 열람 보완과 격리 검증은 완료했다. 실제 운영 개통은 미완료다. 개발·main 통합·배포·실계정·실매장 검증을 서로 대신하는 완료 증거로 사용하지 않는다.

## 소비처와 변경

| 소비처 | 확인 범위 |
|---|---|
| Pharmacy·MegaPharm / web-pharmacy-business | 공통 회원 업무·전용 자료·운영자 검토 |
| CarePharm / web-neture | 공통 회원 업무·전용 자료·운영자 검토 |
| Pharmcoop / web-pharmacy-coop | 개인 회원 업무·운영자 검토, 약국 scope 미부여 |
| shared-space-ui·operator-core-ui | 본문·첨부 표현, 기존 transport·scope 유지 |

요약과 전체 본문을 함께 제공하고 현재 자료·개정 이력의 첨부를 열 수 있게 했다. 첨부는 자동으로 읽지 않으며 HTTP/HTTPS 외 스킴·상대 경로·자격정보 포함 URL을 거절한다. 공유 UI helper를 추가했고 기존 가입·role·API·schema 계약은 변경하지 않았다. API 변경은 격리 PostgreSQL 권한 회귀 테스트뿐이다.

## 로컬 검증

| 검증 | 결과 |
|---|---|
| shared-space-ui 전체 | 23 files / 206 tests PASS |
| operator-core-ui 전체 | 30 files / 217 tests PASS |
| pharmacy-business 전체 | 20 files / 149 tests PASS |
| API model + 격리 PostgreSQL | 2 suites / 28 tests PASS |
| Store 음성·상담 기존 로직 | 2 files / 26 tests PASS — 실제 장치 검증 아님 |
| 합계 | 626 tests PASS |
| Pharmacy Business·Neture·Pharmcoop build | 세 호스트 PASS |
| 변경 UI ESLint·diff 공백 검사 | PASS |
| canonical baseline + incremental prefix | 빈 로컬 PostgreSQL 15에서 46 prefixes fingerprint PASS |

회귀 테스트는 수정 전 새 회원 열람 4개가 실패하는 것을 확인했고 수정 후 통과했다. 초기 frontend build는 최신 main의 content-editor dist가 오래되어 실패했으며, 기존 패키지 재빌드 후 통과했다. 의존성·lockfile·관련 없는 소스 변경은 없다.

실행은 SETUP 환경 적용 후 각 패키지 Vitest, root의 `pnpm exec vitest run --config services/web-pharmacy-business/vitest.config.mjs`, API의 기존 Jest 설정을 사용했다. 로그와 합성 브라우저 산출물은 로컬 `.onboarding/cooperation-ops-*`에 두고 public 저장소에 원문을 넣지 않는다.

## 브라우저 검증

실제 빌드 산출물을 loopback preview로 실행하고 합성 인증·API만 연결했다. 실제 계정과 운영 API를 사용하지 않았다. 네 공간 × 1440/390 폭, 총 8개 시나리오 모두 PASS. 각 시나리오의 회원·운영자는 별도 browser context를 사용했다.

- 필수 공지 게시→회원 확인→운영자 대기 수 갱신
- 활동 신청→승인→진행→완료와 회원 상태 반영
- 지원 진입 시 scope/hash 유지→문의 접수→운영자 배정·기한
- 자료 분류·관련 교육·개정 반영과 양측 전체 본문·첨부 표시
- 양측 page error 0, 가로 넘침 없음; CarePharm mobile screenshot 육안 확인

첨부 실파일을 다운로드하거나 실제 microphone/speech 장치를 사용하지 않았다. Pharmcoop은 개인 가입, 나머지는 선택 약국 경영 단위의 fixture로 구분했다.

## 실제 환경 읽기 확인

2026-10-27 시점의 정상 HTTPS·공개 API와 지정 점주/직원 Secret만 사용했다. API는 허용된 Pharmacy 동일 출처 proxy를 통해 조회했다.

| 항목 | 관측 결과 / 한계 |
|---|---|
| 네 공개 홈 | 모두 HTTP 200 |
| Pharmacy·MegaPharm·CarePharm 가입 정책 | 각각 503 / POLICY_UNAVAILABLE |
| 세 사업의 공개 terms·privacy | 총 6개 endpoint 모두 404; 이 경로에서 게시 문서 없음 |
| 공개 cooperatives 목록 | 빈 목록; 전체 DB에 조합이 없다는 의미로 확대하지 않음 |
| 지정 점주 로그인·접근 매장 | 성공, 접근 매장 1개 / owner |
| 점주의 세 사업 회원 업무 | 각각 200, 업무·자료 응답 구조 확인. 실제 양방향 쓰기 검증은 아님 |
| 지정 직원 로그인 | 401 / INVALID_CREDENTIALS, 실패 후 재시도·초기화·권한 부여 없음 |
| 운영자·개인 조합원 | 지정 계정 미확보, 검증 미실행 |

사업 데이터 생성·수정·삭제, role 변경, 약관 게시, 가입 seed는 실행하지 않았다. 정상 인증 과정에서 생기는 보안·감사 기록은 보존 정책을 따르며 조기 삭제하지 않았다. 계정값·응답 원문·개인/약국 식별자는 공개 기록에서 제외한다.

## 남은 개통 작업

직원 Secret 정정, 운영자·개인 조합원·테스트 약국 지정이 필요하다. 신규 가입 전에는 실제 운영 주체의 약관·개인정보처리방침 게시가 필요하다. CarePharm의 미정 회사 정보를 임의 작성하지 않는다. 공개 조합 정보·개별 사업 제공 기능·직원 허용 설정도 지정 운영자와 확인해야 한다. 실제 매장 PC·태블릿·음성 검증은 미실행이다.

## 전달·정리 상태

현재 변경의 main 통합·운영 배포는 아직 실행하지 않았다. 작업 branch는 `wo/cooperation-operational-validation-20261027`이다. 로컬 검증 완료를 운영 반영 완료로 표시하지 않는다.

격리 SQL fixture는 synthetic 사용자·업무·인증 문의 잔존 0건을 확인했다. 본 작업 label을 확인한 PostgreSQL container와 연결 anonymous volume을 제거했고, 본 작업 preview만 종료했다. loopback 4311·4312·4313·55479 포트 종료를 확인했다. 다른 리소스는 정리하지 않았다.

## 문서 정합

기존 V2의 COMPLETED는 개발·통합·배포 완료이며 실계정·실매장 검증은 별도라고 명시돼 있어 모순이 아니다. 과거 기록과 canonical index를 다시 쓰지 않았다. 본 작업은 운영 개통 미완료를 ACTIVE로 추적한다.
