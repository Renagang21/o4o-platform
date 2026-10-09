# CHECK-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1

> 작성일: 2026-10-09 · 상태: ACTIVE
> 작업: [WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1](../work-orders/WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1.md)
> 착수 main: `0f8535d6b1` · PR 준비 기준 main: `3d5f4349ad` · main 결합 기준: `03f9729856`(PR #372·#374·#375·#378·#379) · branch: `wo/pharmacy-hub-full-retirement-v1`

## 1. 결과와 남은 실행

| 구분 | 상태 | 근거 |
|---|---|---|
| 코드 제거 | 1차 main 반영·보완 PR 준비 | #375가 PH 웹·전용 API·배포 경로를 제거했고 #373이 공통 진입·신규 쓰기·원장 후속 처리·운영 삭제 인계를 보완 |
| 로컬 검증 | PASS | API·웹 빌드와 관련 회귀 검증은 아래 §3 |
| main 통합 | 대기 | PR required CI·리뷰 후 저장소 AGENTS §4-1(e)의 사용자 통합 승인 필요 |
| 운영 배포 | 대기 | 배포 판정 `LEVEL_3`·`deploy_required=true`; main 통합과 별도 통제 배포 |
| 실제 PH 인프라·도메인·인증서 삭제 | 로컬 인계·미실행 | 사용자가 로컬에서 수행한다고 결정. 이 환경의 credentials/secrets·outbound identity는 비어 있어 실제 조회·삭제 결과 없음. WO §5·§6의 절차와 인계문 사용 |
| 설치 Local Agent 갱신 | 로컬 인계·미실행 | origin 차단 코드와 loopback HTTP 회귀 검증은 완료. 도메인 등록 종료 전에 설치 PC의 실제 실행 사본 갱신·재시작·차단 확인 필요 |
| 운영 업무·모바일 smoke | 미실행 | 테스트 계정 로그인·실제 운영 배포 검증은 이 로컬 코드 검사에 포함하지 않음 |

**코드 삭제가 Cloud Run·DNS·인증서 삭제를 뜻하지 않는다.** 과거 인쇄 QR·옛 호스트·인증서의 보존이나 리다이렉트는 폐기됐고, 삭제 대상 자체는 확정됐다. 접근 권한이 있는 운영 실행자가 [WO §5](../work-orders/WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1.md#5-운영-인프라-제거-절차)의 최신 참조 조회·공유 자원 보호·삭제·확인 절차를 수행해야 전체 퇴역이 완료된다.

## 2. 제거와 보존 경계

- 삭제: `services/web-pharmacy-hub`, PH 전용 controllers/routes/scope/signup/provisioning/cart wrapper, Store의 `/work/pharmacy-hub`·결제 복귀·API adapter·메뉴, 공통 legacy PH handoff와 StoreOwnerGuard 설정, 공급자 PH 제공 설정의 API·화면.
- 신규 진입 차단: 서비스 catalog·public origin·session origin·서비스 약관 범위·Store membership 대상·운영자 부여 목록·공급자 콘텐츠 제공 대상에서 PH 제거.
- 공통 쓰기 차단: PH owner/member 역할로 공통 Store에 진입하거나 이용권 결제·활성화, 외국인 파트너/QR 자산, CMS 콘텐츠/슬롯을 생성·수정·전이할 수 없다. PH 역할은 과거 회수 식별자로만 남는다. 초대 수락은 PH role을 발급하지 않고 PH 전용 초대는 관계를 활성화하지 않는다. 과거 PH QR의 신규 scan event도 생성하지 않는다.
- 공통 모집 차단: PH 모집 생성·재개·노출 승인·신규 신청·참여 승인은 410 `SERVICE_RETIRED`. 복수 생성 요청에 PH가 하나라도 있으면 전체 거절하며 public/Store 참여 목록에서도 제외한다. 과거 공급자/운영자 조회·마감·노출 반려·신청 반려/철회/해지는 보존한다.
- 동의 판정: 과거 PH 이용약관·경영자 계약은 pending에서 제외하고 신규 승낙은 410으로 거부한다. PH 미동의가 현재 서비스 전체를 막지 않으며 현재 서비스 약관은 계속 요구한다. 약관·동의 원장 삭제나 동의 backfill은 없다.
- Local Agent: PH root/www를 pairing origin에서 제거했다. 두 origin의 health/preflight/pair가 403으로 종료되고 Neture 정상 pairing은 유지된다. 설치 사본의 업데이트는 별도 로컬 실행이다.
- 공통 관리: 전체 관리자도 PH 역할 선택·부여·신규 정의 생성과 PH 가입 승인·재활성화·active 전이를 할 수 없다. 과거 역할 식별 조회·회수·가입 거부/정지/탈퇴는 유지한다. 전체 복구에 PH와 현재 가입이 섞여 있으면 현재 가입만 복구한다.
- 매장 구성원 요청: 명시적 PH `serviceKey`를 서비스 미지정으로 바꾸지 않고 410으로 거부한다. PH·현재 역할을 함께 가진 사용자, 반복 query·공백 입력도 동일하다. 서비스 미지정 초대도 PH 전용 조직이면 생성 전에 거부하며 현재 linkage와 PH 이력이 함께 있는 매장의 초대는 유지한다.
- 서비스 미지정 조직 후보: PH 전용 조직은 owner·staff·구매 조직 후보에서 제외한다. 현재 역할·가입과 과거 PH 조직 선택 헤더가 함께 있어도 PH 자료·진열 쓰기가 불가능하다. 현재 내 매장 원장(active)만 승인된 조직은 세미프랜차이즈 가입·slug 없이 유지하고 PH 이력이 함께 있어도 초대 수락·현재 member 접근을 유지한다.
- 공통 공급: `products/from-master` 신규 Offer 생성은 PH 공급 키가 포함된 혼합 요청도 저장 전에 거부한다. 과거 Offer 키를 삭제하거나 기본 공급으로 바꾸지 않는다.
- 공개 매장: PH slug·PH에서 변경된 과거 slug·PH로 향하는 과거 slug 리다이렉트는 404로 종료해 관심 요청을 저장하지 않는다. PH 전용 조직의 QR은 스캔 이벤트 기록 전에 종료한다. PH 원장과 현재 서비스 주소가 함께 있으면 현재 Store 요청·QR은 계속 처리한다.
- DB 공개 catalog: active PH 행도 익명·로그인 사용자 목록에서 제외한다. 현재 서비스의 가입 상태 표시와 전체 관리자의 catalog 이력 조회는 보존하며 DB write는 없다.
- 재배포 제거: 웹 CD 등록/job/env/summary와 lockfile의 PH importer 제거. PH 앱 삭제 diff를 배포 detector의 비실행 경로로 처리해 unknown-path 전체 배포 fallback을 막는다. 남은 웹 배포 job은 6개이며 병원약국 job을 유지한다.
- 유지: 기존 PH 주문의 공급자 공통 조회·후속 처리 service key, 이미 기록된 PH 결제 완료 이벤트 handler, 독립 약사 커뮤니티의 PH 저장 코드. 기존 role 표시·회수와 DB/migration의 과거 식별은 남긴다. 신규 PH 서비스나 호환 웹/API를 열기 위한 코드가 아니다.
- 운영 DB write·schema/migration 변경 없음. 상품의 기존 PH `service_keys`를 지워 기본 공급으로 전환하는 backfill이나 테스트 데이터 삭제 없음.
- `pharmacy.neture.co.kr`은 **O4O 약국 경영지원**, `store.neture.co.kr`은 매장 실행, `community.neture.co.kr`은 독립·사업 회원 커뮤니티다. 이 서비스를 제거하거나 PH로 통합하지 않는다.

## 3. 검증

Node 22.18.0 · pnpm 10.25.0 · frozen/offline install. 아래는 실제 로컬 실행 결과이며 운영 smoke가 아니다.

| 검증 | 결과 |
|---|---|
| API 의존성 `build:packages` | PASS |
| API `@o4o/api-server type-check` | PASS |
| Store·Neture(공급자 포함)·관리자 production build | PASS |
| KPA 약국 경영지원 production build | PASS |
| 변경 소비처·공통 쓰기/권한·모집·동의 판정·최신 main 결합 API Jest | **247 suites · 4,577 tests PASS** · 253 suites 중 DB integration 6개(48건) SKIP |
| 최신 main(PR #378·#379) 결합 후 Neture Vitest | **46 files · 375 tests PASS** |
| 관리자 운영자 지정 Vitest | **2 files · 10 tests PASS** |
| 최신 main 결합 인증 공통 패키지 Vitest | auth-client **34** · auth-context **16** · auth-react **156** tests PASS |
| 최신 main 결합 관리자 cookie session Vitest | **1 file · 3 tests PASS** |
| 공유 guide/community `shared-space-ui` Vitest | **8 files · 63 tests PASS** |
| 공통 운영 `operator-core-ui` Vitest | **4 files · 43 tests PASS** |
| `store-ui-core` Vitest | **8 files · 121 tests PASS** |
| 공유 `@o4o/ui` Vitest | **1 file · 10 tests PASS** |
| CD detector/risk/workflow/orchestration + PH URL map planner Node tests | **332 tests PASS** · CI blocking Node 목록 전체 |
| Local Agent CI Node tests + PH origin 실제 loopback HTTP | **75 tests PASS** · native bridge·local DB·browser DOM·pairing 차단 |
| `git diff --check` | PASS |
| 문서 민감정보 검사 | PASS · 9 files · 패턴 0건 · 현행 docs 8개와 Agent README |

PH 원본 파일의 존재와 가입 성공을 기대하던 퇴역 전용 spec은 삭제했고, 여러 서비스가 공유하는 spec은 PH 사례만 제외했다. 현재 대상의 가입 상태 유지·권한 차단·조직 경계·공급자 원장·독립 약사 포럼 검증은 유지했다. 새 퇴역 spec은 PH origin/역할/Store 문맥/신규 콘텐츠 제공을 막고 현재 서비스 및 기존 원장 조회가 유지되는지 검사한다. URL map planner는 혼합 host rule·공유 matcher/backend·weighted backend·잘못된 matcher를 검증하며 PH를 다른 호스트로 리다이렉트하지 않는다.

## 4. 문서 정합

현행 commerce DESIGN §16과 서브도메인 의미 정본 §2-2를 사용자 결정으로 갱신했다. PH 모델 baseline에는 대체된 기준을 명시했고 B2B 주문 계약에는 PH 신규 producer/API 퇴역과 기존 결제 완료·원장 조회 보존의 차이를 정정했다. 과거 WO·CHECK의 당시 배포 결과는 덮어쓰지 않는다. 이 CHECK는 실제 운영 삭제 완료를 주장하지 않는다.

Store 접근 정본과 Store Owner RBAC §3.1/§3.1-A도 정정했다. PH 역할 이름·linkage가 원장/회수 규약에 남아 있어도 현재 접근·발급 목록에는 없다는 점을 명시한다.

PH 모델 baseline은 표준 `상태: SUPERSEDED · 대체 문서 · 표기일` 상태 줄로 정정하고 본문을 과거 기록으로 보존했다. canonical index의 ACTIVE 행 변경은 AGENTS §8·색인 §0의 별도 WO 규칙에 따라 [문서 WO](https://github.com/Renagang21/o4o-platform/blob/c988cf53380eff25e5587a4fc79db247aa03aa48/docs/work-orders/WO-O4O-PHARMACY-HUB-CANONICAL-INDEX-ALIGNMENT-V1.md)·PR #380으로 준비했다. #373을 먼저 main에 반영하고 #380을 이어 통합한다. main PR #375의 당시 WO는 실행 기록으로 보존하며 그 QR 리다이렉트 서술을 현행 지시로 쓰지 않는다.

## 5. PR 리뷰와 전체 CI 보완

첫 PR HEAD `b163163719`에서 Codex가 삭제된 PH 가이드·웹 파일을 읽는 공통 패키지 테스트 5개 파일을 지적했다. 해당 서비스 사례만 제거하고 KPA·Neture 및 공통 컴포넌트의 테스트는 유지했다. `shared-space-ui` 63건·`operator-core-ui` 43건이 통과했다. 첫 CI의 API 실패는 현재 catalog에서 빠진 PH를 활성 Store/운영자 대상으로 기대하던 fixture와 서브도메인 설명의 누락을 확인해 정정했다.

추가 API 검증에서는 독립 약사 커뮤니티의 과거 PH 게시판 운영 권한이 끊어지는 실제 결함을 발견했다. `ForumControllerBase`가 게시판의 `service_code`를 웹 진입 목록에서 찾고 있었다. 원장 식별용 `communityKeyForForumStorageCode`를 catalog의 기존 `forumStorageCodes`로 구현하고 이 판정에서 사용한다. 퇴역 PH 웹 진입은 계속 없으며, 독립 약사 커뮤니티의 기존 PH 저장 게시판은 현재 community 운영 승인으로 판정한다. `legacy-community-closed-forum-operator.spec.ts`의 PH 사례는 삭제하지 않고 기존 글의 관리·다른 운영자 차단을 검증한다.

보완의 확장 API 3,832건과 type-check가 통과했다. required CI/Codex 재검증 상태는 PR에서 확인한다. 첫 HEAD의 CI 실패를 최종 성공으로 표시하지 않는다.

두 번째 HEAD `3f36b3b5d9`의 리뷰는 URL map 검증 테스트의 PH 호스트도 제거해야 한다고 지적했다. planner가 PH root/www/하위 호스트의 테스트를 함께 제거하고 다른 호스트의 테스트는 유지하도록 보완했다. 테스트의 기대 backend는 실제 라우팅 참조에서 제외한다. 신규 회귀 2건을 포함해 planner 8건과 blocking Node 검사 전체 332건을 검증했다. 이는 로컬 초안 생성 검증이며 실제 GCP import·삭제를 수행한 결과가 아니다.

세 번째 HEAD `c1b5980367`은 CI Gate·SonarCloud·CodeQL을 통과했지만 리뷰가 공통 매장/CMS의 PH 신규 쓰기 잔여를 지적했다. UI 제거만으로 이 API들을 종료하지 못했던 문제를 보완했다. 직접 HTTP 호출에서 기존 PH 회원·운영자·전체 관리자도 PH 콘텐츠를 생성·수정·전이하지 못하고, 신규 이용권 결제/활성화·파트너·QR 생성도 차단되는지 검사한다. CMS 슬롯 GET·기존 이용권 GET은 유지한다. 현재 서비스의 owner/member·초대 수락과 PH 전용 초대/역할 발급 차단도 함께 검증한다. 이 보완 후 최신 커밋의 required CI/Codex를 다시 확인하며 이전 HEAD 성공으로 대체하지 않는다.

검토 중 main에 PR #372·#374의 커뮤니티 운영자 권한 수정이 통합됐다. #374와 PH 제거가 `routes/operator/membership.routes.ts`에서 실제 충돌해, 두 정책을 함께 검증하기 위해 최신 main을 전용 작업 branch에 merge했다(원격 이력 재작성 없음). PH 역할은 허용 목록에서 제외하고 `community:admin`/`community:operator`, `injectOperatorServiceScope`와 새 회원 쓰기 범위 검사를 유지했다. main branch 자체와 운영 runtime은 변경하지 않았다. 이 결합 결과를 검증해 PR로 준비하며 실제 main 반영은 사용자 통합 승인 후 PR merge로만 수행한다.

결합 후 API 4,180건·type-check, Neture 375건·production build, 관리자 운영자 지정 10건이 통과했다. DB가 필요한 `neture-pharmacy-commerce.integration`, `store-owner-termination.integration`, `forum-summary.integration` 3개 suite는 SKIP했다. 실제 운영 테스트 계정·모바일 smoke와 PH 인프라 삭제는 여전히 미실행이다.

추가 리뷰에서는 Local Agent의 PH origin 신뢰, 공통 모집의 PH 신규 생성/참여, 과거 PH 약관이 현재 API 전체를 차단하는 문제가 확인됐다. PH origin을 제거하고 실제 loopback HTTP에서 nonce 발급·pairing·preflight 차단과 Neture pairing 유지를 검증했다. 모집은 생성·재개·노출/참여 승인·신규 신청을 차단하며 원장 조회·종결은 보존한다. 약관은 PH pending만 제외하고 현재 서비스의 428/승낙 후 통과를 유지한다. 전체 변경 소비처를 다시 실행해 API 4,197건과 type-check, CI Node 332건, Agent Node 75건이 통과했다. 최신 PR HEAD의 required CI·Codex 결과는 PR에서 확인하며 이전 HEAD의 성공으로 대체하지 않는다. WO §5·§6에는 설치 Agent의 수동 갱신·실행 사본 확인을 도메인 등록 종료의 선행조건으로 추가했다. 설치 PC 갱신·GCP/Gabia 삭제를 이 검증의 완료 항목으로 표시하지 않는다.

HEAD `42bd366674`의 CI Gate·SonarCloud는 통과했으나 재리뷰가 공통 역할 부여·가입 재활성화·신규 Offer 입력을 지적했다. PH prefix와 catalog 항목은 전체 관리자에게도 신규 부여를 거부하고 역할 선택 목록에서 제외한다. PH 가입은 승인·재활성화·active 전이를 거부하며 전체 복구의 PH 원장은 건너뛴다. 직접 HTTP에서 오류가 410으로 전달되는지, 현재 서비스의 역할 부여·과거 PH 역할 조회/회수 및 거부·탈퇴가 유지되는지 검증한다. Offer 생성은 PH 키가 포함된 요청을 저장 전에 거부하며 과거 공급 키를 지우지 않는다. 현재 서비스의 상태 전이·사업자정보·정지 경계 검증은 유지하고, 퇴역 PH의 양수 전이를 요구하던 fixture는 현재 서비스 사례로 옮겼다. 이 보완의 최신 HEAD에서 required CI·Codex를 다시 확인한다.

공통 관리·신규 Offer 보완 후 관련 그래프와 raw 소비처를 합친 API 233 suites를 실행했다. 229 suites·4,345 tests와 API type-check가 통과했고 DB integration 4개(36건)는 SKIP했다. 최신 PR HEAD의 CI·리뷰 결과와 실제 운영 실행은 별도로 확인한다.

HEAD `c0d1313ad7`은 CI Gate·SonarCloud·CodeQL을 통과했으나 재리뷰가 공개 Store 관심 요청·QR 스캔의 PH 신규 기록을 지적했다. 공통 공개 Store resolver가 active/inactive PH slug와 PH로 향하는 과거 주소를 404로 종료하도록 보완했다. 공개 QR resolver는 PH 전용 조직의 스캔 INSERT 전에 종료하며 PH 주소를 화면 해석 축에서 제외한다. PH 원장과 현재 서비스 주소가 함께 있으면 현재 Store 관심 요청·QR 스캔은 유지한다. 실제 HTTP의 기록 차단·현재 서비스 보존과 명시적 PH 호출의 조회 차단을 검증하고 변경 소비처를 재검사한다. 최신 HEAD의 CI·리뷰는 이전 커밋의 성공으로 대체하지 않는다.

공개 Store·QR 보완 후 변경 그래프·raw 소비처를 합친 API 235 suites에서 231 suites·4,359 tests가 통과했다. 기존 DB integration 4개(36건)는 SKIP했고 API type-check도 통과했다. 공개 HTTP 차단과 현재 서비스의 관심 요청·스캔 보존을 포함한 결과이며 실제 운영 DB·로그인·모바일 검증은 아니다.

HEAD `b591ff85e0`의 재리뷰는 DB 기반 공개 catalog의 PH 링크와 PH 정본 상태 모순을 지적했다. 공개 목록에서 PH 키를 제외하고 익명·로그인 HTTP 응답, 현재 서비스 가입 상태, PH-only 목록, 관리자 원장 조회와 DB 쓰기 없음의 회귀를 추가했다. baseline은 표준 SUPERSEDED 표기로 정정하고 canonical index는 별도 PR #380으로 정렬한다.

검토 중 main에 PH 1차 제거 PR #375(`8fa26f9293`)가 통합돼 이 작업과 40파일에서 충돌했다. 충돌을 대조하고 완전 퇴역의 공통 차단·현재 서비스 회귀 검증을 유지해 결합했다. 기존 주문의 PH 결제 완료 처리까지 1차 삭제에 포함돼 있었으므로 신규 producer 없이 역사적 완료 handler와 초기화는 보존한다. #375의 PH 홈 진입 제거·README와 당시 WO는 유지한다. 실제 main 변경은 이 세션에서 수행하지 않았으며 현재 보완은 #373의 승인·merge 대기다.

PR #375 결합과 DB catalog 보완 후 API 236 suites에서 232 suites·4,363 tests 및 type-check가 통과했다. DB integration 4개(36건)는 SKIP했다. Neture 46 files·375 tests와 CI blocking Node 전체 332건도 재검증해 통과했다. 최신 커밋의 required CI·Sonar·Codex는 PR에서 확인한다.

HEAD `29e91ffaf6`의 CI는 통과했으나 재리뷰가 명시적 PH 구성원 요청의 서비스 미지정 강등과 PaymentCore producer 회귀 검사의 낡은 4종 단언을 지적했다. 구성원 resolver 호출 전에 명시적 PH 요청을 차단하고, PH 전용 조직의 신규 초대도 서비스 미지정 여부와 무관하게 거부한다. 현재 서비스·PH 이력 혼합 매장의 정상 초대와 과거 역할 회수 검증은 유지한다. 결제 검사에서는 실코드의 PaymentCore producer 생성 지점 3개와 prepare의 sourceService를 확인하고, 역사적 PH 완료 consumer의 구독·초기화 보존을 별도 검사한다. 저장소 전체의 PH 문자열 존재를 신규 producer가 살아 있다는 증거로 쓰지 않는다.

같은 HEAD의 SonarCloud는 새 코드 중복률 6.1%(기준 3% 이하)로 실패했다. PH 완료 handler를 1차 main 제거 뒤 보존하는 과정에서 기존 Neture·Store B2B의 상태 전이/bridge·실패 처리 복제가 새 코드로 분류됐다. 세 Extension consumer가 선택한 주문의 후속 처리만 `checkout-payment-completion.ts`로 공유한다. 각 서비스의 이벤트 구독 키·주문 선택·그룹/단일 조회·중복 이벤트 판정은 유지하며 PaymentCore·PG·DB 계약을 바꾸지 않는다. 실제 세 consumer의 이벤트를 호출해 created/pending의 paid 전이, 중복 처리, 이미 paid의 bridge 재시도, 취소 보존, 실패한 bridge의 paid 보존, 후속 실패 이벤트의 paid 불변과 다른 source 배제를 검증한다. 최신 Sonar의 성공 여부는 이 로컬 검사와 별도로 확인한다.

명시적 구성원 요청·결제 consumer 공유 보완 후 변경 그래프와 raw 소비처를 합친 API 238 suites에서 234 suites·4,395 tests 및 API type-check가 통과했다. DB integration 4개(36건)는 SKIP했다. 세 결제 consumer의 실제 이벤트 회귀도 포함한다. 이 결과는 로컬 코드 검증이며 최신 PR HEAD의 required CI·Sonar·Codex와 운영 실행을 대신하지 않는다.

main PR #378·#379의 공급자/인증 수정과 모집 목록의 실제 충돌을 확인하고 작업 branch에서 결합했다. 일반 공개 모집은 운영자 노출 승인 없이 유지하고 세미프랜차이즈 조건도 보존한다. PH는 두 목록에서 계속 제외하며 과거 원장 조회·종결은 유지한다. 인증 세션/로그아웃 변경을 되돌리지 않고 새 이벤트/가입 판정과 관련 API·웹 회귀를 다시 검증한다. 실제 main 통합은 아직 승인 대기다.

PR #378·#379 결합 후 API 242 suites에서 236 suites·4,422 tests와 type-check가 통과했다. DB integration 6개(48건)는 SKIP했으며 기존 4개 외에 main이 추가한 browser session·supplier phase1 integration이 포함된다. Neture 46 files·375 tests와 production build, 인증 공통 패키지 34/16/156건 및 관리자 cookie session 3건도 통과했다. 신규 일반 공개 모집 회귀는 PH를 제외하면서 노출 승인 없이 현재 모집이 보이는지 확인한다. 최신 remote CI·Sonar·Codex는 이 결합 커밋에서 다시 확인한다.

HEAD `5ab28af7d8`의 늦게 완료된 리뷰는 과거 slug의 출처와 공유 역할 화면의 PH 선택지를 지적했다. `StoreSlugService.findOldSlugRedirect`가 현재 행의 서비스만 반환하던 문제를 sourceServiceKey metadata로 보완한다. 현재 target 계약과 DB 원장은 유지하고 공개 Store·정책 조회·slug resolver의 모든 소비처에서 PH source/target을 차단한다. mock 반환값 대신 실제 helper를 호출하는 HTTP 회귀로 PH 이력과 현재 KPA 주소가 섞인 경우 및 현재 서비스의 정상 redirect를 검증한다. 공통 역할 관리 화면의 PH 필터도 제거하며 admin-dashboard·Neture·KPA wrapper와 raw-source 소비처를 확인했다. 과거 역할의 표시·회수는 유지한다.

slug 출처·공유 역할 UI 보완 후 API 243 suites에서 237 suites·4,430 tests 및 API type-check가 통과했다. DB integration 6개(48건)는 SKIP했다. 실제 history helper를 호출한 공개 HTTP를 포함한 관련 5 suites·56건, @o4o/ui 기존 회귀 10건, platform-core/UI 패키지 build 및 admin-dashboard·Neture·KPA production build가 통과했다. 신규 source metadata는 모든 runtime 소비처에 적용했고 기존 target 형태·원장 계약은 유지한다. 최신 커밋의 CI·Sonar·Codex를 다시 확인하며 이전 HEAD 결과를 최종 결과로 쓰지 않는다.

HEAD `8d72542589`의 늦게 완료된 리뷰는 실제 PH 콘텐츠를 현재/전역 슬롯에 새로 배치하는 우회와 수락 불가능한 PH-only 초대 노출을 지적했다. 슬롯 생성·벌크 배치·현재 슬롯의 자료 교체/재노출은 조회한 콘텐츠의 serviceKey를 검사하며 PH 원본은 거부한다. 현재 scoped 자료는 슬롯의 canonical service와 일치해야 하고 현재 global 자료·관리자 global 슬롯 계약은 유지한다. 이미 내 매장에 복사된 현재 서비스 자료는 과거 PH 출처 metadata가 있어도 사용 가능하다. 벌크의 PH 혼합 요청은 기존 슬롯 삭제 전에 전체 거부한다. 초대 목록은 수락과 동일한 조직 linkage 판정을 적용해 PH-only를 제외하고 혼합/현재 조직 초대는 유지한다. inactive PH linkage도 퇴역 식별로만 읽어 무스코프 수락으로 복구하지 않는다. 초대·자료 원장 삭제/상태 backfill은 없다.

HEAD `8cabb2c5a2`의 CI Gate·SonarCloud는 통과했다. 최신 리뷰는 현재 slug 선택도 원래 history 서비스와 활성 상태로 한정해야 한다고 지적했다. StoreSlugService는 같은 조직의 PH 주소를 KPA redirect 대상으로 임의 선택하지 않으며 다른 서비스로 fallback하지 않는다. 실제 helper fixture가 PH/KPA 활성 주소를 함께 제공하도록 고쳐 현재 서비스 redirect·PH 주소 부재·현재 주소 inactive 사례를 검증한다. 슬롯/초대 보완과 함께 최신 커밋의 required CI·Sonar·Codex를 다시 확인한다.

슬롯 원본·초대 목록·서비스별 slug 대상 보완을 모두 포함한 API 244 suites에서 238 suites·4,442 tests가 통과했다. DB integration 6개(48건)는 SKIP했다. API type-check와 platform-core build도 통과했다. current/global 자료·현재 서비스로 복사된 PH 출처 자료·현재/혼합 조직 초대·원장 보존과 실제 history helper의 서비스별 active 선택을 함께 검증한 결과다. 최신 PR 커밋의 required CI·Sonar·Codex는 별도 remote gate다.

HEAD `dd97a2dfb0`의 CI Gate·SonarCloud는 통과했지만 리뷰가 서비스 미지정 공통 Store 조직 판정의 PH 전용 후보 잔여를 지적했다. 현재 역할·가입과 PH 조직 선택 헤더가 있어도 자료·상품 진열을 만들 수 없도록 후보를 걸러내고 구매 조직·staff 후보에도 같은 판정을 적용했다. inactive PH 원장도 퇴역 식별로 읽되 현재 내 매장 신청 원장(active)은 세미프랜차이즈 가입·slug 없이 인정한다. 구성원 초대·수락·접근 역시 현재 원장을 인정하며 PH-only 관계는 현재 member role만으로 복구되지 않는다. 관련 그래프·raw 소비처를 합친 API 253 suites에서 247 suites·4,577 tests와 API type-check가 통과했고 DB integration 6개(48건)는 SKIP했다. 새 SQL을 서비스 scoped 질의로 오인하던 기존 모형과 퇴역 전 SQL 단언을 보완했으며 기존 현재 서비스 조직 선택·태블릿·자체 상품 검증은 유지했다.

검증 중 main은 PR #377의 매장 관리 화면 개선을 포함한 `090fb542aa`로 이동했다. 이 HEAD와의 read-only merge-tree에서 충돌은 없었다. 자동 결합·main merge는 수행하지 않았으며 통합 승인 뒤 최신 main을 자기 branch에 결합하고 필요한 검증을 수행한다. 최신 보완 커밋의 CI·Sonar·Codex 결과는 PR에서 별도로 확인한다. 로컬 운영 인계 문서에는 전체 URL map/backend/NEG·인증서 참조 조회 명령을 추가하고 map entry 삭제 명령을 해당 단계에 배치했다. 실제 조회·배포·삭제 결과는 아니다.
