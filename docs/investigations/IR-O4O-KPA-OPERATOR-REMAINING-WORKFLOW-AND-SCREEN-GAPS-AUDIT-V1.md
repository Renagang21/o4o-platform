# IR — KPA-Society 운영자 콘솔 잔여 업무 동선 · 화면 갭 재조사

> IR-O4O-KPA-OPERATOR-REMAINING-WORKFLOW-AND-SCREEN-GAPS-AUDIT-V1
> 작업일: 2026-07-27
> 상태: **조사 완료 (read-only) — 코드 지도 + 실브라우저 순회 + 정적 코드 추적 병행**
> 대상: KPA-Society **운영자 콘솔** (`/operator/*`) — `/store` 측은 대상 아님(별도 IR `IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1`)
> 원칙: 과거 IR 결과 재확인 / grep 숫자 단독 확정 금지 / 구현 완료 화면을 리팩터 대상화 금지 / 데이터 0건과 기능 결함 구분 / 조사 중 코드·DB·배포·커밋 없음 (본 문서 + path-specific commit 만)

---

## 0. 조사 방법 요약

- **코드 지도 (정적):** 4개 병렬 에이전트로 (1) 운영자 route/menu/guard, (2) 회원·자격·매장·상품 백엔드, (3) 콘텐츠·HUB·승인 백엔드, (4) 태블릿·사이니지·포럼 + 에러 계약 전수.
- **실브라우저 순회:** 배포본 `kpa-society-web-3e3aws7zqa-du.a.run.app`, `sohae2100`(kpa:admin/operator) 로 운영자 콘솔 순회 + `renagang21`(store owner) 로 권한 차단 재현.
- **DB write 0 / 코드 수정 0.** 승인 대기 큐가 전부 0건이어서 실제 승인 "처리" 는 라이브 실행 불가 → 정적 코드 추적 + 빈 상태 렌더 확인으로 갈음(§2 에 명시).

---

## 1. 운영자 메뉴 · route · render-page · API · role · 도달성 지도

### 1.1 마운트 · 가드

| 항목 | 값 |
|------|------|
| 마운트 | `App.tsx:751` — `/operator/*` (lazy, `OperatorRoutes`) |
| Route 테이블 | `services/web-kpa-society/src/routes/OperatorRoutes.tsx` |
| 최상위 가드 | `OperatorRoutes.tsx:83` `<RoleGuard allowedRoles={PLATFORM_ROLES}>` = `[kpa:admin, kpa:operator, platform:super_admin]` |
| 사이드바 | `config/operatorMenuGroups.ts` → `UNIFIED_MENU`(활성). `OPERATOR_MENU_ITEMS`(L163) = deprecated/미사용 |
| 대시보드 | **백엔드 주도** — `GET /api/v1/kpa/operator/dashboard` → `routes/kpa/services/operator-dashboard.service.ts` `buildConfig()`. 프론트 `KpaOperatorDashboard.tsx` 렌더 + 클라이언트 축 카드 2개(`buildKpaAxesFromConfig` L157-206) |

3개 route 는 상위 가드 위에 stricter admin 가드 추가: `audit-logs`, `roles`, `legal`.

### 1.2 route ↔ 페이지 ↔ API base

- 프론트 API base: `apiClient`=`/api/v1/kpa`; `coreApiClient`/`platformApi`/`authClient.api`=`/api/v1`. 배포 관측 호스트 = `api.neture.co.kr`(공용).
- 정상 도달 route(주요): dashboard, members, applications, qualification-requests, stores(+`/:id`), products(+ approvals), content-hub(+working-content), community, analytics, audit-logs, roles, event-offer, signage(+HQ playlist), recruitment-exposure, tablet.

### 1.3 orphan / redirect / 중복 (도달성 이상)

