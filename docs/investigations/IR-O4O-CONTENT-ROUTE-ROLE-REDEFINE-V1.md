# IR-O4O-CONTENT-ROUTE-ROLE-REDEFINE-V1

> **유형:** 조사 IR (read-only, 코드/route/UI/API/DB/menu 무변경)
> **목적:** GP/KCos 표준 `/content` 적용 전, `/content`·`/store-hub/content`·`/library/content` 의 역할을 확정하고 browse cleanup·nav 영향·후속 WO 순서를 정한다.
> **작성:** 2026-06-14
> **선행:** IR-O4O-CONTENT-STANDARD-MODULE-CROSSSERVICE-ALIGNMENT-V1 · IR-O4O-CONTENT-ROUTE-LIVE-SURFACE-RECHECK-V1 · WO-...-EXTRACT-V1/PHASE2(shell 추출)

---

## ⚠️ 핵심 결론 (먼저 읽을 것)

> **역할 정의는 명확하다:** `/content`=회원 작성형(표준) · `/store-hub/content`=운영자 발행 browse(3서비스 이미 존재) · `/library/content`=legacy(정리 대상). **browse 의 canonical 위치는 이미 `/store-hub/content`** 이고 **3서비스 store-hub 카드가 이미 그곳을 가리킨다.**
>
> **GP 가 유일한 라이브 충돌:** GP `/content` 가 browse 를 점유(+`/library/content` alias = 동일 HubContentListPage 3중복). KCos `/content` 는 **미배선(free)** → 회원 표준 추가 시 충돌 없음(GP 보다 쉬움). KPA `/content` 는 이미 회원 canonical.
>
> **판정: A안(역할 정렬 가능) + D안(browse cleanup 선행 필수) + B안(GP `/content` 는 redirect 전환).** GP/KCos 회원 `/content` 적용 전에 **browse cleanup + home nav repoint** 가 선행되어야 한다.

## 1. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `6028bf76` · origin 0/0 |
| 다른 세션 WIP | LoginModal×3 · CommunityMainPage(GP) · HomePage(KCos) · CommunityHomePage(KPA) · pnpm-lock · CHECK-CODEX — **미접촉** |
| 조사 기준 commit | `6028bf76` |

## 2. 서비스별 route 역할 현황 (App.tsx 확인)

| 서비스 | route | 화면(component) | 현재 역할 | 조치 |
|--------|-------|------------------|-----------|------|
| KPA | `/content` (735) | ContentListPage | **A 회원 작성형** | 유지(canonical) |
| KPA | `/store-hub/content` (697) | HubContentLibraryPage | **B 운영자 browse** | 유지(browse canonical) |
| KPA | `/library/content` (583) | → `/` redirect | E legacy | 유지(decommissioned 완료) |
| GP | `/content` (591) | HubContentListPage | **B 운영자 browse** | **회원 표준에 양보 → /store-hub/content redirect** |
| GP | `/store-hub/content` (668) | HubContentListPage | **B browse** | 유지(browse canonical) |
| GP | `/library/content` (682) | HubContentListPage | **B alias browse(중복)** | **제거 또는 → /store-hub/content redirect** |
| GP | `/hub/content/:id` (592) | HubContentDetailPage | B browse 상세 | browse 상세 — store-hub 축 정렬 시 함께 |
| GP | `/operator/content-management` (851) | OperatorContentPage | C 운영자 CMS | 유지(충돌 없음) |
| KCos | `/content` | — **미배선** | — | **free — 회원 표준 추가 시 충돌 없음** |
| KCos | `/library/content`(+`/:id`) (431/432) | ContentLibraryPage | **B 운영자 browse** | **→ /store-hub/content redirect**(또는 회원 도입 시 정리) |
| KCos | `/store-hub/content` (582) | HubContentPage | **B browse** | 유지 |
| KCos | `/operator/content-management` (702) | OperatorContentPage | C 운영자 CMS | 유지 |

