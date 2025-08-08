import { StrictMode } from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import TestApp from './TestApp';

// 콘솔에 디버그 메시지 출력
    // Removed console.log

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    // Error logging - use proper error handler
    throw new Error('Root element not found');
  }
  
    // Removed console.log
  
  const root = ReactDOM.createRoot(rootElement);
    // Removed console.log
  
  root.render(
    <StrictMode>
      <TestApp />
    </StrictMode>
  );
  
    // Removed console.log
} catch (error: any) {
    // Error logging - use proper error handler
  // 에러 발생 시 간단한 HTML 표시
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>에러 발생</h1>
      <p>${error}</p>
    </div>
  `;
}