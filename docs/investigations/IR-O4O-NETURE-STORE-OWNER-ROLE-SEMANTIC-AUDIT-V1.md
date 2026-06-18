# IR-O4O-NETURE-STORE-OWNER-ROLE-SEMANTIC-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** Neture `store_owner`(매장 경영자) 가입 유형의 의미·사용처. 제거 가능 여부 / 일반·포럼 회원 치환 여부 판단용.
> **핵심 결론: Neture `store_owner` 는 기능적으로 inert 하다.** 전용 workspace 없음(로그인해도 갈 곳=public 안내 페이지), backend guard/capability 미사용, forum 권한 분기 없음, 운영자 화면에서 '일반 회원(general)'으로 collapse. 참조는 프론트 3파일뿐. **제거(후보 A) 가 가장 안전**, 기존 데이터는 inert legacy 로 잔존 가능(migration 불요). 단 가입 차단은 backend 1줄.
> 선행: IR-O4O-CROSSSERVICE-BUSINESS-ADDRESS-POSTCODE-SEARCH-AUDIT-V1 (store_owner 주소 AddressSearch 후속에서 제외 — 주소 UX 아닌 역할 의미 문제로 재분류)

---

## 1. 목적

Neture 에는 KPA/GlycoPharm/K-Cosmetics 와 달리 '내 매장 / 매장 허브 / 매장 경영자 업무공간' 이 구현되어 있지 않다. 현재 RegisterModal 의 `store_owner` 가입 유형이 실제로 필요한지, 제거 또는 일반/포럼 회원으로 치환 가능한지 조사한다.

## 2. store_owner 정의·정책 (backend 주석)

`auth-register.controller.ts:53-55` 가 정책 선언 역할:

```
// WO-O4O-NETURE-SELLER-LEGACY-CLEANUP-TO-STORE-OWNER-PARTICIPANT-V1:
// 'store_owner' = Neture 내부 participant type (권한 role 아님). 'seller' 는 legacy 호환 유지.
// neture:store_owner role 은 생성하지 않으며 다른 서비스 store_owner 와 연결하지 않는다.
```

→ 설계상 store_owner 는 **권한 role 이 아니라 participant type**. `neture:store_owner` prefixed role 은 생성하지 않음.

## 3. 사용처 매트릭스 (실측)

