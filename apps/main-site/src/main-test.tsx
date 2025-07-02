import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import TestApp from './TestApp';

// 콘솔에 디버그 메시지 출력
console.log('🚀 React 앱 시작 시도...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ root element를 찾을 수 없습니다!');
    throw new Error('Root element not found');
  }
  
  console.log('✅ root element 발견:', rootElement);
  
  const root = ReactDOM.createRoot(rootElement);
  console.log('✅ React root 생성 완료');
  
  root.render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
  
  console.log('✅ React 앱 렌더링 완료!');
} catch (error) {
  console.error('❌ React 앱 시작 실패:', error);
  // 에러 발생 시 간단한 HTML 표시
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>에러 발생</h1>
      <p>${error}</p>
    </div>
  `;
}