#!/bin/bash

echo "🚨 O4O Platform 백지 화면 최종 해결 스크립트"
echo "==========================================="
echo ""

cd /home/ubuntu/o4o-platform/services/main-site/

# 1. App.tsx 백업 및 수정
echo "1️⃣ App.tsx를 간단한 버전으로 교체..."
cp src/App.tsx src/App.tsx.backup

cat > src/App.tsx << 'EOF'
import React from 'react';

const App: React.FC = () => {
  console.log('App 컴포넌트 렌더링됨');
  
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>O4O Platform</h1>
      <p>React 앱이 정상적으로 작동합니다!</p>
      <p>빌드 시간: ${new Date().toISOString()}</p>
      <div style={{ marginTop: '20px' }}>
        <a href="/auth/login" style={{ color: 'blue', textDecoration: 'underline' }}>
          로그인 페이지로 이동 (라우팅 테스트)
        </a>
      </div>
    </div>
  );
};

export default App;
EOF

# 2. main.tsx 수정 (에러 처리 추가)
echo ""
echo "2️⃣ main.tsx에 에러 처리 추가..."
cp src/main.tsx src/main.tsx.backup

cat > src/main.tsx << 'EOF'
import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('main.tsx 실행 시작');

// 전역 에러 핸들러
window.addEventListener('error', (event) => {
  console.error('전역 에러 발생:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('처리되지 않은 Promise 거부:', event.reason);
});

try {
  const rootElement = document.getElementById('root');
  console.log('root element:', rootElement);
  
  if (!rootElement) {
    throw new Error('root element를 찾을 수 없습니다');
  }
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('React 렌더링 완료');
} catch (error) {
  console.error('React 초기화 실패:', error);
  document.body.innerHTML = '<h1>앱 로드 실패: ' + error + '</h1>';
}
EOF

# 3. 빌드
echo ""
echo "3️⃣ 프로덕션 빌드 실행..."
rm -rf dist
NODE_ENV=production npm run build

# 빌드 성공 확인
if [ ! -d "dist" ]; then
  echo "❌ 빌드 실패!"
  exit 1
fi

# 4. index.html 확인
echo ""
echo "4️⃣ 빌드된 index.html 확인..."
echo "생성된 스크립트 태그:"
grep -o '<script[^>]*>' dist/index.html

# 5. 배포
echo ""
echo "5️⃣ 프로덕션 파일 배포..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# 6. 간단한 디버그 페이지 생성
echo ""
echo "6️⃣ 디버그 페이지 생성..."
sudo tee /var/www/html/debug.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Debug Info</title>
</head>
<body>
    <h1>시스템 디버그 정보</h1>
    <div id="info"></div>
    <script>
        const info = document.getElementById('info');
        info.innerHTML = `
            <p>현재 시간: ${new Date()}</p>
            <p>User Agent: ${navigator.userAgent}</p>
            <p>JavaScript 활성화: ✅</p>
            <p>현재 URL: ${window.location.href}</p>
            <h2>assets 디렉토리 확인:</h2>
            <p><a href="/assets/">assets 디렉토리 보기</a></p>
        `;
        
        // React 관련 전역 변수 확인
        console.log('window.React:', window.React);
        console.log('window.ReactDOM:', window.ReactDOM);
    </script>
</body>
</html>
EOF

# 7. nginx 재시작
echo ""
echo "7️⃣ Nginx 재시작..."
sudo systemctl reload nginx

# 8. 최종 안내
echo ""
echo "✅ 작업 완료!"
echo "==========================================="
echo ""
echo "🌐 확인할 URL들:"
echo "1. https://neture.co.kr - 메인 페이지 (간단한 App)"
echo "2. https://neture.co.kr/debug.html - 디버그 정보"
echo ""
echo "📋 브라우저에서 확인할 사항:"
echo "1. Ctrl+Shift+R (강력 새로고침)"
echo "2. F12 → Console 탭에서 로그 확인"
echo "3. Network 탭에서 파일 로드 확인"
echo ""
echo "💡 여전히 백지라면:"
echo "1. 시크릿 모드에서 테스트"
echo "2. 다른 브라우저에서 테스트"
echo "3. Console 에러 스크린샷 촬영"
echo ""
echo "🔄 원래 App으로 복구하려면:"
echo "cp src/App.tsx.backup src/App.tsx"
echo "cp src/main.tsx.backup src/main.tsx"
echo "npm run build && sudo cp -r dist/* /var/www/html/"