# CHECK-O4O-KPA-OPERATOR-DASHBOARD-VISUAL-PRIORITY-AND-DENSITY-AUDIT-V1

> WO: `WO-O4O-KPA-OPERATOR-DASHBOARD-VISUAL-PRIORITY-AND-DENSITY-AUDIT-V1`  
> Date: 2026-07-25  
> Result: **AUDIT COMPLETE / IMPLEMENTATION STOPPED**

## 1. 결론

KPA 운영자 대시보드는 현재 권장 우선순위와 반대되는 방향으로 시작한다.

```text
현재:
역할 안내 → 2축 운영 네비게이션 → KPI → AI Summary → Action Queue
→ Recent Activity → Quick Actions

권장:
Action Queue(대기 있을 때) → 핵심 KPI → Quick Actions
→ AI Summary → Recent Activity → 역할 안내·2축 네비게이션
```

다만 이번 세션에는 연결 가능한 인증 브라우저가 없었다. 데스크톱·노트북·모바일 실제 첫 화면 범위를 확인할 수 없고, 핵심 순서를 바꾸려면 공통 `OperatorDashboardLayout`의 고정 블록 순서 또는 slot 구조를 변경해야 한다. 이는 각각 본 WO의 다음 중지 조건에 해당한다.

- 인증 브라우저 없이 현재 화면 상태를 충분히 판정할 수 없는 경우
- 공통 대시보드 변경이 타 서비스 레이아웃에 영향을 주는 경우
- 어떤 KPI를 축소·숨길지 정책 판단이 필요한 경우

따라서 **UI/API 코드는 수정하지 않았고 배포도 수행하지 않았다.**

## 2. 조사 근거

### 2.1 KPA 조립 순서

`KpaOperatorDashboard.tsx`는 공통 layout의 `aboveBlocks`에 다음 두 영역을 넣는다.

1. `OperatorRoleGuideCard`
2. `AxisNavigationSection`

공통 `OperatorDashboardLayout`은 그 뒤에 다음 순서를 고정한다.

1. `KpiGrid`
2. `AiSummaryBlock`
3. `ActionQueueBlock`
4. `ActivityLogBlock`
5. `QuickActionBlock`

따라서 대기 업무가 있어도 역할 설명과 두 개의 큰 축 카드, KPI, AI Summary를 지난 뒤에야 Action Queue가 보인다.

### 2.2 운영 데이터 스냅샷

2026-07-25 운영 admin 겸용 계정의 dashboard API:

| 영역 | 현재 데이터 |
|---|---|
| KPI | 9개 |
| 0건 KPI | 8개 |
| 0이 아닌 KPI | 전체 회원 6 |
| AI Summary | 0개 → `현재 특이사항 없음` 카드 |
| Action Queue | 0개 → `모든 항목 처리 완료` 카드 |
| Recent Activity | 10개 |
| Quick Actions | 8개(공통 6 + admin 전용 2) |

operator 응답은 admin 전용 `전체 회원`, `역할 관리`, `감사 로그`가 빠져 KPI 8개, Quick Action 6개가 된다.

## 3. 현재 밀도 문제

### 3.1 상단 역할 안내

- 역할 설명은 참고 정보인데 최상단 첫 카드로 고정된다.
- 제목, 두 문단, 가이드 CTA를 포함해 업무 상태보다 먼저 세로 공간을 사용한다.
- 매일 방문하는 운영자에게 반복 노출되는 정적 정보다.
- 권장: 첫 방문/접기 상태를 지원하지 않는 한 페이지 하단 보조 영역으로 이동하거나 한 줄 안내로 축소.

### 3.2 2축 운영 네비게이션

- 두 카드가 각각 제목, 설명, KPI형 metric 3개, 링크 3개를 가진다.
- metric 5개가 본 KPI와 같은 값을 반복한다.
- desktop에서는 2열이지만 notebook/tablet에서는 breakpoint에 따라 큰 카드 2개가 먼저 쌓인다.
- 권장: Quick Action 이후의 보조 네비게이션으로 이동하거나 metric을 제거하고 링크 허브로 축소.

