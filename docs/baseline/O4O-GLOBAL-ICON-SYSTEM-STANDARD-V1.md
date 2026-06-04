# O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1

> **이 문서는 O4O 전체 서비스의 사용자-facing UI에서 사용할 아이콘 시스템 기준이다.**
> 본 문서는 코드 구현 문서가 아니라, 후속 WO에서 아이콘 정비 작업을 수행할 때 따라야 할 **canonical 기준**이다.
> 실제 아이콘 교체·공통 컴포넌트 수정은 본 문서를 근거로 한 별도 WO에서 단계적으로 수행한다.

- **작성일**: 2026-06-04
- **상태**: Aspirational Standard (기준 선언 — 단계적 적용 예정)
- **유형**: Baseline / Standard 문서
- **근거 조사**: [`docs/investigations/IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1.md`](../investigations/IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1.md) (commit `cd0ef7285`)
- **형제 표준**: `O4O-TABLE-STANDARD-BASELINE-V1`, `O4O-FORM-STANDARD-BASELINE-V1`
- **문서 위치 선택 사유**: O4O의 Aspirational Standard 계열(Table/Form Standard)이 `docs/baseline/`에 위치하므로 본 아이콘 기준도 동일 위치에 둔다. (`docs/canonical`, `docs/standards`는 repository에 부재)

---

## 0. 배경 (IR 요약)

`IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1`의 핵심 판정:

> O4O는 아이콘 시스템이 단일 표준 없이 **3계열로 혼재**되어 있다.
>
> 1. **emoji 문자열** — Store Hub 카드 / Operator·Admin Quick Actions / LMS lesson type / 회원가입 역할 선택 / 일부 랜딩 카드
> 2. **lucide-react** — Global Header / Operator 사이드바 / Store 사이드바 / Admin 비즈니스 블록 / 액션 버튼
> 3. **custom SVG** — Home AppEntrySection / `shared-space-ui/HomeAppIcons`

핵심 문제는 **`emoji ↔ lucide 혼재`** 다. 특히 KPA 약국 운영 허브는 사이드바·카드에는 emoji, 헤더·사용자 메뉴에는 lucide가 쓰여 화면 안에서 아이콘 언어가 충돌한다.

또한 이미 중앙화 패턴(`STANDARD_GROUPS`, `HomeAppIcons`)이 존재하므로, **새 구조를 무리하게 만들기보다 기존 패턴을 확장**하는 방향으로 표준화한다.

---

## 1. 기본 원칙

1. O4O 전체는 **하나의 아이콘 언어**를 사용한다.
2. 기본 아이콘 라이브러리는 **lucide-react line icon**으로 한다.
3. 사용자-facing 주요 UI에서 **emoji 문자열 아이콘은 사용하지 않는다.**
4. 동일 기능은 서비스가 달라도 **동일하거나 유사한 의미의 아이콘**을 사용한다.
5. 서비스별 차이는 **아이콘 형태가 아니라 색상 tone과 문맥 표현**으로 조정한다.
6. 웹과 모바일은 **같은 아이콘 의미 체계**를 공유한다.
7. 아이콘은 기능을 설명하는 보조 요소이며, 업무 UI에서 **과도하게 장식적으로 사용하지 않는다.**
8. 새 화면을 만들 때 **임의 emoji 또는 페이지별 icon string 하드코딩을 추가하지 않는다.**

---

## 2. 허용 아이콘 계열

```text
Primary:
- lucide-react line icon

Allowed with constraints:
- shared-space-ui/HomeAppIcons 의 custom SVG
  - 이미 Home AppEntrySection 에서 중앙화된 경우 유지 가능
  - 신규 추가 시 본 기준 문서에 의미와 사용처를 명시해야 함

Disallowed for user-facing primary UI:
- emoji 문자열 아이콘
- OS별 렌더링에 의존하는 pictogram
- 페이지별 임의 icon string 하드코딩
```

### 2.1 emoji 예외 허용 영역

emoji는 **다음 영역에 한해** 허용될 수 있다.

```text
예외 허용 가능:
- 사용자 입력 텍스트
- 포럼/댓글/게시글 본문
- 테스트 데이터
- 로그/개발자용 메시지
- 명시적으로 감성 표현이 목적인 콘텐츠 영역
```

단, **메뉴 / 카드 / 허브 / 대시보드 / CTA / 역할 선택 / 상태 안내 / empty state**의 기본 아이콘으로는 사용하지 않는다.

---

## 3. 크기 / 배치 / 스타일 기준

