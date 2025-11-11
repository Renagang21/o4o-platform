/**
 * Test page for deleting legacy customizer settings
 */

import React, { useState } from 'react';
import { authClient } from '@o4o/auth-client';

const DeleteCustomizerTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm('정말로 customizer 설정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await authClient.api.delete('/settings/customizer');
      setResult(response.data);
      console.log('Delete result:', response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      setError(errorMsg);
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Delete Customizer Settings</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        이 페이지는 레거시 Astra Customizer 설정을 삭제합니다.
      </p>

      <button
        onClick={handleDelete}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: '600'
        }}
      >
        {loading ? '삭제 중...' : 'Customizer 설정 삭제'}
      </button>

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724'
        }}>
          <strong>성공:</strong> {result.message}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24'
        }}>
          <strong>에러:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h3>Response Data:</h3>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '14px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DeleteCustomizerTest;
