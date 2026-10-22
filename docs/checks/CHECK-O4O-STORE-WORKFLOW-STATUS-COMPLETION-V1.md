# 내 매장 일상 업무·대시보드 상태 보완 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-22 · **최종 갱신**: 2026-10-22 (한국시간)
> **개발 검증**: LOCAL_VALIDATED · **main/운영 반영**: 미실행
> **범위**: [TODO](../work-orders/TODO-O4O-STORE-WORKFLOW-STATUS-COMPLETION-V1.md) · 사용자 종료점 commit·push, PR 제외
> **기준**: main `3917a9522d` · branch `wo/store-workflow-status-completion`
> **정본**: [약국 매장 설계 §6-1](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md#6-1-내-매장-운영-화면과-업무-흐름-2026-10-09)

## 대조와 구현

미반영 개발 `40a33194a5`의 Store 구현·회귀를 최신 main 위의 새 전용 worktree에서 재사용했다. 원래 branch·작업 트리와 과거 문서는 수정하지 않았다. 이번 branch가 해당 세 기능을 포함하므로 통합 담당은 이 branch를 기준으로 검토하며 이전 개발 branch를 중복 병합하지 않는다.

| 업무 | 변경과 보존 |
|---|---|
| 상담 | 방향별 마지막 입력·번역을 화면 메모리에 유지, 고객 화면의 답변 입력 바로가기. 방향 전환 시 지연 번역/음성 무효화, 같은 방향 재선택은 초안을 지우지 않음. 새 상담·언어/모드·pagehide·계정/매장·화면 이탈 초기화. 기존 전문인/직원 판정·명시적 번역 유지 |
| 컨텐츠 사용처 | 기존 원본 갱신 사본의 조회 범위 유지. 부분 집계 0·미집계/근사·미조회/실패 구분, 선택을 보존하는 재조회. 최신 협업체 필터·불변 출처·상품 복귀 유지 |
| 위치별 수정 | 같은 위치의 복수 QR/태블릿 중 선택 → 현재 목록의 대상 확인 → 기존 배치/교체 패널 → 원래 query/hash/state의 현황 복귀. 다른 매장/서비스/경로의 이동 힌트 거절. QR 표시·선택·출력 집계 범위를 같은 대상으로 맞춤 |
| 대시보드 서버 | 조회 실패를 성공·0건으로만 반환하던 처리를 보완. 기존 숫자 필드·SQL·인증·경로 유지, 항목별 `availability` 추가. 매장 미확인·DB 실패·비정상 수는 unavailable, 실제 0은 available, 원장이 없는 판매/설문은 not_supported |
| 대시보드 Store | 상태가 확인된 주문·상담만 표시. 부분 실패에서도 정상 항목 유지. 구버전/상태 누락 응답을 확인된 0으로 표시하지 않음. 현황 재시도·기존 빠른 작업·매장 전환 지연 응답 차단 유지 |

대시보드 역방향 소비처는 공통 `createStoreHubApi`와 Store/KPA wrapper, KPA 기존 홈, Store의 `homeOverview`를 대조했다. controller의 실제 등록은 KPA namespace 한 곳이다. 기존 공통 숫자 타입·client·다른 서비스 화면은 변경하지 않았고 응답은 추가 필드를 허용한다. KPA 기존 홈의 화면 정책 정비는 이번 범위가 아니다. `sellerOrganizationId`는 B2B 생성 시 약국 ID를 저장하는 기존 계약이므로 주문 판정·기간·금액을 재정의하지 않았다.

상담 초안·사용처 표시·위치 이동/복귀·대시보드 조회는 작은 로컬 함수/훅으로 정돈했다. 공통 Core·DB/migration·의존성·권한·workflow 변경은 없다. API 보완은 위 상태 보고뿐이다. 사이니지 재생 경로·PG·공급가·개인 가입→약국 자격·AI 이력 계약은 변경하지 않았다.

## 실제 실행 검증

| 검사 | 결과 |
|---|---|
| 환경·설치 | repository 기준 Node 22.18.0 / pnpm 10.25.0. `pnpm install --frozen-lockfile --verify-store-integrity=true --offline` 통과 |
| Store 관련 회귀 | 13 files / 148 PASS. 상담·자료함·실행 현황·QR 대상·대시보드·태블릿/미디어 검사 |
| Store 전체 | `pnpm --filter store-web test` — 63 files / **781 PASS** |
| API 회귀 | `store-hub-live-signals.spec.ts`와 기존 `store-hub-product-apply-gate.spec.ts` — 2 suites / **35 PASS**. 실제 신규 loader와 실제 기존 제품/서비스 guard 검사, DB 응답은 합성 fixture |
| Store production | `pnpm --filter store-web build` PASS (TypeScript 포함) |
| API 타입/production | 의존 workspace를 의존 순서로 빌드한 뒤 `type-check` 및 `build` PASS |
| 집중 lint | 변경 TS/TSX 23개 `pnpm exec eslint --no-cache` — 오류·경고 0 |
| 브라우저 | 실제 화면 컴포넌트 + 합성 API/인증/매장. PC 1440×1000 / 모바일 390×844, 공통/서비스 지정 mount의 10개 흐름 × 4 = **40 PASS** |

신규 API 검사는 확인된 0, 부분 DB 실패, 매장 문맥 없음, 비정상 결과, 동시 매장별 읽기 격리를 확인한다. 실제 SQL 실행이나 운영 권한 E2E 검증을 대신하지 않는다. 공통 숫자 필드의 하위 호환도 검사한다.

브라우저는 대시보드 부분 실패·전체 미확인·구버전 응답·0건 복구와 매장 전환 지연 응답, 상담 양방향 초안/번역·고객 답변·초기화, 사용처 실패 재시도/선택 유지, 같은 위치 다중 대상·교체 실패 복구·현황 복귀, 선택 QR 배치/일괄 선택 범위·입력 유지·누락 재조회·지연 목록 격리를 실행했다. 실제 메뉴별 destination/기존 패널을 사용하며 production App 로그인 전체를 실행한 것은 아니다.

각 흐름의 page error·외부/미처리 합성 API·페이지 가로 넘침은 0이다. 모바일 대시보드·QR 배치와 PC 상담 이미지를 직접 확인했다. 합성 브라우저의 소스·결과·스크린샷은 저장소 밖 `/workspace/.o4o-workflow-status-browser-20261022/`, 설치/build/test/lint 로그는 `/workspace/.o4o-workflow-status-20261022/`에 보존한다. Store build의 기존 큰 chunk 안내는 유지했다.

## 인계와 후속

push 전 재확인한 main은 `7dc02646da`(#760 KPA 구 화면 철거)다. 변경 371개 경로와 이번 작업의 겹침은 0이며 의존성·workflow 변경도 없다. 시작 기준의 KPA 기존 홈/wrapper가 새 main에서 제거된 것을 확인했다. 이 개발 branch에 자동 merge/rebase하지 않았으며 위 검증은 시작 main `3917a9522d`와의 결합 결과다. 최신 main과의 최종 결합 검증은 통합 담당 범위다.

PR·PR CI·main 병합·배포는 실행하지 않는다. 개발 push 결과와 원격 HEAD 일치는 최종 인계에서 확인한다. 통합 담당은 제출 branch/HEAD와 최신 main의 차이를 확인하고 API/Store 결합 상태·필수 CI/리뷰를 검증한다. 이 CHECK는 배포 또는 실사용 완료 증적이 아니다.

실제 계정 로그인·직원 초대/최종 승인/해제·정상 매장 간 업무 격리·운영 번역/실제 마이크·QR 출력/스캔·태블릿/사이니지 재생·실 PG·공급자 수신/배송은 미실행이다. 유료 AI·운영 DB·운영 업무 데이터는 사용하지 않았다. 이번 로컬 Vite와 독립 브라우저를 종료했고 전용 포트가 닫힌 것을 확인했다. 테스트 DB·업무 fixture 저장은 만들지 않았다.

```text
WORKTREE_DISPOSITION
worktree: /workspace/o4o-wt/store-workflow-status-completion
branch: wo/store-workflow-status-completion / base: 3917a9522d
main integration: 미실행 / CI: PR 미생성으로 미실행 / deployment: 통합 담당 후속
smoke: 실제 컴포넌트+합성 API PC/모바일 40 PASS; 실계정·기기 검증 미실행
other session usage: 없음(이번 세션 전용) / verdict: KEEP
reason: push 인계 후 통합 검토·수정 재현용. 기존 작업 트리·기준 checkout 보존.
```

문서 정합: 현재 약국 설계 §6-1에 업무/상태 표시 계약을 맞추고 TODO·CHECK를 작성했다. 과거 기록·canonical index의 상태·정책 판정은 변경하지 않았다.
