#!/bin/bash

echo "🔍 O4O Platform 백지 화면 긴급 디버깅"
echo "====================================="

# 1. 정적 HTML 테스트
echo ""
echo "1️⃣ 정적 HTML 테스트 파일 생성..."
sudo tee /var/www/html/test-static.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Static Test</title>
</head>
<body>
    <h1>정적 HTML 테스트</h1>
    <p>이 페이지가 보인다면 nginx는 정상입니다.</p>
    <p>시간: <script>document.write(new Date().toLocaleString());</script></p>
</body>
</html>
EOF
echo "✅ 생성 완료: https://neture.co.kr/test-static.html"

# 2. 간단한 React 테스트
echo ""
echo "2️⃣ 간단한 React 테스트 앱 생성..."
cd /home/ubuntu/o4o-platform/services/main-site/

# 테스트용 App 파일 생성
cat > src/SimpleApp.tsx << 'EOF'
import React from 'react';

const SimpleApp = () => {
  console.log('SimpleApp 컴포넌트 렌더링');
  return <h1>React 앱이 작동합니다! 시간: {new Date().toLocaleString()}</h1>;
};

export default SimpleApp;
EOF

# 테스트용 main 파일 생성
cat > src/main-simple.tsx << 'EOF'
console.log('main-simple.tsx 로드됨');

import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('React import 완료');

const root = document.getElementById('root');
console.log('root element:', root);

if (root) {
  ReactDOM.createRoot(root).render(
    <h1>최소 React 테스트: {new Date().toLocaleString()}</h1>
  );
  console.log('React 렌더링 시도 완료');
}
EOF

# 테스트용 HTML 생성
cat > test-simple.html << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8" />
    <title>Simple React Test</title>
</head>
<body>
    <div id="root">로딩 중...</div>
    <script type="module" src="/src/main-simple.tsx"></script>
</body>
</html>
EOF

# 3. 빌드 및 배포
echo ""
echo "3️⃣ 테스트 앱 빌드..."
NODE_ENV=production npm run build

# 4. 빌드된 파일 검사
echo ""
echo "4️⃣ 빌드 파일 분석..."
if [ -f dist/index.html ]; then
    echo "📄 index.html 내용:"
    grep -E "(script|link)" dist/index.html
    
    echo ""
    echo "📦 생성된 assets:"
    ls -lah dist/assets/ | head -10
    
    # JS 파일에서 문제가 될 수 있는 패턴 검색
    JS_FILE=$(find dist/assets -name "*.js" | head -1)
    if [ -f "$JS_FILE" ]; then
        echo ""
        echo "🔍 JS 파일 분석 ($JS_FILE):"
        echo "- 파일 크기: $(ls -lh "$JS_FILE" | awk '{print $5}')"
        echo "- import 문 개수: $(grep -c "import" "$JS_FILE" || echo "0")"
        echo "- console.log 개수: $(grep -c "console\." "$JS_FILE" || echo "0")"
        
        # 첫 100자 확인
        echo ""
        echo "📝 JS 파일 첫 부분:"
        head -c 200 "$JS_FILE" | strings
    fi
fi

# 5. 배포
echo ""
echo "5️⃣ 파일 배포..."
sudo cp dist/* /var/www/html/ -r 2>/dev/null || true
sudo cp test-simple.html /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

# 6. nginx 에러 로그 확인
echo ""
echo "6️⃣ 최근 nginx 에러:"
sudo tail -n 20 /var/log/nginx/error.log | grep -v "favicon"

# 7. 브라우저 콘솔 확인 가이드
echo ""
echo "7️⃣ 브라우저에서 확인할 사항:"
echo "====================================="
echo "1. https://neture.co.kr/test-static.html - 정적 HTML 테스트"
echo "2. https://neture.co.kr/test-simple.html - 간단한 React 테스트"
echo "3. https://neture.co.kr - 메인 사이트"
echo ""
echo "🔍 브라우저 개발자 도구에서:"
echo "- Console 탭: 에러 메시지 확인"
echo "- Network 탭: 실패한 요청 확인"
echo "- Elements 탭: <div id='root'> 내용 확인"
echo ""
echo "💡 Console에서 실행해보세요:"
echo "document.getElementById('root')"
echo "window.React"
echo "window.ReactDOM"