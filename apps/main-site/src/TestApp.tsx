import { FC } from 'react';

const TestApp: FC = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>O4O Platform Test</h1>
      <p>React 앱이 정상적으로 로드되었습니다!</p>
      <p>현재 시간: {new Date().toLocaleString()}</p>
    </div>
  );
};

export default TestApp;