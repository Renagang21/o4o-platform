# O4O Guide pageKey Catalog V1

> WO-O4O-GUIDE-PAGE-KEY-CATALOG-V1
> Status: Active
> 적용 시점: 2026-05-05

## 목적

O4O Guide 기능에서 두 가지 안내 형식이 같은 `guide_contents` 테이블 안에 공존한다:

- **GuideBlock JSON** — 구조화된 사용법 안내 (title / description / steps / variant)
- **GuideEditableSection plain text** — 자유 본문 (가이드 페이지, 허브 안내 등)

본 문서는 두 형식이 같은 `(serviceKey, pageKey, sectionKey)` 튜플 안에서 충돌하지 않도록 **pageKey 명명 규칙**과 **1차 적용 카탈로그**를 확정한다.

코드 변경은 동반하지 않는다. 본 문서는 후속 WO (`WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1`)의 입력이 된다.

---

## 1. pageKey 기본 규칙

### 1-1. GuideBlock (JSON) pageKey

```
{domain}.{screen}.{purpose}
```

| 부분 | 의미 | 예 |
|------|------|----|
| domain | 기능 도메인 | lms, store, forum, content, event, signage |
| screen | 대상 화면 단위 | lesson, course, channel, request, offer, playlist |
| purpose | 화면의 작업 성격 | editor, manager, management |

**예시:**
```
lms.lesson.editor
store.channel.editor
forum.request.management
content.resource.editor
event.offer.editor
signage.playlist.manager
```

### 1-2. GuideEditableSection (plain text) pageKey

```
guide.{page}
hub.{domain}
manual.{domain}
```

| prefix | 용도 |
|--------|------|
| `guide.*` | 사용자/회원 대상 가이드 페이지 본문 |
| `hub.*` | 도메인 허브 페이지 안내 본문 |
| `manual.*` | 운영자 매뉴얼 본문 |

**예시:**
```
guide.intro
guide.features
guide.manual
hub.store
hub.content
manual.signage
```

---

## 2. sectionKey 규칙

GuideBlock JSON에서 사용할 표준 sectionKey:

| sectionKey | 용도 |
|------------|------|
| `page-help`   | 화면 상단 기본 사용법 안내 |
| `form-help`   | 입력 폼 안내 |
| `list-help`   | 목록/테이블 안내 |
| `action-help` | 승인/거절/처리 액션 안내 |
| `empty-help`  | 빈 상태 안내 |

**예외**: 한 화면에 여러 종류의 객체가 공존하는 경우(예: LMS 레슨 편집기의 `article/video/quiz/assignment/live`), 객체 종류를 sectionKey로 사용한다. 이 경우 표준 sectionKey 대신 객체 키를 우선한다.

---

## 3. 데이터 형식 분리 기준

### 3-1. GuideEditableSection (plain text)

- **저장 형식**: 일반 텍스트 (Markdown 허용)
- **사용처**: 긴 설명문, 가이드 페이지 본문, 허브 안내 본문
- **금지**: JSON 저장 금지

### 3-2. GuideBlock (JSON)

- **저장 형식**: `JSON.stringify({ title, description, steps[], variant })`
- **사용처**: 등록/수정/관리 화면의 사용법 안내
- **금지**: plain text 저장 금지

같은 (serviceKey, pageKey, sectionKey) 튜플은 **하나의 형식만** 가져야 한다. legacy plain text가 GuideBlock pageKey에 남아있는 경우, 운영자 안내 문구 관리 화면에서 JSON 형식으로 덮어쓴다.

---

## 4. 4개 서비스 1차 적용 pageKey 카탈로그

본 카탈로그는 **GuideBlock JSON** 적용 후보를 정리한다. 각 항목은 후속 WO (`WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1`)에서 실제 화면에 GuideBlock을 부착하는 작업의 입력이 된다.

### 4-1. KPA-Society

