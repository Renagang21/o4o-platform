# CHECK-O4O-FORUM-SERVICEKEY-EXTRACTION-AUDIT-V1

> **작업명:** WO-O4O-FORUM-SERVICEKEY-EXTRACTION-AUDIT-V1
> **유형:** forum/community backend boundary hardening — serviceCode/serviceKey/organizationId body·query 추출 경로 감사 + 최소 fail-closed 보강
> **결과: PASS — boundary 전수 판정 / 1건 실수정(category-request create serviceCode whitelist) / 나머지는 안전 또는 별도 WO 분리.**
> 선행: `WO-O4O-FORUM-AUTHOR-PII-GUARD-V1` · `WO-O4O-FORUM-REQUEST-API-DEDUP-V1` · `IR-O4O-FORUM-MEMBERSHIP-JOIN-ROUTE-CONTRACT-AUDIT-V1` — 2026-06-12

---

## 1. 목적

forum/community backend 에서 `serviceCode`/`serviceKey`/`organizationId` 가 body·query 로 느슨하게 들어오는 경로를 전수 조사하고, 실제 cross-service boundary 위험이 확인되는 경우 최소 fail-closed 보강한다. page UI 공통화·route parity·legacy retire·closed-forum UI 연결은 범위 외.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD(작업 시작) | `2fc780adf` |
| origin/main ahead/behind | `0 / 0` |
| staged | 없음 |

**다른 세션 WIP(미접촉):** CHECK-...-ORDER-VIEW-LOOP 문서 M + untracked(이전 IR/png). 본 WO 는 path-specific 으로 대상 파일만 다룸.

## 3. serviceCode / serviceKey / organizationId 입력 경로 전수

| 경로 | source | guard/검증 | 판정 |
|------|--------|------------|:----:|
| `POST /forum/category-requests` (create) | body `serviceCode` | presence only → **whitelist 없음** | 🔴 **FIX** |
| `GET /forum/category-requests/my` | query `serviceCode` | presence + `requesterId=user.id` 필터 | ✅ 안전(본인 한정) |
| `GET /forum/category-requests/:id` | query `serviceCode` | getDetail(id, serviceCode) 필터 + isOwner∥isServiceAdmin(roles,serviceCode) | ✅ 안전(serviceCode 필터로 cross-service 차단) |
| `PATCH /forum/category-requests/:id` | body `serviceCode` | update(id, userId, serviceCode) 필터 + `requesterId!==userId→403` + status gate | ✅ 안전 |
| `/forum/operator/*` (전체) | query `serviceCode` | `requireServiceOperator` = `VALID_SERVICE_CODES` whitelist + `isServiceOperator(rbacKey)` | ✅ 안전(검증됨) |
| forum search `GET /forum/search` | query `organizationId`/`extensionKey` | `status=PUBLISHED` 기본 + narrowing 필터, **closed-forum 게이팅 없음** | 🟠 별도 WO(§7) |
| membership `requestJoin(categoryId)` | route param `categoryId`(forumId) | category 조회·closed 확인·중복 차단, **service_code 재대조 없음** | 🟡 저위험·문서화(§8) |

## 4. category request boundary 판정

- **create(POST /)**: `forumRequestService.create` 가 serviceCode 를 검증 없이 그대로 `forum_category_requests` 에 INSERT(`ForumRequestService.ts:76~`). presence(`!serviceCode`) 만 확인 → **임의/오타/타서비스 serviceCode 주입 가능**. 결과: 잘못된 serviceCode 의 orphan row, 또는 타 서비스 operator 큐에 noise 주입. 승인은 operator-gated 라 권한 상승은 아니나 **boundary/데이터 정합 약점**.
- **my / :id / :id(PATCH)**: serviceCode 가 **필터**로 작동하고 `requesterId`/`isServiceAdmin(roles, serviceCode)` 로 인가 → 타서비스 코드 전달 시 not-found/empty 로 fail. cross-service read/write 불가 → **안전**(수정 불요).

## 5. operator route boundary 판정

`operator-forum.routes.ts:requireServiceOperator` 가 `serviceCode ∈ VALID_SERVICE_CODES`(catalog 4종) whitelist + `isServiceOperator(SERVICE_CODE_TO_RBAC_KEY[serviceCode])` 검증 후 `(req)._serviceCode` 고정. operator 는 자기 서비스 외 serviceCode 로 403. → **이미 fail-closed, 수정 불요.**

## 6. search organizationId boundary 판정

- `forum.search.service.ts`: 기본 `status=PUBLISHED`(line 190), `organizationId`/`extensionKey`/`type`/`authorId` 는 **선택적 narrowing 필터**(query 수용). 권한 상승이 아니라 published 글 범위 내 필터링.
- 단, **closed-forum/membership 게이팅 부재** — closed forum 의 published 글이 비회원 검색에 노출될 수 있는 **별개 visibility 이슈**. organizationId-query 자체가 위험원이 아니라, search 에 visibility gate 가 없는 것이 본질.
- 이 보강은 search 에 `forum_category_requests.forum_type='closed'` + `forum_category_members` membership join 추가가 필요한 **큰 변경** → serviceKey-extraction 최소 수정 범위 밖. **별도 WO 로 분리**(§10-2).

