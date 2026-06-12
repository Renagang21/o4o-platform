# IR-O4O-FORUM-REQUEST-TAG-INPUT-PARITY-V1

> **유형:** Read-only 조사 (코드/UI/API/DB/route/menu 무변경)
> **목적:** 포럼 개설 신청의 `tags` 입력/전송 정책이 4서비스(KPA/GP/KCos/Neture)에 일관되게 적용되는지 확인하고, GP/KCos/Neture 신청 실패 가능성을 확정 + 후속 정책 방향 권고.
> **상위:** `IR-O4O-FORUM-CATEGORY-TO-TAG-TERMINOLOGY-BOUNDARY-V1` §11-2 · `WO-O4O-FORUM-CATEGORY-TO-TAG-LABEL-CLEANUP-V1`
> **작성일:** 2026-06-12

---

## 1. 조사 개요

terminology IR 부수 발견("backend tags 필수인데 비-KPA frontend 미전송")의 실재 여부를 확정한다.

**핵심 결론:** **CONFIRMED — GP/KCos/Neture 포럼 개설 신청은 현재 `400 TAGS_REQUIRED`로 거부된다(live 기능 결함).** canonical backend `ForumRequestService.create`는 `tags`를 **모든 serviceCode에 hard-required**로 강제하나, **tag 입력 UI·payload·client type을 구현한 서비스는 KPA뿐**이다. GP/KCos/Neture 신청 폼은 `{name, description, reason}`만 전송하고 3개 route 모두 live이므로, 사용자가 신청을 제출하면 반드시 실패한다.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `62ffafbceebfc37edfb7ca226b07c396090da114` |
| origin/main ahead/behind | `0 / 0` |
| 조사 기준 commit | `62ffafbce` |

**다른 세션 WIP(미접촉):** Footer/legal 작업(web-glycopharm/k-cosmetics/neture Footer, shared-space-ui legal, footerLegal.ts), CHECK-...-ORDER-VIEW-LOOP M, untracked 다수. 본 IR 은 신규 문서 1건만 생성.

---

## 3. backend tags validation 조사

**canonical `ForumRequestService.create`** (`apps/api-server/src/services/forum/ForumRequestService.ts`):
```
85  if (!tags || tags.length === 0) → 400 TAGS_REQUIRED ('태그를 1개 이상 선택해주세요')
88  if (tags.length > 5)            → 400 TAGS_TOO_MANY  ('최대 5개')
92  sanitize(trim, # 제거, 빈값/30자초과 제거, 중복 제거)
99  sanitize 후 0개                  → 400 TAGS_REQUIRED ('유효한 태그를 1개 이상')
111 tags: sanitizedTags 저장
```
- **tags 는 hard-required.** serviceCode 분기/예외 **없음** → 4서비스 공통 강제.
- 이 create 는 user route `POST /forum/category-requests`(forum-category-request.routes.ts:30)가 위임하는 **유일 경로**이며, **4서비스 frontend 가 모두 이 엔드포인트를 호출**(serviceCode 만 다름).
- **operator update 경로**(`operator-forum.routes.ts:597 PATCH /categories/:id`)는 tags 가 `!== undefined` 일 때만 sanitize(선택적) — create 와 정책 다름(operator 는 forum 정보 수정이라 별개).
- **KPA legacy `/kpa/forum-requests`**(deprecated) 서비스는 tags 검증 **없음**(grep 0) — 단 frontend 미사용이므로 무관.

## 4. frontend 신청 폼 조사

| 서비스 | 페이지 | tag 입력 UI | 폼 필드 |
|--------|--------|:----:|---------|
| KPA | mypage/RequestCategoryPage.tsx | ✅ selectedTags + addTag/removeTag(42~244), **tag 필수 검증**(L72 "태그를 1개 이상") | name·description·reason·**tags**·forumType |
| GlycoPharm | forum/RequestCategoryPage.tsx | ❌ 없음(131~212) | name·description·reason |
| K-Cosmetics | forum/RequestCategoryPage.tsx | ❌ 없음(106~125) | name·description·reason |
| Neture | supplier/RequestCategoryPage.tsx | ❌ 없음(106~125) | name·description·reason |

## 5. API client payload 조사

