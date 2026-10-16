# CHECK-O4O-MY-HOME-UX-REORGANIZATION-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-16 (KST) · **최종 갱신**: 2026-10-16
> **근거 WO/IR**: [구현 WO](../work-orders/WO-O4O-MY-HOME-UX-REORGANIZATION-V1.md)
> **계획·대조**: [TODO](../work-orders/TODO-O4O-MY-HOME-UX-REORGANIZATION-V1.md)

## 구현과 검증 기준

base main `04ff6b829`에서 전용 branch `wo/my-home-ux-reorganization`으로 구현했다.
My Home에 현재 업무·참여 공간 검색, 브라우저·계정별 즐겨찾기 6개와 최근 이동 4개를 추가했다.
내부 목적지 중복과 My Home 자기 링크를 제외하고, 저장 식별자는 현재 허용된 진입 모델과 대조한다.
최근 이동 기록은 페이지 전환 전에 저장하며 URL·token·사용자 원문 정보를 저장하지 않는다.
직원 관리 상세는 접힌 상태에서 조회하지 않고 받은 초대는 바로 확인한다.
공통 account-ui·HomeEntryPanel·가입/권한·API·DB·manifest/lockfile·CI는 변경하지 않았다.

## 자동 검증

Node 22.18.0·pnpm 10.25.0으로 실행했다.

| 검사 | 결과 |
|---|---|
| frozen install + store integrity, 공통 packages build | PASS |
| 초기 집중 MyPageHub/Workspaces/StoreMembers | 3 files / 33 tests PASS |
| 최종 Neture 전체 Vitest | 109 files / 1,064 tests PASS (skip 없음) |
| Neture production build (tsc 포함) | PASS |
| 변경 소스·테스트 7개 root flat ESLint | 오류 0 · 경고 0 |
| 문서 민감정보·상대 링크·diff·stage scope | PASS (상대 링크 26개 존재, 12파일 scope) |

전체 테스트 실행은 저장소 루트에서 다음을 사용했다.

```bash
pnpm exec vitest run --config services/web-neture/vitest.config.mjs --maxWorkers=2
pnpm --filter @o4o/web-neture run build
```

빌드의 Browserslist 데이터 경과·큰 chunk 경고는 비차단이며 lockfile을 임의 갱신하지 않았다.
초기 타입 검사는 handoff action의 narrowing 누락으로 실패했고 이를 수정한 최종 빌드는 PASS했다.
처음 lint에는 레거시 eslintrc를 잘못 지정했다. 저장소 SSOT인 root flat config로 재검증했다.

## 브라우저 검증

새 작업 공간의 실제 Vite 앱을 Chromium으로 실행했다. API·인증·권한·handoff 응답은
격리된 합성 fixture이며 실제 계정 로그인·운영 서버 변경·업무 데이터 생성은 하지 않았다.
모든 외부 요청은 차단하거나 fixture로 응답했으며 운영 자격정보를 사용하지 않았다.

최종 19개 관측 PASS, pageerror 0이다.

- PC 1440px, 모바일 390/375/320px에서 가로 넘침 없음. PC·320px 화면을 이미지로 직접 확인했다.
- 접힌 직원 관리에서 구성원 상세 API 요청 없음.
- 키보드 Space로 즐겨찾기 고정, 별표 상태 표시, 새로고침 후 복원.
- 공간 검색의 결과 없음과 검색 지우기.
- 경영자가 펼칠 때 최종 승인 UI 노출.
- handoff 실패 안내 → 재시도 → 합성 목적지 도착, 뒤로가기 후 최근 이동과 삭제.
- 권한 있는 현재 모델에서 매장 제거 시 저장된 즐겨찾기에서도 미노출.
- 매장이 없는 초대 직원도 초대 수락 진입 가능.
- 일반 직원에게 경영자 폼·구성원 상세 조회 미제공.

최초 browser harness는 합성 목적지 HTML의 charset 누락으로 도착 heading 비교에 실패했다.
fixture의 UTF-8 선언을 보완해 같은 앱·동작으로 재검증했다. 앱의 guard·handoff 검증은 완화하지 않았다.
실행 harness와 화면은 이 인스턴스의 `/tmp/my-home-ux-browser.mjs`,
`/tmp/my-home-ux-browser-verified.log`, `/tmp/my-home-ux-{1440,390,375,320}.png`에 있다.
합성 응답 검증이며 실계정의 업무 진행·사용성 평가나 운영 번들 검증을 대신하지 않는다.

## 문서 정합과 인계

My Home 정본에 첫 화면의 현재 구성·저장 범위·직원 관리 펼침을 반영했다.
개인/매장 분리와 명시적 Store 재선택, 별도 My Home AI 계약을 유지한다.
병합·운영 배포·실계정 검증은 미실행이며 PR CI/리뷰·통합 담당 인계는 후속 기록으로 구분한다.

DEPLOYMENT = AUTOMATIC (병합 이후 기존 Neture Delivery 대상).
WORKTREE_DISPOSITION = KEEP (구현 PR 검토·후속 수정용).

## PR 인계

구현 commit `56801ea96`, [PR #649](https://github.com/Renagang21/o4o-platform/pull/649).
최초 PR 조회의 scope·static analysis·문서 guard는 진행 중이고 리뷰는 미등록이다.
최종 HEAD의 CI 결과는 PR에서 확인하며 CI PASS·병합·운영 배포를 선행 보고하지 않는다.
마지막 직원 관리 파일의 포맷 차이를 줄인 뒤 해당 8 tests와 ESLint도 다시 PASS했다.
