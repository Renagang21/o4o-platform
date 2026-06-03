# CHECK-O4O-WEB-ACCOUNT-ENTRY-FLOW-REGRESSION-V1

> **검증 보고서 (Verification Report)** — `WO-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1` 이 web-account 의 계정센터 기능을 약화시키거나 제거하지 않았는지 확인.
>
> **선행 CHECK 의 정정에서 출발:** `CHECK-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1` 의 B 항목을 직접 URL 검증으로 처리하려 한 것은 잘못된 검증 기준이었고, web-account 는 "각 서비스에서 진입하는 계정센터" 기준으로 별도 회귀 확인이 필요하다고 판단되어 본 CHECK 를 실행.

- **검증일:** 2026-05-23
- **분류:** Verification Result (read-only — 코드 정적 분석 + Cloud Run 상태 조회 + DNS/SSL probe)
- **검증 대상 변경:**
  - commit `82a92fe61` 의 `services/web-account/src/pages/DashboardPage.tsx` / `services/web-account/src/components/ServiceCard.tsx` 변경
- **연관 문서:**
  - 선행: [CHECK-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1](CHECK-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1.md)
  - 후속 IR: [IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1](IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1.md) (예정)

---

## 0. 최종 판정

### ✅ 회귀 없음 (web-account 코드 변경은 V2 정합, 프로덕션 영향 0)

**핵심 결론 3 가지:**

1. ✅ **WO 의 web-account 코드 변경 (DashboardPage / ServiceCard) 은 V2 철학상 타당**하며, 잔존 기능 (active 서비스 목록 + "열기") 은 정상 유지됨.
2. ⚠️ **web-account 는 현재 프로덕션 미배포 상태** — Cloud Run 서비스 `account-center-web` 는 2026-03-13 placeholder revision 1 건뿐, 이후 어떤 코드 변경도 배포되지 않음. 따라서 WO 변경의 프로덕션 회귀 가능성 0.
3. ⚠️ **각 서비스 → web-account 진입 링크 0 건** — 4 서비스 (KPA / GP / K-Cosmetics / Neture) 어느 곳에서도 `account.neture.co.kr` 로 가는 링크가 존재하지 않음. 현재 사용자의 "계정 관리" 진입은 각 서비스의 `/mypage` + `/mypage/settings` 로 분산.

| 차원 | 결과 |
|---|---|
| ① WO 변경의 회귀 (코드 의도 기준) | ✅ 회귀 없음 — 가입 UI 제거는 정상, 핵심 (active 목록 + 열기) 보존 |
| ② WO 변경의 프로덕션 영향 | ⚠️ **N/A** — web-account 자체가 미배포, 사용자에게 도달 불가 |
| ③ "각 서비스 → 계정센터" 진입 경로 | ⚠️ **현재 부재** — 4 서비스 user dropdown 어디에도 web-account 링크 없음 |
| ④ 현재의 사용자 계정 관리 경로 | ✅ 각 서비스 `/mypage` + `/mypage/settings` 가 실질적 계정 관리 surface |

→ **본 WO 가 무엇을 망친 적은 없다.** 다만 web-account 가 "계정센터" 로 정상 작동하려면 (a) 배포 파이프라인 등재 + (b) 4 서비스 user dropdown 의 진입 링크 추가가 별도 WO 로 필요.

---

## 1. 검증 환경

| 항목 | 값 |
|---|---|
| GCP Project | `netureyoutube` |
| Region | `asia-northeast3` |
| 검증 시각 | 2026-05-23 |
| 검증 도구 | gcloud CLI / curl / nslookup / 정적 코드 분석 |

---

## 2. 항목별 검증 결과

### 2.1 web-account 자체 — 코드 구조 (commit `82a92fe61` 시점)

**라우트 (`services/web-account/src/App.tsx`):**
```
/handoff   → HandoffPage  (incoming SSO landing)
/          → DashboardPage (account home, AccountLayout 래핑)
```

→ **2 개 라우트만 존재.** `/profile`, `/settings`, `/password`, `/security`, `/services/*` 등 별도 계정 관리 페이지 없음.

**DashboardPage 의 잔존 기능 (WO `82a92fe61` 후):**

