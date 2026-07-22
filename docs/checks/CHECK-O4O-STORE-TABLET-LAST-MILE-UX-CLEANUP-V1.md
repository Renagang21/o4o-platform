# CHECK-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1

> WO: `WO-O4O-STORE-TABLET-LAST-MILE-UX-CLEANUP-V1`
> 선행: `IR-O4O-SUPPLIER-SCREEN-SET-TO-TABLET-END-TO-END-FLOW-AUDIT-V1`(D-1/D-3/D-4/D-5)
> 성격: 매장 last-mile UX 정비(프론트 한정). 백엔드·DB·스키마·Screen Set 저장 계약 변경 0. current-screen-set API 재사용.
> Date: 2026-07-22 · commit 7c96655ca · 배포 deploy-kpa-society success

---

## 0. 결론

HUB 가져오기 → 매장 배치 사이의 UX 마찰(IR D-1~D-5)을 프론트 한정으로 해소했다. 가져오기 완료 시 navigation state 로 **'태블렛 콘텐츠' 탭 자동 열기 + 방금 가져온 사본 하이라이트/스크롤**, 콘텐츠 카드에 **'태블렛에 적용'**(기존 current-screen-set API 재사용), **'태블렛' 표기 통일** + **태블렛/설치 코너 문구 정리**. 프로덕션 E2E(가져오기→확인→적용→공개 표시) PASS. **신규 백엔드 API·migration·스키마 0.**

## 1. HUB → 태블렛 콘텐츠 이동 방식

- `HubScreenSetLibraryPage` 가져오기 완료 "내 태블렛 콘텐츠에서 확인" → `navigate('/store/commerce/tablet-displays', { state: { tab: 'contents', highlightScreenSetId: imported.id } })`.
- `StoreTabletDisplaysPage` 마운트 시 `useLocation().state` 소비 → 초기 탭 `'contents'` + `highlightScreenSetId` 세팅 후 **history state 제거**(`navigate(replace, state:null)` — 새로고침·뒤로가기 재트리거 방지).
- import 응답의 생성 Screen Set id 사용(V2b import 계약 그대로, API 변경 0).

## 2. 가져온 사본 하이라이트 결과 — ✅ PASS

- `TabletContentLibraryList` `highlightId` prop → useEffect: 필터 초기화(전체) + 1페이지(최신순이라 상단) + `scrollIntoView` + 8s 하이라이트.
- 프로덕션 관측: 이동 즉시 **'태블렛 콘텐츠' 탭** 열림 + **상단 배너**("방금 가져온 "…" 을(를) 표시했습니다. 태블렛에 적용으로…") + **행 "방금 가져옴" 배지 + teal ring** + 최상단 위치. (DataTable 공유 컴포넌트 무변경 — name 셀 렌더 + 배너 + 스크롤로 구현.)

## 3. 콘텐츠 → 태블렛 적용 동선 — ✅ PASS

- 콘텐츠 카드 kebab 에 **'태블렛에 적용'** 액션(보관 제외) 추가 → 대상 태블렛 선택 모달(태블렛명 + 설치 코너 + '적용 중' 표시).
- 프로덕션: 가져온 사본 → '태블렛에 적용' → 테스트 태블렛(설치 코너 '검증용 코너') 선택 → 토스트 "✅ "검증용 코너" 태블렛에 '…'를 적용했어요." + **되돌리기** + **현재 적용 코너='검증용 코너' 즉시 반영**. 코너별 운영 상세에서도 "화면 세트: … · 현재 사용 중" 반영.

## 4. 적용 API 재사용 결과 — ✅

- `applyCurrentScreenSet(tabletId, screenSetId)` = `POST /store/tablets/:id/current-screen-set`(기존). `store_tablet_corner_contents` 연결 + `current_screen_set_id` 원자 처리(코너별 운영 '화면 바꾸기'와 동일). **신규 백엔드 0.**
- 에러 처리: 409 `SCREEN_SET_NOT_ACTIVE` → 사용자 문구. 성공 시 부모가 tablets 상태 갱신 → usageBySet 재계산 → '현재 적용 코너' 열 즉시 반영.

## 5. 표기 통일 내역 — ✅

- `태블릿`/`타블렛` → **`태블렛`** 통일: `StoreTabletDisplaysPage`·`TabletScreenSetManager`·`TabletContentLibraryList`·`HubScreenSetLibraryPage`(사용자 노출 문구 전량), 메뉴 `storeMenuConfig`(KPA '태블렛 화면 제작')·`PharmacyHubLayout`('태블렛 화면').
- 프로덕션 확인: 사이드바 "태블렛 화면 제작", HUB "태블렛 화면 (HUB)"·"내 태블렛 콘텐츠로 가져오기", 헤더 "태블렛 상품 안내 관리", 탭 "태블렛 콘텐츠", "태블렛 화면 만들기" 등 모두 통일.

