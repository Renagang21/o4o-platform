# WO-O4O-SUPPLIER-BUSINESS-TERMS-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-17 · **최종 갱신**: 2026-10-17
> **근거 WO/IR**: 사용자 공급자 잔여 업무 정정 및 TODO 검증 후 구현·push 지시

## 확정 범위

기준 main `f2b18165f3`. 기존 [제안 초안 WO](WO-O4O-SUPPLIER-BUSINESS-PROPOSAL-DRAFTS-V1.md)의 과거 후속 과제 목록을 소급 재작성하지 않고, 이번 사용자 결정으로 아래 범위를 확정한다.

- 협업체별로 단가·배송비·무료배송 기준·최소 주문금액·메모를 정하고 별도 승인받는다. 같은 조건의 복사 편의를 유지한다.
- pharmacy 기본 공급은 유지하며 특별가격 제안은 다른 협업체와 같은 승인 절차를 따른다.
- 대상 약국의 해당 협업체 active 가입을 제안 생성 단계에서 추가 검사하지 않는다. 협업체의 판단을 인정한다. 기존 조직 존재 검사는 유지한다.
- 미결제 주문의 결제 직전 제안 철회·종료·가입 정지 재검사는 추가하지 않는다. 협업체 책임이다. 기존 접근·장바구니·주문 확정 경계는 이번 작업에서 철거하지 않는다.
- 최초 승인 이력 보존, 자기 제안 승인 차단을 보완한다.
- 운영 DB 변경·migration 실행·PR 생성·main 병합·배포는 이번 push 범위에 포함하지 않는다.

## 조사 및 TODO 검증

- [x] 최신 main·소비자 commerce 경계·B2B 계약·약국 commerce 설계·공유 모듈 규칙 조사
- [x] `supply_proposals`는 이미 협업체별 독립 행이며 생성 후 단가 변경 경로가 없음을 확인
- [x] 운영자 종료가 `decided_by/decided_at/reason`을 덮어쓰는 문제 확인
- [x] 공급자 권한 정본은 `organization_members`의 owner 및 `left_at IS NULL`, legacy user pointer는 호환 관계임을 확인
- [x] 배송비 계산은 주문 생성 시 supplier 공통값을 사용하므로 제안 스냅샷을 주문까지 전달해야 함을 확인
- [x] 새 조건이 서로 다른 제안의 배송비·최소금액을 한 주문에서 섞지 않도록 그룹 분리가 필요함을 확인
- [x] 공통 운영자 UI 소비처: Neture·KPA Society·협동조합·Store의 얇은 wrapper 및 pharmacy-management API 재수출, 공급 옵션의 Store·KPA API 소비처 조사
- [x] 조건/이력 migration 및 manifest·격리 PostgreSQL 지문
- [x] 제출 시 조건 고정, 기존 API 호환·조건 입력 검증
- [x] 자기 승인 방지·승인 이력과 종료 이력 분리
- [x] 공급 옵션·주문 조건/배송비/최소금액 연결 (결제 전 재검사 추가 없음)
- [x] 공급자 초안의 조건 입력·복사·요청/운영자 심사·약국 표시
- [x] 단위·DB·공유 UI·desktop/mobile 검증
- [x] 문서 정합·commit·push (SHA·원격 확인은 인계 보고 참조)

## 구현 기준

상세 기준은 [협업체별 공급조건 설계](../design/DESIGN-SUPPLIER-BUSINESS-TERMS-V1.md)를 따른다. 기존 주문·결제 원장을 유지한다. 종전 baseline/Frozen 문서나 canonical index는 임의로 재작성하지 않는다. 운영 migration 적용에는 해당 실행에 대한 별도 승인이 필요하다.

## 구현·검증 결과

