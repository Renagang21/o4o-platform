/**
 * ContentCreationGuideModal — 콘텐츠 제작 가이드 (안내 UI)
 *
 * WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1
 *
 * /store/library/contents 상단 [콘텐츠 제작 가이드] 버튼 → 본 모달.
 * AI 도구(ChatGPT/Gemini)로 만든 글을 O4O 편집기 HTML 탭에 붙여 넣어 콘텐츠로 활용하는 방법을 안내한다.
 *
 * 정책: 안내 UI 전용. 콘텐츠 저장 구조/QR target/PDF 생성/편집기 동작 변경 없음. 체크리스트·사이니지 미포함.
 * 반응형: PC max-width 720px, 태블릿/모바일 화면폭 맞춤(내부 스크롤). AI 요청 예시 박스는 pre-wrap/overflow-wrap.
 */

import { useEffect, useState } from 'react';
import { X, Copy, Check, Sparkles } from 'lucide-react';

const AI_PROMPT_EXAMPLE = `아래 내용을 약국 고객에게 안내할 콘텐츠로 정리해 주세요.

O4O 편집기의 HTML 탭에 붙여 넣을 수 있는 안전한 HTML로 만들어 주세요.
script, iframe, 외부 CSS, 외부 폰트는 사용하지 마세요.
h1, h2, h3, p, ul, li, strong, div, section 정도만 사용해 주세요.
모바일과 PDF 출력에서도 읽기 좋게 만들어 주세요.
이미지가 필요한 곳은 [이미지 삽입 위치]라고 표시해 주세요.

주제:
대상 고객:
핵심 내용:
피해야 할 표현:
원하는 길이:`;

const STYLE_ID = 'ccg-modal-style';
const CSS = `
.ccg-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.ccg-modal {
  width: min(720px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  background: #fff; border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  display: flex; flex-direction: column; overflow: hidden;
}
.ccg-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
}
.ccg-title { display: inline-flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; }
.ccg-close { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: none; background: transparent; color: #64748b; cursor: pointer; border-radius: 6px; }
.ccg-close:hover { background: #f1f5f9; }
.ccg-body { padding: 18px; overflow-y: auto; }
.ccg-subtitle { font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 18px; }
.ccg-section { margin: 0 0 18px; }
.ccg-section-title { font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px; }
.ccg-step { font-size: 13px; color: #334155; line-height: 1.6; margin: 0 0 10px; padding-left: 26px; position: relative; }
.ccg-step:last-child { margin-bottom: 0; }
.ccg-step-num { position: absolute; left: 0; top: 0; width: 18px; height: 18px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.ccg-step strong { color: #0f172a; }
.ccg-step span { display: block; color: #64748b; margin-top: 2px; }
.ccg-note { font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 8px; }
.ccg-prompt-wrap { position: relative; }
.ccg-prompt {
  white-space: pre-wrap; word-break: keep-all; overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px; line-height: 1.5; color: #1e293b;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 12px 12px 12px; margin: 0;
}
.ccg-copy { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; padding: 6px 12px; font-size: 12px; font-weight: 500; color: #2563eb; background: #fff; border: 1px solid #bfdbfe; border-radius: 6px; cursor: pointer; }
.ccg-copy:hover { background: #eff6ff; }
.ccg-footer { padding: 14px 18px; border-top: 1px solid #e2e8f0; flex-shrink: 0; }
.ccg-footer-note { font-size: 12px; color: #64748b; line-height: 1.6; margin: 0 0 12px; }
.ccg-actions { display: flex; justify-content: flex-end; gap: 8px; }
.ccg-done { padding: 8px 18px; font-size: 13px; font-weight: 500; color: #fff; background: #2563eb; border: none; border-radius: 6px; cursor: pointer; }
@media (max-width: 640px) {
  .ccg-modal { width: calc(100vw - 24px); max-height: calc(100vh - 24px); }
  .ccg-actions { flex-direction: column; align-items: stretch; }
  .ccg-actions button { width: 100%; }
}
`;

export function ContentCreationGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  // <style> 1회 주입
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    setCopied(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT_EXAMPLE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="ccg-overlay" role="dialog" aria-modal="true" aria-label="콘텐츠 제작 가이드" onClick={onClose}>
      <div className="ccg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ccg-header">
          <h2 className="ccg-title">
            <Sparkles size={18} style={{ color: '#2563eb' }} />
            콘텐츠 제작 가이드
          </h2>
          <button type="button" className="ccg-close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="ccg-body">
          <p className="ccg-subtitle">
            ChatGPT, Gemini 같은 AI 도구로 만든 글을 O4O 콘텐츠로 활용할 수 있습니다.
          </p>

          {/* 1. 제작 흐름 */}
          <div className="ccg-section">
            <p className="ccg-section-title">기본 제작 흐름</p>
            <p className="ccg-step">
              <span className="ccg-step-num">1</span>
              <strong>AI와 대화하며 내용을 정리하세요.</strong>
              <span>제품명, 대상 고객, 핵심 장점, 주의할 표현을 알려주면 더 좋은 글을 만들 수 있습니다.</span>
            </p>
            <p className="ccg-step">
              <span className="ccg-step-num">2</span>
              <strong>AI에게 HTML로 정리해 달라고 요청하세요.</strong>
              <span>“O4O 편집기의 HTML 탭에 붙여 넣을 수 있는 안전한 HTML로 만들어 주세요”라고 요청하면 됩니다.</span>
            </p>
            <p className="ccg-step">
              <span className="ccg-step-num">3</span>
              <strong>결과를 O4O 편집기에 붙여 넣으세요.</strong>
              <span>편집기의 HTML 탭을 열고 AI가 만든 HTML을 붙여 넣은 뒤 미리보기로 확인합니다.</span>
            </p>
          </div>

          {/* 2. 이미지 사용 안내 */}
          <div className="ccg-section">
            <p className="ccg-section-title">이미지를 사용할 때</p>
            <p className="ccg-note">
              이미지는 PC에 있는 파일 경로를 그대로 붙여 넣으면 QR이나 PDF에서 보이지 않을 수 있습니다.
            </p>
            <p className="ccg-note">
              이미지를 사용할 때는 O4O에 업로드한 이미지 URL이나 안정적으로 접근 가능한 이미지 URL을 사용하세요.
            </p>
            <p className="ccg-note" style={{ margin: 0 }}>
              다국어 콘텐츠로 활용할 수 있도록, 가능하면 글자가 들어간 이미지는 피하고 글자는 편집기에서 입력하는 것이 좋습니다.
            </p>
          </div>

          {/* 3. AI 요청 예시 */}
          <div className="ccg-section" style={{ marginBottom: 0 }}>
            <p className="ccg-section-title">AI에게 요청할 문장 예시</p>
            <div className="ccg-prompt-wrap">
              <pre className="ccg-prompt">{AI_PROMPT_EXAMPLE}</pre>
              <button type="button" className="ccg-copy" onClick={handleCopy}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '복사됨' : '요청문 복사'}
              </button>
            </div>
          </div>
        </div>

        <div className="ccg-footer">
          <p className="ccg-footer-note">
            HTML을 붙여 넣은 뒤에는 일반 편집 화면에서 문구를 다시 수정할 수 있습니다.
            완성된 콘텐츠는 QR, PDF, POP, 블로그 제작에 활용할 수 있습니다.
          </p>
          <div className="ccg-actions">
            <button type="button" className="ccg-done" onClick={onClose}>
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
