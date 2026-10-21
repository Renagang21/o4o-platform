# 약국 서비스 설정 통합 TODO

> **상태**: IN_PROGRESS
> **작성일**: 2026-10-21 · **최종 갱신**: 2026-10-21 (Asia/Seoul)
> **근거 WO/IR**: 사용자 승인 — 약국 협력사업 메뉴를 약국 서비스 설정으로 통합, 코드·문서 조사 후 개발·검증·push까지
> **관련 정본**: [약국 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §15-7 · [역할 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) · [공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)

## 범위와 종료점

전용 worktree `/workspace/o4o-wt/pharmacy-admin-settings-consolidation`, branch `wo/pharmacy-admin-settings-consolidation`, base `622aafc82814aedd4a0878f28101e56ff686219a`에서 진행한다. 이전 완료 branch와 기준 checkout을 수정하지 않는다. 이번 종료점은 commit·push다. PR 생성·병합·배포·운영 데이터 변경은 하지 않는다.

## 승인한 배치

- 약국 서비스 설정의 첫 화면은 기능 설정 탭이다. 기본 제공(전체 약국)·유료회원·기존 협력사업 가입자를 선택하고 기능을 체크/해제해 저장한다.
- 회원 이용 자격 탭에서 회원 검색·유료 자격과 기간 수정·가입 자격 및 기능 제공 근거를 확인한다.
- 협력사업을 선택했을 때 사업 정보를 접어서 보여준다. 신규 등록은 사업 추가 버튼으로 연다. 제공 기능 편집은 설정 화면 한 곳에서 한다.
- 담당 운영자는 현재 지정 결과와 기존 운영자 관리 연결만 표시한다. 직접 UUID 입력·별도 지정 UI를 중복하지 않는다.
- 전체 관리자에서 현장 고객 요구 집계 노출을 제외한다. 서비스 운영자별 집계 API 신설이나 데이터 이동은 이번 범위에서 하지 않는다.
- 기존 사업·가입 관계, 기능 합산, 경영자 자격과 직원 허용, 전문인 확인, 서비스별 승인·역할 경계를 유지한다. 유료 등급/요금/과금 자동화는 추후 작업이다.

## TODO

- [x] T01 정본·화면·API·메뉴·구 URL·raw-source 테스트 소비처 조사 후 구현 범위 확정
- [x] T02 기능 설정/회원 이용 자격 탭으로 통합, 중복 메뉴 제거와 구 URL 연결
- [x] T03 사업 추가 대화상자·선택 사업의 접힌 정보·중앙 운영자 관리 연결
- [x] T04 회원 조회에 유효 자격·소유 약국별 가입 및 기능 제공 근거 연결
- [x] T05 공통 UI의 관리자/Neture 소비처와 권한·상태 전환·저장/해제 회귀 검증
- [x] T06 desktop/mobile 브라우저 확인, 관련 타입·빌드·lint·문서/민감정보 검사
- [x] T07 정본 정합·CHECK 기록·경로별 commit·push·원격 SHA 확인

## 조사 결과와 구현 결정

조사 완료 후 근거 경로·소비처·검증 명령·한계를 이 절과 CHECK에 추가한다.

### T01 조사 판정

- 정본 §15-7의 기본/유료/사업 합산을 재사용한다. 제공 기능이 곧 service role이나 약사 자격이라는 해석은 하지 않는다.
- 공통 화면은 `@o4o/operator-core-ui/modules/pharmacy-management`에서 제공하고 관리자 앱과 Neture 호환 wrapper가 소비한다. 연합회 조회는 관리자 전용 wrapper에 남긴다. OperatorSemiFranchisePage·회원 승인·사업별 자료/포럼 화면은 변경 대상이 아니다.
- 기존 구 URL의 `register=carepharm/megapharm/pharmcoop`, `section=cooperatives`와 운영자 화면의 사업 등록 링크를 조사했다. 구 URL redirect는 query를 보존하고 신규 링크는 통합 주소를 쓴다.
- `semi_franchise_operators`의 과거 개별 지정은 실제 runtime 접근 조건이므로 읽기만 남기면 해제를 못 한다. 기존 관리 기능을 중앙 운영자 화면의 접힌 영역으로 이동하고, 기타 사업 지정은 기존 후보 검색과 서버의 Neture 운영 자격 검사를 사용한다. 원본 할당·인가 조건을 변경하지 않는다.
- 현장 요구 집계의 관리자 component는 소비처가 사라져 제거한다. 수집·저장·기존 관리자 API는 보존하고 서비스 운영자에게 전역 집계를 노출하지 않는다.
- 신규 읽기 API `GET /neture/admin/member-paid-entitlements/:userId/access`는 기존 전체 관리자 guard·no-store를 적용한다. 경영자 관계·가입 원장을 읽고 기존 createPharmacyFeatureService로 기능 제공 근거를 계산한다. DB schema/migration·역할·가입 승인은 추가하지 않는다.
- 실제 계정 파일·Google 관리자 인증을 사용하지 않는다. 브라우저/HTTP fixture와 source/type/build로 검증하며 운영 계정·운영 DB·AI 비용 발생 호출은 하지 않는다.


### 검증·인계 결과

구현과 검증 세부 결과는 [CHECK](../checks/CHECK-O4O-PHARMACY-ADMIN-SETTINGS-CONSOLIDATION-V1.md)에 기록한다. 개발 검증은 API 37·공통 UI 51·관리자 431·Neture 관련 55개와 desktop/mobile Chromium 4개다. API/관리자 타입 및 API/관리자/Neture 빌드를 확인한다. 변경 문서 민감정보·링크·scope 검사를 거쳐 이 변경만 경로별 commit/push로 인계한다. 원격 SHA 일치와 clean 상태는 최종 보고에서 확인하며 통합 전이므로 worktree는 KEEP이다. 최신 main 이동과 검증 기준의 차이도 CHECK에 남겼다.


### 코드 push 완료

구현 커밋 `af543c0a600c94ad4ccce55bba932ed7a32c069f`를 `origin/wo/pharmacy-admin-settings-consolidation`에 push하고 명시적 fetch로 원격 SHA 일치를 확인했다. 커밋 직전 35개 파일의 staged 범위가 모두 이 작업 안임을 필수 검사기로 확인했다. 이 종료 기록은 같은 작업의 docs-only 후속 커밋으로 push한다. PR 생성·main 병합·배포는 하지 않았다.


## 후속 통합·배포 — 사용자 승인

개발·push 종료 후 사용자가 PR·병합·배포 진행을 명시 승인했다. 이 공간이 같은 작업의 통합을 이어간다. 위 push-only 기록은 당시 결과이며, 현재 종료점은 PR 기술 gate·리뷰·main 병합·운영 배포 검증이다.

- [x] 전달 branch/HEAD `8c2fa68d239d3f02b5c0836204e92c8e51935764` 및 clean 상태 확인
- [x] 최신 main `e09db6eb4b5b48e92bb3ebba2c777910c65f3c73`의 변경 16개 경로 조사: 이번 변경과 겹침 0, Neture 빌드/CI/도구 및 완료 문서
- [x] 이미 push한 작업 branch에 main을 merge (`273b2eafc52b2d419bbda134537ca0c518fa3c18`), 충돌 0, 다른 checkout 수정 0
- [ ] 통합 후 관련 검증·PR CI 및 Codex 리뷰
- [ ] main 병합·post-merge CI·현재 Delivery 정책 판정
- [ ] 운영 배포·serving revision/traffic·공개 응답 확인 및 한계 기록

새 migration·schema·seed·DB 직접 변경은 추가하지 않는다. 운영 Google 인증과 실제 회원/사업 상태 변경은 이번 검증에서 수행하지 않는다.
