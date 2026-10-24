# O4O AI 업무 Core + Extension 정비 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-24 (Asia/Seoul)
> **근거 WO/IR**: 사용자 요청 — 전체 AI 업무의 Core + Extension 재정리 준비, TODO 선작성 → 코드·문서 대조 보완 → push
> **관련 정본**: [AI 공통 기반](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md) · [AI 활용 흐름](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md)

## 1. 이번 작업과 종료점

이번 작업은 구현 전 준비다. 기존 AI 기반을 재사용하는 업무·코드 연결표, 책임 경계, 전환 순서와 검증 기준을 만든다. 코드·DB·API 계약·의존성·운영 설정은 변경하지 않는다. 문서 검증 후 전용 branch에 commit/push하고 통합 담당에게 인계한다. PR 생성·병합·배포는 이번 종료점에 포함하지 않는다. DEPLOYMENT = NOT_APPLICABLE.

기존 공통 기반을 이름만 바꾸거나 복제하지 않는다. 전체 정비 관점에서 공통화를 판단하며 서비스별 권한·자료 소유·검수·저장·실행 확인은 유지한다. 내부 AI와 사용자 외부 AI의 책임 및 비용 부담 정책을 구분한다.

## 2. 준비 TODO

- [x] P01 최신 main 기준 전용 작업공간 확보 및 TODO 선작성
- [x] P02 현행 정본·기존 조사/설계·동시 진행 작업 대조
- [x] P03 사용자 1~11번 및 추가 AI 업무의 현재 코드·화면·등록 경로 연결
- [x] P04 Core·업무 Extension·외부 연결·서비스 책임과 기존 계약의 충족/보완 구분
- [x] P05 단계별 실행 TODO·첫 적용·검증·후속 위험 범위 보완
- [x] P06 문서 정합·링크·민감정보·변경 범위 검증（PR #800 반영 후 재검증 포함）
- [x] P07 문서 commit/push 및 branch·SHA·검증·미해결 사항 인계

## 3. 기준·산출물·기존 작업 연결

최초 조사 기준은 main `7f3d783cc2bac349679639db5d7afc232388d660`이며, 최종 점검 중 PR #800의 main `355d77e861`을 정상 merge하고 상품 정정·전문 정보 원칙을 추가 대조했다. 다음 실행 단계 시작 시 최신 main·동시 작업·인계 HEAD로 대상 소비처를 다시 산출한다.

| 산출물·기존 작업 | 이번 처리와 후속 사용 |
|---|---|
| [업무·코드 연결 조사](../investigations/IR-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md) | 사용자 1~11번·추가 업무, 코드 연결 상태·후보, 권한·자료·결과 및 조사로 보완한 항목 |
| [기존 AI 공통 기반](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md) | 기존 실행·비용·운영 이력 보존. §13에 이번 준비 진입점·책임·현재/후속 구분 추가 |
| [기존 사용처 조사](../investigations/IR-O4O-AI-USAGE-CONTROL-INVENTORY-V1.md)·[제어 설계](../design/DESIGN-O4O-AI-USAGE-CONTROL-V1.md) | 과거 snapshot·DRAFT를 현행 완료 계약으로 승격하지 않음. 다음 단계의 사용처/중지/회계 대조에 활용 |
| [모델 관리](TODO-O4O-AI-MODEL-MANAGEMENT-V1.md)·[선택/삭제 정비](TODO-O4O-AI-MODEL-DELETE-USABILITY-V1.md) | 완료한 관리자 모델 우선권·CAS·삭제 보호·번역 모델 분리 재사용. 뉴스의 공통 정책 참조 보호 유지 |
| [외부 AI 연결](TODO-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md) | 기존 MCP/OAuth·작업공간 adapter·초안 저장을 사용. 내부 provider 호출과 별도 연결 책임 |
| [상품 정정 작업공간](../guides/products/O4O-ADMIN-PRODUCT-CORRECTION-WORKSPACE-V1.md)·[수동 정기 운영](TODO-O4O-PRODUCT-MANAGEMENT-MANUAL-OPERATIONS-V1.md) | 기준 버전·대상 선택·작업/보완 초안·근거·정기 점검 재사용. 예약 AI/자동 수정으로 간주하지 않음 |
| [운영자 일상 업무](TODO-O4O-OPERATOR-DAILY-WORKFLOW-COMPLETION-V1.md)·기존 상담/협력 모임/Assistant 작업 | 각 도메인의 권한·처리·저장 계약 유지. 후속 구현 전 최신 코드와 작업 소유권 확인 |

