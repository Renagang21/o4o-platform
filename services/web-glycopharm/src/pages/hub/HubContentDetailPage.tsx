/**
 * HubContentDetailPage — GlycoPharm 콘텐츠 상세
 *
 * WO-O4O-APPRECIATION-CONTENT-DETAIL-UI-GLYCO-KCOS-V1
 *
 * Route: /hub/content/:id
 * Data: location.state.item (ContentHubItem from list navigation)
 * Appreciation: targetType='content', authorId guard via item.createdBy
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { appreciationApi, type AppreciationSummary, type AppreciationSend } from '@/api/appreciation';
import type { ContentHubItem } from '@o4o/shared-space-ui';
import { toast } from '@o4o/error-handling';

export default function HubContentDetailPage() {
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
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-slate-400">콘텐츠를 찾을 수 없습니다.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary-600 hover:underline">
          ← 뒤로
        </button>
      </div>
    );
  }

  const canSend = !!item.createdBy;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-sm text-primary-600 hover:underline mb-4 block">
        ← 콘텐츠 목록
      </button>

      {/* Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
        {item.thumbnail && (
          <div className="aspect-video bg-slate-100 overflow-hidden">
            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5">
          {item.type && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 rounded mb-2">
              {item.type}
            </span>
          )}
          <h1 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h1>
          {item.summary && <p className="text-sm text-slate-500 mb-3 leading-relaxed">{item.summary}</p>}
          {item.date && <p className="text-xs text-slate-400 mb-4">{item.date}</p>}
          {item.href && (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              외부 링크 열기 ↗
            </a>
          )}
        </div>
      </div>

      {/* Appreciation Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">콘텐츠 감사</h2>
          {appreciationSummary && appreciationSummary.totalAmount > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
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
            className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-sm font-medium rounded-lg transition-colors mb-4"
          >
            🎁 작성자에게 감사하기
          </button>
        ) : (
          <p className="text-xs text-slate-400 mb-4">작성자 정보가 없어 감사하기를 사용할 수 없습니다.</p>
        )}

        {appreciationRecent.filter(r => r.message).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">최근 감사 메시지</p>
            <div className="space-y-1.5">
              {appreciationRecent.filter(r => r.message).slice(0, 3).map((r, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-amber-50 rounded px-3 py-1.5">
                  <span className="italic text-amber-700 flex-1 mr-2 truncate">"{r.message}"</span>
                  <span className="font-semibold text-amber-600 whitespace-nowrap">+{r.amount}P</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Appreciation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4">감사 포인트 보내기</h3>
            <div className="flex gap-2 mb-3">
              {[10, 30, 50].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    amount === v
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                  }`}
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
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-primary-400"
              placeholder="직접 입력"
            />
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="감사 메시지 (선택)"
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:border-primary-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(false); setMessage(''); setAmount(10); }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
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
