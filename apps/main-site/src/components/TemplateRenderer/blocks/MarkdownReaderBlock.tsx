import React, { useEffect, useState } from 'react';

interface MarkdownReaderBlockProps {
  attributes: {
    mediaUrl?: string;
    fontSize?: number;
    containerWidth?: 'wide' | 'full' | 'narrow' | 'medium';
    theme?: 'github' | 'minimal' | 'dark';
    markdownContent?: string;
  };
}

// Simple markdown parser (same as in the block)
const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const parseMarkdown = (markdown: string): string => {
  if (!markdown) return '';

  let html = markdown;

  // Preserve code blocks first
  const codeBlocks: string[] = [];
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const index = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return `__CODE_BLOCK_${index}__`;
  });

  // Preserve inline code
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const index = inlineCodes.length;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `__INLINE_CODE_${index}__`;
  });

  // Escape HTML in the remaining text
  html = escapeHtml(html);

  // Headers (H1-H6)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr />');
  html = html.replace(/^\*\*\*+$/gm, '<hr />');
  html = html.replace(/^___+$/gm, '<hr />');

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  html = html.replace(/^[\*\-\+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, (match) => {
    const lines = match.split('\n').filter(line => line.trim());
    return '<ul>\n' + lines.join('\n') + '\n</ul>';
  });

  // Paragraphs
  html = html.split('\n\n').map(paragraph => {
    const trimmed = paragraph.trim();
    if (trimmed && !trimmed.startsWith('<')) {
      return `<p>${trimmed}</p>`;
    }
    return trimmed;
  }).join('\n\n');

  // Line breaks
  html = html.replace(/  \n/g, '<br />');

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block);
  });

  // Restore inline codes
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, code);
  });

  // Clean up blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  return html;
};

const MarkdownReaderBlock: React.FC<MarkdownReaderBlockProps> = ({ attributes }) => {
  const {
    mediaUrl,
    fontSize = 16,
    containerWidth = 'full',
    theme = 'github',
    markdownContent: initialContent
  } = attributes;

  const [markdownContent, setMarkdownContent] = useState<string>(initialContent || '');
  const [loading, setLoading] = useState<boolean>(!initialContent && !!mediaUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have content, use it
    if (initialContent) {
      setMarkdownContent(initialContent);
      setLoading(false);
      return;
    }

    // Otherwise fetch from URL
    if (!mediaUrl) {
      setLoading(false);
      return;
    }

    const fetchMarkdown = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(mediaUrl, {
          credentials: 'include',
          headers: {
            'Accept': 'text/plain, text/markdown, text/x-markdown, */*'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const text = await response.text();
        setMarkdownContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load markdown file');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkdown();
  }, [mediaUrl, initialContent]);

  const getContainerClass = () => {
    switch (containerWidth) {
      case 'narrow':
        return 'max-w-3xl mx-auto';
      case 'medium':
        return 'max-w-5xl mx-auto';
      case 'wide':
        return 'max-w-7xl mx-auto';
      default:
        return 'w-full';
    }
  };

  const parsedHtml = markdownContent ? parseMarkdown(markdownContent) : '';

  if (loading) {
    return (
      <div className={`markdown-reader-block markdown-theme-${theme}`}>
        <div className={`markdown-content-wrapper ${getContainerClass()}`}>
          <div className="markdown-loading" style={{ padding: '3rem', textAlign: 'center' }}>
            <p>Loading markdown content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`markdown-reader-block markdown-theme-${theme}`}>
        <div className={`markdown-content-wrapper ${getContainerClass()}`}>
          <div className="markdown-error" style={{
            padding: '2rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!parsedHtml) {
    return null;
  }

  return (
    <div className={`markdown-reader-block markdown-theme-${theme}`}>
      <div className={`markdown-content-wrapper ${getContainerClass()}`}>
        <div
          className="markdown-rendered-content"
          style={{ fontSize: `${fontSize}px` }}
          dangerouslySetInnerHTML={{ __html: parsedHtml }}
        />
      </div>
    </div>
  );
};

export default MarkdownReaderBlock;
