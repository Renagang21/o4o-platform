# CHECK-O4O-CONTENT-BROWSE-ROUTE-CLEANUP-V1

> **유형:** WO 실행 결과 (CHECK)
> **WO:** WO-O4O-CONTENT-BROWSE-ROUTE-CLEANUP-V1
> **선행:** IR-O4O-CONTENT-ROUTE-ROLE-REDEFINE-V1 (판정 A+D+B)
> **작성:** 2026-06-14
> **판정:** **PASS** (GP/KCos 운영자 발행 browse → `/store-hub/content` 수렴, `/content` 해방. KPA 무변경. 회원 `/content` 미적용)

---

## 1. 작업 개요

`/content` 표준(회원 작성형) 적용 전 단계로, GP/KCos 의 운영자 발행 콘텐츠 browse 를 canonical `/store-hub/content` 로 수렴(redirect)하고 home "콘텐츠" 링크를 repoint. **회원 작성형 `/content` 는 이번 WO 에서 만들지 않음.**

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `7cce5ac4a` · origin 동기화 |
| 다른 세션 WIP | pnpm-lock · CHECK-CODEX — **미접촉** (작업 중 home 파일들은 다른 세션이 커밋 완료 → 충돌 없음) |
| 조사 기준 commit | `7cce5ac4a` |

## 3. 변경 파일 (4)

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/App.tsx` | `/content`(browse)·`/library/content`(alias) → `Navigate to="/store-hub/content"` redirect |
| `services/web-glycopharm/src/pages/community/CommunityMainPage.tsx` | home 최신탭·서비스카드 "콘텐츠" 링크 `/content` → `/store-hub/content` |
| `services/web-k-cosmetics/src/App.tsx` | `/library/content`(browse) → redirect + 미사용 `ContentLibraryPage` lazy import 제거 |
| `services/web-k-cosmetics/src/pages/HomePage.tsx` | home 최신탭·서비스카드 "콘텐츠" 링크 `/library/content` → `/store-hub/content` |
| `docs/investigations/CHECK-...-V1.md` | 본 문서 |

**무변경:** KPA(전체) / backend / DB / migration / API / operator CMS / `/resources` / store asset·POP·QR·blog / 제품 콘텐츠 / AI / browse 컴포넌트 기능 / package.json / pnpm-lock / Dockerfile.

## 4. GP route 변경

| route | 이전 | 이후 |
|-------|------|------|
| `/content` (App.tsx 593) | HubContentListPage(browse) | **`Navigate → /store-hub/content`** (`/content` 해방) |
| `/library/content` (685) | HubContentListPage(alias browse) | **`Navigate → /store-hub/content`** |
| `/store-hub/content` (670) | HubContentListPage(browse) | **유지(canonical browse)** |
| `/hub/content/:id` (592) | HubContentDetailPage | 유지(browse 상세, backward-compat) |

- `HubContentListPage` import 은 `/store-hub/content`(670) 에서 계속 사용 → 미사용 아님.

## 5. KCos route 변경

| route | 이전 | 이후 |
|-------|------|------|
| `/library/content` (App.tsx 433) | ContentLibraryPage(browse) | **`Navigate → /store-hub/content`** |
| `/library/content/:id` (434) | ContentLibraryDetailPage | 유지(browse 상세, backward-compat) |
| `/store-hub/content` | HubContentPage(browse) | 유지 |
| `ContentLibraryPage` lazy import | 존재 | **제거**(redirect 로 미사용 → tsc unused 방지). DetailPage import 은 유지 |

## 6. home link 변경

| 서비스 | 위치 | 이전 | 이후 |
|--------|------|------|------|
| GP | CommunityMainPage 최신탭 + 서비스카드 | `/content` | `/store-hub/content` |
| KCos | HomePage 최신탭 + 서비스카드 | `/library/content` | `/store-hub/content` |
| KPA | CommunityHomePage | `/content`(회원) | **무변경** |
| 3서비스 | store-hub 카드 | `/store-hub/content` | 이미 정확(무변경) |

- 정적 확인: GP CommunityMainPage `'/content'` 직접링크 **0**, KCos HomePage `/library/content` **0**.

## 7. 범위 준수 확인

| 항목 | 결과 |
|------|------|
| 회원 작성형 `/content` 적용 | ✅ **안 함** (ContentWritePage/CommunityContentWriteShell/write endpoint 미연결) |
| KPA route/링크 | ✅ 무변경 |
| `/store-hub/content` browse 동작 | ✅ 무변경(컴포넌트·기능 그대로) |
| 제품 콘텐츠 구조 | ✅ 미추가 |
| redirect 우선(즉시 삭제 안 함) | ✅ Navigate redirect 로 북마크/외부링크 호환 |
| operator CMS / `/resources` | ✅ 무변경 |

## 8. 검증

| 항목 | 결과 |
|------|------|
| `web-glycopharm` `tsc --noEmit` | ✅ PASS (exit 0) |
| `web-k-cosmetics` `tsc --noEmit` | ✅ PASS (exit 0) |
| web-kpa-society | 무변경 → 영향 없음 |
| 잔존 직접링크(GP `/content`·KCos `/library/content` home) | ✅ 0 |
| redirect route 정의 | ✅ GP 593/685, KCos 433 = `Navigate → /store-hub/content` |
| browse canonical `/store-hub/content` | ✅ GP 670 / KCos 유지 |
| browser smoke | ⚠️ 라이브 미수행(배포 필요) — 권장: GP `/content`·`/library/content` 접근 시 `/store-hub/content` 이동, KCos `/library/content` 이동, home "콘텐츠" 링크 정상, KPA `/content` 유지 |

## 9. 다른 세션 WIP 처리

- IR 시점에 다른 세션이 편집 중이던 home 파일(GP CommunityMainPage·KCos HomePage·KPA CommunityHomePage·LoginModal)은 **작업 착수 시점에 이미 커밋·push 완료** → working tree clean(충돌 없음) 확인 후 편집.
- 본 커밋은 path-specific(내 4파일 + CHECK)만 포함, `pnpm-lock`·CHECK-CODEX 등 미포함.

## 10. 후속 작업

| 후보 | 내용 |
|------|------|
| `WO-O4O-GP-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1` | GP 회원 `/content`(write/detail/search shell) 적용 — 제품 go 후. redirect 해제 |
| `WO-O4O-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1` | KCos 회원 `/content` 신설(free route) — 제품 go 후 |
| (선택) legacy 완전 제거 | `/content` 표준 안정화 후 GP `/library/content`·KCos `/library/content` redirect 제거 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| GP | `/content`·`/library/content` → `/store-hub/content` redirect, home 링크 repoint |
| KCos | `/library/content` → `/store-hub/content` redirect(+미사용 import 제거), home 링크 repoint |
| KPA | 무변경 |
| browse canonical | `/store-hub/content` 유지(무변경) |
| 회원 `/content` 적용 | 안 함(다음 단계) |
| API/DB/operator CMS/제품 | 무변경 |
| TypeScript | GP·KCos PASS |
| browser smoke | 라이브 보류(배포 필요) |
| 다른 세션 WIP | 미포함(path-specific) |
| 다음 | GP/KCos 회원 `/content` 적용(제품 go 후) |
