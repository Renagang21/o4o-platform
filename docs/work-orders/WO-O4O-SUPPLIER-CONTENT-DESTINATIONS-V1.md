# 공급자 콘텐츠 제작·커뮤니티 게시·서비스 등재 분리

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: COMPLETED
> **작성일**: 2026-10-17 · **최종 갱신**: 2026-10-17
> **근거**: 사용자 지시 — ToDo 작성 → 코드·문서 조사로 보완 → 구현·검증·push. PR·병합·배포 제외.

## 1. 초기 ToDo

- [x] 최신 main과 정본의 제품 등록·게시·콘텐츠 제공 경로를 대조한다.
- [x] 공급자 자료함 저장과 커뮤니티 게시를 독립시킨다.
- [x] 협업체별 콘텐츠 등재 요청·운영자 검토·회원 전용 게시를 연결한다.
- [x] pharmacy 기본 공급을 명시적인 예/아니요 선택으로 안내한다.
- [x] 협업체별 제품 거래 조건·승인 요청의 기존 기능을 연결한다.
- [x] 중복 요청·다른 공급자 자료·다른 사업 운영자·미가입 약국의 접근을 검증한다.
- [x] 정본·작업 기록을 정합하고 검증 후 전용 branch에 push한다.

## 2. 조사 후 범위 보완

기준: `815e65bc3340365d8665d082cbe9972699755a4b`.

- 제품 등록은 이미 기본 미게시다. `default_supply_enabled`의 기본 false를 유지하고 pharmacy 선택을 예/아니요로 명시한다. 현재 사용자 지시는 YES 후 등재이므로 **별도 pharmacy 운영 승인 추가는 하지 않는다**. 다른 협업체는 기존 `supply_proposals` 승인 경로를 유지한다.
- 거래 조건은 기존 공급가·대상·메모와 공급자 공통 배송 정책을 사용한다. 최소수량·결제·배송 예외 등 미확정 조건을 임의 신설하지 않는다.
- 콘텐츠 원본은 `neture_supplier_library_items`다. 저장 기본값은 비공개이며 커뮤니티 게시·서비스 등재를 유발하지 않는다.
- 기존 catalog 기반 CMS 제공는 유지한다. 협업체는 `semi_franchises`의 활성 사업 목록을 별도 대상으로 조회하고 `semi_franchise_contents`에 검토 대기 사본을 만든다. 공개 CMS로 회원 전용 자료를 보내지 않는다.
- 협업체 수신의 출처·반려 사유와 pending/rejected 상태를 추가하는 migration은 **작성 및 로컬 검증만** 한다. 운영 적용은 이 작업에 포함하지 않는다.
- 커뮤니티는 기존 커뮤니티 업무공간·게시판 권한·작성기를 사용한다. 자료 원본을 자동 게시하지 않으며 게시 전 내용을 확인한다. 서비스 신청에는 커뮤니티 가입을 요구하지 않는다.
- 사업 key는 운영 등록 목록을 사용하며 carepharm/coop/drugstore의 존재·담당자·가입을 seed로 추정하지 않는다.

## 3. 구현·검증 결과

- 구현: 기존 자료함에서 협력사업 등재 요청·자기 요청 상태 조회, 담당 운영자의 승인·게시/사유 필수 반려, 첨부 검토, 일반 회원 권한의 별도 커뮤니티 작성기 연결.
- 커뮤니티 작성기는 자료 본문을 편집 사본으로 불러오고 게시판을 명시적으로 선택한다. 공개 범위 확인 전 제출을 막고, 원본 링크·첨부파일은 자동 복사하지 않는다. 서버의 기존 커뮤니티·게시판 권한 판정은 유지한다.
- pharmacy 기본 미게시·예/아니요 선택·명시적 저장을 유지한다. 협업체별 제품 공급 제안에는 기존 공급가·대상·메모와 공통 배송 정책을 안내한다.
- 로컬 PostgreSQL 15: 신규 요청·기존 CarePharm 회원 범위 2 suites / 18 tests PASS(조건부 skip 없이 실행). 다른 공급자 원본 거절, 폐쇄 사업 거절, 동시 요청 5건의 단일 수신, 사업 간 격리, 반려 후 새 요청, 원본 변경 비전파, 회원 정지 후 열람·복사 거절, 보관 사본 재게시 거절, 데이터가 있는 rollback 거절 포함.
- 격리 빈 DB canonical bootstrap + 전체 incremental migration 재실행 PASS. 신규 fingerprint `be4a89ff7ed4ffd22e9ebaf2fdaf954c92f26672e3c4f20256e71ecec8490ce8` / 6703 lines. 최종 migration down은 직전 `76c1307f…` / 6698 lines를 복구하고 up은 신규 fingerprint를 재현한다. 기존 운영 schema fingerprint를 읽거나 채택하지 않았다.
- API 관련 계약 5 suites / 130 tests PASS. Neture 118 files / 1069 tests PASS. 공통 pharmacy-management 5 files / 26 tests PASS. 매장 56 files / 642 tests PASS. KPA 24 files / 167 tests PASS. 최종 집중 3 files / 14 tests는 Neture 전체와 중복이므로 합산하지 않는다.
- API TypeScript build, Neture TypeScript + Vite build PASS. 초기 API build의 미빌드 workspace 의존성 오류는 의존 패키지 빌드 후 재실행으로 해소했다. dependency·lockfile·CI 설정 변경은 없다.
- migration contract 21/21 PASS, 문서 민감정보 검사 PASS, diff whitespace 검사 PASS.

