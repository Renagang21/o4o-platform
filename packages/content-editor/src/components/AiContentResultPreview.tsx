/** Pure preview and usage warning view. Modal owns request/save/insert lifetimes. */
import { sanitizeHtml } from '../sanitize';
import type { AiContentResult } from './ai-content-generation-state';
type ResultTab = 'preview' | 'html';
export function AiContentResultPreview({
  result,
  resultTab,
  showUsageSnippets,
  sourceUrl,
  onResultTab,
  onToggleUsageSnippets,
}: {
  result: AiContentResult | null;
  resultTab: ResultTab;
  showUsageSnippets: boolean;
  sourceUrl?: string;
  onResultTab(tab: ResultTab): void;
  onToggleUsageSnippets(): void;
}) {
  return (
    <>
      {' '}
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
            <span
              style={{ fontSize: '13px', fontWeight: 500, color: '#15803d' }}
            >
              AI 생성 완료
            </span>
            {result.title && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginLeft: '4px',
                }}
              >
                — {result.title}
              </span>
            )}
          </div>

          {/* WO-O4O-AI-USAGE-CONDITION-DETECTION-UX-V1: 원문 이용조건 안내 카드 */}
          {result.usageWarning?.detected && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fffbeb',
                borderBottom: '1px solid #fde68a',
                fontSize: '12px',
                color: '#92400e',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>⚠ 원문 이용조건 안내</span>
                  <span
                    style={{
                      marginLeft: '6px',
                      fontWeight: 400,
                      color: '#b45309',
                    }}
                  >
                    원문에서 저작권 또는 콘텐츠 이용 관련 표현이 감지되었습니다.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleUsageSnippets}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#b45309',
                    whiteSpace: 'nowrap',
                    padding: 0,
                  }}
                >
                  {showUsageSnippets ? '접기' : '감지된 표현 보기'}
                </button>
              </div>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
                {result.usageWarning.categories.map((cat) => (
                  <li key={cat}>{cat}</li>
                ))}
              </ul>
              {showUsageSnippets && result.usageWarning.snippets.length > 0 && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '6px 8px',
                    background: '#fef3c7',
                    borderRadius: '4px',
                  }}
                >
                  {result.usageWarning.snippets.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: '#78350f',
                      }}
                    >
                      "{s}"
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '6px', color: '#b45309' }}>
                최종 활용 전 원문 이용조건을 확인하세요.
                {sourceUrl && (
                  <>
                    {' '}
                    &nbsp;
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#92400e', textDecoration: 'underline' }}
                    >
                      원문 보기
                    </a>
                  </>
                )}
              </div>
            </div>
          )}

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
                onClick={() => onResultTab(tab)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: resultTab === tab ? 600 : 400,
                  color: resultTab === tab ? '#4f46e5' : '#6b7280',
                  background: 'none',
                  border: 'none',
                  borderBottom:
                    resultTab === tab
                      ? '2px solid #4f46e5'
                      : '2px solid transparent',
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
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(result.html || ''),
              }}
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
    </>
  );
}
