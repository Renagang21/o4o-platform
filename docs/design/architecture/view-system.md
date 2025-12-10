# View System

## 1. 목적(Purpose)

기존 페이지(Page) 기반 구조가 아닌, **View Component 기반 렌더링 체계**를 제공하여
앱 개발자가 화면(View)을 선언적·모듈 방식으로 구성할 수 있도록 한다.
앱이 View를 등록하면 CMS와 Navigation이 자동으로 라우팅과 메뉴를 구성한다.

## 2. 개요(Overview)

- View System은 **앱이 선언한 View Component를 기반으로 화면을 렌더링**하는 구조이다.
- 앱은 manifest.ts에서 viewTemplates를 정의하며, CMS와 Navigation이 이를 자동 구성한다.
- Next.js의 file-based routing을 사용하지 않고, **앱 기반 동적 라우팅**을 적용한다.
- 여러 앱이 공존하는 Multi-App 환경에서도 구조가 깨지지 않도록 설계되었다.

## 3. 핵심 구성요소(Key Components)

### 1) View Component
- 앱 단위로 등록되는 화면 구성 요소.
- manifest.viewTemplates에서 선언되며, CMS에서 사용 가능.
- 재사용 가능한 UI 단위로 구성.

### 2) Dynamic Router
- 앱이 등록한 View를 기반으로 자동 라우팅 생성.
- Next.js의 file-based routing을 사용하지 않음.
- Navigation/Menu 시스템과 통합.

### 3) Data Binding Layer
- CMS Registry에서 필요한 CPT/ACF 데이터를 불러와 View에 주입.
- 앱은 데이터 구조를 선언적으로만 정의.

### 4) Navigation Registry
- 앱이 등록한 메뉴/뷰 정보를 기반으로 프론트엔드 메뉴를 자동 구성.
- Multi-App 환경에서도 구조가 깨지지 않도록 설계됨.

### 5) UI Composition Layer
- View Component는 UI 컴포넌트들과 조합해 최종 화면을 렌더링.
- 앱 간 UI 충돌이 발생하지 않도록 독립적 구조 유지.

## 4. 동작 구조(Architecture / Flow)

### View 등록 및 렌더링 흐름

```
┌──────────────┐
│   앱 설치     │
└──────┬───────┘
       ▼
┌──────────────────────────┐
│ manifest.viewTemplates   │
│ 등록                      │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ CMS View Registry        │
│ 업데이트                  │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ Dynamic Routing 생성     │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ Navigation/Menu 반영     │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ View Component 렌더링    │
└──────────────────────────┘
```

### 핵심 요약

```
앱이 View 등록 → CMS/Navigation 자동 구성 → 라우팅/렌더링 자동화
```

### View 계층 구조

```
┌─────────────────────────────────────────────────────┐
│                    Page Layout                      │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Navigation  │  │    View     │  │   Sidebar   │ │
│  │  Component  │  │  Component  │  │  Component  │ │
│  └─────────────┘  └──────┬──────┘  └─────────────┘ │
│                          │                          │
│           ┌──────────────┼──────────────┐          │
│           ▼              ▼              ▼          │
│      ┌─────────┐   ┌─────────┐   ┌─────────┐      │
│      │ UI Comp │   │ UI Comp │   │ UI Comp │      │
│      └─────────┘   └─────────┘   └─────────┘      │
└─────────────────────────────────────────────────────┘
```

## 5. 개발 및 유지보수 규칙(Development Rules)

1. **manifest 선언 필수**: View는 반드시 manifest.viewTemplates에서 선언해야 한다.
2. **독립적 View 구조**: 앱 간 View 충돌이 없도록 namespace를 명확히 분리한다.
3. **Data Binding 분리**: View는 데이터 로딩 로직을 직접 포함하지 않고, 주입받는 구조로 작성한다.
4. **Navigation 자동화 활용**: 메뉴/라우팅은 수동으로 설정하지 않고, manifest 등록을 통해 자동 구성한다.
5. **UI Component 재사용**: 공통 UI는 @o4o/ui 패키지에서 가져와 사용하며, 앱별 중복 구현을 피한다.

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