- 로컬 production bundle + 가상 호스트 + 합성 계정/API의 Chromium: PC 1440×1000 / 모바일 390×1000에서 자료함의 협력사업 요청·검토 대기 결과, pharmacy 아니요 기본값→예 선택→저장, 커뮤니티 사본·게시판/공개 확인, CarePharm 담당 운영자 반려·사유 표시를 확인했다. 4화면 모두 page error 0·페이지 가로 넘침 0이며 캡처를 확인했다. 커뮤니티 게시 제출은 집중 UI 테스트에서 검증했고 브라우저 smoke에서 실제 게시를 하지 않았다. 실제 네트워크·실계정·운영 승인 검증이 아니다.

## 4. 인계 경계

- branch: `wo/supplier-content-destinations`, base: `815e65bc3340365d8665d082cbe9972699755a4b`.
- 작업 중 main이 `951b834b6d`(매장 업무 중심 UI)로 이동했다. 변경 경로 중복은 없으며 이번 개발 branch에 임의 merge/rebase하지 않았다. 통합 담당은 최신 main 기준으로 CI·공통 소비처를 다시 확인한다.
- 운영 migration·운영 데이터 변경·PR 생성·병합·배포는 수행하지 않는다. 운영 적용 전 migration 실행 승인은 운영 담당이 처리한다.
- 실제 사업 key/운영자 지정·운영 가입 상태는 확인하지 않았으며 carepharm/coop/drugstore을 seed하거나 자동 승인하지 않았다.
- 승인된 비공개 테스트 계정 파일이 없어 실계정·운영 API write 검증은 하지 않았다. 로컬 합성 브라우저 결과는 실제 운영 검증과 구분한다.


## 5. 작업공간 보존

`WORKTREE_DISPOSITION`: `KEEP` — 개발 branch push까지의 인계이며 PR/병합 전 후속 수정에 필요하다. 기준 checkout과 이전 작업 worktree는 변경·정리하지 않는다. 운영 배포와 smoke가 완료됐다는 의미가 아니다.

## 6. PR #678 통합 리뷰 보완 — 2026-10-17

- 최신 main `951b834b6d`를 전용 branch에 충돌 없이 merge했다. 이후 매장 전체 57 files / 649 tests PASS.
- Codex P2 두 건을 보완했다. 서버는 기존 dependency `node-html-parser`의 structured text, 브라우저는 inert DOM 변환으로 문단·목록·줄바꿈·entity를 보존한다. 수신 HTML에는 텍스트를 다시 escape해 encoded markup이 활성화되지 않게 한다.
- 공급자별 이력 조회에 `(source_supplier_id, created_at DESC, id)` partial index를 추가했다. PostgreSQL planner가 해당 인덱스를 사용할 수 있는지 검증했다. fingerprint는 위 6703 lines 값으로 재산출하고 fresh replay 및 down/up 복원을 확인했다.
- 리뷰 보완 집중 검증: PostgreSQL + 변환 2 suites / 21 tests, 커뮤니티 UI 1 file / 4 tests. 배포 승인을 기존 개발 완료로 추정하지 않았으며 별도 사용자의 운영 migration 적용 승인을 확인했다.

## 7. 문서 트랙 분리·반려 사유 검증

- 정본 변경은 별도 문서 작업 WO-O4O-SUPPLIER-CONTENT-POLICY-ALIGNMENT-V1 / PR #679로 분리했다. 기능 PR #678에서 기존 정본의 인라인 변경을 제거하고 문서 트랙 main 통합 후 그 기준을 따른다.
- 콘텐츠 반려에만 `reasonRequired`를 전달해 필수 표기·빈 값/공백 확인 버튼 비활성화·호출 전 검증을 적용했다. 다른 사업 심사의 기존 선택 사유 계약은 유지한다.
- 공통 pharmacy-management 5 files / 26 tests PASS. 콘텐츠 반려의 빈 값·공백 API 호출 0과 사유 입력 후 정상 호출을 검증했다.
