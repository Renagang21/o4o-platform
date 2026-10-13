import type { PrintTemplate } from "../QrPrintTemplateModal";

/** QR authoring page's print request plan. Headers and targets are captured before any request. */
export async function printQrSelection(
  request: {
    apiBase: string;
    template: PrintTemplate;
    qrIds: string[];
    productQrIds: string[];
    headers: HeadersInit;
  },
  showPdf: (blob: Blob) => void,
): Promise<number> {
  const headers = new Headers(request.headers);
  if (request.template === "sheet") {
    headers.set("Content-Type", "application/json");
    const response = await fetch(`${request.apiBase}/pharmacy/qr/print`, {
      method: "POST",
      headers,
      body: JSON.stringify({ qrIds: request.qrIds }),
    });
    if (!response.ok) throw new Error("Print failed");
    showPdf(await response.blob());
    return 1;
  }
  const template =
    request.template === "flyer1" ? 1 : request.template === "flyer4" ? 4 : 8;
  for (const id of request.productQrIds) {
    const response = await fetch(
      `${request.apiBase}/pharmacy/qr/${id}/flyer?template=${template}`,
      { headers },
    );
    if (!response.ok) throw new Error("Flyer generation failed");
    showPdf(await response.blob());
  }
  return request.productQrIds.length;
}
