# IR-O4O-NETURE-MYPAGE-BACKEND-CONTRACT-V1

**작성 일자**: 2026-06-04
**작업 성격**: read-only audit IR — 코드 / UI / API / DB / migration / route 수정 일절 없음
**조사 도구**: 3 병렬 Explore agent — Neture mypage API 호출 + 3 서비스 mypage controller 비교 + 공통 /users/* + /notifications/* endpoint
**조사 기준 commit**: `181d1892b` (main, working tree clean)
**선행 IR**: [IR-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-RECHECK-V1](IR-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-RECHECK-V1.md) Tier 2 후보

---

## 0. 핵심 결론 (TL;DR)

> ✅ **권장: Option A — 신규 Neture `mypage` controller 도입 불필요. 현재 공통 `/users/*` + `/auth/me` + `/notifications/*` 패턴 유지**
>
> 1. **Neture `/mypage` 4 page 의 personal account 영역은 공통 endpoint 로 100% cover** — `PUT /users/profile` (프로필), `PUT /users/password` + serviceKey='neture' (V2 scoping), `POST /auth/logout-all`, `GET /auth/me` (hub), `/notifications/*` (header).
> 2. **business-info 는 이미 supplier workspace 영역 `/neture/supplier/profile` 에 격리** — `/mypage/business-profile` 은 `SupplierProfilePage` 의 wrapper. 의도된 단방향 surface (의미 차이 없음, workspace 데이터의 정직한 noting).
> 3. **다른 3 서비스 mypage controller 의 endpoint 중 Neture 에서 필요한 것은 0** — KPA / GP my-requests 는 service-specific 신청 (membership / forum / course / instructor) 인데 Neture 의 신청 (supplier proposal / partner application) 은 이미 supplier/partner workspace 별도 처리. LMS / credits / certificates 는 Neture 도메인 부재.
> 4. **MyPageHub "최근 활동" empty state 는 의도된 placeholder** — TODO 아님. WO-O4O-NETURE-MYPAGE-KPA-CANONICAL-REALIGNMENT-V1 의 의도. 미래 Neture-specific 활동 데이터 수요 발생 시 별도 endpoint 추가 가능 (현 시점 불필요).
> 5. **Neture workspace 경계 원칙 보존 우선** — `/mypage` personal + `/supplier`/`/partner`/`/account/*` workspace 분리가 가장 모범적 (선행 IR 평가). mypage controller 신설은 이 분리 원칙을 흐릴 위험.

권고 단계: ① 본 IR 로 Option A 정책 확정 → ② My Page 축 backend 결정 종결 → ③ Tier 2 다음 후보 `WO-O4O-KPA-MYPAGE-PLACEHOLDER-API-WIRING-V1` (KPA-specific) 검토.

---

## 1. 조사 개요

### 1.1 질문

> Neture mypage controller 부재가 의도된 최소 구조인가, 누락인가?

### 1.2 범위

- Neture `/mypage` 4 page 의 실제 API 호출 인벤토리
- 3 서비스 (KPA / GP / K-Cos) mypage controller endpoint 와의 동등성 검토
- 공통 `/users/*` + `/auth/me` + `/notifications/*` 로 cover 가능성 분석
- workspace 경계 원칙 (Neture 모범) 정합

### 1.3 금지 사항 준수

- ✅ 코드 / UI / API / DB / migration / route / menu 수정 0
- ✅ git add / commit / push 보류 (사용자 승인 후)

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | main |
| HEAD | `181d1892b` |
| origin/main 동기화 | Already up to date |
| working tree | clean |

---

## 3. Neture `/mypage` 4 page 의 실제 API 호출 인벤토리

### 3.1 페이지별 API 호출

| Page | API 호출 | 분류 |
|------|---------|------|
| `MyPageHub` | 0 (`useAuth` context only — `user.name`, `user.email`, `user.roles`) | 공통 context |
| `MyProfilePage` | `PUT /api/v1/users/profile` (name 편집) | 공통 |
| `MySettingsPage` | `PUT /api/v1/users/password` + `serviceKey='neture'` (V2 scoping) + `logoutAll()` (context — POST `/auth/logout-all` 추정) | 공통 (+ serviceKey scoping) |
| `MyBusinessProfilePage` | `GET /neture/supplier/profile` + `PATCH /neture/supplier/profile` (SupplierProfilePage wrapper 내부) | Neture-specific (단 supplier workspace API 의 wrapper) |
| `NetureGlobalHeader` (헤더) | `GET /notifications/unread-count?serviceKey=neture` / `GET /notifications?serviceKey=neture` / `POST /notifications/read` | 공통 (serviceKey 필터) |

### 3.2 총 endpoint 집계

| 종류 | endpoint | 비고 |
|------|----------|------|
| 공통 (cross-service) | `GET /auth/me` | hub user context |
| 공통 | `PUT /users/profile` | name 편집 |
| 공통 + serviceKey scoping | `PUT /users/password` | V2 ServiceCredential (Neture-scoped) |
| 공통 | `POST /auth/logout-all` (logoutAll wrapper) | |
| 공통 + serviceKey 필터 | `/notifications/*` (3 endpoint) | 알림 |
| Neture-specific (supplier workspace) | `GET/PATCH /neture/supplier/profile` | business-info — `SupplierProfilePage` wrapper 통해 `/mypage/business-profile` 에서 노출 |

→ **personal account 영역은 100% 공통 endpoint 사용**. business-info 만 Neture-specific 이지만 이미 supplier workspace 영역에 있음.

---

## 4. 다른 3 서비스 mypage controller 와의 동등성

### 4.1 endpoint 인벤토리 비교

| Endpoint | KPA | GP | K-Cos | Neture | Neture 동등 필요? |
|----------|:---:|:--:|:-----:|:------:|:----------------:|
| `GET/PUT /mypage/profile` | ✅ (User+KpaMember+OrgMember join) | ❌ (공통 `/users/profile` 만) | ❌ | ❌ (공통 사용) | ❌ — 공통 충분 |
| `GET/PUT /mypage/settings` | ⚠️ placeholder | ❌ | ❌ | ❌ | ❌ — Neture 도 부재 정합 |
| `GET /mypage/activities` | ⚠️ placeholder | ❌ | ❌ | ❌ | ❌ |
| `GET /mypage/summary` | ⚠️ placeholder | ❌ | ❌ | ❌ | ❌ |
| `GET /mypage/enrollments` (LMS 위임) | ✅ | ❌ (`/lms/enrollments/me`) | ❌ (`/lms/enrollments/me`) | — | ❌ — Neture LMS 부재 |
| `GET /mypage/certificates` | ✅ (placeholder) | ❌ | ❌ | — | ❌ — Neture LMS 부재 |
| `GET /mypage/my-requests` | ✅ (4 type — forum/course/instructor/membership) | ✅ (membership + service_application) | (frontend aggregation) | ❌ | ❌ — Neture 신청은 supplier/partner workspace 별도 |
| `GET/PATCH /mypage/business-info` | ❌ | ✅ (users.businessInfo JSONB) | ✅ (users.businessInfo JSONB) | (별도 `/neture/supplier/profile` — workspace 영역) | ❌ — 이미 supplier endpoint 존재 |

### 4.2 Neture 동등성 분석

| 영역 | 도입 필요? | 사유 |
|------|:--------:|------|
| profile | ❌ | 공통 `PUT /users/profile` 사용. KPA 의 풍부한 join (직역/약국) 은 KPA 도메인 특수성. Neture 는 name 만 편집. |
| settings (알림 토글) | ❌ | Neture 현재 알림 토글 페이지 없음. KPA placeholder 와 동일 부재. |
| activities | ❌ | hub "최근 활동" empty state 의도 — Neture 측 활동 데이터 수요 미발생. |
| summary (LMS 카운트) | ❌ | Neture LMS 부재. |
| enrollments / certificates / credits | ❌ | Neture LMS / credits 부재. |
| my-requests (Neture 신청) | ❌ | Neture supplier proposal / partner application 은 supplier workspace `/account/supplier/orders` 등 별도 처리. `/mypage` 통합 부적합. |
| business-info | ❌ | 이미 `/neture/supplier/profile` (supplier workspace) 존재. `/mypage/business-profile` 는 wrapper. |
| Neture-specific 활동 | ❌ | 미래 수요 발생 시 별도 endpoint 추가 가능. 현 시점 불필요. |

→ **8 영역 모두 Neture controller 신설 불필요** ✅.

---

## 5. 공통 `/users/*` + `/auth/me` + `/notifications/*` 인벤토리

### 5.1 공통 endpoint 매트릭스

| Endpoint | 역할 | serviceKey scoping | PII |
|----------|------|:----------------:|------|
| `GET /auth/me` | 현재 사용자 (id/email/name/roles/memberships) | 없음 | 기본 PII + service memberships |
| `GET /auth/status` | 인증 상태 | 선택 | 동일 me |
| `PUT /users/profile` | 이름 / 닉네임 / 전화 수정 | 없음 | 기본 PII |
| `PUT /users/password` | 비밀번호 변경 | **선택 (V2)** | 없음 (암호화) |
| `GET/PATCH /users/me/contact` | KakaoTalk 외부 연락처 | 없음 | contactEnabled / URLs |
| `POST /auth/logout-all` | 모든 기기 로그아웃 | 없음 | 없음 |
| `GET /notifications` | 알림 목록 | **선택** | 알림 (service-filtered) |
| `GET /notifications/unread-count` | 미읽음 카운트 | **선택** | count |
| `POST /notifications/read` | 읽음 처리 | **선택** | ids |
| `GET /notifications/stream` | SSE 실시간 | **선택** | realtime |

### 5.2 Neture cover 결과

| Neture `/mypage` 기능 | cover endpoint |
|----------------------|----------------|
| Hub 사용자 요약 | `GET /auth/me` ✅ |
| Profile 이름 편집 | `PUT /users/profile` ✅ |
| 비밀번호 변경 (Neture scope) | `PUT /users/password` + `serviceKey='neture'` ✅ (V2 ServiceCredential) |
| 모든 기기 로그아웃 | `POST /auth/logout-all` ✅ |
| 알림 (header) | `GET/POST /notifications/*` + `serviceKey='neture'` ✅ |
| 외부 연락처 (Forum) | `GET/PATCH /users/me/contact` ✅ |
| business-info | `GET/PATCH /neture/supplier/profile` (supplier workspace, wrapper 형태로 /mypage 노출) ✅ |

→ **100% cover**. 미커버 영역 0.

---

## 6. Workspace 경계 원칙 정합

### 6.1 Neture 4 workspace 구조 (선행 IR 모범 평가)

```
/mypage/*           — personal account (인증만, NetureLayout)
/supplier/*         — supplier workspace (SupplierRoute + SupplierSpaceLayout)
/partner/*          — partner workspace (PartnerSpaceLayout)
/account/supplier/* — supplier account dashboard (SupplierAccountLayout)
/account/partner/*  — partner account dashboard (PartnerAccountLayout)
/admin/*  /operator/* — 별도 guard
```

### 6.2 mypage controller 신설 시 위험

| 위험 | 분석 |
|------|------|
| Personal vs Workspace 경계 흐림 | supplier proposal / partner application / B2B order 등이 `/mypage` 에 끌려오면 workspace 분리 의미 약화 |
| serviceKey scoping 중복 | `/neture/mypage/*` 와 `/neture/supplier/*` 가 PII / business-info 를 양쪽에서 처리 시 SSOT 위반 가능 |
| 유지보수 비용 | role-specific path 분기 (supplier vs partner vs buyer) + serviceKey scoping 중복 |
| Neture 의 cross-workspace boundary 모범성 손상 | 선행 IR 의 평가 "Neture 가 가장 모범적" 정합 약화 |

### 6.3 현 구조의 모범성

- `/mypage` = personal account (이름 / 비밀번호 / 알림 / 외부 연락처) — **role-agnostic**
- `/account/supplier/*` = supplier business data (주문 / 정산 / 커미션)
- `/account/partner/*` = partner data
- `/supplier/profile` = supplier 사업자 정보 → `/mypage/business-profile` wrapper 로 노출 (의도된 단방향 surface)

→ **이미 모범적**. mypage controller 신설은 이 분리를 흐릴 위험.

---

## 7. 정책 옵션 A/B/C 비교

### Option A — 신규 controller 도입 없음 (현재 구조 유지) ✅ **권장**

| 측면 | 평가 |
|------|------|
| 장점 | (1) 공통 endpoint 가 personal account 100% cover. (2) workspace 경계 분리 모범 보존. (3) 유지보수 부담 0. (4) Neture B2B 정체성 (supplier/partner/buyer) 보존. (5) 1인 개발 속도 부담 0. |
| 단점 | KPA `/mypage/profile` 같은 풍부한 join 없음 — Neture 도메인 차이로 자연스러움. |
| 리스크 | 매우 낮음 |
| 권장 | ✅ |

### Option B — 최소 read-only controller 도입

| 측면 | 평가 |
|------|------|
| 장점 | MyPageHub "최근 활동" 에 Neture-specific 데이터 (예: 최근 supplier 주문 요약 / 최근 알림 헤더 외 별도 영역) 표시. |
| 단점 | (1) 미래 수요 미발생 — 현 시점 부재 정합. (2) supplier/partner workspace 영역과 중복. (3) serviceKey scoping 중복 + role 분기 (supplier vs partner vs buyer). (4) MyPageHub 의 단순 personal hub 성격 약화. |
| 리스크 | 중간 (workspace 경계 흐림 가능성) |
| 권장 | △ — 향후 사용자 피드백 보고 결정 |

### Option C — full mypage controller 도입 (KPA 패턴)

| 측면 | 평가 |
|------|------|
| 장점 | 4 서비스 mypage controller 패턴 통일. |
| 단점 | (1) profile/settings/activities 모두 공통 endpoint 또는 placeholder 로 충분. (2) Neture LMS/credits/certificates 부재 → 70% endpoint 가 N/A. (3) Neture B2B 정체성 손상. (4) 큰 backend 작업 — 1인 개발 속도 부담 큼. |
| 리스크 | 높음 |
| 권장 | ❌ |

---

## 8. 권장안

### 최종 권장: ✅ **Option A — 현재 구조 유지**

**근거 6가지**:

1. **공통 endpoint 100% cover** — `/auth/me` + `/users/profile` + `/users/password` (serviceKey scoping) + `/auth/logout-all` + `/notifications/*` + `/users/me/contact` 만으로 Neture personal account 영역 완전 처리.
2. **business-info 이미 supplier workspace 영역에 존재** — `/neture/supplier/profile` SSOT. `/mypage/business-profile` 는 wrapper, 중복 없음.
3. **Neture 신청 (proposal / application) 은 supplier/partner workspace 영역** — `/mypage/my-requests` 도입 부적합.
4. **MyPageHub "최근 활동" empty state 의도** — WO-O4O-NETURE-MYPAGE-KPA-CANONICAL-REALIGNMENT-V1 의 design 결정. TODO 아님.
5. **Neture workspace 경계 모범 보존** — 선행 IR 평가 "Neture 가 가장 모범적". mypage controller 신설은 이 모범성 손상 위험.
6. **1인 개발 속도** — 즉시 코드 작업 0. 정책 confirm 만으로 종결.

### 미래 수요 발생 시 (선택, 후순위)

- **Option B 재검토 조건**: 사용자 피드백으로 "/mypage hub 에 Neture 활동 요약 필요" 명시 + workspace 경계 흐림 검토 후 도입.
- **MyPageHub 활동 데이터 보충**: `/notifications` 또는 `/auth/me` 응답 확장으로 처리 가능 (별도 endpoint 신설 회피).

---

## 9. 예상 후속 WO / 영향

### 9.1 본 IR 의 즉시 영향

- ✅ Neture mypage controller 신설 결정 confirm → **신설 안 함**
- ✅ My Page 축 Tier 2 backend 결정 종결 (Tier 1 cleanup `2c2698dd2` + 본 IR)
- ✅ 다음 후보: `WO-O4O-KPA-MYPAGE-PLACEHOLDER-API-WIRING-V1` (KPA-specific summary/activities/settings placeholder)

### 9.2 후속 권장 (낮은 우선순위)

| ID | 범위 | 우선 |
|----|------|:----:|
| WO-O4O-KPA-MYPAGE-PLACEHOLDER-API-WIRING-V1 | KPA `/mypage/{summary,activities,settings}` placeholder → 실 데이터 wiring | 중간 (Tier 2 다음) |
| IR-O4O-MYPAGE-NOTIFICATION-PAGE-V1 (선택) | 4 서비스 통합 알림 페이지 도입 검토 | 낮음 |

### 9.3 본 IR 진행 시 변경 없음 영역

- backend Neture mypage controller 신설 ❌
- frontend Neture `/mypage` 4 page ❌ (현재 공통 endpoint 사용 그대로)
- `/neture/supplier/profile` ❌
- 공통 `/users/*` / `/auth/me` / `/notifications/*` ❌
- KPA / GP / K-Cos ❌
- DB / migration / route 0

---

## 10. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) + [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) + 선행 IR-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-RECHECK-V1 정합 점검.

| 원칙 | Option A (권장) | Option B | Option C |
|------|:---------------:|:--------:|:--------:|
| §3 참여 주체 (supplier / operator / 매장 / 사용자) | ✅ workspace 분리 모범 보존 | △ 일부 흐림 | ❌ |
| §3.2 operator 정의 (운영 영역 ↔ personal 영역 분리) | ✅ `/mypage` personal-only | △ | ❌ |
| §7 Drift 방지 (도메인 어휘 격리) | ✅ Neture B2B 정체성 보존 | ⚠️ | ❌ |
| 공통화 + 운영 흐름 정합 (선행 IR §15.1) | ✅ 공통 endpoint + 서비스별 자유도 | △ 중복 | ❌ |
| My Page = personal account 전용 (선행 IR §25) | ✅ | △ 활동 데이터 추가 시 흐림 | ❌ |
| workspace 분리 (선행 IR §9.3) | ✅ "Neture 가장 모범적" 평가 보존 | ⚠️ | ❌ |
| 1인 개발 속도 | ✅ 변경 0 | △ 신설 비용 | ❌ |
| 개인정보 노출 최소화 | ✅ 공통 endpoint PII 한정 | △ | ❌ |
| 미래 수요 대응 (확장성) | ✅ 필요 시 점진 도입 | △ over-fitting | ❌ |

> **종합**: **Option A** 모든 원칙 정합. Neture workspace 분리의 모범성을 보존하면서 personal account 영역은 공통 endpoint 로 완전 cover.

---

## 11. 최종 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 ✅ (read-only IR) |
| 생성 IR 문서 | `docs/investigations/IR-O4O-NETURE-MYPAGE-BACKEND-CONTRACT-V1.md` |
| 조사 기준 commit | `181d1892b` |
| Neture mypage 4 page API 호출 | hub 0 / profile PUT /users/profile / settings PUT /users/password+scope / business-profile /neture/supplier/profile / header /notifications/* |
| 다른 3 서비스 mypage controller endpoint 와의 동등성 | 8 영역 모두 Neture 도입 불필요 (LMS/credits/certificates 부재 + my-requests 는 workspace 영역 + business-info 는 supplier endpoint 이미 존재) |
| 공통 endpoint cover 결과 | 100% — personal account 영역 완전 처리 |
| MyPageHub "최근 활동" empty state | 의도된 placeholder (WO-O4O-NETURE-MYPAGE-KPA-CANONICAL-REALIGNMENT-V1) |
| 권장 옵션 | **Option A — 현재 구조 유지 (controller 신설 안 함)** |
| 다음 후보 | WO-O4O-KPA-MYPAGE-PLACEHOLDER-API-WIRING-V1 (KPA placeholder 실 데이터, 중간 우선) |
| backend / DB / migration / route 변경 | **없음** ✅ |
| Commit 여부 | **사용자 승인 대기** — 본 IR 문서 1개만 path-restricted commit 예정 |

---

> **상태**: Neture mypage controller 부재가 **의도된 최소 구조 + 모범적 workspace 분리** 임을 confirm. 공통 endpoint 가 personal account 영역 100% cover. supplier/partner workspace 데이터를 `/mypage` 에 끌어오면 Neture 의 cross-workspace boundary 모범성 손상. **Option A 권장 — 현재 구조 유지**. 본 IR commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정.
