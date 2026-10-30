# WO-O4O-AI-INPUT-PATTERN-STANDARD-V1

- 상태: REVIEW_PENDING — 로컬 검증 완료, PR CI·리뷰 확인 후 main 병합 전 인계
- 기준: 2026-10-30 사용자 요청. 두 화면만이 아니라 모든 영역의 AI 요청 입력창을 같은 패턴으로 통일한다.
- 정본: [Design Core](../rules/DESIGN-CORE-GOVERNANCE.md), [공통 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).

## 문제와 디자인 결정

Main은 옅은 slate 테두리·둥근 단일행, 내 매장은 teal 테두리·다른 높이, 콘텐츠 보조는 12~13px 입력창을 별도로 사용했다. Design Core의 기존 토큰을 사용하는 `@o4o/ui/ai`의 `AiRequestInput`으로 통합한다. 별도 서비스 테마나 새 디자인 시스템을 만들지 않는다.

같은 기본 패턴: 2px neutral-500 테두리, primary-600 포커스와 primary-100 외곽 표시, radius-xl(12px), 높이 56px, 16px 글자·24px 행간, 최대 너비 768px/가용 너비 100%, 요청 길이에 따라 최대 176px까지 확장 후 내부 스크롤. 전송이 있는 입력창은 오른쪽 44×44px 화살표 버튼을 사용한다. Enter 전송·Shift+Enter 줄바꿈·IME 조합 중 전송 금지. 첨부·음성·대화 열기는 각 기존 기능을 유지한다. 콘텐츠 생성의 추가 요청은 같은 입력 표면을 쓰되 기존 생성/복사 검토 단계에서 실행한다.

## 소비처 조사

| 요청 입력 제공자 | 사용 영역 / 전파 범위 |
|---|---|
| O4OHomePage | Main, 로그인 전후 업무 입력·첨부·재개 |
| StoreAiAssistant | 내 매장 전체 업무공간 및 dialog portal |
| ConsultationGuidancePanel | 매장 상담 안내·음성 요청 |
| ConsultationSupportPanel | 약사 판단 지원 질문 |
| ConsultationParts / CustomerConsultationPage | 직원/고객 AI 번역 입력, 음성 입력 대상 ref 유지 |
| CornerAiButton | 공통 코너 디스플레이/태블릿 AI 상담 |
| AiContentModal | 공통 콘텐츠 편집기, 운영자 콘텐츠, 매장 제작/POP/QR/블로그, LMS 등 호출처 |
| LlmAssistPanel | 매장·공급자 자료함·협력사업 운영자·관리자 CMS·공통 콘텐츠 작성·화면 세트의 추가 요청 |
| SupplierProductLlmAssistPanel | 공급자 상품 보조의 추가 요청 표시만. 상품 DB/등록 로직 변경 없음 |
| SimpleAIModal | 관리자 페이지 AI 생성/편집 요청 |

`services/`, `packages/`, 관리자 앱 전체의 AI/assistant/chat 파일, placeholder, 기본 및 공통 Textarea/Input 사용과 심볼/파일 경로 소비처를 조사했다. AI 현황 요약처럼 요청 입력이 없는 기능에는 새 입력창을 만들지 않는다. 모델 설정·시스템 프롬프트 관리·참고자료/원문·붙여넣은 결과/본문 편집·검색·일반 업무 폼은 대화 요청창이 아니므로 기존 목적과 크기를 유지한다.

## TODO / 검증

- [x] 전체 소비처 및 디자인 정본 조사, 동일 요청 패턴 결정
- [x] Design Core 공통 입력창 작성 및 위 11개 제공자 적용
- [x] 관련 기능 회귀 테스트·IME·전송/비활성화 확인
- [x] PC/모바일 실제 브라우저에서 크기·테두리·포커스·줄바꿈·overflow 확인
- [x] 소비 서비스 타입/빌드·문서 정합 검증
- [ ] PR HEAD의 CI·리뷰 검증
- [ ] 검증 결과 인계. main 병합·배포는 별도 사용자 지시

API, 권한, Task/Memory, AI 제공업체 호출, 저장·승인·게시 흐름은 변경하지 않는다.


## 로컬 검증 결과

- 공통 입력·Main·첨부/PC 연결/업무 재개·콘텐츠 모달/외부 보조·공급자 입력: 77 PASS. 내 매장 AI/portal·상담/번역/음성/약사 지원: 72 PASS. 기존 외부 LLM raw-source 계약: 28 PASS.
- 공통 패키지 빌드, 전체 frontend type-check, 웹 서비스 9개와 관리자 production build 통과. 새 의존 경로에 맞춰 UI를 content-editor보다 먼저 빌드하며, 관리자 dist 별칭 호환용 `ai/index` 진입점을 둔다.
- Chromium PC 1365px / 모바일 390px: 공통 입력·실제 StoreAiAssistant·번역 입력·LlmAssistPanel·AiContentModal·CornerAiButton 6종 × 실제 배포용 서비스 CSS 7종 × 2크기 = 84조합의 테두리/글자/기본 높이/최대 너비/overflow PASS. 동일 12화면의 focus·여러 줄 확장/상한 PASS. 실제 Main production 번들 2크기의 입력/첨부 메뉴 PASS. 격리 fixture와 합성 API 응답을 사용했으며 실제 계정/모델 호출·작업 제출 없음.
- 여러 줄 placeholder가 빈 입력창을 확장하지 않도록 보완. 화면 너비 변경은 ResizeObserver로 재측정한다. 요청 대기 중 다음 초안을 입력할 수 있는 기존 내 매장 동작은 유지하고 전송만 차단한다.
- 변경 파일 lint error 0(관리자 기존 unused 경고 5), diff check PASS, 문서 민감정보 검사 0건.
- 문서 정합: Design Core 정본에 현행 입력 패턴을 기록. 기존 단일행 입력 구현은 새 사용자 지시에 따라 자동 확장 textarea로 대체하며, 이전 CHECK의 수치는 당시 증거로 보존한다. AI 설정 폼·원문/결과 편집과 권한·업무 실행 계약은 변경 없음.

WORKTREE_DISPOSITION: 전용 `wo/ai-composer-standard` / `ai-composer-standard`, base `d851da872d`. main 미병합·미배포. 검증 기록과 PR 후속 통합을 위해 KEEP.
