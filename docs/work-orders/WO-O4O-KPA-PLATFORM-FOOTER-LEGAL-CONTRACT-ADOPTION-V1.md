# WO-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1

## 1. 목적

KPA Society의 활성 `PlatformFooter`가 이용약관·개인정보처리방침·문의하기를 `href="#"`로 렌더하는 문제를 수정하고, 이미 존재하는 **공통 법정 Footer 계약**에 편입한다.

이번 작업은 **KPA Platform Footer의 법정 링크 계약 복구**가 목적이다.

새 Footer 시스템을 만들거나 Header/Footer 전체를 재설계하지 않는다.

---

## 2. 선행 조사 기준

선행 완료:

```text
WO-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1
CHECK:
docs/checks/CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md
commit:
fc16de796
```

선행 조사에서 확인된 위험:

```text
KPA PlatformFooter
→ 활성 InfoPageLayout에서 사용
→ 이용약관 href="#"
→ 개인정보처리방침 href="#"
→ 문의하기 href="#"
→ PublicLegalFooterInfo 공통 계약 미사용
```

이번 WO는 이 R1만 닫는다.

---

## 3. 시작 기준

현재 저장소 최신 `main` 기준으로 작업한다.

```bash
git fetch origin
git status -sb
git branch --show-current
git pull --ff-only origin main
```

원칙:

```text
특정 과거 commit을 기준점으로 고정하지 않는다.
다른 세션 WIP는 수정·삭제·stash하지 않는다.
관련 없는 dirty 파일은 건드리지 않는다.
```

---

## 4. 조사 대상

최소 다음을 실제 코드 기준으로 확인한다.

```text
services/web-kpa-society/src/components/platform/PlatformFooter.tsx
InfoPageLayout 및 PlatformFooter 소비 지점
PublicLegalFooterInfo 정의
KPA에서 PublicLegalFooterInfo를 사용하는 기존 선례
KPA terms/privacy/contact canonical route/config
```

단순히 `href="#"`만 실 URL로 치환하지 말고, **기존 공통 법정 Footer 계약을 어떻게 사용하는 것이 정식 구조인지 먼저 확인**한다.

---

## 5. 목표 구조

현재:

```text
InfoPageLayout
→ PlatformFooter
   → 자체 법정링크 hard-code
   → href="#"
```

목표:

```text
InfoPageLayout
→ PlatformFooter
   → 기존 공통 legal footer 계약 사용
      또는
   → 동일 canonical config/source를 소비
```

핵심 원칙:

```text
새 legal config를 만들지 않는다.
새 Footer Core를 만들지 않는다.
PublicLegalFooterInfo 또는 현재 canonical legal source를 재사용한다.
```

---

## 6. 구현 범위

### 6.1 PlatformFooter 법정 링크 복구

다음 3개가 실제 동작하도록 한다.

```text
이용약관
개인정보처리방침
문의하기
```

`href="#"`는 제거한다.

### 6.2 공통 계약 채택

가능하면 기존:

```text
PublicLegalFooterInfo
```

또는 그 하위 canonical legal config/source를 직접 재사용한다.

이미 동일 정보를 제공하는 공통 컴포넌트가 적합하다면 중복 렌더링 없이 연결한다.

### 6.3 기존 Platform Footer UI 유지

이번 WO에서는 다음은 유지한다.

```text
PlatformFooter 전체 레이아웃
브랜딩
문구
색상
spacing
InfoPageLayout 구조
```

법정 계약 복구와 무관한 디자인 변경은 하지 않는다.

---

## 7. 금지 사항

이번 WO에서 하지 않는다.

```text
GlobalHeader 재설계
전체 Footer 공통화
PublicLegalFooterInfo 재설계
법정문서 DB/schema 변경
route 체계 변경
KPA 전체 layout 리팩터링
Neture footer 수정
MobileBottomNav 공통화
PharmacyHub Header/Footer 수정
dead component 삭제
```

---

## 8. 예외 처리

만약 `PublicLegalFooterInfo` 자체를 그대로 넣으면 PlatformFooter UI와 충돌한다면:

```text
공통 component 강제 삽입
```

보다

```text
canonical legal config/source 재사용
+ PlatformFooter 기존 표현 유지
```

를 우선한다.

즉 **UI 공통화보다 계약 공통화가 우선**이다.

중복 코드를 줄이기 위해 큰 abstraction을 새로 만드는 것은 이번 WO에서 하지 않는다.

---

## 9. 검증

최소 다음을 확인한다.

### 코드 검증

```text
PlatformFooter 내 href="#" 0
terms 링크 canonical route 연결
privacy 링크 canonical route 연결
contact 링크 canonical route 연결
```

### 정적 검증

```bash
git diff --check
```

KPA web typecheck/build를 현재 저장소 표준 명령에 따라 수행한다.

### 브라우저 smoke

