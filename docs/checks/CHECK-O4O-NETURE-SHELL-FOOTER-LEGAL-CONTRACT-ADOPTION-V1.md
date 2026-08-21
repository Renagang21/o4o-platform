# CHECK-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1

- **WO**: `docs/work-orders/WO-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md`
- **선행**: `docs/checks/CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md` (census) · R1 선례 `d783843f2` (KPA PlatformFooter)
- **작업 기준점**: `origin/main` = `1acbbb001` (WO 부기의 `ea3e79165` 이후 main 이 진행됨 — 현재 코드 기준으로 재확인)
- **판정**: **PASS** (범위 내 3 shell 채택 완료 · production 배포 후 확인은 미실시)
- **일자**: 2026-08-21

---

## 1. 현재 main 모집단 재확인 결과 (§4)

`services/web-neture/src` 에서 `<footer` 를 가진 **layout shell 은 6개**다 (page 파일 8개는 shell 이 아니므로 대상 외).
선행 census 의 "3건" 은 **대상 3건**을 의미하며, 실제 인라인 footer 는 4건(대상 3 + AdminVault)이다.

| # | layout | mount (App.tsx) | shell | footer 방식 | 수정 전 legal info | terms | privacy | contact/support |
|---|---|---|---|---|---|---|---|---|
| 1 | `MainLayout` | 공개 route 다수 | public | inline + `PublicLegalFooterInfo` | **있음 (canonical 기준)** | `/terms` | `/privacy` | 없음 |
| 2 | `NetureLayout` | 공개 route 다수 | public | inline + `PublicLegalFooterInfo` | **있음 (canonical 기준)** | `/terms` | `/privacy` | `/contact` |
| 3 | `SupplierSpaceLayout` | `:844` `/supplier/*` | supplier | inline | 없음 | 없음 | 없음 | `/contact` |
| 4 | `PartnerSpaceLayout` | `:951` `/partner/*` | partner | inline | 없음 | 없음 | 없음 | `/contact` |
| 5 | `SupplierOpsLayout` | `:1035` `/workspace/*` | operator/admin | inline | 없음 | 없음 | 없음 | **없음** |
| 6 | `AdminVaultLayout` | `:1019~1022` `/admin-vault/*` (`ProtectedRoute allowedRoles={ADMIN_ROLES}`) | admin vault | inline | 없음 (법정 요소 전무) | 없음 | 없음 | 없음 |

→ **이번 WO 대상 = 3·4·5** (셋 다 route 에 mount 되어 있어 dead code 아님 — §14 중단 사유 해당 없음).
→ 6번 `AdminVaultLayout` 처리는 §13(범위 밖) 참조.

---

## 2. 수정 전 footer 상태 (§13-3)

- `SupplierSpaceLayout` / `PartnerSpaceLayout`
  `© 2026 Neture. 공급자 · 파트너 협업 플랫폼` + `Contact Us`(`/contact`) 1개만.
  두 파일 모두 `/about` dead link 를 제거한 선행 WO 주석이 남아 있다 (없는 route 를 링크로 노출한 것이 이미 결함으로 처리된 영역).
- `SupplierOpsLayout`
  좌측 2줄 구조(`© 2026 Neture. 공급자·파트너 연결 서비스` + `o4o 플랫폼 소개`·`메인으로`) + 우측 `포럼`.
  `/contact` 조차 없었다.

---

## 3. Neture canonical legal source (§5)

**이미 존재한다. 새로 만들지 않았다.**

| 항목 | 값 |
|---|---|
| component | `PublicLegalFooterInfo` (`@o4o/shared-space-ui`) |
| loader | `services/web-neture/src/lib/footerLegal.ts` → `createFooterLegalLoader` |
| serviceKey | `"neture"` |
| 기존 소비처 | `MainLayout.tsx` · `NetureLayout.tsx` |
| backend | `GET /api/v1/public/services/neture/footer-legal` |
| 정책 근거 | `pages/ContactPage.tsx` 주석 — "공개 화면 법정정보 표기는 Footer 의 `PublicLegalFooterInfo` 만 담당" |

계약: 미설정/비활성/오류 → `null` 반환(아무것도 렌더하지 않음, silent). 이 계약을 그대로 따랐다(§8).

---

## 4. 법정 route 실재 확인 (§9)

`services/web-neture/src/App.tsx` 실측.

| 항목 | Neture route | App.tsx | 확인 |
|---|---|---|---|
| 이용약관 | `/terms` | `:752` `TermsPage` | 실재 |
| 개인정보처리방침 | `/privacy` | `:753` `PrivacyPage` | 실재 |
| 문의 | `/contact` | `:747` `ContactPage` | 실재 |
| 고객지원 | `/support` | — | **route 없음 → 채택하지 않음** (§6.3) |

