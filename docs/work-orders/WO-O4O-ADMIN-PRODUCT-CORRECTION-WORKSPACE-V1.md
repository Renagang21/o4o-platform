# WO-O4O-ADMIN-PRODUCT-CORRECTION-WORKSPACE-V1

> **상태**: IMPLEMENTED · 통합·운영 배포 전
> **작성일**: 2026-10-24
> **현행 절차**: [관리자 상품 데이터 보정 작업 공간](../guides/products/O4O-ADMIN-PRODUCT-CORRECTION-WORKSPACE-V1.md)

## 범위

기존 상품을 보정하는 실행 대신, 관리자 기준 편집·버전 관리 → 대상 조회 → 상품 선택 → 작업 묶음 → 보완 초안·검토 메모·근거 저장을 구현한다. 기존 세션에서 진행한 상품설명서 정책 정합 작업의 연속으로, 준비된 클라우드 checkout을 사용했다.

상품 데이터 쓰기, migration, canonical 반영, QR 자료의 공식 지식 기반 승격, 외부 LLM 호출은 수행하지 않았다. 기준과 작업 기록의 저장은 기존 `settings` 전용 namespace만 사용한다. 공통 Product DB 권한은 기존 `platform:super_admin` 단독 계약을 유지한다. 기존 후보 정합화 카드는 별도 접기 영역에 보존했다.

## 검증 결과

- API 권한·입력 경계 및 기존 공통 Product DB 권한 계약: Jest 79개 통과. 새 mount·쓰기 route도 기존 계약 검증 대상에 추가했다.
- 격리 PostgreSQL 15 합성 데이터 통합: 4개 통과. 검색·페이지·모든 점검 연산자·기준 버전·동시 수정·원문 fingerprint·초안 저장을 확인했다. 상품·설명서 쓰기 금지 trigger 및 작업 전후 전체 내용 비교로 원본 미변경을 확인했다.
- 관리자 화면 Vitest: 5개 통과. 기준 수정, 선택 작업 생성, 초안 저장, 충돌 시 입력 보존, 이전 조회 응답 무시, 쓰기 권한 UI를 확인했다.
- `@o4o/types` build, API `tsc -p tsconfig.build.json --noEmit`, admin `tsc --noEmit`, admin `vite build` 통과.
- 변경 파일 ESLint 오류·경고 0건, `git diff --check` 통과. 문서 민감정보 검사 통과.
- Chromium 1440px/390px 합성 fixture: 기준 저장 → 대상 선택 → 작업 생성 → 초안·근거 저장 → 새로고침 후 작업 재개 통과. 페이지 오류·가로 넘침 없음. 실제 운영 API와 연결한 실계정 smoke는 미실행이다.

최초 확장 회귀 검사에서 새 controller mount가 기존 고정 목록에 빠진 것을 발견하여 목록·쓰기 경로 검증을 추가한 뒤 79개를 다시 통과했다. 최종 실패는 남아 있지 않다.

## 인계

점검 주기는 관리자 계획용이며 예약 실행 기능은 없다. 상품 원본 적용·승인·게시 경로 연결은 후속 범위다. 이번 브랜치는 선행 상품설명서 정책 commit에 이어지는 작업으로, 통합 시 선행 commit의 포함 여부도 확인해야 한다. 최신 `origin/main`의 다른 변경과 이번 수정 경로 간 겹침은 발견하지 않았다. 자동 merge/rebase는 수행하지 않았다.

PR/CI 실행, main 병합, 운영 배포는 수행하지 않았다. 통합 담당에게 개발 브랜치를 인계하며 작업 checkout은 후속 수정용으로 유지한다.