### 3.3 KPI

- operator 8개는 허용 상한과 같고 admin 9개는 Dashboard 표준의 최대 8개를 초과한다.
- 현재 운영 데이터에서 operator KPI 8개가 모두 0인데 동일 크기·동일 테두리로 노출된다.
- `grid-cols-2 md:grid-cols-4`이므로 operator는 2행, admin은 desktop에서도 3행째 1개 카드가 남는다.
- 모든 KPI가 동일 크기라 실제 경고와 0건의 시각적 차이는 숫자 색상뿐이다.
- 어떤 0건 KPI를 숨기거나 축소할지는 업무 정책 판단이 필요하므로 이번 WO에서 임의 변경하지 않았다.

### 3.4 AI Summary와 Action Queue

- 두 블록 모두 비어 있어도 각각 독립된 초록 카드로 남는다.
- 현재는 `현재 특이사항 없음`과 `모든 항목 처리 완료`가 연속되어 같은 정상 상태를 반복한다.
- 대기 업무가 생겨도 AI Summary가 Action Queue보다 먼저 오고, 같은 count 내용을 문장으로 반복한다.
- 권장: Action Queue를 KPI보다 앞에 조건부 우선 배치하고, 빈 상태에서는 AI/Queue 정상 메시지를 하나의 compact status row로 통합.
- 이 순서 변경은 공통 layout 소비처 전체에 영향을 주므로 KPA 단독으로 적용하지 않았다.

### 3.5 Quick Actions

- operator 6개는 `2열 → md 4열` grid라 desktop에서는 `4+2`, mobile에서는 `2+2+2`로 표시된다.
- 카드 자체는 `px-4 py-3`, 아이콘+짧은 라벨 구조라 스캔 밀도는 적절하다.
- admin 8개는 desktop 2행 4열로 균형이 더 좋다.
- 현재 Quick Action은 KPI·Queue 승인 링크 중복을 제거한 상태라 항목 자체 추가 제거보다 위치 상향이 우선이다.

### 3.6 Recent Activity

- 최대 10개가 `space-y-3`으로 렌더되어 가장 긴 단일 블록이 될 수 있다.
- 현재 Quick Actions보다 먼저 배치되어 자주 쓰는 실행 진입점이 아래로 밀린다.
- 권장: Quick Actions 뒤로 이동하고 desktop에서 기본 5건+더보기, mobile에서 3건+더보기를 검토.
- 표시 개수 변경은 현재 공통 컴포넌트의 고정 동작이며 타 서비스 영향 검토가 필요하다.

## 4. 화면 크기별 판단

실제 pixel screenshot은 인증 브라우저 부재로 확보하지 못했다. 아래는 Tailwind breakpoint와 DOM 순서 기반 정적 판단이다.

### Desktop (`lg` 이상)

- 240px sidebar와 최대 1400px container를 사용한다.
- 본문 시작 후 역할 안내 1행, 축 카드 1행, KPI 2~3행이 먼저 온다.
- admin은 KPI 9개 때문에 마지막 1개가 별도 행에 남아 밀도와 정렬이 특히 좋지 않다.
- Action Queue는 위 보조 섹션과 KPI/AI 뒤에 있어 첫 화면 우선 노출을 보장할 수 없다.

### Notebook/Tablet (`md` 이상, `lg` 미만)

- sidebar가 drawer toggle bar로 바뀌어 본문 위에 추가 1행을 사용한다.
- 축 카드는 `md:grid-cols-2`, KPI와 Quick Action은 4열이다.
- 폭은 줄지만 카드 수는 desktop과 같아 텍스트 줄바꿈과 세로 밀도 증가 가능성이 높다.
- 실제 1366×768/1024×768 첫 화면 확인 없이는 안전한 spacing 수치를 결정할 수 없다.

### Mobile (`md` 미만)

