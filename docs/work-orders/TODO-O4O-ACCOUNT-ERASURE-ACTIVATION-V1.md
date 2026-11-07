# 계정 완전삭제 운영 활성화

- 사용자 지시: 2026-11-04 조사·정비 후 실제 사용 가능하게 한다. 이 공간은 기존 통합·배포 담당이다.
- 기준 main: 74e509a2022cb4776e3329cff9c46fee3e9154dc
- branch: wo/account-erasure-activation-20261104
- 실제 회원의 삭제 명령 없이 운영 준비 검증을 수행한다. 사용자 지시의 금지로 해석하지 않는다.

## 조사·정비·검증

- [x] 최신 main·worktree·기존 변경과 실행 환경 확인
- [x] 실행 모드·파일 확인·시스템 연수·정책 근거의 네 가지 gate 및 배포 시 설정 소실 가능성 확인
- [x] 실제 운영 schema/fence·최소 로그·계정 규모·파일 producer와 소유/공유 참조를 집계로 조사
- [x] 현행 정책의 기본 1년 및 법정 2년 요건을 대조하고 기간·근거 기록 (계정 9개 · 기본 1년 적용)
- [x] API runtime identity로 저장소 list/get/조건부 delete 권한 확인. 전용 probe object만 생성·정리하고 잔여0 검증
- [x] 미표식/공유/타인 파일은 review로 보호하며 임의 소유 추정·전역 backfill 금지
- [x] 기존 환경값 전달 helper로 네 설정을 다음 배포에도 보존
- [x] schema·파일 권한·정책·현재 main/CI·승인된 실행 계정을 검증하는 audit/activate 절차 구현
- [x] 실패 시 새 설정을 노출하지 않거나 이전 revision으로 복구, 실제 처리 결과만 보고
- [x] 로컬 회귀·기존 공통 helper·민감정보 검사·CI·Codex·PR main 병합 (PR #936 · #963)
- [x] 운영 audit → 검토 결과 문서화 → 실제 활성화 → readiness enabled 및 공개 health 확인 (2026-11-07, 공개 권한 차단은 별도 경로 미확인)
- [x] 합성 probe 잔여0·운영 준비·미해결 개별 review 항목 구분. 실제 계정 삭제 동작은 미검증이다. 결과는 CHECK 의 실제 운영 결과 절에 있다

## 실행 경계

운영 DB 조사는 READ ONLY transaction·statement timeout과 집계 출력으로 수행한다. 비밀번호·사용자 식별자·파일 경로는 보고하지 않는다. 외부 저장소의 권한 검증은 무작위 전용 prefix 및 생성 세대 pin을 사용하며 기존 object를 덮어쓰지 않는다. 원본 회원·상품·거래·파일은 audit/activate 절차에서 삭제하지 않는다. 준비 조건은 값을 임의로 확인 처리하여 우회하지 않는다.

로컬 검증·운영 절차: [CHECK](../checks/CHECK-O4O-ACCOUNT-ERASURE-ACTIVATION-V1.md). 현행 기본1년과 2년 설정 유지, 실제 운영 판단 및 flag 적용은 audit 결과 검토 후 수행한다.
