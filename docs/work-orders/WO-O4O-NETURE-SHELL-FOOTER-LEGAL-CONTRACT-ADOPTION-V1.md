# WO-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1

## 1. 목적

Neture의 공급자 / 파트너 / 운영 관련 셸에 존재하는 인라인 Footer 3건이 법정정보와 약관 링크 계약에서 빠져 있는 문제를 정리한다.

이번 작업의 목표는 다음이다.

```text
Neture supplier / partner / operator shell
→ 기존 인라인 footer 유지
→ Neture의 canonical legal/footer source 확인
→ terms/privacy/contact 또는 해당 서비스의 정식 legal contract 편입
```

중요:

```text
공급자/파트너/운영 셸 자체를 하나로 통합하지 않는다.
새 Footer 시스템을 만들지 않는다.
법정 계약만 기존 공통 구조에 맞춘다.
```

---

## 2. 선행 조사 기준

선행 완료:

```text
WO-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1

CHECK:
docs/checks/CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md
```

선행 census 결과:

```text
R1 KPA PlatformFooter
→ WO-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1 에서 완료

R2 Neture supplier / partner / operator shell
→ 인라인 footer 3건
→ 법정정보 및 약관 링크 없음
→ 이번 WO 대상
```

선행 조사에서는 공급자 셸 전체 공통화는 권고하지 않았다.

이번 작업에서도 이 판정을 유지한다.

---

## 3. 시작 기준

현재 `origin/main` 최신 상태 기준으로 작업한다.

```bash
git fetch origin
git status -sb
git branch --show-current
git pull --ff-only origin main
```

원칙:

```text
특정 과거 commit을 기준점으로 고정하지 않는다.
다른 세션 WIP를 수정·삭제·stash하지 않는다.
관련 없는 파일은 접촉하지 않는다.
```

작업 전 선행 CHECK와 최근 KPA legal footer 적용 선례도 확인한다.

---

## 4. 대상 모집단 재확인

선행 census의 "3건"을 그대로 믿고 수정에 들어가지 말고 현재 main에서 다시 확인한다.

최소 다음을 찾는다.

```text
Neture supplier shell footer
Neture partner shell footer
Neture operator/admin 관련 shell footer
```

검색 대상 예:

```text
Footer
<footer
copyright
©
terms
privacy
policy
contact
supplier layout
partner layout
operator layout
admin layout
```

각 대상에 대해 기록한다.

| 항목               | 확인 내용                         |
| ---------------- | ----------------------------- |
| component/layout | 실제 파일                         |
| shell            | supplier / partner / operator |
| active route     | 실제 소비 route                   |
| footer 방식        | inline / component            |
| legal info       | 있음/없음                         |
| terms            | 있음/없음                         |
| privacy          | 있음/없음                         |
| contact/support  | 있음/없음                         |

선행 census와 현재 main의 모집단이 달라졌으면 현재 코드를 기준으로 한다.

---

## 5. Canonical Neture legal source 조사

수정 전에 Neture가 현재 정식으로 사용하는 법정정보 source를 확인한다.

최소 조사:

```text
Neture public footer
Neture public legal pages
terms route
privacy route
contact/support route
PublicLegalFooterInfo 사용 여부
footerLegal 계열 loader/config
serviceKey 기반 profile
service-config 기반 legal metadata
```

핵심 질문:

```text
Neture의 법정정보 SSOT는 무엇인가?
```

가능한 경우 우선순위:

```text
1. 이미 사용 중인 공통 legal component
2. 기존 canonical legal loader/config
3. 기존 Neture public footer가 쓰는 동일 source
```

새로운 legal config나 별도 데이터 source를 만들지 않는다.

---

## 6. 구현 원칙

### 6.1 Shell 공통화 금지

이번 작업의 대상은 footer 법정 계약이다.

다음과 같이 확장하지 않는다.

```text
SupplierLayout
PartnerLayout
OperatorLayout
        ↓
하나의 NetureShell로 통합
```

이 구조 변경은 금지한다.

대신:

```text
Supplier footer ─┐
Partner footer  ├─ 동일 canonical legal source
Operator footer ┘
```

정도로 맞춘다.

---

### 6.2 UI보다 계약 공통화 우선

3개 Footer의 UI가 서로 다르면 억지로 동일 component로 만들지 않는다.

허용:

```text
각 Footer의 기존 layout 유지
+ 동일 legal source 소비
```

가능:

```text
작은 공통 LegalFooterInfo component 재사용
```

단, 이미 존재하는 component를 사용하는 경우에만 우선한다.

이번 WO 때문에 신규 범용 Footer abstraction을 만드는 것은 원칙적으로 금지한다.

---

### 6.3 법정 링크

현재 Neture canonical 구조에서 지원되는 항목을 사용한다.

