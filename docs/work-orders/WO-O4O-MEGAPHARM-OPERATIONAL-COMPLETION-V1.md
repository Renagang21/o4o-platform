# 메가팜 협업체 1차 운영 완성

> **상태**: COMPLETED
> **작성일**: 2026-10-22 (Asia/Seoul)
> **최종 갱신**: 2026-10-22
> **근거**: 사용자 승인 — 관리자·협업체·My Home·내 매장을 작은 작업으로 나누지 않고 TODO 대조부터 구현·검증·push·PR 병합·배포 검증까지 진행

## 전체 TODO와 코드·문서 대조

기준 main: 7dc02646da. 전용 branch: wo/megapharm-operational-completion. 기준 checkout과 다른 세션의 작업공간을 보존한다.

- [x] 최신 main, OPEN 독립 정비 WO, 정본·실제 소비처·배포 경계를 대조한다.
- [x] PR #760의 옛 KPA 운영/설문/매장 사본 제거를 보존한다. 앞선 조사에서 확인한 이미 제거된 화면은 복원하지 않는다.
- [x] 기존 사업 자료·communityKey 게시판·Store 합집합/직원 교집합은 재사용하고 실제 남은 연결만 보완한다.
- [x] 사업별 법정정보·약관의 관리·공개 조회·가입 동의를 기존 정책 문서/동의 원장으로 연결한다.
- [x] 네 협업체의 공통 계정 세션 정합과 기존 내 매장 접근을 검증하고 KPA 개인 면허 테이블 의존을 제거한다.
- [x] 운영자가 담당 사업의 활성 가입 매장 월별 요구 집계를 조회하도록 한다.
- [x] 직원 숙지 자료 체크를 기존 콘텐츠 편집기에 연결한다.
- [x] 관리자 설정·My Home 허용·무료 초대 직원·약사/비전문인·복수 제공·종료·다른 매장 차단 회귀를 함께 확인한다.
- [x] 관련 API/SQL·공통 UI·소비 앱·PC/모바일·문서 정합을 검증한다.
- [x] 검증한 코드·문서를 commit·push한다. PR #761.
- [x] 정상 PR·CI·리뷰를 거쳐 기능 #761과 배포 전 호환 보완 #763을 main에 병합한다.
- [x] 최종 main CI·Delivery/promote 배포 및 운영 읽기 점검을 완료한다.

## 검증 후 확정한 구현

1. 사업 정책의 저장 범위는 기존 문자열 컬럼에 business:<사업 UUID>를 사용한다(45자). 사업 키 길이·개별 조합 이름 변경과 무관하며 기존 50자 컬럼을 그대로 쓴다. 새 schema/migration·서비스 catalog 항목·role은 만들지 않는다.
2. 기존 법정정보/정책 controller·편집 UI·게시 lifecycle·버전/해시 동의 기록을 재사용한다. 사업 전용 router가 활성 사업과 현행 담당 권한을 확인하고 저장 범위를 고정한다. 일반 서비스의 기존 guard와 API는 그대로 유지한다.
3. 사업 가입 조건 스냅샷을 유지하면서 각 사업의 현재 terms/privacy를 확인·기록한다. 게시 문서가 준비되지 않았거나 한 쪽만 게시됐다면 확인 실패/준비 중으로 처리하고 다른 사업 약관으로 대체하지 않는다. 실제 문안·동의·회원 자격은 seed하지 않는다.
4. 요구 기록은 기존 매장 metadata의 월별 3개 합계를 재사용한다. 조회는 자기 담당 사업의 현재 활성 가입·승인 약국에 한정한다. 복수 가입 매장의 공통 집계이며 사업별 독점 실적으로 표시하지 않는다. 다른 사업의 전역 집계를 열지 않는다.
5. 직원 숙지 자료 체크는 staff-quick-guide 태그만 편집한다. 직원 입력·과제·시험·담당자 배정·새 테이블은 추가하지 않는다.
6. 공통 계정과 내 매장 범위는 유지한다. Google 음성 API·공용 기기 전용 직원 전환·실제 결제/자동 갱신·기존 데이터 삭제는 범위 밖이다.

## 검증·운영 경계

실제 약사 사용 확인은 경영자가 한다. 테스트를 위해 운영 권한이나 약관 문안을 임의로 생성하지 않는다. 상태 변경·동의·진열·기록 검증은 격리 DB/합성 브라우저에서 실행하고 운영은 허용된 읽기만 확인한다. 실기기 음성 품질과 실제 약관 게시/현장 데이터 입력은 운영 준비 항목으로 별도 기록한다.

현재 환경은 Node 22.18.0/pnpm 10.25.0과 기존 /workspace/.pnpm-store를 사용한다. XDG_DATA_HOME을 /workspace/.pnpm-data로 지정해 제한된 home 쓰기를 요구하지 않는다. 잠금 파일·dependency 선언은 변경하지 않는다.

