# KPA UX Baseline v1.0

> **Status: FROZEN**
> **Tag: `v1.00-kpa-ux-baseline`**
> **Date: 2026-02-17**
> **WO: WO-O4O-KPA-UX-BASELINE-FREEZE-V1**

---

## 1. Purpose

KPA Society 서비스의 3개 서비스 영역(KPA-a, KPA-b, KPA-c) 모두에
**Operator 5-Block + Admin 4-Block** 통합 UX를 적용하고 기준선을 동결한다.

본 문서는 다음을 확정한다:

1. KPA 전체 서비스의 대시보드가 **표준 UX Core 구조로 전환 완료**
2. Operator 영역은 `@o4o/operator-ux-core` 5-Block 사용
3. Admin 영역은 `@o4o/admin-ux-core` 4-Block 사용
4. 4-Block 외부에 서비스 고유 섹션 배치 허용 (예: 회계)
5. 이전 커스텀 UI로의 회귀 금지

---

## 2. 서비스 영역 매핑

| 영역 | 서비스 | 라우트 | 설명 |
|------|--------|--------|------|
| KPA-a | 커뮤니티 | `/operator/*` | 콘텐츠/시그니지/포럼 운영 |
| KPA-b | 분회 서비스 | `/branch/:branchId/*` | 분회 조직 관리 |
| KPA-c | 지부/분회 데모 | `/demo/admin/*` | 조직관리형 서비스 |

---

## 3. KPA-a (커뮤니티 서비스)

### Operator 5-Block

| Block | 구성 | 데이터 소스 |
|-------|------|------------|
| KPI Grid | 발행 콘텐츠, 시그니지 미디어, 플레이리스트, 포럼 게시글 | `operatorApi.getSummary()` |
| AI Summary | Rule 기반 (콘텐츠/시그니지/포럼 부재 경고) | Rule-based |
| Action Queue | 미사용 (빈 배열) | - |
| Activity Log | content.recentItems + forum.recentPosts 병합, 시간순 | `operatorApi.getSummary()` |
| Quick Actions | 6개 (콘텐츠, 시그니지, 미디어, 포럼, 스마트디스플레이, 설정) | Static |

- **파일**: `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx`
- **커밋**: `bf41b174f` (Operator UX Core Freeze v1 시점)

### Admin 4-Block

> KPA-a는 Admin 4-Block 미적용 (별도 admin 대시보드 없음).
> 커뮤니티 서비스는 Operator 영역만 존재.

---

## 4. KPA-b (분회 서비스)

### Operator 5-Block

| Block | 구성 | 데이터 소스 |
|-------|------|------------|
| KPI Grid | 발행 콘텐츠, 시그니지 미디어, 플레이리스트, 포럼 게시글 | `operatorApi.getSummary()` |
| AI Summary | Rule 기반 (콘텐츠/시그니지/포럼 부재 경고) | Rule-based |
| Action Queue | 미사용 (빈 배열) | - |
| Activity Log | content.recentItems + forum.recentPosts 병합, 시간순 | `operatorApi.getSummary()` |
| Quick Actions | 6개 (콘텐츠, 시그니지, 미디어, 포럼, 스마트디스플레이, 설정) | Static |

- **파일**: `services/web-kpa-society/src/pages/branch-operator/BranchOperatorDashboard.tsx`
- **커밋**: `7beb12e91`

### Admin 4-Block

| Block | 구성 | 데이터 소스 |
|-------|------|------------|
| Structure Snapshot | 전체 회원, 활성 회원, 신상신고 대기, 연회비 대기 | `branchAdminApi.getDashboardStats()` |
| Policy Overview | 연회비 정책, 신상신고 정책, 분회 설정 | Rule-based |
| Governance Alerts | 신상신고 대기, 연회비 미납, 회원 부재 경고 | Rule-based |
| Structure Actions | 6개 (회원, 신상신고, 연회비, 공지, 임원, 설정) | Static |

- **4-Block 외부**: 회계 현황 섹션 (단식부기 + AI 분석 + 엑셀 다운로드)
- **파일**: `services/web-kpa-society/src/pages/branch-admin/DashboardPage.tsx`
- **커밋**: `7beb12e91`

---

## 5. KPA-c (조직관리형 서비스)

### Operator 5-Block

| Block | 구성 | 데이터 소스 |
|-------|------|------------|
| KPI Grid | 등록 분회, 전체 회원, 승인 대기, 진행 공동구매, 최근 게시글 | `adminApi.getDashboardStats()` |
| AI Summary | Rule 기반 (승인 대기, 회원/분회 부재 경고) | Rule-based |
| Action Queue | 가입/역할 요청 (pendingTotal) | `joinRequestApi.getPending()` |
| Activity Log | 대기 요청 상세 (최대 10건, 타입 라벨 표시) | `joinRequestApi.getPending()` |
| Quick Actions | 6개 (회원, 분회, 조직요청, 위원회, 서비스신청, 설정) | Static |

- **파일**: `services/web-kpa-society/src/pages/admin/KpaOperatorDashboardPage.tsx`
- **커밋**: `dda8ccb5f`

