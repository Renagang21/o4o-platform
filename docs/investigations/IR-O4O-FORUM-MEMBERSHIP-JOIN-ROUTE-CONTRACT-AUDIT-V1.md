# IR-O4O-FORUM-MEMBERSHIP-JOIN-ROUTE-CONTRACT-AUDIT-V1

> **유형:** Read-only 조사 (코드/UI/API/DB/route/menu 무변경)
> **목적:** 폐쇄형 포럼 가입 신청에서 `/join` vs `/join-requests` 경로 불일치가 실제 runtime 404 버그인지, legacy/alias/서비스별 경계 차이인지 판정.
> **상위:** `IR-O4O-COMMUNITY-FORUM-CROSSSERVICE-COMMONIZATION-RECHECK-V1` §8 후속 · `CHECK-O4O-FORUM-REQUEST-API-DEDUP-V1` §11-2
> **작성일:** 2026-06-12

---

## 1. 조사 개요

선행 IR/CHECK 에서 "frontend `requestJoin` 이 `/forum/categories/:id/join` 호출, 통합 backend 는 `/join-requests` 제공" 으로 보여 **잠재 live 404** 가 기록되었다. 본 IR 은 4서비스의 join client base·경로·backend 마운트를 실측 대조한다.

**핵심 결론(선행 우려 정정):** **live 404 는 없다.** 경로 차이는 버그가 아니라 **서비스별 apiClient base + 백엔드 라우트 표기 규약의 짝맞춤** 때문이며, 두 membership 라우트 표면은 **동일한 backend 서비스(`ForumMembershipService`)와 동일한 canonical 테이블(`forum_join_requests`/`forum_category_members`)** 위에서 동작한다(데이터 분기 없음). 실제 잔여 이슈는 ① REST 표기 이중화(정리 후보) ② GP/KCos 사용자 가입 신청 UI 미연결(기능 공백) 두 가지다.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `47e913959c959b09743ba768583b0d933015f2ed` |
| origin/main ahead/behind | `0 / 0` |
| 조사 기준 commit | `47e913959` |

**다른 세션 WIP(활발 — 본 IR 미접촉):** MarketTrial* 삭제(web-kpa/glyco/kcos), web-* 다수 수정(StoreSidebar, public.ts, HomePage, ServiceBanner, CommunityHomePage 등), untracked IR/png. 본 IR 은 신규 문서 1건만 생성.

---

## 3. 조사 대상 서비스와 파일

| 서비스 | frontend join client | apiClient base | backend membership mount |
|--------|----------------------|----------------|--------------------------|
| KPA | `web-kpa-society/src/api/forum.ts` (forumMembershipApi) | `…/api/v1/kpa` (client.ts:18) | `/api/v1/kpa/forum` → `forum-membership.controller.ts` |
| GlycoPharm | `web-glycopharm/src/services/forumApi.ts` | `…/api/v1` (lib/apiClient.ts) | 통합 `/api/v1/forum` → `ForumMembershipController` |
| K-Cosmetics | `web-k-cosmetics/src/services/forumApi.ts` | `…/api/v1` | 통합 `/api/v1/forum` |
| Neture | — (forumMembershipApi 없음) | `…/api/v1` | — (membership 미사용) |

공통 backend: 통합 `routes/forum/forum.routes.ts` + KPA `routes/kpa/controllers/forum-membership.controller.ts`. **둘 다 동일 서비스** `routes/kpa/services/forum-membership.service.ts` 에 위임.

---

## 4. frontend join 호출 경로 조사

| 서비스 | 함수 | 호출 path(코드) | base | 최종 resolved URL | live? |
|--------|------|-----------------|------|--------------------|:----:|
| KPA | requestJoin (forum.ts:160) | `/forum/categories/:id/join` | /api/v1/kpa | `/api/v1/kpa/forum/categories/:id/join` | ✅ LIVE (ClosedForumAccessBlocker.tsx:55) |
| KPA | getMembershipStatus (forum.ts:165) | `…/membership-status` | /api/v1/kpa | `/api/v1/kpa/forum/categories/:id/membership-status` | ✅ LIVE |
| KPA | approveJoin (forum.ts:138) | `…/members/:rid/approve` | /api/v1/kpa | `/api/v1/kpa/forum/categories/:id/members/:rid/approve` | ✅ LIVE (ForumMemberManagementPage) |
| GP | requestJoin (forumApi.ts:219) | `/forum/categories/:id/join-requests` | /api/v1 | `/api/v1/forum/categories/:id/join-requests` | ⚠️ 정의만 — **호출 0건** |
| GP | getJoinRequests/approveJoin/members | `…/join-requests`·`…/join-requests/:rid/approve`·`…/members` | /api/v1 | `/api/v1/forum/…` | ✅ LIVE (owner: ForumMemberManagementPage) |
| KCos | requestJoin (forumApi.ts:445) | `/forum/categories/:id/join-requests` | /api/v1 | `/api/v1/forum/categories/:id/join-requests` | ⚠️ 정의만 — **호출 0건** |
| KCos | getJoinRequests/approveJoin/members | `…/join-requests`·`…/members` | /api/v1 | `/api/v1/forum/…` | ✅ LIVE (owner) |
| Neture | — | — | — | — | ❌ 기능 없음(mock forum) |