최소 확인:

```text
이용약관
개인정보처리방침
문의 또는 고객지원
```

단, Neture canonical footer가 문의 링크를 별도로 제공하지 않는다면 임의 route를 만들지 않는다.

소스가 실제로 지원하는 범위만 채택한다.

---

## 7. 각 Shell별 처리

### 7.1 Supplier Shell

확인:

```text
현재 footer 내용
브랜드/회사명
copyright
법정링크 유무
```

목표:

```text
기존 supplier shell 구조 유지
+ canonical Neture legal contract 연결
```

---

### 7.2 Partner Shell

동일 원칙을 적용한다.

```text
기존 partner 전용 navigation/layout 유지
footer 법정 계약만 보강
```

Supplier와 코드가 비슷하더라도 이번 WO에서 shell 전체를 합치지 않는다.

---

### 7.3 Operator Shell

운영자 영역의 Footer도 동일 legal source를 사용하게 한다.

단:

```text
AdminVaultLayout
```

등 선행 census에서 `SERVICE_SPECIFIC`으로 판정된 구조를 이번 작업에서 재설계하지 않는다.

Footer 법정정보만 필요한 범위에서 수정한다.

---

## 8. 법정정보 렌더 방식

기존 canonical legal component가 API profile을 불러오고 데이터가 없을 때 `null`을 반환하는 계약이라면 그대로 따른다.

즉:

```text
API 데이터 없음
→ 임의 placeholder 법정정보 렌더 금지
→ 기존 contract의 fallback/null 정책 유지
```

하드코딩 금지 예:

```text
사업자등록번호 임의 입력
대표자 임의 입력
주소 임의 입력
통신판매업번호 임의 입력
```

법정정보는 canonical source에서 가져온 값만 표시한다.

---

## 9. Route 검증

법정 링크를 넣기 전 반드시 route 실재 여부를 확인한다.

확인 예:

```text
terms
privacy
contact/support
```

다음 금지:

```text
href="#"
존재하지 않는 route 추정
다른 서비스 route 복사
external URL 임의 생성
```

가능하면 SPA 내부 링크는 기존 Neture 코드의 navigation 방식과 맞춘다.

예:

```text
react-router Link
또는 현재 프로젝트의 canonical navigation helper
```

---

## 10. 범위 밖

이번 WO에서는 다음을 수정하지 않는다.

```text
Neture Header
Supplier/Partner shell 전체 공통화
AdminVaultLayout 구조
navigation 구조
role/permission
인증
service switch
MobileBottomNav
PharmacyHub Header/Footer
KPA Footer
GlycoPharm Footer
공개 Footer 디자인 재정렬
법정문서 schema/API
법정문서 내용 자체
```

dead component를 발견해도 삭제하지 않는다.

---

## 11. 검증

### 11.1 정적 검증

최소 확인:

```text
3개 active shell footer가 canonical legal source 사용
법정 route가 실제 존재
새 hard-coded legal data 0
placeholder href="#" 신규/잔존 여부
관련 route/schema 변경 0
```

```bash
git diff --check
```

Neture web의 현재 표준 typecheck/build를 수행한다.

---

### 11.2 브라우저 smoke

가능하면 desktop + mobile에서 수행한다.

각 active shell 최소 1개 route:

```text
Supplier
Partner
Operator
```

확인:

```text
footer 표시
layout 깨짐 없음
terms 정상 진입
privacy 정상 진입
contact/support가 계약에 존재하면 정상 진입
404 0
console error 0
```

인증 때문에 특정 shell 진입이 어렵다면:

```text
어느 shell을 왜 검증하지 못했는지
대체로 무엇을 정적으로 확인했는지
```

CHECK에 명확히 기록한다.

프로덕션 미배포라면 preview smoke와 production 미확인을 구분한다.

---

## 12. 회귀 확인

기존 Neture public Footer와 비교한다.

확인:

```text
Public Footer legal contract
Supplier Footer legal contract
Partner Footer legal contract
Operator Footer legal contract
```

목표:

```text
법정정보 source는 동일 canonical 축
UI shell은 필요에 따라 개별 유지
```

---

## 13. CHECK 문서

작성:

```text
docs/checks/CHECK-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md
```

반드시 포함:

```text
1. 현재 main 모집단 재확인 결과
2. 대상 3개 shell/file/route
3. 수정 전 footer 상태
4. Neture canonical legal source
5. 각 shell 채택 방식
6. 변경 파일
7. terms/privacy/contact 최종 route
8. hard-code/placeholder 잔존 여부
9. typecheck/build
10. browser smoke
11. public footer 회귀
12. 미확인 항목
13. 범위 밖 항목
```

---

## 14. 중단 기준

