# CHECK-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-COMPLETION-V1

**작성 일자**: 2026-06-04
**작업 성격**: My Page 공통화 축 완료 종결 CHECK — 코드 / DB / migration / source file 수정 일절 없음
**선행 단계**:
- 재점검 IR: [IR-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-RECHECK-V1](IR-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-RECHECK-V1.md) (`d13979475`)
- Tier 1 cleanup: WO-O4O-MYPAGE-TIER1-DEAD-STUB-CLEANUP-V1 (`2c2698dd2`)
- Neture backend 결정 IR: [IR-O4O-NETURE-MYPAGE-BACKEND-CONTRACT-V1](IR-O4O-NETURE-MYPAGE-BACKEND-CONTRACT-V1.md) (`34adbe145`)

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **CONDITIONAL PASS** — My Page 공통화 축의 **공통화 기준 5종 모두 PASS**. KPA 도메인 고도화 3종은 후속 backlog 로 분리.
>
> **PASS 근거 5종**:
> 1. **4 서비스 `MyPageLayout` 골격 완료** — `@o4o/account-ui` 12+ 공통 컴포넌트 도입.
> 2. **4 서비스 role boundary 양호** — `/mypage` 와 `/admin/operator/store/supplier/partner` workspace 완전 분리. operator/admin action 노출 0.
> 3. **Tier 1 dead/stub/mock 정리 완료** — KPA withdrawRequest mock + `/event-offers/history` dead link + `MyCompletionsPage` legacy + GP settings stub 3건 정리 (`2c2698dd2`).
> 4. **Neture backend controller 신설 불필요 확정** — Option A 권고 (`34adbe145`). 공통 endpoint 100% cover + workspace 경계 모범 보존.
> 5. **개인정보 / 보안 위험 낮음** — serviceKey 스코핑 + role gating + 본인 한정.
>
> **CONDITIONAL 사유 3종 (후속 backlog 분리)**:
> - KPA `/mypage/{summary,activities,settings}` placeholder wiring (KPA 도메인 고도화 — 표시 데이터 기준 결정 선행 필요)
> - KPA `ProfileCard` 미사용 (UI 편차, 분류 B — 도메인 차이 vs 구현 편차 trade-off)
> - 통합 알림 페이지 (4 서비스 공통, 선택 — 미래 수요 발생 시)
>
> → My Page 공통화 축 **완료 고정 가능**. 후속 3종은 별도 트랙으로 분리.

권고 단계: ① 본 CHECK 로 My Page 축 CONDITIONAL PASS 확정 → ② 후속 3종을 별도 backlog 로 분리 명시 → ③ 다음 공통화 축 (forum 등 커뮤니티) 진행

---

## 1. Executive Summary

### 1.1 단계별 완료 상태

| 단계 | Commit | 상태 |
|------|--------|:----:|
| My Page cross-service 재점검 IR | `d13979475` | ✅ 완료 |
| Tier 1 dead/stub cleanup (WO) | `2c2698dd2` | ✅ 완료 |
| Neture mypage backend contract 결정 | `34adbe145` | ✅ 완료 |
| **My Page 완료 CHECK (본 문서)** | (예정) | ✅ 작성 중 |
| KPA placeholder wiring | — | ⏸ 후속 backlog |
| KPA ProfileCard 도입 | — | ⏸ 선택 (UI 편차) |
| 통합 알림 페이지 IR | — | ⏸ 선택 (미래 수요) |

### 1.3 판정

✅ **CONDITIONAL PASS** — 공통화 기준 5종 PASS / KPA 도메인 고도화 3종 후속 backlog.

---

## 2. 검증 대상 commit 목록

| Commit | 종류 | 영역 | 변경량 |
|--------|------|------|--------|
| `d13979475` | docs (IR) | 재점검 — 4 서비스 read-only audit + 잔재 10건 식별 + 분류표 | +581 |
| `2c2698dd2` | feat | Tier 1 cleanup — KPA 4 파일 + GP 1 파일 (5 cleanup) | +36 / -357 (net -321) |
| `34adbe145` | docs (IR) | Neture mypage backend 결정 — Option A 확정 | +296 |

→ 총 3 commit, +913 / -357 (net 정직 정리 + 정책 문서화).

