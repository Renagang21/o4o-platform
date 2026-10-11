# KPA Society 서비스 구조 기준 문서

> **2026-10-10 용어 정비**: 현행 사업 명칭은 **약국 협력사업**이다. 내부 식별자·가입/승인·주문 계약과 과거 실행 결과는 유지한다. 대표 홈의 탐색 분류·준비 중 노출은 [서비스 탐색 정본](O4O-HOME-SERVICE-DISCOVERY-V1.md)을 따른다. 이 갱신은 화면 구현·배포 완료를 뜻하지 않는다.

> **문서 성격**: 헌법 문서 (Constitution)
> **최종 수정**: 2026-09-17 (v1.1 — Community Identity · 데모 서비스 제거 완료 반영, `WO-O4O-FINAL-ROLE-WORKSPACE-ARCHITECTURE-CENSUS-AND-CLOSURE-V1`)
> **버전**: 1.1
> **정합 기준**: 역할별 업무공간 · Community Identity 는 [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §1 · §3 · §5 가 상위 정본이다. 본 문서의 "3개 서비스" 는 `kpa-society.co.kr` 도메인 안의 **화면 영역 구분**이며 catalog Service Identity(`kpa-society` · `kpa-branch`)나 Community Identity(`pharmacy`)를 대체하지 않는다.
> **호스트 정합 (2026-10-03)**: 본문의 `kpa-society.co.kr` 은 이 앱(`kpa-society`)의 **옛 주소**다. 현재 주소 의미는 [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) 가 정한다 — 이 앱 = `pharmacy.neture.co.kr`(약국 사업자 대상 약국 협력사업 운영 서비스) · 분회 서비스(§3.2) = 별도 앱 `kpa-branch` 의 `kpa.neture.co.kr/{분회}`(약사 개인 대상) · 커뮤니티 영역(§3.1)의 독립 주소 = `community.neture.co.kr/pharmacist`. 본문의 영역 구분 · 원칙은 그대로 유효하다.

---

## 1. 개요

`kpa-society.co.kr` 도메인에는 **3개의 독립적인 서비스**가 공존한다.
본 문서는 각 서비스의 정의, 경계, 상태를 명확히 규정하여
기획·개발·정비 과정에서 발생하는 혼선을 방지한다.

---

## 2. 서비스 구조 (3-Service Architecture)

| 서비스 | 설명 | 상태 | 비고 |
|--------|------|------|------|
| **커뮤니티 서비스** | 약사/약대생 대상 커뮤니티 | **유지** | Forum 포함 |
| **분회 서비스** | 실제 분회 운영 서비스 | **유지** | 다분회, 서브디렉토리 기반 |
| **지부/분회 서비스 데모** | 데모/시연용 서비스 | **제거 완료** (2026-09 기준 `/demo/*` route 없음) | 기록 보존 |

---

## 3. 각 서비스 정의

### 3.1 커뮤니티 서비스

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PH forum route/원장 adapter·Hub template 채택·활성 serviceKey 예시·프로비저닝 CLI 실행/유지 계약은 [완전 폐기 정책](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 새 소비처/구현/프로비저닝 대상이 아니며 PH 경로·등록/호환 참조를 제거한다. 공용 KPA/약사 커뮤니티·콘텐츠 모델·다른 서비스·인쇄 QR 연결은 보존하고 데이터 삭제는 전용 귀속/FK·타 서비스 소비처 확인 후 수행한다. 아래 PH 구조는 폐기 전 이력이다.


- **대상**: 약사, 약대생
- **목적**: 정보 공유, 토론, 커뮤니티 활동
- **포함 기능**:
  - Forum (게시판)
  - 홈 피드
  - 사용자 프로필
- **진입점**: `/` (메인 홈)
- **Community Identity (2026-09-16~)**: Forum 은 KPA-Society 만의 기능이 아니라 O4O **약사 커뮤니티**(`communityKey=pharmacy`, Catalog `apps/api-server/src/config/community-catalog.ts`)의 기능이다. KPA `/kpa/forum` 과 Pharmacy-Hub `/pharmacy-hub/forum` 은 같은 원장 코드 집합(kpa-society + pharmacy-hub)을 소비하며 참여 판정은 `resolveCommunityAccess` 한 곳이다 (ROLE-WORKSPACE §5). "커뮤니티 서비스" 라는 이 문서의 화면 영역 이름은 그대로 두되, 데이터 · Identity 경계로 읽지 않는다.
- **Store Workspace**: 「약국경영」 영역은 공통 Store Workspace(`@o4o/store-ui-core` `workspace/`, `/store/workspace`)의 KPA 조립이다 (ROLE-WORKSPACE §3-1). `/mobile/pharmacy` 는 `/store/workspace` 로 redirect 만 남았다.

### 3.2 분회 서비스

- **대상**: 각 지역 분회
- **목적**: 분회별 실제 운영 서비스 제공
- **구조**: 서브디렉토리 기반 다분회 구조 — 별도 프런트 `services/web-kpa-branch` · catalog Service `kpa-branch` (`workspaceMode=none`, operator 만)
- **상태**: 실서비스 (Production)
- **진입점**: 분회 서비스 안내 페이지

### 3.3 지부/분회 서비스 데모

- **대상**: 시연/테스트용
- **목적**: 서비스 데모, 기능 테스트
- **경로**: `/demo/*`
- **상태**: 제거 완료 — `services/web-kpa-society/src/App.tsx` 에 `/demo/*` route 없음 (2026-09-17 확인). 본 절은 기록 보존
- **비고**: 실서비스 분회와 혼동 주의

---

## 4. 핵심 원칙

### 4.1 라우트 위치 ≠ 서비스 소속

```
Forum이 /forum에 있다고 해서 "Forum 서비스"가 아니다.
Forum은 커뮤니티 서비스의 기능이다.
```

라우트(URL 경로)는 기술적 구현이며, 서비스 소속과 동일하지 않다.

### 4.2 서비스 경계 명확화

| 기능/페이지 | 서비스 소속 |
|------------|------------|
| 홈 피드 | 커뮤니티 서비스 |
| Forum | 커뮤니티 서비스 |
| 사용자 프로필 | 커뮤니티 서비스 |
| 약국경영 | 독립 실서비스 |
| 분회 운영 기능 | 분회 서비스 |
| `/demo/*` | 지부/분회 서비스 데모 |

### 4.3 상단 메뉴와 서비스 소속

상단 메뉴는 **서비스 진입점**을 나타내며, 기능 나열이 아니다.

```
올바른 메뉴 구조:
홈 | 약국경영 | 분회 서비스   (지부/분회 서비스 데모는 제거 완료)

잘못된 메뉴 구조:
홈 | 포럼 | 관리자 | 약국경영 | ...
(기능과 서비스가 혼재)
```

---

## 5. 개발 준수 규칙

### 5.1 서비스 소속 판단 기준

새로운 기능/페이지를 추가할 때:

1. **어떤 서비스에 속하는가?** → 3개 서비스 중 선택
2. **라우트는 해당 서비스의 컨텍스트에 맞는가?**
3. **상단 메뉴에 노출이 필요한가?** → 서비스 진입점만 노출

### 5.2 혼선 방지 규칙

- Forum 관련 작업 시: "커뮤니티 서비스"로 인식
- `/demo` 관련 작업 시: 제거 완료된 영역 — 재도입하지 않는다
- 분회 기능 작업 시: "분회 서비스"로 인식
- 상단 메뉴 변경 시: 본 문서 기준 준수

### 5.3 금지 사항

- 상단 메뉴에 기능 단위 항목 추가 (예: 포럼, 관리자)
- 서비스 경계를 무시한 기능 배치
- 데모 서비스를 실서비스로 홍보/안내

---

## 6. 변경 관리

본 문서는 **헌법 문서**로서:

- 변경은 사전 합의 후만 가능
- 변경 시 버전 업데이트 필수
- 관련 코드/UI 변경과 동기화 필수

---

## 7. 관련 문서

- `CLAUDE.md` - 플랫폼 개발 헌법
- [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) - 역할별 업무공간 · Community Identity(§5) · Store Workspace(§3)
- [`KPA-UX-BASELINE-V1`](KPA-UX-BASELINE-V1.md) - KPA UX Frozen (F2)
- [`docs/CANONICAL-INDEX.md`](../CANONICAL-INDEX.md) - 정본 색인 (구 `docs/app-guidelines/` 는 삭제됨 — 링크 정리 2026-09-17)

---

*문서 생성: 2026-02-06*
*작업 요청서: WO-KPA-SOCIETY-SERVICE-STRUCTURE-BASELINE-V1*