새 조사 문서는 재정비의 업무 연결표이며 기존 기술 사용처 목록의 사본이 아니다. 기존 구조 문서를 계속 진입점으로 사용한다. canonical index·과거 완료 기록의 상태는 바꾸지 않는다.

## 4. 전체 업무 묶음과 재사용 원칙

| 업무 묶음 | 사용자 업무·추가 범위 | 우선 재사용할 구현 |
|---|---|---|
| 상품 지식·등록 | 1·4, 상품 비교·구매 준비 | store-ai OCR/tag/content·태그 검색, Neture 등록/가져오기 서비스 |
| 콘텐츠 제작·재사용 | 2·5·9, 문서·외부 AI 협업 | content-editor·번역·자료함/실행 자산·external-ai adapters |
| 현황 설명·운영 지원 | 3·6·7·8·10의 현황/할 일 | 기존 역할별 집계, operator-insight Extension·Neture 작업 큐 |
| 자료 기반 상담·직원 지원 | 고객 안내·직원 자료·문의 검토 | consultation·직원 안내·기존 문의/신청 처리 |
| 교육·커뮤니티 | 강의·과제·뉴스·모임 자료 | LMS Extension·뉴스 Extension·기존 게시/검수 |
| 개인 업무 자동화 | 11, Task·계획·실행·재개·완료 | Personal Assistant V2·기존 실행 노드·도구·메모리/경험 |

6개 묶음은 작업 분류다. 새 패키지 6개·범용 prompt·공통 저장소를 미리 만들지 않는다. 같은 계약·입출력·실패 처리의 실제 복수 소비처가 확인되면 공통화하고, 자료 선택·도메인 권한·공개·저장은 각 업무에 남긴다. 모델 공급자와 업무 Extension은 분리한다.

## 5. 책임·공통 계약 점검 결과

| 경계 | 현재 확인 | 후속 보완 위치 |
|---|---|---|
| AI Core | `ai-extension.contract.ts`의 context/materials/funding·host authorize/record, `runAiExtension`의 read/draft 실행·단계 이력 | 기존 계약을 기준으로 연결. Core가 DB·업무 권한·저장·게시를 직접 소유하지 않음 |
| 업무 Extension | service-query·operator-insight·번역·LMS·상담·뉴스 등의 prepare/parse | 업무별 자료·출력 검증. 유효한 도구·근거·표현은 업무 규칙 |
| 외부 AI 연결 | 기존 execute/provider registry·직접 transport·runtime-models | capability·인증·timeout/retry·오류 차이 유지. 모델 목록 등록과 실제 실행 지원 구분 |
| API 서버 조립 | 검증된 actor/조직·자료 조회, runtime invoke·authorize·record 조립 | 화면이 제출한 role·조직·serviceId·지표를 권한 증거로 사용하지 않음 |
| 화면/업무 서비스 | 기존 자료 편집·검수·저장·업무 실행 | AI 응답을 초안/제안으로 표시하고 기존 API에서 저장·게시·주문 확인 |

