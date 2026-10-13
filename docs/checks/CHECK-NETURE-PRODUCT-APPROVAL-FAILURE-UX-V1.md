# Neture 상품 승인 — 실패·부분 실패 처리 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: [TODO](../work-orders/WO-NETURE-PRODUCT-APPROVAL-FAILURE-UX-V1.md)

완료는 이번 승인·거절 실패 UX의 개발·검증·push 범위다. 전체 화면 정비나 main 병합·배포 완료가 아니다.

## 조사 기준과 변경

- Base: `origin/main aa59a0962f1295f1203bbc1261befb09b98a6f6e`.
- Branch: `wo/neture-product-approval-failure-ux`.
- `/operator/product-service-approvals`, `/admin/product-service-approvals`의 같은 페이지.
- 이전 요청값·선택 분리 branch는 자동 합치지 않았으며 이번 handler 변경은 main 기준이다.
- API adapter와 backend controller/service를 대조했다. batch의 success:true와 항목별 count를 분리해 해석한다.
- 원문 소비처 검사에서 역사 문서만 확인, 살아 있는 raw-source 계약 없음.

Neture 내부 `getServiceApprovalDecisionOutcome`가 failure/partial/success를 판정한다.
화면은 승인·거절을 하나의 실행 절차로 정리하고 다음을 보완했다.

| 결과/상황 | 동작 |
|---|---|
| success:false 또는 throw | 오류 안내, 모달·메모/사유·선택 유지, 잠금 해제와 재시도 |
| batch 성공 0·failed>0 | 전체 실패 건수 안내, 입력/선택 유지 |
| batch 일부 성공·일부 실패 | 성공/실패 건수 안내, 모달 닫기·선택 해제·목록/통계 재조회 |
| 전체 성공 | 완료 안내 후 닫기·재조회 |
| 처리 중 반복 확인/취소/다른 결정 | 동기 ref guard와 버튼·입력 잠금 |
| write 대기 중 unmount | 늦은 결과 반영·새 후속 조회 생략 |

부분 실패의 구조화된 실패 id는 제공되지 않는다. backend errors 문자열에서 id를 추정하지 않는다.
갱신된 목록에서 pending을 다시 선택하도록 안내하며, 완료 ID의 재전송을 방지한다.
갱신 실패에도 선택을 먼저 해제해 오래된 전체 선택이 남지 않는다.
재시도 요청은 기존 API·id·reason을 사용한다. Neture 관리 권한을 제출 전에 다시 판정한다.

## 검증

| 검증 | 결과 |
|---|---|
| frozen-lockfile offline install | PASS, manifest/lockfile 변경 없음 |
| `pnpm run build:packages` | PASS |
| Neture 전체 Vitest | 75파일·648테스트 PASS |
| 새 결과 판정 단위 테스트 | 11개 PASS |
| 새 화면 실패/수명 테스트 | 13개 PASS |
| Neture `tsc --noEmit` | PASS |
| Neture production build (tsc 포함) | PASS |
| 변경 TS/TSX 4파일 eslint `--max-warnings 0` | PASS |
| desktop 1440/mobile 390 × approve/reject × 단건 실패/일괄 전체 실패/일괄 부분 성공 | 12시나리오 PASS |
| docs 민감정보 검사·diff check | PASS |

단위 테스트는 API false, 단건 성공, batch 일부/전체 실패와 전체 성공, optional data 계약을 검증한다.
화면 테스트는 실패/throw 후 재시도, 전체 실패 선택 유지, 부분 성공 후 완료 id 제외,
동기 중복 확인/취소 방어, 갱신 실패 시 오래된 선택 해제, unmount 후 후속 조회 없음,
열려 있는 모달의 관리 권한 변경을 검증한다.

## Browser 검증

실제 페이지·Neture 스타일·실제 API adapter에 합성 operator 역할·응답을 주입했다.
실서비스 인증·route wrapper·실계정·운영 데이터 검증은 아니다. 실계정 확인은 사용자 담당이다.

12개 시나리오마다 두 번의 write(최초 처리 + 명시적 재시도)를 확인했다.
주입한 최초 단건 HTTP 400에서 API adapter가 false를 반환하는 경로를 거쳤다.
처리 중 메모/사유와 취소 비활성, 실패 후 입력 유지, 실패에서 불필요한 목록 갱신 없음,
부분 성공 후 선택 해제·목록 갱신·pending id만 다시 요청되는 것을 확인했다.
최종 성공 안내와 재조회도 확인했으며 browser page error는 없었다.

기존 390px 카드 상품명 표시 문제는 이전 CHECK에서 main 원본과 대조한 후속 항목이다.
이번 기능 smoke는 카드 제목의 정상 표시 판정이 아니다. 카드 레이아웃은 변경하지 않았다.

## 독립 검토와 경계

- 목록 요청 구성·필터·상태 전이·API/schema 변경 없음.
- 관리 역할/버튼 노출 정책 유지, 제출 시 동일 역할 판정 추가.
- 상품 삭제 handler·삭제 API 변경 없음.
- 공통 패키지·공통 export 변경 없음. 서비스 간 공통화와 약사회 분회 작업 없음.
- 성공한 부분 결과를 실패로 되돌리거나 모든 항목 성공으로 표시하지 않음.
- 실패에 loading이 남거나 write rejection이 이벤트 handler 밖으로 전파되지 않도록 finally 확인.
- mounted guard는 write 요청 취소를 보장하지 않는다. 이미 제출된 요청의 backend 실행은 기존 계약이다.

목록/분석의 응답 순서와 타이머 수명은 아직 별도 A1 범위다.
이번 guard를 전체 조회 수명 해결로 설명하지 않는다.
새 업무 의미를 합치는 추상화 없이 같은 화면의 승인/거절 반복 절차만 정리했다.

## 문서 정합

이전 TODO의 실패 UX 항목을 이번 WO로 상세화하고 완료/후속을 구분했다.
미병합 이전 branch·권한 정본·다른 서비스 문서는 수정하지 않았다.
