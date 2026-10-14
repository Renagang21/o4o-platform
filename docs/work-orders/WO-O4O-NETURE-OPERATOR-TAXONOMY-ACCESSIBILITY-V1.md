# Neture 운영자 분류 관리 폼 접근성

> **상태**: ACTIVE · **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거**: 프론트엔드 디자인 후속 진행 및 작업별 검증·commit·push 요청

## 문제와 범위

최신 main `0d55cb4348`에서 브랜드 검색·병합 대상 검색, 카테고리 생성/수정, 매핑 규칙 추가/행 편집 입력의 명시적 이름 및 label 연결을 조사했다. 보이는 형제 label이 입력과 연결되지 않고 아이콘 닫기 버튼에 이름이 없다. 카테고리 표는 좁은 화면에서 내부 스크롤 없이 잘린다.

Design Reference: [Service.Professional](../../ui-guidelines/theme-profiles/service.professional.md) · [Design Core](../rules/DESIGN-CORE-GOVERNANCE.md). 세 Neture 운영자 페이지 내부 표현만 수정한다. useId로 컴포넌트 인스턴스별 label/input을 연결하고 검색·행 편집 이름, 닫기 이름/초점/터치 영역, 트리 펼침 이름·상태와 표 내부 스크롤을 제공한다. 브랜드 안내의 p/div 중첩 경고도 올바른 컨테이너로 정리한다. 공통 package·handler·payload·route·권한·API·DB·dependency·Docker 변경은 없다.

## 검증과 종료

기존 Neture 회귀 테스트·타입/Vite build·변경 파일 lint 및 실제 Chromium 1440/390/320px에서 label 클릭 초점·입력/선택·기존 저장 payload·닫기·표 스크롤·overflow를 확인한다. API는 합성 fixture로 응답하며 실제 계정·운영 DB 쓰기를 하지 않는다. 합성 검증을 운영 로그인 검증으로 표기하지 않는다. 이번 작업은 사용자 요청에 따라 검증 후 명시한 경로의 commit·push 및 PR 결과를 보고한다. main 병합·운영 배포 완료로 표시하지 않는다.

전용 worktree `/workspace/o4o-wt/neture-operator-taxonomy-accessibility`, branch `wo/neture-operator-taxonomy-accessibility`. 과거 완료 worktree와 기록은 보존한다. 검증 결과는 [CHECK](../checks/CHECK-O4O-NETURE-OPERATOR-TAXONOMY-ACCESSIBILITY-V1.md)에 기록한다.
