# CHECK-O4O-STORE-CONTENT-AUTHORING-COHESION-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거 요청**: 매장 화면의 남은 복잡성을 최신 main에서 조사하고, 관련 작업을 작게 나누지 않고 진행. 개발 담당은 commit · push · PR까지 수행.

## 대상과 판정

기준 main은 `d9dce2e5a43184f12f98c5f446d00a61717e9d46`이다. 착수 시 현행 매장 콘텐츠 작성·편집 진입점과 API 소비처를 다시 조사하여 아래 네 흐름을 한 작업으로 선택했다. 이전 기기·주문 PR의 변경은 가져오지 않았다.

| 화면 | 조사에서 확정한 문제 | 이번 변경 |
|---|---|---|
| `CreateContentFromResourcesModal` | 저장 중 닫기·다시 열기, 후속 편집의 중복 생성 위험 | 작성창 세대와 제품·매장 범위 구분, 확인된 생성 ID로 후속 수정, 초안 유지 |
| `StoreContentEditPage` | 이전 문서 응답 혼입, 저장한 body보다 오래된 html을 먼저 읽음 | 현재 문서 응답만 적용, body 우선 읽기, 제출 후 수정 유지 |
| `StoreDirectContentPage` | 저장·삭제 경합, 실패 후 초안 및 매장 전환 처리 중복 | 동일 문서 쓰기 잠금, 실패·재시도, 현재 매장에서만 후속 이동 |
| `ProductionMaterialEditorPage` | 기존 자산 편집과 생성 분기의 저장 상태 중복, 저장 후 새 편집 유실 | 기존 ID 유지, 제출 후 수정이 있으면 이동 보류, 알 수 없는 기존 category 보존 |

네 화면 내부의 비동기 상태 관리는 store-web 전용 `useContentAuthoringSession`으로 옮겼다. API 호출·응답 확인과 저장 형식은 `contentAuthoringAdapters`, 기존 JSON 변환은 `contentAuthoringModels`로 분리했다. 공통 Core로 승격하지 않았다. 페이지 자체는 합계 1,746줄에서 1,349줄로 줄었으나 추출 모듈·회귀 테스트를 포함한 전체 코드량 감소를 뜻하지 않는다.

자료 목록·선택 흐름(`StoreLibraryContentsPage`, `StoreLibraryResourcesPage`)과 PDF 내보내기는 이번 네 작성 화면과 별도 후속 조사 대상으로 남긴다.

## 유지한 계약

- snapshot: `contentJson.body` + `usage`를 저장하고 `blocks: []`로 정리한다. 나머지 metadata를 보존한다. 저장된 빈 body도 권위 값으로 읽는다.
- direct: `contentJson.html` + tags를 저장하고 레거시 blocks를 제거한다. 생성 metadata와 최초 productRef 연결 계약을 유지한다.
- 제작 자료: `htmlContent`를 저장하고 기존 execution asset ID를 수정한다. QR 참조를 위해 새 자산으로 대체하지 않는다.
- 확인되지 않은 success/data/id/organization 응답은 성공으로 처리하지 않는다. 읽기 실패 시 빈 초안을 덮어쓰지 않는다.
- 기존 외부 LLM 결과 붙여넣기 흐름을 유지한다. 신규 AI 연결·API·route·권한·schema·의존성 변경은 없다.
- 작성·삭제 확인창은 native dialog로 키보드 Escape·초점 복원을 지원하고 제목·태그 입력의 접근 가능한 이름을 연결한다.

근거 정본:

- [역할별 업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
- [매장 자료·자산 원본 경계](../design/DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1.md)
- [매장 Web 업무공간](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md)
- [콘텐츠 제작 흐름](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md)
- [콘텐츠 metadata](../platform/content/CONTENT-META-PRODUCTION-READY-V1.md)

## 검증 결과

Node `22.18.0`, pnpm `10.25.0`을 활성화하고 frozen lockfile 설치 시 store integrity 검증을 유지했다. store-web 의존 패키지를 먼저 빌드했다.

| 검증 | 결과 |
|---|---|
| `pnpm --filter store-web test` | 19 files / 191 tests PASS. 신규 session 18개 + adapter 16개 포함 |
| `pnpm --filter store-web build` | TypeScript + Vite production build PASS |
| 변경 파일 focused ESLint | 0 errors / 0 warnings |
| `node scripts/lint-ratchet.mjs` | PASS. 전체 46 errors / 995 warnings, error baseline 46 유지 |
| 실제 네 페이지 + 실제 RichTextEditor 브라우저 검사 | 합성 API, Chromium, 1280 / 375 / 320px에서 87 assertions PASS |
| `git diff --check` | PASS |

브라우저는 production 소스의 네 화면·RichTextEditor·TagInput·LlmAssistPanel을 사용하고 API·매장 컨텍스트만 합성 fixture로 대체했다. 외부 요청을 차단한 별도 임시 harness에서 실행했다. 읽기 실패 후 재시도, body 우선 읽기, 저장 중 추가 편집, 작성창 닫기·재열기, 중복 생성 방지, 후속 ID 재사용, 저장 실패 후 재시도, metadata·tags·productRef 보존, 삭제창 Escape·초점 복원, 이전 매장 삭제 결과의 이동 차단, 제작 자료 ID·htmlContent 보존, 모바일 가로 overflow와 브라우저 예외를 확인했다.

모바일에서 일시 알림이 사라지는 순간과 자동 스크롤·클릭이 겹친 초기 harness 실패는 알림 종료를 기다린 후 동일 버튼을 실제 클릭하는 방식으로 구분했다. 후속 저장과 이동은 정상 확인됐다. 테스트 fixture의 필수 metadata 필드·제작 유형 타입 누락은 수정한 뒤 테스트와 빌드를 재실행했다.

빌드는 기존 bundle 크기·Browserslist 안내를 출력한다. 전체 lint 기존 오류 46개를 해결한 작업은 아니다.

## 인계와 남은 검증

개발 범위는 검증 · commit · push · PR이다. PR 병합, 운영 배포와 post-merge 검증은 통합 담당이 수행한다. 이 기록은 통합·배포 완료 증적이 아니다.

실계정 로그인·권한 확인·운영 데이터 변경은 실행하지 않았다. 합성 검증은 운영 API·DB 성공이나 실제 직원·기기 흐름을 증명하지 않는다. 실계정 전체 업무 검증, QR 출력·스캔과 기기 연결·재생은 기존 사용자 결정대로 후속 단계에서 진행한다. Google OAuth 운영자·관리자 검증은 로컬 담당 대상이다.

이번 전용 worktree와 branch는 PR 미병합 동안 KEEP한다. 다른 작업의 worktree를 정리하지 않는다. 통합 담당은 required CI와 review blocker를 확인한 후 순차 병합·배포하고 결과를 개발 담당에게 전달한다.

문서 정합: 이번 변경은 기존 저장·자산 경계 안의 구현 정비다. 정본 판정·색인 변경 없음.