다음 경우 억지로 구현하지 말고 조사 결과를 CHECK에 기록한다.

```text
Neture에 canonical legal source가 실제로 없음
기존 public footer도 법정 계약이 불명확함
legal 적용을 위해 API/schema 변경이 필요함
3개 shell 중 하나가 선행 census와 달리 dead code임
다른 세션 WIP와 직접 충돌함
```

특히 canonical source가 없다면 이번 WO에서 새 정책을 임의로 만들지 않는다.

그 경우 별도 legal contract 정의 WO로 분리한다.

---

## 15. 완료 기준

다음을 만족하면 완료다.

```text
현재 main 기준 Neture 대상 footer 모집단 재확인
active supplier/partner/operator footer 법정 계약 편입
기존 canonical Neture legal source 재사용
새 Footer 시스템 생성 없음
shell 구조 통합 없음
법정정보 hard-code 없음
route/schema 변경 없음
typecheck/build PASS
가능하면 browser smoke PASS
CHECK 작성
commit/push 완료
```

이번 완료는:

```text
Neture shell footer legal contract adoption 완료
```

만 의미한다.

Header/Footer 전체 공통화 완료로 선언하지 않는다.

---

## 16. 작업 종료

```bash
git status --short
git diff --check
```

이번 WO 관련 파일만 path-specific stage 한다.

```bash
git add <이번 WO 관련 파일>
git commit -m "fix(neture): adopt legal contract in shell footers"
git push origin <현재 브랜치>
```

`git add .` 금지.

---

## 17. 최종 보고 형식

최종 보고는 짧게 다음만 포함한다.

```text
1. 재확인한 대상 footer 수
2. canonical Neture legal source
3. shell별 변경 결과
4. terms/privacy/contact 최종 경로
5. hard-code / href="#" 잔존 여부
6. typecheck/build
7. browser smoke
8. 미확인 항목
9. CHECK 경로
10. commit/push
```

이번 작업 중 MobileBottomNav나 PharmacyHub Header/Footer 문제가 보여도 수정하지 않는다.

---

## 부기 (실행 시점 저장소 사실 · 함정)

> 아래는 WO 지시가 아니라 **실행 시점 측정값**이다. §3·§4 지시대로 최신 main 기준으로 재확인한다.
> 부기와 코드가 다르면 **코드가 정답**이다.

### A. 기준점 · 다른 세션 WIP

- 작성 시점 `HEAD == origin/main == ea3e79165`.
- 다른 세션의 미커밋 변경 3건이 있다: `apps/api-server/src/app-manifests/appsCatalog.ts`, `apps/api-server/src/bootstrap/register-routes.ts`, `apps/api-server/tests/multi-tenant/appstore.spec.ts`.
  → §3 대로 접촉 금지. 이번 범위(`services/web-neture/**` + `docs/checks/**`)와 겹치지 않는다. `git add .` 는 이 파일들을 끌어들인다(§16).
- 직전 R1(KPA)은 `d783843f2` 로 완료됐다. 채택 패턴의 선례로 참고할 수 있다.

### B. canonical legal source (§5 답)

Neture 공개 Footer 가 이미 쓰고 있다. **새로 만들 것이 없다.**

- `services/web-neture/src/components/layouts/MainLayout.tsx:36`
  `<PublicLegalFooterInfo serviceKey="neture" loadProfile={loadFooterLegal} />`
- `services/web-neture/src/components/layouts/NetureLayout.tsx:35` — 동일
- loader: `services/web-neture/src/lib/footerLegal.ts`
- `pages/ContactPage.tsx:351` 주석이 명시한다 — "공개 화면 법정정보 표기는 Footer 의 `PublicLegalFooterInfo`(`service_legal_profiles` 동적)만 담당".
  → 법정정보를 다른 곳에 하드코딩하지 않는 것이 이미 확립된 정책이다(§8).

`MainLayout` footer 의 형태가 참고 기준이다: `© 2026 Neture …` + `PublicLegalFooterInfo` + `/terms`·`/privacy` Link.

### C. **Neture 법정 route 는 `/terms` 다 — KPA 와 다르다** (가장 큰 함정)

| 항목 | Neture canonical | App.tsx |
|---|---|---|
| 이용약관 | **`/terms`** | `:752` `TermsPage` |
| 개인정보처리방침 | `/privacy` | `:753` `PrivacyPage` |
| 문의 | `/contact` | `:747` `ContactPage` |

- 직전 R1 에서 **KPA 는 `/policy`** 였다. §9 의 "다른 서비스 route 복사 금지"가 정확히 이 지점을 가리킨다. KPA 값을 옮겨오면 404 를 새로 만든다.
- Neture 에는 `/support` route 가 없다(미확인이면 직접 확인할 것). §6.3 대로 **소스가 지원하는 범위만** 채택한다.