| 기능 | 상태 | 근거 |
|---|:---:|---|
| 사용자 프로필 카드 (UserProfileCard) | ✅ 잔존 | DashboardPage.tsx:92 |
| "내 서비스" — active membership 목록 | ✅ 잔존 | DashboardPage.tsx:87,107 |
| active 서비스 "열기" 버튼 (Handoff 발급) | ✅ 잔존 | DashboardPage.tsx:62-81, ServiceCard.tsx:42 |
| 빈 상태 안내문 | ✅ 추가됨 | DashboardPage.tsx:108-110 |
| 다른 서비스 가입 안내 footer | ✅ 추가됨 | DashboardPage.tsx:123-125 |
| 에러 표시 영역 | ✅ 잔존 | DashboardPage.tsx:94-100 |
| **"이용 가능한 서비스" 섹션** | ❌ 제거됨 | V2 의도 — 가입은 각 서비스 사이트 |
| **"가입" / "활성화" 버튼** | ❌ 제거됨 | V2 의도 — instant active 우회 차단 |

→ **계정센터로서의 핵심 기능은 보존**. 제거된 것은 V2 철학상 가입 흐름 우회뿐.

**의미:** 사용자가 web-account 에 도달했을 때 볼 수 있는 것은 (1) 프로필 (2) 가입된 서비스 목록 (3) 다른 서비스로 점프하는 "열기" 버튼. 이는 "계정센터" 의 최소 기능을 충족.

---

### 2.2 web-account 의 배포 상태 — ⚠️ **미배포 (Placeholder)**

**Cloud Run 서비스 조회:**

```
$ gcloud run services list --region asia-northeast3 --project netureyoutube
NAME                     URL
account-center-web       https://account-center-web-3e3aws7zqa-du.a.run.app   ← 존재
glycopharm-web           https://glycopharm-web-...
k-cosmetics-web          https://k-cosmetics-web-...
kpa-society-web          https://kpa-society-web-...
neture-web               https://neture-web-...
o4o-core-api             https://o4o-core-api-...
... (그 외)
```

**`account-center-web` 의 revision 이력:**

```
$ gcloud run revisions list --service account-center-web --region asia-northeast3 --project netureyoutube
NAME                          CREATION_TIMESTAMP        LAST_TRANSITION_TIME
account-center-web-00001-bpc  2026-03-13T02:52:02Z      2026-03-13T02:52:05Z
```

→ **revision 1 건뿐, 2026-03-13 이후 갱신 없음.**

**`.run.app` 직접 접속 결과:**

```
$ curl -s https://account-center-web-3e3aws7zqa-du.a.run.app/
<!doctype html>
<title>Congratulations | Cloud Run</title>
```

→ **Cloud Run 의 기본 placeholder ("Congratulations") 페이지.** 실제 web-account 빌드 산출물이 배포된 적이 없음.

**GitHub Actions 배포 파이프라인 (`deploy-web-services.yml`):**

```yaml
on:
  push:
    paths:
      - 'services/web-neture/**'
      - 'services/web-k-cosmetics/**'
      - 'services/web-kpa-society/**'
      - 'services/web-glycopharm/**'
```

→ **trigger path 4 개만 등재**. `services/web-account/**` 가 포함되지 않음. Dockerfile 빌드/푸시/`gcloud run deploy` 스텝도 위 4 서비스용만 존재.

**결론:** web-account 는 monorepo 안에 존재하는 **빌드 가능 코드** 이지만, **자동 배포 파이프라인에 등재되지 않아 프로덕션에 도달한 적이 없다.** 본 WO `82a92fe61` 의 web-account 측 변경은 코드 레벨로만 존재하며 사용자에게 영향 0.

---

### 2.3 account.neture.co.kr DNS / SSL 상태 — ⚠️ 도메인 매핑 미완료

**DNS:**
```
$ nslookup account.neture.co.kr
account.neture.co.kr  →  CNAME → ghs.googlehosted.com → 142.251.23.121
```
→ Google 도메인 매핑용 CNAME 설정됨.

**비교 (api.neture.co.kr):**
```
$ nslookup api.neture.co.kr
api.neture.co.kr → 136.110.132.35  (Cloud Run / LB IP 직접)
```
→ api 는 직접 IP, account 는 ghs (Google Hosted Service) — 매핑 방식 다름.

**SSL handshake:**
```
$ curl -v https://account.neture.co.kr/
* IPv4: 142.250.21.121
* Trying 142.250.21.121:443...
* schannel: failed to receive handshake, SSL/TLS connection failed
curl: (35) ...
```
→ TLS 핸드셰이크 실패. **도메인 매핑은 시작됐으나 인증서가 발급/연결되지 않았거나 매핑 대상 (Cloud Run 서비스) 이 연결되지 않은 상태.**

