# CHECK-O4O-COMMUNITY-FORUM-LIST-COMMONIZATION-V1

> 결과: PASS
> 브랜치: `work/commonization-community`
> 대상: KPA-Society / K-Cosmetics / Neture / PharmacyHub. GlycoPharm은 build 회귀만 확인.

## 1. 조사 결론

- `ForumListTemplate`은 기존 `@o4o/shared-space-ui`에 이미 존재하며 GP/K-Cosmetics/Neture가 소비한다.
- KPA 목록은 BaseTable/bulk/tag/appreciation 등 고유 확장이 있어 이번에도 강제 흡수하지 않았다.
- 공통 `GET /api/v1/forum/posts`는 기존에는 `forumId`에만 의존했고 serviceCode 직접 격리가 없었다.
- `forum_category_requests.service_code`가 기존 SSOT이므로 migration 없이 EXISTS join으로 service scope를 추가했다.

## 2. A — serviceCode scoped list 계약

`ForumPostController.listPosts`가 optional `serviceCode` query를 받는다.

serviceCode가 있으면 모든 목록 조회에서 다음 조건을 강제한다.

```text
post.forum_id
-> forum_category_requests.id
-> service_code = requested serviceCode
-> status = completed
```

따라서 `forumId` 지정/미지정 모두 동일 service scope가 적용된다. `forumId`가 다른 서비스 forum이면 결과에서 제외된다.

### scope 미지정 처리

**legacy generic/admin 계약을 유지한다.** serviceCode가 없는 호출을 즉시 fail-closed로 바꾸면 기존 generic/admin 소비처를 깨뜨릴 가능성이 있어 이번 additive WO 범위를 넘는다. 대신 서비스 프론트는 serviceCode를 명시하는 계약으로 전환한다. PharmacyHub adapter는 모든 목록 호출(게시판 지정/전체/검색/최근글)에 `serviceCode=pharmacy-hub`를 항상 전송한다.

## 3. B — PharmacyHub RBAC mapping

아래 두 복제 맵 모두 항등 매핑을 추가했다.

```text
admin-forum.routes.ts
operator-forum.routes.ts
pharmacy-hub -> pharmacy-hub
```

`ServiceKey`/`SERVICE_KEYS.PHARMACY_HUB`는 선행 코드에 이미 존재하므로 신규 RBAC 모델 변경은 없다. 복제 맵 통합은 범위 밖으로 유지했다.

## 4. C — PharmacyHub 목록 적용

추가/변경:

```text
/forum                         ForumHubTemplate
/forum/posts                   ForumListTemplate
/forum/posts?forum={forumId}   특정 게시판 목록
/forum/posts                   PharmacyHub 전체 목록
q / sort / page                검색·정렬·pagination
```

`services/web-pharmacy-hub/src/services/forumApi.ts`가 list raw response를 `ForumListItem`으로 normalize한다. Hub의 categoryPath/listPath와 최근글 source도 새 scoped adapter로 연결했다.

상세/작성/댓글은 이번 WO에서 연결하지 않았다. 목록 row 클릭도 상세로 이동시키지 않는다.

## 5. 혼입 방지 판정

정적 계약 검증 PASS:

- forumId 지정: `post.forum_id = forumId` + serviceCode EXISTS 조건이 동시에 적용됨.
- forumId 미지정: serviceCode EXISTS 조건만으로 PharmacyHub forum 소속 게시글만 조회됨.
- 검색/정렬/pagination은 동일 scoped QueryBuilder 뒤에서 적용됨.
- PharmacyHub frontend는 serviceCode 없는 list 호출 경로를 사용하지 않음.

운영 DB를 이용한 cross-service fixture runtime 조회는 이번 환경에서 수행하지 않았다. DB schema/data 변경은 0이다.

## 6. 검증

GitHub Actions clean checkout 기준 전부 PASS:

```text
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build:packages
pnpm --filter '@o4o/api-server^...' run build
@o4o/api-server type-check
pharmacy-hub-web type-check
pharmacy-hub-web build
@o4o/web-kpa-society build
@o4o/web-k-cosmetics build
@o4o/web-neture build
glycopharm-web build (minimal regression only)
```

Browser smoke는 인증된 서비스 세션/운영 DB가 없는 CI 환경이라 미수행.

## 7. 범위 밖 / 다음 단계

- 게시글 상세 공통화/PharmacyHub 연결
- 게시글 작성·수정
- 댓글
- 좋아요
- moderation
- generic/admin 무scope 호출의 장기 fail-closed 전환
- admin/operator `SERVICE_CODE_TO_RBAC_KEY` 복제 맵 통합

## 8. 완료 판정

**PASS.** 목록 service scope를 additive 계약으로 추가하고 PharmacyHub가 이를 항상 사용하는 구조로 연결했다. 기존 KPA/K-Cosmetics/Neture는 build 회귀가 없고 GlycoPharm은 최소 build 회귀만 확인했다.