---

## 3. PASS 근거 5종 (공통화 기준)

### 3.1 4 서비스 `MyPageLayout` 골격 완료

**선행 IR §5.2 매트릭스 재확인**:

| 컴포넌트 | KPA | GlycoPharm | K-Cosmetics | Neture | 정합 |
|---------|:---:|:----------:|:-----------:|:------:|:----:|
| `MyPageLayout` | ✅ | ✅ | ✅ | ✅ | A |
| `ProfileCard` | ❌ (자체) | ✅ | ✅ | ✅ | B (KPA 편차) |
| `ProfileInfoField` | (자체) | ✅ | ✅ | ✅ | A |
| `MyPageNavigation` | ✅ | ✅ | ✅ | (NetureLayout) | A |
| `MyPageHubCard` | (자체) | ✅ | ✅ | ✅ | A |
| `MyRequestsInbox` | ✅ | ✅ | ✅ | ❌ (의도) | A (Neture 의도) |
| `MyPageLoadingState/EmptyState` | ✅ | ✅ | ✅ | ✅ | A |
| `PasswordChangeModal` | ✅ | ✅ | ✅ | ✅ | A |
| `SettingsSection` | (자체) | ✅ | ✅ | ✅ | A |
| `RoleBadge` | ✅ | ✅ | ✅ | ✅ | A |

→ `@o4o/account-ui` 의 12+ 공통 컴포넌트 4 서비스 도입. KPA 의 `ProfileCard` 미사용은 UI 편차 (B 분류).

### 3.2 4 서비스 Role Boundary 양호

| 서비스 | `/mypage` 진입 | operator/admin action 노출 | workspace 분리 |
|--------|:-------------:|:----------------------:|:--------------:|
| KPA | MyPageGuard (인증만) | ❌ | ✅ `/operator/*` `/admin/*` 별도 |
| GP | SoftGuard feature="mypage" | ❌ | ✅ |
| K-Cos | ProtectedRoute | ❌ | ✅ |
| Neture | 인증만 | ❌ | ✅ 4 workspace 완전 분리 (`/supplier`, `/partner`, `/account/{supplier,partner}`) |

→ 4 서비스 모두 명확. Neture 가 cross-workspace boundary 가장 모범적.

### 3.3 Tier 1 dead/stub/mock 정리 완료

`2c2698dd2` 의 5 cleanup:

| # | 정비 | 영향 |
|:-:|------|------|
| 1 | KPA `MySettingsPage` withdrawRequest mock (모달 + handler + state + styles 8종) 제거 | 위험 fail-open mock 제거 (-138 라인) |
| 2 | KPA `MyDashboardPage` `/event-offers/history` Link 제거 (Card 유지) | dead link 정리, 의미 손실 0 |
| 3 | KPA `MyCompletionsPage.tsx` legacy 파일 삭제 + barrel export 제거 | -185 라인 (redirect 보존) |
| 4 | GP `MySettingsPage` 2FA "준비 중" 정직 표시 + 알림설정 섹션 제거 + 계정 탈퇴 button 제거 | UI stub 3건 fail-closed |
| 5 | K-Cos `MySettingsPage` 점검 (이미 stub 0, 변경 없음) | IR 보고 정정 |

→ **5/5 정직 정리 완료**. fail-closed 원칙 + backend API 신설 0.

### 3.4 Neture backend controller 신설 불필요 확정

`34adbe145` 의 Option A 권고:

| 영역 | cover endpoint |
|------|----------------|
| Hub 사용자 요약 | `GET /auth/me` ✅ |
| Profile 이름 편집 | `PUT /users/profile` ✅ |
| 비밀번호 변경 (Neture scope) | `PUT /users/password` + `serviceKey='neture'` ✅ |
| 모든 기기 로그아웃 | `POST /auth/logout-all` ✅ |
| 알림 (header) | `/notifications/*` + `serviceKey='neture'` ✅ |
| 외부 연락처 (Forum) | `GET/PATCH /users/me/contact` ✅ |
| business-info | `GET/PATCH /neture/supplier/profile` (supplier workspace wrapper) ✅ |

→ **100% cover**. supplier/partner workspace 데이터를 `/mypage` 에 끌어오지 않음. Neture 의 workspace 분리 모범성 보존.

