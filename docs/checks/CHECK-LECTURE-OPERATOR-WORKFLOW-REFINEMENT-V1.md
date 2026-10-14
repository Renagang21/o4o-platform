# 강의 운영 심사·문의·수료증 흐름 검증

> 작성일: 2026-10-14 · 최종 갱신: 2026-10-14
> 상태: 개발 검증 PASS · [PR #587](https://github.com/Renagang21/o4o-platform/pull/587) 인계
> 작업: [WO](../work-orders/WO-LECTURE-OPERATOR-WORKFLOW-REFINEMENT-V1.md)

## 구현과 보존

- 강사·강좌 목록: 기존 `useOperatorQueue`의 scope/generation·읽기/쓰기 잠금을 보강했다. 이전 scope 콜백은 실행할 수 없고, 이전 완료가 새 목록의 잠금을 풀지 않는다. 저장 성공/목록 실패는 성공 사실을 안내하고 조회만 재시도한다.
- 심사 사유: 강의 내부 `OperatorReasonDialog`에서 대상과 입력을 소유한다. 실패 시 유지, 성공 시 닫기, 필터 변경 시 폐기한다. 강사 사유 선택·강좌 목록 trim 필수·상세 반려의 원문 전달을 보존한다. Dialog는 비어 있지 않은 강좌 사유를 확인하며 백엔드 계약은 변경하지 않는다.
- 강좌 검토: course ID별 workspace와 `useOperatorCourseReview`로 조회/결정을 분리했다. 늦은 조회·승인 완료가 다른 강좌를 덮거나 목록으로 이동시키지 않는다. 서버 scope, 읽기 전용 커리큘럼·영상/첨부 열람·문항/정답 비노출 유지.
- 문의: 강의 전용 `lectureContactApi`로 기존 endpoint/envelope를 분리했다. 실제 공통 문의 화면에서 상태 저장 성공/내부 메모 실패 후 메모를 유지하고 미완료 메모만 다시 저장하는 기존 계약을 검증했다. 공통 화면 소스와 다른 서비스는 변경하지 않았다.
- 기존 교육 문의: `useLegacyEducationRequests`로 요청 상태를 분리하고 목록/상세/쓰기 실패를 구분했다. 저장 후 목록 실패에는 저장 완료 안내·추가 쓰기 차단·읽기 재시도를 제공한다. 상세 실패 재시도는 선택한 상세를 다시 조회한다.
- 수료증: `useOperatorCertificates`가 발급/갱신/폐기 요청 snapshot·결과를 소유한다. 같은 순간의 중복 실행과 늦은 언마운트 응답을 방어하고, 결과에 학습자/강의·수료증 ID·갱신 월수를 연결했다. 발급 후 대상 ID/진위 코드 연결, 1개월 이상 정수 검증, 폐기 사유 선택 입력 유지.
- 사유 dialog의 키보드 focus 순환·복귀, 처리 중 닫기 방지, 모바일 높이/scroll, toast보다 위 표시를 검증했다.

## 실행 결과

| 확인 | 결과 |
|---|---|
| Node 22.18.0 / pnpm 10.25.0, frozen install/store integrity | PASS, manifest·lockfile 변경 없음 |
| `pnpm run build:packages` | PASS |
| `pnpm exec vitest run --config services/web-lecture/vitest.config.mjs --maxWorkers=2 --minWorkers=1` | 10 files / 40 tests PASS |
| `pnpm --dir services/web-lecture run type-check` (서비스 TypeScript 5.9.3) | PASS |
| `pnpm --dir services/web-lecture run build` (`tsc -b && vite build`) | PASS, 기존 chunk 크기 경고 유지 |
| API Jest: `lecture-phase2-merge-gate-contract.spec.ts`, `study-legacy-education-inquiry-http.spec.ts`, `--runInBand` | 2 suites / 140 tests PASS, DB-free mocks |
| Chromium PC 1440×1000 / 모바일 390×844, 실제 화면+합성 API | 두 viewport PASS |
| 원문 소비처 조사 | 강좌 목록→검토 route, 검토 읽기 전용/영상·첨부 원문 assertions 보존·위 Jest로 검증 |
| `git diff --check` | PASS |

브라우저: 반려 저장 실패→사유 보존→저장 성공/목록 실패→조회 복구, 강사 선택 사유 취소, 승인 중 강좌 전환/이전 응답 무시, 수료증 발급→갱신→폐기 실패/재시도, 공통 문의 상태/메모 부분 성공과 메모만 재시도, 기존 문의 저장 성공/목록 실패 복구를 실행했다. 화면 전체 가로 넘침·page error·실 API 요청 없음. 합성 fixture·로그·스크린샷은 `/tmp/lecture-*`에만 보관하며, 반복 가능한 회귀 테스트는 소스에 포함했다.

강의는 자체 TypeScript 5.9.3을 사용한다. 루트 TypeScript 4.9.5를 직접 호출하면 강의 tsconfig의 최신 옵션을 거부하므로 서비스의 type-check/build script를 사용했다. 의존성 변경 없음.

## 미해결·후속 및 인계

- **기존 제약:** `CertificateController.revokeCertificate`는 프론트가 전달한 reason을 소비하지 않고 서비스에도 ID만 전달한다. 이번 UI의 사유 보존은 실패 재시도 입력 보존이며 서버 영속/감사 이력 완료를 뜻하지 않는다. 사유 저장은 별도 API/DB·보유 정책 작업으로 남긴다.
- 공통 문의 모듈 구조와 전체 소비처 정비, 강의 자동/일괄 수료 평가·발급은 후속. 외부 답변 발송 API를 추가하지 않았다.
- API·DB·권한·상태 전이·서비스 공개 범위·공유 패키지·약사회 분회 변경 없음. 운영 계정/DB 쓰기 없음.
- 실계정 검증은 사용자 담당. main 병합·배포는 통합 담당이 최신 PR HEAD·CI·Codex/리뷰 상태를 확인해 진행한다.
