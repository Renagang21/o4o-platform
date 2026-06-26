/**
 * ContentCreationGuideModal — 콘텐츠 제작 가이드 (안내 UI, 공통)
 *
 * WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATION-GUIDE-MODAL-V1 (mode='store')
 * WO-O4O-KPA-OPERATOR-DOCS-CONTENT-CREATION-GUIDE-MODAL-V1 (mode='operator')
 *
 * AI 도구(ChatGPT/Gemini)로 만든 글을 O4O 편집기 HTML 탭에 붙여 넣어 콘텐츠로 활용하는 방법을 안내한다.
 *   - mode='store'   : 내 매장에서 편집해 QR · PDF · POP · 블로그 제작에 활용
 *   - mode='operator': 여러 매장이 가져가 활용할 운영자 원본 콘텐츠 제작
 *
 * 정책: 안내 UI 전용. 콘텐츠 저장 구조/QR target/PDF 생성/편집기 동작 변경 없음. 체크리스트·사이니지 미포함.
 * 반응형: PC max-width 720px, 태블릿/모바일 화면폭 맞춤(내부 스크롤). AI 요청 예시 박스는 pre-wrap/overflow-wrap.
 */

import { useEffect, useState } from 'react';
import { X, Copy, Check, Sparkles } from 'lucide-react';

export type GuideMode = 'store' | 'operator';

interface GuideStep {
  title: string;
  desc: string;
}
interface GuideContent {
  subtitle: string;
  flow: GuideStep[];
  /** mode='operator' 전용 — 운영자 콘텐츠 작성 기준 등 추가 섹션 */
  extraSections: { title: string; paras: string[] }[];
  imageParas: string[];
  prompt: string;
  footer: string;
}

const STORE_PROMPT = `아래 내용을 약국 고객에게 보여줄 콘텐츠로 정리하고, 보기 좋게 디자인을 입힌 HTML로 만들어 주세요.

O4O 편집기의 HTML 탭에 붙여 넣을 수 있는 형태로 만들어 주세요.
제목 강조, 색상, 배경, 여백, 카드 박스 같은 디자인은 태그 안의 style 속성(인라인 CSS)으로 적용해 주세요.
script, iframe, 외부 CSS 파일, 외부 폰트, 외부 스크립트는 사용하지 마세요.
모바일과 PDF 출력에서도 읽기 좋게 만들어 주세요.
이미지가 필요한 곳은 [이미지 삽입 위치]라고 표시해 주세요.

주제:
대상 고객:
핵심 내용:
피해야 할 표현:
원하는 길이:`;

const OPERATOR_PROMPT = `아래 내용을 약국 고객에게 안내할 운영자 콘텐츠로 정리해 주세요.

이 콘텐츠는 여러 매장이 가져가서 QR, PDF, POP, 블로그 제작에 다시 활용할 원본입니다.

O4O 편집기의 HTML 탭에 붙여 넣을 수 있도록, 내용에 디자인을 입힌 HTML로 만들어 주세요.
색상, 배경, 여백, 카드형 구성을 적절히 사용해 읽기 좋게 정리해 주세요.
디자인은 inline style 중심으로 넣어 주세요.

script, iframe, 외부 CSS, 외부 폰트, 외부 스크립트는 사용하지 마세요.
h1, h2, h3, p, ul, li, strong, div, section 정도만 사용해 주세요.
모바일과 PDF 출력에서도 읽기 좋게 만들어 주세요.
이미지가 필요한 곳은 [이미지 삽입 위치]라고 표시해 주세요.

주제:
대상 고객:
핵심 메시지:
활용 목적:
피해야 할 표현:
원하는 길이:`;

