# 회원가입·회원관리·자료 삭제 통합 검증

- 기준일: 2026-11-03, 기준 main `53bab48e880cec6760908ff9614d875d6bbc9b39`
- branch: `wo/member-account-lifecycle-20261103`
- 상태: 구현·main 통합·운영 배포 완료. 초기 검증 기록과 2026-11-04 실제 배포 결과를 아래에서 구분한다.
- 사용자 지정: 이 공간은 구현·PR·main 통합·배포 담당이다.
- 작업 목록: [TODO](../work-orders/TODO-O4O-MEMBER-ADMIN-SIGNUP-DELIVERY-V1.md)
- 선행 작업: 원격 `wo/member-erasure-simplification`의 `1a1e5f9a49506056bdffa1c913b9b49523657162`에서 관련 코드만 검토·재사용했다. 그 branch의 WO/CHECK·시험 횟수는 이번 증거에 합산하지 않는다. 당시의 임시 시험 fence는 재사용하지 않는다.

## 처리 결과와 소유 경계

| 대상 | 구현·완료 조건 |
| --- | --- |
| Operator | 일시 이용 정지와 Neture 회원 해지 분리. 해지는 해당 서비스와 직원 소속·접근을 끝낸다. 다른 서비스·공통 계정과 업무 자료를 지우지 않는다. 완전삭제 버튼·API로 연결하지 않는다. |
| Admin 계정 제거 | Operator 사전 정지 없이 원자적 접근 차단·세션 회수 후 durable 삭제 처리. 현재 DB 전체 관리자 권한·보호 계정·Google 인증을 검사한다. 계정/개인 row·파일·미분류 잔여 검사를 모두 통과해야 `completed/erased=true`다. |
| 직원 | 활성 staff/accepted/admin/manager는 store/pharmacy/supplier/semi_franchise 사업체 하나에 소속. owner의 복수 사업체 소유는 허용. API뿐 아니라 DB direct writer와 동시 가입에도 같은 경계를 적용한다. |
| 업무·포럼·강의 자료 | 작성자·업로더라는 이유만으로 삭제하지 않는다. 명시적 attribution만 비우고 사업체/동료 답글/강의 등을 보존한다. 내용·JSON의 미분류 개인정보는 임의 삭제하지 않고 검토한다. |
| 약국 매도 | 현재 Neture 승인 표식을 이전하며 승인 약사인 새 경영자의 활성 계정·자격·소속 확인 후 같은 조직의 소유 관계·면허 이전. 전 경영자 접근·개인 연락처 사본 해제. 사업 증빙 열람은 업로더 대신 현재 조직 소유자 기준이다. |
| 약국 완전폐업 | 매도와 별도 확인. 조직 접근 종료, 정식 폐업 tombstone·writer fence, 최신 Store inventory 및 파일 journal을 통해 실제 자료 파기. 미분류/파일 실패는 폐업 적용·자료 삭제 미완료로 구분하고 재시도한다. 현재 약국 승인 원장·소속으로 폐업 case를 생성하므로 과거 KPA role·active enrollment를 전제로 하지 않는다. 기본 Pharmacy 회원 연결도 정리한다. 기존 계약 종료의 7일 경로는 유지하며 다른 활성 약국의 경영자 권한을 함께 없애지 않는다. |
| 공급자 | Neture 도메인의 canonical organization owner 관계로 전체 대상 공급자를 찾고(legacy user_id로 선택하지 않음), 공급자 개인 연락처·정산 연락/은행 프로필·개인 증빙 연결 제거. 공급자 사업 identity·제품·거래는 개인 계정 FK cascade로 삭제하지 않는다. 조직 managerEmail도 제거한다. 공동 소유/충돌한 legacy 연결과 공유·규제 증빙은 별도 검토한다. |
| 포럼·강의 최종 삭제 | Admin의 기존 콘텐츠·자료 메뉴 아래 진입. 보관된 대상 한 개의 실제 삭제 계획과 관련 row 수를 확인하고 기존 domain final delete를 실행한다. forum stale digest·course blocker는 실패로 갱신한다. Operator 공개/이용 운영과 구분한다. |

## Admin·가입·메일

