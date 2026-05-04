/**
 * StoreUseModal — 매장 활용 변환 모달
 *
 * WO-O4O-STORE-USE-CONTENT-TRANSFORM-V1
 *
 * 현재 에디터의 HTML 본문을 기반으로 매장 활용 가능한 형태로 AI 변환한다.
 * - QR 안내문 / POP 문구 / SNS 공유문 / 블로그·매장 설명문
 * 결과는 미리보기 + 복사 제공. 원본 에디터는 변경하지 않는다.
 *
 * - 인증: credentials: 'include' (쿠키 기반)
 * - API: POST /api/ai/content-to-store-use
 */

import { useState } from 'react';
import type { Editor } from '@tiptap/react';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  'https://api.neture.co.kr';

type UseCase = 'qr' | 'pop' | 'sns' | 'blog';
type Audience = 'customer' | 'staff' | 'store_owner';
type Tone = 'easy' | 'professional' | 'promotion';
type Length = 'short' | 'medium';

interface StoreUseResult {
  html: string;
  plainText: string;
  title: string;
  summary: string;
  shortText: string;
  longText: string;
  bullets: string[];
}

interface StoreUseModalProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

const USE_CASE_CONFIG: { key: UseCase; label: string; icon: string; desc: string }[] = [
  { key: 'qr', label: 'QR 안내문', icon: '📱', desc: 'QR 스캔 후 고객에게 보여줄 짧은 안내' },
  { key: 'pop', label: 'POP 문구', icon: '🏷️', desc: '매장 내 포스터·스티커용 임팩트 문구' },
  { key: 'sns', label: 'SNS 공유문', icon: '📢', desc: '인스타·블로그·카카오 채널 게시용' },
  { key: 'blog', label: '매장 설명문', icon: '📝', desc: '블로그형 상세 매장·제품 소개' },
];

const AUDIENCE_LABELS: Record<Audience, string> = {
  customer: '고객',
  staff: '직원',
  store_owner: '매장 운영자',
};

const TONE_LABELS: Record<Tone, string> = {
  easy: '쉬운 설명',
  professional: '전문 설명',
  promotion: '홍보형',
};

const LENGTH_LABELS: Record<Length, string> = {
  short: '짧게',
  medium: '보통',
};

const btn = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  border: `1px solid ${active ? '#4f46e5' : '#d1d5db'}`,
  borderRadius: '6px',
  background: active ? '#4f46e5' : 'white',
  color: active ? 'white' : '#374151',
  fontSize: '13px',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
});

