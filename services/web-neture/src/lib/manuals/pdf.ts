import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url';
import { MANUAL_LIMITS, validateManual, type ManualDocument } from './knowledge';
/** Lazy loading avoids charging the main bundle for PDF parsing. No provider or server request. */
export async function importManualPdf(file: File, program: string): Promise<ManualDocument> {
  if (!file.size || file.size > MANUAL_LIMITS.bytes) throw Error('PDF는 12MB 이하로 나누어 가져와 주세요.');
  if (!program.trim()) throw Error('프로그램 이름을 입력해 주세요.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw Error('정상적인 PDF 파일을 선택해 주세요.');
  if (!globalThis.crypto?.subtle) throw Error('PDF 등록은 HTTPS 또는 localhost 화면에서 사용할 수 있습니다.');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const id = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = workerUrl;
  const task = getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true });
  // Encrypted files require a user supplied password; this library never collects one.
  task.onPassword = () => { void task.destroy(); };
  try {
    const pdf = await task.promise;
    if (pdf.numPages > MANUAL_LIMITS.pages) throw Error('PDF는 400쪽 이하로 나누어 가져와 주세요.');
    const pages: ManualDocument['pages'] = [];
    let characters = 0;
    for (let page = 1; page <= pdf.numPages; page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      const text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('');
      characters += text.length;
      if (characters > MANUAL_LIMITS.characters) throw Error('매뉴얼 글자가 너무 많습니다. 파일을 나누어 주세요.');
      pages.push({ page, text });
    }
    return validateManual({ id, program, title: file.name.replace(/\.pdf(?:\.crdownload)?$/i, '').slice(0, 120), pages, reports: {}, uses: 0, importedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof Error && /나누어|글자가|저장/.test(error.message)) throw error;
    throw Error('PDF를 읽지 못했습니다. 암호·손상 여부를 확인하고, 스캔본이면 글자를 추출한 PDF를 사용해 주세요.');
  } finally { await task.destroy(); }
}