> **GP browse 3중복**(`/content`·`/store-hub/content`·`/library/content` = 동일 HubContentListPage) → `/store-hub/content` 로 수렴, `/content` 해방.

## 3. 표준 역할 정의안

```
/content            = 회원 작성형 커뮤니티 콘텐츠 (표준 모듈; KPA canonical, GP/KCos 적용 대상)
/store-hub/content  = 운영자 발행 콘텐츠 browse (매장 허브) — browse 의 canonical 위치 (3서비스 이미 존재)
/library/content    = legacy. KPA=완료(→'/'), GP=중복 alias(제거), KCos=browse(→/store-hub/content redirect)
/resources          = 자료실 (별개 모듈)
/operator/content-management = 운영자 CMS 콘솔 (충돌 없음, 유지)
```

## 4. GP 라이브 `/content` browse 충돌 분석

- GP `/content` = **라이브 운영자 발행 browse**(HubContentListPage). 회원 표준 `/content` 적용 시 **의미가 바뀜**.
- browse 는 이미 `/store-hub/content`(668)에 동일 컴포넌트로 존재 → `/content` browse 는 **잉여**(같은 화면 3 route).
- **전환안(B):** GP `/content` 를 `/store-hub/content` 로 **redirect**(또는 browse 제거) → `/content` 해방 → 이후 회원 표준 적용. redirect 로 기존 진입(북마크/링크) 호환.
- nav 영향: GP home "콘텐츠" 링크(CommunityMainPage:82 탭, :307 카드)가 `/content` → **`/store-hub/content` 로 repoint** 필요(현재 browse 를 의도하므로).

## 5. KCos `/library/content` browse 처리 분석

- KCos `/content` **미배선** → 회원 표준 신설에 **충돌 없음**(GP 와 다름).
- `/library/content`(431) = 라이브 browse. **→ /store-hub/content redirect**(또는 회원 도입 시점에 정리). browse 의미 유지하려면 redirect 가 안전.
- nav 영향: KCos home "콘텐츠" 링크(HomePage:55 탭, :247 카드)가 `/library/content` → **`/store-hub/content` 로 repoint** 필요.

## 6. nav / link 영향 목록

| 서비스 | 위치 | UI | 현재 target | 조치 |
|--------|------|-----|-------------|------|
| KPA | CommunityHomePage:53,320 | home 최신탭·서비스카드 "콘텐츠" | `/content` | **유지**(회원 canonical) |
| GP | CommunityMainPage:82,307 | home 최신탭·서비스카드 "콘텐츠" | `/content`(browse) | **→ /store-hub/content repoint** |
| KCos | HomePage:55,247 | home 최신탭·서비스카드 "콘텐츠" | `/library/content`(browse) | **→ /store-hub/content repoint** |
| 3서비스 | StoreHubPage/KCosmeticsHubPage:66 | store-hub 콘텐츠 카드 | `/store-hub/content` | ✅ **이미 정확**(무변경) |
| GP/KCos | operatorMenuGroups | `/operator/signage/content` | (signage operator) | 무관(범위 외) |

> ⚠️ home nav 파일(CommunityMainPage/HomePage/CommunityHomePage)은 **현재 다른 세션이 편집 중** → cleanup WO 시 충돌 회피·재확인 필수.

## 7. 삭제 / redirect / 유지 후보

| 분류 | 항목 |
|------|------|
| **즉시 redirect 가능** | GP `/content`→`/store-hub/content`, GP `/library/content`→`/store-hub/content`(또는 제거), KCos `/library/content`→`/store-hub/content` |
| **redirect 권장(호환)** | 위 전부 — 즉시 삭제보다 redirect 로 북마크/외부링크 호환 후 점진 제거 |
| **유지** | `/store-hub/content`(browse canonical), `/operator/content-management`(CMS), KPA `/content`(회원), `/resources` |
| **이미 완료** | KPA `/library/content`→`/`(decommissioned) |
| **표준 적용 후 정리** | GP `/content` browse 완전 제거(회원 `/content` 안정화 후), KCos `/library/content` 제거 |

