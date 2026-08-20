# CHECK-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1

> WO 정본: [`docs/work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1.md`](../work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1.md)
> 작성일: 2026-08-20 · 구조: WO §31 20항목

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| WO 기준 commit | `04fe9f9a8` |
| 실행 시작 시점 `origin/main` | `f5c8a83c3` (WO 이후 3개 무관 커밋 선행) |
| 구현 commit | `55dc0c814` |
| 결함 교정 commit (§15-1) | `d05fd8a28` |
| CHECK commit | 본 문서 커밋 (§20) |
| 배포 workflow | `Deploy Web Services (Cloud Run)` run `32317473547` · 재배포 run `32318165692` |

선행한 무관 커밋 3건: `f5c8a83c3`(forum interaction CHECK) · `329a050b9`(signage org-scope guard) · `3b06ad03d`(forum parentId boundary). 본 WO 범위와 파일 충돌 없음.

---

## 2. 5서비스 모집단

| # | 서비스 | 프론트 경로 | membership gate | My Page 진입 |
|---|---|---|---|---|
| 1 | KPA-Society | `services/web-kpa-society` | `src/components/auth/MembershipGate.tsx` | `/mypage` → `MyDashboardPage.tsx` |
| 2 | GlycoPharm | `services/web-glycopharm` | `src/components/auth/MembershipGate.tsx` | `/mypage` → `MyPageHub.tsx` |
| 3 | K-Cosmetics | `services/web-k-cosmetics` | `src/components/auth/MembershipGate.tsx` | `/mypage` → `MyPageHub.tsx` |
| 4 | Neture | `services/web-neture` | `src/components/auth/MembershipGate.tsx` | `/mypage` → `MyPageHub.tsx` |
| 5 | Pharmacy-Hub | `services/web-pharmacy-hub` | `src/components/MembershipGate.tsx` | `/account` → `MyProfilePage.tsx`, `/join/status` → `JoinStatusPage.tsx` |

GlycoPharm 은 공식 4서비스 밖(MEMORY 기준)이나 본 WO §2 가 5서비스를 명시하므로 포함한다.

---

## 3. 16기능 census (미조사 0)

판정 코드: `FC`=FULLY_COMMON · `CO`=CORE_ONLY · `VD`=VIEW_DUPLICATED · `SS`=SERVICE_SPECIFIC · `NI`=NOT_IMPLEMENTED · `OOS`=OUT_OF_SCOPE

| # | 기능 | KPA | Glyco | KCos | Neture | PH | 비고 |
|---|---|---|---|---|---|---|---|
| 1 | 서비스 membership 존재 여부 | FC | FC | FC | FC | FC | 판정 SSOT=`getServiceMembershipStatus` (`@o4o/auth-utils`), 표시=`buildMembershipViewModel().membershipExists` |
| 2 | membership 현재 상태 | FC | FC | FC | FC | FC | `service_memberships.status` 6 enum → 공통 `MembershipStatusBadge` |
| 3 | 가입 승인 상태(active) | FC | FC | FC | FC | FC | `DEFAULT_MEMBERSHIP_STATUS_CONFIG.active` 단일 표현 |
| 4 | 거절/반려 상태(rejected) | FC | FC | FC | FC | FC | PH 만 문구 override(반려 사유 확인 동선) |
| 5 | 활성/비활성(suspended·withdrawn) | FC | FC | FC | FC | FC | 5서비스 동일 표현 |
| 6 | 역할(role) 표시 | FC | FC | FC | FC | FC | 공통 `resolveRoleLabel` — 사전·우선순위는 서비스 소관 |
| 7 | 복수 역할 표시 | FC | FC | FC | FC | SS | KPA/Glyco/KCos/Neture=`RoleBadgeGroup`. PH `MyProfilePage` 는 대표 1역할만 노출(기존 UX 유지, §10 과잉공통화 금지) |
| 8 | 역할별 기능 진입 | SS | SS | SS | SS | SS | dashboard map/entry path 는 서비스 라우팅 자산. 공통화 대상 아님(§13) |
| 9 | 상태 메타데이터(가입일/승인일) | NI | NI | NI | NI | FC | view model 에 `joinedAt`·`approvedAt` 슬롯 존재. 실제 표시는 PH `/join/status` 만(다른 4서비스는 소비 API 없음 — §21 backend 신설 금지) |
| 10 | membership 없음(none) 상태 | FC | FC | FC | SS | FC | Neture 는 단일 가입 화면이 없어 가입 CTA 없음(§23 신규 화면 생성 금지) |
| 11 | pending/rejected 사용자 UX | FC | FC | FC | FC | FC | 공통 `MembershipStatusNotice` 로 5벌 마크업 수렴 |
| 12 | role/membership 기반 visibility | SS | SS | SS | SS | SS | Guard/Route 계층. §12 상 판정은 서비스 소관, 표시만 공통 |
| 13 | Home/Navigation 진입 | OOS | OOS | OOS | OOS | OOS | 선행 WO(SHELL-LAYOUT / HOME-HUB COMMONIZATION)에서 이미 공통화 완료 |
| 14 | empty/loading/error | FC | FC | FC | FC | FC | gate loading 문구 공통화, 오류는 각 화면 기존 계약 유지 |
| 15 | mobile UX | FC | FC | FC | FC | FC | `MembershipStatusNotice` 가 `flex-wrap`·`max-w` 기반 단일 반응형 마크업 |
| 16 | 서비스별 membership extension | SS | SS | SS | SS | SS | override(`overrides` prop) + actions 주입으로 흡수. 공통 View 내부 분기 0 |

