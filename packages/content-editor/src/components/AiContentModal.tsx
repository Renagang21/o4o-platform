/**
 * AiContentModal — AI 콘텐츠 변환 모달
 *
 * WO-AI-CONTENT-TRANSFORM-IMPLEMENTATION-V1
 * WO-AI-CONTENT-EDITOR-POLISH-V1
 * WO-STORE-AI-CONTENT-ASSIST-V1
 *
 * 사용자가 텍스트를 붙여넣으면 AI가 HTML 형식으로 변환/요약/정리.
 * 결과를 에디터에 직접 삽입.
 *
 * - 인증: credentials: 'include' (쿠키 기반, 별도 토큰 prop 불필요)
 * - 삽입: editor.commands.setContent(html) → TipTap onUpdate → onChange 자동 트리거
 * - 모드: 고객용 문장 정리 / 짧게 요약 / POP용 정리 / 제목 추천
 */

import { useState } from 'react';
import type { Editor } from '@tiptap/react';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  'https://api.neture.co.kr';

interface AiContentResult {
  html: string;
  title: string;
  summary: string;
}

interface AiContentModalProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

type AiMode = 'customer_rewrite' | 'summary' | 'pop' | 'title_suggest';
type ToneOption = 'friendly' | 'professional' | 'concise';
type LengthOption = 'short' | 'medium' | 'long';
type ResultTab = 'preview' | 'html';

const MODE_CONFIG: { key: AiMode; label: string; outputType: string; desc: string }[] = [
  { key: 'customer_rewrite', label: '고객용 정리', outputType: 'product_detail', desc: '고객이 읽기 쉬운 상품 설명으로 정리' },
  { key: 'summary', label: '짧게 요약', outputType: 'summary', desc: '핵심만 남겨 3-5줄로 요약' },
  { key: 'pop', label: 'POP용 정리', outputType: 'pop', desc: 'POP 템플릿용 짧은 문구 세트' },
  { key: 'title_suggest', label: '제목 추천', outputType: 'title_suggest', desc: '콘텐츠/POP/QR 제목 후보 추천' },
];

const TONE_LABELS: Record<ToneOption, string> = {
  friendly: '친근함',
  professional: '전문적',
  concise: '간결함',
};

const LENGTH_LABELS: Record<LengthOption, string> = {
  short: '짧게',
  medium: '보통',
  long: '길게',
};