| 전달/결과 항목 | 현재 계약·추가 판단 |
|---|---|
| 요청·주체·업무 문맥 | requestId/serviceId/featureId/actorId/organizationId/storeId/taskId/conversationId/audience 기존 필드 재사용. 공급자/사업/모임 관계는 도메인 입력에서 검증 |
| 허용 자료 | materials의 id/kind/audience와 기존 접근 판정 재사용. 원문은 권한 확인 뒤 선택. 출처·버전·집계 시각은 먼저 업무 입력에 포함하고 공통 필드 필요성을 검증 |
| 공개 요청 | 현재 `principal=public`은 consumer/read, actor·materials 없는 제한된 계약. 직원/고객 자료형 상담을 연결하기 위해 이 제약을 임의 완화하지 않음 |
| 모델·부담·비용 | 기존 usage별 관리자 모델 지정과 scope 정책·회계·quota 연결. 공통 usage의 전역 지정이 서비스별 독립 설정을 뜻하지 않으므로 serviceId+usage 선택 요구/지원 범위를 먼저 대조. platform/store/user/external-account는 계약상 선택지이며 실제 청구 구현 완료와 구분 |
| 결과·이력 | 기존 typed output·providerRequestId·단계 이벤트 사용. 본문·prompt·credential은 공통 이력에 저장하지 않음. 생성 완료·저장 완료·게시/업무 완료를 구분 |
| 저장·실행 확인 | read/draft Core가 직접 실행하지 않음. 기존 도메인 검증·확인·버전 충돌·멱등 저장을 연결. 거래/게시의 새 도구 계약은 해당 단계에서 명시 |

`executeManagedAi`의 모델 선택과 `executeAccountedAi`의 quota/정산은 별개다. 관리 목록에 있다고 회계 연결까지 완료로 판단하지 않는다. 자료/업무 ID와 사용처 모델 ID, quota scope도 동일 개념으로 합치지 않는다.

## 6. 단계별 실행 TODO

아래 S1~S4는 **미실행**이다. 이번 push가 구현 시작·완료·운영 변경을 뜻하지 않는다. 각 묶음은 조사 → 최소 연결 → 회귀 → 문서/검증 → commit/push로 수행하며, 통합 담당에게 정확한 HEAD를 인계한다.

### S1. 공통 경로 정합 + 매장·공급자 현황 설명 첫 적용

- [ ] S1-1 최신 main에서 Core/host·모델 관리·직접 호출·회계 및 테스트/리터럴 소비처 연결을 재산출하고 KEEP/CONNECT/MERGE/DEFER 판정
- [ ] S1-2 약국 사업·분회·협력 모임 문맥 정합. `service-query` DOMAIN_RULES와 service-catalog의 차이를 기존 소비처·회귀와 함께 수정. PR #800에서 제거한 전문 정보 일괄 제한을 복구하지 않음
- [ ] S1-3 뉴스·상담 문단 선택·OCR·TTS/직접 호출의 usage·Extension·scope·중지/비용 대응을 정리하고 현재 지원과 후속을 표시. 기존 뉴스 공통 모델 참조 보호 유지
- [ ] S1-4 기존 현황 설명 Extension과 역할별 자료 host로 매장·공급자 2곳 연결. 별도 대시보드 AI 실행기/원장 생성 없음
- [ ] S1-5 기존 질문/요약·관리자 요약·모델 선택/삭제·quota 회귀와 아래 첫 적용 수용 기준 검증

**첫 적용 자료·권한·결과**

| 적용 | 자료와 경로 | 권한·출력·수용 기준 |
|---|---|---|
| 매장 홈 | `homeOverview.ts`의 홍보 성과·보관 자료·진열 상품·가용 업무 신호 및 기존 API 서버 서비스 | 선택 매장·owner/허용 직원 관계를 서버에서 확인. 허용 집계만 설명. null/unavailable·부분 실패를 0·정상으로 바꾸지 않음 |
| 공급자 홈 | SupplierCopilotService의 KPI·상품 성과·유통·추세와 기존 requireSupplier | 서버가 확정한 자기 공급자 범위. 실제 주문/공급 자료만 사용하고 타 공급자·거래처 비공개 원문 제외 |
| 공통 결과 | summary·검토할 제안, host의 근거 지표·집계 시각·기존 상세 링크 | 근거 없는 인과/수치·완료 선언 없음. 링크는 현재 route/권한에 맞게 검증. 기존 대시보드는 AI 실패에도 이용 가능 |

