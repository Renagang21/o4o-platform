# Neture 상품·공급자 승인 업무 정비

> **상태**: ACTIVE
> **작성일**: 2026-10-14
> **근거**: 사용자 요청 — 너무 작은 단위로 나누지 않고 TODO → 보완 → 구현 → 검증.

## 범위와 최초 TODO

- [x] 최신 main 조사 및 route·API·테스트 소비처 확인.
- [x] 아래 실제 결함·책임 경계·보존 조건으로 TODO 보완.
- [x] 상품 승인 조회/분석/필터/선택 상태의 책임 분리와 승인 상품 휴지통 이동 실패·재시도 보완.
- [x] 공급자 승인 상세/서류 표시·입력 모델 분리와 저장/심사 요청 수명 정비.
- [x] 두 승인 흐름 통합 회귀, 타입·lint·production build·fixture browser 검증.
- [ ] CHECK와 ACTIVE TODO 정합, push/PR 및 기술 gate 확인.

## 조사 후 보완

기준 main `334094e7c57e21cc0d7d027cf728aea0558a671c`. 새 독립 clone/branch 사용(환경 setup 스킬의 worktree 생성 제한 적용).
상품 승인은 `/operator/product-service-approvals`와 `/admin/product-service-approvals`가 같은 화면을 소비한다.
공급자 승인은 `/operator/suppliers`에서 기존 operator API를 사용한다. 다른 세션의 공급자 업무공간 정비는 이번 승인 화면과 별개다.

| 발견 | 이번 구현 | 보존/검증 조건 |
|---|---|---|
| 상품 Page가 조회·분석·검색 타이머·선택·mutation을 함께 소유 | Neture 내부 구체적 조회 hook으로 read 책임 묶음 분리 | 최신 응답만 반영, 계정/조건 변경, 검색 취소, 현재 page 재조회, 선택 초기화 유지 |
| 승인 상품 휴지통 handler에 실패 표시·catch/finally·동기 lock 없음 | 기존 확인 절차/softDelete Offer API 유지, 실패 알림·재시도·상호 mutation lock | 실패 목록/선택/상세 유지, 성공만 같은 Offer 상세 닫기와 기존 page1 갱신, 중복/권한/언마운트 보호 |
| 공급자 Page에 상세/서류 표시·5개 필드 입력 모델·심사 실행 혼재 | 내부 상세 컴포넌트/모델과 요청 hook 분리 | 프로필 미완료 승인 가능, backend 필드가 권위, 기존 오류별 안내/마스킹/서류 종류 유지 |
| 공급자 저장/단일 심사에 동기 중복 방어와 예외 종료 처리 부족 | 모든 심사/정보 저장/일괄 재시도를 한 write lock으로 직렬화 | 실패 입력·사유 보존, 처리 중 대상 교체/닫기 금지, 성공 후 refetch, 일괄 실패만 재시도 유지 |

서비스 간 공통화·공유 패키지 수정·새 심사/서류/이력 정책·API/DB/권한/route 변경과 약사회 분회는 제외한다.
실제 계정/상품 변경은 하지 않는다. 실계정 검증은 사용자 담당이다.

## 검증과 종료

기존 상품 승인 5파일 50건과 공급자 동작 테스트를 보존하고 실패/중복/재시도 회귀를 보강한다.
실행 결과는 [CHECK](../checks/CHECK-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md)에 기록한다.
DEPLOYMENT = REQUIRED (Neture frontend only). API/migration 배포는 범위 밖이다.
기준 정본: [역할별 업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [문서 생명주기](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md).
