# Neture 상품 승인 표시·입력 책임 정비 TODO

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-14
> **근거 WO/IR**: 사용자 요청 — 남은 복잡성 작업 진행, 조사 → TODO 보완 → 작업 → push

기준 main `75a28d9313fc2be31cc53c12b94d566314748d75`. 세션 전용 clone/branch에서 진행한다.
운영자 및 전체 관리자 상품 승인 route가 같은 화면을 사용한다. 기존 화면 회귀 테스트 3개 파일과 모델/결과 테스트가 소비처이며 scripts/tools의 raw-source 계약 검색 결과 없음.
약사회 분회·서비스 간 공통화·API/권한/DB 변경·삭제 처리 변경은 제외한다. 초기 종료는 push였고 사용자 후속 요청으로 이번 작업의 PR/merge/배포까지 진행한다.

## 조사 → TODO 보완

| 항목 | 발견 | 이번 단위 | 유지 조건 |
|---|---|---|---|
| R1 상세 | Drawer 약 180줄 표시와 행동이 부모에 혼재 | Neture 내부 controlled 상세 컴포넌트 | item/권한/busy와 부모 callback 전달, 신규 조회·상태·API 없음 |
| R1 입력 | 승인/거절 모달의 입력·오류·버튼 구조 반복 | Neture 내부 결정 입력 컴포넌트 | 제목·사유 template·색상·입력·오류·잠금 유지; 요청/ref guard는 부모 유지 |
| F1 품질 | 표시 helper가 부모에 존재, Drawer에서 반복 IIFE | 내부 표시 모델과 명시적 계산값 | 점수 경계·승인 offer 우선·규제/가격/누락 표시 그대로 |
| 모바일 | 배지·날짜·행동 shrink-0 때문에 상품명 공간 소진 | 카드 wrap과 상품 정보 폭 확보 | 데스크톱 기존 그룹 유지, mobile 상품명·배지·행동 접근 가능 |
| N1 문구 | 기존 안내 문구의 깨진 문자 | 선택한 서비스 안내 문구 정정 | 의미·정책 무변경 |
| 모달 겹침 | Drawer와 결정 모달 모두 z-50, Drawer가 뒤에 렌더됨 | 결정 모달을 Drawer 위에 표시 | Drawer를 임의 닫거나 심사 상태 전이 변경하지 않음 |

- [x] 최신 main·route·원문 소비처·기존 테스트 조사.
- [x] 표시/입력과 부모 실행 책임, 권한·실패·중복 방어 보존 조건을 TODO 보완.
- [x] 내부 표시 helper·Drawer·결정 모달 분리와 responsive 배치 보완.
- [x] 기존 실패/부분 성공/조회 수명 회귀 및 Drawer 진입·권한·표시 검증.
- [x] 타입·lint·Neture build·desktop/mobile browser 검증.
- [x] CHECK·현재 전체 TODO 정합·commit/push.

후속: 상품 삭제 실패·대상 보존 별도 검증, 목록/분석 책임과 복잡한 상태 소유권 추가 조사. 새 공통 모듈은 만들지 않는다.

검증: [CHECK](../checks/CHECK-NETURE-PRODUCT-APPROVAL-PRESENTATION-V1.md). 남은 목록/분석 책임·삭제 실패 처리는 별도 TODO이며 전체 정비가 완료된 것은 아니다.

## 통합·배포 후속

사용자 요청: 이 세션에서 작업한 미병합·미배포 항목 모두 merge/배포. 앞선 8개 트랙은 PR #538 및 Promote 38387560873으로 완료. 남은 표시 정비 branch는 최신 main `3809c42db`를 merge했고 source 파일 충돌은 없었다. 신규 migration 변경 없이 Neture 배포 범위를 Delivery 판정으로 확정한다. 약사회 분회는 제외하며 무관한 다른 세션 PR·기존 미커밋 문서는 보존한다.

## 2026-10-14 main 반영과 배포 판정

PR #544 (`24b96f373`)과 PR #555 (`dadc13e62`)는 정상 main 병합 후 CI까지 통과했다. 최신 Neture 전체 94파일·838건 및 focused 50건 통과.
Neture-only 배포는 API 의존으로 보류됐다. 별도 API 번들 타입 재export 오류와 미적용 AI quota migration/API 배포가 선행한다. **main 반영 완료이며 운영 배포 완료는 아니다.**
실행·검증·원인·서비스 범위의 상세 근거는 [최종 CHECK](../checks/CHECK-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1.md)를 따른다. 이 세션에서 API/migration 배포와 약사회 분회 배포는 실행하지 않았다.