근거 정본: 약국 설계 §15-6~8, My Home, Store 접근, 공유 모듈 변경 Protocol, 사업 독립 정비 WO. 기존 독립 정비 WO 전체의 데이터 정리·인프라 이름 변경을 이 작업으로 완료했다고 보고하지 않는다.

## 로컬 구현·검증 결과 (2026-10-22)

새 migration 없음. 기존 승인·유료·직원 허용 원장은 유지하고 사업별 정책 범위/운영 패널을 연결했다. 격리 PostgreSQL의 canonical bootstrap과 36개 incremental 적용 뒤 schema fingerprint 일치를 확인했다. 로컬 API·UI·PC/모바일 결과와 한계는 [CHECK](../checks/CHECK-O4O-MEGAPHARM-OPERATIONAL-COMPLETION-V1.md)를 따른다. push/PR/CI/병합/운영 배포 상태는 후속 기록으로 보완한다.

PR: https://github.com/Renagang21/o4o-platform/pull/761. 최종 교차 점검에서 CarePharm 호스트의 공통 계정 약관 loader가 사업 문서를 선택할 수 있는 경로를 수정했다. 요청한 serviceKey를 기준으로 계정/사업 문서를 선택하며 3개 회귀를 추가했다.

Codex P1의 기존 Pharmacy handoff도 고정 alias로 보완했다. 최종 교환 세션은 공통 neture 범위이며 다른 호스트 교환은 거절한다. 실제 토큰 원장·client·교환을 포함한 handoff/로그아웃 142개를 통과했다.

## 동일 WO의 배포 전 세션 호환 보완

기능 PR #761은 96f914ede6118b86daa43874bce0caac1d32a106으로 병합됐다. 아직 배포하지 않은 상태에서 기존 로그인 세션의 로그아웃을 추가 확인했다. 전환 전에 발급된 pharmacy/kpa-society 및 pharmcoop/coop 세션은 각자의 정확한 HTTPS Origin에서만 원래 서명 scope·브라우저 ID로 종료하도록 보완한다. 새 세션 발급·다른 사업 가입·로그인 허용에는 적용하지 않는다. 동일 WO의 연속 단계로 기존 전용 worktree/branch에서 이어가며 운영 데이터 변경은 없다.

## 최종 통합 기록

배포 전 호환·협동조합 공통 법정정보 UI 스타일 보완은 [PR #763](https://github.com/Renagang21/o4o-platform/pull/763)에서 CI·현재 HEAD Codex review(미해결 지적 없음)를 통과했고, 2026-10-22 04:33 UTC에 efcf96ec28f431eafab033454ae1bd7fe24a9571로 main에 병합됐다. 같은 시점의 다른 세션 PR #762는 충돌 없이 포함했고 해당 세션 branch/worktree를 수정하지 않았다. 운영 버전 7dc02646da부터 최종 코드까지 새 schema/migration 경로 변경이 없음을 확인했다.

실제 로그인 점검용 정본 계정 파일은 전용 worktree와 기준 checkout 양쪽에 없다. 운영에서는 공개 읽기·비로그인 차단만 확인하며, 계정·매장·사업 권한 동작은 격리 환경 검증과 구분한다. 이 작업이 만든 PostgreSQL 17 테스트 클러스터 3개는 종료 후 데이터 디렉터리를 삭제하고 잔존하지 않음을 확인했다.

## 배포·종료 결과

[최종 main CI](https://github.com/Renagang21/o4o-platform/actions/runs/39723002629) PASS 뒤 자동 Delivery의 LEVEL 3 보류를 확인하고, 기존 사용자 배포 승인 범위에서 [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/39724170327)를 실행했다. 전체 실행과 Report가 PASS이며 production 상태는 DEPLOYED다. api/admin/neture/kpa-society/lecture/store/kpa-branch 7개 대상의 serving SHA가 efcf96ec28f431eafab033454ae1bd7fe24a9571임을 Report로 확인했다. 물리 서비스 이름은 기존 이름을 유지했다.

운영 공개 읽기와 비로그인 차단, 네 사업 도메인의 PC/390px 홈 8개, pharmacy/megapharm/carepharm의 약관·개인정보 직접 URL 12개를 확인했다. 실제 사업 문서는 미게시 상태이며 공개 뷰는 다른 문서로 대체하지 않고, 가입용 정책 API는 503으로 신규 사업 신청을 차단한다. 실제 약관 두 문서·법정정보 게시와 사업 등록/자격 설정은 담당 관리자의 운영 입력으로 남는다. 실계정 로그인 및 실기기 음성 품질을 완료했다고 보고하지 않는다.

이 종료 문서 변경은 같은 WO의 결과 기록이며 실행 코드·DB·배포 설정을 추가로 바꾸지 않는다. 세부 증거·미확인 범위는 [CHECK](../checks/CHECK-O4O-MEGAPHARM-OPERATIONAL-COMPLETION-V1.md)를 따른다.
