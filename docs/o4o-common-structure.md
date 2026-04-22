# O4O Common Structure Principles

> **O4O의 forum, lms, signage는 공통 구조이며, 각 서비스는 동일 구조 위에서 자신의 데이터를 노출한다.**

---

**버전**: V1  
**작성일**: 2026-04-22  
**상태**: Active

---

## 1. 개요

O4O 플랫폼은 여러 독립 서비스(KPA-Society, GlycoPharm, Neture 등)로 구성되어 있으나,
핵심 기능 영역(Forum, LMS, Signage)은 **서비스별로 재구현하지 않고 공통 구조를 공유**한다.

| 구분 | 설명 |
|------|------|
| **공통 구조** | Forum, LMS, Signage의 UI 컴포넌트, 라우트, API 계약, 데이터 모델 |
| **서비스별 내용** | 각 서비스의 카테고리, 게시물, 콘텐츠, 설정 값 |

---

## 2. 공통 구조 정의

### `/forum`

| 항목 | 공통 구조 | 서비스별 내용 |
|------|-----------|--------------|
| 게시판 목록 | 카테고리 목록 UI, 페이지네이션, 검색 | 카테고리 데이터 (KPA 약사포럼, GlycoPharm 게시판 등) |
| 게시글 상세 | 본문 렌더링, 댓글, 좋아요, 파일 첨부 | 실제 게시글 내용 |
| 권한 처리 | 읽기/쓰기/관리자 분기 구조 | 서비스별 멤버십/역할 기준 |
| API 계약 | `/api/v1/{service}/forum/*` 경로 구조 | serviceKey 기반 데이터 격리 |

### `/lms`

| 항목 | 공통 구조 | 서비스별 내용 |
|------|-----------|--------------|
| 강좌 목록 | 수강 상태, 진도, 카드 UI | 강좌 데이터 (KPA 교육, 외부 전문가 강의 등) |
| 강좌 상세 | 레슨 구성, 수료 처리, 인증서 | 실제 강좌 내용 |
| 수료 처리 | CourseCompletion 모델, 인증서 발급 흐름 | 서비스별 이수 기준 |
| 크레딧 | CreditBalance/CreditTransaction 모델 | 서비스별 크레딧 정책 |

### `/signage`

| 항목 | 공통 구조 | 서비스별 내용 |
|------|-----------|--------------|
| 화면 구성 | 플레이리스트, 슬라이드, 스케줄 | 매장별 콘텐츠 |
| 디바이스 관리 | 기기 등록, 상태 모니터링 | 매장 기기 목록 |
| 콘텐츠 타입 | 이미지/영상/공지 구조 | 서비스별 템플릿 |

---

## 3. 구조 vs 데이터 분리 원칙

> **구조는 공유하고, 내용은 서비스별로 다르게 노출한다.**

### 적용 방식

```
공통 구조 (Core)
├── UI 컴포넌트 (공유)
├── API 경로 패턴 (공유)
├── 데이터 모델 (공유)
└── 비즈니스 로직 (공유)

서비스별 내용 (Data Layer)
├── serviceKey 기반 격리
├── 카테고리/강좌/콘텐츠 데이터
└── 서비스별 권한 정책
```

### 금지 패턴

```
❌ 서비스별로 Forum/LMS/Signage를 별도 재구현
❌ 서비스별 UI 분기 (if (service === 'kpa') { ... })
❌ 서비스별 독립 테이블 생성 (kpa_forum_posts, glycopharm_posts)
❌ 공통 구조 컴포넌트의 서비스별 복사
```

### 허용 패턴

```
✅ serviceKey로 데이터 격리
✅ 서비스별 카테고리/설정 값 분리
✅ 서비스별 권한 정책 (membership 기반)
✅ 공통 컴포넌트에 서비스별 설정 주입
```

---

## 4. KPA-Society의 역할

KPA-Society는 O4O 공통 구조의 **reference implementation**이다.

| 역할 | 설명 |
|------|------|
| **기준 구현** | Forum, LMS, Signage가 처음으로 완성되는 서비스 |
| **조사 기준** | 다른 서비스에 구조를 이식하기 전 KPA 구현을 먼저 분석 |
| **패턴 출처** | KPA에서 검증된 패턴을 다른 서비스에 적용 |

> KPA-Society의 구조가 변경되면 다른 서비스에도 영향이 전파될 수 있다.  
> KPA 구조 변경 시 반드시 공통 구조 문서와 함께 검토할 것.

---

## 5. 작업 방식 원칙

새로운 Forum/LMS/Signage 관련 작업 시 아래 순서를 따른다.

```
1. KPA-Society 구현 기준 조사
   → 현재 구조가 어떻게 되어 있는지 먼저 파악

2. 공통 구조 판단
   → 해당 기능이 공통 구조인지, 서비스별 내용인지 분류

3. 타 서비스 정렬
   → 공통 구조이면 동일 패턴으로 적용
   → 데이터 레이어만 서비스별로 분리

4. 데이터는 서비스 기준
   → serviceKey 격리, 멤버십 기반 권한
```

---

## 6. 금지 사항

| 금지 | 이유 |
|------|------|
| 서비스별 구조 재설계 | 공통 구조 원칙 위반 |
| 기능 복사 (copy-paste) | 유지보수 분기 발생 |
| 구조 변형 | 다른 서비스 정렬 시 충돌 |
| 공통 구조 컴포넌트를 서비스 전용으로 변경 | 재사용 불가 |
| 서비스별 독립 포럼/LMS/Signage 테이블 생성 | Boundary Policy 위반 |

---

## 7. 참조 문서

| 영역 | 문서 |
|------|------|
| KPA Society 구조 | `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md` |
| Forum APP 표준 | CLAUDE.md § 13 APP 표준화 (APP-FORUM Frozen) |
| Signage APP 표준 | CLAUDE.md § 13 APP 표준화 (APP-SIGNAGE Frozen) |
| Boundary Policy | `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` |
| LMS Core 원칙 | `docs/platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md` |
| Content Core | `docs/platform/content-core/CONTENT-CORE-OVERVIEW.md` |
