import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'pharmacy-redirect-notice-dismissed';

export default function RedirectNoticeBanner() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const state = location.state as { fromPharmacy?: boolean } | null;
    if (state?.fromPharmacy && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, [location.state]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div style={{
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: 8,
      padding: '12px 16px',
      margin: '0 0 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 14,
    }}>
      <span>
        <strong>/pharmacy</strong> 경로가 <strong>/store</strong>로 변경되었습니다. 북마크를 업데이트해 주세요.
      </span>
      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          color: '#6b7280',
          padding: '0 4px',
          lineHeight: 1,
        }}
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
}
