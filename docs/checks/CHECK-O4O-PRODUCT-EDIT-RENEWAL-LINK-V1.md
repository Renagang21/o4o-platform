# 기존 상품·설명서 편집과 갱신 검토 연결 검증 V1

> **상태**: COMPLETED · **검증일**: 2026-10-25 (Asia/Seoul)
> **범위**: 조사·구현·합성 검증·push. PR·main 병합·운영 배포·실상품 수정 없음.
> **작업**: [WO](../work-orders/WO-O4O-PRODUCT-EDIT-RENEWAL-LINK-V1.md) · **현행 안내**: [운영 안내](../guides/products/O4O-PRODUCT-EDIT-RENEWAL-LINK-V1.md)

## 결과

- 일반 카탈로그 편집과 관리자 직접 설명서 저장의 실제 변경에 갱신 검토·알림을 연결했다. 기존 P2를 재사용하지만 일반 편집을 보정 승인으로 위장하지 않으며 경로·처리자·전후 값·독립 이벤트를 보존한다.
- 상품/설명서 잠금·같은 값 no-op·이벤트 ID 중복 방지·원자적 rollback을 검증했다. 이용 목적은 미지정으로 시작하고 화면에서 명시적으로 선택한다.
- 공급자 제출·다른 canonical 승격·외부 수집은 자동 확대하지 않았다. 기존 역할·보호 필드·설명서 언어/유형·공용 자산 경계를 유지한다.
- 최신 main 23717b6dc0의 전용 branch에 선행 c88dbaf014를 포함하는 merge 847e55ea75를 만들었다. startup import/stop 충돌은 양쪽 worker를 모두 유지해 해결했다. 이 merge는 개발 branch 내부이며 main 병합이 아니다.

## 검증

- API Jest: **41개 suite / 827개 통과**, 기존 환경 플래그로 비활성화된 별도 통합 4개 suite / 42개는 건너뜀. 상품 관리·Neture 서비스·공통 DB 권한·worker 관련 회귀를 실행했다. 별도 공급자/홈 참여 통합 환경을 운영 DB로 대체하지 않았다.
- 신규 실제 TypeORM + PostgreSQL 15 통합 **11개**: 실제 상품 수정·관련 유형/언어, 같은 값·updatedAt·동시 저장, DB 정규화 결과 기록, immutable 보호·미등록 설명서 검토, 상품 수정 rollback, 관리자 본문·요약·HTML 정화와 다른 유형/언어 보존, 첫 설명서의 실제 유형/언어 연결·동일 대상 재전송, 동일 내용/동시 정본 저장의 no-op, 정본 승격 rollback, 기본 공급자/승격 경로의 미확대, 이벤트 중복·되돌림 실변경 구분.
- 통합 테스트는 실제 서비스·repository·transaction을 사용한다. 테이블은 localhost correction_review의 자체 무작위 schema에서 settings.key varchar(100)/type varchar(50), 상품 FK·canonical partial unique를 적용했다. synchronize/migrationsRun/installExtensions는 끄고 finally에서 자체 schema·연결을 정리한다.
- 관리자 Vitest: **4개 파일 / 32개 통과**. 일반 편집 경로·전후 값 표시, 목적 미지정 시 저장 차단과 명시적 목적 선택을 포함한다. 기존 P1/P2·정기 작업·AI 초안 UI 회귀도 통과했다.
- Chromium 합성 fixture 1440px/390px: 실제 관리자 production CSS에서 일반 편집 경로·전후 값, 긴 합성 처리자 UUID, 목적 미지정 저장 차단, 명시적 목적 선택, 원본 충돌 메모 유지, 저장 후 조회 실패, 갱신 이력·예약·대량 제어·재진입을 확인했다. 페이지 오류·실패 자산 요청·가로 넘침 없음. 화면 fixture는 운영 API 검증을 뜻하지 않는다.
- frozen lockfile 설치, 의존 패키지 및 types build, API·관리자 TypeScript, 관리자 production build 통과. 변경 파일 ESLint 오류 0, 기존 product-master-create.controller.ts의 사용하지 않는 _dataSource 경고 1건은 HEAD에도 존재하며 이번 범위에서 임의 수정하지 않았다. 신규 코드 경고 없음.
- 문서 상대 링크·민감정보·diff 검사 확인. 테스트 계정 기준 파일은 현 worktree와 기준 checkout에 없어 운영 로그인 smoke는 수행하지 않았다. 실계정·실상품·운영 예약은 사용하지 않았다.

## 후속 경계

현재는 미배포 개발 결과다. 기존 모든 raw SQL·수집·공급자 검수까지 변경을 포착한다고 해석하지 않는다. 동일 내용 설명서 요청에서 앞서 생성한 미적용 candidate는 삭제하지 않는다. 원본과 갱신 기록의 원자성은 일반 기본정보 transaction 및 관리자 canonical 승격 transaction 단위이며 전체 신규 상품 등록 과정을 새 transaction으로 바꾸지 않았다.

PR 생성·main 병합·배포는 별도 지시 없이 진행하지 않는다. AI 기능·QR 공식 DB 채택 보류·운영 상품 보정 실행과 분리한다.

## main 통합 전 추가 점검 (2026-10-25)

