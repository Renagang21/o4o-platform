/**
 * Simple markdown parser using regular expressions
 * Supports basic markdown syntax without external dependencies
 */

// Escape HTML to prevent XSS
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

// Parse markdown to HTML
export const parseMarkdown = (markdown: string): string => {
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

  // Alternative H1 and H2 syntax
  html = html.replace(/^(.+)\n={3,}$/gm, '<h1>$1</h1>');
  html = html.replace(/^(.+)\n-{3,}$/gm, '<h2>$1</h2>');

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
  html = html.replace(/^>\s+(.+)$/gm, (match, content) => {
    return `<blockquote>${content}</blockquote>`;
  });

  // Unordered lists
  html = html.replace(/^[\*\-\+]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, (match) => {
    const lines = match.split('\n').filter(line => line.trim());
    return '<ul>\n' + lines.join('\n') + '\n</ul>';
  });

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, (match) => {
    // Check if this is part of an unordered list
    if (!match.includes('<ul>')) {
      const lines = match.split('\n').filter(line => line.trim());
      return '<ol>\n' + lines.join('\n') + '\n</ol>';
    }
    return match;
  });

  // Paragraphs
  html = html.split('\n\n').map(paragraph => {
    const trimmed = paragraph.trim();
    // Don't wrap if it's already an HTML element
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

// Front matter metadata structure
interface FrontMatterMetadata {
  [key: string]: string;
}

// Front matter result
interface FrontMatterResult {
  metadata: FrontMatterMetadata;
  content: string;
}

// Parse front matter if present
export const parseFrontMatter = (markdown: string): FrontMatterResult => {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = markdown.match(frontMatterRegex);

  if (match) {
    const metadata: FrontMatterMetadata = {};
    const lines = match[1].split('\n');

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        metadata[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    });

    return {
      metadata,
      content: markdown.replace(frontMatterRegex, '')
    };
  }

  return {
    metadata: {},
    content: markdown
  };
};