```text
Sidebar / menu icon:
- 18px ~ 20px
- 텍스트 라벨과 함께 사용
- active 상태는 기존 색상 token 을 따른다

Card / tile icon:
- 22px ~ 24px
- 필요 시 36px ~ 44px icon box 안에 배치
- 제목과 설명을 보조하는 역할

Empty state / AI / recommendation icon:
- 28px ~ 36px
- 44px ~ 52px icon box 허용
- 과도한 캐릭터형 표현 지양

Stroke:
- lucide 기본 또는 1.75 ~ 2 수준
- 같은 화면에서 stroke 느낌이 크게 다르지 않게 유지

Color:
- 서비스별 primary token 우선
- 하드코딩 색상은 기존 서비스 패턴과 충돌하지 않는 경우에만 제한적으로 허용
```

---

## 4. 서비스별 tone 기준

```text
KPA-Society:
- blue 계열
- 약사 전문 플랫폼, 커뮤니티, 약국 운영 허브의 신뢰감
- 약국 운영 문맥: Store, Building2, PackageSearch, MonitorPlay, Megaphone, QrCode 등

GlycoPharm:
- medical blue 또는 teal 계열
- 약국 혈당관리, 전문 케어, 약국 경영
- 사용자-facing 문구: "내 약국", "약국 계정", "내 약국에 복사" 기준 유지

K-Cosmetics:
- rose, violet, warm pink 계열 허용
- 화장품 매장, 상품 탐색, 여행자, 판매 문맥
- 사용자-facing 문구: "내 매장" 기준 유지

Neture:
- blue 또는 indigo 계열
- 공급자, 파트너, Market Trial, B2B 운영 생태계
- Neture 에는 "내 매장", Store Blog, 매장 실행 기능을 넣지 않음
```

> 서비스 정체성 아이콘(예: 약국 `🏥` vs 화장품 `💄`)은 **emoji 유지가 아니라 lucide/SVG 대체 + tone 차이**로 표현한다. IR에서 확인된 `🏥`/`💄` 같은 CTA 아이콘은 Phase 적용 시 lucide(`Building2` / `Store` 등) + 서비스 tone 으로 치환한다.

---

## 5. 기능별 표준 아이콘 매핑

| 기능 | 표준 아이콘 (lucide) |
|------|----------------------|
| 홈 | `Home` |
| 내 매장 / 내 약국 | `Store` 또는 `Building2` |
| 상품 카탈로그 | `PackageSearch` |
| 주문 관리 | `ShoppingCart` 또는 `ReceiptText` |
| 콘텐츠 / 자료 | `FileText` 또는 `Files` |
| 블로그 | `Newspaper` 또는 `PenLine` |
| 디지털 사이니지 | `MonitorPlay` |
| POP | `Megaphone` |
| QR-code | `QrCode` |
| 이벤트 / 특가 | `BadgePercent` |
| 강의 / 교육 | `GraduationCap` 또는 `BookOpen` |
| 포럼 / 커뮤니티 | `MessagesSquare` |
| 회원 / 사용자 | `Users` |
| 운영 대시보드 | `LayoutDashboard` |
| 승인 / 심사 | `ClipboardCheck` |
| 통계 / 분석 | `BarChart3` 또는 `ChartNoAxesCombined` |
| 설정 | `Settings` |
| 알림 | `Bell` |
| AI 추천 | `Sparkles` |
| 자동화 / RPA | `Bot` |
| Market Trial | **`FlaskConical`** (우선) / `Rocket` (대안) |
| 공급자 | `Factory` 또는 `PackagePlus` |
| 파트너 | `Handshake` |
| 운영자 | `ShieldCheck` |
| 자료 수집 / 원천 자료 | `FileInput` 또는 `Files` |
| 파일 다운로드 | `Download` |
| 외부 링크 | `ExternalLink` |
| 검색 | `Search` |
| 필터 | `SlidersHorizontal` 또는 `Filter` |
| 삭제 | `Trash2` |
| 수정 | `Pencil` |
| 복사 | `Copy` |

### 5.1 매핑 원칙

```text
- 같은 기능은 서비스가 달라도 같은 아이콘을 우선한다.
- 도메인 차이는 아이콘 교체보다 라벨/설명/색상 tone 으로 표현한다.
- 아이콘이 기능 의미를 바꾸면 안 된다.
- AI 추천은 Sparkles 를 기본으로 하고, 실제 자동화/RPA 실행은 Bot 을 사용한다.
```

### 5.2 Market Trial 우선 아이콘 결정

```text
Market Trial: FlaskConical (우선안)
```

**사유**: Market Trial 은 단순 홍보/출시가 아니라 **시장 검증·실험**의 성격이 강하므로 `Rocket` 보다 `FlaskConical` 이 의미상 안정적이다. (`Rocket` 은 출시·런칭 뉘앙스가 강해 의미가 미세하게 어긋난다.) 단일 화면에서 두 아이콘을 혼용하지 않는다.

