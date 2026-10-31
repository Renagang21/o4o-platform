# Pharmacy 승인·기본 회원 연결 검증

> **상태**: COMPLETED — 구현·main 통합·선택 3서비스 배포 검증 완료. 공개 MegaPharm DNS·개별 자격 개통은 별도.
> **작성일**: 2026-10-31 (Asia/Seoul)
> **근거 WO**: [Pharmacy 승인·자동 회원 연결](../work-orders/WO-O4O-PHARMACY-APPROVAL-AUTO-MEMBERSHIP-V1.md)

## 변경과 정책 경계

- 약국 승인/재활성화와 기본 `pharmacy` 사업 가입을 동일 transaction으로 연결한다. 기존 active는 유지하고 pending만 활성화한다. 기존 rejected/suspended/terminated는 보존한다.
- 기존 승인 약국의 누락은 기존 Pharmacy apply POST에서 현행 약국 승인·경영 관계·개인 약사 자격·공통 계정 상태를 확인해 연결한다. 반복/동시 요청은 가입 1건과 연결 감사 1건만 남긴다.
- Pharmacy 기본 연결에 독립 사업용 추가 신청·약관 심사를 중복 요구하지 않는다. 기존 약국 신청 동의는 유지하며 별도 약관·거래 동의를 자동 생성하지 않는다. MegaPharm·CarePharm은 기존 독립 신청을 유지하고 Pharmcoop 개인 가입·권한은 변경하지 않는다.
- Store 신청·사업 목록, Pharmacy 참여/접근 안내를 맞춘다. 선택 약국·URL query/hash·계정 전환의 기존 격리를 유지한다. 운영자 역할·새 role·global membership을 발급하지 않는다.

## 검증

| 항목 | 결과 |
|---|---|
| 빈 격리 PostgreSQL 15 canonical baseline + incremental | 52 prefixes fingerprint PASS |
| API 도메인/원장 회귀 | 30 suites / 263 tests PASS, 별도 DB 환경 미설정 14 suites / 204 tests skipped. 전용 실DB 추가 확장 전 결과이며 아래 14 tests를 별도로 재검증 |
| 전용 실DB 승인·가입 검증 최종 | 14 tests PASS — 동시 실행/멱등, 승인과 연결 원자성, 기본 사업 닫힘 시 rollback, 현행 자격·소속, 기존 제재/탈퇴, 약국 정지·재활성화, 실제 회원 업무 접근, 타 사업 미자동가입, 기존 pending 복구와 감사 ID |
| 기존 승인/접근·공급자 매장 fixture 정합 | 실제 PostgreSQL 대상 4 tests PASS. 약국 승인·서비스 접근 3개, 공급자→매장 suite의 준비 및 기존 공개 자료 보존 1개. 두 suite의 나머지 62 tests는 선택 실행에서 skipped이며 주문·결제·배송·정산 전체 검증을 뜻하지 않음 |
| API type-check | PASS |
| 약국 앱 전체 UI | 23 files / 172 tests PASS |
| Store 신청/협업체 진입 | 2 files / 11 tests PASS |
| Pharmacy Business·Store production build | PASS |
| Pharmacy·MegaPharm desktop/mobile 합성 브라우저 | 4 scenarios PASS — 선택 약국, Pharmacy 즉시 연결·추가 동의 없음, MegaPharm 동의/승인 대기, 기존 active 약국 전환, 탈퇴 후 자동 연결 미노출, query/hash 유지, page error 0·가로 넘침 없음 |

새 API 동작은 실제 PostgreSQL과 기존 서비스/회원 guard로 확인했고 브라우저 API는 합성 fixture다. 운영 실계정의 실제 승인·가입을 수행한 것으로 해석하지 않는다. 스크린샷은 private `.onboarding/pharmacy-auto-shots`에 유지하며 mobile 육안 확인했다.

