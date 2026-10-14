# Neture 상품·공급자 승인 통합 정비 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거 WO**: [WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1](../work-orders/WO-NETURE-APPROVAL-WORKFLOW-REFINEMENT-V1.md)

## 구현과 보존

상품 승인 read 책임을 `useProductServiceApprovalQuery`로 분리했다. 목록/통계의 원자적 적용, 목록·분석 독립 요청 순서, 계정/필터/기간 변경, 검색 debounce 취소, 현재 page refresh, 성공 조회 시 선택 초기화는 유지한다.
승인 상품 휴지통 이동은 기존 confirm과 Offer softDelete API를 유지하면서 실패/예외 안내·finally·동기 중복 방어를 보완했다. 실패 시 목록/선택/상세 유지, 성공 시 같은 Offer 상세만 닫고 기존 page1 갱신, 심사/삭제와 상호 차단, unmount 후 refresh 방지를 적용했다.

공급자 승인은 모델·상세/서류 표시와 `useSupplierApprovalWorkflow`로 책임을 나눴다. 기본정보 저장·단일/일괄 심사·실패 재시도를 한 write lock으로 직렬화하고, 예외 후 입력/사유를 보존하며 종료 상태를 복구한다. 처리 중 대상 교체/닫기를 막는다. backend 프로필/오류 코드, 정보 미완료 승인 가능, 마스킹과 3종 서류, 실패 ID/사유만 일괄 재시도하는 기존 계약을 보존한다. 규제 품목군 심사 자체는 이번 변경 대상이 아니다.

## 실행 증적

- Node 22.18.0 / pnpm 10.25.0. frozen install 성공. offline 시 누락 tarball을 확인해 기존 허용 registry에서 정상 frozen install로 완료했다. package/lockfile 무변경.
- `pnpm run build:packages` 성공. 사전 빌드 도중 첫 focused 실행은 dist 미완성으로 5파일 import 실패/1파일 10건 통과였고, 빌드 완료 후 정상 실행으로 검증했다.
- 집중 회귀: `pnpm exec vitest run --config services/web-neture/vitest.config.mjs`에 상품 Page 5파일·공급자 Page·workflow 테스트 경로 지정 — **7파일 65건 PASS**. 최초 공급자 추가 테스트 1건은 전환 중 Drawer와 전역에 같은 안내가 표시되어 단일 text query가 모호했고, 결과 text 복수 조회로 수정했다. 동작 assertion은 유지했다.
- 전체 Neture: 동일 config 전체 실행 — **96파일 862건 PASS**.
- `pnpm --filter @o4o/web-neture exec tsc --noEmit` PASS.
- `pnpm --filter @o4o/web-neture build` PASS. 기존 큰 chunk 경고는 남아 있다.
- 변경 소스 6파일과 테스트 3파일 ESLint 오류/경고 0.
- Chromium 실제 컴포넌트/스타일 fixture: **1440/390px 모두 PASS**. 휴지통 false→retry 성공/선택 보존, 공급자 save 예외→입력 보존→retry, 거절 false→사유 보존→retry, 모바일 입력 viewport 범위, pageerror 0. API/auth만 합성 fixture로 치환했고 fixture 서버/코드는 저장소 외부에 두었다.
- 상세 Row를 render 외부로 이동하고 props readonly 및 선택 순서 보존 보완 후 관련 **2파일 10건 재검증 PASS**, 최종 tsc·소스 ESLint도 PASS.
- `node scripts/check-doc-sensitive.mjs` PASS (민감정보 패턴 0).

실계정 심사·저장·상품 삭제 및 운영 DB write는 실행하지 않았다. 사용자 담당 실계정 검증과 fixture 검증은 구분한다.

## 통합/배포

[PR #570](https://github.com/Renagang21/o4o-platform/pull/570)은 source `f931179a9783a15fc00f8db583c6a7702bea5dec`로 정상 병합됐다. main merge `3a42d584d085c09a0e861c71c8c3a66f0d4644d9`.
PR CI `38505562796`·CodeQL·Sonar·CI Gate PASS, 자동 코드 리뷰 지적 0·미해결 thread 0. main CI `38506413681` PASS.
[Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38507211952)의 실제 Neture deploy·serving Report SUCCESS, production success. serving source `3a42d584d085c09a0e861c71c8c3a66f0d4644d9`에 source commit 포함 확인.
Neture 페이지·첫 JS asset 및 API health의 read-only HTTP 확인 결과는 아래 보완 기록을 따른다.
DEPLOYMENT = REQUIRED → Neture 운영 반영 확인 완료. 이번 작업에서 API/migration/약사회 분회 배포는 실행하지 않았다.

## 문서 정합

새 WO/CHECK와 ACTIVE 운영자 TODO 2종을 갱신했다. 기존 COMPLETED 기록·정본 정책·canonical index는 수정하지 않았다.

### 공개 응답과 종료 상태

운영 반영 후 read-only 확인: `https://www.neture.co.kr/` HTTP 200, 해당 HTML의 첫 module JS HTTP 200, `https://api.neture.co.kr/health` HTTP 200. 인증된 실제 심사/삭제 기능은 이 HTTP 확인으로 검증했다고 주장하지 않는다.
이번 세션의 합성 fixture 서버는 종료했다. 소스 PR 작업 공간은 clean이며 source commit이 main에 포함됨을 확인했다. 같은 WO의 배포 완료 기록을 위해 이 전용 clone에서 최신 main 기반 closure branch를 사용한다. 별도 독립 개발 WO의 작업 공간 재사용이 아니다.