- 계정·운영 권한 아래 개요와 회원·사업체 관리(전체 회원/공급자/내 매장/삭제 처리 내역), Admin 홈 직접 진입을 제공한다. 기존 업무 운영·운영자 지정은 유지한다. 재사용한 회원 작업 화면은 `adminMode`에서만 전체 계정 제거를 노출한다.
- 변경한 목록은 DataTable + 행/현재 페이지 체크 + `Set` + 상단 ActionBar다. 단일 위험 대상·사유·유지/삭제 범위 확인, 현재 권한 재검사, 실행 중 중복/선택 방지, 검색·페이지·actor/권한 변경의 이전 응답/선택 폐기를 적용한다.
- Neture 가입은 공식 GIS `signup_with`와 카카오/이메일 가입 선택을 32px·같은 폭·정렬로 맞춘다. GIS의 한국어 표시는 공식 `Google 계정으로 가입`, container의 접근성 label은 `Google로 가입`이다. 공식 버튼을 가리거나 iframe을 임의 변형하지 않는다. 카카오 `intent=signup`은 opt-in이며 로그인 기본 문구·높이는 유지한다.
- 미확인 이메일 중복 신청은 같은 공통 확인 안내로 전환한다. 신청 이메일 표시·재발송/로그인·실제 sent/미확인/실패·60초/429 cooldown을 처리한다. password/confirm state는 안내 전 비우며 재가입을 반복하지 않는다. EmailLoginForm과 공유 resend hook을 사용한다. 늦은 응답·중복 요청을 차단한다.
- 기존 Google/카카오 로그인 수단 연결은 이 작업의 변경 대상이 아니다. 자동 계정 검색/자료·권한 병합을 추가하지 않는다.

## 정식 스키마·파일 조사

main의 canonical schema를 전용 PostgreSQL 15로 재현한 결과, 과거 보고와 별개로 실제 13개 fence 누락을 확인했다. 해당 producer는 개인 메일 계정/자식·OAuth, 외부 연결/credentials/requests/settings/errors/client, AI usage reservation이다. 임시 trigger를 설치하는 시험 보정을 제거하고 정식 incremental migration으로만 해결했다.

| 추가 migration | 내용 | 누적 fingerprint / lines |
| --- | --- | --- |
| `1793684890120 CompleteMemberErasureFences` | 13개 writer fence와 DB 단일 직원 소속. 기존 다중 직원 소속 발견 시 데이터 변경 없이 거절 | `894ee65f5593ca245bf16872ef0ea64e3eed387c69ee144d578c98b94b34df47` / 7426 |
| `1793691490120 SeparateMemberResourceOwnership` | 6개 attribution column nullable, 기존 FK SET NULL, 폐업 파일 처리 journal·fence | `8f1a89e4a4b1b02b655bc81f4250493db071fdb2a10cafd33c525f8fcf412044` / 7446 |
| `1793698990120 FenceClosedPharmacyWriters` | 조직 `full_closure_at` 및 현재 UUID organization/store writer 전체의 폐업 fence. 계정/case 제거 후에도 폐업 조직에 새 자료·접근을 생성하지 못함 | `9c5e1bb5494257c578430da1cd297a5a56438ab8e369f619b7db19c3f0cebe76` / 7552 |

최종 canonical metadata inventory: 351 relations, 4350 columns, users FK 98, 명시적 개인 root 50, domain review 후보 294, identity 후보 column 2866, 누락된 개인 root table 0. **후보 수는 실제 개인정보 row/운영 분류 완료 수가 아니다.** 자식 자료·business/log projection은 별도 고정 domain 규칙으로 검사한다. 구조/파일 producer가 추가되면 inventory와 fence 검토가 필요하다.