동일 WO의 연속 검증으로 기존 전용 worktree/branch를 유지했다. origin/main 67654de1fec1df5e50646d10155ead035e19c701을 개발 branch에 merge(e80ad1a5d18f3f1af6c3a618bb5fc73d6d9949a2)했다. 최신 main의 AI 회계·OCR 처리자 전달 변경은 보존했으며 AI 기능은 추가하지 않았다. main 자체에는 병합하지 않았다.

- 실제 PostgreSQL 경합을 재현했다. 정본이 없다고 조회한 뒤 별도 승격 경로에서 정본이 생기면 관리자 저장이 이를 덮어쓸 수 있었다. 관리자 저장은 비교한 정본만 강등하고, 새 정본과 unique 충돌 시 전체 transaction을 취소하도록 수정했다. 먼저 저장된 정본과 변경 근거를 보존하며 실패한 요청의 갱신 이벤트·작업은 남기지 않는다.
- 관리자 HTTP 경로는 PRODUCT_SOURCE_CHANGED / 409를 반환한다. 실제 처리자·관리자 편집 옵션 전달, 실제 정본 ID 응답, 비인증 401·서비스 관리자 403을 검증했다. 실제 DB 통합 12개와 HTTP 3개가 통과했다.
- 이전에 환경 조건으로 건너뛴 공급자 쓰기·페이지네이션·통합 주문·홈 참여 4개 suite / 42개를 별도 로컬 fixture DB로 실행해 모두 통과했다. 운영 DB나 실상품은 사용하지 않았다.
- 전체 API Jest를 CI와 같은 3개 shard로 실행해 **591개 suite / 9,486개 통과**, 실패 0을 확인했다. 조건부 52개 suite / 798개 검증은 기본 실행에서 비활성화되어 있으며 이 중 별도 DB 조건 4개 suite / 42개는 위와 같이 추가 실행해 통과했다. 나머지 조건부 검증은 실행한 것으로 보고하지 않는다.
- 관리자 전체 Vitest 484개, 전체 프런트엔드 및 app-store 패키지 타입 검사, API 타입 검사, 의존 패키지 build, 관리자 production build, 변경 파일 ESLint(경고 0)를 통과했다.
- 전체 API 검증 중 발견한 better-sqlite3 바인딩 누락은 현재 Node 22에 맞게 공식 의존성 설치 hook으로 복구했다. 관련 기존 SQLite 10개 검증도 통과했으며 package/lockfile·AI 소스는 변경하지 않았다.
- diff 기반 배포 위험 검사는 상품 정기 worker의 DB 쓰기로 LEVEL_3이다. 향후 통합 담당의 정식 PR·CI·리뷰 및 통제된 배포 절차가 필요하다. 로컬 검증은 GitHub CI나 운영 배포 성공을 대신하지 않는다.

PR 생성·main 병합·배포·운영 데이터 변경은 수행하지 않는다.

## 승인 범위 변경: PR·CI·리뷰 진행 (2026-10-25)

앞의 push 종료 기록 이후 사용자가 PR 생성·CI·리뷰·필요 수정 push까지 진행하도록 승인했다. main 병합·자동 병합·배포는 계속 보류한다. 동일 WO/branch에서 [PR #816](https://github.com/Renagang21/o4o-platform/pull/816)을 생성했다.

- PR 준비 시 origin/main이 d083f2f716으로 이동했다. 개발 branch에 merge(51f624cb4a)했고 startup 종료 충돌 한 곳은 상품 정기 worker와 상담 정리 worker 양쪽 stop을 모두 유지했다. 시작 코드도 양쪽을 보존한다. 최신 main의 상담·강의·인증·배포 workflow 변경은 그대로 유지했다.
- 병합 후 API 타입 검사와 상품 worker·상담 정리·강의·인증·관리자 설명서 HTTP 회귀 5개 suite / 59개를 통과했다. 앞 절의 전체 로컬 검증 수치는 당시 commit 기준 기록이며 최신 main의 모든 신규 테스트까지 재실행한 수치로 해석하지 않는다.
- 실제 main ruleset은 PR 필수·CI Gate 필수·필수 human approval 0이다. PR 자동 병합은 설정하지 않았다. CI 및 Codex 리뷰의 최종 결과는 PR의 실제 최신 HEAD와 검사·리뷰 기록으로 확인한다.
- Delivery 자동 경로는 main push의 CI 완료에만 반응하며 PR CI로 운영 배포를 시작하지 않는다. workflow·ruleset·freeze·운영 자원 설정을 바꾸지 않았다.

### PR #816 리뷰 후속

Codex P2 지적: 대량 점검 결과에서 기존 작업을 재사용하면 selectionResult.reused의 개별 작업 링크가 누락됐다. 신규/기존 혼합 선택과 서로 다른 묶음의 기존 작업만 선택하는 두 시나리오가 수정 전 실패함을 확인했다. 재사용된 상품별 batch/task 링크와 신규·기존 개수를 보존하고, 신규 작업이 없으면 신규 묶음 링크를 표시하지 않는다. 다른 실행 결과를 열면 이전 연결 목록을 초기화한다. 변경은 관리자 표시·연결에 한정하며 API·상품 데이터·기준·예약 정책은 바꾸지 않는다.

관리자 전체 Vitest 37개 파일 / 486개와 관리자 타입 검사·production build·변경 파일 ESLint를 통과했다. 리뷰 수정 후 최신 HEAD의 PR CI·Codex 재검토를 다시 확인한다.