## 6. 태블렛·설치 코너 문구 정리 — ✅

- 관리 대상 = **태블렛**, 위치 = **설치 코너**. 이중표현 '코너/태블릿 추가' → **'태블렛 추가'**.
- 코너 홈: 헤딩 "코너 화면" → **"태블렛 (n)"**, 안내 "카드 하나가 태블렛 1대이며, 카드 제목은 그 태블렛의 **설치 코너**(위치)입니다…".
- 등록 폼: "새 코너 화면 만들기" → **"태블렛 추가"**, 필드 "위치 (선택)" → **"설치 코너 (선택 · 위치)"**, 버튼 "코너 화면 만들기" → **"태블렛 추가"**. 빈 상태 "아직 코너 화면이 없습니다" → "아직 등록된 태블렛이 없습니다".
- 적용 모달·코너=태블렛(1:1) 관계를 문구로 명시. DB 모델·API 명칭(store_tablets 등) 무변경.

## 7. 기존 배치·공개 표시 회귀 — ✅

- **공개 태블렛**: `/tablet/네뚜레-약국?tabletId=<test>` → 적용된 세트(기본 코너 안내형)의 product_list 정상 렌더(케어가글액·후시딘 등 + '휴대전화로 보기' 토글). origin='store' 사본 공개 resolve 정상.
- **기존 코너→화면 바꾸기 유지**: 코너별 운영 카드 '화면 바꾸기'·'미리보기'·되돌리기 동작 그대로.
- **보호 샘플 불변**: 구강관리 코너(구강관리 기본 코너 안내형)·피부관리 코너(피부관리 기본 화면 세트) 현재 화면·코너 적용 무변경(테스트는 전용 테스트 태블렛에만 적용).
- **자동 적용·자동 QR 없음**: 가져오기=코너 미적용, 적용 모달 문구 "자동으로 QR이 만들어지지 않으며…" 명시.

## 8. 코드·DB·배포 결과

- 변경 파일(6): `StoreTabletDisplaysPage.tsx`·`TabletScreenSetManager.tsx`·`TabletContentLibraryList.tsx`·`HubScreenSetLibraryPage.tsx`·`PharmacyHubLayout.tsx`·`storeMenuConfig.ts`(KPA 라벨 1줄).
- tsc `--noEmit` 0 · `vite build` 0. **백엔드·DB·migration·스키마 0**(current-screen-set·import·archive 모두 기존 API).
- 배포: deploy-kpa-society success(7c96655ca).

**테스트 데이터 정리 / 순 DB 변경(정직 기록)**:
- 공급자 원본 `[LASTMILE검증] 공급자 세트` → **제거(soft-delete)** 완료(공급자 목록 0).
- 테스트 태블렛 `[LASTMILE검증] 테스트 태블렛`(4f48e392) → **삭제** 완료(코너 2개=보호 샘플만 잔존).
- **잔여 1건**: 매장 독립 사본 `[LASTMILE검증] 공급자 세트`(store_tablet_screen_sets `bfcc2bf8-2606-461b-84a2-34b194d8affd`, 현재 미적용)는 **UI 보관이 409 차단**됨. 원인 = 테스트 태블렛에 적용 후 태블렛을 먼저 삭제하여 `store_tablet_corner_contents` 연결 행이 orphan 으로 남았고(**deleteTablet 이 corner_contents 를 cascade 하지 않는 기존 백엔드 동작**), archive-block(ARCHIVE_BLOCKED_CONNECTED)이 걸림. 삭제된 태블렛의 연결을 UI 로 해제할 경로가 없어 UI 정리 불가. **본 WO 변경과 무관한 기존 동작**(코너별 운영 '화면 바꾸기' + 태블렛 삭제도 동일). 완전 정리는 (a) 단일 row soft-delete(`deleted_at` on 해당 screen_set + orphan corner_contents) — **DB write 이므로 사용자 승인 필요**, 또는 (b) 별도 백엔드 cascade 보완 WO. **무단 DB write 미수행**.

## 9. CHECK·commit·push

- 구현 커밋 `7c96655ca`(6 files). 본 CHECK 별도 커밋.
- **후속(선택)**: ① 잔여 store 사본 1건 정리(승인 후 1-row soft-delete). ② `deleteTablet` corner_contents cascade 보완(기존 gap). ③ 표기 통일 잔여 — web-neture 공급자 메뉴 '매장용 타블렛 콘텐츠'(타블렛)·`TabletCornerContentsPanel` "태블릿 콘텐츠 탭에서…" 는 본 WO(매장 store-side) 범위 밖, 별도 소규모 정리 가능.
