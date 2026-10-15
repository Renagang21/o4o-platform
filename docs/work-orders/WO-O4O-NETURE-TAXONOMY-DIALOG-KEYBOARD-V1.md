# Neture 분류 관리 dialog 키보드 조작

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거**: 브랜드·카테고리 편집 창 초점 이동/Tab 순환/Escape/초점 복귀 진행 요청

## 범위

PR #577 병합을 확인한 최신 main `761fb49e3e`에서 전용 worktree/branch를 준비했다. Design Reference: [Service.Professional](../../ui-guidelines/theme-profiles/service.professional.md), [Design Core](../rules/DESIGN-CORE-GOVERNANCE.md). 두 페이지의 기존 화면과 명령을 유지하며 native dialog의 top layer와 앱 내부 Tab 경계 순환을 적용한다. 앱 내부 lifecycle hook만 두 소비처에서 사용하고 공통 UI 패키지/계약을 변경하지 않는다. 브랜드 대상 선택과 확인을 함께 native dialog로 구성하여 기존 body portal과 top layer의 충돌을 방지한다. 확인 창 초기 초점은 취소이며 처리 중 Escape는 명령을 취소하지 않는다. 비활성화된 버튼에서 dialog로 초점을 옮기고 실패 안내를 창 안의 alert로도 제공한다.

## 검증·인계

실제 Chromium PC/mobile에서 처음 초점·Tab/Shift+Tab containment·Escape/닫기/취소·원래 버튼 복귀·중첩 확인 및 실패/성공·busy를 합성 API로 확인한다. 카테고리 저장 후 row reload로 trigger가 없어지는 경우 heading fallback을 확인한다. 타입/build·기존 회귀·lint·문서 검사 후 명시한 경로 commit/push/PR로 통합 담당에게 인계한다. 운영 API/계정/DB 쓰기와 병합·배포 dispatch는 하지 않는다.