> 주의: KPA frontend 의 requestJoin path 는 `/join`, GP/KCos 는 `/join-requests` — **frontend 끼리도 path 규약이 다르다**(별도 api client 사본). 그러나 각자의 base+backend 와 정합한다.

---

## 5. backend membership route 조사 (통합)

`routes/forum/forum.routes.ts` (`/api/v1/forum`), 위임 = `ForumMembershipController` → `ForumMembershipService`:
- POST `/categories/:id/join-requests` (requestJoin) — forum.routes:133
- GET `/categories/:id/join-requests` (listJoinRequests) — :136
- POST `/categories/:id/join-requests/:requestId/approve|reject` — :139-140
- GET `/categories/:id/members` · DELETE `/categories/:id/members/:userId` — :143-144
- GET `/categories/:id/membership-status` (optionalAuth) — :147
- **bare `/categories/:id/join` 미제공.**

---

## 6. KPA 전용 membership route 조사

`routes/kpa/controllers/forum-membership.controller.ts`, 마운트 `/api/v1/kpa/forum` (kpa.routes.ts:589, forumRouter `/forum`), 위임 = **동일** `ForumMembershipService`:
- POST `/categories/:id/join` (requireAuth) — 가입 신청
- GET `/categories/:id/members` · `/categories/:id/join-requests` · `/categories/:id/membership-status`
- POST `/categories/:id/members/:requestId/approve|reject`
- DELETE `/categories/:id/members/:userId`
- **bare `/join` 제공(통합과 다른 표기), approve 는 `/members/:rid/approve`(통합은 `/join-requests/:rid/approve`).**

---

## 7. 통합 forum membership route 조사 (서비스 위임 동일성)

- `ForumMembershipController.ts:13` → `import { ForumMembershipService } from '../../routes/kpa/services/forum-membership.service.js'`.
- KPA 컨트롤러도 동일 `ForumMembershipService` 사용.
- 서비스 헤더 주석: "`kpa_approval_requests → forum_join_requests (canonical service-agnostic table)`, 가입 신청=`forum_join_requests`, 멤버십=`forum_category_members`".
- **두 라우트 표면 = 같은 서비스 + 같은 canonical 테이블.** 데이터/상태머신 분기 없음.

---

## 8. 서비스별 route contract 매트릭스