| 유형 | 위치 | 내용 |
|------|------|------|
| **Orphan (route 有·메뉴 無)** | `OperatorRoutes.tsx:151-152` working-content | 사이드바 진입점 없음(콘텐츠 허브 내부 링크로만 도달) |
| **Orphan** | `:230` collaboration-requests | 메뉴 없음 |
| **Orphan** | `:198` users/:id | 목록에서만 도달 |
| **Legacy route (메뉴 제거·route 보존)** | `:130` legal (admin 가드) | 메뉴에서 제거됨(`operatorMenuGroups.ts:126-133`), route 는 남음 → §8 정책 |
| **UI 무진입 백엔드** | `/operator/approvals` (공급자 CMS→HUB 승인) | 백엔드 완비, **운영자 UI/route/호출부 전무** → §2·§6 P0 후보 |
| Redirect | `:97/:101/:138/:184/:197/:239` | 구 경로 → canonical 경로 정규화(정상) |
| Catch-all | `:243` | 미정의 경로 방어(정상) |

---

## 2. 업무 동선별 PASS · 단절 · 미확인

각 동선을 **발생 → 발견 → 검토 → 처리 → 결과확인** 5단계로 추적.

### 2.1 회원 · 자격 (Members / Qualification)

- **PASS:** 회원 온보딩 실경로 = `member.controller.ts` — 승인 시 `kpa:store_owner` + `organization_members(owner)` 자동 프로비저닝(L744-756). 목록/상세/비밀번호(coreApiClient PUT L292) 렌더 정상.
- **단절 ①(P1 처리 이중경로):** `MemberManagementPage` 는 3개 하위 플로우가 **서로 다른 백엔드**. `application.controller.ts` 의 `KpaApplication` 승인(L343-348)은 **status flip + 이메일만** 수행하고 **회원 온보딩을 하지 않음** → "가입 신청 승인" 이 실제 회원 생성으로 이어지지 않는 dead-end 경로 존재.
- **단절 ②(P1 권한 경계):** `application.controller.ts` 승인 엔드포인트는 `kpa:admin` 요구, 그러나 페이지 진입은 `kpa:operator` 로 가능 → **operator 단독 계정은 승인 클릭 시 403**.
- **단절 ③(P1 결과 불일치):** 행 액션/일괄 액션이 mutation 후 **refetch 하지 않음**(`MemberManagementPage.tsx:414-500` optimistic-only) → 목록/통계가 실제 상태와 어긋남.
- **오류 계약(P2):** 통계 로드 `.catch(()=>{})` (L218) — 실패를 조용히 삼킴. RBAC role 동기화 실패도 silent catch 후 success 반환(`member.controller.ts:621-623, 1035-1037`).
- **미확인:** 승인 대기 0건 → 실제 승인 처리 라이브 미검증(정적 추적으로 갈음).

### 2.2 매장 (Stores)

- **PASS:** 매장 목록/상세 렌더 정상. `getStoreChannels` 500(phantom `approved_by`)은 **이미 수정 배포됨**(`785c05408`) — 실브라우저에서 "채널 상태 (0)" 빈 상태 정상 렌더 확인(§7 stale).
- **단절(P1 결과 불일치):** 채널 상태 변경 · capability 토글이 mutation 후 refetch 없음(optimistic) → §2.1③ 과 동질.
- **정책(§8):** KPA 운영자 매장 목록에 **K-Cosmetics 매장이 노출**(sohae2100 다중 서비스 admin/operator). 버그 단정 아님 — 교차 서비스 노출 정책 결정 필요.

### 2.3 상품 · 거래 (Product / Trade)

- **PASS:** 승인 = `product-approval-v2.service.ts` — OPL 활성화(is_active=true UPSERT L184-200).
- **단절(P1 결과 불일치·soft break):** listing UPSERT 실패 시 **silent rollback** 후 `listingActivated:false` 로 **success 반환**(L197-200) → 운영자는 "승인 성공" 으로 인지하나 실제 진열 미활성.
- **UX(P3):** product-applications UI 에 raw 문서 경로 leak.

### 2.4 콘텐츠 · 매장 HUB (Content / HUB)

