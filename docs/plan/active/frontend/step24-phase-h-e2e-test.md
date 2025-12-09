# 📄 **Step 24 — Phase H: Multi-Site Builder End-to-End Test Work Order**

## O4O Platform – Full Site Creation Automation Validation

**Version:** 2025-12
**Author:** ChatGPT PM

---

## 0. 목적

Multi-Site Builder는 다음 구성 요소를 모두 통합해 작동한다:

* Site Template System
* CMS Builder (NextGen View 저장)
* AppStore (앱 설치/활성화)
* Deployment Manager (서버 생성 자동화)
* NextGen Renderer (View JSON → UI 변환)
* Admin Dashboard UI

Phase H는 **이 모든 시스템이 하나의 흐름으로 자연스럽게 작동하는지 검증하는 최종 단계**이다.

E2E 테스트를 통해 Multi-Site Builder가 실제로 "새로운 사이트"를 만들고
CMS & AppStore 구성을 자동완성하는지 확인한다.

---

## 1. 테스트 준비

### ✔ 1) Admin Dashboard 접속

URL:

```
https://admin.neture.co.kr/admin/site-builder
```

### ✔ 2) 테스트용 서브도메인 준비

예시:

* test01.neture.co.kr
* yaksa-branch01.site
* dev-signage01.neture.co.kr

**주의: 아직 실제 배포는 Optional입니다.
도메인만 지정해 scaffold 과정 테스트가 가능합니다.**

---

## 2. Phase H Step-by-Step E2E Test

---

## 🟦 **Phase H-1 — 새 사이트 생성 테스트**

1. "Create Site" 클릭
2. 값 입력:

```json
{
  "domain": "test01.neture.co.kr",
  "template": "default",
  "apps": ["commerce", "customer", "admin"],
  "deployImmediately": false
}
```

3. "Create" 버튼 클릭
4. 사이트 카드가 목록에 나타나는지 확인
5. 상태(status)가 다음 순서로 변하는지 확인:

```
pending → scaffolding → ready
```

---

## 🟦 **Phase H-2 — Site Scaffolding 동작 확인**

`SiteDetail` 페이지에서 확인:

* "Scaffold Site" 클릭

* Scaffolding log가 실시간으로 표시되어야 함

* CMS Builder 호출 로그 포함:

  ```
  Creating initial CMS pages...
  Setting default layout...
  Installing apps: commerce, customer, admin
  ```

* 완료 후:

```
status: ready
```

이면 성공.

---

## 🟦 **Phase H-3 — CMS 초기 페이지 생성 검증**

API로 직접 확인:

```bash
GET /api/cms/views?domain=test01.neture.co.kr
```

다음 페이지들이 자동 생성되어야 함:

| Page      | URL        |
| --------- | ---------- |
| home      | /          |
| login     | /login     |
| dashboard | /dashboard |
| shop      | /shop      |
| contact   | /contact   |

각 페이지의 JSON 구조는
템플릿(`/services/deployment-service/site-template/`)과 일치해야 한다.

---

## 🟦 **Phase H-4 — AppStore 앱 자동 설치 검증**

API 테스트:

```bash
GET /api/appstore/apps?domain=test01.neture.co.kr
```

설치된 앱:

* commerce
* customer
* admin

각 manifest 기반으로 Function/UI/Views registry가 자동 병합되어야 함.

---

## 🟦 **Phase H-5 — Layout / Theme 자동 구성 확인**

CMS Layout endpoint 확인:

```bash
GET /api/cms/layout?domain=test01.neture.co.kr
```

결과 예시:

```json
{
  "theme": {
    "primary": "#1A73E8",
    "accent": "#F97316"
  },
  "navigation": [
    { "label": "Home", "href": "/" },
    { "label": "Shop", "href": "/shop" }
  ]
}
```

OK이면 성공.

---

## 🟦 **Phase H-6 — (Optional) Deployment Manager 연동 테스트**

관리자 UI에서:

1. "Deploy Site" 클릭
2. 상태 변화 확인:

```
deploying → provisioning → building → ready
```

3. Lightsail 인스턴스 생성 여부 확인
4. 해당 도메인 접속 테스트

> 이 단계는 Optional (실제 클라우드 비용 발생).

---

## 🟦 **Phase H-7 — 프런트엔드 렌더링 테스트**

main-site에서 해당 새로운 사이트로 접속:

```
https://test01.neture.co.kr/
```

확인 항목:

* Home 페이지 로딩 OK
* Header / Footer 테마 적용 OK
* Shop 페이지 렌더링 OK
* 로그인 페이지 OK
* Dashboard 페이지 OK
* AppStore 앱 UI 정상 렌더링

---

## 🟦 **Phase H-8 — 에러 로그 및 안정성 점검**

1. API Server PM2 로그 점검
2. main-site 로그 점검
3. Admin Dashboard에서 상태 모니터링
4. page rendering 오류 여부
5. AppStore 설치 실패 여부

---

## 3. 성공 기준 (DoD)

* [ ] 사이트 생성 → CMS 페이지 생성 자동 처리
* [ ] 템플릿 적용 정상
* [ ] AppStore 앱 자동 설치 정상
* [ ] Scaffold 로그 정상
* [ ] Layout/Theme 정상 적용
* [ ] ViewRenderer 정상 렌더링
* [ ] (Optional) Deployment Manager 연결 테스트 성공
* [ ] 전체 작업 중 API 오류 없음
* [ ] 새 사이트 접근 시 문제 없음

---

## ✔ Step 24 — Phase H Work Order 작성 완료!

---

## 다음 단계

Phase H 완료 후 다음을 진행할 수 있습니다:

* Step 25 (API Server V2 Integration)
* Step 27 (플레이어 네이티브 앱)
* Step 28 (Antigravity Designer)

---

*Last Updated: 2025-12-03*