| pageKey | 적용 예정 화면 |
|---------|----------------|
| `lms.course.editor` | LMS 코스 생성/편집 |
| `lms.lesson.editor` | LMS 레슨 생성/편집 (article/video/quiz/assignment/live) — **이미 적용** |
| `lms.quiz.editor` | LMS 퀴즈 문제/정답 편집 |
| `lms.assignment.editor` | LMS 과제 생성/편집 |
| `lms.live.editor` | LMS 라이브 세션 편집 |
| `content.document.editor` | 콘텐츠 문서 작성 |
| `content.resource.editor` | 자료/Resource 작성 |
| `forum.request.management` | 운영자 포럼 신청 관리 |
| `store.channel.editor` | 매장 채널 편집 |
| `signage.playlist.manager` | 사이니지 플레이리스트 관리 |

### 4-2. GlycoPharm

| pageKey | 적용 예정 화면 |
|---------|----------------|
| `content.document.editor` | 콘텐츠 문서 작성 |
| `content.resource.editor` | 자료/Resource 작성 |
| `forum.request.management` | 운영자 포럼 신청 관리 |
| `store.channel.editor` | 매장 채널 편집 |
| `store.product.management` | 매장 상품 관리 |
| `signage.playlist.manager` | 사이니지 플레이리스트 관리 |

### 4-3. K-Cosmetics

| pageKey | 적용 예정 화면 |
|---------|----------------|
| `content.document.editor` | 콘텐츠 문서 작성 |
| `content.resource.editor` | 자료/Resource 작성 |
| `forum.request.management` | 운영자 포럼 신청 관리 |
| `store.channel.editor` | 매장 채널 편집 |
| `store.product.management` | 매장 상품 관리 |
| `event.offer.management` | 이벤트 오퍼 운영자 승인 관리 |

### 4-4. Neture

| pageKey | 적용 예정 화면 |
|---------|----------------|
| `operator.brand.management` | 운영자 브랜드 관리 |
| `supplier.product.editor` | 공급자 상품 편집 |
| `supplier.event-offer.editor` | 공급자 이벤트 오퍼 편집 |
| `operator.event-offer.management` | 운영자 이벤트 오퍼 관리 |
| `content.resource.editor` | 자료/Resource 작성 |
| `forum.request.management` | 운영자 포럼 신청 관리 |

---

## 5. 운영자 관리 화면 config 기준

각 서비스의 `/operator/guide-contents` 화면(`@o4o/operator-core-ui/modules/guide-contents`)은 `GuideContentsConfig`를 통해 pageKey 목록을 주입받는다.

운영자 화면이 다루는 항목별로 다음 정보를 함께 노출해야 한다:

| 정보 | 설명 |
|------|------|
| label | 운영자에게 표시할 한국어 라벨 |
| pageKey | 백엔드 저장 키 |
| sectionKey | 화면 내부 섹션 키 (탭) |
| guide type | `GuideBlock JSON` 또는 `Editable plain text` |
| 적용 예정 화면 | 실제로 안내가 노출되는 화면 경로 |

> **현재 상태 (2026-05-05)**: `GuideContentsConfig`는 `pageKey` + `sections[{key,label}]`만 받는다. 위 5개 정보를 모두 표현하는 확장은 **본 WO 범위 밖**이며, 후속 WO에서 다룬다.

---

## 6. 금지 규칙

| 규칙 | 사유 |
|------|------|
| 같은 pageKey에서 plain text와 JSON 혼용 금지 | 같은 튜플에서 두 형식이 섞이면 fallback 로직이 무한히 분기됨 |
| 기존 `guide.*` pageKey에 GuideBlock JSON 저장 금지 | guide.* 는 plain text 본문 전용 |
| `lms.lesson.editor` 같은 GuideBlock pageKey에 plain text 저장 금지 | GuideBlock pageKey는 JSON 전용 |
| 서비스별 의미가 다른 화면에 같은 pageKey를 억지 재사용 금지 | 데이터는 serviceKey로 격리되지만, 의미가 다르면 별도 pageKey로 |
| pageKey를 UI 라벨 기준으로 만들지 말 것 | UI 라벨은 변경 가능, pageKey는 변경 어려움. domain 기반 명명 |

---

## 7. 후속 WO

- **WO-O4O-GUIDE-BLOCK-1ST-WAVE-APPLY-V1** — 본 카탈로그를 입력으로 1차 적용 화면에 GuideBlock 부착
- 운영자 안내 화면의 5-정보 확장 (별도 WO)

---

## 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-05-05 | V1 초안 — 4개 서비스 1차 카탈로그 + 분리 기준 + 금지 규칙 |
