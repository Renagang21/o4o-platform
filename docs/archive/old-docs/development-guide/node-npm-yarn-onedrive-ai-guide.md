# Node, npm, yarn의 OneDrive 설치 관련 AI 참고 가이드

## 개요
- 이 문서는 인공지능이 코드 생성, 분석, 자동화 작업 시 참고할 수 있도록 작성된 개발 환경 가이드입니다.
- node, npm, yarn 등 주요 개발 도구를 OneDrive 경로에 설치할 때 발생할 수 있는 문제와 권장 설정 방법을 안내합니다.

## OneDrive 경로에 설치 시 발생하는 문제
1. **동기화 충돌**
   - OneDrive는 파일을 실시간 동기화하므로, node, npm, yarn의 실행 파일이나 캐시, 전역 패키지 등이 충돌하거나 손상될 수 있습니다.
   - 두 대 이상의 PC에서 동시에 작업 시 파일이 꼬일 위험이 높음.
2. **경로 인식 오류**
   - OneDrive 경로에는 공백, 한글, 특수문자가 포함될 수 있어, 일부 패키지나 스크립트에서 경로 오류가 발생할 수 있습니다.
3. **파일 잠금/퍼미션 문제**
   - 동기화 중인 파일이 잠기거나, 접근 권한 오류가 발생할 수 있습니다.

## 권장 설치 위치 및 환경 변수
- node, npm, yarn 등은 반드시 **로컬 디스크(OneDrive 외부 경로)**에 설치해야 합니다.
  - 예시: `C:\Program Files\nodejs`, `C:\Users\사용자명\AppData\...`
- 전역 패키지, 캐시 폴더(`.npm`, `.yarn`, `node_modules` 등)도 OneDrive가 아닌 로컬 경로를 사용해야 합니다.
- 환경 변수(PATH) 설정 시 OneDrive 경로가 포함되지 않도록 주의하세요.

## AI 작업 시 참고 사항
- 자동화 스크립트, 패키지 설치, 경로 참조 등에서 OneDrive 경로를 피하도록 설계해야 함.
- 환경설정 파일(.env, .npmrc 등)도 로컬 경로를 우선 사용하도록 권장.
- 만약 OneDrive 경로가 감지되면, 경고 메시지 또는 대체 경로 안내를 제공하는 것이 바람직함.

## 예시 코드 (경로 체크)
```js
// Node.js 예시: OneDrive 경로 감지 및 경고
const path = require('path');
if (process.cwd().includes('OneDrive')) {
  console.warn('⚠️  현재 경로가 OneDrive입니다. node, npm, yarn은 로컬 디스크에 설치하는 것이 안전합니다.');
}
```

---
이 문서는 인공지능 및 자동화 시스템이 개발 환경을 안전하게 관리할 수 있도록 참고용으로 작성되었습니다. 