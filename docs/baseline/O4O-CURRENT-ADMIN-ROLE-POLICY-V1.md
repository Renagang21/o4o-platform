# 현재 전체 관리자와 폐기 역할 정책

> **상태**: ACTIVE
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20 (Asia/Seoul)
> **근거 WO**: [관리자 메뉴·역할 정비](../work-orders/WO-O4O-ADMIN-PLATFORM-MENU-ROLE-CLEANUP-V1.md)
> **부분 대체 대상**: [ROLE-POLICY-AND-GUARD-V1](ROLE-POLICY-AND-GUARD-V1.md)의 전체 관리자 역할·역할 종류 편집·폐기 역할 취급 범위

## 현재 결정

전체 관리자 역할은 `platform:super_admin` 하나다. 중앙 관리자는 기존 서비스별 admin/operator 지정으로 운영 권한을 관리한다. 서비스 관리·서비스 대상 정책·역할 종류 편집 메뉴는 제거한다. 서비스 회원의 가입·신청·승인과 실제 이용 업무는 각 서비스가 맡는다.

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

구현·검증·배포 상태는 [검증 기록](../checks/CHECK-O4O-ADMIN-PLATFORM-MENU-ROLE-CLEANUP-V1.md)에서 구분한다.
