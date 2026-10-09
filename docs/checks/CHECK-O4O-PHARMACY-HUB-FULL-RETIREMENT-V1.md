# CHECK-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1

> 작성일: 2026-10-09 · 상태: ACTIVE
> 작업: [WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1](../work-orders/WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1.md)
> 기준 main: `0f8535d6b1` · branch: `wo/pharmacy-hub-full-retirement-v1`

## 1. 결과와 남은 실행

| 구분 | 상태 | 근거 |
|---|---|---|
| 코드 제거 | 구현 완료 | PH 웹·API·Store PH 문맥·공급자 설정·가입·역할 신규 부여·CORS·배포 job 제거 |
| 로컬 검증 | PASS | API·웹 빌드와 관련 회귀 검증은 아래 §3 |
| main 통합 | 대기 | PR required CI·리뷰 후 저장소 AGENTS §4-1(e)의 사용자 통합 승인 필요 |
| 운영 배포 | 대기 | 배포 판정 `LEVEL_3`·`deploy_required=true`; main 통합과 별도 통제 배포 |
| 실제 PH 인프라·도메인·인증서 삭제 | 미실행 | 환경 상태의 credentials/secrets·outbound identity가 비어 있고 GCP/Gabia 접근 경로가 없다. 현재 운영 리소스 조회·삭제 결과 없음 |
| 운영 업무·모바일 smoke | 미실행 | 테스트 계정 로그인·실제 운영 배포 검증은 이 로컬 코드 검사에 포함하지 않음 |

**코드 삭제가 Cloud Run·DNS·인증서 삭제를 뜻하지 않는다.** 과거 인쇄 QR·옛 호스트·인증서의 보존이나 리다이렉트는 폐기됐고, 삭제 대상 자체는 확정됐다. 접근 권한이 있는 운영 실행자가 [WO §5](../work-orders/WO-O4O-PHARMACY-HUB-FULL-RETIREMENT-V1.md#5-운영-인프라-제거-절차)의 최신 참조 조회·공유 자원 보호·삭제·확인 절차를 수행해야 전체 퇴역이 완료된다.

## 2. 제거와 보존 경계

- 삭제: `services/web-pharmacy-hub`, PH 전용 controllers/routes/scope/signup/provisioning/cart wrapper, Store의 `/work/pharmacy-hub`·결제 복귀·API adapter·메뉴, 공통 legacy PH handoff와 StoreOwnerGuard 설정, 공급자 PH 제공 설정의 API·화면.
- 신규 진입 차단: 서비스 catalog·public origin·session origin·서비스 약관 범위·Store membership 대상·운영자 부여 목록·공급자 콘텐츠 제공 대상에서 PH 제거.
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
| 변경 파일·raw-source 소비처 기반 API Jest | **151 suites · 3,158 tests PASS** |
| `store-ui-core` Vitest | **8 files · 121 tests PASS** |
| CD detector/risk/workflow/orchestration + PH URL map planner Node tests | **330 tests PASS** · CI blocking Node 목록 전체 |
| `git diff --check` | PASS |
| 문서 민감정보 검사 | PASS · 6 files · 패턴 0건 |

PH 원본 파일의 존재와 가입 성공을 기대하던 퇴역 전용 spec은 삭제했고, 여러 서비스가 공유하는 spec은 PH 사례만 제외했다. 현재 대상의 가입 상태 유지·권한 차단·조직 경계·공급자 원장·독립 약사 포럼 검증은 유지했다. 새 퇴역 spec은 PH origin/역할/Store 문맥/신규 콘텐츠 제공을 막고 현재 서비스 및 기존 원장 조회가 유지되는지 검사한다. URL map planner는 혼합 host rule·공유 matcher/backend·weighted backend·잘못된 matcher를 검증하며 PH를 다른 호스트로 리다이렉트하지 않는다.

## 4. 문서 정합

현행 commerce DESIGN §16과 서브도메인 의미 정본 §2-2를 사용자 결정으로 갱신했다. PH 모델 baseline에는 대체된 기준을 명시했고 B2B 주문 계약에는 PH 신규 producer/API 퇴역과 기존 결제 완료·원장 조회 보존의 차이를 정정했다. 과거 WO·CHECK의 당시 배포 결과는 덮어쓰지 않는다. 이 CHECK는 실제 운영 삭제 완료를 주장하지 않는다.