const CONTENT: Record<GuideMode, GuideContent> = {
  store: {
    subtitle: 'ChatGPT, Gemini 같은 AI 도구로 만든 글을 O4O 콘텐츠로 활용할 수 있습니다.',
    flow: [
      { title: 'AI와 대화하며 내용을 정리하세요.', desc: '제품명, 대상 고객, 핵심 장점, 주의할 표현을 알려주면 더 좋은 글을 만들 수 있습니다.' },
      { title: 'AI에게 디자인을 입힌 HTML로 만들어 달라고 요청하세요.', desc: '“내용에 보기 좋은 디자인을 입혀서, O4O 편집기의 HTML 탭에 붙여 넣을 수 있는 HTML로 만들어 주세요”라고 요청하면 됩니다. 색상·배경·여백 같은 디자인은 인라인 style 로 넣어 달라고 하면 좋습니다.' },
      { title: '결과를 O4O 편집기에 붙여 넣으세요.', desc: '편집기의 HTML 탭을 열고 AI가 만든 HTML을 붙여 넣은 뒤 미리보기로 확인합니다.' },
    ],
    extraSections: [],
    imageParas: [
      '이미지는 PC에 있는 파일 경로를 그대로 붙여 넣으면 QR이나 PDF에서 보이지 않을 수 있습니다.',
      '이미지를 사용할 때는 O4O에 업로드한 이미지 URL이나 안정적으로 접근 가능한 이미지 URL을 사용하세요.',
      '다국어 콘텐츠로 활용할 수 있도록, 가능하면 글자가 들어간 이미지는 피하고 글자는 편집기에서 입력하는 것이 좋습니다.',
    ],
    prompt: STORE_PROMPT,
    footer: 'HTML을 붙여 넣은 뒤에는 일반 편집 화면에서 문구를 다시 수정할 수 있습니다. 완성된 콘텐츠는 QR, PDF, POP, 블로그 제작에 활용할 수 있습니다.',
  },
  operator: {
    subtitle: 'AI 도구로 만든 글을 O4O 운영자 콘텐츠로 정리하고, 매장에서 다시 활용할 수 있게 만들 수 있습니다.',
    flow: [
      { title: 'AI와 대화하며 내용을 정리하세요.', desc: '주제, 대상 고객, 핵심 메시지, 활용 목적, 피해야 할 표현을 알려주면 더 좋은 콘텐츠를 만들 수 있습니다.' },
      { title: '매장에서 다시 활용하기 쉬운 구조로 만드세요.', desc: '제목, 요약, 핵심 설명, 추천 대상, 상담 안내처럼 구역을 나누면 QR, PDF, POP, 블로그 제작에 다시 활용하기 쉽습니다.' },
      { title: 'AI에게 내용에 디자인을 입힌 HTML로 정리해 달라고 요청하세요.', desc: '“O4O 편집기의 HTML 탭에 붙여 넣을 수 있도록, 내용에 디자인을 입힌 HTML로 만들어 주세요”라고 요청하면 됩니다.' },
      { title: 'O4O 편집기에 붙여 넣고 미리보기로 확인하세요.', desc: 'HTML 탭에 붙여 넣은 뒤 화면 보기, 모바일 보기, PDF 출력까지 고려해 문구와 여백을 조정합니다.' },
    ],
    extraSections: [
      {
        title: '운영자 콘텐츠 작성 기준',
        paras: [
          '운영자 콘텐츠는 여러 매장이 가져가서 수정·활용할 수 있는 원본입니다.',
          '특정 매장명, 전화번호, 지역명처럼 한 매장에만 해당하는 내용은 가능하면 넣지 않는 것이 좋습니다.',
          '제품이나 주제의 핵심 설명은 분명하게 쓰고, 매장별 상담 문구나 행사 문구는 각 매장에서 수정할 수 있도록 여지를 남겨 주세요.',
        ],
      },
    ],
    imageParas: [
      '이미지는 PC에 있는 파일 경로를 그대로 붙여 넣으면 매장 화면, QR, PDF에서 보이지 않을 수 있습니다.',
      '이미지를 사용할 때는 O4O에 업로드한 이미지 URL이나 안정적으로 접근 가능한 이미지 URL을 사용하세요.',
      '여러 매장이 다시 활용할 콘텐츠라면, 가능하면 글자가 들어간 이미지는 피하는 것이 좋습니다. 다국어 변환이나 문구 수정이 필요할 때 이미지를 다시 만들어야 하기 때문입니다.',
      '제품 사진, 설명 그림, 배경 이미지는 글자 없이 사용하고, 문구는 O4O 편집기에서 입력하는 방식이 더 안전합니다.',
    ],
    prompt: OPERATOR_PROMPT,
    footer: '완성된 운영자 콘텐츠는 매장 자료함에서 가져가 편집한 뒤 QR, PDF, POP, 블로그 제작에 활용할 수 있습니다.',
  },
};

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
.ccg-section:last-child { margin-bottom: 0; }
.ccg-section-title { font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px; }
.ccg-step { font-size: 13px; color: #334155; line-height: 1.6; margin: 0 0 10px; padding-left: 26px; position: relative; }
.ccg-step:last-child { margin-bottom: 0; }
.ccg-step-num { position: absolute; left: 0; top: 0; width: 18px; height: 18px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
.ccg-step strong { color: #0f172a; }
.ccg-step span { display: block; color: #64748b; margin-top: 2px; }
.ccg-note { font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 8px; }
.ccg-note:last-child { margin-bottom: 0; }
.ccg-prompt-wrap { position: relative; }
.ccg-prompt {
  white-space: pre-wrap; word-break: keep-all; overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px; line-height: 1.5; color: #1e293b;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 12px; margin: 0;
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

export function ContentCreationGuideModal({
  open,
  onClose,
  mode = 'store',
}: {
  open: boolean;
  onClose: () => void;
  mode?: GuideMode;
}) {
  const [copied, setCopied] = useState(false);
  const content = CONTENT[mode] ?? CONTENT.store;

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
      await navigator.clipboard.writeText(content.prompt);
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
          <p className="ccg-subtitle">{content.subtitle}</p>

          {/* 제작 흐름 */}
          <div className="ccg-section">
            <p className="ccg-section-title">기본 제작 흐름</p>
            {content.flow.map((s, i) => (
              <p className="ccg-step" key={i}>
                <span className="ccg-step-num">{i + 1}</span>
                <strong>{s.title}</strong>
                <span>{s.desc}</span>
              </p>
            ))}
          </div>

          {/* 추가 섹션(운영자 작성 기준 등) */}
          {content.extraSections.map((sec, i) => (
            <div className="ccg-section" key={i}>
              <p className="ccg-section-title">{sec.title}</p>
              {sec.paras.map((p, j) => (
                <p className="ccg-note" key={j}>{p}</p>
              ))}
            </div>
          ))}

          {/* 이미지 사용 안내 */}
          <div className="ccg-section">
            <p className="ccg-section-title">이미지를 사용할 때</p>
            {content.imageParas.map((p, i) => (
              <p className="ccg-note" key={i}>{p}</p>
            ))}
          </div>

          {/* AI 요청 예시 */}
          <div className="ccg-section">
            <p className="ccg-section-title">AI에게 요청할 문장 예시</p>
            <div className="ccg-prompt-wrap">
              <pre className="ccg-prompt">{content.prompt}</pre>
              <button type="button" className="ccg-copy" onClick={handleCopy}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '복사됨' : '요청문 복사'}
              </button>
            </div>
          </div>
        </div>

        <div className="ccg-footer">
          <p className="ccg-footer-note">{content.footer}</p>
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
