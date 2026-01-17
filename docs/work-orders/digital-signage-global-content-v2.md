# WO-DIGITAL-SIGNAGE-GLOBAL-CONTENT-V2

### (운영자 중심 리라이트 버전 / Sprint 2-6 공식 Work Order)

**Version:** 2.0
**Phase:** 2 (Production Build)
**Sprint:** 2-6
**Status:** Ready for Execution
**Owner:** Digital Signage Team
**Audience:** FE/BE 개발팀, Operator Dashboard 개발팀

---

## 1. 목적

Digital Signage 시스템에서 **운영자(HQ Operator)**가 제작·배포한 글로벌 콘텐츠(동영상·플레이리스트·템플릿 등)를
모든 매장에서 자동으로 활용할 수 있도록 하고,
매장은 이를 **복사하여(local clone)** 자체 버전으로 커스터마이징할 수 있는 구조를 구축한다.

이 Work Order는 기존 WO-V1의 "관리자(Admin) 중심 구조"를 폐기하고,
**운영자 중심(Front-end)** 구조로 완전히 재작성한 것이다.

---

## 2. 역할 모델 (정식 규칙)

| 역할                        | 설명                 | 콘텐츠 생성     | 도메인                |
| ------------------------- | ------------------ | ---------- | ------------------ |
| **Admin (플랫폼 관리자)**       | 시스템 운영·모니터링·설정     | ❌          | admin.neture.co.kr |
| **HQ Operator (서비스 운영자)** | 글로벌 콘텐츠 제작 및 배포    | ✅          | 각 서비스의 운영자 대시보드    |
| **Supplier (공급업체)**       | 공급자 전용 프로모션 콘텐츠 제공 | △ (제한적)    | supplier dashboard |
| **Store (매장)**            | 콘텐츠 소비자 + 부분적 편집   | △ (로컬 콘텐츠) | store dashboard    |

**핵심 규칙:**
글로벌 콘텐츠 제작자는 절대 Admin이 아니며, **HQ Operator**이다.

---

## 3. 글로벌 콘텐츠 카테고리 (출처)

| Source        | 설명             | 매장 노출 방식          |
| ------------- | -------------- | ----------------- |
| **hq**        | 운영자가 만든 콘텐츠    | 모든 매장에 자동 노출      |
| **supplier**  | 공급업체가 제공한 콘텐츠  | 공급자-매장 연계 시 자동 노출 |
| **community** | 다른 매장이 공개한 콘텐츠 | 선택적 복사(clone)     |
| **store**     | 매장이 자체 제작한 콘텐츠 | 매장 로컬에서만 사용       |

추가 필드:

```typescript
Playlist.source: 'hq' | 'supplier' | 'community' | 'store'
Playlist.scope: 'global' | 'store'
Playlist.parentPlaylistId?: string
Media.parentMediaId?: string
```

---

## 4. Store Dashboard 구조 (Signage)

### 신규 메뉴 구성

```
Store Dashboard → Signage
    ├─ Global Playlists
    │    ├─ 운영자(HQ)
    │    ├─ 커뮤니티
    │    └─ 공급업체
    │
    ├─ My Playlists (내 플레이리스트)
    └─ My Media (내 단일 동영상)
```

### 각 탭의 역할

#### ① 운영자(HQ) 탭

* HQ Operator가 제작한 글로벌 콘텐츠 목록
* 매장에서 수정은 불가하지만 "복사하기" 가능
* 강제 항목이 포함될 수 있음

#### ② 커뮤니티 탭

* 다른 매장이 공개한 플레이리스트 목록
* 클릭하면 "내 플레이리스트로 복사"

#### ③ 공급업체 탭

* 공급업체에서 제공한 영상/플레이리스트
* 자동 추천, 카테고리 기반 정렬

---

## 5. Clone 기능 (핵심 요구사항)

### 5.1 플레이리스트 Clone 규칙

```
POST /signage/playlists/:id/clone
```

Clone 시 생성되는 구조:

```typescript
newPlaylist = {
  source: 'store',
  scope: 'store',
  parentPlaylistId: originalId,
  items: {
      forced: original.forcedItems,
      editable: cloned editable items
  }
}
```

---

## 6. 강제 항목 (Forced Items)

운영자가 글로벌 플레이리스트 내 특정 항목에 대해:

* 삭제 금지
* 편집 금지
* **순서 변경만 가능**

이 규칙을 적용할 수 있어야 함.

Store Playlist Editor에서 다음 UI 추가:

* 🔒 아이콘
* hover 시 "운영자가 지정한 필수 항목"

이는 **운영자 수익 사업 모델**의 핵심 요소임.

---

## 7. 단일 동영상도 동일 구조로 제공

기존의 "플레이리스트 중심" 구조를 확장하여
**단일 동영상도 글로벌 콘텐츠로 제공** 가능하게 함.

### 기능 요구사항:

* HQ Operator가 업로드한 단일 영상이
  Global Media → HQ 탭에 자동 표시
* 매장은 단일 영상도 "내 미디어(My Media)"로 복사 가능
* 복사된 미디어는:

  * 플레이리스트 삽입 가능
  * 템플릿 조합 가능
  * 스케줄 편성 가능

---

## 8. Community Playlist 공개 규칙

매장은 다음 옵션으로 자신이 만든 플레이리스트를 커뮤니티에 공개 가능:

```typescript
Playlist.isPublic: boolean
```

공개된 플레이리스트는:

* Community 탭에서 노출
* 다른 매장이 복사하여 사용 가능
* 출처 표시(optional)

---

## 9. BE API 작업 항목

### 9.1 목록 API

```
GET /signage/global/hq/playlists
GET /signage/global/community/playlists
GET /signage/global/supplier/playlists
POST /signage/playlists/:id/clone
POST /signage/media/:id/clone
```

### 9.2 신규 필드 추가 (Entity)

* Playlist.source
* Playlist.scope
* Playlist.parentPlaylistId
* PlaylistItem.isForced
* Playlist.allowDelete
* Playlist.allowEdit

---

## 10. FE 작업 항목

### 10.1 Store Dashboard

* Signage 메뉴 개편
* "Global Playlists" 3-탭 UI 구현
* "My Playlists / My Media" 개편
* 플레이리스트 clone 버튼
* 단일 미디어 clone 버튼
* Forced UI 구현(🔒 표시)

### 10.2 HQ Operator Dashboard

* 글로벌 플레이리스트 제작 화면
* 단일 영상 업로드 + 글로벌 공개
* 플레이리스트 강제 항목 설정 UI
* 글로벌 콘텐츠 통계 페이지

---

## 11. Definition of Done (DoD)

### Backend

* 모든 글로벌 카테고리 API 동작
* Clone API 100% 동작
* 강제 항목, parentPlaylistId 기능 정상 작동
* Community 공개 기능 정상 작동

### Frontend

* Store Dashboard 3-탭 UI 완성
* My Playlists / My Media 완성
* HQ Operator 콘텐츠 생성 UI 정상 동작
* 강제 항목 편집 제한 UI 동작

### 비즈니스 로직

* 운영자가 지정한 강제 항목은 매장에서 삭제 불가
* 단일 영상도 플레이리스트/템플릿/스케줄에서 사용 가능

---

## 12. Execution Notes (Sprint 방향성)

* 본 WO는 **Sprint 2-6 전체 범위의 기반 사양**
* Sprint 2-6 시작과 동시에 FE/BE 통합 구현 착수
* 이후 스프린트에서 HQ Operator Dashboard 강화 예정

---

*Created: 2026-01-17*
*Sprint: 2-6*
*Status: Ready for Execution*