> **R1(KPA) 과 다르다.** KPA 의 이용약관은 `/policy` 였고 Neture 에는 `/policy` route 가 없다.
> KPA 값을 복사했다면 새 404 를 만들었을 지점이다(§9 "다른 서비스 route 복사 금지").

기존에 있던 `/forum` (`:756`) · `/guide/o4o-overview` (`:781`) 링크도 실재 확인 후 그대로 보존했다.

---

## 5. 각 shell 채택 방식 (§6·§7)

원칙: **기존 layout·마크업 유지 + 동일 canonical legal source 소비**.
공통 `NetureShellFooter` 같은 신규 abstraction 은 만들지 않았다(§6.2).

| shell | 채택 내용 |
|---|---|
| `SupplierSpaceLayout` | 좌측 copyright 를 `div` 로 감싸 그 아래 `PublicLegalFooterInfo` 추가 · 우측 링크에 `/terms`·`/privacy` 추가(`/contact` 는 기존 유지) |
| `PartnerSpaceLayout` | 동일 (supplier 와 코드가 비슷해도 shell 통합하지 않음 — §7.2) |
| `SupplierOpsLayout` | **좌측 2줄 구조 보존**하고 그 아래에 `PublicLegalFooterInfo` 추가 · 우측 `포럼` 단독 링크를 링크 그룹으로 감싸 `/terms`·`/privacy`·`/contact` 추가 |

- 링크는 세 shell 모두 기존과 동일하게 `react-router` `Link` 사용(SPA 유지, §9).
- 색상·spacing·문구·sidebar·navigation·guard 는 변경하지 않았다.

---

## 6. 변경 파일

```
services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx
services/web-neture/src/components/layouts/PartnerSpaceLayout.tsx
services/web-neture/src/components/layouts/SupplierOpsLayout.tsx
docs/checks/CHECK-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md (본 문서)
```

`git diff --stat` = 3 files, +58 / −5. route·schema·API·package.json 변경 0.

---

## 7. terms / privacy / contact 최종 route

```
이용약관        /terms
개인정보처리방침  /privacy
문의            /contact   (Contact Us)
고객지원         채택 안 함 (route 부재)
```

---

## 8. hard-code / placeholder 잔존 여부 (§8·§11.1)

- 새로 추가한 법정정보 하드코딩 **0건**. 사업자등록번호·대표자·주소·통신판매업번호 등은 전부 `PublicLegalFooterInfo` 가 API 값으로만 렌더한다.
- `href="#"` — 세 layout 및 `services/web-neture/src/components/layouts/**` 전체에서 신규 0건 · 잔존 0건 (grep 확인).
- `git diff --check` PASS (whitespace 오류 없음).

---

## 9. typecheck / build (§11.1)

```
pnpm --filter '@o4o/web-neture^...' run build   # 의존 workspace 패키지 선행 빌드
pnpm --filter @o4o/web-neture build             # tsc && vite build
→ ✓ built in 34.45s (tsc 에러 0)
```

- worktree 에 `node_modules` 가 없어 `pnpm install --frozen-lockfile` 선행 (lockfile 변경 0).
- 전체 저장소 build 는 수행하지 않았다(§11.1 워크스페이스 필터).

---

## 10. Browser smoke (§11.2)

**환경 = 로컬 preview** (`vite preview` :4183, production build 산출물). API 는 `https://api.neture.co.kr`.
localhost origin 은 CORS 허용 대상이 아니어서 로그인 검증을 위해 chromium 을 `--disable-web-security` 로 기동했다(로컬 검증 목적, 코드 변경 아님).

계정: `docs/local/TEST-ACCOUNTS.local.md` — Neture 공급자 `renagang21@gmail.com`, Neture 운영자 `sohae2100@gmail.com`.

| shell | route | viewport | footer 표시 | footer 링크(href 실측) | layout | console error |
|---|---|---|---|---|---|---|
| Supplier | `/supplier/dashboard` | 1280×900 | 표시 | `/terms` `/privacy` `/contact` | 정상 | 0 |
| Supplier | `/supplier/dashboard` | 390×844 | 표시 | `/terms` `/privacy` `/contact` | 정상 | 0 |
| Partner | `/partner/dashboard` | 1280×900 | 표시 | `/terms` `/privacy` `/contact` | 정상 | Partner HUB 데이터 fetch 401 (footer 무관·기존 이슈) |
| Partner | `/partner/dashboard` | 390×844 | 표시 | `/terms` `/privacy` `/contact` | 정상 | 상동 |
| Operator | `/workspace/my-content` | 1280×900 | 표시 | `/guide/o4o-overview` `/` `/forum` `/terms` `/privacy` `/contact` | 정상(2줄 구조 유지) | 0 |
| Operator | `/workspace/my-content` | 390×844 | 표시 | 상동 | 정상 | 0 |

