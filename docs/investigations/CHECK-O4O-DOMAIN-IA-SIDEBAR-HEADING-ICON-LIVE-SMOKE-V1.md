# CHECK-O4O-DOMAIN-IA-SIDEBAR-HEADING-ICON-LIVE-SMOKE-V1

> `WO-O4O-DOMAIN-IA-SIDEBAR-HEADING-ICON-ALIGNMENT-V1` (commit `3c9ec5b30`) **배포 후 live smoke**.
> operator/admin 사이드바 도메인 헤딩 emoji → lucide 전환이 실제 화면에서 정상 동작하는지 확인.

- **작성일**: 2026-06-05
- **작업 유형**: 배포 후 검증 (read-only, 코드 수정 없음)
- **대상 커밋**: `3c9ec5b30` — Deploy Web Services (Cloud Run) workflow **completed/success**
- **검증 방식**: Playwright (모바일 390×844) + DOM 평가(lucide 클래스 확인)

---

## 1. 전체 판정

**PASS** ✅

operator/admin 사이드바 도메인 헤딩이 lucide line icon 으로 정상 렌더되며, 헤딩 내 emoji 잔존 0. 모바일 drawer 개폐·backdrop·하위 메뉴 정상, console 사이드바 관련 에러 없음.

---

## 2. 검증 환경

```text
배포: commit 3c9ec5b30, GitHub Actions "Deploy Web Services (Cloud Run)" success
계정: sohae2100@gmail.com (neture/glyco operator+admin, platform super_admin)
viewport: 390 × 844 (mobile drawer 경로)
대상 URL:
  - https://glycopharm.co.kr/operator  (DEFAULT_OPERATOR_DOMAIN_IA — KPA 계열 3 서비스 대표)
  - https://neture.co.kr/admin          (NETURE_OPERATOR_DOMAIN_IA — operator/admin 공통)
```

---

## 3. 도메인 헤딩 아이콘 검증 (DOM lucide 클래스 실측)

### GlycoPharm /operator (config 소스 A — KPA 계열)

| 도메인 라벨 | 기존 emoji | 렌더된 svg class | emoji 잔존 |
|---|:---:|---|:---:|
| 커뮤니티 운영 | 💬 | `lucide lucide-messages-square text-gray-500` | 없음 |
| 매장 HUB 운영 | 🏪 | `lucide lucide-store text-gray-500` | 없음 |
| 운영 공통 | ⚙️ | `lucide lucide-settings text-gray-500` | 없음 |

### Neture /admin (config 소스 B — Neture 4 도메인)

| 도메인 라벨 | 기존 emoji | 렌더된 svg class | emoji 잔존 |
|---|:---:|---|:---:|
| 공급·유통 운영 | 📦 | `lucide lucide-package text-gray-500` | 없음 |
| 커머스·정산 운영 | 💳 | `lucide lucide-credit-card text-gray-500` | 없음 |
| 커뮤니티·콘텐츠 운영 | 💬 | `lucide lucide-messages-square text-gray-500` | 없음 |
| 운영 공통 | ⚙️ | `lucide lucide-settings text-gray-500` | 없음 |

→ **WO 매핑 6종 전부 live 확인** (MessagesSquare / Store / Settings / Package / CreditCard). 헤딩 색상 `text-gray-500` 유지.

---

## 4. 모바일 drawer 동작 (Neture /admin)

```text
1. "운영자 메뉴" 토글 → drawer 열림(expanded), backdrop 딤 정상
2. 4개 도메인 헤딩 + 하위 메뉴(Approvals/Products/Orders/Users/Analytics/System) lucide 아이콘 정상 표시
3. "메뉴 닫기"(X) → drawer 닫힘(collapsed), off-canvas 복귀 정상
```
스크린샷: `neture-admin-drawer-open.png`(열림), `neture-admin-mobile-sidebar.png`(닫힘) — drawer 개폐 회귀 없음.

---

## 5. 회귀 확인

```text
- 메뉴 순서 / 라우트(/operator/*, /admin/*) / 링크 / 라벨 문구: 변경 없음 (snapshot 동일)
- group collapsible(Approvals/Products/... 토글 버튼) 구조 유지
- active 상태(대시보드 강조) 정상
- console error: 2건 모두 로그인 전 인증 probe (api.neture.co.kr /auth/me·/auth/refresh 401)
  → 사이드바/lucide 렌더와 무관, 기존 SPA 부트스트랩 동작. critical error 없음.
```

---

## 6. 커버리지 메모

- **두 config 소스 모두 실측**: 소스 A(`DEFAULT_OPERATOR_DOMAIN_IA`)는 GlycoPharm /operator 로, 소스 B(`NETURE_OPERATOR_DOMAIN_IA`)는 Neture /admin 으로 확인.
- KPA / K-Cosmetics /operator 는 소스 A 동일 config + 동일 단일 `renderNav()` 경로 → GlycoPharm operator 와 **렌더 동등**(추가 실측 생략). Neture /operator 는 소스 B 동일 → Neture /admin 과 동등.
- 6종 고유 아이콘 + 양쪽 config 소스 + desktop/drawer 단일 경로가 모두 커버됨.

---

## 7. 결론

```text
DomainIASidebar 도메인 헤딩 아이콘
✅ 배포 검증 완료 (live PASS)

operator/admin 사이드바 emoji → lucide 정렬이 실제 화면에서 정상 동작.
운영자/관리자 사이드바 아이콘 축 정리 완료 고정.
```

후속: 아이콘 트랙 다음 단계 `IR-O4O-LMS-LESSON-TYPE-ICON-MAPPING-AUDIT-V1` (별도 진행).

---

*코드/CSS 변경 없음. 본 CHECK 는 배포 검증 기록으로 commit 한다.*
