# IR-O4O-SERVICE-CONFIG-APPLICATION-POINTS-V1

## 목적

`service.config`를 실제 어디에 적용할지 조사하여, **과도한 구조화 없이 최소 적용 지점만 확정**한다.

---

## 1. 전체 결론

```
결론: service.config v1은 전역 도입이 아니라 "문구 반복 지점"부터 적용한다.
```

---

## 2. 적용 우선순위

### 1순위: 서비스 명칭 / 용어

```
약국 / 매장
약국 운영 / 매장 운영
약국 경영자 / 매장 경영자
내 약국 / 내 매장
```

### 2순위: Home CTA / 안내 문구

```
약국 운영 시작하기
매장 운영 시작하기
내 약국 관리하기
내 매장 관리하기
```
→ `uiText.homeCTA`, `uiText.storeHubTitle`

### 3순위: AppEntry / Hub 카드 라벨

공통 Hub 구조 유지, 카드 문구만 config 처리.
카드 개수나 구조는 config로 바꾸지 않음.

---

## 3. v1 제외 영역

```
메뉴 구성 / 기능 ON/OFF / 권한 분기
라우트 분기 / 컴포넌트 교체
Hub Template 변경 / Table·Form 구조 변경
```

---

## 4. ServiceConfig v1 인터페이스

```ts
export interface ServiceConfig {
  key: 'kpa-society' | 'glycopharm' | 'k-cosmetics'

  branding: {
    primaryColor: string
  }

  terminology: {
    storeLabel: string        // 약국 / 매장
    storeOwnerLabel: string   // 약국 경영자 / 매장 경영자
    storeHubLabel: string     // 약국 운영 허브 / 매장 운영 허브
    myStoreLabel: string      // 내 약국 / 내 매장
  }

  uiText: {
    homePrimaryCTA: string
    storeHubDescription: string
  }
}
```

---

## 5. 적용 후보 파일군

```
Home 화면
AppEntrySection
O4OHelpSection
StoreHubTemplate 호출부
Store 관련 안내 문구
Header / My 메뉴의 "내 매장" 표현
```

---

## 6. 다음 단계

**IR-O4O-SERVICE-CONFIG-HARDCODED-TEXT-AUDIT-V1**

목적: KPA / GlycoPharm / K-Cosmetics에서 "약국 / 매장 / 내 매장 / 운영 허브" 하드코딩 문구 위치만 찾기

---

## 7. 최종 판단

```
service.config v1 = "표현 레이어"로만 시작
구조 제어 금지
첫 적용 대상 = 약국/매장 계열 반복 문구
```
