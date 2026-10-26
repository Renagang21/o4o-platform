# O4O AI 콘텐츠 제작·편집·저장 흐름 검증

> 상태: COMPLETED · 작성일: 2026-10-26
> 작업: [WO·TODO·소비처 영향도](../work-orders/WO-O4O-AI-CONTENT-WORKFLOW-COMPLETION-V1.md)
> 기준 main: `b9526fb78d` · branch: `wo/ai-content-workflow-completion`

## 1. 구현과 보존 경계

기존 LlmAssistPanel·sanitizeRichHtml·RichTextEditor를 재사용한다. 공급자 자료함, 협력사업 운영자, 관리자 CMS가 조회/작성 중인 자료를 명시적으로 선택하고 외부 AI 요청문에 복사한다. 결과는 격리 미리보기→검토 확인→본문 교체 확인 후 편집기에만 적용한다. 적용 전 본문 복원은 그 뒤 수동 변경이 없는 정확히 같은 적용본에만 허용한다. 문서/사업/서비스 전환은 작업 세션을 버리고, 공급자 계정 교체·로그아웃도 이전 문서와 미완성 AI 결과를 제거한다.

저장·공개·등재 요청·검수·게시·권한·원장·schema·provider/비용 정책은 기존 도메인에 남는다. 외부 AI 계정 자동 로그인/유료 API·MCP 도구 추가가 아니다. 선택한 자료의 사실성/외부 전송 권리를 자동 판정하지 않는다. 외부 파일 URL의 본문을 가져오거나 모든 자료함을 자동 수집하지 않는다. 매장 기존 prompt builder와 상품 DB·공급자 등록 구현은 보존한다.

## 2. 로컬 검증

Node 22.18.0 / pnpm 10.25.0. 관리형 환경의 inode 여유가 적어 기존 설치 dependency를 task-local symlink로 참조하고 변경 패키지는 자기 worktree에서 빌드했다. 기존 dist를 hardlink로 재사용한 변경 대상은 생성 전에 자기 사본의 link를 unlink했다. package.json·lockfile·공유 설치본·운영 설정은 수정하지 않았다. clean install을 새로 수행한 검증과 구분한다.

| 실행 | 결과 |
| --- | --- |
| Neture Vitest: 실제 LlmAssistPanel 14·공급자 자료함 8·기존 운영자 계정 wrapper 6 | 3 files / 28 PASS |
| operator-core-ui 전체 Vitest | 30 files / 216 PASS. 이번 폼 14개를 포함하며 별도로 중복 합산하지 않는다. |
| Store Vitest: authoring session·adapters·기존 상품 설명 보조 | 3 files / 44 PASS |
| Admin CMS 실제 폼 Vitest | 1 file / 3 PASS |
| API source contract: 외부 LLM 제작·내부 AI 은퇴·제작 목적 정합 | 3 suites / 110 PASS. 기존 단언 무완화. |
| 실제 Chromium: Store·Supplier·Operator·CMS × desktop/mobile | 8 PASS. 각 경우 결과 적용 때 저장 0, 저장 버튼 후 검토 본문 write 1, 외부 HTTP 요청 0. |
| content-editor ESM+DTS, 보조 types/UI dependency build | PASS |
| Neture·Store·Admin·약국 사업·협력 모임 웹 production build | PASS. operator/store-ui-core는 source export 패키지로 독립 build script가 없으며 소비 웹에서 검증. |
| 변경 runtime 파일 ESLint | 오류 0·경고 0 |

브라우저 검증은 전용 localhost Vite fixture에서 실제 페이지·RichTextEditor·공통 패널을 구동하고 API/auth만 합성 adapter로 주입했다. 운영 로그인·원격 권한 확인/저장 성공·실제 ChatGPT 품질을 대신하지 않는다. 합성 참고자료만 사용했고 외부 HTTP는 차단했다. 각 역할의 desktop/mobile screenshot을 로컬 `/tmp/o4o-ai-content-<role>-<size>.png`에 보관했다. 공급자 mobile·CMS desktop을 시각 확인했고 수평 overflow가 없었다. 일회성 자료는 브라우저 메모리에만 존재하므로 운영 DB 업무 자료 잔존은 없다.

첫 테스트 실패는 접근성 이름에서 장식 아이콘 제외·중복 닫기 버튼 선택과 새 worktree의 공통 dependency 사전 빌드, Admin 테스트의 production source alias 누락이었다. 실제 접근성 이름과 production alias를 사용하고 현재 types/UI를 빌드한 뒤 재검증했다. 실제 기능/타입 오류를 assertion 완화로 숨기지 않았다. 기존 Browserslist/큰 bundle 경고는 이번 범위에서 변경하지 않는다.

## 3. 문서 정합·남은 범위

WO에 현재 KEEP/CONNECT/FIX와 Consumer Impact Matrix를 기록했다. 현행 콘텐츠 운영 원칙·역할 경계는 바꾸지 않으며 다른 에이전트의 상품 DB·등록 작업과 공통 통합 TODO/구조 문서는 충돌을 피하기 위해 수정하지 않았다.

실제 계정에서 권한별 자료 선택·외부 AI 결과 품질·저장과 재열기, 게시/검수는 후속 운영 검증이다. 저장 single-flight는 같은 폼의 중복 클릭 방어이며 네트워크 장애 후 서버 멱등성을 새로 제공하는 것은 아니다. 이번 외부 AI UI 작업에 운영 가격·quota나 개인 메일 활성화를 섞지 않는다.

## 4. Git·원격 상태

중간 원격 확인에서 Git fetch와 GitHub CLI API 인증이 실패했으나, 일반 Git push는 성공했다. 구현 commit `7e2daf0e99a4ac297dbd2d69142783079276a6d2`와 원격 branch SHA 일치, 이후 정상 fetch 및 시작 기준과 같은 원격 main `b9526fb78d`를 확인했다. GitHub CLI API의 HTTP 401은 별도 경로의 미해결 상태이며 PR CI·리뷰를 통과했다고 보고하지 않는다. 최종 문서 인계 commit은 branch HEAD를 따른다. main 병합·배포는 미실행이고 개발·로컬 검증·push 범위로 이번 기록을 완료한다.

WORKTREE_DISPOSITION: `wo/ai-content-workflow-completion` / 기준 main `b9526fb78d` / 개발·push 완료·추후 PR/CI·main 통합 필요 / verdict KEEP. 다른 세션의 worktree·branch는 수정하지 않는다.

자기 localhost fixture server는 종료했고 운영 DB·외부 계정·공유 runtime은 변경하지 않았다. staged scope·git diff --check·docs 민감정보 검사(4266 files) PASS, 기준 checkout clean을 확인했다.