| 항목 | KPA | GP | KCos | Neture |
|------|-----|----|----|--------|
| apiClient base | /api/v1/**kpa** | /api/v1 | /api/v1 | /api/v1 |
| join path(코드) | `/join` | `/join-requests` | `/join-requests` | — |
| backend 표면 | KPA-scoped 컨트롤러 | 통합 컨트롤러 | 통합 컨트롤러 | — |
| backend 서비스 | ForumMembershipService | 〃(동일) | 〃(동일) | — |
| canonical 테이블 | forum_join_requests / forum_category_members | 동일 | 동일 | — |
| 경로 정합(404?) | ✅ 정합 | ✅ 정합 | ✅ 정합 | N/A |
| user 가입 신청 UI | ✅ LIVE | ⚠️ 미연결 | ⚠️ 미연결 | ❌ 없음 |
| owner 멤버 관리 UI | ✅ LIVE | ✅ LIVE | ✅ LIVE | ❌ 없음 |

---

## 9. runtime 404 가능성 판단

- **KPA**: `/api/v1/kpa/forum/categories/:id/join` → KPA 컨트롤러가 `/join` 서빙 → **정합, 404 없음.**
- **GP/KCos**: `/api/v1/forum/categories/:id/join-requests` → 통합 forum.routes 가 `/join-requests` 서빙 → **정합, 404 없음.** (단 user requestJoin 미호출이라 실행 자체가 발생 안 함.)
- **Neture**: 기능 없음 → 404 발생 경로 없음.
- **선행 우려(`/join` vs `/join-requests` live 404)는 false alarm** — KPA 의 apiClient base 가 core(/api/v1)가 아닌 service-scoped(/api/v1/kpa)라서 `/join` 이 KPA 컨트롤러로 정확히 라우팅됨.

---

## 10. KPA 전용 vs 통합 membership 책임 경계

- **표면(REST)은 2개, 구현(service)·저장(table)은 1개.** 즉 평행 "라우트 표기" 일 뿐 평행 "구현"이 아니다 → 통합/정리 난이도 낮음(서비스·테이블 공유).
- KPA-scoped 표면은 `/join` + `/members/:rid/approve` 규약, 통합 표면은 `/join-requests` + `/join-requests/:rid/approve` 규약. 의미는 동일.
- KPA 고유 도메인(분회/약사 membership)은 본 join 흐름과 별개(그 흐름은 `kpa_approval_requests` entity_type='membership' 의 organization-join-request, 본 IR 범위 외).
- 따라서 **무리한 통합 불요** — canonical 표기 규약 하나로 수렴하고 frontend 를 정렬하면 되는 수준(정책 결정 경량).

---

## 11. closed forum 접근/가입 신청 flow

- **KPA**: closed forum 진입 → `ClosedForumAccessBlocker` 가 `getMembershipStatus` 로 상태 확인 → 비회원이면 "가입 신청" → `requestJoin` → `forum_join_requests` pending → owner 가 ForumMemberManagementPage 에서 approve/reject. pending/approved/rejected 상태 표현 존재. **완결.**
- **GP/KCos**: owner 측(가입 요청 목록·승인/거절·멤버 목록)은 연결되어 있으나, **비회원 user 의 가입 신청 진입 UI(ClosedForumAccessBlocker 류) 부재** → closed forum 을 만들어도 일반 사용자가 가입 신청을 시작할 화면이 없음. (선행 community IR §9 의 "북마크/신고 UI 부재"와 유사한 thin 영역.)
- **Neture**: closed forum membership 개념 자체 미도입(공급자 정체성 + mock forum) — 의도된 축소(H).

---

## 12. serviceKey/serviceCode boundary

- `forum_join_requests`/`forum_category_members` 는 `forum_category_id` 기준의 service-agnostic 테이블. 서비스 격리는 **forum 자체(`forum_category_requests.service_code`)** 에서 파생.
- KPA-scoped 라우트는 mount(`/api/v1/kpa`)로 KPA 맥락이나, join 서비스가 forumId 에 대해 service_code 재대조를 강제하진 않음 → 이론상 타 서비스 forumId 로 가입 신청 가능성(단 승인은 owner-gated, pending row 생성에 그침). **확정 취약은 아님**(read bypass 는 선행 `WO-O4O-FORUM-AUTHOR-PII-GUARD-V1` S3 에서 service-scoped 로 보정됨). 경량 boundary 관찰로 기록(G, 저).

---

## 13. smoke 가능 여부와 결과

- **NOT TESTED(미인증 GET 프로브 미수행)** — 본 IR 은 정적 대조로 경로 정합을 확정(각 frontend path 가 해당 backend 라우트에 실재 마운트됨을 소스로 확인)하여 404 부재를 판정. write(가입 신청) smoke 는 금지·미수행. 프로덕션 미인증 GET 프로브는 선택 사항이었으나, 정적 확정으로 충분하여 생략.
- 정적 근거: §5/§6 의 라우트 정의 라인 + §4 의 base/경로 + §7 의 서비스/테이블 공유.

---

## 14. 분류표

| 분류 | 의미 | 해당 |
|------|------|------|
| A | 경로 정합, 문제 없음 | KPA join 전체, GP/KCos owner 멤버 관리 |
| B | frontend 호출만 수정하면 되는 mismatch | 없음(현 호출은 모두 정합) |
| C | backend alias 필요 compat | 없음(각 base 가 자기 backend 와 정합 — alias 불요) |
| D | 평행 구현(표기) 정책 결정 | `/join`(KPA-scoped) vs `/join-requests`(통합) REST 표기 이중 — 서비스·테이블은 단일 |
| E | live 404 가능성 | **없음**(선행 우려 해소) |
| F | write 라 smoke 제한, 정적 판단 | requestJoin/approve(write) — 정적 정합 확인 |
| G | serviceKey/org boundary 위험 | forum_join_requests join 의 service 재대조 부재(저, §12) |
| H | 도메인 차이로 유지 | Neture membership 미도입(공급자 정체성) |
| — | 기능 공백 | GP/KCos 사용자 가입 신청 UI 미연결(requestJoin 정의·미호출) |

---

## 15. 즉시 WO 가능한 후보

1. **GP/KCos 사용자 가입 신청 UI 연결** — KPA `ClosedForumAccessBlocker` 패턴을 GP/KCos 에 적용해 비회원 closed-forum 진입 시 `requestJoin` 호출 버튼 노출. backend(통합 `/join-requests`)·client(`requestJoin`) 이미 존재 → frontend-only 소규모 WO. (단 GP/KCos 가 실제 closed forum 을 운영할 계획일 때만 가치 — 정책 확인 §16-1.)

## 16. 정책 결정 필요 후보

1. **GP/KCos closed-forum 운영 여부** — 사용자 가입 신청 UI 를 채울지(15-1) vs closed forum 자체를 KPA 전용으로 둘지. 서비스 정체성 결정.
2. **membership REST 표기 canonical 단일화** — `/join` vs `/join-requests` 중 하나로 수렴할지. 서비스·테이블이 이미 단일이므로 frontend 정렬 + 한쪽 라우트 deprecated 로 가능하나, KPA-scoped vs core base 차이까지 함께 정리해야 함(저위험·후순위).

## 17. backend/API 선행 후보

- 없음(필수). 통합·KPA 표면 모두 동일 서비스/테이블로 이미 동작. §16-2 단일화 시에만 한쪽 라우트 deprecation(코드, 비파괴) 정도.
- (참고) §12 boundary 관찰은 `WO-O4O-FORUM-SERVICEKEY-EXTRACTION-AUDIT-V1`(기존 후보)에 합류 가능.

## 18. 우선순위 제안

| 순위 | 항목 | 근거 |
|:---:|------|------|
| 1 | §16-1 GP/KCos closed-forum 정책 결정 | UI 공백 처리 방향 선결 |
| 2 | §15-1 GP/KCos 가입 신청 UI 연결(정책=운영 시) | frontend-only 경량, parity |
| 3 | §16-2 membership REST 표기 단일화 | 저위험·후순위 정리 |
| 4 | §12 boundary 관찰 → serviceKey audit 합류 | 저위험 |

---

## 19. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 가입 신청이 사용자 책임과 operator/owner 승인 책임 분리 | ✅ user=신청(forum_join_requests pending) / owner=승인. 분리 명확 |
| KPA 약사·분회 membership 특수성 보존 | ✅ 본 join(forum membership)은 분회 membership(organization-join, kpa_approval_requests)과 별개로 공존 |
| GP/KCos/Neture 에 KPA 고유 모델 강제 안 함 | ✅ 강제 없음. GP/KCos 는 동일 통합 서비스 사용, Neture 는 미도입(H) |
| 사용자 forum 과 operator/owner 승인 콘솔 혼합 | ✅ ClosedForumAccessBlocker(user) vs ForumMemberManagementPage(owner) 분리 |
| serviceKey/serviceCode 경계 안전 | ⚠️ join 서비스 forumId service 재대조 부재(저, §12) — 승인 owner-gated 라 영향 제한 |
| 없는 route 를 정상 기능처럼 보임 | ✅ 아님 — 각 frontend 호출이 실재 backend 와 정합. GP/KCos requestJoin 은 버튼 미노출(허위 기능 표시 없음) |
| 공통화가 1인 유지보수성 향상 방향 | ⚠️ 표기 이중(`/join`·`/join-requests`)은 약한 drift — §16-2 단일화 시 개선(후순위) |

**종합:** 폐쇄형 포럼 가입 경로는 **실 버그(404)가 아니며**, 동일 서비스·테이블 위의 **이중 REST 표기 + GP/KCos 사용자 UI 공백**이 잔여다. 우선순위는 GP/KCos closed-forum 정책 결정(운영 시 가입 UI 연결) → 표기 단일화 순이며, 모두 저위험이다.

---

## 최종 보고 요약

- **수정 파일 없음** (신규 IR 문서 1건만 생성)
- **생성 IR 문서:** `docs/investigations/IR-O4O-FORUM-MEMBERSHIP-JOIN-ROUTE-CONTRACT-AUDIT-V1.md`
- **조사 기준 commit:** `47e913959` (main, origin 동기화)
- **frontend join 호출 경로:** KPA `/api/v1/kpa/forum/.../join`(LIVE) · GP/KCos `/api/v1/forum/.../join-requests`(owner LIVE, user 미연결) · Neture 없음
- **backend join route:** 통합 `/api/v1/forum/.../join-requests` + KPA-scoped `/api/v1/kpa/forum/.../join` — **동일 `ForumMembershipService` + 동일 canonical 테이블(forum_join_requests/forum_category_members)**
- **runtime 404 가능성:** **없음** (선행 우려는 KPA service-scoped base 오인에서 비롯된 false alarm)
- **smoke 결과:** NOT TESTED(write 금지) — 정적 라우트 정합으로 404 부재 확정
- **즉시 WO 후보:** GP/KCos 사용자 가입 신청 UI 연결(frontend-only, 정책 선결)
- **정책 결정 후보:** GP/KCos closed-forum 운영 여부 / membership REST 표기 단일화
- **우선순위:** 정책 결정 → 가입 UI 연결 → 표기 단일화 → boundary audit 합류
- **git status:** 사전 상태와 동일, 다른 세션 WIP 미접촉, 미커밋(read-only IR)
