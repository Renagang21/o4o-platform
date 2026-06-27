# CHECK-O4O-LMS-KPA-LESSON-SNAPSHOT-CREATION-REMOVAL-V1

> **작업명:** KPA 강의 → 매장 자료함 연결 제거 2단계
> **유형:** KPA lesson asset snapshot 신규 생성 경로 제거 (backend-only)
> **결과: PASS** — KPA asset snapshot 허용 목록에서 `lesson`을 제거하고, `KpaAssetResolver`의 lesson 분기·`resolveLesson()`·`@o4o/lms-core` import를 삭제했다. 기존 lesson snapshot 데이터와 조회 호환 경로는 유지했으며 API 서버 typecheck가 통과했다.
> **선행:** `CHECK-O4O-LMS-KPA-STORE-LIBRARY-TAKEAWAY-REMOVAL-V1` — KPA LMS 목록의 개별/bulk 자료함 가져가기 UI 제거
> **작성일:** 2026-06-27 · 기준 HEAD `cd1ab82a8`
> **참고:** 본 2단계 변경은 직전 작업 사이클에서 워킹트리에만 존재한 채 커밋되지 않아 유실되었고(stash/dangling object에도 부재 — 복구 불가), 본 CHECK 명세대로 재구현했다. 이번에는 검증 직후 즉시 별도 커밋·push한다.

## 1. 조사 결과

- 신규 KPA lesson snapshot 생성은 `POST /assets/copy`의 KPA controller 허용 목록과 `KpaAssetResolver.resolveLesson()` 두 지점으로 한정되어 있었다.
- GP/KCos에는 `assetType: 'lesson'` copy 호출이나 `KpaAssetResolver` lesson 분기가 없다. 두 서비스 소스·API·resolver는 수정하지 않았다.
- 기존 snapshot 조회는 별도 `store-assets` 목록 경로가 `lesson` 필터를 계속 지원한다. KPA 클라이언트의 `SnapshotAssetType`/`LessonSnapshotContent`도 유지해 기존 데이터의 표시 호환성을 보존했다.
- DB entity, migration, constraint, seed 및 기존 `o4o_asset_snapshots` row는 변경하거나 삭제하지 않았다.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts` | `allowedAssetTypes`에서 `lesson` 제거, 현재 동작과 맞지 않는 LMS 설명 정리 |
| `apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts` | lesson dispatch, `resolveLesson()`, `Course`/`CourseStatus`/`CourseReusablePolicy` import 제거 |
| `docs/checks/CHECK-O4O-LMS-KPA-LESSON-SNAPSHOT-CREATION-REMOVAL-V1.md` | 조사·변경·검증 결과 기록 |

## 3. 동작 경계

- 이후 KPA `/assets/copy`에 `assetType='lesson'` 요청은 resolver에 도달하지 않고 `INVALID_ASSET_TYPE`으로 거절된다.
- `cms`, `signage`, `content`, `resource`, `blog`, `pop`, `qr` 허용 목록과 각 resolver 분기는 그대로다.
- 기존 lesson snapshot row와 `store-assets?type=lesson` 조회 지원은 그대로다. 데이터 삭제나 일괄 변환은 수행하지 않았다.
- KPA LMS 수강·진도·퀴즈·수료, GP LMS, KCos LMS에는 변경이 없다.

## 4. 검증

- API 서버: `tsc --noEmit -p apps/api-server/tsconfig.json` — **PASS (0 errors)**.
- 정적 확인: 대상 controller/resolver에서 `lesson`, `resolveLesson`, `@o4o/lms-core`, `CourseStatus`, `CourseReusablePolicy` 잔존 0건(문서 주석의 CHECK 참조 라인 제외).
- diff 확인: lesson 생성 경로와 관련 설명만 제거. DB/migration/package.json/pnpm-lock/Docker/공유 모듈 변경 없음.

## 5. 작업 상태

- 기존 dirty/untracked 파일: 작업 시작 시 없음(워킹트리 clean).
- staged 파일: 본 2단계 3개 파일만.
- commit/push: 검증 직후 본 2단계 변경만 별도 커밋·push.
- 제외: 기존 lesson snapshot 삭제, frontend 호환 타입 제거, `store-assets` lesson 조회 제거, GP/KCos 변경.

## 6. 완료 판정

**PASS.** 1단계 UI 제거에 이어 KPA의 신규 lesson snapshot 생성 backend 경로를 닫았다. 기존 snapshot은 보존되고 GP/KCos 및 KPA의 다른 asset 기능은 변경되지 않았다.
