# O4O AI 업무·코드 연결 및 공통화 준비 조사

> **상태**: ACTIVE
> **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-24 (Asia/Seoul)
> **근거 WO/IR**: [전체 정비 TODO](../work-orders/TODO-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md)
> **조사 기준**: main `355d77e861` (초기 `7f3d783cc2` 이후 PR #800의 상품 정정·전문 정보 원칙을 재대조)

## 1. 조사 범위와 판정

사용자가 제시한 11개 업무와 추가 업무를 실제 화면·등록 route·업무 서비스·AI 호출 경로에 대조했다. [종전 사용처 조사](IR-O4O-AI-USAGE-CONTROL-INVENTORY-V1.md)의 A01–A31은 당시 논리 사용처이며 전체 업무·현재 운영 호출의 개수로 합산하지 않는다. 아래 번호도 이 문서의 업무 분류일 뿐 영구 usageId가 아니다.

- **연결 확인**: 호출·소비 경로가 소스에 있다. 운영 활성·실사용·품질·청구 검증 완료는 뜻하지 않는다.
- **일부 기반**: 일반 질의·자료·집계·외부 연결은 있으나 해당 전용 AI 전체는 확인하지 못했다.
- **후보**: 후속 구현 제안. 등록되지 않은 기능·미연결 코드를 복구하라는 판정이 아니다.

이번 작업은 코드·문서 조사와 준비 문서 작성이다. 운영 DB·모델 설정·유료 AI·사용자 계정·실행 노드에 접근하거나 변경하지 않았다.

## 2. 사용자 업무 1~11의 연결표

| 업무 | 현재 구현과 경계 | 공통화·확장 대상 | 대상 자료·권한·결과 |
|---|---|---|---|
| 1. 상품 DB 관리 | [OCR][ocr], [태그][tag], [상품 콘텐츠][product] 호출. [상품 정정 작업공간][correction]은 기준 버전·대상 선택·보완 초안·정기 점검의 수동 운영 기반. 검색/추천 자체는 태그·DB 기반 | 기존 정정 작업에 상품명·규격 정규화, 중복 후보, 원문/전문 근거별 누락·불일치 제안 연결 | 기존 Master/Offer 권한. 정정 작업공간의 super_admin·버전·원문 fingerprint 유지. 보완 초안과 공식 DB 반영 분리 |
| 2. 내 매장 콘텐츠 제작 | [공통 편집 생성][editor], [번역][translation], [외부 연결][external] | 자료 기반 정리·번역·용도 변환·누락 검사. 사용자 외부 AI 초안의 편집·재사용 | 매장 소유 자료·버전·언어·대상. 제작 자료/초안 저장 후 미리보기·검수·게시 분리 |
| 3. 내 매장 대시보드 | [AI 도우미][store-ai]는 화면명·입력·최근 대화 전달. [홈 집계][store-overview]는 별도이며 실패를 null/unavailable로 보존 | 기존 집계에 근거한 현황·할 일 설명 | 선택 매장·현재 actor의 허용 집계. 원인/기간 미확인 표시, 상세 업무 링크 |
| 4. 공급자 상품 등록 | [HTML 등록 보조][import-ui]는 파서. [등록 공통 서비스][import-service]에 AI 상품 콘텐츠 생성 연결 | 파일/이미지 필드 추출, Master 매칭, 규격·이미지·유통조건 누락 검사 | 자기 공급자 후보·원본·필드별 출처. 검토한 값을 기존 등록 API로 저장 |
| 5. 공급자 콘텐츠 제작 | [상품 전역 초안][product]과 공급자 자료함/공유 설명서·[외부 AI][external]의 책임이 다름 | 설명서·교육·FAQ·대상별 재구성·상품 사실 검수 | 공급자 소유 문서·설명서의 기존 검수·공개 절차. ProductMaster 내부 자동화와 창작 경계 구분 |
| 6. 공급자 대시보드 | [화면 집계 소비][supplier-home] → [인증·공급자 guard][supplier-controller] → [KPI 집계][supplier-kpi]. 집계 자체는 LLM 아님 | 주문·공급 진행의 예외, 지표 변화·우선 처리 설명 | 인증된 공급자 ID로 기존 서비스가 읽은 집계. 다른 공급자·거래처 비공개 자료 제외 |
| 7. 운영자 대시보드 | [Copilot 요약 API][copilot-controller] → [공통 인사이트 Extension][insight]. 현재 API는 관리자 guard | 서비스별 현황·대기·문의·검수 요약 | 기존 역할별 집계·집계 시각. 일반 운영자의 접근 범위는 현재 도메인 guard로 확인 |
| 8. 운영자 업무 | [Neture 추천 큐][actions]에 규칙/LLM 제안 및 기존 문의 처리 API 존재 | 신청 자료 비교, 보완 안내·답변 초안·규정 근거·처리 준비 | 추천과 상태 변경을 분리. 기존 상세/처리 API의 권한·대상·확인 유지 |
| 9. 운영자 콘텐츠 | [서비스 초안][service-query], [편집기][editor], 사업/조직·커뮤니티 [외부 저장][external] | 공지·가이드·교육·행사 안내의 정리·번역·검수 | 사업/조직 소유 초안과 기존 게시 화면. 서비스 운영자와 플랫폼 관리자 범위 분리 |
| 10. 약국 경영 협력 모임 | [회원·역할·이력][cooperative]·사업 콘텐츠 기반. 외부 adapter의 organization 범위에 사업/조합 포함. 모임 전용 내부 AI는 확인 못함 | 모임 현황·질문 묶음·보완 안내·공동 교육/공지. 회의록은 원자료 확보 후 후보 | 해당 모임·연합 역할과 active 관계. 다른 모임 자료를 합치지 않고 기존 초안/게시 흐름 사용 |
| 11. 메인 약국 업무 자동화 | [Assistant][assistant]·Task·계획·화면/DOM·실행 노드·재개·완료 판정 경로 | 목적·자료·도구 전달과 실제 완료 근거 정합 | [Assistant V2][assistant-policy]·기존 실행 승인 적용. 새 Assistant/Memory·고정 사이트 시나리오 체계 생성 없음 |

## 3. 추가 업무와 기존 기반

| 업무 | 확인한 기반 | 정비·확장 후보 |
|---|---|---|
| 고객 다국어 상담 | [상담 번역][consult-translation], [공개 상품 문단 선택 Extension][guidance] | 게시 자료 근거·주의사항 보존·직원 인계. 전문 정보/판단 지원과 전문인이 확정한 개인별 판단을 구분 |
| 직원 업무·교육 | [상품/진열 위치·직원 안내 자료][staff] 검색. 검색 자체는 AI 아님 | 내부 자료 질의·교육 안내. 고객 공개 자료와 별도 allowlist |
| 상품 탐색·B2B 구매 준비 | [태그 추천][recommend]·기존 상품/거래 서비스 | 규격·공급조건 비교, 문의·발주 준비 초안. 소비자 결제 기능 복구 없음 |
| 강의·학습 지원 | [LMS Extension 실행][lms], 편집기 강의 생성 | 퀴즈 해설·과제 피드백·복습 안내. 성적·수강 자격 확정 분리 |
| 커뮤니티·업계 뉴스 | [뉴스 AI][news]·[예약 검토][news-job]·운영자 검토 흐름. [일반 Forum AI][forum] 기본 provider는 규칙 기반 | 출처 기반 요약·후보 검토·질문 묶음. 자동 검토와 자동 게시 구분 |
| 자료함·첨부 활용 | [파일 구조 추론][file]·홈 이미지/PDF 해석·외부 자료 검색 | 긴 자료 Q&A·비교·컬럼 매핑·버전 차이 |
| 외부 AI 협업 | [작업공간 adapter][external]·MCP/OAuth·초안 저장 | 공급자·매장·사업/조합·커뮤니티에서 기존 제작 화면으로 이어가기 |
| 음성·미디어 제작 | TTS·이미지 분석·기존 편집/제작 환경 | 읽기·자막·소재 정리·출력 QA. 전문 생성·자산 조립의 책임 유지 |
| 분회·서비스 이용 지원 | [공통 질의/초안][service-query]·조직/신청/문의 업무 | 공지·신청·이용 절차 설명. 약국 사업·분회·협력 모임 문맥 분리 |
| 유통참여형 펀딩 | 공통 서비스 질의/초안 | 소개·참여 안내·진행 현황 설명. 현행 content-only 경계 유지 |
| AI 운영·품질 관리 | [사용처 목록][catalog]·모델 관리·일부 quota/정산 | 업무별 모델·중지·비용·오류·평가의 관리 단위 대조 |

## 4. 코드와 문서 대조로 보완한 항목

1. **새 Core를 만들 필요가 없다.** [실행 계약][contract]에는 context·materials·funding·authorize/record가 있고 [runAiExtension][runner]은 read/draft를 실행한다. 자료 버전·출처·집계 시각은 먼저 업무 입력/서버 조립에 담고, 공통 필드 추가는 실제 복수 소비처의 필요를 확인한 뒤 판단한다.
2. **현재 서비스 설명이 일부 어긋난다.** [카탈로그][service-catalog]의 `kpa-society`는 약국 사업자 매장 운영 서비스다. [서비스 AI][service-query]의 DOMAIN_RULES는 여전히 약사회 조직·회원 업무를 설명한다. PR #800에서 전문 정보 일괄 제한 문장은 제거됐지만 업무 의미 차이는 남아 있다. 기존 테스트와 대조하되 제거된 전문 정보 제한을 복구하지 않는다.
3. **매장·공급자 첫 적용은 기존 지표부터 사용한다.** 매장 홈의 홍보 성과·보관 자료·진열 상품·가용한 업무 신호, 공급자의 KPI·상품 성과·유통·추세가 후보 자료다. 실제 지표 조회가 없는 기존 [StoreAiInsight 클래스][store-insight]를 새 대시보드로 재활성화하지 않는다. 관련 생성 소비처는 이번 추적에서 확인하지 못했다.
4. **관리자 요약 API를 일반 사용자에게 열 수 없다.** [현재 guard][copilot-controller]를 유지하고 각 도메인의 기존 접근 판정 아래 host를 조립한다. 클라이언트가 보내는 metrics·organizationId·role은 자료 조회 권한의 근거가 아니다.
5. **모델 관리와 회계 연결은 다르다.** [executeManagedAi][runtime-models]는 관리자 모델 선택 후 execute를 호출한다. [회계 실행][accounting]·quota 경유 여부는 개별 경로에서 확인한다. 목록의 모델 등록이 모든 transport·Vision·TTS의 실행/중지/비용 지원을 뜻하지 않는다.
6. **최근 완료 작업을 다시 구현하지 않는다.** [모델 선택·삭제 TODO][model-todo]와 공통 기반 §12-2의 모델 우선권·번역별 모델 지정은 기존 결과다. 번역별 활성/한도는 별개다. 뉴스는 현재 공통 질의 정책을 직접 사용하며, 모든 카탈로그 모델을 바꿔도 뉴스가 쓰는 공통 정책 모델의 참조 보호는 유지된다.
7. **새 호출을 관리 목록과 대조한다.** 뉴스와 상담 문단 선택은 카탈로그의 독립 사용처로 확인되지 않는다. 상담 문단 선택은 PRODUCT_CONTENT 정책을 재사용하고 뉴스는 SERVICE_QUERY 회계를 사용한다. 기존 scope를 복제하지 않고 usage·Extension·scope의 대응을 후속 확정한다.
8. **외부 AI 연결은 별도 기존 기반이다.** [외부 연결 TODO][external-todo]의 MCP/OAuth·adapter·권한·초안 저장을 그대로 활용한다. 사용자 외부 AI의 대화·토큰·구독 비용과 O4O 내부 API 사용량을 합치지 않는다. 실제 외부 앱 승인·연결 활성·운영 인증 성공은 소스 조사와 별도다.
9. **공통화는 전체 소비처를 기준으로 한다.** 상품 지식·콘텐츠·현황 설명·자료 기반 지원·교육/커뮤니티·개인 자동화의 6묶음은 작업 분류다. 6개 새 패키지·범용 prompt·계층 추가를 미리 확정하지 않는다.
10. **동시 병합된 상품 정비를 재사용한다.** 최종 점검 중 PR #800이 병합되어 해당 main을 작업 branch에 정상 merge하고 관련 코드/문서를 재대조했다. [수동 정기 운영][correction-todo]은 예약 AI·자동 수정이 아니며 별도 정정 저장소를 만들 필요가 없다. [전문 판단·AI 활용 원칙][professional]의 professional/ai-support/consumer-qr 목적, 상품 사실/전문 참고정보의 출처·확인일·검수 상태를 유지한다. 전문 주제를 일괄 제외하지 않고 제안과 확정된 개인별 판단을 구분한다. 기존 QR 자료의 공식 DB 채택은 판정 보류다.

## 5. 문서·동시 작업의 연결

- [AI 공통 기반](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md): 기존 실행·운영 상태와 후속 경계의 진입점. 이번 준비 결과는 새 §13에서 연결한다.
- [사용처 제어 설계](../design/DESIGN-O4O-AI-USAGE-CONTROL-V1.md): DRAFT인 전체 중지/회계/설정 제안. 모델 CRUD의 구현 완료와 설계 전체 완료를 구분한다.
- [콘텐츠 운영 원칙](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md): 내부 AI 선택적 보조·외부 AI 직접 연결·기존 공급자 창작 경계. O4O 비용 부담 금지로 해석하지 않는다.
- [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md): 서비스별 편의 추상화보다 전체 소비처·권한·저장 책임을 우선한다.
- [상품 정정 작업공간][correction]·[상품 관리 계획](../guides/products/O4O-ADMIN-PRODUCT-MANAGEMENT-PLAN-V1.md)·[전문 정보 원칙][professional]: 관리자 수동 작업·보완 초안·확정 반영 분리 및 목적별 근거 전달의 기존 기반.
- [운영자 일상 업무 TODO](../work-orders/TODO-O4O-OPERATOR-DAILY-WORKFLOW-COMPLETION-V1.md), 상담·협력 모임·Assistant 기존 작업: 구현 시작 시 최신 main/인계 HEAD·문서 상태·소유 경로를 다시 확인한다. 과거 TODO만 보고 미완료 또는 구현 가능으로 판단하지 않는다.

## 6. 이번 조사 이후의 판정

실행 순서·수용 기준은 [단일 TODO](../work-orders/TODO-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md)를 따른다. 조사/준비 완료와 S1~S4 구현·실사용 검증은 구분한다. 새로운 schema·권한/API 변경·운영 가격/credential·외부 유료 계약은 실제 변경 범위를 명시하는 후속 실행 단계에서 다룬다.

문서 정합: 종전 조사 snapshot·완료 WO/CHECK·canonical index를 다시 쓰지 않았다. 기존 구조 문서에 준비 범위와 진입 링크를 추가하고, 발견한 코드/업무 문맥 차이는 실행 TODO로 남긴다.

## 7. 후속 코드 대조·구현 판정 (2026-10-24)

§1~§6은 준비 당시 조사다. 사용자 후속 지시로 기존 main `355d77e861`을 포함한 같은 branch에서 아래 연결을 구현했다. push 전 `origin/main=197b41d0b5`의 후속 상품 배포 기록·CMS/퇴역 slug·서비스 종료 경계 변경도 대조했으며 이번 소스 경로와 직접 중첩되지 않는다. 운영 적용과 구분한 검증 근거는 [CHECK](../checks/CHECK-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md), 실제 공통 계약은 [기반 문서 §14](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md#14-업무-공통-연결과-첫-적용--개발-branch-2026-10-24)에 있다.

| 판정 | 대상 | 코드 점검·결과 |
|---|---|---|
| MERGE | 번역 2종·상담 근거 선택 | `policy-runtime.ts`로 기존 policy 실행 조립만 공통화. 게시된 문단 ID 선택·번역 원문 범위·각 서비스의 권한/저장 유지 |
| MERGE | LMS·운영자 Actions·Copilot·뉴스 | `accounted-runtime.ts`로 기존 모델/회계 조립 재사용. 뉴스의 공유 질의 정책·scheduler 무사용자 귀속과 기존 fallback 유지 |
| CONNECT | 매장·공급자·협력 모임 현황 | `dashboard-overview.service.ts`의 기존 insight Extension 실행을 3개 권한 host에서 재사용. 화면은 `AiOverviewPanel`과 각 인증 client를 사용. 임의 지표·대상 입력 거부 |
| CONNECT | 상품 DB 정정 검토 | 기존 `ProductCorrectionWorkspace`의 저장된 원문·기준·근거를 `productCorrectionExtension`에 연결. 기준/작업 버전 충돌·권한 회수는 거부. 생성과 사용자 삽입/기존 저장 분리 |
| CONNECT | 태그·Assistant 이해/완료 검증 | 기존 모델 경로 뒤에 PRODUCT_TAGGING / SERVICE_QUERY 예약·정산 연결. 새 quota나 작업 원장 없음 |
| KEEP | 콘텐츠 편집·자료함·외부 AI adapter | 기존 편집기·미리보기·검수·초안 저장·MCP/OAuth 책임 유지. 공급자 자체 집계 설명 허용이 내부 창작 전면 전환을 뜻하지 않음 |
| KEEP | 운영자 업무 큐·상담 자료·직원 지원 | 추천 이후 기존 대상 선택·문의/신청/콘텐츠 처리 API와 권한/이력 재사용. 고객용 게시 문단과 직원 자료의 접근 정책 유지 |
| KEEP | Assistant Task·계획·실행 노드·Memory | 기존 이해/완료 근거·사용자 최종 확정·중단/재개 계약 유지. 이번 변경은 두 LLM 판정 호출의 비용 연결이며 새 Assistant/고정 workflow 없음 |
| DEFER | 전문/직접 transport 비용·중지 | 전문 OCR·Home/계획/화면 판독·research/멀티모달·Qwen 편집·음성의 완전한 admission/가격/사용량 이관. 카탈로그 등록을 완료 증거로 사용하지 않음 |
| DEFER | 신규 상태 변경 도구·실계정 운영 검증 | 대상/version에 묶인 확인·멱등 처리 도구 확대, 실제 역할별 로그인·외부 모델 성공·청구/한도 운영 검증은 미실행 |

자료 소유는 유지한다. ProductMaster·전역 상품 AI 콘텐츠는 기존 플랫폼 권한, 공급자 Offer·자료함은 자기 공급자 권한, 매장 보관/제작 자료와 번역은 선택 조직 권한을 따른다. 정정 검토 초안은 기존 작업 기록에만 사용자가 저장하며 Master·Offer·매장 콘텐츠를 자동 갱신하지 않는다. 신규 현황 요청은 원문·상담·개인정보 대신 서버 집계 수치만 모델로 보낸다.

사용자 답변으로 공급자 자체 집계의 요청 기반 내부 AI 요약을 허용하도록 콘텐츠 운영 원칙·Supplier 경계와 Assistant의 정책 참조를 갱신했다. 기존 금지를 삭제해 모든 공급자 자동화를 허용하지 않았으며, Auth/RBAC Core·메뉴 재배치·결제·정산·운영 인증 설정은 변경하지 않았다. 모델 선택은 업무와 분리하되 `pharmacy.guidance`와 `product.correction-draft`는 기존 PRODUCT_CONTENT 정책을 공유한다. 뉴스는 독립 선택이 없으며 OCR은 전문 API 미연결 상태를 명시한다.

[ocr]: ../../apps/api-server/src/modules/store-ai/services/product-ocr.service.ts
[tag]: ../../apps/api-server/src/modules/store-ai/services/product-ai-tagging.service.ts
[product]: ../../apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts
[recommend]: ../../apps/api-server/src/modules/store-ai/services/product-ai-recommendation.service.ts
[editor]: ../../packages/content-editor/src/components/useAiContentGeneration.ts
[translation]: ../../apps/api-server/src/modules/store-ai/services/content-ai-translation.service.ts
[external]: ../../apps/api-server/src/modules/external-ai/adapters/registry.ts
[store-ai]: ../../services/web-store/src/components/store/StoreAiAssistant.tsx
[store-overview]: ../../services/web-store/src/pages/pharmacy/operations/homeOverview.ts
[import-ui]: ../../services/web-neture/src/pages/supplier/product-import/useSupplierProductImport.ts
[import-service]: ../../apps/api-server/src/modules/neture/services/product-import-common.service.ts
[supplier-home]: ../../services/web-neture/src/pages/supplier/dashboard/useSupplierDashboard.ts
[supplier-controller]: ../../apps/api-server/src/modules/neture/controllers/supplier-copilot.controller.ts
[supplier-kpi]: ../../apps/api-server/src/modules/neture/services/supplier-copilot.service.ts
[copilot-controller]: ../../apps/api-server/src/copilot/copilot-engine.controller.ts
[insight]: ../../apps/api-server/src/services/ai-extensions/operator-insight.extension.ts
[actions]: ../../apps/api-server/src/modules/neture/controllers/operator-action-queue.controller.ts
[service-query]: ../../apps/api-server/src/services/ai-extensions/service-query.extension.ts
[cooperative]: ../../apps/api-server/src/modules/neture-pharmacy/services/cooperative-management.service.ts
[assistant]: ../../apps/api-server/src/services/assistant/personal-assistant.ts
[assistant-policy]: ../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md
[consult-translation]: ../../apps/api-server/src/modules/neture-pharmacy/services/consultation-translator.ts
[guidance]: ../../apps/api-server/src/modules/neture-pharmacy/services/consultation-guidance.extension.ts
[staff]: ../../apps/api-server/src/modules/neture-pharmacy/services/store-staff-support.ts
[lms]: ../../apps/api-server/src/modules/ai/services/LmsAIService.ts
[news]: ../../apps/api-server/src/services/community/community-news-ai.service.ts
[news-job]: ../../apps/api-server/src/services/community/community-news-automation.service.ts
[forum]: ../../apps/api-server/src/services/forum/ForumAIService.ts
[file]: ../../apps/api-server/src/services/ai-tools/file-understanding/structure-inference.service.ts
[catalog]: ../../apps/api-server/src/services/ai-management/catalog.ts
[contract]: ../../packages/ai-core/src/contracts/ai-extension.contract.ts
[runner]: ../../packages/ai-core/src/orchestration/run-extension.ts
[service-catalog]: ../../apps/api-server/src/config/service-catalog.ts
[store-insight]: ../../apps/api-server/src/modules/store-ai/services/store-ai-insight.service.ts
[runtime-models]: ../../apps/api-server/src/services/ai-management/runtime-models.ts
[accounting]: ../../apps/api-server/src/modules/ai-policy/ai-accounted-execution.ts
[model-todo]: ../work-orders/TODO-O4O-AI-MODEL-DELETE-USABILITY-V1.md
[external-todo]: ../work-orders/TODO-O4O-EXTERNAL-AI-CONTENT-CONNECTION-V1.md
[correction]: ../guides/products/O4O-ADMIN-PRODUCT-CORRECTION-WORKSPACE-V1.md
[correction-todo]: ../work-orders/TODO-O4O-PRODUCT-MANAGEMENT-MANUAL-OPERATIONS-V1.md
[professional]: ../guides/products/O4O-PRODUCT-DESCRIPTION-PROFESSIONAL-USE-POLICY-V1.md
