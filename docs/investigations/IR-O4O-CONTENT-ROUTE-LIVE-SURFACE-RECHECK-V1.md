# IR-O4O-CONTENT-ROUTE-LIVE-SURFACE-RECHECK-V1

> **유형:** 보정(errata) IR (read-only, 코드/UI/route/API/DB 무변경)
> **목적:** 실제 live/code route 기준으로 3서비스 `/content` surface 를 재확인하고, 이전 IR 의 "surface 없음" 표현을 정확히 보정한다.
> **작성:** 2026-06-14
> **보정 대상:** IR-O4O-COMMUNITY-CONTENT-CROSSSERVICE-COMMONIZATION-AUDIT-V1(`08311186d`) · IR-O4O-CONTENT-STANDARD-MODULE-CROSSSERVICE-ALIGNMENT-V1(`dc52cc44c`)

---

## ⚠️ 핵심 보정 (먼저 읽을 것)

> **이전 표현 "KCos 에 `/content` surface 자체가 없음" 은 부정확하다.** 실제 App.tsx route 확인 결과:
> - **KCos: top-level `/content` route 미존재** → 회원-facing browse 는 **`/library/content`**(ContentLibraryPage).
> - **KPA: `/content` 존재** → `ContentListPage`(**회원 작성형** 허브).
>
> **정확한 표현 = "KCos 에 회원 작성형(write) `/content` 가 미적용이고, 콘텐츠 browse 가 그 자리(또는 `/library/content`)를 점유한다."** ("surface 없음" ✗ → "회원 작성형 미적용 / browse 점유" ✓)
>
> **판정: A안 + D안** — 기존 IR 의 **핵심 결론(표준화 방향·shell 추출)은 유지**, **표현만 보정**.

## 1. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `8e67fcaf8` · origin 0/0 |
| 다른 세션 WIP | pnpm-lock · CHECK-CODEX — **미접촉** |
| 조사 기준 commit | `8e67fcaf8` |

## 2. 서비스별 `/content` live/code route 확인표

| 서비스 | `/content` 존재 | 표시 화면(component) | 성격 |
|--------|:--:|----------------------|------|
| **KPA** | ✅ | ContentListPage | **회원 작성형 허브**(+`/content/documents` 목록·write·detail) |
| **KCos** | ❌ (top-level 미정의) | — (`/library/content`=ContentLibraryPage browse) | `/content` 자체는 미배선 → 회원 browse 는 `/library/content` |

### 2.1 콘텐츠 route 전수 (code 확인)
| route | KPA | KCos |
|-------|-----|-----|------|
| `/content` | ContentListPage(회원 허브) | HubContentListPage(browse) | **없음** |
| `/content/documents`·`/new`·`/:id`·`/:id/edit` | ✅ 회원 작성형 | 없음 | 없음 |
| `/library/content` | (없음) | HubContentListPage(alias browse, 682) | ContentLibraryPage(browse, 431) |
| `/store-hub/content` | HubContentLibraryPage(670대) | HubContentListPage(668) | HubContentPage(582) |
| `/store/content` | (없음) | StoreAssetsPage(958) | StoreAssetsPage(763) |
| `/hub/content/:id` | — | HubContentDetailPage(592) | — |
| `/library/content/:id` | — | — | ContentLibraryDetailPage(432) |

## 3. route 역할 구분

| route | 역할 분류 |
|-------|----------|
| KPA `/content`·`/content/documents`·write | **회원 작성형 콘텐츠** |
 `/content` | **운영자 발행 콘텐츠 browse**(member-facing, 읽기전용) |
 `/library/content` | **legacy/alias browse**(동일 HubContentListPage) |
| KCos `/library/content` | **운영자 발행 콘텐츠 browse**(member-facing) |
| KCos `/store-hub/content` | **매장 허브 콘텐츠 browse**(store_owner copy-to-store) |
| KCos `/store/content` | **매장 대시보드 asset panel**(StoreAssetsPage) — 별개 축 |
| 전 서비스 `/operator/content-management` | **운영자 CMS**(작성) |

## 4. 기존 IR 표현 보정 (errata)

| 이전 표현 | 위치 | 보정 |
|-----------|------|------|
| "KCos 에 `/content` surface 자체가 없음" | COMMUNITY-COMMONIZATION IR(08311186d) 요약 | **회원 작성형(write) surface 가 미적용**인 것이 정확 |
| "KCos 회원 작성형 콘텐츠 부재" | 동 IR | **정확 유지**(write/contentApi.create/ContentWritePage 부재는 사실) |
| "KCos `/library/content` browse 점유, `/content` 자체 없음" | 동 IR | **정확**(이미 정확히 기술됨) |

