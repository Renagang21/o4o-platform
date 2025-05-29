# AI Services

AI 서비스 모듈은 o4o 플랫폼의 인공지능 관련 기능을 제공하는 서비스입니다.

## 주요 기능

- OCR (광학 문자 인식)
- 이미지 처리
- 자연어 처리
- 추천 시스템

## 기술 스택

- Python 3.9+
- FastAPI
- PyTorch
- OpenCV
- Tesseract OCR

## 설치 방법

```bash
# 가상환경 생성
python -m venv venv

# 가상환경 활성화
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

## 개발 가이드

1. 코드 스타일
   - PEP 8 준수
   - Type hints 사용
   - Docstring 필수

2. 테스트
   - 단위 테스트 필수
   - 통합 테스트 권장

3. 문서화
   - API 문서 자동화
   - 사용 예제 포함

## 프로젝트 구조

```
ai-services/
├── src/                    # 소스 코드
│   ├── ocr/               # OCR 관련 모듈
│   ├── image/             # 이미지 처리 모듈
│   ├── nlp/               # 자연어 처리 모듈
│   └── recommender/       # 추천 시스템 모듈
├── tests/                 # 테스트 코드
├── docs/                  # 문서
└── examples/              # 사용 예제
```

## 라이선스

MIT License 