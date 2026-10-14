# Neture 승인대기 상품 삭제 실패·대상 보존 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거 WO/IR**: [WO-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1](../work-orders/WO-NETURE-PRODUCT-APPROVAL-DELETE-FAILURE-V1.md)

> **현재 판정**: 코드·CI·API/Neture 배포 확인 완료. 과거 보류의 해소 근거는 문서 마지막 절을 따른다.

## 재현과 변경

기존 화면에서 API 실패 후 대상/확인창이 사라지고, 예외 처리·중복 확인·취소 잠금이 없음을 확인했다.
수정 전 새 회귀 6건 중 5건 실패·1건 통과와 미처리 예외 1건으로 재현했다.
실패를 숨기지 않도록 대상 snapshot·오류 표시·재시도·동기 ref 잠금과 finally 복구를 추가했다.
실패 때 목록·선택·상세는 그대로 유지하고, 성공 시 같은 Offer 상세만 닫고 현재 조건/페이지를 재조회한다.
확인창은 이름 있는 native dialog로 Drawer보다 위에 표시한다. 완전 삭제 경고와 기존 관리 권한은 유지한다.

## 로컬 검증

| 검증 | 실행 및 결과 |
|---|---|
| 삭제 회귀 | 새 10건 통과: 응답 실패→동일 Offer 재시도, 예외 복구, 중복/취소 잠금, 오류 초기화, 권한 재확인, unmount, 상세 보존/성공 닫기, 다른 상세 보호, 이미 열린 승인 확인의 동시 실행 차단, 느린 갱신 중 잠금 해제 |
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

## PR #544 통합 후 추가 확인

표시 정비 main `24b96f373`을 정상 merge(충돌 0). 기존 표시 회귀까지 5파일·49건 통과.
동시에 열린 승인 확인에서도 삭제 중 API를 보내지 않도록 기존 실행 guard를 보완했고 회귀로 검증했다.
1440/390 Chromium fixture를 다시 실행해 상품명 표시·실패 보존·재시도·busy 잠금·viewport·page error 0을 확인했다.
위 93파일·830건은 PR #544 통합 전 전체 실행 결과다. 통합 후 전체 suite는 PR CI에서 확인한다.

배포 사전 조사에서 별도 AI 작업의 미적용 `CreateAiUsageReservations1791870434349`와 API 의존 보류를 확인했다.
이는 이번 운영자 정비가 도입한 migration이 아니다. 운영 적용 승인 없이 API/migration을 실행하거나 배포 guard를 우회하지 않는다.
Neture-only 정상 판정과 최신 main CI 결과를 확인한 뒤 배포 가능 여부를 기록한다.

## 리뷰 보완

PR #555 P2: 삭제가 성공해 확인창은 닫혔지만 refresh가 끝날 때까지 mutation ref가 잠겨, 활성 일괄 버튼이 동작하지 않는 경우를 재현했다. 새 회귀 1건 실패로 확인 후, 삭제 mutation의 try/finally를 먼저 끝내고 잠금이 해제된 뒤 목록을 갱신하도록 분리했다. 다른 상품 선택이 남아 있고 갱신이 멈춘 상황에서도 일괄 확인창이 열리는 것을 검증했다. 보완 후 상품 승인 5파일·50건 통과.

## 2026-10-14 main 반영과 배포 판정

