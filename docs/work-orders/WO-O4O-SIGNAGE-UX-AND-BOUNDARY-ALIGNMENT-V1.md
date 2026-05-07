# WO-O4O-SIGNAGE-UX-AND-BOUNDARY-ALIGNMENT-V1

> **Store Signage UX 정렬 및 HUB/Store 경계 정비 작업 요청서**
>
> 기준 문서: IR-O4O-STORE-SIGNAGE-CURRENT-STATE-AUDIT-V1 (2026-04-17, 2차 검증 반영)
>
> 작성 일자: 2026-04-17
> 상태: DRAFT (실행 전 승인 필요)

---

## 0. 배경 — 왜 "UX 정렬"인가

### IR 2차 검증 핵심 발견

| 항목 | 초기 판정 | 2차 검증 정정 |
|------|----------|--------------|
| GlycoPharm 데이터 엔진 | Core 직접 CRUD (3개 엔진) | `store_playlists` 스냅샷 (KPA와 동일, 2개 엔진) |
| K-Cosmetics 통합 가능성 | `store_*`로 병합 가능 | COSMETICS-DOMAIN-RULES §1.1-1.2 위반 — **통합 불가** |
| 전체 판정 | FAIL | **PARTIAL** |

### 핵심 통찰

> **문제는 "구조 문제"가 아니라 "구현/정렬 문제"이다.**

- 데이터 엔진은 **이미 수렴됨** (KPA + GlycoPharm = `store_playlists` 스냅샷)
- K-Cosmetics 격리는 **규칙 필수** (변경 불가)
- 대규모 데이터 마이그레이션 **불필요**
- 실제 문제: **UI 완성도 격차** + **HUB/Store 경계 혼재** + **Schedule 불일치**

---

## 1. 작업 목적

현재 서비스별로 완성도가 다른 Store Signage UI를
**동일한 기능 세트와 역할 경계로 정렬**한다.

---

## 2. 작업 범위

### 포함

| 영역 | 설명 |
|------|------|
| KPA Store Signage 현대화 | raw SQL 제거, Entity 통일, 2-tab→3-tab 전환 |
| HUB/Store 역할 경계 확립 | 탐색(browse)은 HUB, 운영(manage)은 Store |
| Schedule 정책 확정 | GlycoPharm 기준으로 플랫폼 표준 or Out of Scope |
| Player 표준화 | 재생 데이터 소스를 `store_playlists` 기반으로 통일 |
| Design Core 적용 | 모든 서비스 사이니지 화면에 Design Core v1.0 적용 |

### 제외

| 영역 | 사유 |
|------|------|
| 데이터 엔진 마이그레이션 | IR 2차 검증: 이미 수렴됨. 불필요 |
| K-Cosmetics 테이블 병합 | COSMETICS-DOMAIN-RULES 위반. 불가 |
| Core 테이블 구조 변경 | Core 동결 정책 (CLAUDE.md §3) |
| 신규 기능 추가 (AI, 고급 Template) | 현재 기능 정렬이 우선 |
| HUB 기능 변경 | HUB 콘텐츠 생성/관리는 현행 유지 |

---

## 3. 핵심 목표

1. **모든 서비스의 Store Signage가 동일한 최소 기능 세트를 갖춤**
2. **HUB = 탐색(browse) + 가져오기, Store = 운영(manage) + 재생**
3. **Schedule/Forced Content가 플랫폼 표준으로 문서화됨**
4. **모든 사이니지 화면이 Design Core v1.0 준수**

---

## 4. Store Signage MVP 기능 세트 (정의)

> Phase 실행 전 합의 필요

| 기능 | 필수/선택 | 근거 |
|------|:---------:|------|
| 내 동영상 (My Assets) | **필수** | 매장 소유 미디어 관리 |
| 내 플레이리스트 (My Playlists) | **필수** | 매장 재생 목록 구성 |
| 스케줄 (Schedule) | **TBD** | GlycoPharm만 구현, 표준 승격 여부 결정 필요 |
| 가져올 콘텐츠 (Explore) | **금지** (Store 내) | HUB/ContentHub에서만 제공 |
| 재생 (Player) | **필수** | `store_playlists` 기반 fullscreen 재생 |
| 강제 콘텐츠 표시 | **필수** | HQ forced content 뱃지 표시 |

