# TODO-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1

- 작성: 2026-10-18
- 상태: PUSHED · 운영 미적용
- 사용자 승인: 연합회 산하 조합관리와 개별 조합원관리의 admin/operator 분리. 개발·검증·commit·push까지. PR 생성·병합·운영 DB 적용·배포 없음.
- 기준: origin/main 6419df05c7. 도메인 https://pharmcoop.neture.co.kr.

## 실행 TODO

- [x] 최신 main에서 전용 worktree·branch 준비, 현재 권한 경로 조사
- [x] 권한 정책과 API·데이터 설계 문서 작성
- [x] 연합회 역할과 조합별 admin/operator 배정 분리
- [x] 조합 등록 접수·검토·보완과 admin 최종 승인·상태 관리
- [x] 연합회 admin의 조합 admin 지정·해제, 조합 admin의 operator 지정·해제
- [x] 개인 가입 신청·검토·보완·승인·거절·정지·복구·탈퇴·제명 처리
- [x] 사유·처리자·시각 이력, 타 조합 차단, 마지막 admin 보호
- [x] 연합회 산하 조합관리·개별 조합원관리 화면 연결
- [x] 기존 사업 운영 API와 테스트 조합 provisioning을 조합별 권한에 맞춤
- [x] forward migration·개인정보 삭제 경계·스키마 fingerprint 검증
- [x] 권한/API/격리 PostgreSQL·UI 검증, 결과 기록
- [x] 문서 정합 점검·commit·push·인계

## 확정 권한

| 범위 | admin | operator |
|---|---|---|
| 연합회 | 조합 최종 승인·거절·정지·복구, 조합 admin 지정·해제 | 조합 신청 접수·검토·보완 요청 |
| 개별 조합 | 조합원 가입 승인·거절·정지·복구·탈퇴·제명 의결 반영, 조합 operator 지정·해제 | 회원 조회·신청 검토·보완 요청·최종 처리 요청 |

- 연합회 역할은 기존 neture:pharmcoop_admin / neture:pharmcoop_operator를 사용한다. 일반 Neture 전역 역할은 연합회 권한이 아니다.
- 개별 조합 역할은 조합 ID에 묶는다. Neture 전역 역할 부여를 요구하지 않는다. 연합회 역할만으로 개별 조합의 콘텐츠·회원에 접근하지 못한다.
- 한 사람은 여러 조합에서 다른 역할을 가질 수 있다. 조합 관리 역할은 개인 조합원 자격과 별도다.
- 자격 종료는 해당 조합 접근 종료다. 플랫폼 계정·다른 조합·약국 조직·매장 권한을 삭제하지 않는다.
- 최종 처리에는 사유를 기록한다. 제명은 정관상 의결 결과의 반영이며 시스템이 의결하지 않는다.
- 자기 관리 역할 해제 및 마지막 admin 해제를 차단한다. 운영자 배정 대상은 기존 활성·이메일 인증 계정이다.
- 최초 연합회 admin은 기존 공통 관리자 역할 지정 경로를 사용하며 이 작업은 실제 계정을 생성하거나 운영 권한을 부여하지 않는다.

## 조사한 현행 문제

- CooperativeService는 개인 가입 조회만 제공하며 가입·심사·연합회 관리 화면은 placeholder다.
- BUSINESS_OPERATOR_PREDICATE가 연합회 pharmcoop 역할을 모든 산하 사업에 전파한다.
- 기존 provisioning은 Neture 전역/협업체 역할을 요구하고 semi_franchise_operators에 배정한다.
- 이미 적용된 CreateCooperativeMemberships1792216000000은 변경하지 않는다. 신규 migration만 추가한다.

## 검증 및 인계

[검증 기록](../checks/CHECK-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1.md)을 따른다. 신규 migration은 격리 DB에서만 검증했으며 운영 적용·계정 생성·배포는 수행하지 않았다. PR 생성 없이 branch push 후 종료한다.

- 구현 commit `ec56052809`를 전용 branch에 push 완료했다. PR 생성·병합·운영 적용은 수행하지 않았다.