- **단절 ①(P0/P1 — 최우선):** `/operator/approvals` = 공급자 `hub_content_submission` 승인 백엔드 완비(`content-approval.service.ts` + `content-approval.controller.ts`, `kpa.routes.ts:268` 마운트) **그러나 운영자 UI/route/호출부 전무** → **공급자 CMS→HUB 승인 동선이 운영자 화면에서 도달 불가**.
- **단절 ②(P1 결과 불일치):** `kpa_contents` status 어휘 불일치 — 저장은 `ready/draft`, HUB/대시보드 피드는 `published` 기대 → ContentHub 항목이 대시보드/HUB feed 에 **안 보임**.
- **단절 ③(P2 업무 단절):** `hub-content.service.ts` `queryCms` 는 `CmsContent` 만 읽고 **`kpa_contents` reader 없음**(L257-299). `queryScreenSet` 는 모든 에러를 삼켜 빈 배열(L622-625) — "테이블 없음"→빈 목록 위장이 계통적.
- **단절 ④(P2):** working-content publish 가 store 없는 operator 에 **403 NO_STORE**.

### 2.5 태블릿 · 사이니지 (Tablet / Signage)

- **위험(P1 오류 계약·데이터 손상 가능):** screen-set 매장 import = **독립 snapshot 사본**(FK/sync/cascade 없음, `store-tablet.routes.ts:1628-1630`) — ADR 상 **의도된 불변식**. 반면 signage media 는 **LIVE 참조**(`media.repository.ts:25`) — **소비 의미가 정반대**. 게다가 media **HARD delete CASCADE**(L110)가 **사용중 경고 없이** 매장 playlist 를 끊음.
- **미확인:** 태블릿 실 콘텐츠 배포는 매장 측 자산 필요 → 운영자 단독 라이브 검증 제한.

### 2.6 포럼 · 커뮤니티 (Forum / Community)

- **PASS:** CommunityManagementPage(=Home 편집) ads/sponsors/quick-links DataTable 표준화 완료(이미 해결·§7).
- **오류 계약(P2):** `AuditLogPage.tsx` `ACTION_LABELS` 가 `MEMBER_*/APPLICATION_REVIEWED/CONTENT_*` 만 커버 — **forum/community/signage/screen-set 액션 누락** → 통합 실패/감사 로그 커버리지 갭.

---

## 3. 대시보드 KPI · 알림 → 처리 화면 연결

- **PASS:** KPI 카드(L380-456)·Action Queue(L551-617)·Quick Actions(L662-675) 모두 CTA route 보유 — 백엔드 주도.
- **단절 ①(P2 표현·연결):** KPI 라벨 "이벤트 오퍼 승인 대기" ↔ 실제 진입 화면 "이벤트 관리" **명칭 불일치**.
- **단절 ②(P1 결과 불일치):** 대시보드 KPI 가 mutation 후 **자동 refresh 없음** → 처리 후에도 카운트가 옛 값. §2 refetch 누락과 동질(범위 넓음).
- **미확인:** Action Queue 항목이 전부 0건 → 항목→처리화면 실제 점프는 정적 확인만.

---

## 4. 화면별 실제 결함 (에러/빈/액션 계약)

> 이미 완료된 DataTable 전환·조회 실패 계약화는 재평가 대상 아님(§7). 아래는 **미해결** 항목.

| 심각도 | 화면/파일 | 결함 |
|:---:|------|------|
| P1 | Member/Store/Product 다수 | mutation 후 refetch 없음(optimistic-only) → 결과 불일치 |
| P1 | `product-approval-v2.service.ts` | listing 실패 silent rollback + success 반환 |
| P2 | `MemberManagementPage.tsx:218` | 통계 로드 silent catch |
| P2 | `member.controller.ts:621/1035` | RBAC sync 실패 silent → success |
| P2 | `AuditLogPage.tsx` | ACTION_LABELS 커버리지 갭 |
| P2/P1 | signage `media.repository.ts:110` | HARD delete CASCADE, 사용중 경고 없음 |
| P3 | `RecruitmentExposureApprovalPage.tsx:68` | mutation 에러를 `window.alert`(L38-41 error+retry 는 양호 — 내부 불일치) |
| P3 | blog/pop/qr/video/WorkingContent/OperatorContentHub/QualificationRequests/EventOfferManage/OperatorStoreDetail | `window.confirm` 남용 — 공용 `ConfirmActionDialog` 미사용 |
| P3 | product-applications UI | raw 문서 경로 leak |

