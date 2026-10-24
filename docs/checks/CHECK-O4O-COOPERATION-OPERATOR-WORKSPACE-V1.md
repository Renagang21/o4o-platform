# 약국 협업체 운영 공간 로컬 검증

> **상태**: COMPLETED — 개발 검증 기록에 한정. main 통합·배포·실계정 검증은 미실행
> **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-24 (Asia/Seoul)
> **근거 WO**: [WO-O4O-COOPERATION-OPERATOR-WORKSPACE-V1](../work-orders/WO-O4O-COOPERATION-OPERATOR-WORKSPACE-V1.md)

## 테스트와 빌드

저장소 루트에서 `pnpm exec vitest run --config <대상>/vitest.config.mjs --maxWorkers=2`로 실행했다.

| 대상 | 결과 |
|---|---|
| packages/operator-core-ui 전체 | 29파일·208건 PASS. 사업/계정 전환의 늦은 응답 차단, 조회 불가와 0건 구분, 재조회 복구, 미지의 업무 보존, 갱신 중 중복 요청 방지, 운영 홈에서 숨은 가입 심사 조회 방지, 기존 직접 콘텐츠 URL 포함 |
| services/web-kpa-society 전체 | 19파일·140건 PASS |
| services/web-neture 전체 | 149파일·1,289건 PASS. 이후 CarePharm 문의함 guard의 5개 허용/차단 사례를 추가해 관련 3파일·24건 PASS |
| services/web-pharmacy-coop 전체 | 11파일·84건 PASS. 이후 개인 가입/탈퇴 집계 경로·사업 설정 분리 사례 추가 후 ForumLayout 5건 PASS |
| 마지막 표시 스타일 변경 후 공유 업무 집중 검증 | overview·assigned workflow 17건 PASS |
| 다섯 실제 서비스 소비 앱 빌드 | web-kpa-society·web-neture·web-pharmacy-coop·web-store·web-lecture의 `pnpm --dir services/<앱> build` PASS |

전체 실행에서 1,721건, 이후 신규 사례 6건을 추가 검증했다. 마지막 변경에 관련된 집중 검증은 위 전체 실행 수에 중복 합산하지 않는다. 기존 Browserslist 데이터 시점·일부 bundle 크기 경고가 있으며 dependency/빌드 설정은 변경하지 않았다. Neture의 기존 펀딩 테스트는 실패 응답 시나리오에서 jsdom 네트워크 stderr를 출력했지만 테스트는 통과했다.

## 브라우저

- 로컬 빌드 preview와 합성 계정·API fixture를 사용했다. 운영 API는 호출하지 않았고 실계정 데이터는 사용하지 않았다.
- Pharmacy·MegaPharm·CarePharm·Pharmcoop × PC 1440px / 모바일 390px의 8개 조합에서 운영 홈·집계·자료 처리 링크·해당 공간 문의함 이동 PASS.
- 실제 대기 3건 및 조회 불가 표시를 확인했다. 운영 홈에서 약국 가입 심사 목록을 숨겨 조회하지 않았다. 페이지 오류·가로 넘침·쓰기 요청은 각각 0건이다.
- 합성 약국 사업 계정은 각 호스트의 사업 한정 운영자 역할로 조회했다. CarePharm은 활성 Neture 자격과 CarePharm 운영자 역할만으로 전용 문의함까지 이동했다. Pharmcoop은 조합별 개인 운영 관계를 사용했다.
- 초기 fixture의 CarePharm 활성 자격 누락으로 화면 대기 timeout이 발생했다. fixture에 기존 필수 자격을 넣어 재검증했으며 실제 guard의 자격 조건을 완화하지 않았다.
- 기존 심사 직접 URL, 개인 조합원 가입/탈퇴 동선, 다른 사업 문의함 및 역할 차단은 자동 테스트로 함께 확인했다.

스크립트·결과 JSON·화면 캡처는 클라우드 로컬 `.onboarding/operator-workspace-*`에 보관한다. 운영 로그·계정 정보·이미지를 공개 저장소에 추가하지 않는다. 실제 운영 권한, 실데이터 집계, 문의 답변 발송·상태 변경은 이 브라우저 검증의 범위가 아니다.

## 문서 정합과 인계

- 공유 모듈 import 소비처 5개를 전수 검색했다. 변경한 shared page의 경로를 대상으로 literal consumer 검사에서 활성 raw-source 계약 소비처는 없었고 과거 WO 참조만 확인했다.
- WO는 ACTIVE로 유지하며 기존 기능 연결 개발 완료와 main 통합·배포 미실행을 구분한다. 이 CHECK의 COMPLETED는 이 로컬 검증 기록의 완료다.
- 공지 확인·자료 개정·교육 연결·일반 사업 진행·문의 담당자/소유권은 WO 3절의 미완료 후속 범위다. CarePharm 미게시 법적 문서도 별도 운영 준비다.
- 현재 지시대로 전용 branch에 commit·push 후 인계한다. PR·PR CI·main merge·배포·운영 DB 변경은 수행하지 않는다. 이번 문서의 테스트 PASS를 integration-ready 또는 운영 적용 완료로 해석하지 않는다.
- push 전 fetch에서 main이 `abb602b9569217abf2e20de155e2f60210da5d50`으로 이동했다. 추가 변경은 AI 모델 관리·외부 AI 검증 문서이며 이번 변경 파일과 겹치지 않는다. 이번 branch의 기준은 위 WO의 `6a6d20e094`로 유지한다. 최신 main 위의 통합 검증은 통합 담당 단계다.
- `WORKTREE_DISPOSITION`: `wo/cooperation-operator-workspace-v1`, base `6a6d20e094ad472f041a8abbf22ff971e1c28ae9`, main integration/CI/deployment 미실행, verdict `KEEP` — push 후 통합 담당의 확인·추가 수정용으로 보존.
