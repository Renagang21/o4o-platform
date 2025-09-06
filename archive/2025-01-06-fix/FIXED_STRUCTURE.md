# 수정 필요 사항

## 문제점
1. loadPostData 함수가 useEffect 이후에 정의되어 있어 "used before declaration" 에러 발생
2. useCallback의 dependency array가 빈 배열이어서 state 업데이트가 제대로 안 될 수 있음
3. API 응답 타입 처리가 복잡함

## 해결 방안
1. loadPostData를 useEffect보다 위로 이동
2. useCallback dependency에 필요한 setter 함수들 추가
3. API 응답 구조를 더 명확하게 처리

## 구조 변경
```
// 1. State 정의
// 2. loadPostData 함수 정의 (useCallback)
// 3. useEffect들
// 4. 기타 핸들러 함수들
```