### 3.5 개인정보 / 보안 위험 낮음

| 영역 | 위험 평가 |
|------|----------|
| 비밀번호 변경 | serviceKey 스코핑 (4 서비스 모두) — V2 ServiceCredential |
| 사업자 정보 | store_owner / supplier 한정 (`/store/info`, `/neture/supplier/profile`) — `/mypage` 와 분리 |
| KPA 약국 정보 | pharmacy_owner role gating + 본인 한정 |
| 알림 | serviceKey + organizationId 필터 |
| User entity `businessInfo` JSONB | 공유 구조, 관례 의존 (드리프트 위험 낮음) |

→ 모두 **role-gated + scoped + 본인 한정**. 위험 낮음.

---

## 4. CONDITIONAL 사유 3종 (후속 backlog 분리)

본 CHECK 의 PASS 자격을 막지 않는 항목. 별도 트랙으로 분리.

### 4.1 KPA `/mypage/{summary,activities,settings}` placeholder wiring

**현황**: KPA backend `mypage.controller.ts` 의 3 endpoint 가 placeholder (hardcoded response).

**왜 PASS 자격 무관**:
- KPA 도메인 고도화 (KPA-specific 활동 데이터) — 공통화 기준 외 영역
- 다른 3 서비스에서도 동일 endpoint 부재 정합 (분류 H — 도메인 차이로 유지)
- 잘못된 데이터 표시 0 (placeholder 가 명시적)
- fail-open 위험 0

**후속 backlog**: `WO-O4O-KPA-MYPAGE-PLACEHOLDER-API-WIRING-V1` (중간 난이도)
- 선행 결정: 표시 데이터 기준 정의 (어떤 활동? 어떤 알림 토글? 어떤 통계?)
- 권장 우선순위: 중간 (My Page 공통화 외 KPA 고도화 트랙)

### 4.2 KPA `ProfileCard` 미사용 (UI 편차, 분류 B)

**현황**: KPA `MyDashboardPage` 가 자체 avatar+info 렌더 (직역 탭 / 약국 정보 풍부 표시).

**왜 PASS 자격 무관**:
- KPA 의 풍부한 직역/약국 정보 표시는 도메인 차이 (분류 H)
- ProfileCard 의 표준 스코프 (avatar + name + email + role badge) 보다 KPA 영역이 풍부
- UI 일관성보다 도메인 정보 표현이 우선

**후속 backlog**: `IR-O4O-KPA-MYPAGE-PROFILECARD-ADOPTION-V1` (선택, 낮음)
- ProfileCard 확장으로 KPA 직역 탭 흡수 가능한지 검토
- 또는 KPA 만 의도된 자체 렌더 유지 (현재 결정)

### 4.3 4 서비스 통합 알림 페이지 (선택, 미래 수요)

**현황**: 4 서비스 모두 알림 별도 페이지 부재 (header `NotificationBell` 만).

**왜 PASS 자격 무관**:
- 현 시점 사용자 수요 미발생
- `/notifications/*` 공통 endpoint 는 이미 존재 (serviceKey 필터)
- header bell + dropdown 으로 minimal 알림 노출 정합

**후속 backlog**: `IR-O4O-MYPAGE-NOTIFICATION-PAGE-V1` (선택, 낮음)
- 사용자 피드백 누적 후 진행 검토

---

## 5. Cross-service 정책 매트릭스 (선행 IR §20 재확인)

| 분류 | 정의 | 항목 수 (CHECK 시점) | 상태 |
|:----:|------|:------------------:|:----:|
| **A** | 4 서비스 공통화 완료 | 다수 | ✅ |
| **B** | UI 편차 | 1 (KPA ProfileCard) | ⏸ 후속 backlog |
| **C** | 일부 서비스만 풍부 (KPA 도메인) | 3 → 유지 | △ 도메인 차이 |
| **D** | route/menu 불일치 | 0 | ✅ |
| **E** | mock/TODO/no-op/dead | 8 → **0** (Tier 1 cleanup) | ✅ |
| **F** | backend API contract 부족 | 2 → **1** (Neture 결정 확정, KPA placeholder 만 잔존) | ⏸ KPA wiring backlog |
| **G** | workspace 영역 위반 | 0 | ✅ |
| **H** | 도메인 차이로 유지 | 4 | △ 의도된 차이 |
| **I** | 개인정보 노출 위험 | 0 | ✅ |

