# Pharmacy 약국 승인·기본 회원 자동 연결

> **상태**: ACTIVE
> **작성일**: 2026-10-31 (Asia/Seoul)
> **사용자 지시**: 약국 경영자 승인 시 pharmacy.neture.co.kr 회원 자동 연결. TODO → 보완 → 개발 → main 병합 전까지.

## 범위

Pharmacy 기본 사업(`pharmacy`)만 약국 승인과 자동 연결한다. MegaPharm·CarePharm의 독립 신청과 Pharmcoop 개인 조합원 자격은 유지한다. 공통 계정·약사 자격·약국 경영 권한·운영자 권한은 변경하지 않는다. 기존 가입 원장 재사용이며 새 schema·role·인증 우회는 없다. 사용자 지시에 따른 가입 orchestration 변경이며 공통 Auth/Membership Core 구조 변경은 없다.

최신 main `b27f0dc4dd`에서 `wo/pharmacy-approval-auto-membership-20261031`로 시작했다. 준비된 격리 클라우드 checkout을 사용한다. 운영 DB write·약관 게시·main 병합·auto-merge·배포는 범위 밖이다.

## 최초 TODO

- [x] 승인·후속 연결·회원 접근·별도 신청·정본 대조
- [x] 정지/탈퇴·동의·동시 실행·기존 승인 약국 보완 범위를 확정해 TODO 보완
- [x] 약국 승인 transaction에서 Pharmacy 기본 가입 연결
- [x] 기존 승인 약국 누락의 명시적 점검·보완 경로 준비
- [x] 중복 신청 안내와 회원 화면을 자동 연결 정책에 맞춤
- [x] 관련 API·UI·실DB 검증 및 필요한 브라우저 검증
- [ ] CHECK·정본·범위 검사·commit/push·PR/CI·리뷰 후 병합 전 인계

## 조사에서 확인한 문제

약국 승인 원장과 매장 표식만 활성화되고 `semi_franchise_memberships`의 Pharmacy 가입은 만들지 않는다. 회원 업무는 두 원장을 모두 요구해 승인 후에도 별도 가입/승인이 남는다. Store 신청 완료 문구도 별도 신청을 안내한다. 기존 승인은 중복 승인할 수 없어 단순 재호출로 누락을 복구할 수 없다.

약국 신청의 기존 게시 약관 동의 증적은 유지한다. 자동 가입을 별도 사업 약관 동의로 위조하지 않는다. 상품 공급·거래·다른 협업체의 별도 조건은 자동 승인 범위가 아니다.

## 보완한 TODO와 판정

- 신규 승인·재활성화 transaction에서 기본 Pharmacy 가입을 없으면 생성하고 기존 pending은 활성화한다. 연결 실패는 약국 승인도 rollback한다. 기존 active는 중복 생성·이력 변경 없이 유지한다.
- 기존 rejected/suspended/terminated는 자동 활성화하지 않는다. 약국 원장 승인과 기존 사업 제재/탈퇴는 구분한다. 약국 원장이 정지되면 기존 접근 guard가 차단하므로 별도 사업 상태를 덮어쓰지 않는다.
- 기존 승인 약국은 현행 `/semi-franchises/pharmacy/apply` POST에서 본인 선택 약국·경영 권한·공통 자격을 확인해 누락만 연결한다. GET·로그인 시 write나 일괄 backfill은 없다. 현재 task에서 운영 POST를 실행하지 않는다.
- Pharmacy 기본 연결은 기존 약국 신청 약관과 승인에 따른 회원 자격이다. 사업별 약관 동의나 별도 거래 조건 수락을 자동 생성하지 않는다. 독립 사업용 추가 조건·약관·별도 심사 화면은 Pharmacy 기본 연결에 재요구하지 않는다.
- 기존 POST 계약을 재사용해 신규 endpoint·schema 없이 처리한다. 다른 세 협업 공간의 자격·권한·가입 원장 및 독립 신청은 변경하지 않는다.

## 개발 결과와 인계

`connectDefaultPharmacyMembership`를 약국 승인 transaction 안에서 호출한다. 역할/매장 표식 동기화는 기존 후속 경로를 유지하지만 회원 원장은 그 best-effort 경로에 넣지 않았다. 기존 기본 사업이 없거나 닫혀 있으면 409로 승인을 rollback한다. 중복 연결은 고유 키로 직렬화하며 신규 연결/대기 활성화만 기존 감사 원장에 남긴다.

Store 신청 안내·사업 목록, Pharmacy 참여 안내·접근 안내를 수정했다. 기존 승인 약국은 선택 약국 header를 유지한 ‘기본 회원 연결 확인’으로 누락을 연결한다. 정지·반려·탈퇴에는 자동 연결 버튼을 제공하지 않으며 API도 자동 복원을 거절한다. 독립 사업은 기존 조건·동의·신청을 유지한다.

검증·실행 실패와 보완·미확인 사항은 [CHECK](../checks/CHECK-O4O-PHARMACY-APPROVAL-AUTO-MEMBERSHIP-V1.md)에 기록한다. **DEPLOYMENT=MANUAL/GATED (권한·가입 처리 변경)**이며 이후 통합 담당이 API 호환성 확보 후 Pharmacy Business·Store를 배포해야 한다. 신규 migration은 없다. 이 작업은 운영 데이터 보완이나 배포를 실행하지 않는다.
