# CHECK-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1

- **WO**: `docs/work-orders/WO-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md`
- **실행일**: 2026-08-21
- **기준점**: 작업 시작 시 `HEAD == origin/main == e42b48115` · push 시 origin/main 이 `2a3815c3f` 로 선행하여 rebase 후 재push (최종 commit `d783843f2`)
- **범위**: KPA `PlatformFooter` 의 법정 링크 계약 복구 (**Header/Footer 전체 공통화 아님**)
- **판정**: PASS (browser smoke 는 **로컬 preview 빌드 기준** — 프로덕션 미배포, 아래 §9 참조)

---

## 1. 수정 전 문제

`services/web-kpa-society/src/components/platform/PlatformFooter.tsx` 가 링크 6개를 전부 `href="#"` placeholder anchor 로 렌더했다.

- 정보 그룹 3개 (`:29` 이용약관 / `:30` 개인정보처리방침 / `:31` 문의하기) — WO §6.1 대상
- 서비스 그룹 3개 (`:23` Digital Signage / `:24` Forum / `:25` 콘텐츠 안내)

또한 이 Footer 는 법정정보 블록을 전혀 렌더하지 않아 KPA 공개 Footer 가 이미 채택한 공통 법정 계약(`PublicLegalFooterInfo`)에서 빠져 있었다.

## 2. PlatformFooter 활성 소비 route

`PlatformFooter` 는 `components/platform/InfoPageLayout.tsx:98` 을 통해서만 렌더된다. 활성 소비 페이지 4개와 `App.tsx` 실 route:

| 페이지 | route |
|---|---|
| `pages/services/PharmacyServicePage.tsx` | `/services/pharmacy` (`App.tsx:669`) |
| `pages/services/ForumServicePage.tsx` | `/services/forum` (`:670`) |
| `pages/services/LmsServicePage.tsx` | `/services/lms` (`:671`) |
| `pages/join/PharmacyJoinPage.tsx` | `/join/pharmacy` (`:674`) |

## 3. canonical legal source 확인 결과

새 config 를 만들지 않았다. **같은 서비스 안의 기존 선례를 그대로 재사용**했다.

- `services/web-kpa-society/src/components/Footer.tsx:7,52` — `PublicLegalFooterInfo serviceKey="kpa-society" loadProfile={loadFooterLegal}`
- loader: `services/web-kpa-society/src/lib/footerLegal.ts` (`createFooterLegalLoader`, `@o4o/shared-space-ui`)
- `App.tsx:520-525` `StoreFacingFooter` 도 같은 `loadFooterLegal` + `links={{ terms: '/policy', privacy: '/privacy', contact: '/contact' }}`

canonical 법정 route (KPA):

| 항목 | 경로 | App.tsx |
|---|---|---|
| 이용약관 | `/policy` | `:925` `PolicyPage` |
| 개인정보처리방침 | `/privacy` | `:926` `PrivacyPage` |
| 문의하기 | `/contact` | `:920` `ContactPage` |

**KPA 에는 `/terms` route 가 없다.** 이용약관 canonical 은 `/policy` 다(`/terms` 로 적으면 없던 404 를 새로 만든다).

## 4. 채택 방식

WO §8 (UI 공통화보다 계약 공통화 우선) 에 따라:

1. **링크 3개** — `PublicLegalFooterInfo` 는 약관/개인정보 "링크"를 렌더하지 않으므로(법정정보 블록 전용), 링크는 위 canonical route 로 직접 연결했다. `<a href>` → **react-router `Link`** 로 맞춰 기존 선례(`Footer.tsx`, `StoreFacingFooter`)와 동일하게 SPA 네비게이션을 유지했다.
2. **법정정보 블록** — copyright 영역에 `PublicLegalFooterInfo serviceKey="kpa-society" loadProfile={loadFooterLegal} linkColor="#94a3b8"` 를 삽입해 공통 계약에 편입했다. 어두운 배경(`#0f172a`)이므로 `linkColor` 만 보정.

새 Footer 시스템 / 새 legal config / 새 abstraction 생성 **없음**. `styles` 객체·브랜드 문구·색상·spacing·`InfoPageLayout` 구조 **불변**(추가된 `styles.legalInfo` 는 신규 블록 여백 전용).

## 5. 변경 파일

```text
services/web-kpa-society/src/components/platform/PlatformFooter.tsx   (수정)
docs/checks/CHECK-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md (신규)
```

`InfoPageLayout` · `Footer.tsx` · `footerLegal.ts` · `App.tsx` · `packages/shared-space-ui` **미변경**. route/schema **미변경**.

## 6. `href="#"` 제거 결과

```bash
grep -c 'href="#"' services/web-kpa-society/src/components/platform/PlatformFooter.tsx
# → 0
```

6개 전부 제거했다(§9 "PlatformFooter 내 href=\"#\" 0" 충족). 판단 근거는 §11 참조.

## 7. terms/privacy/contact 연결 결과

| 라벨 | 변경 전 | 변경 후 | route 실재 |
|---|---|---|---|
| 이용약관 | `href="#"` | `<Link to="/policy">` | `App.tsx:925` ✅ |
| 개인정보처리방침 | `href="#"` | `<Link to="/privacy">` | `App.tsx:926` ✅ |
| 문의하기 | `href="#"` | `<Link to="/contact">` | `App.tsx:920` ✅ |
| Digital Signage | `href="#"` | `<Link to="/guide/features/signage">` | `App.tsx:652` ✅ |
| Forum | `href="#"` | `<Link to="/guide/features/forum">` | `App.tsx:649` ✅ |
| 콘텐츠 안내 | `href="#"` | `<Link to="/guide/features/content">` | `App.tsx:651` ✅ |