**변화 요약**:
- E (mock/dead): **8 → 0** (Tier 1 cleanup `2c2698dd2`)
- F (backend contract): **2 → 1** (Neture 결정 `34adbe145` — 신설 안 함 confirm)
- 잔존 항목: B (KPA ProfileCard) + F (KPA placeholder) + C (도메인 차이) + H (의도된 차이)

→ **공통화 기준 PASS 확보**.

---

## 6. 외부 세션 트랙 정합

본 CHECK 진행 중 외부 세션이 작업 중인 영역 (working tree modified):

| 파일 | 영역 | 본 CHECK 와의 정합 |
|------|------|-------------------|
| `apps/api-server/src/entities/cart/StoreCartItem.entity.ts` | Store Cart entity | ✅ 격리 (영역 외) |
| `apps/api-server/src/services/cart/store-cart.service.ts` | Store Cart service | ✅ 격리 |
| `services/web-{glycopharm,k-cosmetics,kpa-society}/src/api/storeCart.ts` | Store Cart API client (3 서비스) | ✅ 격리 |
| `services/web-{glycopharm,k-cosmetics}/src/components/common/Footer.tsx` | Footer (2 서비스) | ✅ 격리 |
| `services/web-glycopharm/src/pages/ContactPage.tsx` | Contact 페이지 | ✅ 격리 |
| `services/web-{glycopharm,kpa-society}/src/pages/pharmacy/HubB2BCatalogPage.tsx` | Hub B2B Catalog (2 서비스) | ✅ 격리 |
| `services/web-k-cosmetics/src/pages/hub/HubB2BPage.tsx` | K-Cos Hub B2B | ✅ 격리 |

→ 모두 Store Hub / Cart / Footer / B2B 트랙 — **본 My Page 공통화 축과 영역 완전 분리**. path-restricted commit 으로 정확 격리 가능.

### 외부 세션 commit (My Page 진행 중 main 에 merge)

- 외부 KPA service-guide 트랙 commit 들 (이미 main merge 완료)
- Store Cart / Footer / Hub B2B 트랙 (현재 working tree 진행 중)

→ 본 CHECK 의 PASS 자격에 영향 없음.

---

## 7. 후속 Backlog 분리

| ID | 우선 | 종류 | 의존성 |
|----|:----:|------|--------|
| **WO-O4O-KPA-MYPAGE-PLACEHOLDER-API-WIRING-V1** | 중간 | KPA 도메인 고도화 | 표시 데이터 기준 IR 선행 필요 (별도) |
| IR-O4O-KPA-MYPAGE-PROFILECARD-ADOPTION-V1 | 낮음 | UI 편차 정합 (선택) | (필요 시) |
| IR-O4O-MYPAGE-NOTIFICATION-PAGE-V1 | 낮음 | 4 서비스 통합 알림 페이지 (선택) | 사용자 수요 누적 |

**모두 본 CHECK 의 PASS 자격 영향 없음**. 별도 트랙으로 분리.

---

## 8. 공통화 채팅방 진행 상태

본 CHECK 통과 후 공통화 축 상태:

| 공통화 축 | 상태 |
|----------|:----:|
| 운영자 공통화 | ✅ 완료 |
| 운영자 대시보드 부가 섹션 공통화 | ✅ 완료 |
| 운영자 Bulk Action Flow P1 | ✅ 완료 |
| Store Hub cross-service 공통화 | ✅ 완료 |
| **My Page 공통화** | ✅ **본 CHECK 로 완료 고정** |
| forum / 커뮤니티 서비스 공통화 | 다음 후보 (선행 IR 권고) |

→ 다음 자연스러운 축: **forum 등 커뮤니티 서비스 부분 재점검**.

---

## 9. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) + [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) 정합 종합.

