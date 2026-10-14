# AI 복잡성 정비 공통 소비처 검증

> **상태**: COMPLETED (branch 코드·검증)
> **작성일 / 최종 갱신**: 2026-10-13 (Asia/Seoul)
> **근거 WO**: [AI 실행부·편집기·전체 소비처 정비](../work-orders/WO-O4O-AI-COMPLEXITY-COMPLETION-V1.md)

## Shared Module Change Verification

### Changed shared module

- API 내부 Work action/read/assistance session과 기존 `ai-prompts/common`, file-understanding descriptor 검증.
- 기존 `@o4o/content-editor`의 Modal private generation/view/save lifecycle 및 preview. public props/barrel/type 계약은 유지한다.
- 직접 소비: Work runtime/dispatch, AI proxy·hospital route, 5개 prompt parser, Toolbar 및 shared-space-ui CommunityContentWriteShell.
- 간접 소비: RichTextEditor를 사용하는 서비스 editor/콘텐츠 화면. 전체 4,479 production 소스의 import/reexport/package export/alias/literal dynamic 및 tracked symbol/raw-source 소비를 함께 조사했다. 미해석 import나 lexical 미사용을 삭제 근거로 쓰지 않았다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
| --- | --- | --- | --- | --- | --- |
| API Work / Personal Assistant | 사용 | 행동/읽기/도움 책임 분리 | 기존 proposal/Node/window 검증·Task 완료·안전 인계 유지 | API build, 23 suites 297 tests, raw-source 계약 | PASS |
| 공용 AI proxy | 사용 | descriptor/parser 순수 공통화 | authenticate + 기존 limiter·제공 업체 선택 유지 | 26 신규 golden + file understanding 회귀 | PASS |
| hospital AI structure | 사용 | descriptor 검증 동일 helper | 기존 loginless surface + rate limit 유지 | hospital 구조 회귀 | PASS |
| content-editor Toolbar / shared-space-ui | 사용 | 생성/복사/view/save lifecycle | public props·headers·credentials·저장 API 유지 | package build/typecheck·34 UI tests·mock smoke | PASS |
| Neture | 사용 | 간접 editor + Work 소비 | 기존 caller 문맥/진입점 유지 | app/dependencies build, UI tests | PASS |
| KPA-Society / web-store | 사용·은퇴 경계 혼재 | 공통 editor 소비, 내부 AI 은퇴 지점 보존 | showInternalAi=false·retired mount 복구 없음 | 전역 소비 조사 + 142 boundary tests | PASS (운영 로그인 smoke 미실시) |
| lecture / admin | 간접 editor 사용 | 공통 Modal 내부 변경 | 서비스 route/role 메뉴 변경 없음 | 전역 import/props 조사·공통 package 검증 | PASS (서비스별 app smoke 미실시) |
| K-Cosmetics | 직접 Modal 소비 미발견 | 이번 서비스 소스 변경 없음 | 메뉴·capability 변경 없음 | tracked import/소비 조사 | PASS (운영 smoke 미실시) |
| 기타 operator/shared 화면 | 간접 package 사용 | 동일 공통 editor·표면별 callback 유지 | 별도 권한/client/route 문맥 공통화하지 않음 | 전체 소비 조사·101 후보 판정 | PASS (정적 조사 범위) |

### Route / role / capability check

- Route existence: 기존 endpoint/등록을 변경하지 않았다.
- Role guard: 공용 AI authenticate/limit와 hospital loginless surface/limit의 서로 다른 기존 경계를 유지한다. AI 실행이 업무 권한/Node 검증을 우회하지 않는다.
- Capability map / visibility/filter / empty group: 변경 없음. 은퇴된 매장 내부 AI를 소스 존재만으로 복구하지 않는다. 저장 compatibility flag는 mock fixture에서만 사용했다.
- 공통화는 전체 소비 검토 뒤 계약이 동일한 validator/필드 해석 3개 그룹으로 한정했다. 기존 common 사용, 신규 Core/shared package/일반화 저장소는 만들지 않았다.

### Smoke result

- 격리 mock browser에서 실제 Modal의 desktop 1280×900 / mobile 390×844 생성·삽입/URL과 desktop 저장 호출을 확인했다. 정상 화면 전후 pixel 차이 0, runtime/console error 0. 늦은 생성 응답은 다시 연 view를 갱신하지 않는다.
- KPA/K-Cosmetics/Neture 운영 로그인 smoke는 테스트 계정 파일 부재로 실행하지 않았다. 서비스별 권한은 서버 계약·tracked 경계 tests로 검증했다. 운영 DB/실 PC/유료 API 호출 없음.
- Jest 31 suites / 525 tests, UI 34 tests, Node 34 tests PASS. API/content-editor/Neture build/typecheck PASS. 변경 TS/TSX lint 오류·경고 0. 동일 fixture 전후 공통화 비교는 52 tests PASS로 중복 집계하지 않는다.

## 문서 정합·전달 경계

WO의 TODO/101 후보 판정/지표/검증과 구현을 맞췄다. 기존 canonical·Freeze·index·과거 WO는 수정하지 않았다. 시작 기준 `3809c42db3`와 앞 AI 연결 branch에서 검증했다. 전달 시 main은 `e388b1534f`로 이동했고 같은 runtime/Modal의 별도 phase2 정비가 포함되어 있다. push만 수행하며 main 통합 시 두 구조 및 신규 tests를 함께 검토·재검증해야 한다. 본 CHECK는 그 통합 결과의 보증이 아니다.
