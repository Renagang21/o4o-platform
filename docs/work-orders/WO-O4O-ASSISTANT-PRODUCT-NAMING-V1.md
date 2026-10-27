# O4O 업무 도우미 · 서비스 AI 명칭 정합

> 상태: COMPLETED · 작성일: 2026-10-27
> 근거: 사용자 확정 — 대표 명칭 `O4O 업무 도우미`, 영문 `O4O Personal Assistant`, 각 서비스 AI 대표 명칭 `O4O Service AI Agent`. PC 실행 도구는 별도 제품명으로 노출하지 않는다.
> 기준 main: `29368ac6159831775ef17864ab6a8397cac6eda3` · branch: `wo/assistant-product-naming`
> 종료 범위: 문서·사용자 문구 정합·검증·commit/push. PR 생성·main 병합·배포는 별도 사용자 지시 대상이다.

## 1. TODO

- [x] 최신 main의 정본·개발자 안내·Main 화면·PC 연결 안내·서버 응답·기존 테스트 소비처 조사
- [x] Assistant V2와 개발자 안내·색인·Core 연결 문서에 확정 명칭과 역할 관계 반영
- [x] Main 회원 안내와 PC 연결 UI/오류 응답의 사용자 문구 정합
- [x] 기존 회귀·변경 파일 lint·영향 웹 build·문서 검사 후 결과 기록
- [x] 자기 변경만 commit/push하고 검증·미실행 범위 인계

## 2. 범위와 소비처

- 대표 홈은 O4O 업무 도우미의 기존 자연어 진입을 유지한다. 서비스별 AI의 대표 명칭은 O4O Service AI Agent이며, 업무 Extension 기반 전문 기능과 공통 도우미의 연계 관계를 명시한다.
- web-neture의 회원 안내, My Home PC 연결 카드·연결 오류, ai-tool-router의 PC 미연결 응답을 수정한다. 서버 응답은 기존 도구 라우터의 모든 소비처에 같은 명칭을 제공하며 권한·도구 선택·실행은 바꾸지 않는다.
- 내부 Local Agent/Work Agent 명칭, endpoint·error code·type·Task/run·통신·저장 키는 유지한다. 도구·프로그램을 삭제하지 않는다.
- 과거 WO/CHECK/IR·은퇴 문서는 당시 기록으로 보존한다. 상품 DB·공급자 등록, 모델·가격·quota·DB·인증·메뉴 구조는 범위 밖이다.

## 3. 검증·인계

- Node 22.18.0 / pnpm 10.25.0, 자기 worktree에서 frozen install 및 공통 패키지 build PASS. manifest·lockfile 변경 없음.
- web-neture 기존 회원 안내·PC 연결 카드 2 files / 17 tests PASS, 홈 데이터 정비·진입/배치 2 files / 16 tests PASS. 새 대표 제목에 맞게 기존 명칭 단언만 수정했으며 동작 단언은 유지했다.
- API 기존 ai-capability-tool-routing·home-chat-tool-presentation 2 suites / 43 tests PASS.
- web-neture `build` (tsc + Vite production) PASS. Browserslist/큰 bundle 기존 경고는 범위 밖이다.
- 변경 runtime/test 파일 ESLint 오류 0. 홈의 기존 unused eslint-disable warning 1건은 보존했다.
- 실제 Chromium으로 메인 비로그인 화면 desktop 1440×1000 / mobile 390×844 PASS: 대표 명칭·이름이 연결된 요청 form·가로 overflow 없음·pageerror 없음. 외부 요청은 합성 응답으로 격리했고 운영 인증·모델 호출·실 PC 연결은 하지 않았다. screenshot은 `/tmp/o4o-naming-desktop.png`, `/tmp/o4o-naming-mobile.png`이며 mobile을 시각 확인했다.
- 문서 민감정보 검사 및 `git diff --check` PASS. 문서 정합: V2 §0-2에 사용자 결정을 기록하고 개발자 안내·색인·Core 연결 설명을 정합했다. 과거 실행 기록은 보존했다.

API `type-check` PASS. 작업 중 main이 `885f71d568`로 이동한 것을 fetch로 확인했으며 변경 경로가 이번 12개 파일과 겹치지 않았다. 다른 작업을 자동 merge/rebase하지 않고 시작 기준 main에서 검증한 branch를 인계한다. 최종 원격 SHA 확인은 완료 보고의 branch HEAD를 따른다. PR CI·리뷰·병합·배포는 미실행이다. 이번 명칭 변경은 운영 반영이나 실제 PC 실행 검증의 증거가 아니다.
