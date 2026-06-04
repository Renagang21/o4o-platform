# WO-O4O-GLYCOPHARM-STORE-HUB-CHANNEL-ICON-ALIGNMENT-V1

> O4O 아이콘 정비 **Phase 2 — GlycoPharm 전용**. Store Hub + Store Channels의 emoji 아이콘을 `lucide-react` line icon으로 통일한다.
> **본 문서는 작업 요청서이며, 코드 착수는 KPA Phase 1 배포 후 `/store-hub` live smoke 확인 이후로 둔다.**

- **작성일**: 2026-06-04
- **상태**: WO 작성 완료 / **코드 착수 대기** (선행: KPA Phase 1 배포 smoke PASS)
- **Phase**: 2 (기준 문서 §8 rollout 中 GlycoPharm)
- **기준 문서**: [`docs/baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md`](../baseline/O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md) (commit `9b02c39e7`)
- **선행 IR**: [`IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1`](../investigations/IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1.md) (`cd0ef7285`)
- **Phase 1 선례**: [`CHECK-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1`](../investigations/CHECK-O4O-KPA-STORE-HUB-ICON-ALIGNMENT-V1.md) (`bda26764d`)

---

## 0. 착수 조건 (Gate)

```text
1. 본 WO 문서 작성       — 지금 완료 (코드 수정 없음)
2. KPA Phase 1 배포 후 /store-hub desktop/mobile live smoke — Phase 1 최종 확인
3. KPA smoke PASS 확인 후 → 본 WO 코드 작업 착수
```

> KPA smoke 전에 Phase 2 코드를 건드리면, 이후 화면 문제 발생 시 "Phase 1 문제 vs Phase 2 공통 영향" 구분이 흐려진다. 반드시 KPA smoke PASS 후 착수한다.

---

## 1. 작업 목적

`O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1` 기준에 따라 **GlycoPharm**의 두 표면에서 emoji 아이콘을 제거하고 lucide line icon으로 통일한다.

1. **Store Hub** (`/store-hub`) — 자원 탐색 카드 + 내 약국 CTA emoji
2. **Store Channels** — "채널 선택 가이드" 블록의 채널 타입 emoji (`🌐📱🖥️📺`)

KPA Phase 1과 동일한 패턴을 이식하되, GlycoPharm tone(medical blue/teal)과 "내 약국" 문맥을 따른다.

---

## 2. 작업 범위 (GlycoPharm 전용)

| 대상 | 파일 | 정비 내용 |
|------|------|----------|
| **A. Store Hub** | `services/web-glycopharm/src/pages/hub/StoreHubPage.tsx` | resourceCards 4종 + storeCtaBlock icon emoji → lucide element |
| **B. Store Channels** | `services/web-glycopharm/src/pages/store/StoreChannelsPage.tsx` | "채널 선택 가이드" 블록(현재 lines 676-679) emoji → lucide |

작업은 위 2파일로 제한한다. 필요 시 해당 파일이 직접 import하는 소규모 요소까지만 확인한다.

---

## 3. 작업 제외 범위 (반드시 준수)

```text
- K-Cosmetics 수정 금지 (Phase 3)
- Neture 수정 금지 (Phase 4)
- 공통 패키지 구조 변경 금지
  · 특히 shared-space-ui/StoreHubTemplate.tsx 는 Phase 1에서 이미 icon: ReactNode 로
    확장 완료됨 → Phase 2 Store Hub 는 공통 패키지 수정 없이 lucide element 전달만으로 동작.
    StoreHubTemplate 추가 수정 불필요/금지.
- shared-space-ui/HomeAppIcons 수정 금지
- packages/shared-space-ui/src/HeroBannerSection.tsx — 미접촉 유지 (절대 건드리지 않음)
- emoji fallback(StoreHubTemplate ?? '🏪', AI 🤖) 제거 금지 — Phase 7 대상
- 문구/라우트/권한/API/데이터 구조 변경 금지
- CHANNEL_TABS(메인 탭) 변경 금지 — 이미 lucide(Globe/Monitor/Tablet/Smartphone) 사용 중. 건드리지 않음.
```

---

## 4. 현재 상태 (조사 결과)

### 4.1 A. Store Hub — `pages/hub/StoreHubPage.tsx`
공통 `StoreHubTemplate`(ReactNode 확장 완료)에 emoji 문자열 전달 중:
```text
icon: '🛒'  상품 카탈로그
icon: '🖥️'  디지털 사이니지
icon: '📄'  콘텐츠/자료
icon: '🛍️'  이벤트/특가
icon: '🏥'  내 약국 CTA (storeCtaBlock)
```

