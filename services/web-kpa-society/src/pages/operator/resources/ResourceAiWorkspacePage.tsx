/**
 * ResourceAiWorkspacePage — AI 입력 작업공간
 * WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1
 *
 * 작업바구니에서 전달받은 자료 + 사용자 지침 → 포맷 조합 → 복사
 * 내부 AI 호출 없음. 외부 LLM 사용 전제.
 */

import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Copy, Check, ShoppingBasket } from 'lucide-react';
import { type WorkItem } from '../../../contexts/WorkBasketContext';
import { toast } from '@o4o/error-handling';

interface LocationState {
  items?: WorkItem[];
}

/**
 * WO 명세 AI 전달 포맷
 * [자료 N]
 * 제목: ...
 * 역할: ...
 * 내용: ...
 * 파일: ...
 * 링크: ...
 * 메모: ...
 */
function buildAiInput(items: WorkItem[], instruction: string): string {
  const parts = items.map((item, idx) => {
    const lines: string[] = [`[자료 ${idx + 1}]`];
    lines.push(`제목: ${item.title}`);
    if (item.role) lines.push(`역할: ${item.role}`);
    if (item.content) lines.push(`내용: ${item.content}`);
    if (item.file_url) lines.push(`파일: ${item.file_url}`);
    if (item.external_url) lines.push(`링크: ${item.external_url}`);
    if (item.memo) lines.push(`메모: ${item.memo}`);
    return lines.join('\n');
  });

  const resourcesBlock = parts.join('\n\n');
  const instructionBlock = instruction.trim()
    ? `---\n사용자 요청:\n${instruction.trim()}`
    : `---\n사용자 요청:\n(지침을 입력하세요)`;

  return `${resourcesBlock}\n\n${instructionBlock}`;
}

export default function ResourceAiWorkspacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const items: WorkItem[] = state?.items || [];

  const [instruction, setInstruction] = useState('');
  const [copied, setCopied] = useState(false);

  const aiInput = useMemo(() => buildAiInput(items, instruction), [items, instruction]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(aiInput);
      setCopied(true);
      toast.success('클립보드에 복사되었습니다');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('복사 실패 — 직접 선택하여 복사하세요');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/operator/resources/basket')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>AI 작업공간</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            자료와 지침을 조합하여 외부 AI에 전달할 텍스트를 생성합니다
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <ShoppingBasket size={40} style={{ margin: '0 auto 12px', display: 'block', color: '#d1d5db' }} />
          <p style={{ margin: 0 }}>작업바구니에 자료가 없습니다</p>
          <button
            onClick={() => navigate('/operator/resources/basket')}
            style={{
              marginTop: 16, padding: '8px 20px', borderRadius: 8,
              background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            바구니로 이동
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: 전달된 자료 + 지침 입력 */}
          <div>
            {/* 자료 요약 */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 12px' }}>
                전달된 자료 ({items.length}개)
              </h2>
              {items.map((item, idx) => (
                <div key={item.id} style={{
                  padding: '10px 12px', background: '#f9fafb', borderRadius: 8,
                  marginBottom: idx < items.length - 1 ? 8 : 0,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                    {idx + 1}. {item.title}
                  </div>
                  {item.role && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>역할: {item.role}</div>
                  )}
                </div>
              ))}
            </div>

            {/* 지침 입력 */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                사용자 지침 입력
              </label>
              <textarea
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder="AI에게 전달할 지침을 입력하세요&#10;예: 위 자료를 바탕으로 약국 고객을 위한 우루사 복약 안내문을 작성해주세요"
                rows={8}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 14, resize: 'vertical',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Right: 조합된 AI 입력 텍스트 */}
          <div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, height: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>AI 전달 텍스트</h2>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 7,
                    background: copied ? '#16a34a' : '#7c3aed', color: '#fff',
                    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    transition: 'background 0.2s',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? '복사됨' : '전체 복사'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 10px' }}>
                이 텍스트를 복사하여 ChatGPT, Claude, Gemini 등 외부 AI에 붙여넣으세요
              </p>
              <pre
                id="ai_input"
                style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: 14,
                  fontSize: 13, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  maxHeight: 520, overflowY: 'auto',
                  margin: 0,
                  color: '#1e293b',
                }}
              >
                {aiInput}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