| 영역 | store_owner 사용 | 근거(file:line) |
|------|:---:|------|
| 가입 UI 카드 '매장 경영자' | ✅ | web-neture/RegisterModal.tsx:40-58 (Icon=Store) |
| 가입 입력 필드 | ✅ | 매장명(companyName)/업종 select/매장지역(businessAddress)/담당자명/연락처. supplier 처럼 조건부 확장 필드 없음(기본만 전송) |
| dashboard 라우트 매핑 | ⚠️ | config/dashboard.ts: `store_owner → /seller/overview` |
| 전용 workspace/대시보드 | ❌ | `/seller/overview` 는 **권한 보호 없는 public 안내 페이지**("매장은 참여자다" 설명). supplier(/supplier/*)·partner(/partner/*) 같은 운영공간 없음 |
| AccountMenu 대시보드 버튼 | ❌ | hasDashboardRole 체크에 store_owner 없음 → 로그인해도 대시보드 메뉴 미노출 |
| Hub 섹션 | ❌ | /workspace/hub roles 에 store_owner 미포함 |
| forum/community 권한 분기 | ❌ | 참조 없음 |
| backend guard/capability | ❌ | `store-owner.utils.ts` STORE_OWNER_ROLES_BY_SERVICE = {kpa,glycopharm,cosmetics} — **neture 없음**. `grep neture:store_owner` = 주석만 |
| operator 회원 표시 | ⚠️ collapse | UsersManagementPage: NETURE_PARTICIPANT_ROLES=['supplier','partner','seller'] — store_owner 미포함 → getPrimaryRole='general'="일반 회원". roleTabs/EditUserModal 옵션에 store_owner 없음 |

**프론트 store_owner 참조 = 단 3파일** (RegisterModal.tsx / config/dashboard.ts / operator/EditUserModal.tsx). 그 외 전무.

## 4. role_assignments 생성 여부

- 가입: `store_owner` 가 service_memberships.role 에 **unprefixed 그대로** 저장.
- 승인(operator-registration.service): admin/operator 만 `neture:` prefix, 나머지는 unprefixed → `role_assignments.role = 'store_owner'` 생성. **`neture:store_owner` 는 생성 안 됨**(정책 일치).
- 단 이 bare `store_owner` RA 는 Neture 어떤 guard 에서도 참조되지 않음(§3) → **권한상 inert**.

## 5. IR 질문 답변

1. **완전 제거 가능?** — 기능적으로 가능. workspace·guard·forum 분기 모두 부재. 로그인 후 갈 곳도 public 안내 페이지뿐.
2. **포럼 회원 구분 필요 시 이름?** — 후보: `member` / `community_member` / `participant` / `forum_member`. 단 **현재 Neture forum 이 role 기반 회원 구분을 요구하는 코드는 없음**(§3) → 당장 치환 필요성 근거 미발견. 필요해질 때 도입이 적절.
3. **store_owner 입력 필드(매장명/업종/매장지역/담당자) 실사용?** — users.businessInfo 에 저장은 되나 **이를 소비하는 store workspace 가 없음** → 저장만 되고 활용 경로 없음.
4. **제거 시 backend/API/DB migration 필요?** — **DB migration 불요.** 가입 차단은 `auth-register.controller.ts:66` NETURE_ALLOWED_SIGNUP_ROLES 에서 'store_owner' 제거 + 에러메시지(71) 1곳. 기존 membership/RA 의 'store_owner' 는 inert 이므로 잔존 허용(legacy fallback) 가능.
5. **가입 유형을 supplier/partner 만 vs +일반회원?** — Neture 가 공급자·파트너 중심이고 store_owner 가 inert 이므로 **supplier/partner 2개만(후보 A)** 가 가장 깔끔. 일반 참여자 수요가 실증되면 그때 'member' 유형 추가(후보 B).
6. **기존 데이터 처리?** — operator 화면이 이미 store_owner→'일반 회원' collapse 하므로 표시 깨짐 없음. migration/표시 변경 불요. legacy fallback(잔존)만으로 충분.

## 6. 철학 vs 구현 tension (주의)

`O4O-BUSINESS-PHILOSOPHY-V1 §3` 는 참여 주체를 **공급자 / 운영사업자 / 매장** 3자로 정의한다. store_owner 가입 유형은 이 '매장' 축의 흔적일 수 있다. 그러나 **Neture 구현에는 매장(store) 측 workspace 가 없다**(매장 실행은 KPA/GlycoPharm/K-Cosmetics 등 서비스별로 구현). 따라서 "Neture 자체 가입에 store_owner 를 두는 것"과 "매장은 서비스별로 실행된다"는 구조가 어긋난다. 제거는 이 어긋남을 정리하는 방향이며, 철학상의 '매장' 개념을 부정하는 것은 아니다(매장은 서비스 측에 존재). → 제거 WO 시 이 근거를 명시할 것.

## 7. 후속 WO 후보

### 후보 A (권장) — store_owner 가입 유형 제거
`WO-O4O-NETURE-STORE-OWNER-SIGNUP-ROLE-REMOVE-V1`
- RegisterModal 에서 '매장 경영자' 카드 + store_owner 분기 입력 필드 제거 → supplier/partner 2개만.
- backend: NETURE_ALLOWED_SIGNUP_ROLES 에서 'store_owner' 제거(신규 신청 차단) + 에러메시지. 기존 데이터는 inert legacy 잔존.
- dashboard.ts / EditUserModal 의 store_owner 잔재 정리(선택).
- DB migration 0.

### 후보 B — store_owner → forum/일반 회원 치환
`WO-O4O-NETURE-STORE-OWNER-TO-FORUM-MEMBER-ROLE-ALIGNMENT-V1`
- '매장 경영자' → '일반 회원/포럼 회원', 사업자 입력 필드 제거, role 값 member 계열 정리, 기존 store_owner legacy alias.
- **단 §5-2 근거상 현재 forum 회원 구분 수요가 코드로 실증되지 않음 → 수요 확인 후 진행 권장.**

**권장:** 사용처가 거의 없으므로 **후보 A(제거)**. 단 실행 전 **기존 neture store_owner 회원 수를 read-only 로 확인**(아래)하여 legacy 잔존 규모 파악.

## 8. 기존 데이터 확인 경로 (read-only, 미실행)

프로덕션 DB 는 방화벽 차단(인터랙티브 `gcloud sql connect` / Cloud Console SQL Editor 만). 본 IR 에서는 미실행(인터랙티브 세션 회피). 후보 WO 착수 시 read-only SELECT 권장(CLAUDE.md §0 read-only 검증 허용):

```sql
-- READ ONLY: Neture store_owner/seller(legacy) 회원 수
SELECT sm.role, COUNT(DISTINCT sm.user_id)::int AS cnt
FROM service_memberships sm
WHERE sm.service_key = 'neture' AND sm.role IN ('store_owner','seller')
GROUP BY sm.role;
```

실행 경로: `gcloud sql connect o4o-platform-db --user=postgres --database=o4o_platform --project=<o4o 프로젝트>` (psql 인터랙티브) 또는 Cloud Console SQL Studio. 코드 경로 확인: `GET /__debug__/user?email=` / `GET /api/v1/operator/members?serviceKey=neture` 응답의 memberships[].role.

## 9. 비범위

- 코드 삭제 / role migration / 가입 UI 변경 / 주소 AddressSearch 적용 / store_owner 명칭 변경 / DB 변경. (전부 본 IR 비범위 — 후속 WO)

## 10. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정적 분석만 (프로덕션 DB SELECT 미실행 — 경로만 문서화)
✅ 산출물 = 본 문서 1개(path-specific), 동시 세션 파일 무간섭
```

---

*read-only · Neture store_owner=inert(workspace 없음·guard 미사용·forum 분기 없음·operator 화면 '일반회원' collapse) · 참조 프론트 3파일뿐 · neture:store_owner RA 미생성(bare store_owner RA 는 inert) · 제거(후보 A) 권장·DB migration 불요·가입차단 backend 1곳 · forum_member 치환(후보 B)은 수요 미실증 → 보류 · 철학 '매장' 축은 서비스별 구현이라 제거와 무모순 · 기존 데이터 read-only SELECT 경로 명시(미실행).*
