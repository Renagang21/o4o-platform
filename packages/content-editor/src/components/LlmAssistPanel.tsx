/**
 * LlmAssistPanel — 공용 "LLM으로 작업하기" 보조 패널
 *
 * WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1 §4.4 / §5-E
 *
 * 사용자가 ChatGPT·Claude·Gemini 등 **어떤 LLM이든** 자기 계정으로 사용하고,
 * 결과 HTML 을 O4O 편집기에 붙여 넣는 흐름만 돕는다.
 *
 * 제공 기능(4가지):
 *   1) 현재 편집 중인 내용 복사
 *   2) 참고자료·작업 안내(요청문) 복사
 *   3) 결과 HTML 붙여넣기 안내(+ 붙여넣기 입력창 — onApplyHtml 주입 시)
 *   4) HTML 이 깨졌을 때 수정 요청문 복사
 *
 * 하지 않는 것(§7):
 *   - LLM API 호출 / 계정 연동 / 프롬프트·대화 저장
 *   - 모델·서비스 지정(특정 서비스 강제 없음. 안내 문구에서 예시만 든다)
 *   - sanitize 기준 변경 — 붙여넣은 HTML 은 기존 편집기 저장 경로의 sanitize 를 그대로 통과한다.
 *
 * 스타일: 소비처(tailwind 유무)에 의존하지 않도록 inline style 로만 작성한다
 *        (AiContentModal 과 동일한 방침).
 */

import { useState } from 'react';

export interface LlmAssistPanelProps {
  /** 버튼 라벨 / 모달 제목. 미지정 시 'LLM으로 작업하기'. */
  label?: string;
  /** 어떤 콘텐츠를 만드는 작업인지 한 줄 설명(모달 상단 안내). */
  contextLabel?: string;
  /** 참고자료·작업 안내(요청문). LLM 대화창에 붙여 넣을 본문. */
  guideText: string;
  /** 현재 편집 중인 내용(HTML). 있으면 "현재 내용 복사" 노출. */
  currentHtml?: string;
  /**
   * 결과 HTML 적용. 주입 시 붙여넣기 입력창 + "편집기에 넣기" 노출.
   * 미주입 시 붙여넣기 **안내만** 표시한다(편집기 HTML 탭 사용).
   */
  onApplyHtml?: (html: string) => void;
  /** 복사 실패 등 사용자 알림(미주입 시 패널 내부 문구로만 표시). */
  onNotify?: (message: string, kind: 'success' | 'error') => void;
  /** 트리거 버튼을 숨기고 항상 열린 패널로 쓰고 싶을 때. */
  defaultOpen?: boolean;
}

const HTML_FIX_PROMPT_HEAD = `아래 HTML 이 편집기에서 깨져 보입니다. 구조만 고쳐서 다시 주세요.

조건:
- 내용(문장·의미)은 바꾸지 말고 태그 구조만 바로잡아 주세요.
- 열고 닫는 태그를 맞추고, 중첩이 잘못된 부분을 정리해 주세요.
- 사용할 태그: p, h2, h3, strong, em, ul, ol, li, br, a, table, img 정도.
- 꾸미기는 태그 안 style 속성(인라인 CSS)으로만 해 주세요.
- script, 외부 CSS 파일, 외부 폰트, 외부 스크립트는 넣지 마세요(자동 제거됩니다).
- 설명 없이 HTML 만 주세요.

[HTML]
`;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  minHeight: '36px',
  padding: '7px 12px',
  fontSize: '12px',
  fontWeight: 600,
  borderRadius: '8px',
  cursor: 'pointer',
  lineHeight: 1.3,
};

