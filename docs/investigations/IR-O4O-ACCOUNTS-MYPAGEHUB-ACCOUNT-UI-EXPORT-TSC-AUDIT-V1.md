# IR-O4O-ACCOUNTS-MYPAGEHUB-ACCOUNT-UI-EXPORT-TSC-AUDIT-V1

> 조사 전용 IR — 원인 판정까지가 목표. **코드 수정 없음.**
> 일자: 2026-05-30

## 1. 목표

현재 `main` 기준 로컬 TypeScript 검증을 깨는 `MyPageHub.tsx` 의 `@o4o/account-ui`
import 오류 원인을 조사하고 Case A/B/C/D 로 판정한다.

## 2. 재현 명령 & 에러 원문

```bash
cd services/web-neture && npx tsc --noEmit
```

```
src/pages/mypage/MyPageHub.tsx(20,45): error TS2305: Module '"@o4o/account-ui"' has no exported member 'RoleBadgeGroup'.
src/pages/mypage/MyPageHub.tsx(20,61): error TS2305: Module '"@o4o/account-ui"' has no exported member 'MyPageHubCard'.
src/pages/mypage/MyPageHub.tsx(20,76): error TS2305: Module '"@o4o/account-ui"' has no exported member 'MyPageEmptyState'.
```

해당 import: [MyPageHub.tsx:20](../../services/web-neture/src/pages/mypage/MyPageHub.tsx#L20)

```ts
import { MyPageLayout, QuickActionsSection, RoleBadgeGroup, MyPageHubCard, MyPageEmptyState } from '@o4o/account-ui';
```

## 3. 관련 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| `packages/account-ui/package.json` | `exports."." → ./dist/index.d.ts` — **tsc는 dist 타입을 읽음** | 정상 |
| `packages/account-ui/src/index.ts` | 배럴 export — 3개 컴포넌트 모두 export | **정상 (src OK)** |
| `packages/account-ui/src/components/RoleBadge.tsx` | `RoleBadgeGroup` 정의·export (L131) | 정상 |
| `packages/account-ui/src/components/MyPageHubCard.tsx` | 컴포넌트 존재 | 정상 |
| `packages/account-ui/src/components/MyPageEmptyState.tsx` | 컴포넌트 존재 | 정상 |
| `packages/account-ui/dist/index.d.ts` | tsc가 실제로 읽는 타입 (gitignore, May 24 빌드) | **stale — MYPAGE Phase-1 export 누락** |

## 4. 핵심 비교 (src 배럴 vs stale dist)

`src/index.ts` 는 다음을 export 하지만 `dist/index.d.ts` 에는 **전부 누락**:
`RoleBadge`/`RoleBadgeGroup`, `MyPageHubCard`, `MyPageLoadingState`, `MyPageEmptyState`,
`MyRequestsInbox`, `RequestStatusBadge`, `RequestTypeBadge`.

dist 배럴은 `NotificationBell`/`useNotifications` 까지만 존재 — MYPAGE Phase-1 이후
추가분이 반영되기 전 버전이다.

해당 export 를 추가한 커밋(모두 **이미 main 에 머지됨**):

| 커밋 | WO |
|------|------|
| `0f4c3dd77` | MYPAGE-PHASE1-NAV-ROLEBADGE-CANONICALIZATION-V1 (RoleBadge) |
| `bef3509ac` | MYPAGE-HUB-CARD-CANONICAL-ALIGNMENT-V1 (MyPageHubCard) |
| `e9afaabf9` | MYPAGE-EMPTY-LOADING-COMPONENT-EXTRACTION-V1 (MyPageEmptyState) |
| `a53cbe5d2` | MYPAGE-MY-REQUESTS-INBOX-COMPONENT-V1 (MyRequestsInbox) |

## 5. 검증 — 재빌드 후 오류 소멸 확인

```bash
cd packages/account-ui && npm run build   # tsc --build, exit 0
grep -n "RoleBadgeGroup\|MyPageHubCard\|MyPageEmptyState" dist/index.d.ts  # → 3개 모두 생성됨
cd services/web-neture && npx tsc --noEmit  # → TSC_EXIT: 0 (에러 0)
```

`account-ui` 재빌드만으로 3개 에러가 모두 사라졌다. `dist` 는 gitignore 대상이라
재빌드로 인한 추적 파일 변경은 없음(`git status` clean).

## 6. 원인 판정 — **Case A (dist stale / 패키지 재빌드로 해결)**

- **src·커밋은 완전 정상.** 3개 컴포넌트는 존재하고 배럴에서 export되며, 이를 추가한
  커밋이 모두 main 에 머지돼 있다.
- 깨진 것은 **로컬 `account-ui/dist` 산출물뿐**. MYPAGE Phase-1 커밋들을 pull 한 뒤
  `account-ui` 를 재빌드하지 않아 발생한 stale dist.
- CI Docker 빌드는 의존 패키지를 매번 새로 빌드하므로 **영향 없음** — 실제로
  `Deploy Web Services` 가 정상 통과(neture 배포 성공)했다.
- `@o4o/types`, `@o4o/mail-core` 에서 반복됐던 "src 정상 / dist stale" 패턴과 동일.

## 7. 수정 필요 여부 / 후속 WO

- **소스 코드 수정 불필요.** `MyPageHub.tsx` import 정상, account-ui export 정상.
- **즉시 조치**: 로컬에서 `account-ui` (필요 시 의존 패키지 일괄) 재빌드. 본 IR 진행 중
  이미 재빌드하여 로컬 tsc 정상화 완료.
- **수정 WO 불필요.** 단, 재발 방지가 필요하다면 별도 검토 사항(선택):
  - 패키지 변경 후 dist 재빌드를 보장하는 dev 워크플로(예: `tsc --build` 의존 그래프
    일괄 실행 / 변경 패키지 자동 빌드) 정비 — 본 IR 범위 밖, 별도 제안 대상.

## 8. 결론

`main` 기준 **실제 코드 깨짐이 아니라 로컬 stale dist** 다. 재빌드로 해소되며,
CI/배포에는 영향이 없다. 코드 수정·후속 수정 WO 모두 불필요.