가능하면 실제 브라우저에서 활성 `InfoPageLayout` 소비 route에 진입해 다음을 확인한다.

```text
PlatformFooter 표시
이용약관 클릭 → 정상 페이지
개인정보처리방침 클릭 → 정상 페이지
문의하기 클릭 → 정상 페이지
404 없음
JS exception 없음
기존 화면 layout 깨짐 없음
desktop 확인
mobile 확인 가능하면 수행
```

브라우저 검증이 환경 문제로 불가능하면 구체적 사유를 CHECK에 기록한다.

---

## 10. 회귀 확인

이번 수정이 기존 공개 Footer 계약을 깨뜨리지 않았는지 확인한다.

최소:

```text
기존 KPA public footer terms/privacy/contact
PlatformFooter legal links
```

두 경로가 동일 canonical 계약을 향하는지 확인한다.

---

## 11. CHECK 문서

작성:

```text
docs/checks/CHECK-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md
```

포함 내용:

```text
1. 수정 전 문제
2. PlatformFooter 활성 소비 route
3. canonical legal source 확인 결과
4. 채택 방식
5. 변경 파일
6. href="#" 제거 결과
7. terms/privacy/contact 연결 결과
8. typecheck/build
9. browser smoke
10. 회귀 결과
11. 범위 밖 항목
```

---

## 12. 완료 기준

다음을 모두 만족하면 완료다.

```text
PlatformFooter의 법정 링크 3개 정상화
href="#" 제거
기존 canonical legal 계약 재사용
새 Footer 시스템 생성 없음
법정문서 route/schema 변경 없음
KPA typecheck/build PASS
가능하면 browser smoke PASS
CHECK 작성
commit/push 완료
```

이번 WO 완료는:

```text
KPA PlatformFooter legal contract adoption 완료
```

만 의미한다.

Header/Footer 전체 공통화 완료로 선언하지 않는다.

---

## 13. 작업 종료

```bash
git status --short
git diff --check
```

이번 WO 관련 파일만 stage 한다.

```bash
git add <이번 WO 관련 파일>
git commit -m "fix(kpa): adopt canonical legal footer contract"
git push origin <현재 브랜치>
```

`git add .` 금지.

---

## 14. 최종 보고 형식

짧게 다음만 보고한다.

```text
1. 수정 전 원인
2. canonical legal source
3. 변경 파일
4. terms/privacy/contact 최종 경로
5. href="#" 잔존 여부
6. typecheck/build
7. browser smoke
8. CHECK 경로
9. commit/push
```

추가로 이번 작업 중 Neture Footer, MobileBottomNav, PharmacyHub Header/Footer 문제가 보여도 수정하지 않고 후속 작업으로 남긴다.

---

## 부기 (실행 시점 저장소 사실 · 함정)

> 아래는 WO 지시가 아니라 **실행 시점 측정값**이다. §3 지시대로 최신 main 기준으로 재확인한다.
> 부기와 코드가 다르면 **코드가 정답**이다.

### A. 기준점 · 다른 세션 WIP

- 작성 시점 `HEAD == origin/main == 3e5556819`.
- 작업트리에 **다른 세션의 미커밋 변경이 있다**: `apps/api-server/src/routes/operator/analytics.routes.ts`, `apps/api-server/src/routes/operator/membership.routes.ts`.
  → §3 대로 **수정·삭제·stash 금지**. 이번 WO 범위(`services/web-kpa-society/**`, `docs/checks/**`)와 겹치지 않는다.
  → §13 대로 path-specific stage 만 사용한다. `git add .` 는 이 파일들을 끌어들인다.

### B. canonical legal source 는 이미 KPA 안에 선례가 있다 (§4 핵심)

같은 서비스의 공개 Footer 가 이미 공통 계약을 쓰고 있다:

- `services/web-kpa-society/src/components/Footer.tsx:7` — `import { PublicLegalFooterInfo } from '@o4o/shared-space-ui'`
- 같은 파일 `:52` — `<PublicLegalFooterInfo serviceKey="kpa-society" loadProfile={loadFooterLegal} />`
- loader: `services/web-kpa-society/src/lib/footerLegal.ts:14` (`createFooterLegalLoader`)
- `App.tsx:520` 의 `StoreFacingFooter` 도 같은 `loadFooterLegal` 을 주입한다(`:523`).

→ **새 config 를 만들 이유가 없다**(§5). 이 선례를 그대로 따르는 것이 정식 구조다.

### C. KPA 법정 route canonical 값 (§9 코드 검증 대상)

`Footer.tsx` 가 쓰는 실제 경로 = `App.tsx` 에 존재하는 route 와 일치한다:

| 항목 | canonical 경로 | App.tsx route |
|---|---|---|
| 이용약관 | `/policy` | `:925` `PolicyPage` |
| 개인정보처리방침 | `/privacy` | `:926` `PrivacyPage` |
| 문의하기 | `/contact` | `:920` `ContactPage` |