집계: 미조사 **0** · `VIEW_DUPLICATED` **0** · `CORE_ONLY` **0** → §24/§32 기준 충족.

---

## 4. API / data source

| 축 | source | 비고 |
|---|---|---|
| membership status | `user.memberships[].status` (로그인 응답) → `getServiceMembershipStatus(user)` | `@o4o/auth-utils` SSOT. 본 WO 에서 변경 없음 |
| role | `user.roles[]` (`role_assignments` 파생) | F9 RBAC SSOT. 변경 없음 |
| PH 가입 상태 상세 | `GET /api/v1/pharmacy-hub/join/status` | 기존 계약 그대로 소비 |
| 신규 API | **없음** | §21 준수 |

로그인 API 는 해당 serviceKey 의 `service_memberships` row 존재를 전제하므로, 로그인 상태 사용자는 항상 membership row 를 갖는다 → `none` 은 주로 미가입/게이트 경로에서 나타난다.

---

## 5. Before / After

**Before**

- `MembershipGate` 5벌이 각자 `STATUS_MESSAGES` 표 + 안내 화면 마크업을 복제. KPA/PH 는 인라인 CSS 객체, KCos 는 lucide 아이콘 + 하드코딩 `bg-pink-600`.
- 역할 라벨 해석 루프(우선순위 매칭)가 Neture·PH 에 각각 복제, KPA 는 인라인 삼항, KCos 는 `ROLE_LABELS[user.roles[0]]`(배열 순서 의존 결함).
- GlycoPharm `MyPageHub` 는 상태 축을 `users.status`(AuthContext 기본값 `'approved'`)로 표시 — `service_memberships.status` 와 축 불일치.

**After**

- 상태 표현·안내 화면·역할 라벨 해석이 `@o4o/account-ui` 3개 자산으로 수렴. 서비스 파일에는 서비스명·경로·사전·우선순위만 남음.
- KCos 배열 순서 결함, GlycoPharm 축 드리프트 교정.
- KPA·Neture·PH My Page 에 서비스 가입 상태 표시 추가(기존 미표시).

---

## 6. 공통 Membership/Role Core (신규 package 0)

전부 기존 `@o4o/account-ui` 내부 (§7 준수).

| 파일 | 역할 |
|---|---|
| `packages/account-ui/src/adapters/membershipNormalizers.ts` | 상태/역할 → 최소 view model. `DEFAULT_MEMBERSHIP_STATUS_CONFIG` · `DEFAULT_MEMBERSHIP_STATUS_NOTICE` · `resolveMembershipStatusConfig` · `resolveMembershipStatusNotice` · `resolveRoleLabel` · `resolveRoleLabels` · `buildMembershipViewModel` · `MEMBERSHIP_SERVICE_TOKEN` |
| `packages/account-ui/src/components/MembershipStatusBadge.tsx` | 상태 배지 (내부적으로 기존 `RoleBadge` 재사용 — §8) |
| `packages/account-ui/src/components/MembershipStatusNotice.tsx` | 상태 안내 화면/인라인 카드. prop 주입 actions |
| `packages/account-ui/src/index.ts` | 공개 export |

**§12 anti-hardcoding 자체 점검 (부기 G)** — 커밋 전 실행:

```
grep -nE "serviceKey|kpa|glycopharm|cosmetics|neture|pharmacy|role ===|status ===" \
  packages/account-ui/src/components/MembershipStatusNotice.tsx \
  packages/account-ui/src/components/MembershipStatusBadge.tsx \
  packages/account-ui/src/adapters/membershipNormalizers.ts
```