## 8. 제품 비종속 정책 확인

✅ `/content`(회원 표준)는 productId/제품탭/제품필터/B2B·B2C 미도입 유지. 제품 콘텐츠는 운영자·매장 허브·내 매장 흐름에서 별도.

## 9. 최종 판단 (A/B/C/D/E)

**A안 + D안 + B안 조합.**
- **A**: `/content`=회원, browse=`/store-hub/content` 정렬 **가능**(target 명확, store-hub 카드 이미 정확).
- **D**: `/content` 표준 적용 전 **browse cleanup WO 반드시 선행**(GP `/content` 라이브 점유·home nav repoint).
- **B**: GP `/content` 는 즉시 변경보다 **redirect 전환**(라이브 영향 완충).
- **C(KCos 정리 선행)**: 부분 — KCos 는 `/content` free 라 충돌 없음. `/library/content` redirect + home repoint 만 cleanup 에 포함.
- **E(추가 IR)**: 불필요 — 역할·영향 충분히 확정됨.

## 10. 후속 WO 순서 (확정)

| 순서 | WO | 범위 |
|:--:|------|------|
| 1 | `WO-O4O-CONTENT-BROWSE-ROUTE-CLEANUP-V1` | GP `/content`·`/library/content` → `/store-hub/content` redirect/제거 + KCos `/library/content` → `/store-hub/content` redirect + **GP/KCos home "콘텐츠" 링크 → /store-hub/content repoint**. (browse 를 store-hub 축으로 수렴, `/content` 해방.) |
| 2 | `WO-O4O-GP-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1` | GP 회원 `/content`(write/detail/search shell) 적용 — 제품 go 후. GP `/content` redirect 해제 |
| 3 | `WO-O4O-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1` | KCos 회원 `/content` 신설(free route) — 제품 go 후 |
| (선택) | `WO-O4O-CONTENT-LEGACY-ALIAS-REDIRECT-V1` | alias/redirect 정리(1에 포함 가능) |

> **핵심 순서:** cleanup(1) 선행 → 회원 `/content` 적용(2,3). GP 는 redirect 전환으로 라이브 충돌 완충.

## 11. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| `/content` 표준 일관성 | 미일관(KPA 회원 / GP browse / KCos 미배선) → 본 IR 로 역할 확정 |
| browse canonical 위치 | `/store-hub/content`(3서비스 존재, store-hub 카드 이미 정렬) |
| GP 라이브 충돌 인지 | ✅ redirect 전환으로 완충 |
| 제품 비종속 | ✅ 유지 |
| nav 영향 | home "콘텐츠" 링크 GP/KCos repoint 필요(KPA 무변경), store-hub 카드 이미 정확 |
| 1인 유지보수성 | browse 3중복(GP) 수렴 + `/content` 표준화로 향상 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-CONTENT-ROUTE-ROLE-REDEFINE-V1.md` |
| 조사 기준 commit | `6028bf76` |
| 역할 정의 | `/content`=회원 / `/store-hub/content`=browse / `/library/content`=legacy / `/resources`=자료실 |
| GP | `/content`·`/library/content` browse 중복 → `/store-hub/content` 수렴(redirect) |
| KCos | `/content` free, `/library/content` browse → `/store-hub/content` redirect |
| KPA | 무변경(회원 canonical, `/library/content` 이미 redirect 완료) |
| nav 영향 | GP/KCos home "콘텐츠" 링크 repoint, store-hub 카드 이미 정확 |
| 판정 | **A + D + B** — 정렬 가능, browse cleanup 선행 필수, GP redirect 전환 |
| 후속 1순위 | `WO-O4O-CONTENT-BROWSE-ROUTE-CLEANUP-V1`(GP/KCos browse 수렴 + home repoint) |
| git status | 다른 세션 WIP 다수(미접촉), 본 IR 문서만 신규 |
