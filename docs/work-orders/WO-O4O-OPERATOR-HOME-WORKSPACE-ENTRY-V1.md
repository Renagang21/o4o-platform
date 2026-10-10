# 운영자 대표 홈 공급자·매장 진입 복구 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-10
> **근거**: 사용자 보고 — 초기 화면에서 운영자가 공급자와 내 매장에 접근할 수 없음.

## 조사와 범위

초기 TODO는 코드 조사 전에 작성했다. 역할별 업무공간 정본과 현재 가드를 대조한 결과, 개인 공급자 active 상태 및 소속 매장만으로 카드를 구성하여 운영 권한만 있는 사용자는 빈 카드를 보게 된다.

기존 운영 화면 접근을 카드에 추가한다. 공급자 개인 업무는 승인 상태, 매장 업무는 조직 접근 조건을 그대로 유지한다. 운영자에게 개별 공급자·매장의 개인 업무 권한을 자동 부여하지 않는다. 새로운 API·role·DB 변경 없음.

- 공급자: 서버 `operatorServices`가 확정한 scope에 따라 `/operator/suppliers` 또는 `/admin/supplier-governance`. 기존 platform 예외는 동일 관리 화면으로 연결.
- 매장: 서버가 확정한 Neture 운영 참여자 또는 platform 관리자는 `/operator/pharmacy-memberships`. 기존 host routing이 `store.neture.co.kr`의 신청 심사 화면으로 연결한다.
- 일반 회원 및 비활성 운영 workspace에는 관리 링크를 표시하지 않는다.
- 단일 매장 자동 진입은 매장 handoff 항목만 계산하여 관리 링크와 구분한다.

## 순서별 TODO

- [x] 문제 TODO 작성.
- [x] 현행 코드·문서 조사 후 범위 보완.
- [x] 개인 업무 조건을 보존하면서 카드에 운영 링크 추가.
- [x] 관련 회귀 테스트 78개 통과(기존 전체 77개 + 단일 매장 운영 링크 회귀 1개).
- [x] Neture build 및 PC1440/모바일390 로컬 운영자 fixture browser 검증. 운영 실계정 검증과 구분.
- [ ] 전용 branch push·PR·CI·review 확인.
- [ ] main 통합·운영 배포·검증 기록.

## 환경과 보존

온보딩 skill의 isolated cloud checkout 재사용 지침에 따라 기존 checkout에서 최신 `origin/main` 기반 새 branch `wo/operator-home-workspace-entry`를 생성했다. 이전 완료 branch와 이전 작업공간은 삭제하지 않는다. 환경 재설정·의존성 변경은 필요하지 않다.

문서 정합: 정본의 개인 역할 경계는 유지하고 홈 진입의 운영 안내를 보완한다. 과거 WO의 당시 기록은 수정하지 않는다.