결과 (2건, 전부 §12 정책 설명 **주석**):

```
MembershipStatusNotice.tsx:10: *    - status 문자열 분기·serviceKey·서비스명·역할 문자열을 여기에 두지 않는다 (§12).
membershipNormalizers.ts:12: *   - 서비스명·serviceKey·역할 문자열을 이 파일에 하드코딩하지 않는다 (§12).
```

코드 레벨 분기 매칭 **0건** → §12 PASS.

---

## 7. status mapping

`service_memberships.status` enum 을 **재설계하지 않는다** (§10 / F11). 표현만 매핑.

| status | label | tone |
|---|---|---|
| `none` | 미가입 | slate |
| `pending` | 승인 대기 | amber |
| `active` | 승인됨 | emerald |
| `rejected` | 반려됨 | rose |
| `suspended` | 이용 정지 | rose |
| `withdrawn` | 탈퇴 | slate |

미지 상태는 라벨을 삼키지 않고 원문 + slate 로 표시한다.

서비스 override 는 2곳뿐:
- PH `/join/status`: `none` → `신청 전` (가입 신청 화면 맥락)
- PH `MembershipGate`: pending/rejected/suspended/withdrawn/none 문구를 PH 운영자 안내 톤으로 교체

---

## 8. role mapping / display

- 공통은 **우선순위 해석 규칙**만 제공(`resolveRoleLabel(roles, { labels, priority, fallback })`).
- 사전(`ROLE_LABELS`)·우선순위 배열은 각 서비스 소관으로 남긴다(§11 role hierarchy 변경 금지).

| 서비스 | 사전 | 우선순위 | fallback |
|---|---|---|---|
| KPA | `KPA_ROLE_LABELS`(admin/officer) | `KPA_ROLE_PRIORITY` | 회원 |
| GlycoPharm | `roleLabels` (MyPageHub) | `GLYCOPHARM_ROLE_PRIORITY` | `roles[0]` |
| K-Cosmetics | `ROLE_LABELS` (AuthContext) | `KCOSMETICS_ROLE_PRIORITY` | 사용자 |
| Neture | `ROLE_LABELS` (config/dashboard) | `NETURE_ROLE_PRIORITY` | 사용자 |
| Pharmacy-Hub | `ROLE_LABELS` (config/service) | `PHARMACY_HUB_ROLE_PRIORITY` | 회원 |

기존 계정에서 렌더되는 문자열은 KCos(결함 교정분) 외 종전과 동일하다.

---

## 9. pending / rejected UX

- 공통 `MembershipStatusNotice` 단일 마크업. 제목/문구/아이콘/배지/액션 전부 prop.
- 액션은 서비스가 주입: KPA `가입 신청하기`(`/member/apply`), Glyco(`/apply`), KCos(`/partners/apply`), PH(`/join/status` 반려 사유 확인), 공통 `홈으로 돌아가기`.
- rejected 사용자는 차단 문구만 보지 않고 다음 행동(재검토 요청/사유 확인) 경로를 갖는다 (§14).

---

## 10. membership 없음(none) UX

- `membershipExists = status !== 'none'`.
- KPA/Glyco/KCos/PH: 가입 신청 CTA 노출.
- **Neture: SERVICE_SPECIFIC** — 단일 가입 신청 화면이 존재하지 않는다(공급자/파트너 등 역할별 온보딩 분기). §23 에 따라 이번 WO 에서 신규 가입 화면을 만들지 않고 홈 복귀 액션만 둔다. 후속 후보로 §18 에 기록.

---

## 11. role-based entry

- 진입 경로 결정(dashboard map, entry path)은 서비스 라우팅 자산으로 유지(§13). 공통화하지 않았다.
- dead role entry 확인: KPA `/mypage` · Glyco `/mypage` · KCos `/mypage` · Neture `/mypage` · PH `/account`·`/join/status` 모두 실제 route 존재. 없는 서비스에 메뉴를 새로 만들지 않았다.

---

## 12. Service Extension

- 확장점 3개: `overrides`(배지 표현) · `overrides`(안내 문구) · `actions[]`(행동).
- 서비스 고유 값(서비스명·경로·문구)은 전부 주입. 공통 View 내부에 서비스 식별자 분기 **0**.
- `MEMBERSHIP_SERVICE_TOKEN`(`{service}`) 치환으로 공통 문구에 서비스명을 하드코딩하지 않는다.

---

## 13. 5서비스 adoption