법정 route 진입:

| route | 결과 |
|---|---|
| `/terms` | 200 렌더 — `이용약관` 화면. 본문은 "현재 공개된 문서가 없습니다"(정책 문서 미게시 = 기존 데이터 상태, route 404 아님) |
| `/privacy` | 200 렌더 — 동일 |
| `/contact` | 200 렌더 — 문의 폼 정상 |

- **routing 404 = 0.** 콘솔에 보이는 404 는 `/api/v1/public/services/neture/policies/{terms,privacy}` 응답(문서 미게시)이며 route 문제가 아니다. 이는 이번 변경 범위 밖(§10 "법정문서 내용 자체").
- 법정정보 블록 자체는 로컬에서 렌더되지 않는다 — `PublicLegalFooterInfo` 의 정상 계약 동작(§8). placeholder 로 메우지 않았다.

---

## 11. Public footer 회귀 (§12)

| footer | legal source | serviceKey | loader |
|---|---|---|---|
| `MainLayout` (public) | `PublicLegalFooterInfo` | `neture` | `loadFooterLegal` |
| `NetureLayout` (public) | `PublicLegalFooterInfo` | `neture` | `loadFooterLegal` |
| `SupplierSpaceLayout` | `PublicLegalFooterInfo` | `neture` | `loadFooterLegal` |
| `PartnerSpaceLayout` | `PublicLegalFooterInfo` | `neture` | `loadFooterLegal` |
| `SupplierOpsLayout` | `PublicLegalFooterInfo` | `neture` | `loadFooterLegal` |

→ **법정정보 축 동일**, UI shell 은 개별 유지. public footer 파일은 이번에 수정하지 않았다(회귀 없음).

---

## 12. 미확인 항목

1. **Production 배포 후 확인 — 미실시.** 본 커밋은 배포 전이므로 `neture.co.kr` 의 shell footer 에는 아직 이번 변경이 반영되어 있지 않다. 위 §10 은 **로컬 preview smoke** 이며 production smoke 가 아니다.
2. **법정정보 블록의 실제 값 렌더 — 미확인.** 로컬 CORS 및 `PublicLegalFooterInfo` 의 null 계약으로 값이 표시되지 않는다. `service_legal_profiles` 의 `neture` 프로필이 활성일 때의 실제 표시 모양은 배포 후 production 에서만 확인 가능하다.
3. `/terms`·`/privacy` 정책 **본문**은 현재 미게시 상태("현재 공개된 문서가 없습니다"). 링크·route 는 정상이나 문서 내용은 이번 WO 범위 밖(§10).
4. Partner dashboard 의 데이터 fetch 401 은 테스트 계정 권한 문제로 보이며 footer 와 무관. 조사하지 않았다(범위 밖).

미검증 항목을 PASS 로 기록하지 않았다.

---

## 13. 범위 밖 항목

### 13-A. `AdminVaultLayout` — **이번 WO 에서 제외** (근거 명시)

4번째 인라인 footer 이지만 법정 계약을 편입하지 **않았다**. 근거:

1. 선행 census 가 `SERVICE_SPECIFIC` 으로 판정했고, WO §7.3·§10 이 이 구조의 재설계를 금지한다.
2. 이 footer 에는 브랜드·copyright 등 **상업적/공개적 표기 요소가 전혀 없다** (`o4o Admin Vault - 설계 보호 구역` + `Authorized: {user?.email}`). 법정정보를 얹으면 문구 성격이 바뀌어 사실상 구조 변경이 된다.
3. `/admin-vault/*` 는 `ProtectedRoute allowedRoles={ADMIN_ROLES}` 뒤의 **내부 설계보호 구역**으로, 공급자·파트너·운영자 업무 shell 과 달리 공개 법정정보 표기 대상 화면으로 볼 근거가 없다.
4. WO 본문이 지목한 대상은 supplier / partner / operator 3건이다.

→ 공개 표기 대상 여부를 정책으로 확정하려면 **별도 WO** 가 필요하다(이번 작업에서 임의 판단하지 않음).

### 13-B. 그 외 손대지 않은 항목

Neture Header · supplier/partner shell 통합 · navigation · role/permission · 인증 · service switch · `NetureBottomNav`(MobileBottomNav) · PharmacyHub Header/Footer · KPA Footer · GlycoPharm Footer · 공개 Footer 디자인 · 법정문서 schema/API · 법정문서 내용.
dead component 는 발견해도 삭제하지 않았다.

---

## 14. 완료 선언 범위 (§15)

```
Neture shell footer legal contract adoption 완료
```

만 의미한다. **Header/Footer 전체 공통화 완료가 아니다.**