- 개인 메일/외부 연결 자식·수강 개인 진행/평가·가입 동의를 포함한다. 법정/보안 최소 로그는 원래 생성/발송 기준일·정책 기간을 바꾸지 않고 주소·본문·profile/error 사본을 최소화한다. 임의 사업 감사는 보존 대상을 자동 추정하지 않는다.
- 사업 증빙 업로드는 기존 GCS save에 owner/purpose/document ID metadata를 함께 기록한다. 공급자도 도메인·document·producer prefix로 소유를 입증한다. 기존 미표식 파일을 일괄 소유로 인정하거나 backfill하지 않는다.
- 개인 파일은 계정 avatar·KYC·고정 private root의 첨부와 owned log 사본, typed business-registration/공급자 KYC prefix의 orphan을 조사한다. 전체 공용 버킷을 업로더 기준으로 지우지 않는다.
- 공유 사용을 재확인하고 reference scan부터 외부 삭제까지 DB writer barrier로 보호한다. 세대 pin 중 기다린 peer 참조가 commit하면 다음 pass에서 삭제를 막는 실제 경합도 검증했다. content generation을 먼저 DB에 commit한 다음 실제 외부 삭제를 실행한다. metadata ownership·metageneration도 재검사하며 404/412·교체 세대·실패는 재시도/검토로 남긴다. 원본 문서·manifest를 파일 제거 전에 잃지 않는다.
- 완전폐업은 KPA만이 아니라 해당 조직의 모든 서비스 키에 속한 POP·블로그·동영상·상품 사본·사이니지 자료를 처리한다. 다른 매장의 playlist/media/screen/snapshot 참조는 삭제 전에 검토로 돌려 cascade로 타 매장 자료를 없애지 않는다. 파일 및 DB 제거 중에는 exclusive writer barrier에서 참조를 재검사한다. 일반 계약 종료의 기존 서비스 범위와 7일 대기는 유지한다. 완전폐업은 현재 org/store UUID 소유 table과 sellerOrganizationId·applicant/target organization·service_store_id 업무 참조를 다시 조사하고, 명시적 Store inventory 밖의 nonempty table·unreviewed storage pointer·빠진 fence는 파기를 막는다. 공유 카탈로그 media는 업로더가 전 경영자여도 삭제하지 않는다. 실제 파일 삭제 후 DB 잔여 재검사를 통과해야 `purge_completed`다.

## 검증 증거

모든 DB·파일 검증은 loopback `55469`의 전용 tmpfs PostgreSQL과 임시 파일만 사용한다. 최초 검증의 합성 DB 두 개(각351 table)를 비우고 전용 컨테이너·loopback DB forward·Vite preview를 제거했다. 재리뷰 검증도 같은 이름의 새 전용 tmpfs 컨테이너·합성 DB 한 개에서 완료했고 351 table 잔여0과 컨테이너 제거를 `fixture-cleanup-p2.json`에 기록했다. 마지막 재리뷰의 별도 합성 DB도 잔여0·컨테이너 제거·Vite 종료를 `fixture-cleanup-head4.json`에 확인했다. 실제 운영 계정·업무·GCP 파일을 변경하지 않았고 유료 AI 호출도 없다. native DB/HTTP tests의 GCS adapter는 외부 접근을 거절하는 strict mock 및 임시 파일 adapter다. 이것을 운영 IAM/파일 전수 검증으로 확대하지 않는다.

| 검증 | 결과 |
| --- | --- |
| canonical fresh bootstrap + 전체 57 incremental | PASS, 정식 최종 7552 lines 일치 |
| 기존 main prefix → 추가 3개 → down/up | main 원래 7411 lines와 최종 7552 lines 재현 PASS. populated 폐업의 rollback 거절·기존 중복 직원의 upgrade 거절 PASS |
| 실제 PostgreSQL/HTTP/JWT/임시 파일 | 83 tests PASS (정식 schema, 전용 DB) |
| API 관련 domain·CI 경계 회귀 9 suites + 정식 migration/native ESM 2 suites | 175 + 23 tests PASS |
| 운영자 초대 실제 PostgreSQL/계정 삭제 | 54 tests PASS, official schema fence 0 gaps. API 중복 없는 합계 335 |
| auth-react 24 files | 290 tests PASS |
| Admin 전체 65 files | 657 tests PASS, 후속 UI 변경 집중 41 + AccountControls 회귀도 PASS |
| PC 1440 / mobile 390, 실제 component + 합성 HTTP/GIS | 36 flow checks PASS. 직접 진입/Operator 분리/파일 미완료/재시도/권한 회수/가입 크기/중복 메일·generic resend 포함. 실제 OAuth 제공자 로그인·운영 삭제 검증은 아님 |
| API/Admin type-check, API/Admin/Neture production build | PASS |
| 변경 TS/TSX ESLint | 0 errors, 기존 unused 3 warnings (LMS 2 / ForumComment 1) |

재검증에서 FK 없는 합성 notification이 이전 시험에서 남아 공유파일 검토로 거절됨을 확인했다. 격리 DB의 schema/history를 제외한 **모든 합성 table**을 각 case 전후에 비우도록 정리했다. 제품의 공유파일 검사를 약화하지 않았다. JSX `element={<Layout/>}`의 `/>`를 Route 닫힘으로 읽던 기존 raw regex 검사는 TSX AST로 보완하고 nested relative/없는 경로 회귀를 추가했다.