export function AiContentModal({ open, onClose, editor }: AiContentModalProps) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AiMode>('customer_rewrite');
  const [tone, setTone] = useState<ToneOption>('professional');
  const [length, setLength] = useState<LengthOption>('medium');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiContentResult | null>(null);
  const [error, setError] = useState('');
  const [resultTab, setResultTab] = useState<ResultTab>('preview');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const currentConfig = MODE_CONFIG.find((m) => m.key === mode)!;
  const showToneLength = mode !== 'title_suggest';

  const handleGrabFromEditor = () => {
    if (!editor) return;
    const text = editor.getText();
    if (text.trim()) {
      setInput(text.trim());
    }
  };

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError('변환할 텍스트를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setCopied(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          input: input.trim(),
          outputType: currentConfig.outputType,
          options: showToneLength ? { tone, length } : {},
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI 생성에 실패했습니다.');
      }

      setResult({ html: data.html, title: data.title || '', summary: data.summary || '' });
      setResultTab('preview');
    } catch (err: any) {
      setError(err.message || 'AI 서비스 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select + execCommand
      const el = document.createElement('textarea');
      el.value = result.html;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInsert = () => {
    if (!editor || !result) return;
    editor.commands.setContent(result.html);
    handleClose();
  };

  const handleClose = () => {
    setInput('');
    setResult(null);
    setError('');
    setLoading(false);
    setCopied(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          maxWidth: '92vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>✨</span>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>AI 콘텐츠 정리</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              color: '#6b7280',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
          {/* Mode Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              정리 모드
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {MODE_CONFIG.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => { setMode(m.key); setResult(null); setError(''); }}
                  title={m.desc}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    border: `1px solid ${mode === m.key ? '#6366f1' : '#d1d5db'}`,
                    borderRadius: '16px',
                    background: mode === m.key ? '#eef2ff' : 'white',
                    color: mode === m.key ? '#4f46e5' : '#6b7280',
                    cursor: 'pointer',
                    fontWeight: mode === m.key ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', margin: '4px 0 0' }}>
              {currentConfig.desc}
            </p>
          </div>

          {/* Input */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                원본 텍스트
              </label>
              {editor && (
                <button
                  type="button"
                  onClick={handleGrabFromEditor}
                  style={{
                    padding: '3px 10px',
                    fontSize: '11px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    background: '#f9fafb',
                    color: '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  에디터에서 가져오기
                </button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="원본 정보를 입력하거나 에디터에서 가져오세요..."
              rows={5}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Options — hide for title_suggest */}
          {showToneLength && (
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Tone */}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  톤
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(Object.keys(TONE_LABELS) as ToneOption[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '12px',
                        border: `1px solid ${tone === t ? '#6366f1' : '#d1d5db'}`,
                        borderRadius: '6px',
                        background: tone === t ? '#eef2ff' : 'white',
                        color: tone === t ? '#4f46e5' : '#6b7280',
                        cursor: 'pointer',
                        fontWeight: tone === t ? 600 : 400,
                      }}
                    >
                      {TONE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length */}
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  분량
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(Object.keys(LENGTH_LABELS) as LengthOption[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLength(l)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '12px',
                        border: `1px solid ${length === l ? '#6366f1' : '#d1d5db'}`,
                        borderRadius: '6px',
                        background: length === l ? '#eef2ff' : 'white',
                        color: length === l ? '#4f46e5' : '#6b7280',
                        cursor: 'pointer',
                        fontWeight: length === l ? 600 : 400,
                      }}
                    >
                      {LENGTH_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !input.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 20px',
              background: loading || !input.trim() ? '#d1d5db' : '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '생성 중...' : `✨ ${currentConfig.label} 시작`}
          </button>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#dc2626',
              }}
            >
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {/* Result header */}
              <div
                style={{
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: '#16a34a', fontSize: '13px' }}>✓</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#15803d' }}>AI 생성 완료</span>
                {result.title && (
                  <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>— {result.title}</span>
                )}
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb',
                }}
              >
                {(['preview', 'html'] as ResultTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setResultTab(tab)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: resultTab === tab ? 600 : 400,
                      color: resultTab === tab ? '#4f46e5' : '#6b7280',
                      background: 'none',
                      border: 'none',
                      borderBottom: resultTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                      cursor: 'pointer',
                      marginBottom: '-1px',
                    }}
                  >
                    {tab === 'preview' ? '미리보기' : 'HTML'}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {resultTab === 'preview' ? (
                <div
                  style={{
                    padding: '14px',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    maxHeight: '240px',
                    overflowY: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: result.html }}
                />
              ) : (
                <pre
                  style={{
                    margin: 0,
                    padding: '14px',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    maxHeight: '240px',
                    overflowY: 'auto',
                    background: '#1e1e2e',
                    color: '#cdd6f4',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                  }}
                >
                  {result.html}
                </pre>
              )}

              {/* Summary */}
              {result.summary && (
                <div
                  style={{
                    padding: '8px 14px',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '12px',
                    color: '#6b7280',
                  }}
                >
                  {result.summary}
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, textAlign: 'center' }}>
            AI가 생성한 내용은 참고용입니다. 반드시 검토 후 사용하세요.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            취소
          </button>
          {result && (
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: copied ? '#f0fdf4' : 'white',
                fontSize: '14px',
                cursor: 'pointer',
                color: copied ? '#16a34a' : '#374151',
                fontWeight: copied ? 600 : 400,
              }}
            >
              {copied ? '복사됨 ✓' : '복사'}
            </button>
          )}
          <button
            type="button"
            onClick={handleInsert}
            disabled={!result}
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '6px',
              background: result ? '#4f46e5' : '#d1d5db',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: result ? 'pointer' : 'not-allowed',
            }}
          >
            에디터에 삽입
          </button>
        </div>
      </div>
    </>
  );
}

export default AiContentModal;
