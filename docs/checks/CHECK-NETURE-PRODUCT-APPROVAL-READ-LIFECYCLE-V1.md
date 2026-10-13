# Neture 상품 승인 — 조회·분석·검색 수명 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: [TODO](../work-orders/WO-NETURE-PRODUCT-APPROVAL-READ-LIFECYCLE-V1.md)

완료는 이번 A1 조회·타이머 정비의 개발·검증·push 범위다. 전체 화면/서비스 정비나 main 병합·배포 완료가 아니다.

## 기준과 조사

- Base: `origin/main aa59a0962f1295f1203bbc1261befb09b98a6f6e`.
- Branch: `wo/neture-product-approval-read-lifecycle`.
- 최종 fetch에서 main이 `90e49c3e6`으로 이동했다. 변경은 PH retirement scripts/workflow/doc이며 Neture 화면·hook·API와 소비 shared package 차이는 0이다. push-only 범위에서 착수 base를 유지하고 자동 통합하지 않았다.
- `/operator/product-service-approvals`, `/admin/product-service-approvals`의 같은 페이지.
- 이전 요청값/선택 분리·실패 UX branch는 미병합이며 자동 합치지 않았다.
- 기존 Neture 내부 `useLatestRequest`를 확인해 재사용했다. hook 자체와 공유 패키지는 무변경.
- 원문 경로 검사에서 과거 문서 참조만 확인, 살아 있는 raw-source 검사 계약 없음.

## 변경과 보존 조건

| 항목 | 결과 |
|---|---|
| 목록+통계 | 필터/사용자 scope와 요청 순번이 최신인 결과만 같이 적용 |
| 성공/오류/finally | 오래된 결과가 최신 데이터·선택·에러·loading을 덮지 않음 |
| 페이지 | 최신 요청 페이지와 현재 서버 반환 페이지를 보관 |
| 처리 후 갱신 | 최신 필터와 페이지 callback 사용. 이전 scope callback은 채널 등록 전에 제외 |
| 분석 | 별도 요청 채널로 기간/사용자 scope 보호 |
| 분석 표시 | 결과의 scope를 함께 저장, 기간 전환 중 이전 수치를 숨기고 기간 선택과 loading 안내 유지 |
| 분석 null/최신 실패 | 오래된 분석을 지우고 해당 영역만 숨김. 목록은 유지 |
| 검색 | 기존 300ms와 원문 값 유지, 재입력/즉시 검색/unmount에서 timer 취소 |
| unmount | 오래된 조회 반영과 쓰기 후 새 후속 조회 차단 |

API/권한/DB와 요청 필터 값·limit 30은 유지한다.
쓰기 결과 판정·모달 입력·삭제 처리·상태 전이는 이번에 정비하지 않는다. 쓰기 후 재조회 경로만 변경한다.
기존 revalidate의 page 1 갱신도 유지한다.

서버가 요청 page 3을 실제 page 2로 보정하는 경우, 처리 후 갱신은 표시된 실제 page 2를 사용한다.
요청 대기 중 페이지가 바뀌면 최근 요청 페이지로 갱신하고, 응답 적용 후에는 반환된 페이지를 따른다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| frozen-lockfile offline install | PASS, manifest/lockfile 변경 없음 |
| `pnpm run build:packages` | PASS |
| 최종 Neture 전체 Vitest | 74파일·641테스트 PASS |
| 새 read lifecycle 화면 테스트 | 17개 PASS (전체 suite 포함) |
| Neture `tsc --noEmit` | PASS, 최종 보완 후 재실행 |
| Neture production build (tsc 포함) | PASS, 최종 보완 후 재실행 |
| 변경 TS/TSX 2파일 eslint `--max-warnings 0` | PASS |
| desktop 1440/mobile 390 × 7개 기능 흐름 | 14시나리오 PASS |
| 최종 페이지 보완 후 쓰기/조회 흐름 재확인 | desktop/mobile 2시나리오 PASS |
| docs 민감정보 검사·diff check | PASS |