---

## 5. 권한 3계층 교차 검증 (라이브 + 정적)

| 계정 | 역할 | 프론트 | 백엔드 | 판정 |
|------|------|:---:|:---:|------|
| sohae2100 | kpa:admin / kpa:operator | **PASS(라이브)** | PASS | 정상 운영자 접근 |
| renagang21 | store owner | **DENY(라이브)** — `/operator` → "접근 권한이 없습니다 · 운영자(Operator) 권한 필요" | 403 | 프론트/백엔드 모두 차단 확인 |
| renariver21 | platform:super_admin | (정적) PASS | PASS | **미확인 — `docs/local/TEST-ACCOUNTS.local.md` 미등재로 라이브 불가** |

- 프론트(kpa:* + super_admin 만 허용, 더 엄격) vs 백엔드(교차 서비스 operator 도 허용) 비대칭 존재하나 **프론트가 더 엄격 → 보안 개방 아님**(측정값, 본 IR 변경 대상 아님).
- **중지 항목:** renariver21 라이브 검증은 자격증명 부재로 불가. 은폐하지 않고 기록 — 필요조건 = SSOT 계정 등록.

---

## 6. 우선순위 (P0 / P1 / P2 / P3)

| 순위 | 항목 | 근거 |
|:---:|------|------|
| **P0** | `/operator/approvals` 공급자 CMS→HUB 승인 UI 부재 (§2.4①) | 백엔드 완비인데 **운영자가 실행할 화면이 없음** = 업무 차단 |
| **P1** | mutation 후 refetch/자동 refresh 부재 (§2.1③·2.2·2.3·3②) | 처리 결과가 화면과 어긋남 — 콘솔 전반 결과 불일치 |
| **P1** | product listing silent rollback + success (§2.3) | "성공" 오인 → 진열 미활성 |
| **P1** | KpaApplication 승인 dead-end + operator 403 (§2.1①②) | 승인해도 회원 미생성 / operator 단독 403 |
| **P1** | kpa_contents status 어휘 불일치 (§2.4②) | 콘텐츠가 HUB/대시보드에 안 보임 |
| **P1** | signage media HARD delete CASCADE 경고 없음 (§2.5) | 데이터/운영 손상 가능 |
| **P2** | RBAC/통계 silent catch, working-content 403, ACTION_LABELS 갭, KPI 라벨 불일치 | 업무 단절·오류 계약·표현 |
| **P3** | window.alert/confirm, 경로 leak | UX·표현 |

---

## 7. stale IR · 오판 · 이미 해결 항목

- **채널 500 해결됨:** `getStoreChannels` phantom `approved_by` → 제거 배포(`785c05408`, `CHECK-...-STORE-CHANNELS-500-...-V1`). 과거 IR 의 "채널 조회 실패" 는 **현재 해소** — 실브라우저 "채널 상태 (0)" 빈 상태 확인.
- **조회 실패 계약화·DataTable 전환 완료:** `CHECK-...-LOAD-ERROR-AND-REMAINING-LISTS-CONSOLIDATED-V1`(`883834a32`) 로 Analytics/Community/OperatorStoreDetail 등 표준화 완료 → **재리팩터 대상 아님**.
- **오판 방지:** 승인 대기 0건은 **기능 결함이 아니라 데이터 0건** — 처리 경로는 정적으로 존재. "0건"↔"결함" 혼동 금지.

---

## 8. 의도적 제외 · 정책 결정 필요

- **screen-set import = 독립 snapshot 사본:** ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1 상 **의도된 불변식**(매장 독립 사본). 결함 아님 — 단, signage media LIVE 참조와의 **의미 비대칭**은 문서화 필요.
- **legal legacy route:** 메뉴 제거·route 보존 = 의도적. 유지/제거는 정책 결정.
- **교차 서비스 매장 노출(K-Cosmetics in KPA operator):** 다중 서비스 role 보유 계정의 노출 범위 — **정책 결정 필요**(버그 단정 금지).
- **프론트/백엔드 가드 비대칭:** 교차 서비스 operator 의 API 직접 호출 허용 = 공용 operator API 기존 설계. 변경 시 별도 WO.