export function LlmAssistPanel({
  label = 'LLM으로 작업하기',
  contextLabel,
  guideText,
  currentHtml,
  onApplyHtml,
  onNotify,
  defaultOpen = false,
}: LlmAssistPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState<'guide' | 'current' | 'fix' | null>(null);
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const notify = (msg: string, kind: 'success' | 'error') => {
    if (onNotify) onNotify(msg, kind);
    else {
      setMessage(msg);
      setTimeout(() => setMessage(null), 2500);
    }
  };

  const handleCopy = async (kind: 'guide' | 'current' | 'fix') => {
    const text =
      kind === 'guide' ? guideText
      : kind === 'current' ? (currentHtml ?? '')
      : `${HTML_FIX_PROMPT_HEAD}${currentHtml ?? ''}`;
    if (!text.trim()) {
      notify('복사할 내용이 없습니다.', 'error');
      return;
    }
    const ok = await copyText(text);
    if (!ok) {
      notify('복사하지 못했습니다. 아래 내용을 직접 선택해 복사해 주세요.', 'error');
      return;
    }
    setCopied(kind);
    setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2000);
  };

  const handleApply = () => {
    if (!onApplyHtml) return;
    const html = pasted.trim();
    if (!html) {
      notify('붙여 넣은 내용이 없습니다.', 'error');
      return;
    }
    onApplyHtml(html);
    setPasted('');
    notify('편집기에 넣었습니다. 내용을 확인한 뒤 저장해 주세요.', 'success');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...btnBase, color: '#4338ca', background: 'white', border: '1px solid #c7d2fe' }}
      >
        <span aria-hidden>✨</span> {label}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          role="presentation"
          style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>✨ {label}</div>
                {contextLabel && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{contextLabel}</div>}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기"
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                <li>아래 <b>작업 안내 복사</b>(필요하면 <b>현재 내용 복사</b>도)를 누릅니다.</li>
                <li>평소 쓰시는 LLM(ChatGPT·Claude·Gemini 등) 대화창에 붙여 넣고 원하는 대로 요청합니다.</li>
                <li>결과 HTML 을 복사해 {onApplyHtml ? '아래 붙여넣기 칸' : '편집기의 HTML 탭'}에 붙여 넣습니다.</li>
                <li>편집기에서 내용을 확인·수정한 뒤 저장합니다.</li>
              </ol>

              {/* 1·2·4) 복사 액션 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button type="button" onClick={() => handleCopy('guide')}
                  style={{ ...btnBase, color: 'white', background: '#4f46e5', border: '1px solid #4f46e5' }}>
                  {copied === 'guide' ? '✓ 복사됨' : '작업 안내 복사'}
                </button>
                {typeof currentHtml === 'string' && (
                  <>
                    <button type="button" onClick={() => handleCopy('current')}
                      style={{ ...btnBase, color: '#374151', background: 'white', border: '1px solid #d1d5db' }}>
                      {copied === 'current' ? '✓ 복사됨' : '현재 내용 복사'}
                    </button>
                    <button type="button" onClick={() => handleCopy('fix')}
                      style={{ ...btnBase, color: '#374151', background: 'white', border: '1px solid #d1d5db' }}>
                      {copied === 'fix' ? '✓ 복사됨' : 'HTML 오류 수정 요청문 복사'}
                    </button>
                  </>
                )}
              </div>

              {message && (
                <div style={{ fontSize: '12px', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 10px' }}>
                  {message}
                </div>
              )}

              {/* 3) 결과 붙여넣기 */}
              {onApplyHtml ? (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>결과 HTML 붙여넣기</div>
                  <textarea
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    rows={6}
                    placeholder="LLM 이 만들어 준 HTML 을 여기에 붙여 넣고 아래 버튼을 누르세요."
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button type="button" onClick={handleApply} disabled={!pasted.trim()}
                      style={{ ...btnBase, color: 'white', background: pasted.trim() ? '#4f46e5' : '#d1d5db', border: 'none', cursor: pasted.trim() ? 'pointer' : 'not-allowed' }}>
                      편집기에 넣기
                    </button>
                    <button type="button" onClick={() => setPasted('')}
                      style={{ ...btnBase, color: '#6b7280', background: 'white', border: '1px solid #d1d5db' }}>
                      지우기
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0', lineHeight: 1.6 }}>
                    넣은 내용은 편집기에서 그대로 수정할 수 있습니다. 저장 시 안전 규칙에 따라 script·외부 CSS·외부 스크립트는 자동으로 제거되고,
                    영상은 YouTube·Vimeo 만 표시됩니다.
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#4b5563', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.7 }}>
                  결과 HTML 은 편집기의 <b>HTML 탭</b>에 붙여 넣으세요. 저장 시 script·외부 CSS·외부 스크립트는 안전을 위해 자동으로 제거되고,
                  영상은 YouTube·Vimeo 만 표시됩니다.
                </div>
              )}

              <div style={{ fontSize: '11px', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.7 }}>
                <b>확인해 주세요.</b> LLM 이 쓴 내용은 사실과 다를 수 있습니다. 게시 전에 담당자가 직접 확인해 주세요.
                의약품·건강 관련 내용은 질병을 치료·예방한다고 단정하지 않습니다.
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>작업 안내 전문</div>
                <pre style={{ fontSize: '11px', color: '#374151', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '220px', overflowY: 'auto', margin: 0 }}>
                  {guideText}
                </pre>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setOpen(false)}
                style={{ ...btnBase, color: '#4b5563', background: 'white', border: '1px solid #d1d5db' }}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
