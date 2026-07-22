# IR-O4O-SUPPLIER-SCREEN-SET-TO-TABLET-END-TO-END-FLOW-AUDIT-V1

> 성격: **read-only 업무 동선 감사** — 공급자 Screen Set 제작·게시 → 매장 HUB 가져오기 → 실제 태블릿 배치·표시.
> 선행: V2a(편집기 추출)·V2b(공급자 백엔드)·V2c(공급자 UI+매장 HUB 통합) 완료 상태 기준.
> Date: 2026-07-22 · 코드·DB·배포 변경 0 (조사만).
> 근거: V2c 프로덕션 브라우저 관측(1~4단계) + 정적 코드 분석(4~6단계·명칭).

---

## 1. 현재 전체 업무 동선

```
[공급자 / web-neture]
  1. 매장용 타블렛 콘텐츠(/supplier/tablet-screen-sets) 작성 → 저장 → 미리보기 → 게시(대상: 약국/비약국/전체)
        └ origin='supplier', service_key='kpa', 공개 URL·QR 없음. draft/active/archived.
                    │  (게시 = active + hub_target_store_type)
                    ▼
[매장 / web-kpa-society]
  2. 약국 운영 허브 → 타블렛 화면(/store-hub/screen-set) → [공급자 제공] 탭 탐색
  3. 행 클릭 → 상세·미리보기 → "내 타블렛 콘텐츠로 가져오기"
        └ importSupplierTemplate → origin='store' 독립 사본 생성(값 복사, 코너 미적용)
                    │  ("내 타블렛 콘텐츠에서 확인" → navigate /store/commerce/tablet-displays)
                    ▼
  4. 태블릿 화면 제작(/store/commerce/tablet-displays)
        ├ [태블릿 콘텐츠] 탭: 가져온 사본 = '사용 가능 · 현재 미적용' (여기서 수정 가능)
        └ [코너별 운영] 탭: 코너 카드 → "화면 바꾸기" → 이 화면으로 바꾸기
                    │  POST /tablets/:id/current-screen-set
                    │  → store_tablet_corner_contents 연결(멱등) + store_tablets.current_screen_set_id
                    ▼
[공개 표시]
  5. 실제 태블릿 /tablet/{slug}?tabletId={id} → GET /:slug/tablet/screen
        → current_screen_set_id → resolveScreenSetSections(origin='store' 게이트) → sections 렌더
  6. QR /qr/{slug} → GET /kpa/qr/public/:slug → landing_type='screen_set' → 동일 resolver → PublicScreenSetViewer
```

## 2. 단계별 화면·라우트·주요 Action

| # | 주체 | 화면 / 라우트 | 주요 Action → API |
|:-:|------|---------------|-------------------|
| 1 | 공급자 | 매장용 타블렛 콘텐츠 `/supplier/tablet-screen-sets` (web-neture) | 작성/저장 `POST·PUT /kpa/supplier/screen-sets…` · 게시 `POST …/publish {hubTargetStoreType}` |
| 2 | 매장 | 타블렛 화면 HUB `/store-hub/screen-set` [공급자 제공] 탭 | 목록 `GET /store/screen-set-hub/supplier-templates` |
| 3 | 매장 | 상세 슬라이드 패널 | 상세 `GET …/supplier-templates/:id` · 미리보기 `POST /store/screen-sets/preview` · 가져오기 `POST …/:id/import` |
| 4 | 매장 | 태블릿 화면 제작 `/store/commerce/tablet-displays` | [태블릿 콘텐츠] 라이브러리 `GET /store/screen-sets` · [코너별 운영] 카드 |
| 5 | 매장 | 화면 바꾸기 모달 (TabletCornerSwapModal) | 연결목록 `GET /store/tablets/:id/screen-sets` · 적용 `POST /store/tablets/:id/current-screen-set {screenSetId}` |
| 6 | 기기 | 공개 태블릿 `/tablet/{slug}?tabletId=` · QR `/qr/{slug}` | `GET /:slug/tablet/screen` · `GET /kpa/qr/public/:slug` |

**핵심 모델**: `store_tablets` 1 row = **코너 ≡ 태블릿**(1:1 동일 엔티티, UI 는 `location||name` 을 코너명으로 표시). "선택 가능 목록"=`store_tablet_corner_contents`(다대다), "현재 표시 1개"=`store_tablets.current_screen_set_id`(연결 목록 내 불변식). 적용은 연결+current 를 **원자 처리**.

