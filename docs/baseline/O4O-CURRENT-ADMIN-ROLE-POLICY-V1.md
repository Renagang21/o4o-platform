# 현재 전체 관리자와 폐기 역할 정책

> **상태**: ACTIVE
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-29 (Asia/Seoul)
> **근거 WO**: [통합 운영 책임 정비](../work-orders/WO-O4O-UNIFIED-OPERATING-RESPONSIBILITY-V1.md) · [관리자 메뉴·역할 정비](../work-orders/WO-O4O-ADMIN-PLATFORM-MENU-ROLE-CLEANUP-V1.md)
> **부분 대체 대상**: [ROLE-POLICY-AND-GUARD-V1](ROLE-POLICY-AND-GUARD-V1.md)의 전체 관리자 역할·역할 종류 편집·폐기 역할 취급 범위

## 현재 결정

전체 관리자 역할은 `platform:super_admin` 하나다. **2026-10-29 사용자 재확인에 따라 전체 관리자의 서비스 운영자 지정·관리 대상은 서비스 Admin만으로 제한한다.** `/operators`의 목록·통계·필터·신규 초대 선택지는 Admin만 다룬다. O4O 직영 업무 위임(`o4o-direct`)도 Operator 신규 지정의 예외가 아니다. Operator는 해당 서비스 Admin이 관리한다.

2026-10-28 통합 정책 중 중앙에서 직영 Admin·Operator를 모두 신규 지정한다는 범위는 위 기준으로 대체한다. 직영 업무의 중앙 화면 통합, 기존 초대·본인 수락·감사 구조, 독립 사업·조직의 운영 권한은 유지한다. 기존 Operator 역할·할당·중앙 위임은 삭제하거나 Admin으로 자동 전환하지 않는다. 과거 중앙 Operator 초대의 신규 수락·재발송은 차단하되 전체 관리자의 취소는 허용한다. 기존 권한 이력의 표시를 신규 지정 카탈로그와 혼동하지 않는다.

중앙 Operator의 진입은 Google 인증과 중앙 Admin의 유효한 직영 업무 위임이 필요하다. 서비스 역할 보유만으로 진입하지 않으며, 진입 후에도 업무별 서비스·조직 권한 검사를 유지한다. 일반 회원의 Google·카카오·이메일 로그인은 유지한다. 공통 상품 DB 권한 위임은 별도 결정 전까지 현행 전체 관리자 경계를 유지한다. 서비스 관리·서비스 대상 정책·역할 종류 편집의 폐기 메뉴를 통합 명목으로 복원하지 않는다.

| 폐기 역할 | 현재 취급 |
| --- | --- |
| `platform:admin/operator/manager/vendor/member/contributor` | 현재 역할 조회·발급·인가에서 제외 |
| `kpa:district_admin/branch_admin/branch_operator` | 폐기된 조직 역할. 현행 `kpa-branch:*`와 구분 |
| `kpa:pharmacist/student` | 자격 프로필은 유지하고 과거 역할은 현재 권한에서 제외 |
| `lms:instructor` | 현행 강의 서비스 `lecture:*`를 대신하지 않음 |

위 역할은 DB의 활성 이력 행이 남아 있더라도 현재 카탈로그·권한 목록·권한 판정에 사용하지 않는다. 관리자 사용자 목록과 서비스 회원 콘솔의 목록·상세도 같은 퇴역 판정을 따른다. cosmetics·PharmacyHub의 기존 퇴역 경계는 유지한다.

## 유지하는 경계

- 현재 `platform:super_admin`, 각 서비스의 admin/operator, `kpa:store_owner`, `kpa-branch:*`, `lecture:*`는 이 문서의 폐기 대상이 아니다.
- 중앙 관리자 역할은 다른 서비스 업무를 수행할 권한을 자동으로 만들지 않는다. 서비스별 scope·조직 소속 검사를 유지한다.
- [KPA 역할](KPA-ROLE-MATRIX-V1.md)과 [분회 역할](KPA-BRANCH-ROLE-MATRIX-V1.md)은 독립 권한 경계다.
- 원본 역할 정의·할당 이력의 물리 삭제나 운영 DB 정리 완료를 뜻하지 않는다.
- 기존 Frozen baseline의 나머지 유효한 계층·서비스 격리·guard 원칙은 유지한다. 이 문서가 그 범위의 정책을 새로 확장하지 않는다.

종전 메뉴·역할 정비의 구현·검증·배포 상태는 [검증 기록](../checks/CHECK-O4O-ADMIN-PLATFORM-MENU-ROLE-CLEANUP-V1.md)에서 구분한다. 2026-10-28 통합 정책의 구현·검증 결과는 위 통합 구현 WO에서 기록하며 종전 CHECK로 완료를 대신하지 않는다.