현재 `/api/v1/platform/copilot/summary`의 requireAdmin은 유지한다. 일반 매장/공급자가 이를 호출하도록 guard를 낮추지 않고 각 도메인의 기존 검증 아래 host를 연결한다. `StoreAiAssistant`가 현재 전달하는 화면명·입력·대화는 실제 지표 조회를 대신하지 않는다. UI에 필요한 문맥 제어만 연결하며 메뉴/대시보드 재배치는 하지 않는다.

**종료 조건:** 동일 기존 실행/Extension 경로를 2개 역할에서 사용하고 자료 로딩·권한·출력 검증은 분리한다. 타 대상 접근·부분 조회 실패·모델 변경·한도·AI 장애·매장/사용자 전환 중 늦은 응답을 검증한다. 두 화면의 desktop/mobile과 실제 데이터/미확인 상태 표시를 확인한다. 실제 계정 검증이 불가능하면 fixture 검증과 미확인을 구분해 인계한다.

### S2. 상품·등록 및 콘텐츠 제작/재사용

- [ ] S2-1 Master·공급자 Offer/자료함·매장 제작 자료의 소유/자료 출처/쓰기 권한을 연결표로 확정. 기존 상품 정정 작업공간의 기준 버전·선택 대상·원문 fingerprint·근거·보완 초안에 AI 제안을 연결하고 별도 작업 원장 생성 없음
- [ ] S2-2 OCR·태그·상품 전역 초안·가져오기 후 생성 흐름을 기존 실행/모델/회계 기준에 연결. 파일 파싱·태그 검색을 유료 AI 호출로 중복 계수하지 않음
- [ ] S2-3 내부 편집 정리/번역/변환과 사용자 외부 AI 조회·초안 저장을 기존 편집·미리보기·검수에 연결
- [ ] S2-4 동일 처리를 쓰는 매장·공급자·운영자 소비처를 함께 전환하고 전 소비처/회귀 확인 뒤 미사용 중복만 제거

**종료 조건:** 원문·초안·완성본의 소유/버전/언어가 유지되고 사용자가 기존 화면에서 검토·저장한다. 모델 성공 후 파싱/저장 실패, 권한 회수, 원문 수정 충돌, 같은 요청 재시도를 구분한다. 전역 `product_ai_contents`를 매장 설명 저장소로 바꾸지 않는다. [콘텐츠 운영 원칙](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)의 내부 AI 선택적 보조·공급자 창작 경계와 외부 직접 연결을 함께 따른다.

[전문 판단·AI 활용 원칙](../guides/products/O4O-PRODUCT-DESCRIPTION-PROFESSIONAL-USE-POLICY-V1.md)에 따라 professional/ai-support/consumer-qr 목적과 상품 사실/전문 참고정보·출처/확인일/검수 상태를 전달한다. 전문 용어·질병/진단 주제를 일괄 제외하지 않고, 판단 지원 제안과 전문인이 확정한 개인별 판단을 구분한다. 기존 QR 자료를 공식 DB로 자동 승격하거나 상품 정정 초안을 공식 상품에 자동 적용하지 않는다.

### S3. 운영자·협력 모임의 현황과 업무 처리 연결

- [ ] S3-1 S1 현황 설명을 기존 서비스별 지표/역할 host에 확대. 모임·연합·사업·분회 구분, 새 serviceKey 추정 생성 없음
- [ ] S3-2 7번 대시보드와 8번 운영 지원을 같은 기반에서 현황 → 대상 선택 → 자료 검토/초안 → 기존 처리 → 결과 확인으로 연결
- [ ] S3-3 운영자 일상 업무·문의/신청/콘텐츠 검수의 기존 API·권한·알림/이력 재사용. AI 추천은 실행 확인 증거로 쓰지 않음
- [ ] S3-4 서비스·다른 모임·운영자/관리자 경계 및 실제 처리 대상/version·중복 실행 검증

