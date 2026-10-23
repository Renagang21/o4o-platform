# 내 매장 일상 업무·대시보드 상태 보완 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-22 · **최종 갱신**: 2026-10-23 (한국시간)
> **개발 검증**: LOCAL_VALIDATED (2026-10-23) · **main/운영 반영**: DEPLOYED · api,store
> **범위**: [TODO](../work-orders/TODO-O4O-STORE-WORKFLOW-STATUS-COMPLETION-V1.md) · 최초 개발 push 완료, 사용자 후속 지시로 PR·main 병합·배포 완료
> **기준**: 시작 main `3917a9522d` · 최종 결합 main `cd091bc221` · 개발 HEAD `77e8195307` · 병합 main `8c44ffde13`
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

## 최초 개발 시점의 실제 실행 검증

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

## 최초 인계 시점과 후속 경계

최초 push 전 재확인한 main은 `7dc02646da`(#760 KPA 구 화면 철거)였다. 변경 371개 경로와 이번 작업의 겹침은 0이며 의존성·workflow 변경도 없다. 시작 기준의 KPA 기존 홈/wrapper가 새 main에서 제거된 것을 확인했다. 최초 인계에서는 자동 merge/rebase하지 않았으며 위 검증은 시작 main `3917a9522d`와의 결합 결과다. 이후 사용자 요청에 따른 최신 main 결합 검증은 아래에 별도로 기록한다.

PR·PR CI·main 병합·배포는 실행하지 않는다. 개발 commit `709f10a03d13bfca57d5a743e7008fabd16a22b0`을 전용 branch에 push하고 최초 원격 HEAD 일치와 clean 상태를 확인했다. 이 결과 기록 보완도 같은 branch에 commit·push하며 최종 제출 HEAD는 완료 보고에서 인계한다. 통합 담당은 제출 branch/HEAD와 최신 main의 차이를 확인하고 API/Store 결합 상태·필수 CI/리뷰를 검증한다. 이 CHECK는 배포 또는 실사용 완료 증적이 아니다.

실제 계정 로그인·직원 초대/최종 승인/해제·정상 매장 간 업무 격리·운영 번역/실제 마이크·QR 출력/스캔·태블릿/사이니지 재생·실 PG·공급자 수신/배송은 미실행이다. 유료 AI·운영 DB·운영 업무 데이터는 사용하지 않았다. 이번 로컬 Vite와 독립 브라우저를 종료했고 전용 포트가 닫힌 것을 확인했다. 테스트 DB·업무 fixture 저장은 만들지 않았다.

```text
WORKTREE_DISPOSITION
worktree: /workspace/o4o-wt/store-workflow-status-completion
branch: wo/store-workflow-status-completion / base: 3917a9522d (후속에서 7dc02646da 결합)
main integration: 미실행 / CI: PR 미생성으로 미실행 / deployment: 통합 담당 후속
smoke: 실제 컴포넌트+합성 API PC/모바일 40 PASS; 실계정·기기 검증 미실행
other session usage: 없음(이번 세션 전용) / verdict: KEEP
reason: push 인계 후 통합 검토·수정 재현용. 기존 작업 트리·기준 checkout 보존.
```

문서 정합: 현재 약국 설계 §6-1에 업무/상태 표시 계약을 맞추고 TODO·CHECK를 작성했다. 과거 기록·canonical index의 상태·정책 판정은 변경하지 않았다.

## 동일 WO 후속 — 최신 main 결합 검증

사용자 요청에 따라 동일 전용 branch/worktree에서 후속 검증을 시작했다. 원격 개발 HEAD `addc51af69`와 clean 상태를 확인하고 최신 main `7dc02646da`를 일반 merge했다. 결합 commit은 `8bbe9f1778`이며 충돌·이력 재작성은 없다. 이는 개발 branch 내부의 결합이며 main 반영이 아니다.

KPA 기존 홈/wrapper는 이 최신 main에서 제거됐다. 앞선 역방향 소비처 설명은 최초 개발 조사 시점의 기록이다. 현재 유효한 소비처는 공통 client와 Store wrapper/`homeOverview`이며 서버의 KPA namespace 등록은 유지된다. 삭제된 KPA 화면을 복구하거나 별도 약국협력 서비스의 역할·권한을 변경하지 않는다.

결합 시 기존 개발 26개 파일의 commit 간 diff가 0임을 확인했다. 아래 검사는 모두 main `7dc02646da`를 포함한 결합 commit `8bbe9f1778` 위에서 다시 실행했다. 앞선 검증과 중복 합산하지 않는다.

| 결합 상태 검사 | 결과 |
|---|---|
| 설치 | `pnpm install --frozen-lockfile --verify-store-integrity=true --offline` PASS. lockfile 변경 없음 |
| Store 전체 | `pnpm --filter store-web test` — 63 files / **781 PASS** |
| API 회귀 | 기존 관련 2개와 main에서 변경한 정적 계약 18개를 `jest --runInBand --no-coverage --runTestsByPath`로 실행 — 20 suites / **582 PASS** |
| Store production | `pnpm --filter store-web build` PASS (TypeScript 포함). 기존 큰 chunk 안내 유지 |
| API 타입/production | `pnpm --filter @o4o/api-server run type-check` 및 `run build` PASS. 이미 빌드한 의존 workspace 재사용, 관련 의존 소스 변경 없음 |
| 집중 lint | 기존 개발 TS/TSX 23개 `eslint --no-cache --max-warnings=0` PASS |
| PC·모바일 브라우저 | 같은 실제 컴포넌트+합성 API/인증/매장 검사 — 2 mount × 2 viewport × 10 흐름 = **40 PASS** |

브라우저 첫 시도는 개발 서버 첫 진입의 12초 제한 초과로 검사 0건에서 중단됐다. 서버 HTTP 200과 build 종료를 확인한 뒤 동일 검사로 재실행하여 40건을 통과했다. 앱 코드·검사 조건·제한 시간은 바꾸지 않았다. 최초 실패 로그/결과도 별도 보존한다. 최종 검사의 page error·외부/미처리 합성 API·페이지 가로 넘침은 0이며, PC 상담과 모바일 QR 배치 이미지를 다시 직접 확인했다.

후속 로그는 기존 증적 폴더의 `continuation-*`, 브라우저 최종 결과는 기존 `results.json`이다. 이전 결과는 `results-before-main-combination.json`, 최초 제한 시간 초과 결과는 `results-initial-cold-start-timeout.json`으로 보존했다. 검사 브라우저와 이번 전용 Vite 프로세스를 종료하고 전용 포트 종료를 확인했다.

실제 계정·DB·기기·운영 변경 및 AI 이력 계약은 계속 미실행 범위다. PR·PR CI·main 병합·배포도 미실행이다. 후속 결합과 검증 기록 `0b0fa24eb23dc46318a693af529b2a4b3ff1347b`를 동일 branch에 push하고 원격 HEAD 일치·clean을 확인했다. TODO 완료 상태 기록도 같은 branch에 push하며 최종 제출 HEAD는 완료 보고에서 인계한다. worktree는 통합 검토/수정 재현을 위해 KEEP한다.

문서 정합(동일 WO 후속): TODO·CHECK 2개에 최신 main 결합 기준·현행 소비처·재검증 결과를 맞췄다. 기존 설계 계약은 유지하며 별도 정책·정본 색인 변경은 없다.

## 통합·배포 후속 — 2026-10-23

사용자가 이 공간에 main 병합·배포를 지시했다. 원격 개발 HEAD `46a6dec358`·clean·기존 PR 없음과 실제 ruleset(PR 필수·`CI Gate`·필수 승인 0)을 확인했다. 진행 중 배포는 없으며 최신 main `cd091bc221`의 production status는 성공이다.

최신 main의 변경 260개 경로와 기존 개발 26개 경로를 대조했다. 겹치는 QR 안내 링크 제거와 약국 설계 문서는 일반 merge `eb9a77b3bb`에서 충돌 없이 보존했다. main에 이미 반영된 외부 AI·인증·사업 독립 변경을 되돌리지 않는다. 이번 main 대비 변경에는 migration·의존성·workflow가 없다. 앞선 CHECK의 미반영 표기는 각 개발 종료 시점의 기록이며 현재 통합 결과는 이 절에 추가한다.

결합 상태 검증·CI/리뷰·병합·배포·미검증 경계는 실제 실행 후 기록한다. 기존 실계정·운영 업무 데이터·기기 검증 제한은 유지한다.

### 통합 로컬 검증과 PR

PR [#772](https://github.com/Renagang21/o4o-platform/pull/772)를 생성했다. 최신 main 결합 상태의 frozen 설치(무결성 검증 유지)와 변경된 의존 workspace 빌드를 다시 수행했다.

| 검사 | 결과 |
|---|---|
| Store 전체 | 64 files / **785 PASS** |
| API 관련 | 6 suites / **90 PASS**. 상태 loader·기존 제품/서비스 guard·Store 진입/공통 업무공간·가입 경계·약사 상담 확인 |
| Store/API build·타입 | Store production(TypeScript 포함), API type-check 및 production build PASS |
| 집중 lint | 기존 변경 23개 + CI 보완 테스트 1개, 오류·경고 0 |
| PC·모바일 합성 브라우저 | 기존 2 mount × 2 viewport × 10 흐름 = **40 PASS**. page error·외부/미처리 API·페이지 가로 넘침 0 |

PC 상담과 모바일 QR 배치 이미지를 직접 확인했다. 검사 브라우저·이번 전용 Vite를 종료하고 포트 4392 종료를 확인했다. 통합 로그·최종 브라우저 결과와 대표 이미지는 저장소 밖 `/workspace/.o4o-store-integration-20261023/`에 보존한다. 실제 로그인·운영 번역·음성 장치·DB·기기 업무 검증은 수행하지 않았다.

최초 PR CI `39891219181`의 Web job에서 `consultation-speech.test.tsx`가 음성 입력 콜백 직후 빈 값을 읽어 실패했다. 로컬 전체/집중 검사에서는 재현되지 않았다. React 상태 반영을 `await act`로 기다리도록 해당 테스트 한 줄을 보완했고, 문장 기대값·자동 번역 금지·명시 번역 확인은 유지했다. runtime 코드는 바꾸지 않았다. 보완 후 Store 전체 785개와 해당 파일 lint를 다시 통과했다. 이 보완을 같은 PR에 push하고 정확한 새 HEAD의 CI·자동 Codex 리뷰를 재확인한다.

### PR 검증·main 병합

수정 후 HEAD `77e81953077ed01ba1daef72e8d834e6ce0a2753`의 PR CI [39891841923](https://github.com/Renagang21/o4o-platform/actions/runs/39891841923)가 성공했다. 최초 실패했던 Web job을 포함해 필수 `CI Gate`와 전체 check 17개가 통과/정상 skip이며, CodeQL·Guard 검사도 성공했다. 앞선 수정 전 CI는 새 push 뒤 취소했다. 동일 HEAD의 Codex 자동 재검토는 completed·지적 0·미해결 0, review thread 0이었다.

main이 `cd091bc221`에 그대로 있음을 재확인하고 검증한 HEAD로 고정하여 PR #772를 일반 merge했다. 병합 commit은 `8c44ffde138df57f36f5089773a782befcadd9af`다. 개발 HEAD가 main의 조상이며 branch-only commit 0임을 확인했다. bypass·auto-merge·main direct push는 사용하지 않았다.

병합 후 CI [39893076095](https://github.com/Renagang21/o4o-platform/actions/runs/39893076095)도 성공했다. Delivery [39894078073](https://github.com/Renagang21/o4o-platform/actions/runs/39894078073)가 시작됐으며 실제 운영 반영 결과를 이어서 확인한다. 변경 범위 기준 배포 분류는 LEVEL_2·api/store이고 migration·고위험 경로는 없다. 실제 serving 기준의 Delivery 판정은 별도로 확인한다. 결과 기록은 최신 main에서 별도 전용 branch/worktree `wo/store-workflow-deploy-record`에 작성하고 코드 배포 완료 뒤 문서만 PR로 반영한다.

### 운영 배포와 읽기 검증 완료

Delivery [39894078073](https://github.com/Renagang21/o4o-platform/actions/runs/39894078073)가 success로 완료됐다. target은 병합 main `8c44ffde138df57f36f5089773a782befcadd9af`다. API를 먼저 verified 배포하고 성공 후 Store를 배포했다. 최종 serving SHA 재조회와 commit status `production`은 **success · `DEPLOYED · deploy: api,store`**다. 수동 promote·freeze/권한/배포 설정 변경은 하지 않았다.

| 운영 읽기 확인 | 결과와 한계 |
|---|---|
| API `/health/ready` | 200 |
| Store 홈·상담·실행 현황·QR·태블릿·자료함·서비스 지정 진입 | 8개 URL 모두 200. SPA 제공 확인이며 로그인 후 업무 검증은 아님 |
| 인증 없는 live-signals·상담 context | 각각 401. 인증 경계 유지 |
| 공개 화면 자산 | 상담 방향별 마지막 입력/번역 안내, 부분 사용처 표시, QR 매장 문맥 변경 안내가 있는 현재 JS 3개 모두 200·본문 확인 |

비로그인 HTTP **11/11**, 공개 자산 **3/3 PASS**다. 배포 전에는 없던 상담 안내가 배포 후 현재 entry module에 포함된 것을 확인했다. 원본 운영 응답이나 사용자 자료는 문서/로그에 저장하지 않았고 상태·공개 자산 URL·표시문 존재 여부만 저장했다. 실행 스크립트·결과는 통합 증적 폴더의 `public-smoke.py`·`public-smoke-results.json`, Delivery job 결과는 `delivery-result.json`이다.

실계정 로그인·실제 고객 번역/마이크·직원 초대/승인/해제·정상 업무의 매장 간 격리·QR 출력/스캔·태블릿/사이니지 연결/재생은 미실행이다. 이번 운영 확인은 로그인 없는 읽기뿐이며 유료 AI·운영 업무 데이터 쓰기·신규 migration을 추가하지 않았다. 매장별 AI 이력/직원 접근 해제 Core 계약은 후속 범위로 유지한다.

코드 작업공간은 main 포함·branch-only commit 0·clean·untracked 0·해당 경로 사용 프로세스 0을 확인한 뒤 제거했다. 로컬/원격 개발 branch도 정상 삭제했고 기준 checkout 상태가 그대로임을 확인했다. 과거 다른 세션의 작업 트리·branch는 정리하지 않았다. 로그·결과·대표 이미지는 저장소 밖에 보존한다.

```text
WORKTREE_DISPOSITION (통합 후)
code worktree: /workspace/o4o-wt/store-workflow-status-completion — REMOVED
code branch: wo/store-workflow-status-completion — local/remote REMOVED
main integration: PR #772 / 8c44ffde13
CI: PR 39891841923 PASS / main 39893076095 PASS
deployment: Delivery 39894078073 PASS / DEPLOYED api,store
smoke: 합성 브라우저 40 PASS / 운영 HTTP 11·공개 자산 3 PASS / 실계정·기기 미실행
record worktree: /workspace/o4o-wt/store-workflow-deploy-record
record disposition: 문서 PR main 반영·post-merge 확인 후 표준 정리
```

문서 정합(통합 완료): TODO를 COMPLETED로 갱신하고 CHECK에 검증 HEAD·CI·리뷰·병합·배포·운영 읽기·미검증·작업공간 정리 결과를 맞췄다. 현재 설계 정본과 정책은 추가 변경하지 않았다. 문서 결과 반영은 runtime 변경이 없어 배포 NOT_APPLICABLE이다.

문서 PR #773 검토에서 종료된 TODO와 CHECK의 ACTIVE 상태 불일치 1건을 지적받았다. 현행 문서 lifecycle에 따라 이 CHECK도 COMPLETED로 맞췄다. 실계정·기기 미검증은 이 트랙의 미완료 작업으로 두지 않고 위의 후속 검증 경계로 보존한다. 기록용 작업공간은 이 문서의 main 반영 뒤 표준 종료 절차로 정리한다.