**의미:** DNS 만 보면 "account.neture.co.kr 은 Google 인프라를 가리킨다" 는 의도가 보이지만, 실제 Cloud Run 도메인 매핑이 완결되지 않아 사용자 접속이 불가능. 직접 URL 접속이 실패하는 것은 **현재 의도된 상태 (미배포 + 매핑 미완)** 와 정합.

---

### 2.4 4 서비스 → web-account 진입 링크 조사 — ⚠️ 0 건

**검색 패턴:** `account.neture.co.kr`, `accountUrl`, `ACCOUNT_URL`, `VITE_ACCOUNT_URL`, `web-account`, `account-center` 를 4 서비스 source 전체에 grep.

| 서비스 | 외부 account.neture.co.kr 링크 | 내부 계정 라우트 | User dropdown 메뉴 |
|---|:---:|---|---|
| **web-kpa-society** | ❌ 0 건 | `/mypage`, `/mypage/settings`, `/mypage/credits`, `/admin`, `/operator`, `/store` | 마이페이지 / 설정 / (역할별 콘솔) / 로그아웃 |
| **web-glycopharm** | ❌ 0 건 | `/mypage`, `/mypage/profile`, `/mypage/settings`, `/operator`, `/admin`, `/store` | 강의/운영 대시보드 / 마이페이지 / 설정 / 로그아웃 |
| **web-k-cosmetics** | ❌ 0 건 | `/mypage`, `/mypage/profile`, `/mypage/settings`, `/mypage/credits/enrollments/certificates`, `/admin`, `/operator`, `/store` | 강의/운영 대시보드 / 마이페이지 / 설정 / 로그아웃 |
| **web-neture** | ❌ 0 건 | `/mypage`, `/mypage/settings`, `/account/supplier/*`, `/account/partner/*`, `/supplier/dashboard`, `/partner/dashboard` | 운영/공급자/파트너 대시보드 / 마이페이지 / 설정 / 로그아웃 |

**결론:**
- 어느 서비스도 web-account 로 가는 직접 링크를 가지지 않는다.
- 사용자가 "계정/내 정보/서비스 관리" 를 원할 때 가는 곳은 **각 서비스 자체의 `/mypage` 와 `/mypage/settings`**.
- "각 서비스에서 진입하는 계정센터" 라는 web-account 의 위치 규정은 **현재 미구현 상태**.

---

### 2.5 service-catalog 에서의 web-account 위치

`apps/api-server/src/config/service-catalog.ts`:

```ts
/**
 * 사용처:
 * - /check-email API 응답
 * - PASSWORD_MISMATCH 응답
 * - 가입 UX 서비스 표시
 * - Account Center (향후)   ← 향후 태깅
 * - 서비스 이동 handoff (향후)
 */

export const O4O_SERVICES: O4OService[] = [
  { key: 'neture',     ... },
  { key: 'glycopharm', ... },
  { key: 'kpa-society',... },
  { key: 'k-cosmetics',... },
];
```

→ **`account` 는 O4O_SERVICES 에 등록되지 않음.** 주석에 "Account Center (향후)" 명시 — 백엔드도 계정센터를 정식 서비스로 취급하지 않고 미래 작업으로 분류.

---

### 2.6 본 WO `82a92fe61` 의 web-account 측 변경 평가

| 변경 | 의도 | V2 정합성 | 회귀 가능성 |
|---|---|:---:|:---:|
| DashboardPage "이용 가능한 서비스" 섹션 제거 | 가입 흐름 우회 차단 | ✅ | ❌ (미배포) |
| ServiceCard onJoin/UserPlus/RefreshCw 제거 | active 만 노출 | ✅ | ❌ (미배포) |
| 안내 footer 추가 | UX | ✅ | ❌ (미배포) |
| 핵심 기능 (active 목록 + 열기) 보존 | 계정센터 최소 기능 | ✅ | — |

→ **본 WO 는 V2 의도와 정합하며, 잔존 코드는 계정센터 최소 기능 (프로필 + 가입 서비스 목록 + 열기) 을 유지.** "계정 관리 기능 약화" 의 흔적 없음.

---

## 3. 회귀 확인 종합

| 회귀 항목 | 결과 | 근거 |
|---|---|---|
| DashboardPage 프로필 표시 | ✅ 정상 | 2.1 |
| DashboardPage active 서비스 목록 표시 | ✅ 정상 | 2.1 |
| ServiceCard "열기" 버튼 (Handoff 호출) | ✅ 정상 | 2.1 |
| 가입 흐름 우회 (instant active) | ✅ 의도된 제거 | 선행 CHECK |
| 비활성 계정 페이지 (`/profile`, `/settings`) | ⏭ 원래 없음 | App.tsx 2.1 — 본 WO 와 무관 |
| 각 서비스 → web-account 진입 링크 | ⚠️ **원래 부재** | 2.4 — 본 WO 와 무관 |
| account.neture.co.kr 직접 접속 | ⚠️ **원래 불가** | 2.2/2.3 — 본 WO 와 무관 |