## 3. 정상적으로 연결된 지점

1. **공급자 게시 → HUB 노출 → 가져오기**: V2c 에서 프로덕션 E2E 확인. 공급자명·게시 대상 표시, 매끄러움.
2. **origin 일원화(마지막 연결의 핵심)**: 공급자에서 가져온 사본은 `origin='store'` 로 저장된다. 공개 표시 resolver(`resolveScreenSetSections`, `origin='store' AND status<>'archived'` 게이트)와 적용 엔드포인트(`origin='store'` 요구)가 **출처(supplier/operator/store)와 무관하게 store 사본을 동일 처리**한다. 즉 공급자 사본도 운영자·매장 자체 사본과 **완전히 동일하게 실제 태블릿·QR 에 표시**된다 — 코드로 보장됨.
3. **적용 원자성**: `POST /current-screen-set` 가 연결 INSERT(멱등) + current UPDATE 를 한 트랜잭션으로 처리 → "연결 후 적용" 2단계를 사용자가 따로 밟지 않음.
4. **가져오기 안내 라우트 일치**: HUB 완료 안내의 `navigate('/store/commerce/tablet-displays')` 는 실제 배치 페이지(StoreTabletDisplaysPage)와 일치.
5. **QR 동일 resolver**: QR 랜딩도 태블릿과 같은 resolver 를 재사용(tabletContext 만 상이) → 채널 일관.
6. **공급자↔운영자 흐름 일관**: 매장 HUB 가 소스 탭(운영자 제공/공급자 제공)만 다르고 상세·미리보기·가져오기·이후 배치는 완전 공유.

## 4. 끊기거나 혼동되는 지점

| 코드 | 지점 | 설명 |
|:---:|------|------|
| **D-1** | **HUB→배치 탭 단절** | 가져오기 완료 "내 타블렛 콘텐츠에서 확인" → `/store/commerce/tablet-displays` 이동하지만 **기본 진입 탭 = '코너별 운영'**. 방금 가져온 사본은 **'태블릿 콘텐츠' 탭**에 '현재 미적용'으로 들어감. 탭 자동 전환·하이라이트 파라미터 없음(navigate 에 state/query 미전달) → 사용자가 방금 가져온 것을 **즉시 보지 못함**. 안내 문구("내 타블렛 콘텐츠")와 도착 탭 불일치. |
| **D-2** | **가져오기↔배치 페이지 분리** | 가져오기(HUB 페이지)와 코너 적용(배치 페이지)이 **다른 페이지**. HUB 에서 바로 코너에 넣을 수 없음. 페이지 이동 1회 + 배치 페이지 도착 후 약 3클릭(화면 바꾸기 → 다른 화면 골라 넣기 → 이 화면으로 바꾸기). |
| **D-3** | **라이브러리→코너 역방향 부재** | '태블릿 콘텐츠' 탭에서 특정 사본을 보고 "이 콘텐츠를 어느 코너에 넣기"로 바로 배치하는 동선이 없음(적용은 '코너별 운영' 탭의 코너 카드에서만 시작). 사용자는 콘텐츠→코너가 아니라 코너→콘텐츠 방향만 밟게 됨. |
| **D-4** | **명칭 혼용 "태블릿" vs "타블렛"** | 제작·배치 계열="**태블릿**"(사이드바 '태블릿 화면 제작', 페이지 헤더 '태블릿 상품 안내 관리'), HUB 계열="**타블렛**"(HUB '타블렛 화면', '내 타블렛 콘텐츠로 가져오기'). 같은 대상인데 표기가 갈림. |
| **D-5** | **코너=태블릿 용어 모호** | 내부적으로 `store_tablets` 1 row = 코너 = 태블릿(1:1)인데 UI 에 "코너별 운영"·"코너/태블릿 추가"처럼 두 용어가 섞여, 사용자에게 코너와 태블릿이 별개인지 모호. |

## 5. 공급자 관점 문제

