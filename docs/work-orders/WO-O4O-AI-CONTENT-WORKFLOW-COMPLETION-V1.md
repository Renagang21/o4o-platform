# O4O AI 콘텐츠 제작·편집·저장 흐름 정비

> 상태: COMPLETED · 작성일: 2026-10-26
> 근거: 사용자 지시 — 상품 DB·공급자 등록은 다른 에이전트가 진행하므로 제외하고, 다음 콘텐츠 업무를 작은 회차로 나누지 않고 진행.
> 기준 main: `b9526fb78d` · branch: `wo/ai-content-workflow-completion`
> 종료 범위: 조사·TODO 보완·개발·검증·commit/push. main 병합·배포는 수행하지 않는다.

## 1. 목표와 경계

기존 AI Core/Extension·외부 AI 보조·편집기·자료함을 활용해 매장·공급자·운영자의 콘텐츠 작업을 연결한다. 자료 선택 → 요청문/제작 → 결과 검토·편집 → 미리보기 → 기존 저장을 한 묶음으로 점검하고 실제 결함·누락을 보완한다. 상품 DB·공급자 상품 등록 파일, 새 Core/원장/인증, 메뉴 재배치, 운영 설정·DB·실제 계정 변경은 제외한다.

매장·공급자 창작은 현행 사용자 외부 AI 흐름을 유지한다. 공급자 집계 내부 요약 허용을 창작 전체 허용으로 확장하지 않는다. 운영자는 기존 내부 AI 경로도 보존한다. 자료 접근·저장·게시/검수·공개 여부는 기존 도메인이 판정한다.

## 2. TODO

- [x] 정본·현재 소비처·관련 기존 WO/CHECK를 조사해 KEEP/CONNECT/FIX와 중복 구현 여부를 정리한다.
- [x] 매장·공급자·운영자의 자료 선택, 요청문/외부 연결, 편집 결과 적용, 미리보기, 기존 저장 경로를 대조한다.
- [x] 구현 범위와 공용 변경의 전체 소비처 영향도를 이 문서에 구체화한다.
- [x] 확인된 누락과 편집 상태·잘못된 성공 표시·안전하지 않은 결과 적용 문제를 보완한다.
- [x] 실제 UI/API 경계의 focused 회귀, 영향 패키지/서비스 build·lint, desktop/mobile 격리 browser smoke를 수행한다.
- [x] 검증·미실행·문서 정합·인계 경계를 CHECK에 기록하고 자기 변경만 commit/push한다.

## 3. 재사용 기준

