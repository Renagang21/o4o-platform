/**
 * WorkBasketPage — 작업바구니
 * WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1
 *
 * 선택된 자료 목록 확인 + 개별 제거 + "AI로 보내기"
 */

import { useNavigate } from 'react-router-dom';
import { Trash2, ArrowLeft, Send, ShoppingBasket } from 'lucide-react';
import { useWorkBasket } from '../../../contexts/WorkBasketContext';
import { toast } from '@o4o/error-handling';

export default function WorkBasketPage() {
  const navigate = useNavigate();
  const basket = useWorkBasket();

  const handleSendToAi = () => {
    if (basket.items.length === 0) {
      toast.error('바구니가 비어 있습니다');
      return;
    }
    navigate('/operator/resources/ai-workspace', { state: { items: basket.items } });
  };

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/operator/resources')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBasket size={20} />
            작업바구니
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            {basket.items.length}개 자료가 담겨 있습니다
          </p>
        </div>
      </div>

      {basket.items.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <ShoppingBasket size={40} style={{ margin: '0 auto 12px', display: 'block', color: '#d1d5db' }} />
          <p style={{ margin: 0 }}>바구니가 비어 있습니다</p>
          <button
            onClick={() => navigate('/operator/resources')}
            style={{
              marginTop: 16, padding: '8px 20px', borderRadius: 8,
              background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            자료실로 이동
          </button>
        </div>
      ) : (
        <>
          {/* Item list */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            {basket.items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: idx < basket.items.length - 1 ? '1px solid #f3f4f6' : 'none',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{item.title}</div>
                  {item.role && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>역할: {item.role}</div>
                  )}
                  {item.content && (
                    <div style={{
                      fontSize: 13, color: '#6b7280', marginTop: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {item.content}
                    </div>
                  )}
                  {item.file_url && (
                    <div style={{ fontSize: 12, color: '#2563eb', marginTop: 4 }}>파일: {item.file_url}</div>
                  )}
                  {item.external_url && (
                    <div style={{ fontSize: 12, color: '#2563eb', marginTop: 4 }}>링크: {item.external_url}</div>
                  )}
                </div>
                <button
                  onClick={() => basket.remove(item.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', padding: 4, display: 'flex', flexShrink: 0,
                  }}
                  title="바구니에서 제거"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { basket.clear(); toast.success('바구니를 비웠습니다'); }}
              style={{
                padding: '9px 18px', borderRadius: 8,
                background: '#fff', color: '#6b7280',
                border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 14,
              }}
            >
              바구니 비우기
            </button>
            <button
              onClick={handleSendToAi}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 20px', borderRadius: 8,
                background: '#7c3aed', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
              }}
            >
              <Send size={15} />
              AI로 보내기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
