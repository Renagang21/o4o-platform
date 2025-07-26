import React from 'react';

const Forbidden: FC = () => (
  <div style={{ padding: 40, textAlign: 'center' }}>
    <h1 style={{ fontSize: 48, fontWeight: 700, color: '#e53e3e' }}>403 Forbidden</h1>
    <p style={{ fontSize: 20, marginTop: 16 }}>이 페이지에 접근할 권한이 없습니다.</p>
    <a href="/" style={{ color: '#3182ce', textDecoration: 'underline', marginTop: 24, display: 'inline-block' }}>메인페이지로 이동</a>
  </div>
);

export default Forbidden; 