최초 DB 실행은 canonical 기본 사업 중복 생성으로 setup 실패했다. fixture를 기존 기본 사업 재사용으로 수정하고 재검증했다. 기존 승인 단위 테스트와 UI 테스트는 옛 별도 신청 전제를 보완했고 조건·동의 회귀는 독립 사업에 유지했다. 최초 웹 빌드는 오래된 auth-client/UI 산출물 때문에 실패해 기존 package build를 실행한 뒤 통과했다. 첫 Store build 호출은 잘못된 filter로 미실행이었으며 실제 `store-web`과 `--fail-if-no-match`로 정정해 검증했다. 무관한 소스·의존성·CI 설정 변경 없음.

자동 리뷰에서 TypeORM UPDATE RETURNING의 `[rows, affectedCount]` 형식을 놓친 결함 1건을 확인했다. 기본 회원 연결의 UPDATE를 기존 `rowsOf`로 정규화했다. 기존 승인+pending 가입의 연결 응답과 감사 원장의 실제 membership ID, 승인 시 pending 활성화 감사 ID를 추가 검증해 14 tests PASS. 초기 13개 테스트가 이 반환값·감사 ID까지 확인한 것으로 확대하지 않는다. ESLint 오류 0이며 기존 BusinessWorkspace hook dependency warning 1건은 범위 밖으로 유지했다.