[AI 공통 기반](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md), [통합 TODO](TODO-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md), [콘텐츠 운영 원칙](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md), [역할 경계](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [공유 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 따른다. 기존 LlmAssistPanel·RichTextEditor·prompt builder·기존 저장 API를 우선한다. 선택/초안 적용은 저장·게시·등재 요청 성공이 아니다.

## 4. 조사·구현 결과

| 영역 | 조사 판정 | 이번 구현 |
| --- | --- | --- |
| Core·Extension·provider·비용 | KEEP | 기존 플랫폼 실행·정책·회계 경계를 보존한다. 외부 사용자 AI 복사/붙여넣기에 O4O 유료 호출을 추가하지 않는다. |
| 매장 제작 | KEEP + FIX | 기존 store prompt builder, RichTextEditor, authoring session·저장을 사용한다. snapshot/direct/신규 콘텐츠/제작자료의 문서·매장·서비스 문맥과 저장 중 비활성을 공통 패널에 전달한다. |
| 공급자 자료함 문서 | CONNECT + FIX | 기존 LlmAssistPanel 연결, 설명/현재 본문 명시 선택, preview·검토→본문만 적용. 계정·문서 교체 초기화, 이전 조회/저장 응답 무시, 저장 single-flight·예외 복구. 미디어 등록과 공개 여부·기존 blocks 저장을 유지한다. |
| 협력사업 운영자 문서 | CONNECT | 기존 회원 약국용 본문 작성기에 같은 패널 연결. 이미 조회된 요약/본문만 선택 후보로 제공한다. 보관/반려·조회 실패 차단, revision·초안 저장/게시 경계와 업무별 자료 안내를 유지한다. |
| 관리자 CMS | CONNECT | guide/knowledge 본문에 같은 패널 연결. 서비스/종류/문서 전환 때 초안을 분리하고 미조회·저장/업로드 중에는 비활성. body/bodyBlocks, metadata·첨부·별도 저장 계약을 유지한다. |
| 공통 결과 수용 | FIX | 기존 sanitizeRichHtml 재사용, sandbox+CSP 미리보기·검토 확인, 기존 본문 교체 확인, 변경되지 않은 적용본만 이전 본문 복원. 실패 시 결과 보존·성공 오표시 방지, clipboard 실패 사실 표시·직접 복사·키보드 접근. |

외부 AI 보조는 Core의 실행/회계가 아니라 사용자 외부 AI 작업을 받는 기존 제작 UI 경계다. 작은 guide 함수는 공급자/운영자/CMS 세 실제 소비처가 공유하는 요청문 조립만 담당한다. provider adapter·새 prompt registry·Task/Memory·저장 원장은 추가하지 않는다. 기존 매장 prompt builder는 자료/목적 계약이 달라 그대로 보존한다.

## 5. Consumer Impact Matrix

| 실제 소비처 | 영향·검증 |
| --- | --- |
| web-store 직접 작성·snapshot·direct·제작자료 | 패널의 preview/검토 단계 적용, 4개 host 문맥/저장 상태 전달. 기존 authoring session/adapters와 상품 설명 보조 44개, source contract 110개, Store build 및 실제 편집기 desktop/mobile fixture 검증. |
| web-store POP/QR/상품설명/다국어·공통 blog/pop/description/editor slots | 기존 guideText·callback 유지. 공통 결과 수용만 바뀐다. 상품 등록/DB 소스는 수정하지 않는다. 전체 Store build와 기존 문자열/함수 가이드 계약 검증. |
| tablet-screen-set-editor 코너 설명 | 문자열 guide와 onApplyHtml 없는 HTML 탭 안내 계약 유지. 기존 raw-source 계약과 공통 legacy 소비처 테스트, 소비 서비스 build로 검증. 새 코너/메뉴 없음. |
| web-neture 공급자 자료함 | 문서 경로만 연결. 실제 페이지 회귀·desktop/mobile 실제 편집기 fixture·Neture build. 상품 등록 보조 컴포넌트는 무변경. |
| operator-core-ui 협력사업 작성기 → Neture·약국 사업·협력 모임 | 공통 host에 한 번 연결. 운영자 패키지 전체 30 suites/216 tests, Neture/Pharmacy 계정 전환 wrapper 6개와 3개 소비 서비스 build. |
| admin-dashboard CMS guide/knowledge | 3개 실제 폼 테스트·Admin build·desktop/mobile fixture. production과 동일한 forum-core source alias와 JSX 설정을 Vitest에도 반영한다. |
| 다른 content-editor 소비처(커뮤니티·LMS 등) | RichTextEditor/AiContentModal 내부 AI 코드는 무변경. 기존 경로와 export를 유지하고 영향 웹 build로 확인한다. 모든 역할의 실계정 성공으로 확대하지 않는다. |

패널 symbol/import, endpoint/route 리터럴, 소스 경로 및 raw-source assertion을 조사했다. 기존 raw-source 세 suite 110개를 삭제/완화하지 않고 통과했다. 퇴역 서비스는 복구하지 않는다.

## 6. 검증·원격 인계

검증 범위·실행 결과·운영 미실행과 인증 blocker는 [CHECK](../checks/CHECK-O4O-AI-CONTENT-WORKFLOW-COMPLETION-V1.md)를 따른다. 실제 공급자/운영자 자료를 생성하거나 외부 계정·유료 모델을 호출하지 않았다.

구현 commit `7e2daf0e99a4ac297dbd2d69142783079276a6d2`를 정상 Git 경로로 push하고 `git ls-remote`에서 같은 SHA를 확인했다. 최종 fetch·원격 main은 시작 기준 `b9526fb78d`와 같았다. 중간 Git fetch와 GitHub CLI API 조회는 인증 오류가 있었지만 이후 Git fetch/push는 성공했다. CLI API의 401은 별도로 남았으며 자격정보를 읽거나 교체하지 않았다. PR CI·리뷰는 미실행/미확인이고 main 통합·배포는 이번 범위 밖이다. 최종 문서 인계 commit은 branch HEAD를 따른다.