---

## 5. 수행 단계

---

### Phase 1. KPA Store Signage 현대화

> **목표**: KPA를 GlycoPharm 수준의 완성도로 끌어올림

#### 1.1 raw SQL → Repository 전환

| 현재 | 변경 |
|------|------|
| `store-playlist.controller.ts` 내 raw SQL | TypeORM Repository 패턴 |
| 타입 안전성 없음 | Entity 기반 타입 안전성 확보 |

**작업 내역:**
- `store-playlist.controller.ts` raw SQL 쿼리를 Repository 메서드로 전환
- `store-playlist.entity.ts`를 단일 소스로 확정
- 기존 KPA 전용 Entity와 Core Entity 간 충돌 해소

#### 1.2 2-tab → 3-tab 전환

| 현재 (KPA) | 변경 |
|------------|------|
| Tab 1: Playlist (신규) | Tab 1: 내 동영상 (Assets) |
| Tab 2: Assets (legacy) | Tab 2: 내 플레이리스트 (Playlists) |
| | Tab 3: 스케줄 (Schedule) — MVP TBD |

**작업 내역:**
- `StoreSignagePage.tsx`의 legacy Asset 탭 제거
- GlycoPharm `StoreSignageMainPage.tsx` Tab 2~4 구조를 참조하여 재구성
- Explore(탐색) 탭은 **포함하지 않음** — HUB로 이동
- Schedule 탭은 MVP 합의에 따라 포함/제외

#### 1.3 Entity 충돌 해소

**현상**: `store_playlists` 테이블에 2개 Entity가 매핑됨

| Entity | 위치 | 상태 |
|--------|------|------|
| KPA 전용 Entity | `api-server/routes/kpa/entities/` | 사용 중 |
| Core Entity | `digital-signage-core/` or 별도 정의 | 사용 중 |

**작업**: 단일 Entity로 통합, 미사용 Entity 제거

#### 검증 시나리오

- S1: KPA Store에서 플레이리스트 CRUD (생성→항목 추가→순서 변경→삭제)
- S2: 기존 데이터 정상 조회 (raw SQL→Repository 전환 후 동일 결과)
- S3: Legacy 탭 제거 후 기존 기능 누락 없음

---

### Phase 2. HUB / Store 역할 경계 확립

> **목표**: "탐색은 HUB, 운영은 Store" 원칙 확립

#### 2.1 역할 재정의

```
┌──────────── HUB ────────────┐    ┌──────── Store ────────┐    ┌──── Player ────┐
│ ContentHub / Library         │    │ My Assets              │    │ Device/Tablet   │
│                              │    │ My Playlists           │    │                 │
│ - Global 콘텐츠 Browse       │    │ - CRUD (매장 소유만)    │    │ - store_playlists│
│ - "가져오기" (snapshot copy) │───▶│ - 정렬/편집/삭제       │───▶│ - fullscreen    │
│ - 카테고리/소스 필터          │    │ - Schedule (TBD)       │    │ - loop 재생     │
│ - Community 콘텐츠 생성      │    │ - Forced Content 표시  │    │ - 자동 전환     │
└──────────────────────────────┘    └────────────────────────┘    └─────────────────┘
```

#### 2.2 KPA operatorMode 분리

| 현재 | 변경 |
|------|------|
| `ContentHubPage(operatorMode=true)` → Operator 콘텐츠 관리 | 별도 `HQMediaPage` / `HQPlaylistsPage` 사용 (이미 존재) |
| `ContentHubPage(operatorMode=false)` → Community 탐색 | `ContentHubPage` 순수 탐색 전용으로 단순화 |

**작업 내역:**
- `operatorMode` prop 제거
- Operator 관리 경로는 기존 `HQMediaPage` / `HQPlaylistsPage`로 통합
- `ContentHubPage`를 순수 커뮤니티 탐색 + "가져오기" 전용으로 단순화

#### 2.3 GlycoPharm Explore 탭 정책

| 현재 | 변경 |
|------|------|
| Tab 1 "가져올 콘텐츠" (Explore) — Store 화면 내 탐색 | Store 화면에서 제거 |
| ContentLibraryPage 별도 존재 | ContentLibraryPage를 HUB 영역으로 재배치 |