격리 검증 종료 시 합성 사용자 0건을 확인하고 이 작업의 DB 컨테이너·volume·preview를 정리했다. private 재현 스크립트·로그·스크린샷은 저장소 밖 `.onboarding/pharmacy-auto-*`에 유지한다. CI·재리뷰는 [PR #903](https://github.com/Renagang21/o4o-platform/pull/903)의 최신 HEAD를 기준으로 확인하며 main 병합·배포 완료 증거로 대체하지 않는다.

추가로 조건부 통합 테스트 두 파일의 ‘Pharmacy 별도 신청/승인’ 전제를 자동 연결·멱등 확인으로 맞췄다. 기존 fixture의 약사 자격 누락으로 먼저 차단됐고, 합성 승인 자격 및 길이 제한에 맞는 고유 면허번호를 준비한 뒤 선택한 4개가 통과했다. 자격 guard나 거래 구현을 완화하지 않았다. 이 추가 검증은 별도의 loopback `55432` 컨테이너와 두 disposable DB에서 실행했고 종료 후 컨테이너·volume 전체를 제거했다. 전용 14개 suite의 사용자 0건 확인과, 기존 통합 fixture의 전체 volume 폐기를 구분한다.

## 개발 인계 시점의 운영 반영 경계

최초 개발 인계 단계에서는 main 병합·auto-merge·운영 DB write·배포를 실행하지 않았다. 이후 통합·배포는 아래 후속 승인 절에 기록한다. 기존 승인 약국의 일괄 backfill·동의 이력 재작성은 없으며 회원의 연결 확인을 통한 누락 보완 경로를 제공한다. 기존 제재·탈퇴 복구는 운영자의 별도 확인 대상이다.

문서 정합: 사용자 확정에 따라 현행 인증/가입 정본·운영 책임 V2·약국 commerce 설계의 Pharmacy 기본 회원 예외를 반영했다. 다른 사업의 독립 가입 계약과 과거 WO/CHECK 본문은 유지한다. 개발·인계 완료를 운영 적용 완료로 표시하지 않는다.

## 후속 승인에 따른 main 통합·배포

2026-10-31 사용자가 main 병합·배포·운영 데이터 변경을 추가 지시했다. 앞 절의 미실행 표기는 최초 개발 단계의 실행 경계이며 아래 후속 결과를 대체하지 않는다.

| 단계 | 실제 결과 |
|---|---|
| 최신 main 반영 | `086fbabda3`와 충돌 없음, PR HEAD `87522125f8`, 관련 UI 28 tests PASS |
| PR gate | [CI 41204389666](https://github.com/Renagang21/o4o-platform/actions/runs/41204389666)·SonarCloud·Guard Static Analysis PASS, 해당 HEAD Codex completed/지적 0, 기존 UPDATE 지적 스레드 해결 |
| main 병합 | [PR #903](https://github.com/Renagang21/o4o-platform/pull/903), merge `21301b7e5610f867e4983060f6f8ade8206cdb97` |
| 병합 후 CI | [41205408613](https://github.com/Renagang21/o4o-platform/actions/runs/41205408613) SUCCESS, CodeQL SUCCESS |
| 자동 Delivery | [41206410479](https://github.com/Renagang21/o4o-platform/actions/runs/41206410479) SUCCESS, `HELD_LEVEL_3`: API L3 + Pharmacy/Store API 의존. 보류를 배포 완료로 보고하지 않음 |
| 통제 배포 | [41206528204](https://github.com/Renagang21/o4o-platform/actions/runs/41206528204), target `21301b7e56`, 선택 `api,kpa-society,store`, SUCCESS |
| API | 새 revision 준비 상태 smoke, verified 트래픽 전환, 전환 후 검증 SUCCESS |
| Pharmacy Business·Store | 각각 새 revision smoke·트래픽 전환·배포 확인 SUCCESS. 마지막 GCP 읽기 전용 서빙 SHA 대조 SUCCESS, `production` status `DEPLOYED · deploy: api,kpa-society,store` |

선택한 서비스만 승격했고 다른 작업의 배포가 종료된 뒤 진행했다. 사전 classify artifact의 이전 serving SHA/revision은 배포 전 비교 기준이며 최종 revision으로 기재하지 않는다. 로컬 GCP outbound identity 없이 기존 Actions WIF·freeze·CI·SHA gate를 사용했고 직접 변수 조회 HTTP 403을 이유로 설정·권한을 바꾸지 않았다.

### 공개 응답과 운영 데이터 확인

- Pharmacy: HTML 200, `/assets/index-BtFWzc2s.js` 200/JavaScript, 새 기본 회원 안내 코드 확인.
- Store: HTML 200, `/assets/index--yVAMJWk.js` 200/JavaScript, 신청 화면 chunk의 기본 회원 안내 코드 확인. 전환 도중 관측한 이전 자산 경로는 전환 후 SPA HTML fallback이 되어, 상태 코드만 보지 않고 MIME·새 자산·내용을 재검증했다.
- API: 허용된 Pharmacy 동일 출처 proxy의 `/api/health/ready` 200/JSON, `status=ready`.
- MegaPharm: `megapharm.neture.co.kr` DNS 해석 실패와 proxy CONNECT 403. 원래 사용자 문맥의 다른 철자 `magapharm.neture.co.kr`도 DNS 해석 실패. 새 배포 전부터의 관측이며 DNS/IAM 변경이나 우회 접속을 하지 않았다. 공개 MegaPharm 정상 응답으로 확대하지 않는다.
- 자산 사전 표본은 rollout 중에 수집돼 Pharmacy가 이미 새 자산이었다. 해시 차이만으로 배포 전후를 판정하지 않으며 workflow의 최종 serving SHA 대조·공개 새 자산 확인을 배포 근거로 사용한다.
- 지정 점주: 로그인 200, 접근 매장 1/owner, 본인 약국 원장 active, 계정 기준 서비스 접근 판정 `allowed=true`, 기본/Pharmacy 가입 상태 active. 기존 회원 연결이라 중복 쓰기나 전체 약국 backfill을 하지 않았다. 개인 약사 자격 `unrequested`, 세 사업 회원 업무 403을 유지했으며 자격을 임의 승인하지 않았다.
- Pharmcoop: 공개 조합 1, 지정 local admin 관리 조회 200, 개인 회원 조회 200/`person`, 회원의 관리·역할·약국 header 혼합 403. 원래 전역 역할·매장 연결 fingerprint 동일, 연합회 역할 없음 유지.
- 실제 신규 승인·주문·공지·문의 등의 테스트 업무 데이터를 운영에 만들지 않았다. 정상 인증의 보안/감사 기록은 기존 보존 정책을 따른다. 실제 계정값·면허번호·기관/개인 식별자·운영 응답 원문은 공개 기록에 넣지 않는다.

공개 DNS와 개인 약사 자격 개통은 후속 운영 항목이다. 회사 정보가 없는 CarePharm 초안을 게시하거나 다른 사업 회원을 자동 생성하지 않는다. 기록용 후속 변경은 문서-only이며 `DEPLOYMENT=NOT_APPLICABLE`이다.