로컬 재현 환경 Node22.18.0·pnpm10.25.0·PostgreSQL15. 패키지 버전·lockfile·workflow·배포 설정 변경은 없다. 검증 artifacts는 저장소 밖 `/workspace/.o4o-cloud/artifacts/member-account-lifecycle-20261103/`에 둔다. 비밀값/운영 개인 row는 수집하지 않는다.

## 공통 소비처·문자열 census

import 이름만 검색하지 않고 `@o4o/auth-react`, Google/Kakao/Email component명, signup/register 문자열·redirect·공통 route와 forum/asset package 직접/재export 소비처를 함께 대조했다. broad auth census 96 paths, forum/asset 59 paths, Admin 메뉴/권한/route 관련 17 paths에서 시작해 새 파일도 재대조했다.

| 공통 변경 | 소비 범위와 판정 | 검증 |
| --- | --- | --- |
| auth-react 가입/resend | 직접 가입/이메일 login form은 Neture. Pharmacy Business/KPA Branch는 auth wrapper, Store/Lecture/Partner/Account/Hospital/Coop는 공통 로그인/redirect/brand consumer. 기본 login props는 유지, signup opt-in만 변경 | 공통 290 tests·각 서비스 문자열 대조·Neture build·PC/mobile 합성 signup |
| ForumComment/CategoryRequest nullable author + asset snapshot creator | API forum controller/service/recommendation/native ESM·signage/resolver/work-data, Admin CMS import, Neture forum/content와 Pharmacy Business forum consumer | forum/asset package build·API/Admin type-check/build·native attribution/peer preservation·forum/course final deletion |
| Admin menu/권한/공통 회원 작업 | native platform·Admin home·sidebar filtering·platform section·Operator host | AST menu route guard·권한 backend alignment·정보구조·실제 component/브라우저 161+36 검증 |

## 통합·배포 기록 / 운영 잔여

