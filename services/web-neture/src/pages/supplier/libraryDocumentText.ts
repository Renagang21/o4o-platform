/** An inert DOM document decodes entities; separators preserve the author's block structure. */
export function libraryDocumentText(value: unknown): string {
  if (Array.isArray(value)) return value.map(libraryDocumentText).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    const block = value as Record<string, unknown>;
    return libraryDocumentText(block.text ?? block.content ?? block.children ?? block.data);
  }
  if (typeof value !== 'string') return '';
  const document = new DOMParser().parseFromString(value, 'text/html');
  document.querySelectorAll('script,style,template').forEach(node => node.remove());
  document.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  document.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre,tr,section,ul,ol').forEach(node => node.append('\n'));
  return (document.body.textContent ?? '').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
}
