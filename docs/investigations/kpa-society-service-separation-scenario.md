# KPA Society 서비스 분리 시나리오

**작성일**: 2026-02-05
**Work Order**: WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1 (P2-T3)
**목적**: 분회 독립 서비스(Service C) 향후 분리 가능성 평가

---

## 현재 서비스 구조

### Service A: 메인 커뮤니티
- **경로**: `/`, `/services/*`, `/join/*`, `/pharmacy/*`, `/work/*`
- **역할**: 커뮤니티 중심 서비스, 약국 경영지원, 근무약사 업무
- **레이아웃**: `Layout` (Main Layout)
- **상태**: 독립적, 분리 불필요

### Service B: 지부/분회 연동 서비스
- **경로**: `/demo/*`, `/demo/admin/*`, `/demo/operator/*`, `/demo/intranet/*`
- **역할**: 조직 관리, 지부 관리자, 서비스 운영자
- **레이아웃**: `DemoLayout`
- **상태**: 독립적, Service C를 흡수

### Service C: 분회 독립 서비스 (현재 흡수 상태)
- **경로**: `/demo/branch/:branchId/*`
- **역할**: 분회 단독 운영 서비스
- **레이아웃**: `BranchLayout`
- **상태**: Service B에 흡수됨, 분리 가능성 높음

---

## Service C 분리 가능성 분석

### 핵심 컴포넌트 구조

#### 1. BranchRoutes (routes/BranchRoutes.tsx)
**역할**: 분회 라우팅 래퍼
**의존성**:
- `BranchProvider` - 분회 컨텍스트
- `BranchLayout` - 분회 레이아웃
- `branchApi` - 분회 API 클라이언트
- Branch 전용 페이지들 (`pages/branch/`)

**분리 용이성**: ✅ 높음 (명확한 경계, 독립적인 라우팅)

#### 2. BranchProvider (contexts/BranchContext.tsx)
**역할**: 분회 컨텍스트 (branchId, branchName 관리)
**의존성**:
- React Context API만 사용
- 외부 의존성 없음

**분리 용이성**: ✅ 매우 높음 (완전 독립)

#### 3. BranchLayout (components/branch/BranchLayout.tsx)
**역할**: 분회 전용 레이아웃
**의존성**:
- `BranchHeader` - 분회 헤더
- `BranchFooter` - 분회 푸터

**분리 용이성**: ✅ 높음 (분회 컴포넌트만 사용)

---

## 분리 시나리오

### 시나리오 1: 독립 앱 (권장)
**구조**:
```
apps/
  web-kpa-society/        # Service A + B
  web-branch-society/     # Service C (새 앱)
    src/
      routes/
        BranchRoutes.tsx
      contexts/
        BranchContext.tsx
      components/
        BranchLayout.tsx
        BranchHeader.tsx
        BranchFooter.tsx
      pages/
        branch/
          BranchDashboardPage.tsx
          BranchNewsListPage.tsx
          ...
      api/
        branch.ts
```

**배포**:
- Service A+B: `kpa-society.co.kr`
- Service C: `{branchId}.kpa-branch.co.kr` (서브도메인)

**장점**:
- 완전한 독립성
- 독립 배포 가능
- 분회별 커스터마이징 용이
- 명확한 서비스 경계

**단점**:
- 인프라 복잡도 증가
- 인증 공유 필요 (Cross-domain auth)

---

### 시나리오 2: 서브디렉토리 유지 (현재)
**구조**:
```
services/web-kpa-society/
  src/
    routes/
      BranchRoutes.tsx     # /demo/branch/:branchId/*
```

**배포**:
- 모든 서비스: `kpa-society.co.kr/demo/branch/:branchId`

**장점**:
- 단순한 구조
- 인증 공유 용이
- 배포 단순

**단점**:
- Service B와 결합됨
- 분회별 독립 배포 불가능
- 코드베이스 공유로 인한 충돌 가능성

---

## 분리를 위한 사전 작업 (P2-T3 범위 외)

### 필수 작업
1. **API 엔드포인트 분리**
   - 현재: `branchApi` (통합 API)
   - 향후: Branch 전용 API 서버 또는 독립 엔드포인트

2. **인증 전략 수립**
   - Cross-domain JWT 공유
   - SSO 구현 고려

3. **컴포넌트 추출**
   - `pages/branch/` → 독립 앱으로 이동
   - `components/branch/` → 독립 앱으로 이동
   - `api/branch.ts` → 독립 앱으로 이동

4. **라우팅 재구성**
   - App.tsx에서 BranchRoutes 제거
   - 독립 앱에 새로운 App.tsx 생성

---

## 의존성 맵 (Service C 분리 시)

### 독립 가능한 컴포넌트
- ✅ BranchRoutes
- ✅ BranchProvider
- ✅ BranchLayout
- ✅ BranchHeader, BranchFooter
- ✅ 모든 Branch 페이지 (`pages/branch/`)

### 공유 필요한 컴포넌트
- ⚠️ AuthProvider (인증 공유)
- ⚠️ Design Core v1.0 (공통 디자인 시스템)
- ⚠️ authClient (인증 클라이언트)

### 분리 불가능한 컴포넌트
- ❌ 없음 (모든 컴포넌트 독립 가능)

---

## P2-T3 완료 기준 체크

- ✅ 서비스 경계가 코드 주석으로 명확히 표시됨 (App.tsx)
- ✅ 분회 독립 서비스 분리 시나리오 문서화 (본 문서)
- ✅ 실제 분리 작업 없음 (구조만 준비)

---

## 결론

**Service C (분회 독립 서비스)는 향후 분리 가능한 구조를 갖추고 있음**

- **분리 용이성**: 높음 (모든 핵심 컴포넌트 독립적)
- **권장 시나리오**: 시나리오 1 (독립 앱)
- **현재 상태**: Service B에 흡수 (실용적 선택)
- **향후 작업**: 분회 독립 요구 시 본 시나리오 참조

---

*문서 작성: 2026-02-05*
*P2-T3 완료*
