/**
 * ContentDetailPage — K-Cosmetics 콘텐츠 상세
 *
 * WO-O4O-APPRECIATION-CONTENT-DETAIL-UI-GLYCO-KCOS-V1
 *
 * Route: /library/content/:id
 * Data: location.state.item (ContentHubItem from list navigation)
 * Appreciation: targetType='content', authorId guard via item.createdBy
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { appreciationApi, type AppreciationSummary, type AppreciationSend } from '@/api/appreciation';
import type { ContentHubItem } from '@o4o/shared-space-ui';
import { toast } from '@o4o/error-handling';

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const item = state?.item as ContentHubItem | undefined;

  const [appreciationSummary, setAppreciationSummary] = useState<AppreciationSummary | null>(null);
  const [appreciationRecent, setAppreciationRecent] = useState<AppreciationSend[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadAppreciation = () => {
    if (!id) return;
    Promise.allSettled([
      appreciationApi.getSummary('content', id),
      appreciationApi.getRecent('content', id),
    ]).then(([sumRes, recentRes]) => {
      if (sumRes.status === 'fulfilled') {
        const d = sumRes.value.data?.data ?? sumRes.value.data;
        setAppreciationSummary(d);
      }
      if (recentRes.status === 'fulfilled') {
        const d = recentRes.value.data?.data ?? recentRes.value.data;
        setAppreciationRecent(d?.items ?? []);
      }
    });
  };

  useEffect(() => { loadAppreciation(); }, [id]);

  const handleSend = async () => {
    if (!isAuthenticated) { toast.error('로그인이 필요합니다'); return; }
    if (!id) return;
    setSending(true);
    try {
      await appreciationApi.send({ targetType: 'content', targetId: id, amount, message: message || undefined });
      toast.success(`${amount}P 감사 포인트를 보냈습니다!`);
      setShowModal(false);
      setMessage('');
      setAmount(10);
      loadAppreciation();
    } catch (e: any) {
      const code = e?.response?.data?.code;
      if (code === 'INSUFFICIENT_BALANCE') toast.error('포인트가 부족합니다');
      else if (code === 'SELF_APPRECIATION') toast.error('자신의 콘텐츠에는 감사 포인트를 보낼 수 없습니다');
      else toast.error('감사 포인트 전송에 실패했습니다');
    } finally {
      setSending(false);
    }
  };

  if (!item) {
    return (
      <div style={S.notFound}>
        <p style={S.notFoundText}>콘텐츠를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} style={S.backBtn}>← 뒤로</button>
      </div>
    );
  }

  const canSend = !!item.createdBy;

  return (
    <div style={S.page}>
      <button onClick={() => navigate(-1)} style={S.backLink}>← 콘텐츠 목록</button>

      {/* Content Card */}
      <div style={S.card}>
        {item.thumbnail && (
          <div style={S.thumbnailWrap}>
            <img src={item.thumbnail} alt={item.title} style={S.thumbnail} />
          </div>
        )}
        <div style={S.cardBody}>
          {item.type && <span style={S.typeBadge}>{item.type}</span>}
          {item.isPinned && <span style={S.pinnedBadge}>추천</span>}
          <h1 style={S.title}>{item.title}</h1>
          {item.summary && <p style={S.summary}>{item.summary}</p>}
          {item.date && <p style={S.date}>{item.date}</p>}
          {item.href && (
            <a href={item.href} target="_blank" rel="noopener noreferrer" style={S.externalBtn}>
              외부 링크 열기 ↗
            </a>
          )}
        </div>
      </div>

      {/* Appreciation Section */}
      <div style={S.card}>
        <div style={S.appreciationHeader}>
          <span style={S.appreciationTitle}>콘텐츠 감사</span>
          {appreciationSummary && appreciationSummary.totalAmount > 0 && (
            <span style={S.appreciationStat}>
              🎁 {appreciationSummary.totalAmount.toLocaleString()}P · {appreciationSummary.count}명
            </span>
          )}
        </div>

        {canSend ? (
          <button
            onClick={() => {
              if (!isAuthenticated) { toast.error('로그인이 필요합니다'); return; }
              setShowModal(true);
            }}
            style={S.sendBtn}
          >
            🎁 작성자에게 감사하기
          </button>
        ) : (
          <p style={S.noAuthor}>작성자 정보가 없어 감사하기를 사용할 수 없습니다.</p>
        )}

        {appreciationRecent.filter(r => r.message).length > 0 && (
          <div style={S.recentBlock}>
            <p style={S.recentLabel}>최근 감사 메시지</p>
            {appreciationRecent.filter(r => r.message).slice(0, 3).map((r, i) => (
              <div key={i} style={S.recentRow}>
                <span style={S.recentMsg}>"{r.message}"</span>
                <span style={S.recentAmt}>+{r.amount}P</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appreciation Modal */}
      {showModal && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <h3 style={S.modalTitle}>감사 포인트 보내기</h3>
            <div style={S.presetRow}>
              {[10, 30, 50].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  style={{ ...S.presetBtn, ...(amount === v ? S.presetBtnActive : {}) }}
                >
                  {v}P
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              style={S.input}
              placeholder="직접 입력"
            />
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="감사 메시지 (선택)"
              rows={2}
              style={S.textarea}
            />
            <div style={S.modalBtns}>
              <button
                onClick={() => { setShowModal(false); setMessage(''); setAmount(10); }}
                style={S.cancelBtn}
              >
                취소
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{ ...S.confirmBtn, ...(sending ? S.confirmBtnDisabled : {}) }}
              >
                {sending ? '전송 중...' : `${amount}P 보내기`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 640, margin: '0 auto', padding: '24px 16px 60px' },
  notFound: { minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: '0.875rem', color: '#94a3b8' },
  backBtn: { fontSize: '0.875rem', color: '#ec4899', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  backLink: { display: 'block', fontSize: '0.875rem', color: '#ec4899', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16, textAlign: 'left' },
  card: { backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 16 },
  thumbnailWrap: { width: '100%', aspectRatio: '16/9', backgroundColor: '#f8fafc', overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%', objectFit: 'cover' },
  cardBody: { padding: '20px' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: 4, marginRight: 6, marginBottom: 8 },
  pinnedBadge: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 500, backgroundColor: '#fdf2f8', color: '#ec4899', borderRadius: 4, marginBottom: 8 },
  title: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.4 },
  summary: { fontSize: '0.875rem', color: '#64748b', margin: '0 0 8px', lineHeight: 1.6 },
  date: { fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 16px' },
  externalBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#ec4899', color: '#fff', fontSize: '0.875rem', fontWeight: 500, borderRadius: 8, textDecoration: 'none' },
  appreciationHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' },
  appreciationTitle: { fontSize: '0.875rem', fontWeight: 600, color: '#334155' },
  appreciationStat: { fontSize: '0.75rem', color: '#92400e', backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '3px 10px', borderRadius: 20 },
  sendBtn: { display: 'block', width: 'calc(100% - 40px)', margin: '12px 20px 16px', padding: '10px 0', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, color: '#92400e', cursor: 'pointer' },
  noAuthor: { fontSize: '0.75rem', color: '#94a3b8', padding: '8px 20px 16px', margin: 0 },
  recentBlock: { padding: '0 20px 16px' },
  recentLabel: { fontSize: '0.6875rem', fontWeight: 600, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' },
  recentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #fef3c7' },
  recentMsg: { fontSize: '0.75rem', color: '#78350f', fontStyle: 'italic', flex: 1, marginRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  recentAmt: { fontSize: '0.75rem', fontWeight: 600, color: '#92400e', whiteSpace: 'nowrap' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' },
  modal: { backgroundColor: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' },
  presetRow: { display: 'flex', gap: 8, marginBottom: 12 },
  presetBtn: { flex: 1, padding: '8px 0', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' },
  presetBtnActive: { backgroundColor: '#f59e0b', color: '#fff', border: '1px solid #f59e0b' },
  input: { display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', marginBottom: 12, boxSizing: 'border-box', outline: 'none' },
  textarea: { display: 'block', width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', marginBottom: 16, resize: 'none', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' },
  modalBtns: { display: 'flex', gap: 8 },
  cancelBtn: { flex: 1, padding: '10px 0', fontSize: '0.875rem', fontWeight: 500, color: '#64748b', backgroundColor: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer' },
  confirmBtn: { flex: 1, padding: '10px 0', fontSize: '0.875rem', fontWeight: 500, color: '#fff', backgroundColor: '#f59e0b', border: 'none', borderRadius: 10, cursor: 'pointer' },
  confirmBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
};
