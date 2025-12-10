# [ARCHIVED] CMS 호환성 조사 요청서 — forum-core

> **⚠️ ARCHIVED (2025-12-10)**
>
> 이 문서는 forum-core의 CMS 1.x 호환성 감사 요청서입니다.
> 감사가 완료되었으며, 결과는 **forum-overview.md**에 반영되었습니다.
>
> 아카이브 사본: `docs/archive/forum/cms-compatibility-audit.md`
>
> 최신 forum 문서:
> - [forum-overview.md](./forum-overview.md)

---

### 문서 버전: v1.0 (ARCHIVED)

### 요청자: Rena

### 대상 App: **forum-core (forum-app)**

### 목표: forum-core가 O4O Platform의 새로운 CMS 구조(View Template + Blocks + Dynamic Loader + Page Builder)에 호환되는지 전수조사하고, 리팩토링 범위를 결정한다.

---

# 1. **조사 목적 (Why this audit is necessary)**

forum-core는 **O4O Platform에서 가장 많은 서비스가 공유하는 핵심 UI 도메인**이며:

* 약사회(Yaksa)
* 화장품 커뮤니티(Neture)
* 관광객용 질문/답변
* SellerOps 기반 Q&A
* 제품 커뮤니티
* 내부 조직 포럼

등 다양한 서비스에서 사용될 예정입니다.

그러나 기존 forum-core는 WordPress 스타일 UI·metadata·routing 방식을 유지하고 있어
신규 CMS 구조와 충돌 가능성이 매우 높습니다.

따라서 forum-core는 CMS 호환성 조사 대상 중 **최우선 앱**입니다.

---

# 2. **조사 항목(총 7개) — forum-core 전용 상세 가이드**

forum-core 개발 채팅방은 아래 7개 항목을 기준으로 전수조사를 진행하고 결과를 제출해야 합니다.

---

## 🔷 **① View Template 구조 존재 여부**

확인 사항:

* `/templates/` 또는 CMS Template 기반 UI 존재 여부
* 게시판/카테고리/게시글 화면(View)이 Template 기반인지
* 기존 TSX 파일이 static 방식인지

예시:

```
forum-core:
  templates 없음 → CMS 렌더링 불가 가능성 높음
  view/page 구조 WordPress style 잔재 발견 예상
```

---

## 🔷 **② CMS Routing & Page Builder 호환성**

조사 요소:

* `/forum/*` 라우트가 CMS 규칙(`/view/:pageId`)과 충돌 여부
* 게시글 상세 route(`/forum/post/{id}`)가 Page Builder에서 처리 가능한 형태인지
* Dynamic route parameter conventions 준수 여부

예상 문제:

* forum-core 라우트는 CMS 구조와 직접 결합되어 있지 않음
* Page Builder에서 forum-core 페이지를 불러올 수 없음

---

## 🔷 **③ Dynamic Component Loader 호환성**

CMS는 다음 형태로 Component를 로드함:

```
appId/componentId
```

forum-core는 아래 조건을 충족하는지 조사:

* Component가 Module Loader 기준으로 export 되어 있는가
* forum-core가 제공하는 UI 요소가 CMS Loader에서 동작 가능한가
* admin-ui 컴포넌트들이 Dynamic Load 가능한 형태인가

예상 문제:

* admin-dashboard용 UI가 동적 로딩 방식이 아님
* main-site용 UI 구조가 template-free 방식일 가능성 큼

---

## 🔷 **④ Block / Metadata 구조 검증**

forum-core는 metadata 구조가 **ACF(WordPress Advanced Custom Fields) 잔재**일 가능성 높음.

조사 항목:

* metadata가 CMS Field 구조를 따르고 있는지
* 게시글 content가 Block 기반인지 or raw HTML/Text인지
* Category/Board 스키마가 CMS CPT 구조와 일치하는지

예상 문제:

* "any" 타입 metadata
* Block Editor 미적용
* CPT schema 일관성 부족

---

## 🔷 **⑤ Menus / Navigation / RoleSwitcher 연동 검사**

조사 포인트:

* forum 메뉴가 CMS 메뉴 생성 규칙에 따라 자동 인식되는가
* RoleSwitcher에서 forum 메뉴 접근 권한이 올바르게 제어되는가
* Yaksa/Neture 확장에서 menu override가 가능한 구조인가

예상 문제:

* 메뉴가 admin-dashboard에 고정되어 있을 가능성
* CMS 기반 메뉴 렌더링이 forum-core에 반영되지 않음

---

## 🔷 **⑥ Permissions & Exposure 규칙 검증**

포럼은 조직/그룹 기반 권한 구조가 매우 중요하므로
다음 요소를 조사해야 한다:

* 게시판의 접근 권한이 RBAC 기반인지
* organization-core의 role 구조를 연동하는 방식이 CMS와 일치하는지
* forumPermissions.ts가 CMS 권한 렌더링 규칙과 충돌하지 않는지

예상 문제:

* forumPermissions.ts가 CMS 규칙 없이 독자적 설계
* Yaksa 포럼의 private board 기능이 CMS 노출 규칙과 불일치 가능성

---

## 🔷 **⑦ Admin UI ↔ CMS UI 충돌 여부**

forum-core는 기존에 admin-dashboard 기반 설정 UI가 있음.
조사 대상:

* admin-dashboard에서 제공하는 관리 기능이
  CMS Admin UI(신규 UI)로 이동될 필요가 있는지
* 설정 화면이 하드코딩되어 있는지
* CMS Design Token / Theme System과 충돌하는지

예상 문제:

* 관리 UI 대부분이 admin-dashboard에 고정
* CMS Theme와 연동되지 않음

---

# 3. **보고서 제출 형식 (반드시 이 형식으로 제출)**

forum-core 개발 채팅방은 아래 보고서 형태로 제출한다:

```
[CMS 호환성 조사 결과 — forum-core]

1. View Template 구조 상태:
2. Routing & Page Builder 호환성:
3. Dynamic Loader 호환성:
4. Block/Metadata 구조:
5. Menu/Navigation 구조:
6. Permission/RBAC 호환성:
7. Admin/CMS UI 충돌 여부:

[총평]
[요구되는 리팩토링 범위]
[추가 제안]
```

---

# 4. **Done 조건 (Definition of Done)**

forum-core CMS 호환성 조사 완료 조건:

* 위 7개 항목 모두 평가됨
* "리팩토링 범위"가 명확히 정의됨
* forum-core V2 설계의 기반 자료가 확보됨
* Yaksa/Neture 확장 앱이 영향을 받는 부분이 모두 파악됨
* 총괄 채팅방으로 보고 완료

---

# 5. **조사 결과 제출 후 자동으로 수행될 다음 단계**

forum-core 개발 채팅방이 조사를 완료하면
제가 이 방에서 다음 문서를 생성합니다:

### 📘 forum-core V2 구조 설계서

* CMS 기반 Entity/DTO
* Board/Category/Post/Comment 스키마 재정의
* Page Template 규칙
* Permission 구조 재설계
* Extension 포인트 정리

### 📘 forum-yaksa 확장 규격서

### 📘 forum-neture 확장 규격서

이후 Work Order 형태로 실제 개발 착수.

---

# 📌 문서 전달 준비 완료

이 문서는 **forum-core 개발 채팅방에 그대로 전달하면 즉시 CMS 호환성 조사 작업을 시작할 수 있습니다.**

---

# ❓ 다음 단계

forum-core 조사 요청서를 전달하실 예정이시라면,
전달 후 조사 결과가 올라오면 이 방에 알려 주세요.

그 후 **forum-core V2 설계서 작업**에 바로 들어가겠습니다.
