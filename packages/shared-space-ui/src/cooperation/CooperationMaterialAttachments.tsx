import './cooperation-materials.css';

function attachmentLink(value: unknown, index: number) {
  if (!value || typeof value !== 'object') return null;
  const attachment = value as { url?: unknown; name?: unknown };
  if (typeof attachment.url !== 'string') return null;
  try {
    const url = new URL(attachment.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return {
      url: url.href,
      name: typeof attachment.name === 'string' && attachment.name.trim()
        ? attachment.name.trim() : `첨부자료 ${index + 1}`,
    };
  } catch {
    return null;
  }
}

/** Present attachments already returned by the membership-scoped material API; never fetch them automatically. */
export function CooperationMaterialAttachments({ attachments }: Readonly<{ attachments?: unknown }>) {
  if (!Array.isArray(attachments) || !attachments.length) return null;
  const links = attachments.map((attachment, index) => attachmentLink(attachment, index));
  return <section className="cooperation-material-attachments" aria-label="첨부자료">
    <p><strong>첨부자료</strong></p>
    <ul>{links.map((link, index) => link && <li key={`${link.url}:${index}`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a>
    </li>)}</ul>
    {links.some(link => !link) && <p>일부 첨부자료는 주소를 확인할 수 없어 열 수 없습니다.</p>}
  </section>;
}
