# CHECK-O4O-KPA-OPERATOR-STORES-MENU-VISUAL-SECTION-V1

> WO: `WO-O4O-KPA-OPERATOR-STORES-MENU-VISUAL-SECTION-V1`
> 성격: KPA 운영자 사이드바 `stores` 그룹 **내부**에 '매장 운영' / '매장 HUB 자료' 시각 구획.
> **신규 그룹·route·기능명·권한 변경 0.** Date: 2026-07-24 · commit `f104142c5`(3파일) · Deploy Web success · 브라우저 smoke PASS

## 0. 결론 — ✅ PASS

같은 `stores` collapsible 그룹 안에서 성격이 다른 두 업무를 비클릭 구획 라벨로 구분. 공통 `OperatorMenuItem`에
optional `sectionLabel` additive 추가 → 미지정(GP/KCos/Neture·타 그룹)은 기존 렌더 그대로, KPA stores 두 항목에만
지정. route·권한·순서·기능명 불변.

## 1. 조사 — 렌더 구조 (중지 조건 미해당)

- KPA 운영자 사이드바 = 공통 `DomainIASidebar`(operator-ux-core, 4서비스 공용). `stores`는 도메인
  `store_hub`의 단일 collapsible 그룹, 내부 items가 flat `.map` 렌더(`OperatorMenuItem = {label,path,exact}`).
- 공통 메뉴 모델에 내부 section 필드 없었음 → WO 중지 조건("내부 section 미지원 대규모 리팩터링") 후보였으나,
  **additive optional 필드 1개 + 렌더러 조건부 라벨**로 안전 구현 가능 → 중지 미해당(최소 KPA-local 비클릭 라벨).

## 2. 구현 (additive, 3파일)

- `packages/ui/src/operator-shell/types.ts`: `OperatorMenuItem.sectionLabel?: string` 추가(additive).
- `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx`: `SectionLabel` 헬퍼(비클릭 `<div>`, pl-14 하위
  항목 정렬, 한국어 uppercase 미적용) + top-pinned·domain-groups 두 items.map 루프에서 `item.sectionLabel` 있으면
  항목 위에 렌더. 미지정이면 기존과 byte-동일.
- `services/web-kpa-society/src/config/operatorMenuGroups.ts`: `UnifiedMenuItem.sectionLabel?` 추가(filterMenu
  `...rest` 로 보존) + stores `'매장 관리'→sectionLabel:'매장 운영'`, `'매장 HUB 블로그'→sectionLabel:'매장 HUB 자료'`.

**구획 결과** (순서·route 불변):
```
[매장 운영]        ← 비클릭 라벨
  매장 관리 / 채널 관리
[매장 HUB 자료]    ← 비클릭 라벨
  매장 HUB 블로그 / POP / QR-code / 동영상 / 다국어 상품 콘텐츠 / 태블렛 화면
```

## 3. 검증

### 정적
- 신규 그룹/route 0 · 기능명 변경 0 · sectionLabel optional(미지정 무영향) · typecheck(ui/operator-ux-core/
  web-kpa-society) 0 · **@o4o/ui dist 재빌드** 후 통과 · KPA build 0.

### KPA 외 무회귀
- **web-glycopharm tsc 0 + build 0**(operator-ux-core·@o4o/ui 소비, sectionLabel 미지정 → 렌더 불변). KCos·Neture
  동일 구조(미지정) → 무영향. 타 그룹(users/content 등)·타 항목 sectionLabel 없음 → 기존 렌더 유지.

### 브라우저 smoke (kpa-society, 운영자 sohae2100)
- `/operator/stores` → stores 그룹 자동 펼침 · **'매장 운영' 구획 라벨** · **'매장 HUB 자료' 구획 라벨** ·
  구획 라벨 **비클릭**(`<a>` 아님) · 기존 stores 8항목(stores/store-channels/blog/pop/qr/video/
  multilingual-product-contents/tablet screen-sets) 전부 존재 · **active 강조 정상**(매장 관리 blue) · 펼침 유지.
  (로그인 초기 무관 리소스 404는 사이드바 기능과 무관.)
- 모바일: 동일 renderNav 트리 재사용(desktop=drawer) → sectionLabel 동일 렌더(코드 경로 공유).

## 4. 커밋

- 코드 `f104142c5`(types.ts / DomainIASidebar.tsx / operatorMenuGroups.ts) · 본 CHECK.
