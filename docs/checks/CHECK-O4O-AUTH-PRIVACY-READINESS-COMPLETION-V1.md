# 인증·개인정보 준비 보완 검증

> **상태**: ACTIVE · **작성일**: 2026-10-26
> **범위**: [WO](../work-orders/WO-O4O-AUTH-PRIVACY-READINESS-COMPLETION-V1.md) · [운영 인계](../guides/O4O-AUTH-PRIVACY-READINESS-OPERATIONS-V1.md)
> **종료 경계**: commit/push·PR 최신 HEAD CI/검토까지. main 병합·auto-merge·운영 배포 제외.

## 변경과 실제 개발 검증

| 항목 | 결과 |
|---|---|
| 인증 공유 counter | 독립 Node 프로세스 두 개에서 실제 middleware/PG 사용. A에서 실패5회 후 B도429, Google 별도 scope 유지 PASS |
| 동시성·실패·창 경계 | PG 동시 예약32개 정확한 증가·식별자 원문 비저장·성공 예약 반납·이전 창의 늦은 반납 차단·저장소 장애503·잠금 timeout·활성 counter의 migration down 거부. 총 **7 tests PASS** |
| 기존 인증 소비처 | auth 모듈·middleware·legacy 인증 금지·startup/migration 경계 등 **30 suites / 436 tests PASS**. 조건부 DB suite는 기본 runner에서 skip이며 아래 별도 실행과 구분 |
| 삭제 준비 | non-AI 3테이블+counter fence 확인, 비활성 trigger·동일명 다른 함수·새 미보호 테이블은 capability false. request 전 거부·계정 active 보존·operation 미생성. 실제 PG **4 tests PASS** |
| 기존 계정 제거 | 실제 local PostgreSQL/JWT/두 HTTP route·인가·보호 대상·타인 자료·공유 참조·동시 writer·파일 재시도·달력/hold 등 **40 tests PASS** |
| GCS adapter | 삭제 retry의 owner/purpose 변경·content/metadata generation 조건·부재/교체·실패를 mock SDK로 확인. **7 tests PASS**, 위 인증 회귀에 포함된 수치 |
| 복원 검사 | 7일 fence 이후20일 export의 삭제 UUID 충돌·새 UUID·현재 증빙/보존/입력 거부·CLI 종료0/1/2와 비밀 없는 오류. **6 tests PASS** |
| 실제 API smoke | 새 schema의 격리 DB + production build 결과의 API 기동·readiness PASS. 실제 이메일 로그인 route에 합성 미존재 계정으로 **401×5→429**, Retry-After/코드 확인. 실제 계정·유료 호출 없음 |
| 타입·build | API type-check·production TypeScript build PASS |
| schema 계약 | 공식 migration contract **21 PASS / 0 FAIL**, 기존43 prefix 최종 지문 보존. 신규44번째 empty down/up·공식 fresh bootstrap/증분/최종 assertion PASS |

신규 상태 지문: `564bd3302650f6716d1063790048cfe137fc95561ff22fbbfc3847fb9cc26586` (7,131 lines). 기존 마지막 지문은 `4accc1af6999af30ee278a666edeafb6d978b2846ef9876fd2b43e58cc4144a3` (7,117 lines) 그대로다. 과거 baseline/manifest 항목을 수정하지 않았다.

처음 DB 검증은 container readiness보다 일찍 실행되어 connection refused, bootstrap 검증 helper는 transaction 밖 fingerprint 호출로 실패했다. 준비 완료 및 transaction 경계를 바로잡고 공식 fresh runner까지 재검증했다. 동시 reserve 테스트의 배열 첫 항목은 DB 최초 예약 순서가 아니므로 `hits=1`인 실제 최초 예약을 기준으로 window를 검증했다. 단언·서버 window/횟수를 낮추지 않았다.

## Shared Module Change Verification

공통 인증 middleware의 email/Google/Kakao·가입·메일·token·아이디 찾기를 확인했다. 기존 실패5회/성공 제외·Google 별도 bucket·429 `RATE_LIMITED`/Retry-After를 유지한다. 새503은 DB 제한 확인 실패이며 실제 사용자 credential 거부401과 구분한다. 일반/업로드/AI limiter와 서비스 역할·공통 인증/정책 gate는 바꾸지 않았다.

실제 기존 계정 제거 suite는 다른 도메인이 이미 fenced라는 합성 전제에서 공통 Core를 검증했다. 전용 disposable DB에 누락된 다른 도메인의 trigger를 fixture 준비로만 추가하고 suite 후 제거했다. 이는 AI 코드/운영 migration을 수정하거나 그 도메인의 파기 준비를 완료한 증거가 아니다. 실제 신규 schema에서 다른 writer gap이 남으면 capability는 계속 false이며 우회하지 않는다.

## 운영·개인정보 경계

production DB·실계정·실제 GCS·OAuth·backup 복원은 실행하지 않았다. 새 forward migration 파일과 격리 PostgreSQL 적용만 수행했고 파기 flags/보존기간/법률 게시·재동의는 바꾸지 않았다. 일반 첨부·KYC·사업·타인·공유 자료는 자동 삭제 범위를 늘리지 않고 기존 review 상태를 유지한다. 실제 GCS metadata/version/soft-delete/cache/IAM와 producer/orphan 및 backup 복원 훈련은 운영 검증으로 남는다.

읽기 전용 복원 검사 입력은 현재 최소 증빙과 snapshot에서 권한 있는 운영자가 완전하게 준비해야 한다. 입력이 임의로 누락됐는지 외부 원장을 검증하는 도구가 아니며 `restoreApproved:false`를 항상 반환한다. 계정 UUID digest 비교가 모든 파일·도메인의 복원 안전성을 증명하지 않는다.

문서 정합: 보유기간 정책의 과거 FK fallback/계정-GCS 미연동 설명만 실제 구현 범위로 정합화했다. 보유기간·공개 처리방침 원문·canonical index·과거 CHECK는 변경하지 않았다. PR 결과와 최종 통합 기준은 후속 절에 기록한다.


## 재현 도구·최신 main 통합 후속

- 기존 블로그 제거 PR #831/main `5f778c3a18`을 작업 branch에 정상 merge했다. 충돌 없으며 이번 API 변경과 겹치지 않는다. 다른 작업의 삭제·메뉴 변경은 보존했다.
- 저장소에 전용 fixture 도구 `scripts/privacy/verify-auth-privacy-fixture.mjs`를 추가했다. 사용자 자료가 없는 전용 빈 DB에서만 prepare하고, verify는 소유 표식·canonical 지문·사용자0을 검사한다. `.env`와 임의 DB 주소를 읽지 않는다.
- 이 저장된 도구의 fresh prepare와 verify를 실제 실행했다. **3 suites / 51 tests PASS**(공유 제한7 + readiness4 + 기존 제거40). 다른 도메인의 fixture-only trigger를 finally에서 제거하고 신규 canonical 지문 복구를 확인했다. 위 개별 실행과 중복 합산하지 않는다.
- 운영 이미지 결과를 기동한 합성 로그인 smoke와 graceful shutdown을 확인했다. 테스트 사용자/사업 데이터나 실제 provider 호출은 없다.
- PR [#835](https://github.com/Renagang21/o4o-platform/pull/835)는 OPEN으로 생성했다. 원격 CI/검토 완료 판정은 최종 push HEAD를 기준으로 후속 확인한다. auto-merge·main 병합·배포를 실행하지 않는다.