6개 모두 **기존에 실재하는 공개 route** 로만 연결했다. 없는 경로를 새로 만들지 않았다.

## 8. typecheck/build

```bash
pnpm install --frozen-lockfile                      # worktree 최초 설치 (Done, 2m24s)
pnpm --filter "@o4o/web-kpa-society^..." run build  # 의존 패키지 빌드 PASS
pnpm --filter "@o4o/web-kpa-society" run build      # tsc && vite build → ✓ built in 43.90s
git diff --check                                    # 출력 없음 (PASS)
```

`build` 스크립트가 `tsc && vite build` 이므로 typecheck 포함. 전체 저장소 build 는 수행하지 않았다(워크스페이스 필터만).

## 9. browser smoke

**프로덕션 미배포 상태**이므로 프로덕션 도메인 검증은 수행하지 않았다(이 커밋이 아직 배포 파이프라인을 타지 않음). 대신 **이번 빌드 산출물(`dist`)을 `vite preview`(localhost:4599) 로 띄워** 실브라우저(Playwright)로 검증했다.

| 항목 | 결과 |
|---|---|
| `/services/forum` (InfoPageLayout) PlatformFooter 표시 | PASS |
| 이용약관 클릭 → `/policy` `PolicyPage` 렌더 | PASS (SPA 전환, 404 없음) |
| `/privacy` → `PrivacyPage` 렌더 | PASS |
| `/contact` → `ContactPage` 렌더 (title "협업과 연결 — KPA Society") | PASS |
| `/guide/features/signage` → "디지털 사이니지 이용 방법" | PASS |
| `/guide/features/forum` → "포럼 이용 방법" | PASS |
| `/guide/features/content` → "콘텐츠 이용 방법" | PASS |
| 404 없음 | PASS (6개 링크 전부) |
| JS exception 없음 | PASS (console error 0) |
| layout 깨짐 없음 | PASS (desktop 1280 / mobile 390×844 `/join/pharmacy` 모두 footer 6링크 정상) |
| 법정정보 블록 표시 | **미표시** — 로컬 preview 에 API backend 가 없어 `loadProfile` → `null`. `PublicLegalFooterInfo` 계약상 정상 동작(silent null). **프로덕션 실값 표시 여부는 미확인.** |

**미확인 항목(숨기지 않고 명시)**

- 프로덕션 KPA 도메인에서의 동작 — 배포 전이라 검증 불가.
- 프로덕션 `service_legal_profiles` 의 `kpa-society` 법정정보 실값 렌더 — 위와 동일 사유. 단 기존 `Footer.tsx` 가 이미 같은 serviceKey/loader 를 쓰고 있어 표시 여부는 이번 변경과 독립적이다(설정 문제이지 코드 문제가 아니다).
- `/policy` · `/privacy` 본문은 로컬에서 "문서를 불러오지 못했습니다"(API 부재). **route 정상 도달은 확인됨** — 링크 계약 검증 목적은 충족.

## 10. 회귀 결과

기존 KPA 공개/매장 Footer 와 `PlatformFooter` 가 **동일 canonical 을 향한다**.

| 소비처 | 이용약관 | 개인정보 | 문의 | legal loader |
|---|---|---|---|---|
| `components/Footer.tsx` (공개) | `/policy` | `/privacy` | `/contact` | `loadFooterLegal` |
| `StoreFacingFooter` (`App.tsx:524`) | `/policy` | `/privacy` | `/contact` | `loadFooterLegal` |
| `PlatformFooter` (이번 변경) | `/policy` | `/privacy` | `/contact` | `loadFooterLegal` |

기존 두 Footer 는 **미변경**이므로 회귀 위험 없음. KPA build PASS.

## 11. 범위 밖 항목 / 판단 기록

**(a) §6.1 과 §9 의 범위 차이 — 서비스 링크 3개 처리 판단**

WO §6.1 은 법정 3개만 명시하지만 §9 코드 검증은 "PlatformFooter 내 `href="#"` **0**" 을 요구한다. 두 조건을 모두 만족시키기 위해 서비스 3개도 함께 연결했다. 근거:

- `href="#"` 는 클릭 시 페이지 상단으로만 이동하는 **dead navigation** 이며, 남겨두면 §9 검증이 실패한다.
- 3개 모두 **기존에 실재하는 공개 route** 가 있어 경로를 지어낼 필요가 없었다(`/guide/features/{signage,forum,content}`). 라벨-대상 의미도 일치한다.
- 직전 트랙의 `/member/apply` dead navigation 결함 재발 방지 원칙에 따라, 대응 route 가 없었다면 연결하지 않았을 것이다.
- 이는 링크 대상 지정일 뿐 route 체계 변경(§7 금지)이 아니다.

**(b) 이번 WO 에서 손대지 않은 것 (§7 / §14)**

- Neture Footer, MobileBottomNav 공통화, PharmacyHub Header/Footer — **미수정, 후속 과제로 남김**.
- `PlatformHeader` 의 `href="#services"` / `href="#about"` — 같은 파일이 아니고 anchor 로서 유효(`PlatformFooter` 에 `id="about"` 존재). 이번 범위 밖.
- GlycoPharm `© 2025` stale — 선행 CHECK 지적 사항이나 이번 범위 밖.
- dead component 삭제, KPA layout 리팩터링, 법정문서 DB/schema, route 체계 변경 — 수행하지 않음.

**(c) 완료 선언 범위**

이번 완료는 **KPA PlatformFooter legal contract adoption** 만을 의미한다. Header/Footer 전체 공통화 완료가 아니다.

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