- GitHub 소유자 권한·push dry-run·실제 ruleset 조회 완료. explicit `Promote dry_run=true` 실행 [41584780737](https://github.com/Renagang21/o4o-platform/actions/runs/41584780737) SUCCESS: 배포0, freeze false, 해당 기준 SHA CI green. dry-run을 실제 배포로 세지 않는다.
- 통합 PR [#933](https://github.com/Renagang21/o4o-platform/pull/933). 최초 `ce0dad849c`의 전체 CI에서 구 정책 가정·메뉴 census·추가 의존성 mock 차이를 확인하고 보완했다. Codex P1(현재 Neture 약국의 폐업이 과거 KPA 역할/활성 enrollment를 요구함)을 현재 승인 원장 기반 처리로 수정하고 active/suspended·실제 Pharmacy 기본 연결·현재 role 이전을 검증했다. 후속 `9301e04a61`의 전체 API 3개 shard·실제 PostgreSQL·build·CodeQL은 통과했고, Code Quality에서 카카오 약관 테스트의 deferred 초기화 순서 문제가 드러나 테스트 준비/대기를 수정했다. Codex P2의 완전폐업 서비스 키 누락은 모든 조직 서비스 키 처리 및 타 매장 참조 보호로 보완하고 4개 native 회귀를 추가했다. 파일 소유 metadata와 사용자 ID는 객체 문자열 변환을 허용하지 않도록 scalar 검증을 보완했다. 후속 P1/P2는 실제 최종 삭제 버튼 submit, 회원 정정 producer의 previous/next 최소화(검사와 실행의 공통 필드 목록), 완료 파일 task의 경로 최소화·부모 소유 연결로 수정했다. 실제 정정 함수·UUID 업로드 경로·deleted/already_absent·미완료 manifest 보호를 포함한 4개 DB 회귀와 포럼/강의 버튼 클릭 2개를 추가했다. 지연 응답 UI 시험은 React act 안에서 완료시켜 상태 반영을 기다린다. 최종 HEAD CI·Codex·미해결 thread·main/post-merge는 이 PR의 최신 기록을 기술 gate로 확인한다. 이 문서의 로컬 PASS를 원격 CI PASS로 대체하지 않는다.
- `DEPLOYMENT=MANUAL/GATED` (migration·인증·권한). 자동 배포/개인 삭제 활성화 완료 아님.
- 운영 적용 항목·영향·중지/복구 조건: [운영 적용 계획](../work-orders/ROLLOUT-O4O-MEMBER-ADMIN-SIGNUP-DELIVERY-V1.md).
- 공급자는 legacy user_id=NULL canonical owner·다른 owner의 legacy pointer·공동 소유·실제 증빙 proof SQL도 검증했다. 미분류 legacy JSON·billing/다른 domain 참조·표식 없는/공유 파일은 안전하게 review로 남는다. 현재 운영 자료를 열어 전수 해결했다고 주장하지 않는다. 시스템별 1/2년 분류·storage list/get/delete IAM·approved inventory와 환경 설정을 확인하기 전 개인 삭제를 활성화하지 않는다.
- 신규 최소 증빙/삭제 운영 내역의 자동 만료 job 등록은 이 작업에 포함하지 않는다. 명시적 기존 maintenance 경계와 정책 기간을 유지한다. 직접 gcloud IAM 조사는 이 공간에 identity가 없어 미실행이다. serving SHA는 승인 후 정상 Delivery/Promote의 WIF 조회 artifact로 검증할 수 있으며 이를 위해 이 공간에 새 GCP token을 추가하지 않는다.

문서 정합: 역할 Architecture·Store 소속·개인정보 정책의 현재 사용자 결정을 정렬하고, 기존 기간/게시 원문/과거 WO·CHECK는 변경하지 않았다. 선행 remote 기록은 해당 commit에 보존한다. 구현·시험 성공을 운영 활성화 완료로 표현하지 않는다.

## 후속 정정·운영 배포 (2026-11-04 한국 시각)

운영 자료 삭제 테스트 금지를 사용자 지시로 단정했던 설명을 철회했다. 기존 실제 검증·미실행 사실은 변경하지 않는다. 운영 DDL 포함 배포를 승인받아 [Promote 41742629940](https://github.com/Renagang21/o4o-platform/actions/runs/41742629940)을 실행했다. main은 `4fcc28acdbc082705d0cd675c349392daca577eb`이며 CI·CodeQL 성공과 PR #933 병합을 확인했다. 실제 운영 적용·serving·공개 smoke 결과는 아래 후속 기록으로 추가한다.


### 실제 완료 결과

- 승인: 2026-11-04 사용자 배포 지시. 운영 DDL 포함 정상 Promote 실행 승인으로 반영했다.
- main PR #933 병합 `4fcc28acdbc082705d0cd675c349392daca577eb`, post-merge CI·CodeQL PASS.
- [Promote 41742629940](https://github.com/Renagang21/o4o-platform/actions/runs/41742629940) SUCCESS. API migration Job `o4o-api-migrations-vr7h8` 성공, API verified smoke·트래픽 전환 성공.
- 최종 Report `production=DEPLOYED`: API·Admin·partner·neture·kpa-society·lecture·store·kpa-branch 모두 serving SHA `4fcc28acdb` 확인. API revision `o4o-core-api-04357-mey`, Admin `o4o-admin-dashboard-01718-naj`.
- [협동조합 앱 41743565064](https://github.com/Renagang21/o4o-platform/actions/runs/41743565064) SUCCESS. `frontend_only=true, apply=false`, private smoke와 검토 revision 100% 트래픽 검증. 조합 fixture 등록 단계는 skip했다.
- 공개 확인: API health 200, 비인가 erasure-readiness 401, Admin 회원 경로·Neture 가입 화면 200. 새 Admin 자산 `index-nBwK2m4b.js`에 ‘회원 해지’·‘계정·개인자료 삭제 확인’이 있고 ‘회원 삭제’·‘완전 제거 요청’은 없다. 실제 로그인 계정의 삭제 명령을 실행한 검증으로 확대하지 않는다.
- 계정 완전삭제 활성화 설정은 이번 배포에서 추가하지 않았다. 파일 소유·공유 inventory 및 보존 분류·IAM 확인은 활성화 준비 잔여이며, 사용자 금지 지시가 원인인 것으로 설명하지 않는다.
- 검증 artifacts: 저장소 밖 `/workspace/.o4o-cloud/artifacts/member-account-lifecycle-20261104/`. 실제 개인정보·자격증명 값을 문서에 기록하지 않는다.