**종료 조건:** 지표 설명과 실제 업무 완료를 구분한다. AI가 기존 업무 처리 상태를 임의 확정하지 않으며 화면과 기록에서 제안·확인·성공·부분 실패를 구분한다. 상태 변경 도구가 필요하면 도메인 권한·인자/대상 버전에 묶인 확인·멱등 실행을 먼저 명시하고 회귀한다.

### S4. 상담·직원·교육·커뮤니티·개인 자동화 정합

- [ ] S4-1 상담 번역·게시 문단 선택, 직원 안내 자료의 공개 범위·모델/회계 연결 정합
- [ ] S4-2 LMS 피드백/강의·뉴스 검토·분회/공지의 기존 Extension 연결. 성적/게시 확정과 AI 피드백 구분
- [ ] S4-3 Home/Assistant의 Task·계획·자료·도구·실행 노드·중단/재개·완료 근거를 기존 계약에 연결. 별도 Task/Memory 생성 없음
- [ ] S4-4 직접 transport·멀티모달·음성/전문 API의 capability·모델/중지/사용량 연결을 실제 소비처 기준으로 검증. 지원하지 않는 provider/model은 명시적으로 거부

**종료 조건:** 소비자 자료에 직원 전용/다른 조직 자료가 섞이지 않는다. 상담 원문·환자정보를 공통 로그/메모리에 수집하지 않는다. 발주 확정은 기존 직접 승인 유지. 재시작·사용자 인계·완료는 실행 근거로 판단하며 [자동화 원칙](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)과 [Assistant V2](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md)의 순서·메모리 경계를 따른다.

## 7. 공통 검증·점진 전환 기준

전환 단위마다 기존 동작 고정 → 기존 Core/runtime에 연결 → 권한/결과/비용 회귀 → 소비처 전환 → 미사용 중복 제거 순서를 따른다. 하나의 요청을 구/신 provider 경로에 동시에 보내 검증하지 않는다. 합성 응답·격리 DB·권한 fixture를 우선 사용한다.

| 검증 축 | 필요한 증거 |
|---|---|
| 전체 소비처 | import·실제 호출·문자열/route·raw-source test를 함께 확인. 서비스 하나 통과로 공통 변경 종료하지 않음 |
| 자료 접근 | 자기/타 매장·공급자·모임, 역할 회수·전환, staff/consumer, 공개/미게시 자료의 허용/거부 |
| 모델·부담 | 사용처별 지정이 다음 호출에 적용, 기존 캐시/요청보다 우선, 지원 능력/키 미연결 처리, 무단 부담 주체 전환 없음 |
| quota·정산 | 호출 전 예약·실패 해제·provider 성공 후 정산/미확정 구분, 동시 요청·한도 초과·가격 정책/DB 장애 검증 |
| 이력·재시도 | request/task/provider ID 연결, 파싱 실패와 유료 호출 성공 구분. 정산/저장 오류를 이유로 성공한 생성 POST를 자동 재호출하지 않음 |
| 결과·저장 | 출처/시각/버전·유효한 링크·형식 검증, 권한 재확인·409·멱등성, 초안/공개·제안/업무 완료 구분 |
| 화면·장애 | desktop/mobile, 입력 보존·오류 안내·수동 업무 지속, 늦은 응답의 잘못된 사용자/매장 반영 방지 |

기존 회귀 진입점은 `ai-business-extension.spec.ts`, `service-ai-extensions.spec.ts`, `service-ai-query-http.spec.ts`, `copilot-service-extensions.spec.ts`, `copilot-managed-credentials.spec.ts`, `ai-usage-model-authority.spec.ts`, 가격/quota 및 각 도메인 테스트다. 경로·실행 명령은 구현 시점 [SETUP](../../SETUP.md)과 package scripts로 재확인한다. 구현을 복제한 테스트보다 경계·회귀·실제 연결을 검증한다.