| 원칙 | 정합 | 비고 |
|------|:----:|------|
| §3 참여 주체 (공급자/운영자/매장/사용자) | ✅ | Neture workspace 분리 모범 |
| §3.2 operator 정의 (일상 운영 ↔ personal 영역) | ✅ | `/mypage` 와 `/operator` 분리 |
| §4 Canonical Flow | ✅ | workspace 분리로 정합 |
| §7 Drift 방지 (도메인 어휘 격리) | ✅ | 4 서비스 도메인 어휘 보존 |
| 공통화 + 운영 흐름 정합 §2 | ✅ | `@o4o/account-ui` 공통 컴포넌트 + 서비스별 자유도 |
| My Page = personal account 전용 | ✅ | 4 서비스 모두 정합 |
| workspace 분리 (Neture 모범) | ✅ | controller 신설 안 함으로 분리 보존 |
| Drift / mock 잔재 정비 | ✅ | Tier 1 cleanup |
| 1인 개발 유지보수성 | ✅ | 공통 컴포넌트 12+ + Neture 부재 정합 |
| 개인정보 노출 최소화 | ✅ | role gating + serviceKey scoping |
| 미래 확장성 | ✅ | 후속 backlog 명시 |

→ **모든 원칙 정합**.

---

## 10. 최종 판정

### ⚠️ **CONDITIONAL PASS** — My Page 공통화 축 완료 고정

| 판정 기준 | 결과 |
|----------|:----:|
| 공통 layout (`MyPageLayout`) 4 서비스 도입 | ✅ |
| ProfileCard / Nav / RequestsInbox / SettingsSection 3+ 서비스 도입 | ✅ |
| 4 서비스 role boundary 양호 | ✅ |
| Tier 1 dead/stub/mock 정리 (5 cleanup) | ✅ |
| Neture backend controller 결정 (신설 안 함) | ✅ |
| workspace 경계 분리 (Neture 모범) | ✅ |
| 개인정보 / 보안 위험 낮음 | ✅ |
| KPA placeholder wiring | ⏸ 후속 backlog (분류 F 잔존 1) |
| KPA ProfileCard 도입 | ⏸ 선택 backlog (분류 B) |
| 통합 알림 페이지 | ⏸ 선택 backlog (선행 IR §13) |
| Source file 수정 (본 CHECK) | ✅ 없음 |
| 외부 세션 WIP 격리 | ✅ |

### 결론

> **My Page cross-service 공통화 축 완료 고정**. 공통화 기준 5종 모두 PASS — 골격 / role boundary / dead-stub cleanup / Neture backend 결정 / 보안. KPA 도메인 고도화 3종 (placeholder wiring / ProfileCard / 통합 알림) 은 별도 backlog 로 분리.
>
> 이 공통화 채팅방의 다음 재점검 축은 **forum 등 커뮤니티 서비스 부분** 으로 자연스럽게 이어짐.

---

## 11. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| **판정** | ⚠️ **CONDITIONAL PASS** |
| **작성 문서** | `docs/investigations/CHECK-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-COMPLETION-V1.md` |
| **검증 대상 commit** | `d13979475` + `2c2698dd2` + `34adbe145` (3 commit) |
| **공통화 기준 5종 PASS** | layout / role boundary / dead-stub cleanup / Neture 결정 / 보안 모두 통과 |
| **CONDITIONAL 사유 3종** | KPA placeholder wiring / KPA ProfileCard / 통합 알림 (모두 후속 backlog) |
| **분류 매트릭스 변화** | E: 8→0, F: 2→1 |
| **외부 세션 WIP 격리** | ✅ Store Cart / Footer / Hub B2B 트랙 11 파일 모두 영역 외 |
| **Source file 수정 (본 CHECK)** | ✅ 없음 (read-only) |
| **My Page 공통화 축 완료 고정** | ✅ |
| **다음 공통화 축** | forum / 커뮤니티 서비스 재점검 |
| **Commit 여부** | **사용자 승인 대기** — 본 CHECK 1 파일만 path-restricted commit 예정 |

---

> **상태**: My Page cross-service 공통화 축 완료 CHECK 작성 완료. **CONDITIONAL PASS** — 공통화 기준 5종 PASS, KPA 도메인 고도화 3종 후속 backlog. 본 CHECK commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정. 이후 다음 공통화 축은 forum / 커뮤니티 서비스 부분으로 자연스럽게 이어짐.
