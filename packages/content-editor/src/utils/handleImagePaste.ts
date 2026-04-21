/**
 * handleImagePaste — 이미지 붙여넣기 공통 유틸
 *
 * WO-STORE-IMAGE-PASTE-SUPPORT-V1
 *
 * Ctrl+V로 붙여넣은 이미지를 자동 업로드하여 에디터에 삽입.
 * - base64 저장 금지: 반드시 upload 후 URL 삽입
 * - 이미지 외 클립보드 항목 무시
 * - resize/compress: Canvas API (외부 의존 없음)
 */

/** 이미지 리사이즈 + JPEG 압축 (Canvas API, 외부 라이브러리 없음) */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.85,
): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { width, height } = img;
      const scale = width > maxWidth ? maxWidth / width : 1;
      const targetW = Math.round(width * scale);
      const targetH = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name || 'paste.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }));
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

/**
 * 클립보드 paste 이벤트에서 이미지를 추출 → 업로드 → 에디터 삽입.
 *
 * @returns true  = 이미지 paste 처리됨 (TipTap 기본 동작 억제)
 *          false = 이미지 없음 (TipTap 기본 동작 계속)
 */
export async function handleClipboardPaste(
  event: ClipboardEvent,
  onUpload: (file: File) => Promise<string>,
  insertImage: (url: string) => void,
): Promise<boolean> {
  const items = event.clipboardData?.items;
  if (!items) return false;

  const imageItems = Array.from(items).filter((item) =>
    item.type.startsWith('image/'),
  );
  if (imageItems.length === 0) return false;

  event.preventDefault();

  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) continue;
    try {
      const compressed = await compressImage(file);
      const url = await onUpload(compressed);
      if (url) insertImage(url);
    } catch (err) {
      console.error('[handleImagePaste] 업로드 실패:', err);
    }
  }

  return true;
}