- operator menu toggle, 역할 안내, 축 카드 2개가 모두 KPI보다 먼저 쌓인다.
- KPI 8개는 2열 4행, admin KPI 9개는 5행이다.
- AI 빈 상태와 Queue 빈 상태도 각각 한 행을 차지한다.
- Quick Actions 6개는 2열 3행이지만 Recent Activity 10건 뒤에 있어 매우 늦게 도달한다.
- 하단 utility nav 공간도 추가되어 전체 스크롤 밀도가 가장 높다.

## 5. 유지·이동·축소·제거 권장

| 항목 | 권장 | 이유 |
|---|---|---|
| Action Queue(대기 있음) | 최상단 이동 | 즉시 처리 업무 |
| Action Queue 빈 상태 | compact 축소 | 정상 상태 카드 반복 방지 |
| 경고 KPI | 상단 유지·강조 | 현황과 행동 연결 |
| 0건 KPI | compact/접기 검토 | 현재 8개가 동일 면적 사용 |
| Quick Actions 6개 | 유지·위치 상향 | 크기와 스캔 밀도 적절 |
| AI Summary | Queue 뒤 보조 영역 | count 반복 최소화 |
| Recent Activity | Quick Action 뒤, 기본 노출 축소 검토 | 실행 진입점보다 우선할 이유 없음 |
| 역할 안내 | 하단 이동 또는 한 줄 축소 | 반복 정적 정보 |
| 2축 네비게이션 | 하단 이동, metric 제거 검토 | KPI 중복 |
| admin 전체 회원 KPI | 8개 상한 정렬 검토 | admin만 9개 |

## 6. 권장 화면 순서

### 대기 업무가 있을 때

```text
1. Action Queue
2. 경고/핵심 KPI
3. Quick Actions
4. AI Summary
5. Recent Activity
6. 2축 운영 네비게이션
7. 역할 안내
```

### 대기 업무가 없을 때

```text
1. compact 정상 상태
2. 핵심 KPI
3. Quick Actions
4. Recent Activity
5. 2축 운영 네비게이션
6. 역할 안내
```

## 7. 실제 수정 여부

| 영역 | 결과 |
|---|---|
| KPA UI 코드 | 변경 없음 |
| 공통 dashboard 코드 | 변경 없음 |
| API·권한·route·DB | 변경 없음 |
| CHECK 문서 | 신규 작성 |

공통 순서 변경은 KPA뿐 아니라 GlycoPharm/K-Cosmetics 등 `OperatorDashboardLayout` 소비처에 영향을 줄 수 있다. KPA에서 layout을 우회해 별도 순서를 만들면 5-Block 공통 골격 회귀가 되므로 적용하지 않았다.

## 8. 검증·배포

| 항목 | 결과 |
|---|---|
| 인증 브라우저 | BLOCKED — 사용 가능한 browser instance 0 |
| 운영 dashboard API | PASS — HTTP 200, 데이터 밀도 확인 |
| typecheck | 미실행 — 코드 변경 없음 |
| build | 미실행 — 코드 변경 없음 |
| 배포 | 미수행 — UI 코드 변경 없음 |
| 운영 UI smoke | BLOCKED — 인증 브라우저 부재 |

## 9. 후속 구현 전제

후속 WO는 다음 중 하나를 명시해야 한다.

1. 공통 layout 소비처 전체를 함께 검증하며 block 순서/compact empty state를 변경한다.
2. 공통 layout에 서비스별 안전한 order/slot 옵션을 추가하고 모든 소비처 무회귀를 검증한다.
3. KPA KPI 8개 중 0건 compact 대상과 admin의 9번째 KPI 처리 정책을 먼저 결정한다.

인증된 KPA operator/admin 화면을 최소 1440×900, 1366×768, 1024×768, 390×844에서 캡처한 뒤 spacing과 첫 화면 노출 범위를 확정해야 한다.

## 10. 기존 작업공간 상태 보존

다음 기존 dirty/untracked 파일은 수정·stage·commit하지 않는다.

- `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md`
- `.codex/`
- `apps/api-server/_msm.mjs`
- `apps/api-server/_msmx.mjs`

