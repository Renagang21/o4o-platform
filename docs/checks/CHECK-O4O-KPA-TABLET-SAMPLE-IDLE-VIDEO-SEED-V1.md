# CHECK-O4O-KPA-TABLET-SAMPLE-IDLE-VIDEO-SEED-V1

> 성격: 데이터 시드 — 보호 샘플 2건에 서로 다른 대기 동영상(idle) 지정.
> 배경: `idle_touch_video` 템플릿이 영상 없으면 검은 placeholder → 샘플에 실영상 부여.
> Date: 2026-07-16

---

## 0. 결론

보호 샘플 2건의 `idle_media` 를 **서로 다른** YouTube 영상으로 지정(URL-only 계약). 대기 영상형 미리보기에서 실제 재생 확인. **코드/스키마 변경 없음(데이터만).**

## 1. 시드 값

| 샘플 | set | idle 동영상 |
|------|-----|-------------|
| 구강관리 기본 화면 세트 | `7280872e…` | Big Buck Bunny — `youtube.com/watch?v=aqz-KE-bpKQ` |
| 피부관리 기본 화면 세트 | `8c6eb9fe…` | Sintel — `youtube.com/watch?v=eRsGyueVLvQ` |

- 저장 계약: `idle_media.config = { source:'custom_media', items:[{ mediaType:'youtube', url }] }` (WO-...-IDLE-VIDEO-URL-ONLY-V1 과 동일). `PUT /screen-sets/:id/blocks` 200.
- 다른 블록(코너 설명/콘텐츠/제품/QR)은 그대로, idle_media config 만 교체.
- **영상 선택 기준**: 공용 도메인 Blender 오픈무비(안전·중립·저작권 무리 없음). 실제 매장은 자기 홍보/안내 영상 URL 로 교체 가능 — **샘플 시연용 placeholder** 성격.

## 2. 동작

- `idle_media` 는 **대기 오버레이(무조작 시)** 와 **대기 영상형(idle_touch_video) 상단 hero** 양쪽에서 재생(무음·자동재생·반복 — 단일 영상 loop 버그는 IDLE-VIDEO-URL-ONLY-V1 에서 수정됨).
- 두 샘플의 현재 템플릿은 유지(구강=코너 소개형, 피부=기본 코너 안내형). 영상은 지정만 — 대기 오버레이로 노출되고, 대기 영상형으로 전환 시 hero 로 크게 노출된다.

## 3. 검증

| 항목 | 결과 |
|------|------|
| `PUT /blocks` | ✅ 200 (양쪽) |
| GET 재확인 idle url | ✅ 구강=aqz-KE-bpKQ / 피부=eRsGyueVLvQ (서로 다름) |
| 제작 화면 대기 화면 단계 hydrate | ✅ URL 표시 |
| 대기 영상형 미리보기 hero | ✅ YouTube embed 실제 재생(Big Buck Bunny), 검은 placeholder 해소 — 중앙 대형 문구 없음, 하단 터치 안내 바 |
| console/pageerror/API 오류 | ✅ 0 |

> 미리보기는 draft(저장 안 함)로 확인 → 구강 샘플 실제 템플릿은 `corner_overview_qr` 그대로.

## 4. 데이터 상태 (존치)

- 두 샘플 idle 동영상 = 위 표 값으로 **존치**(원복 없음).
- 구강 코너 진열 상품(케어가글액 등)은 상품 상세 검증 때 추가한 것 **존치**.
- 좌표는 `[[project_kpa_tablet_screenset_feature_and_reset]]` 갱신.

---

*보호 샘플 2건 idle_media 를 서로 다른 YouTube(구강 BigBuckBunny / 피부 Sintel)로 시드. custom_media.items 계약, PUT200, 대기 영상형 hero 실재생 확인. 코드/스키마 무변경, 데이터만. 매장이 교체 가능한 시연용 placeholder.*