- **KPA 에는 `/terms` route 가 없다.** 이용약관은 `/policy` 다. `/terms` 로 적으면 404 를 새로 만든다.
- `PlatformFooter` 는 `<a href>` 를, `Footer.tsx` 는 `<Link to>` 를 쓴다. §10 회귀 확인은 "두 경로가 같은 canonical 을 향하는가"이므로 **`react-router` `Link` 로 맞추는 편이 기존 선례와 일치**한다(전체 페이지 리로드 회피).

### D. §6.1 과 §9 사이의 범위 판단 (반드시 명시적으로 처리할 것)

`PlatformFooter.tsx` 의 `href="#"` 는 **총 6개**다.

- 법정 3개 (`:29` 이용약관 / `:30` 개인정보처리방침 / `:31` 문의하기) — §6.1 의 명시 대상.
- 서비스 안내 3개 (`:23` Digital Signage / `:24` Forum / `:25` 콘텐츠 안내) — §6.1 에 없다.

§9 코드 검증은 "PlatformFooter 내 `href="#"` **0**" 이라고 적혀 있어 6개 전부를 요구하는 것으로 읽힌다.
→ 임의로 한쪽을 무시하지 말고 **판단과 근거를 CHECK §11(범위 밖 항목)에 명시**한다.
→ 참고로 후보 route 는 실재한다: `/forum`(`App.tsx:622`), `/guide/features/content`(`:651`). Digital Signage 는 KPA public route 확인 필요.
→ 대응할 route 가 없으면 **없는 경로를 지어내지 않는다.** 직전 트랙에서 `/member/apply` 를 CTA 로 노출한 것이 dead navigation 결함이었다.

### E. `PublicLegalFooterInfo` 의 성질 (§8 판단 근거)

- 이 컴포넌트는 **법정정보 블록(사업자등록번호·주소·통신판매업 신고 등)** 을 렌더한다. **약관/개인정보 링크를 렌더하지 않는다.**
- serviceKey 로 public API 를 조회하며, 미설정·비활성·오류면 **`null` 을 반환해 아무것도 렌더하지 않는다**(silent).
- 즉 §6.1(링크 3개 복구)과 §6.2(공통 계약 채택)는 **서로 다른 작업**이다.
  링크는 canonical route 연결로, 법정정보 블록은 `PublicLegalFooterInfo` 삽입으로 각각 해결된다.
  `PublicLegalFooterInfo` 를 넣었다고 링크가 고쳐지지 않는다.
- 어두운 배경(`#0f172a`)이라 `color: inherit` 로 상속된다. `linkColor` prop 으로 링크색 보정이 가능하다.
- 배포 환경에 `kpa-society` legal profile 이 없으면 이 블록은 아무것도 렌더하지 않는다 → **브라우저에서 안 보여도 결함이 아닐 수 있다.** smoke 결과를 그렇게 해석해 "적용 실패"로 오판하지 않는다.

### F. §9 브라우저 smoke — 활성 소비 route

`PlatformFooter` 는 `InfoPageLayout` 을 통해서만 렌더된다. 활성 소비 페이지 4개:

```text
pages/join/PharmacyJoinPage.tsx
pages/services/ForumServicePage.tsx
pages/services/LmsServicePage.tsx
pages/services/PharmacyServicePage.tsx
```

→ 이 4개의 실제 route 를 `App.tsx` 에서 확인한 뒤 그중 하나 이상으로 진입한다.
→ 프로덕션 KPA 도메인은 `docs/local/TEST-ACCOUNTS.local.md` 와 CLAUDE.md §15 를 따른다. 공개 페이지이므로 로그인은 불필요할 가능성이 높다.
→ 배포 전이라 프로덕션에 반영되지 않았다면 그 사실 자체를 사유로 CHECK 에 적는다(§9 마지막 문단). **미검증을 PASS 로 쓰지 않는다.**

### G. §6.3 — 손대면 안 되는 것

`PlatformFooter` 의 `styles` 객체, 브랜드 문구("O4O Platform" / "약사 직능을 위한 공동 플랫폼"), 색상, spacing, `InfoPageLayout` 구조는 유지한다.
`© {currentYear}` 는 이미 동적이므로 건드릴 것이 없다(선행 CHECK 의 `© 2025` stale 지적은 **GlycoPharm** 건이며 이번 범위 밖이다).

### H. 검증·커밋

- KPA web typecheck/build 는 저장소 표준 명령을 따른다(`SETUP.md`). 워크스페이스 필터를 쓰고 전체 build 로 부풀리지 않는다.
- push 된 커밋 재작성 금지. push 경합 시 rebase 후 재push 하고 보고에 명시한다.
- 완료 조건 = 이번 WO 범위 미커밋 0 + `HEAD == origin/main`.
