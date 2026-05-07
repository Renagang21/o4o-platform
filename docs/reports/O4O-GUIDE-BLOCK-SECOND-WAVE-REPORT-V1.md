# O4O GuideBlock 2차 적용 보고서

> **WO-O4O-GUIDE-BLOCK-SECOND-WAVE-APPLY-V1**
>
> GuideBlock을 운영자/등록 화면 중심의 1차 적용에서 확장하여,
> 사용자·신청자·공급자가 실제 이용 중 방문하는 상태 확인·목록 화면에 2차 적용한다.

---

## 1. 후보 화면 조사 결과

| 후보 pageKey | 파일 존재 여부 | 결과 |
|-------------|--------------|------|
| `user.application.status` | KPA, GlycoPharm 존재 | ✅ 적용 |
| `user.mypage.hub` | GlycoPharm, K-Cosmetics, Neture 존재 | skip (정보 허브 성격 — 1회 방문, 안내보다 요약이 목적) |
| `store.order.list` | Neture 존재 (`StoreOrdersPage.tsx`) | ✅ 적용 |
| `store.application.status` | 파일 없음 | skip |
| `supplier.application.status` | 파일 없음 | skip |
| `supplier.library.editor` | 별도 form 페이지 → list 페이지로 대상 변경 | ✅ `supplier.library.list` 적용 |
| `market-trial.participation.status` | Neture 존재 (`MyParticipationsPage.tsx`) | ✅ 적용 |

---

## 2. 적용 화면 (5개)

### 1. KPA-Society — user.application.status

| 항목 | 값 |
|------|-----|
| 파일 | `services/web-kpa-society/src/pages/MyApplicationsPage.tsx` |
| pageKey | `user.application.status` |
| serviceKey | `kpa-society` |
| sectionKey | `guideblock-page-help` |
| 삽입 위치 | 헤더 아래, 상태 필터 위 |
| fallback title | 신청 상태 확인 안내 |

### 2. GlycoPharm — user.application.status

| 항목 | 값 |
|------|-----|
| 파일 | `services/web-glycopharm/src/pages/apply/MyApplicationsPage.tsx` |
| pageKey | `user.application.status` |
| serviceKey | `glycopharm` |
| sectionKey | `guideblock-page-help` |
| 삽입 위치 | 헤더 아래, Loading 위 |
| fallback title | 신청 상태 확인 안내 |

### 3. Neture — market-trial.participation.status

| 항목 | 값 |
|------|-----|
| 파일 | `services/web-neture/src/pages/market-trial/MyParticipationsPage.tsx` |
| pageKey | `market-trial.participation.status` |
| serviceKey | `neture` |
| sectionKey | `guideblock-page-help` |
| 삽입 위치 | 헤더 아래, KPI 카드 위 |
| fallback title | 참여 내역 확인 안내 |

### 4. Neture — supplier.library.list

| 항목 | 값 |
|------|-----|
| 파일 | `services/web-neture/src/pages/supplier/SupplierLibraryPage.tsx` |
| pageKey | `supplier.library.list` |
| serviceKey | `neture` |
| sectionKey | `guideblock-page-help` |
| 삽입 위치 | 헤더/버튼 행 아래, 공개 범위 필터 위 |
| fallback title | 자료실 이용 안내 |

### 5. Neture — store.order.list

| 항목 | 값 |
|------|-----|
| 파일 | `services/web-neture/src/pages/store/StoreOrdersPage.tsx` |
| pageKey | `store.order.list` |
| serviceKey | `neture` |
| sectionKey | `guideblock-page-help` |
| 삽입 위치 | 페이지 제목 아래, Message 위 |
| fallback title | 주문 내역 이용 안내 |

---

## 3. Skip 화면 및 사유

| 화면 | skip 사유 |
|------|----------|
| `user.mypage.hub` | 마이페이지 허브는 요약·네비게이션 중심 — 단계형 안내보다 인터랙티브 요약이 목적 |
| `store.application.status` | 파일 없음 |
| `supplier.application.status` | 파일 없음 |
| `supplier.library.editor` | Form 편집 페이지는 1차 적용 범위(supplier.product.editor 등)와 패턴 중복 — 목록 페이지(`supplier.library.list`)로 대상 변경 |

---

## 4. 신규 pageKey 목록

이번 WO에서 신규 생성된 pageKey:

| pageKey | 서비스 | 파일 |
|---------|--------|------|
| `user.application.status` | kpa-society | `MyApplicationsPage.tsx` |
| `user.application.status` | glycopharm | `apply/MyApplicationsPage.tsx` |
| `market-trial.participation.status` | neture | `MyParticipationsPage.tsx` |
| `supplier.library.list` | neture | `SupplierLibraryPage.tsx` |
| `store.order.list` | neture | `StoreOrdersPage.tsx` |

pageKey 명명 규칙: `{domain}.{screen}.{purpose}` 준수.

---

## 5. 적용 패턴

기존 1차 적용과 동일한 DB override 패턴:

```tsx
const GUIDE_PAGE_KEY = '...';
const GUIDEBLOCK_SECTION_KEY = 'guideblock-page-help';
const SERVICE_KEY = '...';

// 컴포넌트 내부
const [guideTitle, setGuideTitle] = useState<string | null>(null);
const [guideDesc, setGuideDesc] = useState<string | null>(null);
const [guideSteps, setGuideSteps] = useState<string[] | null>(null);

useEffect(() => {
  let cancelled = false;
  fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
    .then(sections => {
      if (cancelled) return;
      const raw = sections[GUIDEBLOCK_SECTION_KEY];
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.title) setGuideTitle(parsed.title);
        if (parsed.description) setGuideDesc(parsed.description);
        if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
      } catch { /* use fallback */ }
    })
    .catch(() => { /* use fallback */ });
  return () => { cancelled = true; };
}, []);
```

---

## 6. GuideEditableSection 영향 없음

이번 WO에서 `GuideEditableSection`이 있는 화면은 없음. 기존 레거시 row 영향 없음.

---

## 7. 운영자 override 활성화 방법

각 페이지별 운영자 override 가능 상태. DB에 다음 데이터를 저장하면 fallback 대신 적용됨:

```json
{
  "serviceKey": "{service}",
  "pageKey": "{pageKey}",
  "sectionKey": "guideblock-page-help",
  "content": "{\"title\":\"...\",\"description\":\"...\",\"steps\":[\"...\"]}"
}
```

저장 방법: `/operator/guide-contents` 에서 해당 pageKey 지정 후 저장.

현재 상태: guide_contents DB 빈 상태 → 전 페이지 fallback 표시 (정상).

---

## 8. 누적 적용 현황 (1차 + 2차)

| 서비스 | 1차 적용 | 2차 적용 | 합계 |
|--------|---------|---------|------|
| KPA-Society | 7 | 1 | 8 |
| GlycoPharm | 4 | 1 | 5 |
| K-Cosmetics | 4 | 0 | 4 |
| Neture | 5 | 3 | 8 |
| **합계** | **20** | **5** | **25** |

---

## 관련 문서

| 문서 | 위치 |
|------|------|
| GuideBlock 서비스 전체 적용 보고서 (1차) | `docs/architecture/O4O-GUIDE-BLOCK-SERVICE-WIDE-REPORT-V1.md` |
| Guide sectionKey 충돌 정책 | `docs/architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md` |
| Guide sectionKey Migration | `docs/architecture/O4O-GUIDE-SECTIONKEY-MIGRATION-V1.md` |

---

*작성일: 2026-05-06*
*WO: WO-O4O-GUIDE-BLOCK-SECOND-WAVE-APPLY-V1*
*상태: PASS*
