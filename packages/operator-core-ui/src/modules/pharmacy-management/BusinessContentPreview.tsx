import { ContentRenderer } from "@o4o/content-editor";

export function safeAttachmentUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}

export function BusinessContentAttachments({
  attachments,
}: {
  attachments?: unknown;
}) {
  if (!Array.isArray(attachments)) return null;
  return (
    <ul className="my-3 space-y-2">
      {attachments.map((a, i) => {
        const url =
          a && typeof a.url === "string" ? safeAttachmentUrl(a.url) : null;
        return url ? (
          <li key={i}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              {typeof a.name === "string" ? a.name : "첨부 자료"} ↗
            </a>
          </li>
        ) : null;
      })}
    </ul>
  );
}

export function BusinessContentPreview({
  content,
}: {
  content: { body?: string | null; attachments?: unknown };
}) {
  return (
    <div className="max-w-2xl break-words whitespace-normal [&_img]:max-w-full [&_pre]:overflow-x-auto">
      {content.body && <ContentRenderer html={content.body} />}
      <BusinessContentAttachments attachments={content.attachments} />
    </div>
  );
}
