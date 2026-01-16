/**
 * ContentPreview Component
 * 콘텐츠 미리보기
 */

interface ContentPreviewProps {
  /** HTML 콘텐츠 */
  html: string;
  /** 미리보기 제목 */
  title?: string;
  /** 클래스명 */
  className?: string;
}

export function ContentPreview({ html, title, className = '' }: ContentPreviewProps) {
  return (
    <div
      className={`content-preview ${className}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'white',
      }}
    >
      {title && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f9fafb',
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
          }}
        >
          {title}
        </div>
      )}
      <div
        className="preview-content"
        style={{
          padding: '16px',
          minHeight: '200px',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{previewStyles}</style>
    </div>
  );
}

const previewStyles = `
  .content-preview .preview-content {
    line-height: 1.6;
    color: #1f2937;
  }

  .content-preview .preview-content p {
    margin: 0 0 0.75em 0;
  }

  .content-preview .preview-content h1 {
    font-size: 2em;
    font-weight: 700;
    margin: 1em 0 0.5em 0;
    line-height: 1.3;
  }

  .content-preview .preview-content h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin: 1em 0 0.5em 0;
    line-height: 1.3;
  }

  .content-preview .preview-content h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin: 1em 0 0.5em 0;
    line-height: 1.3;
  }

  .content-preview .preview-content ul,
  .content-preview .preview-content ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  .content-preview .preview-content li {
    margin: 0.25em 0;
  }

  .content-preview .preview-content blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 1em;
    margin: 1em 0;
    color: #6b7280;
    font-style: italic;
  }

  .content-preview .preview-content pre {
    background: #1f2937;
    color: #e5e7eb;
    padding: 1em;
    border-radius: 8px;
    overflow-x: auto;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.9em;
    margin: 1em 0;
  }

  .content-preview .preview-content code {
    background: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.9em;
  }

  .content-preview .preview-content pre code {
    background: none;
    padding: 0;
  }

  .content-preview .preview-content hr {
    border: none;
    border-top: 2px solid #e5e7eb;
    margin: 1.5em 0;
  }

  .content-preview .preview-content a {
    color: #2563eb;
    text-decoration: underline;
  }

  .content-preview .preview-content img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1em 0;
    display: block;
  }

  .content-preview .preview-content iframe {
    width: 100%;
    max-width: 640px;
    aspect-ratio: 16 / 9;
    margin: 1em 0;
    border-radius: 8px;
    border: none;
  }

  .content-preview .preview-content mark {
    background-color: #fef08a;
    padding: 0.1em 0.2em;
    border-radius: 2px;
  }
`;

export default ContentPreview;