**작업 내역:**
- `StoreSignageMainPage` 4-tab → 3-tab (Explore 탭 제거)
- ContentLibraryPage 접근 경로를 HUB 영역으로 이동
- Store→HUB 연결: "콘텐츠 추가" 버튼 → HUB 페이지로 네비게이션

#### 2.4 "가져오기" 위치 통일

**표준**: HUB/ContentHub 화면에서만 `assetSnapshotApi.copy()` 호출

| 서비스 | 현재 "가져오기" 위치 | 변경 |
|--------|---------------------|------|
| KPA | ContentHubPage "가져가기" 버튼 | 유지 (이미 HUB 영역) |
| GlycoPharm | Explore 탭 → URL param 전달 | HUB/Library로 이동 |
| Neture | 없음 (browse-only) | HUB에서 제공 (필요 시) |
| K-Cosmetics | Hub 링크 | 유지 |

#### 검증 시나리오

- S4: HUB에서 "가져오기" → Store에서 가져온 콘텐츠 확인
- S5: Store 화면에 탐색(browse) UI가 없음을 확인
- S6: Operator ContentHub에서 operatorMode 기능이 HQMediaPage로 정상 이전

---

### Phase 3. Schedule + Player 표준화

> **목표**: Schedule 정책 확정 및 Player 데이터 소스 통일

#### 3.1 Schedule 정책 확정

**선택지:**

| 옵션 | 설명 | 영향 |
|------|------|------|
| A. 플랫폼 표준 승격 | 모든 서비스에 Schedule 탭 필수 | KPA/K-Cosmetics에 Schedule UI 추가 |
| B. 서비스 선택 기능 | 사용 여부를 서비스가 결정 | 문서화만 필요 |
| C. GlycoPharm 전용 유지 | 현행 유지 | 변경 없음, Out of Scope 명시 |

**권장**: 옵션 A (플랫폼 표준) — Schedule API/테이블이 이미 Core에 존재하므로 UI만 추가

#### 3.2 Schedule 대상 변경

```
기존: signage_playlists (Core) — GlycoPharm 현재 사용
변경: store_playlists (Store 엔진) — 스냅샷 기반으로 통일
```

**작업 내역:**
- `signage_schedules.playlistId` FK 대상을 `store_playlists`로 변경
- GlycoPharm Schedule API 수정 (이미 store_playlists 사용 중이면 변경 불필요)
- KPA/K-Cosmetics에 Schedule UI 추가 (옵션 A 채택 시)

#### 3.3 Player 데이터 소스 통일

| 서비스 | 현재 Player 데이터 소스 | 변경 |
|--------|------------------------|------|
| KPA | `store_playlists` (PublicSignagePage) | 유지 (표준) |
| GlycoPharm | `signage_playlists` (SignagePlaybackPage) | `store_playlists` 기반으로 변경 |
| Neture | 없음 | N/A |
| K-Cosmetics | `cosmetics_store_playlists` | 유지 (격리 규칙) |

**공유 컴포넌트**: `@o4o-apps/signage/SignagePlayer` → `store_playlists` 데이터를 입력으로 받는 표준 인터페이스 확정

#### 3.4 Forced Content 적용 통일

**표준 방식**: query-time에 `signage_forced_content_positions` 기반으로 `store_playlist_items`에 UNION 병합

**작업 내역:**
- KPA 스냅샷 엔진에서 forced content 적용 경로 확인/추가
- Forced content 뱃지를 모든 서비스 Store Signage에 표시

#### 검증 시나리오

- S7: Schedule 생성 → 지정 시간에 플레이리스트 자동 활성화
- S8: Player에서 `store_playlists` 기반 정상 재생 (모든 서비스)
- S9: Forced content가 플레이리스트에 자동 삽입되어 재생

---

### Phase 4. Design Core 적용

> **목표**: 모든 사이니지 화면에 Design Core v1.0 적용

#### 4.1 대상 화면

| 서비스 | 화면 | 현재 스타일 | 변경 |
|--------|------|-----------|------|
| KPA | StoreSignagePage | Custom table | Design Core DataTable |
| KPA | ContentHubPage | Custom table | Design Core DataTable |
| GlycoPharm | StoreSignageMainPage | Custom table + KPI cards | Design Core 표준 |
| Neture | SignageContentHubPage | Card grid | Design Core 표준 |
| K-Cosmetics | StoreSignagePage | Custom table | Design Core DataTable |