## 8. 후속 단계의 별도 경계·인계

메뉴 재배치·신규 AI 계약/결제·운영 인증 변경은 이번 범위 밖이다. 필요 시 다음 실행 단계에 정확한 schema/API/Core/권한 변경 범위와 전 소비처 영향을 적는다. 운영 migration/DB write·가격 설정/실제 외부 계정/유료 공급자 검증은 코드 정비와 구분해 기존 사용자 승인·통합 담당 절차를 따른다.

플랫폼이 필요한 AI 비용을 부담할 수 있다는 방침은 유지한다. 매장/사용자 부담·외부 계정 지원은 계약상의 확장 지점으로 보존하고 이번 문서로 신규 청구·운영 설정을 적용하지 않는다. 추정 비용과 공급자 청구액을 구분한다.

문서 상태는 전체 후속 TODO가 남아 있으므로 ACTIVE다. 준비 P01~P07과 실행 S1~S4의 체크를 분리한다. 개발 담당은 검증·commit/push 후 branch·SHA·기준 main·변경/검증·미해결을 인계한다. 통합 담당이 PR/CI·리뷰·병합·post-merge·배포/운영 검증을 담당한다. 문서-only 준비의 배포는 NOT_APPLICABLE이며 기능 적용 완료로 보고하지 않는다.

## 9. 준비 검증 기록

| 준비 검증 | 실제 결과 |
|---|---|
| 도구·의존성 | Node 22.18.0 / pnpm 10.25.0. `pnpm install --frozen-lockfile --prefer-offline --ignore-scripts` 성공. 문서 소비 테스트 도구용 설치이며 네이티브 기능/전체 앱 빌드 검증은 아님 |
| 문서 민감정보 | `node scripts/check-doc-sensitive.mjs`에 변경 3개 파일을 명시해 검사, 0건 |
| 상대 링크 | PR #800 반영 후 변경 문서의 파일 링크 102개 유효, 누락·미정의 reference 0 |
| CI 범위 판정 | `detect-affected.mjs --files-from`으로 docs_only/docs_fast_eligible=true, API·웹 배포 영향 false 확인 |
| 문서 소비 테스트 | 같은 판정기의 docs-specs가 선택한 `archive-retention-and-tracked-backup-disposition.spec.ts`와 `store-role-registry-alignment.spec.ts`: 최신 main `355d77e861` 통합 후 재검증도 Jest 2 suites / 22 tests PASS. 초기 실행과 합산하지 않음 |

문서 변경 범위 3개 파일의 staged scope·공백 검사를 통과했다. 준비 본문 commit `ba0d80e5c71b6ea9345fe43ba3ba6c0116729118`을 `wo/ai-work-extension-preparation`에 push하고 원격 branch SHA 일치를 확인했다. 이 완료 기록을 포함하는 최종 HEAD는 인계 보고를 따른다. 코드/API/운영 기능 테스트는 이번 문서 변경의 수행 결과로 합산하지 않는다. PR을 생성하지 않으므로 PR CI·원격 Codex 리뷰는 미실행이다.

문서 정합: 기존 구조 문서 §13에서 새 업무 연결표·단일 TODO를 연결했다. 과거 조사/완료 기록·canonical index·정책·실행 계약은 변경하지 않았다.

WORKTREE_DISPOSITION: `/workspace/o4o-wt/ai-work-extension-preparation` · `wo/ai-work-extension-preparation` · 재대조 기준 main `355d77e861` · main integration 미실행 · local docs checks/consumer tests 최신 문서 재검증 PASS · deployment NOT_APPLICABLE · 운영 smoke 미실행 · `KEEP` (push 후 인계, 병합 전 후속 수정용). S1~S4 구현·서비스 담당의 실제 업무 검증은 미실행이다.