export function StoreUseModal({ open, onClose, editor }: StoreUseModalProps) {
  const [useCase, setUseCase] = useState<UseCase>('qr');
  const [audience, setAudience] = useState<Audience>('customer');
  const [tone, setTone] = useState<Tone>('easy');
  const [length, setLength] = useState<Length>('short');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StoreUseResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [resultView, setResultView] = useState<'preview' | 'text'>('preview');
  const [saving, setSaving] = useState(false);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  if (!open) return null;

  function getSourceHtml(): string {
    if (!editor) return '';
    return editor.getHTML();
  }

  async function handleGenerate() {
    const sourceHtml = getSourceHtml();
    if (!sourceHtml || sourceHtml === '<p></p>') {
      setError('에디터에 내용을 먼저 작성해 주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/ai/content-to-store-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sourceHtml, useCase, audience, tone, length }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setError(data.error || 'AI 변환 중 오류가 발생했습니다.');
        return;
      }

      setResult({
        html: data.html || '',
        plainText: data.plainText || '',
        title: data.title || '',
        summary: data.summary || '',
        shortText: data.shortText || '',
        longText: data.longText || '',
        bullets: data.bullets || [],
      });
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const text = resultView === 'text' ? result.plainText : result.html;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSaveAsAsset() {
    if (!result) return;
    setSaving(true);
    setSaveError('');
    setSavedAssetId(null);

    const title = result.title || `AI 생성 ${USE_CASE_CONFIG.find((c) => c.key === useCase)?.label ?? ''}`;
    const description = result.summary || result.plainText.slice(0, 200);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/kpa/store/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          assetType: 'content',
          htmlContent: result.html,
          usageType: useCase,
          sourceType: 'generated',
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setSaveError(data.error || '저장 중 오류가 발생했습니다.');
        return;
      }

      setSavedAssetId(data.data?.id ?? data.id ?? '');
    } catch {
      setSaveError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setResult(null);
    setError('');
    setCopied(false);
    setSavedAssetId(null);
    setSaveError('');
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '28px',
          width: '540px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#111827' }}>🏪 매장에서 활용</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              현재 작성된 콘텐츠를 매장 활용 형태로 변환합니다
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* UseCase 선택 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>활용 형태</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {USE_CASE_CONFIG.map((cfg) => (
              <button
                key={cfg.key}
                onClick={() => setUseCase(cfg.key)}
                style={{
                  padding: '10px 12px',
                  border: `2px solid ${useCase === cfg.key ? '#4f46e5' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  background: useCase === cfg.key ? '#eef2ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: useCase === cfg.key ? '#4338ca' : '#111827' }}>
                  {cfg.icon} {cfg.label}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{cfg.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 대상 선택 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>대상</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
              <button key={a} onClick={() => setAudience(a)} style={btn(audience === a)}>
                {AUDIENCE_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        {/* 톤 선택 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>톤</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
              <button key={t} onClick={() => setTone(t)} style={btn(tone === t)}>
                {TONE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* 길이 선택 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>길이</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(Object.keys(LENGTH_LABELS) as Length[]).map((l) => (
              <button key={l} onClick={() => setLength(l)} style={btn(length === l)}>
                {LENGTH_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#a5b4fc' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '16px',
          }}
        >
          {loading ? '변환 중...' : '✨ AI 변환 시작'}
        </button>

        {/* 에러 */}
        {error && (
          <div style={{
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            {/* 제목 */}
            {result.title && (
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                {result.title}
              </div>
            )}
            {result.summary && (
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                {result.summary}
              </div>
            )}

            {/* 탭 */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
              <button onClick={() => setResultView('preview')} style={btn(resultView === 'preview')}>미리보기</button>
              <button onClick={() => setResultView('text')} style={btn(resultView === 'text')}>텍스트</button>
            </div>

            {/* 본문 */}
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '14px',
              minHeight: '100px',
              maxHeight: '280px',
              overflowY: 'auto',
              background: '#f9fafb',
              fontSize: '13px',
              lineHeight: '1.7',
              color: '#111827',
            }}>
              {resultView === 'preview' ? (
                <div dangerouslySetInnerHTML={{ __html: result.html }} />
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                  {result.plainText}
                </pre>
              )}
            </div>

            {/* shortText / longText (pop, qr, sns용) */}
            {(result.shortText || result.longText) && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.shortText && (
                  <div style={{ fontSize: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 12px' }}>
                    <span style={{ fontWeight: 600, color: '#92400e' }}>짧은 버전 </span>
                    <span style={{ color: '#78350f' }}>{result.shortText}</span>
                  </div>
                )}
                {result.longText && (
                  <div style={{ fontSize: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px' }}>
                    <span style={{ fontWeight: 600, color: '#166534' }}>긴 버전 </span>
                    <span style={{ color: '#14532d' }}>{result.longText}</span>
                  </div>
                )}
              </div>
            )}

            {/* 복사 + 저장 버튼 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: copied ? '#16a34a' : '#f3f4f6',
                  color: copied ? 'white' : '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copied ? '✅ 복사됨!' : '📋 복사'}
              </button>
              <button
                onClick={handleSaveAsAsset}
                disabled={saving || !!savedAssetId}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: savedAssetId ? '#16a34a' : saving ? '#d1fae5' : '#ecfdf5',
                  color: savedAssetId ? 'white' : saving ? '#059669' : '#059669',
                  border: `1px solid ${savedAssetId ? '#16a34a' : '#6ee7b7'}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: saving || !!savedAssetId ? 'not-allowed' : 'pointer',
                }}
              >
                {savedAssetId ? '✅ 저장됨!' : saving ? '저장 중...' : '💾 실행 자산으로 저장'}
              </button>
            </div>

            {/* 저장 에러 */}
            {saveError && (
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '12px',
              }}>
                {saveError}
              </div>
            )}

            {/* 저장 성공 안내 */}
            {savedAssetId && (
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#166534',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>실행 자산으로 저장됐습니다.</div>
                <div style={{ color: '#4b7c61', fontFamily: 'monospace', fontSize: '11px', marginBottom: '6px' }}>
                  ID: {savedAssetId}
                </div>
                <div style={{ color: '#4b7c61' }}>
                  {useCase === 'qr' && 'QR 코드 생성 시 이 자산을 libraryItemId로 연결할 수 있습니다.'}
                  {useCase === 'pop' && 'POP 생성 시 libraryItemIds에 이 자산 ID를 포함해 사용할 수 있습니다.'}
                  {useCase === 'sns' && 'SNS 게시용 자산이 저장됐습니다. 매장 자산 관리에서 확인할 수 있습니다.'}
                  {useCase === 'blog' && '매장 설명문 자산이 저장됐습니다. 매장 자산 관리에서 확인할 수 있습니다.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreUseModal;