#### 4.2 공통 컴포넌트

- O4O 표준 DataTable
- O4O 표준 KPI Card
- O4O 표준 Modal / Drawer
- O4O 표준 Button / Badge

#### 검증 시나리오

- S10: 모든 서비스 사이니지 화면이 Design Core v1.0 준수
- S11: 기존 기능 동작에 영향 없음

---

## 6. Phase 의존 관계

```
Phase 1 (KPA 현대화)
    │
    ▼
Phase 2 (HUB/Store 경계)  ←── Phase 1 완료 후 KPA 구조가 안정되어야 경계 확립 가능
    │
    ├──▶ Phase 3 (Schedule + Player)  ←── HUB/Store 분리 후 Player 데이터 소스 결정
    │
    └──▶ Phase 4 (Design Core)  ←── UI 구조 확정 후 디자인 적용
```

**Phase 3과 Phase 4는 병렬 실행 가능** (Phase 2 완료 후)

---

## 7. 결과 판정 기준

### PASS

- 모든 서비스 Store Signage가 MVP 기능 세트 충족
- HUB/Store 역할 경계가 명확 (Store 내 탐색 UI 없음)
- Player가 모든 서비스에서 `store_playlists` 기반 정상 재생
- Design Core v1.0 적용 완료

### PARTIAL

- 일부 서비스만 정비 완료
- Schedule 정책 미확정

### FAIL

- KPA raw SQL 잔존
- HUB/Store 혼재 유지
- 서비스 간 기능 격차 유지

---

## 8. 작업 시 유의사항

1. **Core 동결 정책 준수** — `digital-signage-core` Entity/테이블 구조 변경 시 즉시 중단 후 WO 승인
2. **Cosmetics 격리 준수** — K-Cosmetics는 `cosmetics_` prefix 유지. `store_*`로 병합 금지
3. **Boundary Policy 준수** — Signage는 `serviceKey` 기반 (Broadcast 도메인)
4. **기존 기능 보존** — 각 Phase 완료 시 기존 재생·CRUD 기능 검증 필수
5. **단계별 배포** — Phase 단위로 배포·검증 후 다음 Phase 진행
6. **데이터 마이그레이션 없음** — 엔진은 이미 수렴됨. UI/API 수준 변경만 허용

---

## 9. 최종 정의

> **Store Signage는 HUB에서 가져온 콘텐츠를 매장 단위로 독립 운영하는 실행 시스템이다.**
>
> - 탐색과 가져오기는 **HUB** 영역
> - 구성과 관리는 **Store** 영역
> - 재생은 **Player** 영역
> - 데이터 소유권은 **스냅샷 기반 독립**

---

## 10. 관련 문서

| 문서 | 역할 |
|------|------|
| `docs/audit/IR-O4O-STORE-SIGNAGE-CURRENT-STATE-AUDIT-V1.md` | 현황 감사 (본 WO의 근거) |
| `docs/kpa/IR-KPA-SIGNAGE-CURRENT-STATE-AUDIT-V1.md` | KPA 한정 현황 감사 |
| `docs/kpa/WO-KPA-SIGNAGE-DEAD-CODE-RETIREMENT-PLAN-V1.md` | Dead code 제거 계획 |
| `docs/kpa/WO-KPA-SIGNAGE-IA-RESTRUCTURE-DRAFT-V1.md` | KPA IA 재설계 초안 |
| `docs/architecture/COSMETICS-DOMAIN-RULES.md` | K-Cosmetics 격리 규칙 (통합 금지 근거) |
| `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` | Boundary Policy (Broadcast=serviceKey) |
| `docs/rules/design-core-governance.md` | Design Core 거버넌스 |

---

*작성자: Claude (Opus 4.6)*
*작성 일자: 2026-04-17*
*기준: IR-O4O-STORE-SIGNAGE-CURRENT-STATE-AUDIT-V1 (2차 검증 반영)*
*상태: DRAFT — Phase 1 세부 실행 요청서 별도 작성 가능*
