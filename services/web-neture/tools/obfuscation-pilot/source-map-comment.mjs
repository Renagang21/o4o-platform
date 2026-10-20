/** Remove only a final standalone mapping comment, with linear string operations. */
export function stripSourceMapComment(code) {
  const trimmed = code.trimEnd();
  const lineStart = trimmed.lastIndexOf('\n') + 1;
  if (!trimmed.slice(lineStart).trimStart().startsWith('//# sourceMappingURL=')) return code;
  let end = lineStart > 0 ? lineStart - 1 : 0;
  if (end > 0 && code[end - 1] === '\r') end--;
  return code.slice(0, end);
}