---

## 6. 웹 · 모바일 기준

```text
웹과 모바일은 서로 다른 아이콘 세트를 사용하지 않는다.
아이콘 의미와 기능 매핑은 공통으로 유지한다.
기기별 차이는 크기, 간격, 라벨 노출, 터치 영역으로만 조정한다.
```

### 6.1 웹 기준

```text
Sidebar icon: 18~20px
Card icon: 22~24px
AI/empty state icon: 28~36px
Icon box: 36~52px
설명 문구 표시 가능
서브 라벨 표시 가능
```

### 6.2 모바일 기준

```text
Navigation icon: 20~22px
Card icon: 22~24px
Icon box: 40~44px
Touch target: 최소 44px 이상
설명 문구는 1~2줄 제한
서브 라벨은 필요 시 숨김
```

### 6.3 금지

```text
- 웹과 모바일에서 같은 기능에 다른 아이콘 사용 금지
- 모바일에서만 emoji 사용 금지
- 공간 부족을 이유로 의미가 다른 아이콘으로 대체 금지
- 아이콘만 있고 라벨 없는 주요 업무 메뉴 구성 지양
```

> IR §7 참고: 모바일 네비게이션(`MobileBottomNav` 등)은 이미 lucide 기반이므로, "lucide 단일화" 방향은 모바일 현황과도 정합적이다.

---

## 7. 중앙화 방향

```text
O4O 에는 이미 중앙화된 아이콘 패턴이 존재한다.

- packages/ui/src/operator-shell/constants.ts 의 STANDARD_GROUPS
- packages/shared-space-ui/src/HomeAppIcons.tsx

후속 표준화 작업은 새 구조를 무리하게 만들기보다,
기존 STANDARD_GROUPS 와 HomeAppIcons 패턴을 참고한다.
```

### 7.1 권장 방향

```text
1. 반복되는 메뉴/허브/카드 아이콘은 공통 mapping 으로 분리한다.
2. 서비스는 가능하면 icon component 를 직접 고르지 않고 의미 key 를 선택한다.
3. 공통 패키지에 표준 세트를 정의하고, 서비스별 wrapper 는 필요한 key 와 tone 만 선택한다.
4. 기존 prop 기반 구조가 있는 경우, prop 주입 흐름을 유지하되 emoji fallback 은 제거한다.
```

> IR §6/§10 정합: `StoreHubTemplate`/`STANDARD_GROUPS` 사례를 보면 **"패키지에 표준 세트 정의 + 서비스는 키만 선택"** 방향이 기존 구조와 가장 정합적이다. `shared-space-ui/StoreHubTemplate.tsx:174` 의 `?? '🏪'` 같은 emoji fallback 은 Phase 7 에서 제거 대상.

---

## 8. 우선 적용 순서 (후속 WO)

| Phase | 대상 |
|:-----:|------|
| 1 | KPA-Society 약국 운영 허브 |
| 2 | GlycoPharm 내 약국 / Store Hub / Channels |
| 3 | K-Cosmetics 내 매장 / Store Hub / Channels |
| 4 | Neture Home / 역할 카드 / Market Trial CTA |
| 5 | Operator/Admin Quick Actions |
| 6 | LMS lesson type icon mapping |
| 7 | shared-space-ui emoji fallback 제거 |

**각 phase 는 별도 WO 로 진행한다.** Phase 1 (KPA 약국 운영 허브) 이 O4O 매장 실행 UI 의 기준 화면이 된다.

---

## 9. 금지 사항

```text
- 새 사용자-facing UI 에 emoji icon 하드코딩 금지
- 같은 기능에 서비스별 임의 아이콘 선택 금지
- icon string 을 데이터에 직접 넣는 패턴 지양
- OS emoji 렌더링에 의존하는 주요 UI 금지
- 모바일 전용 emoji 대체 금지
```

---

## 10. 완료 / 적용 판정 기준 (후속 WO용)

각 Phase WO 가 본 기준을 충족했는지 판단할 때:

```text
- 대상 화면의 사용자-facing 기본 아이콘이 lucide(또는 승인된 SVG)로 통일됨
- emoji 기본 아이콘이 제거됨 (예외 영역 제외)
- 기능별 표준 매핑(§5)을 따름
- 서비스 tone(§4)만으로 정체성 차이를 표현
- 웹/모바일 의미 매핑이 일치(§6)
- 가능한 경우 공통 mapping/key 방식(§7)으로 정리
```

> CHECK 문서는 **실제 코드 적용 후** 작성한다. 본 문서는 기준 선언이며 코드 변경을 포함하지 않는다.

---

*본 문서는 IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1 조사 결과를 근거로 작성된 기준 선언이다. 코드 수정 없음.*