### 4.2 B. Store Channels — `pages/store/StoreChannelsPage.tsx`
**페이지 내부에 이미 불일치 존재:**
- 메인 탭 `CHANNEL_TABS` (현재 line 70~): **이미 lucide** — `B2C:Globe / KIOSK:Monitor / TABLET:Tablet / SIGNAGE:Smartphone`. **변경 대상 아님.**
- "채널 선택 가이드" 블록 (현재 line 676~679): **emoji** — `B2C:🌐 / TABLET:📱 / KIOSK:🖥️ / SIGNAGE:📺`. → **이번 정비 대상.**

> 라인 번호는 작성 시점 기준이며, 착수 시 실제 코드에서 다시 확인한다.

---

## 5. 적용 아이콘 매핑

### 5.1 A. Store Hub (기준 문서 §5 + KPA Phase 1 선례 동일)

| 기능 | 현재 | → lucide |
|------|:----:|----------|
| 상품 카탈로그 | 🛒 | `PackageSearch` |
| 디지털 사이니지 | 🖥️ | `MonitorPlay` |
| 콘텐츠/자료 | 📄 | `Files` |
| 이벤트/특가 | 🛍️ | `BadgePercent` |
| 내 약국 CTA | 🏥 | `Store` **또는** `Building2` (아래 결정 참조) |

**내 약국 CTA 아이콘 결정:** 기준 문서 §4는 GlycoPharm "내 약국" 문맥을 인정한다. KPA Phase 1은 `Store`를 사용했다.
→ **권장: `Store`** (서비스 간 "내 매장/약국 이동" CTA 일관성). 약국 정체성을 더 살리려면 `Building2` 허용. 단일 값으로 결정하고 혼용하지 않는다.

### 5.2 B. Store Channels 가이드 블록 (페이지 내 CHANNEL_TABS와 일관성 우선)

가이드 블록은 같은 페이지의 `CHANNEL_TABS` lucide 세트와 **동일 채널 타입 = 동일 아이콘**으로 맞춘다:

| 채널 타입 | 가이드 현재 | CHANNEL_TABS lucide | → 가이드 적용 |
|-----------|:----------:|:-------------------:|---------------|
| B2C | 🌐 | `Globe` | `Globe` |
| TABLET | 📱 | `Tablet` | `Tablet` |
| KIOSK | 🖥️ | `Monitor` | `Monitor` |
| SIGNAGE | 📺 | `Smartphone` | **`Tv` (결정)** |

> **SIGNAGE 결정 (2026-06-04 확정):**
> - **Channels 가이드 블록 SIGNAGE → `Tv`** — 가이드 문맥(화면/TV에 콘텐츠 표시)에서 의미가 가장 명확. (코드 착수 시 재논의 없이 이대로 적용.)
> - **Store Hub 디지털 사이니지 → `MonitorPlay`** — 기준 문서 §5 표준 유지(§5.1 그대로).
> - **`CHANNEL_TABS`의 SIGNAGE=`Smartphone`은 본 WO 범위 밖** — 탭 변경 금지. 이 불일치는 건드리지 않고, 별도 후속 WO로 `CHANNEL_TABS` SIGNAGE 정정 제안만 CHECK 문서 §9에 기록한다.
>
> 결과적으로 사이니지 아이콘은 표면별로 의도적으로 다르다: **Store Hub=`MonitorPlay`(자원 탐색 카드) / Channels 가이드=`Tv`(채널 선택)**. 둘 다 lucide line icon이며 emoji가 아니라는 점이 핵심이다.

**렌더 변경:** 가이드 블록은 현재 `<span className="text-lg">{item.icon}</span>`로 emoji를 렌더한다. → `icon`을 lucide 컴포넌트 참조로 바꾸고 `<Icon size={20} />` 형태로 렌더. active(선택) 상태 색상(`text-blue-700`)과 일관되게 처리.

---

## 6. 적용 원칙 (KPA Phase 1과 동일)

```text
1. emoji 문자열/escape 제거 → lucide line icon
2. 동일 기능은 KPA와 같은 아이콘 사용 (Store Hub 4종 동일)
3. Channels 가이드 블록은 같은 페이지 CHANNEL_TABS 와 채널 타입별 동일 아이콘
4. GlycoPharm tone(medical blue/teal) 유지 — 색상은 GlycoPharm primary token 우선
5. 카드/메뉴/탭 순서, href, route 불변
6. 문구(label/sub/desc) 불변
7. 아이콘 size: Store Hub 카드 22 / CTA 28, Channels 가이드 20 (실제 화면 보고 미세조정)
8. icon은 보조 요소 — 제목보다 강하지 않게
```