### D. §4 모집단 재확인 — census 의 "3건"은 그대로 믿지 말 것

현재 main 에서 `<footer` 를 가진 **layout shell 은 6개**다(페이지 파일 8개는 별도).

| shell | App.tsx mount | 현재 footer 법정 상태 |
|---|---|---|
| `MainLayout` | 공개 | **canonical (기준)** |
| `NetureLayout` | 공개 | **canonical (기준)** |
| `SupplierSpaceLayout` | `:844` `/supplier/*` | `© 2026` + `/contact` 만. 법정정보·terms·privacy 없음 |
| `PartnerSpaceLayout` | `:951` `/partner/*` | `© 2026` + `/contact` 만. 동일 |
| `SupplierOpsLayout` | `:1035` Admin/Operator workspace | `© 2026` + `/guide/o4o-overview`·`/`·`/forum`. **`/contact` 도 없음** |
| `AdminVaultLayout` | `:1022` | `o4o Admin Vault - 설계 보호 구역` + `Authorized: {user?.email}`. 법정 요소 전무 |

→ WO 본문이 말하는 **대상 3건 = SupplierSpace / PartnerSpace / SupplierOps** 로 읽는 것이 자연스럽다. 셋 다 route 에 mount 되어 있어 dead 가 아니다.
→ **`AdminVaultLayout` 이 4번째 인라인 footer 다.** 선행 census 가 `SERVICE_SPECIFIC` 으로 판정했고 §7.3·§10 이 구조 재설계를 금지한다.
  내부 설계보호 구역이라 공개 법정정보 표기 대상인지 자체가 판단 사항이다. **포함/제외 어느 쪽이든 근거를 CHECK §13(범위 밖 항목)에 명시한다.** 조용히 빠뜨리지 않는다.

### E. 이 shell 들에는 이미 dead link 를 제거한 이력이 있다

- `SupplierSpaceLayout`·`PartnerSpaceLayout` 주석에 `/about` route 부재로 dead link 를 제거한 선행 WO 기록이 남아 있다.
- 즉 **없는 경로를 링크로 노출한 전례가 이미 결함으로 처리된 영역**이다. §9 의 route 실재 확인을 형식적으로 넘기지 않는다.

### F. §8 · §11.2 — 로컬에서 법정정보가 안 보이는 것은 결함이 아니다

- `PublicLegalFooterInfo` 는 serviceKey 로 public API 를 조회하고, 미설정·비활성·오류면 **`null` 을 반환해 아무것도 렌더하지 않는다**(silent).
- 로컬 preview 에는 API 가 없으므로 법정정보 블록이 안 보이는 것이 **정상 계약 동작**이다. 직전 R1 smoke 에서도 동일했다.
  이를 "적용 실패"로 오판하지 말고, placeholder 를 채워 넣어 해결하려 하지 않는다(§8 하드코딩 금지).
- 따라서 이번 검증의 실질은 **① 링크 route 실재 ② canonical component 배선 ③ layout 무파손** 세 가지다.

### G. §11.2 인증 — supplier/partner/operator 는 공개 route 가 아니다

- 세 shell 모두 role guard 뒤에 있다. 계정은 CLAUDE.md §15 / `docs/local/TEST-ACCOUNTS.local.md` 를 따른다(Neture 공급자 smoke 계정 `renagang21`).
- 로그인 API 는 **serviceKey 가 없으면 401** 이다. UI 로그인은 항상 보내므로 문제되지 않지만 curl 검증 시 주의한다.
- 진입 못 한 shell 은 **어느 것을 왜 못 했는지, 대신 무엇을 정적으로 확인했는지**를 CHECK 에 적는다(§11.2). 미검증을 PASS 로 쓰지 않는다.
- 프로덕션 미배포면 preview smoke 와 production 미확인을 **구분해서** 적는다.

### H. §6.2 — 새 abstraction 금지의 실제 의미

- 세 footer 의 마크업이 조금씩 다르다(`SupplierOps` 만 좌측 2줄 구조). 이를 통일하려고 공통 `NetureShellFooter` 를 새로 만들면 §6.2 위반이다.
- 각 footer 의 기존 layout 을 유지한 채 **같은 `PublicLegalFooterInfo` + `loadFooterLegal` + 같은 route 집합**을 소비하게 하는 것이 목표다.

### I. 검증·커밋

- Neture web typecheck/build 는 저장소 표준 명령(`SETUP.md`)의 워크스페이스 필터로 수행한다. 전체 build 로 부풀리지 않는다.
- push 된 커밋 재작성 금지. push 경합 시 rebase 후 재push 하고 보고에 명시한다.
- 완료 조건 = 이번 WO 범위 미커밋 0 + `HEAD == origin/main`.