| 서비스 | create 호출 payload | client type 에 tags |
|--------|---------------------|:----:|
| KPA | `{ name, description, reason, forumType, tags: selectedTags }` (RequestCategoryPage:83~89 → forum.ts:88) | ✅ `tags?: string[]` (forum.ts:187) |
| GlycoPharm | `{ name, description, reason }` (api.ts:182~186) | ❌ 부재 |
| K-Cosmetics | `{ name, description, reason }` (forumApi.ts:262~269) | ❌ 부재 |
| Neture | `{ name, description, reason }` (forumApi.ts:787~800) | ❌ 부재 |

- 4서비스 모두 `serviceCode`는 정상 전달(KPA forumType 추가). **tags 만 KPA 단독 전송.**

## 6. 서비스별 tag input/payload 매트릭스

| 서비스 | tag UI | tags payload | client type tags | route live | route | 판정 |
|--------|:----:|:----:|:----:|:----:|-------|:----:|
| KPA | ✅ | ✅ | optional | ✅ | `/forum/request` | A 정합 |
| GlycoPharm | ❌ | ❌ | ❌ | ✅ | `/forum/request-category` | **B 실패** |
| K-Cosmetics | ❌ | ❌ | ❌ | ✅ | `/forum/request-category` | **B 실패** |
| Neture | ❌ | ❌ | ❌ | ✅ | `/supplier/forum/request-category` (SupplierRoute) | **B 실패** + D(공급자 범위) |

## 7. runtime 실패 가능성 판단

- **확정(정적):** GP/KCos/Neture 신청 폼 submit → `{name,description,reason}` (tags 부재) → route handler 가 body.tags(undefined)를 service.create 에 전달 → `!tags` 참 → **`400 TAGS_REQUIRED`**. route layer 에 tags 기본 주입 없음.
- **3개 route 모두 live**(App.tsx 마운트 확인). 따라서 비-KPA 사용자가 포럼 개설 신청을 시도하면 **항상 실패**.
- **E(타입 불일치):** GP/KCos/Neture client type 이 tags 를 아예 누락 → 컴파일도 막지 못함(backend 계약과 frontend 타입 drift).
- 실사용 빈도는 미상(신청 route 노출은 community-home/forum 경유)이나 **기능 정합 결함은 확정**.
- **API smoke: NOT TESTED** — create 는 인증 후 write(프로덕션 실데이터). 미인증 POST 는 401(기존). 정적 검증으로 실패 확정에 충분.

## 8. 정책 옵션 비교

| 옵션 | 내용 | 장점 | 단점 |
|------|------|------|------|
| **A** | tags 필수 유지 + GP/KCos/Neture frontend 에 tag input 추가(KPA 패턴 재사용) | 4서비스 정책 일관·tag 중심 canonical 유지·검색/분류 품질·KPA parity | GP/KCos/Neture UI 작업 3건·Neture 강제감 |
| **B** | backend tags optional 화(create 검증 완화) | 실패 즉시 제거·UI 변경 최소·Neture 축소 유리 | tag 중심 정책 약화·검색/분류 품질 저하·서비스 경험 편차 고착 |
| **C** | service 별 정책(예: KPA/GP/KCos 필수, Neture optional) | 서비스 정체성 반영 | backend validation serviceCode 분기 복잡·1인 유지보수성 저하 |

## 9. 권장안

**기본 권장: Option A (tags 필수 유지 + GP/KCos/Neture frontend tag input 추가).**
- 선행 terminology IR 이 **tag = 자유입력형 분류 키워드(canonical), tag 중심 이동**을 확정했고, backend 가 이미 이를 강제하며 **KPA 에 재사용 가능한 tag input 패턴이 존재**한다. backend 완화(B)는 platform 전반의 forum 분류/검색 품질을 조용히 저하시킨다.
- **단 Neture 는 별도 판단(D):** supplier-scoped·forum 축소 가능성. 두 갈래 —
  - (A-Neture) 동일하게 tag input 추가하여 unbreak, 또는
  - (Neture forum-create 자체 재검토) supplier 정체성상 일반 포럼 개설 신청을 유지할지 → **Neture forum 범위 결정**(IR-membership §16-1 과 동일 미결 정책)과 함께 판단.
- C(serviceCode 분기)는 1인 유지보수성 관점에서 비권장.

**즉시성 주의:** 3서비스 신청이 실제 거부 상태이므로, A 채택 시에도 **GP/KCos 우선 unbreak**(tag input 추가) → Neture 는 forum 범위 결정과 연동.