최초 회귀 16개를 포함한 전체 640테스트가 통과했다.
마지막 대조에서 서버 반환 페이지 기준을 보완하고 1개 회귀를 추가해 전체 641테스트를 다시 통과했다.
최종 영향 경로인 쓰기 후 갱신을 browser에서도 다시 확인했다.
이전 별도 branch의 테스트 수와 합산한 수치가 아니다.

### 회귀 17개

- 늦은 목록/통계 성공이 최신 선택을 지우지 않음.
- 늦은 목록 오류가 최신 목록을 숨기지 않음.
- 이전 finally가 최신 loading을 해제하지 않음.
- 페이지 응답 순서 역전과 현재 오류→새 필터로 복구.
- 이전 사용자 scope의 응답 무효화 (합성 사용자 전환).
- 분석 기간 순서 역전, 늦은 오류, 현재 빈 결과/오류와 목록 독립성.
- 300ms debounce, 재입력, unmount cleanup, 바로가기 검색에서 이전 timer 취소.
- 검색/페이지가 변경된 쓰기의 후속 갱신, unmount 후 후속 조회 없음.
- 서버 보정 페이지로 쓰기 후 갱신.

## Browser 기능 smoke

실제 페이지·Neture 스타일·실제 API adapter에 합성 operator 역할과 응답을 주입했다.
실서비스 인증/route wrapper·실계정 검증은 포함하지 않는다. 실제 접근 확인은 사용자 담당이다.

1440/390 각각 다음 7개를 확인했다.

1. 오래된 목록 성공 후에도 최신 목록·통계·선택 유지.
2. 오래된 목록 HTTP 500에도 최신 목록 유지.
3. 이전 기간 분석 성공이 최신 30일 분석을 덮지 않음.
4. 이전 기간 HTTP 500이 최신 분석을 숨기지 않음.
5. 분석 바로가기 검색이 예약된 이전 입력을 취소.
6. unmount 시 300ms timer가 제거되고 실행되지 않음 (timer probe 사용).
7. 쓰기 대기 중 검색 변경→쓰기 완료 후 최신 검색으로 갱신→늦은 이전 조회 제외.

최종 보완 후 7번을 desktop/mobile에서 다시 통과했다.
모든 시나리오에서 browser page error 없음. 주입한 오래된 HTTP 500은 의도한 실패 검증이다.

기존 모바일 카드 상품명 표시 문제는 별도 R1 후속이다.
이번 smoke는 해당 카드의 전체 레이아웃 정상 판정이 아니다. 제목 데이터는 DOM 기준으로 확인했다.

## 독립 검토와 경계

- 기존 Neture hook 원문과 API 모듈은 변경하지 않음.
- 목록 요청값과 승인/거절/삭제 API 호출 계약 유지.
- 목록과 분석은 다른 hook 인스턴스/채널. 분석 기간 전환이 목록을 재조회하지 않는 테스트 포함.
- `activeList`는 이전 callback이 최신 요청을 무효화하기 전에 scope를 검사하고, 처리 완료 시 최신 callback/페이지를 읽음.
- 분석은 data와 scope를 함께 보관해 새 기간 헤더 아래 이전 수치를 표시하지 않음.
- timer cleanup은 현재 예약 timer를 취소하고 ref를 비움. 이미 끝난 요청을 취소했다고 보고하지 않음.
- 요청 자체는 backend에서 계속 수행될 수 있다. 이 작업은 오래된 결과의 UI 적용을 차단한다.
- 서비스 간 공통화·약사회 분회·공통 Core 변경 없음.

## 후속과 문서 정합

이번 TODO의 A1 항목 완료와 후속 R1/삭제 실패/별도 branch 통합 대조를 구분했다.
이전 미병합 branch나 권한 정본을 재작성하지 않았다.
이전 실패 UX와 요청 모델 분리 branch는 통합 때 같은 파일의 변경을 함께 대조해야 한다.
다음 작은 작업은 모바일 상품 카드 표시 정비다.