## 7. membership join boundary 판정

- `ForumMembershipService.requestJoin(categoryId, user)`: categoryId(=forumId) 가 SSOT. closed 확인·중복(member/pending) 차단·`forum_join_requests` pending INSERT. **service_code 재대조 없음.**
- 데이터 모델이 service-agnostic(`forum_join_requests`/`forum_category_members` 는 forum_category_id 기준)이고, 승인은 owner-gated, 생성은 pending row 에 그침 → **저위험**. service-neutral 설계상 forumId 가 source-of-truth 이므로 강제 service 재대조는 scope 과대. **문서화로 종결**(IR-membership §12 와 동일 판정).

## 8. 적용한 수정

**1건(annotation 외 실로직):** `routes/forum/forum-category-request.routes.ts` POST `/` 에 serviceCode whitelist fail-closed 추가.
```ts
import { getService } from '../../config/service-catalog.js';  // catalog SSOT(4 services)
...
if (!getService(serviceCode)) {
  res.status(400).json({ success: false, error: 'Invalid serviceCode', code: 'INVALID_SERVICE_CODE' });
  return;
}
```
- whitelist 소스 = `config/service-catalog.ts`(플랫폼 service key SSOT: neture/glycopharm/kpa-society/k-cosmetics). 신규 const 정의 없이 기존 SSOT 재사용(중복 0).
- **route path/response shape 무변경**, 기존 frontend 는 모두 자기 서비스의 유효 코드를 하드코딩 전송하므로 **무회귀**.
- **membership 바인딩(사용자가 해당 서비스 소속인지)은 의도적으로 제외** — 폐쇄형 포럼/태그 정책 영역이라 별도 판단(§10-1).

> **용어 주의(기록):** `category-request` / `forum_category_requests` / `/categories/*` 명칭은 **현재 도메인 기준 legacy API surface** 이다. 사용자-facing 개념은 이미 **"카테고리"가 아니라 "태그(tag)" 중심**으로 이동되어 있다. 본 WO 는 명칭/도메인 의미를 확장하지 않고 serviceCode whitelist 만 적용했다. category↔tag 용어·경계 정리는 별도 축(§10-3 `IR-O4O-FORUM-CATEGORY-TO-TAG-TERMINOLOGY-BOUNDARY-V1`)으로 분리한다.

## 9. 검증

- **TypeScript:** api-server `tsc --noEmit` **0 errors** ✅
- **정적:** serviceCode/organizationId 사용처 전수 grep(§3) · search 서비스 visibility 부재 확인 · membership service service-neutral 확인 · whitelist 소스가 frontend 전송값과 일치(무회귀) 확인.
- **API smoke:** **NOT TESTED** — 프로덕션 DB 직접, create 는 write(실데이터). 미인증 호출은 `authenticate` 로 401(기존). whitelist 분기는 정적+타입으로 검증. (잘못된 serviceCode → 400 은 인증 후 경로라 production write smoke 회피.)
- **frontend 변경 없음** ✅ · **DB/migration 변경 없음** ✅ · **route path 변경 없음** ✅ · **response shape 변경 없음**(신규 400 분기만 추가) ✅.

## 10. 남은 후속 후보

1. **(정책) forum request membership 바인딩** — create 시 사용자가 serviceCode 서비스에 소속인지 강제할지. 단 현재 도메인이 category→tag 이동 중이므로 **tag/membership 정책 정리 후** 판단(§10-3 선행 권장).
2. **`WO-O4O-FORUM-SEARCH-CLOSED-FORUM-VISIBILITY-GATE-V1`(후보)** — forum search 에 closed-forum membership 게이팅 추가(현재 closed forum published 글이 비회원 검색 노출 가능). visibility 모델 결정 필요.
3. **`IR-O4O-FORUM-CATEGORY-TO-TAG-TERMINOLOGY-BOUNDARY-V1`(후보)** — `category`/`category-request`/`forum_category_*` 명칭이 단순 legacy surface 인지, 사용자-facing 은 tag 로 전환됐는지, DB/API 명칭 유지 vs 문구만 tag 정리, membership↔tag 관계 정리.
4. membership join service 재대조(§7) — 현 저위험, tag/membership 정책과 함께 재검토.

## 11. 완료 판정

**PASS.** serviceCode/serviceKey/organizationId body·query 입력 경로 전수 판정 · category-request create 의 유일 실위험(whitelist 부재)을 catalog SSOT 기반 fail-closed 로 보강 · operator route 는 기존 안전 확인 · search visibility 와 membership 재대조는 위험/범위에 맞춰 분리·문서화 · route/response shape 무변경 · frontend/DB/migration 무변경 · typecheck 통과.

---

*Date: 2026-06-12 · Status: PASS (1 fix: category-request create serviceCode whitelist. search visibility·membership re-check·category→tag 용어는 후속 WO/IR 분리).*