- **게시 후 피드백 루프 없음**: 게시하면 끝이며, 어느 매장이 가져갔는지·배치했는지 공급자는 알 수 없음. (독립 사본 설계상 의도적일 수 있으나, 공급자 관점에서 "게시했는데 그 다음은?"의 단절.)
- **미리보기 기대 불일치**: 공급자 미리보기는 stub(빈 상품·코너 문맥 없음)으로 배치를 보여줌. 실제 매장 코너의 진열 상품은 매장 데이터라 공급자 화면에선 비어 있음 — 안내 문구는 있으나 "실제로 어떻게 보일지"를 공급자가 정확히 못 봄.
- **특정 매장 지정 불가**: 게시 대상은 약국/비약국/전체 유형만. 이는 **정상**(공급자는 매장 태블릿을 직접 배치하지 않는다는 3자 Flow 원칙과 일치).

## 6. 매장 관점 문제

- **D-1 탭 단절**: 가져온 것을 배치 페이지에서 바로 못 찾음(가장 큰 마찰).
- **D-2/D-3 배치 학습 필요**: HUB≠배치 페이지, 라이브러리→코너 역방향 부재로 "가져온 다음 무엇을?"이 직관적이지 않음.
- **D-5 개념 모호**: 코너와 태블릿이 같은 것임을 UI 가 명확히 전달하지 못함.
- 긍정: 일단 코너 카드에서 "화면 바꾸기"에 도달하면 적용 자체는 원자적이고 단순(미리보기 포함).

## 7. 태블릿 배치까지의 마지막 연결 상태

- **기능적 완결(연결됨)**: 공급자 → 게시 → 가져오기(origin='store') → 코너 적용(current-screen-set) → 실제 태블릿 표시 → QR 표시가 **끊김 없이 하나의 코드 경로**로 이어진다. 공급자 사본은 공개 표시 시 운영자/매장 사본과 구분 없이 처리되므로, "공급자→태블릿"의 마지막 연결은 이미 완성되어 있다.
- **UX 마찰만 존재**: 데이터·기능 단절은 없고, 페이지 이동(D-2)·탭 전환 부재(D-1)·명칭 혼용(D-4)·용어 모호(D-5)의 **사용자 동선 마찰**만 남아 있다.

## 8. 개선 항목 — 필수 / 권장

**필수 (사용자 혼동 직접 유발)**
- **D-1 해소**: HUB 가져오기 완료 → 배치 페이지 이동 시 **'태블릿 콘텐츠' 탭으로 열고 방금 가져온 사본을 하이라이트**(navigate 에 query/state 전달 → StoreTabletDisplaysPage 초기 탭·강조). 문구와 도착 지점 일치.

**권장 (마찰 완화)**
- **D-3**: '태블릿 콘텐츠' 라이브러리 사본 카드에 "코너에 적용" 바로가기(코너 선택 → current-screen-set) — 콘텐츠→코너 역방향 동선 제공.
- **D-4**: "태블릿"/"타블렛" **표기 통일**(1개로). 특히 HUB "타블렛 화면" ↔ 사이드바 "태블릿 화면 제작".
- **D-5**: 코너=태블릿(1:1) 용어 정리 — "코너/태블릿 추가" 등 이중 표기 단일화.
- **공급자 피드백(선택)**: 게시 후 대상 매장 유형·게시 상태의 가벼운 요약(가져간 매장 수 등은 독립 사본 설계상 신중히).

## 9. 다음 WO 필요 여부

- **기능 구현 WO 불필요**: 데이터·기능 단절이 없어 긴급 구현 대상 없음. 마지막 연결은 이미 코드로 완결.
- **권장 UX WO 1개(소규모 프론트, 선택)**: D-1(필수) + D-3/D-4/D-5(권장)을 묶은 **매장 태블릿 last-mile UX 정리** WO. 백엔드·스키마 무변경, web-kpa-society 프론트 한정. 사용자 판단으로 착수.
- 이번 IR 자체는 후속 WO 를 자동 착수하지 않음(핸드오프 전용).

## 10. 코드·DB·배포 변경 0 확인

- 본 작업은 **read-only 조사**만 수행: V2c 프로덕션 브라우저 관측(기존 세션) + 정적 코드 분석(Explore 에이전트, 읽기 전용).
- 신규 Screen Set·매장 사본 생성 0, DB write 0, 배포 0, 기능 구현 0.
- git 변경 = **본 IR 문서 1개(문서만)**. 소스·스키마·마이그레이션 무변경.