- 표시 정비·전체 관리자 용어 정비: [PR #544](https://github.com/Renagang21/o4o-platform/pull/544), main `24b96f373`, [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/38490722050) SUCCESS.
- 승인대기 삭제 실패·대상 보존: [PR #555](https://github.com/Renagang21/o4o-platform/pull/555), main `dadc13e62`, [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/38492253443) SUCCESS. Codex P2 잠금 수명 지적은 재현·보완 후 스레드 resolved.
- 최종 Neture 로컬 전체 검증: 94파일·838건 통과. 상품 승인 focused 5파일·50건 통과. desktop/mobile fixture와 Neture 타입·production build·lint 통과. 실계정 검증은 사용자 담당.
- 기존 Neture-only [Promote 38491748870](https://github.com/Renagang21/o4o-platform/actions/runs/38491748870)는 `HELD_DEPENDENCY`, 실제 deploy jobs SKIPPED. 최신 source `dadc13e62`의 [Neture-only Promote 38493246341](https://github.com/Renagang21/o4o-platform/actions/runs/38493246341)도 `HELD_DEPENDENCY`다. Classify SUCCESS이지만 실제 deploy jobs는 모두 SKIPPED이며 배포 성공을 뜻하지 않는다.

### 별도 API 선행 문제

다른 실행의 [Promote 38491966980](https://github.com/Renagang21/o4o-platform/actions/runs/38491966980)는 API `Build API server (bundled with tsup)`에서 실패했고 후속 frontend 배포는 SKIPPED다.
source `dadc13e62`에서 정상 dependency closure와 API tsc 빌드 후 `build:api` 실패를 로컬 재현했다. AI 영역 `ai-tool-router.ts`와 `work-agent-runtime.ts`가 타입 8개를 값으로 재export하여 esbuild가 실제 export를 찾지 못한다.
해당 타입은 `SupplierLookupIntent`, `SupplierRequestGap`, `AiToolInvocation`, `DomIntent`, `DomRequestGap`, `PlannerInput`, `WorkPlanner`, `PlannerTargetResolver`다. `export type` 구분 보완안을 별도 준비했으며 이번 운영자 WO에서 AI source는 수정하지 않았다.

또한 main에는 별도 AI 작업의 미적용 `CreateAiUsageReservations1791870434349`가 있다. 정상 up은 `ai_usage_reservations` table·pending index 생성 및 `ai_usage_aggregate.current_value`, `ai_usage_logs.costEstimated`를 `numeric(20,8)`로 변경한다.
이 운영 DB 변경은 Neture 화면 정비와 별도 범위다. 이 세션에서는 API/migration 배포를 실행하지 않았고, Neture-only 판정을 위해 API 의존 guard를 우회하지 않았다.
선행 API 빌드 정비와 명시 승인된 migration/API 배포 후 Neture 배포·운영 검증을 재개해야 한다. **코드 main 반영 완료와 운영 배포 완료는 구분한다.**

약사회 분회 코드 변경·본 세션의 배포 선택은 0이다. 현재 public root와 API health의 HTTP 200은 기존 운영 가용성 확인이며 새 코드 배포 검증이 아니다.

이 기록은 동일 WO의 후속 문서 단계로 기존 세션 전용 clone을 유지하고 최신 main에서 closure branch를 만들었다. 실행 코드·배포 설정을 바꾸지 않는 문서 변경이며 source 배포를 다시 주장하지 않는다. source 작업공간은 선행 API/배포 재개를 위해 KEEP한다.

API 타입 재export 문제의 별도 후속 [PR #557](https://github.com/Renagang21/o4o-platform/pull/557)이 진행 중인 것을 확인했다. 해당 API 작업은 그 PR을 따르며, 이번 운영자 문서 변경은 후속 source/serving 결과가 나오기 전 배포 완료로 판정하지 않는다.

## 2026-10-14 배포 보류 해소·최종 완료

- API 선행 수정 [PR #557](https://github.com/Renagang21/o4o-platform/pull/557)은 MERGED다. [Promote 38497933074](https://github.com/Renagang21/o4o-platform/actions/runs/38497933074), target `ce876b0ab03aeb8c61e15a2a378f89d55af3580b`: API build-and-deploy, 의존 Neture deploy, 최종 serving Report 모두 SUCCESS이며 `production`은 DEPLOYED다. 승인된 quota migration 실행 완료는 해당 AI WO/CHECK의 최종 운영 증거와 API workflow 결과를 따른다.
- 배포 target에 이번 운영자 source `e74675667` 및 표시 정비가 포함되는 ancestry를 확인했다. 이후 [Neture Delivery 38499037614](https://github.com/Renagang21/o4o-platform/actions/runs/38499037614), target `40aafa414f2df4abb8a4d647728e43227d78bbce`도 deploy-neture·summary·serving Report SUCCESS, `production`은 `DEPLOYED · deploy: neture`다. 이 target 역시 이번 변경을 포함한다.
- 최신 조사 main `6eeea05a2`의 [Delivery 38500377113](https://github.com/Renagang21/o4o-platform/actions/runs/38500377113)는 SUCCESS / NO_DEPLOY다. 현재 serving→target에 추가 배포가 필요 없다는 판정이며, 앞선 실제 배포 성공과 구분한다.
- 이번 확인에서 Neture 공개 root와 API `/health`의 HTTP 200을 다시 확인했다. 실계정 승인·삭제 업무 검증은 사용자 담당이며, 운영 상품 삭제나 테스트용 DB write는 하지 않았다.

**현재 상태: 이번 표시·삭제 실패 정비의 main 반영·CI·운영 배포 확인 완료.** 앞 절의 보류·실패는 당시 실행 기록으로 보존한다. API 선행 수정·migration·다중 서비스 rollout은 별도 실행에서 이미 완료됐으므로 이 확인 과정에서 다시 실행하지 않았다. 약사회 분회는 본 운영자 정비의 코드 변경·배포 선택에 포함하지 않았다. 이 최종 문서 변경은 DEPLOYMENT=NOT_APPLICABLE이다.
