/** Bounded, nonblocking file input shared by the offline pricing tools. */
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

export const AI_PRICING_FILE_MAX_BYTES = 2 * 1024 * 1024;
export async function readAiPricingFile(path: string): Promise<Buffer> {
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > AI_PRICING_FILE_MAX_BYTES) throw new Error('AI_PRICING_CHECK_INPUT_INVALID');
    const bytes = Buffer.alloc(AI_PRICING_FILE_MAX_BYTES + 1);
    let size = 0;
    while (size < bytes.length) {
      const read = await file.read(bytes, size, bytes.length - size, null);
      if (!read.bytesRead) break;
      size += read.bytesRead;
    }
    if (size > AI_PRICING_FILE_MAX_BYTES) throw new Error('AI_PRICING_CHECK_INPUT_INVALID');
    return bytes.subarray(0, size);
  } finally { await file.close(); }
}