→ **본 WO 가 야기한 회귀: 0 건.** ⚠️ 표시 항목은 모두 본 WO 이전부터 그 상태였음.

---

## 4. 본 CHECK 가 확정하는 것 / 확정하지 않는 것

### ✅ 확정

- 본 WO `82a92fe61` 의 web-account 측 변경 (DashboardPage, ServiceCard) 은 V2 정합이며 회귀 없음.
- web-account 의 핵심 계정센터 기능 (프로필 + active 서비스 목록 + 열기) 은 코드 레벨로 보존.
- web-account 는 현재 프로덕션 미배포 상태 (Cloud Run placeholder revision 1 건, 2026-03-13).
- 4 서비스 어디에서도 web-account 로 가는 진입 링크가 없다.

### ⏭ 확정하지 않음 (별도 작업 영역)

- **web-account 배포 결정** — 언제 배포 파이프라인에 등재할지 / 어떤 시점에 account.neture.co.kr 매핑을 완결할지.
- **각 서비스 → web-account 진입 경로 추가 결정** — user dropdown 에 "계정센터" 메뉴 추가 여부 / 별도 deep-link.
- **`/mypage` vs `web-account` 책임 분리 결정** — 비밀번호/프로필/설정 의 canonical 위치 (각 서비스 vs 통합 계정센터).
- **Handoff API 의 보존/축소/삭제** — `IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1` 에서 별도 판단.

---

## 5. 후속 작업 권고

본 CHECK 의 발견은 다음 IR 의 입력으로 사용된다:

1. **`IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1`** (다음 단계) — Handoff API 의 현재 사용처와 향후 정책을 결정. 본 CHECK 의 §2.4 (서비스간 진입 링크 부재) 가 핵심 입력.
2. **`IR-O4O-WEB-ACCOUNT-DEPLOY-STRATEGY-V1`** (후속 별건, 본 CHECK 가 제안) — web-account 를 (a) 배포 파이프라인 등재 + 도메인 매핑 완결 / (b) `/mypage` 통합 / (c) 보류 중 어느 길로 갈지 결정.
3. **`IR-O4O-MYPAGE-VS-ACCOUNT-CENTER-CANONICAL-V1`** (후속 별건, 본 CHECK 가 제안) — 비밀번호/프로필/설정 의 canonical 위치를 각 서비스 `/mypage` 로 둘지 통합 web-account 로 둘지 결정. Identity V2 의 service-scoped credential 모델과 정합 판단 필요.

---

## 6. 본 CHECK 가 정정하는 것

선행 CHECK (`CHECK-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1`) 의 다음 표현을 본 CHECK 가 더 정확히 정정함:

| 선행 CHECK 의 위치 | 정정 |
|---|---|
| B 항목을 "Rena browser 확인 대기" 로 표기한 점 | 정정: 직접 URL 검증 자체가 부적절. web-account 는 현재 프로덕션 미배포라 직접 URL 검증은 불가능. |
| web-account 를 "legacy/보류 서비스" 로 표현한 점 | 정정: legacy 아님. **현 시점은 미배포 + 미연결 상태의 미래 계정센터** — 향후 활성화 대상이지 폐기 대상 아님. |

---

## 부록 — 검증 명령 (재현 가능)

```bash
# Cloud Run 서비스 목록
gcloud run services list --region asia-northeast3 --project netureyoutube

# account-center-web revision 이력
gcloud run revisions list --service account-center-web \
  --region asia-northeast3 --project netureyoutube

# .run.app 직접 접속 (placeholder 확인)
curl -s https://account-center-web-3e3aws7zqa-du.a.run.app/ | head

# DNS
nslookup account.neture.co.kr
nslookup api.neture.co.kr

# SSL probe
curl -v https://account.neture.co.kr/ --max-time 10
```

---

*Created: 2026-05-23*
*Type: Verification Result (read-only)*
*Status: 종료 — 본 WO 변경 회귀 없음. web-account 자체의 배포 결정은 별도 IR.*
*Next: `IR-O4O-AUTH-HANDOFF-POLICY-AUDIT-V1` (본 CHECK 의 §2.4 / §4 를 입력으로 사용)*
