# Cursor 작업 요청 - `.cursorrules` 적용

## 📌 목적

이 문서는 Cursor에게 `.cursor/.cursorrules` 설정을 적용한 상태에서  
`services/yaksa-main-site` 디렉토리를 중심으로 자동화 작업을 진행하도록 요청하는 지침입니다.

---

## 1️⃣ 설정 구조 확인

- 설정 파일 위치: `.cursor/.cursorrules`
- 설정 내용 요약:

```json
{
  "folders": [
    "services/yaksa-main-site"
  ],
  "ignore": [
    "node_modules",
    "dist",
    ".git",
    ".vscode",
    ".cursor",
    "*.log",
    "*.local",
    ".env"
  ],
  "defaultLanguage": "typescript"
}
```

---

## 2️⃣ Cursor에게 요청할 작업

Cursor에게 다음과 같이 요청합니다:

> 위 `.cursorrules` 설정을 기반으로 `services/yaksa-main-site` 디렉토리에 대해 코딩 지원을 활성화해 주세요.  
> 이 설정은 타입스크립트 기반 React 앱입니다. 이후 요청부터는 이 디렉토리 안의 작업이 기본 기준입니다.

---

## 3️⃣ 향후 확장 방향

> 추후 다음 디렉토리 작업 시 `.cursorrules`의 `"folders"` 항목에 다음을 추가할 계획입니다:
> - `services/api-server`
> - `services/crowdfunding`
> - `services/ecommerce`
> - 등등