> 즉 **STANDARD-MODULE IR 은 이미 정확**했고, **COMMUNITY-COMMONIZATION IR 의 "surface 없음" 표현만 보정** 필요. 본 IR 이 errata 로 고정(기존 문서 직접 수정 안 함).

## 5. 표준 `/content` 역할 정의 보정안

```
/content (표준) = 회원 작성형 커뮤니티 콘텐츠 (목록·작성·수정·열람·검색)
운영자 발행 콘텐츠 browse = /store-hub/content (매장 허브 축) 로 정렬
  ─ library/content alias 제거
  ─ KCos /library/content(browse) → /store-hub/content 정렬, 회원 /content 신설
```

## 6. 표준화 방향 재판단

| 점검 | 결과 |
|------|------|
| KPA `/content` 표준 회원 모듈 후보 | **유지**(보정 영향 없음) — 75% generic 추출 가능 결론 그대로 |
 `/content` browse 이동 필요? | **예** — 라이브 점유 중이라 표준 적용 시 충돌. `/store-hub/content`(이미 존재)로 이동 |
| KCos `/content` | 미배선 → 회원 표준 신설 시 `/library/content` browse 와 충돌 정리 필요 |
| route 역할 재정의 IR 선행? | — |
| browse cleanup 이 shell 추출보다 먼저? | **아니오** — shell 추출(step1)은 KPA-only·KCos 무변경이라 **충돌과 무관, 그대로 1순위 가능**. cleanup 은 KCos **적용 직전**에 |
| 후속 WO 순서 조정? | — |

## 7. 최종 판단 (A/B/C/D/E)

**A안(기존 결론 유지, 표현 보정) + D안(KCos 적용 전 live route 충돌 정책 확정).**

- 기존 IR **결론 폐기 아님** — KPA 표준 후보·shell 추출 가능·KCos 회원 write 미적용은 모두 사실.
- **E안(전면 조정) 아님** — 오류는 한 IR 의 "surface 없음" 표현뿐(핵심 분석은 정확).
- **C안(cleanup 선행) 부분만** — cleanup 은 shell 추출보다 먼저일 필요 없음(추출은 KCos 무변경). 단 **KCos 적용 직전**엔 필수.

## 8. 후속 작업 순서 재제안 (보정 반영)

| 순서 | WO/IR | 변동 |
|:--:|------|------|
| 1 | `WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-V1` | **유지·1순위**(KPA shell→@o4o/community-ui, KCos 무변경 — 라이브 충돌 무관) |
| 2 | `IR-O4O-CONTENT-ROUTE-ROLE-REDEFINE-V1` | — |
| 3 | `WO-O4O-CONTENT-BROWSE-ROUTE-CLEANUP-V1` `/library/content` alias 제거 + browse 이동(역할 재정의 후) |
| 4 | `WO-O4O-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1` | — |

## 9. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| `/content` 표준 일관성 | 미일관(KPA 회원형 browse / KCos 미배선) — 정렬 대상, 보정으로 더 명확 |
| 라이브 route 충돌 인지 | — |
| 기존 IR 결론 신뢰성 | 핵심 유지, 표현 1건 보정(errata) |
| 제품 비종속 | ✅ 영향 없음 |
| 1인 유지보수성 | shell 추출(1순위) 안전 + 적용 단계에서 충돌 관리 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-CONTENT-ROUTE-LIVE-SURFACE-RECHECK-V1.md` |
| 조사 기준 commit | `8e67fcaf8` |
 `/content` | **존재**(App.tsx:591) = HubContentListPage browse — 라이브 일치 |
| KCos `/content` | **미배선**, `/library/content` = ContentLibraryPage browse |
| KPA `/content` | ContentListPage(회원 작성형 허브) |
| 보정 | "surface 없음" → "회원 작성형 미적용 / browse 점유" (COMMUNITY-COMMONIZATION IR errata) |
| 핵심 결론 | **유지**(폐기 아님) — STANDARD-MODULE IR 은 이미 정확 |
| 판정 | **A + D** — 표현 보정 라이브 `/content` 충돌 정책을 적용 전 확정 |
| 후속 순서 | — |
| git status | 다른 세션 WIP(미접촉), 본 IR 문서만 신규 |