---

## 7. 검증 기준

### 7.1 TypeScript
```bash
cd services/web-glycopharm && npx tsc --noEmit   # exit 0 기대
```
(repo 표준 명령이 따로 있으면 그것을 따른다.)

### 7.2 emoji 잔존 확인 (대상 2파일)
```bash
rg "🌐|📱|🖥|📺|🛒|📄|🛍|🏥|🖥️" services/web-glycopharm/src/pages/hub/StoreHubPage.tsx services/web-glycopharm/src/pages/store/StoreChannelsPage.tsx
# → 결과 없음(no match) 기대
```

### 7.3 desktop smoke (배포 또는 local)
```text
- /store-hub 카드 4종 + 내 약국 CTA lucide 렌더
- Store Channels 가이드 블록 4개 채널 lucide 렌더
- 가이드 블록 ↔ 메인 탭(CHANNEL_TABS) 아이콘 언어 통일감
- 선택(active) 상태 색상 강조 유지
- 탭/카드 클릭·라우팅 회귀 없음
```

### 7.4 mobile smoke (390px 전후)
```text
- 가이드 블록 grid-cols-2 에서 아이콘·라벨·sub 미겹침
- Store Hub 카드 2열 레이아웃 정상
- 아이콘이 텍스트 침범하지 않음
```

### 7.5 production smoke (배포 후)
```text
- glycopharm.co.kr — hard refresh/incognito
- console critical error 없음
```

---

## 8. Git 기준

```text
- path-specific staging만 사용 (git add <파일>)
- git add . / git commit -am 금지
- commit 직전: git status --short + git diff --cached --name-only + git diff --name-only 확인
- HeroBannerSection.tsx 가 staged 되면 즉시 중단·보고
- 동시 세션 가능성 → 작업 끝나면 즉시 path-specific 커밋 (feedback_commit_when_work_done)
```

권장 커밋 메시지:
```text
feat(glycopharm): align store hub & channel icons with global standard
```

---

## 9. CHECK 문서 기준

작업 완료 후 작성:
```text
docs/investigations/CHECK-O4O-GLYCOPHARM-STORE-HUB-CHANNEL-ICON-ALIGNMENT-V1.md
```
포함 내용 (Phase 1 CHECK 형식 준수):
```text
1. 최종 판정
2. 기준 문서
3. 수정 파일 목록 (Store Hub / Store Channels 분리 표기)
4. 교체한 icon 목록 (A. Store Hub / B. Channels 가이드 블록 구분)
5. 변경하지 않은 항목 (CHANNEL_TABS, 공통 패키지, HeroBannerSection, 문구/라우트)
6. TypeScript 결과
7. desktop/mobile smoke 결과
8. staged 파일 검증 결과
9. 남은 후속 작업 (Phase 3 KCos / CHANNEL_TABS SIGNAGE 정정 제안 등)
```
변경량이 작으면 코드 + CHECK 문서를 한 커밋으로 묶어도 된다.

---

## 10. 완료 기준

```text
- GlycoPharm Store Hub 카드 4종 + 내 약국 CTA emoji 제거 → lucide
- GlycoPharm Store Channels 가이드 블록 채널 타입 emoji 제거 → lucide
- CHANNEL_TABS(기존 lucide) 미변경
- 카드/탭 순서·라우트·문구·권한 불변
- 공통 패키지/HeroBannerSection 미접촉
- TypeScript PASS
- desktop/mobile/production smoke PASS
- 의도한 파일만 staged/commit
- CHECK 문서 작성
- push 완료
```

---

## 11. 후속 (Phase 3+)

```text
Phase 3. K-Cosmetics 내 매장 / Store Hub / Channels (동일 패턴 — 단, 정체성 아이콘 💄 등은 §4 tone)
Phase 4. Neture Home / 역할 카드 / Market Trial CTA(FlaskConical)
Phase 5. Operator/Admin Quick Actions
Phase 6. LMS lesson type icon mapping
Phase 7. shared-space-ui emoji fallback 제거
```

---

*Phase 2 WO — 코드 착수는 KPA Phase 1 배포 smoke PASS 이후. 본 문서는 요청서이며 코드 변경을 포함하지 않는다.*
