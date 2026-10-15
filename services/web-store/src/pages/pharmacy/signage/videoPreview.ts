/** The editing preview accepts only the existing YouTube/Vimeo video sources. */
export function videoPreviewUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtu.be",
      ].includes(host)
    ) {
      const id = host.endsWith("youtu.be")
        ? parts[0]
        : url.searchParams.get("v") ||
          (["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : null);
      return id && /^[\w-]{11}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : null;
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      const id = parts.find((part) => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}?dnt=1` : null;
    }
  } catch {
    /* Invalid input stays in the form for correction. */
  }
  return null;
}
