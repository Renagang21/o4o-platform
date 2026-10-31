# 약국 협업체 운영 공간 개발·통합·배포 검증

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: COMPLETED — 기존 업무 연결 단계의 개발·main 통합·배포 검증 완료. 실계정 운영 검증은 미실행
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
- Pharmacy·해당 협업체(당시 구명칭)·CarePharm·Pharmcoop × PC 1440px / 모바일 390px의 8개 조합에서 운영 홈·집계·자료 처리 링크·해당 공간 문의함 이동 PASS.
- 실제 대기 3건 및 조회 불가 표시를 확인했다. 운영 홈에서 약국 가입 심사 목록을 숨겨 조회하지 않았다. 페이지 오류·가로 넘침·쓰기 요청은 각각 0건이다.
- 합성 약국 사업 계정은 각 호스트의 사업 한정 운영자 역할로 조회했다. CarePharm은 활성 Neture 자격과 CarePharm 운영자 역할만으로 전용 문의함까지 이동했다. Pharmcoop은 조합별 개인 운영 관계를 사용했다.
- 초기 fixture의 CarePharm 활성 자격 누락으로 화면 대기 timeout이 발생했다. fixture에 기존 필수 자격을 넣어 재검증했으며 실제 guard의 자격 조건을 완화하지 않았다.
- 기존 심사 직접 URL, 개인 조합원 가입/탈퇴 동선, 다른 사업 문의함 및 역할 차단은 자동 테스트로 함께 확인했다.

스크립트·결과 JSON·화면 캡처는 클라우드 로컬 `.onboarding/operator-workspace-*`에 보관한다. 운영 로그·계정 정보·이미지를 공개 저장소에 추가하지 않는다. 실제 운영 권한, 실데이터 집계, 문의 답변 발송·상태 변경은 이 브라우저 검증의 범위가 아니다.

## 문서 정합과 인계

- 공유 모듈 import 소비처 5개를 전수 검색했다. 변경한 shared page의 경로를 대상으로 literal consumer 검사에서 활성 raw-source 계약 소비처는 없었고 과거 WO 참조만 확인했다.
- 개발 인계 시 WO는 ACTIVE였으며 개발 완료와 main 통합·배포 미실행을 구분했다. 사용자 추가 지시로 아래 통합·배포 증적을 확인한 뒤 기존 업무 연결 단계의 WO를 COMPLETED로 갱신한다.
- 공지 확인·자료 개정·교육 연결·일반 사업 진행·문의 담당자/소유권은 WO 3절의 미완료 후속 범위다. CarePharm 미게시 법적 문서도 별도 운영 준비다.
- 최초 개발 지시의 종료점은 commit·push였으며 `a0c1d9e104`를 인계했다. 이후 사용자가 main 통합·배포를 명시적으로 지시했다. 운영 DB 변경은 두 단계 모두 수행하지 않았다.
- push 전 fetch에서 main이 `abb602b9569217abf2e20de155e2f60210da5d50`으로 이동했다. 추가 변경은 AI 모델 관리·외부 AI 검증 문서이며 이번 변경 파일과 겹치지 않는다. 이번 branch의 기준은 위 WO의 `6a6d20e094`로 유지한다. 최신 main 위의 통합 검증은 통합 담당 단계다.
- 개발 인계 시 `WORKTREE_DISPOSITION`은 `KEEP`이었다. 통합 완료 후에도 연결된 클라우드 checkout과 로컬 검증 증적은 보존한다.


## Main 통합·배포 증적

사용자 추가 지시 `main 으로 통합 -> 배포`에 따라 실행했다.

| 단계 | 증적과 결과 |
|---|---|
| 최신 main 통합 | 전용 개발 branch에 main `3431c010f4` 병합, 통합 HEAD `c125c403e2108d3648d7c1ad6dd503884317ca38`. 공유 패키지 208건 재검증 PASS |
| PR gate·리뷰 | [PR #796](https://github.com/Renagang21/o4o-platform/pull/796), [PR CI 40080850706](https://github.com/Renagang21/o4o-platform/actions/runs/40080850706) 및 CI Gate PASS. 해당 HEAD의 Codex completed / findings 없음, 미해결 review thread 없음. CodeQL·Guard Static Analysis PASS |
| Runtime source main | `2c114abb9030f2090326c85ae19c9fa5088ac497`, [main CI 40081607113](https://github.com/Renagang21/o4o-platform/actions/runs/40081607113) PASS |
| 자동 배포 | [Delivery 40082335409](https://github.com/Renagang21/o4o-platform/actions/runs/40082335409) SUCCESS. admin·kpa-society·lecture·store의 새 revision smoke·traffic 전환·배포 검증 PASS. Neture는 역할 경로 변경으로 LEVEL 3 보류 |
| 통제 배포 | [Promote 40082664241](https://github.com/Renagang21/o4o-platform/actions/runs/40082664241) SUCCESS. main HEAD·CI·기존 freeze gate 유지. 자동 배포 대상과 겹치지 않는 neture,kpa-branch를 지정했고 실제 배포 필요 대상은 neture 하나. Neture revision smoke·traffic 전환·배포 검증·최종 serving 보고 PASS, commit status production=DEPLOYED |
| Pharmcoop | [40082684528](https://github.com/Renagang21/o4o-platform/actions/runs/40082684528) SUCCESS. `frontend_only=true`, `apply=false`. 기존 serving API 호환성·revision readiness·인증 private smoke·트래픽 전환 PASS. 조합 fixture 등록 단계 skipped |
| 공개 응답 | Pharmacy·해당 협업체(당시 구명칭)·CarePharm·Pharmcoop의 `/` HTML과 참조 앱 JS 각각 HTTP 200. Pharmacy/해당 협업체(당시 구명칭)의 같은 앱 JS 응답도 확인 |

API는 재배포 불필요로 판정되어 배포 job이 skipped였다. migration·조합 등록·회원/업무 데이터 write 없이 프런트엔드만 갱신했다. production workflow의 revision/serving 검증과 공개 HTTP 검사는 실계정의 업무 처리 검증과 구분한다. 화면의 실제 대기 데이터·심사·답변 발송을 실계정으로 실행하지 않았다.

상태·step 결과는 GitHub Actions API와 commit status로 확인했다. 외부 로그 저장소에 대한 환경 접근 제한으로 개별 원문 로그 다운로드는 확인 범위에서 제외했다. 로컬 `.onboarding/operator-*-ci.log`, `operator-production-smoke.json` 등에는 조회 결과를 보관한다.

이후 문서 정합 변경은 이 WO/CHECK 두 파일에 한정하며 runtime 변경이 없다. 배포 source SHA는 `2c114abb90`으로 식별하고 후속 문서 commit을 추가 배포 완료로 혼동하지 않는다. 문서 PR의 main CI 확인 후 `DEPLOYMENT=NOT_APPLICABLE`로 마감한다.