### Admin 4-Block

| Block | 구성 | 데이터 소스 |
|-------|------|------------|
| Structure Snapshot | 등록 분회, 전체 회원, 승인 대기, 진행 공동구매 | `adminApi.getDashboardStats()` |
| Policy Overview | 가입 승인 정책, 역할 부여 정책, 서비스 접근 정책 | Rule-based |
| Governance Alerts | 미처리 승인, 분회 부재, 회원 부재 경고 | Rule-based |
| Structure Actions | 6개 (분회, 회원, 임원, 조직요청, 공지, 설정) | Static |

- **파일**: `services/web-kpa-society/src/pages/admin/AdminDashboardPage.tsx`
- **커밋**: `dda8ccb5f`

---

## 6. API 의존성 정리

| 영역 | API | 반환 타입 |
|------|-----|----------|
| KPA-a Operator | `operatorApi.getSummary()` | `OperatorSummary { content, signage, forum }` |
| KPA-b Operator | `operatorApi.getSummary()` | `OperatorSummary { content, signage, forum }` |
| KPA-b Admin | `branchAdminApi.getDashboardStats()` | `BranchDashboardStats { totalMembers, activeMembers, ... }` |
| KPA-c Operator | `adminApi.getDashboardStats()` + `joinRequestApi.getPending()` | `DashboardStats + OrganizationJoinRequest[]` |
| KPA-c Admin | `adminApi.getDashboardStats()` | `DashboardStats { totalBranches, totalMembers, ... }` |

---

## 7. Freeze 범위

### Frozen (변경 금지)

| 항목 | 상태 |
|------|------|
| KPA-a Operator 5-Block 구조 | Frozen |
| KPA-b Operator 5-Block 구조 | Frozen |
| KPA-b Admin 4-Block 구조 | Frozen |
| KPA-b 회계 섹션 위치 (4-Block 외부) | Frozen |
| KPA-c Operator 5-Block 구조 | Frozen |
| KPA-c Admin 4-Block 구조 | Frozen |
| Block 순서 및 구성 | Frozen |

### 금지 사항

| 금지 | 이유 |
|------|------|
| 커스텀 UI로 회귀 | 표준 UX 파괴 |
| Block 구조 변경 | Core Freeze 위반 |
| 독자적 레이아웃 생성 | 분산 UX 방지 |
| API 계약 변경 | 기존 데이터 흐름 보존 |

### 허용 사항

| 허용 | 조건 |
|------|------|
| KPI 항목 조정 | 서비스별 자유 |
| AI Summary 규칙 추가 | 인터페이스 준수 |
| Quick Actions 항목 조정 | 6~8개 범위 |
| Block 내부 UI 개선 | Core 인터페이스 불변 |
| 4-Block 외부 섹션 추가 | KPA-b 회계 패턴 참고 |
| 버그 수정 / 성능 개선 | 무조건 허용 |

---

## 8. 이전 UI와의 비교

| 영역 | 이전 UI | 전환 후 |
|------|---------|---------|
| KPA-a Operator | `@o4o/operator-core` OperatorLayout + Signal 패턴 | `@o4o/operator-ux-core` 5-Block |
| KPA-b Operator | `@o4o/operator-core` OperatorLayout + Signal 패턴 | `@o4o/operator-ux-core` 5-Block |
| KPA-b Admin | 통계 카드 + 퀵 메뉴 + 회계 테이블 (579줄) | 4-Block + 외부 회계 섹션 (320줄) |
| KPA-c Operator | WordPress 스타일 카드 대시보드 (438줄) | 5-Block (223줄) |
| KPA-c Admin | 통계 카드 + 퀵 메뉴 (252줄) | 4-Block (176줄) |

---

## 9. 커밋 이력

| Hash | Description |
|------|-------------|
| `bf41b174f` | KPA-a: Operator 5-Block (Operator UX Core Freeze 시점) |
| `7beb12e91` | KPA-b: Branch Operator 5-Block + Branch Admin 4-Block |
| `e3b78b64f` | CI/CD fix: missing files + null guards |
| `dda8ccb5f` | KPA-c: District Operator 5-Block + District Admin 4-Block |

---

## 10. Related Documents

| 문서 | 경로 |
|------|------|
| Operator UX Core Freeze | `docs/platform-core/OPERATOR_UX_CORE_FREEZE_V1.md` |
| Admin UX Core Freeze | `docs/platform-core/ADMIN_UX_CORE_FREEZE_V1.md` |
| Operator OS Baseline | `docs/_platform/BASELINE-OPERATOR-OS-V1.md` |
| Admin/Operator Role Policy | `docs/platform-core/ADMIN_OPERATOR_ROLE_POLICY_V1.md` |
| KPA Society 서비스 구조 | `docs/_platform/KPA-SOCIETY-SERVICE-STRUCTURE.md` |
| CLAUDE.md (Constitution) | `CLAUDE.md` Section 20, 21 |

---

*Created: 2026-02-17*
*Version: 1.0*
*Status: FROZEN*