| 서비스 | 변경 파일 | 판정 |
|---|---|---|
| KPA-Society | `components/auth/MembershipGate.tsx`, `pages/mypage/MyDashboardPage.tsx` | ADOPTED |
| GlycoPharm | `components/auth/MembershipGate.tsx`, `pages/mypage/MyPageHub.tsx` | ADOPTED (+축 교정) |
| K-Cosmetics | `components/auth/MembershipGate.tsx`, `pages/mypage/MyPageHub.tsx` | ADOPTED (+결함 교정) |
| Neture | `components/auth/MembershipGate.tsx`, `config/dashboard.ts`, `pages/mypage/MyPageHub.tsx` | ADOPTED |
| Pharmacy-Hub | `components/MembershipGate.tsx`, `pages/JoinStatusPage.tsx`, `pages/account/MyProfilePage.tsx` | ADOPTED |

K-Cosmetics 브랜드 색: 하드코딩 `bg-pink-600` 제거 후 공통 `bg-primary-600` 사용. KCos Tailwind `primary-600 = #db2777`(pink) 이므로 렌더 색 동일 — 5서비스 모두 `packages/account-ui/src/**` 를 content glob 에 포함하고 `primary` 스케일을 정의함을 확인.

---

## 14. desktop / mobile

| viewport | 검증 서비스 | 결과 |
|---|---|---|
| desktop 1440x900 | KPA / GlycoPharm / K-Cosmetics / Neture / Pharmacy-Hub | PASS |
| mobile 390x844 | KPA / GlycoPharm / K-Cosmetics / Neture / Pharmacy-Hub | PASS |

mobile 은 검증한 전 화면에서 `document.documentElement.scrollWidth === clientWidth` 로 가로 overflow 0 을 확인했다.

| 서비스 | 경로 | mobile scrollWidth / clientWidth | 배지 렌더 |
|---|---|---|---|
| KPA-Society | `/mypage` | 375 / 375 | `관리자`(53x24) + `승인됨`(53x24) 한 줄 |
| GlycoPharm | `/mypage` | 382 / 382 | `운영자` + `승인됨` |
| K-Cosmetics | `/mypage` | 375 / 375 | `관리자` + `승인됨` |
| Neture | `/mypage` | 375 / 375 | `관리자` + `승인됨` |
| Pharmacy-Hub | `/join/status` | 375 / 375 | 상태 배지 47x20 |
| Pharmacy-Hub | `/account` | 375 / 375 | `서비스 가입 상태` / `승인됨` |
| Pharmacy-Hub | `/community` (미인증 gate) | 375 / 375 | 공통 `MembershipStatusNotice` |

mobile 에서 배지 줄바꿈 깨짐·잘림·네비게이션 소실 없음.

---

## 15. production browser

검증 도구: Playwright MCP · 실제 production 도메인 · 실제 렌더 문자열 판정 (스냅샷 아님).

| # | 서비스 | URL | 확인한 실제 렌더 문자열 | 판정 |
|---|---|---|---|---|
| 1 | KPA-Society | `https://kpa-society.co.kr/mypage` | `관리자` · `승인됨` | PASS (아래 결함 교정 후) |
| 2 | GlycoPharm | `https://glycopharm.co.kr/mypage` | `운영자` · `승인됨` · 역할 `운영자` · 상태 `승인됨` | PASS |
| 3 | K-Cosmetics | `https://k-cosmetics.site/mypage` | `관리자` · `승인됨` · 역할 `관리자` · 상태 `승인됨` | PASS |
| 4 | Neture | `https://neture.co.kr/mypage` | `관리자` · `승인됨` | PASS |
| 5 | Pharmacy-Hub | `https://pharmacyhub.co.kr/join/status` | 가입 상태 배지 (override `신청 전` 계약 포함) | PASS |
| 6 | Pharmacy-Hub | `https://pharmacyhub.co.kr/account` | `서비스 가입 상태` / `승인됨` / `서비스 관리자` | PASS |
| 7 | Pharmacy-Hub | `https://pharmacyhub.co.kr/community` (미인증) | 공통 `MembershipStatusNotice` — `로그인이 필요합니다` + 안내문 + `로그인`/`가입 신청` 액션 | PASS |

### 15-1. production 브라우저 검증에서 발견·교정한 결함 1건

