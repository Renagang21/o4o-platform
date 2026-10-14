# Neture 상품 승인 — 삭제 실패·대상 보존 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거 WO/IR**: 사용자 요청 — 다음 운영자 작업 진행, TODO → 조사·보완 → 작업·검증

착수 main: `f8d1887ef2f0cd9920667a7275749195d9e28d8a`. PR #544 표시 정비와 별도 branch에서 시작한다.
약사회 분회, 서비스 간 공통화, API·권한·삭제 정책·DB 변경은 제외한다. 실제 운영 상품을 삭제하지 않고 fixture로 검증한다.

## TODO → 코드 조사 후 보완

| 발견 | 보완한 작업 | 보존 조건 |
|---|---|---|
| pending 삭제 API가 실패를 반환해도 모달·대상을 지움 | 실패 시 대상과 모달 보존, 오류 안내·재시도 | Offer ID로 삭제, 승인 레코드 ID와 구분 |
| 예외 발생 시 loading 복구 없음 | try/catch/finally와 동기 ref 잠금 | 중복 요청·취소·대상 변경은 처리 중 차단 |
| 처리 중 취소·다른 행 선택 가능 | 진입/취소/확인 guard, 대상 이름 snapshot 표시 | 실패 시 목록·체크 선택·상세 유지, 성공 후만 재조회 |
| 성공 전 열어 둔 상세의 낡은 closure | 성공한 Offer와 현재 상세를 functional update로 비교 | 다른 상품 상세는 닫지 않음 |
| 삭제 확인창과 Drawer가 같은 z-index | 확인창을 Drawer 위에 배치, 이름 있는 native dialog | 기존 완전 삭제 경고·현재 역할 경계 유지 |

서버는 기존 `OFFER_NOT_FOUND`, `NOT_PENDING`, 승인 서비스·활성 listing·service product 보호 조건을 유지한다.
이번 단위는 pending Offer 완전 삭제에 한정한다. 승인 상품의 휴지통 이동과 목록/분석 추가 분리는 다음 단위다.

- [x] TODO 작성, route·API·실제 소비처와 기존 테스트 조사.
- [x] 실패/성공/예외/중복/취소/권한/대상 보존 조건으로 TODO 보완.
- [x] 실패를 먼저 재현하는 화면 회귀 테스트.
- [x] 최소 수정, focused 회귀·타입·빌드·desktop/mobile fixture 검증.
- [x] CHECK·전체 TODO 정합, 구현 commit/push·PR #555 생성.
- [x] PR 기술 gate·main 통합·배포 판정 확인.
- [x] 별도 API 선행 정비·승인된 migration/API 배포 완료와 Neture serving/공개 HTTP 확인.

실계정 검증은 사용자 담당이다. 기존 PR #544의 병합·배포 완료는 별도로 확인한다.

## 2026-10-14 main 반영과 배포 판정

PR #544 (`24b96f373`)과 PR #555 (`dadc13e62`)는 정상 main 병합 후 CI까지 통과했다. 최신 Neture 전체 94파일·838건 및 focused 50건 통과.
Neture-only 배포는 API 의존으로 보류됐다. 별도 API 번들 타입 재export 오류와 미적용 AI quota migration/API 배포가 선행한다. **main 반영 완료이며 운영 배포 완료는 아니다.**
실행·검증·원인·서비스 범위의 상세 근거는 [최종 CHECK](../checks/CHECK-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1.md)를 따른다. 이 세션에서 API/migration 배포와 약사회 분회 배포는 실행하지 않았다.

## 최종 완료 — 2026-10-14

선행 PR #557과 API/Neture 운영 배포 완료를 확인했다. Promote `38497933074` 및 후속 Neture Delivery `38499037614`의 실제 deploy/serving Report는 SUCCESS이며, 두 배포 source가 이번 운영자 변경을 포함한다. 최신 main `6eeea05a2` Delivery `38500377113`은 NO_DEPLOY다. Neture root·API health는 현재 HTTP 200이다.
상세 증거는 [최종 CHECK](../checks/CHECK-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1.md)의 배포 보류 해소 절을 따른다. 과거 보류 기록은 보존한다. 실계정 업무 검증은 사용자 담당이다. 문서-only 후속이며 API/migration·약사회 분회 배포를 새로 실행하지 않았다.