- migration `AddSupplierProposalTerms1792221000000`: `terms_snapshot`, `ended_by`(계정 삭제 시 NULL), `end_reason` 추가. 기존 행 backfill 없음. 사용된 조건/종료 이력이 있으면 down을 거부한다.
- 격리 PostgreSQL 15 canonical bootstrap 및 모든 기존 incremental 지문 일치 확인 → 새 migration 지문 `2fe675793e6f86734ed83e4317047f7b2548e02c1fea92ae39bba083f8a8f644` (6741 lines). 빈 조건 상태 down/up도 기존/신규 지문을 각각 복원했다. 별도 fresh DB에서 표준 `src/migrate.ts` 전체 재생·post-migration assertion PASS.
- 서버 focused Jest: 3 suites · 51 tests PASS. 실제 PostgreSQL 16개 사례를 포함해 자기 승인(요청자·canonical owner·legacy owner), 타 사업 범위, 최초 결정 보존, 별도 종료 기록, 조건 고정·변경 재신청, pharmacy 기본/특별가격, 약국 대상 생성 시 active 가입 검사 없음, 배송비·최소금액·무료배송 경계, 주문 조건 snapshot, rollback 보호를 확인했다.
- Neture 공급자 화면: 11 files · 132 tests PASS. 명시적 조건 입력·복사 payload 및 오류 초안 재시도 경계 포함.
- 공통 pharmacy-management: 6 files · 31 tests PASS. 협업체 조건·최초 결정/종료 표시, 구분 불가능한 과거 종료 기록의 별도 표기 포함.
- Store 전체: 57 files · 649 tests PASS. 이후 조건 표시 2개를 추가한 해당 파일 focused: 22 tests PASS (그중 기존 20개 재실행). 모바일에서는 조건 글자가 세로로 쪼개지지 않도록 표 최소 폭과 가로 스크롤 안내를 추가했다.
- KPA: 24 files · 167 tests PASS. 협동조합: 4 files · 38 tests PASS.
- API build 및 최종 API TypeScript, Neture·Store·협동조합 production build PASS. 최초 공통 조건 표시에서 formatter import 경로 오류가 발생해 수정 후 공통 테스트와 Neture 빌드를 다시 통과했다. 기존 Browserslist 데이터·큰 chunk 경고는 남아 있다.
- Chromium production bundle 가상 auth/API: 공급자 초안·협업체 운영자·약국 공급 목록, desktop 1440px/mobile 390px. 협업체별 배송비 독립 수정/요청, 오류 상태 유지·개별 재요청, 조건 표시 확인. 페이지 오류·문서 가로 넘침 0. Store 첫 검증은 가상 서비스 문맥 누락으로 기존 접근 안내가 표시되어, 올바른 약국 문맥 fixture를 설정한 후 통과했다. 운영 업무 데이터 쓰기 0.
- `node scripts/db/check-migration-contract.mjs`: 21/21 PASS. `git diff --check`, docs 민감정보 검사 PASS.

## 기존 실패와 미실행

기존 `neture-pharmacy-commerce.integration.spec.ts`를 표준 migration 재생 DB에서 확대 실행한 결과 20 PASS/6 FAIL이었다. 기준 main `f2b18165f3`의 별도 코드 사본·별도 DB에서도 동일한 6개 테스트가 실패했다(기본 공급 게시 opt-in fixture와 이전 커뮤니티 접근 전제 관련). 실패 이름을 대조해 신규 실패 0을 확인했다. 이 기존 실패를 수정하거나 전체 integration PASS로 보고하지 않는다.

실제 운영 계정·운영 DB·결제 업무 검증은 수행하지 않는다. 앞 트랙의 로그인 401 해결은 이번 코드 변경으로 검증됐다고 간주하지 않는다. PR CI·Codex 리뷰·main 통합·배포는 실행하지 않고 push 후 인계한다. 새 migration의 운영 실행 승인은 이번 지시에 포함되지 않는다.

## 문서 정합·인계

사용자가 제외한 대상 약국 active 가입 검사·결제 직전 재검사는 TODO에서 제외했다. pharmacy 특별가격은 동일 승인 경로임을 새 설계와 화면 안내에 반영했다. 이전 완료 WO는 당시 기록으로 보존한다. 기존 Frozen/baseline·canonical index는 변경하지 않으며, 새 설계가 이번 사용자 결정의 적용 범위를 명시한다.

검증 산출물은 저장소 밖 `/workspace/artifacts/supplier-business-terms/`에 보관한다. 가상 fixture만 포함하며 실제 계정값·운영 응답은 저장하지 않는다. worktree/branch는 통합 전 후속 수정용으로 KEEP한다.

검증 종료 정리: 이번에 생성한 임시 schema 잔존 0, 격리 DB 4개 삭제 후 잔존 0을 확인했다. 이번 preview 프로세스와 로컬 PostgreSQL을 종료했다. 코드 작업공간은 push 후 KEEP한다.

## 통합 후속 — 2026-10-18

사용자의 main 병합·배포 지시로 통합을 시작했다. main `78909a7a87`의 운영자 제품 상세를 보존하고, 고정 조건이 있는 제안은 공통 정책 대신 해당 조건을 표시하도록 충돌을 해결했다. 공유 약국 관리 37개, 실제 격리 PostgreSQL 포함 API 51개 재검증 통과. 제품 상세 필드가 추가된 main에 맞춰 격리 DB fixture도 갱신했다. 운영 migration 승인은 `AddSupplierProposalTerms1792221000000`에 대해 배포 직전 별도로 확인한다. 기존 개발 단계의 미실행 기록은 당시 범위이며 후속 통합 결과는 PR·배포 증거로 인계한다.