- **증상**: `kpa:admin` · `kpa:operator` 를 보유한 계정의 `/mypage` 역할 배지가 `회원` 으로 렌더됨.
- **원인**: `services/web-kpa-society/src/pages/mypage/MyDashboardPage.tsx` 의 `KPA_ROLE_LABELS` 사전 키가 접두사 없는 `admin` / `officer` 였다. KPA 실제 role 문자열은 service-prefixed (`kpa:admin` 등, SSOT = `lib/role-constants.ts`) 이므로 사전 매칭이 전부 실패해 fallback `회원` 이 노출됐다. localStorage `admin-auth-storage` 의 JWT 를 디코드해 roles 배열이 전부 service-prefixed 임을 확인했다.
- **교정(최소 수정)**: 사전 키를 `ROLES` canonical 값으로 정렬하고 우선순위는 로그인 redirect 와 동일한 `KPA_ROLE_PRIORITY` 를 재사용. legacy 무접두 키는 하위호환으로 유지. role 체계·membership enum 자체는 변경하지 않았다 (F9 / F11).
- **교정 commit**: `d05fd8a28` → 재배포 run `32318165692` (`deploy-kpa-society` success) → production 재검증 결과 `관리자` · `승인됨` 렌더 확인.

### 15-2. 범위 밖 관측 (교정하지 않음)

| 관측 | 성격 |
|---|---|
| 미로그인 상태 `/api/v1/auth/me` · `/api/v1/auth/refresh` 401 | 정상 동작 (인증 전) |
| KPA `/api/v1/kpa/legal/documents/published/terms\|privacy` 404 | 기존 상태 (법적 문서 미게시) — 본 WO 범위 밖 |
| Pharmacy-Hub `/store-owner` 의 `상태 조회 실패` 배지 | **다른 축**이다. `service_memberships.status` 가 아니라 매장 조직 연결 상태(`StoreHomeStatusCard`, WO-O4O-MY-STORE-HOME-STORE-STATUS-CARD-...) 이며 토큰 만료로 dashboard API 가 401 을 반환한 결과다. 본 WO 범위 밖 |

---

## 16. production write 여부

**write 0** (§27).

- role / membership status 변경 **0건**
- 승인·반려·상태 강제 변경 **0건**
- 검증은 기존 테스트 계정의 현재 상태를 read-only 로만 사용

---

## 17. backend / DB / schema

| 항목 | 결과 |
|---|---|
| DB schema 변경 | 없음 |
| migration | 없음 |
| entity 변경 | 없음 |
| backend route/controller 변경 | 없음 |
| enum 재설계 | 없음 (F11 준수) |
| role hierarchy 변경 | 없음 (F9 준수) |

이번 WO 는 **프론트엔드 표현 계층 전용**이다.

---

## 18. 잔존 followup

| # | 항목 | 성격 | 제안 |
|---|---|---|---|
| 1 | Neture `none` 상태 가입 동선 부재 | SERVICE_SPECIFIC | 별도 WO — Neture 역할별 온보딩 진입 설계 |
| 2 | 상태 메타데이터(가입일/승인일) 노출이 PH 만 가능 | backend 계약 부재 | 별도 WO — membership 메타 조회 계약 (§21 로 이번 범위 밖) |
| 3 | PH `MyProfilePage` 복수 역할 단일 표시 | 기존 UX 유지 판단 | 필요 시 별도 WO |
| 4 | Requests / Settings 영역 | 다른 트랙 경계(§6·§19) | 침범하지 않음 |

---

## 19. MUST_FIX_BEFORE_CLOSE

**잔존 0건.**

| # | 항목 | 상태 |
|---|---|---|
| 1 | KPA `/mypage` 역할 배지가 `회원` 으로 오표시 (§15-1) | **RESOLVED** — `d05fd8a28` 배포 후 production 재검증 `관리자` 확인 |

§18 의 followup 4건은 모두 `SERVICE_SPECIFIC` 또는 다른 트랙 경계이며 MUST_FIX 가 아니다.

---

## 20. CHECK / commit / push

| # | commit | 내용 | 배포 run |
|---|---|---|---|
| 1 | `55dc0c814` | `@o4o/account-ui` membership/role 표시 Core 신설 + 5서비스 adoption | `32317473547` (6 job success) |
| 2 | `d05fd8a28` | KPA 역할 라벨 사전 canonical 정렬 (§15-1 결함 교정) | `32318165692` (`deploy-kpa-society` success) |
| 3 | 본 CHECK 문서 커밋 | CHECK 20항목 기록 | 배포 불필요 (docs) |

Git 규율:

- `git add .` 미사용 — **path-specific stage 만** 사용
- 다른 세션의 dirty / untracked 파일 미접촉 (`apps/api-server/src/controllers/forum/ForumCommentController.ts` 등 포함)
- push 된 커밋 amend / force-push 없음 (선행 커밋과 충돌 시 `git rebase origin/main` 후 fast-forward push)
- 신규 package 생성 0 (§7) — 확장은 `@o4o/account-ui` 내부에서만

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건 (§18)