---

## 9. 다음 통합 구현 WO 권장 (1개)

> 작은 수정 다수 대신, **실제 업무 영향 + 구조적 동질성** 기준 단일 통합 WO.

### WO 권장: **운영자 콘솔 "처리 결과 정합성 + 승인 동선 완결" 통합 (Operator Action Integrity)**

**하나의 구조적 결함 계열을 묶는다:** 운영자가 무언가를 *처리* 한 뒤 화면/데이터/다음 액션이 실제 결과와 일치하지 않는 문제.

1. **승인 동선 완결 (P0):** `/operator/approvals`(공급자 CMS→HUB 승인) 운영자 UI/route 신설 — 백엔드(`content-approval.*`)는 이미 존재하므로 **프론트 wiring + 메뉴 진입점**만.
2. **처리 후 정합성 (P1 계열 통일):** member/store/product/dashboard 의 mutation 후 **refetch/invalidate 표준화** — 공용 패턴 1개로 optimistic-only 제거.
3. **success-on-failure 제거 (P1):** product listing silent rollback → **정직한 부분 실패 계약**(`listingActivated:false` 를 경고로 표면화). member RBAC/통계 silent catch 표면화.
4. **승인 어휘·경계 정합 (P1):** KpaApplication 승인이 회원 온보딩까지 이어지도록 경로 정합 + operator/admin 가드 경계 정정. kpa_contents status 어휘 통일(ready/published).

**범위 밖(후속 분리):** signage media hard-delete 경고(데이터 안전 별도 WO), ACTION_LABELS 확장·window.confirm 통일(P2/P3 UX 스윕), 교차 서비스 노출·legal route(정책 결정 선행).

**동질성 근거:** 1~4 는 모두 "**운영자의 처리 행위 ↔ 결과 표현/데이터/다음 단계의 단절**" 이라는 동일 구조 결함이며, 공용 refetch 패턴 + 승인 계약 정합으로 함께 해소된다. P2/P3 는 표현/안전 계열로 성격이 달라 분리.

---

## 10. 조사 근거 (파일 · route · API · 브라우저)

**Route/menu:** `OperatorRoutes.tsx`(guard L83, orphan L151/230/198, legal L130, redirect L97~239, catch-all L243) · `operatorMenuGroups.ts`(UNIFIED_MENU, legal 제거 L126-133) · `App.tsx:751`.

**백엔드:** `operator-dashboard.service.ts`(KPI L380-456 / queue L551-617 / quick L662-675) · `member.controller.ts`(onboard L744-756, silent catch L621/1035) · `application.controller.ts`(approve L343-348) · `product-approval-v2.service.ts`(L184-200) · `hub-content.service.ts`(queryCms L257-299, queryScreenSet L622-625, screen-set filter L576-603) · `content-approval.service.ts`+`content-approval.controller.ts`(`kpa.routes.ts:268` 마운트, UI 없음) · `store-tablet.routes.ts:1628-1630` · `media.repository.ts:25/110`.

**프론트:** `MemberManagementPage.tsx`(L218/292/378-383/414-500) · `AuditLogPage.tsx`(ACTION_LABELS) · `RecruitmentExposureApprovalPage.tsx:68` · `KpaOperatorDashboard.tsx`(L157-206).

**브라우저(라이브):** 배포본 `kpa-society-web-3e3aws7zqa-du.a.run.app` — sohae2100 운영자 콘솔 순회(채널 500 해소·승인 큐 0건 확인) / renagang21 `/operator` → "접근 권한이 없습니다" DENY 재현. renariver21 미확인(자격증명 부재).

---

## 11. 후속 (문서 · commit)

- 본 IR = read-only 조사 산출물. 코드/DB/배포 변경 없음.
- 다음 실행은 §9 의 통합 WO 1건. 별도 WO 승인 후 진행.
- commit: 본 문서만 path-specific(동시 세션 안전).