## 10. 즉시 WO 가능한 후보

1. **`WO-O4O-FORUM-REQUEST-TAG-INPUT-PARITY-V1`** (Option A) — GP/KCos(+조건부 Neture) RequestCategoryPage 에 tag input UI 추가 + client type/payload 에 `tags` 추가(KPA forumMembership/forum.ts 패턴 이식). frontend-only(+client type), backend 무변경. 3개 서비스 신청 unbreak.
   - 선행: Neture 포함 여부 = §9 Neture 정책 결정.

## 11. backend policy 변경 후보 (대안)

1. **`WO-O4O-FORUM-REQUEST-TAGS-OPTIONAL-POLICY-V1`** (Option B, 비권장) — `ForumRequestService.create` 의 TAGS_REQUIRED 완화(tags 선택). 1줄 변경으로 즉시 unbreak 하나 **tag 중심 정책 약화** — 채택 시 terminology IR 의 canonical 결정과 충돌하므로 platform 차원 합의 필요.
2. (C) serviceCode 분기 validation — 비권장(복잡도).

## 12. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| forum 신청이 "포럼+태그" 기준으로 이해되는가 | ⚠️ KPA 만 그렇고 GP/KCos/Neture 는 tag 누락 → 정책-구현 불일치 |
| tag 가 자유입력형 분류 키워드로 유지되는가 | ✅ backend·KPA UI 모두 자유입력(addTag) |
| tag 를 membership/권한으로 오해하는가 | ✅ 아님 — 분류 키워드(terminology IR §7) |
| KPA reference 를 무리하게 강제하는가 | ⚠️ tag 필수는 backend 가 이미 전 서비스 강제 → 오히려 frontend 가 미반영. A 는 강제가 아닌 정합 |
| GP/KCos 에 분류 품질 위해 tag 필요한가 | ✅ community 서비스 — 검색/분류에 유효 |
| Neture 는 forum/tag 축소가 적절한가 | ⚠️ supplier 정체성상 가능 → §9 별도 결정(D) |
| backend validation 이 사용자 화면과 일치하는가 | ❌ 불일치 — GP/KCos/Neture 화면엔 tag 입력 없는데 backend 는 필수 |
| 없는 입력을 요구해 신청을 실패시키지 않는가 | ❌ 현재 실패시킴 — 본 IR 의 핵심 결함 |
| 공통화가 1인 유지보수성을 높이는가 | ✅ A(공통 tag input 패턴 이식) 또는 B(단일 정책) 모두 일관화. C(분기)만 저해 |

**종합:** backend 는 tags 필수(canonical), frontend 는 KPA 만 반영 → **GP/KCos/Neture 포럼 신청 live 실패 확정**. 권장은 **Option A**(tag 중심 정책 유지 + 3서비스 tag input 정합), Neture 는 forum 범위 정책과 연동. backend 완화(B)는 정책 약화로 비권장.

---

## 최종 보고 요약

- **수정 파일 없음** (신규 IR 문서 1건만 생성)
- **생성 IR 문서:** `docs/investigations/IR-O4O-FORUM-REQUEST-TAG-INPUT-PARITY-V1.md`
- **조사 기준 commit:** `62ffafbce` (main, origin 동기화)
- **backend `TAGS_REQUIRED` 실제 적용:** ✅ canonical create 에서 hard-required, serviceCode 예외 없음(ForumRequestService.ts:85)
- **tag 입력 UI:** KPA ✅ / GP·KCos·Neture ❌
- **tags payload 전송:** KPA ✅ / GP·KCos·Neture ❌ (client type 에도 tags 부재 — drift)
- **runtime 신청 실패:** **확정** — GP/KCos/Neture(3개 route live) 신청 시 `400 TAGS_REQUIRED`
- **권장 정책:** **Option A** (tags 필수 유지 + GP/KCos frontend tag input 추가, Neture 는 forum 범위 결정과 연동). backend optional 화(B)는 비권장.
- **즉시 WO:** `WO-O4O-FORUM-REQUEST-TAG-INPUT-PARITY-V1`(frontend-only) — Neture 포함 여부는 정책 결정 선결
- **backend 후보(대안):** `WO-O4O-FORUM-REQUEST-TAGS-OPTIONAL-POLICY-V1`(비권장)
- **git status:** 사전 상태 동일, 다른 세션 WIP 미접촉, 미커밋(read-only IR)
