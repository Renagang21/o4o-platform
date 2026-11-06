# Operator 회원 검토·전체 관리자 보호 TODO V1

- 기준: 2026-11-06 사용자 결정, base `44b2460b6dc8ee4ecbb97fe21747208c642525d9`
- 정본: ROLE-WORKSPACE V2, CURRENT-ADMIN-ROLE-POLICY V1, UNIFIED-MEMBER-REGISTRATION V1
- 개발 종료: 로컬 검증·commit·작업 branch push. main 병합·배포·운영 데이터 변경 없음.

## 정책과 구현 대조

1. `platform:super_admin`은 역할의 활성·유효기간으로 판정한다. 이메일/가입 유형으로 판정하지 않는다.
2. 관련 업무 조회 범위 안에서는 행을 유지하고 **전체 관리자 — 처리 대상 아님**으로 표시한다. 이 표시는 새 조회 권한을 부여하지 않는다.
3. Operator 화면에서는 승인·반려·정지·복구·정보/역할 변경·탈퇴 버튼을 제공하지 않는다. 직접 API·일괄 요청도 서버에서 차단한다. 별도 Admin 계정 관리와 기존 최후 관리자·자기 승인 보호는 유지한다.
4. 다른 서비스 공통 회원 콘솔과 약국협업체의 독립 조합원 관리에도 적용한다. 서비스/조직 경계를 유지하며 개인 조합원과 약국 사업체 회원을 혼동하지 않는다.
5. 자격 검토는 전체 제출 정보와 현재 자격·사업체 정보를 확인하는 명시적 상세 화면에서 진행한다. 신규 가입의 단일 승인을 예전 자격 검토로 대체하지 않는다. 추가 자격 변경의 별도 검토는 유지한다.

## 작업

- [x] 최신 main·정본·기존 작업공간 확인, 전용 worktree 준비
- [x] 소비처/서버 변경 경로 조사 및 빠진 경로 보완
- [x] 정본에 조회 전용 전체 관리자 대상 규칙 명시
- [x] 공통 서비스 회원 콘솔(목록·일괄·상세), 중앙 회원/자격, 약국협업체 대상 표시와 서버 차단
- [x] 자격 검토를 전체 정보 상세 화면으로 연결, 로딩·오류·닫기·중복 클릭·선택 변경 처리
- [x] 보호 대상 직접 요청/일괄 요청·일반 회원 처리·서비스/조직 경계·기존 Admin 경로 회귀 검증
- [x] 소비 패키지 및 앱 빌드·타입·관련 테스트, 화면 검증
- [x] CHECK에 소비처 영향/검증/남은 한계 기록 (commit·push 완료 SHA는 최종 인계에서 확인)

## 조사 대상

| 영역 | 실제 경로 | 확인할 차이 |
|---|---|---|
| 중앙 회원 | CentralMemberWorkspace / CentralMemberWorkspaceService | 일부 정정만 서버 보호, 목록 표시 없음 |
| 중앙 자격 | CentralPharmacistQualifications / PharmacistQualificationService | 하단 최소 폼, 보호 누락 |
| 서비스 공통 | OperatorMembersConsolePage / UserDetailPage / membership.routes | 행·일괄·상세·직접 요청 전부 확인 |
| 약국협업체 | Management / cooperative-management.service | 독립 조합 조회 범위 유지, 최종 결정·처리 요청 모두 확인 |
| 기타 독립 회원 | 분회·커뮤니티·약국 사업체 가입 | 공통 콘솔 미사용 경로 추가 조사, 누락을 완료로 표시하지 않음 |

검증·소비처·보존 경계: [CHECK](../checks/CHECK-O4O-OPERATOR-PROTECTED-MEMBER-REVIEW-V1.md).
