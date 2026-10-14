# Neture 승인대기 상품 삭제 실패·대상 보존 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거 WO/IR**: [WO-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1](../work-orders/WO-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1.md)

## 재현과 변경

기존 화면에서 API 실패 후 대상/확인창이 사라지고, 예외 처리·중복 확인·취소 잠금이 없음을 확인했다.
수정 전 새 회귀 6건 중 5건 실패·1건 통과와 미처리 예외 1건으로 재현했다.
실패를 숨기지 않도록 대상 snapshot·오류 표시·재시도·동기 ref 잠금과 finally 복구를 추가했다.
실패 때 목록·선택·상세는 그대로 유지하고, 성공 시 같은 Offer 상세만 닫고 현재 조건/페이지를 재조회한다.
확인창은 이름 있는 native dialog로 Drawer보다 위에 표시한다. 완전 삭제 경고와 기존 관리 권한은 유지한다.

## 로컬 검증

| 검증 | 실행 및 결과 |
|---|---|
| 삭제 회귀 | 새 8건 통과: 응답 실패→동일 Offer 재시도, 예외 복구, 중복/취소 잠금, 오류 초기화, 권한 재확인, unmount, 상세 보존/성공 닫기, 다른 상세 보호 |
| 상품 승인 회귀 | `pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/pages/operator/__tests__/ProductServiceApprovalPage*.test.tsx` — 4파일·42건 통과 |
| Neture 전체 | `pnpm exec vitest run --config services/web-neture/vitest.config.mjs` — 93파일·830건 통과 |
| 타입/빌드 | `pnpm --filter @o4o/web-neture build` — tsc 및 Vite production build 통과 |
| lint | 수정한 화면과 테스트 대상 ESLint 통과 |
| Chromium fixture | 실제 Tailwind 적용, 1440/390 폭: 실패 안내·선택 보존·busy 잠금·동일 Offer 재시도·성공 재조회·확인창 viewport 안 배치, page error 0 |

초기 fixture 서버의 Tailwind 설정 누락을 바로잡고 실제 스타일 적용 여부를 확인한 뒤 browser 결과를 다시 얻었다.
승인대기 목록의 기존 모바일 상품명 폭 문제는 PR #544 표시 정비 대상이며 이번 삭제 검증에서 해결한 것으로 보고하지 않는다.
browser helper/config는 검증 후 제거했고 production 계정·상품·DB는 사용하지 않았다.

## 경계와 남은 확인

API·DB·권한/삭제 정책·공통 모듈 변경 없음. 약사회 분회 제외.
실계정 확인은 사용자 담당이다. 승인 상품의 휴지통 이동 오류 처리는 후속 단위로 남긴다.
기존 표시 정비 PR #544 및 이번 branch의 CI·병합·배포 결과는 실제 완료 후 기록한다.
