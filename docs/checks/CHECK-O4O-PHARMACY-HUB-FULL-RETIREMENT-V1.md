# CHECK-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1

> 작성일: 2026-10-09 · 상태: ACTIVE
> 작업: [WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1](../work-orders/WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1.md)
> 착수 main: `0f8535d6b1` · PR 준비 기준 main: `3d5f4349ad` · main 결합 기준: `240a2dfd42`(PR #372·#374) · branch: `wo/pharmacy-hub-full-retirement-v1`

## 1. 결과와 남은 실행

| 구분 | 상태 | 근거 |
|---|---|---|
| 코드 제거 | 구현 완료 | PH 웹·API·Store PH 문맥·공급자 설정·가입·역할 신규 부여·CORS·배포 job 제거 |
| 로컬 검증 | PASS | API·웹 빌드와 관련 회귀 검증은 아래 §3 |
| main 통합 | 대기 | PR required CI·리뷰 후 저장소 AGENTS §4-1(e)의 사용자 통합 승인 필요 |
| 운영 배포 | 대기 | 배포 판정 `LEVEL_3`·`deploy_required=true`; main 통합과 별도 통제 배포 |
| 실제 PH 인프라·도메인·인증서 삭제 | 로컬 인계·미실행 | 사용자가 로컬에서 수행한다고 결정. 이 환경의 credentials/secrets·outbound identity는 비어 있어 실제 조회·삭제 결과 없음. WO §5·§6의 절차와 인계문 사용 |
| 운영 업무·모바일 smoke | 미실행 | 테스트 계정 로그인·실제 운영 배포 검증은 이 로컬 코드 검사에 포함하지 않음 |

**코드 삭제가 Cloud Run·DNS·인증서 삭제를 뜻하지 않는다.** 과거 인쇄 QR·옛 호스트·인증서의 보존이나 리다이렉트는 폐기됐고, 삭제 대상 자체는 확정됐다. 접근 권한이 있는 운영 실행자가 [WO §5](../work-orders/WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1.md#5-운영-인프라-제거-절차)의 최신 참조 조회·공유 자원 보호·삭제·확인 절차를 수행해야 전체 퇴역이 완료된다.

## 2. 제거와 보존 경계

- 삭제: `services/web-pharmacy-hub`, PH 전용 controllers/routes/scope/signup/provisioning/cart wrapper, Store의 `/work/pharmacy-hub`·결제 복귀·API adapter·메뉴, 공통 legacy PH handoff와 StoreOwnerGuard 설정, 공급자 PH 제공 설정의 API·화면.
- 신규 진입 차단: 서비스 catalog·public origin·session origin·서비스 약관 범위·Store membership 대상·운영자 부여 목록·공급자 콘텐츠 제공 대상에서 PH 제거.
- 공통 쓰기 차단: PH owner/member 역할로 공통 Store에 진입하거나 이용권 결제·활성화, 외국인 파트너/QR 자산, CMS 콘텐츠/슬롯을 생성·수정·전이할 수 없다. PH 역할은 과거 회수 식별자로만 남는다. 초대 수락은 PH role을 발급하지 않고 PH 전용 초대는 관계를 활성화하지 않는다. 과거 PH QR의 신규 scan event도 생성하지 않는다.
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
| 변경 소비처·추가 PH 참조·공통 쓰기/권한·최신 main 결합 API Jest | **217 suites · 4,180 tests PASS** · 220 suites 중 DB integration 3개 SKIP |
| 최신 main(PR #372·#374) 결합 후 Neture Vitest | **46 files · 375 tests PASS** |
| 최신 main 결합 관리자 운영자 지정 Vitest | **2 files · 10 tests PASS** |
| 공유 guide/community `shared-space-ui` Vitest | **8 files · 63 tests PASS** |
| 공통 운영 `operator-core-ui` Vitest | **4 files · 43 tests PASS** |
| `store-ui-core` Vitest | **8 files · 121 tests PASS** |
| CD detector/risk/workflow/orchestration + PH URL map planner Node tests | **332 tests PASS** · CI blocking Node 목록 전체 |
| `git diff --check` | PASS |
| 문서 민감정보 검사 | PASS · 8 files · 패턴 0건 |

PH 원본 파일의 존재와 가입 성공을 기대하던 퇴역 전용 spec은 삭제했고, 여러 서비스가 공유하는 spec은 PH 사례만 제외했다. 현재 대상의 가입 상태 유지·권한 차단·조직 경계·공급자 원장·독립 약사 포럼 검증은 유지했다. 새 퇴역 spec은 PH origin/역할/Store 문맥/신규 콘텐츠 제공을 막고 현재 서비스 및 기존 원장 조회가 유지되는지 검사한다. URL map planner는 혼합 host rule·공유 matcher/backend·weighted backend·잘못된 matcher를 검증하며 PH를 다른 호스트로 리다이렉트하지 않는다.

## 4. 문서 정합

현행 commerce DESIGN §16과 서브도메인 의미 정본 §2-2를 사용자 결정으로 갱신했다. PH 모델 baseline에는 대체된 기준을 명시했고 B2B 주문 계약에는 PH 신규 producer/API 퇴역과 기존 결제 완료·원장 조회 보존의 차이를 정정했다. 과거 WO·CHECK의 당시 배포 결과는 덮어쓰지 않는다. 이 CHECK는 실제 운영 삭제 완료를 주장하지 않는다.

Store 접근 정본과 Store Owner RBAC §3.1/§3.1-A도 정정했다. PH 역할 이름·linkage가 원장/회수 규약에 남아 있어도 현재 접근·발급 목록에는 없다는 점을 명시한다.

## 5. PR 리뷰와 전체 CI 보완

첫 PR HEAD `b163163719`에서 Codex가 삭제된 PH 가이드·웹 파일을 읽는 공통 패키지 테스트 5개 파일을 지적했다. 해당 서비스 사례만 제거하고 KPA·Neture 및 공통 컴포넌트의 테스트는 유지했다. `shared-space-ui` 63건·`operator-core-ui` 43건이 통과했다. 첫 CI의 API 실패는 현재 catalog에서 빠진 PH를 활성 Store/운영자 대상으로 기대하던 fixture와 서브도메인 설명의 누락을 확인해 정정했다.

추가 API 검증에서는 독립 약사 커뮤니티의 과거 PH 게시판 운영 권한이 끊어지는 실제 결함을 발견했다. `ForumControllerBase`가 게시판의 `service_code`를 웹 진입 목록에서 찾고 있었다. 원장 식별용 `communityKeyForForumStorageCode`를 catalog의 기존 `forumStorageCodes`로 구현하고 이 판정에서 사용한다. 퇴역 PH 웹 진입은 계속 없으며, 독립 약사 커뮤니티의 기존 PH 저장 게시판은 현재 community 운영 승인으로 판정한다. `legacy-community-closed-forum-operator.spec.ts`의 PH 사례는 삭제하지 않고 기존 글의 관리·다른 운영자 차단을 검증한다.

보완의 확장 API 3,832건과 type-check가 통과했다. required CI/Codex 재검증 상태는 PR에서 확인한다. 첫 HEAD의 CI 실패를 최종 성공으로 표시하지 않는다.

두 번째 HEAD `3f36b3b5d9`의 리뷰는 URL map 검증 테스트의 PH 호스트도 제거해야 한다고 지적했다. planner가 PH root/www/하위 호스트의 테스트를 함께 제거하고 다른 호스트의 테스트는 유지하도록 보완했다. 테스트의 기대 backend는 실제 라우팅 참조에서 제외한다. 신규 회귀 2건을 포함해 planner 8건과 blocking Node 검사 전체 332건을 검증했다. 이는 로컬 초안 생성 검증이며 실제 GCP import·삭제를 수행한 결과가 아니다.

세 번째 HEAD `c1b5980367`은 CI Gate·SonarCloud·CodeQL을 통과했지만 리뷰가 공통 매장/CMS의 PH 신규 쓰기 잔여를 지적했다. UI 제거만으로 이 API들을 종료하지 못했던 문제를 보완했다. 직접 HTTP 호출에서 기존 PH 회원·운영자·전체 관리자도 PH 콘텐츠를 생성·수정·전이하지 못하고, 신규 이용권 결제/활성화·파트너·QR 생성도 차단되는지 검사한다. CMS 슬롯 GET·기존 이용권 GET은 유지한다. 현재 서비스의 owner/member·초대 수락과 PH 전용 초대/역할 발급 차단도 함께 검증한다. 이 보완 후 최신 커밋의 required CI/Codex를 다시 확인하며 이전 HEAD 성공으로 대체하지 않는다.

검토 중 main에 PR #372·#374의 커뮤니티 운영자 권한 수정이 통합됐다. #374와 PH 제거가 `routes/operator/membership.routes.ts`에서 실제 충돌해, 두 정책을 함께 검증하기 위해 최신 main을 전용 작업 branch에 merge했다(원격 이력 재작성 없음). PH 역할은 허용 목록에서 제외하고 `community:admin`/`community:operator`, `injectOperatorServiceScope`와 새 회원 쓰기 범위 검사를 유지했다. main branch 자체와 운영 runtime은 변경하지 않았다. 이 결합 결과를 검증해 PR로 준비하며 실제 main 반영은 사용자 통합 승인 후 PR merge로만 수행한다.

결합 후 API 4,180건·type-check, Neture 375건·production build, 관리자 운영자 지정 10건이 통과했다. DB가 필요한 `neture-pharmacy-commerce.integration`, `store-owner-termination.integration`, `forum-summary.integration` 3개 suite는 SKIP했다. 실제 운영 테스트 계정·모바일 smoke와 PH 인프라 삭제는 여전히 미실행이다.
